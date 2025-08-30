import {deleteAnswer} from "../services/answer.js";

export async function action({ params }) {
  const id = params.answerId;
  return await deleteAnswer(id);
}
