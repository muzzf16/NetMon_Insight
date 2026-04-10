from fastapi import FastAPI

from app.api.routes import router

app = FastAPI(
    title="NetMon Insight API",
    version="0.1.0",
    description="Starter backend for network and server monitoring",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(router)
