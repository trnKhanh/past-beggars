from pathlib import Path
from typing import Callable, Optional

import numpy as np
import torch
import torchvision.transforms.functional as F
from PIL import Image
from torch.utils.data import Dataset

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

        if isinstance(sample, Path):
            sample = Image.open(self.samples[index])

        if not isinstance(sample, torch.Tensor):
            sample = F.to_tensor(sample)

        if self.transform:
            sample = self.transform(sample)

        return sample
