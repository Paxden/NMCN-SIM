import { useState } from "react";
import { useSim } from "./store";
import { Link, navigate } from "./router";
import { EXAM } from "./data";
import { ConfirmDialog } from "./components";

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
      <form className="card auth" onSubmit={submit}>
        <h2>Create Server</h2>
        <label>Server ID</label>
        <input value={id} onChange={(e) => setId(e.target.value)} autoFocus />
        <label>Password</label>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <button className="btn btn-primary block" type="submit">Create</button>
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
      <form className="card auth" onSubmit={submit}>
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
  ["/admin/manage", "Manage"],
  ["/admin/monitor", "Monitor"],
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

  const current = path === "/admin" ? "/admin/home" : path.startsWith("/admin/monitor") ? "/admin/monitor" : path;

  return (
    <>
      <nav className="navbar">
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

function statusLabel({ activated, ended }) {
  if (!activated) return ["Not activated", "gray"];
  if (ended) return ["Ended", "red"];
  return ["In progress", "green"];
}

function Home() {
  const sim = useSim();
  const [label, color] = statusLabel(sim);
  return (
    <div className="card">
      <h2>{EXAM.name}</h2>
      <p className="muted">{EXAM.description}</p>
      <span className={`badge badge-${color}`}>{label}</span>
    </div>
  );
}

function Monitor() {
  const { candidates, infractions, activated, ended, endExam, showToast } = useSim();
  const [confirm, setConfirm] = useState(false);
  const writing = candidates.filter((c) => c.status === "writing").length;
  const submitted = candidates.filter((c) => c.status === "submitted").length;

  return (
    <>
      {!activated && <div className="note">The exam has not been activated. Activate it from Download and Upload.</div>}
      <div className="stats">
        <div className="stat"><div className="stat-label">Total candidate</div><div className="stat-num">{candidates.length}</div></div>
        <div className="stat"><div className="stat-label">Writing</div><div className="stat-num">{writing}</div></div>
        <div className="stat"><div className="stat-label">Submitted</div><div className="stat-num">{submitted}</div></div>
        <Link to="/admin/monitor/infractions" className="stat clickable">
          <div className="stat-label">Infraction</div>
          <div className="stat-num">{infractions.length}</div>
        </Link>
      </div>

      <div className="actions-bar">
        <button
          className="btn btn-danger"
          disabled={!activated || ended}
          onClick={() => setConfirm(true)}
        >
          {ended ? "Exam Ended" : "End Exam"}
        </button>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Exam No</th><th>Name</th><th>Session</th><th>Submitted</th></tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.examNo}>
                <td>{c.examNo}</td>
                <td>{c.name}</td>
                <td>{c.session}</td>
                <td>
                  <span className={`badge badge-${c.status === "submitted" ? "green" : "gray"}`}>
                    {c.status === "submitted" ? "Yes" : "No"}
                  </span>
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
          endExam();
          showToast("Examination ended");
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
      <form className="card inline-form" onSubmit={submit}>
        <label>Candidate Number</label>
        <input value={no} onChange={(e) => setNo(e.target.value)} placeholder="e.g. NSG26009" />
        <button className="btn btn-primary" type="submit">Remove Infraction</button>
      </form>

      <div className="card table-wrap">
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
    <form className="card inline-form" onSubmit={submit}>
      <label>Relogin Candidate</label>
      <input value={no} onChange={(e) => setNo(e.target.value)} placeholder="Candidate exam number" />
      <button className="btn btn-primary" type="submit">Relogin</button>
    </form>
  );
}

function Synchronise() {
  const { sync, showToast } = useSim();
  const [busy, setBusy] = useState(false);

  const run = () => {
    setBusy(true);
    setTimeout(() => {
      const r = sync();
      showToast(r.msg, r.ok ? "success" : "error");
      setBusy(false);
    }, 1200);
  };

  return (
    <div className="card">
      <h2>Synchronise</h2>
      <p className="muted">Download new data from the central server.</p>
      <button className="btn btn-primary" onClick={run} disabled={busy}>
        {busy ? "Synchronising..." : "Synchronise"}
      </button>
    </div>
  );
}

function UploadDownload() {
  const { candidates, activated, ended, uploaded, activateExam, uploadSession, showToast } = useSim();
  const [details, setDetails] = useState(false);

  return (
    <>
      <div className="card">
        <h2>{EXAM.name}</h2>
        <p>Number of candidates: <strong>{candidates.length}</strong></p>
        <button className="btn btn-primary" onClick={() => { activateExam(); showToast("Exam activated"); }} disabled={activated}>
          {activated ? "Exam Activated" : "Activate Exam"}
        </button>
      </div>

      {activated && (
        <div className="card">
          <h3>Active sessions</h3>
          {!ended && <p className="muted">Upload becomes available after the exam has been ended on the Monitor page.</p>}
          {EXAM.sessions.map((session) => (
            <div className="row" key={session}>
              <button
                className="btn btn-success btn-sm"
                disabled={!ended || uploaded[session]}
                onClick={() => {
                  const r = uploadSession(session);
                  showToast(r.msg, r.ok ? "success" : "error");
                }}
              >
                {uploaded[session] ? "Uploaded" : "Upload"}
              </button>
              <a href="#details" className="link" onClick={(e) => { e.preventDefault(); setDetails(true); }}>
                {EXAM.name}
              </a>
              <span className="badge badge-green">{session} Active</span>
            </div>
          ))}
        </div>
      )}

      {details && (
        <div className="overlay" onClick={() => setDetails(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>{EXAM.name}</h3>
            {EXAM.sessions.map((session) => (
              <p key={session}>
                {session}: {candidates.filter((c) => c.session === session).length} candidates
              </p>
            ))}
            <div className="dialog-actions">
              <button className="btn btn-light" onClick={() => setDetails(false)}>Close</button>
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
      <form className="card inline-form" onSubmit={askCandidate}>
        <label>Reset Candidate</label>
        <input value={no} onChange={(e) => setNo(e.target.value)} placeholder="Candidate exam number" />
        <button className="btn btn-warning" type="submit">Reset Candidate</button>
      </form>

      <div className="card">
        <h3>Reset Server</h3>
        <p className="muted">Clears all candidate progress and infractions on this server.</p>
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
        message="All candidates will be reset and the exam will be deactivated. This cannot be undone."
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
