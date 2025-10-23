"""Use case that guarantees a single backup per day with retention."""
from __future__ import annotations

from datetime import date
from pathlib import Path

from ...domain.services.archive_service import ArchiveService
from ...domain.services.backup_storage_service import BackupStorageService


class EnsureDailyBackupUseCase:
    """Create one backup per day and prune outdated copies."""

    def __init__(
        self,
        archive_service: ArchiveService,
        backup_storage: BackupStorageService,
        server_root: Path,
        *,
        retention_days: int,
        archive_filename: str = "minecraft-server-backup.zip",
    ) -> None:
        self._archive_service = archive_service
        self._backup_storage = backup_storage
        self._server_root = server_root
        self._retention_days = retention_days
        self._archive_filename = archive_filename

    def execute(self) -> bool:
        """Create the daily backup when missing and return whether it was generated."""
        today = date.today()
        destination_dir = self._backup_storage.prepare_daily_directory(today)
        if destination_dir is None:
            return False

        archive_path = self._archive_service.create_zip(self._server_root)
        self._backup_storage.store_archive(archive_path, destination_dir, self._archive_filename)
        self._backup_storage.prune_older_than(self._retention_days, reference_date=today)
        return True


__all__ = ["EnsureDailyBackupUseCase"]
