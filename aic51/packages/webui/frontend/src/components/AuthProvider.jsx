import { useState, createContext, useRef, useEffect } from "react";
import { useFetcher } from "react-router-dom";
import {
  signIn,
  getEvaluationIdAPI,
  submitAnswerAPI,
} from "../services/auth.js";
import localforage from "localforage";

export const AuthContext = createContext({
  username: "",
  password: "",
  updateAuth: null,
  evaluationIds: [],
  submitAnswer: null,
});

export default function AuthProvider({ children }) {
  const fetcher = useFetcher({ key: "answers" });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [evaluationIds, setEvaluationIds] = useState([]);

  const sessionId = useRef(undefined);
  useEffect(() => {
    const fetchEval = async () => {
      const localSessionId = await localforage.getItem("sessionId");
      if (localSessionId) {
        sessionId.current = localSessionId;
      }
      const evalRes = await getEvaluationIdAPI(sessionId.current);
      if (evalRes.status === 200) {
        const evalIds = [];
        for (const e of evalRes.data) {
          evalIds.push({
            id: e["id"],
            name: e["name"],
          });
        }
        setEvaluationIds(evalIds);
      }
    };
    fetchEval();
  }, []);
  const updateAuth = async (username, password) => {
    setUsername(username);
    setPassword(password);
    const res = await signIn(username, password);
    if (res.status === 200) {
      sessionId.current = res.data["sessionId"];
      await localforage.setItem("sessionId", sessionId.current);

      alert("Login successfully");
      const evalRes = await getEvaluationIdAPI(sessionId.current);
      if (evalRes.status === 200) {
        const evalIds = [];
        for (const e of evalRes.data) {
          evalIds.push({
            id: e["id"],
            name: e["name"],
          });
        }
        setEvaluationIds(evalIds);
      }
    } else {
      alert(res.data["description"]);
    }
  };

  const submitAnswer = async (answer) => {
    let willSubmit = confirm("Submit?");
    if (!willSubmit) {
      return;
    }
    const res = await submitAnswerAPI(sessionId.current, answer);
    alert(res.data["description"]);
    if (res.status === 200) {
      fetcher.submit(
        { correct: 0 + (res.data["submission"] !== "WRONG"), ...answer },
        { method: "POST", action: "/answers" },
      );
    }
  };

  return (
    <AuthContext.Provider
      value={{ username, password, updateAuth, evaluationIds, submitAnswer }}
    >
      {children}
    </AuthContext.Provider>
  );
}
