from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date, timedelta
from app.database import get_db
from app.models import User
from app.schemas import LeaderboardResponse, LeaderboardEntry
from app.auth import get_current_user

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


def get_week_range() -> tuple[date, date]:
    today = date.today()
    # Saturday = 5 in Python's weekday (Mon=0, Sun=6)
    days_to_saturday = (today.weekday() - 5) % 7
    week_start = today - timedelta(days=days_to_saturday)
    week_end = week_start + timedelta(days=6)
    return week_start, week_end


@router.get("/{category}", response_model=LeaderboardResponse)
def get_leaderboard(
    category: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    if category not in ("Kids", "Adults"):
        return LeaderboardResponse(
            category=category,
            week_start=date.today(),
            week_end=date.today(),
            entries=[],
        )
    users = (
        db.query(User)
        .filter(User.role == "user")
        .all()
    )
    filtered = [u for u in users if u.category == category and u.show_leaderboard is not False]
    filtered.sort(key=lambda u: u.total_points, reverse=True)
    week_start, week_end = get_week_range()
    entries = [
        LeaderboardEntry(
            rank=i + 1,
            user_id=u.id,
            first_name=u.first_name,
            age=u.age,
            gender=u.gender,
            total_points=u.total_points,
            category=u.category,
        )
        for i, u in enumerate(filtered)
    ]
    return LeaderboardResponse(
        category=category,
        week_start=week_start,
        week_end=week_end,
        entries=entries,
    )
