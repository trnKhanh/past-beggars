// import { useFetcher, useSubmit, useSearchParams, Form } from "react-router-dom";
// import { useState, useEffect, useContext } from "react";
// import classNames from "classnames";
//
// import FindButton from "../assets/search-btn.svg";
// import PlayButton from "../assets/play-btn.svg";
// import DeleteButton from "../assets/delete-btn.svg";
// import EditButton from "../assets/edit-btn.svg";
// import SubmitButton from "../assets/upload-btn.svg";
//
// import { usePlayVideo } from "./VideoPlayer.jsx";
// import { AuthContext } from "./AuthProvider";
// import { getCSV, getAnswersByIds } from "../services/answer.js";
// import { getBlob, downloadFile } from "../utils/files.js";
// import { getFrameInfo } from "../services/search.js";
//
// function AnswerItem({
//   answer,
//   onSelect,
//   selected,
//   onClick,
//   inList,
//   onSubmitAnswer,
// }) {
//   const { evaluationIds } = useContext(AuthContext);
//   const [isEditing, setIsEditing] = useState(false);
//   const submit = useSubmit();
//   const [searchParams, setSearchParams] = useSearchParams();
//   const fetcher = useFetcher({ key: "answers" });
//   const playVideo = usePlayVideo();
//
//   const handleOnMouseLeave = async () => {
//     if (selected) {
//       onSelect(null);
//     }
//   };
//
//   const handleOnMouseEnter = async () => {
//     if (!selected) {
//       onSelect(answer);
//     }
//   };
//   const handleOnPlay = async (e) => {
//     const frameInfo = await getFrameInfo(answer.video_id, answer.frame_id);
//     frameInfo.time = answer.time;
//     playVideo(frameInfo);
//   };
//   const handleOnFind = async () => {
//     const frameInfo = await getFrameInfo(answer.video_id, answer.frame_id);
//     if (!frameInfo.id) {
//       return;
//     }
//     const currentParams = Object.fromEntries(searchParams);
//     const filteredParams = Object.keys(currentParams)
//       .filter((k) => k !== "q" && k != "offset")
//       .reduce((obj, key) => {
//         obj[key] = currentParams[key];
//         return obj;
//       }, {});
//
//     submit(
//       {
//         ...filteredParams,
//         id: frameInfo.id,
//       },
//       { action: "/similar" },
//     );
//   };
//   const handleOnDelete = async () => {
//     onSelect(null);
//     fetcher.submit(null, {
//       method: "POST",
//       action: `/answers/${answer.id}/delete`,
//     });
//   };
//   if (isEditing) {
//     return (
//       <fetcher.Form
//         action={`/answers/${answer.id}/edit`}
//         method="POST"
//         onSubmit={(e) => {
//           e.preventDefault();
//           fetcher.submit(e.currentTarget);
//           setIsEditing(false);
//         }}
//       >
//         <div className="p-1 w-full flex flex-row flex-wrap justify-center items-center bg-lime-100">
//           <select
//             type="text"
//             name="query_id"
//             autoComplete="off"
//             className="basis-1/2 py-1 px-2 border-black border-r-2 min-w-0 focus:outline-none"
//           >
//             {evaluationIds.map((e) => (
//               <option key={e.id} value={e.id}>
//                 {e.name}
//               </option>
//             ))}
//           </select>
//           <input
//             required
//             type="text"
//             name="video_id"
//             placeholder="Video ID"
//             autoComplete="off"
//             defaultValue={answer.video_id}
//             className="basis-1/2 py-1 px-2 border-black min-w-0 focus:outline-none"
//           />
//           <input
//             required
//             type="text"
//             name="time"
//             placeholder="Time"
//             autoComplete="off"
//             defaultValue={answer.time}
//             className="flex-[1_0_50%] border-black border-r-2 py-1 px-2 min-w-0 focus:outline-none mt-2"
//           />
//           <input
//             type="text"
//             name="answer"
//             placeholder="Answer"
//             autoComplete="off"
//             defaultValue={answer.answer}
//             className="flex-[1_0_50%] py-1 px-2 min-w-0 focus:outline-none mt-2"
//           />
//           <input
//             type="submit"
//             value="Edit"
//             className="flex-grow-0 mt-2 rounded-xl border-2 border-black text-lg px-4 py-1 bg-sky-100 focus:outline-none hover:bg-sky-200 active:bg-sky-300"
//           />
//           <input
//             type="button"
//             value="Cancle"
//             onClick={() => {
//               setIsEditing(false);
//             }}
//             className="ml-5 flex-grow-0 mt-2 rounded-xl text-lg text-white px-4 py-1 bg-red-600 focus:outline-none hover:bg-red-500 active:bg-red-400"
//           />
//         </div>
//       </fetcher.Form>
//     );
//   }
//   return (
//     <div
//       className={classNames(
//         "w-full flex flex-row justify-between items-center py-2",
//         {
//           "bg-green-200": answer.correct,
//           "bg-red-200": !answer.correct,
//           "bg-green-300 font-bold": selected && answer.correct,
//           "bg-red-300 font-bold": selected && !answer.correct,
//           "border-2 border-blue-500": inList,
//         },
//       )}
//       onMouseLeave={handleOnMouseLeave}
//       onMouseEnter={handleOnMouseEnter}
//       onClick={() => {
//         onClick(answer);
//       }}
//     >
//       <div id="answer-description">
//         <div className="">{answer.submitted}</div>
//       </div>
//       <div
//         id="answer-option"
//         className="flex flex-row"
//         onClick={(e) => e.stopPropagation()}
//       >
//         <img
//           className="hover:bg-blue-100 active:bg-blue-50 select-none"
//           src={EditButton}
//           width="30em"
//           draggable="false"
//           onClick={() => {
//             setIsEditing(true);
//           }}
//         />
//         <img
//           className="hover:bg-blue-100 active:bg-blue-50 select-none"
//           src={SubmitButton}
//           width="30em"
//           draggable="false"
//           onClick={() => {
//             onSubmitAnswer(answer);
//           }}
//         />
//         <img
//           className="hover:bg-blue-100 active:bg-blue-50 select-none"
//           src={PlayButton}
//           width="30em"
//           draggable="false"
//           onClick={handleOnPlay}
//         />
//         <img
//           className="hover:bg-blue-100 active:bg-blue-50 select-none"
//           src={FindButton}
//           width="30em"
//           draggable="false"
//           onClick={handleOnFind}
//         />
//         <img
//           className="hover:bg-blue-100 active:bg-blue-50 select-none"
//           src={DeleteButton}
//           width="30em"
//           draggable="false"
//           onClick={handleOnDelete}
//         />
//       </div>
//     </div>
//   );
// }
// function AnswerDetail({ answer }) {
//   return (
//     <div className="absolute left-96 top-0 bg-blue-200 w-96 p-3">
//       <div>
//         <div className="">
//           <span className="font-bold">Evaluation ID</span>
//           {": "}
//           {answer.query_id}
//         </div>
//         <div className="">
//           <span className="font-bold">Video ID</span>
//           {": "}
//           {answer.video_id}
//         </div>
//         <div className="">
//           <span className="font-bold">Frame ID</span>
//           {": "}
//           {answer.frame_id}
//         </div>
//         <div className="">
//           <span className="font-bold">Time</span>
//           {": "}
//           {answer.time}
//         </div>
//         <div className="">
//           <span className="font-bold">Answer</span>
//           {": "}
//           {answer.answer}
//         </div>
//         <div className="">
//           <span className="font-bold">Result</span>
//           {": "}
//           {answer.correct ? "Correct" : "Wrong"}
//         </div>
//         <div className="">
//           <span className="font-bold">Submitted at</span>
//           {": "}
//           {answer.submitted}
//         </div>
//       </div>
//     </div>
//   );
// }
// function AuthHeader({}) {
//   const { updateAuth } = useContext(AuthContext);
//   return (
//     <div>
//       <Form
//         className="p-1 flex flex-row space-x-1 bg-blue-200"
//         onSubmit={(e) => {
//           e.preventDefault();
//           const formData = new FormData(e.target);
//           updateAuth(formData.get("username"), formData.get("password"));
//         }}
//       >
//         <input
//           className="min-w-0 p-1"
//           type="text"
//           name="username"
//           placeholder="username"
//         />
//         <input
//           className="min-w-0 p-1"
//           type="password"
//           name="password"
//           placeholder="password"
//         />
//         <input
//           className="px-2 py-1 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded-xl "
//           type="submit"
//           value="Sign in"
//         />
//       </Form>
//     </div>
//   );
// }
//
// function AnswerHeader({}) {
//   const { evaluationIds, submitAnswer } = useContext(AuthContext);
//   const fetcher = useFetcher({ key: "answers" });
//   return (
//     <fetcher.Form
//       onSubmit={(e) => {
//         e.preventDefault();
//         const formData = new FormData(e.currentTarget);
//         const data = Object.fromEntries(formData);
//         const newAnswer = {
//           ...data,
//         };
//         submitAnswer(newAnswer);
//       }}
//       action="/answers"
//       method="POST"
//     >
//       <div className="p-1 w-full flex flex-row flex-wrap justify-center items-center bg-lime-100">
//         <select
//           required
//           type="text"
//           name="query_id"
//           autoComplete="off"
//           className="basis-1/3 py-1 px-2 border-black border-r-2 min-w-0 focus:outline-none"
//         >
//           {evaluationIds.map((e) => (
//             <option key={e.id} value={e.id}>
//               {e.name}
//             </option>
//           ))}
//         </select>
//         <input
//           required
//           type="text"
//           name="video_id"
//           placeholder="Video ID"
//           autoComplete="off"
//           className="basis-1/3 py-1 px-2 border-black border-r-2 min-w-0 focus:outline-none"
//         />
//         <input
//           required
//           type="text"
//           name="time"
//           placeholder="Time"
//           autoComplete="off"
//           className="basis-1/3 py-1 px-2 min-w-0 focus:outline-none"
//         />
//         <input
//           type="text"
//           name="answer"
//           placeholder="Answer"
//           autoComplete="off"
//           className="flex-[1_0_100%] py-1 px-2 min-w-0 focus:outline-none mt-2"
//         />
//         <input
//           type="submit"
//           value="Submit"
//           className="flex-grow-0 mt-2 rounded-xl border-2 border-black text-lg px-4 py-1 bg-sky-100 focus:outline-none hover:bg-sky-200 active:bg-sky-300"
//         />
//       </div>
//     </fetcher.Form>
//   );
// }
//
// export default function AnswerSidebar({}) {
//   const { submitAnswer } = useContext(AuthContext);
//   const fetcher = useFetcher({ key: "answers" });
//   const [selected, setSelected] = useState(null);
//   const [downloadList, setDownloadList] = useState([]);
//   const playVideo = usePlayVideo();
//
//   useEffect(() => {
//     if (fetcher.state === "idle" && !fetcher.data) {
//       fetcher.load("/answers");
//     }
//   }, [fetcher]);
//
//   const handleOnSelect = (answer) => {
//     setSelected(answer);
//   };
//   const handleOnClick = (answer) => {
//     if (downloadList.includes(answer.id)) {
//       setDownloadList(downloadList.filter((id) => id != answer.id));
//     } else {
//       setDownloadList([...downloadList, answer.id]);
//     }
//   };
//   const handleOnSubmitAnswer = async (a) => {
//     submitAnswer(a);
//   };
//
//   const handleDownloadAnswersCSV = async () => {
//     if (downloadList.length === 0) {
//       return;
//     }
//
//     const selectedAnswers = await getAnswersByIds(downloadList);
//     let csvContent = "video_id,frame_id,answer\n";
//
//     for (const answer of selectedAnswers) {
//       csvContent += `${answer.video_id},${answer.frame_id || answer.frame_counter || ''},${answer.answer || ''}\n`;
//     }
//
//     const blob = getBlob(csvContent, "text/csv");
//     downloadFile(blob, `answers_${Date.now()}.csv`);
//   };
//
//   return (
//     <div className="relative p-2">
//       <div className="flex flex-col">
//         <AuthHeader />
//         <AnswerHeader />
//         {downloadList.length > 0 && (
//           <div className="p-2 bg-blue-100 flex justify-between items-center">
//             <span>{downloadList.length} answers selected</span>
//             <button
//               onClick={handleDownloadAnswersCSV}
//               className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 active:bg-green-800"
//             >
//               Download CSV
//             </button>
//           </div>
//         )}
//         {fetcher.data &&
//           fetcher.data
//             .toReversed()
//             .map((answer) => (
//               <AnswerItem
//                 key={answer.id}
//                 answer={answer}
//                 selected={selected !== null && selected.id === answer.id}
//                 inList={downloadList.includes(answer.id)}
//                 onSelect={handleOnSelect}
//                 onClick={handleOnClick}
//                 onSubmitAnswer={handleOnSubmitAnswer}
//               />
//             ))}
//       </div>
//       {selected !== null && <AnswerDetail answer={selected} />}
//     </div>
//   );
// }

import { useFetcher, useSubmit, useSearchParams, Form } from "react-router-dom";
import { useState, useEffect } from "react";
import JSZip from "jszip";
import classNames from "classnames";

import FindButton from "../assets/search-btn.svg";
import PlayButton from "../assets/play-btn.svg";
import DeleteButton from "../assets/delete-btn.svg";
import EditButton from "../assets/edit-btn.svg";
import DownloadButton from "../assets/download-btn.svg";

import { usePlayVideo } from "./VideoPlayer.jsx";
import { useSelected } from "./SelectedProvider.jsx";
import { getCSV, getAnswersByIds } from "../services/answer.js";
import { getBlob, downloadFile } from "../utils/files.js";
import { getFrameInfo } from "../services/search.js";

function AnswerItem({
                        answer,
                        onSelect,
                        selected,
                        onClick,
                        inList,
                        onDownload,
                    }) {
    const [isEditing, setIsEditing] = useState(false);
    const submit = useSubmit();
    const [searchParams, setSearchParams] = useSearchParams();
    const fetcher = useFetcher({ key: "answers" });
    const playVideo = usePlayVideo();

    const handleOnMouseLeave = async () => {
        if (selected) {
            onSelect(null);
        }
    };

    const handleOnMouseEnter = async () => {
        if (!selected) {
            onSelect(answer);
        }
    };
    const handleOnPlay = async (e) => {
        const frameInfo = await getFrameInfo(answer.video_id, answer.frame_counter);
        frameInfo.frame_counter = answer.frame_counter;
        playVideo(frameInfo);
    };
    const handleOnFind = async () => {
        const frameInfo = await getFrameInfo(answer.video_id, answer.frame_id);
        if (!frameInfo.id) {
            return;
        }
        const currentParams = Object.fromEntries(searchParams);
        const filteredParams = Object.keys(currentParams)
            .filter((k) => (k !== "q" && k != "offset"))
            .reduce((obj, key) => {
                obj[key] = currentParams[key];
                return obj;
            }, {});

        submit(
            {
                ...filteredParams,
                id: frameInfo.id,
            },
            { action: "/similar" },
        );
    };
    const handleOnDelete = async () => {
        onSelect(null);
        fetcher.submit(null, {
            method: "POST",
            action: `/answers/${answer.id}/delete`,
        });
    };
    if (isEditing) {
        return (
            <fetcher.Form
                action={`/answers/${answer.id}/edit`}
                method="POST"
                onSubmit={(e) => {
                    e.preventDefault();
                    fetcher.submit(e.currentTarget);
                    setIsEditing(false);
                }}
            >
                <div className="p-1 w-full flex flex-row flex-wrap justify-center items-center bg-lime-100">
                    <input
                        required
                        type="text"
                        name="query_id"
                        placeholder="Query ID"
                        autoComplete="off"
                        defaultValue={answer.query_id}
                        className="basis-1/3 py-1 px-2 border-black border-r-2 min-w-0 focus:outline-none"
                    />
                    <input
                        required
                        type="text"
                        name="video_id"
                        placeholder="Video ID"
                        autoComplete="off"
                        defaultValue={answer.video_id}
                        className="basis-1/3 py-1 px-2 border-black border-r-2 min-w-0 focus:outline-none"
                    />
                    <input
                        required
                        type="text"
                        name="frame_id"
                        placeholder="Frame ID"
                        autoComplete="off"
                        defaultValue={answer.frame_id}
                        className="basis-1/3 py-1 px-2 min-w-0 focus:outline-none"
                    />
                    <input
                        required
                        type="text"
                        name="frame_counter"
                        placeholder="Frame Counter"
                        autoComplete="off"
                        defaultValue={answer.frame_counter}
                        className="flex-[1_0_50%] border-black border-r-2 py-1 px-2 min-w-0 focus:outline-none mt-2"
                    />
                    <input
                        type="text"
                        name="answer"
                        placeholder="Answer"
                        autoComplete="off"
                        defaultValue={answer.answer}
                        className="flex-[1_0_50%] py-1 px-2 min-w-0 focus:outline-none mt-2"
                    />
                    <input
                        type="submit"
                        value="Edit"
                        className="flex-grow-0 mt-2 rounded-xl border-2 border-black text-lg px-4 py-1 bg-sky-100 focus:outline-none hover:bg-sky-200 active:bg-sky-300"
                    />
                    <input
                        type="button"
                        value="Cancle"
                        onClick={() => {
                            setIsEditing(false);
                        }}
                        className="ml-5 flex-grow-0 mt-2 rounded-xl text-lg text-white px-4 py-1 bg-red-600 focus:outline-none hover:bg-red-500 active:bg-red-400"
                    />
                </div>
            </fetcher.Form>
        );
    }
    return (
        <div
            className={classNames(
                "w-full flex flex-row justify-between items-center py-2",
                {
                    "bg-violet-200 hover:bg-violet-300": inList,
                    "bg-blue-200 font-bold": !inList && selected,
                    "hover:bg-blue-100": !inList && !selected,
                },
            )}
            onMouseLeave={handleOnMouseLeave}
            onMouseEnter={handleOnMouseEnter}
            onClick={() => {
                onClick(answer);
            }}
        >
            <div id="answer-description">
                <div className="">{answer.query_id}</div>
            </div>
            <div
                id="answer-option"
                className="flex flex-row"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    className="hover:bg-blue-100 active:bg-blue-50 select-none"
                    src={EditButton}
                    width="30em"
                    draggable="false"
                    onClick={() => {
                        setIsEditing(true);
                    }}
                />
                <img
                    className="hover:bg-blue-100 active:bg-blue-50 select-none"
                    src={DownloadButton}
                    width="30em"
                    draggable="false"
                    onClick={() => {
                        onDownload(answer);
                    }}
                />
                <img
                    className="hover:bg-blue-100 active:bg-blue-50 select-none"
                    src={PlayButton}
                    width="30em"
                    draggable="false"
                    onClick={handleOnPlay}
                />
                <img
                    className="hover:bg-blue-100 active:bg-blue-50 select-none"
                    src={FindButton}
                    width="30em"
                    draggable="false"
                    onClick={handleOnFind}
                />
                <img
                    className="hover:bg-blue-100 active:bg-blue-50 select-none"
                    src={DeleteButton}
                    width="30em"
                    draggable="false"
                    onClick={handleOnDelete}
                />
            </div>
        </div>
    );
}
function AnswerDetail({ answer }) {
    return (
        <div className="absolute left-96 top-0 bg-blue-200 w-52 p-3">
            <div>
                <div className="">
                    <span className="font-bold">Query ID</span>
                    {": "}
                    {answer.query_id}
                </div>
                <div className="">
                    <span className="font-bold">Video ID</span>
                    {": "}
                    {answer.video_id}
                </div>
                <div className="">
                    <span className="font-bold">Frame ID</span>
                    {": "}
                    {answer.frame_id}
                </div>
                <div className="">
                    <span className="font-bold">Answer</span>
                    {": "}
                    {answer.answer}
                </div>
            </div>
        </div>
    );
}

function AnswerHeader({}) {
    const fetcher = useFetcher({ key: "answers" });
    const { selected } = useSelected();
    
    const selectedFramesText = selected.length > 0 ? selected.join(", ") : "";
    
    return (
        <fetcher.Form action="/answers" method="POST">
            <div className="p-1 w-full flex flex-row flex-wrap justify-center items-center bg-lime-100">
                <input
                    required
                    type="text"
                    name="query_id"
                    placeholder="Query ID"
                    autoComplete="off"
                    className="basis-1/3 py-1 px-2 border-black border-r-2 min-w-0 focus:outline-none"
                />
                <input
                    required
                    type="text"
                    name="video_id"
                    placeholder="Video ID"
                    autoComplete="off"
                    className="basis-1/3 py-1 px-2 border-black border-r-2 min-w-0 focus:outline-none"
                />
                <input
                    required
                    type="text"
                    name="frame_counter"
                    placeholder="Frame Counter(s) - comma separated"
                    autoComplete="off"
                    value={selectedFramesText}
                    className="basis-1/3 py-1 px-2 min-w-0 focus:outline-none"
                    onChange={(e) => {}}
                />
                <input
                    type="text"
                    name="answer"
                    placeholder="Answer"
                    autoComplete="off"
                    className="flex-[1_0_100%] py-1 px-2 min-w-0 focus:outline-none mt-2"
                />
                <input
                    type="submit"
                    value="Add"
                    className="flex-grow-0 mt-2 rounded-xl border-2 border-black text-lg px-4 py-1 bg-sky-100 focus:outline-none hover:bg-sky-200 active:bg-sky-300"
                />
            </div>
        </fetcher.Form>
    );
}

function SelectedFramesPreview() {
    const { selected } = useSelected();
    
    if (selected.length === 0) {
        return null;
    }
    
    return (
        <div className="p-2 bg-green-100 border border-green-300 rounded">
            <div className="text-sm font-bold text-green-800 mb-1">
                Selected Frames ({selected.length}):
            </div>
            <div className="text-xs text-green-700 break-words">
                {selected.join(", ")}
            </div>
        </div>
    );
}

export default function AnswerSidebar({}) {
    const fetcher = useFetcher({ key: "answers" });
    const [selected, setSelected] = useState(null);
    const [downloadStep, setDownloadStep] = useState(50);
    const [downloadN, setDownloadN] = useState(5);
    const [downloadList, setDownloadList] = useState([]);
    const playVideo = usePlayVideo();

    useEffect(() => {
        if (fetcher.state === "idle" && !fetcher.data) {
            fetcher.load("/answers");
        }
    }, [fetcher]);

    const handleOnSelect = (answer) => {
        setSelected(answer);
    };
    const handleOnClick = (answer) => {
        if (downloadList.includes(answer.id)) {
            setDownloadList(downloadList.filter((id) => id != answer.id));
        } else {
            setDownloadList([...downloadList, answer.id]);
        }
    };
    const handleOnSingleDownload = async (a) => {
        const csvData = getCSV(a, downloadN, downloadStep);
        const csvBlob = getBlob(csvData, "text/csv");
        downloadFile(csvBlob, `query-${a.query_id}.csv`);
    };
    const handleOnBulkDownload = async (e) => {
        e.preventDefault();
        const downloadAnswers = await getAnswersByIds(downloadList);
        const zip = new JSZip();
        for (const a of downloadAnswers) {
            const csvData = getCSV(a, downloadN, downloadStep);
            zip.file(`query-${a.query_id}.csv`, csvData);
        }
        zip.generateAsync({ type: "blob" }).then((content) => {
            downloadFile(content, "submission.zip");
        });
    };

    return (
        <div className="relative p-2">
            <div className="flex flex-col">
                <AnswerHeader />
                <SelectedFramesPreview />
                <Form onSubmit={handleOnBulkDownload}>
                    <div className="flex flex-col items-center p-1 w-full bg-red-100">
                        <div className="flex flex-row justify-center items-center">
                            <label htmlFor="n" className="mr-1 font-bold text-black">
                                N:
                            </label>
                            <input
                                required
                                type="text"
                                name="n"
                                placeholder="n"
                                autoComplete="off"
                                value={downloadN}
                                onChange={(e) => {
                                    setDownloadN(e.target.value);
                                }}
                                className="basis-1/4 py-1 px-2 mr-3 min-w-0 focus:outline-none"
                            />
                            <label htmlFor="step" className="mr-1 font-bold text-black">
                                Step:
                            </label>
                            <input
                                required
                                type="text"
                                name="step"
                                placeholder="step"
                                autoComplete="off"
                                value={downloadStep}
                                onChange={(e) => {
                                    setDownloadStep(e.target.value);
                                }}
                                className="basis-1/4 py-1 px-2 min-w-0 focus:outline-none"
                            />
                        </div>
                        <input
                            disabled={downloadList.length === 0}
                            type="submit"
                            value="Download"
                            className="flex-grow-0 mt-2 rounded-xl border-2 border-black text-lg px-4 py-1 bg-sky-100 focus:outline-none hover:bg-sky-200 active:bg-sky-300 disabled:bg-slate-100 disabled:border-slate-300 disabled:text-slate-300"
                        />
                    </div>
                </Form>
                {fetcher.data &&
                    fetcher.data.map((answer) => (
                        <AnswerItem
                            key={answer.id}
                            answer={answer}
                            selected={selected !== null && selected.id === answer.id}
                            inList={downloadList.includes(answer.id)}
                            onSelect={handleOnSelect}
                            onClick={handleOnClick}
                            onDownload={handleOnSingleDownload}
                        />
                    ))}
            </div>
            {selected !== null && <AnswerDetail answer={selected} />}
        </div>
    );
}