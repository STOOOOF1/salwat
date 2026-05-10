from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, PrayerLog, RewardMilestone, AppSetting
from app.schemas import PrayerLogCreate, PrayerLogResponse, PrayerTimesResponse, RewardMilestoneResponse, AppSettingResponse
from app.auth import get_current_user
from app.config import settings
from app.services.prayer_times import fetch_prayer_times
from app.services.settings_helper import get_points_config, get_reward_milestones

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
    pc = get_points_config(db)
    gw = pc["golden_window_minutes"]
    golden_window_end = req.prayer_time + timedelta(minutes=gw)
    is_within_window = now <= golden_window_end

    # Calculate points
    is_kid = current_user.age < 15
    base = pc["kids_base_points"] if is_kid else pc["adults_base_points"]
    bonus = pc["kids_bonus_points"] if is_kid else pc["adults_bonus_points"]

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

    # Prevent duplicate: same prayer on same date
    sa_tz = timezone(timedelta(hours=3))
    day_start = req.prayer_time.astimezone(sa_tz).replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
    day_end = day_start + timedelta(days=1)
    existing = db.query(PrayerLog).filter(
        PrayerLog.user_id == current_user.id,
        PrayerLog.prayer_name == req.prayer_name,
        PrayerLog.prayer_time >= day_start,
        PrayerLog.prayer_time < day_end,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="تم تسجيل هذه الصلاة مسبقاً لهذا اليوم")

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

    # Update total_points directly
    old_total = current_user.total_points
    if is_approved:
        current_user.total_points += points

    # Check reward milestones
    new_total = old_total + points
    milestones = get_reward_milestones(db)
    for milestone in milestones:
        if new_total >= milestone > old_total:
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
    pc = get_points_config(db)
    rm = get_reward_milestones(db)
    return AppSettingResponse(
        golden_window_minutes=pc["golden_window_minutes"],
        kids_base_points=pc["kids_base_points"],
        kids_bonus_points=pc["kids_bonus_points"],
        adults_base_points=pc["adults_base_points"],
        adults_bonus_points=pc["adults_bonus_points"],
        reward_milestones=rm,
    )


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
