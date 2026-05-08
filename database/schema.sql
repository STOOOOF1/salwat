-- Salwat Prayer Tracking App - Database Schema
-- PostgreSQL

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(50) NOT NULL,
    age INTEGER NOT NULL CHECK (age > 0 AND age < 120),
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('Male', 'Female')),
    region VARCHAR(20) NOT NULL CHECK (region IN ('Makkah', 'Madinah', 'Sharqia', 'Jizan')),
    pin_hash VARCHAR(255) NOT NULL,
    role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    total_points INTEGER NOT NULL DEFAULT 0,
    category VARCHAR(10) GENERATED ALWAYS AS (CASE WHEN age < 15 THEN 'Kids' ELSE 'Adults' END) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_category ON users(category);
CREATE INDEX idx_users_total_points ON users(total_points DESC);

-- Prayer logs table
CREATE TABLE prayer_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prayer_name VARCHAR(20) NOT NULL CHECK (prayer_name IN ('Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha')),
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    prayer_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_within_golden_window BOOLEAN NOT NULL DEFAULT FALSE,
    is_congregation BOOLEAN DEFAULT FALSE,
    is_early_time BOOLEAN DEFAULT FALSE,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    is_approved BOOLEAN DEFAULT TRUE,
    approved_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_prayer_logs_user_id ON prayer_logs(user_id);
CREATE INDEX idx_prayer_logs_created_at ON prayer_logs(created_at DESC);
CREATE INDEX idx_prayer_logs_is_approved ON prayer_logs(is_approved);

-- Weekly leaderboard snapshots
CREATE TABLE weekly_leaderboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    total_points INTEGER NOT NULL DEFAULT 0,
    rank INTEGER NOT NULL,
    category VARCHAR(10) NOT NULL CHECK (category IN ('Kids', 'Adults')),
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_weekly_leaderboards_week ON weekly_leaderboards(week_start, week_end);
CREATE INDEX idx_weekly_leaderboards_category ON weekly_leaderboards(category);

-- Reward milestones table
CREATE TABLE reward_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    milestone_points INTEGER NOT NULL,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reward_milestones_user_id ON reward_milestones(user_id);
CREATE INDEX idx_reward_milestones_is_approved ON reward_milestones(is_approved);

-- Trigger: Auto-update updated_at on users
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update user total_points when a prayer_log is inserted/approved
CREATE OR REPLACE FUNCTION update_user_points()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_approved THEN
        UPDATE users SET total_points = total_points + NEW.points_awarded WHERE id = NEW.user_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.is_approved = TRUE AND OLD.is_approved = FALSE THEN
        UPDATE users SET total_points = total_points + NEW.points_awarded WHERE id = NEW.user_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.is_approved = FALSE AND OLD.is_approved = TRUE THEN
        UPDATE users SET total_points = total_points - OLD.points_awarded WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prayer_logs_points
    AFTER INSERT OR UPDATE OF is_approved ON prayer_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_user_points();
