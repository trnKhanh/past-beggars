from pathlib import Path

from yaml import safe_load

from aic51.packages.logger import logger


class GlobalConfig:
    CONFIG_FILE = "config.yaml"
    __config = None

    @staticmethod
    def __load_config():
        if GlobalConfig.__config:
            return GlobalConfig.__config

        work_dir = Path.cwd()
        config_path = work_dir / GlobalConfig.CONFIG_FILE

        if not config_path.exists():
            logger.warning(f'"{GlobalConfig.CONFIG_FILE}" not found. Workspace need to be initialized first.')
            return {}

        with open(work_dir / GlobalConfig.CONFIG_FILE, "r") as f:
            GlobalConfig.__config = safe_load(f)

        return GlobalConfig.__config

    @staticmethod
    def get(*args):
        try:
            res = GlobalConfig.__load_config()
            for arg in args:
                res = res[arg]
            return res

        except KeyError:
            return None
