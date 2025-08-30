import shutil
from pathlib import Path

import aic51.resources as resources

import aic51.resources as resources

from .command import BaseCommand


class InitCommand(BaseCommand):
    def __init__(self, *args, **kwargs):
        super(InitCommand, self).__init__(*args, **kwargs)

    def add_args(self, subparser):
        parser = subparser.add_parser("init", help="Initialize AIC51 working directory")

        parser.set_defaults(func=self)

    def __call__(self, *args, **kwargs):
        layout_dir = resources.LAYOUT_FILE_PATH
        shutil.copytree(layout_dir, self._work_dir, dirs_exist_ok=True)
