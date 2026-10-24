// Guided tour for the CAOSCE server. Each step opens a page, sets the server to a matching
// situation, then circles a target. A target is a CSS selector, or { sel, text } to pick the
// element whose text starts with `text`, so the pages need no extra attributes.
import {
  EXAMINERS,
  activated,
  comps,
  downloaded,
  finishedCandidates,
  ip,
  partwayCandidates,
  STATION_IPS,
} from "./osceScenarios";

const started = (extra = {}) => activated({ components: comps({ osce: "started" }), ...extra });
const FIRST_CARD = ".comp-card:first-child";

// Examiners with procedures, so the examiner computer has something to show.
const crew = () => [
  { ...EXAMINERS[0], procedure: "rn-p1" },
  { ...EXAMINERS[1], procedure: "cc-p2" },
  { ...EXAMINERS[2], lead: true },
];

// The examiner computer, already signed in as Mrs Okoro on a given page.
const examinerComputer = (page, session = {}) =>
  started({
    components: comps({ osce: "started", viva: "started", research: "started" }),
    ips: STATION_IPS(true),
    examiners: crew(),
    examinerSession: { username: "gokoro", page, key: "", examNo: "", procKey: "p1", ...session },
  });

export const OSCE_TOUR = [
  {
    path: "/osce/login",
    state: () => ({ loggedIn: false }),
    target: ".auth",
    title: "Log in to the server",
    body: "On exam day the exam manager carries the server laptop to the OSCE hall and logs in here. In this trainer the details are shown in the yellow box: Server ID 101, password demo.",
  },
  {
    path: "/osce/home",
    state: () => ({ loggedIn: true }),
    target: ".osce-main .card",
    title: "Connect the laptops first",
    body: "Before anything else, the manager connects the server laptop to the wifi or router, then connects every station laptop to the same wifi: 6 laptops for one team, 12 for two teams. The server's wifi IP address is what the station laptops type in their browsers.",
  },
  {
    path: "/osce/home",
    state: () => ({ loggedIn: true }),
    target: ".osce-side",
    title: "The side menu",
    body: "Home, then the OSCE menu with Dashboard, Download, Upload, IP Whitelist and Synchronize. Log out is at the bottom of that list.",
  },
  {
    path: "/osce/download",
    state: () => ({ loggedIn: true }),
    target: { sel: "button", text: "Download" },
    title: "Download the examination",
    body: "Needs internet. It brings the examination, the candidates and the procedures and questions from the central server. Do this before the day, while you still have a connection.",
  },
  {
    path: "/osce/download",
    state: () => downloaded(),
    target: { sel: "button", text: "Activate Examination" },
    title: "Activate the examination",
    body: "After the download you see the exam name and the number of candidates. Click Activate Examination. Nothing can be started until this is done.",
  },
  {
    path: "/osce/dashboard",
    state: () => activated(),
    target: ".osce-main table",
    title: "The CAOSCE dashboard",
    body: "A table of the examinations on this server, with their programs and procedures.",
  },
  {
    path: "/osce/dashboard",
    state: () => activated(),
    target: ".osce-main table .btn",
    title: "Open the examination",
    body: "Click View to open the examination and its components.",
  },
  {
    path: "/osce/exam",
    state: () => activated(),
    target: ".exam-head",
    title: "The examination",
    body: "The exam name and the number of candidates downloaded.",
  },
  {
    path: "/osce/exam",
    state: () => activated({ components: comps({ viva: "started" }) }),
    target: ".comp-row",
    title: "OSCE Components",
    body: "Viva, Client Care, Expected Family Care and Research are scored on Day 1. The OSCE card is for the OSCE itself. Each card shows how many candidates have been scored, and has a Start and an End button.",
  },
  {
    path: "/osce/exam",
    state: () => activated(),
    target: `${FIRST_CARD} .btn-primary`,
    title: "Start a component",
    body: "Click Start. A confirmation asks you to be sure. After the OSCE starts, this button changes to View and candidates can log in at the question stations.",
  },
  {
    path: "/osce/exam",
    state: () => activated(),
    target: ".osce-top .row-gap",
    title: "Examiners and Candidates",
    body: "The two buttons at the top right open the list of examiners and the list of candidates.",
  },
  {
    path: "/osce/candidates",
    state: () => activated(),
    target: ".osce-main table",
    title: "Candidates",
    body: "Every candidate downloaded for the examination, with exam number and program. Use the search box to find one.",
  },
  {
    path: "/osce/examiners",
    state: () => activated({ examiners: crew() }),
    target: ".stack-form",
    title: "Create an examiner",
    body: "Enter the full name, a username and a password, then click Create. The examiner uses these details to log in on the examiner computer.",
  },
  {
    path: "/osce/examiners",
    state: () => activated({ examiners: crew() }),
    target: ".two-col .table-wrap",
    title: "Examiner list",
    body: "Every examiner with their password and procedure. Delete removes an examiner after you confirm.",
  },
  {
    path: "/osce/exam",
    state: () => started(),
    target: `${FIRST_CARD} .btn-primary`,
    title: "View the OSCE",
    body: "Once the OSCE has started, the Start button has become View. Click it to open the programs.",
  },
  {
    path: "/osce/view",
    state: () => started({ examiners: crew() }),
    target: ".prog-card",
    title: "Programs",
    body: "Each program card shows its procedures, candidates, examiners and progress. Click a program to open it. Assign Examiner is at the top right.",
  },
  {
    path: "/osce/view/program/rn",
    state: () => started({ examiners: crew(), candidates: partwayCandidates() }),
    target: ".proc-list",
    title: "Procedures of a program",
    body: "Each procedure has its own progress bar. View examiner opens the assign page for that procedure.",
  },
  {
    path: "/osce/view/assign/rn-p1",
    state: () => started({ examiners: crew() }),
    target: "table",
    title: "Assign examiners",
    body: "Pick a procedure for each examiner and click Update. Make lead sets the lead (chief) examiner, who can see the candidate instructions and requirements of every procedure.",
  },
  {
    path: "/osce/view/program/rn",
    state: () => started({ examiners: crew(), candidates: partwayCandidates() }),
    target: ".stn-row",
    title: "Follow the candidates",
    body: "Each candidate goes P1, Q1, P2, Q2, P3, Q3. A circle is grey until the candidate finishes that station, then it turns green.",
  },
  {
    path: "/osce/exam",
    state: () => started(),
    target: ".sim-fabs",
    title: "The two station computers",
    body: "At the bottom right, Examiner computer and Candidate computer open the station laptops. Sandbox tools holds the helpers that stand in for the rest of the hall.",
  },
  {
    path: "/osce-station/8000",
    state: () => activated(),
    target: ".browser-bar",
    title: "An examiner laptop",
    body: "On an examiner laptop, open the browser and type the server's wifi IP address followed by :8000/addipaddress. The page shows one button.",
  },
  {
    path: "/osce-station/8000",
    state: () => activated(),
    target: { sel: "button", text: "Add IP address" },
    title: "Add the IP address",
    body: "Click Add IP address. A success message appears and the server now knows this laptop. Every station laptop does this once.",
  },
  {
    path: "/osce-station/7000",
    state: () => activated(),
    target: ".browser-bar",
    title: "A candidate laptop",
    body: "Candidate laptops do the same on port 7000: the wifi IP address followed by :7000/addipaddress, then click the button.",
  },
  {
    path: "/osce/ip-whitelist",
    state: () => activated({ ips: [...STATION_IPS(false), ip("i3", "192.168.1.43", 8000), ip("i4", "192.168.1.44", 7000)] }),
    target: { sel: "button", text: "Approve" },
    title: "Approve on the IP Whitelist",
    body: "Every laptop that added its address is listed here. Click Approve in front of each one. Until then it gets access denied.",
  },
  {
    path: "/osce-station/8000",
    state: () => activated({ ips: STATION_IPS(true), examiners: crew() }),
    target: ".browser-body",
    title: "Examiner login",
    body: "After approval, the examiner computer (:8000) shows the examiner login. The examiner enters the username and password you created.",
  },
  {
    path: "/osce-station/8000",
    state: () => examinerComputer("dashboard"),
    target: ".ex-side",
    title: "The examiner's menu",
    body: "Dashboard, Research, Viva, Client Care, Expected Family Care, Procedure, Candidates and Logout.",
  },
  {
    path: "/osce-station/8000",
    state: () => examinerComputer("viva"),
    target: ".ex-search",
    title: "Find the candidate",
    body: "Each component page has its name at the top and a search box. Type the candidate's exam number and click Search. A component that has not started cannot be scored.",
  },
  {
    path: "/osce-station/8000",
    state: () => examinerComputer("viva", { key: "viva", examNo: "NSG26001" }),
    target: ".score-steps",
    title: "Score the candidate",
    body: "For every step the examiner picks a grade: 0, 0.5, 1, 1.5 or 2. When every step is graded, Submit score saves it.",
  },
  {
    path: "/osce-station/8000",
    state: () => examinerComputer("procedure"),
    target: ".ex-main",
    title: "The procedure page",
    body: "Shows the examiner's own procedure with its candidate instructions and requirements. Scoring a candidate here turns that station green on the server. A lead examiner chooses any procedure and sees them all.",
  },
  {
    path: "/osce-station/7000",
    state: () => started({ ips: STATION_IPS(true) }),
    target: ".browser-body",
    title: "Candidate login",
    body: "The candidate computer (:7000) shows the candidate login. The candidate enters the exam number. It only works after the OSCE has been started.",
  },
  {
    path: "/osce-station/7000",
    state: () =>
      started({
        ips: STATION_IPS(true),
        candidateSession: { examNo: "NSG26001", q: null, idx: 0, answers: [] },
      }),
    target: ".q-cards",
    title: "Choose a question station",
    body: "The candidate first chooses which question station to attend. A station that has been submitted cannot be opened again.",
  },
  {
    path: "/osce-station/7000",
    state: () =>
      started({
        ips: STATION_IPS(true),
        candidateSession: { examNo: "NSG26001", q: 1, idx: 0, answers: [] },
      }),
    target: ".cbt",
    title: "The question page",
    body: "A simple computer-based test: one question at a time, with Previous, Next and a number for every question. Submitting turns that Q station green on the server.",
  },
  {
    path: "/osce/exam",
    state: () => started({ candidates: finishedCandidates() }),
    target: `${FIRST_CARD} .btn-danger`,
    title: "End the OSCE",
    body: "When all candidates have finished, click End on the OSCE card and confirm. It cannot be started again.",
  },
  {
    path: "/osce/upload",
    state: () => started({ candidates: finishedCandidates(), components: comps({ osce: "ended" }) }),
    target: ".upload-bar",
    title: "Upload the results",
    body: "The big green bar uploads the CAOSCE results to the central server. You need internet for this.",
  },
  {
    path: "/osce/sync",
    state: () => activated(),
    target: { sel: "button", text: "Synchronize" },
    title: "Synchronize",
    body: "Brings new data from the central server, for example candidates added late. It also needs internet.",
  },
  {
    path: "/osce/dashboard",
    state: () => activated(),
    target: null,
    title: "That is the whole server",
    body: "Now try Free play to click around, the Exercises for real hall situations, and the Assessment when you are ready.",
  },
];
