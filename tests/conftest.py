import logging
import os
import sys
import types

import pytest


@pytest.fixture(autouse=True)
def mock_decky_modules(tmp_path):
    """Mock the decky and settings modules that are only available in the Decky runtime."""
    plugin_dir = str(tmp_path / "plugin")
    runtime_dir = str(tmp_path / "runtime")
    settings_dir = str(tmp_path / "settings")

    os.makedirs(plugin_dir, exist_ok=True)
    os.makedirs(f"{plugin_dir}/bin", exist_ok=True)
    os.makedirs(runtime_dir, exist_ok=True)
    os.makedirs(settings_dir, exist_ok=True)

    # Create mock decky module
    decky = types.ModuleType("decky")
    decky.DECKY_PLUGIN_DIR = plugin_dir
    decky.DECKY_PLUGIN_RUNTIME_DIR = runtime_dir
    decky.DECKY_PLUGIN_SETTINGS_DIR = settings_dir
    decky.logger = logging.getLogger("decky_test")
    sys.modules["decky"] = decky

    # Create mock settings module
    settings_mod = types.ModuleType("settings")

    class FakeSettingsManager:
        def __init__(self, name="config", settings_directory=""):
            self._data = {}

        def getSetting(self, key, default=None):
            return self._data.get(key, default)

        def setSetting(self, key, value):
            self._data[key] = value

    settings_mod.SettingsManager = FakeSettingsManager
    sys.modules["settings"] = settings_mod

    yield {
        "plugin_dir": plugin_dir,
        "runtime_dir": runtime_dir,
        "settings_dir": settings_dir,
    }

    # Cleanup
    sys.modules.pop("decky", None)
    sys.modules.pop("settings", None)
    # Force re-import of main next time
    sys.modules.pop("main", None)
