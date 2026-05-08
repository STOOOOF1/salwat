from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from app.database import get_db
from app.models import User, PrayerLog, RewardMilestone
from app.schemas import (
    UserCreate, UserUpdate, UserResponse, UserWithPinResponse,
    PrayerLogResponse, PrayerLogApprove,
    RewardMilestoneResponse, RewardApproveRequest,
    PinResetRequest,
)
from app.auth import hash_pin, get_current_user, require_admin

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
