"use client";

import { useWorldOps } from "@/lib/store";
import { InfoIcon, PlusIcon } from "../ui/Icons";

type StudioHeaderProps = {
  onOpenGuide: () => void;
};

function versionLabel(
  versions: { id: string; label: string }[],
  currentId: string | null,
): string | null {
  return versions.find((version) => version.id === currentId)?.label ?? null;
}

export default function StudioHeader({ onOpenGuide }: StudioHeaderProps) {
  const plan = useWorldOps((state) => state.plan);
  const view = useWorldOps((state) => state.view);
  const sim = useWorldOps((state) => state.sim);
  const versions = useWorldOps((state) => state.versions);
  const currentVersionId = useWorldOps((state) => state.currentVersionId);
  const aiConfigured = useWorldOps((state) => state.aiConfigured);
  const aiModel = useWorldOps((state) => state.aiModel);
  const setView = useWorldOps((state) => state.setView);
  const start = useWorldOps((state) => state.start);
  const pause = useWorldOps((state) => state.pause);

  const version = versionLabel(versions, currentVersionId);
  const modelLabel =
    aiConfigured === true
      ? aiModel?.includes("deepseek")
        ? "DeepSeek Flash"
        : "AI online"
      : aiConfigured === false
        ? "Local mode"
        : "AI";

  const enterRun = () => {
    setView("run");
    if (sim.status === "ready" || sim.status === "paused") start();
  };

  const enterBuild = () => {
    if (sim.status === "running") pause();
    setView("build");
  };

  const openWelcome = () => {
    if (sim.status === "running") pause();
    setView("welcome");
  };

  return (
    <header className="studio-header">
      <div className="studio-brand">
        <div className="studio-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="8.5" stroke="#67d6c5" strokeWidth="1.4" opacity="0.85" />
            <path
              d="M3.8 13.2c2.1-1.8 4.2-1.8 6.2 0s4.1 1.8 6.2 0 4.1-1.8 6.1 0"
              stroke="#ff7657"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <circle cx="16.4" cy="7.2" r="1.7" fill="#ffb45c" />
          </svg>
        </div>
        <span className="studio-wordmark">WorldOps</span>
        {view === "welcome" ? (
          <span className="studio-tagline">world studio</span>
        ) : null}
      </div>

      {view !== "welcome" ? (
        <>
          <div className="studio-divider" />
          <div className="studio-world">
            <span className="studio-world-name">{plan.title}</span>
            {version ? <span className="studio-version-chip">{version}</span> : null}
          </div>
          <div className="studio-mode-switch" role="group" aria-label="Workspace mode">
            <button
              type="button"
              className={view === "build" ? "on" : ""}
              onClick={enterBuild}
            >
              Build
            </button>
            <button
              type="button"
              className={view === "run" ? "on" : ""}
              onClick={enterRun}
            >
              Run
            </button>
          </div>
        </>
      ) : (
        <div className="studio-welcome-label" />
      )}

      <div className="studio-header-right">
        <span
          className={`studio-ai ${aiConfigured === true ? "on" : aiConfigured === false ? "off" : ""}`}
          title={
            aiConfigured === true
              ? `${aiModel ?? "DeepSeek Flash"} via the server-side OpenCode Go provider`
              : aiConfigured === false
                ? "No model key configured. Local demo mode."
                : "Checking AI configuration"
          }
        >
          <span className="studio-dot" />
          {modelLabel}
        </span>
        {view !== "welcome" ? (
          <button type="button" className="studio-ghost" onClick={openWelcome}>
            <PlusIcon size={13} />
            <span>New world</span>
          </button>
        ) : null}
        <button type="button" className="studio-icon" onClick={onOpenGuide} aria-label="Guide">
          <InfoIcon size={15} />
        </button>
      </div>
    </header>
  );
}
