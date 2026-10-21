import { useEffect, useState } from "react";
import { api } from "./api";
import { useAuth } from "./auth";
import { Link, navigate } from "./router";

/* ---------- /login ---------- */
export function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", password: "", state: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const u = mode === "login" ? await login(f.email, f.password) : await register(f);
      navigate(u.role === "admin" ? "/dashboard" : "/");
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setErr("");
    setMode(mode === "login" ? "register" : "login");
  };

  return (
    <div className="center-page">
      <form className="card auth" onSubmit={submit}>
        <h2>{mode === "login" ? "Sign in" : "Create account"}</h2>
        {err && <div className="note">{err}</div>}
        {mode === "register" && (
          <>
            <label>Full name</label>
            <input value={f.name} onChange={set("name")} />
          </>
        )}
        <label>Email</label>
        <input type="email" value={f.email} onChange={set("email")} autoFocus />
        <label>Password</label>
        <input type="password" value={f.password} onChange={set("password")} />
        {mode === "register" && (
          <>
            <label>State</label>
            <input value={f.state} onChange={set("state")} />
          </>
        )}
        <button className="btn btn-primary block" type="submit" disabled={busy}>
          {busy ? "Please wait..." : mode === "login" ? "Sign in" : "Register"}
        </button>

        <div className="auth-alt">
          <span className="muted">
            {mode === "login" ? "New centre manager?" : "Already registered?"}
          </span>
          <button type="button" className="btn btn-outline block" onClick={switchMode}>
            {mode === "login" ? "Create an account" : "Sign in instead"}
          </button>
          <Link to="/" className="btn btn-light block">
            &larr; Continue without signing in
          </Link>
        </div>
      </form>
    </div>
  );
}

/* ---------- small bar for the hub page ---------- */
export function AccountBar() {
  const { user, logout } = useAuth();
  return (
    <div className="account-bar">
      {user ? (
        <>
          <span className="account-name">
            {user.name}
            {user.competent ? " · Competent" : ""}
          </span>
          {user.role === "admin" && (
            <Link to="/dashboard" className="btn btn-light btn-sm">
              Dashboard
            </Link>
          )}
          <button type="button" className="btn btn-light btn-sm" onClick={logout}>
            Sign out
          </button>
        </>
      ) : (
        <Link to="/login" className="btn btn-primary btn-sm">
          Sign in to save your results
        </Link>
      )}
    </div>
  );
}

/* ---------- /dashboard (admin) ---------- */
const STATUS = {
  competent: ["Competent", "badge-green"],
  needs_retake: ["Needs retake", "badge-red"],
  in_training: ["In training", "badge-gray"],
  not_started: ["Not started", "badge-gray"],
};

export function DashboardPage() {
  const { user, ready } = useAuth();
  const [counts, setCounts] = useState(null);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(null); // { manager, attempts }
  const [msg, setMsg] = useState("");

  const load = async (status = filter) => {
    try {
      const [s, m] = await Promise.all([api.summary(), api.managers(status)]);
      setCounts(s.counts);
      setRows(m.managers);
    } catch (e) {
      setMsg(e.message);
    }
  };
  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user, filter]);

  if (!ready) return null;
  if (!user || user.role !== "admin")
    return (
      <div className="center-page">
        <div className="card">
          <p>Admins only.</p>
          <Link to="/login" className="btn btn-primary">
            Sign in
          </Link>
        </div>
      </div>
    );

  const assign = async (m, centre) => {
    try {
      await api.assign(m._id, centre);
      setMsg("");
      load();
    } catch (e) {
      setMsg(e.message);
    }
  };
  const view = async (m) =>
    setOpen({ manager: m, attempts: (await api.managerAttempts(m._id)).attempts });

  return (
    <div className="hub">
      <header className="hub-hero small">
        <p>
          <Link to="/" className="light-link">
            &larr; Menu
          </Link>
        </p>
        <h1>Admin dashboard</h1>
        <p>Who has started, who is competent, who needs a retake.</p>
      </header>
      <div className="report">
        {msg && <div className="note">{msg}</div>}
        {counts && (
          <div className="stats">
            {[
              ["total", "Managers"],
              ["not_started", "Not started"],
              ["in_training", "In training"],
              ["needs_retake", "Need retake"],
              ["competent", "Competent"],
              ["assigned", "Assigned to centre"],
            ].map(([k, l]) => (
              <div className="stat" key={k}>
                <div className="stat-label">{l}</div>
                <div className="stat-num">{counts[k]}</div>
              </div>
            ))}
          </div>
        )}
        <section className="card table-wrap">
          <div className="row-gap wrap" style={{ marginBottom: 12 }}>
            {["", "competent", "needs_retake", "in_training", "not_started"].map((s) => (
              <button
                key={s}
                className={`btn btn-sm ${filter === s ? "btn-primary" : "btn-light"}`}
                onClick={() => setFilter(s)}
              >
                {s ? STATUS[s][0] : "All"}
              </button>
            ))}
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Best</th>
                <th>Attempts</th>
                <th>Centre</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    No managers yet.
                  </td>
                </tr>
              )}
              {rows.map((m) => (
                <tr key={m._id}>
                  <td>{m.name}</td>
                  <td>{m.email}</td>
                  <td>
                    <span className={`badge ${STATUS[m.status][1]}`}>{STATUS[m.status][0]}</span>
                  </td>
                  <td className="num">{m.bestOverall == null ? "-" : `${m.bestOverall}%`}</td>
                  <td className="num">{m.attemptCount}</td>
                  <td>
                    <input
                      style={{ width: 150 }}
                      defaultValue={m.centre}
                      placeholder={m.competent ? "Centre" : "Not eligible"}
                      disabled={!m.competent}
                      onBlur={(e) => e.target.value !== m.centre && assign(m, e.target.value)}
                    />
                  </td>
                  <td>
                    <button className="btn btn-primary btn-sm" onClick={() => view(m)}>
                      Attempts
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {open && (
          <div className="overlay" onClick={() => setOpen(null)}>
            <div className="dialog" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
              <h3>{open.manager.name}: attempts</h3>
              {open.attempts.length === 0 ? (
                <p className="muted">No submitted attempts.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Score</th>
                      <th>Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {open.attempts.map((a) => (
                      <tr key={a._id}>
                        <td>{new Date(a.finishedAt).toLocaleString()}</td>
                        <td className="num">{a.overall}%</td>
                        <td>{a.level}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="dialog-actions">
                <button className="btn btn-light" onClick={() => setOpen(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}