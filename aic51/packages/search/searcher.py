import hashlib
import re
import time
from copy import deepcopy
from typing import Optional

import torch
from pymilvus import AnnSearchRequest, RRFRanker, WeightedRanker
from thefuzz import fuzz

from aic51.packages.analyse import FeatureExtractorFactory
from aic51.packages.analyse.objects import Yolo
from aic51.packages.config import GlobalConfig
from aic51.packages.index import MilvusDatabase
from aic51.packages.logger import logger

from . import constants
from .utils import Query


class Searcher(object):
    cache = {}

    def __init__(self, collection_name: str, device: torch.device = torch.device("cpu")):
        self._database = MilvusDatabase(collection_name)
        self._prepare_feature_extractors(device)

    def to(self, device):
        self._device = torch.device(device)
        for e in self._extractors.values():
            e.to(device)

    def get(self, id):
        return self._database.get(id)

    @property
    def features_extractor(self):
        return list(self._extractors.keys())

    @property
    def target_features(self):
        return list(self._features.keys())

    @property
    def support_ocr(self):
        return self._ocr_name is not None

    def search_multimodal(
        self,
        q: str,
        offset: int = 0,
        limit: int = 50,
        target_features: list = [],
        /,
        nprobe: int = 8,
        temporal_k: int = 10000,
        ocr_weight: float = 1.0,
        max_interval: int = 250,
        selected: str | None = None,
    ):
        start_time = time.time()
        query = Query(q)

        if query.simple:
            logger.debug(f"searcher: get video_ids={query.video_ids}")
            res = self._get_videos(query.video_ids, offset, limit, selected)
        elif query.advance and not query.temporal:
            logger.debug(f"searcher: advance_search query={query.data}")
            res = self._advance_search(query, offset, limit, target_features, ocr_weight=ocr_weight, nprobe=nprobe)
        else:
            logger.debug(f"searcher: temporal_search query={query.data}")
            res = self._temporal_search(
                query,
                offset,
                limit,
                target_features,
                ocr_weight=ocr_weight,
                nprobe=nprobe,
                temporal_k=temporal_k,
                max_interval=max_interval,
            )

        end_time = time.time()
        logger.debug(f"searcher: Take {end_time - start_time:.4f} to extract and search")
        return res

    def search_image(
        self,
        id: str,
        offset: int = 0,
        limit: int = 50,
        target_features: list = [],
        /,
        nprobe: int = 8,
    ):
        record = self._database.get(id)
        if len(record) == 0:
            return {"results": [], "total": 0, "offset": 0}

        reqs = []

        for target_name in target_features:
            if target_name not in self._features:
                logger.warning(f"searcher: {target_name} is invalid feature")
                continue

            target_param = {
                "nprobe": nprobe,
                "metric_type": "COSINE",
            }

            m = self._features[target_name]
            image_embedding = record[0][target_name]

            reqs.append(
                AnnSearchRequest(
                    data=[image_embedding],
                    anns_field=target_name,
                    param=target_param,
                    limit=limit,
                )
            )

        ranker = RRFRanker()

        results = self._database.hybrid_search(
            reqs,
            ranker,
            offset,
            limit,
        )[0]

        res = {
            "results": results,
            "total": self._database.get_size(),
            "offset": offset,
        }
        return res

    def _similarity_search(
        self,
        query_features: dict,
        offset: int = 0,
        limit: int = 50,
        target_features: list = [],
        /,
        ocr_weight: float = 0.5,
        nprobe: int = 8,
    ):
        ocr_weight = max(0, min(1, ocr_weight))

        reqs = []
        for target_name in target_features:
            if target_name not in self._features:
                logger.warning(f"searcher: {target_name} is invalid feature")
                continue

            target_param = {
                "nprobe": nprobe,
                "metric_type": "COSINE",
            }

            m = self._features[target_name]
            text_embedding = self._extractors[m].get_text_features(query_features["text"])

            reqs.append(
                AnnSearchRequest(
                    data=[text_embedding],
                    anns_field=target_name,
                    param=target_param,
                    limit=limit,
                )
            )

        weights = [(1 - ocr_weight) / len(reqs) for _ in reqs]

        if self._ocr_name and "ocr" in query_features:
            ocr_list = query_features["ocr"]
            for ocr in ocr_list:
                reqs.append(AnnSearchRequest(data=ocr, anns_field=self._ocr_name, param={}, limit=limit))
                weights.append(ocr_weight / len(ocr_list))

        ranker = WeightedRanker(*weights)

        results = self._database.hybrid_search(
            reqs,
            ranker,
            offset,
            limit,
        )[0]
        return results

    def _advance_search(
        self,
        query: Query,
        offset: int = 0,
        limit: int = 50,
        target_features: list = [],
        /,
        ocr_weight: float = 0.5,
        nprobe: int = 8,
    ):
        query_features = query.data[0]["features"]

        results = self._similarity_search(
            query_features, offset, limit, target_features, ocr_weight=ocr_weight, nprobe=nprobe
        )

        res = {
            "results": results,
            "total": self._database.get_size(),
            "offset": offset,
        }
        return res

    def _temporal_search(
        self,
        query: Query,
        offset: int = 0,
        limit: int = 50,
        target_features: list = [],
        /,
        ocr_weight: float = 0.5,
        nprobe: int = 8,
        temporal_k: int = 100,
        max_interval: int = 100,
    ):
        params = {
            "query": query.data,
            "filter": filter,
            "target_features": target_features,
            "ocr_weight": ocr_weight,
            "nprobe": nprobe,
            "temporal_k": temporal_k,
            "max_interval": max_interval,
        }
        query_str = f"{constants.CACHE_TEMPORAL_SEARCH}:{repr(params)}"
        query_hash = hashlib.sha256(query_str.encode("utf-8")).hexdigest()

        if query_hash in self.cache:
            temporal_results = self.cache[query_hash]
        else:
            st = time.time()
            results_list = []
            for q in query.data:
                results = self._similarity_search(
                    q["features"], 0, temporal_k, target_features, ocr_weight=ocr_weight, nprobe=nprobe
                )
                results_list.append(results)

            en = time.time()
            logger.debug(f"{en-st:.4f} seconds to search results")

            st = time.time()
            temporal_results = self._combine_temporal_results(results_list, max_interval)
            en = time.time()
            logger.debug(f"{en-st:.4f} seconds to combine results")

            self.cache[query_hash] = temporal_results

        if temporal_results is not None and offset < len(temporal_results):
            results = temporal_results[offset : offset + limit]
        else:
            results = []

        res = {
            "results": results,
            "total": len(temporal_results or []),
            "offset": offset,
        }
        return res

    def _combine_temporal_results(self, results_list: list, max_interval: int):
        best = None

        for i in range(len(results_list)):
            res = results_list[i]
            for j in range(len(res)):
                video_id, frame_id = results_list[i][j]["entity"]["frame_id"].split("#")
                video_id = video_id.replace("L", "").replace("_V", "")
                video_id = int(video_id)
                frame_id = int(frame_id)
                results_list[i][j]["_id"] = (video_id, frame_id)
                # results_list[i][j]["distance"] = results_list[i][j]["distance"] ** (1 / 2)

        for res in results_list[::-1]:
            if best is None:
                best = res
                continue

            tmp = []
            res = sorted(res, key=lambda x: x["_id"])
            best = sorted(best, key=lambda x: x["_id"])
            l = 0
            r = 0
            for cur in res:
                cur_vid, cur_fid = cur["_id"]

                low_id = (cur_vid, cur_fid)
                high_id = (cur_vid, cur_fid + max_interval)

                cur_fid = int(cur_fid)

                while l < len(best):
                    next_id = best[l]["_id"]

                    if next_id > low_id:
                        break
                    else:
                        l += 1

                while r < len(best):
                    next_id = best[r]["_id"]

                    if next_id > high_id:
                        break
                    else:
                        r += 1

                if l < r:
                    highest_distance = max([x["distance"] for x in best[l:r]])

                    tmp.append(
                        {
                            **cur,
                            "distance": cur["distance"] + highest_distance,
                        }
                    )

            tmp = sorted(tmp, key=lambda x: x["distance"], reverse=True)
            best = tmp

        return best

    def _get_videos(self, video_ids: list[str], offset: int = 0, limit: int = 10000, selected: Optional[str] = None):
        query_str = f"{constants.CACHE_GET_VIDEOS}:{repr(video_ids)}"
        query_hash = hashlib.sha256(query_str.encode("utf-8")).hexdigest()

        if query_hash in self.cache:
            videos = self.cache[query_hash]
        elif len(video_ids) == 0:
            videos = []
        else:
            video_ids_fitler = " || ".join([f'frame_id like "{x.strip()}#%"' for x in video_ids])
            videos = self._database.query(video_ids_fitler, 0, 10000)
            videos = sorted(videos, key=lambda x: x["frame_id"])
            videos = [{"entity": x} for x in videos]
            self.cache[query_hash] = videos

        if selected:
            for i, video in enumerate(videos):
                if selected == video["entity"]["frame_id"]:
                    offset = (i // limit) * limit
                    break
        res = {
            "results": videos[offset : offset + limit],
            "total": len(videos),
            "offset": offset,
        }
        return res

    def _prepare_feature_extractors(self, device: torch.device):
        self._extractors = {}
        self._features = {}
        if GlobalConfig.get("searcher", "ocr", "enable"):
            self._ocr_name = GlobalConfig.get("searcher", "ocr", "ocr_field") or "ocr"
        else:
            self._ocr_name = None

        language_models = GlobalConfig.get("searcher", "language_models") or {}

        for m in language_models.keys():
            source = GlobalConfig.get("searcher", "language_models", m, "source")
            model_name = GlobalConfig.get("searcher", "language_models", m, "model")
            arch_name = GlobalConfig.get("searcher", "language_models", m, "arch_name")
            pretrained_model = GlobalConfig.get("searcher", "language_models", m, "pretrained_model")
            target_features = GlobalConfig.get("searcher", "language_models", m, "target")
            batch_size = 1

            assert model_name is not None

            feature_extractor_cls = FeatureExtractorFactory.get(model_name)
            if feature_extractor_cls:
                feature_extractor = feature_extractor_cls.from_pretrained(
                    source=source,
                    arch_name=arch_name,
                    pretrained_model=pretrained_model,
                    name=m,
                    batch_size=batch_size,
                    device=device,
                )
            else:
                feature_extractor = None

            polite_name = f"{model_name}" + (f' from "{pretrained_model}"' if pretrained_model else "")
            if feature_extractor:
                logger.info(f"Loaded {polite_name} for searching")
            else:
                logger.error(f"{polite_name}: invalid feature extractor")
                continue

            if target_features is None or len(target_features) == 0:
                logger.error(f"{polite_name} does not have target features")
                continue

            for t in target_features:
                self._features[t] = m

            self._extractors[m] = {"feature_extractor": feature_extractor, "target_features": target_features}
