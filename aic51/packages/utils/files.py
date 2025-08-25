from typing import Any
from pathlib import Path


def get_path(file_path: str | Path) -> Path:
    if isinstance(file_path, str):
        file_path = Path(file_path)

    return file_path


def get_paths(file_paths: list[str | Path] | str | Path) -> list[Path]:
    if not isinstance(file_paths, list):
        file_paths = [file_paths]

    return [get_path(fp) for fp in file_paths]
