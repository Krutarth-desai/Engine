"use client";

import React from "react";
import { TelemetryData } from "../types/telemetry";
import { getConfidenceColor } from "../lib/limits";
import { Cpu } from "lucide-react";

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
  const isSensorFault = diagType === "POSSIBLE_SENSOR_FAILURE";
  const isEngineFault = diagType === "POSSIBLE_ENGINE_FAILURE";

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

  const badgeColor = isEngineFault
    ? "var(--status-warning)"
    : isSensorFault
    ? "var(--status-caution)"
    : "var(--status-nominal)";

  return (
    <div
      className="card panel sensor-diagnosis-horizontal-panel"
      id="sensor-diag-section"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "0.75rem 1.15rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.65rem",
      }}
    >
      {/* Panel Header */}
      <div
        className="panel-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "0.45rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <Cpu size={16} style={{ color: "var(--accent)" }} />
          <span
            className="panel-title"
            style={{
              fontSize: "13px",
              fontWeight: 600,
              letterSpacing: "0.05em",
              color: "var(--text)",
            }}
          >
            SENSOR VS ENGINE DIAGNOSIS
          </span>
          {suspectedSensor && (
            <span
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-mono), monospace",
                color: "var(--status-caution)",
                background: "color-mix(in srgb, var(--status-caution) 14%, var(--surface-1))",
                border: "1px solid color-mix(in srgb, var(--status-caution) 30%, transparent)",
                borderRadius: "4px",
                padding: "0.1rem 0.45rem",
                fontWeight: 600,
              }}
            >
              SUSPECTED: {SENSOR_DISPLAY_MAP[suspectedSensor] || suspectedSensor}
            </span>
          )}
        </div>

        <span
          id="diag-diagnosis-badge"
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: badgeColor,
            background: `color-mix(in srgb, ${badgeColor} 14%, var(--surface-1))`,
            border: `1px solid color-mix(in srgb, ${badgeColor} 30%, transparent)`,
            borderRadius: "4px",
            padding: "0.15rem 0.55rem",
            fontFamily: "var(--font-mono), monospace",
            letterSpacing: "0.04em",
          }}
        >
          {diagBadgeText}
        </span>
      </div>

      {/* Main Horizontal Layout Split: Left (Confidence & Evidence) | Right (Anomaly Bars Grid) */}
      <div
        className="sensor-diag-horizontal-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "340px 1fr",
          gap: "1rem",
          alignItems: "stretch",
        }}
      >
        {/* Left Column: 3 Confidence Metric Tiles + Cross-Isolation Evidence Box */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", justifyContent: "space-between" }}>
          {/* Confidence Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.45rem" }}>
            <div
              className="card"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "0.45rem 0.55rem",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "10.5px", color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600 }}>
                Sensor Conf
              </div>
              <div
                className="font-mono tabular-nums"
                id="diag-sensor-conf"
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  marginTop: "0.15rem",
                  color: getConfidenceColor(sensorConfRatio),
                }}
              >
                {sensorConf}
              </div>
            </div>

            <div
              className="card"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "0.45rem 0.55rem",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "10.5px", color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600 }}>
                Engine Conf
              </div>
              <div
                className="font-mono tabular-nums"
                id="diag-engine-conf"
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  marginTop: "0.15rem",
                  color: getConfidenceColor(engineConfRatio),
                }}
              >
                {engineConf}
              </div>
            </div>

            <div
              className="card"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "0.45rem 0.55rem",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "10.5px", color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600 }}>
                Persistence
              </div>
              <div
                className="font-mono tabular-nums"
                id="diag-persistence"
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  marginTop: "0.15rem",
                  color: "var(--text)",
                }}
              >
                {persistence}
              </div>
            </div>
          </div>

          {/* Evidence Box */}
          <div
            className="diag-evidence-box"
            id="diag-evidence"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "0.55rem 0.75rem",
              fontSize: "11.5px",
              color: "var(--text-muted)",
              lineHeight: 1.4,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: "10.5px",
                textTransform: "uppercase",
                color: "var(--text-faint)",
                fontWeight: 600,
                letterSpacing: "0.04em",
                marginBottom: "0.2rem",
              }}
            >
              Cross-Isolation Evidence:
            </span>
            <span style={{ color: "var(--text)" }}>{evidence}</span>
          </div>
        </div>

        {/* Right Column: Sensor Anomaly Scores in a Balanced 2-Column Grid */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "0.55rem 0.85rem",
          }}
        >
          {/* Anomaly Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Cross-Predicted Sensor Anomaly Scores
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "10.5px", fontFamily: "var(--font-mono), monospace" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "var(--status-warning)" }}>
                <span style={{ display: "inline-block", width: "8px", height: "2px", background: "var(--status-warning)" }}></span>
                3σ THRESHOLD (3.0)
              </span>
              <span style={{ color: "var(--text-muted)" }}>
                CROSS-PREDICTION Σ
              </span>
            </div>
          </div>

          {/* 2-Column Grid for Sensor Bars */}
          <div
            className="sensor-bars-container"
            id="sensor-bars-container"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.35rem 0.85rem",
              marginTop: 0,
            }}
          >
            {sensorsList.map((s) => {
              const score = scores[s.key] || 0;
              const pct = Math.min((score / 10) * 100, 100);
              const barColor =
                score > 3.0
                  ? "var(--status-warning)"
                  : score > 1.5
                  ? "var(--status-caution)"
                  : "var(--accent)";

              return (
                <div
                  key={s.key}
                  className="sensor-bar-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.45rem",
                  }}
                >
                  <span
                    className="sensor-bar-label"
                    style={{
                      width: "115px",
                      fontSize: "11px",
                      color: "var(--text-muted)",
                      textAlign: "left",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={s.label}
                  >
                    {s.label}
                  </span>

                  <div
                    className="sensor-bar-track"
                    style={{
                      flex: 1,
                      height: "8px",
                      background: "var(--surface-3)",
                      borderRadius: "2px",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.max(pct, 2)}%`,
                        background: barColor,
                        borderRadius: "2px",
                        transition: "width 0.25s ease",
                      }}
                    />
                    {/* 3-sigma threshold mark at 30% */}
                    <div
                      style={{
                        position: "absolute",
                        left: "30%",
                        top: 0,
                        bottom: 0,
                        width: "1.5px",
                        background: "var(--status-warning)",
                        zIndex: 2,
                        pointerEvents: "none",
                      }}
                      title="3σ Threshold"
                    />
                  </div>

                  <span
                    className="sensor-bar-score font-mono tabular-nums"
                    style={{
                      width: "28px",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: score > 3.0 ? "var(--status-warning)" : score > 1.5 ? "var(--status-caution)" : "var(--text)",
                      textAlign: "right",
                    }}
                  >
                    {score.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
