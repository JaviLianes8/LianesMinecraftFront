"""Use case for retrieving configured files intended for downloads."""
from __future__ import annotations

from pathlib import Path

from ...domain.exceptions import ResourceNotFoundError


class RetrieveDownloadFileUseCase:
    """Validate and expose the configured download file path."""

    def __init__(self, file_path: Path) -> None:
        self._file_path = file_path

    def execute(self) -> Path:
        """Return the configured file path ensuring it exists and is a file."""
        if not self._file_path.exists():
            raise ResourceNotFoundError(f"File not found: {self._file_path}")
        if not self._file_path.is_file():
            raise ResourceNotFoundError(
                f"Configured path is not a file: {self._file_path}"
            )
        return self._file_path


__all__ = ["RetrieveDownloadFileUseCase"]
