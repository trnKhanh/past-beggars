import {
  useLoaderData,
  useSubmit,
  useOutletContext,
  useNavigation,
} from "react-router-dom";
import classNames from "classnames";
import { useEffect } from "react";

import { searchSimilar } from "../services/search.js";
import { FrameItem, FrameContainer } from "../components/Frame.jsx";
import { usePlayVideo } from "../components/VideoPlayer.jsx";
import { useSelected } from "../components/SelectedProvider.jsx";
import PreviousButton from "../assets/previous-btn.svg";
import NextButton from "../assets/next-btn.svg";
import HomeButton from "../assets/home-btn.svg";

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

  const id = searchParams.get("id");
  const _offset = searchParams.get("offset") || 0;
  const selected = searchParams.get("selected") || undefined;
  const limit = searchParams.get("limit") || limitOptions[0];
  const nprobe = searchParams.get("nprobe") || nprobeOption[0];
  const temporal_k = searchParams.get("temporal_k") || temporal_k_default;
  const ocr_weight = searchParams.get("ocr_weight") || ocr_weight_default;
  const max_interval = searchParams.get("max_interval") || max_interval_default;

  const { total, frames, params, offset } = await searchSimilar(
    id,
    _offset,
    limit,
    nprobe,
    temporal_k,
    ocr_weight,
    max_interval,
    selected,
  );

  return {
    query: { id },
    params,
    offset,
    data: { total, frames },
  };
}

export default function SearchSimilar() {
  const navigation = useNavigation();
  const { targetFeatureOptions } = useOutletContext();
  const submit = useSubmit();
  const { query, params, offset, data } = useLoaderData();
  const playVideo = usePlayVideo();
  const { getSelectedForSubmit, clearSelected } = useSelected();

  const { id } = query;
  const { limit, nprobe } = params;

  const { total, frames } = data;
  const empty = frames.length === 0;

  useEffect(() => {
    document.title = `Similar to ${id}`;
  }, [id]);

  const goToFirstPage = () => {
    submit({
      ...query,
      ...params,
      offset: 0,
    });
  };

  const goToPreviousPage = () => {
    submit({
      ...query,
      ...params,
      offset: Math.max(parseInt(offset) - parseInt(limit), 0),
    });
  };

  const goToNextPage = () => {
    if (!empty) {
      submit({
        ...query,
        ...params,
        offset: parseInt(offset) + parseInt(limit),
      });
    }
  };

  const handleOnPlay = (frame) => {
    playVideo(frame);
  };

  const handleOnSearchSimilar = (frame) => {
    submit({ id: frame.id, ...params }, { action: "/similar" });
  };

  const handleOnSearchNearby = (frame) => {
    submit(
      {
        q: "video:" + frame.video_id,
        ...params,
        selected: frame.id,
      },
      { action: "/search" },
    );
  };

  const handleSubmitSelected = () => {
    const selectedFrameId = getSelectedForSubmit();
    if (selectedFrameId) {
      console.log("Submitting selected frame:", selectedFrameId);
    }
  };

  const handleClearSelected = () => {
    clearSelected();
  };

  return (
    <div className="flex flex-col w-full">
      <div
        id="nav-bar"
        className="p-1 flex flex-row justify-between items-center text-xl font-bold"
      >
        <div className="flex flex-row items-center">
          <button
            onClick={handleSubmitSelected}
            className="mr-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 active:bg-blue-800"
          >
            Submit Selected
          </button>
          <button
            onClick={handleClearSelected}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 active:bg-red-800"
          >
            Clear All
          </button>
        </div>
        
        <div className="flex flex-row items-center">
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
            {frames.map((frame) => (
              <FrameItem
                key={frame.id}
                id={frame.id}
                video_id={frame.video_id}
                frame_id={frame.frame_id}
                thumbnail={frame.frame_uri}
                onPlay={() => {
                  handleOnPlay(frame);
                }}
                onSearchSimilar={() => {
                  handleOnSearchSimilar(frame);
                }}
                onSearchNearby={() => {
                  handleOnSearchNearby(frame);
                }}
              />
            ))}
          </FrameContainer>
        </div>
      )}
    </div>
  );
}
