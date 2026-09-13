"use client";

import React from "react";
import { useTelemetry } from "@/context/TelemetryContext";

export default function FaultDiagnosisCard() {
  const { faultDiagnosis, isConnected } = useTelemetry();

  if (!isConnected || !faultDiagnosis) {
    return (
      <div
        className="fault-diagnosis-card"
        style={{
          background: "var(--bg-card, rgba(14, 21, 38, 0.75))",
          border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
          borderRadius: "10px",
          padding: "1.25rem",
        }}
      >
        <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#f8fafc" }}>
          AI FAULT DIAGNOSIS &amp; FUSION
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted, #64748b)", marginTop: "0.5rem" }}>
          Connecting to AI Fault Fusion Engine...
        </div>
      </div>
    );
  }

  const {
    fault,
    fault_code,
    state,
    confidence,
    severity,
    affected_subsystem,
    evidence,
    alternative_faults,
    suspected_sensor,
    is_sensor_fault,
  } = faultDiagnosis;

  const isNormal = state === "NORMAL" || fault_code === "NORMAL";

  // State color mapping
  const stateColor =
    state === "CRITICAL" || severity === "CRITICAL"
      ? "var(--accent-rose, #ef4444)"
      : state === "CONFIRMED" || severity === "HIGH"
      ? "var(--accent-rose, #ef4444)"
      : state === "SUSPECTED" || state === "ANOMALY" || severity === "MEDIUM"
      ? "var(--accent-amber, #f59e0b)"
      : "var(--accent-emerald, #10b981)";

  const confPct = Math.round(confidence * 100);

  return (
    <div
      className="fault-diagnosis-card"
      style={{
        background: "var(--bg-card, rgba(14, 21, 38, 0.75))",
        border: `1px solid ${!isNormal ? `${stateColor}66` : "var(--border-subtle, rgba(255, 255, 255, 0.08))"}`,
        borderRadius: "10px",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        boxShadow: !isNormal ? `0 0 20px ${stateColor}22` : "none",
      }}
    >
      {/* Header with State & Severity */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.95rem", fontWeight: 800, letterSpacing: "0.5px", color: "#f8fafc" }}>
              AI FAULT DIAGNOSIS (PHASE 3 FUSION)
            </span>
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 800,
                padding: "0.15rem 0.45rem",
                borderRadius: "4px",
                background: `${stateColor}22`,
                color: stateColor,
                border: `1px solid ${stateColor}44`,
                letterSpacing: "0.5px",
              }}
            >
              {state}
            </span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary, #94a3b8)", marginTop: "0.15rem" }}>
            Real-time multi-signal sensor cross isolation &amp; physics-informed fusion
          </div>
        </div>

        {/* Severity Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ fontSize: "0.68rem", color: "var(--text-muted, #64748b)" }}>SEVERITY:</span>
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 800,
              padding: "0.2rem 0.5rem",
              borderRadius: "4px",
              background: `${stateColor}22`,
              color: stateColor,
              border: `1px solid ${stateColor}55`,
            }}
          >
            {severity}
          </span>
        </div>
      </div>

      {/* Primary Fault Banner */}
      <div
        style={{
          background: isNormal ? "rgba(16, 185, 129, 0.06)" : `${stateColor}15`,
          border: `1px solid ${isNormal ? "rgba(16, 185, 129, 0.2)" : `${stateColor}44`}`,
          borderRadius: "8px",
          padding: "0.9rem 1.1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-muted, #64748b)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            {isNormal ? "SYSTEM STATUS" : "IDENTIFIED FAULT SIGNATURE"}
          </div>
          <div style={{ fontSize: "1.25rem", fontWeight: 900, color: isNormal ? "#10b981" : "#f8fafc", marginTop: "0.2rem" }}>
            {isNormal ? "NO ACTIVE FAULT — ALL SUBSYSTEMS NOMINAL" : fault}
          </div>
          {!isNormal && (
            <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", marginTop: "0.35rem", fontSize: "0.72rem" }}>
              <span style={{ color: "var(--text-secondary, #94a3b8)" }}>
                Subsystem: <strong style={{ color: "#f8fafc" }}>{affected_subsystem}</strong>
              </span>
              {is_sensor_fault && (
                <span
                  style={{
                    background: "rgba(56, 189, 248, 0.15)",
                    color: "#38bdf8",
                    padding: "0.1rem 0.4rem",
                    borderRadius: "3px",
                    fontWeight: 700,
                  }}
                >
                  SENSOR ANOMALY ({suspected_sensor || "ISOLATED"})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Confidence Meter */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.68rem", color: "var(--text-muted, #64748b)" }}>DIAGNOSTIC CONFIDENCE</div>
          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: 900,
              fontFamily: "var(--font-mono, monospace)",
              color: stateColor,
              lineHeight: 1.1,
            }}
          >
            {confPct}%
          </div>
        </div>
      </div>

      {/* Evidence & Supporting Residual Signals */}
      {evidence && evidence.length > 0 && (
        <div
          style={{
            background: "rgba(0, 0, 0, 0.2)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            borderRadius: "6px",
            padding: "0.75rem",
          }}
        >
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-secondary, #94a3b8)", marginBottom: "0.4rem" }}>
            EVIDENCE &amp; CORROBORATING SIGNALS:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            {evidence.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.4rem",
                  fontSize: "0.74rem",
                  color: "#e2e8f0",
                }}
              >
                <span style={{ color: isNormal ? "#10b981" : stateColor }}>✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alternative Suspected Faults */}
      {alternative_faults && alternative_faults.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted, #64748b)", fontWeight: 700 }}>
            ALTERNATIVE SUSPECTED FAULTS (SECONDARY CANDIDATES):
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {alternative_faults.map((alt, idx) => (
              <div
                key={idx}
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: "4px",
                  padding: "0.3rem 0.6rem",
                  fontSize: "0.7rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span style={{ color: "#f8fafc", fontWeight: 700 }}>{alt.fault}</span>
                <span
                  style={{
                    color: "var(--text-secondary, #94a3b8)",
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "0.65rem",
                  }}
                >
                  ({Math.round(alt.confidence * 100)}% conf | {alt.severity})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
