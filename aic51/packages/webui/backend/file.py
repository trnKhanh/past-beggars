from pathlib import Path

from fastapi import Header, Request, Response
from fastapi.responses import FileResponse

import aic51.packages.constant as constant
from aic51.packages.logger import logger

from .utils import create_app, get_fps

app = create_app()


@app.get(constant.HEALTH_ENDPOINT + "/{video_id}/{frame_id}")
async def frame_health(request: Request, video_id: str, frame_id: str):
    file_path = Path.cwd() / f"{constant.THUMBNAIL_DIR}/{video_id}/{frame_id}{constant.IMAGE_EXTENSION}"
    if file_path.exists() and not file_path.is_dir():
        return Response(status_code=200)
    else:
        return Response(status_code=404)


@app.get(constant.HEALTH_ENDPOINT + "/{video_id}")
async def video_health(request: Request, video_id: str):
    file_path = Path.cwd() / f"{constant.VIDEO_DIR}/{video_id}{constant.VIDEO_EXTENSION}"
    if file_path.exists() and not file_path.is_dir():
        return Response(status_code=200)
    else:
        return Response(status_code=404)


@app.get(constant.HEALTH_ENDPOINT)
async def health(request: Request):
    return Response(status_code=200)


@app.get(constant.FILE_INFO_ENDPOINT + "/{video_id}/{frame_id}")
async def frame_info(request: Request, video_id: str, frame_id: str):
    id = f"{video_id}#{frame_id}"
    fps = get_fps(video_id)

    return dict(
        id=id,
        video_id=video_id,
        frame_id=frame_id,
        fps=fps,
    )


@app.get(constant.FILE_ENDPOINT + "/{video_id}/{frame_id}")
async def get_file(request: Request, video_id: str, frame_id: str):
    file_path = Path.cwd() / f"{constant.THUMBNAIL_DIR}/{video_id}/{frame_id}{constant.IMAGE_EXTENSION}"
    if file_path.exists() and not file_path.is_dir():
        return FileResponse(file_path)
    else:
        return Response(status_code=404)


CHUNK_SIZE = 1024 * 1024


@app.get(constant.FILE_ENDPOINT + "/{video_id}")
async def get_video(request: Request, video_id: str, range: str = Header(None)):
    file_path = Path.cwd() / f"{constant.VIDEO_DIR}/{video_id}{constant.VIDEO_EXTENSION}"
    if not file_path.exists() or file_path.is_dir():
        return Response(status_code=404)

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
