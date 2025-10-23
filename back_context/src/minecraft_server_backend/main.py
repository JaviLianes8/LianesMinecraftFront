"""FastAPI application wiring for the Minecraft server backend."""

from __future__ import annotations

from pathlib import Path
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

if __package__ in (None, ""):
    package_root = Path(__file__).resolve().parents[1]
    package_root_str = str(package_root)
    if package_root_str not in sys.path:
        sys.path.insert(0, package_root_str)
    __package__ = "minecraft_server_backend"

from .config.settings import ConfigurationError, Settings, get_settings
from .interfaces.http.api import router


def create_app(settings: Settings | None = None) -> FastAPI:
    """Instantiate the FastAPI application with dependencies and middleware."""
    try:
        resolved_settings = settings or get_settings()
    except ConfigurationError as exc:
        raise RuntimeError(str(exc)) from exc

    settings = resolved_settings

    app = FastAPI(title="Minecraft Server Backend", version="1.0.0")
    app.include_router(router)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allowed_origins,
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=True,
    )

    return app


if __name__ != "__main__":
    app = create_app()
else:  # pragma: no cover - executed only when running as a script
    app = FastAPI(title="Minecraft Server Backend", version="1.0.0")


def run() -> None:
    """Launch the FastAPI application using the configured settings."""

    try:
        settings = get_settings()
    except ConfigurationError as exc:
        raise SystemExit(str(exc)) from exc

    import uvicorn

    uvicorn.run(
        "minecraft_server_backend.main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=True,
    )


if __name__ == "__main__":
    run()


__all__ = ["app", "create_app", "run"]
