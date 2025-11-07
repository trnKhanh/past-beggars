import { useState, useEffect } from "react";

export default function AnswerSubmitNotification({ answerData, onDismiss }) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Auto-dismiss after 5 seconds
        const timer = setTimeout(() => {
            handleDismiss();
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        setTimeout(() => onDismiss(), 300); // Wait for fade out animation
    };

    if (!isVisible) return null;

    // Determine color based on status/correct - matching Toast style
    const isCorrect = answerData.status === "correct" || answerData.correct === true;
    const bgColor = isCorrect ? "bg-green-100 hover:bg-green-200" : "bg-red-100 hover:bg-red-200";
    const title = isCorrect ? "Correct Answer!" : "Wrong Answer";

    return (
        <div
            className={`${bgColor} border-2 border-black rounded-xl shadow-lg min-w-[300px] max-w-[500px] animate-slide-in cursor-pointer transition-opacity duration-300 ${
                isVisible ? "opacity-100" : "opacity-0"
            }`}
            onClick={handleDismiss}
        >
            <div className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="flex-1">
                    <div className="font-bold text-lg text-gray-900">{title}</div>
                    <div className="text-sm text-gray-700 mt-1">
                        {answerData.video_id && <div>Video: {answerData.video_id}</div>}
                        {answerData.frame_id && <div>Frame: {answerData.frame_id}</div>}
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
