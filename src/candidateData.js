// Pure helpers for the candidate computer. No React, so they are easy to test and reuse.
import { TOTAL_Q } from "./data";

export const LETTERS = ["A", "B", "C", "D"];

const BANK = [
  { q: "Which instrument is used to measure blood pressure?", o: ["Thermometer", "Sphygmomanometer", "Glucometer", "Pulse oximeter"] },
  { q: "What is the normal resting pulse rate of an adult?", o: ["30 to 50 beats per minute", "60 to 100 beats per minute", "110 to 140 beats per minute", "150 to 180 beats per minute"] },
  { q: "An intramuscular injection is given:", o: ["Into the skin layers", "Into a vein", "Into muscle tissue", "Under the tongue"] },
  { q: "Hand hygiene should be performed:", o: ["Only after a procedure", "Before and after every patient contact", "Only when hands look dirty", "Once per shift"] },
  { q: "What is the first step of the nursing process?", o: ["Planning", "Implementation", "Evaluation", "Assessment"] },
  { q: "A normal adult body temperature is about:", o: ["32 to 33 °C", "36.5 to 37.5 °C", "39 to 40 °C", "41 to 42 °C"] },
  { q: "Which position helps a patient who has difficulty breathing?", o: ["Supine", "Prone", "Fowler's position", "Trendelenburg position"] },
  { q: "Informed consent means the patient:", o: ["Signs without information", "Understands and agrees to the procedure", "Is told after the procedure", "Has a relative decide for them"] },
  { q: "Which of these is a sign of dehydration?", o: ["Moist mucous membranes", "Dry mucous membranes", "Swollen ankles", "Slow deep breathing"] },
  { q: "Used needles should be disposed of in:", o: ["A paper bag", "The general waste bin", "A puncture-resistant sharps container", "A plastic bottle"] },
];

export const questionFor = (n) => ({ n, ...BANK[(n - 1) % BANK.length] });

// Candidates that were already "mid-exam" in a prepared situation have a count but no saved answers.
// When one logs in on the candidate computer, create answers for questions 1..n so the count stays true.
export const seedAnswers = (n) => {
  const out = {};
  for (let q = 1; q <= Math.min(n || 0, TOTAL_Q); q++) out[q] = LETTERS[(q * 7) % 4];
  return out;
};

export const firstUnanswered = (answers) => {
  for (let q = 1; q <= TOTAL_Q; q++) if (!answers[q]) return q;
  return TOTAL_Q;
};

export const without = (obj, key) => {
  const { [key]: _drop, ...rest } = obj || {};
  return rest;
};

// Save a candidate's answers and keep the server's "answered" count equal to the real number of answers.
export const withAnswers = (st, examNo, mine) => ({
  ...st,
  answers: { ...(st.answers || {}), [examNo]: mine },
  candidates: st.candidates.map((c) =>
    c.examNo === examNo ? { ...c, answered: Object.keys(mine).length } : c
  ),
});

// If the manager acts on the candidate shown on the candidate computer, that computer goes back to the login screen.
export const dropCc = (st, pred) =>
  st.cc?.examNo && pred(st.cc.examNo) ? { ...st, cc: { examNo: null, q: 1 } } : st;
