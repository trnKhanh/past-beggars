import concurrent.futures
import json
import logging
from urllib.parse import urljoin, urlparse

import requests
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

import aic51.packages.constant as constant
from aic51.packages.logger import logger


def create_app(*args, **kwargs):
    app = FastAPI(*args, **kwargs)
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


def get_fps(video_id: str):
    try:
        with open(f"{constant.VIDEO_INFO_DIR}/{video_id}.json", "r") as f:
            fps = json.load(f)[constant.FPS_KEY]
    except:
        fps = constant.DEFAULT_FPS

    return fps


def process_searcher_results(searcher_res: dict):
    frames = []
    for record in searcher_res["results"]:
        data = record["entity"]
        record_id = data["frame_id"]  # <video_id>#<frame_id>
        video_id, frame_id = record_id.split("#")

        if "time_line" in record:
            time_line = record["time_line"]
        else:
            time_line = [frame_id]

        fps = get_fps(video_id)

        frames.append(
            {
                "id": record_id,
                "video_id": video_id,
                "frame_id": frame_id,
                "time_line": time_line,
                "fps": fps
            }
        )

    return {
        constant.RESULT_TOTAL_KEY: searcher_res["total"],
        constant.RESULT_FRAMES_KEY: frames,
        constant.RESULT_OFFSET_KEY: searcher_res["offset"],
    }


def process_search_results(request, results):
    for id, frame in enumerate(results["frames"]):
        results["frames"][id] = process_frame_info(request, frame)
    return results


def process_frame_info(request, frame):
    domain = str(request.base_url)
    if frame.get("frame_uri"):
        frame_uri = urlparse(frame["frame_uri"])
        frame["frame_uri"] = urljoin(domain, frame_uri.path)
    if frame.get("video_uri"):
        video_uri = urlparse(frame["video_uri"])
        frame["video_uri"] = urljoin(domain, video_uri.path)
    return frame
