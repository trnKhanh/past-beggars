import subprocess
import time

from pymilvus import DataType, Function, FunctionType, MilvusClient

import aic51.resources as resources
from aic51.packages.config import GlobalConfig
from aic51.packages.logger import logger


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
        "SPARSE_FLOAT_VECTOR": DataType.SPARSE_FLOAT_VECTOR,
        "VARCHAR": DataType.VARCHAR,
        "JSON": DataType.JSON,
        "ARRAY": DataType.ARRAY,
    }

    def __init__(self, collection_name: str, do_overwrite: bool = False):
        self._collection_name = collection_name
        self._client = MilvusClient()

        logger.info(f'Checking if collection "{collection_name}" exists')
        collection_exists = self._client.has_collection(collection_name)

        if do_overwrite or not collection_exists:
            if collection_exists:
                logger.info(f'Deleting collection "{collection_name}"')
                self._client.drop_collection(self._collection_name)

            schema = self._create_schema()
            index_params = self._create_indices()

            self._client.create_collection(collection_name, schema=schema, index_params=index_params)

        self._client.load_collection(self._collection_name)

    def _create_schema(self):
        logger.info(f'"{self._collection_name}": Creating schema')
        schema = MilvusClient.create_schema(auto_id=False, enable_dynamic_field=False)
        fields = GlobalConfig.get("milvus", "fields") or []

        features = GlobalConfig.get("features")
        feature_fields = []
        if features:
            for feature_name in features.keys():
                datatype = GlobalConfig.get("features", feature_name, "index", "datatype")
                assert datatype is not None, f"{feature_name} has unspecified datatype"
                new_field = {"field_name": feature_name, "datatype": datatype}

                default = GlobalConfig.get("features", feature_name, "index", "default_value")

                if default is not None:
                    new_field["default"] = default

                dim = GlobalConfig.get("features", feature_name, "index", "dim")
                if dim:
                    new_field["dim"] = dim

                max_length = GlobalConfig.get("features", feature_name, "index", "max_length")
                if max_length:
                    new_field["max_length"] = max_length

                index_type = GlobalConfig.get("features", feature_name, "index", "index_type")
                if index_type and index_type.lower() == "bm25":
                    new_field["enable_analyzer"] = True
                    bm25_field = {"field_name": f"{feature_name}_sparse", "datatype": "SPARSE_FLOAT_VECTOR"}

                    feature_fields.append(bm25_field)

                    bm25_function = Function(
                        name=f"{feature_name}_bm25_emb",
                        input_field_names=[feature_name],
                        output_field_names=[bm25_field["field_name"]],
                        function_type=FunctionType.BM25,
                    )
                    schema.add_function(bm25_function)

                feature_fields.append(new_field)

        fields = fields + feature_fields

        logger.info(f'"{self._collection_name}": fields={fields}')

        for field in fields:
            if "datatype" in field:
                field["datatype"] = self.DATATYPE_MAP[field["datatype"]]
            if "element_type" in field:
                field["element_type"] = self.DATATYPE_MAP[field["element_type"]]

            schema.add_field(**field)

        return schema

    def _create_indices(self):
        logger.info(f'"{self._collection_name}": Creating indices')

        index_params = self._client.prepare_index_params()

        features = GlobalConfig.get("features")
        if features:
            for feature_name in features.keys():
                index_type = GlobalConfig.get("features", feature_name, "index", "index_type")
                if not index_type:
                    continue

                new_index = {}

                if index_type.lower() == "bm25":
                    new_index["field_name"] = f"{feature_name}_sparse"
                    new_index["index_type"] = "SPARSE_INVERTED_INDEX"
                    new_index["index_name"] = f"{feature_name}_BM25"
                    new_index["metric_type"] = f"BM25"
                else:
                    new_index["field_name"] = feature_name
                    new_index["index_type"] = index_type
                    new_index["index_name"] = f"{feature_name}_{index_type}"

                    metric_type = GlobalConfig.get("features", feature_name, "index", "metric_type")
                    if metric_type:
                        new_index["metric_type"] = metric_type

                params = GlobalConfig.get("features", feature_name, "index", "params")
                if params:
                    new_index["params"] = params

                index_params.add_index(**new_index)

        logger.info(f'"{self._collection_name}": index_params={index_params}')

        return index_params

    def __del__(self):
        self._client.release_collection(self._collection_name)
        self._client.close()

    def insert(self, data, do_update: bool = False):
        if do_update:
            return self._client.upsert(self._collection_name, data)
        else:
            return self._client.insert(self._collection_name, data)

    def get(self, id):
        res = self._client.get(self._collection_name, ids=[id])
        return res

    def query(self, filter: str, offset: int = 0, limit: int = 50):
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
        data,
        filter: str = "",
        offset: int = 0,
        limit: int = 50,
        anns_field: str = "clip",
        search_params: dict = {},
    ):
        limit = min(limit, self.SEARCH_LIMIT)

        if "metric_type" not in search_params:
            search_params["metric_type"] = "IP"

        logger.debug(f'"{self._collection_name}": searching')
        logger.debug(f"Search_params: {search_params}")

        start_time = time.time()

        res = self._client.search(
            self._collection_name,
            data=data,
            filter=filter,
            offset=offset,
            limit=limit,
            anns_field=anns_field,
            search_params=search_params,
            output_fields=["*"],
        )

        finish_time = time.time()
        logger.debug(f"Takes {finish_time-start_time:.4f} seconds to search")

        return res

    def hybrid_search(
        self,
        reqs,
        ranker,
        offset: int = 0,
        limit: int = 50,
    ):
        limit = min(limit, self.SEARCH_LIMIT)

        start_time = time.time()

        res = self._client.hybrid_search(
            self._collection_name,
            reqs=reqs,
            ranker=ranker,
            offset=offset,
            limit=limit,
            output_fields=["*"],
        )

        finish_time = time.time()
        logger.debug(f"Takes {finish_time-start_time:.4f} seconds to hybrid_search")

        return res

    def get_size(self):
        stats = self._client.get_collection_stats(self._collection_name)
        return stats["row_count"]

    @classmethod
    def start_server(cls):
        compose_file = resources.MILVUS_FILE_PATH / "milvus-standalone-docker-compose.yaml"

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
        compose_file = resources.MILVUS_FILE_PATH / "milvus-standalone-docker-compose.yaml"
        compose_cmd = [
            "docker",
            "compose",
            "--file",
            compose_file.resolve(),
            "down",
        ]
        subprocess.run(compose_cmd)
