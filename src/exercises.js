import { stageState } from "./data";

// The server login details a centre manager is given: the Centre ID (used as the Server ID)
// and a generated 6-character code (used as the password). Shared by the trainer and the assessment.
export const CBT_SERVER_LOGIN = { id: "104", password: "A7K2PQ" };
const L = CBT_SERVER_LOGIN;

// is("relogin", { examNo: "NSG26005" }) -> matches that action
export const is = (type, payload = {}) => (a) =>
  a.type === type && Object.entries(payload).every(([k, v]) => a.payload?.[k] === v);

const rec = (examNo, reason, i) => ({ id: `i${i}`, examNo, reason, at: i });

// steps must be completed in order; other actions in between are allowed.
// wrong(a) marks a harmful action. Error toasts also count as mistakes (unless ignoreErrors).
export const EXERCISES = [
  {
    id: "setup",
    title: "Log in and set up the server",
    level: "Easy",
    route: "/admin",
    brief: `You have just arrived at the exam centre with your server login details: Server ID ${L.id}, password ${L.password}. The server system is connected to the internet. Log in, download the exam data, activate the exam and then activate Session 1.`,
    prepare: () => stageState("start"),
    steps: [
      { label: "Log in with the server login details", match: is("login") },
      { label: "Download the exam data", match: is("download") },
      { label: "Activate the exam", match: is("activate_exam") },
      { label: "Activate Session 1", match: is("activate_session", { session: "Session 1" }) },
    ],
    wrong: is("reset_server"),
  },
  {
    id: "offline",
    title: "Server system not online",
    level: "Medium",
    route: "/admin",
    network: true,
    ignoreErrors: true,
    brief: `The server system is not connected to the internet yet. Use your mobile hotspot to get it online (the internet switch is in the Task panel), log in with Server ID ${L.id} and password ${L.password}, then download the exam data.`,
    prepare: () => ({ ...stageState("start"), online: false }),
    steps: [
      { label: "Connect the server system to the internet", match: is("net_on") },
      { label: "Log in with the server login details", match: is("login") },
      { label: "Download the exam data", match: is("download") },
    ],
  },
  {
    id: "disconnect",
    title: "Power outage on a candidate computer",
    level: "Easy",
    route: "/admin/manage",
    brief:
      "A power outage restarted candidate NSG26005's computer. Get the candidate back into the exam so they can continue where they stopped.",
    prepare: () => stageState("writing"),
    steps: [
      { label: "Relogin candidate NSG26005", match: is("relogin", { examNo: "NSG26005" }) },
    ],
    wrong: (a) =>
      ["reset_candidate", "reset_server", "end_exam"].includes(a.type) ||
      (a.type === "relogin" && a.payload.examNo !== "NSG26005"),
  },
  {
    id: "relogin-all",
    title: "Power outage on every computer",
    level: "Medium",
    route: "/admin/manage",
    brief:
      "A power outage switched off every candidate computer in the hall. Instead of logging candidates back in one after another, get all of them back into the exam at once.",
    prepare: () => stageState("writing"),
    steps: [{ label: "Relogin all candidates", match: is("relogin_all") }],
    wrong: (a) => ["reset_candidate", "reset_server", "end_exam"].includes(a.type),
  },
  {
    id: "infraction",
    title: "Unflag a candidate for infraction",
    level: "Easy",
    route: "/admin/monitor",
    brief:
      "Candidate NSG26009 broke the exam rules and, after three warnings on their own computer, was flagged for infraction. The centre manager has decided to lift the flag. Remove the infraction for NSG26009 only.",
    prepare: () => stageState("flagged"),
    steps: [
      { label: "Remove the infraction for NSG26009", match: is("unflag", { examNo: "NSG26009" }) },
    ],
    wrong: (a) =>
      ["reset_candidate", "reset_server", "end_exam"].includes(a.type) ||
      (a.type === "unflag" && a.payload.examNo !== "NSG26009"),
  },
  {
    id: "mistake",
    title: "Candidate has the wrong time or paper",
    level: "Medium",
    route: "/admin/reset",
    brief:
      "Candidate NSG26003 has less time than the other candidates and the wrong question paper, because the browser kept data from an earlier exam. Reset the candidate so their time and paper are restored. The candidate can log in straight after the reset.",
    prepare: () => {
      const s = stageState("writing");
      s.candidates = s.candidates.map((c) =>
        c.examNo === "NSG26003" ? { ...c, status: "writing", answered: 12 } : c
      );
      return s;
    },
    steps: [
      { label: "Reset candidate NSG26003", match: is("reset_candidate", { examNo: "NSG26003" }) },
    ],
    wrong: (a) =>
      ["reset_server", "end_exam"].includes(a.type) ||
      (a.type === "reset_candidate" && a.payload.examNo !== "NSG26003"),
  },
  {
    id: "sync",
    title: "Candidate not on the downloaded list",
    level: "Easy",
    route: "/admin/sync",
    brief:
      "Candidate NSG26031 is at the centre to write the exam but is not on the candidate list you downloaded. The central office has since added the candidate. Use your mobile hotspot to bring the new candidate data onto this server.",
    prepare: () => stageState("writing"),
    steps: [{ label: "Synchronise the server", match: is("sync") }],
    wrong: (a) => ["reset_server", "end_exam"].includes(a.type),
  },
  {
    id: "close",
    title: "End the exam and upload the responses",
    level: "Medium",
    route: "/admin/monitor",
    brief:
      "The sessions are over. End the examination, then upload the responses of both sessions to the central server.",
    prepare: () => stageState("writing"),
    steps: [
      { label: "End the exam", match: is("end_exam") },
      { label: "Upload Session 1", match: is("upload", { session: "Session 1" }) },
      { label: "Upload Session 2", match: is("upload", { session: "Session 2" }) },
    ],
    wrong: (a) => ["reset_server", "reset_candidate"].includes(a.type),
  },
  {
    id: "newexam",
    title: "Prepare the server for a new exam",
    level: "Easy",
    route: "/admin/reset",
    brief:
      "Both sessions have been uploaded to the central server. Clear the finished exam from this server to prepare it for the next exam.",
    prepare: () => stageState("uploaded"),
    steps: [{ label: "Reset the server", match: is("reset_server") }],
    wrong: is("reset_candidate"),
  },
  {
    id: "fullday",
    title: "Exam day simulation",
    level: "Hard",
    route: "/admin",
    brief: `Run the exam from start to finish. Log in with Server ID ${L.id} and password ${L.password}, download the exam data, then activate the exam and both sessions. While the candidates are writing, candidate NSG26009 has been flagged for infraction and the centre manager wants the flag removed, and candidate NSG26005's computer restarted after a power outage. Then end the exam and upload both sessions.`,
    prepare: () => ({
      ...stageState("start"),
      infractions: [
        rec("NSG26009", "Switched browser tab", 1),
        rec("NSG26009", "Left exam window", 2),
        rec("NSG26009", "Switched browser tab", 3),
      ],
    }),
    steps: [
      { label: "Log in with the server login details", match: is("login") },
      { label: "Download the exam data", match: is("download") },
      { label: "Activate the exam", match: is("activate_exam") },
      { label: "Activate Session 1", match: is("activate_session", { session: "Session 1" }) },
      { label: "Activate Session 2", match: is("activate_session", { session: "Session 2" }) },
      { label: "Relogin candidate NSG26005", match: is("relogin", { examNo: "NSG26005" }) },
      { label: "Remove the infraction for NSG26009", match: is("unflag", { examNo: "NSG26009" }) },
      { label: "End the exam", match: is("end_exam") },
      { label: "Upload Session 1", match: is("upload", { session: "Session 1" }) },
      { label: "Upload Session 2", match: is("upload", { session: "Session 2" }) },
    ],
    wrong: (a) => ["reset_candidate", "reset_server"].includes(a.type),
  },
];

export function exerciseProgress(ex, actions) {
  let i = 0;
  for (const a of actions) {
    if (i < ex.steps.length && ex.steps[i].match(a)) i++;
  }
  return i;
}

export function wrongCount(ex, actions) {
  return ex.wrong ? actions.filter(ex.wrong).length : 0;
}
