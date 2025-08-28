from pathlib import Path
from typing import Any, Callable, Literal, Optional

import numpy as np
import open_clip
import torch
from PIL import Image
from torch.utils.data import DataLoader
from transformers import AutoModel, AutoProcessor

import aic51.packages.constant as constant
from aic51.packages.analyse.datasets import ImageDataset
from aic51.packages.config import GlobalConfig

from .feature_extractor import FeatureExtractor, FeatureExtractorFactory


@FeatureExtractorFactory.register("image_clip")
class ImageCLIP(FeatureExtractor):
    @staticmethod
    def from_pretrained(
        pretrained_model: str, source: Literal["hf", "open_clip", "pe"] = "hf", *args, **kwargs
    ) -> "ImageCLIP":
        if source == "hf":
            return ImageHFCLIP.from_pretrained(pretrained_model=pretrained_model, *args, **kwargs)
        elif source == "open_clip":
            return ImageOpenCLIP.from_pretrained(pretrained_model=pretrained_model, *args, **kwargs)
        else:
            raise RuntimeError(f"CLIP: source={source} is invalid")


class HFProcessorWrapper:
    def __init__(self, processor):
        self._processor = processor

    def __call__(self, image):
        processed_data = self._processor(images=[image], return_tensors="pt")
        processed_data["pixel_values"] = processed_data["pixel_values"].squeeze(0)
        return processed_data


class ImageHFCLIP(ImageCLIP):
    @staticmethod
    def require_input() -> Any:
        return constant.KEYFRAME_DIR

    @staticmethod
    def from_pretrained(pretrained_model: str, *args, **kwargs):
        return ImageHFCLIP(pretrained_model=pretrained_model, *args, **kwargs)

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

    def get_features(
        self,
        images: list[Path | str] | np.ndarray | torch.Tensor | list[Image.Image],
        callback: Optional[Callable] = None,
    ) -> np.ndarray:

        dataset = ImageDataset(images, HFProcessorWrapper(self._processor))

        dataloader = DataLoader(
            dataset=dataset,
            batch_size=self._batch_size,
            shuffle=False,
            drop_last=False,
            num_workers=GlobalConfig.get("analyse", "num_workers") or 0,
            pin_memory=(True if GlobalConfig.get("analyse", "pin_memory") else False),
        )

        image_features = torch.Tensor(0).to(self._device)
        num_batches = len(dataloader)

        with torch.no_grad():
            if callback:
                callback(self, 0, num_batches, image_features)

            for i, data in enumerate(dataloader):
                data = data.to(self._device)
                batch_features = self._model.get_image_features(**data)
                image_features = torch.cat([image_features, batch_features])

                if callback:
                    callback(self, i + 1, num_batches, image_features)
            image_features /= image_features.norm(dim=-1, keepdim=True)

        return image_features.cpu().numpy()

    def get_text_features(self, texts: list[str] | str | np.ndarray, callback: Optional[Callable] = None) -> Any:
        if isinstance(texts, np.ndarray):
            texts = list(texts.tolist())
        if isinstance(texts, str):
            texts = [texts]

        tokenized_input = self._processor(text=texts, return_tensors="pt", padding=True).to(self._device)
        with torch.no_grad():
            text_features = self._model.get_text_features(**tokenized_input)
            text_features /= text_features.norm(dim=-1, keepdim=True)
        return text_features.cpu().numpy()

    def to(self, device: str | torch.device):
        self._device = torch.device(device)
        self._model.to(self._device)


class OpenCLIPPreprocessWrapper:
    def __init__(self, preprocess):
        self._preprocess = preprocess

    def __call__(self, image):
        return self._preprocess(image)


class ImageOpenCLIP(ImageCLIP):
    @staticmethod
    def require_input() -> Any:
        return constant.KEYFRAME_DIR

    @staticmethod
    def from_pretrained(pretrained_model: str, *args, **kwargs):
        return ImageOpenCLIP(pretrained_model=pretrained_model, *args, **kwargs)

    def __init__(
        self,
        arch_name: str,
        pretrained_model: str,
        name: str = "clip",
        batch_size: int = 1,
        device: torch.device = torch.device("cpu"),
        *args,
        **kwargs,
    ):
        model, _, preprocess = open_clip.create_model_and_transforms(arch_name, pretrained_model)
        tokenizer = open_clip.get_tokenizer(arch_name)

        self._model = model
        self._preprocess = preprocess
        self._tokenizer = tokenizer

        self._model.eval()

        super().__init__(name, batch_size, device)

    def get_features(
        self,
        images: list[Path | str] | np.ndarray | torch.Tensor | list[Image.Image],
        callback: Optional[Callable] = None,
    ) -> np.ndarray:

        dataset = ImageDataset(images, OpenCLIPPreprocessWrapper(self._preprocess))

        dataloader = DataLoader(
            dataset=dataset,
            batch_size=self._batch_size,
            shuffle=False,
            drop_last=False,
            num_workers=GlobalConfig.get("analyse", "num_workers") or 0,
            pin_memory=(True if GlobalConfig.get("analyse", "pin_memory") else False),
        )

        image_features = torch.Tensor(0).to(self._device)
        num_batches = len(dataloader)

        with torch.no_grad():
            if callback:
                callback(self, 0, num_batches, image_features)

            for i, data in enumerate(dataloader):
                data = data.to(self._device)
                batch_features = self._model.encode_image(data)
                image_features = torch.cat([image_features, batch_features])

                if callback:
                    callback(self, i + 1, num_batches, image_features)

            image_features /= image_features.norm(dim=-1, keepdim=True)

        return image_features.cpu().numpy()

    def get_text_features(self, texts: list[str] | str | np.ndarray, callback: Optional[Callable] = None) -> Any:
        if isinstance(texts, np.ndarray):
            texts = list(texts.tolist())
        if isinstance(texts, str):
            texts = [texts]

        tokenized_input = self._tokenizer(texts).to(self._device)
        with torch.no_grad():
            text_features = self._model.encode_text(tokenized_input)
            text_features /= text_features.norm(dim=-1, keepdim=True)

        return text_features.cpu().numpy()

    def to(self, device: str | torch.device):
        self._device = torch.device(device)
        self._model.to(self._device)
