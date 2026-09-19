"use client";

import React from "react";
import { UnifiedTelemetryPayload } from "../types/telemetry";
import EngineSensorsPanel from "./EngineSensorsPanel";
import TelemetryChart from "./TelemetryChart";
import TelemetryGauges from "./TelemetryGauges";
import DigitalTwinResidualChart from "./telemetry/DigitalTwinResidualChart";
import { Activity, Cpu } from "lucide-react";

interface LiveTelemetryViewProps {
  payload: UnifiedTelemetryPayload;
}

export default function LiveTelemetryView({ payload }: LiveTelemetryViewProps) {
  const [telemetryMode, setTelemetryMode] = React.useState<"waveforms" | "residual">("waveforms");

  // Convert payload to TelemetryData format for TelemetryChart & TelemetryGauges
  const flatTelemetry = {
    timestamp: payload.timestamp,
    engine_id: payload.vehicle?.vehicle_id || "ENG_001",
    rpm: payload.sensors?.rpm?.value ?? payload.rpm ?? 2450,
    cht_c: payload.sensors?.cht?.value ?? payload.cht_c ?? 142.0,
    egt_c: payload.sensors?.egt?.value ?? payload.egt_c ?? 615.0,
    oil_pressure_bar: payload.sensors?.oil_pressure?.value
      ? payload.sensors.oil_pressure.value / 14.5038
      : (payload.oil_pressure_bar ?? 4.7),
    oil_temperature_c: payload.sensors?.oil_temperature?.value ?? payload.oil_temperature_c ?? 92.0,
    fuel_flow_lh: payload.sensors?.fuel_flow?.value ?? payload.fuel_flow_lh ?? 17.6,
    vibration_g: payload.sensors?.vibration?.value ?? payload.vibration_g ?? 1.42,
    battery_voltage_v: payload.sensors?.bus_voltage?.value ?? payload.battery_voltage_v ?? 27.6,
    injection_timing_deg: payload.sensors?.injection_timing?.value ?? payload.injection_timing_deg ?? 23.4,
    health_index: payload.health_index ?? 72,
    rul: payload.prognostics?.predicted_rul ?? 117,
    fault_label: payload.fault_label ?? "Normal",
  };

  return (
    <div className="view-container live-telemetry-view" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="view-header-strip" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h2 className="view-title" style={{ margin: 0, fontSize: "1.2rem", letterSpacing: "0.04em" }}>
            <strong>9-CHANNEL LIVE TELEMETRY &amp; DYNAMICS</strong>
          </h2>
          <p className="view-subtitle" style={{ margin: "0.2rem 0 0", fontSize: "0.72rem", color: "#64748b" }}>
            High-frequency 1 Hz avionics telemetry stream, min/max envelopes, and digital twin analytical residuals
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* Mode Switcher */}
          <div style={{ display: "flex", gap: "0.3rem" }} role="tablist" aria-label="Telemetry display modes">
            <button
              role="tab"
              aria-selected={telemetryMode === "waveforms"}
              onClick={() => setTelemetryMode("waveforms")}
              className={`filter-pill-btn ${telemetryMode === "waveforms" ? "active" : ""}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.25rem 0.6rem",
                fontSize: "0.68rem",
                fontWeight: 700,
                background: telemetryMode === "waveforms" ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.04)",
                color: telemetryMode === "waveforms" ? "var(--accent-cyan)" : "#94a3b8",
                border: `1px solid ${telemetryMode === "waveforms" ? "rgba(56, 189, 248, 0.4)" : "rgba(255, 255, 255, 0.08)"}`,
                borderRadius: "4px",
                fontFamily: "'JetBrains Mono', monospace",
                cursor: "pointer",
              }}
            >
              <Activity size={12} />
              <span>WAVEFORMS &amp; GAUGES</span>
            </button>

            <button
              role="tab"
              aria-selected={telemetryMode === "residual"}
              onClick={() => setTelemetryMode("residual")}
              className={`filter-pill-btn ${telemetryMode === "residual" ? "active" : ""}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.25rem 0.6rem",
                fontSize: "0.68rem",
                fontWeight: 700,
                background: telemetryMode === "residual" ? "rgba(168, 85, 247, 0.15)" : "rgba(255, 255, 255, 0.04)",
                color: telemetryMode === "residual" ? "var(--accent-purple)" : "#94a3b8",
                border: `1px solid ${telemetryMode === "residual" ? "rgba(168, 85, 247, 0.4)" : "rgba(255, 255, 255, 0.08)"}`,
                borderRadius: "4px",
                fontFamily: "'JetBrains Mono', monospace",
                cursor: "pointer",
              }}
            >
              <Cpu size={12} />
              <span>TWIN RESIDUAL OVERLAY</span>
            </button>
          </div>

          <span className="badge-live-pulse" style={{ fontSize: "0.68rem", padding: "0.25rem 0.55rem" }}>
            LIVE 1 Hz STREAM
          </span>
        </div>
      </div>

      {telemetryMode === "residual" ? (
        <div style={{ height: "600px" }}>
          <DigitalTwinResidualChart />
        </div>
      ) : (
        <div className="telemetry-view-grid">
          {/* Left Column: Detailed 9-Sensor Panel */}
          <div className="telemetry-col-left">
            <EngineSensorsPanel sensors={payload.sensor_list || []} />
          </div>

          {/* Right Column: Dynamic Time-Series Waveforms & Gauge Clusters */}
          <div className="telemetry-col-right">
            {/* Real-Time 30-Second Thermal Waveforms */}
            <div className="telemetry-chart-card">
              <TelemetryChart telemetry={flatTelemetry} />
            </div>

            {/* Analog/Digital Multi-Gauge Cluster */}
            <div className="telemetry-gauges-card">
              <TelemetryGauges telemetry={flatTelemetry} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
