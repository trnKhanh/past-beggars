import axios from "axios";

let HOST = "";
if (import.meta.env.MODE === "development") {
  const PORT = import.meta.env.VITE_PORT || 5000;
  HOST = `http://localhost:${PORT}`;
}

export async function search(
  q,
  offset,
  limit,
  ef,
  nprobe,
  model,
  temporal_k,
  ocr_weight,
  ocr_threshold,
  object_weight,
  max_interval,
  selected,
) {
  const res = await axios.get(`${HOST}/api/search`, {
    params: {
      q: q,
      offset: offset,
      limit: limit,
      ef: ef,
      nprobe: nprobe,
      model: model,
      temporal_k: temporal_k,
      ocr_weight: ocr_weight,
      ocr_threshold: ocr_threshold,
      object_weight: object_weight,
      max_interval: max_interval,
      selected: selected,
    },
  });
  const data = res.data;
  return data;
}
export async function searchSimilar(
  id,
  offset,
  limit,
  ef,
  nprobe,
  model,
  temporal_k,
  ocr_weight,
  ocr_threshold,
  object_weight,
  max_interval,
) {
  const res = await axios.get(`${HOST}/api/similar`, {
    params: {
      id: id,
      offset: offset,
      limit: limit,
      ef: ef,
      nprobe: nprobe,
      model: model,
      temporal_k: temporal_k,
      ocr_weight: ocr_weight,
      ocr_threshold: ocr_threshold,
      object_weight: object_weight,
      max_interval: max_interval,
    },
  });
  const data = res.data;
  return data;
}

export async function getFrameInfo(videoId, frameId) {
  const res = await axios.get(`${HOST}/api/frame_info`, {
    params: {
      video_id: videoId,
      frame_id: frameId,
    },
  });
  const data = res.data;
  return data;
}
export async function getAvailableModels() {
  const res = await axios.get(`${HOST}/api/models`);
  const data = res.data;
  return data;
}
export async function getObjectClasses() {
  const res = await axios.get(`${HOST}/api/objects`);
  const data = res.data;
  return data;
}
