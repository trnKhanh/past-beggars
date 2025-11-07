import asyncio
import httpx
import logging
from typing import List, Dict
from aic51.packages.config import GlobalConfig

logger = logging.getLogger(__name__)


class BroadcastManager:
    """Manages broadcasting events to peer backends via HTTP"""

    def __init__(self):
        self.peer_urls: List[str] = []
        self.http_client: httpx.AsyncClient = None

    async def initialize(self):
        """Initialize HTTP client and load peer URLs from config"""
        self.peer_urls = GlobalConfig.get("backends", "core", "peers") or []
        self.http_client = httpx.AsyncClient(timeout=3.0)  # 3 second timeout

        if self.peer_urls:
            logger.info(f"Broadcast manager initialized with {len(self.peer_urls)} peers: {self.peer_urls}")
        else:
            logger.info("No peers configured - running in single-device mode")

    async def close(self):
        """Close HTTP client"""
        if self.http_client:
            await self.http_client.aclose()

    async def broadcast_to_peers(self, event_type: str, data: dict):
        """Broadcast event to all peer backends"""
        if not self.peer_urls:
            logger.info("[Broadcast] No peers configured, skipping peer broadcast")
            return  # No peers, nothing to broadcast

        message = {
            "type": event_type,
            "data": data
        }

        logger.info(f"[Broadcast] Broadcasting {event_type} to {len(self.peer_urls)} peers: {self.peer_urls}")

        # Broadcast to all peers concurrently (fire-and-forget)
        tasks = []
        for peer_url in self.peer_urls:
            tasks.append(self._send_to_peer(peer_url, message))

        # Don't wait for responses, just fire and forget
        asyncio.create_task(self._execute_broadcasts(tasks))

    async def _execute_broadcasts(self, tasks):
        """Execute broadcast tasks and log any errors"""
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.warning(f"Failed to broadcast to {self.peer_urls[i]}: {result}")

    async def _send_to_peer(self, peer_url: str, message: dict):
        """Send message to a single peer"""
        try:
            endpoint = f"{peer_url}/api/events/receive"
            logger.info(f"[Broadcast] Sending to {endpoint}")
            response = await self.http_client.post(endpoint, json=message)
            logger.info(f"[Broadcast] Success: {peer_url} returned {response.status_code}")
        except Exception as e:
            logger.error(f"[Broadcast] Failed to reach {peer_url}: {e}")
            raise Exception(f"Failed to reach {peer_url}: {e}")


# Global instance
broadcast_manager = BroadcastManager()
