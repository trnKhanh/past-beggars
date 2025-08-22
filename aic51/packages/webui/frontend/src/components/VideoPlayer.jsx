import { useFetcher } from "react-router-dom";
import { createContext, useEffect, useContext, useState, useRef } from "react";
import { AuthContext } from "./AuthProvider";
import { getFrameInfo } from "../services/search.js";
export const VideoContext = createContext({ playVideo: null });

export default function VideoProvider({ children }) {
  const [frameInfo, setFrameInfo] = useState(null);
  const playVideo = async (f) => {
    const res = await getFrameInfo(f.video_id, f.frame_id);
    setFrameInfo(res);
  };
  const handleOnCancle = () => {
    setFrameInfo(null);
  };
  return (
    <VideoContext.Provider
      value={{
        playVideo: playVideo,
      }}
    >
      {frameInfo !== null && (
        <VideoPlayer frameInfo={frameInfo} onCancle={handleOnCancle} />
      )}
      {children}
    </VideoContext.Provider>
  );
}
export function usePlayVideo() {
  const { playVideo } = useContext(VideoContext);
  return playVideo;
}
function VideoPlayer({ frameInfo, onCancle }) {
  const { evaluationIds, submitAnswer } = useContext(AuthContext);
  const fetcher = useFetcher({ key: "answers" });
  const videoElementRef = useRef(null);
  const [frameCounter, setFrameCounter] = useState(0);

  useEffect(() => {
    const fps = frameInfo.fps;
    const videoElement = videoElementRef.current;
    videoElement.currentTime =
      frameInfo.time || parseInt(frameInfo.frame_id) / fps - 0.5;
    videoElement.focus();

    const handleKeyDown = (e) => {
      if (e.keyCode !== 27 && document.activeElement !== videoElement) return;
      switch (e.keyCode) {
        case 27:
          onCancle();
          return;
        case 13:
          document.querySelector("#answer-form input").focus();
          return;
        case 75:
          if (videoElement.paused) videoElement.play();
          else videoElement.pause();
          return;
        case 219:
          videoElement.currentTime = Math.max(videoElement.currentTime - 1, 0);
          return false;
        case 221:
          videoElement.currentTime = Math.min(
            videoElement.currentTime + 1,
            videoElement.duration,
          );
          return;
        case 189:
          videoElement.playbackRate = Math.max(
            videoElement.playbackRate - 0.5,
            1,
          );
          return;
        case 187:
          videoElement.playbackRate = Math.min(
            videoElement.playbackRate + 0.5,
            10,
          );
          return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    let id = setInterval(() => {
      setFrameCounter(videoElement.currentTime * fps);
    }, 20);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearInterval(id);
    };
  }, []);
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onCancle();
      }}
      className="fixed flex items-center justify-center z-10 w-screen h-screen bg-black bg-opacity-25"
    >
      <div
        className="p-2 bg-white rounded-xl"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="flex flex-row justify-between items-center">
          <div className="">
            <div className="">
              <span className="font-bold">Video ID</span>
              {": "}
              {frameInfo.video_id}
            </div>
            <div className="">
              {" "}
              <span className="font-bold">Frame ID</span>
              {": "}
              {frameInfo.frame_id}
            </div>
            <div className="">
              {" "}
              <span className="font-bold">Frame Counter</span>
              {": "}
              {parseInt(frameCounter)}
            </div>
          </div>
          <fetcher.Form
            id="answer-form"
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data = Object.fromEntries(formData);
              const newAnswer = {
                ...data,
                video_id: frameInfo.video_id,
                frame_id: frameInfo.frame_id,
                frame_counter: frameCounter,
                time: videoElementRef.current.currentTime,
              };
              submitAnswer(newAnswer);
            }}
          >
            <div className="flex flex-row">
              <select
                required
                type="text"
                name="query_id"
                placeholder="evaluationIds"
                className="flex-1 py-1 px-2 border-black border-r-2 min-w-0 focus:outline-none"
              >
                {evaluationIds.map((e) => (
                  <option value={e.id}>{e.name}</option>
                ))}
              </select>
              <input
                type="text"
                name="answer"
                placeholder="Answer"
                autoComplete="off"
                className="flex-[2_2_0%] py-1 px-2 min-w-0 focus:outline-none"
              />
              <input
                type="submit"
                value="Submit"
                className="text-xl px-4 py-1 bg-sky-100 border border-black rounded-xl focus:outline-none hover:bg-sky-200 active:bg-sky-300"
              />
            </div>
          </fetcher.Form>
        </div>
        <video
          ref={videoElementRef}
          id="playing-video"
          key={frameInfo.video_uri}
          controls
          autoPlay
        >
          <source src={frameInfo.video_uri} type="video/mp4" />
        </video>
      </div>
    </div>
  );
}
