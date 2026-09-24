"use client";

import React from "react";
import { UnifiedTelemetryPayload } from "../types/telemetry";
import { useTelemetry } from "@/context/TelemetryContext";
import EngineSensorsPanel from "./EngineSensorsPanel";
import TelemetryChart from "./TelemetryChart";
import TelemetryGauges from "./TelemetryGauges";

interface LiveTelemetryViewProps {
  payload: UnifiedTelemetryPayload;
}

export default function LiveTelemetryView({ payload }: LiveTelemetryViewProps) {
  const { connectionStatus, isConnected, forceResumeLiveStream, mode } = useTelemetry();

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

  const isLive = isConnected && connectionStatus === "CONNECTED";

  return (
    <div className="gcs-view-container live-telemetry-view">
      {/* Standardized GCS View Header */}
      <div className="gcs-view-header">
        <div className="gcs-view-title-wrap">
          <h2 className="gcs-view-title">
            <span>📊</span> 9-CHANNEL LIVE TELEMETRY &amp; TIME-SERIES DYNAMICS
          </h2>
          <span className="gcs-view-tagline">
            High-frequency 1 Hz avionics telemetry stream, min/max envelopes, and rolling thermal waveforms
          </span>
        </div>
        <div className="gcs-view-actions" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {!isLive && (
            <button
              className="gcs-btn gcs-btn-sm gcs-btn-primary"
              onClick={() => forceResumeLiveStream()}
              style={{
                fontSize: "0.7rem",
                padding: "0.3rem 0.75rem",
                animation: "pulse 1.5s infinite",
              }}
            >
              ▶ RESUME LIVE STREAM
            </button>
          )}

          <span
            className="status-pill"
            onClick={() => forceResumeLiveStream()}
            title="Click to reconnect/resume stream"
            style={{
              cursor: "pointer",
              background: isLive ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.15)",
              color: isLive ? "#10b981" : "#f59e0b",
              borderColor: isLive ? "rgba(16, 185, 129, 0.35)" : "rgba(245, 158, 11, 0.4)",
              fontSize: "0.65rem",
              fontWeight: 800,
            }}
          >
            <span
              className="status-dot"
              style={{ backgroundColor: isLive ? "#10b981" : "#f59e0b" }}
            ></span>
            {isLive ? `LIVE 1 Hz (TICK #${payload.tick ?? payload.cycle ?? 0})` : "STREAM PAUSED / CLICK TO RESUME"}
          </span>
        </div>
      </div>

      {/* Balanced 2-Column Desktop Grid */}
      <div
        className="gcs-split-hero"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(380px, 38%) 1fr",
          gap: "0.95rem",
          alignItems: "stretch",
        }}
      >
        {/* Left Column: Detailed 9-Sensor Panel */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <EngineSensorsPanel sensors={payload.sensor_list || []} />
        </div>

        {/* Right Column: Dynamic Time-Series Waveforms & Gauge Clusters */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.95rem" }}>
          {/* Real-Time 30-Second Thermal Waveforms */}
          <div className="gcs-card" style={{ padding: "0.75rem" }}>
            <TelemetryChart telemetry={flatTelemetry} />
          </div>

          {/* Analog/Digital Multi-Gauge Cluster */}
          <div className="gcs-card" style={{ padding: "0.75rem" }}>
            <TelemetryGauges telemetry={flatTelemetry} />
          </div>
        </div>
      </div>
    </div>
  );
}
