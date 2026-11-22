import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from features.language_detector.router import router as language_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("nlp_service")

app = FastAPI(
    title="Multilingual College Assistant - NLP Service",
    version="1.0.0",
    description="NLP microservice supporting English, Hindi, Gujarati, Hinglish, and Gujlish."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register feature routers
app.include_router(language_router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "nlp-service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

