import json
import logging
import os
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from ....config import GlobalConfig
from ...analyse.features import CLIP
from ...search import Searcher

WORK_DIR = Path(os.getenv("AIC51_WORK_DIR") or ".")
logger = logging.getLogger(__name__)

searcher = Searcher(GlobalConfig.get("webui", "database") or "milvus")

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


@app.get("/api/search")
async def search(
    request: Request,
    model: str = "clip",
    q: str = "",
    offset: int = 0,
    limit: int = 50,
    nprobe: int = 8,
    temporal_k: int = 10000,
    ocr_weight: float = 1.0,
    ocr_threshold: int = 40,
    max_interval: int = 250,
    selected: str | None = None,
):
    res = searcher.search(
        q,
        "",
        offset,
        limit,
        nprobe,
        model,
        temporal_k,
        ocr_weight,
        ocr_threshold,
        max_interval,
        selected,
    )
    frames = []
    for record in res["results"]:
        data = record["entity"]
        video_frame_str = data["frame_id"]
        video_id, frame_id = video_frame_str.split("#")
        frame_uri = f"{request.base_url}api/files/keyframes/{video_id}/{frame_id}.jpg"
        video_uri = f"{request.base_url}api/stream/videos/{video_id}.mp4"
        try:
            with open(WORK_DIR / "videos_info" / f"{video_id}.json", "r") as f:
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
        "nprobe": nprobe,
        "temporal_k": temporal_k,
        "ocr_weight": ocr_weight,
        "ocr_threshold": ocr_threshold,
        "max_interval": max_interval,
    }
    return {
        "total": res["total"],
        "frames": frames,
        "params": params,
        "offset": res["offset"],
    }


@app.get("/api/similar")
async def similar(
    request: Request,
    id: str,
    model: str = "clip",
    offset: int = 0,
    limit: int = 50,
    nprobe: int = 8,
    temporal_k: int = 10000,
    ocr_weight: float = 1.0,
    ocr_threshold: int = 40,
    max_interval: int = 250,
):
    res = searcher.search_similar(id, offset, limit, nprobe, model)
    frames = []
    for record in res["results"]:
        data = record["entity"]
        video_frame_str = data["frame_id"]
        video_id, frame_id = video_frame_str.split("#")
        frame_uri = f"{request.base_url}api/files/keyframes/{video_id}/{frame_id}.jpg"
        video_uri = f"{request.base_url}api/stream/videos/{video_id}.mp4"
        try:
            with open(WORK_DIR / "videos_info" / f"{video_id}.json", "r") as f:
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
        "nprobe": nprobe,
        "temporal_k": temporal_k,
        "ocr_weight": ocr_weight,
        "ocr_threshold": ocr_threshold,
        "max_interval": max_interval,
    }
    return {
        "total": res["total"],
        "frames": frames,
        "params": params,
        "offset": res["offset"],
    }


@app.get("/api/frame_info")
async def frame_info(request: Request, video_id: str, frame_id: str):
    id = f"{video_id}#{frame_id}"
    record = searcher.get(id)
    frame_uri = f"{request.base_url}api/files/keyframes/{video_id}/{frame_id}.jpg"
    video_uri = f"{request.base_url}api/stream/videos/{video_id}.mp4"
    try:
        with open(WORK_DIR / "videos_info" / f"{video_id}.json", "r") as f:
            fps = json.load(f)["frame_rate"]
    except:
        fps = 25
    return dict(
        id=id if len(record) > 0 else None,
        video_id=video_id,
        frame_id=frame_id,
        frame_uri=frame_uri if len(record) > 0 else None,
        video_uri=video_uri,
        fps=fps,
    )


@app.get("/api/files/{file_path:path}")
async def get_file(file_path):
    return FileResponse(str(WORK_DIR / file_path))


CHUNK_SIZE = 1024 * 1024


@app.get("/api/stream/{file_path:path}")
async def video_endpoint(file_path: str, range: str = Header(None)):
    start, end = range.replace("bytes=", "").split("-")
    start = int(start)
    end = int(end) if end else start + CHUNK_SIZE
    video_path = Path(file_path)
    with open(video_path, "rb") as video:
        video.seek(start)
        data = video.read(end - start)
        filesize = video_path.stat().st_size
        headers = {
            "Content-Range": f"bytes {str(start)}-{str(min(end, filesize-1))}/{str(filesize)}",
            "Accept-Ranges": "bytes",
        }
    return Response(data, status_code=206, headers=headers, media_type="video/mp4")


@app.get("/api/models")
async def models():
    return {"models": searcher.get_models()}


WEB_DIR = WORK_DIR / ".web"
if WEB_DIR.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=WEB_DIR / "dist/assets"),
        "assets",
    )
    app.mount(
        "/icon",
        StaticFiles(directory=WEB_DIR / "dist/icon"),
        "icon",
    )

    @app.get("/{rest_of_path:path}")
    async def client_app():
        return FileResponse(WORK_DIR / ".web/dist/index.html")
