import asyncio
import base64
import datetime
import glob
import json
import os
import urllib.request

import decky  # type: ignore
from settings import SettingsManager  # type: ignore


class Plugin:
    yt_process: asyncio.subprocess.Process | None = None
    # Lock to prevent concurrent reads from yt-dlp stdout
    yt_process_lock = asyncio.Lock()
    music_path = f"{decky.DECKY_PLUGIN_RUNTIME_DIR}/music"
    cache_path = f"{decky.DECKY_PLUGIN_RUNTIME_DIR}/cache"

    async def _main(self):
        self.settings = SettingsManager(
            name="config", settings_directory=decky.DECKY_PLUGIN_SETTINGS_DIR
        )
        os.makedirs(self.music_path, exist_ok=True)
        os.makedirs(self.cache_path, exist_ok=True)
        decky.logger.info("GameThemeMusic-NG loaded")

    async def _unload(self):
        if self.yt_process is not None and self.yt_process.returncode is None:
            self.yt_process.terminate()
            async with self.yt_process_lock:
                try:
                    await asyncio.wait_for(self.yt_process.communicate(), timeout=5)
                except TimeoutError:
                    self.yt_process.kill()
        decky.logger.info("GameThemeMusic-NG unloaded")

    async def _uninstall(self):
        decky.logger.info("GameThemeMusic-NG uninstalled")

    # -------------------------------------------------------------------------
    # Settings
    # -------------------------------------------------------------------------

    async def set_setting(self, key: str, value):
        self.settings.setSetting(key, value)

    async def get_setting(self, key: str, default):
        return self.settings.getSetting(key, default)

    # -------------------------------------------------------------------------
    # YouTube search via yt-dlp
    # -------------------------------------------------------------------------

    async def search_yt(self, term: str, count: int = 10):
        """Start a yt-dlp search subprocess. Results are streamed via next_yt_result()."""
        if self.yt_process is not None and self.yt_process.returncode is None:
            self.yt_process.terminate()
            async with self.yt_process_lock:
                await self.yt_process.communicate()

        self.yt_process = await asyncio.create_subprocess_exec(
            f"{decky.DECKY_PLUGIN_DIR}/bin/yt-dlp",
            f"ytsearch{count}:{term}",
            "-j",
            "-f",
            "bestaudio",
            "--match-filters",
            f"duration<?{20 * 60}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
            # 10 MB buffer — search result JSON can be large
            limit=10 * 1024**2,
        )

    async def next_yt_result(self):
        """Return the next search result from the running yt-dlp process, or None when exhausted."""
        async with self.yt_process_lock:
            if (
                not self.yt_process
                or not (output := self.yt_process.stdout)
                or not (line := (await output.readline()).strip())
            ):
                return None
            entry = json.loads(line)
            return self._entry_to_info(entry)

    @staticmethod
    def _entry_to_info(entry: dict) -> dict:
        return {
            "url": entry.get("url", ""),
            "title": entry.get("title", ""),
            "id": entry.get("id", ""),
            "thumbnail": entry.get("thumbnail", ""),
        }

    # -------------------------------------------------------------------------
    # Single video URL (used when a specific video ID is already known)
    # -------------------------------------------------------------------------

    async def single_yt_url(self, id: str):
        """
        Return a playable URL for the given video ID.
        If the audio has already been downloaded, returns a base64 data URL.
        Otherwise fetches the streaming URL via yt-dlp.
        """
        local_match = self._local_match(id)
        if local_match is not None:
            extension = local_match.rsplit(".", 1)[-1]
            with open(local_match, "rb") as f:
                return f"data:audio/{extension};base64,{base64.b64encode(f.read()).decode()}"

        proc = await asyncio.create_subprocess_exec(
            f"{decky.DECKY_PLUGIN_DIR}/bin/yt-dlp",
            f"https://www.youtube.com/watch?v={id}",
            "-j",
            "-f",
            "bestaudio",
            "--no-playlist",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
            limit=10 * 1024 * 1024,
        )
        stdout, _ = await proc.communicate()
        if not stdout.strip():
            decky.logger.warning(f"[GTM] single_yt_url: no output for {id}")
            return None
        try:
            url = json.loads(stdout).get("url")
            decky.logger.info(f"[GTM] single_yt_url: got url={bool(url)} for {id}")
            return url
        except Exception as e:
            decky.logger.error(f"[GTM] single_yt_url: json parse error: {e}")
            return None

    # -------------------------------------------------------------------------
    # Download audio
    # -------------------------------------------------------------------------

    async def download_yt_audio(self, id: str):
        """Download a YouTube video's best audio track to the music directory."""
        if self._local_match(id) is not None:
            return  # Already downloaded
        process = await asyncio.create_subprocess_exec(
            f"{decky.DECKY_PLUGIN_DIR}/bin/yt-dlp",
            id,
            "-f",
            "bestaudio",
            "-o",
            "%(id)s.%(ext)s",
            "-P",
            self.music_path,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await process.communicate()

    async def clear_downloads(self):
        """Delete all downloaded audio files."""
        for file in glob.glob(f"{self.music_path}/*"):
            if os.path.isfile(file):
                os.remove(file)

    # -------------------------------------------------------------------------
    # Cache backup / restore
    # -------------------------------------------------------------------------

    async def export_cache(self, cache: dict):
        """Save a timestamped JSON backup of the frontend cache."""
        os.makedirs(self.cache_path, exist_ok=True)
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M")
        filename = f"backup-{timestamp}.json"
        with open(f"{self.cache_path}/{filename}", "w") as f:
            json.dump(cache, f)

    async def list_cache_backups(self) -> list:
        """Return a list of available backup names (without extension)."""
        return [
            os.path.basename(file).rsplit(".", 1)[0]
            for file in glob.glob(f"{self.cache_path}/*.json")
        ]

    async def import_cache(self, name: str) -> dict:
        """Load a cache backup by name."""
        with open(f"{self.cache_path}/{name}.json", "r") as f:
            return json.load(f)

    async def clear_cache(self):
        """Delete all cache backup files."""
        for file in glob.glob(f"{self.cache_path}/*.json"):
            if os.path.isfile(file):
                os.remove(file)

    # -------------------------------------------------------------------------
    # yt-dlp binary management
    # -------------------------------------------------------------------------

    async def is_yt_dlp_installed(self) -> bool:
        """Return True if the yt-dlp binary is present and executable."""
        path = f"{decky.DECKY_PLUGIN_DIR}/bin/yt-dlp"
        return os.path.isfile(path) and os.access(path, os.X_OK)

    async def download_yt_dlp(self) -> bool:
        """Download the latest yt-dlp x86_64 binary. Returns True on success."""
        url = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux"
        dest = f"{decky.DECKY_PLUGIN_DIR}/bin/yt-dlp"
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, lambda: urllib.request.urlretrieve(url, dest))
            os.chmod(dest, 0o755)
            return True
        except Exception as e:
            decky.logger.error(f"Failed to download yt-dlp: {e}")
            return False

    async def delete_yt_dlp(self) -> bool:
        """Delete the yt-dlp binary. Returns True on success."""
        dest = f"{decky.DECKY_PLUGIN_DIR}/bin/yt-dlp"
        try:
            if os.path.isfile(dest):
                os.remove(dest)
            return True
        except Exception as e:
            decky.logger.error(f"Failed to delete yt-dlp: {e}")
            return False

    # -------------------------------------------------------------------------
    # Helpers
    # -------------------------------------------------------------------------

    async def is_downloaded(self, id: str) -> bool:
        """Return True if the audio for the given video ID has been downloaded locally."""
        return self._local_match(id) is not None

    def _local_match(self, id: str):
        """Return the path to a locally downloaded audio file for the given ID, or None."""
        matches = [
            x for x in glob.glob(f"{self.music_path}/{id}.*") if os.path.isfile(x)
        ]
        if not matches:
            return None
        assert len(matches) == 1, f"Multiple local audio files found for ID: {id}"
        return matches[0]
