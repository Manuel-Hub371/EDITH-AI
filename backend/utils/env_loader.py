"""
env_loader.py — Shared .env loader for EDITH backend

When running as a PyInstaller compiled exe, sys.executable points to the exe itself.
os.getcwd() may not be the directory where .env lives.

This utility resolves the .env path correctly in all scenarios:
  1. Running from source (python main.py)    → looks for .env next to main.py
  2. Running as compiled exe (edith-backend.exe) → looks for .env next to the exe
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv


def _get_base_dir() -> Path:
    """
    Returns the directory that contains the .env file.

    - When compiled by PyInstaller, sys.frozen is True and sys.executable
      points to the .exe file. The .env should sit next to the .exe.
    - When running from source, __file__ is inside backend/, so we walk up
      to find the directory that contains main.py.
    """
    if getattr(sys, 'frozen', False):
        # PyInstaller compiled — .env lives next to the exe
        return Path(sys.executable).parent
    else:
        # Running from source — .env lives in the backend/ directory
        return Path(__file__).parent.parent


def load_env():
    """
    Loads .env from the correct location and returns True if found.
    Falls back gracefully if the file does not exist.
    """
    base_dir = _get_base_dir()
    env_path = base_dir / '.env'

    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=True)
        return True
    else:
        # Try current working directory as last resort
        cwd_env = Path(os.getcwd()) / '.env'
        if cwd_env.exists():
            load_dotenv(dotenv_path=cwd_env, override=True)
            return True

    return False
