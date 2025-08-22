import axios from "axios";

export async function signIn(username, password) {
  try {
    const res = await axios.post(
      "https://eventretrieval.one/api/v2/login",
      { username: username, password: password },
      { headers: { "Content-Type": "application/json" } },
    );

    return res;
  } catch (err) {
    return err.response;
  }
}

export async function getEvaluationIdAPI(sessionId) {
  try {
    const res = await axios.get(
      "https://eventretrieval.one/api/v2/client/evaluation/list",
      { params: { session: sessionId } },
    );
    return res;
  } catch (err) {
    return err.response;
  }
}

export async function submitAnswerAPI(sessionId, answer) {
  try {
    const answerType = answer.answer ? "qa" : "kis";
    let answerData = {};
    if (answerType === "qa") {
      answerData = {
        answerSets: [
          {
            answers: [
              {
                text: `${answer.answer}-${answer.video_id}-${parseInt(answer.time * 1000)}`,
              },
            ],
          },
        ],
      };
    } else {
      answerData = {
        answerSets: [
          {
            answers: [
              {
                mediaItemName: answer.video_id,
                start: parseInt(answer.time * 1000),
                end: parseInt(answer.time * 1000),
              },
            ],
          },
        ],
      };
    }
    const evaluationId = answer.query_id;
    const res = await axios.post(
      `https://eventretrieval.one/api/v2/submit/${evaluationId}`,
      answerData,
      {
        params: { session: sessionId },
        headers: { "Content-Type": "application/json" },
      },
    );
    return res;
  } catch (err) {
    return err.response;
  }
}
