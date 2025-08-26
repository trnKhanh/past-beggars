from pathlib import Path
from typing import Callable, Optional

import cv2
import numpy as np
import torch
import torchvision.transforms.functional as F
from PIL import Image
from torch.utils.data import Dataset

from aic51.packages.logger import logger
from aic51.packages.utils.files import get_path


class ImageDataset(Dataset):
    def __init__(
        self, images: list[Path | str] | torch.Tensor | np.ndarray | list[Image.Image], transform: Optional[Callable]
    ) -> None:
        self.samples = []
        for image in images:
            if isinstance(image, (Path, str)):
                image = get_path(image)

            self.samples.append(image)

        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, index):
        sample = self.samples[index]

        if isinstance(sample, (Path, str)):
            sample = Image.open(self.samples[index])

        if self.transform:
            sample = self.transform(sample)

        return sample


class VideoDataset(Dataset):
    def __init__(
        self, videos: list[Path | str] | torch.Tensor | np.ndarray | list[Image.Image], transform: Optional[Callable]
    ) -> None:
        self.samples = []
        for video in videos:
            if isinstance(video, (Path, str)):
                video = get_path(video)

            self.samples.append(video)

        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, index):
        sample = self.samples[index]

        if isinstance(sample, (Path, str)):
            sample = self.__read_video(get_path(sample))

        if self.transform:
            sample = self.transform(sample)

        return sample

    def __read_video(self, video_path: Path):
        frames = []
        cap = cv2.VideoCapture(str(video_path))
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frames.append(Image.fromarray(frame))
        cap.release()

        return frames
