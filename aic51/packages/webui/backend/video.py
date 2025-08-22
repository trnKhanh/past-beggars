import os
from pathlib import Path

from .backend import *

work_dir = os.environ.get("work_dir") or "."
work_dir = Path(work_dir)

app = init_app()

setup_video(app, work_dir)
