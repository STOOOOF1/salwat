from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

load_dotenv()


class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://salwat:salwat_pass@localhost:5432/salwat")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-change-in-production")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    ADMIN_PIN: str = os.getenv("ADMIN_PIN", "1234")

    # Prayer times API config
    PRAYER_API_BASE_URL: str = "https://api.aladhan.com/v1"
    GOLDEN_WINDOW_MINUTES: int = 30

    # Points configuration
    KIDS_BASE_POINTS: int = 5
    KIDS_BONUS_POINTS: int = 3
    ADULTS_BASE_POINTS: int = 2
    ADULTS_BONUS_POINTS: int = 5

    # Reward milestones (points threshold)
    REWARD_MILESTONES: list = [50, 100, 150, 200, 300, 500]

    # Cron schedule - reset every Saturday at midnight
    WEEKLY_RESET_CRON: str = "0 0 * * 6"

    class Config:
        env_file = ".env"


settings = Settings()
