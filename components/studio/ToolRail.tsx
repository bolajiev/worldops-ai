"use client";

import { useState } from "react";
import { BUILD_PALETTE } from "@/lib/builder";
import { useWorldOps } from "@/lib/store";
import {
  CursorIcon,
  MoveIcon,
  PlusIcon,
  RotateIcon,
  TrashIcon,
} from "../ui/Icons";

export default function ToolRail() {
  const [flyout, setFlyout] = useState(false);
  const selected = useWorldOps((state) => state.selected);
  const placementTool = useWorldOps((state) => state.placementTool);
  const setPlacementTool = useWorldOps((state) => state.setPlacementTool);
  const cancelPlacement = useWorldOps((state) => state.cancelPlacement);
  const rotateSelected = useWorldOps((state) => state.rotateSelected);
  const deleteSelected = useWorldOps((state) => state.deleteSelected);

  const selectedObject =
    selected?.kind === "object" ? selected : null;
  const placing = placementTool?.kind === "object" || placementTool?.kind === "resident";
  const moving = placementTool?.kind === "move";

  return (
    <div className="studio-toolrail" aria-label="Build tools">
      <button
        type="button"
        className={`studio-tool ${!placementTool && !flyout ? "on" : ""}`}
        onClick={() => {
          setFlyout(false);
          cancelPlacement();
        }}
        title="Select"
        aria-label="Select"
      >
        <CursorIcon size={15} />
      </button>
      <button
        type="button"
        className={`studio-tool ${placing || flyout ? "on" : ""}`}
        onClick={() => {
          if (placing) cancelPlacement();
          setFlyout((open) => !open);
        }}
        title="Place"
        aria-label="Place object"
      >
        <PlusIcon size={16} />
      </button>
      <button
        type="button"
        className={`studio-tool ${moving ? "on" : ""}`}
        onClick={() => {
          setFlyout(false);
          if (selectedObject) {
            setPlacementTool({ kind: "move", id: selectedObject.id });
          }
        }}
        disabled={!selectedObject}
        title={selectedObject ? "Move selection" : "Select an object to move"}
        aria-label="Move selection"
      >
        <MoveIcon size={15} />
      </button>
      <button
        type="button"
        className="studio-tool"
        onClick={() => {
          setFlyout(false);
          rotateSelected();
        }}
        disabled={!selectedObject}
        title={selectedObject ? "Rotate selection 45°" : "Select an object to rotate"}
        aria-label="Rotate selection"
      >
        <RotateIcon size={15} />
      </button>
      <span className="studio-tool-sep" />
      <button
        type="button"
        className="studio-tool studio-tool-danger"
        onClick={() => {
          setFlyout(false);
          deleteSelected();
        }}
        disabled={!selected}
        title={selected ? "Delete selection" : "Select something to delete"}
        aria-label="Delete selection"
      >
        <TrashIcon size={15} />
      </button>

      {flyout ? (
        <div className="studio-tool-flyout" role="menu" aria-label="Place object">
          <div className="studio-flyout-head">Place</div>
          {BUILD_PALETTE.map((item) => (
            <button
              key={item.type}
              type="button"
              role="menuitem"
              onClick={() => {
                setPlacementTool({ kind: "object", type: item.type });
                setFlyout(false);
              }}
            >
              <span>{item.label}</span>
              <span className="studio-flyout-hint">{item.hint}</span>
            </button>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setPlacementTool({ kind: "resident" });
              setFlyout(false);
            }}
          >
            <span>Resident</span>
            <span className="studio-flyout-hint">Add an evacuee</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
