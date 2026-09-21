"use client";

import React from "react";
import { UnifiedTelemetryPayload } from "@/types/telemetry";
import { NavView } from "./Sidebar";
import { useTelemetry } from "@/context/TelemetryContext";
import DashboardKpiCards from "./dashboard/DashboardKpiCards";
import DigitalTwinCenterpiece from "./DigitalTwinCenterpiece";
import AiFaultDiagnosisCard from "./dashboard/AiFaultDiagnosisCard";
import SubsystemHealthCard from "./dashboard/SubsystemHealthCard";
import LiveTelemetryCompactRow from "./dashboard/LiveTelemetryCompactRow";
import { BellRing, ChevronRight } from "lucide-react";

interface MainDashboardViewProps {
  payload: UnifiedTelemetryPayload;
  activeScenario: string;
  onInjectScenario: (scenario: string) => void;
  onNavigate: (view: NavView) => void;
}

export default function MainDashboardView({
  payload,
  activeScenario,
  onInjectScenario,
  onNavigate,
}: MainDashboardViewProps) {
  const { focusedComponent, setFocusedComponent } = useTelemetry();

  // Active alerts only (warning / caution)
  const activeAlerts = (payload.alerts || []).filter((a) => {
    const lvl = (a.level || "").toUpperCase();
    return lvl === "ALERT" || lvl === "CRITICAL" || lvl === "WARNING" || lvl === "CAUTION";
  });

  const topActiveAlert = activeAlerts.length > 0 ? activeAlerts[0] : null;

  return (
    <div className="main-dashboard-container">
      {/* Active Alert Banner (renders only when an active caution/warning exists, otherwise 0px) */}
      {topActiveAlert && (
        <div
          onClick={() => onNavigate("alerts")}
          title="Click to open full alerts log"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.3rem 0.75rem",
            borderRadius: "6px",
            background: "var(--surface-1)",
            border: `1px solid ${
              topActiveAlert.level === "CAUTION" ? "var(--status-caution)" : "var(--status-warning)"
            }`,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <BellRing
              size={14}
              style={{
                color:
                  topActiveAlert.level === "CAUTION"
                    ? "var(--status-caution)"
                    : "var(--status-warning)",
              }}
            />
            <span
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-mono), monospace",
                fontWeight: 600,
                color:
                  topActiveAlert.level === "CAUTION"
                    ? "var(--status-caution)"
                    : "var(--status-warning)",
              }}
            >
              [{topActiveAlert.level}]
            </span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text)" }}>
              {topActiveAlert.title}
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              — {topActiveAlert.message}
            </span>
          </div>

          <span
            style={{
              fontSize: "11px",
              fontFamily: "var(--font-mono), monospace",
              color: "var(--text-muted)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.2rem",
            }}
          >
            VIEW ALERTS ({activeAlerts.length}) <ChevronRight size={11} />
          </span>
        </div>
      )}

      {/* ROW 1: 3 METRIC CARDS (Engine health, RUL, Engine status) */}
      <DashboardKpiCards payload={payload} onNavigate={onNavigate} />

      {/* ROW 2: 12-COLUMN SPLIT (Left 8 cols Digital Twin, Right 4 cols Diagnosis + Subsystems) */}
      <div
        className="dashboard-main-split"
        style={{
          display: "grid",
          gridTemplateColumns: "8fr 4fr",
          gap: "0.65rem",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Left (8 cols): Digital Twin Card */}
        <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, overflow: "hidden" }}>
          <DigitalTwinCenterpiece
            telemetry={payload}
            activeScenario={activeScenario}
            onInjectScenario={onInjectScenario}
            focusedComponent={focusedComponent}
            onSelectComponent={(k) => setFocusedComponent(focusedComponent === k ? null : k)}
          />
        </div>

        {/* Right (4 cols): AI Fault Diagnosis + Subsystem Health Index */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.65rem",
            height: "100%",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <AiFaultDiagnosisCard
            payload={payload}
            activeScenario={activeScenario}
            onNavigate={() => onNavigate("diagnostics")}
          />
          <SubsystemHealthCard payload={payload} />
        </div>
      </div>

      {/* ROW 3: LIVE TELEMETRY (9 compact tiles in one single row) */}
      <LiveTelemetryCompactRow
        payload={payload}
        onSelectChannel={() => onNavigate("telemetry")}
      />
    </div>
  );
}
