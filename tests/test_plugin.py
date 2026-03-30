import asyncio
import base64
import json
import os
import sys

import pytest


def _import_plugin(mock_decky_modules):
    """Import the Plugin class after mocking decky modules."""
    # Add project root to path so `main` can be imported
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if root not in sys.path:
        sys.path.insert(0, root)
    from main import Plugin
    return Plugin


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------


class TestSettings:
    @pytest.mark.asyncio
    async def test_set_and_get_setting(self, mock_decky_modules):
        Plugin = _import_plugin(mock_decky_modules)
        p = Plugin()
        await p._main()

        await p.set_setting("volume", 0.5)
        result = await p.get_setting("volume", 1.0)
        assert result == 0.5

    @pytest.mark.asyncio
    async def test_get_setting_returns_default(self, mock_decky_modules):
        Plugin = _import_plugin(mock_decky_modules)
        p = Plugin()
        await p._main()

        result = await p.get_setting("nonexistent", "fallback")
        assert result == "fallback"


# ---------------------------------------------------------------------------
# _entry_to_info
# ---------------------------------------------------------------------------


class TestEntryToInfo:
    def test_extracts_fields(self, mock_decky_modules):
        Plugin = _import_plugin(mock_decky_modules)

        entry = {
            "url": "https://example.com/audio",
            "title": "Game Theme",
            "id": "abc123",
            "thumbnail": "https://example.com/thumb.jpg",
            "extra": "ignored",
        }
        result = Plugin._entry_to_info(entry)
        assert result == {
            "url": "https://example.com/audio",
            "title": "Game Theme",
            "id": "abc123",
            "thumbnail": "https://example.com/thumb.jpg",
        }

    def test_missing_fields_default_to_empty(self, mock_decky_modules):
        Plugin = _import_plugin(mock_decky_modules)
        result = Plugin._entry_to_info({})
        assert result == {"url": "", "title": "", "id": "", "thumbnail": ""}


# ---------------------------------------------------------------------------
# single_yt_url - local file (base64)
# ---------------------------------------------------------------------------


class TestSingleYtUrlLocal:
    @pytest.mark.asyncio
    async def test_returns_base64_for_downloaded_file(self, mock_decky_modules):
        Plugin = _import_plugin(mock_decky_modules)
        p = Plugin()
        await p._main()

        # Write a fake audio file
        audio_content = b"fake-audio-data"
        audio_path = os.path.join(p.music_path, "testid.mp3")
        with open(audio_path, "wb") as f:
            f.write(audio_content)

        result = await p.single_yt_url("testid")
        expected = f"data:audio/mp3;base64,{base64.b64encode(audio_content).decode()}"
        assert result == expected

    @pytest.mark.asyncio
    async def test_is_downloaded_true(self, mock_decky_modules):
        Plugin = _import_plugin(mock_decky_modules)
        p = Plugin()
        await p._main()

        audio_path = os.path.join(p.music_path, "vid123.opus")
        with open(audio_path, "wb") as f:
            f.write(b"data")

        assert await p.is_downloaded("vid123") is True

    @pytest.mark.asyncio
    async def test_is_downloaded_false(self, mock_decky_modules):
        Plugin = _import_plugin(mock_decky_modules)
        p = Plugin()
        await p._main()

        assert await p.is_downloaded("nonexistent") is False


# ---------------------------------------------------------------------------
# _local_match
# ---------------------------------------------------------------------------


class TestLocalMatch:
    def test_returns_path_when_found(self, mock_decky_modules):
        Plugin = _import_plugin(mock_decky_modules)
        p = Plugin()
        p.music_path = mock_decky_modules["runtime_dir"] + "/music"
        os.makedirs(p.music_path, exist_ok=True)

        path = os.path.join(p.music_path, "abc.webm")
        with open(path, "wb") as f:
            f.write(b"x")

        assert p._local_match("abc") == path

    def test_returns_none_when_not_found(self, mock_decky_modules):
        Plugin = _import_plugin(mock_decky_modules)
        p = Plugin()
        p.music_path = mock_decky_modules["runtime_dir"] + "/music"
        os.makedirs(p.music_path, exist_ok=True)

        assert p._local_match("nope") is None

    def test_asserts_on_multiple_matches(self, mock_decky_modules):
        Plugin = _import_plugin(mock_decky_modules)
        p = Plugin()
        p.music_path = mock_decky_modules["runtime_dir"] + "/music"
        os.makedirs(p.music_path, exist_ok=True)

        for ext in ("mp3", "opus"):
            with open(os.path.join(p.music_path, f"dup.{ext}"), "wb") as f:
                f.write(b"x")

        with pytest.raises(AssertionError, match="Multiple"):
            p._local_match("dup")


# ---------------------------------------------------------------------------
# Cache backup / restore
# ---------------------------------------------------------------------------


class TestCacheBackup:
    @pytest.mark.asyncio
    async def test_export_and_list(self, mock_decky_modules):
        Plugin = _import_plugin(mock_decky_modules)
        p = Plugin()
        await p._main()

        await p.export_cache({"123": {"videoId": "abc"}})
        backups = await p.list_cache_backups()
        assert len(backups) == 1
        assert backups[0].startswith("backup-")

    @pytest.mark.asyncio
    async def test_import_cache(self, mock_decky_modules):
        Plugin = _import_plugin(mock_decky_modules)
        p = Plugin()
        await p._main()

        cache_data = {"456": {"videoId": "xyz", "volume": 0.8}}
        await p.export_cache(cache_data)
        backups = await p.list_cache_backups()

        imported = await p.import_cache(backups[0])
        assert imported == cache_data

    @pytest.mark.asyncio
    async def test_clear_cache(self, mock_decky_modules):
        Plugin = _import_plugin(mock_decky_modules)
        p = Plugin()
        await p._main()

        await p.export_cache({"1": {}})
        assert len(await p.list_cache_backups()) == 1

        await p.clear_cache()
        assert len(await p.list_cache_backups()) == 0


# ---------------------------------------------------------------------------
# Download management
# ---------------------------------------------------------------------------


class TestDownloadManagement:
    @pytest.mark.asyncio
    async def test_clear_downloads(self, mock_decky_modules):
        Plugin = _import_plugin(mock_decky_modules)
        p = Plugin()
        await p._main()

        # Create some fake files
        for name in ("a.mp3", "b.opus"):
            with open(os.path.join(p.music_path, name), "wb") as f:
                f.write(b"x")

        assert len(os.listdir(p.music_path)) == 2
        await p.clear_downloads()
        assert len(os.listdir(p.music_path)) == 0


# ---------------------------------------------------------------------------
# yt-dlp binary management
# ---------------------------------------------------------------------------


class TestYtDlpManagement:
    @pytest.mark.asyncio
    async def test_is_installed_false(self, mock_decky_modules):
        Plugin = _import_plugin(mock_decky_modules)
        p = Plugin()
        await p._main()

        assert await p.is_yt_dlp_installed() is False

    @pytest.mark.asyncio
    async def test_is_installed_true(self, mock_decky_modules):
        Plugin = _import_plugin(mock_decky_modules)
        p = Plugin()
        await p._main()

        path = os.path.join(mock_decky_modules["plugin_dir"], "bin", "yt-dlp")
        with open(path, "wb") as f:
            f.write(b"#!/bin/sh\n")
        os.chmod(path, 0o755)

        assert await p.is_yt_dlp_installed() is True

    @pytest.mark.asyncio
    async def test_delete_yt_dlp_removes_binary(self, mock_decky_modules):
        Plugin = _import_plugin(mock_decky_modules)
        p = Plugin()
        await p._main()

        path = os.path.join(mock_decky_modules["plugin_dir"], "bin", "yt-dlp")
        with open(path, "wb") as f:
            f.write(b"#!/bin/sh\n")
        os.chmod(path, 0o755)

        assert await p.is_yt_dlp_installed() is True
        ok = await p.delete_yt_dlp()
        assert ok is True
        assert not os.path.isfile(path)
        assert await p.is_yt_dlp_installed() is False

    @pytest.mark.asyncio
    async def test_delete_yt_dlp_when_not_installed(self, mock_decky_modules):
        Plugin = _import_plugin(mock_decky_modules)
        p = Plugin()
        await p._main()

        # Should succeed silently even if binary is absent
        ok = await p.delete_yt_dlp()
        assert ok is True

    @pytest.mark.asyncio
    async def test_delete_yt_dlp(self, mock_decky_modules):
        Plugin = _import_plugin(mock_decky_modules)
        p = Plugin()
        await p._main()

        path = os.path.join(mock_decky_modules["plugin_dir"], "bin", "yt-dlp")
        with open(path, "wb") as f:
            f.write(b"x")

        result = await p.delete_yt_dlp()
        assert result is True
        assert not os.path.exists(path)


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------


class TestLifecycle:
    @pytest.mark.asyncio
    async def test_main_creates_directories(self, mock_decky_modules):
        Plugin = _import_plugin(mock_decky_modules)
        p = Plugin()
        await p._main()

        assert os.path.isdir(p.music_path)
        assert os.path.isdir(p.cache_path)

    @pytest.mark.asyncio
    async def test_unload_graceful(self, mock_decky_modules):
        Plugin = _import_plugin(mock_decky_modules)
        p = Plugin()
        await p._main()
        # Should not raise even with no subprocess
        await p._unload()
