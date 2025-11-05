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

    // Parse frame_counter
    let frameCounters = [];
    if (Array.isArray(answer.frame_counter)) {
        frameCounters = answer.frame_counter.map(f => String(f).trim());
    } else if (typeof answer.frame_counter === 'string') {
        frameCounters = answer.frame_counter.split(',').map(f => f.trim());
    } else if (answer.frame_counter) {
        frameCounters = [String(answer.frame_counter).trim()];
    }

    if (frameCounters.length === 0) {
        return { status: 400, data: { description: "Error: No frame counters provided" } };
    }

    // Get fps from frame_id
    let fps;
    try {
        const frameInfo = await getFrameInfo(answer.video_id, answer.frame_id || frameCounters[0]);
        fps = frameInfo?.fps;
        if (!fps) throw new Error("FPS missing from frame info");
    } catch (err) {
        return { status: 500, data: { description: `Failed to get fps: ${err.message}` } };
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

    const dresApiUrl = getDresApiUrl();
    return await axios.post(
      `${dresApiUrl}/api/v2/submit/${answer.query_id}`,
      answerData,
      {
        params: { session: sessionId },
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[submitAnswerAPI] Error:", err);
    return err.response || { status: 500, data: { description: err.message || "Unknown error" } };
  }
}
