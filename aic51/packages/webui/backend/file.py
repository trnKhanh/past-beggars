from pathlib import Path

from fastapi import Header, Request, Response
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse, JSONResponse

import aic51.packages.constant as constant
from aic51.packages.logger import logger

from .utils import create_app, get_fps

app = create_app()


@app.get(constant.HEALTH_ENDPOINT + "/{video_id}/{frame_id}")
async def frame_health(request: Request, video_id: str, frame_id: str):
    file_path = Path.cwd() / f"{constant.THUMBNAIL_DIR}/{video_id}/{frame_id}{constant.IMAGE_EXTENSION}"
    if file_path.exists() and not file_path.is_dir():
        return JSONResponse(status_code=200, content=jsonable_encoder({constant.MESSAGE_KEY: "available"}))
    else:
        return JSONResponse(status_code=404, content=jsonable_encoder({constant.MESSAGE_KEY: "unavailable"}))


@app.get(constant.HEALTH_ENDPOINT + "/{video_id}")
async def video_health(request: Request, video_id: str):
    file_path = Path.cwd() / f"{constant.VIDEO_DIR}/{video_id}{constant.VIDEO_EXTENSION}"
    if file_path.exists() and not file_path.is_dir():
        return JSONResponse(status_code=200, content=jsonable_encoder({constant.MESSAGE_KEY: "available"}))
    else:
        return JSONResponse(status_code=404, content=jsonable_encoder({constant.MESSAGE_KEY: "unavailable"}))


@app.get(constant.HEALTH_ENDPOINT)
async def health(request: Request):
    return JSONResponse(status_code=200, content=jsonable_encoder({constant.MESSAGE_KEY: "alive"}))


@app.get(constant.FILE_INFO_ENDPOINT + "/{video_id}/{frame_id}")
async def frame_info(request: Request, video_id: str, frame_id: str):
    id = f"{video_id}#{frame_id}"
    fps = get_fps(video_id)
    
    # Construct video URI based on request base URL
    domain = str(request.base_url).rstrip('/')
    video_uri = f"{domain}{constant.FILE_ENDPOINT}/{video_id}"

    return dict(
        id=id,
        video_id=video_id,
        frame_id=frame_id,
        fps=fps,
        video_uri=video_uri,
    )


@app.get(constant.FILE_ENDPOINT + "/{video_id}/{frame_id}")
async def get_file(request: Request, video_id: str, frame_id: str):
    file_path = Path.cwd() / f"{constant.THUMBNAIL_DIR}/{video_id}/{frame_id}{constant.IMAGE_EXTENSION}"
    if file_path.exists() and not file_path.is_dir():
        return FileResponse(file_path)
    else:
        return JSONResponse(status_code=404, content=jsonable_encoder({constant.MESSAGE_KEY: "unavailable"}))


CHUNK_SIZE = 1024 * 1024


@app.get(constant.FILE_ENDPOINT + "/{video_id}")
async def get_video(request: Request, video_id: str, range: str = Header(None)):
    file_path = Path.cwd() / f"{constant.VIDEO_DIR}/{video_id}{constant.VIDEO_EXTENSION}"
    if not file_path.exists() or file_path.is_dir():
        return JSONResponse(status_code=404, content=jsonable_encoder({constant.MESSAGE_KEY: "unavailable"}))

    start, end = range.replace("bytes=", "").split("-")
    start = int(start)
    end = int(end) if end else start + CHUNK_SIZE

    with open(file_path, "rb") as video:
        video.seek(start)
        data = video.read(end - start)
        filesize = file_path.stat().st_size
        headers = {
            "Content-Range": f"bytes {str(start)}-{str(min(end, filesize-1))}/{str(filesize)}",
            "Accept-Ranges": "bytes",
        }
    return Response(data, status_code=206, headers=headers, media_type=constant.VIDEO_MEDIA_TYPE)
