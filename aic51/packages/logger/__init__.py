import logging

from rich.logging import RichHandler
from rich.traceback import install

FORMAT = "%(message)s"
DATE_FORMAT = "[%X]"
logging.basicConfig(
    level=logging.INFO,
    format=FORMAT,
    datefmt=DATE_FORMAT,
    handlers=[RichHandler(rich_tracebacks=True)],
)
logger = logging.getLogger("AIC51")

install()

