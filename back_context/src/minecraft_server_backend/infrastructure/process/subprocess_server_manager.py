"""Subprocess-based implementation of the server manager."""
from __future__ import annotations

import logging
import os
import signal
import subprocess
from pathlib import Path
from threading import Lock
from time import monotonic
from typing import Optional

from ...domain.exceptions import ResourceNotFoundError, ServerAlreadyRunningError, ServerNotRunningError
from ...domain.services.server_manager import MinecraftServerManager, ServerState

_LOGGER = logging.getLogger(__name__)


class SubprocessServerManager(MinecraftServerManager):
    """Manage the Minecraft server using :mod:`subprocess`."""

    def __init__(self) -> None:
        self._process: Optional[subprocess.Popen[str]] = None
        self._lock = Lock()
        self._state = ServerState.STOPPED
        self._state_since = monotonic()
        self._startup_grace_period = 10.0

    def is_running(self) -> bool:
        """Return ``True`` when the managed process is alive."""
        with self._lock:
            running = self._process is not None and self._process.poll() is None
            self._refresh_state_locked(running)
            return running

    def get_state(self) -> ServerState:
        """Return the most up-to-date lifecycle state for the server process."""
        with self._lock:
            self._refresh_state_locked()
            return self._state

    def start(self, script_path: Path) -> None:
        """Start the server via the provided batch script."""
        if not script_path.exists():
            raise ResourceNotFoundError(f"Start script not found: {script_path}")

        command = [str(script_path)]
        creationflags = 0
        preexec_fn = None
        if os.name == "nt":
            creationflags = subprocess.CREATE_NEW_PROCESS_GROUP  # type: ignore[attr-defined]
            command = ["cmd.exe", "/c", str(script_path)]
        else:
            preexec_fn = os.setsid

        with self._lock:
            if self._process is not None and self._process.poll() is None:
                raise ServerAlreadyRunningError("Server is already running")

            self._set_state_locked(ServerState.STARTING)

            try:
                # Let the child process inherit the parent's stdout/stderr to avoid
                # blocking the Minecraft server when the pipes fill up during
                # startup logging.
                self._process = subprocess.Popen(
                    command,
                    creationflags=creationflags,
                    preexec_fn=preexec_fn,
                    cwd=str(script_path.parent),
                    stdout=None,
                    stderr=None,
                )
            except Exception:
                self._process = None
                self._set_state_locked(ServerState.STOPPED)
                raise

    def stop(self) -> None:
        """Terminate the running server process."""
        with self._lock:
            if self._process is None or self._process.poll() is not None:
                self._process = None
                self._set_state_locked(ServerState.STOPPED)
                raise ServerNotRunningError("Server is not running")

            process = self._process

        success = False
        try:
            if os.name == "nt":
                process.send_signal(signal.CTRL_BREAK_EVENT)
                try:
                    process.wait(timeout=60)
                except subprocess.TimeoutExpired:
                    kill_result = subprocess.run(
                        [
                            "taskkill",
                            "/PID",
                            str(process.pid),
                            "/T",
                            "/F",
                        ],
                        capture_output=True,
                        text=True,
                    )
                    if kill_result.returncode != 0:
                        raise ServerNotRunningError(
                            "Server did not respond to CTRL_BREAK_EVENT and taskkill failed: "
                            f"{kill_result.stderr or kill_result.stdout}"
                        )
                    try:
                        process.wait(timeout=10)
                    except subprocess.TimeoutExpired as exc:
                        raise ServerNotRunningError(
                            "Server did not stop after taskkill"
                        ) from exc
            else:
                os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                process.wait(timeout=60)
        except subprocess.TimeoutExpired as exc:  # pragma: no cover - hard to reproduce
            process.kill()
            raise ServerNotRunningError("Server did not stop in time") from exc
        else:
            success = True
        finally:
            if success:
                with self._lock:
                    self._process = None
                    self._set_state_locked(ServerState.STOPPED)
            else:
                with self._lock:
                    # If we failed to stop the process we keep the previous state.
                    self._refresh_state_locked()

    def _refresh_state_locked(self, running: Optional[bool] = None) -> None:
        """Synchronise the cached state with the real process status."""

        if running is None:
            running = self._process is not None and self._process.poll() is None

        if not running:
            if self._process is not None and self._process.poll() is not None:
                self._process = None
            self._set_state_locked(ServerState.STOPPED)
            return

        if self._state is ServerState.STARTING:
            elapsed = monotonic() - self._state_since
            if elapsed >= self._startup_grace_period:
                self._set_state_locked(ServerState.RUNNING)
            return

        if self._state is not ServerState.RUNNING:
            self._set_state_locked(ServerState.RUNNING)

    def _set_state_locked(self, state: ServerState) -> None:
        """Update the cached lifecycle state while holding the lock."""

        if self._state is state:
            return

        _LOGGER.debug("Server state transition: %s -> %s", self._state.value, state.value)
        self._state = state
        self._state_since = monotonic()


__all__ = ["SubprocessServerManager"]
