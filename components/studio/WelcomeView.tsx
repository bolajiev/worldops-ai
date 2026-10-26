"use client";

import { useState } from "react";
import { DEMO_PROMPT } from "@/lib/demo-plan";
import { useWorldOps } from "@/lib/store";
import { ArrowRightIcon, PlayIcon, Spinner } from "../ui/Icons";

const EXAMPLES = [
  {
    label: "Flood-rescue town",
    prompt: DEMO_PROMPT,
  },
  {
    label: "Canal village",
    prompt:
      "Create a canal village with a clinic, four houses, two shelters, nine residents and one bridge. A flood is rising from the east. Make evacuation the objective.",
  },
  {
    label: "Industrial yard",
    prompt:
      "Create a compact coastal industrial yard with a factory, two machine halls, eight workers, one shelter and a narrow access bridge. A storm surge is coming from the east.",
  },
];

export default function WelcomeView() {
  const [prompt, setPrompt] = useState("");
  const plan = useWorldOps((state) => state.plan);
  const source = useWorldOps((state) => state.source);
  const isGenerating = useWorldOps((state) => state.isGenerating);
  const generationError = useWorldOps((state) => state.generationError);
  const aiConfigured = useWorldOps((state) => state.aiConfigured);
  const generate = useWorldOps((state) => state.generate);
  const loadDemo = useWorldOps((state) => state.loadDemo);
  const setView = useWorldOps((state) => state.setView);

  const canGenerate = prompt.trim().length >= 3 && !isGenerating;

  return (
    <div className="studio-welcome">
      <div className="studio-welcome-inner">
        <div className="studio-welcome-eyebrow">
          <span className="studio-dot on" />
          {aiConfigured === true
            ? "DeepSeek Flash"
            : aiConfigured === false
              ? "Local composer"
              : "World compiler"}
        </div>
        <h1>Build a world that behaves.</h1>
        <p className="studio-welcome-copy">
          Describe a place under pressure. WorldOps writes the scene, runs its rules,
          and lets you change the outcome.
        </p>

        <div className="studio-composer">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="A small coastal town with a school, clinic, houses, a canal, twelve residents and a hilltop shelter. A flood is approaching from the east…"
            rows={3}
            maxLength={1200}
            disabled={isGenerating}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && canGenerate) {
                event.preventDefault();
                generate(prompt);
              }
            }}
          />
          <div className="studio-composer-row">
            <div className="studio-examples">
              {EXAMPLES.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  onClick={() => setPrompt(example.prompt)}
                  disabled={isGenerating}
                >
                  {example.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="studio-primary"
              onClick={() => generate(prompt)}
              disabled={!canGenerate}
            >
              {isGenerating ? <Spinner size={14} /> : null}
              {isGenerating ? "Generating…" : "Generate world"}
              {!isGenerating ? <ArrowRightIcon size={14} /> : null}
            </button>
          </div>
        </div>

        {isGenerating ? (
          <div className="studio-generation-row" aria-live="polite">
            <Spinner size={14} />
            <span>
              {aiConfigured === true
                ? "DeepSeek is writing a schema-valid plan."
                : "Loading the validated local scenario."}
            </span>
          </div>
        ) : null}

        {generationError ? (
          <div className="studio-inline-error" role="alert">
            {generationError}
          </div>
        ) : null}

        <div className="studio-welcome-actions">
          <button
            type="button"
            className="studio-ghost studio-ghost-large"
            onClick={() => {
              if (source !== "builtin") loadDemo();
              setView("build");
            }}
          >
            <PlayIcon size={13} />
            Open Rising Tide example
          </button>
          <button
            type="button"
            className="studio-text-button"
            onClick={() => setView("build")}
          >
            Back to current world · {plan.title}
          </button>
        </div>

        <p className="studio-welcome-foot">
          Experimental educational simulation. Not validated for real-world emergency response.
        </p>
      </div>
    </div>
  );
}
