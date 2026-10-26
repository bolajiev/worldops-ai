"use client";

import { useState } from "react";
import { useWorldOps } from "@/lib/store";
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
          onClick={() => {
            setTab("create");
            useWorldOps.getState().cancelPlacement();
          }}
        >
          <span className="tab-n">01</span>
          Create world
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "edit"}
          className={`command-tab ${tab === "edit" ? "on" : ""}`}
          onClick={() => {
            setTab("edit");
            useWorldOps.getState().cancelPlacement();
          }}
        >
          <span className="tab-n">02</span>
          Edit & build
        </button>
      </div>
      {tab === "create" ? <PromptPanel /> : <EditPanel />}
    </div>
  );
}
