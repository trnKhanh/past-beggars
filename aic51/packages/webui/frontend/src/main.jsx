import * as React from "react";
import * as ReactDOM from "react-dom/client";

import {
  createRoutesFromElements,
  createBrowserRouter,
  Route,
  RouterProvider,
} from "react-router-dom";

import Root, { loader as RootLoader } from "./routes/root.jsx";
import Search, { loader as SearchLoader } from "./routes/search.jsx";
import { loader as SearchSimilarLoader } from "./routes/searchsimilar.jsx";
import {
  action as AnswerAction,
  loader as AnswerLoader,
} from "./routes/answers.jsx";
import { action as AnswerDeleteAction } from "./routes/answersdelete.jsx";
import { action as AnswerEditAction } from "./routes/answeredit.jsx";

import "./index.css";

const router = createBrowserRouter(
  createRoutesFromElements([
    <Route path="/" element={<Root />} loader={RootLoader}>
      <Route path="search" element={<Search />} loader={SearchLoader} />
      <Route path="similar" element={<Search />} loader={SearchSimilarLoader} />
    </Route>,
    <Route path="answers" action={AnswerAction} loader={AnswerLoader}>
      <Route path=":answerId">
        <Route path="delete" action={AnswerDeleteAction} />
        <Route path="edit" action={AnswerEditAction} />
      </Route>
    </Route>,
  ]),
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
