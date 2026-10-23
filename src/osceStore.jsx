import { createContext, useContext, useEffect, useState } from "react";
import { PROCEDURE_PORT, QUESTION_PORT, freshOsce, makeOsceCandidates } from "./osceData";

const KEY = "caosce-sim-state-v1";
const Ctx = createContext(null);
export const useOsce = () => useContext(Ctx);

export const SERVER_LOGIN = { id: "101", password: "demo" };

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...freshOsce(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return freshOsce();
}

const ok = (msg, extra = {}) => ({ ok: true, msg, ...extra });
const failBase = (msg) => ({ ok: false, msg });
const uid = () => Math.random().toString(36).slice(2, 9);
const NO_NET = "No internet connection. Connect to the internet and try again.";

export function OsceProvider({ children }) {
  const [s, setS] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, [s]);

  // Every failed action counts as a mistake (used by exercises and the assessment).
  const fail = (msg) => {
    setS((st) => ({ ...st, mistakes: (st.mistakes || 0) + 1 }));
    return failBase(msg);
  };
  const logEvent = (ev) => setS((st) => ({ ...st, events: [...(st.events || []), ev] }));
  // Replace the whole sandbox with a fresh one plus a patch. Used by the tour, exercises and assessment.
  const applyScenario = (patch = {}) => setS({ ...freshOsce(), ...patch });

  /* ---------- server ---------- */
  const login = (id, password) => {
    if (id.trim() !== SERVER_LOGIN.id || password !== SERVER_LOGIN.password)
      return fail("Invalid server ID or password");
    setS((st) => ({ ...st, loggedIn: true }));
    return ok("Login successful");
  };
  const logout = () => setS((st) => ({ ...st, loggedIn: false }));
  const setOnline = (on) => setS((st) => ({ ...st, online: on }));
  const wipe = () => setS(freshOsce());

  const download = () => {
    if (!s.online) return fail(NO_NET);
    setS((st) => ({ ...st, downloaded: true, candidates: makeOsceCandidates(24) }));
    return ok("Examination downloaded");
  };

  const activate = () => {
    if (!s.downloaded) return fail("Download the examination first");
    setS((st) => ({ ...st, activated: true }));
    return ok("Examination activated");
  };

  const upload = () => {
    if (!s.downloaded) return fail("There is nothing to upload. Download the examination first");
    if (!s.online) return fail(NO_NET);
    setS((st) => ({ ...st, uploaded: true }));
    return ok("CAOSCE uploaded successfully");
  };

  const sync = () => {
    if (!s.online) return fail(NO_NET);
    if (!s.downloaded) return fail("Download the examination first");
    if (s.syncCount >= 3) return ok("Already up to date. No new data to download.");
    setS((st) => ({
      ...st,
      candidates: [...st.candidates, ...makeOsceCandidates(2, st.candidates.length + 1)],
      syncCount: st.syncCount + 1,
    }));
    return ok("Synchronised. 2 new candidates downloaded.");
  };

  /* ---------- dashboard components ---------- */
  const startComponent = (key) => {
    if (!s.activated) return fail("Download and activate the examination first");
    if (s.components[key] !== "idle") return fail("Already started");
    setS((st) => ({ ...st, components: { ...st.components, [key]: "started" } }));
    return ok("Started");
  };

  const endComponent = (key) => {
    if (s.components[key] !== "started") return fail("This has not been started");
    setS((st) => ({ ...st, components: { ...st.components, [key]: "ended" } }));
    return ok("Ended");
  };

  /* ---------- examiners ---------- */
  const createExaminer = ({ fullName, username, password }) => {
    if (!fullName.trim() || !username.trim() || !password) return fail("Full name, username and password are required");
    if (s.examiners.some((e) => e.username.toLowerCase() === username.trim().toLowerCase()))
      return fail("That username is already taken");
    setS((st) => ({
      ...st,
      examiners: [
        ...st.examiners,
        { id: uid(), fullName: fullName.trim(), username: username.trim(), password, procedure: "", lead: false },
      ],
    }));
    return ok("Examiner created");
  };

  const assignExaminer = (id, procedure) => {
    if (!procedure) return fail("Select a procedure first");
    setS((st) => ({ ...st, examiners: st.examiners.map((e) => (e.id === id ? { ...e, procedure } : e)) }));
    return ok("Examiner updated");
  };

  // The lead (chief) examiner sees every procedure's candidate instructions and requirements. Only one lead at a time.
  const makeLead = (id) => {
    const e = s.examiners.find((x) => x.id === id);
    if (!e) return fail("Examiner not found");
    if (e.lead) return fail(`${e.fullName} is already the lead examiner`);
    setS((st) => ({ ...st, examiners: st.examiners.map((x) => ({ ...x, lead: x.id === id })) }));
    return ok(`${e.fullName} is now the lead examiner`);
  };

  /* ---------- station computers and the whitelist ---------- */
  const primaryIp = (port) => s.ips.find((i) => i.primary && i.port === port);

  // What a station computer does when it opens <server ip>:<port>/addipaddress and clicks the button.
  const addStationIp = (port) => {
    if (primaryIp(port)) return fail("This computer's IP address has already been added");
    const ip = port === PROCEDURE_PORT ? "192.168.1.21" : "192.168.1.31";
    setS((st) => ({ ...st, ips: [...st.ips, { id: uid(), ip, port, approved: false, primary: true }] }));
    return ok("IP address added successfully");
  };

  const approveIp = (id) => {
    const i = s.ips.find((x) => x.id === id);
    if (!i) return fail("IP address not found");
    if (i.approved) return fail("Already approved");
    setS((st) => ({ ...st, ips: st.ips.map((x) => (x.id === id ? { ...x, approved: true } : x)) }));
    return ok(`${i.ip}:${i.port} approved`);
  };

  // Sandbox helper: other laptops in the hall adding their addresses.
  const simAddIps = () => {
    const used = new Set(s.ips.map((i) => i.ip));
    const made = [];
    let n = 40;
    while (made.length < 4) {
      const ip = `192.168.1.${n++}`;
      if (!used.has(ip)) made.push({ id: uid(), ip, port: made.length % 2 === 0 ? PROCEDURE_PORT : QUESTION_PORT, approved: false, primary: false });
    }
    setS((st) => ({ ...st, ips: [...st.ips, ...made] }));
    return ok("4 station computers added their IP addresses");
  };

  /* ---------- station sign-in (what examiners and candidates do after approval) ---------- */
  const examinerLogin = (username, password) => {
    const e = s.examiners.find((x) => x.username === username.trim());
    if (!e || e.password !== password) return fail("Invalid username or password");
    logEvent(`examiner-login:${e.username}`);
    return ok(`Welcome, ${e.fullName}`, { examiner: e });
  };

  const candidateLogin = (examNo) => {
    if (s.components.osce !== "started") return fail("The OSCE has not started");
    const c = s.candidates.find((x) => x.examNo === examNo.trim().toUpperCase());
    if (!c) return fail(`Candidate ${examNo.trim().toUpperCase() || ""} not found`.trim());
    logEvent(`candidate-login:${c.examNo}`);
    return ok(`Welcome, ${c.name}`, { candidate: c });
  };

  /* ---------- sandbox helper: candidates move through the stations ---------- */
  const simAdvance = () => {
    if (s.components.osce !== "started") return fail("Start the OSCE first");
    const pending = s.candidates.filter((c) => c.progress.some((p) => !p));
    if (!pending.length) return fail("Every candidate has finished all six stations");
    const ids = [...pending].sort(() => Math.random() - 0.5).slice(0, 5).map((c) => c.examNo);
    setS((st) => ({
      ...st,
      candidates: st.candidates.map((c) => {
        if (!ids.includes(c.examNo)) return c;
        const next = c.progress.findIndex((p) => !p);
        return { ...c, progress: c.progress.map((p, i) => (i === next ? true : p)) };
      }),
    }));
    return ok(`${ids.length} candidates finished their next station`);
  };

  const value = {
    ...s,
    login, logout, setOnline, wipe, applyScenario,
    download, activate, upload, sync,
    startComponent, endComponent,
    createExaminer, assignExaminer, makeLead,
    primaryIp, addStationIp, approveIp, simAddIps,
    examinerLogin, candidateLogin, simAdvance,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}