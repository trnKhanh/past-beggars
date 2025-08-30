import { useLoaderData, Outlet } from "react-router-dom";

import VideoProvider from "../components/VideoPlayer.jsx";
import SelectedProvider from "../components/SelectedProvider.jsx";

import AnswerSidebar from "../components/Answer.jsx";
import SearchParams from "../components/SearchParams.jsx";
import { getTargetFeatures } from "../services/search.js";

export async function loader() {
  try {
    const data = await getTargetFeatures();
    return { targetFeatureOptions: data.target_features || [] };
  } catch (error) {
    console.error('Failed to load target features:', error);
    return { targetFeatureOptions: [] };
  }
}
export default function Root() {
  const { targetFeatureOptions } = useLoaderData();
  return (
    <SelectedProvider>
      <VideoProvider>
        <div className="flex flex-row">
          <div className="flex flex-col">
            <SearchParams />
            <div className="w-96 z-10">
              <AnswerSidebar />
            </div>
          </div>
          <Outlet context={{ targetFeatureOptions }}/>
        </div>
      </VideoProvider>
    </SelectedProvider>
  );
}
