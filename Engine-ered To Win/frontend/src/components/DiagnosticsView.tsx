"use client";

import React from "react";
import { UnifiedTelemetryPayload } from "../types/telemetry";
import SensorDiagnosisPanel from "./SensorDiagnosisPanel";
import DiagnosisPanel from "./DiagnosisPanel";
import FeatureContributionPanel from "./FeatureContributionPanel";

interface DiagnosticsViewProps {
  payload: UnifiedTelemetryPayload;
}

export default function DiagnosticsView({ payload }: DiagnosticsViewProps) {
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
    status: payload.risk?.anomaly ?? "Normal",
    severity: payload.risk?.level ?? "LOW",
    fault: payload.fault_label ?? "Nominal",
    evidence: payload.risk?.action ?? "All parameters within standard cruise envelope",
    treatment: payload.risk?.action ?? "Continue standard cruise",
    prevention: "Regular line inspection of wiring harness and sensors",
    sensor_diagnosis: payload.sensor_diagnosis,
  };

  const diagType = (payload.sensor_diagnosis?.diagnosis_type || "NORMAL").toUpperCase();
  const isNormal = diagType === "NORMAL" || diagType === "NOMINAL";

  return (
    <div className="gcs-view-container diagnostics-view">
      {/* Standardized GCS View Header */}
      <div className="gcs-view-header">
        <div className="gcs-view-title-wrap">
          <h2 className="gcs-view-title">
            <span>🔬</span> SUBSYSTEM DIAGNOSTICS &amp; SENSOR FAULT ISOLATION
          </h2>
          <span className="gcs-view-tagline">
            Cross-sensor regression modeling, physics health verification, and anomaly root-cause attribution
          </span>
        </div>
        <div className="gcs-view-actions">
          <span
            className="status-pill"
            style={{
              background: isNormal ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.15)",
              color: isNormal ? "#10b981" : "#f59e0b",
              borderColor: isNormal ? "rgba(16, 185, 129, 0.35)" : "rgba(245, 158, 11, 0.35)",
              fontSize: "0.65rem",
              fontWeight: 800,
            }}
          >
            <span
              className="status-dot"
              style={{ backgroundColor: isNormal ? "#10b981" : "#f59e0b" }}
            ></span>
            STATUS: {diagType}
          </span>
        </div>
      </div>

      {/* Balanced 2-Column Responsive Layout for Diagnostic Matrix */}
      <div
        className="gcs-grid-2col"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.95rem",
          alignItems: "stretch",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <SensorDiagnosisPanel telemetry={flatTelemetry} />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <DiagnosisPanel telemetry={flatTelemetry} />
        </div>
      </div>

      {/* Feature Attribution Bottom Layer */}
      <div style={{ width: "100%" }}>
        <FeatureContributionPanel features={payload.contributing_features || []} />
      </div>
    </div>
  );
}
