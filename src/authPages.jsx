/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { api } from "./api";
import { useAuth } from "./auth";
import { Link, navigate } from "./router";
import { forgetChoice } from "./chooser";

// Change the name here once and every auth page picks it up.
export const APP_NAME = "NMCN CAOSCE Simulation & Training";
const APP_DESC =
  "Practise the exam-day tasks, then get assessed before you are deployed to a centre.";

/* ---------- logo ---------- */
// Put the official NMCN logo at public/nmcn-logo.png (square PNG, transparent background works best).
// Until that file exists, a plain "N" mark is shown instead.
export function Logo({ size = 40 }) {
  const [broken, setBroken] = useState(false);
  if (broken)
    return (
      <span
        className="app-logo"
        style={{ width: size, height: size, fontSize: size * 0.5 }}
        aria-hidden="true"
      >
        N
      </span>
    );
  return (
    <img
      src="/nmcn-logo.png"
      alt="NMCN logo"
      width={size}
      height={size}
      className="logo-img"
      onError={() => setBroken(true)}
    />
  );
}

/* ---------- shared header (hub and dashboard) ---------- */
export function AppHeader() {
  const { user, logout } = useAuth();

  const signOut = () => {
  forgetChoice();
  logout();
  navigate("/login");
};

  return (
    <header className="app-header">
      <Link
        to={user?.role === "admin" ? "/dashboard" : "/"}
        className="app-brand"
      >
        <Logo size={34} />
        <span className="app-name">{APP_NAME}</span>
      </Link>

      <div className="app-header-actions">
        {user ? (
          <>
            <span className="account-name">
              {user.name}
              {user.role === "admin"
                ? " · Admin"
                : user.competent
                  ? " · Competent"
                  : ""}
            </span>
            <button
              type="button"
              className="btn btn-light btn-sm"
              onClick={signOut}
            >
              Sign out
            </button>
          </>
        ) : (
          <Link to="/login" className="btn btn-primary btn-sm">
            Sign in to save your results
          </Link>
        )}
      </div>
    </header>
  );
}

// menu.jsx already imports AccountBar, so the hub gets the header without editing menu.jsx.
export const AccountBar = AppHeader;

/* ---------- stat card icons ---------- */
const IconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconClock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconBook = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);
const IconRefresh = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);
const IconCheckCircle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

/* ---------- /login (sign in and create account) ---------- */
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
      const u =
        mode === "login" ? await login(f.email, f.password) : await register(f);
      forgetChoice();
      navigate(u.role === "admin" ? "/dashboard" : "/choose");
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  const pick = (m) => {
    setErr("");
    setMode(m);
  };

  return (
    <div className="auth-split">
      <aside className="auth-brand">
        <Logo size={72} />
        <div className="auth-brand-text">
          <h1>{APP_NAME}</h1>
          <p>{APP_DESC}</p>
        </div>
        <p className="auth-org">Nursing and Midwifery Council of Nigeria</p>
      </aside>

      <main className="auth-panel">
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={mode === "login" ? "on" : ""}
              onClick={() => pick("login")}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={mode === "register" ? "on" : ""}
              onClick={() => pick("register")}
            >
              Create account
            </button>
          </div>

          <h2>
            {mode === "login"
              ? "Sign in to your account"
              : "Create your account"}
          </h2>

          {err && <div className="note">{err}</div>}

          {mode === "register" && (
            <>
              <label>Full name</label>
              <input value={f.name} onChange={set("name")} />
            </>
          )}
          <label>Email</label>
          <input
            type="email"
            value={f.email}
            onChange={set("email")}
            autoFocus
          />
          {mode === "register" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                alignItems: "end",
              }}
            >
              <div>
                <label>Password</label>
                <input
                  type="password"
                  value={f.password}
                  onChange={set("password")}
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label>State</label>
                <input
                  value={f.state}
                  onChange={set("state")}
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </div>
            </div>
          ) : (
            <>
              <label>Password</label>
              <input
                type="password"
                value={f.password}
                onChange={set("password")}
              />
            </>
          )}

          <button
            className="btn btn-primary block"
            type="submit"
            disabled={busy}
          >
            {busy
              ? "Please wait..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>

          <div className="auth-alt">
            <Link to="/" className="btn btn-light block">
              Continue without signing in
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}

/* ---------- /dashboard (admin only) ---------- */
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
      <>
        <AppHeader />
        <div className="center-page with-header">
          <div className="card">
            <p>Admins only.</p>
            <Link to="/login" className="btn btn-primary">
              Sign in
            </Link>
          </div>
        </div>
      </>
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
    setOpen({
      manager: m,
      attempts: (await api.managerAttempts(m._id)).attempts,
    });

  return (
    <div className="hub">
      <AppHeader />
      <header className="hub-hero small">
        <h1>Admin dashboard</h1>
        <p>Who has started, who is competent, who needs a retake.</p>
      </header>
      <div className="report">
        {msg && <div className="note">{msg}</div>}
       {counts && (
  <div className="stats">
    {[
      ["total", "Managers", <IconUsers />],
      ["not_started", "Not started", <IconClock />],
      ["needs_retake", "Need retake", <IconRefresh />],
      ["competent", "Competent", <IconCheckCircle />],
    ].map(([k, l, icon]) => (
      <div className="stat stat-with-icon" key={k}>
        <div className="stat-icon">{icon}</div>
        <div className="stat-main">
          <div className="stat-label">{l}</div>
          <div className="stat-num">{counts[k]}</div>
        </div>
      </div>
    ))}
  </div>
)}
        <section className="card table-wrap">
          <div className="row-gap wrap" style={{ marginBottom: 12 }}>
            {[
              "",
              "competent",
              "needs_retake",
              "in_training",
              "not_started",
            ].map((s) => (
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
                    <span className={`badge ${STATUS[m.status][1]}`}>
                      {STATUS[m.status][0]}
                    </span>
                  </td>
                  <td className="num">
                    {m.bestOverall == null ? "-" : `${m.bestOverall}%`}
                  </td>
                  <td className="num">{m.attemptCount}</td>
                  <td>
                    <input
                      style={{ width: 150 }}
                      defaultValue={m.centre}
                      placeholder={m.competent ? "Centre" : "Not eligible"}
                      disabled={!m.competent}
                      onBlur={(e) =>
                        e.target.value !== m.centre && assign(m, e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => view(m)}
                    >
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
            <div
              className="dialog"
              style={{ maxWidth: 560 }}
              onClick={(e) => e.stopPropagation()}
            >
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
