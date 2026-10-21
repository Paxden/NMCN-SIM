import { useEffect, useState } from "react";
import { useSim } from "./store";
import { navigate } from "./router";
import { EXERCISES, exerciseProgress, wrongCount } from "./exercises";
import { IconCheck } from "./icons";

export function Toast() {
  const { toast } = useSim();
  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.type}`} key={toast.id} role="status">
      {toast.message}
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", danger, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="dialog-actions">
          <button className="btn btn-light" onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MenuButton() {
  const { goMenu } = useSim();
  return (
    <button className="menu-fab" onClick={goMenu}>&larr; Menu</button>
  );
}

function NetworkSwitch() {
  const { online, setOnline } = useSim();
  return (
    <label className="switch">
      <input type="checkbox" checked={online} onChange={(e) => setOnline(e.target.checked)} />
      <span>Internet connection: <strong>{online ? "Online" : "Offline"}</strong></span>
    </label>
  );
}

/* ---------- free play ---------- */

export function FreePanel() {
  const sim = useSim();
  const [open, setOpen] = useState(false);
  const run = (fn) => {
    const r = fn();
    if (r) sim.showToast(r.msg, r.ok ? "success" : "error");
  };

  return (
    <div className="sim">
      {open && (
        <div className="sim-panel">
          <div className="sim-head">
            <strong>Free play tools</strong>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>
          <div className="sim-body">
            <p className="hint">
              This is a sandbox. Candidates log in by themselves when you activate a session, and they
              keep answering questions. These tools stand in for other things that happen at the centre.
            </p>
            <NetworkSwitch />
            <button className="sim-item" onClick={() => run(sim.simSubmitSome)}>5 candidates submit</button>
            <button className="sim-item" onClick={() => run(sim.simInfraction)}>A random candidate commits an infraction</button>
            <button className="sim-item danger" onClick={sim.wipeSandbox}>Wipe sandbox and start over</button>
          </div>
        </div>
      )}
      <button className="sim-fab" onClick={() => setOpen((o) => !o)}>Free play tools</button>
    </div>
  );
}

/* ---------- exercises ---------- */

const fmt = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

export function ExercisePanel() {
  const { exercise, actions, startExercise } = useSim();
  const def = EXERCISES.find((e) => e.id === exercise.id);
  const [open, setOpen] = useState(true);
  const [, tick] = useState(0);

  useEffect(() => {
    if (exercise.finishedAt) return;
    const t = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [exercise.finishedAt]);

  // While docked, the page makes room for the Task panel instead of sitting under it.
  useEffect(() => {
    document.body.classList.toggle("task-open", open);
    return () => document.body.classList.remove("task-open");
  }, [open]);

  if (!def) return null;
  const done = exerciseProgress(def, actions);
  const mistakes = (exercise.errors || 0) + wrongCount(def, actions);
  const elapsed = Math.round(((exercise.finishedAt || Date.now()) - exercise.startedAt) / 1000);
  const finished = !!exercise.finishedAt;

  return (
    <>
      {open ? (
        <aside className="task-dock">
          <div className="sim-head">
            <strong>Task</strong>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Hide">×</button>
          </div>
          <div className="sim-body">
            <div className="sim-active">
              <div className="sim-title">{def.title}</div>
              <p>{def.brief}</p>
              <ol className="steps">
                {def.steps.map((st, i) => (
                  <li key={i} className={i < done ? "done" : i === done ? "next" : ""}>
                    {st.label}
                  </li>
                ))}
              </ol>
              <div className="meta-row">
                <span>Time {fmt(elapsed)}</span>
                <span className={mistakes ? "bad" : ""}>Mistakes {mistakes}</span>
              </div>
            </div>
            {def.network && <NetworkSwitch />}
            <div className="row-gap">
              <button className="btn btn-light btn-sm" onClick={() => startExercise(def.id)}>Restart</button>
              <button className="btn btn-light btn-sm" onClick={() => navigate("/exercises")}>All exercises</button>
            </div>
          </div>
        </aside>
      ) : (
        <div className="sim">
          <button className="sim-fab" onClick={() => setOpen(true)}>
            Task {done}/{def.steps.length}
          </button>
        </div>
      )}

      {finished && (
        <div className="overlay">
          <div className="dialog result">
            <div className="result-badge"><IconCheck size={28} /></div>
            <h3>Exercise complete</h3>
            <p className="muted">{def.title}</p>
            <div className="result-stats">
              <div><strong>{fmt(elapsed)}</strong><span>Time</span></div>
              <div><strong>{mistakes}</strong><span>Mistakes</span></div>
            </div>
            <p>
              {mistakes === 0
                ? "Clean run. No mistakes."
                : mistakes <= 2
                ? "Well done. Try again for a run with no mistakes."
                : "Completed, but there were several mistakes. Replay the guided tour or try again."}
            </p>
            <div className="dialog-actions">
              <button className="btn btn-light" onClick={() => startExercise(def.id)}>Try again</button>
              <button className="btn btn-primary" onClick={() => navigate("/exercises")}>Back to exercises</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
