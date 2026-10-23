// CAOSCE assessment: six timed situations, no hints, details change on every attempt.
import { ALL_PROCEDURES, COMPONENTS, PROCEDURE_PORT, QUESTION_PORT } from "./osceData";
import { EXAMINERS, PENDING_IPS, activated, comps, finishedCandidates } from "./osceScenarios";

export const OSCE_STANDARD = { highly: 85, competent: 70, remediation: 50, taskPass: 60 };
export const AREAS = [
  "Server setup",
  "Exam control",
  "Examiner management",
  "Network and whitelist",
  "Results and upload",
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);
const findEx = (s, u) => s.examiners.find((e) => e.username === u);

const POOL = [
  { fullName: "Mrs Adaeze Nwankwo", username: "anwankwo", password: "adaeze2026" },
  { fullName: "Mr Tunde Balogun", username: "tbalogun", password: "tunde2026" },
  { fullName: "Dr Hauwa Danjuma", username: "hdanjuma", password: "hauwa2026" },
  { fullName: "Mrs Funke Adeyemi", username: "fadeyemi", password: "funke2026" },
  { fullName: "Mr Emeka Umeh", username: "eumeh", password: "emeka2026" },
  { fullName: "Mrs Zainab Lawal", username: "zlawal", password: "zainab2026" },
];

const taskSetup = () => {
  const offline = Math.random() < 0.5;
  return {
    id: "setup",
    practise: "setup-exam",
    area: "Server setup",
    title: "Prepare the examination",
    mustPass: true,
    limit: 150,
    situation:
      "You are in the OSCE hall with the server laptop and you are logged in. Get the examination ready so that the exam can be run.",
    state: () => ({ loggedIn: true, online: !offline }),
    checks: [(s) => s.downloaded, (s) => s.activated],
  };
};

const taskDayOne = () => {
  const [a, b] = pickN(COMPONENTS.filter((c) => c.key !== "osce"), 2);
  return {
    id: "dayone",
    practise: "day-one",
    area: "Exam control",
    title: "Run Day 1",
    mustPass: false,
    limit: 150,
    situation: `It is Day 1. Start ${a.label} and ${b.label}. ${a.label} has now finished, so end it.`,
    state: () => activated(),
    checks: [(s) => s.components[a.key] === "ended", (s) => s.components[b.key] === "started"],
  };
};

const taskExaminers = () => {
  const [a, b] = pickN(POOL, 2);
  const [pa, pb] = pickN(ALL_PROCEDURES, 2);
  return {
    id: "examiners",
    practise: "assign-lead",
    area: "Examiner management",
    title: "Set up two examiners",
    mustPass: false,
    limit: 300,
    situation: `The OSCE has started. Create two examiners: ${a.fullName} (username ${a.username}, password ${a.password}) and ${b.fullName} (username ${b.username}, password ${b.password}). Assign ${a.fullName} to "${pa.label}" and ${b.fullName} to "${pb.label}". Make ${a.fullName} the lead examiner.`,
    state: () => activated({ components: comps({ osce: "started" }) }),
    checks: [
      (s) => findEx(s, a.username)?.password === a.password,
      (s) => findEx(s, b.username)?.password === b.password,
      (s) => findEx(s, a.username)?.procedure === pa.id,
      (s) => findEx(s, b.username)?.procedure === pb.id,
      (s) => !!findEx(s, a.username)?.lead,
    ],
  };
};

const taskWhitelist = () => {
  const port = pick([PROCEDURE_PORT, QUESTION_PORT]);
  const kind = port === PROCEDURE_PORT ? "procedure" : "question";
  return {
    id: "whitelist",
    practise: "whitelist-filter",
    area: "Network and whitelist",
    title: "Clear the right laptops",
    mustPass: true,
    limit: 120,
    situation: `Four computers are waiting on the IP Whitelist. Only the ${kind} station laptops (port ${port}) belong to today's exam. Clear those and nothing else.`,
    state: () => activated({ ips: PENDING_IPS() }),
    checks: [
      (s) => s.ips.filter((i) => i.port === port).every((i) => i.approved),
      (s) => s.ips.filter((i) => i.port !== port).every((i) => !i.approved),
    ],
  };
};

const taskStation = () => {
  const proc = Math.random() < 0.5;
  const port = proc ? PROCEDURE_PORT : QUESTION_PORT;
  const exm = EXAMINERS[0];
  const cand = `NSG26${String(1 + Math.floor(Math.random() * 24)).padStart(3, "0")}`;
  const event = proc ? `examiner-login:${exm.username}` : `candidate-login:${cand}`;
  return {
    id: "station",
    practise: "register-stations",
    area: "Network and whitelist",
    title: proc ? "Bring a procedure station online" : "Bring a question station online",
    mustPass: false,
    limit: 240,
    situation: proc
      ? `The OSCE is running. A new procedure station laptop (port ${port}) is on the hall wifi but the server does not know it yet. Get it registered and cleared, then sign in ${exm.fullName} (username ${exm.username}, password ${exm.password}) on it.`
      : `The OSCE is running. A new question station laptop (port ${port}) is on the hall wifi but the server does not know it yet. Get it registered and cleared, then sign in candidate ${cand} on it.`,
    state: () =>
      activated({ components: comps({ osce: "started" }), examiners: [{ ...exm }] }),
    checks: [
      (s) => s.ips.some((i) => i.primary && i.port === port),
      (s) => s.ips.some((i) => i.primary && i.port === port && i.approved),
      (s) => s.events.includes(event),
    ],
  };
};

const taskClose = () => {
  const offline = Math.random() < 0.5;
  return {
    id: "close",
    practise: "close-upload",
    area: "Results and upload",
    title: "Close the OSCE and upload",
    mustPass: true,
    limit: 180,
    situation:
      "Every candidate has finished all six stations. Close the OSCE and send the results to the central server.",
    state: () =>
      activated({
        components: comps({ osce: "started" }),
        candidates: finishedCandidates(),
        online: !offline,
      }),
    checks: [(s) => s.components.osce === "ended", (s) => s.uploaded],
  };
};

export const buildAssessment = () => [
  taskSetup(),
  taskDayOne(),
  taskExaminers(),
  taskWhitelist(),
  taskStation(),
  taskClose(),
];
export const TASK_COUNT = 6;

export function evaluateTask(task, s, mistakes) {
  const met = task.checks.filter((c) => {
    try {
      return !!c(s);
    } catch {
      return false;
    }
  }).length;
  const total = task.checks.length;
  const score = Math.max(0, Math.round((met / total) * 100) - Math.min(25, mistakes * 5));
  return { met, total, mistakes, score, passed: met === total && score >= OSCE_STANDARD.taskPass };
}

export function buildRecord(name, tasks) {
  const overall = Math.round(tasks.reduce((a, t) => a + t.score, 0) / tasks.length);
  const mustPassMet = tasks.filter((t) => t.mustPass).every((t) => t.passed);
  let level = "Not Competent";
  if (mustPassMet && overall >= OSCE_STANDARD.highly) level = "Highly Competent";
  else if (mustPassMet && overall >= OSCE_STANDARD.competent) level = "Competent";
  else if (overall >= OSCE_STANDARD.remediation) level = "Requires Remediation";
  const profile = AREAS.map((area) => {
    const list = tasks.filter((t) => t.area === area);
    if (!list.length) return null;
    return { area, score: Math.round(list.reduce((a, t) => a + t.score, 0) / list.length) };
  }).filter(Boolean);
  return {
    attemptId: `caosce-${Date.now()}`,
    name: name.trim(),
    finishedAt: new Date().toISOString(),
    overall,
    level,
    passed: level === "Highly Competent" || level === "Competent",
    mustPassMet,
    tasks,
    profile,
  };
}
