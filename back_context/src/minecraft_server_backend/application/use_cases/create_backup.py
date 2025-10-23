"""Use case for packaging the entire server directory."""
from __future__ import annotations

from datetime import datetime
from pathlib import Path

from ...domain.services.archive_service import ArchiveService


class CreateBackupUseCase:
    """Create a timestamped backup ZIP for the server directory."""

    def __init__(self, archive_service: ArchiveService, server_root: Path) -> None:
        self._archive_service = archive_service
        self._server_root = server_root

    def execute(self) -> tuple[Path, str]:
        """Return the archive path and the filename that should be served to clients."""
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        archive_path = self._archive_service.create_zip(self._server_root)
        filename = f"minecraft-backup-{timestamp}.zip"
        return archive_path, filename
