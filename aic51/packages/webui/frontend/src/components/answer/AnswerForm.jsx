import { useSelected } from "../SelectedProvider.jsx";
import {useContext, useState, useEffect, useCallback} from "react";
import {AuthContext} from "../AuthProvider.jsx";

export default function AnswerForm() {
    const { evaluationIds, submitAnswer } = useContext(AuthContext);
    const { selected, clearSelected, setSubmitCallback, formValues, updateFormValue } = useSelected();

    const [frameCounter, setFrameCounter] = useState("");

    useEffect(() => {
        if (selected.length > 0) {
            const selectedFramesText = selected
                .map(frameId => {
                    const [, fc] = frameId.split('#');
                    return fc;
                })
                .sort((a, b) => {
                    const numA = parseInt(a, 10);
                    const numB = parseInt(b, 10);
                    return numA - numB;
                })
                .join(", ");
            const vid = selected[0].split('#')[0];

            updateFormValue('videoId', vid);
            setFrameCounter(selectedFramesText);
        }
    }, [selected, updateFormValue]);

    useEffect(() => {
        if (evaluationIds.length > 0 && !formValues.queryId) {
            updateFormValue('queryId', evaluationIds[0].id);
        }
    }, [evaluationIds, formValues.queryId, updateFormValue]);

    const handleSubmit = useCallback(async (e) => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }

        const form = e && e.target ? e.target.closest('form') : document.querySelector('#answer-form');
        if (!form) {
            console.error("Answer form not found");
            return;
        }

        const formData = new FormData(form);
        const queryId = formData.get('query_id');
        const videoIdValue = formData.get('video_id');
        const answerText = formData.get('answer') || '';

        if (!queryId || !videoIdValue) {
            alert("Please fill in Query ID and Video ID before adding.");
            return;
        }

        const frameCounters = formData.get('frame_counter');

        const frameId = selected.length > 0 ? selected[0].split('#')[1] : null;

        const answerData = {
            query_id: queryId,
            video_id: videoIdValue,
            frame_id: frameId,
            frame_counter: frameCounters,
            answer: answerText
        };

        console.log("Calling submitAnswer API with:", answerData);
        await submitAnswer(answerData);
    }, [selected, submitAnswer]);

    const handleClear = () => {
        clearSelected();
        updateFormValue('videoId', '');
        updateFormValue('answer', '');
        setFrameCounter("");
    };

    useEffect(() => {
        setSubmitCallback(() => handleSubmit);
        return () => setSubmitCallback(null);
    }, [setSubmitCallback, handleSubmit]);

    return (
        <form id="answer-form">
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
                value={formValues.queryId}
                onChange={(e) => updateFormValue('queryId', e.target.value)}
                className="basis-1/4 py-1 px-2 border-black border-r-2 min-w-0 focus:outline-none"
              >
                {evaluationIds.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
                <input
                    required
                    type="text"
                    name="video_id"
                    placeholder="Video ID"
                    autoComplete="off"
                    value={formValues.videoId}
                    className="basis-5/12 py-1 px-2 border-black border-r-2 min-w-0 focus:outline-none"
                    onChange={(e) => updateFormValue('videoId', e.target.value)}
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
                    value={formValues.answer}
                    onChange={(e) => updateFormValue('answer', e.target.value)}
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