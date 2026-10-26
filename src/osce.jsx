import { Fragment, useEffect, useRef, useState } from "react";
import { useOsce, SERVER_LOGIN, NO_NET } from "./osceStore";
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
  STATION_ORDER, procedureLabel,
} from "./osceData";
import { Bar, componentProgress, useReport } from "./osceShared";
import { CreateCentre } from "./osceCentre";

// App.jsx imports StationPage from here.
export { StationPage } from "./osceStations";

// Bottom-left button back to the CAOSCE menu, like the CBT sandbox has.
function MenuFab() {
  const { mode } = useTrainer();
  // Not during the tour or the assessment, where leaving would break the run.
  if (mode === "tour" || mode === "assessment") return null;
  return (
    <button type="button" className="menu-fab" onClick={() => navigate("/osce")}>
      Menu
    </button>
  );
}

/* ---------- routing ---------- */

// /osce is the CAOSCE trainer menu.
// The server starts at /osce/createcentre (first time only), then /osce/login, then the dashboard.
// Which of the two first pages shows depends on whether the centre has been created, not on the address.
export function OsceRoutes({ path }) {
  const { loggedIn } = useOsce();
  const { centreCreated } = useOsce();
  useEffect(() => {
    if (loggedIn && (path === "/osce/login" || path === "/osce/createcentre")) navigate("/osce/dashboard");
  }, [loggedIn, path]);

  if (path === "/osce") return <OsceHub />;
  if (path === "/osce/exercises") return <OsceExerciseList />;
  if (path === "/osce/assessment") return <OsceAssessmentPage />;
  if (path === "/osce/assessment/result") return <OsceAssessmentResult />;
 if (!loggedIn)
  return (
    <>
      {centreCreated ? <OsceLogin /> : <CreateCentre />}
      <MenuFab />
    </>
  );
  if (path === "/osce/login" || path === "/osce/createcentre") return null;
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
          Login works without internet.
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

// The exam page, examiners, candidates and the OSCE view all belong under Dashboard.
function activeSub(path) {
  if (path.startsWith("/osce/exam") || path.startsWith("/osce/candidates") || path.startsWith("/osce/view"))
    return "/osce/dashboard";
  return path;
}

function OsceShell({ path }) {
  const { logout } = useOsce();
  const [open, setOpen] = useState(true);
  const active = activeSub(path);

  let page;
  if (path === "/osce/home") page = <Home />;
  else if (path === "/osce/dashboard") page = <Dashboard />;
  else if (path === "/osce/exam") page = <ExamPage />;
  else if (path === "/osce/examiners") page = <Examiners />;
  else if (path === "/osce/candidates") page = <CandidatesPage />;
  else if (path === "/osce/view") page = <ViewPrograms />;
  else if (path.startsWith("/osce/view/assign")) page = <AssignExaminers focus={path.split("/")[4] || ""} />;
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

// The list of examinations. View opens the exam page.
function Dashboard() {
  const { downloaded } = useOsce();
  const { mode } = useTrainer();
  const procedureCount = PROGRAMS.reduce((a, p) => a + p.procedures.length, 0);
  return (
    <>
      <div className="osce-top">
        <h2>CAOSCE Dashboard</h2>
      </div>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>S/N</th><th>Examination</th><th>Programs</th><th>Procedures</th><th>Action</th></tr>
          </thead>
          <tbody>
            {!downloaded && (
              <tr>
                <td colSpan={5} className="muted">
                  No examination loaded.
                  {mode !== "assessment" && <> Go to <Link to="/osce/download">Download</Link> first.</>}
                </td>
              </tr>
            )}
            {downloaded && (
              <tr>
                <td>1</td>
                <td>{OSCE_EXAM.name}</td>
                <td>{PROGRAMS.map((p) => p.short).join(", ")}</td>
                <td className="num">{procedureCount}</td>
                <td><Link to="/osce/exam" className="btn btn-primary btn-sm">View</Link></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// One examination: its components, with progress, and the Examiners and Candidates buttons.
function ExamPage() {
  const o = useOsce();
  const report = useReport();
  const [ask, setAsk] = useState(null); // { type: "start" | "end", key }
  const comp = COMPONENTS.find((c) => c.key === ask?.key);
  const total = o.candidates.length;
  const ending = ask?.type === "end";

  return (
    <>
      <div className="osce-top">
        <Link to="/osce/dashboard" className="btn btn-light btn-sm">&larr; Dashboard</Link>
        <div className="row-gap">
          <Link to="/osce/examiners" className="btn btn-primary">Examiners</Link>
          <Link to="/osce/candidates" className="btn btn-primary">Candidates</Link>
        </div>
      </div>

      <div className="card exam-head">
        <h3>{OSCE_EXAM.name}</h3>
        <p className="muted" style={{ margin: 0 }}>
          Number of candidates: <strong>{total}</strong>
        </p>
      </div>

      <h3 className="section-title">OSCE Components</h3>
      <div className="comp-row">
        {COMPONENTS.map((c) => {
          const st = o.components[c.key];
          const isOsce = c.key === "osce";
          const done = componentProgress(o, c.key);
          return (
            <div className="card comp-card" key={c.key}>
              <div className="comp-title">{c.label}</div>
              <div className="muted comp-day">
                {done} of {total} candidates {isOsce ? "finished" : "scored"}
              </div>
              <Bar value={done} max={total} />
              <div className="comp-actions">
                {isOsce && st !== "idle" ? (
                  <Link to="/osce/view" className="btn btn-primary btn-sm">View</Link>
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={st !== "idle"}
                    onClick={() => setAsk({ type: "start", key: c.key })}
                  >
                    {st === "idle" ? "Start" : "Started"}
                  </button>
                )}
                <button
                  className="btn btn-danger btn-sm"
                  disabled={st !== "started"}
                  onClick={() => setAsk({ type: "end", key: c.key })}
                >
                  {st === "ended" ? "Ended" : "End"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!ask}
        danger={ending}
        title={`${ending ? "End" : "Start"} ${comp?.label || ""}?`}
        message={
          ending
            ? "This closes it for every examiner and candidate. It cannot be started again."
            : ask?.key === "osce"
            ? "Candidates will be able to log in at the question stations and examiners can start scoring."
            : "Examiners will be able to score candidates once it has started."
        }
        confirmLabel={ending ? "End" : "Start"}
        onCancel={() => setAsk(null)}
        onConfirm={() => {
          report(ending ? o.endComponent(ask.key) : o.startComponent(ask.key));
          setAsk(null);
        }}
      />
    </>
  );
}

function CandidatesPage() {
  const { candidates } = useOsce();
  const [q, setQ] = useState("");
  const list = candidates.filter((c) => `${c.name} ${c.examNo}`.toLowerCase().includes(q.trim().toLowerCase()));
  const programName = (id) => PROGRAMS.find((p) => p.id === id)?.name || id;

  return (
    <>
      <div className="osce-top">
        <h2>Candidates</h2>
        <Link to="/osce/exam" className="btn btn-light btn-sm">&larr; Back</Link>
      </div>
      <div className="card table-wrap">
        <input
          className="name-input"
          placeholder="Search by name or exam number"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <table>
          <thead><tr><th>S/N</th><th>Name</th><th>Exam no</th><th>Program</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={4} className="muted">No candidates to show.</td></tr>}
            {list.map((c, i) => (
              <tr key={c.examNo}>
                <td>{i + 1}</td>
                <td>{c.name}</td>
                <td>{c.examNo}</td>
                <td>{programName(c.program)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Examiners() {
  const { examiners, createExaminer, deleteExaminer } = useOsce();
  const report = useReport();
  const [f, setF] = useState({ fullName: "", username: "", password: "" });
  const [del, setDel] = useState(null);
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
        <Link to="/osce/exam" className="btn btn-light btn-sm">&larr; Back</Link>
      </div>
      <div className="two-col">
        <div className="card table-wrap">
          <h3>Examiner list</h3>
          <table>
            <thead>
              <tr><th>#</th><th>Full name</th><th>Username</th><th>Password</th><th>Procedure</th><th></th></tr>
            </thead>
            <tbody>
              {examiners.length === 0 && <tr><td colSpan={6} className="muted">No examiners yet. Create one on the right.</td></tr>}
              {examiners.map((e, i) => (
                <tr key={e.id}>
                  <td>{i + 1}</td>
                  <td>{e.fullName}{e.lead && <span className="must">lead</span>}</td>
                  <td>{e.username}</td>
                  <td>{e.password}</td>
                  <td>{e.procedure ? procedureLabel(e.procedure) : <span className="muted">Not assigned</span>}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => setDel(e)}>Delete</button></td>
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

      <ConfirmDialog
        open={!!del}
        danger
        title="Delete examiner?"
        message={`${del?.fullName || "This examiner"} will no longer be able to log in or score candidates.`}
        confirmLabel="Delete"
        onCancel={() => setDel(null)}
        onConfirm={() => {
          report(deleteExaminer(del.id));
          setDel(null);
        }}
      />
    </>
  );
}

// The OSCE view: the examination, then a clickable card for every program.
function ViewPrograms() {
  const { candidates, examiners, downloaded } = useOsce();
  return (
    <>
      <div className="osce-top">
        <div>
          <h2 style={{ marginBottom: 2 }}>OSCE</h2>
          <p className="muted" style={{ margin: 0 }}>{OSCE_EXAM.name}</p>
        </div>
        <div className="row-gap">
          <Link to="/osce/exam" className="btn btn-light">&larr; Back</Link>
          <Link to="/osce/view/assign" className="btn btn-primary">Assign Examiner</Link>
        </div>
      </div>
      {!downloaded && <div className="note">No candidates yet. Download the examination first.</div>}
      {PROGRAMS.map((p, i) => {
        const list = candidates.filter((c) => c.program === p.id);
        const done = list.reduce((a, c) => a + c.progress.filter(Boolean).length, 0);
        const examinerCount = examiners.filter((e) => e.procedure.startsWith(`${p.id}-`)).length;
        return (
          <Link key={p.id} to={`/osce/view/program/${p.id}`} className="prog-card">
            <div className="prog-name">{i + 1}. {p.name}</div>
            <div className="prog-meta">
              <span>{p.procedures.length} procedures</span>
              <span>{list.length} candidates</span>
              <span>{examinerCount} examiners</span>
              <span>Progress: {list.length ? Math.round((done / (list.length * 6)) * 100) : 0}%</span>
            </div>
            <Bar value={done} max={list.length * 6} />
          </Link>
        );
      })}
    </>
  );
}

// Assign examiners to procedures. With a procedure in the address, the examiners on it are listed first.
function AssignExaminers({ focus }) {
  const { examiners, assignExaminer, makeLead } = useOsce();
  const report = useReport();
  const [draft, setDraft] = useState({});
  const sorted = [...examiners].sort((a, b) => Number(b.procedure === focus) - Number(a.procedure === focus));
  const back = focus ? `/osce/view/program/${focus.split("-")[0]}` : "/osce/view";

  return (
    <>
      <div className="osce-top">
        <div>
          <h2 style={{ marginBottom: 2 }}>Assign examiner</h2>
          {focus && <p className="muted" style={{ margin: 0 }}>{procedureLabel(focus)}</p>}
        </div>
        <Link to={back} className="btn btn-light btn-sm">&larr; Back</Link>
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
            {sorted.map((e) => {
              const value = draft[e.id] ?? (e.procedure || focus || "");
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

// One program: its procedures with progress and a View examiner button, then its candidates.
function ProgramPage({ id }) {
  const { candidates } = useOsce();
  const program = PROGRAMS.find((p) => p.id === id);
  if (!program) return <div className="card">Programme not found. <Link to="/osce/view">Back</Link></div>;
  const list = candidates.filter((c) => c.program === id);

  return (
    <>
      <div className="osce-top">
        <h2 style={{ marginBottom: 2 }}>{OSCE_EXAM.name} | {program.name}</h2>
        <Link to="/osce/view" className="btn btn-light btn-sm">&larr; Back</Link>
      </div>

      <div className="card proc-list">
        <h3>Procedures</h3>
        {program.procedures.map((name, i) => {
          const done = list.filter((c) => c.progress[i * 2]).length;
          return (
            <div className="proc-row" key={name}>
              <span className="proc-name">{i + 1}. {name}</span>
              <span className="proc-prog">
                <Bar value={done} max={list.length} />
                <span className="pbar-text">{done} of {list.length} candidates done</span>
              </span>
              <Link to={`/osce/view/assign/${id}-p${i + 1}`} className="btn btn-light btn-sm">View examiner</Link>
            </div>
          );
        })}
      </div>

      <div className="card table-wrap">
        <h3>Candidates</h3>
        <p className="muted" style={{ marginTop: 0 }}>Each circle turns green when the candidate finishes that station.</p>
        <table>
          <thead><tr><th>Exam no</th><th>Name</th><th>Stations</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={3} className="muted">No candidates yet.</td></tr>}
            {list.map((c) => (
              <tr key={c.examNo}>
                <td>{c.examNo}</td>
                <td>{c.name}</td>
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
    if (!o.online) return report({ ok: false, msg: NO_NET });
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
          <p className="muted">
            Download the examination, its candidates and its procedures from the central server. This needs internet:
            connect the server laptop to your mobile hotspot. Do it before you go to the hall, and do the IP whitelist
            after it, because a new download clears the whitelist.
          </p>
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
    if (!o.online) return report({ ok: false, msg: NO_NET });
    setBusy(true);
    timer.current = setTimeout(() => {
      report(o.sync());
      setBusy(false);
    }, 1200);
  };

  return (
    <div className="card">
      <h2>Synchronize</h2>
      <p className="muted">Download new data from the central server. This needs internet: use your mobile hotspot.</p>
      <button className="btn btn-primary" onClick={run} disabled={busy}>{busy ? "Synchronizing..." : "Synchronize"}</button>
    </div>
  );
}

/* ---------- bottom right: the two station computers and the sandbox tools ---------- */

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
              <span>Internet (mobile hotspot): <strong>{o.online ? "Online" : "Offline"}</strong></span>
            </label>
            {!graded && (
              <button className="sim-item" onClick={() => report(o.simAddIps())}>4 more station computers add their IP</button>
            )}
            {!graded && (
              <button className="sim-item" onClick={() => report(o.simAdvance())}>5 candidates finish their next station</button>
            )}
            {!graded && (
              <button className="sim-item" onClick={() => report(o.simScore())}>5 more candidates get scored in started components</button>
            )}
            {mode === "free" && (
              <button className="sim-item danger" onClick={() => { o.wipe(); navigate("/osce"); }}>Wipe sandbox and start over</button>
            )}
          </div>
        </div>
      )}
      <div className="sim-fabs">
        <button className="sim-fab computer" onClick={() => navigate(`/osce-station/${PROCEDURE_PORT}`)}>Examiner computer</button>
        <button className="sim-fab computer" onClick={() => navigate(`/osce-station/${QUESTION_PORT}`)}>Candidate computer</button>
        <button className="sim-fab" onClick={() => setOpen((v) => !v)}>Sandbox tools</button>
      </div>
    </div>
  );
}