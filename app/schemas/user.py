from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, constr

class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: constr(min_length=6)

class UserOut(UserBase):
    id: int
    email_reminders: bool = True
    has_resume: bool = False
    resume_filename: Optional[str] = None
    resume_updated_at: Optional[datetime] = None
    seen_features: List[str] = []

    class Config:
        from_attributes = True


class PreferencesUpdate(BaseModel):
    email_reminders: bool


class PasswordChange(BaseModel):
    current_password: str
    new_password: constr(min_length=6)


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: constr(min_length=6)

