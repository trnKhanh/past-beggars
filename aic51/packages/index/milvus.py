import hashlib
import logging
import re
import subprocess
import time
from pathlib import Path

from pymilvus import DataType, MilvusClient
from thefuzz import fuzz

from aic51.packages.config import GlobalConfig


class MilvusDatabase(object):
    SEARCH_LIMIT = 10000
    DATATYPE_MAP = {
        "BOOL": DataType.BOOL,
        "INT8": DataType.INT8,
        "INT16": DataType.INT16,
        "INT32": DataType.INT32,
        "INT64": DataType.INT64,
        "FLOAT": DataType.FLOAT,
        "DOUBLE": DataType.DOUBLE,
        "BINARY_VECTOR": DataType.BINARY_VECTOR,
        "FLOAT_VECTOR": DataType.FLOAT_VECTOR,
        "FLOAT16_VECTOR": DataType.FLOAT16_VECTOR,
        "BFLOAT16_VECTOR": DataType.BFLOAT16_VECTOR,
        "VARCHAR": DataType.VARCHAR,
        "JSON": DataType.JSON,
        "ARRAY": DataType.ARRAY,
    }

    def __init__(self, collection_name, do_overwrite=False):
        self._collection_name = collection_name
        self._logger = logging.getLogger(__name__)
        self._client = MilvusClient("http://localhost:19530")

        collection_exists = self._client.has_collection(collection_name)

        if do_overwrite or not collection_exists:
            if collection_exists:
                self._client.drop_collection(self._collection_name)

            schema = MilvusClient.create_schema(auto_id=False, enable_dynamic_field=False)
            fields = GlobalConfig.get("milvus", "fields")
            if fields is not None:
                for field in fields:
                    if "datatype" in field:
                        field["datatype"] = self.DATATYPE_MAP[field["datatype"]]
                    if "element_type" in field:
                        field["element_type"] = self.DATATYPE_MAP[field["element_type"]]

                    schema.add_field(**field)

            index_params = self._client.prepare_index_params()
            indices = GlobalConfig.get("milvus", "indices")
            if indices is not None:
                for index in indices:
                    index_params.add_index(**index)

            self._client.create_collection(collection_name, schema=schema, index_params=index_params)

    def __del__(self):
        self._client.close()

    def insert(self, data, do_update=False):
        if do_update:
            return self._client.upsert(self._collection_name, data)
        else:
            return self._client.insert(self._collection_name, data)

    def get(self, id):
        res = self._client.get(self._collection_name, ids=[id])
        return res

    def query(self, filter, offset=0, limit=50):
        limit = min(limit, self.SEARCH_LIMIT)
        res = self._client.query(
            self._collection_name,
            filter=filter,
            offset=offset,
            limit=limit,
        )
        return res

    def search(
        self,
        query,
        filter="",
        offset=0,
        limit=50,
        ef=32,
        nprobe=8,
        feature="clip",
    ):
        limit = min(limit, self.SEARCH_LIMIT)
        search_params = {
            "metric_type": "IP",
            "params": {
                "nprobe": nprobe,
                # "ef": ef,
            },
        }
        self._logger.debug(f"Search_params: {search_params}")
        start_time = time.time()

        res = self._client.search(
            self._collection_name,
            data=query,
            anns_field=f"{feature}",
            filter=filter,
            offset=offset,
            limit=limit,
            search_params=search_params,
            output_fields=["*"],
        )
        finish_time = time.time()
        self._logger.debug(f"Takes {finish_time-start_time:.4f} seconds to search")
        return res

    def get_total(self):
        stats = self._client.get_collection_stats(self._collection_name)
        return stats["row_count"]

    @classmethod
    def start_server(cls):
        compose_file = Path(__file__).parent / "../../milvus-standalone/milvus-standalone-docker-compose.yaml"

        compose_cmd = [
            "docker",
            "compose",
            "--file",
            compose_file.resolve(),
            "up",
            "-d",
        ]
        subprocess.run(compose_cmd)

    @classmethod
    def stop_server(cls):
        compose_file = Path(__file__).parent / "../../milvus-standalone/milvus-standalone-docker-compose.yaml"
        compose_cmd = [
            "docker",
            "compose",
            "--file",
            compose_file.resolve(),
            "down",
        ]
        subprocess.run(compose_cmd)
