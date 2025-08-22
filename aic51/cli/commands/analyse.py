import os
import json
from pathlib import Path
import shutil
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import torch
from rich.progress import Progress, SpinnerColumn, TimeElapsedColumn, TextColumn

from .command import BaseCommand
from ...packages.analyse.features import CLIP, TrOCR
from ...packages.analyse.objects import Yolo
from ...config import GlobalConfig


class AnalyseCommand(BaseCommand):
    def __init__(self, *args, **kwargs):
        super(AnalyseCommand, self).__init__(*args, **kwargs)

    def add_args(self, subparser):
        parser = subparser.add_parser(
            "analyse", help="Analyse extracted keyframes"
        )

        parser.add_argument(
            "--no-gpu",
            dest="gpu",
            action="store_false",
            help="Do not use gpu",
        )
        parser.add_argument(
            "-o",
            "--overwrite",
            dest="do_overwrite",
            action="store_true",
            help="Skip overlapping videos",
        )

        parser.set_defaults(func=self)

    def __call__(self, gpu, do_overwrite, verbose, *args, **kwargs):
        models = GlobalConfig.get("analyse", "features")
        max_workers_ratio = GlobalConfig.get("max_workers_ratio") or 0
        if models is None:
            raise RuntimeError(
                f"Models for features extraction are not specified. Check your config file."
            )
        video_ids = self._get_video_ids()

        for model_info in models:
            model_name = model_info["name"].lower()
            batch_size = model_info["batch_size"]
            if model_name == "clip":
                pretrained_model = model_info["pretrained_model"]
                model = CLIP(pretrained_model)
                self._logger.info(
                    f"Start extracting features using {model_name} ({pretrained_model})"
                )
            elif model_name == "ocr":
                model = TrOCR()
                self._logger.info(
                    f"Start extracting features using {model_name} (easyOCR)"
                )
            elif model_name == "yolo":
                pretrained_model = model_info["pretrained_model"]
                model = Yolo(pretrained_model)
                self._logger.info(
                    f"Start extracting features using {model_name} ({pretrained_model})"
                )
            else:
                self._logger.error(f"{model_name}: model is not available")
                continue

            if gpu and torch.cuda.is_available():
                max_workers = 1
                model.to("cuda")
            elif gpu and torch.backends.mps.is_available():
                max_workers = 1
                model.to("mps")
            else:
                max_workers = round((os.cpu_count() or 0) * max_workers_ratio)
                if max_workers <= 0:
                    max_workers = 1

                model.to("cpu")
                self._logger.warning(
                    "CUDA is not available, fallbacked to use CPU"
                )

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

                def update_progress(task_id):
                    return lambda *args, **kwargs: progress.update(
                        task_id, *args, **kwargs
                    )

                def analyse_one_video(video_id):
                    task_id = progress.add_task(
                        description="Processing...",
                        name=video_id,
                    )
                    try:
                        status_ok = self._extract_features(
                            model_name,
                            model,
                            video_id,
                            batch_size,
                            do_overwrite,
                            update_progress(task_id),
                        )
                        progress.update(
                            task_id,
                            completed=1,
                            total=1,
                            description=(
                                "Finished" if status_ok else "Skipped"
                            ),
                        )
                        progress.remove_task(task_id)
                    except Exception as e:
                        progress.update(task_id, description=f"Error: {str(e)}")

                futures = []
                for video_id in video_ids:
                    futures.append(executor.submit(analyse_one_video, video_id))
                for future in futures:
                    future.result()

    def _get_video_ids(self):
        keyframes_dir = self._work_dir / "keyframes"
        video_ids = sorted(
            [d.stem for d in keyframes_dir.glob("*") if d.is_dir()]
        )
        return video_ids

    def _get_keyframes_list(self, model_name, video_id, do_overwrite):
        keyframes_dir = self._work_dir / "keyframes" / video_id
        features_dir = self._work_dir / "features" / video_id

        has_features = set()
        if features_dir.exists() and not do_overwrite:
            for keyframe in features_dir.glob("*"):
                if not keyframe.is_dir():
                    continue
                for feature in keyframe.glob("*"):
                    if feature.is_dir():
                        continue
                    if feature.stem == model_name:
                        has_features.add(keyframe.stem)
                        break

        keyframes = []
        for keyframe in keyframes_dir.glob("*"):
            if (
                keyframe.is_dir()
                or keyframe.stem[0] == "."
                or keyframe.stem in has_features
            ):
                continue
            keyframes.append(keyframe)

        return keyframes

    def _extract_features(
        self,
        model_name,
        model,
        video_id,
        batch_size,
        do_overwrite,
        update_progress,
    ):
        update_progress(description="Extracting features...")
        keyframe_files = self._get_keyframes_list(
            model_name, video_id, do_overwrite
        )
        if len(keyframe_files) == 0:
            return 1
        features_dir = self._work_dir / f"features" / video_id

        features = model.get_image_features(
            keyframe_files,
            batch_size,
            lambda finished_batches, total_batches, _: update_progress(
                completed=finished_batches, total=total_batches
            ),
        )
        if model_name == "clip":
            features = features.cpu()

        update_progress(
            completed=0,
            total=len(keyframe_files),
            description="Saving features...",
        )
        for i, path in enumerate(keyframe_files):
            save_dir = features_dir / path.stem
            save_dir.mkdir(parents=True, exist_ok=True)
            if isinstance(features[i], torch.Tensor) or isinstance(
                features[i], np.ndarray
            ):
                np.save(save_dir / f"{model_name}.npy", features[i])
            elif isinstance(features[i], str):
                with open(save_dir / f"{model_name}.txt", "w") as f:
                    f.write(features[i])
            else:
                with open(save_dir / f"{model_name}.json", "w") as f:
                    json.dump(features[i], f)
            update_progress(advance=1)

        return 1
