from pathlib import Path
import subprocess
import os
import json
from concurrent.futures import ThreadPoolExecutor

import numpy as np
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn

from .command import BaseCommand
from ...packages.index import MilvusDatabase
from ...config import GlobalConfig


class IndexCommand(BaseCommand):
    def __init__(self, *args, **kwargs):
        super(IndexCommand, self).__init__(*args, **kwargs)

    def add_args(self, subparser):
        parser = subparser.add_parser("index", help="Index features")

        parser.add_argument(
            "-c",
            "--collection",
            dest="collection_name",
            type=str,
            default="milvus",
            help="Name of collection to index",
        )
        parser.add_argument(
            "-o",
            "--overwrite",
            dest="do_overwrite",
            action="store_true",
            help="Overwrite existing collection",
        )
        parser.add_argument(
            "-u",
            "--update",
            dest="do_update",
            action="store_true",
            help="Update existing records",
        )

        parser.set_defaults(func=self)

    def __call__(
        self, collection_name, do_overwrite, do_update, verbose, *args, **kwargs
    ):
        MilvusDatabase.start_server()
        database = MilvusDatabase(collection_name, do_overwrite)
        features_dir = self._work_dir / "features"
        keyframes_dir = self._work_dir / "keyframes"
        max_workers_ratio = GlobalConfig.get("max_workers_ratio") or 0
        with (
            Progress(
                TextColumn("{task.fields[name]}"),
                TextColumn(":"),
                *Progress.get_default_columns(),
                TimeElapsedColumn(),
                disable=not verbose,
            ) as progress,
            ThreadPoolExecutor(
                round((os.cpu_count() or 0) * max_workers_ratio) or 1
            ) as executor,
        ):

            def update_progress(task_id):
                return lambda *args, **kwargs: progress.update(
                    task_id, *args, **kwargs
                )

            def index_one_video(video_id):
                task_id = progress.add_task(
                    description="Processing...", name=video_id
                )
                try:
                    self._index_features(
                        database,
                        video_id,
                        do_update,
                        update_progress(task_id),
                    )
                    progress.update(
                        task_id,
                        completed=1,
                        total=1,
                        description="Finished",
                    )
                    progress.remove_task(task_id)
                except Exception as e:
                    progress.update(task_id, description=f"Error: {str(e)}")

            futures = []
            video_paths = sorted(
                [d for d in keyframes_dir.glob("*/") if d.is_dir()],
                key=lambda path: path.stem,
            )
            for video_path in video_paths:
                video_id = video_path.stem
                futures.append(executor.submit(index_one_video, video_id))
            for future in futures:
                future.result()

    def _extract_video_info(self, video_id):
        video_path = self._work_dir / "videos" / f"{video_id}.mp4"
        video_info_path = self._work_dir / "videos_info" / f"{video_id}.json"
        video_info_path.parent.mkdir(exist_ok=True, parents=True)
        ffprobe_cmd = ["ffprobe", "-v", "quiet", "-of", "compact=p=0"] + [
            "-select_streams",
            "0",
            "-show_entries",
            "stream=r_frame_rate",
            str(video_path),
        ]
        res = subprocess.run(ffprobe_cmd, capture_output=True, text=True)

        fraction = str(res.stdout).split("=")[1].split("/")
        frame_rate = round(int(fraction[0]) / int(fraction[1]))

        with open(video_info_path, "w") as f:
            json.dump(dict(frame_rate=frame_rate), f)

    def _index_features(self, database, video_id, do_update, update_progress):
        update_progress(description="Indexing...")
        self._extract_video_info(video_id)
        features_dir = self._work_dir / "features" / video_id
        data_list = []
        for frame_path in features_dir.glob("*/"):
            if not frame_path.is_dir():
                continue
            frame_id = frame_path.stem
            data = {
                "frame_id": f"{video_id}#{frame_id}",  # This is because Milvus does not allow composite primary key
            }
            for feature_path in frame_path.glob("*"):
                if feature_path.is_dir():
                    continue
                if feature_path.suffix == ".npy":
                    feature = np.load(feature_path)
                elif feature_path.suffix == ".txt":
                    with open(feature_path, "r") as f:
                        feature = f.read()
                        feature = feature.lower()
                elif feature_path.suffix == ".json":
                    with open(feature_path, "r") as f:
                        feature = json.load(f)
                else:
                    continue
                data = {
                    **data,
                    f"{feature_path.stem}": feature,
                }
            data_list.append(data)

        database.insert(data_list, do_update)
