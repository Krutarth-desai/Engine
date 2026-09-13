"use client";

import React from "react";
import { useTelemetry } from "@/context/TelemetryContext";

export default function EngineHealthCard() {
  const { payload, healthIndex, isConnected } = useTelemetry();

  const healthBlock = payload.digital_twin?.health;
  const trend = payload.digital_twin?.trend;
  const recentDeltas = payload.recent_trends?.deltas;

  // Backend provided status
  const status = healthBlock?.status || (
    healthIndex >= 85 ? "HEALTHY" : healthIndex >= 60 ? "DEGRADED" : "CRITICAL"
  );

  // Status color mapping
  const statusColor =
    status === "HEALTHY" || status === "NORMAL / MONITORED"
      ? "var(--accent-emerald, #10b981)"
      : status === "DEGRADED"
      ? "var(--accent-amber, #f59e0b)"
      : "var(--accent-rose, #ef4444)";

  // Trend delta from backend
  const deltaVal = trend?.overall_delta ?? recentDeltas?.health_delta ?? null;
  const degradationRate = trend?.degradation_rate ?? null;
  const isRapid = trend?.rapid_degradation ?? false;
  const trendWarning = trend?.warning ?? null;

  // Circular gauge SVG calculations
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthIndex / 100) * circumference;

  return (
    <div
      className="engine-health-card"
      style={{
        background: "var(--bg-card, rgba(14, 21, 38, 0.75))",
        border: `1px solid ${healthIndex < 70 ? `${statusColor}55` : "var(--border-subtle, rgba(255, 255, 255, 0.08))"}`,
        borderRadius: "10px",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: healthIndex < 70 ? `0 0 20px ${statusColor}22` : "none",
        position: "relative",
      }}
    >
      {/* Card Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.95rem", fontWeight: 800, letterSpacing: "0.5px", color: "#f8fafc" }}>
              OVERALL ENGINE HEALTH
            </span>
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 800,
                padding: "0.2rem 0.5rem",
                borderRadius: "4px",
                background: `${statusColor}22`,
                color: statusColor,
                border: `1px solid ${statusColor}55`,
                letterSpacing: "0.5px",
              }}
            >
              {isConnected ? status : "NO SIGNAL"}
            </span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary, #94a3b8)", marginTop: "0.15rem" }}>
            Physics-Informed Digital Twin Subsystem Aggregation
          </div>
        </div>

        {/* Rapid degradation warning pill if triggered by backend */}
        {isRapid && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.5)",
              color: "#ef4444",
              borderRadius: "4px",
              padding: "0.25rem 0.5rem",
              fontSize: "0.68rem",
              fontWeight: 700,
              animation: "pulse 1.5s infinite",
            }}
          >
            <span>⚠️ RAPID DEGRADATION</span>
          </div>
        )}
      </div>

      {/* Main Health Display with Radial Gauge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", gap: "1.5rem", margin: "0.5rem 0" }}>
        {/* Radial Progress Gauge */}
        <div style={{ position: "relative", width: "150px", height: "150px", flexShrink: 0 }}>
          <svg width="150" height="150" viewBox="0 0 150 150" style={{ transform: "rotate(-90deg)" }}>
            {/* Background Track */}
            <circle
              cx="75"
              cy="75"
              r={radius}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="10"
              fill="transparent"
            />
            {/* Health Arc */}
            <circle
              cx="75"
              cy="75"
              r={radius}
              stroke={isConnected ? statusColor : "#64748b"}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={isConnected ? strokeDashoffset : circumference}
              strokeLinecap="round"
              fill="transparent"
              style={{
                transition: "stroke-dashoffset 0.8s ease, stroke 0.5s ease",
              }}
            />
          </svg>
          {/* Centered Readout */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: "2.4rem",
                fontWeight: 900,
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                color: isConnected ? statusColor : "#94a3b8",
                lineHeight: 1,
              }}
            >
              {isConnected ? healthIndex : "—"}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted, #64748b)", marginTop: "0.2rem" }}>
              INDEX / 100
            </span>
          </div>
        </div>

        {/* Health Metrics & Deltas */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {/* Health Delta */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "6px",
              padding: "0.5rem 0.75rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)" }}>Cycle-over-Cycle Delta</span>
            <span
              style={{
                fontSize: "0.85rem",
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 700,
                color:
                  deltaVal == null
                    ? "var(--text-muted)"
                    : deltaVal > 0
                    ? "var(--accent-emerald, #10b981)"
                    : deltaVal < -1.0
                    ? "var(--accent-rose, #ef4444)"
                    : "#f8fafc",
              }}
            >
              {deltaVal != null ? (deltaVal > 0 ? `+${deltaVal.toFixed(1)}` : deltaVal.toFixed(1)) : "—"}
            </span>
          </div>

          {/* Degradation Rate */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "6px",
              padding: "0.5rem 0.75rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)" }}>Degradation Rate</span>
            <span
              style={{
                fontSize: "0.85rem",
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 700,
                color:
                  degradationRate == null
                    ? "var(--text-muted)"
                    : degradationRate > 1.5
                    ? "var(--accent-rose, #ef4444)"
                    : degradationRate > 0.5
                    ? "var(--accent-amber, #f59e0b)"
                    : "var(--accent-emerald, #10b981)",
              }}
            >
              {degradationRate != null ? `${degradationRate.toFixed(2)} pts/tick` : "0.00 pts/tick"}
            </span>
          </div>

          {/* Operating Envelope Summary */}
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted, #64748b)", lineHeight: 1.4 }}>
            {isConnected ? (
              trendWarning ? (
                <span style={{ color: "var(--accent-amber, #f59e0b)" }}>⚠️ {trendWarning}</span>
              ) : healthIndex >= 85 ? (
                "Continuous propulsion parameters operating well within primary mission envelope."
              ) : healthIndex >= 60 ? (
                "Noticeable degradation in one or more subsystems. Monitor residual drifts."
              ) : (
                "Severe component distress declared by digital twin fault fusion."
              )
            ) : (
              "Waiting for live engine connection on ws://localhost:8000/ws/telemetry..."
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
