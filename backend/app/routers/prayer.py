from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, PrayerLog, RewardMilestone, AppSetting
from app.schemas import PrayerLogCreate, PrayerLogResponse, PrayerTimesResponse, RewardMilestoneResponse, AppSettingResponse
from app.auth import get_current_user
from app.config import settings
from app.services.prayer_times import fetch_prayer_times

router = APIRouter(prefix="/api/prayer", tags=["prayer"])


@router.get("/times/{region}", response_model=PrayerTimesResponse)
def get_prayer_times(region: str):
    times = fetch_prayer_times(region)
    if "error" in times:
        raise HTTPException(status_code=502, detail=times["error"])
    return PrayerTimesResponse(**times)


@router.post("/log", response_model=PrayerLogResponse)
def log_prayer(
    req: PrayerLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    golden_window_end = req.prayer_time + timedelta(minutes=settings.GOLDEN_WINDOW_MINUTES)
    is_within_window = now <= golden_window_end

    # Calculate points
    is_kid = current_user.age < 15
    base = settings.KIDS_BASE_POINTS if is_kid else settings.ADULTS_BASE_POINTS
    bonus = settings.KIDS_BONUS_POINTS if is_kid else settings.ADULTS_BONUS_POINTS

    points = base
    is_approved = True

    if is_within_window:
        points += bonus
    elif current_user.gender == "Male" and req.is_congregation:
        points += bonus
    elif current_user.gender == "Female" and req.is_early_time:
        points += bonus

    # Flag for admin review if outside golden window
    if not is_within_window:
        is_approved = False

    log = PrayerLog(
        user_id=current_user.id,
        prayer_name=req.prayer_name,
        logged_at=now,
        prayer_time=req.prayer_time,
        is_within_golden_window=is_within_window,
        is_congregation=req.is_congregation if current_user.gender == "Male" else False,
        is_early_time=req.is_early_time if current_user.gender == "Female" else False,
        points_awarded=points,
        is_approved=is_approved,
    )
    db.add(log)
    db.flush()

    # Check reward milestones
    new_total = current_user.total_points + points
    for milestone in settings.REWARD_MILESTONES:
        if new_total >= milestone > current_user.total_points:
            existing = db.query(RewardMilestone).filter(
                RewardMilestone.user_id == current_user.id,
                RewardMilestone.milestone_points == milestone,
            ).first()
            if not existing:
                db.add(RewardMilestone(
                    user_id=current_user.id,
                    milestone_points=milestone,
                ))

    db.commit()
    db.refresh(log)
    return log


@router.get("/logs", response_model=list[PrayerLogResponse])
def get_my_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50,
):
    logs = (
        db.query(PrayerLog)
        .filter(PrayerLog.user_id == current_user.id)
        .order_by(PrayerLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return logs


@router.get("/settings", response_model=AppSettingResponse)
def get_prayer_settings(
    db: Session = Depends(get_db),
):
    setting = db.query(AppSetting).filter(AppSetting.key == "golden_window_minutes").first()
    gw = int(setting.value) if setting else settings.GOLDEN_WINDOW_MINUTES
    return AppSettingResponse(golden_window_minutes=gw)


@router.get("/rewards", response_model=list[RewardMilestoneResponse])
def get_my_rewards(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rewards = (
        db.query(RewardMilestone)
        .filter(RewardMilestone.user_id == current_user.id)
        .order_by(RewardMilestone.created_at.desc())
        .all()
    )
    result = []
    for rw in rewards:
        r = RewardMilestoneResponse.model_validate(rw)
        r.user_name = current_user.first_name
        result.append(r)
    return result
