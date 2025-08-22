import re
import time
from copy import deepcopy
import logging
import hashlib

from thefuzz import fuzz
import torch

from ..index import MilvusDatabase
from ...config import GlobalConfig
from ...packages.analyse.features import CLIP
from ...packages.analyse.objects import Yolo


class Searcher(object):
    cache = {}

    def __init__(self, collection_name, need_models=False):
        self._logger = logging.getLogger("searcher")
        self._database = MilvusDatabase(collection_name)
        self._models = {}
        if need_models:
            for model in GlobalConfig.get("webui", "features") or []:
                model_name = model["name"].lower()
                if model_name == "clip":
                    pretrained_model = model["pretrained_model"]
                    model = CLIP(pretrained_model)

                    self._models[model_name] = model

            if len(self._models) == 0:
                self._logger.error(
                    f'No models found in "{GlobalConfig.CONFIG_FILE}". Check your "{GlobalConfig.CONFIG_FILE}"'
                )

    def get(self, id):
        return self._database.get(id)

    def get_models(self):
        return list(self._models.keys())

    def get_objects_classes(self):
        return list(Yolo.classes_list().values())

    def _process_query(self, query):
        video_match = re.search("video:L\\d{2}_V\\d{3}", query, re.IGNORECASE)
        video_ids = (
            video_match.group()[len("video:") :].strip('" ').split(",")
            if video_match is not None
            else []
        )
        if video_match is not None:
            query = query.replace(video_match.group(), "", 1)

        queries = query.split(";")
        processed = {
            "queries": [],
            "advance": [],
            "video_ids": video_ids,
        }
        for q in queries:
            q = q.strip()
            ocr = []
            while True:
                match = re.search('OCR:((".+?")|\\S+)\\s?', q, re.IGNORECASE)
                if match is None:
                    break
                ocr.append(match.group()[len("ocr:") :].strip('" ').lower())
                q = q.replace(match.group(), "")
            objects = []
            while True:
                match = re.search('object:((".+?")|\\S+)\\s?', q, re.IGNORECASE)
                if match is None:
                    break
                object_str = (
                    match.group().replace("object:", "", 1).strip('" ').lower()
                )
                object_parts = object_str.split("_")
                bbox = (
                    [float(x) for x in object_parts[1].split(",")]
                    if len(object_parts) > 1
                    else []
                )
                if len(bbox) > 4:
                    bbox = bbox[:4]
                while len(bbox) != 4:
                    bbox.append(0 if len(bbox) < 2 else 1)

                objects.append([bbox, object_parts[0]])

                q = q.replace(match.group(), "")

            processed["queries"].append(q)
            processed["advance"].append({})

            if len(ocr) > 0:
                processed["advance"][-1]["ocr"] = ocr
            if len(objects) > 0:
                processed["advance"][-1]["objects"] = objects
        return processed

    def _process_advance(
        self, advance_query, result, ocr_weight, ocr_threshold, object_weight
    ):
        result = self._process_ocr(
            advance_query, result, ocr_weight, ocr_threshold
        )
        result = self._process_objects(advance_query, result, object_weight)
        return result

    def _process_objects(self, advance_query, result, object_weight):
        if "objects" not in advance_query:
            return result
        class_ids = dict(
            [(v.lower(), int(k)) for k, v in Yolo.classes_list().items()]
        )
        query_objects = advance_query["objects"]
        query_objects = [
            [x[0], class_ids[x[1]]] for x in query_objects if x[1] in class_ids
        ]

        def cal_area(bbox):
            if bbox[0] >= bbox[2] or bbox[1] >= bbox[3]:
                return 0
            return (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])

        def cal_IOU(bbox1, bbox2):
            inter = [
                max(bbox1[0], bbox2[0]),
                max(bbox1[1], bbox2[1]),
                min(bbox1[2], bbox2[2]),
                min(bbox1[3], bbox2[3]),
            ]
            inter_area = cal_area(inter)
            area1 = cal_area(bbox1)
            area2 = cal_area(bbox2)
            return inter_area / (area1 + area2 - inter_area)

        for i, record in enumerate(result):
            record_objects = (
                record["entity"]["yolo"] if "yolo" in record["entity"] else []
            )
            sum_distance = 0
            cnt = 0
            # format of each object: [bbox, cls, conf]
            for query_object in query_objects:
                max_distance = 0
                for record_object in record_objects:
                    query_class = int(query_object[1])
                    record_class = int(record_object[1])
                    if query_class != record_class:
                        continue
                    query_bbox = [float(x) for x in query_object[0]]
                    record_bbox = [
                        float(x)
                        for x in record_object[0][0] + record_object[0][2]
                    ]
                    iou = cal_IOU(query_bbox, record_bbox)
                    record_conf = float(record_object[2])
                    cur_distance = iou * record_conf
                    max_distance = max(max_distance, cur_distance)
                sum_distance += max_distance
                if max_distance != 0:
                    cnt += 1
            result[i]["distance"] += (
                object_weight * sum_distance / cnt if cnt > 0 else 0
            )
        result = sorted(result, key=lambda x: x["distance"], reverse=True)
        return result

    def _process_ocr(self, advance_query, result, ocr_weight, ocr_threshold):
        if "ocr" not in advance_query:
            return result
        query_ocr = advance_query["ocr"]
        for i, record in enumerate(result):
            record_ocr = (
                record["entity"]["ocr"] if "ocr" in record["entity"] else []
            )
            sum_distance = 0
            cnt = 0
            for query_text in query_ocr:
                max_distance = 0
                for record_text in record_ocr:
                    record_bbox = [
                        float(x) for x in record_text[0][0] + record_text[0][2]
                    ]
                    if record_bbox[1] > 0.90:
                        continue
                    partial_ratio = fuzz.partial_ratio(
                        query_text.lower(), record_text[1].lower()
                    )
                    if partial_ratio > ocr_threshold:
                        max_distance = max(max_distance, partial_ratio / 100)

                sum_distance += max_distance
                if max_distance > 0:
                    cnt += 1

            result[i]["distance"] += (
                ocr_weight * sum_distance / cnt if cnt > 0 else 0
            )
        result = sorted(result, key=lambda x: x["distance"], reverse=True)
        return result

    def _combine_temporal_results(self, results, temporal_k, max_interval):
        best = None
        for i in range(len(results)):
            res = results[i]
            for j in range(len(res)):
                video_id, frame_id = results[i][j]["entity"]["frame_id"].split(
                    "#"
                )
                video_id = video_id.replace("L", "").replace("_V", "")
                video_id = int(video_id)
                frame_id = int(frame_id)
                results[i][j]["_id"] = (video_id, frame_id)
                results[i][j]["distance"] = results[i][j]["distance"] ** (1 / 2)

        for res in results[::-1]:
            if best is None:
                best = res[:temporal_k]
                continue
            tmp = []
            res = sorted(res, key=lambda x: x["_id"])
            best = sorted(best, key=lambda x: x["_id"])
            l = 0
            r = 0
            for cur in res:
                cur_vid, cur_fid = cur["_id"]
                cur_fid = int(cur_fid)

                while l < len(best):
                    next_vid, next_fid = best[l]["_id"]
                    next_fid = int(next_fid)
                    if next_vid > cur_vid or (
                        next_vid == cur_vid and next_fid > cur_fid
                    ):
                        break
                    else:
                        l += 1

                while r < len(best):
                    next_vid, next_fid = best[r]["_id"]
                    next_fid = int(next_fid)
                    if next_vid > cur_vid or (
                        next_vid == cur_vid
                        and next_fid > cur_fid + max_interval
                    ):
                        break
                    else:
                        r += 1

                for i in range(l, r):
                    tmp.append(
                        {
                            **cur,
                            "distance": cur["distance"] + best[i]["distance"],
                        }
                    )
            highest = {}
            for cur in tmp:
                if (
                    cur["_id"] not in highest
                    or cur["distance"] > highest[cur["_id"]]["distance"]
                ):
                    highest[cur["_id"]] = cur
            tmp = list(highest.values())
            tmp = sorted(tmp, key=lambda x: x["distance"], reverse=True)
            best = tmp[:temporal_k]

        return best

    def _simple_search(
        self, processed, filter, offset, limit, ef, nprobe, model
    ):
        text_features = (
            self._models[model].get_text_features(processed["queries"]).tolist()
        )
        filter = self._combine_videos_filter(filter, processed["video_ids"])

        results = self._database.search(
            text_features,
            filter,
            offset,
            limit,
            ef,
            nprobe,
            model,
        )[0]
        res = {
            "results": results,
            "total": self._database.get_total(),
            "offset": offset,
        }
        return res

    def _combine_videos_filter(self, filter, video_ids):
        video_ids_fitler = " || ".join(
            [f'frame_id like "{x.strip()}#%"' for x in video_ids]
        )
        filter_empty = len(filter) == 0
        if len(video_ids) > 0:
            video_ids_fitler = "(" + video_ids_fitler + ")"
            if not filter_empty:
                video_ids_fitler = f"{filter} && {video_ids_fitler}"
        return video_ids_fitler

    def _complex_search(
        self,
        processed,
        filter,
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
    ):
        params = {
            "filter": filter,
            "ef": ef,
            "nprobe": nprobe,
            "model": model,
            "temporal_k": temporal_k,
            "ocr_weight": ocr_weight,
            "ocr_threshold": ocr_threshold,
            "object_weight": object_weight,
            "max_interval": max_interval,
        }
        self._logger.debug(processed)
        self._logger.debug(params)
        query_hash = hashlib.sha256(
            (f"complex:{repr(processed)}{repr(params)}").encode("utf-8")
        ).hexdigest()
        if query_hash in self.cache:
            combined_results = self.cache[query_hash]
        else:
            text_features = (
                self._models[model]
                .get_text_features(processed["queries"])
                .tolist()
            )
            filter = self._combine_videos_filter(filter, processed["video_ids"])

            st = time.time()
            results = self._database.search(
                text_features,
                filter,
                0,
                temporal_k,
                ef,
                nprobe,
                model,
            )
            en = time.time()
            self._logger.debug(f"{en-st:.4f} seconds to search results")
            for i in range(len(processed["queries"])):
                results[i] = self._process_advance(
                    processed["advance"][i],
                    results[i],
                    ocr_weight,
                    ocr_threshold,
                    object_weight,
                )

            st = time.time()
            combined_results = self._combine_temporal_results(
                results, temporal_k, max_interval
            )
            en = time.time()
            self._logger.debug(f"{en-st:.4f} seconds to combine results")
            self.cache[query_hash] = combined_results
        if combined_results is not None and offset < len(combined_results):
            results = combined_results[offset : offset + limit]
        else:
            results = []

        res = {
            "results": results,
            "total": len(combined_results or []),
            "offset": offset,
        }
        return res

    def _get_videos(self, video_ids, offset, limit, selected):
        query_hash = hashlib.sha256(
            (f"video:{repr(video_ids)}").encode("utf-8")
        ).hexdigest()

        if query_hash in self.cache:
            videos = self.cache[query_hash]
        elif len(video_ids) == 0:
            videos = []
        else:
            video_ids_fitler = " || ".join(
                [f'frame_id like "{x.strip()}#%"' for x in video_ids]
            )
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

    def search(
        self,
        q: str,
        filter: str = "",
        offset: int = 0,
        limit: int = 50,
        ef: int = 32,
        nprobe: int = 8,
        model: str = "clip",
        temporal_k: int = 10000,
        ocr_weight: float = 1.0,
        ocr_threshold: int = 40,
        object_weight: float = 1.0,
        max_interval: int = 250,
        selected: str | None = None,
    ):
        start_time = time.time()
        processed = self._process_query(q)
        no_query = all([len(x) == 0 for x in processed["queries"]])
        no_advance = all([len(x) == 0 for x in processed["advance"]])

        if no_query and no_advance:
            self._logger.debug(f"Get videos: {q}")
            res = self._get_videos(
                processed["video_ids"], offset, limit, selected
            )
        elif len(processed["queries"]) == 1 and no_advance:
            self._logger.debug(f"Simple search: {q}")
            res = self._simple_search(
                processed, filter, offset, limit, ef, nprobe, model
            )
        else:
            self._logger.debug(f"Complex search: {q}")
            res = self._complex_search(
                processed,
                filter,
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
            )
        end_time = time.time()
        self._logger.debug(
            f"Take {end_time - start_time:.4f} to extract and search"
        )
        return res

    def search_similar(
        self,
        id: str,
        offset: int = 0,
        limit: int = 50,
        ef: int = 32,
        nprobe: int = 8,
        model: str = "clip",
    ):
        record = self._database.get(id)
        if len(record) == 0:
            return {"results": [], "total": 0, "offset": 0}

        image_features = [record[0][model]]

        results = self._database.search(
            image_features, "", offset, limit, ef, nprobe, model
        )[0]
        res = {
            "results": results,
            "total": self._database.get_total(),
            "offset": offset,
        }
        return res
