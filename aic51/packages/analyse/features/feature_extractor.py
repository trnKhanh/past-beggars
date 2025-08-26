import logging
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Callable, Optional

import numpy as np
import torch
from PIL import Image
from torch.utils.data import DataLoader, Dataset


class ImageDataset(Dataset):
    def __init__(self, image_paths, processor):
        self._image_paths = image_paths
        self._processor = processor

    def __len__(self):
        return len(self._image_paths)

    def __getitem__(self, index):
        path = self._image_paths[index]
        logging.getLogger("PIL").setLevel(logging.ERROR)
        image = Image.open(path)

        processed_data = self._processor(images=[image], return_tensors="pt")
        processed_data["pixel_values"] = processed_data["pixel_values"].squeeze(0)

        return processed_data


class FeatureExtractor(ABC):
    @staticmethod
    @abstractmethod
    def require_input() -> Any:
        pass

    @staticmethod
    @abstractmethod
    def from_pretrained(*args, **kwargs) -> Any:
        pass

    @abstractmethod
    def __init__(self, name: str, batch_size: int, device: str | torch.device, *args, **kwargs) -> None:
        self.name = name
        self._batch_size = batch_size
        self.to(device)

    @abstractmethod
    def get_features(
        self,
        images: list[Path | str] | np.ndarray | torch.Tensor | list[Image.Image],
        callback: Optional[Callable] = None,
    ) -> np.ndarray:
        pass

    @abstractmethod
    def get_text_features(self, texts: list[str] | str | np.ndarray, callback: Optional[Callable] = None) -> Any:
        pass

    @abstractmethod
    def to(self, device: str | torch.device):
        pass

class FeatureExtractorFactory:
    __registry = {}

    @staticmethod
    def register(k: str):
        def wrapper(extractor_cls):
            if issubclass(extractor_cls, FeatureExtractor):
                FeatureExtractorFactory.__registry[k] = extractor_cls
            return extractor_cls

        return wrapper

    @staticmethod
    def get(k: str) -> FeatureExtractor | None:
        if k in FeatureExtractorFactory.__registry:
            return FeatureExtractorFactory.__registry[k]
        else:
            return None
