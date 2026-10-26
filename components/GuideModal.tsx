"use client";

import { useEffect } from "react";
import { CloseIcon } from "./ui/Icons";

type GuideModalProps = {
  open: boolean;
  onClose: () => void;
};

const steps = [
  {
    n: "01",
    title: "Brief or load a world",
    copy: "Describe the situation. Without an AI key, WorldOps loads its built-in Rising Tide scenario and uses a deterministic local editor for changes.",
  },
  {
    n: "02",
    title: "Start the simulation",
    copy: "Residents pick shelters and re-path every tick. The flood rises from the east, cutting roads and eventually the old causeway.",
  },
  {
    n: "03",
    title: "Intervene",
    copy: "Select a resident to dispatch a limited rescue skiff. Select a road or bridge to deploy sandbags, close it, or reopen it.",
  },
  {
    n: "04",
    title: "Edit the live world",
    copy: "Ask for a new shelter, a bridge, or a reroute. Validated patch operations preserve every object you did not ask to change.",
  },
];

export default function GuideModal({ open, onClose }: GuideModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="guide-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close guide">
          <CloseIcon size={16} />
        </button>
        <div className="kicker">
          <span className="num">FIELD MANUAL</span>
          <span className="bar" />
          <span>READ IN 40 SECONDS</span>
        </div>
        <h2 id="guide-title">A world that can lose.</h2>
        <p className="modal-intro">
          WorldOps is not a static scene generator. The AI proposes the world and edits; a
          deterministic simulation decides what happens next. Your interventions move the
          outcome numbers.
        </p>

        <div className="guide-grid">
          {steps.map((step) => (
            <div className="guide-step" key={step.n}>
              <span className="step-n">STEP {step.n}</span>
              <strong>{step.title}</strong>
              <p>{step.copy}</p>
            </div>
          ))}
        </div>

        <div className="modal-disclaimer">
          Experimental educational simulation; not validated for real-world emergency
          response. Flood behavior is a stylized ruleset, not fluid dynamics. All outcome
          numbers are calculated from live simulation state — never written by the AI.
        </div>

        <div className="modal-footer">
          <span>WORLDOPS AI / VICTORIA VR AI BUILDER HACKATHON 2026</span>
          <button className="btn btn-sm btn-primary" type="button" onClick={onClose}>
            Back to the world
          </button>
        </div>
      </div>
    </div>
  );
}
