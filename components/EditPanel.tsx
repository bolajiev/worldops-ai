"use client";

import { useState } from "react";
import { useWorldOps } from "@/lib/store";
import { BUILD_PALETTE } from "@/lib/builder";
import type { PlacementTool } from "@/lib/types";
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
  const placementTool = useWorldOps((state) => state.placementTool);
  const setPlacementTool = useWorldOps((state) => state.setPlacementTool);
  const cancelPlacement = useWorldOps((state) => state.cancelPlacement);

  const toggleTool = (tool: PlacementTool) => {
    if (
      placementTool &&
      placementTool.kind === tool.kind &&
      (tool.kind !== "object" ||
        (placementTool.kind === "object" && placementTool.type === tool.type))
    ) {
      cancelPlacement();
      return;
    }
    setPlacementTool(tool);
  };

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
          <span>Edit the live world</span>
        </div>
        <span className="source-chip local" style={{ textTransform: "none" }}>
          T+{String(sim.tick).padStart(3, "0")}
        </span>
      </div>
      <h2>Change what exists.</h2>
      <p className="panel-copy">
        Place objects directly, or describe a change. Validated patches update the current
        world without rebuilding what you leave alone.
      </p>

      {lastEditSummary ? (
        <div className="applied-box" aria-live="polite" style={{ marginTop: 11 }}>
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
        <div className="error-box" role="alert" style={{ marginTop: 11 }}>
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

      <div className="build-section">
        <div className="build-heading">
          <span>Build directly</span>
          <span className="build-hint">Click the ground to place</span>
        </div>
        <div className="build-grid">
          {BUILD_PALETTE.map((item) => {
            const active =
              placementTool?.kind === "object" && placementTool.type === item.type;
            return (
              <button
                key={item.type}
                type="button"
                className={`build-tile ${active ? "on" : ""}`}
                onClick={() => toggleTool({ kind: "object", type: item.type })}
                title={item.hint}
                aria-pressed={active}
              >
                <span className="build-icon" aria-hidden="true">
                  {item.type === "house" ? "⌂" : item.type === "shelter" ? "△" : item.type === "tree" ? "♧" : item.type === "road" ? "═" : item.type === "bridge" ? "⌒" : item.type === "clinic" ? "+" : "▤"}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            className={`build-tile ${placementTool?.kind === "resident" ? "on" : ""}`}
            onClick={() => toggleTool({ kind: "resident" })}
            title="Add a resident and place them on the map"
            aria-pressed={placementTool?.kind === "resident"}
          >
            <span className="build-icon" aria-hidden="true">●</span>
            <span>Resident</span>
          </button>
        </div>
        {placementTool ? (
          <div className="placement-inline">
            <span>
              {placementTool.kind === "object"
                ? `Placing ${BUILD_PALETTE.find((item) => item.type === placementTool.type)?.label ?? placementTool.type}`
                : placementTool.kind === "resident"
                  ? "Placing a resident"
                  : "Moving selection"}
              {" — click the ground."}
            </span>
            <button type="button" className="btn btn-sm" onClick={cancelPlacement}>
              Cancel
            </button>
          </div>
        ) : null}
      </div>

      <label className="field-label" htmlFor="edit-prompt">
        <span>Or describe an edit</span>
        <span className="count">{aiConfigured === false ? "LOCAL PARSER" : "DEEPSEEK PATCH"}</span>
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
