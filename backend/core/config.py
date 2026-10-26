"""
Core configuration and environment loading.
Provides fail-fast startup validation and secure env access.
"""
import os
import sys
from pathlib import Path


def load_dotenv_file(filepath=None):
    """
    Zero-dependency pure-Python .env file parser.
    Loads variables into os.environ if not already present.
    """
    if filepath is None:
        root = Path(__file__).resolve().parent.parent.parent
        filepath = root / ".env"
    else:
        filepath = Path(filepath)

    if not filepath.is_file():
        return

    try:
        content = filepath.read_text(encoding="utf-8")
        for line in content.splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip()
                if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                    val = val[1:-1]
                if key and key not in os.environ:
                    os.environ[key] = val
    except Exception as e:
        print(f"[CONFIG] Notice: could not parse .env file: {e}", file=sys.stderr)


# Auto-load on import so backend modules immediately have environment variables
load_dotenv_file()


def get_allowed_cors_origins():
    """Return list of allowed CORS origins from env or default local origins."""
    env_origins = os.getenv("CORS_ALLOWED_ORIGINS", "")
    default_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5000",
        "http://127.0.0.1:5000",
    ]
    if env_origins.strip():
        custom = [o.strip() for o in env_origins.split(",") if o.strip()]
        return list(set(default_origins + custom))
    return default_origins


def validate_environment(testing=False):
    """
    Validates required environment variables at application startup.
    Fails fast with descriptive error message if missing.
    """
    if testing or os.getenv("TESTING") == "1" or "pytest" in sys.modules:
        return True

    errors = []

    # API-Sports validation
    use_api_sports = os.getenv("USE_API_SPORTS", "false").lower() in ("true", "1", "yes")
    api_sports_key = (os.getenv("API_SPORTS_KEY") or os.getenv("NFL_API_KEY") or "").strip()
    if use_api_sports and not api_sports_key:
        errors.append(
            "USE_API_SPORTS is enabled, but API_SPORTS_KEY (or NFL_API_KEY) is missing. "
            "Please configure API_SPORTS_KEY in your .env or environment."
        )

    # In production environments, check for essential keys
    is_prod = os.getenv("FLASK_ENV") == "production" or os.getenv("VERCEL") == "1"
    bdl_key = (os.getenv("BALLDONTLIE_API_KEY") or os.getenv("NBA_API_KEY") or "").strip()
    if is_prod and not bdl_key:
        errors.append(
            "BALLDONTLIE_API_KEY (or NBA_API_KEY) is required in production mode. "
            "Please configure it in your deployment environment."
        )

    if errors:
        msg = "\n[STARTUP ERROR] Environment configuration validation failed:\n" + "\n".join(f" - {err}" for err in errors)
        print(msg, file=sys.stderr)
        raise RuntimeError(msg)

    return True
