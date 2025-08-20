import { deleteAnswer } from "../services/answer.js";

export async function action({ params, request }) {
  const id = params.answerId;
  const res = await deleteAnswer(id);
  return res;
}
