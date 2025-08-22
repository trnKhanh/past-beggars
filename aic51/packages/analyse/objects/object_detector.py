from abc import ABC, abstractmethod
from typing import Any


class ObjectDetector(ABC):
    @abstractmethod
    def get_image_features(self, image_paths, batch_size, callback) -> Any:
        pass
