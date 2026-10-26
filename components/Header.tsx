"use client";

import { useWorldOps } from "@/lib/store";
import { humanize } from "@/lib/scene-normalize";
import { InfoIcon } from "./ui/Icons";

type HeaderProps = {
  onOpenGuide: () => void;
};

function sourceClass(label: string): string {
  if (label.includes("AI")) return "ai";
  if (label.includes("FALLBACK")) return "fallback";
  if (label.includes("LOCAL")) return "local";
  return "builtin";
}

export default function Header({ onOpenGuide }: HeaderProps) {
  const plan = useWorldOps((state) => state.plan);
  const sourceLabel = useWorldOps((state) => state.sourceLabel);
  const aiConfigured = useWorldOps((state) => state.aiConfigured);
  const simStatus = useWorldOps((state) => state.sim.status);

  return (
    <header className="site-header">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="8.4" stroke="#63d2c9" strokeWidth="1.4" opacity="0.8" />
            <path
              d="M3.8 13.2c2.1-1.8 4.2-1.8 6.2 0s4.1 1.8 6.2 0 4.1-1.8 6.1 0"
              stroke="#ffb45c"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
            <path
              d="M5.7 9.5c1.9-1.6 3.8-1.6 5.6 0s3.8 1.6 5.6 0"
              stroke="#63d2c9"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.55"
            />
            <circle cx="16.3" cy="7.3" r="1.6" fill="#ffb45c" />
          </svg>
        </div>
        <div className="brand-name">
          <strong>WORLDOPS AI</strong>
          <span>Prompt → world → consequence</span>
        </div>
      </div>

      <div className="header-divider" aria-hidden="true" />

      <div className="scenario-meta">
        <div className="scenario-title">
          <div className="scenario-eyebrow">
            <span
              className="status-dot"
              style={{
                color:
                  simStatus === "running"
                    ? "var(--teal)"
                    : simStatus === "failed"
                      ? "var(--danger)"
                      : "var(--accent)",
              }}
            />
            <span>{humanize(plan.environment)}</span>
            <span aria-hidden="true">/</span>
            <span>{plan.worldBounds.width} × {plan.worldBounds.depth}</span>
          </div>
          <h1 title={plan.title}>{plan.title}</h1>
        </div>
        <span className={`source-chip ${sourceClass(sourceLabel)}`}>{sourceLabel}</span>
      </div>

      <div className="header-right">
        <div
          className={`ai-status ${
            aiConfigured === true ? "on" : aiConfigured === false ? "off" : ""
          }`}
          title={
            aiConfigured === true
              ? "A server-side LLM key is configured. Prompts use the AI planner."
              : aiConfigured === false
                ? "No LLM key is configured. WorldOps is in deterministic local demo mode."
                : "Checking AI configuration"
          }
        >
          <span className="status-dot" />
          <span>
            {aiConfigured === true
              ? "AI LINK"
              : aiConfigured === false
                ? "LOCAL MODE"
                : "CHECKING"}
          </span>
        </div>
        <span className="experiment-badge">
          <span className="status-dot" />
          EXPERIMENTAL SIM
        </span>
        <button className="header-btn" type="button" onClick={onOpenGuide}>
          <InfoIcon size={13} />
          <span>GUIDE</span>
        </button>
      </div>
    </header>
  );
}
