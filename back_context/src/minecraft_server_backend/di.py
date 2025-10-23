"""Dependency injection helpers."""
from __future__ import annotations

from functools import lru_cache

from .config.settings import get_settings
from .domain.services.archive_service import ArchiveService
from .domain.services.backup_storage_service import BackupStorageService
from .domain.services.server_manager import MinecraftServerManager
from .infrastructure.filesystem.daily_backup_storage_service import DailyBackupStorageService
from .infrastructure.filesystem.zip_archive_service import ZipArchiveService
from .infrastructure.process.subprocess_server_manager import SubprocessServerManager


@lru_cache()
def provide_archive_service() -> ArchiveService:
    """Return a shared archive service instance."""
    return ZipArchiveService()


@lru_cache()
def provide_backup_storage_service() -> BackupStorageService:
    """Return a shared backup storage service instance."""
    settings = get_settings()
    return DailyBackupStorageService(settings.minecraft_backup_root)


_server_manager = SubprocessServerManager()


def provide_server_manager() -> MinecraftServerManager:
    """Return a shared server manager instance."""
    return _server_manager

__all__ = [
    "provide_archive_service",
    "provide_backup_storage_service",
    "provide_server_manager",
]
