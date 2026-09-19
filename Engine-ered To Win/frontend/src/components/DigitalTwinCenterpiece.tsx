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
  // Unified geometric token for all 5 controls/badges
  const unifiedControlStyle: React.CSSProperties = {
    height: "28px",
    minHeight: "28px",
    maxHeight: "28px",
    boxSizing: "border-box",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 0.65rem",
    fontSize: "0.68rem",
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 700,
    letterSpacing: "0.03em",
    borderRadius: "4px",
    lineHeight: 1,
    whiteSpace: "nowrap",
  };

  return (
    <div className="panel digital-twin-centerpiece-panel" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Schematic Header Strip */}
      <div
        className="panel-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.5rem",
          paddingBottom: "0.45rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <Cpu size={16} style={{ color: "var(--accent-cyan)" }} />
            <span className="panel-title" style={{ fontSize: "0.82rem", fontWeight: 800, letterSpacing: "0.5px" }}>
              MALE UAV PROPULSION DIGITAL TWIN
            </span>
          </div>
          {activeScenario && activeScenario !== "Normal" && (
            <span
              style={{
                ...unifiedControlStyle,
                color: "#ef4444",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
              }}
            >
              SIM: {activeScenario}
            </span>
          )}
        </div>

        {/* View Mode Controls & Legend Toggle - EXACT SAME 28PX SIZE FOR ALL 5 BADGES/BUTTONS */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
          {/* 1. AERO PISTON 4-CYL Badge */}
          <span
            style={{
              ...unifiedControlStyle,
              color: "var(--accent-cyan)",
              background: "rgba(56, 189, 248, 0.12)",
              border: "1px solid rgba(56, 189, 248, 0.35)",
              boxShadow: "0 0 8px rgba(56, 189, 248, 0.1)",
            }}
          >
            AERO PISTON 4-CYL
          </span>

          {/* 2. LEGEND Toggle Button */}
          <button
            onClick={() => setShowLegend(!showLegend)}
            title="Toggle component & status legend"
            style={{
              ...unifiedControlStyle,
              background: showLegend ? "rgba(56, 189, 248, 0.18)" : "rgba(255, 255, 255, 0.04)",
              border: `1px solid ${showLegend ? "var(--accent-cyan)" : "rgba(255, 255, 255, 0.12)"}`,
              color: showLegend ? "var(--accent-cyan)" : "#94a3b8",
              cursor: "pointer",
              gap: "0.3rem",
              transition: "all 0.15s ease",
            }}
          >
            <Info size={12} />
            LEGEND
          </button>

          {/* 3. AIRFRAME Mode Button */}
          <button
            onClick={() => setViewMode("full")}
            title="Airframe full overview mode"
            style={{
              ...unifiedControlStyle,
              background: viewMode === "full" ? "rgba(56, 189, 248, 0.22)" : "rgba(255, 255, 255, 0.04)",
              border: `1px solid ${viewMode === "full" ? "var(--accent-cyan)" : "rgba(255, 255, 255, 0.12)"}`,
              color: viewMode === "full" ? "var(--accent-cyan)" : "#94a3b8",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            AIRFRAME
          </button>

          {/* 4. ENGINE BAY Mode Button */}
          <button
            onClick={() => setViewMode("engine")}
            title="Magnify Rotax 914 F propulsion bay"
            style={{
              ...unifiedControlStyle,
              background: viewMode === "engine" ? "rgba(56, 189, 248, 0.22)" : "rgba(255, 255, 255, 0.04)",
              border: `1px solid ${viewMode === "engine" ? "var(--accent-cyan)" : "rgba(255, 255, 255, 0.12)"}`,
              color: viewMode === "engine" ? "var(--accent-cyan)" : "#94a3b8",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            ENGINE BAY
          </button>

          {/* 5. THERMAL HUD Mode Button */}
          <button
            onClick={() => setViewMode("thermal")}
            title="FLIR Infrared thermal gradient mode"
            style={{
              ...unifiedControlStyle,
              background: viewMode === "thermal" ? "rgba(56, 189, 248, 0.22)" : "rgba(255, 255, 255, 0.04)",
              border: `1px solid ${viewMode === "thermal" ? "var(--accent-cyan)" : "rgba(255, 255, 255, 0.12)"}`,
              color: viewMode === "thermal" ? "var(--accent-cyan)" : "#94a3b8",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            THERMAL HUD
          </button>
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

        {/* Integrated Schematic Status & Subsystem Legend */}
        {showLegend && (
          <div
            className="schematic-legend"
            style={{
              position: "absolute",
              bottom: "8px",
              left: "10px",
              background: "rgba(10, 16, 30, 0.92)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "5px",
              padding: "0.35rem 0.65rem",
              display: "flex",
              alignItems: "center",
              gap: "0.65rem",
              fontSize: "0.62rem",
              fontFamily: "'JetBrains Mono', monospace",
              zIndex: 10,
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.5)",
              flexWrap: "wrap",
            }}
          >
            {/* Status Pills */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 5px #10b981" }} />
              <span style={{ color: "#cbd5e1" }}>NOMINAL</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f59e0b", boxShadow: "0 0 5px #f59e0b" }} />
              <span style={{ color: "#cbd5e1" }}>CAUTION</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 5px #ef4444" }} />
              <span style={{ color: "#cbd5e1" }}>WARNING</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent-cyan)", boxShadow: "0 0 5px var(--accent-cyan)" }} />
              <span style={{ color: "var(--accent-cyan)" }}>FOCUSED</span>
            </div>

            <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>|</span>

            {/* Subsystem Color Palette Identifiers */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "2px", background: "#38bdf8" }} />
              <span style={{ color: "#94a3b8" }}>AIRFRAME</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "2px", background: "#10b981" }} />
              <span style={{ color: "#94a3b8" }}>FUEL</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "2px", background: "#64748b" }} />
              <span style={{ color: "#94a3b8" }}>CYLINDERS</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "2px", background: "#a855f7" }} />
              <span style={{ color: "#94a3b8" }}>EXHAUST</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "2px", background: "#ea580c" }} />
              <span style={{ color: "#94a3b8" }}>TURBO</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "2px", background: "#0284c7" }} />
              <span style={{ color: "#94a3b8" }}>OIL</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "2px", background: "#facc15" }} />
              <span style={{ color: "#94a3b8" }}>PROP</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
