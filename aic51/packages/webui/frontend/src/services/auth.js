import axios from "axios";
import { getDresApiUrl } from "./config.js";
import { getFrameInfo } from "./search.js";

export async function signIn(username, password) {
  try {
    const dresApiUrl = getDresApiUrl();
    const res = await axios.post(
      `${dresApiUrl}/api/v2/login`,
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
    const dresApiUrl = getDresApiUrl();
    const res = await axios.get(
      `${dresApiUrl}/api/v2/client/evaluation/list`,
      { params: { session: sessionId } },
    );
    return res;
  } catch (err) {
    return err.response;
  }
}

export async function submitAnswerAPI(sessionId, answer) {
  try {
    let answerType = "kis"; // Default to KIS
    let answerData = {};

    const firstFrameId = answer.frame_counter.split(',')[0].trim();
    let frameInfo;
    try {
        frameInfo = await getFrameInfo(answer.video_id, firstFrameId);
    } catch (err) {
        console.error("Error fetching frame info:", err);
        const errorMsg = err.response?.data?.message || err.message || "Unknown error";
        alert(`Error fetching frame info for video ${answer.video_id}: ${errorMsg}`);
        return { error: "Failed to get frame information" };
    }

    if (!frameInfo || !frameInfo.fps) {
        console.error("FPS data is null or undefined:", frameInfo);
        alert(`Error: Unable to get FPS for video ${answer.video_id}. FPS data is missing.`);
        return { error: "Failed to get FPS information" };
    }

    const fps = frameInfo.fps;

    const frameCounters = answer.frame_counter ? answer.frame_counter.split(',').map(f => f.trim()) : [];
    if (frameCounters.length === 0) {
        console.error("Missing frameCounters:", frameCounters);
        return;
    }

    const listTimeMs = frameCounters.map(fc => fc * 1000 / fps);
    const isTemporal = frameCounters.length > 1;
    
    if (answer.answer && answer.answer.trim()) {
      answerType = isTemporal ? "trake" : "qa";
    } else if (isTemporal) {
      answerType = "trake";
    }

    if (answerType === "qa") {
      // QA format: "QA-<ANSWER>-<VIDEO_ID>-<TIME(ms)>"
      const timeMs = listTimeMs[0];
      answerData = {
        answerSets: [
          {
            answers: [
              {
                text: `QA-${answer.answer}-${answer.video_id}-${timeMs}`,
              },
            ],
          },
        ],
      };
    } else if (answerType === "trake") {
      // TRAKE format: "TR-<VIDEO_ID>-<FRAME_ID1>,<FRAME_ID2>,..."
      const frameIds = frameCounters.join(',');
      answerData = {
        answerSets: [
          {
            answers: [
              {
                text: `TR-${answer.video_id}-${frameIds}`,
              },
            ],
          },
        ],
      };
    } else {
      // KIS format: mediaItemName, start, end (all in ms)
      const timeMs = listTimeMs[0];
      answerData = {
        answerSets: [
          {
            answers: [
              {
                mediaItemName: answer.video_id,
                start: timeMs,
                end: timeMs,
              },
            ],
          },
        ],
      };
    }

    const evaluationId = answer.query_id;
    const dresApiUrl = getDresApiUrl();
    const res = await axios.post(
      `${dresApiUrl}/api/v2/submit/${evaluationId}`,
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
