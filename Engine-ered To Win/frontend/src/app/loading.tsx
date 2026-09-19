"use client";

import React from "react";

export default function Loading() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "400px",
        height: "100%",
        gap: "1rem",
        color: "var(--text-muted)",
        fontFamily: "var(--font-mono), monospace",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          border: "3px solid var(--border)",
          borderTopColor: "var(--accent)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <span style={{ fontSize: "0.8rem", letterSpacing: "1px" }}>
        INITIALIZING GCS TELEMETRY STREAM...
      </span>
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
