import { useState } from "react";
import { useSim } from "./store";
import { SCENARIOS, scenarioProgress } from "./scenarios";

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

export function SimPanel() {
  const sim = useSim();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("scenarios");
  const active = SCENARIOS.find((x) => x.id === sim.scenario?.id);
  const done = active ? scenarioProgress(active, sim.actions) : 0;
  const run = (fn) => {
    const r = fn();
    if (r) sim.showToast(r.msg, r.ok ? "success" : "error");
  };

  return (
    <div className="sim">
      {open && (
        <div className="sim-panel">
          <div className="sim-head">
            <strong>Training Simulator</strong>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>
          <div className="sim-tabs">
            <button className={tab === "scenarios" ? "on" : ""} onClick={() => setTab("scenarios")}>Scenarios</button>
            <button className={tab === "tools" ? "on" : ""} onClick={() => setTab("tools")}>Free play tools</button>
          </div>

          {tab === "scenarios" && (
            <div className="sim-body">
              {active && (
                <div className="sim-active">
                  <div className="sim-title">{active.title}</div>
                  <p>{active.brief}</p>
                  <ol className="steps">
                    {active.steps.map((st, i) => (
                      <li key={i} className={i < done ? "done" : i === done ? "next" : ""}>
                        {st.label}
                      </li>
                    ))}
                  </ol>
                  {done === active.steps.length ? (
                    <div className="pass">Scenario complete. Well done.</div>
                  ) : null}
                  <div className="row-gap">
                    <button className="btn btn-light btn-sm" onClick={() => sim.startScenario(active.id)}>Restart</button>
                    <button className="btn btn-light btn-sm" onClick={sim.stopScenario}>Exit scenario</button>
                  </div>
                </div>
              )}
              <p className="hint">Starting a scenario resets the sandbox to the situation it describes.</p>
              {SCENARIOS.map((sc) => (
                <button key={sc.id} className="sim-item" onClick={() => sim.startScenario(sc.id)}>
                  {sc.title}
                </button>
              ))}
            </div>
          )}

          {tab === "tools" && (
            <div className="sim-body">
              <p className="hint">These stand in for what candidates do on their own machines.</p>
              <button className="sim-item" onClick={() => run(sim.simStartWriting)}>Candidates start writing</button>
              <button className="sim-item" onClick={() => run(sim.simSubmitSome)}>5 candidates submit</button>
              <button className="sim-item" onClick={() => run(sim.simInfraction)}>Random candidate commits infraction</button>
              <button className="sim-item danger" onClick={sim.factoryReset}>Wipe sandbox and start over</button>
            </div>
          )}
        </div>
      )}
      <button className="sim-fab" onClick={() => setOpen((o) => !o)}>
        {active ? `Scenario ${done}/${active.steps.length}` : "Simulator"}
      </button>
    </div>
  );
}
