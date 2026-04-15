import re
import uuid
from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings


def _safe_filename(name: str) -> str:
    base = Path(name).name
    base = re.sub(r"[^a-zA-Z0-9._-]+", "_", base)
    return base[:200] if base else "file"


async def save_upload_file(project_id: int, file: UploadFile) -> tuple[str, int, str | None]:
    """Returns (relative_storage_path, size_bytes, content_type)."""
    root = Path(settings.upload_dir)
    uid = uuid.uuid4().hex
    safe = _safe_filename(file.filename or "upload")
    rel = f"{project_id}/{uid}_{safe}"
    dest = root / rel
    dest.parent.mkdir(parents=True, exist_ok=True)

    size = 0
    chunk = 1024 * 1024
    with dest.open("wb") as out:
        while True:
            data = await file.read(chunk)
            if not data:
                break
            size += len(data)
            if size > settings.max_upload_bytes:
                dest.unlink(missing_ok=True)
                raise ValueError("File too large")
            out.write(data)

    return rel, size, file.content_type


def absolute_path(relative: str) -> Path:
    return Path(settings.upload_dir) / relative
