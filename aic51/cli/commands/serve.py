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

from aic51.packages.config import GlobalConfig
from aic51.packages.index import MilvusDatabase
from aic51.packages.search import Searcher

from .command import BaseCommand


class ServeCommand(BaseCommand):
    TMP = 10

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
            "-sp",
            "--search-port",
            dest="search_port",
            default=5010,
            type=int,
        )
        parser.add_argument(
            "-vp",
            "--video-port",
            dest="video_port",
            default=5011,
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
            "--main",
            dest="do_main",
            action="store_true",
            help="Run the main server. Provide the webui and proxy to other backends (specified in config.yaml)",
        )
        parser.add_argument(
            "--search",
            dest="do_search",
            action="store_true",
            help="Run server as a search backend",
        )
        parser.add_argument(
            "--video",
            dest="do_video",
            action="store_true",
            help="Run server as a video backend",
        )

        parser.set_defaults(func=self)

    def __call__(
        self,
        port,
        search_port,
        video_port,
        dev_mode,
        do_main,
        do_search,
        do_video,
        verbose,
        *args,
        **kwargs,
    ):
        MilvusDatabase.start_server()
        self._searcher = Searcher(GlobalConfig.get("webui", "database") or "milvus")
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

            frontend_process = subprocess.Popen(
                dev_cmd,
                env=dev_env,
                cwd=str(Path(__file__).parent / "../../packages/webui/frontend"),
            )
        else:
            self._build_frontend()
            frontend_process = None
        os.environ["work_dir"] = str(self._work_dir)

        def run_logic_backend():
            workers = GlobalConfig.get("webui", "workers") or 1
            uvicorn.run(
                f"aic51.packages.webui.backend.logic:app",
                host="0.0.0.0",
                port=port,
                log_level="info",
                workers=workers,
                **params,
            )

        def get_search_backend():
            workers = GlobalConfig.get("webui", "search", "workers") or 1
            return Process(
                target=uvicorn.run,
                name="AIC51 search service",
                args=(f"aic51.packages.webui.backend.search:app",),
                kwargs={
                    "host": "0.0.0.0",
                    "port": search_port,
                    "log_level": "info",
                    "workers": workers,
                    **params,
                },
            )

        def get_video_backend():
            workers = GlobalConfig.get("webui", "video", "workers") or 1
            return Process(
                target=uvicorn.run,
                name="AIC51 video service",
                args=(f"aic51.packages.webui.backend.video:app",),
                kwargs={
                    "host": "0.0.0.0",
                    "port": video_port,
                    "log_level": "info",
                    "workers": workers,
                    **params,
                },
            )

        processes = []
        if do_search:
            processes.append(get_search_backend())
        if do_video:
            max_workers_ratio = GlobalConfig.get("max_workers_ratio") or 0
            video_ids = self._get_video_ids()
            with (
                Progress(
                    TextColumn("{task.fields[name]}"),
                    TextColumn(":"),
                    *Progress.get_default_columns(),
                    TimeElapsedColumn(),
                    disable=not verbose,
                ) as progress,
                ThreadPoolExecutor(round((os.cpu_count() or 0) * max_workers_ratio) or 1) as executor,
            ):

                def update_progress(task_id):
                    return lambda *args, **kwargs: progress.update(task_id, *args, **kwargs)

                def index_one_video(video_id):
                    task_id = progress.add_task(description="Processing...", name=video_id)
                    try:
                        self._extract_video_info(
                            video_id,
                            update_progress(task_id),
                        )
                        progress.update(
                            task_id,
                            completed=1,
                            total=1,
                            description="Finished",
                        )
                        progress.remove_task(task_id)
                    except Exception as e:
                        progress.update(task_id, description=f"Error: {str(e)}")

                futures = []
                for video_id in video_ids:
                    futures.append(executor.submit(index_one_video, video_id))
                for future in futures:
                    future.result()

            processes.append(get_video_backend())
        for p in processes:
            p.start()
        if do_main:
            run_logic_backend()
        else:
            try:
                while True:
                    pass
            except KeyboardInterrupt:
                pass

        for p in processes:
            p.terminate()

        if dev_mode and frontend_process is not None:
            frontend_process.terminate()
            frontend_process.wait()

    def _install_frontend(self):
        install_cmd = ["npm", "install"]
        subprocess.run(
            install_cmd,
            cwd=str(Path(__file__).parent / "../../packages/webui/frontend"),
        )

    def _build_frontend(self):
        build_cmd = ["npm", "run", "build"]

        subprocess.run(
            build_cmd,
            cwd=str(Path(__file__).parent / "../../packages/webui/frontend"),
        )
        built_dir = Path(__file__).parent / "../../packages/webui/frontend/dist"
        public_dir = Path(__file__).parent / "../../packages/webui/frontend/public"

        web_dir = self._work_dir / ".web"

        if web_dir.exists():
            shutil.rmtree(web_dir)
        web_dir.mkdir(parents=True, exist_ok=True)

        built_dir.rename(web_dir / "dist")

    def _get_video_ids(self):
        videos_dir = self._work_dir / "videos"
        video_ids = []
        for video in videos_dir.glob("*.mp4"):
            video_id = video.stem
            video_info_path = self._work_dir / "videos_info" / f"{video_id}.json"
            if not video_info_path.exists():
                video_ids.append(video_id)
        return video_ids

    def _extract_video_info(self, video_id, update_progress):
        update_progress(description="Extracting info...")
        video_path = self._work_dir / "videos" / f"{video_id}.mp4"
        video_info_path = self._work_dir / "videos_info" / f"{video_id}.json"
        video_info_path.parent.mkdir(exist_ok=True, parents=True)
        ffprobe_cmd = ["ffprobe", "-v", "quiet", "-of", "compact=p=0"] + [
            "-select_streams",
            "0",
            "-show_entries",
            "stream=r_frame_rate",
            str(video_path),
        ]
        res = subprocess.run(ffprobe_cmd, capture_output=True, text=True)

        fraction = str(res.stdout).split("=")[1].split("/")
        frame_rate = round(int(fraction[0]) / int(fraction[1]))

        with open(video_info_path, "w") as f:
            json.dump(dict(frame_rate=frame_rate), f)
