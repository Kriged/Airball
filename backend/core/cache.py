import json
import os
import tempfile
import threading
import time
from pathlib import Path


# Vercel runs Linux and retains /tmp across warm invocations. Windows local
# development has no writable POSIX /tmp, so use the platform temp directory.
_default_cache_path = "/tmp/airball_cache.json" if os.name != "nt" else str(Path(tempfile.gettempdir()) / "airball_cache.json")
TMP_CACHE_FILE = Path(os.getenv("AIRBALL_CACHE_FILE", _default_cache_path))


class Cache:
    """
    In-memory cache supporting Stale-While-Revalidate (SWR).
    Serves cached data instantly (<1ms). If stale, returns stale data immediately
    and triggers a non-blocking background thread to refresh from the data source.
    """
    def __init__(self, persist_path=None):
        self.store = {}
        self.lock = threading.Lock()
        self.refreshing = set()
        self.inflight = {}
        self.provider_cooldowns = {}
        self.persist_path = Path(persist_path) if persist_path else None
        if self.persist_path:
            self._load()

    def _load(self):
        """Restore warm-instance data. A corrupt or partial file is disposable."""
        try:
            payload = json.loads(self.persist_path.read_text(encoding="utf-8"))
            self.store = payload.get("entries", {}) if isinstance(payload, dict) else {}
            self.provider_cooldowns = payload.get("provider_cooldowns", {}) if isinstance(payload, dict) else {}
        except (OSError, ValueError, TypeError):
            self.store = {}
            self.provider_cooldowns = {}

    def _persist_locked(self):
        if not self.persist_path:
            return
        try:
            self.persist_path.parent.mkdir(parents=True, exist_ok=True)
            payload = {"entries": self.store, "provider_cooldowns": self.provider_cooldowns}
            fd, temporary_path = tempfile.mkstemp(
                prefix="airball_cache_", suffix=".json", dir=str(self.persist_path.parent)
            )
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                json.dump(payload, handle, separators=(",", ":"))
            os.replace(temporary_path, self.persist_path)
        except (OSError, TypeError, ValueError):
            # Caching must never make a request fail (for example, /tmp can fill up).
            try:
                if "temporary_path" in locals():
                    os.unlink(temporary_path)
            except OSError:
                pass

    def cooldown_until(self, provider):
        with self.lock:
            return float(self.provider_cooldowns.get(provider, 0))

    def set_cooldown(self, provider, until):
        with self.lock:
            self.provider_cooldowns[provider] = float(until)
            self._persist_locked()

    def clear_cooldown(self, provider):
        with self.lock:
            if provider in self.provider_cooldowns:
                del self.provider_cooldowns[provider]
                self._persist_locked()

    def get(self, key):
        with self.lock:
            if key in self.store:
                entry = self.store[key]
                if time.time() < entry['hard_expiry']:
                    return entry['value']
                else:
                    del self.store[key]
                    self._persist_locked()
        return None

    def set(self, key, value, ttl=60, swr_ttl=3600):
        with self.lock:
            now = time.time()
            self.store[key] = {
                'value': value,
                'soft_expiry': now + ttl,
                'hard_expiry': now + max(ttl, swr_ttl)
            }
            self._persist_locked()

    def get_with_swr(self, key, compute_fn, ttl=60, swr_ttl=3600):
        with self.lock:
            entry = self.store.get(key)
            now = time.time()
            if entry:
                if now < entry['soft_expiry']:
                    return entry['value']
                elif now < entry['hard_expiry']:
                    # Data is past soft TTL but within hard TTL: return it immediately. On Vercel,
                    # CDN SWR handles the refresh because serverless background threads are not durable.
                    if key not in self.refreshing:
                        self.refreshing.add(key)
                        self.refreshing.discard(key)
                    return entry['value']

            # Cache miss or hard expiry
            if key in self.inflight:
                wait_event = self.inflight[key]
                wait = True
            else:
                wait_event = threading.Event()
                self.inflight[key] = wait_event
                wait = False

        if wait:
            wait_event.wait()
            with self.lock:
                entry = self.store.get(key)
                if entry and time.time() < entry['hard_expiry']:
                    return entry['value']
            # Fallthrough if the other thread failed

        # Compute synchronously
        try:
            val = compute_fn()
            if val is not None:
                self.set(key, val, ttl=ttl, swr_ttl=swr_ttl)
            return val
        finally:
            if not wait:
                with self.lock:
                    if key in self.inflight:
                        del self.inflight[key]
                wait_event.set()


# Singleton cache instance shared across all adapters. Local Cache() instances remain
# ephemeral, which keeps tests and one-off scripts isolated from warm serverless state.
cache = Cache(persist_path=TMP_CACHE_FILE)
