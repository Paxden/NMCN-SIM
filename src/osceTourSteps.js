// Guided tour for the CAOSCE server.
// Each step opens a page, sets the server to a matching situation, then circles a target.
// Pages are explained first, then their buttons and functions.
//
// A target is one of:
//   ".css-selector"                      the first element that matches
//   { sel, text }                        the element whose text starts with `text`
//   { sel, count: 10 }                   the first 10 elements that match, circled together
//   null                                 a centred message with nothing circled
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

// Examiners with procedures, so the examiner laptop has something to show.
const crew = () => [
  { ...EXAMINERS[0], procedure: "rn-p1" },
  { ...EXAMINERS[1], procedure: "cc-p2" },
  { ...EXAMINERS[2], lead: true },
];

// The examiner laptop, already signed in as Mrs Okoro on a given page.
const examinerComputer = (page, session = {}) =>
  started({
    components: comps({ osce: "started", viva: "started", research: "started" }),
    ips: STATION_IPS(true),
    examiners: crew(),
    examinerSession: { username: "gokoro", page, key: "", examNo: "", procKey: "p1", ...session },
  });

export const OSCE_TOUR = [
  /* ================= BEFORE THE HALL (needs your mobile hotspot) ================= */
  {
    path: "/osce/createcentre",
    state: () => ({ loggedIn: false, centreCreated: false }),
    target: ".auth",
    title: "Create the centre",
    body: "This is the first page of the CAOSCE server. On the server laptop, open localhost:5000/createcentre. Here you set up your centre with the Server ID and the 6-character password the NMCN gave you. Creating the centre needs internet, so connect the laptop to your mobile hotspot first. In this trainer the details are in the yellow box.",
  },
  {
    path: "/osce/createcentre",
    state: () => ({ loggedIn: false, centreCreated: false }),
    target: { sel: "button", text: "Create centre" },
    title: "Click Create centre",
    body: "Type the Server ID and the password, then click Create centre. A green message tells you the centre has been created.",
  },
  {
    path: "/osce/login",
    state: () => ({ loggedIn: false, centreCreated: true }),
    target: ".auth",
    title: "Log in",
    body: "This is the login page (localhost:5000/login). Log in with the same Server ID and password you used to create the centre. You do not need internet to log in.",
  },
  {
    path: "/osce/home",
    state: () => ({ loggedIn: true, centreCreated: true }),
    target: ".osce-main .card",
    title: "The Home page",
    body: "After you log in you arrive here (localhost:5000). Home shows the examination on this server. It says 'No examination loaded' until you download one.",
  },
  {
    path: "/osce/home",
    state: () => ({ loggedIn: true, centreCreated: true }),
    target: ".osce-side",
    title: "The side menu",
    body: "Home is at the top. Under OSCE you find Dashboard, Download, Upload, IP Whitelist and Synchronize. Log out is at the bottom.",
  },
  {
    path: "/osce/download",
    state: () => ({ loggedIn: true, centreCreated: true }),
    target: ".osce-main .card",
    title: "The Download page",
    body: "Use this page to bring the examination onto the server laptop: the exam, the candidates, and the procedures and questions. Do this before you travel to the hall, with your mobile hotspot for internet.",
  },
  {
    path: "/osce/download",
    state: () => ({ loggedIn: true, centreCreated: true }),
    target: { sel: "button", text: "Download" },
    title: "Download the examination",
    body: "Click Download and wait until it finishes. If it fails, check that the laptop is connected to your hotspot.",
  },
  {
    path: "/osce/download",
    state: () => downloaded(),
    target: { sel: "button", text: "Activate Examination" },
    title: "Activate the examination",
    body: "After the download you can see the exam name and the number of candidates. Click Activate Examination to make the exam ready for use.",
  },

  /* ================= AT THE HALL ================= */
  {
    path: "/osce/home",
    state: () => activated(),
    target: null,
    title: "At the hall: connect everything",
    body: "1. Plug in and switch on all the station laptops. 2. Connect the server laptop to the MTN 5G router. The router password is exams@nmcn. 3. Connect every station laptop to the same router: 6 laptops for one team, 12 for two teams. Find the server laptop's IP address on the router (for example 192.168.1.100). The station laptops will type it in their browsers.",
  },
  {
    path: "/osce/ip-whitelist",
    state: () => activated(),
    target: null,
    title: "Download first, then whitelist",
    body: "Always download the examination first and do the whitelist after it. A new download clears the whitelist, and you would have to start it again. Finish the whitelist before you start any component.",
  },
  {
    path: "/osce-station/8000",
    state: () => activated(),
    target: ".browser-bar",
    title: "A procedure station laptop",
    body: "Procedure stations use port 8000. On this laptop, open the browser and type the server's IP address followed by :8000/addipaddress, for example 192.168.1.100:8000/addipaddress.",
  },
  {
    path: "/osce-station/8000",
    state: () => activated(),
    target: { sel: "button", text: "Add IP address" },
    title: "Add the IP address",
    body: "Click Add IP address. A success message appears and the server now knows this laptop. Every station laptop must do this once.",
  },
  {
    path: "/osce-station/7000",
    state: () => activated(),
    target: ".browser-bar",
    title: "A question station laptop",
    body: "Question stations use port 7000. On the laptop, type the server's IP address followed by :7000/addipaddress, then click the button to add its IP address.",
  },
  {
    path: "/osce/ip-whitelist",
    state: () => activated({ ips: [...STATION_IPS(false), ip("i3", "192.168.1.43", 8000), ip("i4", "192.168.1.44", 7000)] }),
    target: ".osce-main table",
    title: "The IP Whitelist page",
    body: "This page lists every laptop that added its IP address. Each row shows the IP address, the type of station and the status.",
  },
  {
    path: "/osce/ip-whitelist",
    state: () => activated({ ips: [...STATION_IPS(false), ip("i3", "192.168.1.43", 8000), ip("i4", "192.168.1.44", 7000)] }),
    target: { sel: "button", text: "Approve" },
    title: "Approve the laptops",
    body: "Click Approve in front of each laptop. Only approved laptops can open the station pages. A laptop that is not approved sees 'Access denied'.",
  },

  /* ================= THE EXAMINATION ================= */
  {
    path: "/osce/dashboard",
    state: () => activated(),
    target: ".osce-main table",
    title: "The Dashboard",
    body: "This page shows the examination details: the exam name, its programs and procedures.",
  },
  {
    path: "/osce/dashboard",
    state: () => activated(),
    target: ".osce-main table .btn",
    title: "Open the examination",
    body: "Click View to open the examination.",
  },
  {
    path: "/osce/exam",
    state: () => activated(),
    target: ".exam-head",
    title: "The examination page",
    body: "This page shows the exam name and the number of candidates. Below it are the cards for each part of the exam.",
  },
  {
    path: "/osce/exam",
    state: () => activated({ components: comps({ viva: "started" }) }),
    target: ".comp-row",
    title: "The exam parts",
    body: "Viva, Client Care, Expected Family Care and Research are scored on Day 1. The OSCE card is for Day 2. Each card shows how many candidates have been scored and has a Start button and an End button.",
  },
  {
    path: "/osce/exam",
    state: () => activated({ examiners: crew() }),
    target: { sel: ".osce-top .btn", text: "Examiners" },
    title: "The Examiners button",
    body: "Click Examiners to see the list of examiners and to create new ones.",
  },
  {
    path: "/osce/examiners",
    state: () => activated({ examiners: crew() }),
    target: ".two-col .table-wrap",
    title: "The Examiners page",
    body: "This page lists all the examiners. Each row shows the examiner's name, username, password and procedure. Delete removes an examiner after you confirm.",
  },
  {
    path: "/osce/examiners",
    state: () => activated({ examiners: crew() }),
    target: ".stack-form",
    title: "Create an examiner",
    body: "Type the full name, a username and a password, then click Create. The examiner will use this username and password to log in on the procedure station laptop.",
  },
  {
    path: "/osce/exam",
    state: () => activated(),
    target: { sel: ".osce-top .btn", text: "Candidates" },
    title: "The Candidates button",
    body: "Click Candidates to see the candidates downloaded for this exam.",
  },
  {
    path: "/osce/candidates",
    state: () => activated(),
    target: { sel: ".osce-main table tbody tr", count: 10 },
    title: "The Candidates page",
    body: "This page lists every candidate downloaded for the exam, with the exam number and program. Here are the first 10.",
  },
  {
    path: "/osce/candidates",
    state: () => activated(),
    target: ".osce-main input",
    title: "Search for a candidate",
    body: "Type an exam number or a name in the search box to find one candidate quickly.",
  },

  /* ================= START THE EXAM ================= */
  {
    path: "/osce/exam",
    state: () => activated({ ips: STATION_IPS(true), examiners: crew() }),
    target: `${FIRST_CARD} .btn-primary`,
    title: "Start a component",
    body: "Click Start to start a component. Examiners can only grade candidates in a component after you have started it. Do this only after the whitelist is done.",
  },
  {
    path: "/osce/exam",
    state: () => started(),
    target: `${FIRST_CARD} .btn-primary`,
    title: "Open the OSCE",
    body: "Once the OSCE has started, its Start button becomes View. Click View to open the programs.",
  },
  {
    path: "/osce/view",
    state: () => started({ examiners: crew() }),
    target: ".prog-card",
    title: "The Programs page",
    body: "This page lists the programs taking the OSCE. Each card shows the program's procedures, candidates, examiners and progress. Click a program to open it.",
  },
  {
    path: "/osce/view",
    state: () => started({ examiners: crew() }),
    target: { sel: ".osce-top .btn", text: "Assign" },
    title: "The Assign Examiner button",
    body: "Click Assign Examiner to give each examiner a procedure.",
  },
  {
    path: "/osce/view/assign/rn-p1",
    state: () => started({ examiners: crew() }),
    target: "table",
    title: "The Assign Examiner page",
    body: "This page lists the examiners. Next to each name you can choose a procedure.",
  },
  {
    path: "/osce/view/assign/rn-p1",
    state: () => started({ examiners: crew() }),
    target: { sel: "button", text: "Update" },
    title: "Choose a procedure",
    body: "Pick a procedure for the examiner, then click Update to save it.",
  },
  {
    path: "/osce/view/assign/rn-p1",
    state: () => started({ examiners: crew() }),
    target: { sel: "button", text: "Make lead" },
    title: "Make lead",
    body: "Make lead sets the lead (chief) examiner. The lead examiner can see the instructions and requirements of every procedure.",
  },
  {
    path: "/osce/view/program/rn",
    state: () => started({ examiners: crew(), candidates: partwayCandidates() }),
    target: ".proc-list",
    title: "A program's page",
    body: "This page shows one program. At the top are its procedures, each with a progress bar. View examiner opens the page where you assign an examiner to that procedure.",
  },
  {
    path: "/osce/view/program/rn",
    state: () => started({ examiners: crew(), candidates: partwayCandidates() }),
    target: ".stn-row",
    title: "Follow the candidates",
    body: "Below is the list of candidates. Each candidate goes through six stations: P1, Q1, P2, Q2, P3, Q3. P is a procedure station and Q is a question station. A circle is grey until the candidate finishes that station, then it turns green.",
  },
  {
    path: "/osce/exam",
    state: () => started(),
    target: ".sim-fabs",
    title: "The station laptops in this trainer",
    body: "At the bottom right, Examiner computer and Candidate computer open the two station laptops, so you can try what examiners and candidates do. Sandbox tools holds helpers for the rest of the hall.",
  },

  /* ================= THE EXAMINER LAPTOP (:8000) ================= */
  {
    path: "/osce-station/8000",
    state: () => activated({ ips: STATION_IPS(true), examiners: crew() }),
    target: ".browser-body",
    title: "Examiner login",
    body: "Once approved, the :8000 address shows the examiner login page. The examiner types the username and password you created for them.",
  },
  {
    path: "/osce-station/8000",
    state: () => examinerComputer("dashboard"),
    target: ".ex-main",
    title: "The examiner's Dashboard",
    body: "This page shows the examiner's name, the procedure given to them, and the exam parts with the number of candidates scored.",
  },
  {
    path: "/osce-station/8000",
    state: () => examinerComputer("dashboard"),
    target: ".ex-side",
    title: "The examiner's menu",
    body: "The menu opens each part: Research, Viva, Client Care, Expected Family Care, Procedure and Candidates. Logout is at the bottom.",
  },
  {
    path: "/osce-station/8000",
    state: () => examinerComputer("viva"),
    target: ".ex-main",
    title: "A scoring page",
    body: "This is the Viva page. It shows whether the Viva has started and the list of candidates already scored. Every part works the same way. If a part has not started, the examiner cannot score in it.",
  },
  {
    path: "/osce-station/8000",
    state: () => examinerComputer("viva"),
    target: ".ex-search",
    title: "Find the candidate",
    body: "Type the candidate's exam number and click Search to open the scoring page for that candidate.",
  },
  {
    path: "/osce-station/8000",
    state: () => examinerComputer("viva", { key: "viva", examNo: "NSG26001" }),
    target: ".score-steps",
    title: "Score the candidate",
    body: "Give every step a grade: 0, 0.5, 1, 1.5 or 2. When all steps are graded, click Submit score.",
  },
  {
    path: "/osce-station/8000",
    state: () => examinerComputer("procedure"),
    target: ".ex-brief",
    title: "The Procedure page",
    body: "This page is for the examiner's own procedure. At the top are the candidate instructions on the left and the requirements on the right. The examiner reads these before the candidates come in.",
  },
  {
    path: "/osce-station/8000",
    state: () => examinerComputer("procedure"),
    target: ".ex-search",
    title: "Score a candidate",
    body: "Below the instructions, search for the candidate by exam number to score them. When the score is saved, that procedure station turns green on the server.",
  },

  /* ================= THE CANDIDATE LAPTOP (:7000) ================= */
  {
    path: "/osce-station/7000",
    state: () => started({ ips: STATION_IPS(true) }),
    target: ".browser-body",
    title: "Candidate login",
    body: "Once approved, the :7000 address shows the candidate login page. The candidate types the exam number. It only works after the OSCE has started.",
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
    body: "The candidate chooses which question station to attend. A station that has been submitted cannot be opened again.",
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
    body: "One question is shown at a time, with Previous, Next and a number for every question. When the candidate submits, that Q station turns green on the server.",
  },

  /* ================= AFTER THE EXAM ================= */
  {
    path: "/osce/exam",
    state: () => started({ candidates: finishedCandidates() }),
    target: `${FIRST_CARD} .btn-danger`,
    title: "End the OSCE",
    body: "When all candidates have finished, click End on the OSCE card and confirm. After this the OSCE cannot be started again.",
  },
  {
    path: "/osce/upload",
    state: () => started({ candidates: finishedCandidates(), components: comps({ osce: "ended" }) }),
    target: ".osce-main",
    title: "The Upload page",
    body: "This page sends the CAOSCE results to the central server. It needs internet. The MTN router has no data, so connect the server laptop to your mobile hotspot again.",
  },
  {
    path: "/osce/upload",
    state: () => started({ candidates: finishedCandidates(), components: comps({ osce: "ended" }) }),
    target: ".upload-bar",
    title: "Upload the results",
    body: "Click the green bar to upload. A green message tells you the upload is done.",
  },
  {
    path: "/osce/sync",
    state: () => activated(),
    target: ".osce-main .card",
    title: "The Synchronize page",
    body: "Use this page to bring new data from the central server onto the server laptop, for example a candidate who was added late. It needs internet, so use your mobile hotspot.",
  },
  {
    path: "/osce/sync",
    state: () => activated(),
    target: { sel: "button", text: "Synchronize" },
    title: "Click Synchronize",
    body: "Click Synchronize and wait for the message that the new data has been downloaded.",
  },
  {
    path: "/osce/dashboard",
    state: () => activated(),
    target: null,
    title: "That is the whole server",
    body: "Now try Free play to click around, the Exercises for real situations in the hall, and the Assessment when you are ready.",
  },
];