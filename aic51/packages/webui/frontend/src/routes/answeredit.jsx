import { updateAnswer } from "../services/answer.js";

export async function action({ params, request }) {
  const id = params.answerId;
  const formData = await request.formData();
  const newAnswer = Object.fromEntries(formData);
  const res = await updateAnswer(id, newAnswer);
  return res;
}
