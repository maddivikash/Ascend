from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, UniqueConstraint

from app.db.base_class import Base


class Visit(Base):
    """One row per unique visitor per day. The same IP hitting the site many
    times on the same day is recorded once (unique constraint on date + ip_key).

    Pageviews = total row count (every hit writes a row unless deduped).
    Unique visitors = distinct ip_key values.
    """
    __tablename__ = "visits"

    id         = Column(Integer, primary_key=True, index=True)
    date       = Column(String(10), index=True, nullable=False)   # ISO date "YYYY-MM-DD"
    ip_key     = Column(String(64), index=True, nullable=False)   # path-safe IP hash
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (UniqueConstraint("date", "ip_key", name="uq_visit_date_ip"),)
