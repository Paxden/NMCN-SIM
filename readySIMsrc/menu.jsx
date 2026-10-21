import { useSim } from "./store";
import { Link } from "./router";
import { EXERCISES } from "./exercises";
import { TOUR_STEPS } from "./tourSteps";
import { IconCheck } from "./icons";

export function Hub() {
  const { progress, mode, server, startFree, goStep } = useSim();
  const doneCount = EXERCISES.filter((e) => progress.exercises[e.id]).length;
  const resume = mode === "free" && server;

  return (
    <div className="hub">
      <header className="hub-hero">
        <h1>CBT Admin Trainer</h1>
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
