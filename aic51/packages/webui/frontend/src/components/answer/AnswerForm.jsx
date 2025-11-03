import { useSelected } from "../SelectedProvider.jsx";
import {useContext, useState, useEffect} from "react";
import {AuthContext} from "../AuthProvider.jsx";

export default function AnswerForm({}) {
    const { evaluationIds, submitAnswer } = useContext(AuthContext);
    const { selected, clearSelected } = useSelected();

    const [videoId, setVideoId] = useState("");
    const [frameCounter, setFrameCounter] = useState("");

    useEffect(() => {
        if (selected.length > 0) {
            const selectedFramesText = selected.map(frameId => {
                const [, fc] = frameId.split('#');
                return fc;
            }).join(", ");
            const vid = selected[0].split('#')[0];

            setVideoId(vid);
            setFrameCounter(selectedFramesText);
        }
    }, [selected]);

    const getEvaluationLabel = (name) => {
        if (name.includes('KIS')) return 'KIS';
        if (name.includes('QA')) return 'QA';
        if (name.includes('TRAKE')) return 'TRAKE';
        return name;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const form = e.target.closest('form');
        if (!form) return;

        const formData = new FormData(form);
        const queryId = formData.get('query_id');
        const videoIdValue = formData.get('video_id');
        const answerText = formData.get('answer') || '';

        if (!queryId || !videoIdValue) {
            alert("Please fill in Query ID and Video ID before adding.");
            return;
        }

        // Prepare frame counters
        let frameCounters;
        if (selected.length <= 1) {
            frameCounters = formData.get('frame_counter');
        } else {
            frameCounters = selected.map(frameId => {
                const [, fc] = frameId.split('#');
                return fc;
            }).join(', ');
        }

        const answerData = {
            query_id: queryId,
            video_id: videoIdValue,
            frame_counter: frameCounters,
            answer: answerText
        };

        console.log("Calling submitAnswer API with:", answerData);
        await submitAnswer(answerData);
    };

    const handleClear = () => {
        clearSelected();
        setVideoId("");
        setFrameCounter("");
        const answerInput = document.querySelector('input[name="answer"]');
        if (answerInput) {
            answerInput.value = "";
        }
    };


    return (
        <form>
            <div className="p-1 w-full flex flex-row flex-wrap justify-center items-center bg-lime-100">
                {/*<input*/}
                {/*    required*/}
                {/*    type="text"*/}
                {/*    name="query_id"*/}
                {/*    placeholder="Query ID"*/}
                {/*    autoComplete="off"*/}
                {/*    className="basis-1/3 py-1 px-2 border-black border-r-2 min-w-0 focus:outline-none"*/}
                {/*/>*/}
               <select
                type="text"
                name="query_id"
                autoComplete="off"
                className="basis-1/4 py-1 px-2 border-black border-r-2 min-w-0 focus:outline-none"
              >
                {evaluationIds.map((e) => (
                  <option key={e.id} value={e.id}>
                    {getEvaluationLabel(e.name)}
                  </option>
                ))}
              </select>
                <input
                    required
                    type="text"
                    name="video_id"
                    placeholder="Video ID"
                    autoComplete="off"
                    value={videoId}
                    className="basis-5/12 py-1 px-2 border-black border-r-2 min-w-0 focus:outline-none"
                    onChange={(e) => setVideoId(e.target.value)}
                />
                <input
                    required
                    type="text"
                    name="frame_counter"
                    placeholder="Frame Counter(s) - comma separated"
                    autoComplete="off"
                    value={frameCounter}
                    className="basis-1/3 py-1 px-2 min-w-0 focus:outline-none"
                    onChange={(e) => setFrameCounter(e.target.value)}
                />
                <input
                    type="text"
                    name="answer"
                    placeholder="Answer"
                    autoComplete="off"
                    className="flex-[1_0_100%] py-1 px-2 min-w-0 focus:outline-none mt-2"
                />
                <div className="flex-[1_0_100%] flex flex-row gap-2 mt-2">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="flex-1 rounded-xl border-2 border-black text-lg px-4 py-1 bg-sky-100 hover:bg-sky-200 active:bg-sky-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        Submit {selected.length > 1 ? `(${selected.length})` : ''}
                    </button>
                    <button
                        type="button"
                        onClick={handleClear}
                        className="flex-1 rounded-xl border-2 border-black text-lg px-4 py-1 bg-red-100 hover:bg-red-200 active:bg-red-300"
                    >
                        Clear
                    </button>
                </div>
            </div>
        </form>
    );
}