import { useSim } from "./store";

// Every action returns { ok, msg }; this turns the result into a toast.
export function useReport() {
  const { showToast } = useSim();
  return (r) => showToast(r.msg, r.ok ? "success" : "error");
}

export function Bar({ value, max }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="pbar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}

// Candidates who have a score saved for a Day 1 component.
export const scoredCount = (o, key) => Object.keys(o.scores?.[key] || {}).length;

// Candidates who have finished all six stations.
export const finishedCount = (o) => o.candidates.filter((c) => c.progress.every(Boolean)).length;

// Progress shown on an exam component card.
export const componentProgress = (o, key) => (key === "osce" ? finishedCount(o) : scoredCount(o, key));
