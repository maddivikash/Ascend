import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  applyResumeMatches,
  deleteResume,
  getResume,
  rematchResume,
  uploadResume,
  type ResumeMatch,
  type ResumeStatus,
} from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { useConfirm, useToast } from "../context/ui";
import { logActivity } from "../lib/activity";

interface Props {
  /** "compact" sits inside the job-prep modal; "full" is the profile section. */
  variant?: "compact" | "full";
  /** Called after steps were marked done from a resume match. */
  onApplied?: () => void;
}

const ACCEPT = ".pdf,.txt,.md,.png,.jpg,.jpeg,.webp";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function ResumePanel({ variant = "full", onApplied }: Props) {
  const { refreshUser } = useAuth();
  const confirm = useConfirm();
  const { success, error } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<ResumeStatus | null>(null);
  const [busy, setBusy] = useState<"upload" | "scan" | "apply" | "remove" | null>(null);
  const [matches, setMatches] = useState<ResumeMatch[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getResume().then(setStatus).catch(() => setStatus(null));
  }, []);

  function showMatches(list: ResumeMatch[]) {
    setMatches(list);
    setSelected(new Set(list.map((m) => m.step_id)));
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || busy) return;
    setBusy("upload");
    setErr(null);
    try {
      const r = await uploadResume(file);
      setStatus(r.resume);
      showMatches(r.matches);
      await refreshUser();
      success(
        r.matches.length
          ? `Resume saved. Found ${r.matches.length} step${r.matches.length === 1 ? "" : "s"} you have already done.`
          : "Resume saved. No open steps matched it yet."
      );
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Couldn't read that file.");
    } finally {
      setBusy(null);
    }
  }

  async function rescan() {
    if (busy) return;
    setBusy("scan");
    setErr(null);
    try {
      const r = await rematchResume();
      showMatches(r.matches);
      if (!r.matches.length) success("Nothing new. Your open steps are not covered by the resume.");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Couldn't match your resume.");
    } finally {
      setBusy(null);
    }
  }

  async function apply() {
    const ids = Array.from(selected);
    if (!ids.length || busy) return;
    setBusy("apply");
    try {
      const { marked_done } = await applyResumeMatches(ids);
      for (let i = 0; i < marked_done; i++) logActivity("complete_step");
      success(`Marked ${marked_done} step${marked_done === 1 ? "" : "s"} as done.`);
      setMatches(null);
      window.dispatchEvent(new Event("skillsync:data-changed"));
      onApplied?.();
    } catch (e2) {
      error(e2 instanceof Error ? e2.message : "Couldn't update those steps.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: "Remove your resume?",
      message: "Job prep will stop using it as evidence. Steps you already marked done stay done.",
      confirmText: "Remove",
      cancelText: "Keep it",
      danger: true,
    });
    if (!ok) return;
    setBusy("remove");
    try {
      setStatus(await deleteResume());
      setMatches(null);
      await refreshUser();
      success("Resume removed.");
    } catch (e2) {
      error(e2 instanceof Error ? e2.message : "Couldn't remove the resume.");
    } finally {
      setBusy(null);
    }
  }

  const has = !!status?.has_resume;
  const compact = variant === "compact";

  return (
    <div className={`resume-panel ${compact ? "resume-panel--compact" : ""}`}>
      <input ref={fileRef} type="file" accept={ACCEPT} onChange={handleFile} hidden />

      <div className="resume-panel__row">
        <div className="resume-panel__info">
          <div className="resume-panel__label">
            {has ? (
              <>
                <span className="resume-panel__ok" aria-hidden="true">✓</span> {status?.filename}
              </>
            ) : (
              <>📄 Your resume {compact && <span className="resume-panel__tag">recommended</span>}</>
            )}
          </div>
          <div className="muted-note">
            {has
              ? `Added ${fmtDate(status?.updated_at)}. Used as proof of what you already know when scoring a job.`
              : compact
                ? "Add it once. We spot steps you have already done and score readiness from real experience."
                : "Upload once. Ascend matches it against your open steps so you can mark what you have already done, and job prep uses it to score readiness honestly."}
          </div>
        </div>
        <div className="resume-panel__actions">
          <button
            type="button"
            className={`btn btn--sm ${has ? "btn--ghost" : "btn--soft"}`}
            onClick={() => fileRef.current?.click()}
            disabled={!!busy}
          >
            {busy === "upload" ? "Reading…" : has ? "Replace" : "Upload resume"}
          </button>
          {has && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={rescan} disabled={!!busy}>
              {busy === "scan" ? "Scanning…" : "Find done steps"}
            </button>
          )}
          {has && !compact && (
            <button type="button" className="btn btn--ghost btn--sm resume-panel__remove" onClick={remove} disabled={!!busy}>
              {busy === "remove" ? "Removing…" : "Remove"}
            </button>
          )}
        </div>
      </div>

      {(busy === "upload" || busy === "scan") && (
        <p className="prep-form__building">
          <span className="learn-spinner" aria-hidden="true" /> Reading your resume and
          comparing it with your open steps…
        </p>
      )}
      {err && <div className="alert alert--error">{err}</div>}

      {matches && matches.length > 0 && (
        <div className="resume-matches">
          <div className="resume-matches__head">
            <strong>Your resume already covers these steps.</strong> Untick any that
            you have not really done, then mark the rest complete.
          </div>
          <ul>
            {matches.map((m) => (
              <li key={m.step_id}>
                <label className="resume-match">
                  <input
                    type="checkbox"
                    checked={selected.has(m.step_id)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(m.step_id);
                      else next.delete(m.step_id);
                      setSelected(next);
                    }}
                  />
                  <span className="resume-match__body">
                    <span className="resume-match__title">{m.title}</span>
                    <span className="resume-match__meta">
                      {m.goal_role} · {m.path_title}
                      {m.evidence ? ` · ${m.evidence}` : ""}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="resume-matches__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setMatches(null)} disabled={!!busy}>
              Not now
            </button>
            <button type="button" className="btn btn--primary btn--sm" onClick={apply} disabled={!!busy || selected.size === 0}>
              {busy === "apply" ? "Saving…" : `Mark ${selected.size} as done`}
            </button>
          </div>
        </div>
      )}
      {matches && matches.length === 0 && (
        <p className="muted-note">No open steps matched your resume.</p>
      )}
    </div>
  );
}
