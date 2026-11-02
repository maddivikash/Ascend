"""Record site visits (unique visitors per day). Public endpoint.

GET /api/visit — called from a <script> on every page load. Deduplicates by IP
per day at the application level. No auth required, no cookies, no payload.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.visit import Visit

router = APIRouter(prefix="/api")


def _ip_key(req: Request) -> str:
    """Extract a coarse IP key from the request headers.

    Behind Caddy the real IP shows up in x-forwarded-for as the first entry.
    Truncated to first-two-octets for a privacy-preserving but network-level
    dedup — sufficient for daily unique counts without per-user fingerprinting.
    """
    forwarded = req.headers.get("x-forwarded-for")
    raw = forwarded.split(",")[0].strip() if forwarded else (req.client.host if req.client else "")
    parts = raw.split(".")
    if len(parts) >= 2:
        return f"{parts[0]}.{parts[1]}"
    return raw or "unknown"


@router.get("/visit")
def record_visit(req: Request, db: Session = Depends(get_db)):
    today = datetime.utcnow().strftime("%Y-%m-%d")
    ip_key = _ip_key(req)

    # One row per (date, ip_key). A race between concurrent requests could
    # create a duplicate, but that only matters once in a while and is
    # acceptable for an analytics counter.
    exists = db.query(Visit.id).filter(Visit.date == today, Visit.ip_key == ip_key).first()
    if not exists:
        db.add(Visit(date=today, ip_key=ip_key, created_at=datetime.utcnow()))
        db.commit()

    unique_today = db.query(func.count(func.distinct(Visit.ip_key))).filter(Visit.date == today).scalar() or 0
    pageviews_today = db.query(func.count(Visit.id)).filter(Visit.date == today).scalar() or 0
    pageviews_all = db.query(func.count(Visit.id)).scalar() or 0

    return {"unique_today": unique_today, "pageviews_today": pageviews_today, "pageviews_all": pageviews_all}
