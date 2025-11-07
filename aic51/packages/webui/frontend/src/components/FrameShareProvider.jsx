import { createContext, useContext, useState, useCallback } from "react";
import FrameShareNotification from "./FrameShareNotification.jsx";
import AnswerSubmitNotification from "./AnswerSubmitNotification.jsx";
import { usePlayVideo } from "./VideoPlayer.jsx";
import { getFrameInfo } from "../services/search.js";
import axios from "axios";

const PORT = import.meta.env.VITE_PORT || 6900;

const FrameShareContext = createContext({
    shareFrame: null,
});

export function useFrameShare() {
    return useContext(FrameShareContext);
}

// eslint-disable-next-line react/prop-types
export default function FrameShareProvider({ children }) {
    const [notifications, setNotifications] = useState([]);
    const playVideo = usePlayVideo();

    const shareFrame = useCallback(async (videoId, frameId, frameCounter) => {
        try {
            await axios.post(`http://127.0.0.1:${PORT}/api/broadcast/frame-share`, {
                video_id: videoId,
                frame_id: frameId,
                frame_counter: frameCounter,
                sender: "Device",  // Could be improved with actual device name
            });
            console.log("[FrameShare] Broadcasted frame share");
        } catch (err) {
            console.error("[FrameShare] Failed to broadcast:", err);
        }
    }, []);

    const addNotification = useCallback((data) => {
        setNotifications((prev) => [...prev, { ...data, id: Date.now() }]);
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const handlePlayFrame = useCallback(async (frameShare) => {
        try {
            const frameInfo = await getFrameInfo(frameShare.video_id, frameShare.frame_id);
            if (frameInfo && frameInfo.id) {
                frameInfo.frame_counter = frameShare.frame_counter || frameInfo.frame_counter;
                playVideo(frameInfo, frameInfo.frame_id);
            }
        } catch (err) {
            console.error("[FrameShare] Failed to play frame:", err);
        }
    }, [playVideo]);

    return (
        <FrameShareContext.Provider value={{ shareFrame, addNotification }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2">
                {notifications.map((notification) => {
                    // Check if it's a frame share or answer submission
                    if (notification.frame_id && notification.video_id && !notification.query_id) {
                        // Frame share notification
                        return (
                            <FrameShareNotification
                                key={notification.id}
                                frameShare={notification}
                                onPlay={handlePlayFrame}
                                onDismiss={() => removeNotification(notification.id)}
                            />
                        );
                    } else if (notification.query_id) {
                        // Answer submission notification
                        return (
                            <AnswerSubmitNotification
                                key={notification.id}
                                answerData={notification}
                                onDismiss={() => removeNotification(notification.id)}
                            />
                        );
                    }
                    return null;
                })}
            </div>
        </FrameShareContext.Provider>
    );
}
