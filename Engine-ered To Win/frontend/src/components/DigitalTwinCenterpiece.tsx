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

  // Component strip metrics
  const cht = payload.sensors?.cht?.value ?? payload.cht_c ?? 142.0;
  const egt = payload.sensors?.egt?.value ?? payload.egt_c ?? 615.0;
  const oilPBar = payload.oil_pressure_bar ?? (payload.sensors?.oil_pressure?.value ? payload.sensors.oil_pressure.value / 14.5038 : 4.69);
  const oilT = payload.sensors?.oil_temperature?.value ?? payload.oil_temperature_c ?? 92.0;
  const fuel = payload.sensors?.fuel_flow?.value ?? payload.fuel_flow_lh ?? 17.6;
  const mapBar = payload.manifold_pressure_bar ?? 1.24;
  const vib = payload.sensors?.vibration?.value ?? payload.vibration_g ?? 1.42;

  const tabBtnStyle = (isActive: boolean): React.CSSProperties => ({
    height: "26px",
    padding: "0 0.55rem",
    fontSize: "11.5px",
    fontFamily: "var(--font-sans), system-ui, sans-serif",
    fontWeight: isActive ? 600 : 500,
    borderRadius: "4px",
    background: isActive ? "var(--surface-2)" : "transparent",
    border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
    color: isActive ? "var(--text)" : "var(--text-muted)",
    cursor: "pointer",
    transition: "all 0.15s ease",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
  });

  return (
    <div
      className="panel digital-twin-centerpiece-panel"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "0.65rem 0.85rem",
        boxSizing: "border-box",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* Schematic Header Strip */}
      <div
        className="panel-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: "0.4rem",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Cpu size={15} style={{ color: "var(--accent)" }} />
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.05em",
              color: "var(--text-faint)",
              textTransform: "uppercase",
            }}
          >
            MALE UAV Digital Twin Schematic
          </span>
          <span
            style={{
              fontSize: "11px",
              fontFamily: "var(--font-mono), monospace",
              color: "var(--text-muted)",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              padding: "0.1rem 0.4rem",
            }}
          >
            ROTAX 914 F
          </span>
          {activeScenario && activeScenario !== "Normal" && (
            <span
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-mono), monospace",
                color: "var(--status-caution)",
                background: "color-mix(in srgb, var(--status-caution) 14%, var(--surface-1))",
                border: "1px solid color-mix(in srgb, var(--status-caution) 30%, transparent)",
                borderRadius: "4px",
                padding: "0.1rem 0.4rem",
                fontWeight: 600,
              }}
            >
              FAULT: {activeScenario}
            </span>
          )}
        </div>

        {/* View Mode Tabs per Sketch: Full drone / Engine bay / Thermal */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <button
            onClick={() => setViewMode("full")}
            style={tabBtnStyle(viewMode === "full")}
            title="View entire MALE UAV airframe"
          >
            Full drone
          </button>
          <button
            onClick={() => setViewMode("engine")}
            style={tabBtnStyle(viewMode === "engine")}
            title="Zoom into Rotax 914 F engine bay"
          >
            Engine bay
          </button>
          <button
            onClick={() => setViewMode("thermal")}
            style={tabBtnStyle(viewMode === "thermal")}
            title="Inspect propulsion thermal gradient"
          >
            Thermal
          </button>
          <button
            onClick={() => setShowLegend(!showLegend)}
            style={{
              ...tabBtnStyle(showLegend),
              color: showLegend ? "var(--accent)" : "var(--text-faint)",
            }}
            title="Toggle component legend overlay"
          >
            <Info size={11} />
            Legend
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div
        className="uav-hud-container"
        style={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--surface-2)",
          borderRadius: "8px",
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}
      >
        <AirframeSchematic
          payload={payload}
          viewMode={viewMode}
          focusedComponent={focusedComponent}
          onSelectComponent={handleSelectHotspot}
        />

        {/* Clean Corner Legend */}
        {showLegend && (
          <div
            className="schematic-legend"
            style={{
              position: "absolute",
              bottom: "8px",
              left: "10px",
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "0.25rem 0.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              fontSize: "11px",
              fontFamily: "var(--font-mono), monospace",
              zIndex: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--status-nominal)" }} />
              <span style={{ color: "var(--text-muted)" }}>Nominal</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--status-caution)" }} />
              <span style={{ color: "var(--text-muted)" }}>Caution</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--status-warning)" }} />
              <span style={{ color: "var(--text-muted)" }}>Warning</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)" }} />
              <span style={{ color: "var(--text-muted)" }}>Active/Selected</span>
            </div>
          </div>
        )}
      </div>

      {/* Slim Component Readout Strip Along Bottom (Cylinder 1-4, Oil system, Fuel rail, Turbosupercharger, Cooling) */}
      <div
        className="digital-twin-bottom-strip"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "0.4rem",
          marginTop: "0.45rem",
          paddingTop: "0.45rem",
          borderTop: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        {/* 1. Cylinders 1-4 */}
        <div
          onClick={() => handleSelectHotspot("cylinders")}
          style={{
            background: "var(--surface-2)",
            border: `1px solid ${focusedComponent === "cylinders" ? "var(--accent)" : "var(--border)"}`,
            borderRadius: "5px",
            padding: "0.25rem 0.45rem",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          <div style={{ color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600 }}>Cylinders 1-4</div>
          <div className="font-mono tabular-nums" style={{ color: "var(--text)", fontWeight: 500, marginTop: "0.1rem" }}>
            {cht.toFixed(0)}°C / {egt.toFixed(0)}°C
          </div>
        </div>

        {/* 2. Oil System */}
        <div
          onClick={() => handleSelectHotspot("oil_system")}
          style={{
            background: "var(--surface-2)",
            border: `1px solid ${focusedComponent === "oil_system" ? "var(--accent)" : "var(--border)"}`,
            borderRadius: "5px",
            padding: "0.25rem 0.45rem",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          <div style={{ color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600 }}>Oil System</div>
          <div className="font-mono tabular-nums" style={{ color: "var(--text)", fontWeight: 500, marginTop: "0.1rem" }}>
            {oilPBar.toFixed(2)} bar | {oilT.toFixed(0)}°C
          </div>
        </div>

        {/* 3. Fuel Rail */}
        <div
          onClick={() => handleSelectHotspot("fuel_system")}
          style={{
            background: "var(--surface-2)",
            border: `1px solid ${focusedComponent === "fuel_system" ? "var(--accent)" : "var(--border)"}`,
            borderRadius: "5px",
            padding: "0.25rem 0.45rem",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          <div style={{ color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600 }}>Fuel Rail</div>
          <div className="font-mono tabular-nums" style={{ color: "var(--text)", fontWeight: 500, marginTop: "0.1rem" }}>
            {fuel.toFixed(1)} L/h nominal
          </div>
        </div>

        {/* 4. Turbosupercharger */}
        <div
          onClick={() => handleSelectHotspot("turbocharger")}
          style={{
            background: "var(--surface-2)",
            border: `1px solid ${focusedComponent === "turbocharger" ? "var(--accent)" : "var(--border)"}`,
            borderRadius: "5px",
            padding: "0.25rem 0.45rem",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          <div style={{ color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600 }}>Turbocharger</div>
          <div className="font-mono tabular-nums" style={{ color: "var(--text)", fontWeight: 500, marginTop: "0.1rem" }}>
            {mapBar.toFixed(2)} bar | {vib.toFixed(2)}g
          </div>
        </div>

        {/* 5. Cooling */}
        <div
          onClick={() => handleSelectHotspot("cooling_radiator")}
          style={{
            background: "var(--surface-2)",
            border: `1px solid ${focusedComponent === "cooling_radiator" ? "var(--accent)" : "var(--border)"}`,
            borderRadius: "5px",
            padding: "0.25rem 0.45rem",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          <div style={{ color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600 }}>Cooling Loop</div>
          <div className="font-mono tabular-nums" style={{ color: "var(--text)", fontWeight: 500, marginTop: "0.1rem" }}>
            Radiator Nominal
          </div>
        </div>
      </div>
    </div>
  );
}
