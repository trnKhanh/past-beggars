import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from .backend import *
from ...search import Searcher

do_search = os.environ.get("do_search")
do_video = os.environ.get("do_video")
do_main = os.environ.get("do_main")
work_dir = os.environ.get("work_dir") or "."
work_dir = Path(work_dir)

do_main = (
    True if do_main is not None and do_main.lower() in ["true", "1"] else False
)

do_search = (
    True
    if do_search is not None and do_search.lower() in ["true", "1"]
    else False
)
do_video = (
    True
    if do_video is not None and do_video.lower() in ["true", "1"]
    else False
)

app = init_app()
searcher = Searcher(GlobalConfig.get("webui", "database") or "milvus")

if do_search:
    setup_search(app, work_dir, searcher)

if do_video:
    setup_video(app, work_dir, searcher)

if do_main:
    search_proxy_timeout = GlobalConfig.get("webui", "search", "timeout")
    search_proxy_gsize = (
        GlobalConfig.get("webui", "search", "request_size") or 1
    )
    setup_search_proxy(
        app,
        search_proxy_timeout,
        search_proxy_gsize,
    )

    video_proxy_timeout = GlobalConfig.get("webui", "video", "timeout")
    video_proxy_gsize = GlobalConfig.get("webui", "video", "request_size") or 1
    setup_video_proxy(
        app,
        video_proxy_timeout,
        video_proxy_gsize,
    )

    setup_frontend(app, work_dir)
