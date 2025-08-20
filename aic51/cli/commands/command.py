from abc import ABC, abstractmethod
import logging


class BaseCommand(ABC):
    def __init__(self, work_dir, *args, **kwargs):
        self._work_dir = work_dir
        self._logger = logging.getLogger(
            f'{".".join(__name__.split(".")[:-1])}.{self.__class__.__name__}'
        )

    @abstractmethod
    def add_args(self, subparser):
        pass

    @abstractmethod
    def __call__(self):
        pass
