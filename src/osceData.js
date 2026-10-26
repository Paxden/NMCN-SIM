// CAOSCE (computer-aided OSCE) simulation data.

export const SERVER_IP = "192.168.1.100"; // the wifi address of the manager's server laptop
export const PROCEDURE_PORT = 8000;
export const QUESTION_PORT = 7000;

export const OSCE_EXAM = {
  name: "Professional Nursing Examination, November 2026 (CAOSCE)",
  description:
    "Computer-aided OSCE for the Professional Nursing Examination. Day 1 covers viva, client care, expected family care and research. Day 2 is the OSCE itself.",
};

// Day 1 components and the Day 2 OSCE. Each has a Start and an End button on the exam page.
export const COMPONENTS = [
  { key: "osce", label: "OSCE", day: "Day 2" },
  { key: "viva", label: "Viva", day: "Day 1" },
  { key: "client_care", label: "Client Care", day: "Day 1" },
  { key: "family_care", label: "Expected Family Care", day: "Day 1" },
  { key: "research", label: "Research", day: "Day 1" },
];

// One team rotates through six stations: procedure, question, procedure, question, procedure, question.
export const STATION_ORDER = ["P1", "Q1", "P2", "Q2", "P3", "Q3"];

export const PROGRAMS = [
  {
    id: "rn",
    short: "RN",
    name: "Registered Nursing (RN)",
    procedures: ["Wound dressing", "Urinary catheterisation", "Intramuscular injection"],
  },
  {
    id: "cc",
    short: "Critical Care",
    name: "Post-Basic Nursing: Critical Care",
    procedures: ["Tracheostomy care", "Central venous pressure measurement", "Cardiopulmonary resuscitation"],
  },
  {
    id: "po",
    short: "Perioperative",
    name: "Post-Basic Nursing: Perioperative",
    procedures: ["Surgical hand scrub, gowning and gloving", "Preparation of the operating table", "Counting of instruments, swabs and sharps"],
  },
];

// Every procedure, for the "assign examiner" dropdown.
export const ALL_PROCEDURES = PROGRAMS.flatMap((p) =>
  p.procedures.map((name, i) => ({ id: `${p.id}-p${i + 1}`, label: `${p.short} · Procedure ${i + 1}: ${name}` }))
);
export const procedureLabel = (id) => ALL_PROCEDURES.find((p) => p.id === id)?.label || "";

const FIRST = ["Adaeze", "Chinedu", "Funke", "Ibrahim", "Ngozi", "Tunde", "Amaka", "Emeka", "Hauwa", "Segun", "Blessing", "Yusuf", "Chiamaka", "Kelechi", "Zainab", "Femi", "Ifeoma", "Musa", "Titilayo", "Obinna"];
const LAST = ["Okafor", "Adeyemi", "Bello", "Nwosu", "Eze", "Balogun", "Okonkwo", "Ahmed", "Ogunleye", "Umeh", "Ibekwe", "Lawal", "Chukwu", "Afolabi", "Danjuma"];

// 24 candidates: 10 RN, 8 Critical Care, 6 Perioperative, split over two teams.
export const makeOsceCandidates = (n = 24, start = 1) =>
  Array.from({ length: n }, (_, k) => {
    const i = start + k;
    return {
      examNo: `NSG26${String(i).padStart(3, "0")}`,
      name: `${LAST[i % LAST.length]} ${FIRST[(i * 7) % FIRST.length]}`.toUpperCase(),
      program: i <= 10 ? "rn" : i <= 18 ? "cc" : "po",
      team: i % 2 === 0 ? "Team 2" : "Team 1",
      progress: [false, false, false, false, false, false], // P1 Q1 P2 Q2 P3 Q3
    };
  });

export const freshOsce = () => ({
  centreCreated: false, // the centre must be created (needs internet) before the manager can log in
  loggedIn: false,
  online: true,
  downloaded: false,
  activated: false,
  uploaded: false,
  components: { osce: "idle", viva: "idle", client_care: "idle", family_care: "idle", research: "idle" }, // idle | started | ended
  candidates: [],
  examiners: [], // { id, fullName, username, password, procedure, lead }
  ips: [], // { id, ip, port, approved, primary }
  syncCount: 0,
  mistakes: 0, // failed actions, used to score exercises and the assessment
  events: [], // station sign-ins and submissions, e.g. "examiner-login:gokoro", "score:viva:NSG26005"
  scores: {}, // scores[key][examNo] = { grades, total, max, by }  (key: viva, client_care, family_care, research, p1, p2, p3)
  qresults: {}, // qresults["NSG26007:2"] = { correct, total }
  examinerSession: null, // the signed-in examiner computer: { username, page, key, examNo, procKey }
  candidateSession: null, // the signed-in candidate computer: { examNo, q, idx, answers }
});