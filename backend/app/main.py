from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.routers import auth, prayer, admin, leaderboard, archive
from app.services.cron import init_scheduler

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Salwat - Prayer Tracking App",
    description="Gamified prayer tracking for families",
    version="1.0.0",
)

# CORS - allow all origins for self-hosted
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(prayer.router)
app.include_router(admin.router)
app.include_router(leaderboard.router)
app.include_router(archive.router)


@app.on_event("startup")
async def startup():
    init_scheduler(app)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "Salwat"}
