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
    fontFamily: "var(--font-mono), monospace",
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
            <Cpu size={16} style={{ color: "var(--accent)" }} />
            <span className="panel-title" style={{ fontSize: "0.82rem", fontWeight: 800, letterSpacing: "0.5px" }}>
              MALE UAV PROPULSION DIGITAL TWIN
            </span>
          </div>
          {activeScenario && activeScenario !== "Normal" && (
            <span
              style={{
                ...unifiedControlStyle,
                color: "var(--status-warning)",
                background: "var(--surface-1)",
                border: "1px solid color-mix(in srgb, var(--status-warning) 14%, var(--surface-1))",
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
              color: "var(--accent)",
              background: "var(--border)",
              border: "1px solid var(--border)",
              boxShadow: "none",
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
              background: showLegend ? "var(--border)" : "var(--border)",
              border: `1px solid ${showLegend ? "var(--accent)" : "var(--border-strong)"}`,
              color: showLegend ? "var(--accent)" : "var(--text-muted)",
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
              background: viewMode === "full" ? "var(--border)" : "var(--border)",
              border: `1px solid ${viewMode === "full" ? "var(--accent)" : "var(--border-strong)"}`,
              color: viewMode === "full" ? "var(--accent)" : "var(--text-muted)",
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
              background: viewMode === "engine" ? "var(--border)" : "var(--border)",
              border: `1px solid ${viewMode === "engine" ? "var(--accent)" : "var(--border-strong)"}`,
              color: viewMode === "engine" ? "var(--accent)" : "var(--text-muted)",
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
              background: viewMode === "thermal" ? "var(--border)" : "var(--border)",
              border: `1px solid ${viewMode === "thermal" ? "var(--accent)" : "var(--border-strong)"}`,
              color: viewMode === "thermal" ? "var(--accent)" : "var(--text-muted)",
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
          background: "var(--surface-1)",
          borderRadius: "8px",
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}
      >
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
              background: "var(--surface-1)",
              backdropFilter: "blur(8px)",
              border: "1px solid var(--border)",
              borderRadius: "5px",
              padding: "0.35rem 0.65rem",
              display: "flex",
              alignItems: "center",
              gap: "0.65rem",
              fontSize: "0.62rem",
              fontFamily: "var(--font-mono), monospace",
              zIndex: 10,
              boxShadow: "0 4px 16px var(--bg)",
              flexWrap: "wrap",
            }}
          >
            {/* Status Pills */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--status-nominal)", boxShadow: "none" }} />
              <span style={{ color: "var(--text)" }}>NOMINAL</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--status-caution)", boxShadow: "none" }} />
              <span style={{ color: "var(--text)" }}>CAUTION</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--status-warning)", boxShadow: "none" }} />
              <span style={{ color: "var(--text)" }}>WARNING</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", boxShadow: "none" }} />
              <span style={{ color: "var(--accent)" }}>FOCUSED</span>
            </div>

            <span style={{ color: "var(--border)" }}>|</span>

            {/* Subsystem Color Palette Identifiers */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "2px", background: "var(--accent)" }} />
              <span style={{ color: "var(--text-muted)" }}>AIRFRAME</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "2px", background: "var(--status-nominal)" }} />
              <span style={{ color: "var(--text-muted)" }}>FUEL</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "2px", background: "var(--text-muted)" }} />
              <span style={{ color: "var(--text-muted)" }}>CYLINDERS</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "2px", background: "var(--surface-3)" }} />
              <span style={{ color: "var(--text-muted)" }}>EXHAUST</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "2px", background: "var(--status-warning)" }} />
              <span style={{ color: "var(--text-muted)" }}>TURBO</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "2px", background: "var(--accent)" }} />
              <span style={{ color: "var(--text-muted)" }}>OIL</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "2px", background: "var(--status-caution)" }} />
              <span style={{ color: "var(--text-muted)" }}>PROP</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
