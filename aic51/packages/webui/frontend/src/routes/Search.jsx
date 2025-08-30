import {
  useLoaderData,
  Form,
  useSubmit,
  useOutletContext,
  useNavigation,
} from "react-router-dom";
import classNames from "classnames";
import { useEffect, useState } from "react";

import { search } from "../services/search.js";
import { FrameItem, FrameContainer } from "../components/Frame.jsx";
import { usePlayVideo } from "../components/VideoPlayer.jsx";
import { AdvanceQueryContainer } from "../components/AdvanceQuery.jsx";
import { useSelected } from "../components/SelectedProvider.jsx";
import { getTimelineColor } from "../utils/timelineColors.js";
import PreviousButton from "../assets/previous-btn.svg";
import NextButton from "../assets/next-btn.svg";
import HomeButton from "../assets/home-btn.svg";
import SpinIcon from "../assets/spin.svg";

import {
  limitOptions,
  nprobeOption,
  temporal_k_default,
  ocr_weight_default,
  max_interval_default,
} from "../resources/options.js";

export async function loader({ request }) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const q = searchParams.get("q");
  
  if (!q) {
    return {
      query: {},
      params: {},
      selected: undefined,
      offset: 0,
      data: { total: 0, frames: [] },
    };
  }

  const _offset = searchParams.get("offset") || 0;
  const selected = searchParams.get("selected") || undefined;
  const limit = searchParams.get("limit") || limitOptions[0];
  const nprobe = searchParams.get("nprobe") || nprobeOption[0];
  const temporal_k = searchParams.get("temporal_k") || temporal_k_default;
  const ocr_weight = searchParams.get("ocr_weight") || ocr_weight_default;
  const max_interval = searchParams.get("max_interval") || max_interval_default;

  const target_features = searchParams.get("target_features") || "";

  try {
    const { total, frames, offset } = await search(
      q,
      _offset,
      limit,
      nprobe,
      temporal_k,
      ocr_weight,
      max_interval,
      selected,
      target_features,
    );
    const query = q ? { q } : {};

    return {
      query,
      params: {
        limit,
        nprobe,
        temporal_k,
        ocr_weight,
        max_interval,
        target_features
      },
      selected,
      offset,
      data: { total, frames },
    };
  } catch (error) {
    console.error("Search failed:", error);
    const query = q ? { q } : {};
    
    return {
      query,
      params: {
        limit,
        nprobe,
        temporal_k,
        ocr_weight,
        max_interval,
        target_features
      },
      selected,
      offset: _offset,
      data: { total: 0, frames: [] },
      error: error.message,
    };
  }
}

export default function Search() {
  const navigation = useNavigation();
  const { targetFeatureOptions } = useOutletContext();
  const submit = useSubmit();
  const { query, params, offset, data, selected } = useLoaderData();
  console.log(params);
  const playVideo = usePlayVideo();
  const { getSelectedForSubmit, clearSelected } = useSelected();

  const { q = "", id = null } = query;
  const { limit, nprobe } = params;
  
  const [currentQuery, setCurrentQuery] = useState(q);

  const { total, frames } = data;
  const empty = frames.length === 0;

  useEffect(() => {
    setCurrentQuery(q);
    const searchBar = document.querySelector("#search-bar");
    if (searchBar) {
      searchBar.focus();
    }
    document.title = q;
  }, [q]);


  // Add hotkeys
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.keyCode) {
        case 191:
          const filterBar = document.querySelector("#search-area");
          filterBar.scrollIntoView();
          const searchBar = document.querySelector("#search-bar");
          if (searchBar !== document.activeElement) {
            e.preventDefault();
            searchBar.focus();
            return false;
          }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
  useEffect(() => {
    document.title = q + `(${Math.floor(offset / limit) + 1})`;
    const handleKeyDown = (e) => {
      const isInInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
      
      switch (e.keyCode) {
        case 38: // Up arrow - Previous page
          e.preventDefault();
          goToPreviousPage();
          return;
        case 40: // Down arrow - Next page
          e.preventDefault();
          goToNextPage();
          return;
        case 37: // Left arrow - Go 5s back (placeholder for video)
          if (!isInInput) {
            e.preventDefault();
          }
          return;
        case 39: // Right arrow - Go 5s forward (placeholder for video)
          if (!isInInput) {
            e.preventDefault();
          }
          return;
        case 219: // [ - Go frame by frame back
          if (!isInInput) {
            e.preventDefault();
          }
          return;
        case 221: // ] - Go frame by frame forward
          if (!isInInput) {
            e.preventDefault();
            console.log("Go frame forward");
          }
          return;
        case 187: // + - Increase speed
          if (!isInInput) {
            e.preventDefault();
            console.log("Increase speed");
          }
          return;
        case 189: // - - Decrease speed
          if (!isInInput) {
            e.preventDefault();
            console.log("Decrease speed");
          }
          return;
        case 13: // Enter with Shift - Submit when viewing video
          if (e.shiftKey && !isInInput) {
            e.preventDefault();
            handleSubmitSelected();
          }
          return;
        case 191: // Shift + / - Jump to answer when viewing video
          if (e.shiftKey && !isInInput) {
            e.preventDefault();
            const answerSection = document.querySelector(".relative.p-2");
            if (answerSection) {
              answerSection.scrollIntoView({ behavior: 'smooth' });
            }
          }
          return;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [offset]);

  const goToFirstPage = () => {
    submit({ ...query, ...params, offset: 0 });
  };
  
  const goToPreviousPage = () => {
    submit({ 
      ...query, 
      ...params, 
      offset: Math.max(parseInt(offset) - parseInt(limit), 0) 
    });
  };
  
  const goToNextPage = () => {
    if (!empty) {
      submit({ 
        ...query, 
        ...params, 
        offset: parseInt(offset) + parseInt(limit) 
      });
    }
  };

  const handleOnPlay = (frame, keyframe) => {
    playVideo(frame, keyframe);
  };

  const handleOnSearchSimilar = (frame, keyframe) => {
    let idx = frame.video_id + "#" + keyframe;
    submit({ id: idx, ...params }, { action: "/similar" });
  };

  const handleOnSearchNearby = (frame, keyframe) => {
    let idx = frame.video_id + "#" + keyframe;
    submit(
      {
        q: "[video:" + frame.video_id + "]",
        ...params,
        selected: idx,
      },
      { action: "/search" },
    );
  };

  const handleSubmitSelected = () => {
    const selectedFrameId = getSelectedForSubmit();
    if (selectedFrameId) {
      const [videoId, frameId] = selectedFrameId.split('#');
      
      const queryType = 'kis'; 
      
      let csvContent = '';
      
      if (queryType === 'kis') {
        csvContent = `${videoId}, ${frameId}`;
      } else if (queryType === 'qa') {
        const answer = prompt("Enter your answer (max 100 characters):");
        if (answer && answer.length <= 100) {
          const escapedAnswer = answer.includes(',') || answer.includes('"') ? 
            `"${answer.replace(/"/g, '""')}"` : answer;
          csvContent = `${videoId}, ${frameId}, ${escapedAnswer}`;
        } else {
          alert("Answer is required and must be 100 characters or less");
          return;
        }
      }
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `query-result-${queryType}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log("Generated CSV content:", csvContent);
    } else {
      alert("Please select a frame first");
    }
  };

  const handleClearSelected = () => {
    clearSelected();
  };
  const handleOnSearch = (e) => {
    e.preventDefault();
    
    const url = new URL(window.location);
    const currentParams = {};
    for (const [key, value] of url.searchParams) {
      if (!['offset'].includes(key)) {
        currentParams[key] = value;
      }
    }

    submit({ ...currentParams, q: currentQuery, offset: 0 }, { action:"/search" });
  };

  console.log(frames);

  return (
    <div id="search-area" className="flex flex-col w-full">
      <Form id="search-form" onSubmit={handleOnSearch}>
        <div className="flex flex-col p-1 px-2 space-y-1 bg-gray-100">
          <div className="flex flex-row space-x-2">
            <img
              className={classNames("h-6 w-6 self-center", {
                "visible animate-spin": navigation.state === "loading",
                invisible: navigation.state !== "loading",
              })}
              src={SpinIcon}
            />
            <textarea
              form="search-form"
              autoComplete="off"
              rows="2"
              className="flex-grow text-sm p-1 border rounded border-gray-400 bg-gray-200 text-gray-600 focus:border-black focus:bg-white focus:text-black focus:outline-none resize-none"
              name="q"
              id="search-bar"
              placeholder="Search"
              value={currentQuery}
              onChange={(e) => setCurrentQuery(e.target.value)}
              onKeyDown={(e) => {
                // Bad practice
                if (e.keyCode === 13 && e.shiftKey === false) {
                  e.preventDefault();
                  handleOnSearch(e);
                }
              }}
            />
            <button
              className="self-center text-sm py-1 px-2 border rounded bg-gray-600 text-white hover:bg-gray-500 active:bg-gray-400"
              type="button"
              onClick={(e) => {
                handleOnSearch(e);
              }}
            >
              Search
            </button>
          </div>
        </div>
      </Form>

      <AdvanceQueryContainer
        q={currentQuery}
        onChange={(newQ) => {
          setCurrentQuery(newQ);
        }}
        onSubmit={() => {
          submit({ q: currentQuery, ...params });
        }}
      />

      <div
        id="nav-bar"
        className="p-1 flex flex-row justify-center items-center text-xl font-bold"
      >
          <img
            onClick={() => {
              goToFirstPage();
            }}
            className="hover:bg-gray-200 active:bg-gray-300"
            width="50em"
            src={HomeButton}
            draggable="false"
          />

          <img
            onClick={() => {
              goToPreviousPage();
            }}
            className="hover:bg-gray-200 active:bg-gray-300"
            width="50em"
            src={PreviousButton}
            draggable="false"
          />
          <div className="w-10 text-center">{Math.floor(offset / limit) + 1}</div>
          <img
            onClick={() => {
              goToNextPage();
            }}
            className="hover:bg-gray-200 active:bg-gray-300"
            width="50em"
            src={NextButton}
            draggable="false"
          />
      </div>
      {empty ? (
        <div className="w-full text-center p-2 bg-red-500 text-white text-xl text-bold">
          END
        </div>
      ) : (
        <div
          className={classNames("", {
            "animate-pulse": navigation.state === "loading",
          })}
        >
          <FrameContainer id="result">
            {frames.map((frame, idx) => {
              let timeLines = frame.time_line || [];
              return (
                <>
                  {timeLines.map((keyframe) => {
                    return (
                      <FrameItem
                        key={String(frame.id) + String(idx) + String(keyframe)}
                        id={`${frame.video_id}#${keyframe}`}
                        video_id={frame.video_id}
                        frame_id={keyframe}
                        thumbnail={`http://127.0.0.1:6900/api/files/${frame.video_id}/${keyframe}`}
                        timelineColor={getTimelineColor(idx)}
                        onPlay={() => {
                          handleOnPlay(frame, keyframe);
                        }}
                        onSearchSimilar={() => {
                          handleOnSearchSimilar(frame, keyframe);
                        }}
                        onSearchNearby={() => {
                          handleOnSearchNearby(frame, keyframe);
                        }}
                      />
                    );
                  })}
                </>
              );
            })}
          </FrameContainer>
      </div>
    )}
    </div>
  );
}
