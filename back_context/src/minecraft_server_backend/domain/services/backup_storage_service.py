"""Contracts for persisting and rotating server backups."""
from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date
from pathlib import Path
from typing import Sequence


class BackupStorageService(ABC):
    """Manage daily backup directories and stored archive files."""

    @abstractmethod
    def prepare_daily_directory(self, backup_date: date) -> Path | None:
        """Ensure the storage directory for ``backup_date`` exists.

        Returns the directory path when a new folder has been created.
        When the directory already exists the method returns ``None`` so
        callers can skip generating a duplicate backup.
        """

    @abstractmethod
    def store_archive(self, archive_path: Path, destination_dir: Path, filename: str) -> Path:
        """Move ``archive_path`` into ``destination_dir`` using ``filename``.

        The method must guarantee that the archive is safely stored in the
        destination directory and return the final file path.
        """

    @abstractmethod
    def prune_older_than(self, retention_days: int, *, reference_date: date | None = None) -> Sequence[Path]:
        """Delete backup directories older than the retention window.

        Args:
            retention_days: Number of days that should remain on disk including
                the most recent backup. Values lower than one should be treated
                as keeping only the current day.
            reference_date: Optional anchor date used for calculating the
                retention window. Defaults to ``date.today()`` when omitted.

        Returns:
            A sequence containing the paths of the directories removed from the
            storage backend.
        """


__all__ = ["BackupStorageService"]
