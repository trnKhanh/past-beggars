import json
import os
import shutil
import subprocess
import sys
import wave
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Callable

import cv2
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn

import aic51.packages.constant as constant
from aic51.packages.config import GlobalConfig
from aic51.packages.logger import logger
from aic51.packages.utils.files import get_path

from .command import BaseCommand


class ValidateCommand(BaseCommand):
    SUPPORTED_EXT = [
        ".mp4",
    ]

    def __init__(self, *args, **kwargs):
        super(ValidateCommand, self).__init__(*args, **kwargs)

    def add_args(self, subparser):
        parser = subparser.add_parser("validate", help="Validate data according to features")

        parser.add_argument(
            "--fix",
            dest="do_fix",
            action="store_true",
            help="Fix data",
        )

        parser.set_defaults(func=self)

    def __call__(
        self,
        do_fix: bool,
        verbose: bool,
        *args,
        **kwargs,
    ):
        self._validate_videos(do_fix, verbose)

    def _validate_videos(self, do_fix: bool, verbose: bool):
        features_dir = self._work_dir / constant.FEATURE_DIR

        video_ids = sorted([f.stem for f in features_dir.glob("*") if f.is_dir()])

        max_workers_ratio = GlobalConfig.get("max_workers_ratio") or 0
        max_workers = max(1, max_workers_ratio * (os.cpu_count() or 0))
        with (
            Progress(
                TextColumn("{task.fields[name]}"),
                TextColumn(":"),
                SpinnerColumn(),
                *Progress.get_default_columns(),
                TimeElapsedColumn(),
                disable=not verbose,
            ) as progress,
            ThreadPoolExecutor(max_workers) as executor,
        ):

            def show_progress(task_id):
                return lambda **kwargs: progress.update(task_id, **kwargs)

            def validate_one_video(video_id: str):
                task_id = progress.add_task(
                    description=f"Processing...",
                    name=video_id,
                )
                try:
                    self._validate_one_video(video_id, do_fix, show_progress(task_id))
                    progress.remove_task(task_id)
                except Exception as e:
                    logger.exception(e)
                    progress.update(
                        task_id,
                        description=f"Error: {str(e)}",
                    )

            futures = []
            for video_id in video_ids:
                futures.append(executor.submit(validate_one_video, video_id))
            for f in futures:
                f.result()

    def _validate_one_video(self, video_id: str, do_fix: bool, update_progress: Callable):
        feature_path = self._work_dir / constant.FEATURE_DIR / f"{video_id}"
        video_path = self._work_dir / constant.VIDEO_DIR / f"{video_id}{constant.VIDEO_EXTENSION}"
        thumbnail_dir = self._work_dir / constant.THUMBNAIL_DIR / f"{video_id}"

        thumbnail_dir.mkdir(exist_ok=True, parents=True)

        keyframes_list = set([int(f.stem) for f in feature_path.glob("*") if f.is_dir()])

        default_size = GlobalConfig.get("add", "default_size") or [1280, 720]
        keyframe_ratio = GlobalConfig.get("add", "keyframe_resize_ratio") or 0.5
        thumbnail_ratio = GlobalConfig.get("add", "thumbnail_resize_ratio") or 0.25

        if do_fix:
            self._extract_video_info(video_path)

        cap = cv2.VideoCapture(str(video_path))
        frame_counter = 0

        update_progress(description=f"Validating", completed=0, total=len(keyframes_list))

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            default_size_frame = cv2.resize(frame, default_size)

            if frame_counter in keyframes_list:
                update_progress(advance=1)

                thumbnail_path = thumbnail_dir / f"{frame_counter:06d}.jpg"
                if not thumbnail_path.exists():
                    if do_fix:
                        thumbnail = cv2.resize(
                            default_size_frame,
                            None,
                            fx=keyframe_ratio * thumbnail_ratio,
                            fy=keyframe_ratio * thumbnail_ratio,
                        )
                        cv2.imwrite(
                            str(thumbnail_path),
                            thumbnail,
                            [cv2.IMWRITE_JPEG_QUALITY, 50],
                        )
                    else:
                        logger.warning(
                            f"video_id={video_id} keyframe_id={frame_counter}: thumbnail not found"
                        )

            frame_counter += 1

        cap.release()

    def _extract_video_info(self, video_path: Path):
        info_file = self._work_dir / constant.VIDEO_INFO_DIR / f"{video_path.stem}.json"
        info_file.parent.mkdir(parents=True, exist_ok=True)

        data = {constant.FPS_KEY: self._get_fps(video_path)}
        with open(info_file, "w") as f:
            json.dump(data, f)

    def _get_fps(self, video_path: Path):
        ffprobe_cmd = ["ffprobe", "-v", "quiet", "-of", "compact=p=0"] + [
            "-select_streams",
            "0",
            "-show_entries",
            "stream=r_frame_rate",
            str(video_path),
        ]
        res = subprocess.run(ffprobe_cmd, capture_output=True, text=True)

        fraction = str(res.stdout).split("=")[1].split("/")
        fps = round(int(fraction[0]) / int(fraction[1]))

        return fps
