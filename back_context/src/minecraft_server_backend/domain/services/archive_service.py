"""Contracts for archive management operations."""
from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Mapping


class ArchiveService(ABC):
    """Defines how archives are generated for downloads."""

    @abstractmethod
    def create_zip(self, source: Path, extra_files: Mapping[Path, bytes] | None = None) -> Path:
        """Create a ZIP archive for the given source path.

        Args:
            source: Directory path whose contents will be compressed.
            extra_files: Optional mapping of relative paths to in-memory file contents that
                should be added to the archive.

        Returns:
            Path pointing to the generated archive on disk. Callers are responsible for
            removing the file once it has been streamed to the client.
        """


__all__ = ["ArchiveService"]
