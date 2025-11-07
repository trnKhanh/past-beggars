import { useEffect, useRef, useCallback } from 'react';

const PORT = import.meta.env.VITE_PORT || 6900;

export function useAnswerSSE(onUpdate) {
    const eventSourceRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttempts = useRef(0);
    const onUpdateRef = useRef(onUpdate);
    const MAX_RECONNECT_ATTEMPTS = 5;
    const RECONNECT_DELAY = 3000; // 3 seconds

    console.log('[SSE] useAnswerSSE hook initialized');

    // Keep the callback ref updated without triggering reconnects
    useEffect(() => {
        onUpdateRef.current = onUpdate;
    }, [onUpdate]);

    const connect = useCallback(() => {
        const url = `http://127.0.0.1:${PORT}/api/answer-updates`;
        console.log('[SSE] Attempting to connect to:', url);
        const eventSource = new EventSource(url);

        eventSource.onopen = () => {
            console.log('[SSE] Successfully connected to answer updates');
            reconnectAttempts.current = 0;
        };

        // Listen for answer_submitted event
        eventSource.addEventListener('answer_submitted', (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[SSE] Answer submitted:', data);
                onUpdateRef.current({ type: 'answer_submitted', data });
            } catch (err) {
                console.error('[SSE] Parse error:', err);
            }
        });

        // Listen for frame_share event
        eventSource.addEventListener('frame_share', (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[SSE] Frame shared:', data);
                onUpdateRef.current({ type: 'frame_share', data });
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
                onUpdateRef.current(data);
            } catch (err) {
                console.error('[SSE] Parse error:', err);
            }
        };

        eventSource.onerror = (error) => {
            console.error('[SSE] Error occurred:', error);
            console.error('[SSE] ReadyState:', eventSource.readyState,
                eventSource.readyState === EventSource.CONNECTING ? '(CONNECTING)' :
                eventSource.readyState === EventSource.OPEN ? '(OPEN)' : '(CLOSED)');

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
    }, []); // No dependencies - connect function never changes

    useEffect(() => {
        console.log('[SSE] useEffect running - about to connect');
        connect();

        return () => {
            // Cleanup on unmount
            console.log('[SSE] useEffect cleanup - closing connection');
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
