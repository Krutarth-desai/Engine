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
        return { color: "var(--status-warning)", bg: "var(--surface-1)", border: "var(--status-warning)" };
      case "HIGH":
        return { color: "var(--status-caution)", bg: "color-mix(in srgb, var(--status-caution) 14%, var(--surface-1))", border: "var(--status-caution)" };
      case "MEDIUM":
        return { color: "var(--status-caution)", bg: "var(--surface-1)", border: "var(--status-caution)" };
      case "LOW":
      default:
        return { color: "var(--status-nominal)", bg: "var(--surface-1)", border: "var(--status-nominal)" };
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
          <p className="view-subtitle" style={{ margin: "0.2rem 0 0", fontSize: "0.72rem", color: "var(--text-muted)" }}>
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
            fontFamily: "var(--font-mono), monospace",
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
          <div className="panel maint-action-hero" style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "8px", padding: "1rem" }}>
            <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
              <div className="panel-title" style={{ fontSize: "0.75rem", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
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
              <div className="action-large-readout" style={{ fontSize: "0.95rem", lineHeight: 1.4, color: "var(--text)", marginBottom: "0.5rem" }}>
                <span className="action-hero-text"><strong>{action}</strong></span>
              </div>
              <p className="action-context" style={{ fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
                {guidance || `Automated recommendation generated based on cross-correlated physical telemetry, remaining useful life estimates (${rulCycles} cycles), and current health index (${health}/100).`}
              </p>
            </div>
          </div>

          {/* Dynamic Preventative Protocols with Live Margins */}
          <div className="panel maint-protocols-card" style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "8px", padding: "1rem" }}>
            <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div className="panel-title" style={{ fontSize: "0.75rem", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
                <strong>DYNAMIC PREVENTATIVE PROTOCOLS (LIVE MARGINS)</strong>
              </div>
              <span style={{ fontSize: "0.62rem", color: "var(--accent)", fontFamily: "var(--font-mono), monospace" }}>
                TELEMETRY ENVELOPE
              </span>
            </div>
            <div className="protocols-list" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {MAINTENANCE_PROTOCOLS.map((protocol) => {
                const triggered = protocol.isTriggered(payload);
                const marginText = protocol.getMargin(payload);
                const tagColor = triggered ? "var(--status-warning)" : "var(--status-nominal)";

                return (
                  <div
                    key={protocol.id}
                    className="protocol-item"
                    style={{
                      borderLeft: `3px solid ${tagColor}`,
                      background: triggered ? "color-mix(in srgb, var(--status-warning) 14%, var(--surface-1))" : "var(--border)",
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
                          fontFamily: "var(--font-mono), monospace",
                          fontWeight: 700,
                        }}
                      >
                        {protocol.tag}
                      </span>
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontFamily: "var(--font-mono), monospace",
                          fontWeight: 700,
                          color: triggered ? "var(--status-warning)" : "var(--accent)",
                        }}
                      >
                        {triggered ? "TRIGGER EXCEEDED!" : "MARGIN OK"}
                      </span>
                    </div>
                    <p className="protocol-desc" style={{ fontSize: "0.72rem", color: "var(--text)", margin: "0.2rem 0" }}>
                      {protocol.actionDesc}
                    </p>
                    <div
                      style={{
                        fontSize: "0.65rem",
                        fontFamily: "var(--font-mono), monospace",
                        color: triggered ? "var(--status-warning)" : "var(--text-muted)",
                        marginTop: "0.35rem",
                        padding: "0.25rem 0.5rem",
                        background: "var(--bg)",
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
