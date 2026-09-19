"use client";

import React, { useState } from "react";
import AirframeSchematic from "./dashboard/AirframeSchematic";
import { UnifiedTelemetryPayload } from "@/types/telemetry";
import { Cpu, Info } from "lucide-react";

interface DigitalTwinCenterpieceProps {
  telemetry: unknown;
  activeScenario: string;
  onInjectScenario: (scenario: string) => void;
  focusedComponent?: string | null;
  onSelectComponent?: (componentKey: string) => void;
}

export default function DigitalTwinCenterpiece({
  telemetry,
  activeScenario,
  focusedComponent,
  onSelectComponent,
}: DigitalTwinCenterpieceProps) {
  const [viewMode, setViewMode] = useState<"full" | "engine" | "thermal">("full");
  const [showLegend, setShowLegend] = useState<boolean>(true);

  const payload = (telemetry as UnifiedTelemetryPayload) || {};

  const handleSelectHotspot = (compKey: string) => {
    if (onSelectComponent) {
      onSelectComponent(compKey);
    }
  };

  return (
    <div className="panel digital-twin-centerpiece-panel" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Schematic Header Strip */}
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Cpu size={15} style={{ color: "var(--accent-cyan)" }} />
          <span className="panel-title">
            <strong>MALE UAV PROPULSION DIGITAL TWIN</strong>
          </span>
          <span
            style={{
              fontSize: "0.64rem",
              fontFamily: "'JetBrains Mono', monospace",
              color: "var(--accent-cyan)",
              background: "rgba(56, 189, 248, 0.1)",
              padding: "0.15rem 0.45rem",
              borderRadius: "4px",
              border: "1px solid rgba(56, 189, 248, 0.25)",
            }}
          >
            AERO PISTON 4-CYL
          </span>
          {activeScenario && activeScenario !== "Normal" && (
            <span
              style={{
                fontSize: "0.64rem",
                fontFamily: "'JetBrains Mono', monospace",
                color: "#ef4444",
                background: "rgba(239, 68, 68, 0.15)",
                padding: "0.15rem 0.45rem",
                borderRadius: "4px",
                border: "1px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              SIM: {activeScenario}
            </span>
          )}
        </div>

        {/* View Mode Controls & Legend Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <button
            onClick={() => setShowLegend(!showLegend)}
            title="Toggle component legend"
            style={{
              background: showLegend ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.04)",
              border: `1px solid ${showLegend ? "rgba(56, 189, 248, 0.4)" : "rgba(255, 255, 255, 0.1)"}`,
              color: showLegend ? "var(--accent-cyan)" : "#94a3b8",
              borderRadius: "4px",
              padding: "0.2rem 0.45rem",
              fontSize: "0.64rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <Info size={11} />
            LEGEND
          </button>

          <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "4px", overflow: "hidden" }}>
            {(["full", "engine", "thermal"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                style={{
                  background: viewMode === m ? "rgba(56, 189, 248, 0.2)" : "transparent",
                  color: viewMode === m ? "var(--accent-cyan)" : "#94a3b8",
                  border: "none",
                  padding: "0.2rem 0.5rem",
                  fontSize: "0.64rem",
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                  cursor: "pointer",
                  textTransform: "uppercase",
                }}
              >
                {m === "full" ? "AIRFRAME" : m === "engine" ? "ENGINE BAY" : "THERMAL HUD"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Centerpiece Body with Schematic and Background Radar Grid */}
      <div
        className="uav-hud-container"
        style={{
          position: "relative",
          flex: 1,
          minHeight: "260px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 50% 50%, rgba(14, 28, 54, 0.4) 0%, rgba(7, 11, 20, 0.9) 100%)",
          borderRadius: "8px",
          overflow: "hidden",
          border: "1px solid rgba(255, 255, 255, 0.04)",
        }}
      >
        {/* Aerospace HUD Grid Texture */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(56, 189, 248, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.04) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            pointerEvents: "none",
          }}
        />

        {/* Vector SVG Schematic of MALE UAV Airframe & Propulsion Hotspots */}
        <AirframeSchematic
          payload={payload}
          viewMode={viewMode}
          focusedComponent={focusedComponent}
          onSelectComponent={handleSelectHotspot}
        />

        {/* Integrated Schematic Status Legend */}
        {showLegend && (
          <div
            className="schematic-legend"
            style={{
              position: "absolute",
              bottom: "8px",
              left: "10px",
              background: "rgba(10, 16, 30, 0.85)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "5px",
              padding: "0.3rem 0.6rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              fontSize: "0.62rem",
              fontFamily: "'JetBrains Mono', monospace",
              zIndex: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
              <span style={{ color: "#94a3b8" }}>NOMINAL</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f59e0b" }} />
              <span style={{ color: "#94a3b8" }}>CAUTION</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444" }} />
              <span style={{ color: "#94a3b8" }}>WARNING</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent-cyan)", boxShadow: "0 0 4px var(--accent-cyan)" }} />
              <span style={{ color: "var(--accent-cyan)" }}>FOCUSED SENSOR</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
