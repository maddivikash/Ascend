from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from app.db.base_class import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255))
    email = Column(String(255), unique=True, index=True)
    hashed_password = Column(String(255))
    is_active = Column(Boolean, default=True)
    email_reminders = Column(Boolean, default=True)  # daily due-task emails

    # Resume: stored once, reused by job prep (readiness evidence) and by the
    # "what have I already done?" matcher that proposes steps to mark done.
    resume_text = Column(Text, nullable=True)
    resume_filename = Column(String(255), nullable=True)
    resume_updated_at = Column(DateTime, nullable=True)

    # Feature announcements the user has dismissed, comma-separated keys.
    # Lives on the account (not localStorage) so it is seen once per user,
    # not once per browser.
    seen_features_raw = Column("seen_features", Text, nullable=False, default="")

    @property
    def has_resume(self) -> bool:
        return bool(self.resume_text)

    @property
    def seen_features(self) -> list:
        return [k for k in (self.seen_features_raw or "").split(",") if k]

    def mark_feature_seen(self, key: str) -> None:
        keys = self.seen_features
        if key not in keys:
            keys.append(key)
            self.seen_features_raw = ",".join(keys)
