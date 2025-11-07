import { useFetcher, Form } from "react-router-dom";
import {useState, useEffect, useContext, useCallback} from "react";
import JSZip from "jszip";

import { usePlayVideo } from "../VideoPlayer.jsx";
import { getCSV, getAnswersByIds } from "../../services/answer.js";
import { getBlob, downloadFile } from "../../utils/files.js";

import AuthForm from "./AuthForm.jsx";
import AnswerForm from "./AnswerForm.jsx";
import SelectedFramesPreview from "./SelectedFramesPreview.jsx";
import AnswerItem from "./AnswerItem.jsx";
import AnswerDetail from "./AnswerDetail.jsx";
import { AuthContext } from "../AuthProvider.jsx";
import { useAnswerSSE } from "../../hooks/useAnswerSSE.js";
import { useFrameShare } from "../FrameShareProvider.jsx";

export default function AnswerSidebar() {
    const { submitAnswer, shouldReload } = useContext(AuthContext);
    const fetcher = useFetcher({ key: "answers" });
    const [selected, setSelected] = useState(null);
    // const [downloadStep, setDownloadStep] = useState(50);
    // const [downloadN, setDownloadN] = useState(5);
    const [downloadList, setDownloadList] = useState([]);
    const playVideo = usePlayVideo();
    const [lastDataLength, setLastDataLength] = useState(0);
    const { addNotification } = useFrameShare();

    useEffect(() => {
        if (fetcher.state === "idle" && !fetcher.data) {
            fetcher.load("/answers");
        }
    }, []);

    useEffect(() => {
        const currentLength = fetcher.data?.length || 0;
        if (currentLength !== lastDataLength) {
            setLastDataLength(currentLength);
            if (fetcher.state === "idle") {
                fetcher.load("/answers");
            }
        }
    }, [fetcher.data, lastDataLength, fetcher.state]);

    useEffect(() => {
        if (shouldReload > 0) {
            setTimeout(() => {
                fetcher.load("/answers");
            }, 200);
        }
    }, [shouldReload]);

    // Handle SSE updates from cross-device synchronization
    const handleSSEUpdate = useCallback((message) => {
        console.log('[AnswerSidebar] SSE update:', message.type);

        if (message.type === 'answer_submitted') {
            // Reload answer list on answer submission
            console.log('[AnswerSidebar] Reloading answers due to submission');
            if (fetcher.state === "idle") {
                fetcher.load("/answers");
            }
            // Show notification for answer submission
            console.log('[AnswerSidebar] Adding answer submission notification:', message.data);
            addNotification(message.data);
        } else if (message.type === 'frame_share') {
            // Show notification for frame share
            console.log('[AnswerSidebar] Adding frame share notification:', message.data);
            addNotification(message.data);
        }
    }, [fetcher, addNotification]);

    // Connect to SSE for real-time sync
    useAnswerSSE(handleSSEUpdate);

    const handleOnSelect = (answer) => {
        setSelected(answer);
    };

    const handleOnClick = (answer) => {
        if (downloadList.includes(answer.id)) {
            setDownloadList(downloadList.filter((id) => id !== answer.id));
        } else {
            setDownloadList([...downloadList, answer.id]);
        }
    };

    // const handleOnSingleDownload = async (a) => {
    //     const csvData = getCSV(a, downloadN, downloadStep);
    //     const csvBlob = getBlob(csvData, "text/csv");
    //     downloadFile(csvBlob, `query-${a.query_id}.csv`);
    // };

    // const handleOnBulkDownload = async (e) => {
    //     e.preventDefault();
    //     const downloadAnswers = await getAnswersByIds(downloadList);
    //     const zip = new JSZip();
    //     for (const a of downloadAnswers) {
    //         const csvData = getCSV(a, downloadN, downloadStep);
    //         zip.file(`query-${a.query_id}.csv`, csvData);
    //     }
    //     zip.generateAsync({ type: "blob" }).then((content) => {
    //         downloadFile(content, "submission.zip");
    //     });
    // };

    return (
        <div className="relative p-2">
            <div className="flex flex-col">
                <AuthForm />
                <AnswerForm />
                <SelectedFramesPreview />
                {/*<Form onSubmit={handleOnBulkDownload}>*/}
                {/*    <div className="flex flex-col items-center p-1 w-full bg-red-100">*/}
                {/*        <div className="flex flex-row justify-center items-center">*/}
                {/*            <label htmlFor="n" className="mr-1 font-bold text-black">*/}
                {/*                N:*/}
                {/*            </label>*/}
                {/*            <input*/}
                {/*                required*/}
                {/*                type="text"*/}
                {/*                name="n"*/}
                {/*                placeholder="n"*/}
                {/*                autoComplete="off"*/}
                {/*                value={downloadN}*/}
                {/*                onChange={(e) => {*/}
                {/*                    setDownloadN(e.target.value);*/}
                {/*                }}*/}
                {/*                className="basis-1/4 py-1 px-2 mr-3 min-w-0 focus:outline-none"*/}
                {/*            />*/}
                {/*            <label htmlFor="step" className="mr-1 font-bold text-black">*/}
                {/*                Step:*/}
                {/*            </label>*/}
                {/*            <input*/}
                {/*                required*/}
                {/*                type="text"*/}
                {/*                name="step"*/}
                {/*                placeholder="step"*/}
                {/*                autoComplete="off"*/}
                {/*                value={downloadStep}*/}
                {/*                onChange={(e) => {*/}
                {/*                    setDownloadStep(e.target.value);*/}
                {/*                }}*/}
                {/*                className="basis-1/4 py-1 px-2 min-w-0 focus:outline-none"*/}
                {/*            />*/}
                {/*        </div>*/}
                {/*        <input*/}
                {/*            disabled={downloadList.length === 0}*/}
                {/*            type="submit"*/}
                {/*            value="Download"*/}
                {/*            className="flex-grow-0 mt-2 rounded-xl border-2 border-black text-lg px-4 py-1 bg-sky-100 focus:outline-none hover:bg-sky-200 active:bg-sky-300 disabled:bg-slate-100 disabled:border-slate-300 disabled:text-slate-300"*/}
                {/*        />*/}
                {/*    </div>*/}
                {/*</Form>*/}
                <div className="mt-2 max-h-96 overflow-y-auto">
                    {fetcher.data &&
                    [...fetcher.data].reverse().map((answer) => (
                        <AnswerItem
                            key={answer.id}
                            answer={answer}
                            selected={selected !== null && selected.id === answer.id}
                            inList={downloadList.includes(answer.id)}
                            onSelect={handleOnSelect}
                            onClick={handleOnClick}
                            // onDownload={handleOnSingleDownload}
                            onSubmitAnswer={submitAnswer}
                        />
                    ))}
                </div>

            </div>
            {selected !== null && <AnswerDetail answer={selected} />}
        </div>
    );
}