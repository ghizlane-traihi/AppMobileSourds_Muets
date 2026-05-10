from pydantic import BaseModel, Field


class TranscriptionResponse(BaseModel):
    text: str = Field(..., description="Transcribed text extracted from the audio.")
    language: str = Field(..., description="Detected language code.")
    duration: float = Field(..., ge=0, description="Audio duration in seconds.")


class ErrorResponse(BaseModel):
    detail: str = Field(..., description="Error message.")


class SignRecognitionResponse(BaseModel):
    text: str
    confidence: float
    signs_detected: list[str]


class TTSRequest(BaseModel):
    text: str
    language: str
