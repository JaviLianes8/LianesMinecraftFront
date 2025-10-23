"""FastAPI routes exposing the server orchestration use cases."""
from __future__ import annotations

import logging
from collections.abc import Iterator
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse

from ...application.use_cases.check_server_status import CheckServerStatusUseCase
from ...application.use_cases.create_backup import CreateBackupUseCase
from ...application.use_cases.ensure_daily_backup import EnsureDailyBackupUseCase
from ...application.use_cases.retrieve_download_file import RetrieveDownloadFileUseCase
from ...application.use_cases.start_server import StartServerUseCase
from ...application.use_cases.start_server_workflow import StartServerWorkflowUseCase
from ...application.use_cases.stop_server import StopServerUseCase
from ...config.settings import Settings, get_settings
from ...di import provide_archive_service, provide_backup_storage_service, provide_server_manager
from ...domain.exceptions import (
    ArchiveCreationError,
    BackupStorageError,
    ResourceNotFoundError,
    ServerAlreadyRunningError,
    ServerNotRunningError,
)
from ...domain.services.archive_service import ArchiveService
from ...domain.services.backup_storage_service import BackupStorageService
from ...domain.services.server_manager import MinecraftServerManager, ServerState

router = APIRouter(prefix="/api", tags=["minecraft-server"])
LOGGER = logging.getLogger(__name__)


def _zip_streaming_response(path: Path, filename: str) -> StreamingResponse:
    """Stream a ZIP file while ensuring it is deleted afterwards."""

    def _iterator() -> Iterator[bytes]:
        with path.open("rb") as file:
            try:
                while chunk := file.read(8192):
                    yield chunk
            finally:
                path.unlink(missing_ok=True)

    response = StreamingResponse(_iterator(), media_type="application/zip")
    response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def _handle_domain_error(exc: Exception) -> HTTPException:
    if isinstance(exc, ServerAlreadyRunningError):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    if isinstance(exc, ServerNotRunningError):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    if isinstance(exc, ResourceNotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    if isinstance(exc, ArchiveCreationError):
        return HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))
    if isinstance(exc, BackupStorageError):
        return HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))
    return HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected error")


@router.post("/server/start", response_class=JSONResponse, status_code=status.HTTP_202_ACCEPTED)
def start_server(
    settings: Settings = Depends(get_settings),
    manager: MinecraftServerManager = Depends(provide_server_manager),
    archive_service: ArchiveService = Depends(provide_archive_service),
    backup_storage: BackupStorageService = Depends(provide_backup_storage_service),
) -> dict[str, object]:
    """Start the Minecraft server and ensure the daily backup exists."""
    start_use_case = StartServerUseCase(manager=manager, script_path=settings.minecraft_start_script)
    backup_use_case = EnsureDailyBackupUseCase(
        archive_service=archive_service,
        backup_storage=backup_storage,
        server_root=settings.minecraft_server_root,
        retention_days=settings.backup_retention_days,
    )
    workflow_use_case = StartServerWorkflowUseCase(start_use_case, backup_use_case)
    try:
        backup_created = workflow_use_case.execute()
    except Exception as exc:  # pragma: no cover - FastAPI handles the exception path
        raise _handle_domain_error(exc) from exc
    return {"status": "starting", "backup_created": backup_created}


@router.post("/server/stop", response_class=JSONResponse, status_code=status.HTTP_202_ACCEPTED)
def stop_server(
    background_tasks: BackgroundTasks,
    manager: MinecraftServerManager = Depends(provide_server_manager),
) -> dict[str, str]:
    """Stop the Minecraft server if it is running."""
    if not manager.is_running():
        raise _handle_domain_error(ServerNotRunningError("Server is not running"))

    use_case = StopServerUseCase(manager)

    def _run_stop() -> None:
        try:
            use_case.execute()
        except ServerNotRunningError:
            # Another concurrent stop operation already completed.
            pass
        except Exception:  # pragma: no cover - safety net for unexpected failures
            LOGGER.exception("Unexpected error while stopping the server")

    background_tasks.add_task(_run_stop)
    return {"status": "stopping"}


@router.get("/server/status", response_class=JSONResponse)
def server_status(manager: MinecraftServerManager = Depends(provide_server_manager)) -> dict[str, object]:
    """Return the current running state of the server."""
    use_case = CheckServerStatusUseCase(manager)
    try:
        state = use_case.execute()
    except Exception as exc:  # pragma: no cover
        raise _handle_domain_error(exc) from exc
    running = state != ServerState.STOPPED
    return {"running": running, "status": state.value}


@router.get("/mods/download")
def download_mods(settings: Settings = Depends(get_settings)) -> FileResponse:
    """Provide the pre-packaged mods archive for download."""
    use_case = RetrieveDownloadFileUseCase(settings.minecraft_mods_archive)
    try:
        archive_path = use_case.execute()
    except Exception as exc:  # pragma: no cover
        raise _handle_domain_error(exc) from exc

    return FileResponse(
        path=archive_path,
        media_type="application/zip",
        filename=archive_path.name,
    )


@router.get("/neoforge/download")
def download_neoforge(settings: Settings = Depends(get_settings)) -> FileResponse:
    """Provide the configured NeoForge installer for download."""
    use_case = RetrieveDownloadFileUseCase(settings.minecraft_neoforge_installer)
    try:
        installer_path = use_case.execute()
    except Exception as exc:  # pragma: no cover
        raise _handle_domain_error(exc) from exc

    return FileResponse(
        path=installer_path,
        media_type="application/java-archive",
        filename=installer_path.name,
    )


@router.get("/server/backup")
def backup_server(
    settings: Settings = Depends(get_settings),
    archive_service: ArchiveService = Depends(provide_archive_service),
) -> StreamingResponse:
    """Create a ZIP backup for the entire server directory."""
    use_case = CreateBackupUseCase(archive_service, settings.minecraft_server_root)
    try:
        archive_path, filename = use_case.execute()
    except Exception as exc:  # pragma: no cover
        raise _handle_domain_error(exc) from exc

    return _zip_streaming_response(archive_path, filename)
