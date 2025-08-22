import classNames from "classnames";

import PlayButton from "../assets/play-btn.svg";
import SearchButton from "../assets/search-btn.svg";

export function FrameItem({
  video_id,
  frame_id,
  thumbnail,
  onPlay,
  onSearchSimilar,
  onSelect,
  selected,
}) {
  return (
    <div
      className={classNames("relative basis-1/5 flex flex-col space-y-2 p-1", {
        "bg-white hover:bg-gray-300": !selected,
        "bg-green-500": selected,
      })}
      onDoubleClick={onSelect}
    >
      <img src={thumbnail} draggable="false" />
      <div
        onClick={(e) => {
          e.stopPropagation();
        }}
        className="flex flex-row bg-white rounded-md justify-end space-x-2 items-center"
      >
        <img
          onClick={onPlay}
          className="hover:bg-gray-200 active:bg-gray-300"
          width="25em"
          src={PlayButton}
          draggable="false"
        />
        <img
          onClick={onSearchSimilar}
          className="hover:bg-gray-200 active:bg-gray-300"
          width="25em"
          src={SearchButton}
          draggable="false"
        />
      </div>
      <div className="absolute space-x-2 t-0 l-0 flex flex-row bg-opacity-50 bg-black">
        <div className="text-sm text-white">{frame_id}</div>
        <div className="text-sm text-nowrap overflow-hidden text-white">
          {video_id}
        </div>
      </div>
    </div>
  );
}

export function FrameContainer({ children }) {
  return <div className="flex flex-wrap">{children}</div>;
}
