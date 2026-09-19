"use client";

import React from "react";
import { UnifiedTelemetryPayload } from "../types/telemetry";
import { MAINTENANCE_PROTOCOLS } from "@/lib/limits";
import RunUpRunner from "./maintenance/RunUpRunner";
import OilSpectrometryLog from "./maintenance/OilSpectrometryLog";
import MaintenanceChecklist from "./maintenance/MaintenanceChecklist";
import MaintenanceHistoryTable from "./maintenance/MaintenanceHistoryTable";

interface MaintenanceViewProps {
  payload: UnifiedTelemetryPayload;
}

export default function MaintenanceView({ payload }: MaintenanceViewProps) {
  const riskLevel = payload.risk?.level || "LOW";
  const action = payload.risk?.action || "All engine systems and sensors are performing nominally. Continue planned cruise profile.";
  const guidance = payload.risk?.guidance;
  const health = Math.round(payload.health_index || 96);
  const rulCycles = Math.round(payload.prognostics?.predicted_rul || 117);

  const getPriorityStyle = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return { color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", border: "#ef4444" };
      case "HIGH":
        return { color: "#f97316", bg: "rgba(249, 115, 22, 0.15)", border: "#f97316" };
      case "MEDIUM":
        return { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)", border: "#f59e0b" };
      case "LOW":
      default:
        return { color: "#10b981", bg: "rgba(16, 185, 129, 0.15)", border: "#10b981" };
    }
  };

  const prio = getPriorityStyle(riskLevel);

  return (
    <div className="view-container maintenance-view" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Header Strip */}
      <div className="view-header-strip" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <h2 className="view-title" style={{ margin: 0, fontSize: "1.2rem", letterSpacing: "0.04em" }}>
            <strong>PREDICTIVE MAINTENANCE &amp; ACTION PROTOCOL</strong>
          </h2>
          <p className="view-subtitle" style={{ margin: "0.2rem 0 0", fontSize: "0.72rem", color: "#64748b" }}>
            Condition-based maintenance (CBM), component wear life thresholds, and field action procedures
          </p>
        </div>
        <div
          className="priority-badge"
          style={{
            color: prio.color,
            backgroundColor: prio.bg,
            border: `1px solid ${prio.border}`,
            padding: "0.25rem 0.65rem",
            borderRadius: "4px",
            fontSize: "0.72rem",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <strong>PRIORITY: {riskLevel}</strong>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="maintenance-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "1rem" }}>
        {/* Left Column: Directives, Protocols & Test Runners */}
        <div className="maint-col-left" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Directive Hero */}
          <div className="panel maint-action-hero" style={{ background: "rgba(15, 23, 42, 0.65)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "1rem" }}>
            <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
              <div className="panel-title" style={{ fontSize: "0.75rem", letterSpacing: "0.05em", color: "#94a3b8" }}>
                <strong>CURRENT PILOT / OPERATOR DIRECTIVE</strong>
              </div>
              <span
                className="status-pill font-mono"
                style={{
                  fontSize: "0.65rem",
                  padding: "0.15rem 0.45rem",
                  borderRadius: "3px",
                  backgroundColor: prio.bg,
                  color: prio.color,
                  border: `1px solid ${prio.border}`,
                }}
              >
                <strong>{riskLevel} RISK</strong>
              </span>
            </div>

            <div className="maint-action-body">
              <div className="action-large-readout" style={{ fontSize: "0.95rem", lineHeight: 1.4, color: "#f8fafc", marginBottom: "0.5rem" }}>
                <span className="action-hero-text"><strong>{action}</strong></span>
              </div>
              <p className="action-context" style={{ fontSize: "0.7rem", color: "#94a3b8", lineHeight: 1.5, margin: 0 }}>
                {guidance || `Automated recommendation generated based on cross-correlated physical telemetry, remaining useful life estimates (${rulCycles} cycles), and current health index (${health}/100).`}
              </p>
            </div>
          </div>

          {/* Dynamic Preventative Protocols with Live Margins */}
          <div className="panel maint-protocols-card" style={{ background: "rgba(15, 23, 42, 0.65)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "1rem" }}>
            <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div className="panel-title" style={{ fontSize: "0.75rem", letterSpacing: "0.05em", color: "#94a3b8" }}>
                <strong>DYNAMIC PREVENTATIVE PROTOCOLS (LIVE MARGINS)</strong>
              </div>
              <span style={{ fontSize: "0.62rem", color: "var(--accent-cyan)", fontFamily: "'JetBrains Mono', monospace" }}>
                TELEMETRY ENVELOPE
              </span>
            </div>
            <div className="protocols-list" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {MAINTENANCE_PROTOCOLS.map((protocol) => {
                const triggered = protocol.isTriggered(payload);
                const marginText = protocol.getMargin(payload);
                const tagColor = triggered ? "#ef4444" : "#10b981";

                return (
                  <div
                    key={protocol.id}
                    className="protocol-item"
                    style={{
                      borderLeft: `3px solid ${tagColor}`,
                      background: triggered ? "rgba(239, 68, 68, 0.08)" : "rgba(255, 255, 255, 0.02)",
                      padding: "0.5rem 0.65rem",
                      borderRadius: "0 6px 6px 0",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                      <span
                        className="protocol-tag"
                        style={{
                          background: `${tagColor}18`,
                          color: tagColor,
                          border: `1px solid ${tagColor}40`,
                          fontSize: "0.62rem",
                          padding: "0.1rem 0.35rem",
                          borderRadius: "3px",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 700,
                        }}
                      >
                        {protocol.tag}
                      </span>
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 700,
                          color: triggered ? "#ef4444" : "var(--accent-cyan)",
                        }}
                      >
                        {triggered ? "TRIGGER EXCEEDED!" : "MARGIN OK"}
                      </span>
                    </div>
                    <p className="protocol-desc" style={{ fontSize: "0.72rem", color: "#cbd5e1", margin: "0.2rem 0" }}>
                      {protocol.actionDesc}
                    </p>
                    <div
                      style={{
                        fontSize: "0.65rem",
                        fontFamily: "'JetBrains Mono', monospace",
                        color: triggered ? "#ef4444" : "#94a3b8",
                        marginTop: "0.35rem",
                        padding: "0.25rem 0.5rem",
                        background: "rgba(0, 0, 0, 0.25)",
                        borderRadius: "4px",
                      }}
                    >
                      {marginText}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Engine Run-Up Test Sequence */}
          <RunUpRunner />

          {/* Wear Metals Spectrometry */}
          <OilSpectrometryLog />
        </div>

        {/* Right Column: Checklists & Maintenance History */}
        <div className="maint-col-right" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Field Maintenance Checklist with WO Generation */}
          <MaintenanceChecklist />

          {/* Maintenance History Log Table with CSV & Print */}
          <MaintenanceHistoryTable />
        </div>
      </div>
    </div>
  );
}
