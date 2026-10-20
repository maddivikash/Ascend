import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAdminOverview } from "../api/endpoints";
import type { AdminOverview, AdminUserRow, DayCount } from "../types";

const RANGES = [7, 30, 90];

const n = (v: number) => v.toLocaleString("en-IN");
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");

function when(iso: string | null | undefined): string {
  if (!iso) return "–";
  const d = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
  const days = Math.floor((Date.now() - d.getTime()) / 86400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function delta(cur: number, prev: number): { text: string; cls: string } {
  if (!prev && !cur) return { text: "no change", cls: "" };
  if (!prev) return { text: `+${cur} new`, cls: "admin-up" };
  const d = Math.round(((cur - prev) / prev) * 100);
  if (Math.abs(d) < 1) return { text: "flat vs previous", cls: "" };
  return { text: `${d > 0 ? "+" : ""}${d}% vs previous`, cls: d > 0 ? "admin-up" : "admin-down" };
}

function Bars({ points, label }: { points: DayCount[]; label: string }) {
  const W = 640, H = 120, padL = 28, padB = 18, padT = 8;
  const max = Math.max(1, ...points.map((p) => p.value));
  const slot = (W - padL) / points.length;
  const bw = Math.max(2, slot - 2);
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);
  const fmtDay = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
  const total = points.reduce((a, p) => a + p.value, 0);
  const labelIdx = [0, Math.floor(points.length / 2), points.length - 1];
  return (
    <figure className="admin-chart">
      <figcaption><span>{label}</span><span className="muted-note">{n(total)} in range</span></figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label} per day`}>
        <line x1={padL} x2={W} y1={y(0)} y2={y(0)} className="admin-chart__axis" />
        <text x={padL - 6} y={y(max) + 4} textAnchor="end" className="admin-chart__tick">{max}</text>
        <text x={padL - 6} y={y(0) + 4} textAnchor="end" className="admin-chart__tick">0</text>
        {points.map((p, i) => (
          <g key={p.date}>
            <title>{`${fmtDay(p.date)}: ${p.value}`}</title>
            <rect x={padL + i * slot} y={padT} width={slot} height={H - padT - padB} fill="transparent" />
            <rect x={padL + i * slot + 1} y={y(p.value)} width={bw} height={Math.max(p.value ? 1.5 : 0, y(0) - y(p.value))} rx="2" className="admin-chart__bar" />
          </g>
        ))}
        {labelIdx.map((i) => (
          <text key={i} x={padL + i * slot + slot / 2} y={H - 4} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} className="admin-chart__tick">{fmtDay(points[i].date)}</text>
        ))}
      </svg>
    </figure>
  );
}

function stageOf(u: AdminUserRow): { label: string; cls: string } {
  if (u.steps_done + u.tasks_done > 0) return { label: "making progress", cls: "badge--active" };
  if (u.goals > 0) return { label: "has a goal", cls: "" };
  if (u.has_resume) return { label: "resume only", cls: "badge--muted" };
  return { label: "signed up", cls: "badge--muted" };
}

export default function Admin() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const days = RANGES.includes(Number(params.get("days"))) ? Number(params.get("days")) : 30;
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(null);
    getAdminOverview(days)
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [days]);

  // Not an admin: behave like the page does not exist.
  if (user && !user.is_admin) return <Navigate to="/" replace />;

  if (error) {
    return (
      <div className="page">
        <Link to="/" className="back-link">← Back to dashboard</Link>
        <div className="empty-state"><div className="empty-state__title">Admin only</div><div className="empty-state__text">{error}</div></div>
      </div>
    );
  }
  if (!data) return <div className="page"><p className="muted-note">Loading the numbers…</p></div>;

  const t = data.totals;
  const newD = delta(t.new_in_range, t.new_previous);
  const goalD = delta(t.goals_in_range, t.goals_previous);
  const taskD = delta(t.tasks_in_range, t.tasks_previous);
  const users = showAll ? data.users : data.users.slice(0, 40);

  return (
    <div className="page admin-page">
      <Link to="/" className="back-link">← Back to dashboard</Link>
      <div className="page__head">
        <div>
          <h1 className="page__title">{n(t.users)} users, {n(t.new_in_range)} new in the last {days} days.</h1>
          <p className="page__subtitle">Signups, logins and what people are actually doing. {data.from} to {data.to}.</p>
        </div>
        <div className="page__head-actions admin-ranges" role="tablist">
          {RANGES.map((r) => (
            <button key={r} role="tab" aria-selected={r === days} className={`btn btn--sm ${r === days ? "btn--primary" : ""}`} onClick={() => setParams({ days: String(r) })}>{r} days</button>
          ))}
        </div>
      </div>

      <div className="admin-tiles">
        <div className="stat"><div className="stat__label">New users</div><div className="stat__value">{n(t.new_in_range)}</div><div className={`admin-sub ${newD.cls}`}>{newD.text}</div></div>
        <div className="stat"><div className="stat__label">Active users</div><div className="stat__value">{n(t.active_in_range)}</div><div className="admin-sub">{pct(t.active_in_range, t.users)} of everyone logged in or did something</div></div>
        <div className="stat"><div className="stat__label">Goals created</div><div className="stat__value">{n(t.goals_in_range)}</div><div className={`admin-sub ${goalD.cls}`}>{goalD.text}</div></div>
        <div className="stat"><div className="stat__label">Tasks added</div><div className="stat__value">{n(t.tasks_in_range)}</div><div className={`admin-sub ${taskD.cls}`}>{taskD.text}</div></div>
      </div>

      <div className="admin-grid admin-grid--3">
        <div className="admin-card"><Bars points={data.signups_by_day} label="Signups" /></div>
        <div className="admin-card"><Bars points={data.logins_by_day} label="Last logins" /></div>
        <div className="admin-card"><Bars points={data.goals_by_day} label="Goals created" /></div>
      </div>

      <div className="admin-grid admin-grid--2">
        <div className="admin-card">
          <div className="section-head__title">Where users get to</div>
          <ol className="admin-funnel">
            {[
              ["Signed up", t.users],
              ["Uploaded a resume", t.with_resume],
              ["Created a goal", t.with_goal],
              ["Completed a step or task", t.with_progress],
            ].map(([label, v], i) => (
              <li key={String(label)}>
                <div className="admin-funnel__row"><span>{label}</span><span className="muted-note">{n(Number(v))} · {pct(Number(v), t.users)}</span></div>
                <div className="admin-funnel__track"><i style={{ width: `${t.users ? Math.max(1, (Number(v) / t.users) * 100) : 0}%`, opacity: 1 - i * 0.15 }} /></div>
              </li>
            ))}
          </ol>
        </div>
        <div className="admin-card">
          <div className="section-head__title">Roles people are chasing</div>
          <ul className="admin-list">
            {data.top_roles.length === 0 && <li className="muted-note">No goals yet.</li>}
            {data.top_roles.map((r) => (
              <li key={r.role}><span>{r.role}</span><span>{n(r.count)}</span></li>
            ))}
          </ul>
          <div className="section-head__title" style={{ marginTop: 16 }}>All time</div>
          <ul className="admin-list">
            <li><span>Goals</span><span>{n(t.goals_total)}</span></li>
            <li><span>Steps completed</span><span>{n(t.steps_done_total)}</span></li>
            <li><span>Tasks completed</span><span>{n(t.tasks_done_total)}</span></li>
          </ul>
        </div>
      </div>

      <div className="admin-card admin-table-wrap">
        <div className="admin-funnel__row">
          <div className="section-head__title">Users, most recently active first</div>
          {data.users.length > users.length && <button className="btn btn--sm" onClick={() => setShowAll(true)}>Show all {n(data.users.length)}</button>}
        </div>
        <table className="admin-table">
          <thead>
            <tr><th>User</th><th>Joined</th><th>Last login</th><th>Last activity</th><th>Stage</th><th className="num">Goals</th><th className="num">Steps done</th><th className="num">Tasks done</th></tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const s = stageOf(u);
              return (
                <tr key={u.id} className={u.is_active ? "" : "admin-row--inactive"}>
                  <td><div className="admin-user"><b>{u.name || "(no name)"}</b><span>{u.email}</span></div></td>
                  <td>{when(u.created_at)}</td>
                  <td>{when(u.last_login_at)}</td>
                  <td>{when(u.last_activity_at)}</td>
                  <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                  <td className="num">{u.goals || "–"}</td>
                  <td className="num">{u.steps_total ? `${u.steps_done}/${u.steps_total}` : "–"}</td>
                  <td className="num">{u.tasks_total ? `${u.tasks_done}/${u.tasks_total}` : "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="admin-notes">
        {data.notes.map((x) => <li key={x} className="muted-note">{x}</li>)}
      </ul>
    </div>
  );
}
