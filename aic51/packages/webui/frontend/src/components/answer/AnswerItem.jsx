import { useFetcher, useSubmit, useSearchParams } from "react-router-dom";
import {useContext, useState} from "react";
import classNames from "classnames";

import FindButton from "../../assets/search-btn.svg";
import PlayButton from "../../assets/play-btn.svg";
import DeleteButton from "../../assets/delete-btn.svg";
import EditButton from "../../assets/edit-btn.svg";
import SubmitButton from "../../assets/upload-btn.svg";
// import DownloadButton from "../../assets/download-btn.svg";

import { usePlayVideo } from "../VideoPlayer.jsx";
import { getFrameInfo } from "../../services/search.js";
import {AuthContext} from "../AuthProvider.jsx";

export default function AnswerItem({
    answer,
    onSelect,
    selected,
    onClick,
    inList,
    // onDownload,
    onSubmitAnswer
}) {
    const { evaluationIds } = useContext(AuthContext);
    const [isEditing, setIsEditing] = useState(false);
    const submit = useSubmit();
    const [searchParams] = useSearchParams();
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
        const frameInfo = await getFrameInfo(answer.video_id, answer.frame_id);
        frameInfo.frame_counter = answer.frame_counter[0];
        playVideo(frameInfo, frameInfo.frame_id);
    };

    const handleOnFind = async () => {
        const frameInfo = await getFrameInfo(answer.video_id, answer.frame_id);
        if (!frameInfo.id) {
            return;
        }
        const currentParams = Object.fromEntries(searchParams);
        const filteredParams = Object.keys(currentParams)
            .filter((k) => (k !== "q" && k !== "offset"))
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
                className="mt-2"
                action={`/answers/${answer.id}/edit`}
                method="POST"
                onSubmit={(e) => {
                    e.preventDefault();
                    fetcher.submit(e.currentTarget);
                    setIsEditing(false);
                }}
            >
                <div className="p-1 w-full flex flex-row flex-wrap justify-center items-center bg-lime-100">
                    <select
                        required
                        type="text"
                        name="query_id"
                        autoComplete="off"
                        className="basis-1/4 py-1 px-2 border-black border-r-2 min-w-0 focus:outline-none"
                    >
                      {evaluationIds.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                    {/*<input*/}
                    {/*    required*/}
                    {/*    type="text"*/}
                    {/*    name="query_id"*/}
                    {/*    placeholder="Query ID"*/}
                    {/*    autoComplete="off"*/}
                    {/*    defaultValue={answer.query_id}*/}
                    {/*    className="basis-1/3 py-1 px-2 border-black border-r-2 min-w-0 focus:outline-none"*/}
                    {/*/>*/}
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
                        className="basis-5/12 py-1 px-2 min-w-0 focus:outline-none"
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
                "w-full flex flex-row justify-center items-center py-2 px-2",
                {
                      "bg-green-200": answer.correct,
                      "bg-red-200": !answer.correct,
                      "bg-green-300 font-bold": selected && answer.correct,
                      "bg-red-300 font-bold": selected && !answer.correct,
                      "border-2 border-blue-500": inList && !selected,
                    // "bg-violet-200 hover:bg-violet-300": inList,
                    // "bg-blue-200 font-bold": !inList && selected,
                    // "hover:bg-blue-100": !inList &&
                },
            )}
            onMouseLeave={handleOnMouseLeave}
            onMouseEnter={handleOnMouseEnter}
            onClick={() => {
                onClick(answer);
            }}
        >
            <div id="answer-description">
                <div className="text-sm basis-3/5">{answer.query_id}</div>
            </div>
            <div
                id="answer-option"
                className="flex flex-row basis-2/5"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    className="hover:bg-blue-100 active:bg-blue-50 select-none"
                    src={EditButton}
                    width="25em"
                    draggable="false"
                    onClick={() => {
                        setIsEditing(true);
                    }}
                    alt={"Edit Button"}
                />
                <img
                  className="hover:bg-blue-100 active:bg-blue-50 select-none"
                  src={SubmitButton}
                  width="25em"
                  draggable="false"
                  onClick={() => {
                    onSubmitAnswer(answer);
                  }}
                />
                {/*<img*/}
                {/*    className="hover:bg-blue-100 active:bg-blue-50 select-none"*/}
                {/*    src={DownloadButton}*/}
                {/*    width="30em"*/}
                {/*    draggable="false"*/}
                {/*    onClick={() => {*/}
                {/*        onDownload(answer);*/}
                {/*    }}*/}
                {/*    alt={"Download Button"}*/}
                {/*/>*/}
                <img
                    className="hover:bg-blue-100 active:bg-blue-50 select-none"
                    src={PlayButton}
                    width="25em"
                    draggable="false"
                    onClick={handleOnPlay}
                    alt={"Play Button"}
                />
                <img
                    className="hover:bg-blue-100 active:bg-blue-50 select-none"
                    src={FindButton}
                    width="25em"
                    draggable="false"
                    onClick={handleOnFind}
                    alt={"Find Button"}
                />
                <img
                    className="hover:bg-blue-100 active:bg-blue-50 select-none"
                    src={DeleteButton}
                    width="25em"
                    draggable="false"
                    onClick={handleOnDelete}
                    alt={"Delete Button"}
                />
            </div>
        </div>
    );
}