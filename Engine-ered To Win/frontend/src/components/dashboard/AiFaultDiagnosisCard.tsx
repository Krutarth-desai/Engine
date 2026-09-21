"use client";

import React from "react";
import { UnifiedTelemetryPayload } from "@/types/telemetry";
import { SCENARIO_REGISTRY, ScenarioItem, SCENARIOS_BY_ID } from "@/lib/scenarios";
import { Zap, RotateCcw, FlaskConical } from "lucide-react";

interface AiFaultDiagnosisCardProps {
  payload: UnifiedTelemetryPayload;
  activeScenario: string;
  onInjectScenario: (scenario: string) => void;
}

export default function AiFaultDiagnosisCard({
  payload,
  activeScenario,
  onInjectScenario,
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

      {/* Small Fault Injection Control */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          paddingTop: "0.45rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.45rem",
          minWidth: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontSize: "11px",
              fontFamily: "var(--font-mono), monospace",
              fontWeight: 700,
              color: isSimulationActive ? "var(--status-caution)" : "var(--text-faint)",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <FlaskConical size={12} style={{ color: isSimulationActive ? "var(--status-caution)" : "var(--accent)" }} />
            SIM:
          </span>
          <select
            value={activeScenario || "Normal"}
            onChange={(e) => onInjectScenario(e.target.value)}
            style={{
              flex: 1,
              minWidth: 0,
              background: "var(--surface-2)",
              border: `1px solid ${isSimulationActive ? "color-mix(in srgb, var(--status-caution) 50%, var(--border))" : "var(--border)"}`,
              borderRadius: "4px",
              color: "var(--text)",
              fontSize: "11px",
              fontFamily: "var(--font-sans), system-ui, sans-serif",
              padding: "0.25rem 0.4rem",
              cursor: "pointer",
              outline: "none",
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
            title="Inject test failure scenario into digital twin"
          >
            {SCENARIO_REGISTRY.map((s: ScenarioItem) => (
              <option key={s.id} value={s.id}>
                {s.label} ({s.category})
              </option>
            ))}
          </select>
        </div>

        {isSimulationActive && (
          <button
            onClick={() => onInjectScenario("Normal")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              background: "var(--surface-2)",
              border: "1px solid var(--status-caution)",
              color: "var(--status-caution)",
              fontSize: "11px",
              fontWeight: 600,
              padding: "0.25rem 0.5rem",
              borderRadius: "4px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
            title="Reset to nominal cruise"
          >
            <RotateCcw size={11} /> Reset
          </button>
        )}
      </div>
    </div>
  );
}
