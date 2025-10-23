"""Composite use case orchestrating the start routine with backups."""
from __future__ import annotations

from .ensure_daily_backup import EnsureDailyBackupUseCase
from .start_server import StartServerUseCase


class StartServerWorkflowUseCase:
    """Coordinate the server startup with the daily backup routine."""

    def __init__(
        self,
        start_use_case: StartServerUseCase,
        backup_use_case: EnsureDailyBackupUseCase | None = None,
    ) -> None:
        self._start_use_case = start_use_case
        self._backup_use_case = backup_use_case

    def execute(self) -> bool:
        """Run the backup (if configured) and then start the server."""
        backup_performed = False
        if self._backup_use_case is not None:
            backup_performed = self._backup_use_case.execute()
        self._start_use_case.execute()
        return backup_performed


__all__ = ["StartServerWorkflowUseCase"]
