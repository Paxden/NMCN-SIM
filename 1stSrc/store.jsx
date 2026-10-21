import { createContext, useContext, useEffect, useState } from "react";
import { REASONS, addInfraction, freshState, mkCandidate, setStatus } from "./data";
import { SCENARIOS } from "./scenarios";
import { navigate } from "./router";

const KEY = "cbt-sim-state-v1";
const Ctx = createContext(null);
export const useSim = () => useContext(Ctx);

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...freshState(), ...JSON.parse(raw) };
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

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, [s]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (message, type = "success") => setToast({ message, type, id: Date.now() });
  const log = (st, type, payload = {}) => ({
    ...st,
    actions: [...st.actions, { type, payload, at: Date.now() }],
  });
  const findCandidate = (no) => s.candidates.find((c) => c.examNo === norm(no));

  // ---- server / auth ----
  const createServer = (id, password) => {
    if (!id.trim() || !password) return fail("Server ID and password are required");
    setS((st) =>
      log(
        {
          ...freshState(),
          scenario: st.scenario,
          actions: st.actions,
          server: { id: id.trim(), password },
        },
        "server_created"
      )
    );
    return ok("Server created");
  };

  const login = (id, password) => {
    if (!s.server) return fail("No server has been created yet. Open /createserver first.");
    if (id.trim() !== s.server.id || password !== s.server.password)
      return fail("Invalid server ID or password");
    setS((st) => log({ ...st, loggedIn: true }, "login"));
    return ok("Login successful");
  };

  const logout = () => {
    setS((st) => ({ ...st, loggedIn: false }));
    navigate("/admin");
  };

  // ---- exam ----
  const activateExam = () => {
    if (s.activated) return;
    setS((st) => log({ ...st, activated: true, ended: false, uploaded: {} }, "activate_exam"));
  };

  const endExam = () => {
    setS((st) =>
      log(
        {
          ...st,
          ended: true,
          candidates: st.candidates.map((c) =>
            c.status === "writing" ? { ...c, status: "submitted" } : c
          ),
        },
        "end_exam"
      )
    );
  };

  const uploadSession = (session) => {
    if (!s.ended) return fail("End the examination before uploading");
    setS((st) => log({ ...st, uploaded: { ...st.uploaded, [session]: true } }, "upload", { session }));
    return ok(`${session} uploaded successfully`);
  };

  // ---- candidate management ----
  const relogin = (no) => {
    const c = findCandidate(no);
    if (!no.trim()) return fail("Enter the candidate exam number");
    if (!c) return fail(`Candidate ${norm(no)} not found`);
    if (!s.activated) return fail("Exam has not been activated");
    if (c.status === "submitted") return fail(`${c.examNo} has already submitted`);
    setS((st) => log(setStatus(st, (x) => x.examNo === c.examNo, "writing"), "relogin", { examNo: c.examNo }));
    return ok(`Candidate ${c.examNo} relogin successful`);
  };

  const unflag = (no) => {
    const c = findCandidate(no);
    if (!no.trim()) return fail("Enter the candidate exam number");
    if (!c) return fail(`Candidate ${norm(no)} not found`);
    if (!s.infractions.some((i) => i.examNo === c.examNo))
      return fail(`${c.examNo} has no infraction`);
    setS((st) =>
      log({ ...st, infractions: st.infractions.filter((i) => i.examNo !== c.examNo) }, "unflag", {
        examNo: c.examNo,
      })
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
        { examNo: c.examNo }
      )
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
        "reset_server"
      )
    );
    return ok("Server has been reset");
  };

  const sync = () => {
    if (s.syncCount >= 3) return ok("Already up to date. No new data to download.");
    setS((st) => {
      const start = st.candidates.length + 1;
      const added = Array.from({ length: 5 }, (_, i) => mkCandidate(start + i));
      return log({ ...st, candidates: [...st.candidates, ...added], syncCount: st.syncCount + 1 }, "sync");
    });
    return ok("Synchronised. 5 new candidates downloaded.");
  };

  // ---- simulator tools (not part of the real CBT) ----
  const simStartWriting = () => {
    if (!s.activated || s.ended) return fail("Activate the exam first (and it must not have ended)");
    setS((st) => setStatus(st, (c) => c.status === "idle", "writing"));
    return ok("Idle candidates are now writing");
  };

  const simSubmitSome = () => {
    const writing = s.candidates.filter((c) => c.status === "writing").slice(0, 5).map((c) => c.examNo);
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
    navigate("/createserver");
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
    createServer,
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
