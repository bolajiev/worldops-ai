"use client";

import { useState } from "react";
import PromptPanel from "./PromptPanel";
import EditPanel from "./EditPanel";

type Tab = "create" | "edit";

export default function CommandDeck() {
  const [tab, setTab] = useState<Tab>("create");

  return (
    <div className="command-deck">
      <div className="command-tabs" role="tablist" aria-label="World commands">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "create"}
          className={`command-tab ${tab === "create" ? "on" : ""}`}
          onClick={() => setTab("create")}
        >
          <span className="tab-n">01</span>
          Create world
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "edit"}
          className={`command-tab ${tab === "edit" ? "on" : ""}`}
          onClick={() => setTab("edit")}
        >
          <span className="tab-n">02</span>
          Edit live world
        </button>
      </div>
      {tab === "create" ? <PromptPanel /> : <EditPanel />}
    </div>
  );
}
