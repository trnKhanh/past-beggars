import { useFetcher } from "react-router-dom";
import { createContext, useEffect, useContext, useState, useRef } from "react";
import { AuthContext } from "./AuthProvider";
import { useSelected } from "./SelectedProvider.jsx";
import { getFrameInfo } from "../services/search.js";
export const VideoContext = createContext({ playVideo: null });

export default function VideoProvider({ children }) {
  const [frameInfo, setFrameInfo] = useState(null);
  const playVideo = async (f, keyframe) => {
    const res = await getFrameInfo(f.video_id, keyframe);
    res.frame_id = keyframe;
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
  const { selected } = useSelected();
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
      const isInInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
      
      switch (e.keyCode) {
        case 27: // Escape - close video player
          onCancle();
          return;
        case 13: // Enter - focus answer input or shift+enter to submit
          if (e.shiftKey) {
            e.preventDefault();
            document.querySelector("#answer-form input[type=submit]").click();
          } else if (!isInInput) {
            document.querySelector("#answer-form input[name=answer]").focus();
          }
          return;
        case 191: // Shift + / - Jump to answer
          if (e.shiftKey) {
            e.preventDefault();
            document.querySelector("#answer-form input[name=answer]").focus();
          }
          return;
        case 75: // K - Play/pause
          if (!isInInput) {
            e.preventDefault();
            if (videoElement.paused) videoElement.play();
            else videoElement.pause();
          }
          return;
        case 37: // Left arrow - Go 5s back
          if (!isInInput) {
            e.preventDefault();
            videoElement.currentTime = Math.max(videoElement.currentTime - 5, 0);
          }
          return;
        case 39: // Right arrow - Go 5s forward
          if (!isInInput) {
            e.preventDefault();
            videoElement.currentTime = Math.min(
              videoElement.currentTime + 5,
              videoElement.duration,
            );
          }
          return;
        case 219: // [ - Go frame by frame back
          if (!isInInput) {
            e.preventDefault();
            videoElement.currentTime = Math.max(videoElement.currentTime - 1/fps, 0);
          }
          return;
        case 221: // ] - Go frame by frame forward
          if (!isInInput) {
            e.preventDefault();
            videoElement.currentTime = Math.min(
              videoElement.currentTime + 1/fps,
              videoElement.duration,
            );
          }
          return;
        case 189: // - - Decrease speed
          if (!isInInput) {
            e.preventDefault();
            videoElement.playbackRate = Math.max(
              videoElement.playbackRate - 0.25,
              0.25,
            );
          }
          return;
        case 187: // + - Increase speed
          if (!isInInput) {
            e.preventDefault();
            videoElement.playbackRate = Math.min(
              videoElement.playbackRate + 0.25,
              4,
            );
          }
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
      className="fixed flex items-center justify-center z-10 w-screen h-screen bg-black bg-opacity-25 z-20"
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
          id="playing-vide"
          key={frameInfo.video_uri}
          controls
          autoPlay
          className="w-auto h-[40rem]"
        >
          <source src={frameInfo.video_uri} type="video/mp4" />
        </video>
      </div>
    </div>
  );
}
