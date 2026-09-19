"use client";

import React, { useState, useRef, useEffect } from "react";
import { Info, X, Cpu } from "lucide-react";

export default function ModelInfoPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div style={{ position: "relative", display: "inline-block" }} ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "var(--border)",
          border: "1px solid var(--border)",
          color: "var(--accent)",
          borderRadius: "5px",
          padding: "0.25rem 0.55rem",
          fontSize: "0.66rem",
          fontFamily: "var(--font-mono), monospace",
          fontWeight: 700,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
        }}
        title="View PHM model specifications and operational definitions"
      >
        <Info size={12} />
        ABOUT THIS MODEL
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "360px",
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "1rem",
            boxShadow: "0 16px 36px var(--bg), 0 0 16px var(--border)",
            backdropFilter: "blur(16px)",
            zIndex: 100,
            fontSize: "0.72rem",
            color: "var(--text)",
            fontFamily: "var(--font-sans), sans-serif",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "0.4rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 700, color: "var(--text)" }}>
              <Cpu size={14} style={{ color: "var(--accent)" }} />
              <span>PHM Prognostics Architecture</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", lineHeight: 1.45 }}>
            <div>
              <strong style={{ color: "var(--accent)" }}>Deep LSTM Sliding Window:</strong> Ingests a 30-cycle temporal sequence buffer across 15 physical and cross-correlated sensor features to capture non-linear wear rate velocities.
            </div>

            <div>
              <strong style={{ color: "var(--status-nominal)" }}>Benchmark Performance:</strong> Evaluated against benchmark holdout sets with an evaluation Mean Absolute Error (MAE) of <strong>10.08 cycles</strong>.
            </div>

            <div style={{ background: "var(--border)", padding: "0.5rem", borderRadius: "5px", border: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" }}>Cycle Definitions:</div>
              <ul style={{ paddingLeft: "1.1rem", margin: 0, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <li>
                  <strong>UAV Piston:</strong> 1 cycle = 60 seconds of operational flight cruise profile (run-up to cruise power).
                </li>
                <li>
                  <strong>NASA C-MAPSS:</strong> 1 cycle = 1 simulated turbofan flight mission (takeoff, climb, cruise, descent, thrust reverser).
                </li>
              </ul>
            </div>

            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
              <span className="overview-badge">LSTM INFERENCE</span>
              <span className="overview-badge">CMAPSS FD001</span>
              <span className="overview-badge">PYTORCH HEADLESS</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
