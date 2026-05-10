from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def sign_test():
    return {"message": "Sign route works"}