// Each step shows the app in a known state (stage) on a route, and circles
// the element marked data-tour="<target>". target: null = centred message.
//
// Every page follows the same pattern: a step to click its link on the navigation bar
// (data-tour="nav-..."), a step that explains the page (data-tour="page"), then its features.
export const TOUR_STEPS = [
  {
    route: "/admin",
    stage: "start",
    target: null,
    title: "Welcome to the CBT Server tour",
    text: "This tour walks you through the CBT server from login to the end of the exam. Everything here is a safe practice copy. Click Next to continue, or Skip tour at any time.",
  },
  {
    route: "/admin",
    stage: "start",
    target: "login-form",
    title: "1. Server login",
    text: "The NMCN gives every centre manager a Centre ID and a generated 6-character code. These are your server login details: the Centre ID is the Server ID and the 6 characters are the password. In this trainer they are shown in the yellow box.",
  },
  {
    route: "/admin",
    stage: "start",
    target: "login-btn",
    title: "Connect to the internet, then log in",
    text: "The server system needs an internet connection to log in, so connect your mobile hotspot to it first. Then click Login to open the admin interface.",
  },
  {
    route: "/admin/home",
    stage: "loggedIn",
    target: "navbar",
    title: "The navigation bar",
    text: "The Server ID on the left tells you which server you are on. The links are Home, Monitor, Manage, Download and Upload, Synchronise and Reset. We will visit each one, starting with Download and Upload.",
  },

  /* ---------- Download and Upload ---------- */
  {
    route: "/admin/home",
    stage: "loggedIn",
    target: "nav-upload",
    title: "2. Open Download and Upload",
    text: "Click Download and Upload on the navigation bar to open the page where the exam data is downloaded and activated.",
  },
  {
    route: "/admin/upload",
    stage: "loggedIn",
    target: "page",
    title: "The Download and Upload page",
    text: "This page has three jobs: download the exam data from the central server, activate the exam and its sessions, and upload the candidates' responses to the central server after the exam.",
  },
  {
    route: "/admin/upload",
    stage: "loggedIn",
    target: "download-btn",
    title: "3. Download the exam data",
    text: "Before anything else, download the exam data, which includes the candidates and the questions, from the central server. This only works with an internet connection, so connect your mobile hotspot to the server system if it fails.",
  },
  {
    route: "/admin/upload",
    stage: "downloaded",
    target: "exam-card",
    title: "Download complete",
    text: "The page now shows the examination name and the number of candidates that were downloaded. The Download button has been replaced by Activate Exam.",
  },
  {
    route: "/admin/upload",
    stage: "downloaded",
    target: "activate-btn",
    title: "4. Activate the exam",
    text: "Click Activate Exam to make the exam live on this server. The list of sessions appears below it.",
  },
  {
    route: "/admin/upload",
    stage: "activated",
    target: "session-list",
    title: "The session list",
    text: "Each row has the examination name and session, a button to activate that session, and an Upload button.",
  },
  {
    route: "/admin/upload",
    stage: "activated",
    target: "session-activate-0",
    title: "5. Activate a session",
    text: "Activate a session when its candidates are ready. Only candidates in an active session can log in and write. Activate Session 1 first, and Session 2 when the next group arrives.",
  },
  {
    route: "/admin/upload",
    stage: "oneSession",
    target: "upload-0",
    title: "Upload is locked for now",
    text: "The Upload button is greyed out. It only works after you have ended the exam on the Monitor page. We will come back to it.",
  },

  /* ---------- Home ---------- */
  {
    route: "/admin/upload",
    stage: "oneSession",
    target: "nav-home",
    title: "6. Open Home",
    text: "Click Home on the navigation bar.",
  },
  {
    route: "/admin/home",
    stage: "oneSession",
    target: "home-card",
    title: "The Home page",
    text: "Home shows the examination name and description, so you can confirm you downloaded the right exam.",
  },

  /* ---------- Monitor ---------- */
  {
    route: "/admin/home",
    stage: "writing",
    target: "nav-monitor",
    title: "7. Open Monitor",
    text: "Click Monitor on the navigation bar to watch the exam while it is running.",
  },
  {
    route: "/admin/monitor",
    stage: "writing",
    target: "page",
    title: "The Monitor page",
    text: "This is where the centre manager follows the exam: how many candidates are writing, how many have submitted, and what each candidate is doing. It is also where the exam is ended and where infractions are opened.",
  },
  {
    route: "/admin/monitor",
    stage: "writing",
    target: "stats",
    title: "The candidate numbers",
    text: "Total candidate shows every candidate on this server. Writing shows how many candidates have logged in and are answering right now. Submitted shows how many have finished.",
  },
  {
    route: "/admin/monitor",
    stage: "writing",
    target: "cand-table",
    title: "The candidate table",
    text: "The table gives the full details of every candidate. Response is how many of the 200 questions the candidate has answered. IP Address is the address of the computer the candidate is writing on. Submitted shows a green tick once they have submitted and a red cross if they have not.",
  },
  {
    route: "/admin/monitor",
    stage: "writing",
    target: "infraction-btn",
    title: "Infractions",
    text: "Click the Infraction button to open the infractions page. The number shows how many candidates are flagged.",
  },
  {
    route: "/admin/monitor/infractions",
    stage: "flagged",
    target: "page",
    title: "The Infractions page",
    text: "A candidate is warned three times on their own computer before being flagged for infraction. This page lists every flagged candidate and lets the centre manager remove a flag.",
  },
  {
    route: "/admin/monitor/infractions",
    stage: "flagged",
    target: "unflag-form",
    title: "Remove an infraction",
    text: "To lift a flag, type the candidate's exam number and click Unflag.",
  },
  {
    route: "/admin/monitor/infractions",
    stage: "flagged",
    target: "infraction-list",
    title: "Infractions by candidate",
    text: "Below the form is the table of infractions by candidate: every flagged candidate, how many infractions they have, and the details of the infractions they committed.",
  },

  /* ---------- Manage ---------- */
  {
    route: "/admin/monitor",
    stage: "writing",
    target: "nav-manage",
    title: "8. Open Manage",
    text: "Click Manage on the navigation bar.",
  },
  {
    route: "/admin/manage",
    stage: "writing",
    target: "page",
    title: "The Manage page",
    text: "Use this page to get candidates back into the exam when something goes wrong with their computers.",
  },
  {
    route: "/admin/manage",
    stage: "writing",
    target: "relogin-form",
    title: "Relogin a candidate",
    text: "After a power outage, or when a candidate changes computer, a relogin is required. Type the candidate's exam number and click Relogin. A notification on the computer confirms success, and the candidate can log in again and continue.",
  },
  {
    route: "/admin/manage",
    stage: "writing",
    target: "relogin-all",
    title: "Relogin all candidates",
    text: "If a power outage or crash affects every computer, click Relogin All to let all candidates who have not submitted log in again at once, instead of one after another. This reduces the workload.",
  },

  /* ---------- Synchronise ---------- */
  {
    route: "/admin/manage",
    stage: "writing",
    target: "nav-sync",
    title: "9. Open Synchronise",
    text: "Click Synchronise on the navigation bar.",
  },
  {
    route: "/admin/sync",
    stage: "writing",
    target: "page",
    title: "The Synchronise page",
    text: "This page brings new data from the central server onto this server while the exam is running.",
  },
  {
    route: "/admin/sync",
    stage: "writing",
    target: "sync-btn",
    title: "Synchronise",
    text: "Click Synchronise to download candidate data that was added on the central server in the middle of the exam, for example a candidate who is at the centre but was not on your list. This needs an internet connection, so connect your mobile hotspot first.",
  },

  /* ---------- Reset ---------- */
  {
    route: "/admin/sync",
    stage: "writing",
    target: "nav-reset",
    title: "10. Open Reset",
    text: "Click Reset on the navigation bar.",
  },
  {
    route: "/admin/reset",
    stage: "writing",
    target: "page",
    title: "The Reset page",
    text: "This page has two jobs: reset a single candidate, and clear the whole server after the exam.",
  },
  {
    route: "/admin/reset",
    stage: "writing",
    target: "reset-candidate",
    title: "Reset a candidate",
    text: "A candidate may need a reset when they have less time than the others, or the wrong question paper because of data kept in the browser cache. Enter the exam number and click Reset Candidate. A confirmation dialog appears first. The reset restores the candidate's time and paper, and the candidate can log in straight away. No relogin is needed.",
  },

  /* ---------- End exam ---------- */
  {
    route: "/admin/reset",
    stage: "writing",
    target: "nav-monitor",
    title: "11. Back to Monitor",
    text: "When the session is over, click Monitor on the navigation bar to end the exam.",
  },
  {
    route: "/admin/monitor",
    stage: "writing",
    target: "end-btn",
    title: "End the exam",
    text: "When a session is over, the centre manager clicks End Exam and confirms. Anyone still writing is submitted automatically. This unlocks the Upload buttons.",
  },

  /* ---------- Upload ---------- */
  {
    route: "/admin/monitor",
    stage: "ended",
    target: "nav-upload",
    title: "12. Open Download and Upload again",
    text: "Click Download and Upload on the navigation bar to send the responses to the central server.",
  },
  {
    route: "/admin/upload",
    stage: "ended",
    target: "upload-0",
    title: "Upload the responses",
    text: "Click Upload to send the candidates' responses to the central server. This needs an internet connection, so use your mobile hotspot. If the exam had more than one session, upload every session.",
  },
  {
    route: "/admin/upload",
    stage: "uploaded",
    target: "session-list",
    title: "Upload every session",
    text: "A message confirms each upload. Make sure you have uploaded every session before you go any further.",
  },

  /* ---------- Reset server ---------- */
  {
    route: "/admin/upload",
    stage: "uploaded",
    target: "nav-reset",
    title: "13. Open Reset",
    text: "Click Reset on the navigation bar.",
  },
  {
    route: "/admin/reset",
    stage: "uploaded",
    target: "reset-server",
    title: "Reset the server",
    text: "This function lets the centre manager clear the data of a conducted exam from the server, in preparation for a new exam. Do it only after every session has been uploaded. It cannot be undone, so a confirmation dialog appears.",
  },
  {
    route: "/admin/reset",
    stage: "uploaded",
    target: null,
    title: "You have completed the tour",
    text: "Try Free play to explore on your own, or Exercises to practise real tasks like a power outage, an unflagged candidate or the whole exam day.",
  },
];
