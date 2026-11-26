from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

BASE_DIR = Path(__file__).resolve().parent.parent
MEDIA_DIR = BASE_DIR / "media_library"
AUDIO_DIR = MEDIA_DIR / "audio"
VIDEO_DIR = MEDIA_DIR / "video"
METADATA_FILE = MEDIA_DIR / "media_index.json"

for folder in (AUDIO_DIR, VIDEO_DIR):
    folder.mkdir(parents=True, exist_ok=True)

router = APIRouter(prefix="/media", tags=["Media Library"])
_index_lock = Lock()

AUDIO_EXTENSIONS = {".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac", ".webm"}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".m4v", ".avi", ".mkv"}
MAX_AUDIO_BYTES = 50 * 1024 * 1024
MAX_VIDEO_BYTES = 200 * 1024 * 1024


def _read_index():
    try:
        data = json.loads(METADATA_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def _write_index(items):
    temp = METADATA_FILE.with_suffix(".tmp")
    temp.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
    temp.replace(METADATA_FILE)


@router.get("/list")
def list_media(kind: str = "all"):
    if kind not in {"all", "audio", "video"}:
        raise HTTPException(status_code=400, detail="kind must be all, audio or video")
    with _index_lock:
        items = _read_index()
    return {"items": [item for item in items if kind == "all" or item["kind"] == kind]}


@router.post("/upload")
def upload_media(file: UploadFile = File(...), kind: str = ""):
    original = Path(file.filename or "").name
    suffix = Path(original).suffix.lower()
    if kind not in {"audio", "video"}:
        raise HTTPException(status_code=400, detail="Choose audio or video media type")
    allowed = AUDIO_EXTENSIONS if kind == "audio" else VIDEO_EXTENSIONS
    limit = MAX_AUDIO_BYTES if kind == "audio" else MAX_VIDEO_BYTES
    if suffix not in allowed:
        raise HTTPException(status_code=415, detail=f"Unsupported {kind} file format")

    media_id = uuid.uuid4().hex
    stored_name = f"{media_id}{suffix}"
    destination = (AUDIO_DIR if kind == "audio" else VIDEO_DIR) / stored_name
    total = 0
    try:
        with destination.open("wb") as target:
            while chunk := file.file.read(1024 * 1024):
                total += len(chunk)
                if total > limit:
                    target.close()
                    destination.unlink(missing_ok=True)
                    raise HTTPException(status_code=413, detail=f"File exceeds {limit // (1024 * 1024)} MB limit")
                target.write(chunk)
    finally:
        file.file.close()

    item = {
        "id": media_id,
        "kind": kind,
        "title": original,
        "filename": stored_name,
        "size_bytes": total,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "url": f"/media/file/{kind}/{stored_name}",
    }
    with _index_lock:
        items = _read_index()
        items.insert(0, item)
        _write_index(items)
    return {"item": item, "message": "Media uploaded successfully"}


@router.get("/file/{kind}/{filename}")
def get_media_file(kind: str, filename: str):
    if kind not in {"audio", "video"} or Path(filename).name != filename:
        raise HTTPException(status_code=404, detail="Media not found")
    folder = AUDIO_DIR if kind == "audio" else VIDEO_DIR
    path = folder / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Media not found")
    return FileResponse(path)


@router.delete("/{media_id}")
def delete_media(media_id: str):
    with _index_lock:
        items = _read_index()
        target = next((item for item in items if item.get("id") == media_id), None)
        if not target:
            raise HTTPException(status_code=404, detail="Media not found")
        folder = AUDIO_DIR if target["kind"] == "audio" else VIDEO_DIR
        (folder / target["filename"]).unlink(missing_ok=True)
        _write_index([item for item in items if item.get("id") != media_id])
    return {"message": "Media deleted successfully"}
