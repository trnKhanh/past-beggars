import logging
from typing import Any
from abc import ABC, abstractmethod

from torch.utils.data import Dataset, DataLoader
from PIL import Image


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
        processed_data["pixel_values"] = processed_data["pixel_values"].squeeze(
            0
        )

        return processed_data


class FeatureExtractor(ABC):
    @abstractmethod
    def get_image_features(self, image_paths, batch_size, callback) -> Any:
        pass

    @abstractmethod
    def get_text_features(self, texts) -> Any:
        pass
