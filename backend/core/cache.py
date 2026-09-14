import time
import threading


class Cache:
    """
    In-memory cache supporting Stale-While-Revalidate (SWR).
    Serves cached data instantly (<1ms). If stale, returns stale data immediately
    and triggers a non-blocking background thread to refresh from the data source.
    """
    def __init__(self):
        self.store = {}
        self.lock = threading.Lock()
        self.refreshing = set()

    def get(self, key):
        with self.lock:
            if key in self.store:
                entry = self.store[key]
                if time.time() < entry['hard_expiry']:
                    return entry['value']
                else:
                    del self.store[key]
        return None

    def set(self, key, value, ttl=60, swr_ttl=3600):
        with self.lock:
            now = time.time()
            self.store[key] = {
                'value': value,
                'soft_expiry': now + ttl,
                'hard_expiry': now + max(ttl, swr_ttl)
            }

    def get_with_swr(self, key, compute_fn, ttl=60, swr_ttl=3600):
        with self.lock:
            entry = self.store.get(key)
            now = time.time()
            if entry:
                if now < entry['soft_expiry']:
                    return entry['value']
                elif now < entry['hard_expiry']:
                    # Data is past soft TTL but within hard TTL: return immediately and refresh in background
                    if key not in self.refreshing:
                        self.refreshing.add(key)
                        def bg_refresh():
                            try:
                                val = compute_fn()
                                if val is not None:
                                    self.set(key, val, ttl=ttl, swr_ttl=swr_ttl)
                            except Exception as e:
                                print(f"[CACHE] Background refresh error for {key}: {e}")
                            finally:
                                with self.lock:
                                    self.refreshing.discard(key)
                        threading.Thread(target=bg_refresh, daemon=True).start()
                    return entry['value']

        # Cache miss or hard expiry: compute synchronously
        val = compute_fn()
        if val is not None:
            self.set(key, val, ttl=ttl, swr_ttl=swr_ttl)
        return val


# Singleton cache instance shared across all adapters
cache = Cache()
