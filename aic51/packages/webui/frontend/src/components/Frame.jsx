import classNames from "classnames";

import PlayButton from "../assets/play-btn.svg";
import SearchButton from "../assets/search-btn.svg";
import NextButton from "../assets/next-btn.svg";
import { useSelected } from "./SelectedProvider.jsx";

export function FrameItem({
  id,
  video_id,
  frame_id,
  thumbnail,
  timelineColor,
  onPlay,
  onSearchSimilar,
  onSearchNearby,
}) {
  const { selected, addSelected, removeSelected } = useSelected();
  const isSelected = selected.includes(id);
  
  const handleSelect = () => {
    if (isSelected) {
      removeSelected(id);
    } else {
      addSelected(id);
    }
  };

  return (
    <div
      className={classNames("relative flex flex-col space-y-2 p-1 border-l-4 transition-all duration-200", {
        "bg-white hover:bg-gray-300": !isSelected && !timelineColor,
        "bg-black border-l-black scale-105 shadow-lg ring-4 ring-yellow-400": isSelected,
      }, !isSelected ? timelineColor : "")}
      onClick={handleSelect}
    >
      <img src={thumbnail} draggable="false" className="w-full h-auto" />
      <div className="absolute top-0 left-0 space-x-2 flex flex-row bg-black bg-opacity-50 px-1">
        <div className="text-sm text-white">{frame_id}</div>
        <div className="text-sm text-nowrap overflow-hidden text-white">
          {video_id}
        </div>
      </div>
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
        <img
          onClick={onSearchNearby}
          className="hover:bg-gray-200 active:bg-gray-300"
          width="25em"
          src={NextButton}
          draggable="false"
          title="Search nearby keyframes"
        />
      </div>
    </div>
  );
}

export function FrameContainer({ children }) {
  return <div className="grid grid-cols-5 gap-2">{children}</div>;
}
