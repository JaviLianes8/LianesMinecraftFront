"""Domain-level exception definitions for the Minecraft server backend."""
from __future__ import annotations


class ServerError(Exception):
    """Base class for server management errors."""


class ServerAlreadyRunningError(ServerError):
    """Raised when attempting to start the server while it is already running."""


class ServerNotRunningError(ServerError):
    """Raised when attempting to stop the server when no instance is active."""


class ResourceNotFoundError(ServerError):
    """Raised when a configured file or directory cannot be located."""


class ArchiveCreationError(ServerError):
    """Raised when an archive cannot be produced due to I/O errors."""


class BackupStorageError(ServerError):
    """Raised when filesystem operations for backups fail."""
