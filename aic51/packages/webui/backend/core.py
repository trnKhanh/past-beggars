import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import urljoin, urlparse

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

import aic51.packages.constant as constant
from aic51.packages.config import GlobalConfig
from aic51.packages.logger import logger

from .request import CRequestPool, GetRequest
from .utils import create_app

SEARCH_SERVERS = GlobalConfig.get("backends", "core", "search_proxy", "servers") or []
SEARCH_REQUEST_TIMEOUT = GlobalConfig.get("backends", "core", "search_proxy", "request_timeout")
SEARCH_MAX_CREQUESTS = int(GlobalConfig.get("backends", "core", "search_proxy", "max_concurrent_requests") or 1)

FILE_SERVERS = GlobalConfig.get("backends", "core", "file_proxy", "servers") or []
FILE_REQUEST_TIMEOUT = GlobalConfig.get("backends", "core", "search_proxy", "request_timeout")
FILE_MAX_REQUESTS = int(GlobalConfig.get("backends", "core", "file_proxy", "max_concurrent_requests") or 1)

TARGET_FEATURES_SYNC_INTEVAL = int(GlobalConfig.get("backends", "core", "search_proxy", "sync_interval") or 5)

internal = {}
target_features_lock = asyncio.Lock()


async def sync_target_features():
    while True:
        logger.info("CORE: Syncing target_features")
        async with target_features_lock:
            crequest = CRequestPool(SEARCH_MAX_CREQUESTS)
            target_features_requests = [
                GetRequest(urljoin(ss["host"], constant.TARGET_FEATURES_ENDPOINT), timeout=SEARCH_REQUEST_TIMEOUT)
                for ss in SEARCH_SERVERS
            ]
            crequest.map(target_features_requests)

            try:
                target_features = set()
                for future in crequest.as_completed():
                    res = future.result()
                    if res and res.ok:
                        data = res.json()
                        if constant.TARGET_FEATURES_KEY in data:
                            target_features.update(data[constant.TARGET_FEATURES_KEY])

            except Exception as e:
                logger.exception(e)
                target_features = []

            internal["target_features"] = list(target_features)

        await asyncio.sleep(TARGET_FEATURES_SYNC_INTEVAL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    sync_task = asyncio.ensure_future(sync_target_features())

    yield

    sync_task.cancel()


app = create_app(lifespan=lifespan)


@app.get(constant.SEARCH_MULTIMODAL_ENDPOINT)
async def search_multimodal(
    request: Request,
):
    if len(SEARCH_SERVERS) == 0:
        return JSONResponse(
            status_code=404,
            content=jsonable_encoder({constant.MESSAGE_KEY: "search function is not supported"}),
        )

    crequest = CRequestPool(SEARCH_MAX_CREQUESTS)
    health_requests = [
        GetRequest(
            urljoin(ss["host"], constant.HEALTH_ENDPOINT), params=request.query_params, timeout=SEARCH_REQUEST_TIMEOUT
        )
        for ss in SEARCH_SERVERS
    ]
    crequest.map(health_requests)

    try:
        for future in crequest.as_completed():
            res = future.result()
            if res and res.ok:
                crequest.cancel_all()

                parsed_url = urlparse(res.url)
                redirected_url = parsed_url._replace(path=request.url.path).geturl()
                return RedirectResponse(redirected_url)
    except:
        return JSONResponse(
            status_code=500,
            content=jsonable_encoder({constant.MESSAGE_KEY: "search_multimodal errors"}),
        )


@app.get(constant.SEARCH_IMAGE_ENDPOINT)
async def search_image(
    request: Request,
):
    if len(SEARCH_SERVERS) == 0:
        return JSONResponse(
            status_code=404,
            content=jsonable_encoder({constant.MESSAGE_KEY: "search function is not supported"}),
        )

    crequest = CRequestPool(SEARCH_MAX_CREQUESTS)
    health_requests = [
        GetRequest(
            urljoin(ss["host"], constant.HEALTH_ENDPOINT), params=request.query_params, timeout=SEARCH_REQUEST_TIMEOUT
        )
        for ss in SEARCH_SERVERS
    ]
    crequest.map(health_requests)

    try:
        for future in crequest.as_completed():
            res = future.result()
            if res and res.ok:
                crequest.cancel_all()

                parsed_url = urlparse(res.url)
                redirected_url = parsed_url._replace(path=request.url.path).geturl()
                return RedirectResponse(redirected_url)
    except:
        return JSONResponse(
            status_code=500,
            content=jsonable_encoder({constant.MESSAGE_KEY: "search_image errors"}),
        )


@app.get(constant.TARGET_FEATURES_ENDPOINT)
async def target_features():
    async with target_features_lock:
        if len(SEARCH_SERVERS) == 0:
            return JSONResponse(
                status_code=404,
                content=jsonable_encoder({constant.MESSAGE_KEY: "search function is not supported"}),
            )

        return JSONResponse(
            status_code=200,
            content=jsonable_encoder(
                {constant.MESSAGE_KEY: "success", constant.TARGET_FEATURES_KEY: internal["target_features"]}
            ),
        )


@app.get(constant.FILE_INFO_ENDPOINT + "/{video_id}/{frame_id}")
async def frame_info(request: Request, video_id: str, frame_id: str):
    if len(FILE_SERVERS) == 0:
        return JSONResponse(
            status_code=404,
            content=jsonable_encoder({constant.MESSAGE_KEY: "file function is not supported"}),
        )

    crequest = CRequestPool(FILE_MAX_REQUESTS)
    health_requests = [
        GetRequest(
            urljoin(ss["host"], f"{constant.HEALTH_ENDPOINT}/{video_id}/{frame_id}"),
            params=request.query_params,
            timeout=FILE_MAX_REQUESTS,
        )
        for ss in FILE_SERVERS
    ]
    crequest.map(health_requests)

    try:
        for future in crequest.as_completed():
            res = future.result()
            if res and res.ok:
                crequest.cancel_all()

                parsed_url = urlparse(res.url)
                redirected_url = parsed_url._replace(path=request.url.path).geturl()
                return RedirectResponse(redirected_url)
    except:
        return JSONResponse(
            status_code=500,
            content=jsonable_encoder({constant.MESSAGE_KEY: "frame_info errors"}),
        )


@app.get(constant.FILE_ENDPOINT + "/{video_id}/{frame_id}")
async def get_frame(request: Request, video_id: str, frame_id: str):
    if len(FILE_SERVERS) == 0:
        return JSONResponse(
            status_code=404,
            content=jsonable_encoder({constant.MESSAGE_KEY: "file function is not supported"}),
        )

    crequest = CRequestPool(FILE_MAX_REQUESTS)
    health_requests = [
        GetRequest(
            urljoin(ss["host"], f"{constant.HEALTH_ENDPOINT}/{video_id}/{frame_id}"),
            params=request.query_params,
            timeout=FILE_MAX_REQUESTS,
        )
        for ss in FILE_SERVERS
    ]
    crequest.map(health_requests)

    try:
        for future in crequest.as_completed():
            res = future.result()
            if res and res.ok:
                crequest.cancel_all()

                parsed_url = urlparse(res.url)
                redirected_url = parsed_url._replace(path=request.url.path).geturl()
                return RedirectResponse(redirected_url)
    except:
        return JSONResponse(
            status_code=500,
            content=jsonable_encoder({constant.MESSAGE_KEY: "get_frame errors"}),
        )


CHUNK_SIZE = 1024 * 1024


@app.get(constant.FILE_ENDPOINT + "/{video_id}")
async def get_video(request: Request, video_id: str):
    if len(FILE_SERVERS) == 0:
        return JSONResponse(
            status_code=404,
            content=jsonable_encoder({constant.MESSAGE_KEY: "file function is not supported"}),
        )

    crequest = CRequestPool(FILE_MAX_REQUESTS)
    health_requests = [
        GetRequest(
            urljoin(ss["host"], f"{constant.HEALTH_ENDPOINT}/{video_id}"),
            params=request.query_params,
            timeout=FILE_MAX_REQUESTS,
        )
        for ss in FILE_SERVERS
    ]
    crequest.map(health_requests)

    try:
        for future in crequest.as_completed():
            res = future.result()
            if res and res.ok:
                crequest.cancel_all()

                parsed_url = urlparse(res.url)
                redirected_url = parsed_url._replace(path=request.url.path).geturl()
                return RedirectResponse(redirected_url)
    except:
        return JSONResponse(
            status_code=500,
            content=jsonable_encoder({constant.MESSAGE_KEY: "get_video errors"}),
        )


web_dir = Path.cwd() / constant.FRONTEND_DIST_DIR

if web_dir.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=web_dir / "dist/assets"),
        "assets",
    )
    app.mount(
        "/icon",
        StaticFiles(directory=web_dir / "dist/icon"),
        "icon",
    )

    @app.get("/{rest_of_path:path}")
    async def client_app():
        return FileResponse(web_dir / "dist/index.html")
