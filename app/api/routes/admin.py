"""Admin dashboard API: who signed up, who is active, what they are doing.

GET /api/admin/overview?days=30   totals, per-day series and the user list
Admin = logged-in user whose email is in ADMIN_EMAILS (same rule as the blog admin).
Read-only; nothing here changes data.
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.db.deps import get_db
from app.models.goal import Goal
from app.models.learning_path import LearningPath
from app.models.step import Step
from app.models.task import Task
from app.models.user import User

router = APIRouter(prefix="/api/admin", tags=["Admin"], dependencies=[Depends(require_admin)])


def _day(d: Optional[datetime]) -> Optional[str]:
    return d.date().isoformat() if d else None


def _series(days: int, end: datetime, stamps) -> list[dict]:
    counts: dict[str, int] = {}
    for s in stamps:
        if s:
            k = s.date().isoformat()
            counts[k] = counts.get(k, 0) + 1
    out = []
    for i in range(days - 1, -1, -1):
        k = (end - timedelta(days=i)).date().isoformat()
        out.append({"date": k, "value": counts.get(k, 0)})
    return out


@router.get("/overview")
def overview(days: int = Query(30, ge=7, le=365), db: Session = Depends(get_db)):
    now = datetime.utcnow()
    start = now - timedelta(days=days - 1)
    prev_start = start - timedelta(days=days)

    users = db.query(User).order_by(User.id.desc()).all()

    # Per-user activity, each as one grouped query instead of a query per user.
    goal_rows = db.query(Goal.owner_id, func.count(Goal.id), func.max(Goal.created_at), func.min(Goal.created_at)).group_by(Goal.owner_id).all()
    goals_by_user = {r[0]: {"count": r[1], "last": r[2], "first": r[3]} for r in goal_rows}

    step_rows = (
        db.query(Goal.owner_id, func.count(Step.id), func.sum(case((Step.is_done.is_(True), 1), else_=0)), func.max(Step.created_at))
        .join(LearningPath, LearningPath.goal_id == Goal.id)
        .join(Step, Step.path_id == LearningPath.id)
        .group_by(Goal.owner_id)
        .all()
    )
    steps_by_user = {r[0]: {"total": r[1] or 0, "done": int(r[2] or 0), "last": r[3]} for r in step_rows}

    task_rows = (
        db.query(Goal.owner_id, func.count(Task.id), func.sum(case((Task.is_done.is_(True), 1), else_=0)), func.max(Task.created_at))
        .join(LearningPath, LearningPath.goal_id == Goal.id)
        .join(Step, Step.path_id == LearningPath.id)
        .join(Task, Task.step_id == Step.id)
        .group_by(Goal.owner_id)
        .all()
    )
    tasks_by_user = {r[0]: {"total": r[1] or 0, "done": int(r[2] or 0), "last": r[3]} for r in task_rows}

    def last_activity(u: User) -> Optional[datetime]:
        cands = [
            u.last_login_at,
            (goals_by_user.get(u.id) or {}).get("last"),
            (steps_by_user.get(u.id) or {}).get("last"),
            (tasks_by_user.get(u.id) or {}).get("last"),
            u.resume_updated_at,
        ]
        cands = [c for c in cands if c]
        return max(cands) if cands else None

    rows = []
    for u in users:
        g = goals_by_user.get(u.id, {"count": 0, "last": None, "first": None})
        s = steps_by_user.get(u.id, {"total": 0, "done": 0, "last": None})
        t = tasks_by_user.get(u.id, {"total": 0, "done": 0, "last": None})
        la = last_activity(u)
        rows.append(
            {
                "id": u.id,
                "name": u.full_name,
                "email": u.email,
                "is_active": bool(u.is_active),
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
                "last_activity_at": la.isoformat() if la else None,
                "goals": g["count"],
                "steps_done": s["done"],
                "steps_total": s["total"],
                "tasks_done": t["done"],
                "tasks_total": t["total"],
                "has_resume": bool(u.resume_text),
                "email_reminders": bool(u.email_reminders),
            }
        )
    rows.sort(key=lambda r: r["last_activity_at"] or r["created_at"] or "", reverse=True)

    def in_range(d: Optional[datetime]) -> bool:
        return bool(d and d >= start)

    def in_prev(d: Optional[datetime]) -> bool:
        return bool(d and prev_start <= d < start)

    goal_stamps = [r[0] for r in db.query(Goal.created_at).filter(Goal.created_at >= prev_start).all()]
    task_stamps = [r[0] for r in db.query(Task.created_at).filter(Task.created_at >= prev_start).all()]
    login_stamps = [u.last_login_at for u in users]

    totals = {
        "users": len(users),
        "new_in_range": sum(1 for u in users if in_range(u.created_at)),
        "new_previous": sum(1 for u in users if in_prev(u.created_at)),
        "active_in_range": sum(1 for u in users if in_range(last_activity(u))),
        "with_goal": sum(1 for u in users if goals_by_user.get(u.id, {}).get("count", 0) > 0),
        "with_progress": sum(1 for u in users if (steps_by_user.get(u.id, {}).get("done", 0) + tasks_by_user.get(u.id, {}).get("done", 0)) > 0),
        "with_resume": sum(1 for u in users if u.resume_text),
        "goals_in_range": sum(1 for d in goal_stamps if in_range(d)),
        "goals_previous": sum(1 for d in goal_stamps if in_prev(d)),
        "tasks_in_range": sum(1 for d in task_stamps if in_range(d)),
        "tasks_previous": sum(1 for d in task_stamps if in_prev(d)),
        "goals_total": db.query(func.count(Goal.id)).scalar() or 0,
        "steps_done_total": sum(v["done"] for v in steps_by_user.values()),
        "tasks_done_total": sum(v["done"] for v in tasks_by_user.values()),
    }

    # Which roles people are chasing, by goal count (top 10).
    role_rows = db.query(Goal.role, func.count(Goal.id)).filter(Goal.is_deleted.is_(False)).group_by(Goal.role).order_by(func.count(Goal.id).desc()).limit(10).all()

    return {
        "days": days,
        "from": start.date().isoformat(),
        "to": now.date().isoformat(),
        "totals": totals,
        "signups_by_day": _series(days, now, [u.created_at for u in users]),
        "goals_by_day": _series(days, now, goal_stamps),
        "tasks_by_day": _series(days, now, task_stamps),
        "logins_by_day": _series(days, now, login_stamps),
        "top_roles": [{"role": r[0] or "(none)", "count": r[1]} for r in role_rows],
        "users": rows,
        "notes": [
            "Signup dates before 21 Oct 2026 are estimated from each user's first goal.",
            "Last login is recorded from 21 Oct 2026 onward; older sessions are unknown.",
            "Steps and tasks have no completion date, so 'done' is a current count, not dated activity.",
        ],
    }
