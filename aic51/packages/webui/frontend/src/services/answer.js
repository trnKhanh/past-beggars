import localforage from "localforage";

export async function getAnswers() {
  const answers = await localforage.getItem("answers");
  let res = null;
  if (!answers) {
    res = [];
  } else {
    res = answers;
  }
  return res;
}
export async function getAnswersByIds(ids) {
  const answers = await localforage.getItem("answers");
  if (!answers) {
    return [];
  }
  const res = answers.filter((answer) => ids.includes(answer.id));
  return res;
}

export async function addAnswer(answer) {
  const answers = await getAnswers();
  let id = (await localforage.getItem("id_ptr")) || 0;
  await localforage.setItem("answers", [...answers, { id: id, ...answer }]);
  const res = await localforage.getItem("answers");
  await localforage.setItem("id_ptr", id + 1);
  return res;
}
export async function updateAnswer(id, new_answer) {
  const answers = await getAnswers();
  const updatedAnswer = answers.map((answer) => {
    if (answer.id === parseInt(id)) {
      return { id: parseInt(id), ...new_answer };
    } else {
      return answer;
    }
  });
  await localforage.setItem("answers", updatedAnswer);
  const res = await localforage.getItem("answers");
  return res;
}

export async function deleteAnswer(id) {
  const answers = await getAnswers();
  const newAnswers = answers.filter((answer) => answer.id !== parseInt(id));
  await localforage.setItem("answers", newAnswers);
  const res = await localforage.getItem("answers");
  return res;
}

export function getCSV(answer, n, step) {
  let fileData = "";
  let center = parseInt(answer.frame_id || answer.frame_counter);

  for (
    let offset = 0, i = 0, left = false;
    i < n;
    offset += !left ? step : 0, ++i, left = !left
  ) {
    const curFrame = left
      ? Math.round(center - offset)
      : Math.round(center + offset);
    if (fileData !== "") fileData += "\n";
    if (answer.answer.length > 0)
      fileData += `${answer.video_id},${Math.round(curFrame)},${answer.answer}`;
    else fileData += `${answer.video_id},${Math.round(curFrame)}`;
  }

  return fileData;
}
