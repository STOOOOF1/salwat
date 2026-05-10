from sqlalchemy.orm import Session
from app.models import AppSetting
from app.config import settings


def get_setting(db: Session, key: str, default: any):
    row = db.query(AppSetting).filter(AppSetting.key == key).first()
    if row is None:
        return default
    return row.value


def get_int_setting(db: Session, key: str, default: int) -> int:
    val = get_setting(db, key, default)
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def get_points_config(db: Session) -> dict:
    try:
        return {
            "kids_base_points": get_int_setting(db, "kids_base_points", settings.KIDS_BASE_POINTS),
            "kids_bonus_points": get_int_setting(db, "kids_bonus_points", settings.KIDS_BONUS_POINTS),
            "adults_base_points": get_int_setting(db, "adults_base_points", settings.ADULTS_BASE_POINTS),
            "adults_bonus_points": get_int_setting(db, "adults_bonus_points", settings.ADULTS_BONUS_POINTS),
            "golden_window_minutes": get_int_setting(db, "golden_window_minutes", settings.GOLDEN_WINDOW_MINUTES),
        }
    except Exception:
        return {
            "kids_base_points": settings.KIDS_BASE_POINTS,
            "kids_bonus_points": settings.KIDS_BONUS_POINTS,
            "adults_base_points": settings.ADULTS_BASE_POINTS,
            "adults_bonus_points": settings.ADULTS_BONUS_POINTS,
            "golden_window_minutes": settings.GOLDEN_WINDOW_MINUTES,
        }


def get_reward_milestones(db: Session) -> list[int]:
    val = get_setting(db, "reward_milestones", None)
    if val is None:
        return settings.REWARD_MILESTONES
    try:
        parts = [int(x.strip()) for x in val.split(",") if x.strip()]
        return sorted(parts) if parts else settings.REWARD_MILESTONES
    except (ValueError, TypeError):
        return settings.REWARD_MILESTONES


def set_setting(db: Session, key: str, value: str):
    row = db.query(AppSetting).filter(AppSetting.key == key).first()
    if row:
        row.value = value
    else:
        db.add(AppSetting(key=key, value=value))
    db.commit()
