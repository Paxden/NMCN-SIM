/* eslint-disable react-hooks/exhaustive-deps */
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { OsceProvider, useOsce } from "./osceStore";
import { Link, navigate } from "./router";
import { ConfirmDialog } from "./components";
import { IconCheck, IconCross } from "./icons";
import { AccountBar } from "./authPages";
import { useAuth } from "./auth";
import { SwitchModule } from "./chooser";
import { OSCE_EXERCISES } from "./osceExercises";
import { OSCE_TOUR } from "./osceTourSteps";
import { OSCE_STANDARD, TASK_COUNT, buildAssessment, evaluateTask, buildRecord } from "./osceAssessment";
import { api, hasToken } from "./api";

/* ---------- progress (kept in this browser) ---------- */

const KEY = "caosce-trainer-progress-v1";
const emptyProgress = () => ({ guideDone: false, exercises: {}, assessments: [] });
function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...emptyProgress(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return emptyProgress();
}

const fmt = (sec) => `${Math.floor(sec / 60)}:${String(Math.max(0, sec) % 60).padStart(2, "0")}`;
const LEVEL_CLASS = {
  "Highly Competent": "lvl-high",
  Competent: "lvl-comp",
  "Requires Remediation": "lvl-rem",
  "Not Competent": "lvl-not",
};

function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function usePath() {
  const [p, setP] = useState(window.location.pathname);
  useEffect(() => {
    const t = setInterval(() => setP(window.location.pathname), 250);
    return () => clearInterval(t);
  }, []);
  return p;
}

/* ---------- context ---------- */

const Ctx = createContext(null);
export const useTrainer = () => useContext(Ctx);

// Snapshot of the sandbox state — the shape the server's evaluateTask consumes.
const snapshotOf = (o) => ({
  loggedIn: o.loggedIn,
  online: o.online,
  downloaded: o.downloaded,
  activated: o.activated,
  uploaded: o.uploaded,
  components: o.components,
  candidates: o.candidates,
  examiners: o.examiners,
  ips: o.ips,
  syncCount: o.syncCount,
  mistakes: o.mistakes || 0,
  events: o.events,
});

function TrainerProvider({ children }) {
  const o = useOsce();
  const oref = useRef(o);
  oref.current = o;

  const [progress, setProgress] = useState(loadProgress);
  const [mode, setMode] = useState("free"); // free | tour | exercise | assessment
  const [tourStep, setTourStep] = useState(0);
  const [ex, setEx] = useState(null);
  const [asmt, setAsmt] = useState(null);
  const asmtRef = useRef(null);
  asmtRef.current = asmt;

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(progress));
    } catch {
      /* ignore */
    }
  }, [progress]);

  // Mirror tour/exercise progress to the server when signed in (same contract as CBT).
  useEffect(() => {
    if (!hasToken()) return;
    api
      .saveOsceProgress({ guideDone: progress.guideDone, exercises: progress.exercises })
      .catch(() => {});
  }, [progress.guideDone, progress.exercises]);

  /* free play and tour */
  const startFree = () => {
    setMode("free");
    navigate(oref.current.loggedIn ? "/osce/dashboard" : "/osce/login");
  };
  const startTour = () => {
    setTourStep(0);
    setMode("tour");
  };
  const endTour = (completed) => {
    if (completed) setProgress((p) => ({ ...p, guideDone: true }));
    setMode("free");
    oref.current.wipe();
    navigate("/osce");
  };

  /* exercises */
  const startExercise = (id) => {
    const def = OSCE_EXERCISES.find((e) => e.id === id);
    if (!def) return;
    oref.current.applyScenario(def.state());
    setEx({ id, startedAt: Date.now(), result: null });
    setMode("exercise");
    navigate("/osce/dashboard");
  };
  const restartExercise = () => ex && startExercise(ex.id);
  const leaveExercise = (to = "/osce/exercises") => {
    setEx(null);
    setMode("free");
    navigate(to);
  };
  const completeExercise = (result) => {
    if (!ex) return;
    const id = ex.id;
    setEx((e) => (e && !e.result ? { ...e, result } : e));
    setProgress((p) => {
      const prev = p.exercises[id];
      const better =
        !prev || result.mistakes < prev.mistakes || (result.mistakes === prev.mistakes && result.time < prev.time);
      return better ? { ...p, exercises: { ...p.exercises, [id]: result } } : p;
    });
  };

  /* assessment */
  // Signed in: the server picks the seed. Signed out or unreachable: local fallback.
  const startAssessment = async (name) => {
    let remote = null;
    if (hasToken()) {
      try {
        remote = await api.startOsceAttempt();
      } catch {
        /* fall through to local */
      }
    }
    const seed = remote ? remote.seed : Math.floor(Math.random() * 2147483647);
    const tasks = buildAssessment(seed);
    oref.current.applyScenario(tasks[0].state());
    const a = {
      attemptId: remote ? remote.attemptId : `A-${Date.now().toString(36)}`,
      name,
      tasks,
      seed,
      remote: !!remote,
      index: 0,
      startedAt: Date.now(),
      results: [],
      phase: "task",
      record: null,
    };
    asmtRef.current = a;
    setAsmt(a);
    setMode("assessment");
    navigate("/osce/dashboard");
  };

  const finishTask = (timedOut = false) => {
    const a = asmtRef.current;
    if (!a || a.phase !== "task") return;
    const cur = oref.current;
    const t = a.tasks[a.index];
    const ev = evaluateTask(t, cur, cur.mistakes || 0);
    const timeSec = Math.min(t.limit, Math.round((Date.now() - a.startedAt) / 1000));
    const state = snapshotOf(cur);

    const results = [
      ...a.results,
      {
        id: t.id,
        title: t.title,
        area: t.area,
        mustPass: t.mustPass,
        practise: t.practise,
        ...ev,
        timeSec,
        timedOut,
        state,
      },
    ];

    if (a.index + 1 < a.tasks.length) {
      cur.applyScenario(a.tasks[a.index + 1].state());
      const next = { ...a, index: a.index + 1, startedAt: Date.now(), results };
      asmtRef.current = next;
      setAsmt(next);
      navigate("/osce/dashboard");
    } else {
      const localRecord = { ...buildRecord(a.name, results), attemptId: a.attemptId };
      const done = { ...a, results, phase: "done", record: localRecord };
      asmtRef.current = done;
      setAsmt(done);
      setProgress((p) => ({
        ...p,
        assessments: [localRecord, ...p.assessments.filter((r) => r.attemptId !== localRecord.attemptId)].slice(0, 10),
      }));
      setMode("free");
      navigate("/osce/assessment/result");

      // Submit to the server. The server re-scores against seeded tasks and replaces the local record.
      if (a.remote) {
        api
          .submitOsceAttempt(
            a.attemptId,
            results.map((r) => ({ state: r.state, timeSec: r.timeSec, timedOut: r.timedOut })),
          )
          .then(({ record: server }) => {
            const rec = { ...localRecord, ...server };
            asmtRef.current = { ...done, record: rec };
            setAsmt((x) => (x ? { ...x, record: rec } : x));
            setProgress((p) => ({
              ...p,
              assessments: [rec, ...p.assessments.filter((r) => r.attemptId !== rec.attemptId)].slice(0, 10),
            }));
          })
          .catch(() => {
            /* keep local record if the server can't be reached */
          });
      }
    }
  };

  const abandonAssessment = () => {
    asmtRef.current = null;
    setAsmt(null);
    setMode("free");
    navigate("/osce/assessment");
  };

  const value = {
    progress, mode, tourStep, setTourStep, ex, asmt,
    startFree, startTour, endTour,
    startExercise, restartExercise, leaveExercise, completeExercise,
    startAssessment, finishTask, abandonAssessment,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// Use this in place of <OsceProvider> where the app is wrapped.
export function OsceProviders({ children }) {
  return (
    <OsceProvider>
      <TrainerProvider>
        {children}
        <TrainerLayer />
      </TrainerProvider>
    </OsceProvider>
  );
}

/* ---------- overlays: tour, exercise dock, assessment dock ---------- */

function TrainerLayer() {
  const { mode, ex, asmt } = useTrainer();
  const path = usePath();
  const inOsce = path.startsWith("/osce");
  const exDock = inOsce && mode === "exercise" && !!ex;
  const asDock = inOsce && mode === "assessment" && asmt?.phase === "task";
  const dock = exDock || asDock;

  useEffect(() => {
    document.body.classList.toggle("task-open", dock);
    return () => document.body.classList.remove("task-open");
  }, [dock]);

  return (
    <>
      {mode === "tour" && <Tour />}
      {exDock && <ExerciseDock />}
      {asDock && <AssessmentDock />}
    </>
  );
}

function findTarget(t) {
  if (!t) return null;
  const { sel, text } = typeof t === "string" ? { sel: t } : t;
  const els = [...document.querySelectorAll(sel)].filter((e) => !e.closest(".tour-tip"));
  if (!text) return els[0] || null;
  const want = text.toLowerCase();
  return els.find((e) => e.textContent.trim().toLowerCase().startsWith(want)) || null;
}

function Tour() {
  const { tourStep, setTourStep, endTour } = useTrainer();
  const { applyScenario } = useOsce();
  const applyRef = useRef(applyScenario);
  applyRef.current = applyScenario;
  const [rect, setRect] = useState(null);
  const step = OSCE_TOUR[tourStep];
  const last = tourStep === OSCE_TOUR.length - 1;

  useEffect(() => {
    setRect(null);
    applyRef.current(step.state());
    navigate(step.path);
    let scrolled = false;
    const timer = setInterval(() => {
      const el = findTarget(step.target);
      if (!el) {
        setRect((r) => (r ? null : r));
        return;
      }
      if (!scrolled) {
        el.scrollIntoView({ block: "center" });
        scrolled = true;
      }
      const b = el.getBoundingClientRect();
      const next = { top: b.top, left: b.left, width: b.width, height: b.height };
      setRect((r) =>
        r && r.top === next.top && r.left === next.left && r.width === next.width && r.height === next.height ? r : next,
      );
    }, 120);
    return () => clearInterval(timer);
  }, [tourStep]);

  const W = 340;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let style = { top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: W };
  let ring = null;
  if (rect) {
    const pad = 6;
    const r = { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 };
    ring = r;
    const below = vh - (r.top + r.height);
    const above = r.top;
    const left = Math.min(Math.max(12, r.left), Math.max(12, vw - W - 12));
    if (r.height > vh * 0.6 || (below < 230 && above < 230)) {
      const roomRight = vw - (r.left + r.width);
      style = { top: 80, left: roomRight > W + 24 ? r.left + r.width + 16 : Math.max(12, vw - W - 12), width: W };
    } else if (below >= 230) {
      style = { top: r.top + r.height + 14, left, width: W };
    } else {
      style = { bottom: vh - r.top + 14, left, width: W };
    }
  }

  return (
    <>
      <div className="tour-block" />
      {ring ? <div className="tour-ring" style={ring} /> : <div className="tour-dim" />}
      <div className="tour-tip" style={style} role="dialog" aria-label="Guided tour">
        <div className="tour-count">
          Step {tourStep + 1} of {OSCE_TOUR.length}
        </div>
        <div className="tour-bar">
          <div style={{ width: `${((tourStep + 1) / OSCE_TOUR.length) * 100}%` }} />
        </div>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <div className="tour-actions">
          <button type="button" className="tour-skip" onClick={() => endTour(false)}>
            Skip tour
          </button>
          <div className="row-gap">
            {tourStep > 0 && (
              <button type="button" className="btn btn-light btn-sm" onClick={() => setTourStep(tourStep - 1)}>
                Back
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => (last ? endTour(true) : setTourStep(tourStep + 1))}
            >
              {last ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function ExerciseDock() {
  const { ex, restartExercise, leaveExercise, completeExercise } = useTrainer();
  const o = useOsce();
  const now = useNow();
  const def = OSCE_EXERCISES.find((e) => e.id === ex.id);
  const idx = def.steps.findIndex((st) => !st.done(o));
  const n = idx === -1 ? def.steps.length : idx;
  const finished = n === def.steps.length;
  const elapsed = ex.result ? ex.result.time : Math.round((now - ex.startedAt) / 1000);

  useEffect(() => {
    if (finished && !ex.result) {
      completeExercise({ time: Math.round((Date.now() - ex.startedAt) / 1000), mistakes: o.mistakes || 0 });
    }
  }, [finished]);

  return (
    <>
      <aside className="task-dock">
        <div className="sim-head">
          <strong>Exercise</strong>
          <span>{def.level}</span>
        </div>
        <div className="sim-body">
          <div className={`timer`}>{fmt(elapsed)}</div>
          <div className="sim-active">
            <div className="sim-title">{def.title}</div>
            <p>{def.brief}</p>
            {def.tip && <p className="hint">{def.tip}</p>}
          </div>
          <ol className="steps">
            {def.steps.map((st, i) => (
              <li key={st.text} className={i < n ? "done" : i === n ? "next" : ""}>
                {st.text}
              </li>
            ))}
          </ol>
          <div className="meta-row">
            <span>Mistakes</span>
            <span className={o.mistakes ? "bad" : ""}>{o.mistakes || 0}</span>
          </div>
          <div className="row-gap" style={{ marginTop: 14 }}>
            <button className="btn btn-light btn-sm" onClick={restartExercise}>
              Restart
            </button>
            <button className="btn btn-light btn-sm" onClick={() => leaveExercise()}>
              Leave
            </button>
          </div>
        </div>
      </aside>

      {ex.result && (
        <div className="overlay">
          <div className="dialog result">
            <div className="result-badge">
              <IconCheck size={30} />
            </div>
            <h3>Exercise complete</h3>
            <p className="muted">{def.title}</p>
            <div className="result-stats">
              <div>
                <strong>{fmt(ex.result.time)}</strong>
                <span>Time</span>
              </div>
              <div>
                <strong>{ex.result.mistakes}</strong>
                <span>{ex.result.mistakes === 1 ? "Mistake" : "Mistakes"}</span>
              </div>
            </div>
            <div className="dialog-actions">
              <button className="btn btn-light" onClick={restartExercise}>
                Try again
              </button>
              <button className="btn btn-primary" onClick={() => leaveExercise()}>
                Back to exercises
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AssessmentDock() {
  const { asmt, finishTask, abandonAssessment } = useTrainer();
  const now = useNow(500);
  const [confirm, setConfirm] = useState(null); // "finish" | "abandon"
  const t = asmt.tasks[asmt.index];
  const left = Math.max(0, t.limit - Math.floor((now - asmt.startedAt) / 1000));

  useEffect(() => setConfirm(null), [asmt.index]);
  useEffect(() => {
    if (left === 0) finishTask(true);
  }, [left, asmt.index]);

  return (
    <>
      <aside className="task-dock">
        <div className="sim-head">
          <strong>Assessment</strong>
          <span>
            Task {asmt.index + 1} of {TASK_COUNT}
          </span>
        </div>
        <div className="sim-body">
          <div className={`timer ${left < 30 ? "warn" : ""}`}>{fmt(left)}</div>
          <div className="sim-active">
            <div className="sim-title">Situation</div>
            <p>{t.situation}</p>
          </div>
          <p className="hint">No hints. Click Finish task when you think the situation is resolved. You cannot go back.</p>
          <button className="btn btn-primary block" onClick={() => setConfirm("finish")}>
            Finish task
          </button>
          <button className="btn btn-light btn-sm abandon" onClick={() => setConfirm("abandon")}>
            Abandon assessment
          </button>
        </div>
      </aside>

      <ConfirmDialog
        open={confirm === "finish"}
        title="Finish this task?"
        message="You cannot come back to it."
        confirmLabel="Finish task"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          finishTask(false);
        }}
      />
      <ConfirmDialog
        open={confirm === "abandon"}
        danger
        title="Abandon the assessment?"
        message="Your progress in this attempt will be lost."
        confirmLabel="Abandon"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          abandonAssessment();
        }}
      />
    </>
  );
}

/* ---------- pages ---------- */

export function OsceHub() {
  const { progress, startFree, startTour } = useTrainer();
  const o = useOsce();
  const doneCount = OSCE_EXERCISES.filter((e) => progress.exercises[e.id]).length;
  const last = progress.assessments[0];

  return (
    <div className="hub">
      <AccountBar />
      <header className="hub-hero">
        <p style={{ margin: "0 0 12px" }}>
          <SwitchModule />
        </p>
        <h1>CAOSCE Server Trainer</h1>
        <p>Learn the OSCE server, practise freely, then prove it with real hall situations.</p>
      </header>

      <div className="hub-grid">
        <section className="hub-card">
          <div className="hub-num">1</div>
          <h2>Guided tour</h2>
          <p>
            From connecting the laptops to uploading the results. Each button is circled and explained. Click Next to
            continue or Skip to leave.
          </p>
          <div className="hub-meta">
            {OSCE_TOUR.length} steps
            {progress.guideDone && (
              <span className="hub-done">
                <IconCheck size={14} /> Completed
              </span>
            )}
          </div>
          <button className="btn btn-primary" onClick={startTour}>
            {progress.guideDone ? "Replay tour" : "Start tour"}
          </button>
        </section>

        <section className="hub-card">
          <div className="hub-num">2</div>
          <h2>Free play</h2>
          <p>
            A sandbox copy of the CAOSCE server with tools that stand in for the station laptops and candidates. Make
            mistakes and start over. Nothing is graded.
          </p>
          <div className="hub-meta">No goals, no timer</div>
          <button className="btn btn-primary" onClick={startFree}>
            {o.loggedIn ? "Continue sandbox" : "Open sandbox"}
          </button>
        </section>

        <section className="hub-card">
          <div className="hub-num">3</div>
          <h2>Exercises</h2>
          <p>
            Real situations from the OSCE hall: a candidate who cannot log in, the wrong laptops on the whitelist, a
            dropped connection at upload time. Each one is timed and checks your steps.
          </p>
          <div className="hub-meta">
            {doneCount} of {OSCE_EXERCISES.length} completed
          </div>
          <Link to="/osce/exercises" className="btn btn-primary">
            View exercises
          </Link>
        </section>

        <section className="hub-card">
          <div className="hub-num">4</div>
          <h2>Assessment</h2>
          <p>
            {TASK_COUNT} timed situations with no hints and no step lists. Your score, competency level and pass or
            fail appear at the end.
          </p>
          <div className="hub-meta">
            {last ? (
              <span className={last.passed ? "hub-done" : "hub-fail"}>
                Last result: {last.level} ({last.overall}%)
              </span>
            ) : (
              "Not taken yet"
            )}
          </div>
          <Link to="/osce/assessment" className="btn btn-primary">
            {last ? "Retake assessment" : "Take assessment"}
          </Link>
        </section>
      </div>
    </div>
  );
}

export function OsceExerciseList() {
  const { progress, startExercise } = useTrainer();
  return (
    <div className="hub">
      <header className="hub-hero small">
        <p>
          <Link to="/osce" className="light-link">
            &larr; Menu
          </Link>
        </p>
        <h1>CAOSCE exercises</h1>
        <p>Each exercise resets the sandbox to the situation described. A panel on the right tracks your steps.</p>
      </header>

      <div className="ex-list">
        {OSCE_EXERCISES.map((ex, i) => {
          const best = progress.exercises[ex.id];
          return (
            <section className="ex-card" key={ex.id}>
              <div className="ex-top">
                <span className="ex-n">{i + 1}</span>
                <span className={`level level-${ex.level.toLowerCase()}`}>{ex.level}</span>
                {best && (
                  <span className="hub-done">
                    <IconCheck size={14} /> Done
                  </span>
                )}
              </div>
              <h3>{ex.title}</h3>
              <p>{ex.brief}</p>
              <div className="hub-meta">
                {ex.steps.length} {ex.steps.length === 1 ? "step" : "steps"}
                {best && (
                  <span>
                    Best: {fmt(best.time)}, {best.mistakes} {best.mistakes === 1 ? "mistake" : "mistakes"}
                  </span>
                )}
              </div>
              <button className="btn btn-primary" onClick={() => startExercise(ex.id)}>
                {best ? "Try again" : "Start"}
              </button>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function OsceAssessmentPage() {
  const { progress, mode, asmt, startAssessment, abandonAssessment } = useTrainer();
  const { user } = useAuth();
  const [name, setName] = useState(progress.assessments[0]?.name || user?.name || "");
  const inProgress = mode === "assessment" && asmt && asmt.phase === "task";

  return (
    <div className="hub">
      <header className="hub-hero small">
        <p>
          <Link to="/osce" className="light-link">
            &larr; Menu
          </Link>
        </p>
        <h1>CAOSCE assessment</h1>
        <p>Pass or fail. No hints.</p>
      </header>

      <div className="report">
        {inProgress ? (
          <section className="card">
            <h3>Assessment in progress</h3>
            <p className="muted">
              You are on task {asmt.index + 1} of {TASK_COUNT}.
            </p>
            <div className="row-gap">
              <button className="btn btn-primary" onClick={() => navigate("/osce/dashboard")}>
                Resume
              </button>
              <button className="btn btn-light" onClick={abandonAssessment}>
                Abandon
              </button>
            </div>
          </section>
        ) : (
          <section className="card">
            <h3>Before you start</h3>
            <ul className="rules">
              <li>You get {TASK_COUNT} situations, one at a time. Each one has a time limit.</li>
              <li>There are no step lists, no tick marks and no hints. The server behaves like the real one.</li>
              <li>Click Finish task when you think the situation is resolved. You cannot go back.</li>
              <li>The names, procedures and station details change on every attempt.</li>
              <li>
                Your result appears only at the end: score, competency level and pass or fail. To pass you need{" "}
                {OSCE_STANDARD.competent}% overall and every must-pass task completed.
              </li>
            </ul>
            <label className="field-label">Your name</label>
            <input
              className="name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
            <div>
              <button className="btn btn-primary" disabled={!name.trim()} onClick={() => startAssessment(name)}>
                Begin assessment
              </button>
            </div>
          </section>
        )}

        {progress.assessments.length > 0 && (
          <section className="card table-wrap">
            <h3>Previous attempts</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Score</th>
                  <th>Level</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {progress.assessments.map((r) => (
                  <tr key={r.attemptId}>
                    <td>{new Date(r.finishedAt).toLocaleString()}</td>
                    <td>{r.name}</td>
                    <td className="num">{r.overall}%</td>
                    <td>
                      <span className={`level ${LEVEL_CLASS[r.level]}`}>{r.level}</span>
                    </td>
                    <td>{r.passed ? "Pass" : "Fail"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              <Link to="/osce/assessment/result">View latest report</Link>
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

export function OsceAssessmentResult() {
  const { asmt, progress } = useTrainer();
  const rec = asmt?.record || progress.assessments[0];

  if (!rec)
    return (
      <div className="hub">
        <header className="hub-hero small">
          <h1>Assessment result</h1>
        </header>
        <div className="report">
          <div className="card">
            No result yet. <Link to="/osce/assessment">Take the assessment</Link>.
          </div>
        </div>
      </div>
    );

  const total = rec.tasks.reduce((a, t) => a + t.timeSec, 0);
  const failed = rec.tasks.filter((t) => !t.passed);

  const download = () => {
    const blob = new Blob([JSON.stringify(rec, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assessment-${rec.attemptId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="hub">
      <header className="hub-hero small">
        <p>
          <Link to="/osce" className="light-link">
            &larr; Menu
          </Link>
        </p>
        <h1>CAOSCE assessment result</h1>
        <p>
          {rec.name} &middot; {new Date(rec.finishedAt).toLocaleString()}
        </p>
      </header>

      <div className="report">
        <section className={`verdict ${rec.passed ? "verdict-pass" : "verdict-fail"}`} data-testid="verdict">
          <div className="verdict-mark">{rec.passed ? <IconCheck size={30} /> : <IconCross size={30} />}</div>
          <div>
            <div className="verdict-word">{rec.passed ? "PASS" : "FAIL"}</div>
            <span className={`level ${LEVEL_CLASS[rec.level]}`}>{rec.level}</span>
          </div>
          <div className="verdict-score">
            <strong>{rec.overall}%</strong>
            <span>Overall score</span>
          </div>
          <div className="verdict-score">
            <strong>{fmt(total)}</strong>
            <span>Total time</span>
          </div>
        </section>
        {!rec.mustPassMet && (
          <div className="note">
            A must-pass task was not completed, so the result cannot be Competent regardless of the score.
          </div>
        )}

        <section className="card">
          <h3>Competency profile</h3>
          {rec.profile.map((p) => (
            <div className="bar-row" key={p.area}>
              <span>{p.area}</span>
              <div className="bar">
                <div style={{ width: `${p.score}%` }} className={p.score >= OSCE_STANDARD.taskPass ? "ok" : "low"} />
              </div>
              <span className="num">{p.score}%</span>
            </div>
          ))}
        </section>

        <section className="card table-wrap">
          <h3>Tasks</h3>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Task</th>
                <th>Area</th>
                <th>Result</th>
                <th>Score</th>
                <th>Mistakes</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {rec.tasks.map((t, i) => (
                <tr key={`${t.id}-${i}`}>
                  <td>{i + 1}</td>
                  <td>
                    {t.title}
                    {t.mustPass && <span className="must">must pass</span>}
                  </td>
                  <td>{t.area}</td>
                  <td>
                    <span className={`mark ${t.passed ? "mark-yes" : "mark-no"}`}>
                      {t.passed ? <IconCheck /> : <IconCross />}
                    </span>
                    {t.timedOut && !t.passed && <span className="muted"> timed out</span>}
                  </td>
                  <td className="num">{t.score}%</td>
                  <td className="num">{t.mistakes}</td>
                  <td className="num">{fmt(t.timeSec)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h3>What next</h3>
          {rec.passed && failed.length === 0 && <p>You have met the competency standard on every task.</p>}
          {rec.passed && failed.length > 0 && (
            <p>You met the standard overall. For extra practice, try the exercises below.</p>
          )}
          {!rec.passed && <p>You have not yet met the standard. Practise these areas, then retake the assessment.</p>}
          {failed.length > 0 && (
            <ul className="rules">
              {failed.map((t, i) => (
                <li key={`${t.id}-${i}`}>
                  {t.area}: practise &ldquo;{OSCE_EXERCISES.find((e) => e.id === t.practise)?.title || t.title}&rdquo; in
                  Exercises.
                </li>
              ))}
            </ul>
          )}
          {!rec.passed && <p className="muted">The guided tour covers every step if you need a refresher.</p>}
        </section>

        <div className="row-gap wrap">
          <Link to="/osce/assessment" className="btn btn-primary">
            Retake assessment
          </Link>
          <Link to="/osce/exercises" className="btn btn-light">
            Exercises
          </Link>
          <button className="btn btn-light" onClick={download}>
            Download record (JSON)
          </button>
        </div>
      </div>
    </div>
  );
}