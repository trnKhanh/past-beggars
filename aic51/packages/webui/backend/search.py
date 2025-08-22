import os
from pathlib import Path

from .backend import *
from ...search import Searcher

work_dir = os.environ.get("work_dir") or "."
work_dir = Path(work_dir)

app = init_app()
searcher = Searcher(GlobalConfig.get("webui", "database") or "milvus", True)

setup_search(app, work_dir, searcher)
