"use client";

import React from "react";
import { UnifiedTelemetryPayload } from "../types/telemetry";
import SensorDiagnosisPanel from "./SensorDiagnosisPanel";
import FeatureContributionPanel from "./FeatureContributionPanel";
import RegressionMatrixPanel from "./diagnostics/RegressionMatrixPanel";
import RecentTrendsCard from "./RecentTrendsCard";
import DiagnosisAdvisory from "./diagnostics/DiagnosisAdvisory";
import PageLayout from "./common/PageLayout";
import { Cpu, Activity } from "lucide-react";

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
      subtitle="Cross-sensor regression modeling, 4-grid correlation analysis, and anomaly root-cause attribution"
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
      {/* 1. TOP HORIZONTAL FULL-WIDTH SECTION: SENSOR VS ENGINE DIAGNOSIS */}
      <SensorDiagnosisPanel telemetry={flatTelemetry} />

      {/* 2. EXPLAINABLE PHM FEATURE ATTRIBUTION MATRIX */}
      <div style={{ marginTop: "1rem" }}>
        <FeatureContributionPanel
          features={payload.contributing_features || []}
          telemetry={flatTelemetry}
          activeScenario={payload.scenario}
        />
      </div>

      {/* 3. MULTI-CORRELATION REGRESSION MATRIX & 30-CYCLE TEMPORAL SEQUENCE MEMORY */}
      <div
        className="regression-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1.15fr 1fr",
          gap: "1.25rem",
          alignItems: "start",
          marginTop: "1.25rem",
        }}
      >
        {/* Left Column: 4-Grid Multi-Correlation Regression Matrix */}
        <RegressionMatrixPanel />

        {/* Right Column: 30-Cycle Temporal Trends Card & Propulsion Advisory */}
        <div className="regression-trends-col" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <RecentTrendsCard
            points={payload.recent_trends?.points || []}
            deltas={
              payload.recent_trends?.deltas || {
                egt_delta: 0,
                oil_pressure_delta: 0,
                vibration_delta: 0,
                health_delta: 0,
              }
            }
          />

          <div
            className="panel"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "1rem 1.15rem",
            }}
          >
            <div className="panel-header" style={{ marginBottom: "0.6rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border)" }}>
              <div className="panel-title flex items-center gap-2">
                <Activity className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <span style={{ fontWeight: 800, fontSize: "0.85rem", letterSpacing: "0.5px" }}>
                  PROPULSION HEALTH DIRECTIVE &amp; ADVISORY
                </span>
              </div>
            </div>
            <DiagnosisAdvisory telemetry={flatTelemetry} />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
