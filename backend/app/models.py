import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Date, Text, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name = Column(String(50), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(10), nullable=False)
    region = Column(String(20), nullable=False)
    pin_hash = Column(String(255), nullable=False)
    role = Column(String(10), nullable=False, default="user")
    total_points = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    prayer_logs = relationship("PrayerLog", back_populates="user", cascade="all, delete-orphan", foreign_keys="PrayerLog.user_id")
    leaderboard_entries = relationship("WeeklyLeaderboard", back_populates="user", cascade="all, delete-orphan")
    reward_milestones = relationship("RewardMilestone", back_populates="user", cascade="all, delete-orphan", foreign_keys="RewardMilestone.user_id")

    @property
    def category(self):
        return "Kids" if self.age < 15 else "Adults"


class PrayerLog(Base):
    __tablename__ = "prayer_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    prayer_name = Column(String(20), nullable=False)
    logged_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    prayer_time = Column(DateTime(timezone=True), nullable=False)
    is_within_golden_window = Column(Boolean, default=False)
    is_congregation = Column(Boolean, default=False)
    is_early_time = Column(Boolean, default=False)
    points_awarded = Column(Integer, nullable=False, default=0)
    is_approved = Column(Boolean, default=True)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("User", back_populates="prayer_logs", foreign_keys=[user_id])
    approver = relationship("User", foreign_keys=[approved_by], primaryjoin="User.id == PrayerLog.approved_by")


class WeeklyLeaderboard(Base):
    __tablename__ = "weekly_leaderboards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    week_start = Column(Date, nullable=False)
    week_end = Column(Date, nullable=False)
    total_points = Column(Integer, nullable=False, default=0)
    rank = Column(Integer, nullable=False)
    category = Column(String(10), nullable=False)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("User", back_populates="leaderboard_entries")


class RewardMilestone(Base):
    __tablename__ = "reward_milestones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    milestone_points = Column(Integer, nullable=False)
    is_approved = Column(Boolean, default=False)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("User", back_populates="reward_milestones", foreign_keys=[user_id])
    approver = relationship("User", foreign_keys=[approved_by], primaryjoin="User.id == RewardMilestone.approved_by")
