"use client";

import { useWorldOps } from "@/lib/store";
import { BUILD_PALETTE } from "@/lib/builder";

export default function PlacementHint() {
  const tool = useWorldOps((state) => state.placementTool);
  const plan = useWorldOps((state) => state.plan);
  const cancel = useWorldOps((state) => state.cancelPlacement);

  if (!tool) return null;

  let verb = "place";
  let label = "an object";
  if (tool.kind === "object") {
    label =
      BUILD_PALETTE.find((item) => item.type === tool.type)?.label.toLowerCase() ??
      tool.type;
  } else if (tool.kind === "resident") {
    label = "a resident";
  } else {
    verb = "move";
    label = plan.objects.find((object) => object.id === tool.id)?.name ?? "the selection";
  }

  return (
    <div className="placement-hint" role="status" aria-live="polite">
      <span className="placement-dot" />
      <span>
        Click the ground to {verb} <strong>{label}</strong>.
      </span>
      <button type="button" className="btn btn-sm" onClick={cancel}>
        Cancel <kbd>Esc</kbd>
      </button>
    </div>
  );
}
