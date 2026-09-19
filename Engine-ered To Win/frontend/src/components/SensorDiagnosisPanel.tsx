"use client";

import React from "react";
import { TelemetryData } from "../types/telemetry";
import { getConfidenceColor } from "../lib/limits";

interface SensorDiagnosisPanelProps {
  telemetry: TelemetryData | null;
}

const SENSOR_DISPLAY_MAP: Record<string, string> = {
  rpm: "Engine RPM",
  cht_c: "Cylinder Head Temp",
  egt_c: "Exhaust Gas Temp",
  oil_pressure_bar: "Oil Pressure",
  oil_temperature_c: "Oil Temperature",
  fuel_flow_lh: "Fuel Flow Rate",
  vibration_g: "Vibration RMS",
};

export default function SensorDiagnosisPanel({ telemetry }: SensorDiagnosisPanelProps) {
  const diag = telemetry?.sensor_diagnosis;
  const diagType = diag?.diagnosis_type || "NORMAL";
  let diagBadgeClass = "diag-badge-normal";
  if (diagType === "POSSIBLE_SENSOR_FAILURE") diagBadgeClass = "diag-badge-sensor";
  else if (diagType === "POSSIBLE_ENGINE_FAILURE") diagBadgeClass = "diag-badge-engine";
  else if (diagType !== "NORMAL") diagBadgeClass = "diag-badge-unknown";

  const diagBadgeText = diagType.replace(/_/g, " ");
  const suspectedSensor = diag?.suspected_sensor;
  const sensorConfRatio = diag?.sensor_fault_confidence ?? 0;
  const engineConfRatio = diag?.engine_fault_confidence ?? 0;
  const sensorConf = (sensorConfRatio * 100).toFixed(0) + "%";
  const engineConf = (engineConfRatio * 100).toFixed(0) + "%";
  const persistence = diag ? `${diag.persistence_count}/5` : "0/5";

  const scores = diag?.sensor_scores || {};
  const sensorsList = [
    { key: "rpm", label: "Engine RPM" },
    { key: "cht_c", label: "Cylinder Head Temp" },
    { key: "egt_c", label: "Exhaust Gas Temp" },
    { key: "oil_pressure_bar", label: "Oil Pressure" },
    { key: "oil_temperature_c", label: "Oil Temperature" },
    { key: "fuel_flow_lh", label: "Fuel Flow Rate" },
    { key: "vibration_g", label: "Vibration RMS" },
  ];

  const evidence =
    diag?.evidence ||
    "All engine sensors operating within expected cross-predicted relationships. No sensor or engine anomaly detected.";

  return (
    <div className="panel" id="sensor-diag-section">
      <div className="panel-header">
        <span className="panel-title">
          <strong>SENSOR VS ENGINE DIAGNOSIS</strong>
        </span>
        <span id="diag-diagnosis-badge" className={`diag-diagnosis-badge ${diagBadgeClass}`}>
          <strong>{diagBadgeText}</strong>
        </span>
      </div>

      {/* Suspected Sensor */}
      {suspectedSensor && (
        <div className="diag-suspected-sensor" id="diag-suspected-row" style={{ display: "flex", padding: "0 0.5rem" }}>
          <span className="diag-suspected-label"><strong>Suspected Sensor:</strong></span>
          <span className="diag-suspected-val" id="diag-suspected-val">
            <strong>{SENSOR_DISPLAY_MAP[suspectedSensor] || suspectedSensor}</strong>
          </span>
        </div>
      )}

      {/* Confidence Scores */}
      <div className="diag-confidence-row">
        <div className="diag-conf-item">
          <div className="diag-conf-label"><strong>SENSOR FAULT CONF.</strong></div>
          <div
            className="diag-conf-val"
            id="diag-sensor-conf"
            style={{ color: getConfidenceColor(sensorConfRatio) }}
          >
            {sensorConf}
          </div>
        </div>
        <div className="diag-conf-item">
          <div className="diag-conf-label"><strong>ENGINE FAULT CONF.</strong></div>
          <div
            className="diag-conf-val"
            id="diag-engine-conf"
            style={{ color: getConfidenceColor(engineConfRatio) }}
          >
            {engineConf}
          </div>
        </div>
        <div className="diag-conf-item">
          <div className="diag-conf-label"><strong>PERSISTENCE</strong></div>
          <div className="diag-conf-val" id="diag-persistence" style={{ color: "var(--accent-cyan)" }}>
            {persistence}
          </div>
        </div>
      </div>

      {/* Sensor Anomaly Score Bars */}
      <div className="diag-section-header" style={{ marginTop: "0.85rem", padding: "0 0.2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span><strong>Sensor Anomaly Scores</strong></span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.65rem", color: "var(--accent-rose)", fontFamily: "'JetBrains Mono', monospace" }}>
            <span style={{ display: "inline-block", width: "8px", height: "2px", background: "var(--accent-rose)" }}></span>
            3σ THRESHOLD (3.0)
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.65rem",
              color: "var(--accent-cyan)",
            }}
          >
            CROSS-PREDICTION Σ
          </span>
        </div>
      </div>
      <div className="sensor-bars-container" id="sensor-bars-container">
        {sensorsList.map((s) => {
          const score = scores[s.key] || 0;
          const pct = Math.min((score / 10) * 100, 100);
          let fillClass = "sensor-bar-fill";
          if (score > 3.0) fillClass += " critical";
          else if (score > 1.5) fillClass += " elevated";

          return (
            <div key={s.key} className="sensor-bar-row">
              <span className="sensor-bar-label" style={{ width: "120px", textTransform: "none", fontSize: "0.7rem" }}>
                {s.label}
              </span>
              <div className="sensor-bar-track" style={{ position: "relative" }}>
                <div
                  className={fillClass}
                  id={`sbar-${s.key}`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
                {/* 3-sigma threshold line at 3.0 / 10 = 30% */}
                <div
                  style={{
                    position: "absolute",
                    left: "30%",
                    top: 0,
                    bottom: 0,
                    width: "2px",
                    background: "rgba(239, 68, 68, 0.8)",
                    boxShadow: "0 0 4px rgba(239, 68, 68, 0.5)",
                    zIndex: 2,
                    pointerEvents: "none",
                  }}
                  title="3σ Anomaly Threshold (3.0)"
                />
              </div>
              <span className="sensor-bar-score" id={`sscore-${s.key}`}>
                {score.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Evidence */}
      <div className="diag-evidence-box" id="diag-evidence">
        {evidence}
      </div>
    </div>
  );
}
