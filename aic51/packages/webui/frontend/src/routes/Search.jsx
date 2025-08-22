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
import { Dropdown, Editable } from "../components/Filter.jsx";
import { AdvanceQueryContainer } from "../components/AdvanceQuery.jsx";
import PreviousButton from "../assets/previous-btn.svg";
import NextButton from "../assets/next-btn.svg";
import HomeButton from "../assets/home-btn.svg";
import SpinIcon from "../assets/spin.svg";

import {
  nlist,
  limitOptions,
  ef_default,
  nprobeOption,
  temporal_k_default,
  ocr_weight_default,
  ocr_threshold_default,
  object_weight_default,
  max_interval_default,
} from "../resources/options.js";

export async function loader({ request }) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const q = searchParams.get("q");
  const _offset = searchParams.get("offset") || 0;
  const selected = searchParams.get("selected") || undefined;
  const limit = searchParams.get("limit") || limitOptions[0];
  const ef = searchParams.get("ef") || ef_default;
  const nprobe = searchParams.get("nprobe") || nprobeOption[0];
  const model = searchParams.get("model") || undefined;
  const temporal_k = searchParams.get("temporal_k") || temporal_k_default;
  const ocr_weight = searchParams.get("ocr_weight") || ocr_weight_default;
  const ocr_threshold =
    searchParams.get("ocr_threshold") || ocr_threshold_default;
  const object_weight =
    searchParams.get("object_weight") || object_weight_default;
  const max_interval = searchParams.get("max_interval") || max_interval_default;

  const { total, frames, params, offset } = await search(
    q,
    _offset,
    limit,
    ef,
    nprobe,
    model,
    temporal_k,
    ocr_weight,
    ocr_threshold,
    object_weight,
    max_interval,
    selected,
  );
  const query = q ? { q } : {};

  return {
    query,
    params,
    selected,
    offset,
    data: { total, frames },
  };
}

export default function Search() {
  const navigation = useNavigation();
  const { modelOptions, objectOptions } = useOutletContext();
  const submit = useSubmit();
  const { query, params, offset, data, selected } = useLoaderData();
  const playVideo = usePlayVideo();
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [qState, setqState] = useState("");

  const { q = "", id = null } = query;
  const { limit, ef, nprobe, model } = params;

  const { total, frames } = data;
  const empty = frames.length === 0;

  useEffect(() => {
    // Set correct values
    setqState(q || "");
    document.querySelector("#search-bar").focus();

    document.title = q;
  }, [q]);

  for (const [k, v] of Object.entries(params)) {
    useEffect(() => {
      document.querySelector(`#${k}`).value = v;
    }, [v]);
  }

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
      switch (e.keyCode) {
        case 38:
          e.preventDefault();
          goToPreviousPage();
          return;
        case 40:
          e.preventDefault();
          goToNextPage();
          return;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [offset]);

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

  const handleOnSelect = (frame) => {
    setSelectedFrame(frame.id);
    submit(
      {
        q: "video:" + frame.video_id,
        ...params,
        selected: frame.id,
      },
      { action: "/search" },
    );
  };
  const handleOnChangeParams = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {};
    for (const [k, v] of formData.entries()) {
      data[k] = v;
    }
    if (selected) {
      submit({
        ...query,
        ...data,
        selected,
      });
    } else {
      submit({
        ...query,
        ...data,
      });
    }
  };
  const handleOnChangeAdvanceQuery = (newq) => {
    setqState(newq);
  };
  const handleOnSearch = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {};
    for (const [k, v] of formData.entries()) {
      data[k] = v;
    }
    document.activeElement.blur();
    submit(
      {
        ...data,
        ...params,
      },
      { action: "/search" },
    );
  };

  return (
    <div id="search-area" className="flex flex-col shrink">
      <Form className="flex flex-row" onSubmit={handleOnChangeParams}>
        <input
          className="self-center h-fit text-md px-4 py-1 border-2 border-gray-500 rounded-xl bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-700 text-xs"
          type="submit"
          value="Apply"
        />
        <div className="py-1 px-5 self-stretch text-xs justify-start items-center flex flex-row flex-wrap">
          <Editable name="ef" defaultValue={ef_default} />
          <Dropdown name="nprobe" options={nprobeOption} />
          <Dropdown name="limit" options={limitOptions} />
          <Dropdown name="model" options={modelOptions} />
          <Editable name="temporal_k" defaultValue={temporal_k_default} />
          <Editable name="ocr_weight" defaultValue={ocr_weight_default} />
          <Editable name="ocr_threshold" defaultValue={ocr_threshold_default} />
          <Editable name="object_weight" defaultValue={object_weight_default} />
          <Editable name="max_interval" defaultValue={max_interval_default} />
        </div>
      </Form>

      <Form id="search-form" onSubmit={handleOnSearch}>
        <div className="flex flex-col p-1 px-5 space-y-2 bg-gray-100">
          <div className="flex flex-row space-x-5">
            <img
              className={classNames("h-8 w-8 self-center", {
                "visible animate-spin": navigation.state === "loading",
                invisible: navigation.state !== "loading",
              })}
              src={SpinIcon}
            />
            <textarea
              form="search-form"
              autoComplete="off"
              className=" flex-grow text-xs p-1 border-2 rounded-xl border-gray-700 bg-gray-200 text-gray-500 focus:border-black focus:bg-white focus:text-black focus:outline-none"
              name="q"
              value={qState}
              id="search-bar"
              type="search"
              placeholder="Search"
              onKeyDown={(e) => {
                // Bad practice
                if (e.keyCode === 13 && e.shiftKey === false) {
                  e.preventDefault();
                  document.querySelector("#search-form input").click();
                }
              }}
              onChange={(e) => {
                setqState(e.target.value);
              }}
            />

            <input
              className="self-center text-lg py-1 px-4 border-2 rounded-xl bg-gray-700 text-white hover:bg-gray-500 active:bg-gray-400"
              type="submit"
              value="Search"
            />
          </div>
          <AdvanceQueryContainer
            q={qState}
            onChange={handleOnChangeAdvanceQuery}
            objectOptions={objectOptions}
            onSubmit={() => {
              document.querySelector("#search-form input").click();
            }}
          />
        </div>
      </Form>

      <div
        id="nav-bar"
        className="p-1 flex flex-row justify-center items-center text-xl font-bold"
      >
        <img
          onClick={() => {
            goToFirstPage();
          }}
          className="hover:bg-gray-200 active:bg-gray-300"
          width="35em"
          src={HomeButton}
          draggable="false"
        />

        <img
          onClick={() => {
            goToPreviousPage();
          }}
          className="hover:bg-gray-200 active:bg-gray-300"
          width="35em"
          src={PreviousButton}
          draggable="false"
        />
        <div className="w-10 text-center">{Math.floor(offset / limit) + 1}</div>
        <img
          onClick={() => {
            goToNextPage();
          }}
          className="hover:bg-gray-200 active:bg-gray-300"
          width="35em"
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
            {frames.map((frame) => (
              <FrameItem
                key={frame.id}
                video_id={frame.video_id}
                frame_id={frame.frame_id}
                thumbnail={frame.frame_uri}
                onPlay={() => {
                  handleOnPlay(frame);
                }}
                onSearchSimilar={() => {
                  handleOnSearchSimilar(frame);
                }}
                onSelect={() => {
                  handleOnSelect(frame);
                }}
                selected={selectedFrame === frame.id}
              />
            ))}
          </FrameContainer>
        </div>
      )}
    </div>
  );
}
