import json
import os
from math import ceil
from pathlib import Path

from ultralytics import YOLO

from .object_detector import ObjectDetector


class Yolo(ObjectDetector):
    CLASSES_LIST = None

    def __init__(self, pretrained_model):
        self._model = YOLO(pretrained_model, verbose=False)
        self._device = "cpu"
        self._visual_path = (
            Path.cwd() / "visualize" / Path(pretrained_model).stem
        )
        self._visual_path.mkdir(exist_ok=True, parents=True)

    def get_image_features(self, image_paths, batch_size, callback):
        image_features = []
        image_paths = [str(x) for x in image_paths]
        num_batches = ceil(len(image_paths) / batch_size)
        callback(0, num_batches, None)
        for b in range(num_batches):
            results = self._model(
                image_paths[b * batch_size : (b + 1) * batch_size],
                imgsz=(360, 640),
                device=self._device,
                augment=True,
            )
            for i, result in enumerate(results):
                result.plot(
                    save=True,
                    filename=self._visual_path
                    / Path(image_paths[i + b * batch_size]).name,
                )
                bboxes = []
                boxes_xyxy = result.boxes.xyxyn.tolist()
                cls = result.boxes.cls.tolist()
                conf = result.boxes.conf.tolist()
                for i in range(len(cls)):
                    xyxy = boxes_xyxy[i]
                    x = xyxy[::2]
                    y = xyxy[1::2]
                    coord = [
                        [x[0], y[0]],
                        [x[1], y[0]],
                        [x[1], y[1]],
                        [x[0], y[1]],
                    ]
                    bboxes.append([coord, int(cls[i]), conf[i]])

                image_features.append(bboxes)
            callback(b + 1, num_batches, image_features)

        return image_features

    @classmethod
    def classes_list(cls):
        if cls.CLASSES_LIST is None:
            try:
                with open(
                    Path(__file__).parent / "resources/classes.json", "r"
                ) as f:
                    cls.CLASSES_LIST = json.load(f)
            except:
                cls.CLASSES_LIST = {}
        return cls.CLASSES_LIST

    def to(self, device):
        self._device = device
