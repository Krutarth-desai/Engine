"use client";

import React, { useEffect } from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AeroTwin Root Error Boundary]:", error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "400px",
        height: "100%",
        padding: "2rem",
        textAlign: "center",
        color: "var(--text)",
        fontFamily: "var(--font-mono), monospace",
        gap: "1rem",
      }}
    >
      <AlertOctagon size={44} style={{ color: "var(--status-warning)" }} />
      <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)" }}>
        SUBSYSTEM RENDER ANOMALY DETECTED
      </h2>
      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", maxWidth: "460px" }}>
        {error.message || "An unexpected avionics display fault occurred during pipeline rendering."}
      </p>
      <button
        onClick={() => reset()}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          background: "var(--border)",
          border: "1px solid var(--border)",
          color: "var(--accent)",
          borderRadius: "6px",
          padding: "0.5rem 1rem",
          fontSize: "0.78rem",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        <RotateCcw size={14} />
        RE-INITIALIZE VIEW PIPELINE
      </button>
    </div>
  );
}
