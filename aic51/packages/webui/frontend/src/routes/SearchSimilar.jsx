import { searchSimilar } from "../services/search.js";
import { 
  limitOptions, 
  nprobeOption,
  temporal_k_default,
  ocr_weight_default,
  ocr_threshold_default,
  max_interval_default,
} from "../resources/options.js";

export async function loader({ request }) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const id = searchParams.get("id");
  const _offset = searchParams.get("offset") || 0;
  const selected = searchParams.get("selected") || undefined;
  const limit = searchParams.get("limit") || limitOptions[0];
  const nprobe = searchParams.get("nprobe") || nprobeOption[0];
  const model = searchParams.get("model") || undefined;
  const temporal_k = searchParams.get("temporal_k") || temporal_k_default;
  const ocr_weight = searchParams.get("ocr_weight") || ocr_weight_default;
  const ocr_threshold =
    searchParams.get("ocr_threshold") || ocr_threshold_default;
  const max_interval = searchParams.get("max_interval") || max_interval_default;

  const { total, frames, params, offset } = await searchSimilar(
    id,
    _offset,
    limit,
    nprobe,
    model,
    temporal_k,
    ocr_weight,
    ocr_threshold,
    max_interval,
    selected,
  );

  return {
    query: { id },
    params,
    offset,
    data: { total, frames },
  };
}
