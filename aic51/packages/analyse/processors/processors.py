from pathlib import Path
from typing import Optional, Callable

import numpy as np
import torch
from analyse.features.feature_extractor import FeatureExtractor
from PIL import Image


class AnalyseProcessor:
    def __init__(self, extractors: list[FeatureExtractor]):
        self._extractors = extractors

    def process(
        self,
        images: list[Path | str] | np.ndarray | torch.Tensor | list[Image.Image],
        callback: Optional[Callable] = None,
    ):
        features = []
        for extractor in self._extractors:
            feature = extractor.get_features(images, callback)
