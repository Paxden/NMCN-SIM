import { stageState } from "./data";
import { CBT_SERVER_LOGIN, exerciseProgress, is, wrongCount } from "./exercises";

// Placeholder standard. The examining body should confirm the real thresholds.
export const STANDARD = {
  highlyCompetent: 90, // overall % (and every must-pass task passed)
  competent: 70, // overall % (and every must-pass task passed)
  remediation: 50, // overall % below this is Not Competent
  taskPass: 60, // a task passes if completed with a score at or above this
  penaltyPerMistake: 10,
};

const L = CBT_SERVER_LOGIN;

// small seeded random generator so a task can be rebuilt identically from the attempt seed
const rng = (seed) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};
const no = (n) => `NSG26${String(n).padStart(3, "0")}`;
// candidates whose number is a multiple of 7 start as "submitted" in the writing stage, so avoid them
const pickNo = (r, exclude = []) => {
  for (;;) {
    const n = 1 + Math.floor(r() * 30);
    if (n % 7 !== 0 && !exclude.includes(n)) return n;
  }
};

// Each task describes a situation only. steps/wrong are the hidden marking scheme.
const FACTORIES = [
  () => ({
    id: "setup",
    title: "Server set-up",
    area: "Server set-up",
    mustPass: true,
    timeLimit: 240,
    situation: `You have just arrived at the exam centre with your server login details: Server ID ${L.id}, password ${L.password}. The server system is connected to the internet. Get Session 1 ready so that its candidates can start writing.`,
    prepare: () => stageState("start"),
    steps: [
      { match: is("login") },
      { match: is("download") },
      { match: is("activate_exam") },
      { match: is("activate_session", { session: "Session 1" }) },
    ],
    wrong: is("reset_server"),
  }),

  () => ({
    id: "offline",
    title: "Server system not online",
    area: "Connectivity",
    mustPass: false,
    timeLimit: 180,
    ignoreErrors: true,
    situation: `The exam data has not been downloaded onto the server system, and the server system is not connected to the internet. Your server login details are Server ID ${L.id}, password ${L.password}. Get the exam data onto the server.`,
    prepare: () => ({ ...stageState("start"), online: false }),
    steps: [{ match: is("net_on") }, { match: is("login") }, { match: is("download") }],
  }),

  (r) => {
    const n = no(pickNo(r));
    return {
      id: "disconnect",
      title: "Power outage on a candidate computer",
      area: "Candidate management",
      mustPass: false,
      timeLimit: 120,
      situation: `A power outage restarted candidate ${n}'s computer and the screen went blank. The candidate must carry on from where they stopped.`,
      prepare: () => stageState("writing"),
      steps: [{ match: is("relogin", { examNo: n }) }],
      wrong: (a) =>
        ["reset_candidate", "reset_server", "end_exam"].includes(a.type) ||
        (a.type === "relogin" && a.payload.examNo !== n),
    };
  },

  (r) => {
    const a = pickNo(r);
    const b = pickNo(r, [a]);
    const n = no(a);
    return {
      id: "infraction",
      title: "Unflag a candidate for infraction",
      area: "Infractions",
      mustPass: false,
      timeLimit: 120,
      situation: `Candidate ${n} was warned three times on their own computer and has been flagged for infraction. The centre manager has decided to lift the flag. Sort it out without affecting any other candidate.`,
      prepare: () => {
        const s = stageState("writing");
        const rec = (examNo, reason, i) => ({ id: `i${i}`, examNo, reason, at: i });
        s.infractions = [
          rec(n, "Switched browser tab", 1),
          rec(n, "Left exam window", 2),
          rec(n, "Switched browser tab", 3),
          rec(no(b), "Copy / paste attempt", 4),
        ];
        return s;
      },
      steps: [{ match: is("unflag", { examNo: n }) }],
      wrong: (x) =>
        ["reset_candidate", "reset_server", "end_exam"].includes(x.type) ||
        (x.type === "unflag" && x.payload.examNo !== n),
    };
  },

  (r) => {
    const a = pickNo(r);
    const n = no(a);
    const k = 20 + Math.floor(r() * 70);
    return {
      id: "mistake",
      title: "Candidate has the wrong time or paper",
      area: "Candidate management",
      mustPass: true,
      timeLimit: 180,
      situation: `Candidate ${n} has less time than the other candidates and the wrong question paper, because the browser kept data from an earlier exam. Restore the candidate's time and paper so they can write the exam.`,
      prepare: () => {
        const s = stageState("writing");
        s.candidates = s.candidates.map((c) =>
          c.examNo === n ? { ...c, status: "writing", answered: k } : c
        );
        return s;
      },
      steps: [{ match: is("reset_candidate", { examNo: n }) }],
      wrong: (x) =>
        ["reset_server", "end_exam"].includes(x.type) ||
        (x.type === "reset_candidate" && x.payload.examNo !== n),
    };
  },

  () => ({
    id: "close",
    title: "Exam time is over",
    area: "Exam closure",
    mustPass: true,
    timeLimit: 180,
    situation:
      "The sessions are over. Make sure the exam is ended and the responses of both sessions reach the central server.",
    prepare: () => stageState("writing"),
    steps: [
      { match: is("end_exam") },
      { match: is("upload", { session: "Session 1" }) },
      { match: is("upload", { session: "Session 2" }) },
    ],
    wrong: (a) => ["reset_server", "reset_candidate"].includes(a.type),
  }),
];

export const TASK_COUNT = FACTORIES.length;

export function buildTask(seed, index) {
  return FACTORIES[index](rng(seed + index * 7919));
}

export function gradeTask(task, actions, { errors, timeSec, timedOut }) {
  const total = task.steps.length;
  const done = exerciseProgress(task, actions);
  const completed = done >= total;
  const harmful = wrongCount(task, actions);
  const mistakes = (task.ignoreErrors ? 0 : errors) + harmful;
  const score = completed
    ? Math.max(50, 100 - STANDARD.penaltyPerMistake * mistakes)
    : Math.round((49 * done) / total);
  return {
    id: task.id,
    title: task.title,
    area: task.area,
    mustPass: task.mustPass,
    situation: task.situation,
    stepsDone: done,
    stepsTotal: total,
    mistakes,
    timeSec,
    timedOut,
    score,
    passed: completed && score >= STANDARD.taskPass,
  };
}

export function buildReport(results) {
  const overall = Math.round(results.reduce((a, r) => a + r.score, 0) / results.length);
  const mustPassMet = results.every((r) => !r.mustPass || r.passed);
  let level;
  if (mustPassMet && overall >= STANDARD.highlyCompetent) level = "Highly Competent";
  else if (mustPassMet && overall >= STANDARD.competent) level = "Competent";
  else if (overall >= STANDARD.remediation) level = "Requires Remediation";
  else level = "Not Competent";

  const byArea = {};
  results.forEach((r) => (byArea[r.area] ||= []).push(r.score));
  const profile = Object.entries(byArea).map(([area, v]) => ({
    area,
    score: Math.round(v.reduce((a, b) => a + b, 0) / v.length),
  }));

  return {
    overall,
    level,
    passed: level === "Competent" || level === "Highly Competent",
    mustPassMet,
    profile,
  };
}
