"use client";

import React from "react";
import { useTelemetry } from "@/context/TelemetryContext";
import { NavView } from "@/components/Sidebar";

interface MaintenanceAdvisoryProps {
  onNavigate?: (view: NavView) => void;
}

export default function MaintenanceAdvisory({ onNavigate }: MaintenanceAdvisoryProps) {
  const { payload, faultDiagnosis, isConnected } = useTelemetry();

  const risk = payload.risk;
  const maintenanceCtx = faultDiagnosis?.maintenance_context;
  const treatment = (payload as any).treatment;
  const prevention = (payload as any).prevention;

  const hasAdvisory = Boolean(risk || maintenanceCtx);

  const riskLevel = risk?.level || maintenanceCtx?.severity || "LOW";
  const actionText = risk?.action || "All engine systems and sensors are performing nominally. Continue planned cruise profile.";
  const guidance = risk?.guidance || "Continuous telemetry baseline nominal. No flight plan deviation required.";
  const statusLabel = risk?.status_label || (riskLevel === "LOW" ? "SYSTEMS OPTIMAL" : "OPERATIONAL ADVISORY");
  const predictedIssue = maintenanceCtx?.fault || faultDiagnosis?.fault || "Nominal Operation";

  const getRiskColor = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return "var(--accent-rose, #ef4444)";
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
        border: `1px solid ${riskLevel !== "LOW" ? `${riskColor}55` : "var(--border-subtle, rgba(255, 255, 255, 0.08))"}`,
        borderRadius: "10px",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
        boxShadow: riskLevel !== "LOW" ? `0 0 20px ${riskColor}15` : "none",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.95rem", fontWeight: 800, letterSpacing: "0.5px", color: "#f8fafc" }}>
              PREDICTIVE MAINTENANCE &amp; ACTION ADVISORY
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
              RISK: {riskLevel}
            </span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary, #94a3b8)", marginTop: "0.15rem" }}>
            Automated maintenance guidance synthesized from digital twin residuals and health degradation
          </div>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate("maintenance")}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--accent-cyan, #38bdf8)",
              fontSize: "0.72rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            MAINTENANCE LOGS →
          </button>
        )}
      </div>

      {!isConnected || !hasAdvisory ? (
        <div style={{ padding: "1rem", color: "var(--text-muted, #64748b)", fontSize: "0.8rem" }}>
          Predictive Maintenance Advisory: No advisory data available yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {/* Status & Issue Banner */}
          <div
            style={{
              background: "rgba(0, 0, 0, 0.25)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              borderRadius: "6px",
              padding: "0.75rem 0.9rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div>
              <span style={{ fontSize: "0.65rem", color: "var(--text-muted, #64748b)", letterSpacing: "0.5px" }}>
                PREDICTED ISSUE / ANOMALY:
              </span>
              <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#f8fafc", marginTop: "0.1rem" }}>
                {predictedIssue}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "0.65rem", color: "var(--text-muted, #64748b)" }}>ADVISORY STATE:</span>
              <div style={{ fontSize: "0.85rem", fontWeight: 800, color: riskColor, marginTop: "0.1rem" }}>
                [{statusLabel}]
              </div>
            </div>
          </div>

          {/* Action Recommendation */}
          <div
            style={{
              background: `${riskColor}10`,
              border: `1px solid ${riskColor}33`,
              borderRadius: "6px",
              padding: "0.75rem 0.9rem",
            }}
          >
            <div style={{ fontSize: "0.7rem", fontWeight: 800, color: riskColor, marginBottom: "0.25rem" }}>
              RECOMMENDED OPERATOR ACTION:
            </div>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#f8fafc", lineHeight: 1.4 }}>
              {actionText}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-secondary, #94a3b8)", marginTop: "0.35rem" }}>
              {guidance}
            </div>
          </div>

          {/* Treatment & Prevention Procedures if provided by backend */}
          {(treatment || prevention) && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "0.65rem",
                fontSize: "0.72rem",
              }}
            >
              {treatment && (
                <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: "0.6rem 0.75rem", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <div style={{ fontWeight: 800, color: "var(--accent-amber, #f59e0b)", marginBottom: "0.2rem" }}>
                    IMMEDIATE MITIGATION:
                  </div>
                  <div style={{ color: "#e2e8f0" }}>{treatment}</div>
                </div>
              )}
              {prevention && (
                <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: "0.6rem 0.75rem", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <div style={{ fontWeight: 800, color: "var(--accent-cyan, #38bdf8)", marginBottom: "0.2rem" }}>
                    POST-SORTIE INSPECTION:
                  </div>
                  <div style={{ color: "#e2e8f0" }}>{prevention}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
