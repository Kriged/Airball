"""
Daily Rate Limiter
Token-bucket style limiter that resets every 24 hours.
Used to guard optional API-Sports calls (100 req/day free tier).
"""
import time
import threading


class DailyRateLimiter:
    """
    Simple daily-reset counter.  Thread-safe.

    Usage:
        if api_sports_limiter.can_call():
            # make the request
        else:
            # fall back to ESPN / cached data
    """

    def __init__(self, max_per_day: int):
        self.max = max_per_day
        self.count = 0
        self.reset_at = time.time() + 86400
        self._lock = threading.Lock()

    def can_call(self) -> bool:
        """Return True and consume one token if quota remains; False otherwise."""
        with self._lock:
            now = time.time()
            if now > self.reset_at:
                self.count = 0
                self.reset_at = now + 86400
            if self.count < self.max:
                self.count += 1
                return True
            return False

    @property
    def remaining(self) -> int:
        """How many calls are left today."""
        with self._lock:
            return max(0, self.max - self.count)

    @property
    def resets_in(self) -> float:
        """Seconds until the daily quota resets."""
        return max(0.0, self.reset_at - time.time())


# ---------------------------------------------------------------------------
# Singleton limiter for API-Sports (keep 10 in reserve out of 100/day)
# ---------------------------------------------------------------------------
api_sports_limiter = DailyRateLimiter(90)
