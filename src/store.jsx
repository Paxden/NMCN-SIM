import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  REASONS,
  TOTAL_Q,
  freshState,
  makeCandidates,
  stageState,
} from "./data";
import { EXERCISES, exerciseProgress, wrongCount } from "./exercises";
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
const NO_NET = "No internet connection. Connect to the internet and try again.";

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

  // Candidates keep answering questions while the exam is live (not during the tour).
  const live = s.mode !== "guide" && s.activated && !s.ended;
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => {
      setS((st) => {
        if (
          !st.candidates.some(
            (c) => c.status === "writing" && c.answered < TOTAL_Q,
          )
        )
          return st;
        return {
          ...st,
          candidates: st.candidates.map((c) =>
            c.status === "writing" && c.answered < TOTAL_Q
              ? {
                  ...c,
                  answered: Math.min(
                    TOTAL_Q,
                    c.answered + Math.floor(Math.random() * 4),
                  ),
                }
              : c,
          ),
        };
      });
    }, 2500);
    return () => clearInterval(t);
  }, [live]);

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

  /* ---------- server / auth ---------- */
  const createServer = (id, password) => {
    if (!id.trim() || !password)
      return fail("Server ID and password are required");
    setS((st) =>
      log(
        {
          ...freshState(),
          mode: st.mode,
          tour: st.tour,
          exercise: st.exercise,
          assessment: st.assessment,
          online: st.online,
          actions: st.actions,
          server: { id: id.trim(), password },
        },
        "server_created",
      ),
    );
    return ok("Server created");
  };

  const login = (id, password) => {
    if (!s.server)
      return fail(
        H(
          "No server has been created yet. Open /createserver first.",
          "Invalid server ID or password",
        ),
      );
    if (id.trim() !== s.server.id || password !== s.server.password)
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
          (c) => ({ ...c, status: "submitted" }),
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
    return ok(`${session} uploaded successfully`);
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
        mapC(
          st,
          (x) => x.examNo === c.examNo,
          (x) => ({ ...x, status: "writing" }),
        ),
        "relogin",
        {
          examNo: c.examNo,
        },
      ),
    );
    return ok(`Candidate ${c.examNo} relogin successful`);
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

  const resetCandidate = (no) => {
    const c = findCandidate(no);
    if (!c) return fail(`Candidate ${norm(no)} not found`);
    setS((st) =>
      log(
        {
          ...mapC(
            st,
            (x) => x.examNo === c.examNo,
            (x) => ({ ...x, status: "idle", answered: 0 }),
          ),
          infractions: st.infractions.filter((i) => i.examNo !== c.examNo),
        },
        "reset_candidate",
        { examNo: c.examNo },
      ),
    );
    return ok(`Candidate ${c.examNo} has been reset`);
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

  /* ---------- modes ---------- */
  const goMenu = () => {
    if (s.mode === "guide") setS((st) => ({ ...st, mode: "menu", tour: null }));
    navigate("/");
  };

  const adoptFree = () =>
    setS((st) => (st.mode === "menu" ? { ...st, mode: "free" } : st));

  const startFree = () => {
    if (s.mode === "free") {
      navigate(
        s.loggedIn ? "/admin/home" : s.server ? "/admin" : "/createserver",
      );
      return;
    }
    setS({ ...freshState(), mode: "free" });
    navigate("/createserver");
  };

  const wipeSandbox = () => {
    setS({ ...freshState(), mode: "free" });
    navigate("/createserver");
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
    navigate(
      st.loggedIn ? "/admin/home" : st.server ? "/admin" : "/createserver",
    );
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
    createServer,
    login,
    logout,
    setOnline,
    download,
    activateExam,
    activateSession,
    endExam,
    uploadSession,
    relogin,
    unflag,
    resetCandidate,
    resetServer,
    sync,
    simSubmitSome,
    simInfraction,
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
