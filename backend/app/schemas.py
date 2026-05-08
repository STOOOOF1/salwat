from pydantic import BaseModel, Field, validator
from typing import Optional, List
from uuid import UUID
from datetime import datetime, date


# ---------- Auth ----------

class LoginRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50)
    pin: str = Field(..., min_length=4, max_length=4)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


# ---------- User ----------

class UserCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50)
    age: int = Field(..., ge=1, le=120)
    gender: str = Field(...)
    region: str = Field(...)
    pin: str = Field(..., min_length=4, max_length=4)
    role: str = Field(default="user")

    @validator("gender")
    def validate_gender(cls, v):
        if v not in ("Male", "Female"):
            raise ValueError("Gender must be 'Male' or 'Female'")
        return v

    @validator("region")
    def validate_region(cls, v):
        allowed = ("Makkah", "Madinah", "Sharqia", "Jizan")
        if v not in allowed:
            raise ValueError(f"Region must be one of {allowed}")
        return v

    @validator("role")
    def validate_role(cls, v):
        if v not in ("admin", "user"):
            raise ValueError("Role must be 'admin' or 'user'")
        return v


class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    age: Optional[int] = Field(None, ge=1, le=120)
    gender: Optional[str] = None
    region: Optional[str] = None
    role: Optional[str] = None


class UserResponse(BaseModel):
    id: UUID
    first_name: str
    age: int
    gender: str
    region: str
    role: str
    total_points: int
    category: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserWithPinResponse(UserResponse):
    pin: str = ""


class PinResetRequest(BaseModel):
    new_pin: str = Field(..., min_length=4, max_length=4)


# ---------- Prayer Log ----------

class PrayerLogCreate(BaseModel):
    prayer_name: str = Field(...)
    prayer_time: datetime
    is_congregation: bool = False
    is_early_time: bool = False

    @validator("prayer_name")
    def validate_prayer(cls, v):
        allowed = ("Fajr", "Dhuhr", "Asr", "Maghrib", "Isha")
        if v not in allowed:
            raise ValueError(f"Prayer must be one of {allowed}")
        return v


class PrayerLogResponse(BaseModel):
    id: UUID
    user_id: UUID
    prayer_name: str
    logged_at: datetime
    prayer_time: datetime
    is_within_golden_window: bool
    is_congregation: bool
    is_early_time: bool
    points_awarded: int
    is_approved: bool
    notes: Optional[str]
    user_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PrayerLogApprove(BaseModel):
    is_approved: bool
    override_points: Optional[int] = None
    notes: Optional[str] = None


# ---------- Leaderboard ----------

class LeaderboardEntry(BaseModel):
    rank: int
    user_id: UUID
    first_name: str
    age: int
    gender: str
    total_points: int
    category: str

    class Config:
        from_attributes = True


class LeaderboardResponse(BaseModel):
    category: str
    week_start: date
    week_end: date
    entries: List[LeaderboardEntry]


# ---------- Reward ----------

class RewardMilestoneResponse(BaseModel):
    id: UUID
    user_id: UUID
    user_name: str = ""
    milestone_points: int
    is_approved: bool
    created_at: datetime

    class Config:
        from_attributes = True


class RewardApproveRequest(BaseModel):
    is_approved: bool


# ---------- Prayer Times ----------

class PrayerTimesResponse(BaseModel):
    date: str
    Fajr: str
    Sunrise: str
    Dhuhr: str
    Asr: str
    Maghrib: str
    Isha: str
