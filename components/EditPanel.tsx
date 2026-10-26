"use client";

import { useState } from "react";
import { useWorldOps } from "@/lib/store";
import {
  AlertIcon,
  ArrowRightIcon,
  ShieldIcon,
  Spinner,
} from "./ui/Icons";

const QUICK_EDITS = [
  "Add a second shelter to the west and reroute residents",
  "Add a bridge north of the causeway",
  "Close Market Road",
  "Reroute everyone to the west shelter",
];

export default function EditPanel() {
  const [prompt, setPrompt] = useState("");
  const plan = useWorldOps((state) => state.plan);
  const sim = useWorldOps((state) => state.sim);
  const aiConfigured = useWorldOps((state) => state.aiConfigured);
  const isEditing = useWorldOps((state) => state.isEditing);
  const editError = useWorldOps((state) => state.editError);
  const editSuggestions = useWorldOps((state) => state.editSuggestions);
  const lastEditSummary = useWorldOps((state) => state.lastEditSummary);
  const applyEdit = useWorldOps((state) => state.applyEdit);
  const clearEditError = useWorldOps((state) => state.clearEditError);

  const submit = () => {
    if (!prompt.trim() || isEditing) return;
    applyEdit(prompt);
    setPrompt("");
  };

  return (
    <section className="panel panel-pad" aria-label="Natural language world edit">
      <div className="panel-head">
        <div className="kicker">
          <span className="num">02</span>
          <span className="bar" />
          <span>EDIT THE LIVE WORLD</span>
        </div>
        <span className="source-chip local" style={{ textTransform: "none" }}>
          T+{String(sim.tick).padStart(3, "0")}
        </span>
      </div>
      <h2>Change what exists.</h2>
      <p className="panel-copy">
        Ask for a new shelter, a crossing, or a reroute. Validated patches update the current
        world without rebuilding the objects you leave alone.
      </p>

      <label className="field-label" htmlFor="edit-prompt">
        <span>Edit instruction</span>
        <span className="count">{aiConfigured === false ? "LOCAL PARSER" : "AI PATCH"}</span>
      </label>
      <textarea
        id="edit-prompt"
        className="edit-input"
        value={prompt}
        maxLength={600}
        onChange={(event) => {
          setPrompt(event.target.value);
          if (editError) clearEditError();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            submit();
          }
        }}
        placeholder="Add a second shelter to the west and reroute residents…"
        spellCheck={false}
      />

      <div className="chips">
        {QUICK_EDITS.map((edit) => (
          <button
            key={edit}
            type="button"
            className="chip"
            onClick={() => {
              setPrompt(edit);
              clearEditError();
            }}
          >
            {edit}
          </button>
        ))}
      </div>

      <button
        className="btn btn-block"
        type="button"
        onClick={submit}
        disabled={isEditing || prompt.trim().length < 2}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {isEditing ? <Spinner size={14} /> : <ShieldIcon size={14} />}
          {isEditing ? "Validating patch…" : "Apply edit"}
        </span>
        {!isEditing ? <ArrowRightIcon size={14} /> : null}
      </button>

      {lastEditSummary ? (
        <div className="applied-box" aria-live="polite">
          <ShieldIcon size={13} />
          <span>
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-mono)",
                fontSize: 7.5,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--safe)",
                marginBottom: 3,
              }}
            >
              Applied patch
            </span>
            {lastEditSummary}
          </span>
        </div>
      ) : null}

      {editError ? (
        <div className="error-box" role="alert">
          <strong>
            <AlertIcon size={12} /> Edit not applied
          </strong>
          {editError}
          {editSuggestions.length > 0 ? (
            <div className="suggestions">
              {editSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="chip"
                  onClick={() => {
                    setPrompt(suggestion);
                    clearEditError();
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="panel-note">
        {aiConfigured
          ? "The model proposes patch operations; WorldOps validates and applies them atomically."
          : "Local mode uses a small deterministic parser. Unsupported requests fail safely."}{" "}
        Unchanged IDs and positions are preserved.
      </div>

      <div className="edit-foot">
        <span>WORLD OBJECTS</span>
        <span>
          {plan.objects.length} / 100
        </span>
      </div>
    </section>
  );
}
