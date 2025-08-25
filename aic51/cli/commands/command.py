import logging
from abc import ABC, abstractmethod
from pathlib import Path

from aic51.packages.utils.files import get_path


class BaseCommand(ABC):
    def __init__(self, work_dir: Path | str, *args, **kwargs):
        self._work_dir = get_path(work_dir)
        self._logger = logging.getLogger(f'{".".join(__name__.split(".")[:-1])}.{self.__class__.__name__}')

    @abstractmethod
    def add_args(self, subparser):
        pass

    @abstractmethod
    def __call__(self):
        pass
