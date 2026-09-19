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
        color: "#f8fafc",
        fontFamily: "'JetBrains Mono', monospace",
        gap: "1rem",
      }}
    >
      <AlertOctagon size={44} style={{ color: "#ef4444" }} />
      <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f8fafc" }}>
        SUBSYSTEM RENDER ANOMALY DETECTED
      </h2>
      <p style={{ fontSize: "0.8rem", color: "#94a3b8", maxWidth: "460px" }}>
        {error.message || "An unexpected avionics display fault occurred during pipeline rendering."}
      </p>
      <button
        onClick={() => reset()}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          background: "rgba(56, 189, 248, 0.15)",
          border: "1px solid rgba(56, 189, 248, 0.4)",
          color: "var(--accent-cyan)",
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
