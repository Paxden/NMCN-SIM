import { createContext, useContext, useEffect, useState } from "react";
import { COMPONENTS, PROCEDURE_PORT, QUESTION_PORT, freshOsce, makeOsceCandidates } from "./osceData";
import { COMPONENT_STEPS, GRADES, QUESTIONS, stepsFor } from "./osceContent";

const KEY = "caosce-sim-state-v1";
const Ctx = createContext(null);
export const useOsce = () => useContext(Ctx);

export const SERVER_LOGIN = { id: "104", password: "A7K2PQ" };

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
// Creating the centre, downloading, synchronizing and uploading need internet (the manager's mobile hotspot).
export const NO_NET =
  "The server laptop is not connected to the internet. Turn on your mobile hotspot, connect the server laptop to it and try again.";
const isProcKey = (k) => /^p[1-3]$/.test(k);
const labelOf = (key) => COMPONENTS.find((c) => c.key === key)?.label || key;

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
  // Replace the whole sandbox with a fresh one plus a patch. Used by the tour, exercises and assessment.
  const applyScenario = (patch = {}) => setS({ ...freshOsce(), ...patch });

  /* ---------- server ---------- */
  // Step 1 on a new server laptop. Needs internet (mobile hotspot).
  const createCentre = (id, password) => {
    if (!s.online) return fail(NO_NET);
    if (id.trim() !== SERVER_LOGIN.id || password.trim() !== SERVER_LOGIN.password)
      return fail("Invalid Server ID or password");
    setS((st) => ({ ...st, centreCreated: true }));
    return ok("Centre created successfully");
  };

  // Login works offline. It only needs the centre to have been created.
  const login = (id, password) => {
    if (!s.centreCreated) return fail("Create the centre first");
    if (id.trim() !== SERVER_LOGIN.id || password.trim() !== SERVER_LOGIN.password)
      return fail("Invalid server ID or password");
    setS((st) => ({ ...st, loggedIn: true }));
    return ok("Login successful");
  };
  const logout = () => setS((st) => ({ ...st, loggedIn: false }));
  const setOnline = (on) => setS((st) => ({ ...st, online: on }));
  const wipe = () => setS(freshOsce());

  const download = () => {
    if (!s.online) return fail(NO_NET);
    // A new download clears the whitelist, so it must be done before the station laptops are approved.
    setS((st) => ({ ...st, downloaded: true, candidates: makeOsceCandidates(24), ips: [] }));
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

  /* ---------- exam components ---------- */
  const startComponent = (key) => {
    if (!s.activated) return fail("Download and activate the examination first");
    if (s.components[key] !== "idle") return fail("Already started");
    setS((st) => ({ ...st, components: { ...st.components, [key]: "started" } }));
    return ok(`${labelOf(key)} started`);
  };

  const endComponent = (key) => {
    if (s.components[key] !== "started") return fail("This has not been started");
    setS((st) => ({ ...st, components: { ...st.components, [key]: "ended" } }));
    return ok(`${labelOf(key)} ended`);
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

  const deleteExaminer = (id) => {
    const e = s.examiners.find((x) => x.id === id);
    if (!e) return fail("Examiner not found");
    setS((st) => ({
      ...st,
      examiners: st.examiners.filter((x) => x.id !== id),
      examinerSession: st.examinerSession?.username === e.username ? null : st.examinerSession,
    }));
    return ok(`${e.fullName} deleted`);
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

  /* ---------- examiner computer (:8000) ---------- */
  const examinerLogin = (username, password) => {
    const e = s.examiners.find((x) => x.username === username.trim());
    if (!e || e.password !== password) return fail("Invalid username or password");
    setS((st) => ({
      ...st,
      events: [...(st.events || []), `examiner-login:${e.username}`],
      examinerSession: { username: e.username, page: "dashboard", key: "", examNo: "", procKey: "p1" },
    }));
    return ok(`Welcome, ${e.fullName}`, { examiner: e });
  };
  const examinerLogout = () => setS((st) => ({ ...st, examinerSession: null }));
  const patchExaminerSession = (patch) =>
    setS((st) => (st.examinerSession ? { ...st, examinerSession: { ...st.examinerSession, ...patch } } : st));

  // The examiner searches for a candidate to score in a component (key "viva") or a procedure (key "p1".."p3").
  const openCandidate = (key, examNo) => {
    const no = examNo.trim().toUpperCase();
    if (!no) return fail("Enter the candidate exam number");
    const c = s.candidates.find((x) => x.examNo === no);
    if (!c) return fail(`Candidate ${no} not found`);
    const gate = isProcKey(key) ? "osce" : key;
    if (s.components[gate] === "idle") return fail(`${labelOf(gate)} has not started`);
    if (s.components[gate] === "ended") return fail(`${labelOf(gate)} has ended`);
    if (isProcKey(key)) {
      const me = s.examiners.find((e) => e.username === s.examinerSession?.username);
      if (!me) return fail("Examiner not found");
      if (!me.lead && me.procedure !== `${c.program}-${key}`) return fail(`${no} is not on your procedure`);
    }
    setS((st) => (st.examinerSession ? { ...st, examinerSession: { ...st.examinerSession, key, examNo: no } } : st));
    return ok(`Candidate ${no}`);
  };

  const submitScore = (key, examNo, grades, by) => {
    const c = s.candidates.find((x) => x.examNo === examNo);
    if (!c) return fail(`Candidate ${examNo} not found`);
    const proc = isProcKey(key);
    const gate = proc ? "osce" : key;
    if (s.components[gate] === "idle") return fail(`${labelOf(gate)} has not started`);
    if (s.components[gate] === "ended") return fail(`${labelOf(gate)} has ended`);
    const steps = stepsFor(key, c.program);
    if (grades.length !== steps.length || grades.some((g) => !GRADES.includes(g)))
      return fail("Grade every step before submitting");
    const total = grades.reduce((a, g) => a + g, 0);
    setS((st) => ({
      ...st,
      scores: {
        ...st.scores,
        [key]: { ...(st.scores[key] || {}), [examNo]: { grades, total, max: steps.length * 2, by } },
      },
      // Scoring a procedure marks that station done for the candidate.
      candidates: proc
        ? st.candidates.map((x) =>
            x.examNo === examNo ? { ...x, progress: x.progress.map((p, i) => (i === (Number(key[1]) - 1) * 2 ? true : p)) } : x,
          )
        : st.candidates,
      events: [...(st.events || []), `score:${key}:${examNo}`],
    }));
    return ok(`Score saved for ${examNo}`);
  };

  /* ---------- candidate computer (:7000) ---------- */
  const candidateLogin = (examNo) => {
    if (s.components.osce !== "started") return fail("The OSCE has not started");
    const c = s.candidates.find((x) => x.examNo === examNo.trim().toUpperCase());
    if (!c) return fail(`Candidate ${examNo.trim().toUpperCase() || ""} not found`.trim());
    setS((st) => ({
      ...st,
      events: [...(st.events || []), `candidate-login:${c.examNo}`],
      candidateSession: { examNo: c.examNo, q: null, idx: 0, answers: [] },
    }));
    return ok(`Welcome, ${c.name}`, { candidate: c });
  };
  const candidateLogout = () => setS((st) => ({ ...st, candidateSession: null }));
  const patchCandidateSession = (patch) =>
    setS((st) => (st.candidateSession ? { ...st, candidateSession: { ...st.candidateSession, ...patch } } : st));

  const submitQuestions = (examNo, q, answers) => {
    const c = s.candidates.find((x) => x.examNo === examNo);
    if (!c) return fail(`Candidate ${examNo} not found`);
    if (s.components.osce !== "started") return fail("The OSCE is not running");
    const idx = (q - 1) * 2 + 1;
    if (c.progress[idx]) return fail(`Question station ${q} has already been submitted`);
    const qs = QUESTIONS[c.program]?.[q] || [];
    const correct = qs.filter((x, i) => answers[i] === x.answer).length;
    setS((st) => ({
      ...st,
      qresults: { ...st.qresults, [`${examNo}:${q}`]: { correct, total: qs.length } },
      candidates: st.candidates.map((x) =>
        x.examNo === examNo ? { ...x, progress: x.progress.map((p, i) => (i === idx ? true : p)) } : x,
      ),
      events: [...(st.events || []), `answers:${q}:${examNo}`],
      candidateSession: st.candidateSession ? { ...st.candidateSession, q: null, idx: 0, answers: [] } : null,
    }));
    return ok(`Question station ${q} submitted`);
  };

  /* ---------- sandbox helpers ---------- */
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

  // Examiners score 5 more candidates in every Day 1 component that has started.
  const simScore = () => {
    const keys = Object.keys(COMPONENT_STEPS).filter((k) => s.components[k] === "started");
    if (!keys.length) return fail("Start a Day 1 component first");
    setS((st) => {
      const scores = { ...st.scores };
      keys.forEach((k) => {
        const cur = { ...(scores[k] || {}) };
        st.candidates
          .filter((c) => !cur[c.examNo])
          .slice(0, 5)
          .forEach((c) => {
            const grades = COMPONENT_STEPS[k].map(() => GRADES[Math.floor(Math.random() * GRADES.length)]);
            cur[c.examNo] = { grades, total: grades.reduce((a, g) => a + g, 0), max: grades.length * 2, by: "sandbox" };
          });
        scores[k] = cur;
      });
      return { ...st, scores };
    });
    return ok("5 more candidates scored in each started component");
  };

  const value = {
    ...s,
    createCentre, login, logout, setOnline, wipe, applyScenario,
    download, activate, upload, sync,
    startComponent, endComponent,
    createExaminer, deleteExaminer, assignExaminer, makeLead,
    primaryIp, addStationIp, approveIp, simAddIps,
    examinerLogin, examinerLogout, patchExaminerSession, openCandidate, submitScore,
    candidateLogin, candidateLogout, patchCandidateSession, submitQuestions,
    simAdvance, simScore,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}