// CAOSCE exercises. Each one resets the sandbox to a situation (state) and lists steps.
// A step is "done" when its check passes on the server state, so steps are checked from real actions.
import {
  activated,
  comps,
  finishedCandidates,
  PENDING_IPS,
  STATION_IPS,
  withExaminers,
} from "./osceScenarios";

const examiner = (s, username) => s.examiners.find((e) => e.username === username);

export const OSCE_EXERCISES = [
  {
    id: "setup-exam",
    level: "Easy",
    title: "Get the examination ready",
    brief:
      "You are in the OSCE hall and have logged in to the server laptop. Download the examination and activate it.",
    state: () => ({ loggedIn: true }),
    steps: [
      { text: "Download the examination", done: (s) => s.downloaded },
      { text: "Activate the examination", done: (s) => s.activated },
    ],
  },
  {
    id: "create-examiners",
    level: "Easy",
    title: "Create two examiners",
    brief:
      "Create Mrs Grace Okoro (username gokoro, password grace123) and Mr Ibrahim Bello (username ibello, password bello123).",
    state: () => activated(),
    steps: [
      { text: "Create Mrs Grace Okoro (gokoro)", done: (s) => examiner(s, "gokoro")?.password === "grace123" },
      { text: "Create Mr Ibrahim Bello (ibello)", done: (s) => examiner(s, "ibello")?.password === "bello123" },
    ],
  },
  {
    id: "late-candidates",
    level: "Easy",
    title: "Bring in late candidates",
    brief:
      "Two late candidates were added on the central server after you downloaded the examination. Get them onto this laptop.",
    state: () => activated(),
    steps: [
      { text: "Synchronise the server", done: (s) => s.syncCount >= 1 },
      { text: "Check that the candidates are now 26", done: (s) => s.candidates.length >= 26 },
    ],
  },
  {
    id: "day-one",
    level: "Medium",
    title: "Run the Day 1 components",
    brief: "It is Day 1. Start Viva and Research. The viva has finished, so end it.",
    state: () => activated(),
    steps: [
      { text: "Start Viva", done: (s) => s.components.viva !== "idle" },
      { text: "Start Research", done: (s) => s.components.research !== "idle" },
      { text: "End Viva", done: (s) => s.components.viva === "ended" },
    ],
  },
  {
    id: "assign-lead",
    level: "Medium",
    title: "Assign examiners and a lead",
    brief:
      "It is Day 2 and the OSCE has started. Three examiners already exist. Assign Mrs Okoro to RN Procedure 1 (Wound dressing), Mr Bello to Critical Care Procedure 2 (Central venous pressure measurement), and make Dr Eze the lead examiner.",
    state: () =>
      activated({ components: comps({ osce: "started" }), examiners: withExaminers(3) }),
    steps: [
      { text: "Assign Mrs Okoro to RN Procedure 1", done: (s) => examiner(s, "gokoro")?.procedure === "rn-p1" },
      { text: "Assign Mr Bello to Critical Care Procedure 2", done: (s) => examiner(s, "ibello")?.procedure === "cc-p2" },
      { text: "Make Dr Eze the lead examiner", done: (s) => !!examiner(s, "neze")?.lead },
    ],
  },
  {
    id: "register-stations",
    level: "Medium",
    title: "Register the station computers",
    brief:
      "The examination is activated. One procedure station laptop (:8000) and one question station laptop (:7000) are on the hall wifi but the server does not know them yet. Register both and clear them on the whitelist.",
    tip: "Open the station computers from Sandbox tools (bottom right).",
    state: () => activated(),
    steps: [
      { text: "Procedure station (:8000) adds its IP address", done: (s) => s.ips.some((i) => i.primary && i.port === 8000) },
      { text: "Question station (:7000) adds its IP address", done: (s) => s.ips.some((i) => i.primary && i.port === 7000) },
      { text: "Approve both on the IP Whitelist", done: (s) => s.ips.filter((i) => i.primary).length >= 2 && s.ips.filter((i) => i.primary).every((i) => i.approved) },
    ],
  },
  {
    id: "whitelist-filter",
    level: "Medium",
    title: "Approve only the right laptops",
    brief:
      "Four computers are waiting on the IP Whitelist. Only the two procedure station laptops (port 8000) are cleared for today. Approve those and leave the question station ones pending.",
    state: () => activated({ ips: PENDING_IPS() }),
    steps: [
      { text: "Approve both :8000 computers", done: (s) => s.ips.filter((i) => i.port === 8000).every((i) => i.approved) },
      { text: "Leave both :7000 computers pending", done: (s) => s.ips.filter((i) => i.port === 7000).every((i) => !i.approved) },
    ],
  },
  {
    id: "first-candidate",
    level: "Medium",
    title: "Candidate cannot log in",
    brief:
      "Both station computers are approved. Candidate NSG26003 is at the question station but cannot log in. Find out why and get the candidate signed in.",
    tip: "Open the question station computer from Sandbox tools (bottom right).",
    state: () => activated({ ips: STATION_IPS(true), examiners: withExaminers(2) }),
    steps: [
      { text: "Start the OSCE", done: (s) => s.components.osce === "started" },
      { text: "Sign NSG26003 in at the question station (:7000)", done: (s) => s.events.includes("candidate-login:NSG26003") },
    ],
  },
  {
    id: "close-upload",
    level: "Hard",
    title: "Close the OSCE and upload",
    brief:
      "Every candidate has finished all six stations. End the OSCE and upload the results. The hall internet has dropped, so fix that first if you need to.",
    tip: "The internet switch is in Sandbox tools (bottom right).",
    state: () =>
      activated({
        components: comps({ osce: "started" }),
        candidates: finishedCandidates(),
        online: false,
      }),
    steps: [
      { text: "End the OSCE", done: (s) => s.components.osce === "ended" },
      { text: "Get the connection back", done: (s) => s.online },
      { text: "Upload CAOSCE", done: (s) => s.uploaded },
    ],
  },
];
