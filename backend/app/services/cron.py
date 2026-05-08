import logging
from datetime import datetime, date, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from app.config import settings

logger = logging.getLogger("salwat.cron")


def init_scheduler(app):
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        func=weekly_reset_job,
        trigger="cron",
        day_of_week="sat",
        hour=0,
        minute=0,
        id="weekly_leaderboard_reset",
        replace_existing=True,
        # Pass a function reference that gets db session via app state
    )
    scheduler.start()
    logger.info("Cron scheduler started. Weekly reset set for Saturday 00:00")
    return scheduler


def weekly_reset_job():
    """
    Called by APScheduler every Saturday at midnight.
    Snapshots current leaderboard positions into weekly_leaderboards table,
    archives the snapshot, and resets all user points to 0.
    """
    from app.database import SessionLocal
    from app.models import User, WeeklyLeaderboard

    db = SessionLocal()
    try:
        today = date.today()
        # Calculate week start (previous Saturday)
        days_since_saturday = (today.weekday() - 5) % 7
        week_start = today - timedelta(days=days_since_saturday)
        week_end = week_start + timedelta(days=6)

        logger.info(f"Running weekly leaderboard reset: {week_start} to {week_end}")

        users = db.query(User).filter(User.role == "user").all()

        # Separate into categories and sort
        kids = sorted([u for u in users if u.age < 15], key=lambda u: u.total_points, reverse=True)
        adults = sorted([u for u in users if u.age >= 15], key=lambda u: u.total_points, reverse=True)

        # Archive Kids
        for i, u in enumerate(kids):
            entry = WeeklyLeaderboard(
                user_id=u.id,
                week_start=week_start,
                week_end=week_end,
                total_points=u.total_points,
                rank=i + 1,
                category="Kids",
                is_archived=True,
            )
            db.add(entry)

        # Archive Adults
        for i, u in enumerate(adults):
            entry = WeeklyLeaderboard(
                user_id=u.id,
                week_start=week_start,
                week_end=week_end,
                total_points=u.total_points,
                rank=i + 1,
                category="Adults",
                is_archived=True,
            )
            db.add(entry)

        # Reset points
        db.query(User).filter(User.role == "user").update({"total_points": 0})
        db.commit()
        logger.info(f"Weekly reset complete. Archived {len(kids)} kids, {len(adults)} adults.")

    except Exception as e:
        db.rollback()
        logger.error(f"Weekly reset failed: {e}")
    finally:
        db.close()
