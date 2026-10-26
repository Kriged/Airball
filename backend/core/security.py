"""
Security hardening middleware, input sanitization, rate limiting, and safe error handling.
"""
import re
import time
import os
import logging
import threading
from collections import defaultdict
from flask import request, jsonify, current_app

logger = logging.getLogger("airball.security")


class IPRateLimiter:
    """
    Thread-safe IP sliding window rate limiter with concurrency protection.
    Exempts health checks and test runner contexts.
    """
    def __init__(self, requests_per_minute=120, max_concurrent=25):
        self.rpm = requests_per_minute
        self.max_concurrent = max_concurrent
        self.requests = defaultdict(list)
        self.active_concurrency = defaultdict(int)
        self.lock = threading.Lock()
        self._last_cleanup = time.time()

    def _cleanup_stale_locked(self, now):
        """Prune IP records older than 2 minutes to keep memory bounded."""
        if now - self._last_cleanup < 60:
            return
        self._last_cleanup = now
        stale_ips = []
        for ip, timestamps in self.requests.items():
            fresh = [t for t in timestamps if now - t < 60]
            if fresh:
                self.requests[ip] = fresh
            else:
                stale_ips.append(ip)
        for ip in stale_ips:
            del self.requests[ip]

    def acquire(self, ip):
        """
        Check rate limit and increment concurrency.
        Returns (allowed: bool, reason: str, retry_after: int).
        """
        now = time.time()
        with self.lock:
            self._cleanup_stale_locked(now)

            # Concurrency check
            if self.active_concurrency[ip] >= self.max_concurrent:
                return False, "Too many concurrent requests", 5

            # Sliding window check
            window_start = now - 60
            recent = [t for t in self.requests[ip] if t > window_start]
            if len(recent) >= self.rpm:
                self.requests[ip] = recent
                oldest = recent[0]
                retry_after = max(1, int(60 - (now - oldest)))
                return False, "Rate limit exceeded", retry_after

            recent.append(now)
            self.requests[ip] = recent
            self.active_concurrency[ip] += 1
            return True, "", 0

    def release(self, ip):
        """Decrement active concurrency counter."""
        with self.lock:
            if self.active_concurrency[ip] > 0:
                self.active_concurrency[ip] -= 1


def get_client_ip():
    """Extract client IP respecting standard reverse-proxy headers safely."""
    # Vercel / Cloudflare / reverse proxy headers
    x_forwarded = request.headers.get("X-Forwarded-For")
    if x_forwarded:
        # First IP in the comma-separated list is the original client
        return x_forwarded.split(",")[0].strip()
    return request.remote_addr or "127.0.0.1"


# Initialize rate limiter from environment
_configured_rpm = int(os.getenv("API_RATE_LIMIT", "120"))
limiter = IPRateLimiter(requests_per_minute=_configured_rpm, max_concurrent=30)


# Safe input sanitization patterns
SAFE_SLUG_REGEX = re.compile(r"^[a-zA-Z0-9_\-]+$")
SAFE_DATE_REGEX = re.compile(r"^\d{4}-?\d{2}-?\d{2}$")


def sanitize_string(val, max_len=100):
    """Sanitize arbitrary user string input, stripping dangerous chars."""
    if not val or not isinstance(val, str):
        return ""
    # Strip null bytes, script characters, path traversals
    clean = re.sub(r'[\x00\r\n\t<>"\'/\\]', '', val).strip()
    return clean[:max_len]


def validate_request_inputs():
    """
    Validate query parameters, path safety, and payload sizes.
    Returns None if valid, or a tuple (error_message, status_code).
    """
    # 1. Reject oversized requests
    if request.content_length and request.content_length > 1024 * 1024:
        return "Payload too large", 413

    if len(request.url) > 2048:
        return "Request URI too long", 414

    # 2. Check for null bytes or path traversal attempts
    raw_path_and_query = f"{request.path}?{request.query_string.decode('utf-8', errors='ignore')}"
    if "\x00" in raw_path_and_query or "../" in raw_path_and_query or "..\\" in raw_path_and_query:
        return "Invalid request path or parameters", 400

    # 3. Validate known query parameters
    args = request.args

    # Pagination bounds
    for int_param in ("limit", "per_page"):
        if int_param in args:
            val = args.get(int_param)
            if not val or not val.isdigit() or int(val) < 1 or int(val) > 100:
                return f"Invalid '{int_param}' value (must be 1-100)", 400

    for pos_param in ("page", "cursor"):
        if pos_param in args:
            val = args.get(pos_param)
            if not val or not val.isdigit() or int(val) < 0:
                return f"Invalid '{pos_param}' value (must be non-negative integer)", 400

    # Date validation
    for date_key in ("date", "dates[]"):
        for date_val in args.getlist(date_key):
            if date_val and (len(date_val) > 10 or not SAFE_DATE_REGEX.match(date_val)):
                return "Invalid date parameter (expected YYYY-MM-DD or YYYYMMDD)", 400

    # Season validation
    for season_key in ("season", "seasons[]"):
        for season_val in args.getlist(season_key):
            if season_val and (not season_val.isdigit() or len(season_val) != 4 or int(season_val) < 1900 or int(season_val) > 2100):
                return "Invalid season parameter (expected 4-digit year)", 400

    # Search length validation
    for search_key in ("search", "q"):
        search_val = args.get(search_key)
        if search_val and len(search_val) > 100:
            return "Search query too long (max 100 characters)", 400

    return None


def register_security_middleware(app):
    """Register request hooks, rate limiting, headers, and error handlers."""

    @app.before_request
    def security_before_request():
        # Exempt health check
        if request.path == "/api/health":
            return None

        # Rate limiting check (exempt test runner)
        if not current_app.config.get("TESTING"):
            client_ip = get_client_ip()
            allowed, reason, retry_after = limiter.acquire(client_ip)
            if not allowed:
                resp = jsonify({
                    "error": "Too many requests. Please slow down.",
                    "status": 429
                })
                resp.status_code = 429
                resp.headers["Retry-After"] = str(retry_after)
                resp.headers["Cache-Control"] = "no-store"
                return resp

        # Input validation runs on all requests
        validation_error = validate_request_inputs()
        if validation_error:
            msg, status_code = validation_error
            resp = jsonify({"error": msg, "status": status_code})
            resp.status_code = status_code
            resp.headers["Cache-Control"] = "no-store"
            return resp

        return None

    @app.after_request
    def security_after_request(response):
        # Release in-flight concurrency count
        if not current_app.config.get("TESTING"):
            client_ip = get_client_ip()
            limiter.release(client_ip)

        # Apply security headers
        headers = response.headers
        headers["X-Content-Type-Options"] = "nosniff"
        headers["X-Frame-Options"] = "DENY"
        headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=(), payment=()"
        headers["Cross-Origin-Opener-Policy"] = "same-origin"

        # Content Security Policy (strict defaults for API and frontend embed protection)
        csp = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self' http://localhost:* ws://localhost:* https://site.api.espn.com https://site.web.api.espn.com; "
            "frame-ancestors 'none'; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )
        headers["Content-Security-Policy"] = csp

        # Error status responses must never be cached by CDN or browser
        if response.status_code >= 400:
            headers["Cache-Control"] = "no-store"

        return response

    # Safe error handlers — no stack traces or internal secrets leak to client
    @app.errorhandler(400)
    def handle_bad_request(e):
        return jsonify({"error": "Bad request", "status": 400}), 400

    @app.errorhandler(404)
    def handle_not_found(e):
        return jsonify({"error": "Resource not found", "status": 404}), 404

    @app.errorhandler(405)
    def handle_method_not_allowed(e):
        return jsonify({"error": "Method not allowed", "status": 405}), 405

    @app.errorhandler(429)
    def handle_rate_limit(e):
        return jsonify({"error": "Too many requests. Please slow down.", "status": 429}), 429

    @app.errorhandler(500)
    def handle_server_error(e):
        logger.error(f"[SECURITY 500] Unhandled error: {e}", exc_info=True)
        return jsonify({"error": "Internal server error", "status": 500}), 500

    @app.errorhandler(Exception)
    def handle_generic_exception(e):
        logger.error(f"[SECURITY UNHANDLED] Exception: {e}", exc_info=True)
        return jsonify({"error": "Internal server error", "status": 500}), 500
