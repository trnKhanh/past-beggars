from pathlib import Path
from typing import Any, Callable, Optional

import numpy as np
import torch
from PIL import Image
from torch.utils.data import DataLoader
from transformers import AutoModel, AutoProcessor

from aic51.packages.analyse import FeatureExtractorFactory
from aic51.packages.analyse.datasets import ImageDataset
from aic51.packages.config import GlobalConfig

from .feature_extractor import FeatureExtractor


@FeatureExtractorFactory.register("clip")
class CLIP(FeatureExtractor):
    def __init__(
        self,
        pretrained_model: str,
        name: str = "clip",
        batch_size: int = 1,
        device: torch.device = torch.device("cpu"),
        *args,
        **kwargs,
    ):
        self._model = AutoModel.from_pretrained(pretrained_model)
        self._processor = AutoProcessor.from_pretrained(pretrained_model)

        self._model.eval()

        super().__init__(name, batch_size, device)

    def get_image_features(
        self,
        images: list[Path | str] | np.ndarray | torch.Tensor | list[Image.Image],
        callback: Optional[Callable] = None,
    ) -> np.ndarray:
        dataset = ImageDataset(images, self._processor)

        dataloader = DataLoader(
            dataset=dataset,
            batch_size=self._batch_size,
            shuffle=False,
            drop_last=False,
            num_workers=GlobalConfig.get("analyse", "num_workers") or 0,
            pin_memory=(True if GlobalConfig.get("analyse", "pin_memory") else False),
        )

        image_features = torch.Tensor(0)
        num_batches = len(dataloader)

        with torch.no_grad():
            if callback:
                callback(self, 0, num_batches, image_features)

            for i, data in enumerate(dataloader):
                data.to(self._device)
                batch_features = self._model.get_image_features(**data)
                image_features = torch.cat([image_features, batch_features])

                if callback:
                    callback(self, i + 1, num_batches, image_features)

        return image_features.cpu().numpy()

    def get_text_features(self, texts: list[str] | str | np.ndarray, callback: Optional[Callable] = None) -> Any:
        tokenized_input = self._processor(text=texts, return_tensors="pt", padding=True).to(self._device)
        text_features = self._model.get_text_features(**tokenized_input)
        return text_features

    def to(self, device: str | torch.device):
        self._device = torch.device(device)
        self._model.to(self._device)
