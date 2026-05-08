from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import date
from app.database import get_db
from app.models import WeeklyLeaderboard
from app.schemas import LeaderboardEntry
from app.auth import get_current_user
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

router = APIRouter(prefix="/api/archive", tags=["archive"])


class ArchivedWeek(BaseModel):
    week_start: date
    week_end: date
    category: str

    class Config:
        from_attributes = True


class ArchivedEntry(BaseModel):
    rank: int
    user_name: str
    total_points: int

    class Config:
        from_attributes = True


@router.get("/weeks", response_model=List[ArchivedWeek])
def list_archived_weeks(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    weeks = (
        db.query(WeeklyLeaderboard.week_start, WeeklyLeaderboard.week_end, WeeklyLeaderboard.category)
        .filter(WeeklyLeaderboard.is_archived == True)
        .distinct()
        .order_by(desc(WeeklyLeaderboard.week_start))
        .all()
    )
    seen = set()
    result = []
    for w in weeks:
        key = (w.week_start.isoformat(), w.week_end.isoformat(), w.category)
        if key not in seen:
            seen.add(key)
            result.append(ArchivedWeek(week_start=w.week_start, week_end=w.week_end, category=w.category))
    return result


@router.get("/leaderboard")
def get_archived_leaderboard(
    week_start: str,
    week_end: str,
    category: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    entries = (
        db.query(WeeklyLeaderboard)
        .filter(
            WeeklyLeaderboard.week_start == date.fromisoformat(week_start),
            WeeklyLeaderboard.week_end == date.fromisoformat(week_end),
            WeeklyLeaderboard.category == category,
            WeeklyLeaderboard.is_archived == True,
        )
        .order_by(WeeklyLeaderboard.rank)
        .all()
    )
    return [
        ArchivedEntry(rank=e.rank, user_name=e.user.first_name, total_points=e.total_points)
        for e in entries
    ]
