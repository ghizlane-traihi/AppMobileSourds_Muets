from gtts import gTTS


def text_to_speech(text: str, output_path: str) -> None:
    """
    Transforme un texte en fichier audio MP3.
    """

    tts = gTTS(
        text=text,
        lang="fr"
    )

    tts.save(output_path)
