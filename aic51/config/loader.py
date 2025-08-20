import logging
import sys
from pathlib import Path

from yaml import safe_load


class GlobalConfig:
    CONFIG_FILE = "config.yaml"

    @classmethod
    def __load_config(cls):
        if hasattr(cls, "__config"):
            return
        setattr(cls, "__config", None)

        logger = logging.getLogger(
            f'{".".join(__name__.split(".")[:-1])}.{cls.__name__}'
        )

        work_dir = Path.cwd()
        config_path = work_dir / cls.CONFIG_FILE

        if not config_path.exists():
            logger.warning(
                f'"{cls.CONFIG_FILE}" not found. Are you in AIC51 directory?'
            )
            cls.__config = None

            return

        with open(work_dir / cls.CONFIG_FILE, "r") as f:
            cls.__config = safe_load(f)

    @classmethod
    def get(cls, *args):
        cls.__load_config()
        if cls.__config is None:
            return None

        try:
            res = cls.__config
            for arg in args:
                res = res[arg]
            return res
        except KeyError:
            return None
