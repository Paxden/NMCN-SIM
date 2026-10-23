// CAOSCE assessment: six timed situations, no hints, details change on every attempt.
// Seed-driven: both client and server derive the same tasks from the same seed.
import {
  ALL_PROCEDURES,
  COMPONENTS,
  PROCEDURE_PORT,
  QUESTION_PORT,
} from "./osceData";
import {
  PENDING_IPS,
  activated,
  comps,
  finishedCandidates,
} from "./osceScenarios";

export const OSCE_STANDARD = {
  highly: 85,
  competent: 70,
  remediation: 50,
  taskPass: 60,
};
export const AREAS = [
  "Server setup",
  "Exam control",
  "Examiner management",
  "Network and whitelist",
  "Results and upload",
];

// Deterministic RNG (mulberry32). Must match the server's shared/osceAssessment.js.
const rng = (seed) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};
const pick = (arr, r) => arr[Math.floor(r() * arr.length)];
const shuffle = (arr, r) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pickN = (arr, n, r) => shuffle(arr, r).slice(0, n);
const findEx = (s, u) => s.examiners.find((e) => e.username === u);

// Same POOL as the server. Must stay identical or seed rebuild diverges.
const POOL = [
  {
    fullName: "Mrs Adaeze Nwankwo",
    username: "anwankwo",
    password: "adaeze2026",
  },
  { fullName: "Mr Tunde Balogun", username: "tbalogun", password: "tunde2026" },
  { fullName: "Dr Hauwa Danjuma", username: "hdanjuma", password: "hauwa2026" },
  {
    fullName: "Mrs Funke Adeyemi",
    username: "fadeyemi",
    password: "funke2026",
  },
  { fullName: "Mr Emeka Umeh", username: "eumeh", password: "emeka2026" },
  { fullName: "Mrs Zainab Lawal", username: "zlawal", password: "zainab2026" },
];
const STATION_EXAMINER = POOL[0];

const taskSetup = (r) => {
  const offline = r() < 0.5;
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

const taskDayOne = (r) => {
  const [a, b] = pickN(
    COMPONENTS.filter((c) => c.key !== "osce"),
    2,
    r,
  );
  return {
    id: "dayone",
    practise: "day-one",
    area: "Exam control",
    title: "Run Day 1",
    mustPass: false,
    limit: 150,
    situation: `It is Day 1. Start ${a.label} and ${b.label}. ${a.label} has now finished, so end it.`,
    state: () => activated(),
    checks: [
      (s) => s.components[a.key] === "ended",
      (s) => s.components[b.key] === "started",
    ],
  };
};

const taskExaminers = (r) => {
  const [a, b] = pickN(POOL, 2, r);
  const [pa, pb] = pickN(ALL_PROCEDURES, 2, r);
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

const taskWhitelist = (r) => {
  const port = pick([PROCEDURE_PORT, QUESTION_PORT], r);
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

const taskStation = (r) => {
  const proc = r() < 0.5;
  const port = proc ? PROCEDURE_PORT : QUESTION_PORT;
  const exm = STATION_EXAMINER;
  const cand = `NSG26${String(1 + Math.floor(r() * 24)).padStart(3, "0")}`;
  const event = proc
    ? `examiner-login:${exm.username}`
    : `candidate-login:${cand}`;
  return {
    id: "station",
    practise: "register-stations",
    area: "Network and whitelist",
    title: proc
      ? "Bring a procedure station online"
      : "Bring a question station online",
    mustPass: false,
    limit: 240,
    situation: proc
      ? `The OSCE is running. A new procedure station laptop (port ${port}) is on the hall wifi but the server does not know it yet. Get it registered and cleared, then sign in ${exm.fullName} (username ${exm.username}, password ${exm.password}) on it.`
      : `The OSCE is running. A new question station laptop (port ${port}) is on the hall wifi but the server does not know it yet. Get it registered and cleared, then sign in candidate ${cand} on it.`,
    state: () =>
      activated({
        components: comps({ osce: "started" }),
        examiners: [{ ...exm }],
      }),
    checks: [
      (s) => s.ips.some((i) => i.primary && i.port === port),
      (s) => s.ips.some((i) => i.primary && i.port === port && i.approved),
      (s) => s.events.includes(event),
    ],
  };
};

const taskClose = (r) => {
  const offline = r() < 0.5;
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

const FACTORIES = [
  taskSetup,
  taskDayOne,
  taskExaminers,
  taskWhitelist,
  taskStation,
  taskClose,
];

export const TASK_COUNT = FACTORIES.length;

// Same task from the same seed on both client and server.
export function buildTask(seed, index) {
  return FACTORIES[index](rng(seed + index * 7919));
}

export function buildAssessment(seed) {
  return FACTORIES.map((_, i) => buildTask(seed, i));
}

export function evaluateTask(task, s, mistakes) {
  const met = task.checks.filter((c) => {
    try {
      return !!c(s);
    } catch {
      return false;
    }
  }).length;
  const total = task.checks.length;
  const score = Math.max(
    0,
    Math.round((met / total) * 100) - Math.min(25, mistakes * 5),
  );
  return {
    met,
    total,
    mistakes,
    score,
    passed: met === total && score >= OSCE_STANDARD.taskPass,
  };
}

export function buildRecord(name, tasks) {
  const overall = Math.round(
    tasks.reduce((a, t) => a + t.score, 0) / tasks.length,
  );
  const mustPassMet = tasks.filter((t) => t.mustPass).every((t) => t.passed);
  let level = "Not Competent";
  if (mustPassMet && overall >= OSCE_STANDARD.highly)
    level = "Highly Competent";
  else if (mustPassMet && overall >= OSCE_STANDARD.competent)
    level = "Competent";
  else if (overall >= OSCE_STANDARD.remediation) level = "Requires Remediation";
  const profile = AREAS.map((area) => {
    const list = tasks.filter((t) => t.area === area);
    if (!list.length) return null;
    return {
      area,
      score: Math.round(list.reduce((a, t) => a + t.score, 0) / list.length),
    };
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
