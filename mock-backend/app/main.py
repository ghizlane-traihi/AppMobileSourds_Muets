from __future__ import annotations

import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.models.schemas import ErrorResponse
from app.routes.speech import router as speech_router
from app.services.speech_service import (
    TranscriptionError,
    WhisperModelLoadError,
    WhisperModelSingleton,
)
from app.utils.file_helpers import FileValidationError, TemporaryFileError


def configure_logging() -> None:
    """Configure application-wide logging."""
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


configure_logging()
logger = logging.getLogger(__name__)


def serialize_schema(schema: ErrorResponse) -> dict[str, str]:
    """Serialize a Pydantic schema for either v1 or v2."""
    if hasattr(schema, "model_dump"):
        return schema.model_dump()
    return schema.dict()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await asyncio.to_thread(WhisperModelSingleton.get_model)
    yield


app = FastAPI(
    title="Speech-to-Text API",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(speech_router)


@app.exception_handler(FileValidationError)
async def file_validation_exception_handler(
    _: Request,
    exc: FileValidationError,
) -> JSONResponse:
    payload = ErrorResponse(detail=str(exc))
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=serialize_schema(payload),
    )


@app.exception_handler(TranscriptionError)
async def transcription_exception_handler(
    _: Request,
    exc: TranscriptionError,
) -> JSONResponse:
    payload = ErrorResponse(detail=str(exc))
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=serialize_schema(payload),
    )


@app.exception_handler(TemporaryFileError)
async def temporary_file_exception_handler(
    _: Request,
    exc: TemporaryFileError,
) -> JSONResponse:
    payload = ErrorResponse(detail=str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=serialize_schema(payload),
    )


@app.exception_handler(WhisperModelLoadError)
async def whisper_model_exception_handler(
    _: Request,
    exc: WhisperModelLoadError,
) -> JSONResponse:
    payload = ErrorResponse(detail=str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=serialize_schema(payload),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "Unhandled application error: %s",
        exc,
        exc_info=(type(exc), exc, exc.__traceback__),
    )
    payload = ErrorResponse(detail="Internal server error.")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=serialize_schema(payload),
    )


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
