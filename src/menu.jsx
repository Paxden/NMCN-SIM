import { useState } from "react";
import { useSim } from "./store";
import { Link, navigate } from "./router";
import { EXERCISES } from "./exercises";
import { STANDARD, TASK_COUNT } from "./assessment";
import { TOUR_STEPS } from "./tourSteps";
import { IconCheck, IconCross } from "./icons";
import { AccountBar } from "./authPages";

export function Hub() {
  const { progress, mode, server, startFree, goStep } = useSim();
  const doneCount = EXERCISES.filter((e) => progress.exercises[e.id]).length;
  const resume = mode === "free" && server;
  const last = progress.assessments[0];

  return (
    <div className="hub">
      <AccountBar />
      <header className="hub-hero">
        <h1>CBT Server Trainer</h1>
        <p>Learn the exam server, practise freely, then prove it with real tasks.</p>
      </header>

      <div className="hub-grid">
        <section className="hub-card">
          <div className="hub-num">1</div>
          <h2>Guided tour</h2>
          <p>
            A step-by-step walkthrough from creating the server to resetting it. Each button is
            circled and explained. Click Next to continue or Skip to leave.
          </p>
          <div className="hub-meta">
            {TOUR_STEPS.length} steps
            {progress.guideDone && <span className="hub-done"><IconCheck size={14} /> Completed</span>}
          </div>
          <button className="btn btn-primary" onClick={() => goStep(0)}>
            {progress.guideDone ? "Replay tour" : "Start tour"}
          </button>
        </section>

        <section className="hub-card">
          <div className="hub-num">2</div>
          <h2>Free play</h2>
          <p>
            A sandbox copy of the CBT server. Click anything, make mistakes, reset and try again.
            Nothing is graded.
          </p>
          <div className="hub-meta">No goals, no timer</div>
          <button className="btn btn-primary" onClick={startFree}>
            {resume ? "Continue sandbox" : "Open sandbox"}
          </button>
        </section>

        <section className="hub-card">
          <div className="hub-num">3</div>
          <h2>Exercises</h2>
          <p>
            Real situations from exam day: a disconnected candidate, a wrong flag, closing the exam.
            Each task is timed and checks your steps.
          </p>
          <div className="hub-meta">
            {doneCount} of {EXERCISES.length} completed
          </div>
          <Link to="/exercises" className="btn btn-primary">View exercises</Link>
        </section>

        <section className="hub-card">
          <div className="hub-num">4</div>
          <h2>Assessment</h2>
          <p>
            {TASK_COUNT} timed situations with no hints and no step lists. Your score, competency
            level and pass or fail appear at the end.
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
          <Link to="/assessment" className="btn btn-primary">
            {last ? "Retake assessment" : "Take assessment"}
          </Link>
        </section>
      </div>
    </div>
  );
}

export function ExerciseList() {
  const { progress, startExercise } = useSim();
  const fmt = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

  return (
    <div className="hub">
      <header className="hub-hero small">
        <p><Link to="/" className="light-link">&larr; Menu</Link></p>
        <h1>Exercises</h1>
        <p>Each exercise resets the sandbox to the situation described. Complete the steps in order.</p>
      </header>

      <div className="ex-list">
        {EXERCISES.map((ex, i) => {
          const best = progress.exercises[ex.id];
          return (
            <section className="ex-card" key={ex.id}>
              <div className="ex-top">
                <span className="ex-n">{i + 1}</span>
                <span className={`level level-${ex.level.toLowerCase()}`}>{ex.level}</span>
                {best && <span className="hub-done"><IconCheck size={14} /> Done</span>}
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

/* ---------- assessment ---------- */

const fmtTime = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
const LEVEL_CLASS = {
  "Highly Competent": "lvl-high",
  Competent: "lvl-comp",
  "Requires Remediation": "lvl-rem",
  "Not Competent": "lvl-not",
};

export function AssessmentPage() {
  const { progress, mode, assessment, loggedIn, server, startAssessment, abandonAssessment } = useSim();
  const [name, setName] = useState(progress.assessments[0]?.name || "");
  const inProgress = mode === "assessment" && assessment && assessment.phase !== "done";

  return (
    <div className="hub">
      <header className="hub-hero small">
        <p><Link to="/" className="light-link">&larr; Menu</Link></p>
        <h1>Assessment</h1>
        <p>Pass or fail. No hints.</p>
      </header>

      <div className="report">
        {inProgress ? (
          <section className="card">
            <h3>Assessment in progress</h3>
            <p className="muted">
              You are on task {assessment.index + 1} of {TASK_COUNT}.
            </p>
            <div className="row-gap">
              <button
                className="btn btn-primary"
                onClick={() => navigate(loggedIn ? "/admin/home" : server ? "/admin" : "/createserver")}
              >
                Resume
              </button>
              <button className="btn btn-light" onClick={abandonAssessment}>Abandon</button>
            </div>
          </section>
        ) : (
          <section className="card">
            <h3>Before you start</h3>
            <ul className="rules">
              <li>You get {TASK_COUNT} situations, one at a time. Each one has a time limit.</li>
              <li>There are no step lists, no tick marks and no hints. The server behaves like the real one.</li>
              <li>Click Finish task when you think the situation is resolved. You cannot go back.</li>
              <li>The candidates in the situations change on every attempt.</li>
              <li>
                Your result appears only at the end: score, competency level and pass or fail. To pass
                you need {STANDARD.competent}% overall and every must-pass task completed.
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
              <button
                className="btn btn-primary"
                disabled={!name.trim()}
                onClick={() => startAssessment(name)}
              >
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
                <tr><th>Date</th><th>Name</th><th>Score</th><th>Level</th><th>Result</th></tr>
              </thead>
              <tbody>
                {progress.assessments.map((r) => (
                  <tr key={r.attemptId}>
                    <td>{new Date(r.finishedAt).toLocaleString()}</td>
                    <td>{r.name}</td>
                    <td className="num">{r.overall}%</td>
                    <td><span className={`level ${LEVEL_CLASS[r.level]}`}>{r.level}</span></td>
                    <td>{r.passed ? "Pass" : "Fail"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p><Link to="/assessment/result">View latest report</Link></p>
          </section>
        )}
      </div>
    </div>
  );
}

export function AssessmentResult() {
  const { assessment, progress } = useSim();
  const rec = assessment?.record || progress.assessments[0];

  if (!rec)
    return (
      <div className="hub">
        <header className="hub-hero small"><h1>Assessment result</h1></header>
        <div className="report">
          <div className="card">No result yet. <Link to="/assessment">Take the assessment</Link>.</div>
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
        <p><Link to="/" className="light-link">&larr; Menu</Link></p>
        <h1>Assessment result</h1>
        <p>{rec.name} &middot; {new Date(rec.finishedAt).toLocaleString()}</p>
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
            <strong>{fmtTime(total)}</strong>
            <span>Total time</span>
          </div>
        </section>
        {!rec.mustPassMet && (
          <div className="note">A must-pass task was not completed, so the result cannot be Competent regardless of the score.</div>
        )}

        <section className="card">
          <h3>Competency profile</h3>
          {rec.profile.map((p) => (
            <div className="bar-row" key={p.area}>
              <span>{p.area}</span>
              <div className="bar"><div style={{ width: `${p.score}%` }} className={p.score >= STANDARD.taskPass ? "ok" : "low"} /></div>
              <span className="num">{p.score}%</span>
            </div>
          ))}
        </section>

        <section className="card table-wrap">
          <h3>Tasks</h3>
          <table>
            <thead>
              <tr><th>#</th><th>Task</th><th>Area</th><th>Result</th><th>Score</th><th>Mistakes</th><th>Time</th></tr>
            </thead>
            <tbody>
              {rec.tasks.map((t, i) => (
                <tr key={t.id}>
                  <td>{i + 1}</td>
                  <td>{t.title}{t.mustPass && <span className="must">must pass</span>}</td>
                  <td>{t.area}</td>
                  <td>
                    <span className={`mark ${t.passed ? "mark-yes" : "mark-no"}`}>
                      {t.passed ? <IconCheck /> : <IconCross />}
                    </span>
                    {t.timedOut && !t.passed && <span className="muted"> timed out</span>}
                  </td>
                  <td className="num">{t.score}%</td>
                  <td className="num">{t.mistakes}</td>
                  <td className="num">{fmtTime(t.timeSec)}</td>
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
              {failed.map((t) => (
                <li key={t.id}>
                  {t.area}: practise &ldquo;{EXERCISES.find((e) => e.id === t.id)?.title || t.title}&rdquo; in Exercises.
                </li>
              ))}
            </ul>
          )}
          {!rec.passed && <p className="muted">The guided tour covers every step if you need a refresher.</p>}
        </section>

        <div className="row-gap wrap">
          <Link to="/assessment" className="btn btn-primary">Retake assessment</Link>
          <Link to="/exercises" className="btn btn-light">Exercises</Link>
          <button className="btn btn-light" onClick={download}>Download record (JSON)</button>
        </div>
      </div>
    </div>
  );
}