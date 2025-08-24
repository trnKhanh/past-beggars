import axios from "axios";

const PORT = import.meta.env.VITE_PORT || 5100;

export async function search(
  q,
  offset,
  limit,
  nprobe,
  model,
  temporal_k,
  ocr_weight,
  ocr_threshold,
  max_interval,
  selected,
  target_features,
) {
  const params = {
    q: q,
    offset: offset,
    limit: limit,
    nprobe: nprobe,
    model: model,
    temporal_k: temporal_k,
    ocr_weight: ocr_weight,
    ocr_threshold: ocr_threshold,
    max_interval: max_interval,
    selected: selected,
  };

  if (target_features && Array.isArray(target_features) && target_features.length > 0) {
    params.target_features = target_features;
  }

  const res = await axios.get(`http://127.0.0.1:${PORT}/api/search`, {
    params: params,
  });
  const data = res.data;
  return data;
}
export async function searchSimilar(
  id,
  offset,
  limit,
  nprobe,
  model,
  temporal_k,
  ocr_weight,
  ocr_threshold,
  max_interval,
) {
  const res = await axios.get(`http://127.0.0.1:${PORT}/api/similar`, {
    params: {
      id: id,
      offset: offset,
      limit: limit,
      nprobe: nprobe,
      model: model,
      temporal_k: temporal_k,
      ocr_weight: ocr_weight,
      ocr_threshold: ocr_threshold,
      max_interval: max_interval,
    },
  });
  const data = res.data;
  return data;
}

export async function getFrameInfo(videoId, frameId) {
  const res = await axios.get(`http://127.0.0.1:${PORT}/api/frame_info`, {
    params: {
      video_id: videoId,
      frame_id: frameId,
    },
  });
  const data = res.data;
  return data;
}
export async function getAvailableModels() {
  const res = await axios.get(`http://127.0.0.1:${PORT}/api/models`);
  const data = res.data;
  return data;
}

export async function getTargetFeatures() {
  const res = await axios.get(`http://127.0.0.1:${PORT}/api/target_features`);
  const data = res.data;
  return data;
}
