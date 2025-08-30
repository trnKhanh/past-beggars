import localforage from "localforage";

export function processAnswer(answer) {
  if ("time" in answer) answer.time = parseFloat(answer.time);
  if ("frame_counter" in answer) {
    if (typeof answer.frame_counter === 'string' && answer.frame_counter.includes(',')) {
      answer.frame_counter = answer.frame_counter.split(',').map(fc => fc.trim());
    } else {
      answer.frame_counter = [answer.frame_counter];
    }
  }
  answer.frame_counter = answer.frame_counter.sort();
  if ("correct" in answer) answer.correct = parseInt(answer.correct);
  answer.frame_id = answer.frame_id || answer.frame_counter[0];
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
  if (answer.frame_counter && typeof answer.frame_counter === 'string' && answer.frame_counter.includes(',')) {
    const frameCounters = answer.frame_counter.split(',').map(fc => fc.trim());
    return `${answer.video_id},${frameCounters.join(',')}`;
  }
  
  let fileData = "";
  let centers = answer.frame_counter.map(e => parseInt(e));

  for (
    let offset = 0, i = 0, left = false;
    i < n;
    offset += !left ? step : 0, ++i, left = !left
  ) {
    let curFrames = centers.map((center) =>
      left
        ? Math.round(center - offset)
        : Math.round(center + offset)
    );

    if (fileData !== "") fileData += "\n";
    if (answer.answer && answer.answer.length > 0)
      fileData += `${answer.video_id},${curFrames.join(',')},${answer.answer}`;
    else fileData += `${answer.video_id},${curFrames.join(',')}`;
  }
  return fileData;
}
