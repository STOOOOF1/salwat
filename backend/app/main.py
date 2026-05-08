from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.routers import auth, prayer, admin, leaderboard, archive
from app.services.cron import init_scheduler

# Create tables
Base.metadata.create_all(bind=engine)

# Create triggers (defined in schema.sql) - idempotent
with engine.connect() as conn:
    conn.execute(text("""
        CREATE OR REPLACE FUNCTION update_user_points()
        RETURNS TRIGGER AS $$
        BEGIN
            IF TG_OP = 'INSERT' AND NEW.is_approved THEN
                UPDATE users SET total_points = total_points + NEW.points_awarded WHERE id = NEW.user_id;
            ELSIF TG_OP = 'UPDATE' AND NEW.is_approved = TRUE AND OLD.is_approved = FALSE THEN
                UPDATE users SET total_points = total_points + NEW.points_awarded WHERE id = NEW.user_id;
            ELSIF TG_OP = 'UPDATE' AND NEW.is_approved = FALSE AND OLD.is_approved = TRUE THEN
                UPDATE users SET total_points = total_points - OLD.points_awarded WHERE id = NEW.user_id;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """))
    conn.execute(text("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_prayer_logs_points') THEN
                CREATE TRIGGER trigger_prayer_logs_points
                AFTER INSERT OR UPDATE OF is_approved ON prayer_logs
                FOR EACH ROW
                EXECUTE FUNCTION update_user_points();
            END IF;
        END $$;
    """))
    conn.commit()

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
