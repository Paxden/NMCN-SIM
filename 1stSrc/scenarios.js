import { activate, addInfraction, ensureAdmin, setStatus } from "./data";

// prepare(base) receives a fresh state and returns the starting state for the scenario.
// Steps must be completed in order. Only successful actions are logged.
export const SCENARIOS = [
  {
    id: "setup",
    title: "Set up a fresh CBT server",
    route: "/createserver",
    brief:
      "You have just arrived at the centre. Create the server, log in to the admin panel, then activate the exam.",
    prepare: (base) => base,
    steps: [
      { label: "Create the server", match: (a) => a.type === "server_created" },
      { label: "Log in to the admin panel", match: (a) => a.type === "login" },
      { label: "Activate the exam", match: (a) => a.type === "activate_exam" },
    ],
  },
  {
    id: "disconnect",
    title: "Candidate lost connection",
    route: "/admin/manage",
    brief:
      "Candidate NSG26005 lost connection mid-exam and the screen is blank. Get the candidate back into the exam.",
    prepare: (base) => setStatus(activate(ensureAdmin(base)), () => true, "writing"),
    steps: [
      {
        label: "Relogin candidate NSG26005",
        match: (a) => a.type === "relogin" && a.payload.examNo === "NSG26005",
      },
    ],
  },
  {
    id: "infraction",
    title: "Clear a wrongly flagged candidate",
    route: "/admin/monitor",
    brief:
      "Candidate NSG26009 has been flagged with infractions, but the invigilator confirms it was a false alarm. Clear the infractions.",
    prepare: (base) => {
      let s = setStatus(activate(ensureAdmin(base)), () => true, "writing");
      s = addInfraction(s, "NSG26009", "Switched browser tab");
      s = addInfraction(s, "NSG26009", "Left exam window");
      s = addInfraction(s, "NSG26009", "Switched browser tab");
      return addInfraction(s, "NSG26012", "Copy / paste attempt");
    },
    steps: [
      {
        label: "Remove infractions for NSG26009",
        match: (a) => a.type === "unflag" && a.payload.examNo === "NSG26009",
      },
    ],
  },
  {
    id: "mistake",
    title: "Candidate submitted by mistake",
    route: "/admin/reset",
    brief:
      "Candidate NSG26003 accidentally submitted early. Reset the candidate, then log them back in so they can continue.",
    prepare: (base) => {
      const s = setStatus(activate(ensureAdmin(base)), () => true, "writing");
      return setStatus(s, (c) => c.examNo === "NSG26003", "submitted");
    },
    steps: [
      {
        label: "Reset candidate NSG26003",
        match: (a) => a.type === "reset_candidate" && a.payload.examNo === "NSG26003",
      },
      {
        label: "Relogin candidate NSG26003",
        match: (a) => a.type === "relogin" && a.payload.examNo === "NSG26003",
      },
    ],
  },
  {
    id: "close",
    title: "Close the exam and upload",
    route: "/admin/monitor",
    brief:
      "The exam time is over. End the examination, then upload the results for both sessions.",
    prepare: (base) => {
      let s = setStatus(activate(ensureAdmin(base)), () => true, "writing");
      return setStatus(s, (c) => Number(c.examNo.slice(-3)) <= 12, "submitted");
    },
    steps: [
      { label: "End the exam", match: (a) => a.type === "end_exam" },
      {
        label: "Upload Session 1",
        match: (a) => a.type === "upload" && a.payload.session === "Session 1",
      },
      {
        label: "Upload Session 2",
        match: (a) => a.type === "upload" && a.payload.session === "Session 2",
      },
    ],
  },
];

export function scenarioProgress(scenario, actions) {
  let i = 0;
  for (const a of actions) {
    if (i < scenario.steps.length && scenario.steps[i].match(a)) i++;
  }
  return i;
}
