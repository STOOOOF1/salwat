"""
Seed script: Populates the database with initial data.
All PINs are 1234.
"""
from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models import User, PrayerLog, RewardMilestone
from app.auth import hash_pin

db = SessionLocal()

# Admin (Mother)
admin = User(
    first_name="نورة",
    age=35,
    gender="Female",
    region="Makkah",
    pin_hash=hash_pin("1234"),
    role="admin",
)
db.add(admin)
db.flush()

children = [
    # Adults - المدينة
    {"first_name": "مصطفى", "age": 32, "gender": "Male", "region": "Madinah"},
    {"first_name": "عمار", "age": 17, "gender": "Male", "region": "Madinah"},
    {"first_name": "زهور", "age": 19, "gender": "Female", "region": "Madinah"},
    {"first_name": "عبد الكريم", "age": 20, "gender": "Male", "region": "Madinah"},
    # Adults - مكة
    {"first_name": "يحيى", "age": 25, "gender": "Male", "region": "Makkah"},
    # Adults - جيزان
    {"first_name": "شروق", "age": 29, "gender": "Female", "region": "Jizan"},
    {"first_name": "مريم", "age": 30, "gender": "Female", "region": "Jizan"},
    # Kids - المدينة
    {"first_name": "وتين", "age": 5, "gender": "Female", "region": "Madinah"},
    {"first_name": "حنين", "age": 8, "gender": "Female", "region": "Madinah"},
    {"first_name": "درر", "age": 6, "gender": "Female", "region": "Madinah"},
    # Kids - جيزان
    {"first_name": "حور", "age": 8, "gender": "Female", "region": "Jizan"},
    {"first_name": "عزام", "age": 5, "gender": "Male", "region": "Jizan"},
    {"first_name": "سما", "age": 7, "gender": "Female", "region": "Jizan"},
]

kids = []
for c in children:
    user = User(
        first_name=c["first_name"],
        age=c["age"],
        gender=c["gender"],
        region=c["region"],
        pin_hash=hash_pin("1234"),
        role="user",
    )
    db.add(user)
    db.flush()
    kids.append(user)

# Add sample prayer logs for the first few kids
today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
prayers = [("Fajr", 5), ("Dhuhr", 12), ("Asr", 15), ("Maghrib", 18), ("Isha", 19)]

for i, child in enumerate(kids[:5]):
    base = 5 if child.age < 15 else 2
    bonus = 3 if child.age < 15 else 5
    total = 0
    for j, (pname, ph) in enumerate(prayers):
        within = j % 2 == 0
        pts = base + (bonus if within else 0)
        total += pts
        db.add(PrayerLog(
            user_id=child.id, prayer_name=pname,
            logged_at=today + timedelta(hours=ph, minutes=5),
            prayer_time=today + timedelta(hours=ph),
            is_within_golden_window=within,
            is_congregation=child.gender == "Male" and within,
            is_early_time=child.gender == "Female" and within,
            points_awarded=pts, is_approved=True,
        ))
    child.total_points = total

# Pending reward for أول طفل
db.add(RewardMilestone(user_id=kids[0].id, milestone_points=50, is_approved=False))

db.commit()
db.close()

print("✅ تم إنشاء البيانات بنجاح!")
print(f"المدير: نورة / 1234")
print(f"\nالكبار ({sum(1 for c in children if c['age'] >= 15)} أشخاص):")
for c in children:
    if c['age'] >= 15:
        print(f"  {c['first_name']} ({c['age']} سنة) - {c['region']}")
print(f"\nالصغار ({sum(1 for c in children if c['age'] < 15)} أشخاص):")
for c in children:
    if c['age'] < 15:
        print(f"  {c['first_name']} ({c['age']} سنة) - {c['region']}")
print("\nرمز الدخول للجميع: 1234")
