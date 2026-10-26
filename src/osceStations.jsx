import { useState } from "react";
import { useOsce } from "./osceStore";
import { Link } from "./router";
import { ConfirmDialog } from "./components";
import {
  COMPONENTS, PROCEDURE_PORT, PROGRAMS, QUESTION_PORT, SERVER_IP, procedureLabel,
} from "./osceData";
import { COMPONENT_STEPS, GRADES, PROCEDURE_DETAILS, QUESTIONS, stepsFor } from "./osceContent";
import { useReport } from "./osceShared";

const STATUS = { idle: ["Not started", "gray"], started: ["In progress", "green"], ended: ["Ended", "red"] };
const programName = (id) => PROGRAMS.find((p) => p.id === id)?.short || id;

/* ---------- the station computer page (procedure :8000, question :7000) ---------- */

export function StationPage({ path }) {
  const o = useOsce();
  const report = useReport();
  const port = path.endsWith(String(QUESTION_PORT)) ? QUESTION_PORT : PROCEDURE_PORT;
  const isProc = port === PROCEDURE_PORT;
  const entry = o.primaryIp(port);
  const session = isProc ? o.examinerSession : o.candidateSession;
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  const url = !entry ? `${SERVER_IP}:${port}/addipaddress` : `${SERVER_IP}:${port}`;
  const inApp = !!entry?.approved && !!session;

  const signIn = (e) => {
    e.preventDefault();
    const r = isProc ? o.examinerLogin(a, b) : o.candidateLogin(a);
    report(r);
    if (r.ok) {
      setA("");
      setB("");
    }
  };

  let body;
  if (!entry) {
    body = (
      <>
        <h2>Add IP address</h2>
        <p className="muted">This computer has not been registered with the server yet.</p>
        <button className="btn btn-primary" onClick={() => report(o.addStationIp(port))}>Add IP address</button>
      </>
    );
  } else if (!entry.approved) {
    body = (
      <>
        <h2>Access denied</h2>
        <p className="muted">This computer ({entry.ip}) is waiting for approval. Ask the exam manager to approve it on the IP Whitelist page, then reload.</p>
        <button className="btn btn-light" onClick={() => report({ ok: false, msg: "Still waiting for approval" })}>Reload</button>
      </>
    );
  } else if (session) {
    body = isProc ? <ExaminerApp /> : <CandidateApp />;
  } else {
    body = (
      <form onSubmit={signIn} className="stack-form">
        <h2>{isProc ? "Examiner login" : "Candidate login"}</h2>
        <label>{isProc ? "Username" : "Exam number"}</label>
        <input value={a} onChange={(e) => setA(e.target.value)} autoFocus />
        {isProc && (
          <>
            <label>Password</label>
            <input type="password" value={b} onChange={(e) => setB(e.target.value)} />
          </>
        )}
        <button className="btn btn-primary block" type="submit">Login</button>
      </form>
    );
  }

  return (
    <div className="station-wrap">
      <div className="station-top">
        <Link to="/osce/ip-whitelist" className="btn btn-light btn-sm">&larr; Back to the server</Link>
        <span className="muted">{isProc ? "Examiner computer" : "Candidate computer"}</span>
      </div>
      <div className={`browser ${inApp ? "wide" : ""}`}>
        <div className="browser-bar">{url}</div>
        <div className={inApp ? "browser-app" : "browser-body"}>{body}</div>
      </div>
    </div>
  );
}

/* ---------- examiner computer ---------- */

const EX_NAV = [
  ["dashboard", "Dashboard"],
  ["research", "Research"],
  ["viva", "Viva"],
  ["client_care", "Client Care"],
  ["family_care", "Expected Family Care"],
  ["procedure", "Procedure"],
  ["candidates", "Candidates"],
];

function ExaminerApp() {
  const o = useOsce();
  const sess = o.examinerSession;
  const me = o.examiners.find((e) => e.username === sess.username);
  const go = (page) => o.patchExaminerSession({ page, key: "", examNo: "" });

  let main;
  if (!me) main = <div className="note">This examiner account no longer exists. Log out and ask the exam manager.</div>;
  else if (sess.page === "dashboard") main = <ExDashboard me={me} />;
  else if (sess.page === "candidates") main = <ExCandidates />;
  else if (sess.page === "procedure") main = <ExProcedure me={me} />;
  else main = <ExComponent me={me} k={sess.page} />;

  return (
    <div className="ex-app">
      <nav className="ex-side">
        {EX_NAV.map(([k, label]) => (
          <button key={k} type="button" className={`ex-nav ${sess.page === k ? "active" : ""}`} onClick={() => go(k)}>
            {label}
          </button>
        ))}
        <button type="button" className="ex-nav" onClick={o.examinerLogout}>Logout</button>
      </nav>
      <div className="ex-main">{main}</div>
    </div>
  );
}

function ExDashboard({ me }) {
  const o = useOsce();
  const days = COMPONENTS.filter((c) => c.key !== "osce");
  const procScored = ["p1", "p2", "p3"].reduce((a, k) => a + Object.keys(o.scores?.[k] || {}).length, 0);
  const rows = [
    ...days.map((c) => ({ key: c.key, label: c.label, scored: Object.keys(o.scores?.[c.key] || {}).length })),
    { key: "osce", label: "Procedure (OSCE)", scored: procScored },
  ];
  return (
    <>
      <h3>Welcome, {me.fullName}</h3>
      <p className="muted">
        {me.lead
          ? "Lead examiner: you can see every procedure's candidate instructions and requirements."
          : me.procedure
          ? `Your procedure: ${procedureLabel(me.procedure)}`
          : "No procedure has been assigned to you yet."}
      </p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Component</th><th>Status</th><th>Candidates scored</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const [label, color] = STATUS[o.components[r.key]];
              return (
                <tr key={r.key}>
                  <td>{r.label}</td>
                  <td><span className={`badge badge-${color}`}>{label}</span></td>
                  <td className="num">{r.scored}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ExCandidates() {
  const o = useOsce();
  return (
    <>
      <h3>Candidates</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>S/N</th><th>Name</th><th>Exam no</th><th>Program</th></tr></thead>
          <tbody>
            {o.candidates.length === 0 && <tr><td colSpan={4} className="muted">No candidates yet.</td></tr>}
            {o.candidates.map((c, i) => (
              <tr key={c.examNo}><td>{i + 1}</td><td>{c.name}</td><td>{c.examNo}</td><td>{programName(c.program)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// Search box + list of candidates already scored. Shared by the Day 1 components and the procedure page.
function SearchAndScored({ k }) {
  const o = useOsce();
  const report = useReport();
  const [no, setNo] = useState("");
  const scored = Object.entries(o.scores?.[k] || {});

  const search = (e) => {
    e.preventDefault();
    const r = o.openCandidate(k, no);
    report(r);
    if (r.ok) setNo("");
  };

  return (
    <>
      <form className="ex-search" onSubmit={search}>
        <input value={no} onChange={(e) => setNo(e.target.value)} placeholder="Candidate exam number" />
        <button className="btn btn-primary" type="submit">Search</button>
      </form>
      <h4 className="ex-sub">Scored candidates</h4>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Exam no</th><th>Score</th></tr></thead>
          <tbody>
            {scored.length === 0 && <tr><td colSpan={2} className="muted">Nobody has been scored yet.</td></tr>}
            {scored.map(([examNo, sc]) => (
              <tr key={examNo}><td>{examNo}</td><td className="num">{sc.total} / {sc.max}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ExComponent({ me, k }) {
  const o = useOsce();
  const comp = COMPONENTS.find((c) => c.key === k);
  if (!comp || !COMPONENT_STEPS[k]) return <div className="note">Page not found.</div>;
  if (o.examinerSession.examNo && o.examinerSession.key === k) return <Scoring k={k} me={me} />;
  const [label, color] = STATUS[o.components[k]];
  return (
    <>
      <div className="ex-head">
        <h3>{comp.label}</h3>
        <span className={`badge badge-${color}`}>{label}</span>
      </div>
      <SearchAndScored k={k} />
    </>
  );
}

// The procedure page: the candidate instructions (left) and the requirements (right) come first,
// then the search box for scoring candidates.
function ExProcedure({ me }) {
  const o = useOsce();
  const sess = o.examinerSession;
  if (!me.lead && !me.procedure)
    return (
      <>
        <h3>Procedure</h3>
        <div className="note">No procedure has been assigned to you yet. Ask the exam manager.</div>
      </>
    );

  const key = me.lead ? sess.procKey || "p1" : me.procedure.split("-")[1];
  if (sess.examNo && sess.key === key) return <Scoring k={key} me={me} />;

  const [label, color] = STATUS[o.components.osce];
  // The lead examiner sees the instructions and requirements of every program for the chosen procedure.
  const details = me.lead
    ? PROGRAMS.map((p) => ({ id: `${p.id}-${key}`, program: p.short, ...PROCEDURE_DETAILS[`${p.id}-${key}`] }))
    : [{ id: me.procedure, program: programName(me.procedure.split("-")[0]), ...PROCEDURE_DETAILS[me.procedure] }];

  return (
    <>
      <div className="ex-head">
        <h3>{me.lead ? "Procedure (lead examiner)" : procedureLabel(me.procedure)}</h3>
        <span className={`badge badge-${color}`}>{label}</span>
      </div>
      {me.lead && (
        <div className="ex-pick">
          <label>Procedure</label>
          <select className="sel" value={key} onChange={(e) => o.patchExaminerSession({ procKey: e.target.value })}>
            <option value="p1">Procedure 1</option>
            <option value="p2">Procedure 2</option>
            <option value="p3">Procedure 3</option>
          </select>
        </div>
      )}

      {details.map((d) => (
        <div className="card ex-detail" key={d.id}>
          <strong>{d.program}: {d.title}</strong>
          <div className="ex-brief">
            <div>
              <h5>Candidate instructions</h5>
              <p>{d.instructions}</p>
            </div>
            <div>
              <h5>Requirements</h5>
              <ul className="rules">{d.requirements.map((r) => <li key={r}>{r}</li>)}</ul>
            </div>
          </div>
        </div>
      ))}

      <h4 className="ex-sub">Score a candidate</h4>
      <SearchAndScored k={key} />
    </>
  );
}

// The scoring page: every step has the grades 0, 0.5, 1, 1.5 and 2.
function Scoring({ k, me }) {
  const o = useOsce();
  const report = useReport();
  const examNo = o.examinerSession.examNo;
  const c = o.candidates.find((x) => x.examNo === examNo);
  const steps = c ? stepsFor(k, c.program) : [];
  const prev = o.scores?.[k]?.[examNo];
  const [grades, setGrades] = useState(() => (prev ? [...prev.grades] : steps.map(() => null)));
  if (!c) return null;

  const isProc = /^p[1-3]$/.test(k);
  const title = isProc ? PROCEDURE_DETAILS[`${c.program}-${k}`]?.title : COMPONENTS.find((x) => x.key === k)?.label;
  const total = grades.reduce((a, g) => a + (g || 0), 0);
  const back = () => o.patchExaminerSession({ key: "", examNo: "" });

  const submit = () => {
    const r = o.submitScore(k, examNo, grades, me.username);
    report(r);
    if (r.ok) back();
  };

  return (
    <>
      <div className="ex-head">
        <div>
          <h3>{title}</h3>
          <p className="muted" style={{ margin: 0 }}>{c.name} &middot; {c.examNo} &middot; {programName(c.program)}</p>
        </div>
        <button className="btn btn-light btn-sm" onClick={back}>&larr; Back</button>
      </div>
      <ol className="score-steps">
        {steps.map((text, i) => (
          <li key={text}>
            <div className="score-text">{i + 1}. {text}</div>
            <div className="grades">
              {GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`grade ${grades[i] === g ? "on" : ""}`}
                  onClick={() => setGrades(grades.map((x, j) => (j === i ? g : x)))}
                >
                  {g}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <div className="score-foot">
        <strong>Total: {total} / {steps.length * 2}</strong>
        <button className="btn btn-primary" onClick={submit}>{prev ? "Update score" : "Submit score"}</button>
      </div>
    </>
  );
}

/* ---------- candidate computer ---------- */

function CandidateApp() {
  const o = useOsce();
  const sess = o.candidateSession;
  const c = o.candidates.find((x) => x.examNo === sess.examNo);
  if (!c)
    return (
      <div className="ex-main">
        <div className="note">Candidate not found.</div>
        <button className="btn btn-light" onClick={o.candidateLogout}>Log out</button>
      </div>
    );
  if (sess.q) return <QuestionStation c={c} />;

  const done = [1, 2, 3].map((n) => !!c.progress[(n - 1) * 2 + 1]);
  const all = done.every(Boolean);
  return (
    <div className="ex-main">
      <div className="ex-head">
        <div>
          <h3>Welcome, {c.name}</h3>
          <p className="muted" style={{ margin: 0 }}>{c.examNo} &middot; {programName(c.program)}</p>
        </div>
        <button className="btn btn-light btn-sm" onClick={o.candidateLogout}>Log out</button>
      </div>
      {all ? (
        <div className="note">You have completed all your question stations. Please log out.</div>
      ) : (
        <p>Select the question station you want to attend first.</p>
      )}
      <div className="q-cards">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            className="q-card"
            disabled={done[n - 1]}
            onClick={() => o.patchCandidateSession({ q: n, idx: 0, answers: [] })}
          >
            <strong>Question station {n}</strong>
            <div className="muted">Station {n * 2} of 6</div>
            <div className="q-state">{done[n - 1] ? "Submitted" : "Start"}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// A simple CBT page: one question at a time, with a question navigator.
function QuestionStation({ c }) {
  const o = useOsce();
  const report = useReport();
  const sess = o.candidateSession;
  const qs = QUESTIONS[c.program]?.[sess.q] || [];
  const answers = sess.answers || [];
  const idx = Math.min(sess.idx || 0, Math.max(0, qs.length - 1));
  const q = qs[idx];
  const [ask, setAsk] = useState(false);
  const answered = qs.filter((_, i) => answers[i] != null).length;

  const pick = (i) => {
    const next = [...answers];
    next[idx] = i;
    o.patchCandidateSession({ answers: next });
  };
  const submit = () => {
    report(o.submitQuestions(c.examNo, sess.q, answers));
    setAsk(false);
  };

  if (!q) return <div className="ex-main"><div className="note">No questions for this station.</div></div>;

  return (
    <div className="cbt">
      <div className="cbt-bar">
        <strong>Question station {sess.q}</strong>
        <span>{c.name} &middot; {c.examNo}</span>
      </div>
      <div className="cbt-body">
        <p className="muted">Question {idx + 1} of {qs.length}</p>
        <p className="cbt-q">{q.text}</p>
        {q.options.map((opt, i) => (
          <label key={opt} className={`cbt-opt ${answers[idx] === i ? "on" : ""}`}>
            <input type="radio" name={`q${idx}`} checked={answers[idx] === i} onChange={() => pick(i)} />
            <span>{String.fromCharCode(65 + i)}. {opt}</span>
          </label>
        ))}
        <div className="cbt-nav">
          <button className="btn btn-light" disabled={idx === 0} onClick={() => o.patchCandidateSession({ idx: idx - 1 })}>Previous</button>
          {idx < qs.length - 1 ? (
            <button className="btn btn-primary" onClick={() => o.patchCandidateSession({ idx: idx + 1 })}>Next</button>
          ) : (
            <button className="btn btn-success" onClick={() => setAsk(true)}>Submit</button>
          )}
        </div>
        <div className="cbt-chips">
          {qs.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`cbt-chip ${answers[i] != null ? "done" : ""} ${i === idx ? "cur" : ""}`}
              onClick={() => o.patchCandidateSession({ idx: i })}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={ask}
        title="Submit your answers?"
        message={`You have answered ${answered} of ${qs.length} questions. You cannot come back to this station.`}
        confirmLabel="Submit"
        onCancel={() => setAsk(false)}
        onConfirm={submit}
      />
    </div>
  );
}