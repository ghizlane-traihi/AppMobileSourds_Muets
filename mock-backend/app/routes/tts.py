from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def tts_test():
    return {"message": "TTS route works"}