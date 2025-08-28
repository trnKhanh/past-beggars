from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import FastAPI, Query, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse

import aic51.packages.constant as constant
from aic51.packages.config import GlobalConfig
from aic51.packages.logger import logger
from aic51.packages.search import Searcher
from aic51.packages.utils import get_device

from .utils import create_app, process_searcher_results


def setup_searcher():
    collection_name = GlobalConfig.get("backends", "search", "collection") or "milvus"
    do_gpu = GlobalConfig.get("backends", "search", "gpu") or False
    device = get_device(do_gpu)
    return Searcher(collection_name, device)


internal = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    internal["searcher"] = setup_searcher()

    yield


app = create_app(lifespan=lifespan)


@app.get(constant.HEALTH_ENDPOINT)
async def health():
    if "searcher" in internal:
        return JSONResponse(status_code=200, content=jsonable_encoder({constant.MESSAGE_KEY: "alive"}))
    else:
        return JSONResponse(status_code=500, content=jsonable_encoder({constant.MESSAGE_KEY: "dead"}))


@app.get(constant.SEARCH_MULTIMODAL_ENDPOINT)
async def search_multimodal(
    request: Request,
    q: str,
    offset: int = 0,
    limit: int = 50,
    target_features: Annotated[list[str], Query()] = [],
    nprobe: int = 32,
    temporal_k: int = 10000,
    ocr_weight: float = 0.5,
    max_interval: int = 1000,
    selected: str | None = None,
):
    if "searcher" not in internal:
        return JSONResponse(
            status_code=500,
            content=jsonable_encoder({constant.MESSAGE_KEY: "searcher was not initialized"}),
        )

    searcher = internal["searcher"]

    try:
        searcher_res = searcher.search_multimodal(
            q,
            offset,
            limit,
            target_features,
            nprobe=nprobe,
            temporal_k=temporal_k,
            ocr_weight=ocr_weight,
            max_interval=max_interval,
            selected=selected,
        )
    except Exception as e:
        logger.exception(e)

        return JSONResponse(
            status_code=500,
            content=jsonable_encoder({constant.MESSAGE_KEY: "search_multimodal errors"}),
        )

    response = process_searcher_results(searcher_res)

    response[constant.RESULT_PARAMS_KEY] = {
        "limit": limit,
        "target_features": target_features,
        "nprobe": nprobe,
        "temporal_k": temporal_k,
        "ocr_weight": ocr_weight,
        "max_interval": max_interval,
    }
    return JSONResponse(
        status_code=200,
        content=jsonable_encoder({constant.MESSAGE_KEY: "success", **response}),
    )


@app.get(constant.SEARCH_IMAGE_ENDPOINT)
async def search_image(
    request: Request,
    id: str,
    offset: int = 0,
    limit: int = 50,
    target_features: Annotated[list[str], Query()] = [],
    nprobe: int = 32,
    temporal_k: int = 10000,
    ocr_weight: float = 0.5,
    max_interval: int = 1000,
):
    if "searcher" not in internal:
        return JSONResponse(
            status_code=500,
            content=jsonable_encoder({constant.MESSAGE_KEY: "searcher was not initialized"}),
        )

    searcher = internal["searcher"]

    try:
        searcher_res = searcher.search_image(
            id,
            offset,
            limit,
            target_features,
            nprobe=nprobe,
        )
    except Exception as e:
        logger.exception(e)

        return JSONResponse(
            status_code=500,
            content=jsonable_encoder({constant.MESSAGE_KEY: "search_image errors"}),
        )

    response = process_searcher_results(searcher_res)

    response[constant.RESULT_PARAMS_KEY] = {
        "limit": limit,
        "target_features": target_features,
        "nprobe": nprobe,
        "temporal_k": temporal_k,
        "ocr_weight": ocr_weight,
        "max_interval": max_interval,
    }
    return JSONResponse(
        status_code=200,
        content=jsonable_encoder({constant.MESSAGE_KEY: "success", **response}),
    )


@app.get(constant.TARGET_FEATURES_ENDPOINT)
async def target_features():
    if "searcher" not in internal:
        return JSONResponse(
            status_code=500,
            content=jsonable_encoder({constant.MESSAGE_KEY: "searcher was not initialized"}),
        )

    searcher = internal["searcher"]

    return JSONResponse(
        status_code=200,
        content=jsonable_encoder({constant.TARGET_FEATURES_KEY: searcher.target_features}),
    )
