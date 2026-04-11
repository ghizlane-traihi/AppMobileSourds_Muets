from __future__ import annotations

import io
import math
import wave
from urllib.parse import urlencode

from fastapi import FastAPI, File, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from PIL import Image, ImageDraw, ImageFont
from pydantic import BaseModel

app = FastAPI(
    title="SignLink Demo Backend",
    description=(
        "Mock backend used to test the SignLink mobile frontend when the real "
        "FastAPI backend is not available."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEMO_TRANSCRIPTS = [
    "Hello and welcome to SignLink",
    "How are you today",
    "I would like to learn sign language",
    "Thank you for using the demo backend",
]


class TextToSpeechPayload(BaseModel):
    text: str


def absolute_url(request: Request, path: str, query_params: dict[str, str] | None = None) -> str:
    base = str(request.base_url).rstrip("/")
    url = f"{base}{path}"

    if query_params:
        url = f"{url}?{urlencode(query_params)}"

    return url


def pick_demo_transcript(seed: int) -> str:
    return DEMO_TRANSCRIPTS[seed % len(DEMO_TRANSCRIPTS)]


def build_sign_assets(request: Request, transcript: str) -> list[dict[str, str]]:
    words = [word.strip(".,!?").lower() for word in transcript.split() if word.strip(".,!?")]
    selected_words = words[: min(4, len(words))] or ["hello"]

    return [
        {
            "id": f"sign-{index}",
            "label": word.replace("-", " ").title(),
            "type": "image",
            "uri": absolute_url(
                request,
                f"/media/signs/{word}.png",
                {"label": word.replace("-", " ").title()},
            ),
        }
        for index, word in enumerate(selected_words)
    ]


def generate_wave_bytes(text: str) -> bytes:
    frame_rate = 22050
    segment_duration = 0.12
    volume = 0.25
    pause_samples = int(frame_rate * 0.02)
    frames: list[int] = []

    filtered_chars = [char for char in text.upper() if char.isalpha()][:18] or ["A", "I"]

    for index, char in enumerate(filtered_chars):
        frequency = 320 + ((ord(char) - 65) % 12) * 35
        sample_count = max(1, int(frame_rate * segment_duration))

        for sample_index in range(sample_count):
            sample = volume * math.sin(2 * math.pi * frequency * (sample_index / frame_rate))
            frames.append(int(sample * 32767))

        if index < len(filtered_chars) - 1:
            frames.extend([0] * pause_samples)

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(frame_rate)
        wav_file.writeframes(b"".join(frame.to_bytes(2, "little", signed=True) for frame in frames))

    return buffer.getvalue()


def draw_centered_text(
    image_draw: ImageDraw.ImageDraw,
    area: tuple[int, int, int, int],
    text: str,
    font: ImageFont.ImageFont,
    fill: str,
) -> None:
    left, top, right, bottom = area
    bbox = image_draw.multiline_textbbox((0, 0), text, font=font, spacing=8, align="center")
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = left + ((right - left - text_width) / 2)
    y = top + ((bottom - top - text_height) / 2)
    image_draw.multiline_text((x, y), text, font=font, fill=fill, spacing=8, align="center")


def load_font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype("DejaVuSans.ttf", size)
    except OSError:
        return ImageFont.load_default()


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/speech/to-text")
async def speech_to_text(request: Request, file: UploadFile = File(...)) -> JSONResponse:
    contents = await file.read()
    transcript = pick_demo_transcript(len(contents) or len(file.filename or "demo"))
    payload = {
        "text": transcript,
        "signs": build_sign_assets(request, transcript),
    }
    return JSONResponse(payload)


@app.post("/sign/recognize")
async def sign_recognize(request: Request, file: UploadFile = File(...)) -> JSONResponse:
    contents = await file.read()
    transcript = pick_demo_transcript((len(contents) or 1) + 1)

    return JSONResponse(
        {
            "text": transcript,
            "audio_url": absolute_url(
                request,
                "/media/audio/mock-tts.wav",
                {"text": transcript},
            ),
            "confidence": 0.97,
        }
    )


@app.post("/tts/synthesize")
async def text_to_speech(request: Request, payload: TextToSpeechPayload) -> JSONResponse:
    transcript = payload.text.strip() or "Demo voice"

    return JSONResponse(
        {
            "text": transcript,
            "audio_url": absolute_url(
                request,
                "/media/audio/mock-tts.wav",
                {"text": transcript},
            ),
        }
    )


@app.get("/media/audio/mock-tts.wav")
async def media_audio(text: str = "Demo voice") -> Response:
    audio_bytes = generate_wave_bytes(text)
    return Response(content=audio_bytes, media_type="audio/wav")


@app.get("/media/signs/{slug}.png")
async def media_sign(slug: str, label: str | None = None) -> Response:
    safe_label = (label or slug.replace("-", " ").title())[:24]

    image = Image.new("RGB", (720, 480), color="#E0F2FE")
    draw = ImageDraw.Draw(image)
    title_font = load_font(34)
    body_font = load_font(22)

    draw.rounded_rectangle((28, 28, 692, 452), radius=28, fill="#FFFFFF", outline="#93C5FD", width=4)
    draw.rounded_rectangle((56, 56, 664, 180), radius=22, fill="#0F172A")
    draw_centered_text(draw, (56, 56, 664, 180), "Sign Demo", title_font, "#FFFFFF")
    draw_centered_text(draw, (90, 210, 630, 360), safe_label, title_font, "#0F172A")
    draw_centered_text(
        draw,
        (90, 360, 630, 420),
        "Mock visual generated by the local FastAPI demo backend",
        body_font,
        "#334155",
    )

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return Response(content=buffer.getvalue(), media_type="image/png")
