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
    console.log("[submitAnswerAPI] Starting submission with:", { sessionId, answer });
    let answerType = "kis"; // Default to KIS
    let answerData = {};

    // Handle frame_counter - it can be an array or a string
    let frameCounters = [];
    if (Array.isArray(answer.frame_counter)) {
        frameCounters = answer.frame_counter.map(f => String(f).trim());
    } else if (typeof answer.frame_counter === 'string') {
        frameCounters = answer.frame_counter.split(',').map(f => f.trim());
    } else if (answer.frame_counter) {
        frameCounters = [String(answer.frame_counter).trim()];
    }

    console.log("[submitAnswerAPI] Frame counters:", frameCounters);
    if (frameCounters.length === 0) {
        console.error("[submitAnswerAPI] Missing frameCounters");
        return { status: 400, data: { description: "Error: No frame counters provided" } };
    }

    const firstFrameId = answer.frame_id || frameCounters[0];
    console.log("[submitAnswerAPI] First frame ID:", firstFrameId, "(from:", answer.frame_id ? "frame_id" : "frame_counter[0]", ")");

    let frameInfo;
    try {
        console.log("[submitAnswerAPI] Fetching frame info for video:", answer.video_id, "frame:", firstFrameId);
        frameInfo = await getFrameInfo(answer.video_id, firstFrameId);
        console.log("[submitAnswerAPI] Frame info retrieved:", frameInfo);
    } catch (err) {
        console.error("[submitAnswerAPI] Error fetching frame info:", err);
        const errorMsg = err.response?.data?.message || err.message || "Unknown error";
        return { status: 500, data: { description: `Failed to get frame info: ${errorMsg}` } };
    }

    if (!frameInfo || !frameInfo.fps) {
        console.error("[submitAnswerAPI] FPS data is null or undefined. Frame info:", frameInfo);
        console.error("[submitAnswerAPI] Video ID:", answer.video_id, "Frame ID:", firstFrameId);
        return { status: 500, data: { description: "FPS data is missing from frame info. Please check backend API." } };
    }

    const fps = frameInfo.fps;
    console.log("[submitAnswerAPI] FPS:", fps);

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
    console.log("[submitAnswerAPI] About to POST to API:", {
      url: `${dresApiUrl}/api/v2/submit/${evaluationId}`,
      answerData,
      sessionId,
      answerType
    });
    const res = await axios.post(
      `${dresApiUrl}/api/v2/submit/${evaluationId}`,
      answerData,
      {
        params: { session: sessionId },
        headers: { "Content-Type": "application/json" },
      },
    );
    console.log("[submitAnswerAPI] API response:", res);
    return res;
  } catch (err) {
    console.error("[submitAnswerAPI] Error:", err);
    return err.response || { status: 500, data: { description: err.message || "Unknown error" } };
  }
}
