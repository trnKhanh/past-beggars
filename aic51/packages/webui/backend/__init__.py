from .core import app as core_app
from .file import app as file_app
from .search import app as search_app

CORE_APP = f"{__name__}.core:app"
FILE_APP = f"{__name__}.file:app"
SEARCH_APP = f"{__name__}.search:app"
