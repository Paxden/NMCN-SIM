import { useEffect, useState } from "react";
import { useSim } from "./store";
import { TOUR_STEPS } from "./tourSteps";

export function Tour() {
  const { tour, goStep, endTour } = useSim();
  const n = tour.step;
  const step = TOUR_STEPS[n];
  const last = n === TOUR_STEPS.length - 1;
  const [rect, setRect] = useState(null);

  // Find the target element, scroll to it once, and keep the ring aligned with it.
  useEffect(() => {
    setRect(null);
    window.scrollTo(0, 0);
    if (!step.target) return;
    const sel = `[data-tour="${step.target}"]`;
    let scrolled = false;
    const measure = () => {
      const el = document.querySelector(sel);
      if (!el) return;
      if (!scrolled) {
        el.scrollIntoView({ block: "center" });
        scrolled = true;
      }
      const r = el.getBoundingClientRect();
      setRect((p) =>
        p && p.top === r.top && p.left === r.left && p.width === r.width && p.height === r.height
          ? p
          : { top: r.top, left: r.left, width: r.width, height: r.height }
      );
    };
    measure();
    const t = setInterval(measure, 120);
    window.addEventListener("resize", measure);
    return () => {
      clearInterval(t);
      window.removeEventListener("resize", measure);
    };
  }, [n, step.target]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight" || e.key === "Enter") goStep(n + 1);
      else if (e.key === "ArrowLeft" && n > 0) goStep(n - 1);
      else if (e.key === "Escape") endTour(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const W = Math.min(360, vw - 24);
  let pos;
  if (!rect) {
    pos = { left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: W };
  } else {
    const left = Math.max(12, Math.min(rect.left, vw - W - 12));
    if (rect.top + rect.height + 20 + 230 < vh) pos = { left, top: rect.top + rect.height + 20, width: W };
    else if (rect.top - 20 - 230 > 0) pos = { left, bottom: vh - rect.top + 20, width: W };
    else pos = { left: "50%", bottom: 16, transform: "translateX(-50%)", width: W };
  }

  return (
    <>
      <div className="tour-block" />
      {rect ? (
        <div
          className="tour-ring"
          style={{
            top: Math.max(4, rect.top - 6),
            left: Math.max(4, rect.left - 6),
            width: Math.min(rect.width + 12, window.innerWidth - 8),
            height: rect.height + 12,
          }}
        />
      ) : (
        <div className="tour-dim" />
      )}
      <div className="tour-tip" style={pos} role="dialog" aria-live="polite">
        <div className="tour-bar"><div style={{ width: `${((n + 1) / TOUR_STEPS.length) * 100}%` }} /></div>
        <div className="tour-count">Step {n + 1} of {TOUR_STEPS.length}</div>
        <h3>{step.title}</h3>
        <p>{step.text}</p>
        <div className="tour-actions">
          {!last ? (
            <button className="tour-skip" onClick={() => endTour(false)}>Skip tour</button>
          ) : (
            <span />
          )}
          <div className="row-gap">
            {n > 0 && <button className="btn btn-light btn-sm" onClick={() => goStep(n - 1)}>Back</button>}
            <button className="btn btn-primary btn-sm" onClick={() => goStep(n + 1)} autoFocus>
              {last ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
