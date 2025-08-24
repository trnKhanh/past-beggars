import localforage from "localforage";

export function processAnswer(answer) {
  if ("time" in answer) answer.time = parseFloat(answer.time);
  if ("frame_counter" in answer)
    answer.frame_counter = parseFloat(answer.frame_counter);
  if ("correct" in answer) answer.correct = parseInt(answer.correct);
  return answer;
}

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
  return answers.filter((answer) => ids.includes(answer.id));
}

export async function addAnswer(answer) {
  const answers = await getAnswers();
  processAnswer(answer);
  let id = parseInt((await localforage.getItem("id_ptr")) || 0);
  await localforage.setItem("answers", [
    ...answers,
    { id: id, submitted: new Date().toLocaleString(), ...answer },
  ]);
  const res = await localforage.getItem("answers");
  await localforage.setItem("id_ptr", id + 1);
  return res;
}
export async function updateAnswer(id, new_answer) {
  const answers = await getAnswers();
  processAnswer(new_answer);
  const updatedAnswer = answers.map((answer) => {
    if (answer.id === parseInt(id)) {
      return {
        id: parseInt(id),
        submitted: answer.submitted,
        frame_id: answer.frame_id,
        ...new_answer,
      };
    } else {
      return answer;
    }
  });
  await localforage.setItem("answers", updatedAnswer);
  return await localforage.getItem("answers");
}

export async function deleteAnswer(id) {
  const answers = await getAnswers();
  const newAnswers = answers.filter(
    (answer) => parseInt(answer.id) !== parseInt(id),
  );
  await localforage.setItem("answers", newAnswers);
  return await localforage.getItem("answers");
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
