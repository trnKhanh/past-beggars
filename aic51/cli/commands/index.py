import json
import os
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Callable

import numpy as np
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn

import aic51.packages.constant as constant
from aic51.packages.config import GlobalConfig
from aic51.packages.index import MilvusDatabase
from aic51.packages.logger import logger

from .command import BaseCommand


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

    def __call__(self, collection_name: str, do_overwrite: bool, do_update: bool, verbose: bool, *args, **kwargs):
        MilvusDatabase.start_server()

        database = MilvusDatabase(collection_name, do_overwrite)

        max_workers_ratio = GlobalConfig.get("max_workers_ratio") or 0
        max_workers = max(1, round(os.cpu_count() or 0) * max_workers_ratio)
        with (
            Progress(
                TextColumn("{task.fields[name]}"),
                TextColumn(":"),
                *Progress.get_default_columns(),
                TimeElapsedColumn(),
                disable=not verbose,
            ) as progress,
            ThreadPoolExecutor(max_workers) as executor,
        ):

            def update_progress(task_id):
                return lambda *args, **kwargs: progress.update(task_id, *args, **kwargs)

            def index_one_video(video_id):
                task_id = progress.add_task(description="Processing", name=video_id)
                try:
                    self._index_one_video(
                        database,
                        video_id,
                        do_update,
                        update_progress(task_id),
                    )
                    progress.remove_task(task_id)
                except Exception as e:
                    logger.exception(e)
                    progress.update(task_id, description=f"Error: {str(e)}")

            futures = []
            video_paths = self._get_videos()

            for video_path in video_paths:
                video_id = video_path.stem
                futures.append(executor.submit(index_one_video, video_id))

            for future in futures:
                future.result()

        database_size = database.get_size()
        logger.info(f"Inserted {database_size} entities")

    def _get_videos(self):
        features_dir = self._work_dir / constant.FEATURE_DIR

        video_paths = sorted(
            [d for d in features_dir.glob("*") if d.is_dir()],
            key=lambda path: path.stem,
        )
        return video_paths

    def _index_one_video(self, database: MilvusDatabase, video_id: str, do_update: bool, update_progress: Callable):
        video_features_dir = self._work_dir / constant.FEATURE_DIR / video_id

        data_list = []
        feature_list = GlobalConfig.get("features") or {}
        feature_fields = []
        for feature_name in feature_list.keys():
            if GlobalConfig.get("features", feature_name):
                feature_fields.append(feature_name)


        frame_features_paths = [x for x in video_features_dir.glob("*") if x.is_dir()]

        update_progress(description="Indexing", completed=0, total=len(frame_features_paths))

        for frame_features_path in frame_features_paths:
            frame_id = frame_features_path.stem
            data = {
                "frame_id": f"{video_id}#{frame_id}",  # This is because Milvus does not allow composite primary key
            }
            for feature_path in frame_features_path.glob("*"):
                feature_name = feature_path.stem
                if feature_name not in feature_fields:
                    continue
                if feature_path.is_dir():
                    continue

                feature = np.load(feature_path)

                if feature.dtype.kind == "U":
                    feature = feature.tolist()


                data[feature_name] = feature

            if all([f in data for f in feature_fields]):
                data_list.append(data)
            else:
                logger.warning(f"Skipping {data['frame_id']}: Lack of features")

            update_progress(advance=1)

        database.insert(data_list, do_update)
