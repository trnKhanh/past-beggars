import logging
import os
from argparse import ArgumentParser
from pathlib import Path

from dotenv import load_dotenv

from aic51.packages.logger import logger

os.environ["YOLO_VERBOSE"] = "False"
load_dotenv()

from . import commands


def main():

    work_dir = Path.cwd()

    parser = ArgumentParser(description="Command Line Interface of AIC51.")
    parser.add_argument(
        "-q",
        "--quiet",
        dest="verbose",
        action="store_false",
    )
    parser.add_argument(
        "--dev",
        dest="dev_mode",
        action="store_true",
    )
    subparser = parser.add_subparsers(help="command", dest="command")

    for command_cls in commands.available_commands:
        command = command_cls(work_dir)

        command.add_args(subparser)

    args = parser.parse_args()

    args = vars(args)
    command = args.pop("command")
    dev_mode = args.get("dev_mode")
    if dev_mode:
        logger.setLevel(logging.DEBUG)
    else:
        logger.setLevel(logging.INFO)

    func = args.pop("func")
    if not args.get("verbose"):
        logging.disable(logging.CRITICAL)

    func(**args)


if __name__ == "__main__":
    main()
