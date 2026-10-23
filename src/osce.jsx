import { Fragment, useEffect, useRef, useState } from "react";
import { useSim } from "./store";
import { useOsce, SERVER_LOGIN } from "./osceStore";
import { Link, navigate } from "./router";
import { ConfirmDialog } from "./components";
import { Logo } from "./authPages";
import { IconCheck, IconDownload, IconUpload } from "./icons";
import {
  OsceHub,
  OsceExerciseList,
  OsceAssessmentPage,
  OsceAssessmentResult,
  useTrainer,
} from "./osceTrainer";
import {
  ALL_PROCEDURES, COMPONENTS, OSCE_EXAM, PROCEDURE_PORT, PROGRAMS, QUESTION_PORT,
  SERVER_IP, STATION_ORDER, procedureLabel,
} from "./osceData";

// Every action returns { ok, msg }; this turns the result into a toast.
function useReport() {
  const { showToast } = useSim();
  return (r) => showToast(r.msg, r.ok ? "success" : "error");
}

/* ---------- routing ---------- */

// /osce is the CAOSCE trainer menu. The server login is /osce/login.
export function OsceRoutes({ path }) {
  const { loggedIn } = useOsce();
  useEffect(() => {
    if (loggedIn && path === "/osce/login") navigate("/osce/dashboard");
  }, [loggedIn, path]);

  if (path === "/osce") return <OsceHub />;
  if (path === "/osce/exercises") return <OsceExerciseList />;
  if (path === "/osce/assessment") return <OsceAssessmentPage />;
  if (path === "/osce/assessment/result") return <OsceAssessmentResult />;
  if (!loggedIn) return <OsceLogin />;
  if (path === "/osce/login") return null;
  return <OsceShell path={path} />;
}

function OsceLogin() {
  const { login } = useOsce();
  const report = useReport();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const r = login(id, pw);
    report(r);
    if (r.ok) navigate("/osce/dashboard");
  };

  return (
    <div className="center-page">
      <form className="card auth" onSubmit={submit}>
        <h2>CAOSCE Server Login</h2>
        <div className="note">
          Sandbox login: Server ID <strong>{SERVER_LOGIN.id}</strong>, password <strong>{SERVER_LOGIN.password}</strong>.
        </div>
        <label>Server ID</label>
        <input value={id} onChange={(e) => setId(e.target.value)} autoFocus />
        <label>Password</label>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <button className="btn btn-primary block" type="submit">Login</button>
      </form>
    </div>
  );
}

/* ---------- shell: sidebar + page ---------- */

const SUB = [
  ["/osce/dashboard", "Dashboard"],
  ["/osce/download", "Download"],
  ["/osce/upload", "Upload"],
  ["/osce/ip-whitelist", "IP Whitelist"],
  ["/osce/sync", "Synchronize"],
];

function activeSub(path) {
  if (path.startsWith("/osce/examiners") || path.startsWith("/osce/view")) return "/osce/dashboard";
  return path;
}

function OsceShell({ path }) {
  const { logout } = useOsce();
  const [open, setOpen] = useState(true);
  const active = activeSub(path);

  let page;
  if (path === "/osce/home") page = <Home />;
  else if (path === "/osce/dashboard") page = <Dashboard />;
  else if (path === "/osce/examiners") page = <Examiners />;
  else if (path === "/osce/view") page = <ViewPrograms />;
  else if (path === "/osce/view/assign") page = <AssignExaminers />;
  else if (path.startsWith("/osce/view/program/")) page = <ProgramPage id={path.split("/").pop()} />;
  else if (path === "/osce/download") page = <DownloadPage />;
  else if (path === "/osce/upload") page = <UploadPage />;
  else if (path === "/osce/ip-whitelist") page = <IpWhitelist />;
  else if (path === "/osce/sync") page = <SyncPage />;
  else page = <div className="card">Page not found.</div>;

  return (
    <div className="osce-layout">
      <aside className="osce-side">
        <div className="osce-side-brand">
          <Logo size={38} />
          <div>
            <strong>CAOSCE</strong>
            <span>Server ID: {SERVER_LOGIN.id}</span>
          </div>
        </div>
        <nav>
          <Link to="/osce/home" className={`osce-nav ${path === "/osce/home" ? "active" : ""}`}>Home</Link>
          <button type="button" className="osce-nav parent" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <span>OSCE</span>
            <span className={`chev ${open ? "open" : ""}`}>&#9662;</span>
          </button>
          {open && (
            <div className="osce-sub">
              {SUB.map(([to, label]) => (
                <Link key={to} to={to} className={`osce-nav sub ${active === to ? "active" : ""}`}>{label}</Link>
              ))}
              <button
                type="button"
                className="osce-nav sub"
                onClick={() => {
                  logout();
                  navigate("/osce");
                }}
              >
                Log out
              </button>
            </div>
          )}
        </nav>
      </aside>
      <main className="osce-main">{page}</main>
      <OscePanel />
    </div>
  );
}

/* ---------- pages ---------- */

function Home() {
  const { downloaded, activated, components } = useOsce();
  if (!downloaded)
    return (
      <div className="card">
        <h2>No examination loaded</h2>
        <p className="muted">Go to <Link to="/osce/download">Download</Link> and download the examination first.</p>
      </div>
    );
  const [label, color] = !activated ? ["Not activated", "gray"] : components.osce === "ended" ? ["Ended", "red"] : ["Activated", "green"];
  return (
    <div className="card">
      <h2>{OSCE_EXAM.name}</h2>
      <p className="muted">{OSCE_EXAM.description}</p>
      <span className={`badge badge-${color}`}>{label}</span>
    </div>
  );
}

function Dashboard() {
  const o = useOsce();
  const report = useReport();
  const [confirm, setConfirm] = useState(null); // component key
  const target = COMPONENTS.find((c) => c.key === confirm);

  return (
    <>
      <div className="osce-top">
        <h2>Dashboard</h2>
        <Link to="/osce/examiners" className="btn btn-primary">Examiners</Link>
      </div>

      <div className="card">
        <h3>{OSCE_EXAM.name}</h3>
        <p className="muted" style={{ margin: 0 }}>
          Number of candidates: <strong>{o.candidates.length}</strong>
        </p>
      </div>

      <div className="comp-row">
        {COMPONENTS.map((c) => {
          const st = o.components[c.key];
          const isOsce = c.key === "osce";
          return (
            <div className="card comp-card" key={c.key}>
              <div className="comp-title">{c.label}</div>
              <div className="muted comp-day">{c.day}</div>
              <div className="comp-actions">
                {isOsce && st !== "idle" ? (
                  <Link to="/osce/view" className="btn btn-primary btn-sm">View</Link>
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={st !== "idle"}
                    onClick={() => report(o.startComponent(c.key))}
                  >
                    {st === "idle" ? "Start" : "Started"}
                  </button>
                )}
                <button className="btn btn-danger btn-sm" disabled={st !== "started"} onClick={() => setConfirm(c.key)}>
                  {st === "ended" ? "Ended" : "End"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!confirm}
        danger
        title={`End ${target?.label || ""}?`}
        message="This closes it for every examiner and candidate. It cannot be started again."
        confirmLabel="End"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          report(o.endComponent(confirm));
          setConfirm(null);
        }}
      />
    </>
  );
}

function Examiners() {
  const { examiners, createExaminer } = useOsce();
  const report = useReport();
  const [f, setF] = useState({ fullName: "", username: "", password: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const r = createExaminer(f);
    report(r);
    if (r.ok) setF({ fullName: "", username: "", password: "" });
  };

  return (
    <>
      <div className="osce-top">
        <h2>Examiners</h2>
        <Link to="/osce/dashboard" className="btn btn-light btn-sm">&larr; Back to Dashboard</Link>
      </div>
      <div className="two-col">
        <div className="card table-wrap">
          <h3>Examiner list</h3>
          <table>
            <thead><tr><th>#</th><th>Full name</th><th>Username</th></tr></thead>
            <tbody>
              {examiners.length === 0 && <tr><td colSpan={3} className="muted">No examiners yet. Create one on the right.</td></tr>}
              {examiners.map((e, i) => (
                <tr key={e.id}>
                  <td>{i + 1}</td>
                  <td>{e.fullName}{e.lead && <span className="must">lead</span>}</td>
                  <td>{e.username}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form className="card stack-form" onSubmit={submit}>
          <h3>Create examiner</h3>
          <label>Full name</label>
          <input value={f.fullName} onChange={set("fullName")} />
          <label>Username</label>
          <input value={f.username} onChange={set("username")} />
          <label>Password</label>
          <input type="password" value={f.password} onChange={set("password")} />
          <button className="btn btn-primary block" type="submit">Create</button>
        </form>
      </div>
    </>
  );
}

function ViewPrograms() {
  const { candidates, downloaded } = useOsce();
  return (
    <>
      <div className="osce-top">
        <div>
          <h2 style={{ marginBottom: 2 }}>OSCE</h2>
          <p className="muted" style={{ margin: 0 }}>{candidates.length} candidates</p>
        </div>
        <div className="row-gap">
          <Link to="/osce/dashboard" className="btn btn-light">&larr; Dashboard</Link>
          <Link to="/osce/view/assign" className="btn btn-primary">Assign Examiner</Link>
        </div>
      </div>
      {!downloaded && <div className="note">No candidates yet. Download the examination first.</div>}
      {PROGRAMS.map((p) => (
        <Link key={p.id} to={`/osce/view/program/${p.id}`} className="prog-row">
          <div>
            <div className="prog-name">{p.name}</div>
            <div className="muted">{candidates.filter((c) => c.program === p.id).length} candidates</div>
          </div>
          <span className="prog-go">&rarr;</span>
        </Link>
      ))}
    </>
  );
}

function AssignExaminers() {
  const { examiners, assignExaminer, makeLead } = useOsce();
  const report = useReport();
  const [draft, setDraft] = useState({});

  return (
    <>
      <div className="osce-top">
        <h2>Assign examiner</h2>
        <Link to="/osce/view" className="btn btn-light btn-sm">&larr; Back</Link>
      </div>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Username</th><th>Password</th><th>Procedure</th><th></th><th></th></tr>
          </thead>
          <tbody>
            {examiners.length === 0 && (
              <tr><td colSpan={6} className="muted">No examiners yet. <Link to="/osce/examiners">Create examiners</Link> first.</td></tr>
            )}
            {examiners.map((e) => {
              const value = draft[e.id] ?? e.procedure;
              return (
                <tr key={e.id}>
                  <td>{e.fullName}{e.lead && <span className="must">lead</span>}</td>
                  <td>{e.username}</td>
                  <td>{e.password}</td>
                  <td>
                    <select className="sel" value={value} onChange={(ev) => setDraft({ ...draft, [e.id]: ev.target.value })}>
                      <option value="">Select procedure</option>
                      {ALL_PROCEDURES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                  </td>
                  <td>
                    <button className="btn btn-warning btn-sm" onClick={() => report(makeLead(e.id))}>Make lead</button>
                  </td>
                  <td>
                    <button className="btn btn-primary btn-sm" onClick={() => report(assignExaminer(e.id, value))}>Update</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ProgramPage({ id }) {
  const { candidates } = useOsce();
  const program = PROGRAMS.find((p) => p.id === id);
  if (!program) return <div className="card">Programme not found. <Link to="/osce/view">Back</Link></div>;
  const list = candidates.filter((c) => c.program === id);

  return (
    <>
      <div className="osce-top">
        <div>
          <h2 style={{ marginBottom: 2 }}>{program.name}</h2>
          <p className="muted" style={{ margin: 0 }}>{list.length} candidates</p>
        </div>
        <Link to="/osce/view" className="btn btn-light btn-sm">&larr; Back</Link>
      </div>

      <div className="card">
        <h3>Procedures</h3>
        <ul className="rules" style={{ marginBottom: 0 }}>
          {program.procedures.map((name, i) => <li key={name}><strong>Procedure {i + 1}:</strong> {name}</li>)}
        </ul>
      </div>

      <div className="card table-wrap">
        <h3>Candidates</h3>
        <p className="muted" style={{ marginTop: 0 }}>Each circle turns green when the candidate finishes that station.</p>
        <table>
          <thead><tr><th>Exam No</th><th>Team</th><th>Stations</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={3} className="muted">No candidates yet.</td></tr>}
            {list.map((c) => (
              <tr key={c.examNo}>
                <td>{c.examNo}</td>
                <td>{c.team}</td>
                <td>
                  <div className="stn-row">
                    {STATION_ORDER.map((s, i) => (
                      <Fragment key={s}>
                        <span className={`stn ${c.progress[i] ? "done" : ""}`} title={c.progress[i] ? "Done" : "Not yet"}>{s}</span>
                        {i < STATION_ORDER.length - 1 && <span className="stn-arrow">&rarr;</span>}
                      </Fragment>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const DL_ITEMS = ["Examination", "Candidates", "Procedures and questions"];

function DownloadPage() {
  const o = useOsce();
  const report = useReport();
  const [phase, setPhase] = useState(-1);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const start = () => {
    if (!o.online) return report({ ok: false, msg: "No internet connection. Connect to the internet and try again." });
    setPhase(0);
    timers.current = [
      setTimeout(() => setPhase(1), 700),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => {
        report(o.download());
        setPhase(-1);
      }, 2100),
    ];
  };

  return (
    <div className="card">
      {!o.downloaded ? (
        <>
          <h2>Download Examination</h2>
          <p className="muted">Download the examination, its candidates and its procedures from the central server. An internet connection is required.</p>
          <ul className="dl-list">
            {DL_ITEMS.map((n, i) => (
              <li key={n} className={phase > i ? "done" : phase === i ? "busy" : ""}>
                <span className="dl-mark">{phase > i ? <IconCheck size={15} /> : phase === i ? "…" : "•"}</span>
                {n}
              </li>
            ))}
          </ul>
          <button className="btn btn-primary btn-icon" onClick={start} disabled={phase >= 0}>
            <IconDownload /> {phase >= 0 ? "Downloading..." : "Download"}
          </button>
        </>
      ) : (
        <>
          <h2>{OSCE_EXAM.name}</h2>
          <p>Number of candidates: <strong>{o.candidates.length}</strong></p>
          <button className="btn btn-primary" disabled={o.activated} onClick={() => report(o.activate())}>
            {o.activated ? "Examination Activated" : "Activate Examination"}
          </button>
        </>
      )}
    </div>
  );
}

function UploadPage() {
  const o = useOsce();
  const report = useReport();
  return (
    <>
      <h2>Upload</h2>
      <button className="upload-bar" onClick={() => report(o.upload())}>
        <div>
          <div className="upload-name">{OSCE_EXAM.name}</div>
          <div className="upload-text">{o.uploaded ? "Uploaded. Click to upload again" : "Upload CAOSCE"}</div>
        </div>
        <IconUpload size={46} />
      </button>
    </>
  );
}

function IpWhitelist() {
  const { ips, approveIp } = useOsce();
  const report = useReport();
  return (
    <>
      <h2>IP Whitelist</h2>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>IP address</th><th>Station</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {ips.length === 0 && (
              <tr><td colSpan={4} className="muted">No IP address has been added yet. Each station computer adds its own address first.</td></tr>
            )}
            {ips.map((i) => (
              <tr key={i.id}>
                <td>{i.ip}:{i.port}</td>
                <td>{i.port === PROCEDURE_PORT ? "Procedure station" : "Question station"}</td>
                <td><span className={`badge ${i.approved ? "badge-green" : "badge-gray"}`}>{i.approved ? "Approved" : "Pending"}</span></td>
                <td>
                  <button className="btn btn-success btn-sm" disabled={i.approved} onClick={() => report(approveIp(i.id))}>
                    {i.approved ? "Approved" : "Approve"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SyncPage() {
  const o = useOsce();
  const report = useReport();
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const run = () => {
    if (!o.online) return report({ ok: false, msg: "No internet connection. Connect to the internet and try again." });
    setBusy(true);
    timer.current = setTimeout(() => {
      report(o.sync());
      setBusy(false);
    }, 1200);
  };

  return (
    <div className="card">
      <h2>Synchronize</h2>
      <p className="muted">Download new data from the central server.</p>
      <button className="btn btn-primary" onClick={run} disabled={busy}>{busy ? "Synchronizing..." : "Synchronize"}</button>
    </div>
  );
}

/* ---------- the station computers (procedure :8000, question :7000) ---------- */

export function StationPage({ path }) {
  const o = useOsce();
  const report = useReport();
  const port = path.endsWith(String(QUESTION_PORT)) ? QUESTION_PORT : PROCEDURE_PORT;
  const isProc = port === PROCEDURE_PORT;
  const entry = o.primaryIp(port);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [who, setWho] = useState(null);

  const url = !entry ? `${SERVER_IP}:${port}/addipaddress` : `${SERVER_IP}:${port}`;

  const signIn = (e) => {
    e.preventDefault();
    const r = isProc ? o.examinerLogin(a, b) : o.candidateLogin(a);
    report(r);
    setWho(r.ok ? r : null);
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
  } else if (who) {
    body = (
      <>
        <h2>{who.msg}</h2>
        {isProc ? (
          <p className="muted">
            {who.examiner.lead
              ? "Lead examiner: you can see every procedure's candidate instructions and requirements."
              : who.examiner.procedure
              ? `Your procedure: ${procedureLabel(who.examiner.procedure)}`
              : "No procedure has been assigned to you yet."}
          </p>
        ) : (
          <p className="muted">Candidate {who.candidate.examNo}. Your question station is ready.</p>
        )}
        <button className="btn btn-light" onClick={() => setWho(null)}>Log out</button>
      </>
    );
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
        <span className="muted">{isProc ? "Procedure station computer" : "Question station computer"}</span>
      </div>
      <div className="browser">
        <div className="browser-bar">{url}</div>
        <div className="browser-body">{body}</div>
      </div>
    </div>
  );
}

/* ---------- sandbox tools ---------- */

function OscePanel() {
  const o = useOsce();
  const { mode } = useTrainer();
  const report = useReport();
  const [open, setOpen] = useState(false);
  const graded = mode === "assessment";

  return (
    <div className="sim">
      {open && (
        <div className="sim-panel">
          <div className="sim-head">
            <strong>Sandbox tools</strong>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>
          <div className="sim-body">
            <p className="hint">
              This is a sandbox. These tools stand in for the other laptops in the hall and for the candidates.
            </p>
            <label className="switch">
              <input type="checkbox" checked={o.online} onChange={(e) => o.setOnline(e.target.checked)} />
              <span>Internet connection: <strong>{o.online ? "Online" : "Offline"}</strong></span>
            </label>
            <button className="sim-item" onClick={() => navigate(`/osce-station/${PROCEDURE_PORT}`)}>
              Open a procedure station computer (:{PROCEDURE_PORT})
            </button>
            <button className="sim-item" onClick={() => navigate(`/osce-station/${QUESTION_PORT}`)}>
              Open a question station computer (:{QUESTION_PORT})
            </button>
            {!graded && (
              <button className="sim-item" onClick={() => report(o.simAddIps())}>4 more station computers add their IP</button>
            )}
            {!graded && (
              <button className="sim-item" onClick={() => report(o.simAdvance())}>5 candidates finish their next station</button>
            )}
            {mode === "free" && (
              <button className="sim-item danger" onClick={() => { o.wipe(); navigate("/osce"); }}>Wipe sandbox and start over</button>
            )}
          </div>
        </div>
      )}
      <button className="sim-fab" onClick={() => setOpen((v) => !v)}>Sandbox tools</button>
    </div>
  );
}