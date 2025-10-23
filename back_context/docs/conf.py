"""Sphinx configuration for the Minecraft server backend documentation."""
from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
src_path = PROJECT_ROOT / "src"
sys.path.insert(0, str(src_path))

project = "Minecraft Server Backend"
author = "Lianes"
current_year = datetime.now().year
copyright = f"{current_year}, {author}"

extensions = [
    "sphinx.ext.autodoc",
    "sphinx.ext.napoleon",
    "sphinx_autodoc_typehints",
]

autodoc_default_options = {
    "members": True,
    "undoc-members": False,
    "show-inheritance": True,
}

html_theme = "furo"
html_static_path: list[str] = []

templates_path: list[str] = ["_templates"]
exclude_patterns: list[str] = []
