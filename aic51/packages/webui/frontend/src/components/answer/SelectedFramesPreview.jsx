import { useSelected } from "../SelectedProvider.jsx";

export default function SelectedFramesPreview() {
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