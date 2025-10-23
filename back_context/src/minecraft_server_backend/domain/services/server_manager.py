"""Contracts for controlling the Minecraft server process."""
from __future__ import annotations

from abc import ABC, abstractmethod
from enum import Enum
from pathlib import Path


class ServerState(str, Enum):
    """Enumerate the high-level lifecycle states of the server process."""

    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"


class MinecraftServerManager(ABC):
    """Defines process lifecycle operations for the Minecraft server."""

    @abstractmethod
    def is_running(self) -> bool:
        """Return whether the server process is currently alive."""

    @abstractmethod
    def start(self, script_path: Path) -> None:
        """Start the server using the provided batch script."""

    @abstractmethod
    def stop(self) -> None:
        """Stop the server if it is running."""

    @abstractmethod
    def get_state(self) -> ServerState:
        """Return the current lifecycle state of the server."""


__all__ = ["MinecraftServerManager", "ServerState"]
