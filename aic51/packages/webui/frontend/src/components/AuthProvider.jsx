import { useState, createContext, useRef, useEffect } from "react";
import { useFetcher } from "react-router-dom";
import {
  signIn,
  getEvaluationIdAPI,
  submitAnswerAPI,
} from "../services/auth.js";
import localforage from "localforage";
import { useToast } from "./Toast.jsx";
import axios from "axios";

const PORT = import.meta.env.VITE_PORT || 6900;

export const AuthContext = createContext({
  username: "",
  password: "",
  updateAuth: null,
  evaluationIds: [],
  submitAnswer: null,
  reloadAnswers: null,
});

// eslint-disable-next-line react/prop-types
export default function AuthProvider({ children }) {
  const fetcher = useFetcher({ key: "answers" });
  const { showToast, showConfirm } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [evaluationIds, setEvaluationIds] = useState([]);
  const [shouldReload, setShouldReload] = useState(0);

  const sessionId = useRef(undefined);
  useEffect(() => {
    const fetchEval = async () => {
      const localSessionId = await localforage.getItem("sessionId");
      if (localSessionId) {
        sessionId.current = localSessionId;

        // Only fetch evaluations if we have a valid session
        const evalRes = await getEvaluationIdAPI(sessionId.current);
        if (evalRes.status === 200) {
          const evalIds = [];
          for (const e of evalRes.data) {
            evalIds.push({
              id: e["id"],
              name: e["name"],
              type: e["type"],
              status: e["status"]
            });
          }
          setEvaluationIds(evalIds);
        }
      }
    };
    fetchEval().then();
  }, []);

  const updateAuth = async (username, password) => {
    setUsername(username);
    setPassword(password);
    const res = await signIn(username, password);
    if (res.status === 200) {
      sessionId.current = res.data["sessionId"];
      await localforage.setItem("sessionId", sessionId.current);

      showToast("Login successfully", "success");
      const evalRes = await getEvaluationIdAPI(sessionId.current);
      if (evalRes.status === 200) {
        const evalIds = [];
        for (const e of evalRes.data) {
          evalIds.push({
            id: e["id"],
            name: e["name"],
            type: e["type"],
            status: e["status"]
          });
        }
        setEvaluationIds(evalIds);
      }
    } else {
      showToast(res.data["description"], "error");
    }
  };

  const submitAnswer = async (answer) => {
    console.log("submitAnswer called, sessionId:", sessionId.current);
    const willSubmit = await showConfirm("Are you sure you want to submit this answer?");
    if (!willSubmit) {
      return;
    }
    const res = await submitAnswerAPI(sessionId.current, answer);
    console.log("API call completed, status:", res?.status);

    const description = res?.data?.["description"] || "No response from server";
    const isSuccess = res?.status === 200 && res?.data?.["submission"] === "CORRECT";
    const isWrong = res?.status === 200 && res?.data?.["submission"] === "WRONG";
    const isFalseStatus = res?.data?.["status"] === false;

    if (isSuccess) {
      showToast(description, "success");  // Green
    } else if (isWrong) {
      showToast(description, "error");    // Red
    } else if (isFalseStatus) {
      showToast(description, "warning");  // Yellow
    } else {
      showToast(description, "error");    // Red
    }

    if (res?.status === 200) {
      fetcher.submit(
        { correct: 0 + (res.data?.["submission"] === "CORRECT"), ...answer },
        { method: "POST", action: "/answers" },
      );

      // Broadcast to other devices via SSE
      try {
        await axios.post(`http://127.0.0.1:${PORT}/api/broadcast/answer-submitted`, {
          query_id: answer.query_id,
          video_id: answer.video_id,
          frame_id: answer.frame_id,
          status: res.status,
          correct: res.data?.["submission"] === "CORRECT"
        });
      } catch (err) {
        // Ignore broadcast errors (fire-and-forget)
        console.warn('Failed to broadcast:', err);
      }

      setShouldReload(prev => prev + 1);
    }
  };

  return (
    <AuthContext.Provider
      value={{ username, password, updateAuth, evaluationIds, submitAnswer, shouldReload }}
    >
      {children}
    </AuthContext.Provider>
  );
}
