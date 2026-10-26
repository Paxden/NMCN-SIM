import { createContext, useContext, useEffect, useState } from "react";
import {
  REASONS,
  addInfraction,
  freshState,
  mkCandidate,
  setStatus,
} from "./data";
import { SCENARIOS } from "./scenarios";
import { navigate } from "./router";

const KEY = "cbt-sim-state-v1";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
const Ctx = createContext(null);
export const useSim = () => useContext(Ctx);

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Scrub any leftover password from older versions
      if (parsed.server && parsed.server.password)
        delete parsed.server.password;
      return { ...freshState(), ...parsed };
    }
  } catch {
    /* ignore */
  }
  return freshState();
}

const norm = (v) => (v || "").trim().toUpperCase();
const ok = (msg) => ({ ok: true, msg });
const fail = (msg) => ({ ok: false, msg });

export function SimProvider({ children }) {
  const [s, setS] = useState(load);
  const [toast, setToast] = useState(null);

  // Persist (but never write a password)
  useEffect(() => {
    try {
      const persist = { ...s };
      if (persist.server && persist.server.password)
        delete persist.server.password;
      localStorage.setItem(KEY, JSON.stringify(persist));
    } catch {
      /* ignore */
    }
  }, [s]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (message, type = "success") =>
    setToast({ message, type, id: Date.now() });
  const log = (st, type, payload = {}) => ({
    ...st,
    actions: [...st.actions, { type, payload, at: Date.now() }],
  });
  const findCandidate = (no) => s.candidates.find((c) => c.examNo === norm(no));

  // ---- server / auth ----
  // createServer() is intentionally REMOVED — the CBT connects to a real server.

  const login = async (serverId, password) => {
    if (!serverId?.trim() || !password)
      return fail("Server ID and password are required");
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return fail("No internet connection. Check your network and try again.");
    }
    try {
      const res = await fetch(`${API_BASE}/auth/login/server`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverId: serverId.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return fail(data.message || "Invalid server ID or password");
      }
      setS((st) =>
        log(
          {
            ...st,
            server: data.server || { id: serverId.trim() },
            token: data.token || null,
            loggedIn: true,
            activated: !!data.activated,
            ended: !!data.ended,
            candidates: Array.isArray(data.candidates)
              ? data.candidates
              : st.candidates,
            infractions: Array.isArray(data.infractions)
              ? data.infractions
              : st.infractions,
            uploaded:
              data.uploaded && typeof data.uploaded === "object"
                ? data.uploaded
                : st.uploaded,
          },
          "login",
        ),
      );
      return ok("Login successful");
    } catch {
      return fail("Cannot reach server. Check your internet connection.");
    }
  };

  const logout = () => {
    setS((st) => ({ ...st, server: null, token: null, loggedIn: false }));
    navigate("/login");
  };

  // ---- exam ----
  const activateExam = () => {
    if (s.activated) return;
    setS((st) =>
      log(
        { ...st, activated: true, ended: false, uploaded: {} },
        "activate_exam",
      ),
    );
  };

  const endExam = () => {
    setS((st) =>
      log(
        {
          ...st,
          ended: true,
          candidates: st.candidates.map((c) =>
            c.status === "writing" ? { ...c, status: "submitted" } : c,
          ),
        },
        "end_exam",
      ),
    );
  };

  const uploadSession = (session) => {
    if (!s.ended) return fail("End the examination before uploading");
    setS((st) =>
      log({ ...st, uploaded: { ...st.uploaded, [session]: true } }, "upload", {
        session,
      }),
    );
    return ok(`${session} uploaded successfully`);
  };

  // ---- candidate management ----
  const relogin = (no) => {
    const c = findCandidate(no);
    if (!no.trim()) return fail("Enter the candidate exam number");
    if (!c) return fail(`Candidate ${norm(no)} not found`);
    if (!s.activated) return fail("Exam has not been activated");
    if (c.status === "submitted")
      return fail(`${c.examNo} has already submitted`);
    setS((st) =>
      log(
        setStatus(st, (x) => x.examNo === c.examNo, "writing"),
        "relogin",
        { examNo: c.examNo },
      ),
    );
    return ok(`Candidate ${c.examNo} relogin successful`);
  };

  const unflag = (no) => {
    const c = findCandidate(no);
    if (!no.trim()) return fail("Enter the candidate exam number");
    if (!c) return fail(`Candidate ${norm(no)} not found`);
    if (!s.infractions.some((i) => i.examNo === c.examNo))
      return fail(`${c.examNo} has no infraction`);
    setS((st) =>
      log(
        {
          ...st,
          infractions: st.infractions.filter((i) => i.examNo !== c.examNo),
        },
        "unflag",
        {
          examNo: c.examNo,
        },
      ),
    );
    return ok(`Infraction removed for ${c.examNo}`);
  };

  const resetCandidate = (no) => {
    const c = findCandidate(no);
    if (!c) return fail(`Candidate ${norm(no)} not found`);
    setS((st) =>
      log(
        {
          ...setStatus(st, (x) => x.examNo === c.examNo, "idle"),
          infractions: st.infractions.filter((i) => i.examNo !== c.examNo),
        },
        "reset_candidate",
        { examNo: c.examNo },
      ),
    );
    return ok(`Candidate ${c.examNo} has been reset`);
  };

  const resetServer = () => {
    setS((st) =>
      log(
        {
          ...st,
          activated: false,
          ended: false,
          uploaded: {},
          infractions: [],
          candidates: st.candidates.map((c) => ({ ...c, status: "idle" })),
        },
        "reset_server",
      ),
    );
    return ok("Server has been reset");
  };

  const sync = () => {
    if (s.syncCount >= 3)
      return ok("Already up to date. No new data to download.");
    setS((st) => {
      const start = st.candidates.length + 1;
      const added = Array.from({ length: 5 }, (_, i) => mkCandidate(start + i));
      return log(
        {
          ...st,
          candidates: [...st.candidates, ...added],
          syncCount: st.syncCount + 1,
        },
        "sync",
      );
    });
    return ok("Synchronised. 5 new candidates downloaded.");
  };

  // ---- simulator tools (not part of the real CBT) ----
  const simStartWriting = () => {
    if (!s.activated || s.ended)
      return fail("Activate the exam first (and it must not have ended)");
    setS((st) => setStatus(st, (c) => c.status === "idle", "writing"));
    return ok("Idle candidates are now writing");
  };

  const simSubmitSome = () => {
    const writing = s.candidates
      .filter((c) => c.status === "writing")
      .slice(0, 5)
      .map((c) => c.examNo);
    if (!writing.length) return fail("No candidate is writing");
    setS((st) => setStatus(st, (c) => writing.includes(c.examNo), "submitted"));
    return ok(`${writing.length} candidates submitted`);
  };

  const simInfraction = () => {
    const writing = s.candidates.filter((c) => c.status === "writing");
    if (!writing.length) return fail("No candidate is writing");
    const c = writing[Math.floor(Math.random() * writing.length)];
    const reason = REASONS[Math.floor(Math.random() * REASONS.length)];
    setS((st) => addInfraction(st, c.examNo, reason));
    return ok(`Infraction logged for ${c.examNo}`);
  };

  const factoryReset = () => {
    setS(freshState());
    navigate("/login");
  };

  const startScenario = (id) => {
    const sc = SCENARIOS.find((x) => x.id === id);
    if (!sc) return;
    setS({ ...sc.prepare(freshState()), scenario: { id } });
    navigate(sc.route);
  };

  const stopScenario = () => setS((st) => ({ ...st, scenario: null }));

  const value = {
    ...s,
    toast,
    showToast,
    login,
    logout,
    activateExam,
    endExam,
    uploadSession,
    relogin,
    unflag,
    resetCandidate,
    resetServer,
    sync,
    simStartWriting,
    simSubmitSome,
    simInfraction,
    factoryReset,
    startScenario,
    stopScenario,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
