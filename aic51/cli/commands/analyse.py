import json
import os
import shutil
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import torch
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn

from aic51.packages.analyse import FeatureExtractor, FeatureExtractorFactory
from aic51.packages.config import GlobalConfig
from aic51.packages.logger import logger

from .command import BaseCommand


class AnalyseCommand(BaseCommand):
    def __init__(self, *args, **kwargs):
        super(AnalyseCommand, self).__init__(*args, **kwargs)

    def add_args(self, subparser):
        parser = subparser.add_parser("analyse", help="Analyse extracted keyframes")

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

    def _get_device(self, do_gpu: bool):
        device = torch.device("cpu")
        if do_gpu:
            if torch.cuda.is_available():
                device = torch.device("cuda")
            elif torch.backends.mps.is_available():
                device = torch.device("mps")
            else:
                logger.warning("GPU is not available, fallbacked to CPU")

        return device

    def __call__(self, do_gpu: bool, do_overwrite: bool, verbose: bool, *args, **kwargs):
        model_infos = GlobalConfig.get("analyse", "features")
        device = self._get_device(do_gpu)

        if model_infos is None:
            raise RuntimeError(f"Models for features extraction are not specified. Check your config file.")

        video_ids = self._get_video_ids()

        logger.info(f"Starting analyse process with (device={device})")

        for model_info in model_infos:
            model_name = model_info["name"].lower()
            batch_size = model_info["batch_size"]
            pretrained_model = model_info["pretrained_model"]
            feature_extractor = FeatureExtractorFactory.get(
                model_name, name=model_name, pretrained_model=pretrained_model, batch_size=batch_size
            )

            polite_name = f"{model_name}" + (f' from "{pretrained_model}"' if pretrained_model else "")
            if feature_extractor:
                logger.info(f"Extracting features using {polite_name}")
            else:
                logger.error(f"{polite_name}: invalid feature extractor")
                continue

            with (
                Progress(
                    TextColumn("{task.fields[name]}"),
                    TextColumn(":"),
                    SpinnerColumn(),
                    *Progress.get_default_columns(),
                    TimeElapsedColumn(),
                    disable=not verbose,
                ) as progress,
            ):
                for video_id in video_ids:
                    self._analyse_one_video(feature_extractor, video_id, progress, do_overwrite)

    def _get_video_ids(self):
        keyframes_dir = self._work_dir / "keyframes"
        video_ids = sorted([d.stem for d in keyframes_dir.glob("*") if d.is_dir() and d.stem[0] != "."])
        return video_ids

    def _get_keyframes_list(self, feature_extractor: FeatureExtractor, video_id: str, do_overwrite: bool):
        keyframes_dir = self._work_dir / "keyframes" / video_id
        features_dir = self._work_dir / "features" / video_id

        has_features = set()
        if features_dir.exists() and not do_overwrite:
            for feature_path in features_dir.glob("*/*.npy"):
                if feature_path.is_dir():
                    continue

                if feature_path.stem == feature_extractor.name:
                    has_features.add(feature_path.parent.stem)

        keyframes = []
        for keyframe in keyframes_dir.glob("*"):
            if keyframe.is_dir() or keyframe.stem[0] == "." or keyframe.stem in has_features:
                continue
            keyframes.append(keyframe)

        return keyframes

    def _analyse_one_video(
        self, feature_extractor: FeatureExtractor, video_id: str, progress: Progress, do_overwrite: bool
    ):
        task_id = progress.add_task(
            description="Analysing",
            name=video_id,
        )
        try:
            progress.update(
                task_id,
                description="Extracting features",
            )

            keyframe_files = self._get_keyframes_list(feature_extractor, video_id, do_overwrite)

            def update_progress(feature_extractor, completed, total, res):
                progress.update(task_id, completed=completed, total=total)

            features = feature_extractor.get_image_features(keyframe_files, update_progress)

            progress.update(
                task_id,
                description="Saving features",
                name=video_id,
                total=len(keyframe_files),
            )

            save_dir = self._work_dir / f"features" / video_id
            for i, path in enumerate(keyframe_files):
                save_dir = save_dir / path.stem
                save_dir.mkdir(parents=True, exist_ok=True)

                assert isinstance(features[i], np.ndarray)

                np.save(save_dir / f"{feature_extractor.name}.npy", features[i])
                progress.update(task_id, advance=1)

            progress.remove_task(task_id)
        except Exception as e:
            progress.update(task_id, description=f"Error: {str(e)}")
