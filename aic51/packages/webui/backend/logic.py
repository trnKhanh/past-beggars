import os
from pathlib import Path

from .backend import *

work_dir = os.environ.get("work_dir") or "."
work_dir = Path(work_dir)

app = init_app()

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
