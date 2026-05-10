import httpx
from datetime import datetime
from app.config import settings

REGION_CITY_MAP = {
    "Makkah": {"city": "Makkah", "country": "Saudi Arabia"},
    "Madinah": {"city": "Madinah", "country": "Saudi Arabia"},
    "Sharqia": {"city": "Dammam", "country": "Saudi Arabia"},
    "Jizan": {"city": "Jizan", "country": "Saudi Arabia"},
}


def fetch_prayer_times(region: str, date_str: str | None = None) -> dict:
    if region not in REGION_CITY_MAP:
        return {"error": f"Unsupported region: {region}"}

    location = REGION_CITY_MAP[region]
    day = date_str or datetime.now().strftime("%d-%m-%Y")
    url = f"{settings.PRAYER_API_BASE_URL}/timingsByCity/{day}"

    params = {
        "city": location["city"],
        "country": location["country"],
        "method": 4,  # Umm Al-Qura University, Makkah
    }

    try:
        with httpx.Client(timeout=10) as client:
            resp = client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

        timings = data.get("data", {}).get("timings", {})
        date_info = data.get("data", {}).get("date", {}).get("readable", today)

        return {
            "date": date_info,
            "Fajr": timings.get("Fajr", ""),
            "Sunrise": timings.get("Sunrise", ""),
            "Dhuhr": timings.get("Dhuhr", ""),
            "Asr": timings.get("Asr", ""),
            "Maghrib": timings.get("Maghrib", ""),
            "Isha": timings.get("Isha", ""),
        }
    except Exception as e:
        return {"error": f"Failed to fetch prayer times: {str(e)}"}
