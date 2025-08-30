import inspect
import json
import os
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from multiprocessing import Process
from pathlib import Path

import uvicorn
from dotenv import set_key
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn

import aic51.packages
import aic51.packages.constant as constant
import aic51.packages.webui
from aic51.packages.config import GlobalConfig
from aic51.packages.index import MilvusDatabase
from aic51.packages.logger import logger
from aic51.packages.search import Searcher
from aic51.packages.webui.backend import CORE_APP, FILE_APP, SEARCH_APP

from .command import BaseCommand


class ServeCommand(BaseCommand):
    TMP = 10

    def __init__(self, *args, **kwargs):
        super(ServeCommand, self).__init__(*args, **kwargs)

    def add_args(self, subparser):
        parser = subparser.add_parser("serve", help="Start RestAPI and WebUI")

        parser.add_argument(
            "--no-frontend",
            dest="do_frontend",
            action="store_false",
            help="Do not run frontend",
        )

        parser.add_argument(
            "--no-backend",
            dest="do_backend",
            action="store_false",
            help="Do not run backend",
        )

        parser.set_defaults(func=self)

    def __call__(
        self,
        do_frontend: bool,
        do_backend: bool,
        dev_mode: bool,
        verbose: bool,
        *args,
        **kwargs,
    ):
        MilvusDatabase.start_server()

        if do_frontend:
            self._frontend_dir = Path(inspect.getfile(aic51.packages.webui)).parent / "frontend"
            self._frontend_process = self._start_frontend(dev_mode)

        if do_backend:
            self._backend_processes = self._start_backend(dev_mode)

        try:
            while True:
                pass
        except KeyboardInterrupt:
            pass

        if do_frontend:
            self._stop_frontend()

        if do_backend:
            self._stop_backend()

    def _start_frontend(self, dev_mode: bool):
        self._install_frontend()
        core_port = GlobalConfig.get("backends", "core", "port") or constant.DEFAULT_CORE_PORT
        os.environ["VITE_PORT"] = str(core_port)
        if dev_mode:
            dev_cmd = ["npm", "run", "dev"]

            dev_env = os.environ.copy()

            frontend_process = subprocess.Popen(dev_cmd, env=dev_env, cwd=str(self._frontend_dir))
        else:
            self._build_frontend()
            frontend_process = None

        return frontend_process

    def _stop_frontend(self):
        if self._frontend_process is not None:
            self._frontend_process.terminate()
            self._frontend_process.wait()

            self._frontend_process = None

    def _start_backend(self, dev_mode: bool):
        logger.info("Starting backend servers")
        params = {}

        # uvicorn reload is not working because it spawns a new process to monitor and cause a mess with multiprocessing
        # if dev_mode:
        #     params = {**params, "reload": True, "reload_dirs": [Path(inspect.getfile(aic51.packages)).parent]}

        backend_processes = []

        if GlobalConfig.get("backends", "search"):
            workers = GlobalConfig.get("backends", "search", "workers") or 1
            port = GlobalConfig.get("backends", "search", "port") or constant.DEFAULT_SEARCH_PORT
            backend_processes.append(
                Process(
                    target=uvicorn.run,
                    name="aic51_search",
                    args=[SEARCH_APP],
                    kwargs={
                        "host": "0.0.0.0",
                        "port": port,
                        "log_level": "info",
                        "workers": workers,
                        **params,
                    },
                )
            )
            logger.info(f"Starting search backend at port {port}")

        if GlobalConfig.get("backends", "file"):
            workers = GlobalConfig.get("backends", "file", "workers") or 1
            port = GlobalConfig.get("backends", "file", "port") or constant.DEFAULT_FILE_PORT
            backend_processes.append(
                Process(
                    target=uvicorn.run,
                    name="aic51_file",
                    args=[FILE_APP],
                    kwargs={
                        "host": "0.0.0.0",
                        "port": port,
                        "log_level": "info",
                        "workers": workers,
                        **params,
                    },
                )
            )
            logger.info(f"Starting video backend at port {port}")

        if GlobalConfig.get("backends", "core"):
            workers = GlobalConfig.get("backends", "core", "workers") or 1
            port = GlobalConfig.get("backends", "core", "port") or constant.DEFAULT_CORE_PORT
            backend_processes.append(
                Process(
                    target=uvicorn.run,
                    name="aic51_core",
                    args=[CORE_APP],
                    kwargs={
                        "host": "0.0.0.0",
                        "port": port,
                        "log_level": "info",
                        "workers": workers,
                        **params,
                    },
                )
            )
            logger.info(f"Starting core backend at port {port}")

        for p in backend_processes:
            p.start()

        return backend_processes

    def _stop_backend(self):
        for p in self._backend_processes:
            p.terminate()

    def _install_frontend(self):
        logger.info("Installing frontend dependencies")
        install_cmd = ["npm", "install"]
        subprocess.run(
            install_cmd,
            cwd=str(self._frontend_dir),
        )

    def _build_frontend(self):
        logger.info("Building frontend dist")
        build_cmd = ["npm", "run", "build"]

        subprocess.run(
            build_cmd,
            cwd=str(self._frontend_dir),
        )
        built_dir = self._frontend_dir / "dist"

        web_dir = self._work_dir / constant.FRONTEND_DIST_DIR

        if web_dir.exists():
            shutil.rmtree(web_dir)

        web_dir.mkdir(parents=True, exist_ok=True)

        built_dir.rename(web_dir / "dist")
