"use client";

import React from "react";
import { UnifiedTelemetryPayload } from "../types/telemetry";
import MaintenanceChecklist from "./maintenance/MaintenanceChecklist";
import MaintenanceHistoryTable from "./maintenance/MaintenanceHistoryTable";
import PageLayout from "./common/PageLayout";
import { Wrench } from "lucide-react";

interface MaintenanceViewProps {
  payload: UnifiedTelemetryPayload;
}

export default function MaintenanceView({ payload }: MaintenanceViewProps) {
  const riskLevel = payload.risk?.level || "LOW";

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
      {/* Strict 50-50 Split Layout between Checklist and Maintenance History */}
      <div className="maintenance-view-split-50">
        {/* Left Panel (50%): FIELD MAINTENANCE CHECKLIST & SIGN-OFF */}
        <div className="maintenance-split-col">
          <MaintenanceChecklist />
        </div>

        {/* Right Panel (50%): INSPECTION OVERVIEW & MAINTENANCE HISTORY LOG */}
        <div className="maintenance-split-col">
          <MaintenanceHistoryTable />
        </div>
      </div>
    </PageLayout>
  );
}
