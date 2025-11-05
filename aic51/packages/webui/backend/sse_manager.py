import asyncio
from typing import Set, Dict
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class SSEManager:
    """Manages Server-Sent Events connections"""

    def __init__(self):
        self.update_queues: Dict[str, asyncio.Queue] = {}
        self.active_connections: Set[str] = set()
        self._lock = asyncio.Lock()

    async def create_queue(self, client_id: str) -> asyncio.Queue:
        """Create a new queue for a client connection"""
        async with self._lock:
            queue = asyncio.Queue(maxsize=100)
            self.update_queues[client_id] = queue
            self.active_connections.add(client_id)
            logger.info(f"SSE client connected: {client_id}. Total: {len(self.active_connections)}")
            return queue

    async def remove_queue(self, client_id: str):
        """Remove a client's queue"""
        async with self._lock:
            if client_id in self.update_queues:
                del self.update_queues[client_id]
            if client_id in self.active_connections:
                self.active_connections.remove(client_id)
            logger.info(f"SSE client disconnected: {client_id}. Total: {len(self.active_connections)}")

    async def broadcast(self, event_type: str, data: dict):
        """Broadcast event to all connected clients"""
        message = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.now().isoformat()
        }

        disconnected = []
        async with self._lock:
            for client_id, queue in self.update_queues.items():
                try:
                    # Non-blocking put, drop message if queue is full
                    queue.put_nowait(message)
                except asyncio.QueueFull:
                    logger.warning(f"Queue full for client {client_id}, dropping message")
                except Exception as e:
                    logger.error(f"Error broadcasting to {client_id}: {e}")
                    disconnected.append(client_id)

        # Clean up disconnected clients
        for client_id in disconnected:
            await self.remove_queue(client_id)

    async def send_to_client(self, client_id: str, event_type: str, data: dict):
        """Send event to specific client"""
        if client_id not in self.update_queues:
            return

        message = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.now().isoformat()
        }

        try:
            await self.update_queues[client_id].put(message)
        except Exception as e:
            logger.error(f"Error sending to {client_id}: {e}")

    def get_connection_count(self) -> int:
        """Get number of active connections"""
        return len(self.active_connections)


# Global instance
sse_manager = SSEManager()
