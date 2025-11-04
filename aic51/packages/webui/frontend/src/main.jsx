import * as React from "react";
import * as ReactDOM from "react-dom/client";

import {
  createRoutesFromElements,
  createBrowserRouter,
  Route,
  RouterProvider,
} from "react-router-dom";

import Root, { loader as RootLoader } from "./routes/Root.jsx";
import Search, { loader as SearchLoader } from "./routes/Search.jsx";
import { loader as SearchSimilarLoader } from "./routes/SearchSimilar.jsx";
import {
  action as AnswerAction,
  loader as AnswerLoader,
} from "./routes/answers.jsx";
import { action as AnswerDeleteAction } from "./routes/answersdelete.jsx";
import { action as AnswerEditAction } from "./routes/answeredit.jsx";
import { loadConfig } from "./services/config.js";

import "./index.css";

const router = createBrowserRouter(
  createRoutesFromElements([
      // eslint-disable-next-line react/jsx-key
    <Route path="/" element={<Root />} loader={RootLoader}>
      <Route path="search" element={<Search />} loader={SearchLoader} />
      <Route path="similar" element={<Search />} loader={SearchSimilarLoader} />
    </Route>,
      // eslint-disable-next-line react/jsx-key
    <Route path="answers" action={AnswerAction} loader={AnswerLoader}>
      <Route path=":answerId">
        <Route path="delete" action={AnswerDeleteAction} />
        <Route path="edit" action={AnswerEditAction} />
      </Route>
    </Route>,
  ]),
);

// Load config before rendering
loadConfig().then(() => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  );
}).catch((error) => {
  console.error("Failed to load config:", error);
  // Render anyway with fallback config
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  );
});
