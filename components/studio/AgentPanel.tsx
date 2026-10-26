"use client";

import { useState } from "react";
import { useWorldOps } from "@/lib/store";
import { sourceLabelFor } from "@/lib/studio";
import { ArrowRightIcon, HistoryIcon, Spinner } from "../ui/Icons";

const QUICK_EDITS = [
  "Add a second shelter to the west",
  "Reroute residents to the west shelter",
  "Add a bridge north of the causeway",
  "Close Market Road",
];

export default function AgentPanel() {
  const [prompt, setPrompt] = useState("");
  const aiConfigured = useWorldOps((state) => state.aiConfigured);
  const isEditing = useWorldOps((state) => state.isEditing);
  const editError = useWorldOps((state) => state.editError);
  const editSuggestions = useWorldOps((state) => state.editSuggestions);
  const versions = useWorldOps((state) => state.versions);
  const currentVersionId = useWorldOps((state) => state.currentVersionId);
  const restoreVersion = useWorldOps((state) => state.restoreVersion);
  const applyEdit = useWorldOps((state) => state.applyEdit);

  const submit = () => {
    if (!prompt.trim() || isEditing) return;
    applyEdit(prompt);
    setPrompt("");
  };

  const current = versions.find((version) => version.id === currentVersionId);
  const orderedVersions = [...versions].reverse();

  return (
    <div className="studio-agent">
      <div className="studio-agent-scroll">
        <p className="studio-panel-copy">
          {aiConfigured === false
            ? "Ask for a change. The local parser proposes patch operations."
            : "Ask for a change. DeepSeek proposes patch operations; WorldOps applies them atomically."}
        </p>

        <div className="studio-history-head">
          <span>
            <HistoryIcon size={12} />
            History
          </span>
          <span className="studio-mono">{versions.length}</span>
        </div>
        <div className="studio-version-list">
          {orderedVersions.map((version) => {
            const active = version.id === currentVersionId;
            return (
              <button
                key={version.id}
                type="button"
                className={`studio-version ${active ? "current" : ""}`}
                onClick={() => restoreVersion(version.id)}
                title={active ? "Current version" : `Restore ${version.label}`}
              >
                <span className="studio-version-label">{version.label}</span>
                <span className="studio-version-body">
                  <span className="studio-version-summary">{version.summary}</span>
                  <span className="studio-version-source">
                    {sourceLabelFor(version.source)}
                  </span>
                </span>
                {active ? <span className="studio-current-dot" /> : null}
              </button>
            );
          })}
        </div>

        {current ? (
          <p className="studio-version-foot">
            Current · {current.label} · {current.summary}
          </p>
        ) : null}
      </div>

      <div className="studio-agent-prompt">
        {editError ? (
          <div className="studio-inline-error" role="alert">
            {editError}
            {editSuggestions.length ? (
              <div className="studio-suggestions">
                {editSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setPrompt(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={3}
          maxLength={600}
          placeholder="Add a second shelter to the west and reroute residents…"
          disabled={isEditing}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <div className="studio-prompt-actions">
          <div className="studio-examples studio-examples-small">
            {QUICK_EDITS.slice(0, 2).map((edit) => (
              <button key={edit} type="button" onClick={() => setPrompt(edit)}>
                {edit}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="studio-primary studio-primary-small"
            onClick={submit}
            disabled={isEditing || prompt.trim().length < 2}
          >
            {isEditing ? <Spinner size={12} /> : null}
            {isEditing ? "Applying…" : "Apply"}
            {!isEditing ? <ArrowRightIcon size={12} /> : null}
          </button>
        </div>
      </div>
    </div>
  );
}
