"""Use case for starting the Minecraft server."""
from __future__ import annotations

from pathlib import Path

from ...domain.services.server_manager import MinecraftServerManager


class StartServerUseCase:
    """Encapsulate the logic required to start the server."""

    def __init__(self, manager: MinecraftServerManager, script_path: Path) -> None:
        self._manager = manager
        self._script_path = script_path

    def execute(self) -> None:
        """Trigger the server start routine."""
        self._manager.start(self._script_path)
