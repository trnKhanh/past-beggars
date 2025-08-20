import { redirect } from "react-router-dom";
import { getAnswers, addAnswer } from "../services/answer.js";

export async function action({ params, request }) {
  const formData = await request.formData();
  const answer = Object.fromEntries(formData);
  const res = await addAnswer(answer);
  return res;
}

export async function loader({ params, request }) {
  const answers = await getAnswers();
  return answers;
}
