"""Filesystem-backed implementation of :class:`BackupStorageService`."""
from __future__ import annotations

import shutil
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Sequence

from ...domain.exceptions import BackupStorageError
from ...domain.services.backup_storage_service import BackupStorageService


class DailyBackupStorageService(BackupStorageService):
    """Persist server backups in dated directories on the local filesystem."""

    def __init__(self, base_directory: Path) -> None:
        self._base_directory = base_directory

    def prepare_daily_directory(self, backup_date: date) -> Path | None:
        """Create the directory for the provided ``backup_date`` when missing."""
        try:
            self._base_directory.mkdir(parents=True, exist_ok=True)
        except OSError as exc:  # pragma: no cover - depends on filesystem state
            raise BackupStorageError(
                f"Unable to create backup root directory: {self._base_directory}"
            ) from exc

        target_dir = self._base_directory / backup_date.strftime("%Y-%m-%d")

        if target_dir.exists():
            if not target_dir.is_dir():
                raise BackupStorageError(
                    f"Backup path exists but is not a directory: {target_dir}"
                )
            return None

        try:
            target_dir.mkdir()
        except OSError as exc:  # pragma: no cover - depends on filesystem state
            raise BackupStorageError(f"Unable to create backup directory: {target_dir}") from exc

        return target_dir

    def store_archive(self, archive_path: Path, destination_dir: Path, filename: str) -> Path:
        """Move ``archive_path`` into ``destination_dir`` while preserving atomicity."""
        if not archive_path.exists():
            raise BackupStorageError(f"Archive does not exist: {archive_path}")

        if not destination_dir.exists() or not destination_dir.is_dir():
            raise BackupStorageError(f"Destination directory is invalid: {destination_dir}")

        destination = destination_dir / filename

        if destination.exists():
            raise BackupStorageError(f"A backup archive already exists: {destination}")

        try:
            moved_path = Path(shutil.move(str(archive_path), str(destination)))
        except OSError as exc:  # pragma: no cover - depends on filesystem state
            raise BackupStorageError(f"Unable to move archive to {destination}") from exc

        return moved_path

    def prune_older_than(self, retention_days: int, *, reference_date: date | None = None) -> Sequence[Path]:
        """Delete directories older than the retention window."""
        if retention_days <= 0:
            retention_days = 1

        reference = reference_date or date.today()
        keep_from = reference - timedelta(days=retention_days - 1)

        if not self._base_directory.exists():
            return []

        removed: list[Path] = []
        for candidate in self._base_directory.iterdir():
            if not candidate.is_dir():
                continue
            try:
                candidate_date = datetime.strptime(candidate.name, "%Y-%m-%d").date()
            except ValueError:
                continue
            if candidate_date < keep_from:
                shutil.rmtree(candidate, ignore_errors=False)
                removed.append(candidate)

        return removed


__all__ = ["DailyBackupStorageService"]
