import { useState, useEffect } from "react";

export default function FrameShareNotification({ frameShare, onPlay, onDismiss }) {
    const [isVisible, setIsVisible] = useState(true);

    // Detect notification type based on presence of query_id
    const isAnswerSubmitted = frameShare.query_id !== undefined;

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

    // Render answer submission notification (matching Toast style)
    if (isAnswerSubmitted) {
        const bgColor = frameShare.correct ? "bg-green-100 hover:bg-green-200" : "bg-red-100 hover:bg-red-200";
        const icon = frameShare.correct ? "✅" : "❌";
        const title = frameShare.correct ? "Correct Answer!" : "Wrong Answer";

        return (
            <div
                className={`${bgColor} border-2 border-black rounded-xl shadow-lg min-w-[300px] max-w-[500px] animate-slide-in cursor-pointer transition-opacity duration-300 ${
                    isVisible ? "opacity-100" : "opacity-0"
                }`}
                onClick={handleDismiss}
            >
                <div className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="flex-1">
                        <div className="font-bold text-lg text-gray-900">{icon} {title}</div>
                        <div className="text-sm text-gray-700 mt-1">
                            <div>Query: {frameShare.query_id}</div>
                            <div>Video: {frameShare.video_id}</div>
                            {frameShare.frame_id && <div>Frame: {frameShare.frame_id}</div>}
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="text-gray-900 hover:text-gray-600 font-bold text-xl leading-none"
                    >
                        ×
                    </button>
                </div>
            </div>
        );
    }

    // Render frame share notification (matching Toast style)
    return (
        <div
            className={`bg-sky-100 hover:bg-sky-200 border-2 border-black rounded-xl shadow-lg min-w-[300px] max-w-[500px] animate-slide-in cursor-pointer transition-opacity duration-300 ${
                isVisible ? "opacity-100" : "opacity-0"
            }`}
            onClick={handlePlay}
        >
            <div className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="flex-1">
                    <div className="font-bold text-lg text-gray-900">📺 Frame Shared</div>
                    <div className="text-sm text-gray-700 mt-1">
                        <div>From: {frameShare.sender}</div>
                        <div>Video: {frameShare.video_id}</div>
                        <div>Frame: {frameShare.frame_id}</div>
                    </div>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss();
                    }}
                    className="text-gray-900 hover:text-gray-600 font-bold text-xl leading-none"
                >
                    ×
                </button>
            </div>
        </div>
    );
}
