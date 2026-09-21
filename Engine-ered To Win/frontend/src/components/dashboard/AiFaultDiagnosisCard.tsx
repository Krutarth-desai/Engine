"use client";

import React from "react";
import { UnifiedTelemetryPayload } from "@/types/telemetry";
import { SCENARIOS_BY_ID } from "@/lib/scenarios";
import { Zap } from "lucide-react";

interface AiFaultDiagnosisCardProps {
  payload: UnifiedTelemetryPayload;
  activeScenario: string;
  onInjectScenario?: (scenario: string) => void;
  onNavigate?: () => void;
}

export default function AiFaultDiagnosisCard({
  payload,
  activeScenario,
  onNavigate,
}: AiFaultDiagnosisCardProps) {
  const isSimulationActive = Boolean(activeScenario && activeScenario !== "Normal");
  const diagnosis = payload.sensor_diagnosis;
  const scenarioDef = SCENARIOS_BY_ID.get(activeScenario || payload.fault_label || "");
  const displayFaultLabel =
    scenarioDef && scenarioDef.id !== "Normal"
      ? scenarioDef.label
      : payload.fault_label && payload.fault_label !== "Normal"
      ? payload.fault_label.replace(/_/g, " ")
      : "Nominal Cruise";

  const confidencePct = Math.round(
    ((diagnosis?.engine_fault_confidence ?? (isSimulationActive ? 0.95 : 0.94)) * 100)
  );
  const rawAnomalyScore = payload.anomaly_score !== undefined
    ? Number(payload.anomaly_score)
    : isSimulationActive
    ? 0.842
    : 0.028;
  const anomalyScore = rawAnomalyScore.toFixed(3);

  const evidenceText =
    diagnosis?.evidence ||
    payload.evidence ||
    (isSimulationActive
      ? `Simulated fault condition active for ${displayFaultLabel}. Review subsystem telemetry.`
      : "Cross-sensor telemetry correlates nominally with calibrated baseline bounds.");

  const isFault = isSimulationActive || (payload.fault_label !== undefined && payload.fault_label !== "Normal");
  const isolationStatus =
    diagnosis?.diagnosis_type ||
    (isSimulationActive ? "ISOLATED (FAULT ACTIVE)" : "NOMINAL");

  return (
    <div
      className="card"
      style={{
        background: "var(--surface-1)",
        border: isFault
          ? "1px solid color-mix(in srgb, var(--status-caution) 35%, var(--border))"
          : "1px solid var(--border)",
        borderRadius: "10px",
        padding: "0.75rem 1rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "0.5rem",
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* Card Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.05em",
            color: "var(--text-faint)",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <Zap size={13} style={{ color: "var(--accent)" }} />
          AI Fault Diagnosis
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          {isFault ? (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--status-caution)",
                background: "color-mix(in srgb, var(--status-caution) 14%, var(--surface-1))",
                border: "1px solid color-mix(in srgb, var(--status-caution) 30%, transparent)",
                borderRadius: "4px",
                padding: "0.1rem 0.45rem",
                fontFamily: "var(--font-mono), monospace",
              }}
            >
              ANOMALY
            </span>
          ) : (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--status-nominal)",
                background: "color-mix(in srgb, var(--status-nominal) 14%, var(--surface-1))",
                border: "1px solid color-mix(in srgb, var(--status-nominal) 30%, transparent)",
                borderRadius: "4px",
                padding: "0.1rem 0.45rem",
                fontFamily: "var(--font-mono), monospace",
              }}
            >
              NOMINAL
            </span>
          )}
        </div>
      </div>

      {/* Main Diagnosis Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h3
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 600,
              color: isFault ? "var(--status-caution)" : "var(--text)",
            }}
          >
            {displayFaultLabel}
          </h3>
          <span
            className="font-mono tabular-nums"
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              fontWeight: 500,
            }}
          >
            {confidencePct}% conf
          </span>
        </div>

        {/* Isolation Metrics Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.5rem",
            padding: "0.4rem 0.6rem",
            background: "var(--surface-2)",
            borderRadius: "6px",
            border: "1px solid var(--border)",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-faint)", textTransform: "uppercase" }}>
              Anomaly Score
            </div>
            <div
              className="font-mono tabular-nums"
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: Number(anomalyScore) > 0.1 ? "var(--status-caution)" : "var(--text)",
              }}
            >
              {anomalyScore}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-faint)", textTransform: "uppercase" }}>
              Isolation Status
            </div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: isFault ? "var(--status-caution)" : "var(--text)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {isolationStatus}
            </div>
          </div>
        </div>

        {/* Evidence Snippet */}
        <div
          style={{
            fontSize: "11.5px",
            color: "var(--text-muted)",
            lineHeight: 1.35,
            whiteSpace: "normal",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
          title={evidenceText}
        >
          {evidenceText}
        </div>
      </div>

      {/* Card Footer Status & Diagnostics Link */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          paddingTop: "0.45rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "11px",
          color: "var(--text-muted)",
        }}
      >
        <span style={{ fontFamily: "var(--font-mono), monospace" }}>
          Mode: {isSimulationActive ? "Simulated Fault Active" : "Nominal Telemetry Baseline"}
        </span>
        {onNavigate ? (
          <button
            onClick={onNavigate}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--accent)",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "10.5px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.2rem",
              padding: 0,
            }}
            title="Open Subsystem Physics Diagnostics"
          >
            DIAGNOSTICS &rarr;
          </button>
        ) : (
          <span
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "10.5px",
              color: "var(--accent)",
              fontWeight: 600,
            }}
          >
            VERIFIED &rarr;
          </span>
        )}
      </div>
    </div>
  );
}
