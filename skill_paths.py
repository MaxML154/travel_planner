#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Resolve companion-skill scripts without hardcoding a machine path."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable, Optional

SKILL_ROOT = Path(__file__).resolve().parent
SKILLS_PARENT = SKILL_ROOT.parent  # typically …/.claude/skills


def _first_existing(candidates: Iterable[Path]) -> Optional[Path]:
    for p in candidates:
        if p and p.is_file():
            return p
    return None


def _skill_roots(env_dir: str, skill_name: str) -> list[Path]:
    roots: list[Path] = []
    env = (os.environ.get(env_dir) or "").strip()
    if env:
        roots.append(Path(env).expanduser())
    roots.extend(
        [
            SKILLS_PARENT / skill_name,
            Path.home() / ".claude" / "skills" / skill_name,
            SKILL_ROOT / skill_name,
        ]
    )
    return roots


def find_xiaohongshu_cli() -> Optional[Path]:
    env = (os.environ.get("XHS_CLI") or "").strip()
    cands = [Path(env).expanduser()] if env else []
    for root in _skill_roots("XIAOHONGSHU_SKILLS_DIR", "xiaohongshu-skills"):
        cands.append(root / "scripts" / "cli.py")
    return _first_existing(cands)


def find_xiaohongshu_bridge() -> Optional[Path]:
    env = (os.environ.get("XHS_BRIDGE") or "").strip()
    cands = [Path(env).expanduser()] if env else []
    for root in _skill_roots("XIAOHONGSHU_SKILLS_DIR", "xiaohongshu-skills"):
        cands.append(root / "scripts" / "bridge_server.py")
    return _first_existing(cands)


def find_weather_py() -> Optional[Path]:
    env = (os.environ.get("WEATHER_SKILL") or "").strip()
    cands: list[Path] = []
    if env:
        p = Path(env).expanduser()
        cands.append(p if p.suffix == ".py" else p / "weather.py")
    for root in _skill_roots("WEATHER_SKILL_DIR", "weather-skill"):
        cands.append(root / "weather.py")
    return _first_existing(cands)
