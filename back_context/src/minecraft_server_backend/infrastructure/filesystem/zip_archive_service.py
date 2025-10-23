"""ZIP-based implementation of :class:`ArchiveService`."""
from __future__ import annotations

import os
import tempfile
import zipfile
from pathlib import Path
from typing import Mapping

from ...domain.exceptions import ArchiveCreationError, ResourceNotFoundError
from ...domain.services.archive_service import ArchiveService


class ZipArchiveService(ArchiveService):
    """Create ZIP archives stored temporarily on disk."""

    def create_zip(self, source: Path, extra_files: Mapping[Path, bytes] | None = None) -> Path:
        """Compress ``source`` into a temporary ZIP file."""
        if not source.exists():
            raise ResourceNotFoundError(f"Source path does not exist: {source}")

        if not source.is_dir():
            raise ArchiveCreationError(f"Source path must be a directory: {source}")

        fd, tmp_path = tempfile.mkstemp(prefix="minecraft-backend-", suffix=".zip")
        os.close(fd)
        archive_path = Path(tmp_path)

        try:
            with zipfile.ZipFile(archive_path, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
                for file_path in source.rglob("*"):
                    if file_path.is_file():
                        archive.write(file_path, arcname=file_path.relative_to(source))
                if extra_files:
                    for relative_path, content in extra_files.items():
                        archive.writestr(str(relative_path), content)
        except OSError as exc:  # pragma: no cover - hardware errors not easily reproducible
            archive_path.unlink(missing_ok=True)
            raise ArchiveCreationError("Failed to create archive") from exc

        return archive_path


__all__ = ["ZipArchiveService"]
