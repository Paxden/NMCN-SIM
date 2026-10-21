import { useEffect, useRef, useState } from "react";
import { useSim } from "./store";
import { Link, navigate } from "./router";
import { EXAM, TOTAL_Q } from "./data";
import { ConfirmDialog } from "./components";
import { IconCheck, IconCross, IconDownload, IconUpload } from "./icons";

/* ---------- pre-admin pages ---------- */

export function CreateServer() {
  const { createServer, showToast } = useSim();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const r = createServer(id, pw);
    if (!r.ok) return showToast(r.msg, "error");
    showToast("Server created successfully");
    navigate("/admin");
  };

  return (
    <div className="center-page">
      <form className="card auth" onSubmit={submit} data-tour="create-form">
        <h2>Create Server</h2>
        <label>Server ID</label>
        <input value={id} onChange={(e) => setId(e.target.value)} autoFocus />
        <label>Password</label>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <button className="btn btn-primary block" type="submit" data-tour="create-btn">
          Create
        </button>
      </form>
    </div>
  );
}

export function Login() {
  const { login, server, showToast } = useSim();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const r = login(id, pw);
    if (!r.ok) return showToast(r.msg, "error");
    showToast("Login successful");
  };

  return (
    <div className="center-page">
      <form className="card auth" onSubmit={submit} data-tour="login-form">
        <h2>Admin Login</h2>
        {!server && (
          <div className="note">
            No server yet. <Link to="/createserver">Create one first</Link>.
          </div>
        )}
        <label>Server ID</label>
        <input value={id} onChange={(e) => setId(e.target.value)} autoFocus />
        <label>Password</label>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <button className="btn btn-primary block" type="submit">Login</button>
      </form>
    </div>
  );
}

/* ---------- admin shell ---------- */

const NAV = [
  ["/admin/home", "Home"],
  ["/admin/monitor", "Monitor"],
  ["/admin/manage", "Manage"],
  ["/admin/upload", "Download and Upload"],
  ["/admin/sync", "Synchronise"],
  ["/admin/reset", "Reset"],
];

export function AdminShell({ path }) {
  const { server, logout } = useSim();
  let page;
  if (path === "/admin" || path === "/admin/home") page = <Home />;
  else if (path === "/admin/manage") page = <Manage />;
  else if (path === "/admin/monitor") page = <Monitor />;
  else if (path === "/admin/monitor/infractions") page = <Infractions />;
  else if (path === "/admin/upload") page = <UploadDownload />;
  else if (path === "/admin/sync") page = <Synchronise />;
  else if (path === "/admin/reset") page = <Reset />;
  else page = <div className="card">Page not found.</div>;

  const current =
    path === "/admin" ? "/admin/home" : path.startsWith("/admin/monitor") ? "/admin/monitor" : path;

  return (
    <>
      <nav className="navbar" data-tour="navbar">
        <span className="brand">Server ID: {server?.id}</span>
        <div className="nav-links">
          {NAV.map(([to, label]) => (
            <Link key={to} to={to} className={current === to ? "active" : ""}>
              {label}
            </Link>
          ))}
        </div>
        <button className="btn btn-light btn-sm" onClick={logout}>Logout</button>
      </nav>
      <main className="container">{page}</main>
    </>
  );
}

/* ---------- pages ---------- */

function Home() {
  const { downloaded, activated, ended } = useSim();
  if (!downloaded)
    return (
      <div className="card" data-tour="home-card">
        <h2>No examination loaded</h2>
        <p className="muted">
          Go to <Link to="/admin/upload">Download and Upload</Link> and download the exam first.
        </p>
      </div>
    );
  const [label, color] = !activated
    ? ["Not activated", "gray"]
    : ended
    ? ["Ended", "red"]
    : ["In progress", "green"];
  return (
    <div className="card" data-tour="home-card">
      <h2>{EXAM.name}</h2>
      <p className="muted">{EXAM.description}</p>
      <span className={`badge badge-${color}`}>{label}</span>
    </div>
  );
}

function Monitor() {
  const { candidates, infractions, downloaded, activated, ended, endExam, showToast } = useSim();
  const [confirm, setConfirm] = useState(false);
  const writing = candidates.filter((c) => c.status === "writing").length;
  const submitted = candidates.filter((c) => c.status === "submitted").length;

  return (
    <>
      {!downloaded && (
        <div className="note">
          No exam loaded. Download it from <Link to="/admin/upload">Download and Upload</Link>.
        </div>
      )}
      {downloaded && !activated && (
        <div className="note">The exam has not been activated. Activate it from Download and Upload.</div>
      )}
      <div className="stats" data-tour="stats">
        <div className="stat"><div className="stat-label">Total candidate</div><div className="stat-num">{candidates.length}</div></div>
        <div className="stat"><div className="stat-label">Writing</div><div className="stat-num">{writing}</div></div>
        <div className="stat"><div className="stat-label">Submitted</div><div className="stat-num">{submitted}</div></div>
        <Link to="/admin/monitor/infractions" className="stat clickable" data-tour="infraction-card">
          <div className="stat-label">Infraction</div>
          <div className="stat-num">{infractions.length}</div>
        </Link>
      </div>

      <div className="actions-bar">
        <button
          className="btn btn-danger"
          data-tour="end-btn"
          disabled={!activated || ended}
          onClick={() => setConfirm(true)}
        >
          {ended ? "Exam Ended" : "End Exam"}
        </button>
      </div>

      <div className="card table-wrap scroll" data-tour="cand-table">
        <table>
          <thead>
            <tr><th>Exam No</th><th>Name</th><th>Session</th><th>Submitted</th></tr>
          </thead>
          <tbody>
            {candidates.length === 0 && (
              <tr><td colSpan={4} className="muted">No candidates yet.</td></tr>
            )}
            {candidates.map((c) => (
              <tr key={c.examNo}>
                <td>{c.examNo}</td>
                <td>{c.name}</td>
                <td className="num">{c.answered}/{TOTAL_Q}</td>
                <td>
                  {c.status === "submitted" ? (
                    <span className="mark mark-yes" title="Submitted"><IconCheck /></span>
                  ) : (
                    <span className="mark mark-no" title="Not submitted"><IconCross /></span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirm}
        danger
        title="End examination?"
        message="This will end the exam for all candidates. Anyone still writing will be submitted."
        confirmLabel="End Exam"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          const r = endExam();
          showToast(r.msg, r.ok ? "success" : "error");
        }}
      />
    </>
  );
}

function Infractions() {
  const { infractions, candidates, unflag, showToast } = useSim();
  const [no, setNo] = useState("");

  const grouped = Object.values(
    infractions.reduce((acc, i) => {
      (acc[i.examNo] ||= { examNo: i.examNo, items: [] }).items.push(i);
      return acc;
    }, {})
  );
  const nameOf = (x) => candidates.find((c) => c.examNo === x)?.name || "";

  const submit = (e) => {
    e.preventDefault();
    const r = unflag(no);
    showToast(r.msg, r.ok ? "success" : "error");
    if (r.ok) setNo("");
  };

  return (
    <>
      <p><Link to="/admin/monitor">&larr; Back to Monitor</Link></p>
      <form className="card inline-form" onSubmit={submit} data-tour="unflag-form">
        <label>Candidate Number</label>
        <input value={no} onChange={(e) => setNo(e.target.value)} placeholder="e.g. NSG26009" />
        <button className="btn btn-primary" type="submit">Remove Infraction</button>
      </form>

      <div className="card table-wrap" data-tour="infraction-list">
        <h3>Infractions by candidate</h3>
        {grouped.length === 0 ? (
          <p className="muted">No infractions recorded.</p>
        ) : (
          <table>
            <thead><tr><th>Exam No</th><th>Name</th><th>Count</th><th>Details</th></tr></thead>
            <tbody>
              {grouped.map((g) => (
                <tr key={g.examNo}>
                  <td>{g.examNo}</td>
                  <td>{nameOf(g.examNo)}</td>
                  <td><span className="badge badge-red">{g.items.length}</span></td>
                  <td>{g.items.map((i) => i.reason).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function Manage() {
  const { relogin, showToast } = useSim();
  const [no, setNo] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const r = relogin(no);
    showToast(r.msg, r.ok ? "success" : "error");
    if (r.ok) setNo("");
  };

  return (
    <form className="card inline-form" onSubmit={submit} data-tour="relogin-form">
      <label>Relogin Candidate</label>
      <input value={no} onChange={(e) => setNo(e.target.value)} placeholder="Candidate exam number" />
      <button className="btn btn-primary" type="submit">Relogin</button>
    </form>
  );
}

function Synchronise() {
  const { online, sync, showToast } = useSim();
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const run = () => {
    if (!online) return showToast("No internet connection. Connect to the internet and try again.", "error");
    setBusy(true);
    timer.current = setTimeout(() => {
      const r = sync();
      showToast(r.msg, r.ok ? "success" : "error");
      setBusy(false);
    }, 1200);
  };

  return (
    <div className="card">
      <h2>Synchronise</h2>
      <p className="muted">Download new data from the central server.</p>
      <button className="btn btn-primary" data-tour="sync-btn" onClick={run} disabled={busy}>
        {busy ? "Synchronising..." : "Synchronise"}
      </button>
    </div>
  );
}

const DL_ITEMS = ["Examination", "Candidates", "Questions"];

function UploadDownload() {
  const {
    candidates, online, downloaded, activated, ended, sessionActive, uploaded,
    download, activateExam, activateSession, uploadSession, showToast,
  } = useSim();
  const [phase, setPhase] = useState(-1); // -1 idle, 0..2 downloading item n
  const [details, setDetails] = useState(null);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const startDownload = () => {
    if (!online)
      return showToast("No internet connection. Connect to the internet and try again.", "error");
    setPhase(0);
    timers.current = [
      setTimeout(() => setPhase(1), 700),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => {
        const r = download();
        setPhase(-1);
        showToast(r.msg, r.ok ? "success" : "error");
      }, 2100),
    ];
  };

  const report = (r) => showToast(r.msg, r.ok ? "success" : "error");

  return (
    <>
      <div className="card" data-tour="exam-card">
        {!downloaded ? (
          <>
            <h2>Download Examination</h2>
            <p className="muted">
              Download the examination, its candidates and its questions from the central server.
              An internet connection is required.
            </p>
            <ul className="dl-list">
              {DL_ITEMS.map((n, i) => (
                <li key={n} className={phase > i ? "done" : phase === i ? "busy" : ""}>
                  <span className="dl-mark">
                    {phase > i ? <IconCheck size={15} /> : phase === i ? "…" : "•"}
                  </span>
                  {n}
                </li>
              ))}
            </ul>
            <button
              className="btn btn-primary btn-icon"
              data-tour="download-btn"
              onClick={startDownload}
              disabled={phase >= 0}
            >
              <IconDownload /> {phase >= 0 ? "Downloading..." : "Download"}
            </button>
          </>
        ) : (
          <>
            <h2>{EXAM.name}</h2>
            <p>
              Number of candidates: <strong>{candidates.length}</strong> &nbsp;·&nbsp; Questions:{" "}
              <strong>{TOTAL_Q}</strong>
            </p>
            <button
              className="btn btn-primary"
              data-tour="activate-btn"
              disabled={activated}
              onClick={() => report(activateExam())}
            >
              {activated ? "Exam Activated" : "Activate Exam"}
            </button>
          </>
        )}
      </div>

      {activated && (
        <div className="card" data-tour="session-list">
          <h3>Sessions</h3>
          {!ended && (
            <p className="muted">Upload becomes available after the exam has been ended on the Monitor page.</p>
          )}
          {EXAM.sessions.map((session, i) => {
            const active = !!sessionActive[session];
            const done = !!uploaded[session];
            return (
              <div className="row" key={session}>
                <a
                  href="#details"
                  className="link grow"
                  onClick={(e) => { e.preventDefault(); setDetails(session); }}
                >
                  {EXAM.name} <span className="muted">· {session}</span>
                </a>
                <button
                  className={`btn btn-sm ${active ? "btn-light" : "btn-primary"}`}
                  data-tour={`session-activate-${i}`}
                  disabled={active || ended}
                  onClick={() => report(activateSession(session))}
                >
                  {active ? "Session Active" : "Activate Session"}
                </button>
                <button
                  className="btn btn-success btn-sm btn-icon"
                  data-tour={`upload-${i}`}
                  disabled={!ended || !active || done}
                  onClick={() => report(uploadSession(session))}
                >
                  <IconUpload /> {done ? "Uploaded" : "Upload"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {details && (
        <div className="overlay" onClick={() => setDetails(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>{EXAM.name}</h3>
            <p>{details}</p>
            <p>
              Candidates: <strong>{candidates.filter((c) => c.session === details).length}</strong>
              <br />
              Submitted:{" "}
              <strong>
                {candidates.filter((c) => c.session === details && c.status === "submitted").length}
              </strong>
            </p>
            <div className="dialog-actions">
              <button className="btn btn-light" onClick={() => setDetails(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Reset() {
  const { resetCandidate, resetServer, showToast } = useSim();
  const [no, setNo] = useState("");
  const [dlg, setDlg] = useState(null); // "candidate" | "server"

  const askCandidate = (e) => {
    e.preventDefault();
    if (!no.trim()) return showToast("Enter the candidate exam number", "error");
    setDlg("candidate");
  };

  return (
    <>
      <form className="card inline-form" onSubmit={askCandidate} data-tour="reset-candidate">
        <label>Reset Candidate</label>
        <input value={no} onChange={(e) => setNo(e.target.value)} placeholder="Candidate exam number" />
        <button className="btn btn-warning" type="submit">Reset Candidate</button>
      </form>

      <div className="card" data-tour="reset-server">
        <h3>Reset Server</h3>
        <p className="muted">Clears the exam, candidates and all progress on this server.</p>
        <button className="btn btn-danger" onClick={() => setDlg("server")}>Reset Server</button>
      </div>

      <ConfirmDialog
        open={dlg === "candidate"}
        danger
        title="Reset candidate?"
        message={`Candidate ${no.trim().toUpperCase()} will lose their progress and must start again.`}
        confirmLabel="Reset"
        onCancel={() => setDlg(null)}
        onConfirm={() => {
          const r = resetCandidate(no);
          showToast(r.msg, r.ok ? "success" : "error");
          if (r.ok) setNo("");
          setDlg(null);
        }}
      />
      <ConfirmDialog
        open={dlg === "server"}
        danger
        title="Reset server?"
        message="The downloaded exam, candidates and all progress will be cleared. This cannot be undone."
        confirmLabel="Reset Server"
        onCancel={() => setDlg(null)}
        onConfirm={() => {
          const r = resetServer();
          showToast(r.msg);
          setDlg(null);
        }}
      />
    </>
  );
}
