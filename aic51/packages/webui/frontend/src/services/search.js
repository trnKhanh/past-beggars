import axios from "axios";

const PORT = import.meta.env.VITE_PORT || 6900;

export async function search(
  q,
  offset,
  limit,
  nprobe,
  temporal_k,
  ocr_weight,
  max_interval,
  selected,
  target_features,
) {
  const params = {
    q: q,
    offset: offset,
    limit: limit,
    nprobe: nprobe,
    temporal_k: temporal_k,
    ocr_weight: ocr_weight,
    max_interval: max_interval,
  };

  if (selected) {
    params.selected = selected;
  }

  if (target_features && target_features.length > 0) {
    params.target_features = target_features;
  }

  const res = await axios.get(`http://127.0.0.1:${PORT}/api/search_multimodal`, {
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
  temporal_k,
  ocr_weight,
  max_interval,
  target_features,
) {
  const params = {
    id: id,
    offset: offset,
    limit: limit,
    nprobe: nprobe,
    temporal_k: temporal_k,
    ocr_weight: ocr_weight,
    max_interval: max_interval,
  };

  if (target_features && target_features.length > 0) {
    params.target_features = target_features;
  }

  const res = await axios.get(`http://127.0.0.1:${PORT}/api/search_image`, {
    params: params,
  });
  const data = res.data;
  return data;
}

export async function getFrameInfo(videoId, frameId) {
  const res = await axios.get(`http://127.0.0.1:${PORT}/api/files/info/${videoId}/${frameId}`);
  const data = res.data;
  return data;
}

export async function getTargetFeatures() {
  const res = await axios.get(`http://127.0.0.1:${PORT}/api/target_features`);
  const data = res.data;
  return data;
}
