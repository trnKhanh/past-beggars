import { useLoaderData, Outlet } from "react-router-dom";

import VideoProvider from "../components/VideoPlayer.jsx";
import SelectedProvider from "../components/SelectedProvider.jsx";

import AnswerSidebar from "../components/Answer.jsx";
import SearchParams from "../components/SearchParams.jsx";
import { getAvailableModels } from "../services/search.js";

export async function loader() {
  const data = await getAvailableModels();
  return { modelOptions: data["models"] };
}
export default function Root() {
  const { modelOptions } = useLoaderData();
  return (
    <SelectedProvider>
      <VideoProvider>
        <div className="flex flex-row">
          <div className="flex flex-col">
            <SearchParams modelOptions={modelOptions} />
            <div className="w-96">
              <AnswerSidebar />
            </div>
          </div>
          <Outlet context={{ modelOptions }} />
        </div>
      </VideoProvider>
    </SelectedProvider>
  );
}
