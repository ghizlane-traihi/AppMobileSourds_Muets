from fastapi import APIRouter, File, UploadFile, status

from app.models.schemas import ErrorResponse, TranscriptionResponse
from app.services.speech_service import transcribe_audio

router = APIRouter(prefix="/speech", tags=["speech"])


@router.post(
    "/",
    response_model=TranscriptionResponse,
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse},
    },
    summary="Transcribe an audio file with Whisper",
)
async def speech_to_text(
    audio: UploadFile = File(
        ...,
        description="Audio file to transcribe (wav, mp3, m4a, webm, ogg, flac).",
    ),
) -> TranscriptionResponse:
    return await transcribe_audio(audio)
