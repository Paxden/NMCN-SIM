export const EXAM = {
  name: "Professional Nursing Examination, November 2026",
  description:
    "Computer-based objective test for the Professional Nursing Examination. Candidates write across two sessions. Monitor progress from the Monitor page, upload results after the exam has ended.",
  sessions: ["Session 1", "Session 2"],
};

const FIRST = ["Adaeze", "Chinedu", "Funke", "Ibrahim", "Ngozi", "Tunde", "Amaka", "Emeka", "Hauwa", "Segun", "Blessing", "Yusuf", "Chiamaka", "Kelechi", "Zainab", "Femi", "Ifeoma", "Musa", "Titilayo", "Obinna"];
const LAST = ["Okafor", "Adeyemi", "Bello", "Nwosu", "Eze", "Balogun", "Okonkwo", "Ahmed", "Ogunleye", "Umeh", "Ibekwe", "Lawal", "Chukwu", "Afolabi", "Danjuma"];

export const REASONS = [
  "Switched browser tab",
  "Left exam window",
  "Attempted to open another window",
  "Copy / paste attempt",
];

export const mkCandidate = (i) => ({
  examNo: `NSG26${String(i).padStart(3, "0")}`,
  name: `${LAST[i % LAST.length]} ${FIRST[(i * 7) % FIRST.length]}`.toUpperCase(),
  session: EXAM.sessions[i % 2],
  status: "idle", // idle | writing | submitted
});

export const freshState = () => ({
  server: null, // { id, password }
  loggedIn: false,
  activated: false,
  ended: false,
  uploaded: {},
  candidates: Array.from({ length: 30 }, (_, i) => mkCandidate(i + 1)),
  infractions: [],
  actions: [],
  scenario: null,
  syncCount: 0,
});

export const ensureAdmin = (s) =>
  s.server
    ? { ...s, loggedIn: true }
    : { ...s, server: { id: "DEMO01", password: "demo" }, loggedIn: true };

export const activate = (s) => ({ ...s, activated: true, ended: false, uploaded: {} });

export const setStatus = (s, pred, status) => ({
  ...s,
  candidates: s.candidates.map((c) => (pred(c) ? { ...c, status } : c)),
});

export const addInfraction = (s, examNo, reason) => ({
  ...s,
  infractions: [
    ...s.infractions,
    { id: `${Date.now()}-${Math.random()}`, examNo, reason, at: Date.now() },
  ],
});
