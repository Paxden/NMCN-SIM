import { stageState } from "./data";

// is("relogin", { examNo: "NSG26005" }) -> matches that action
const is = (type, payload = {}) => (a) =>
  a.type === type && Object.entries(payload).every(([k, v]) => a.payload?.[k] === v);

// steps must be completed in order; other actions in between are allowed.
// wrong(a) marks a harmful action. Error toasts also count as mistakes (unless ignoreErrors).
export const EXERCISES = [
  {
    id: "setup",
    title: "Set up a new server",
    level: "Easy",
    route: "/createserver",
    brief:
      "You have just arrived at the exam centre. Create the server, log in, download the exam data, activate the exam and then activate Session 1.",
    prepare: () => stageState("start"),
    steps: [
      { label: "Create the server", match: is("server_created") },
      { label: "Log in to the admin panel", match: is("login") },
      { label: "Download exam, candidates and questions", match: is("download") },
      { label: "Activate the exam", match: is("activate_exam") },
      { label: "Activate Session 1", match: is("activate_session", { session: "Session 1" }) },
    ],
    wrong: is("reset_server"),
  },
  {
    id: "offline",
    title: "No internet connection",
    level: "Medium",
    route: "/admin/upload",
    network: true,
    ignoreErrors: true,
    brief:
      "The network cable was knocked out and the exam has not been downloaded yet. Restore the internet connection (switch in the Task panel), then download the exam data.",
    prepare: () => ({ ...stageState("loggedIn"), online: false }),
    steps: [
      { label: "Restore the internet connection", match: is("net_on") },
      { label: "Download exam, candidates and questions", match: is("download") },
    ],
  },
  {
    id: "disconnect",
    title: "Candidate lost connection",
    level: "Easy",
    route: "/admin/manage",
    brief:
      "Candidate NSG26005 lost connection mid-exam and the screen went blank. Get the candidate back into the exam without losing their answers.",
    prepare: () => stageState("writing"),
    steps: [
      { label: "Relogin candidate NSG26005", match: is("relogin", { examNo: "NSG26005" }) },
    ],
    wrong: (a) =>
      ["reset_candidate", "reset_server", "end_exam"].includes(a.type) ||
      (a.type === "relogin" && a.payload.examNo !== "NSG26005"),
  },
  {
    id: "infraction",
    title: "Clear a wrongly flagged candidate",
    level: "Easy",
    route: "/admin/monitor",
    brief:
      "Candidate NSG26009 has been flagged several times, but the invigilator confirms it was a false alarm. Clear the infractions for NSG26009 only.",
    prepare: () => stageState("flagged"),
    steps: [
      { label: "Remove infractions for NSG26009", match: is("unflag", { examNo: "NSG26009" }) },
    ],
    wrong: (a) =>
      ["reset_candidate", "reset_server", "end_exam"].includes(a.type) ||
      (a.type === "unflag" && a.payload.examNo !== "NSG26009"),
  },
  {
    id: "mistake",
    title: "Candidate submitted by mistake",
    level: "Medium",
    route: "/admin/reset",
    brief:
      "Candidate NSG26003 clicked Submit after answering only 47 questions. Reset that candidate, then log them back in so they can write again.",
    prepare: () => {
      const s = stageState("writing");
      s.candidates = s.candidates.map((c) =>
        c.examNo === "NSG26003" ? { ...c, status: "submitted", answered: 47 } : c
      );
      return s;
    },
    steps: [
      { label: "Reset candidate NSG26003", match: is("reset_candidate", { examNo: "NSG26003" }) },
      { label: "Relogin candidate NSG26003", match: is("relogin", { examNo: "NSG26003" }) },
    ],
    wrong: (a) =>
      ["reset_server", "end_exam"].includes(a.type) ||
      (a.type === "reset_candidate" && a.payload.examNo !== "NSG26003"),
  },
  {
    id: "sync",
    title: "Late-registered candidates",
    level: "Easy",
    route: "/admin/sync",
    brief:
      "The central office has registered more candidates after your download. Bring the new data onto this server.",
    prepare: () => stageState("writing"),
    steps: [{ label: "Synchronise the server", match: is("sync") }],
    wrong: (a) => ["reset_server", "end_exam"].includes(a.type),
  },
  {
    id: "close",
    title: "Close the exam and upload",
    level: "Medium",
    route: "/admin/monitor",
    brief:
      "Exam time is over. End the examination, then upload the results for both sessions.",
    prepare: () => stageState("writing"),
    steps: [
      { label: "End the exam", match: is("end_exam") },
      { label: "Upload Session 1", match: is("upload", { session: "Session 1" }) },
      { label: "Upload Session 2", match: is("upload", { session: "Session 2" }) },
    ],
    wrong: (a) => ["reset_server", "reset_candidate"].includes(a.type),
  },
  {
    id: "fullday",
    title: "Run the whole exam day",
    level: "Hard",
    route: "/admin/upload",
    brief:
      "You are logged in on a fresh server. Run the exam from start to finish: download, activate the exam and both sessions, end the exam, upload both sessions and finally reset the server for the next exam.",
    prepare: () => stageState("loggedIn"),
    steps: [
      { label: "Download exam, candidates and questions", match: is("download") },
      { label: "Activate the exam", match: is("activate_exam") },
      { label: "Activate Session 1", match: is("activate_session", { session: "Session 1" }) },
      { label: "Activate Session 2", match: is("activate_session", { session: "Session 2" }) },
      { label: "End the exam", match: is("end_exam") },
      { label: "Upload Session 1", match: is("upload", { session: "Session 1" }) },
      { label: "Upload Session 2", match: is("upload", { session: "Session 2" }) },
      { label: "Reset the server", match: is("reset_server") },
    ],
    wrong: is("reset_candidate"),
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
