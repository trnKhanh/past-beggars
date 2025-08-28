import re
from concurrent.futures import ThreadPoolExecutor
from math import ceil
from pathlib import Path
from typing import Any, Callable, Optional

import numpy as np
import pytesseract
import torch
from PIL import Image

import aic51.packages.constant as constant
from aic51.packages.logger import logger

from .feature_extractor import FeatureExtractor, FeatureExtractorFactory


@FeatureExtractorFactory.register("ocr")
class OCR(FeatureExtractor):
    @staticmethod
    def require_input():
        return constant.KEYFRAME_DIR

    @staticmethod
    def from_pretrained(source: str, *args, **kwargs) -> "OCR":
        if source.lower() == "tesseract":
            return Tesseract(*args, **kwargs)
        else:
            raise RuntimeError(f"OCR: source={source} is invalid")


class Tesseract(OCR):
    def __init__(self, name: str = "ocr", batch_size: int = 1, *args, **kwargs):
        self.name = name
        self._batch_size = batch_size

    def get_features(
        self,
        images: list[Path | str] | np.ndarray | torch.Tensor | list[Image.Image],
        callback: Optional[Callable] = None,
    ) -> np.ndarray:
        image_features = []
        num_batches = ceil(len(images) / self._batch_size)
        if callback:
            callback(self, 0, num_batches, image_features)

        with ThreadPoolExecutor(self._batch_size) as executor:

            def process_one_image(image):
                name = image.stem
                if isinstance(image, (str, Path)):
                    image = Image.open(image)
                    width, height = image.size
                    image = image.crop((0, 0, width, round(height * 8 / 9)))

                data = pytesseract.image_to_string(image, output_type=pytesseract.Output.DICT, lang="vie")
                res = self._normalize_text(data["text"])

                return res

            for b in range(num_batches):
                futures = []
                for image in images[b * self._batch_size : (b + 1) * self._batch_size]:
                    futures.append(executor.submit(process_one_image, image))

                for i, future in enumerate(futures):
                    data = future.result()
                    image_features.append(np.array(data))

                if callback:
                    callback(self, b + 1, num_batches, image_features)

        return np.array(image_features)

    def _normalize_text(self, text: str):
        res = text.strip().lower()
        res = re.sub(r"\s+", " ", res)
        return res

    def get_text_features(self, texts: list[str] | str | np.ndarray, callback: Optional[Callable] = None) -> Any:
        return texts

    def to(self, device):
        pass
