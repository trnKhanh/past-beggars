import { useLoaderData, useNavigation } from "react-router-dom";
import { useState, useContext } from "react";
import { Outlet } from "react-router-dom";

import VideoProvider, { usePlayVideo } from "../components/VideoPlayer.jsx";
import AuthProvider from "../components/AuthProvider.jsx";
import AnswerSidebar from "../components/Answer.jsx";
import { getAvailableModels, getObjectClasses } from "../services/search.js";

export async function loader() {
  const models_data = await getAvailableModels();
  const objects_data = await getObjectClasses();
  return {
    modelOptions: models_data["models"],
    objectOptions: objects_data["objects"],
  };
}
export default function Root() {
  const navigation = useNavigation();
  const { modelOptions, objectOptions } = useLoaderData();
  return (
    <AuthProvider>
      <VideoProvider>
        <div className="flex flex-row">
          <div>
            <div className="w-96">
              <AnswerSidebar />
            </div>
          </div>
          <Outlet context={{ modelOptions, objectOptions }} />
        </div>
      </VideoProvider>
    </AuthProvider>
  );
}
