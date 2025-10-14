# prompt_cache.py
import hashlib
from typing import List

def normalize_prefix(parts: List[str]) -> str:
    """Joins multiple static prompt parts and cleans whitespace for stable caching."""
    text = "\n\n".join(p.strip() for p in parts if p and p.strip())
    # Remove trailing spaces but preserve newlines
    return "\n".join(line.rstrip() for line in text.splitlines())

def cache_key(model: str, prefix: str) -> str:
    """Creates a stable hash key for a given model + system prefix."""
    return f"{model}:{hashlib.sha256(prefix.encode('utf-8')).hexdigest()[:16]}"
