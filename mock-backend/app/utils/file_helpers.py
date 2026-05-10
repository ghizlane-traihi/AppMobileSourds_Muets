from __future__ import annotations

import asyncio
import logging
import os
import shutil
import tempfile
from pathlib import Path
from typing import Final

from fastapi import UploadFile

logger = logging.getLogger(__name__)

SUPPORTED_AUDIO_EXTENSIONS: Final[frozenset[str]] = frozenset(
    {".wav", ".mp3", ".m4a", ".webm", ".ogg", ".flac"}
)
SUPPORTED_AUDIO_CONTENT_TYPES: Final[frozenset[str]] = frozenset(
    {
        "application/octet-stream",
        "audio/flac",
        "audio/m4a",
        "audio/mp4",
        "audio/mp3",
        "audio/mpeg",
        "audio/ogg",
        "audio/wav",
        "audio/webm",
        "audio/x-flac",
        "audio/x-m4a",
        "audio/x-wav",
        "video/webm",
    }
)
DEFAULT_MAX_FILE_SIZE_MB: Final[int] = 25
READ_CHUNK_SIZE: Final[int] = 1024 * 1024


class FileHelperError(Exception):
    """Base exception for upload file handling errors."""


class FileValidationError(FileHelperError):
    """Raised when the uploaded file does not meet validation rules."""


class TemporaryFileError(FileHelperError):
    """Raised when a temporary file cannot be created or deleted."""


def get_temp_directory() -> str | None:
    """Return the configured temporary directory, creating it if needed."""
    temp_dir = os.getenv("APP_TEMP_DIR")
    if not temp_dir:
        return None

    try:
        Path(temp_dir).mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        raise TemporaryFileError("Failed to initialize temporary directory.") from exc

    return temp_dir


def get_max_file_size_bytes() -> int:
    """Return the maximum allowed upload size in bytes."""
    configured_size = os.getenv("MAX_AUDIO_FILE_SIZE_MB", str(DEFAULT_MAX_FILE_SIZE_MB))

    try:
        max_size_mb = int(configured_size)
    except ValueError as exc:
        raise FileValidationError(
            "Invalid MAX_AUDIO_FILE_SIZE_MB environment variable."
        ) from exc

    if max_size_mb <= 0:
        raise FileValidationError("MAX_AUDIO_FILE_SIZE_MB must be greater than zero.")

    return max_size_mb * 1024 * 1024


def get_file_extension(filename: str | None) -> str:
    """Extract and normalize a filename extension."""
    if not filename:
        raise FileValidationError("Uploaded file must have a filename.")

    extension = Path(filename).suffix.lower()
    if not extension:
        raise FileValidationError("Uploaded file must include a valid extension.")

    return extension


def validate_audio_type(upload_file: UploadFile) -> str:
    """Validate file extension and content type for an audio upload."""
    extension = get_file_extension(upload_file.filename)
    if extension not in SUPPORTED_AUDIO_EXTENSIONS:
        raise FileValidationError(
            f"Unsupported audio format: '{extension}'. "
            f"Allowed formats: {', '.join(sorted(SUPPORTED_AUDIO_EXTENSIONS))}."
        )

    content_type = (upload_file.content_type or "").lower().strip()
    if content_type and content_type not in SUPPORTED_AUDIO_CONTENT_TYPES:
        raise FileValidationError(f"Unsupported content type: '{content_type}'.")

    return extension


async def _measure_upload_size(upload_file: UploadFile) -> int:
    """Measure upload size without consuming the stream position permanently."""

    def _measure() -> int:
        current_position = upload_file.file.tell()
        upload_file.file.seek(0, os.SEEK_END)
        size = upload_file.file.tell()
        upload_file.file.seek(current_position)
        return size

    return await asyncio.to_thread(_measure)


async def validate_audio_file(upload_file: UploadFile) -> str:
    """Validate file metadata, extension, and size before processing."""
    extension = validate_audio_type(upload_file)
    file_size = await _measure_upload_size(upload_file)
    max_size = get_max_file_size_bytes()

    if file_size <= 0:
        raise FileValidationError("Uploaded audio file is empty.")

    if file_size > max_size:
        max_size_mb = max_size // (1024 * 1024)
        raise FileValidationError(
            f"Uploaded audio file exceeds the {max_size_mb} MB size limit."
        )

    await upload_file.seek(0)
    return extension


async def save_temp_file(upload_file: UploadFile, temp_dir: str | None = None) -> str:
    """Persist an uploaded audio file to a temporary path and return it."""
    extension = await validate_audio_file(upload_file)
    destination_dir = temp_dir or get_temp_directory()

    try:
        temp_file = tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension,
            dir=destination_dir,
        )
        temp_path = temp_file.name
        temp_file.close()
    except OSError as exc:
        raise TemporaryFileError("Failed to create temporary audio file.") from exc

    try:
        await upload_file.seek(0)
        await asyncio.to_thread(_write_upload_to_disk, upload_file, temp_path)
        await upload_file.seek(0)
    except Exception as exc:
        cleanup_temp_file(temp_path)
        raise TemporaryFileError("Failed to save uploaded audio file.") from exc

    logger.info("Temporary audio file created at %s", temp_path)
    return temp_path


def _write_upload_to_disk(upload_file: UploadFile, destination: str) -> None:
    """Copy the uploaded file content to disk."""
    upload_file.file.seek(0)
    with open(destination, "wb") as output_file:
        shutil.copyfileobj(upload_file.file, output_file, READ_CHUNK_SIZE)
    upload_file.file.seek(0)


def cleanup_temp_file(file_path: str | None) -> None:
    """Delete a temporary file if it exists."""
    if not file_path:
        return

    try:
        path = Path(file_path)
        if path.exists():
            path.unlink()
            logger.info("Temporary audio file deleted: %s", file_path)
    except OSError as exc:
        logger.warning("Failed to delete temporary file %s: %s", file_path, exc)
