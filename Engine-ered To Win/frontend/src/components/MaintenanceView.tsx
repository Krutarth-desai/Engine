"use client";

import React from "react";
import { UnifiedTelemetryPayload } from "../types/telemetry";
import RunUpRunner from "./maintenance/RunUpRunner";
import OilSpectrometryLog from "./maintenance/OilSpectrometryLog";
import MaintenanceChecklist from "./maintenance/MaintenanceChecklist";
import MaintenanceHistoryTable from "./maintenance/MaintenanceHistoryTable";
import PageLayout from "./common/PageLayout";
import { Wrench } from "lucide-react";

interface MaintenanceViewProps {
  payload: UnifiedTelemetryPayload;
}

export default function MaintenanceView({ payload }: MaintenanceViewProps) {
  const riskLevel = payload.risk?.level || "LOW";
  const action = payload.risk?.action || "All engine systems and sensors are performing nominally. Continue planned cruise profile.";
  const guidance = payload.risk?.guidance;
  const health = Math.round(payload.health_index || 96);
  const rulCycles = Math.round(payload.prognostics?.predicted_rul || 117);

  const prioColor =
    riskLevel === "CRITICAL"
      ? "var(--status-warning)"
      : riskLevel === "HIGH" || riskLevel === "MEDIUM"
      ? "var(--status-caution)"
      : "var(--status-nominal)";

  return (
    <PageLayout
      title="Predictive Maintenance & Field Action Protocols"
      subtitle="Condition-based maintenance (CBM), component wear life thresholds, and ground turn-around checklists"
      icon={<Wrench size={18} />}
      tags={
        <span
          className="nav-tag"
          style={{
            color: prioColor,
            background: `color-mix(in srgb, ${prioColor} 14%, var(--surface-1))`,
            borderColor: `color-mix(in srgb, ${prioColor} 30%, transparent)`,
            fontFamily: "var(--font-mono), monospace",
          }}
        >
          PRIORITY: {riskLevel}
        </span>
      }
    >
      {/* 2-Column Responsive Layout */}
      <div
        className="maintenance-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.85rem",
          flex: 1,
          minHeight: 0,
          alignItems: "start",
        }}
      >
        {/* Left Column: Directives, Protocols & Test Runners */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {/* Directive Hero Card */}
          <div
            className="card"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "0.85rem 1rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  color: "var(--text-faint)",
                  textTransform: "uppercase",
                }}
              >
                Current Pilot &amp; Operator Directive
              </span>
              <span
                className="font-mono"
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "0.1rem 0.45rem",
                  borderRadius: "4px",
                  background: `color-mix(in srgb, ${prioColor} 14%, var(--surface-1))`,
                  color: prioColor,
                  border: `1px solid color-mix(in srgb, ${prioColor} 30%, transparent)`,
                }}
              >
                {riskLevel} RISK
              </span>
            </div>

            <div>
              <h3 style={{ margin: "0 0 0.35rem 0", fontSize: "14px", fontWeight: 600, color: "var(--text)", lineHeight: 1.4 }}>
                {action}
              </h3>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.4, margin: 0 }}>
                {guidance || `Automated recommendation generated based on cross-correlated physical telemetry, remaining useful life estimates (${rulCycles} cycles), and current health index (${health}/100).`}
              </p>
            </div>
          </div>

          <RunUpRunner />
          <OilSpectrometryLog />
        </div>

        {/* Right Column: Checklists & Turnaround Logs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <MaintenanceChecklist />
          <MaintenanceHistoryTable />
        </div>
      </div>
    </PageLayout>
  );
}
