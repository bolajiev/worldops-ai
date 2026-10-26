"use client";

import { useState } from "react";
import { DEMO_PROMPT, useWorldOps } from "@/lib/store";
import {
  AlertIcon,
  ArrowRightIcon,
  Spinner,
} from "./ui/Icons";

const EXAMPLES = [
  {
    label: "Rising tide",
    prompt: DEMO_PROMPT,
  },
  {
    label: "Factory surge",
    prompt:
      "Create a flooded industrial yard with a factory, two machine halls, a conveyor, eight workers and a raised shelter. A storm surge is coming from the east.",
  },
  {
    label: "Canal village",
    prompt:
      "Create a canal village with a clinic, four houses, a school, nine residents, one bridge and a hilltop shelter. Flood water is rising from the east.",
  },
];

export default function PromptPanel() {
  const [prompt, setPrompt] = useState(DEMO_PROMPT);
  const sim = useWorldOps((state) => state.sim);
  const aiConfigured = useWorldOps((state) => state.aiConfigured);
  const isGenerating = useWorldOps((state) => state.isGenerating);
  const generationError = useWorldOps((state) => state.generationError);
  const notice = useWorldOps((state) => state.notice);
  const generationMode = useWorldOps((state) => state.generationMode);
  const history = useWorldOps((state) => state.history);
  const generate = useWorldOps((state) => state.generate);
  const loadDemo = useWorldOps((state) => state.loadDemo);

  const modeClass = aiConfigured === true ? "ai" : "";
  const modeText =
    aiConfigured === true
      ? "AI LINK ON — your prompt goes to the server-side planner, then through schema validation."
      : aiConfigured === false
        ? "LOCAL DEMO — no model key connected. Generation loads the built-in world; edits use the deterministic parser."
        : "Checking whether a server-side AI link is available.";

  return (
    <section className="panel panel-pad" aria-label="Scene prompt">
      <div className="panel-head">
        <div className="kicker">
          <span className="num">01</span>
          <span className="bar" />
          <span>WORLD BRIEF</span>
        </div>
        <span className="source-chip builtin">FLOOD RULESET</span>
      </div>
      <h2>
        Describe a world.
        <br />
        Then change its <em>fate.</em>
      </h2>
      <p className="panel-copy">
        WorldOps stages a compact flood-evacuation scenario with roads, residents, shelters
        and a rising waterline. Everything you see is playable.
      </p>

      <div className={`mode-strip ${modeClass}`}>
        <span className="dot" />
        <span>{modeText}</span>
      </div>

      <label className="field-label" htmlFor="scene-prompt">
        <span>Scene prompt</span>
        <span className="count">
          {prompt.length} / 1200
        </span>
      </label>
      <textarea
        id="scene-prompt"
        className="prompt-input"
        value={prompt}
        maxLength={1200}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="Create a coastal town with a school, clinic, houses, residents, a shelter and a flood from the east…"
        spellCheck={false}
      />

      <div className="chips">
        {EXAMPLES.map((example) => (
          <button
            key={example.label}
            type="button"
            className="chip"
            onClick={() => setPrompt(example.prompt)}
          >
            {example.label}
          </button>
        ))}
      </div>

      <button
        className="btn btn-primary btn-block"
        type="button"
        onClick={() => generate(prompt)}
        disabled={isGenerating}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {isGenerating ? <Spinner size={14} /> : null}
          {isGenerating ? "Composing world…" : "Generate world"}
        </span>
        {!isGenerating ? <ArrowRightIcon size={15} /> : null}
      </button>

      {isGenerating ? (
        <div className="mode-strip ai" aria-live="polite">
          <span className="dot" />
          <span>
            {aiConfigured
              ? "The planner is writing a ScenePlan. This can take a few seconds."
              : "Loading the validated built-in scenario."}
          </span>
        </div>
      ) : null}

      {generationError ? (
        <div className="error-box" role="alert">
          <strong>
            <AlertIcon size={12} /> Generation failed
          </strong>
          {generationError}
          <div className="btn-group" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => generate(prompt)}
              disabled={isGenerating}
            >
              Retry
            </button>
            <button
              type="button"
              className="btn btn-sm btn-teal"
              onClick={() => loadDemo("Built-in scenario reloaded.")}
            >
              Load built-in world
            </button>
          </div>
        </div>
      ) : null}

      {notice && !generationError ? (
        <div className="notice-box" aria-live="polite">
          <span style={{ color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: 8 }}>
            {generationMode === "builtin" ? "SCENE READY / " : ""}
          </span>
          {notice}
        </div>
      ) : null}

      {history.length > 0 ? (
        <details className="history-block">
          <summary>
            Recent commands <span>{history.length}</span>
          </summary>
          <div className="history-list">
            {history.slice(0, 3).map((entry) => (
              <div className="history-row" key={entry.id}>
                <span className={`history-mode ${entry.mode}`}>
                  {entry.kind === "generate" ? "GEN" : "EDIT"}
                </span>
                <span className="history-text" title={entry.prompt}>
                  {entry.summary}
                </span>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      <div className="panel-note">
        {sim.status === "running"
          ? "Generating will replace the current world and stop this run."
          : "No account, no install, no GPU. One click to a running world."}
      </div>
    </section>
  );
}
