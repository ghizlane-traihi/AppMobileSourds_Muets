import whisper

# Chargement du modèle Whisper
# "base" = bon compromis entre précision et vitesse
model = whisper.load_model("small")


def transcribe_audio(audio_path: str) -> str:
    """
    Transcrit un fichier audio en français avec Whisper.
    """

    result = model.transcribe(
        audio_path,
        language="fr",
        task="transcribe",
        fp16=False,
        temperature=0,
        condition_on_previous_text=False
    )

    text = result["text"].strip()

    return text
