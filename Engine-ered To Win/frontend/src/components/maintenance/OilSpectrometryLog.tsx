"use client";

import React from "react";
import { FlaskConical } from "lucide-react";

const WEAR_METALS = [
  { element: "Fe", name: "Iron", ppm: 24, limit: 30, origin: "Cylinders & Rings" },
  { element: "Cu", name: "Copper", ppm: 8, limit: 15, origin: "Bushings & Bearings" },
  { element: "Cr", name: "Chromium", ppm: 2, limit: 5, origin: "Piston Rings" },
  { element: "Al", name: "Aluminum", ppm: 12, limit: 20, origin: "Pistons & Housings" },
  { element: "Pb", name: "Lead", ppm: 6, limit: 15, origin: "Avgas Deposits" },
  { element: "Si", name: "Silicon", ppm: 9, limit: 15, origin: "Air Filter / Dust" },
];

export default function OilSpectrometryLog() {
  return (
    <div className="panel oil-spectrometry-panel" style={{ marginTop: "0.85rem" }}>
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="panel-title" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <FlaskConical size={14} style={{ color: "var(--accent-amber)" }} />
          <strong>OIL SPECTROMETRY WEAR METALS LOG</strong>
        </div>
        <span className="model-chip font-mono text-xs">FLIGHT 27 LAB ASSAY</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "0.65rem" }}>
        {WEAR_METALS.map((m) => {
          const ratio = m.ppm / m.limit;
          const statusColor = ratio > 0.9 ? "#ef4444" : ratio > 0.7 ? "#f59e0b" : "#10b981";

          return (
            <div
              key={m.element}
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.07)",
                borderRadius: "6px",
                padding: "0.45rem 0.6rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#f8fafc" }}>
                  {m.element} <span style={{ fontSize: "0.6rem", color: "#64748b", fontWeight: 400 }}>({m.name})</span>
                </span>
                <span style={{ fontSize: "0.6rem", color: statusColor, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                  &lt; {m.limit}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: "0.2rem", marginTop: "0.15rem" }}>
                <span style={{ fontSize: "1.1rem", fontWeight: 800, color: statusColor }} className="font-mono">
                  {m.ppm}
                </span>
                <span style={{ fontSize: "0.6rem", color: "#64748b" }}>ppm</span>
              </div>

              <div style={{ fontSize: "0.58rem", color: "#64748b", marginTop: "0.15rem" }}>
                {m.origin}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          fontSize: "0.65rem",
          color: "#94a3b8",
          background: "rgba(0, 0, 0, 0.25)",
          padding: "0.4rem 0.65rem",
          borderRadius: "4px",
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <span>Wear Rate: <strong style={{ color: "#10b981" }}>+0.2 ppm/hr (Normal)</strong></span>
        <span>Next Scheduled Assay: <strong>Cycle 50</strong></span>
      </div>
    </div>
  );
}
