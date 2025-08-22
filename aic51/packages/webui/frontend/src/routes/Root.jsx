import { useLoaderData } from "react-router-dom";
import { useState } from "react";
import { Outlet } from "react-router-dom";

import VideoProvider, { usePlayVideo } from "../components/VideoPlayer.jsx";

import AnswerSidebar from "../components/Answer.jsx";
import { getAvailableModels } from "../services/search.js";

export async function loader() {
  const data = await getAvailableModels();
  return { modelOptions: data["models"] };
}
export default function Root() {
  const { modelOptions } = useLoaderData();
  return (
    <VideoProvider>
      <div className="flex flex-row">
        <div>
          <div className="w-96">
            <AnswerSidebar />
          </div>
        </div>
        <Outlet context={{ modelOptions }} />
      </div>
    </VideoProvider>
  );
}
