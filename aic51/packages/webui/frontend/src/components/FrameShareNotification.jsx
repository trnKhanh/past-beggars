import { useState, useEffect } from "react";

export default function FrameShareNotification({ frameShare, onPlay, onDismiss }) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Auto-dismiss after 10 seconds
        const timer = setTimeout(() => {
            handleDismiss();
        }, 10000);

        return () => clearTimeout(timer);
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        setTimeout(() => onDismiss(), 300); // Wait for fade out animation
    };

    const handlePlay = () => {
        onPlay(frameShare);
        handleDismiss();
    };

    if (!isVisible) return null;

    return (
        <div
            className={`fixed top-4 right-4 z-50 bg-blue-500 text-white px-6 py-4 rounded-lg shadow-lg min-w-80 max-w-md transition-opacity duration-300 ${
                isVisible ? "opacity-100" : "opacity-0"
            }`}
        >
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-start">
                    <div className="font-bold text-lg">📺 Frame Shared</div>
                    <button
                        onClick={handleDismiss}
                        className="text-white hover:text-gray-200 text-xl leading-none"
                    >
                        ×
                    </button>
                </div>
                <div className="text-sm opacity-90">
                    <div>From: {frameShare.sender}</div>
                    <div>Video: {frameShare.video_id}</div>
                    <div>Frame: {frameShare.frame_id}</div>
                </div>
                <button
                    onClick={handlePlay}
                    className="mt-2 bg-white text-blue-500 px-4 py-2 rounded font-semibold hover:bg-gray-100 active:bg-gray-200"
                >
                    Open in Video Player
                </button>
            </div>
        </div>
    );
}
