import { useEffect, useRef, useCallback } from 'react';

const PORT = import.meta.env.VITE_PORT || 6900;

export function useAnswerSSE(onUpdate) {
    const eventSourceRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttempts = useRef(0);
    const MAX_RECONNECT_ATTEMPTS = 5;
    const RECONNECT_DELAY = 3000; // 3 seconds

    const connect = useCallback(() => {
        const eventSource = new EventSource(`http://127.0.0.1:${PORT}/api/answer-updates`);

        eventSource.onopen = () => {
            console.log('[SSE] Connected to answer updates');
            reconnectAttempts.current = 0;
        };

        // Listen for answer_submitted event
        eventSource.addEventListener('answer_submitted', (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[SSE] Answer submitted:', data);
                onUpdate({ type: 'answer_submitted', data });
            } catch (err) {
                console.error('[SSE] Parse error:', err);
            }
        });

        // Listen for frame_share event
        eventSource.addEventListener('frame_share', (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[SSE] Frame shared:', data);
                onUpdate({ type: 'frame_share', data });
            } catch (err) {
                console.error('[SSE] Parse error:', err);
            }
        });

        // Heartbeat events (keep-alive)
        eventSource.addEventListener('heartbeat', (event) => {
            // Keep-alive, no action needed
        });

        // Generic message handler (fallback)
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[SSE] Message:', data);
                onUpdate(data);
            } catch (err) {
                console.error('[SSE] Parse error:', err);
            }
        };

        eventSource.onerror = (error) => {
            console.error('[SSE] Error:', error);

            // EventSource automatically reconnects, but we want to track attempts
            if (eventSource.readyState === EventSource.CLOSED) {
                console.log('[SSE] Connection closed');

                if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempts.current++;
                    console.log(`[SSE] Reconnecting... (${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        eventSource.close();
                        connect();
                    }, RECONNECT_DELAY);
                } else {
                    console.error('[SSE] Max reconnection attempts reached');
                    eventSource.close();
                }
            }
        };

        eventSourceRef.current = eventSource;
    }, [onUpdate]);

    useEffect(() => {
        connect();

        return () => {
            // Cleanup on unmount
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, [connect]);

    return eventSourceRef;
}
