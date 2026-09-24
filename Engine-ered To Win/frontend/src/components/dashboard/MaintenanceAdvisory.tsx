"use client";

import React from "react";
import { useTelemetry } from "@/context/TelemetryContext";
import { NavView } from "@/components/Sidebar";

interface MaintenanceAdvisoryProps {
  onNavigate?: (view: NavView) => void;
}

export default function MaintenanceAdvisory({ onNavigate }: MaintenanceAdvisoryProps) {
  const { payload, faultDiagnosis, isConnected } = useTelemetry();

  const risk = payload?.risk;
  const maintenanceCtx = faultDiagnosis?.maintenance_context;

  const riskLevel = risk?.level || maintenanceCtx?.severity || (faultDiagnosis?.state !== "NORMAL" && faultDiagnosis?.state ? faultDiagnosis.severity : "LOW");
  const affectedSubsystem = faultDiagnosis?.affected_subsystem || "Thermal / Mechanical";
  const issue = maintenanceCtx?.fault || faultDiagnosis?.fault || risk?.status_label || "Nominal Operation";
  const actionText = risk?.action || (maintenanceCtx as any)?.action || "Inspect cooling radiator core and calibrate CHT thermocouples.";

  const hasAdvisory = Boolean(
    (riskLevel && riskLevel !== "LOW") ||
    (faultDiagnosis && faultDiagnosis.state !== "NORMAL" && faultDiagnosis.fault_code !== "NORMAL")
  );

  const getRiskColor = (level: string) => {
    switch (level) {
      case "CRITICAL":
      case "HIGH":
        return "var(--accent-rose, #ef4444)";
      case "MEDIUM":
        return "var(--accent-amber, #f59e0b)";
      case "LOW":
      default:
        return "var(--accent-emerald, #10b981)";
    }
  };

  const riskColor = getRiskColor(riskLevel);

  return (
    <div
      className="maintenance-advisory-panel"
      style={{
        background: "var(--bg-card, rgba(14, 21, 38, 0.75))",
        border: `1px solid ${hasAdvisory ? `${riskColor}55` : "var(--border-subtle, rgba(255, 255, 255, 0.08))"}`,
        borderRadius: "10px",
        padding: "0.95rem 1.1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.7rem",
        boxShadow: hasAdvisory ? `0 0 20px ${riskColor}15` : "none",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.92rem", fontWeight: 800, letterSpacing: "0.5px", color: "#f8fafc" }}>
            PREDICTIVE MAINTENANCE
          </span>
          <span
            style={{
              fontSize: "0.62rem",
              fontWeight: 800,
              padding: "0.15rem 0.45rem",
              borderRadius: "4px",
              background: `${riskColor}22`,
              color: riskColor,
              border: `1px solid ${riskColor}44`,
            }}
          >
            Risk: {riskLevel}
          </span>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate("maintenance")}
            id="btn-goto-maintenance"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--accent-cyan, #38bdf8)",
              fontSize: "0.72rem",
              fontWeight: 700,
              cursor: "pointer",
              padding: "0.2rem 0.4rem",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              gap: "0.2rem",
            }}
          >
            MAINTENANCE LOGS →
          </button>
        )}
      </div>

      {/* Advisory Content: Compact */}
      {!hasAdvisory ? (
        <div
          style={{
            background: "rgba(0, 0, 0, 0.2)",
            padding: "0.85rem 1rem",
            borderRadius: "6px",
            border: "1px solid rgba(255, 255, 255, 0.04)",
            fontSize: "0.78rem",
            color: "var(--text-muted, #64748b)",
          }}
        >
          No advisory available yet.
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.38rem",
            background: "rgba(0, 0, 0, 0.2)",
            padding: "0.65rem 0.85rem",
            borderRadius: "6px",
            border: `1px solid ${riskColor}33`,
            fontSize: "0.75rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-muted, #64748b)" }}>Affected Subsystem</span>
            <span style={{ fontWeight: 700, color: "#38bdf8" }}>{affectedSubsystem}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-muted, #64748b)" }}>Issue</span>
            <span style={{ fontWeight: 700, color: "#f8fafc" }}>{issue}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-muted, #64748b)" }}>Severity</span>
            <span style={{ fontWeight: 800, color: riskColor }}>{riskLevel}</span>
          </div>

          <div style={{ marginTop: "0.2rem", paddingTop: "0.35rem", borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted, #64748b)", marginBottom: "0.15rem" }}>
              Recommended Action:
            </div>
            <div style={{ color: "#f8fafc", fontWeight: 600, lineHeight: 1.35 }}>
              {actionText}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
