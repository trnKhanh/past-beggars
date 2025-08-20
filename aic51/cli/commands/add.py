import os
import time
import subprocess
import shutil
import sys
import logging
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

import json
from rich.progress import (
    TextColumn,
    Progress,
    SpinnerColumn,
    TimeElapsedColumn,
)
import cv2

from .command import BaseCommand
from ...config import GlobalConfig


class AddCommand(BaseCommand):
    SUPPORTED_EXT = [
        ".mp4",
    ]

    def __init__(self, *args, **kwargs):
        super(AddCommand, self).__init__(*args, **kwargs)

    def add_args(self, subparser):
        parser = subparser.add_parser(
            "add", help="Add video(s) to the work directory"
        )
        parser.add_argument(
            "video_path",
            type=str,
            help="Path to video(s)",
        )
        parser.add_argument(
            "-d",
            "--directory",
            dest="do_multi",
            action="store_true",
            help="Treat video_path as directory",
        )
        parser.add_argument(
            "-m",
            "--move",
            dest="do_move",
            action="store_true",
            help="Move video(s) (only valid if video(s) are on this machine)",
        )
        parser.add_argument(
            "-o",
            "--overwrite",
            dest="do_overwrite",
            action="store_true",
            help="Overwrite existing files",
        )

        parser.set_defaults(func=self)

    def __call__(
        self,
        video_path,
        do_multi,
        do_move,
        do_overwrite,
        verbose,
        *args,
        **kwargs,
    ):
        video_path = Path(video_path)

        if not video_path.exists():
            self._logger.error(f"{video_path}: No such file or directory")
            sys.exit(1)
        if do_multi:
            video_paths = [
                v
                for v in sorted(video_path.glob("*"))
                if v.suffix.lower() in self.SUPPORTED_EXT and not v.is_dir()
            ]
        else:
            if video_path.is_dir():
                self._logger.error(f"{video_path}: No such file")
                sys.exit(1)
            video_paths = [video_path]
        video_paths = sorted(video_paths, key=lambda path: path.stem)
        self._add_videos(video_paths, do_move, do_overwrite, verbose)

    def _add_videos(self, video_paths, do_move, do_overwrite, verbose):
        max_workers_ratio = GlobalConfig.get("max_workers_ratio") or 0
        with (
            Progress(
                TextColumn("{task.fields[name]}"),
                TextColumn(":"),
                SpinnerColumn(),
                *Progress.get_default_columns(),
                TimeElapsedColumn(),
                disable=not verbose,
            ) as progress,
            ThreadPoolExecutor(
                round((os.cpu_count() or 0) * max_workers_ratio) or 1
            ) as executor,
        ):

            def show_progress(task_id):
                return lambda **kwargs: progress.update(task_id, **kwargs)

            def add_one_video(video_path):
                task_id = progress.add_task(
                    total=2,
                    description=f"Processing...",
                    name=video_path.name,
                )
                try:
                    output_path, video_id = self._load_video(
                        video_path,
                        do_move,
                        do_overwrite,
                        show_progress(task_id),
                    )
                    progress.advance(task_id)
                    if video_id:
                        self._extract_keyframes(
                            output_path,
                            show_progress(task_id),
                        )
                        progress.advance(task_id)

                    progress.update(
                        task_id,
                        completed=1,
                        total=1,
                        description=(
                            f"Added with ID {video_id}"
                            if video_id
                            else f"Skipped"
                        ),
                    )
                    progress.remove_task(task_id)
                except Exception as e:
                    progress.update(
                        task_id,
                        description=f"Error: {str(e)}",
                    )

            for path in video_paths:
                executor.submit(add_one_video, path)

    def _load_video(self, video_path, do_move, do_overwrite, update_progress):
        update_progress(description=f"Loading...")
        video_id = video_path.stem
        output_path = (
            self._work_dir / "videos" / f"{video_id}{video_path.suffix}"
        )

        if output_path.exists() and not do_overwrite:
            return output_path, None

        output_path.parent.mkdir(parents=True, exist_ok=True)
        if do_move:
            shutil.move(video_path, output_path)
        else:
            shutil.copy(video_path, output_path)

        return output_path, video_id

    def _extract_keyframes(self, video_path, update_progress):
        update_progress(description=f"Extracting keyframes...")

        keyframe_dir = self._work_dir / "keyframes" / f"{video_path.stem}"
        if keyframe_dir.exists():
            shutil.rmtree(keyframe_dir)

        keyframe_dir.mkdir(parents=True, exist_ok=True)
        keyframes_list = self._get_keyframes_list(video_path)
        max_scene_length = GlobalConfig.get("add", "max_scene_length") or 25

        update_progress(description=f"Saving keyframes...")

        frame_counter = 0
        scene_length = 0
        cap = cv2.VideoCapture(str(video_path))
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if (
                scene_length >= max_scene_length
                or frame_counter in keyframes_list
            ):
                cv2.imwrite(
                    keyframe_dir / f"{frame_counter:06d}.jpg",
                    frame,
                    [cv2.IMWRITE_JPEG_QUALITY, 50],
                )
                scene_length = 0
            scene_length += 1
            frame_counter += 1
        cap.release()

    def _get_keyframes_list(self, video_path):
        ffprobe_cmd = (
            ["ffprobe", "-v", "quiet"]
            + [
                "-select_streams",
                "v",
                "-show_frames",
                "-show_entries",
                "frame=pict_type",
            ]
            + ["-of", "csv", str(video_path)]
        )
        res = subprocess.run(ffprobe_cmd, capture_output=True, text=True)
        keyframes_list = res.stdout.strip().split("\n")
        keyframes_list = [x for x in keyframes_list if x.startswith("frame")]
        keyframes_list = [
            i for i, x in enumerate(keyframes_list) if x.startswith("frame,I")
        ]
        return keyframes_list
