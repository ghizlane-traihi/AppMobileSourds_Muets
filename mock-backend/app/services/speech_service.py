from __future__ import annotations

import asyncio
import logging
import os
from threading import Lock
from typing import Any

import mutagen
import whisper
from fastapi import UploadFile

from app.models.schemas import TranscriptionResponse
from app.utils.file_helpers import cleanup_temp_file, save_temp_file

logger = logging.getLogger(__name__)


class SpeechServiceError(Exception):
    """Base exception for speech processing errors."""


class WhisperModelLoadError(SpeechServiceError):
    """Raised when the Whisper model cannot be loaded."""


class TranscriptionError(SpeechServiceError):
    """Raised when audio transcription fails."""


class WhisperModelSingleton:
    """Lazy-loaded singleton wrapper around the Whisper model."""

    _model: Any | None = None
    _lock = Lock()

    @classmethod
    def get_model(cls) -> Any:
        if cls._model is not None:
            return cls._model

        with cls._lock:
            if cls._model is not None:
                return cls._model

            model_name = os.getenv("WHISPER_MODEL_SIZE", "base")
            device = os.getenv("WHISPER_DEVICE")

            try:
                logger.info("Loading Whisper model '%s'", model_name)
                cls._model = whisper.load_model(name=model_name, device=device)
                logger.info("Whisper model '%s' loaded successfully", model_name)
            except Exception as exc:
                logger.exception("Failed to load Whisper model '%s'", model_name)
                raise WhisperModelLoadError("Failed to load Whisper model.") from exc

        return cls._model


def _extract_duration(file_path: str, result: dict[str, Any]) -> float:
    """Extract audio duration using metadata with transcription fallback."""
    try:
        audio_file = mutagen.File(file_path)
        if audio_file is not None and audio_file.info is not None:
            length = getattr(audio_file.info, "length", None)
            if length is not None:
                return round(float(length), 2)
    except Exception:
        logger.warning("Unable to read audio metadata for duration: %s", file_path)

    segments = result.get("segments") or []
    if segments:
        last_segment = segments[-1]
        end_time = last_segment.get("end")
        if end_time is not None:
            return round(float(end_time), 2)

    return 0.0


def _transcribe_file(file_path: str) -> dict[str, Any]:
    """Run Whisper transcription against a local audio file."""
    model = WhisperModelSingleton.get_model()

    try:
        result = model.transcribe(
            file_path,
            fp16=False,
            verbose=False,
        )
    except Exception as exc:
        logger.exception("Whisper transcription failed for %s", file_path)
        raise TranscriptionError("Failed to transcribe the provided audio.") from exc

    text = (result.get("text") or "").strip()
    if not text:
        raise TranscriptionError("No speech detected in the provided audio.")

    return {
        "text": text,
        "language": result.get("language") or "unknown",
        "duration": _extract_duration(file_path, result),
    }


async def transcribe_audio(upload_file: UploadFile) -> TranscriptionResponse:
    """Validate, persist, transcribe, and clean up an uploaded audio file."""
    temp_path: str | None = None

    try:
        temp_path = await save_temp_file(upload_file)
        result = await asyncio.to_thread(_transcribe_file, temp_path)
        return TranscriptionResponse(**result)
    finally:
        cleanup_temp_file(temp_path)
