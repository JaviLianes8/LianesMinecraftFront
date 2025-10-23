"""Use case for stopping the Minecraft server."""
from __future__ import annotations

from ...domain.services.server_manager import MinecraftServerManager


class StopServerUseCase:
    """Encapsulate the logic required to stop the server."""

    def __init__(self, manager: MinecraftServerManager) -> None:
        self._manager = manager

    def execute(self) -> None:
        """Trigger the server stop routine."""
        self._manager.stop()
