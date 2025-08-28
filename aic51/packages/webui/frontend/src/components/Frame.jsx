import classNames from "classnames";

import PlayButton from "../assets/play-btn.svg";
import SearchButton from "../assets/search-btn.svg";
import { useSelected } from "./SelectedProvider.jsx";

export function FrameItem({
  id,
  video_id,
  frame_id,
  thumbnail,
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
      className={classNames("relative flex flex-col space-y-2 p-1", {
        "bg-white hover:bg-gray-300": !isSelected,
        "bg-green-500": isSelected,
      })}
      onClick={handleSelect}
    >
      <img src={thumbnail} draggable="false" className="w-full h-auto" />
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
          src={SearchButton}
          draggable="false"
          title="Search nearby keyframes"
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
  return <div className="grid grid-cols-5 gap-2">{children}</div>;
}
