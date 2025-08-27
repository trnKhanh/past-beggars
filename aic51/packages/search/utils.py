import re
from copy import deepcopy

import aic51.packages.constant as global_constant

from . import constants


class Query:
    def __init__(self, query: str):
        self._raw_query = deepcopy(query)

        self._query = deepcopy(query)
        self._queries: list = []
        self._video_ids = []

        self._parse()

    @property
    def simple(self):
        return len(self._queries) == 0

    @property
    def advance(self):
        return len(self._queries) > 0

    @property
    def temporal(self):
        return len(self._queries) > 1

    @property
    def video_ids(self):
        return self._video_ids

    @property
    def data(self):
        return self._queries

    @property
    def raw(self):
        return self._raw_query

    def _parse(self):
        self._extract_video_ids()
        self._extract_temporal_queries()

        processed_queries = []

        for q in self._queries:
            q = self._parse_one_query(q)
            if q:
                processed_queries.append(q)

        self._queries = processed_queries

    def _extract_video_ids(self):
        pattern = global_constant.VIDEO_QUERY_PATTERN
        video_match = re.search(pattern, self._query, re.IGNORECASE)
        if video_match:
            video_str = video_match.group()
            video_str = video_str.strip("[]")
            video_ids_str = ":".join(video_str.split(":")[1:])

            self._video_ids = video_ids_str.split(",")
            self._query = self._query.replace(video_match.group(), "", 1)

    def _extract_ocr(self, query: str):
        new_query = deepcopy(query)

        pattern = global_constant.OCR_QUERY_PATTERN
        ocr_list = []
        while True:
            ocr_match = re.search(pattern, new_query, re.IGNORECASE)
            if not ocr_match:
                break

            ocr_str = ocr_match.group()
            ocr_str = ocr_str.strip("[]")
            ocr = ":".join(ocr_str.split(":")[1:])

            ocr_list.append(ocr.lower())
            new_query = new_query.replace(ocr_match.group(), "", 1)

        return new_query, ocr_list

    def _extract_temporal_queries(self):
        self._queries = [{"raw": q} for q in self._query.split(";")]

    def _parse_one_query(self, q):
        raw = deepcopy(q["raw"]).strip()

        raw, ocr_list = self._extract_ocr(raw)

        raw = raw.strip()

        features = {}
        if len(raw):
            features["text"] = raw

        if len(ocr_list):
            features["ocr"] = ocr_list

        if len(features) == 0:
            return None

        new_q = deepcopy(q)
        new_q["features"] = features
        return new_q
