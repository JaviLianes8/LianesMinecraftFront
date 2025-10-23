"""Application configuration sourced from environment variables or `.env` files."""
from __future__ import annotations

from collections.abc import Mapping
from functools import lru_cache
import os
from pathlib import Path
from typing import Any, Callable

try:  # pragma: no cover - import guard for Pydantic v1 compatibility
    from pydantic import BaseModel, ConfigDict, ValidationError, field_validator
    _PYDANTIC_V2 = True
except ImportError:  # pragma: no cover
    from pydantic import BaseModel, Extra, ValidationError, validator

    ConfigDict = None  # type: ignore[assignment]
    _PYDANTIC_V2 = False

    def field_validator(*fields: str, mode: str | None = None) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
        """Shim that mirrors the Pydantic v2 `field_validator` decorator."""

        pre = mode == "before"
        return validator(*fields, pre=pre, allow_reuse=True)  # type: ignore[no-any-return]


def _normalize_env_value(raw_value: str) -> str:
    """Return a normalized environment value stripping surrounding quotes."""

    stripped = raw_value.strip()
    if (
        len(stripped) >= 2
        and stripped[0] == stripped[-1]
        and stripped[0] in {"'", '"'}
    ):
        return stripped[1:-1]
    return stripped


def _package_root() -> Path:
    """Return the repository root derived from the package location."""

    return Path(__file__).resolve().parents[3]


def _resolve_env_file(env_file: str | Path) -> Path:
    """Resolve the most appropriate filesystem path for the `.env` file."""

    candidate = Path(env_file)
    if candidate.is_absolute():
        return candidate

    cwd_candidate = Path.cwd() / candidate
    if cwd_candidate.exists():
        return cwd_candidate

    package_candidate = _package_root() / candidate
    if package_candidate.exists():
        return package_candidate

    return cwd_candidate


def _load_env_file(env_file: Path) -> dict[str, str]:
    """Load key-value pairs from a simple `.env` file if it exists."""

    if not env_file.exists():
        return {}

    values: dict[str, str] = {}
    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        key, sep, value = line.partition("=")
        if not sep:
            continue
        normalized_key = key.strip()
        if not normalized_key:
            continue

        values[normalized_key] = _normalize_env_value(value)

    return values


def _is_subpath(candidate: Path, parent: Path) -> bool:
    """Return ``True`` when ``candidate`` is located inside ``parent``."""

    try:
        candidate.relative_to(parent)
    except ValueError:
        return False
    return True


class Settings(BaseModel):
    """Validated runtime configuration for the FastAPI service."""

    app_host: str = "0.0.0.0"
    app_port: int = 8000
    cors_allowed_origins: list[str] = ["*"]

    minecraft_start_script: Path
    minecraft_server_root: Path
    minecraft_mods_archive: Path
    minecraft_neoforge_installer: Path
    minecraft_backup_root: Path | None = None
    backup_retention_days: int = 7

    if ConfigDict is not None:
        model_config = ConfigDict(
            alias_generator=lambda value: value.upper(),
            populate_by_name=True,
            extra="ignore",
        )
    else:  # pragma: no cover - exercised only with Pydantic v1
        class Config:
            alias_generator = staticmethod(lambda value: value.upper())
            allow_population_by_field_name = True
            extra = Extra.ignore  # type: ignore[attr-defined]

    @field_validator(
        "minecraft_server_root",
        "minecraft_mods_archive",
        "minecraft_neoforge_installer",
        mode="before",
    )
    @classmethod
    def _expand_path(cls, value: str | Path) -> Path:
        """Expand environment paths to absolute filesystem locations."""

        return Path(value).expanduser().resolve()

    @field_validator("minecraft_start_script", mode="before")
    @classmethod
    def _expand_script(cls, value: str | Path) -> Path:
        """Expand the server launch script path to an absolute location."""

        return Path(value).expanduser().resolve()

    @field_validator("minecraft_backup_root", mode="before")
    @classmethod
    def _expand_optional_backup_root(cls, value: str | Path | None) -> Path | None:
        """Expand optional backup root directories to absolute paths."""

        if value in (None, "", "None"):
            return None
        return Path(value).expanduser().resolve()

    @field_validator("backup_retention_days")
    @classmethod
    def _validate_retention_days(cls, value: int) -> int:
        """Ensure the retention window is at least one day."""

        return max(1, value)

    def __init__(self, **data: Any) -> None:  # type: ignore[override]
        super().__init__(**data)
        server_root = self.minecraft_server_root
        backup_root = self.minecraft_backup_root
        if backup_root is None:
            default_root = (server_root.parent / "backups").resolve()
            object.__setattr__(self, "minecraft_backup_root", default_root)
            backup_root = default_root

        if _is_subpath(backup_root, server_root):
            raise ConfigurationError(
                "The Minecraft backup root must not be inside the server root "
                "to avoid archiving prior backups recursively."
            )

    @field_validator("cors_allowed_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: list[str] | str) -> list[str]:
        """Normalize origin configuration to a list of strings."""

        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @classmethod
    def load(
        cls,
        *,
        env: Mapping[str, str] | dict[str, str] | None = None,
        env_file: str | Path | None = ".env",
    ) -> "Settings":
        """Create a configuration instance from environment sources."""

        sources: dict[str, str] = {}
        env_path: Path | None = None
        if env_file is not None:
            env_path = _resolve_env_file(env_file)
            sources.update(_load_env_file(env_path))

        environment = env or os.environ
        sources.update({key: str(value) for key, value in environment.items() if value is not None})

        try:
            if _PYDANTIC_V2:
                return cls.model_validate(sources)
            return cls.parse_obj(sources)
        except ValidationError as exc:  # pragma: no cover - simple passthrough formatting
            missing_fields = {
                str(error["loc"][0])
                for error in exc.errors()
                if error.get("loc") and "missing" in str(error.get("type", ""))
            }
            missing_env = ", ".join(sorted(name.upper() for name in missing_fields)) or "unknown"
            env_hint = f" Expected `.env` file at {env_path}." if env_path else ""
            raise ConfigurationError(
                "Missing configuration values: "
                f"{missing_env}. Define them as environment variables or in the `.env` file. "
                "Refer to `.env.example` for the expected keys." + env_hint
            ) from exc


@lru_cache()
def _get_cached_settings() -> Settings:
    """Return the cached settings instance loaded from the default environment."""

    return Settings.load()


def get_settings(*, env: Mapping[str, str] | dict[str, str] | None = None) -> Settings:
    """Retrieve configuration, optionally using a custom environment mapping."""

    if env is not None:
        return Settings.load(env=env)
    return _get_cached_settings()


class ConfigurationError(RuntimeError):
    """Raised when the application configuration is incomplete or invalid."""
