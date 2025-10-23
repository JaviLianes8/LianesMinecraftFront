"""Use case for querying the Minecraft server status."""
from __future__ import annotations

from ...domain.services.server_manager import MinecraftServerManager, ServerState


class CheckServerStatusUseCase:
    """Provide the lifecycle state of the managed server process."""

    def __init__(self, manager: MinecraftServerManager) -> None:
        self._manager = manager

    def execute(self) -> ServerState:
        """Return the current high-level lifecycle state for the server."""
        return self._manager.get_state()
