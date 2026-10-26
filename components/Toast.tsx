"use client";

import { useEffect } from "react";
import { useWorldOps } from "@/lib/store";
import { CloseIcon } from "./ui/Icons";

export default function Toast() {
  const toast = useWorldOps((state) => state.toast);
  const dismiss = useWorldOps((state) => state.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => dismiss(), 4200);
    return () => window.clearTimeout(timer);
  }, [toast, dismiss]);

  if (!toast) return null;

  return (
    <div className={`toast ${toast.kind}`} role="status">
      <span className="toast-dot" />
      <span>{toast.text}</span>
      <button className="toast-close" type="button" onClick={dismiss} aria-label="Dismiss message">
        <CloseIcon size={13} />
      </button>
    </div>
  );
}
