import os
import sys
import shutil
import subprocess
from pathlib import Path

import uvicorn

from .command import BaseCommand
from ...config import GlobalConfig
from ...packages.index import MilvusDatabase


class ServeCommand(BaseCommand):
    def __init__(self, *args, **kwargs):
        super(ServeCommand, self).__init__(*args, **kwargs)

    def add_args(self, subparser):
        parser = subparser.add_parser("serve", help="Start RestAPI and WebUI")
        parser.add_argument(
            "-p",
            "--port",
            dest="port",
            default=5100,
            type=int,
        )

        parser.add_argument(
            "-d",
            "--dev",
            dest="dev_mode",
            action="store_true",
            help="Use dev mode",
        )
        parser.add_argument(
            "-w",
            "--workers",
            dest="workers",
            type=int,
            default=1,
            help="Number of workers to serve in uvicorn",
        )

        parser.set_defaults(func=self)

    def __call__(self, port, dev_mode, workers, *args, **kwargs):
        MilvusDatabase.start_server()
        self._install_frontend()
        if len(GlobalConfig.get("webui", "features") or []) == 0:
            self._logger.error(
                f'No models found in "{GlobalConfig.CONFIG_FILE}". Check your "{GlobalConfig.CONFIG_FILE}"'
            )
            sys.exit(1)

        os.environ["AIC51_WORK_DIR"] = str(self._work_dir)
        dev_params = dict(
            reload=True,
            reload_dirs=[str(Path(__file__).parent / "../../packages")],
        )
        params = {}
        if dev_mode:
            params = {**params, **dev_params}
            dev_cmd = ["npm", "run", "dev"]
            dev_env = os.environ.copy()
            dev_env["VITE_PORT"] = str(port)

            p = subprocess.Popen(
                dev_cmd,
                env=dev_env,
                cwd=str(
                    Path(__file__).parent / "../../packages/webui/frontend"
                ),
            )
        else:
            self._build_frontend(port)
            p = None

        uvicorn.run(
            f"aic51.packages.webui.backend.app:app",
            host="0.0.0.0",
            port=port,
            log_level="info",
            workers=workers,
            **params,
        )
        if dev_mode and p is not None:
            p.terminate()
            p.wait()

    def _install_frontend(self):
        install_cmd = ["npm", "install"]
        subprocess.run(
            install_cmd,
            cwd=str(Path(__file__).parent / "../../packages/webui/frontend"),
        )

    def _build_frontend(self, port):
        build_cmd = ["npm", "run", "build"]
        build_env = os.environ.copy()
        build_env["VITE_PORT"] = str(port)

        subprocess.run(
            build_cmd,
            env=build_env,
            cwd=str(Path(__file__).parent / "../../packages/webui/frontend"),
        )
        built_dir = Path(__file__).parent / "../../packages/webui/frontend/dist"
        public_dir = (
            Path(__file__).parent / "../../packages/webui/frontend/public"
        )

        web_dir = self._work_dir / ".web"

        if web_dir.exists():
            shutil.rmtree(web_dir)
        web_dir.mkdir(parents=True, exist_ok=True)

        built_dir.rename(web_dir / "dist")
