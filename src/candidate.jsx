import { useState } from "react";
import { useSim } from "./store";
import { Link, navigate } from "./router";
import { REASONS, TOTAL_Q } from "./data";
import { LETTERS, questionFor } from "./candidateData";
import { ConfirmDialog } from "./components";

const SERVER_URL = "192.168.1.100:4001";

// Button on the server pages, next to Sandbox tools. It opens the candidate computer.
export function CandidateButton() {
  return (
    <button
      className="cand-link"
      data-tour="cand-fab"
      onClick={() => navigate("/candidate")}
    >
      Candidate computer
    </button>
  );
}

// A candidate's computer, opened like the CAOSCE station computers: its own page in a browser frame.
// Everything done here is saved on the server state, so the Monitor page, Infractions, Relogin
// and Reset all reflect it.
export function CandidatePage() {
  const sim = useSim();
  const { candidates, cc, answers, showToast, mode, loggedIn } = sim;
  const [no, setNo] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [tools, setTools] = useState(false);

  const report = (r) => showToast(r.msg, r.ok ? "success" : "error");

  const me = candidates.find((c) => c.examNo === cc?.examNo);
  const mine = (me && answers?.[me.examNo]) || {};
  const count = Object.keys(mine).length;
  const q = Math.min(TOTAL_Q, Math.max(1, cc?.q || 1));
  const item = questionFor(q);
  const writing = me && me.status === "writing";

  const login = (e) => {
    e.preventDefault();
    const r = sim.candLogin(no);
    report(r);
    if (r.ok) setNo("");
  };

  const answer = (n, letter) => {
    const r = sim.candAnswer(n, letter);
    if (!r.ok) report(r);
  };

  let screen;
  if (!me) {
    screen = (
      <form onSubmit={login} className="cc-login" data-tour="cand-login">
        <h3>Candidate login</h3>
        <label>Exam number</label>
        <input
          value={no}
          onChange={(e) => setNo(e.target.value)}
          placeholder="e.g. NSG26005"
          autoFocus
        />
        <button className="btn btn-primary block" type="submit">
          Login
        </button>
        <p className="hint">
          A candidate can log in once their session has been activated on the
          server.
        </p>
      </form>
    );
  } else if (me.status === "submitted") {
    screen = (
      <div className="cc-login">
        <h3>Exam submitted</h3>
        <p className="muted">Candidate {me.examNo} has submitted. Thank you.</p>
        <button className="btn btn-light block" onClick={sim.candLeave}>
          Back to login
        </button>
      </div>
    );
  } else if (!writing) {
    screen = (
      <div className="cc-login">
        <h3>Session not active</h3>
        <p className="muted">
          This candidate cannot continue right now. Please see the invigilator.
        </p>
        <button className="btn btn-light block" onClick={sim.candLeave}>
          Back to login
        </button>
      </div>
    );
  } else {
    screen = (
      <div className="cc-split" data-tour="cand-exam">
        <div className="cc-main">
          <div className="cc-who">
            <strong>{me.name}</strong>
            <span>
              {me.examNo} · {me.session}
            </span>
          </div>
          <div className="cc-qhead">
            <span>
              Question {q} of {TOTAL_Q}
            </span>
            <span>
              {count}/{TOTAL_Q} answered
            </span>
          </div>
          <p className="cc-q">{item.q}</p>
          <div className="cc-opts">
            {item.o.map((text, i) => {
              const L = LETTERS[i];
              return (
                <label
                  key={L}
                  className={`cc-opt ${mine[q] === L ? "on" : ""}`}
                >
                  <input
                    type="radio"
                    name="cc-opt"
                    checked={mine[q] === L}
                    onChange={() => answer(q, L)}
                  />
                  <b>{L}.</b> {text}
                </label>
              );
            })}
          </div>
          <div className="cc-nav">
            <button
              className="btn btn-light btn-sm"
              disabled={q <= 1}
              onClick={() => sim.candGo(q - 1)}
            >
              Previous
            </button>
            <button
              className="btn btn-light btn-sm"
              disabled={q >= TOTAL_Q}
              onClick={() => sim.candGo(q + 1)}
            >
              Next
            </button>
          </div>
        </div>
        <div className="cc-side">
          <div className="cc-qhead">
            <strong>Questions</strong>
            <span>
              {count}/{TOTAL_Q}
            </span>
          </div>
          <div className="cc-grid">
            {Array.from({ length: TOTAL_Q }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                className={`cc-n ${mine[n] ? "done" : ""} ${n === q ? "cur" : ""}`}
                onClick={() => sim.candGo(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            className="btn btn-success block"
            onClick={() => setConfirm(true)}
          >
            Submit exam
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="station-wrap">
      <div className="station-top">
        <Link
          to={loggedIn ? "/admin/home" : "/admin"}
          className="btn btn-light btn-sm"
        >
          &larr; Back to the server
        </Link>
        <span className="muted">Candidate computer</span>
      </div>
      <div className="browser wide">
        <div className="browser-bar">{SERVER_URL}</div>
        <div className="cc-page-body">{screen}</div>
      </div>

      {/* Stand-ins for what a candidate does. Free play only: exercises and the assessment use the real screen. */}
      {mode === "free" && (
        <div className="sim">
          {tools && (
            <div className="sim-panel">
              <div className="sim-head">
                <strong>Sandbox tools</strong>
                <button
                  className="icon-btn"
                  onClick={() => setTools(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="sim-body">
                <p className="hint">
                  These tools stand in for the candidate, so you can see the
                  effect on the server.
                </p>
                {writing && (
                  <>
                    <button
                      className="sim-item"
                      onClick={() => report(sim.candAnswerNext(10))}
                    >
                      Answer the next 10 questions
                    </button>
                    {REASONS.map((r) => (
                      <button
                        key={r}
                        className="sim-item"
                        onClick={() => report(sim.candInfraction(r))}
                      >
                        Infraction: {r}
                      </button>
                    ))}
                    <button
                      className="sim-item danger"
                      onClick={() => report(sim.candCrash())}
                    >
                      Computer crashes
                    </button>
                  </>
                )}
                <button
                  className="sim-item"
                  onClick={() => report(sim.simAnswerSome())}
                >
                  Other candidates answer more questions
                </button>
              </div>
            </div>
          )}
          <button className="sim-fab" onClick={() => setTools((v) => !v)}>
            Sandbox tools
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirm}
        danger
        title="Submit your exam?"
        message={`You have answered ${count} of ${TOTAL_Q} questions. You cannot change your answers after submitting.`}
        confirmLabel="Submit"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          report(sim.candSubmit());
        }}
      />
    </div>
  );
}
