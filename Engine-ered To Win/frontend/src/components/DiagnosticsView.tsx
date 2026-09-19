"use client";

import React from "react";
import { UnifiedTelemetryPayload } from "../types/telemetry";
import SensorDiagnosisPanel from "./SensorDiagnosisPanel";
import DiagnosisPanel from "./DiagnosisPanel";
import FeatureContributionPanel from "./FeatureContributionPanel";
import PageLayout from "./common/PageLayout";
import { Cpu } from "lucide-react";

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

  const isNominal = (payload.sensor_diagnosis?.diagnosis_type || "NORMAL") === "NORMAL";

  return (
    <PageLayout
      title="Subsystem Diagnostics & Sensor Fault Isolation"
      subtitle="Cross-sensor regression modeling, physics health verification, and anomaly root-cause attribution"
      icon={<Cpu size={18} />}
      tags={
        <span
          className="nav-tag"
          style={{
            color: isNominal ? "var(--status-nominal)" : "var(--status-caution)",
            borderColor: "var(--border)",
            fontFamily: "var(--font-mono), monospace",
          }}
        >
          DIAGNOSIS: {payload.sensor_diagnosis?.diagnosis_type || "NORMAL"}
        </span>
      }
    >
      {/* Balanced 2-Column Responsive Layout */}
      <div
        className="diagnostics-two-col-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
          gap: "0.85rem",
          flex: 1,
          minHeight: 0,
          alignItems: "start",
        }}
      >
        {/* Left Column: Diagnostics Panels */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <DiagnosisPanel telemetry={flatTelemetry} />
          <SensorDiagnosisPanel telemetry={flatTelemetry} />
        </div>

        {/* Right Column: SHAP Feature Attribution & Gradients */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <FeatureContributionPanel
            features={payload.contributing_features || []}
            telemetry={flatTelemetry}
            activeScenario={payload.scenario}
          />
        </div>
      </div>
    </PageLayout>
  );
}
