import json
import logging
from urllib.parse import urljoin, urlparse, urlunparse
from pathlib import Path
import concurrent.futures

import requests
from fastapi import FastAPI, Request, Header, Response
from fastapi.staticfiles import StaticFiles
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

from ...search import Searcher
from ....config import GlobalConfig
from .utils import (
    ConcurrentRequest,
    GetRequest,
    process_search_results,
    process_frame_info,
)

logger = logging.getLogger(__name__)


def init_app():
    app = FastAPI()
    origins = [
        "*",
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    return app


def setup_search_proxy(app: FastAPI, request_timeout, gsize=10):
    @app.get("/api/search")
    async def search(
        request: Request,
    ):
        backends = GlobalConfig.get("webui", "search", "backends")
        if backends:
            crequest = ConcurrentRequest(gsize)
            search_urls = [
                urljoin(backend["host"], "api/_search") for backend in backends
            ]
            search_requests = [
                GetRequest(
                    url, params=request.query_params, timeout=request_timeout
                )
                for url in search_urls
            ]
            crequest.map(search_requests)

            try:
                for future in crequest.as_completed():
                    res = future.result()
                    if res and res.ok:
                        crequest.cancel_all()
                        return process_search_results(request, res.json())
            except Exception as e:
                return JSONResponse(
                    status_code=500,
                    content=jsonable_encoder({"msg": "Search proxy errors"}),
                )
            return JSONResponse(
                status_code=404,
                content=jsonable_encoder(
                    {"msg": "No search return from backends"}
                ),
            )
        else:
            return JSONResponse(
                status_code=404,
                content=jsonable_encoder(
                    {"msg": "No backend found in config file"}
                ),
            )

    @app.get("/api/similar")
    async def similar(
        request: Request,
    ):
        backends = GlobalConfig.get("webui", "search", "backends")
        if backends:
            crequest = ConcurrentRequest(gsize)
            similar_urls = [
                urljoin(backend["host"], "api/_similar") for backend in backends
            ]
            similar_requests = [
                GetRequest(
                    url, params=request.query_params, timeout=request_timeout
                )
                for url in similar_urls
            ]
            crequest.map(similar_requests)

            try:
                for future in crequest.as_completed():
                    res = future.result()
                    if res and res.ok:
                        crequest.cancel_all()
                        return process_search_results(request, res.json())
            except:
                return JSONResponse(
                    status_code=500,
                    content=jsonable_encoder(
                        {"msg": "Search similar proxy errors"}
                    ),
                )
            return JSONResponse(
                status_code=404,
                content=jsonable_encoder(
                    {"msg": "No search similar return from backends"}
                ),
            )
        else:
            return JSONResponse(
                status_code=404,
                content=jsonable_encoder(
                    {"msg": "No backend found in config file"}
                ),
            )

    @app.get("/api/models")
    async def models():
        backends = GlobalConfig.get("webui", "search", "backends")
        if backends:
            crequest = ConcurrentRequest(gsize)
            models_urls = [
                urljoin(backend["host"], "api/_models") for backend in backends
            ]
            models_requests = [
                GetRequest(url, timeout=request_timeout) for url in models_urls
            ]
            crequest.map(models_requests)

            models = []
            try:
                for future in crequest.as_completed():
                    res = future.result()
                    if res and res.ok:
                        models.extend(res.json()["models"])
            except:
                return JSONResponse(
                    status_code=500,
                    content=jsonable_encoder(
                        {"msg": "Get models proxy errors"}
                    ),
                )
            return {"models": models}
        else:
            return JSONResponse(
                status_code=404,
                content=jsonable_encoder(
                    {"msg": "No backend found in config file"}
                ),
            )

    @app.get("/api/objects")
    async def object_classes():
        backends = GlobalConfig.get("webui", "search", "backends")
        if backends:
            crequest = ConcurrentRequest(gsize)
            objects_urls = [
                urljoin(backend["host"], "api/_objects") for backend in backends
            ]
            objects_requests = [
                GetRequest(url, timeout=request_timeout) for url in objects_urls
            ]
            crequest.map(objects_requests)

            objects = set()
            try:
                for future in crequest.as_completed():
                    res = future.result()
                    if res and res.ok:
                        for obj in res.json()["objects"]:
                            objects.add(obj)
            except:
                return JSONResponse(
                    status_code=500,
                    content=jsonable_encoder(
                        {"msg": "Get objects classes proxy errors"}
                    ),
                )
            return {"objects": list(objects)}
        else:
            return JSONResponse(
                status_code=404,
                content=jsonable_encoder(
                    {"msg": "No backend found in config file"}
                ),
            )

    return app


def setup_search(app: FastAPI, work_dir, searcher: Searcher):
    @app.get("/api/_search")
    async def _search(
        request: Request,
        model: str = "clip",
        q: str = "",
        offset: int = 0,
        limit: int = 50,
        ef: int = 32,
        nprobe: int = 8,
        temporal_k: int = 10000,
        ocr_weight: float = 1.0,
        ocr_threshold: int = 40,
        object_weight: float = 1.0,
        max_interval: int = 250,
        selected: str | None = None,
    ):
        try:
            res = searcher.search(
                q,
                "",
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
                selected,
            )
        except Exception as e:
            logger.exception(e)
            return JSONResponse(
                status_code=500,
                content=jsonable_encoder({"msg": "Search errors"}),
            )

        frames = []
        for record in res["results"]:
            data = record["entity"]
            video_frame_str = data["frame_id"]
            video_id, frame_id = video_frame_str.split("#")
            frame_uri = urljoin(
                str(request.base_url),
                f"api/files/keyframes/{video_id}/{frame_id}.jpg",
            )

            video_uri = urljoin(
                str(request.base_url), f"api/stream/videos/{video_id}.mp4"
            )
            try:
                with open(work_dir / f"videos_info/{video_id}.json", "r") as f:
                    fps = json.load(f)["frame_rate"]
            except:
                fps = 25

            frames.append(
                dict(
                    id=video_frame_str,
                    video_id=video_id,
                    frame_id=frame_id,
                    frame_uri=frame_uri,
                    video_uri=video_uri,
                    fps=fps,
                )
            )

        params = {
            "model": model,
            "limit": limit,
            "ef": ef,
            "nprobe": nprobe,
            "temporal_k": temporal_k,
            "ocr_weight": ocr_weight,
            "ocr_threshold": ocr_threshold,
            "object_weight": object_weight,
            "max_interval": max_interval,
        }
        return {
            "total": res["total"],
            "frames": frames,
            "params": params,
            "offset": res["offset"],
        }

    @app.get("/api/_similar")
    async def _similar(
        request: Request,
        id: str,
        model: str = "clip",
        offset: int = 0,
        limit: int = 50,
        ef: int = 32,
        nprobe: int = 8,
        temporal_k: int = 10000,
        ocr_weight: float = 1.0,
        ocr_threshold: int = 40,
        object_weight: float = 1.0,
        max_interval: int = 250,
    ):
        res = searcher.search_similar(id, offset, limit, ef, nprobe, model)
        frames = []
        for record in res["results"]:
            data = record["entity"]
            video_frame_str = data["frame_id"]
            video_id, frame_id = video_frame_str.split("#")
            frame_uri = f"{request.base_url}api/files/keyframes/{video_id}/{frame_id}.jpg"
            video_uri = f"{request.base_url}api/stream/videos/{video_id}.mp4"
            try:
                with open(work_dir / f"videos_info/{video_id}.json", "r") as f:
                    fps = json.load(f)["frame_rate"]
            except:
                fps = 25

            frames.append(
                dict(
                    id=video_frame_str,
                    video_id=video_id,
                    frame_id=frame_id,
                    frame_uri=frame_uri,
                    video_uri=video_uri,
                    fps=fps,
                )
            )

        params = {
            "model": model,
            "limit": limit,
            "ef": ef,
            "nprobe": nprobe,
            "temporal_k": temporal_k,
            "ocr_weight": ocr_weight,
            "ocr_threshold": ocr_threshold,
            "object_weight": object_weight,
            "max_interval": max_interval,
        }
        return {
            "total": res["total"],
            "frames": frames,
            "params": params,
            "offset": res["offset"],
        }

    @app.get("/api/_models")
    async def _models():
        return {"models": searcher.get_models()}

    @app.get("/api/_objects")
    async def _objects():
        return {"objects": searcher.get_objects_classes()}

    return app


def setup_video_proxy(app: FastAPI, request_timeout, gsize=10):
    @app.get("/api/frame_info")
    async def frame_info(request: Request):
        backends = GlobalConfig.get("webui", "video", "backends") or []
        if backends:
            crequest = ConcurrentRequest(gsize)
            frame_info_urls = [
                urljoin(backend["host"], f"/api/_frame_info")
                for backend in backends
            ]
            frame_info_requests = [
                GetRequest(
                    url, params=request.query_params, timeout=request_timeout
                )
                for url in frame_info_urls
            ]
            crequest.map(frame_info_requests)

            try:
                for future in crequest.as_completed():
                    res = future.result()
                    if res and res.ok:
                        crequest.cancel_all()
                        return process_frame_info(request, res.json())
            except:
                return JSONResponse(
                    status_code=500,
                    content=jsonable_encoder(
                        {"msg": "Get frame info proxy errors"}
                    ),
                )
            return JSONResponse(
                status_code=404,
                content=jsonable_encoder(
                    {"msg": "No frame info return from backends"}
                ),
            )

        else:
            return JSONResponse(
                status_code=404,
                content=jsonable_encoder(
                    {"msg": "No backend found in config file"}
                ),
            )

    @app.get("/api/files/{file_path:path}")
    async def get_file(file_path: str):
        backends = GlobalConfig.get("webui", "video", "backends") or []
        if backends:
            crequest = ConcurrentRequest(gsize)
            has_file_urls = [
                urljoin(backend["host"], f"/api/_has_file/{file_path}")
                for backend in backends
            ]
            has_file_requests = [
                GetRequest(url, timeout=request_timeout)
                for url in has_file_urls
            ]
            crequest.map(has_file_requests)

            try:
                for future in crequest.as_completed():
                    res = future.result()
                    if res and res.ok:
                        crequest.cancel_all()
                        parse_url = urlparse(str(res.url))
                        parse_url = parse_url._replace(
                            path=f"/api/_files/{file_path}"
                        )
                        return RedirectResponse(urlunparse(parse_url))
            except:
                return JSONResponse(
                    status_code=500,
                    content=jsonable_encoder({"msg": "Get file proxy errors"}),
                )
            return JSONResponse(
                status_code=404,
                content=jsonable_encoder(
                    {"msg": "No file return from backends"}
                ),
            )

        else:
            return JSONResponse(
                status_code=404,
                content=jsonable_encoder(
                    {"msg": "No backend found in config file"}
                ),
            )

    CHUNK_SIZE = 1024 * 1024

    @app.get("/api/stream/{file_path:path}")
    async def video_endpoint(
        request: Request, file_path: str, range: str = Header(None)
    ):
        backends = GlobalConfig.get("webui", "video", "backends") or []
        if backends:
            crequest = ConcurrentRequest(gsize)
            has_file_urls = [
                urljoin(backend["host"], f"/api/_has_file/{file_path}")
                for backend in backends
            ]
            has_file_requests = [
                GetRequest(url, timeout=request_timeout)
                for url in has_file_urls
            ]
            crequest.map(has_file_requests)

            try:
                for future in crequest.as_completed():
                    res = future.result()
                    if res and res.ok:
                        crequest.cancel_all()
                        parse_url = urlparse(str(res.url))
                        parse_url = parse_url._replace(
                            path=f"/api/_stream/{file_path}"
                        )
                        return RedirectResponse(urlunparse(parse_url))
            except:
                return JSONResponse(
                    status_code=500,
                    content=jsonable_encoder({"msg": "Stream proxy errors"}),
                )
            return JSONResponse(
                status_code=404,
                content=jsonable_encoder(
                    {"msg": "No stream return from backends"}
                ),
            )

        else:
            return JSONResponse(
                status_code=404,
                content=jsonable_encoder(
                    {"msg": "No backend found in config file"}
                ),
            )


def setup_video(app, work_dir):
    @app.get("/api/_frame_info")
    async def frame_info(request: Request, video_id: str, frame_id: str):
        id = f"{video_id}#{frame_id}"
        frame_uri = (
            f"{request.base_url}api/files/keyframes/{video_id}/{frame_id}.jpg"
        )
        video_uri = f"{request.base_url}api/stream/videos/{video_id}.mp4"
        try:
            with open(work_dir / "videos_info" / f"{video_id}.json", "r") as f:
                fps = json.load(f)["frame_rate"]
        except:
            return Response(status_code=404)
        return dict(
            id=id,
            video_id=video_id,
            frame_id=frame_id,
            frame_uri=frame_uri,
            video_uri=video_uri,
            fps=fps,
        )

    @app.get("/api/_has_file/{file_path:path}")
    async def has_file(file_path):
        if (work_dir / file_path).exists():
            return Response(status_code=200)
        else:
            return Response(status_code=404)

    @app.get("/api/_files/{file_path:path}")
    async def get_file(file_path):
        return FileResponse(str(work_dir / file_path))

    CHUNK_SIZE = 1024 * 1024

    @app.get("/api/_stream/{file_path:path}")
    async def video_endpoint(
        request: Request, file_path: str, range: str = Header(None)
    ):
        start, end = range.replace("bytes=", "").split("-")
        start = int(start)
        end = int(end) if end else start + CHUNK_SIZE
        video_path = Path(work_dir / file_path)
        if not video_path.exists():
            return JSONResponse(
                status_code=404,
                content=jsonable_encoder({"msg": f'"{file_path}" not found'}),
            )
        with open(video_path, "rb") as video:
            video.seek(start)
            data = video.read(end - start)
            filesize = video_path.stat().st_size
            headers = {
                "Content-Range": f"bytes {str(start)}-{str(min(end, filesize-1))}/{str(filesize)}",
                "Accept-Ranges": "bytes",
            }
        return Response(
            data, status_code=206, headers=headers, media_type="video/mp4"
        )


def setup_frontend(app, work_dir):
    web_dir = work_dir / ".web"
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
            return FileResponse(work_dir / ".web/dist/index.html")
