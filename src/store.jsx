import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  REASONS,
  TOTAL_Q,
  freshState,
  makeCandidates,
  stageState,
} from "./data";
import {
  CBT_SERVER_LOGIN,
  EXERCISES,
  exerciseProgress,
  wrongCount,
} from "./exercises";
import { TOUR_STEPS } from "./tourSteps";
import {
  STANDARD,
  TASK_COUNT,
  buildReport,
  buildTask,
  gradeTask,
} from "./assessment";
import { navigate } from "./router";
import { api, hasToken } from "./api";
import {
  LETTERS,
  dropCc,
  firstUnanswered,
  seedAnswers,
  withAnswers,
  without,
} from "./candidateData";

const KEY = "cbt-sim-state-v2";
const PKEY = "cbt-sim-progress-v1";
const Ctx = createContext(null);
export const useSim = () => useContext(Ctx);

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...freshState(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return freshState();
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(PKEY);
    if (raw)
      return {
        guideDone: false,
        exercises: {},
        assessments: [],
        ...JSON.parse(raw),
      };
  } catch {
    /* ignore */
  }
  return { guideDone: false, exercises: {}, assessments: [] };
}

const norm = (v) => (v || "").trim().toUpperCase();
const ok = (msg) => ({ ok: true, msg });
const fail = (msg) => ({ ok: false, msg });
const NO_NET =
  "The server system is not connected to the internet. Turn on your mobile hotspot, connect the server system to it and try again.";

export function SimProvider({ children }) {
  const [s, setS] = useState(load);
  const sRef = useRef(s);
  sRef.current = s;
  const [progress, setProgress] = useState(loadProgress);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, [s]);

  useEffect(() => {
    try {
      localStorage.setItem(PKEY, JSON.stringify(progress));
    } catch {
      /* ignore */
    }
  }, [progress]);

  // When signed in, keep tour and exercise progress on the server too.
  useEffect(() => {
    if (!hasToken()) return;
    api
      .saveProgress({
        guideDone: progress.guideDone,
        exercises: progress.exercises,
      })
      .catch(() => {});
  }, [progress.guideDone, progress.exercises]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // Detect exercise completion and record the best result.
  useEffect(() => {
    const ex = s.exercise;
    if (!ex || ex.finishedAt) return;
    const def = EXERCISES.find((e) => e.id === ex.id);
    if (!def || exerciseProgress(def, s.actions) < def.steps.length) return;
    const finishedAt = Date.now();
    const mistakes = (ex.errors || 0) + wrongCount(def, s.actions);
    const time = Math.round((finishedAt - ex.startedAt) / 1000);
    setS((st) => ({
      ...st,
      exercise: { ...st.exercise, finishedAt, mistakes },
    }));
    setProgress((p) => {
      const prev = p.exercises[def.id];
      const better =
        !prev ||
        mistakes < prev.mistakes ||
        (mistakes === prev.mistakes && time < prev.time);
      return {
        ...p,
        exercises: {
          ...p.exercises,
          [def.id]: better ? { mistakes, time } : prev,
        },
      };
    });
  }, [s.actions, s.exercise]);

  const showToast = (message, type = "success") => {
    setToast({ message, type, id: Date.now() });
    if (type === "error") {
      setS((st) => {
        if (st.mode === "assessment" && st.assessment?.phase === "task")
          return {
            ...st,
            assessment: { ...st.assessment, errors: st.assessment.errors + 1 },
          };
        if (!st.exercise || st.exercise.finishedAt) return st;
        const def = EXERCISES.find((e) => e.id === st.exercise.id);
        if (def?.ignoreErrors) return st;
        return {
          ...st,
          exercise: { ...st.exercise, errors: (st.exercise.errors || 0) + 1 },
        };
      });
    }
  };

  // In the assessment, error messages state the fact only and give no guidance.
  const H = (full, short) => (s.mode === "assessment" ? short : full);
  const netMsg = H(NO_NET, "No internet connection");

  const log = (st, type, payload = {}) => ({
    ...st,
    actions: [...st.actions, { type, payload, at: Date.now() }],
  });
  const findCandidate = (no) => s.candidates.find((c) => c.examNo === norm(no));
  const mapC = (st, pred, fn) => ({
    ...st,
    candidates: st.candidates.map((c) => (pred(c) ? fn(c) : c)),
  });

  /* ---------- server login (needs internet) ---------- */
  const login = (id, password) => {
    if (!s.online) return fail(netMsg);
    if (
      id.trim() !== CBT_SERVER_LOGIN.id ||
      password.trim() !== CBT_SERVER_LOGIN.password
    )
      return fail("Invalid server ID or password");
    setS((st) => log({ ...st, loggedIn: true }, "login"));
    return ok("Login successful");
  };

  const logout = () => {
    setS((st) => ({ ...st, loggedIn: false }));
    navigate("/admin");
  };

  const setOnline = (on) =>
    setS((st) => log({ ...st, online: on }, on ? "net_on" : "net_off"));

  /* ---------- exam ---------- */
  const download = () => {
    if (!s.online) return fail(netMsg);
    setS((st) =>
      log(
        { ...st, downloaded: true, candidates: makeCandidates(30) },
        "download",
      ),
    );
    return ok("Exam, candidates and questions downloaded");
  };

  const activateExam = () => {
    if (!s.downloaded)
      return fail(H("Download the exam first", "Exam is not available"));
    setS((st) =>
      log(
        { ...st, activated: true, ended: false, uploaded: {} },
        "activate_exam",
      ),
    );
    return ok("Exam activated");
  };

  const activateSession = (session) => {
    if (!s.activated)
      return fail(H("Activate the exam first", "Exam is not active"));
    setS((st) =>
      log(
        mapC(
          { ...st, sessionActive: { ...st.sessionActive, [session]: true } },
          (c) => c.session === session && c.status === "idle",
          (c) => ({ ...c, status: "writing" }),
        ),
        "activate_session",
        { session },
      ),
    );
    return ok(`${session} activated. Candidates can now log in.`);
  };

  const endExam = () => {
    if (!s.activated) return fail("The exam has not been activated");
    setS((st) =>
      log(
        mapC(
          { ...st, ended: true },
          (c) => c.status === "writing",
          (c) => ({ ...c, status: "submitted", loggedIn: false }),
        ),
        "end_exam",
      ),
    );
    return ok("Examination ended");
  };

  const uploadSession = (session) => {
    if (!s.ended)
      return fail(
        H("End the examination before uploading", "Upload is not available"),
      );
    if (!s.sessionActive[session])
      return fail(`${session} was never activated`);
    if (!s.online) return fail(netMsg);
    setS((st) =>
      log({ ...st, uploaded: { ...st.uploaded, [session]: true } }, "upload", {
        session,
      }),
    );
    return ok(`${session} responses uploaded to the central server`);
  };

  /* ---------- candidates ---------- */
  const relogin = (no) => {
    if (!no.trim()) return fail("Enter the candidate exam number");
    const c = findCandidate(no);
    if (!c) return fail(`Candidate ${norm(no)} not found`);
    if (!s.activated) return fail("The exam has not been activated");
    if (!s.sessionActive[c.session])
      return fail(`${c.session} has not been activated`);
    if (c.status === "submitted")
      return fail(`${c.examNo} has already submitted`);
    setS((st) =>
      log(
        dropCc(
          mapC(
            st,
            (x) => x.examNo === c.examNo,
            (x) => ({ ...x, status: "writing", loggedIn: false }),
          ),
          (n) => n === c.examNo,
        ),
        "relogin",
        {
          examNo: c.examNo,
        },
      ),
    );
    return ok(`Candidate ${c.examNo} relogin successful`);
  };

  // After a power outage or crash that hits every computer: everyone who has not submitted can log in again.
  const reloginAll = () => {
    if (!s.activated) return fail("The exam has not been activated");
    const targets = s.candidates.filter(
      (c) => s.sessionActive[c.session] && c.status !== "submitted",
    );
    if (!targets.length) return fail("There is no candidate to relogin");
    setS((st) =>
      log(
        dropCc(
          mapC(
            st,
            (c) => st.sessionActive[c.session] && c.status !== "submitted",
            (c) => ({ ...c, status: "writing", loggedIn: false }),
          ),
          (n) => targets.some((t) => t.examNo === n),
        ),
        "relogin_all",
      ),
    );
    return ok(`${targets.length} candidates can log in again`);
  };

  const unflag = (no) => {
    if (!no.trim()) return fail("Enter the candidate exam number");
    const c = findCandidate(no);
    if (!c) return fail(`Candidate ${norm(no)} not found`);
    if (!s.infractions.some((i) => i.examNo === c.examNo))
      return fail(`${c.examNo} has no infraction`);
    setS((st) =>
      log(
        {
          ...st,
          infractions: st.infractions.filter((i) => i.examNo !== c.examNo),
        },
        "unflag",
        {
          examNo: c.examNo,
        },
      ),
    );
    return ok(`Infraction removed for ${c.examNo}`);
  };

  // Resets the candidate's time and question paper. The candidate can log in again straight away,
  // so no relogin is needed afterwards.
  const resetCandidate = (no) => {
    const c = findCandidate(no);
    if (!c) return fail(`Candidate ${norm(no)} not found`);
    setS((st) =>
      log(
        {
          ...mapC(
            st,
            (x) => x.examNo === c.examNo,
            (x) => ({
              ...x,
              status: st.sessionActive[x.session] ? "writing" : "idle",
              answered: 0,
              loggedIn: false,
            }),
          ),
          infractions: st.infractions.filter((i) => i.examNo !== c.examNo),
          answers: without(st.answers, c.examNo),
          cc: st.cc?.examNo === c.examNo ? { examNo: null, q: 1 } : st.cc,
        },
        "reset_candidate",
        { examNo: c.examNo },
      ),
    );
    return ok(
      `Candidate ${c.examNo} has been reset. The candidate can log in again.`,
    );
  };

  const resetServer = () => {
    setS((st) =>
      log(
        {
          ...st,
          downloaded: false,
          activated: false,
          ended: false,
          sessionActive: {},
          uploaded: {},
          candidates: [],
          infractions: [],
          syncCount: 0,
          answers: {},
          cc: { examNo: null, q: 1 },
        },
        "reset_server",
      ),
    );
    return ok("Server has been reset");
  };

  const sync = () => {
    if (!s.online) return fail(netMsg);
    if (!s.downloaded)
      return fail(H("Download the exam first", "No exam on this server"));
    if (s.syncCount >= 3)
      return ok("Already up to date. No new data to download.");
    setS((st) => {
      const added = makeCandidates(5, st.candidates.length + 1).map((c) =>
        st.sessionActive[c.session] ? { ...c, status: "writing" } : c,
      );
      return log(
        {
          ...st,
          candidates: [...st.candidates, ...added],
          syncCount: st.syncCount + 1,
        },
        "sync",
      );
    });
    return ok("Synchronised. 5 new candidates downloaded.");
  };

  /* ---------- free play tools (stand-ins for what candidates do) ---------- */
  const simSubmitSome = () => {
    const ids = s.candidates
      .filter((c) => c.status === "writing")
      .slice(0, 5)
      .map((c) => c.examNo);
    if (!ids.length) return fail("No candidate is writing");
    setS((st) =>
      mapC(
        st,
        (c) => ids.includes(c.examNo),
        (c) => ({ ...c, status: "submitted" }),
      ),
    );
    return ok(`${ids.length} candidates submitted`);
  };

  const simInfraction = () => {
    const writing = s.candidates.filter((c) => c.status === "writing");
    if (!writing.length) return fail("No candidate is writing");
    const c = writing[Math.floor(Math.random() * writing.length)];
    const reason = REASONS[Math.floor(Math.random() * REASONS.length)];
    setS((st) => ({
      ...st,
      infractions: [
        ...st.infractions,
        {
          id: `${Date.now()}-${Math.random()}`,
          examNo: c.examNo,
          reason,
          at: Date.now(),
        },
      ],
    }));
    return ok(`Infraction logged for ${c.examNo}`);
  };

  /* ---------- candidate computer (free play) ----------
     Everything the candidate does here is saved on the server state, so the Monitor,
     Infractions, Relogin and Reset pages all reflect it. */
  const ccCandidate = () => s.candidates.find((c) => c.examNo === s.cc?.examNo);

  const candLogin = (no) => {
    if (!no.trim()) return fail("Enter your exam number");
    const c = findCandidate(no);
    if (!c) return fail("Exam number not found");
    if (!s.downloaded || !s.activated)
      return fail("The examination has not started");
    if (s.ended || c.status === "submitted")
      return fail("You have already submitted");
    if (!s.sessionActive[c.session])
      return fail(`${c.session} has not started yet`);
    if (c.status !== "writing")
      return fail("You cannot log in yet. See the invigilator.");
    if (c.loggedIn)
      return fail(
        "This exam number is already logged in. The exam manager must relogin the candidate.",
      );
    setS((st) => {
      const mine = st.answers?.[c.examNo] || seedAnswers(c.answered);
      return {
        ...withAnswers(st, c.examNo, mine),
        candidates: st.candidates.map((x) =>
          x.examNo === c.examNo
            ? { ...x, loggedIn: true, answered: Object.keys(mine).length }
            : x,
        ),
        cc: { examNo: c.examNo, q: firstUnanswered(mine) },
      };
    });
    return ok(`Welcome, ${c.name}`);
  };

  const candGo = (q) =>
    setS((st) => ({
      ...st,
      cc: { ...(st.cc || {}), q: Math.min(TOTAL_Q, Math.max(1, q)) },
    }));

  const candAnswer = (q, letter) => {
    const c = ccCandidate();
    if (!c) return fail("Log in first");
    if (s.ended || c.status !== "writing")
      return fail("The exam is no longer open for this candidate");
    setS((st) =>
      withAnswers(st, c.examNo, {
        ...(st.answers?.[c.examNo] || {}),
        [q]: letter,
      }),
    );
    return ok("Saved");
  };

  const candAnswerNext = (n = 10) => {
    const c = ccCandidate();
    if (!c) return fail("Log in first");
    if (s.ended || c.status !== "writing")
      return fail("The exam is no longer open for this candidate");
    const done = s.answers?.[c.examNo] || {};
    if (Object.keys(done).length >= TOTAL_Q)
      return fail("Every question is already answered");
    setS((st) => {
      const mine = { ...(st.answers?.[c.examNo] || {}) };
      let added = 0;
      for (let q = 1; q <= TOTAL_Q && added < n; q++)
        if (!mine[q]) {
          mine[q] = LETTERS[(q * 5) % 4];
          added++;
        }
      return withAnswers(st, c.examNo, mine);
    });
    return ok(`Answered the next ${n} questions`);
  };

  const candSubmit = () => {
    const c = ccCandidate();
    if (!c) return fail("Log in first");
    setS((st) => ({
      ...mapC(
        st,
        (x) => x.examNo === c.examNo,
        (x) => ({ ...x, status: "submitted", loggedIn: false }),
      ),
    }));
    return ok("Your exam has been submitted");
  };

  const candInfraction = (reason) => {
    const c = ccCandidate();
    if (!c) return fail("Log in first");
    setS((st) => ({
      ...st,
      infractions: [
        ...st.infractions,
        {
          id: `${Date.now()}-${Math.random()}`,
          examNo: c.examNo,
          reason,
          at: Date.now(),
        },
      ],
    }));
    return ok(`Infraction recorded for ${c.examNo}`);
  };

  // The computer goes blank. The server still thinks the candidate is logged in until the manager does a relogin.
  const candCrash = () => {
    setS((st) => ({ ...st, cc: { examNo: null, q: 1 } }));
    return ok(
      "The candidate computer crashed. The server still shows the candidate as logged in.",
    );
  };

  // Client-side only: back to the login screen (after submit, or when the session is closed).
  const candLeave = () => setS((st) => ({ ...st, cc: { examNo: null, q: 1 } }));

  // Other candidates in the hall: an explicit tool, not an automatic counter.
  const simAnswerSome = () => {
    const ids = s.candidates
      .filter(
        (c) =>
          c.status === "writing" &&
          c.answered < TOTAL_Q &&
          !s.answers?.[c.examNo],
      )
      .map((c) => c.examNo);
    if (!ids.length) return fail("No other candidate is writing");
    setS((st) =>
      mapC(
        st,
        (c) => ids.includes(c.examNo),
        (c) => ({
          ...c,
          answered: Math.min(
            TOTAL_Q,
            c.answered + 5 + Math.floor(Math.random() * 11),
          ),
        }),
      ),
    );
    return ok(`${ids.length} other candidates answered more questions`);
  };

  /* ---------- modes ---------- */
  const goMenu = () => {
    if (s.mode === "guide") setS((st) => ({ ...st, mode: "menu", tour: null }));
    navigate("/");
  };

  const adoptFree = () =>
    setS((st) => (st.mode === "menu" ? { ...st, mode: "free" } : st));

  const startFree = () => {
    if (s.mode === "free") {
      navigate(s.loggedIn ? "/admin/home" : "/admin");
      return;
    }
    setS({ ...freshState(), mode: "free" });
    navigate("/admin");
  };

  const wipeSandbox = () => {
    setS({ ...freshState(), mode: "free" });
    navigate("/admin");
  };

  const goStep = (n) => {
    if (n >= TOUR_STEPS.length) return endTour(true);
    const step = TOUR_STEPS[Math.max(0, n)];
    setS({
      ...stageState(step.stage),
      mode: "guide",
      tour: { step: Math.max(0, n) },
    });
    navigate(step.route);
  };

  const endTour = (completed) => {
    setS((st) => ({ ...st, mode: "menu", tour: null }));
    if (completed) setProgress((p) => ({ ...p, guideDone: true }));
    navigate("/");
  };

  const startExercise = (id) => {
    const ex = EXERCISES.find((e) => e.id === id);
    if (!ex) return;
    setS({
      ...ex.prepare(),
      mode: "exercise",
      exercise: { id, startedAt: Date.now(), errors: 0 },
    });
    navigate(ex.route);
  };

  /* ---------- assessment ---------- */
  const beginTask = (a, index) => {
    const task = buildTask(a.seed, index);
    const st = task.prepare();
    setS({
      ...st,
      mode: "assessment",
      assessment: {
        ...a,
        index,
        taskStartedAt: Date.now(),
        timeLimit: task.timeLimit,
        errors: 0,
        phase: "task",
      },
    });
    navigate(st.loggedIn ? "/admin/home" : "/admin");
  };

  // Signed in: the backend creates the attempt and chooses the seed.
  // Signed out or server unreachable: falls back to a local, offline attempt.
  const startAssessment = async (name) => {
    let remote = null;
    if (hasToken()) {
      try {
        remote = await api.startAttempt();
      } catch {
        showToast(
          "Could not reach the server. Starting an offline attempt.",
          "error",
        );
      }
    }
    beginTask(
      {
        attemptId: remote ? remote.attemptId : `A-${Date.now().toString(36)}`,
        name: name.trim(),
        seed: remote ? remote.seed : Math.floor(Math.random() * 2147483647),
        startedAt: Date.now(),
        results: [],
        remote: !!remote,
      },
      0,
    );
  };

  const finishTask = (timedOut = false) => {
    const cur = sRef.current;
    const a = cur.assessment;
    if (!a || a.phase !== "task") return;
    const task = buildTask(a.seed, a.index);
    const timeSec = Math.min(
      task.timeLimit,
      Math.round((Date.now() - a.taskStartedAt) / 1000),
    );
    const res = {
      ...gradeTask(task, cur.actions, { errors: a.errors, timeSec, timedOut }),
      errors: a.errors,
      actions: cur.actions.map(({ type, payload, at }) => ({
        type,
        payload,
        at,
      })),
    };
    const results = [...a.results, res];
    if (a.index + 1 >= TASK_COUNT) {
      // This record is what a backend would store for the attempt.
      const record = {
        attemptId: a.attemptId,
        name: a.name,
        startedAt: a.startedAt,
        finishedAt: Date.now(),
        standard: STANDARD,
        ...buildReport(results),
        tasks: results,
      };
      setS((st) => ({
        ...st,
        assessment: { ...a, results, phase: "done", record },
      }));
      setProgress((p) => ({
        ...p,
        assessments: [record, ...p.assessments].slice(0, 10),
      }));

      // Send the action logs to the server, which re-scores them itself.
      // The server's record then replaces the browser's.
      if (a.remote) {
        api
          .submitAttempt(
            a.attemptId,
            results.map((r) => ({
              actions: r.actions,
              errors: r.errors,
              timeSec: r.timeSec,
              timedOut: r.timedOut,
            })),
          )
          .then(({ record: server }) => {
            const rec = { ...record, ...server };
            setS((st) =>
              st.assessment
                ? { ...st, assessment: { ...st.assessment, record: rec } }
                : st,
            );
            setProgress((p) => ({
              ...p,
              assessments: [
                rec,
                ...p.assessments.filter((x) => x.attemptId !== rec.attemptId),
              ].slice(0, 10),
            }));
          })
          .catch((e) =>
            showToast(`Result not saved to the server: ${e.message}`, "error"),
          );
      }

      navigate("/assessment/result");
    } else {
      setS((st) => ({
        ...st,
        assessment: { ...a, results, phase: "between" },
      }));
    }
  };

  const nextTask = () => {
    const a = sRef.current.assessment;
    if (!a || a.phase !== "between") return;
    beginTask(a, a.index + 1);
  };

  const abandonAssessment = () => {
    setS({ ...freshState(), mode: "menu" });
    navigate("/");
  };

  const value = {
    ...s,
    netMsg,
    startAssessment,
    finishTask,
    nextTask,
    abandonAssessment,
    progress,
    toast,
    showToast,
    login,
    logout,
    setOnline,
    download,
    activateExam,
    activateSession,
    endExam,
    uploadSession,
    relogin,
    reloginAll,
    unflag,
    resetCandidate,
    resetServer,
    sync,
    simSubmitSome,
    simInfraction,
    candLogin,
    candGo,
    candAnswer,
    candAnswerNext,
    candSubmit,
    candInfraction,
    candCrash,
    candLeave,
    simAnswerSome,
    goMenu,
    adoptFree,
    startFree,
    wipeSandbox,
    goStep,
    endTour,
    startExercise,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
