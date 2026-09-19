from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, constr


class PrepRequest(BaseModel):
    jd_text: constr(min_length=40)  # a real JD, not a word
    days: int = Field(30, ge=7, le=90)  # length of the prep plan


class PrepReply(BaseModel):
    goal_id: int
    role: str
    summary: str            # what this job needs, in two sentences
    readiness: int          # initial 0-100 estimate
    strengths: List[str]    # what the user already has
    gaps: List[str]         # what's missing (the plan targets these)
    total_tasks: int


class ResumeStatus(BaseModel):
    has_resume: bool
    filename: Optional[str] = None
    updated_at: Optional[datetime] = None
    excerpt: Optional[str] = None   # first lines, so the user can recognise it
    chars: int = 0


class ResumeMatch(BaseModel):
    step_id: int
    title: str
    path_title: str
    goal_role: str
    evidence: str           # why the resume proves this step, short


class ResumeMatchReply(BaseModel):
    resume: ResumeStatus
    matches: List[ResumeMatch]


class ResumeApplyRequest(BaseModel):
    step_ids: List[int] = Field(default_factory=list)


class ResumeApplyReply(BaseModel):
    marked_done: int
