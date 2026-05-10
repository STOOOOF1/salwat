from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime, timezone, timedelta, date
from app.database import get_db
from app.models import User, PrayerLog, RewardMilestone, AppSetting, WeeklyLeaderboard
from app.schemas import (
    UserCreate, UserUpdate, UserResponse, UserWithPinResponse,
    PrayerLogResponse, PrayerLogApprove,
    RewardMilestoneResponse, RewardApproveRequest,
    PinResetRequest, AttendanceRequest,
)
from app.auth import hash_pin, get_current_user, require_admin
from app.config import settings
from app.services.settings_helper import get_points_config, get_int_setting, set_setting, get_reward_milestones

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ---- User Management ----

@router.get("/users", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db), _=Depends(require_admin)):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.post("/users", response_model=UserResponse)
def create_user(req: UserCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    existing = db.query(User).filter(User.first_name.ilike(req.first_name.strip())).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this name already exists")
    user = User(
        first_name=req.first_name.strip(),
        age=req.age,
        gender=req.gender,
        region=req.region,
        pin_hash=hash_pin(req.pin),
        role=req.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(user_id: UUID, req: UserUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
def delete_user(user_id: UUID, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}


@router.put("/users/{user_id}/reset-pin", response_model=UserResponse)
def reset_user_pin(
    user_id: UUID,
    req: PinResetRequest,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.pin_hash = hash_pin(req.new_pin)
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/reset-points", response_model=UserResponse)
def reset_user_points(
    user_id: UUID,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.total_points = 0
    db.query(PrayerLog).filter(PrayerLog.user_id == user_id).delete()
    db.commit()
    db.refresh(user)
    return user


# ---- Prayer Log Audit ----

@router.get("/logs", response_model=list[PrayerLogResponse])
def list_all_logs(
    pending_only: bool = False,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    query = db.query(PrayerLog)
    if pending_only:
        query = query.filter(PrayerLog.is_approved == False)
    logs = query.order_by(PrayerLog.created_at.desc()).limit(100).all()
    # Attach user name
    result = []
    for log in logs:
        r = PrayerLogResponse.model_validate(log)
        r.user_name = log.user.first_name if log.user else None
        result.append(r)
    return result


@router.patch("/logs/{log_id}", response_model=PrayerLogResponse)
def approve_log(
    log_id: UUID,
    req: PrayerLogApprove,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    log = db.query(PrayerLog).filter(PrayerLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    log.is_approved = req.is_approved
    log.approved_by = admin.id
    if req.override_points is not None:
        log.points_awarded = req.override_points
    if req.notes is not None:
        log.notes = req.notes
    db.commit()
    db.refresh(log)
    r = PrayerLogResponse.model_validate(log)
    r.user_name = log.user.first_name if log.user else None
    return r


# ---- Reward Management ----

@router.get("/rewards", response_model=list[RewardMilestoneResponse])
def list_rewards(
    pending_only: bool = True,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    query = db.query(RewardMilestone)
    if pending_only:
        query = query.filter(RewardMilestone.is_approved == False)
    rewards = query.order_by(RewardMilestone.created_at.desc()).all()
    result = []
    for rw in rewards:
        r = RewardMilestoneResponse.model_validate(rw)
        r.user_name = rw.user.first_name if rw.user else ""
        result.append(r)
    return result


@router.patch("/rewards/{reward_id}", response_model=RewardMilestoneResponse)
def approve_reward(
    reward_id: UUID,
    req: RewardApproveRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    rw = db.query(RewardMilestone).filter(RewardMilestone.id == reward_id).first()
    if not rw:
        raise HTTPException(status_code=404, detail="Reward not found")
    rw.is_approved = req.is_approved
    rw.approved_by = admin.id
    from datetime import datetime, timezone
    rw.approved_at = datetime.now(timezone.utc) if req.is_approved else None
    db.commit()
    db.refresh(rw)
    r = RewardMilestoneResponse.model_validate(rw)
    r.user_name = rw.user.first_name if rw.user else ""
    return r


# ---- Leaderboard Visibility ----

@router.post("/users/{user_id}/toggle-leaderboard", response_model=UserResponse)
def toggle_leaderboard(
    user_id: UUID,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.show_leaderboard = not user.show_leaderboard
    db.commit()
    db.refresh(user)
    return user


# ---- Attendance (تحضير) ----

@router.post("/attendance")
def mark_attendance(
    req: AttendanceRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    now = datetime.now(timezone.utc)
    pc = get_points_config(db)
    gw = pc["golden_window_minutes"]

    users = db.query(User).filter(User.id.in_(req.user_ids)).all()
    if not users:
        raise HTTPException(status_code=404, detail="Users not found")

    region = users[0].region
    from app.services.prayer_times import fetch_prayer_times
    times = fetch_prayer_times(region)
    if "error" in times:
        raise HTTPException(status_code=502, detail=times["error"])

    pt_str = times.get(req.prayer_name)
    if not pt_str:
        raise HTTPException(status_code=400, detail="Invalid prayer name")

    h, m = map(int, pt_str.split(":"))
    # Aladhan API returns local Saudi time (UTC+3), convert to UTC
    sa_tz = timezone(timedelta(hours=3))
    now_sa = datetime.now(sa_tz)
    prayer_sa = now_sa.replace(hour=h, minute=m, second=0, microsecond=0)
    prayer_dt = prayer_sa.astimezone(timezone.utc)
    golden_end = prayer_dt + timedelta(minutes=gw)
    is_within = now <= golden_end

    created = []
    for u in users:
        existing = db.query(PrayerLog).filter(
            PrayerLog.user_id == u.id,
            PrayerLog.prayer_name == req.prayer_name,
            PrayerLog.prayer_time == prayer_dt,
        ).first()
        if existing:
            continue

        is_kid = u.age < 15
        base = pc["kids_base_points"] if is_kid else pc["adults_base_points"]
        bonus = pc["kids_bonus_points"] if is_kid else pc["adults_bonus_points"]
        points = base + bonus if is_within else base
        approved = is_within

        log = PrayerLog(
            user_id=u.id,
            prayer_name=req.prayer_name,
            logged_at=now,
            prayer_time=prayer_dt,
            is_within_golden_window=is_within,
            is_congregation=u.gender == "Male",
            is_early_time=u.gender == "Female",
            points_awarded=points,
            is_approved=approved,
            approved_by=admin.id,
        )
        db.add(log)
        created.append(log)

    db.commit()
    return {"message": f"تم تسجيل {len(created)} أطفال", "count": len(created)}


# ---- Settings ----

@router.get("/settings", response_model=dict)
def get_settings(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    pc = get_points_config(db)
    rm = get_reward_milestones(db)
    return {
        "golden_window_minutes": pc["golden_window_minutes"],
        "kids_base_points": pc["kids_base_points"],
        "kids_bonus_points": pc["kids_bonus_points"],
        "adults_base_points": pc["adults_base_points"],
        "adults_bonus_points": pc["adults_bonus_points"],
        "reward_milestones": rm,
    }


@router.put("/settings", response_model=dict)
def update_settings(
    req: dict,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    # Validate and save each setting
    if "golden_window_minutes" in req:
        gw = req["golden_window_minutes"]
        if not isinstance(gw, int) or gw < 1 or gw > 180:
            raise HTTPException(status_code=400, detail="Golden window must be 1-180 minutes")
        set_setting(db, "golden_window_minutes", str(gw))

    if "kids_base_points" in req:
        v = req["kids_base_points"]
        if not isinstance(v, int) or v < 0:
            raise HTTPException(status_code=400, detail="kids_base_points must be >= 0")
        set_setting(db, "kids_base_points", str(v))

    if "kids_bonus_points" in req:
        v = req["kids_bonus_points"]
        if not isinstance(v, int) or v < 0:
            raise HTTPException(status_code=400, detail="kids_bonus_points must be >= 0")
        set_setting(db, "kids_bonus_points", str(v))

    if "adults_base_points" in req:
        v = req["adults_base_points"]
        if not isinstance(v, int) or v < 0:
            raise HTTPException(status_code=400, detail="adults_base_points must be >= 0")
        set_setting(db, "adults_base_points", str(v))

    if "adults_bonus_points" in req:
        v = req["adults_bonus_points"]
        if not isinstance(v, int) or v < 0:
            raise HTTPException(status_code=400, detail="adults_bonus_points must be >= 0")
        set_setting(db, "adults_bonus_points", str(v))

    if "reward_milestones" in req:
        vm = req["reward_milestones"]
        if not isinstance(vm, list) or not all(isinstance(x, int) and x > 0 for x in vm):
            raise HTTPException(status_code=400, detail="reward_milestones must be a list of positive integers")
        set_setting(db, "reward_milestones", ",".join(str(x) for x in sorted(vm)))

    return get_settings(db, _=None)


# ---- Reset Week ----

@router.post("/reset-week")
def reset_week(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    today = date.today()
    days_since_saturday = (today.weekday() - 5) % 7
    week_start = today - timedelta(days=days_since_saturday)
    week_end = week_start + timedelta(days=6)

    users = db.query(User).filter(User.role == "user").all()

    # Archive Kids
    kids = sorted([u for u in users if u.category == "Kids"], key=lambda u: u.total_points, reverse=True)
    for i, u in enumerate(kids):
        db.add(WeeklyLeaderboard(
            user_id=u.id, week_start=week_start, week_end=week_end,
            total_points=u.total_points, rank=i + 1, category="Kids", is_archived=True,
        ))

    # Archive Adults
    adults = sorted([u for u in users if u.category == "Adults"], key=lambda u: u.total_points, reverse=True)
    for i, u in enumerate(adults):
        db.add(WeeklyLeaderboard(
            user_id=u.id, week_start=week_start, week_end=week_end,
            total_points=u.total_points, rank=i + 1, category="Adults", is_archived=True,
        ))

    # Reset all points to 0
    db.query(User).filter(User.role == "user").update({"total_points": 0})

    db.commit()
    return {
        "message": "تم تصفير الأسبوع وأرشفة البيانات",
        "archived_kids": len(kids),
        "archived_adults": len(adults),
    }


@router.get("/users-with-pins", response_model=list[UserWithPinResponse])
def list_users_with_pins(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    result = []
    from app.auth import verify_pin
    for u in users:
        r = UserWithPinResponse(
            id=u.id,
            first_name=u.first_name,
            age=u.age,
            gender=u.gender,
            region=u.region,
            role=u.role,
            total_points=u.total_points,
            category=u.category,
            show_leaderboard=u.show_leaderboard,
            created_at=u.created_at,
            pin="",
        )
        result.append(r)
    return result
