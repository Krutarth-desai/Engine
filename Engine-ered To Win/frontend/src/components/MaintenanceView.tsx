"use client";

import React, { useState } from "react";
import { UnifiedTelemetryPayload } from "../types/telemetry";
import { NavView } from "./Sidebar";
import MaintenanceDashboard from "./dashboard/MaintenanceDashboard";
import MaintenanceChecklist from "./maintenance/MaintenanceChecklist";
import MaintenanceHistoryTable from "./maintenance/MaintenanceHistoryTable";
import PageLayout from "./common/PageLayout";
import { Wrench, LayoutDashboard, ClipboardList } from "lucide-react";

interface MaintenanceViewProps {
  payload: UnifiedTelemetryPayload;
  onNavigate?: (view: NavView) => void;
}

export default function MaintenanceView({ payload, onNavigate }: MaintenanceViewProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "checklist">("dashboard");
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
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
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
        </div>
      }
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.85rem",
          flex: 1,
          minHeight: 0,
          width: "100%",
          flexShrink: 0,
          paddingBottom: "2rem",
        }}
      >
        {/* Navigation Tabs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            background: "var(--surface-2)",
            padding: "3px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            width: "fit-content",
          }}
        >
          <button
            onClick={() => setActiveTab("dashboard")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.35rem 0.85rem",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              background: activeTab === "dashboard" ? "var(--status-caution)" : "transparent",
              color: activeTab === "dashboard" ? "#000" : "var(--text-muted)",
              border: "none",
              transition: "all 0.15s ease",
            }}
          >
            <LayoutDashboard size={13} />
            <span>Predictive Maintenance Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab("checklist")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.35rem 0.85rem",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              background: activeTab === "checklist" ? "var(--accent)" : "transparent",
              color: activeTab === "checklist" ? "var(--accent-contrast)" : "var(--text-muted)",
              border: "none",
              transition: "all 0.15s ease",
            }}
          >
            <ClipboardList size={13} />
            <span>Inspection Checklist &amp; History Log</span>
          </button>
        </div>

        {/* Tab 1: Predictive Maintenance Dashboard */}
        {activeTab === "dashboard" && (
          <MaintenanceDashboard
            payload={payload}
            onNavigate={onNavigate || (() => {})}
          />
        )}

        {/* Tab 2: 50-50 Split Checklist and History Log */}
        {activeTab === "checklist" && (
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
        )}
      </div>
    </PageLayout>
  );
}
