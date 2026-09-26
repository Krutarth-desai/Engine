"use client";

import React from "react";
import { UnifiedTelemetryPayload } from "@/types/telemetry";
import { NavView } from "./Sidebar";
import { useTelemetry } from "@/context/TelemetryContext";
import { useProfile } from "@/context/ProfileContext";
import DashboardKpiCards from "./dashboard/DashboardKpiCards";
import DigitalTwinCenterpiece from "./DigitalTwinCenterpiece";
import AiFaultDiagnosisCard from "./dashboard/AiFaultDiagnosisCard";
import SubsystemHealthCard from "./dashboard/SubsystemHealthCard";
import LiveTelemetryCompactRow from "./dashboard/LiveTelemetryCompactRow";
import { BellRing, ChevronRight, Shield, Sliders } from "lucide-react";

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
  const { profileDef } = useProfile();

  // Active alerts only (warning / caution)
  const activeAlerts = (payload.alerts || []).filter((a) => {
    const lvl = (a.level || "").toUpperCase();
    return lvl === "ALERT" || lvl === "CRITICAL" || lvl === "WARNING" || lvl === "CAUTION";
  });

  const topActiveAlert = activeAlerts.length > 0 ? activeAlerts[0] : null;

  return (
    <div className="main-dashboard-container">
      {/* Top Banner: Current Active Workstation Role */}
      <div
        className="dashboard-role-banner"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.4rem 0.85rem",
          borderRadius: "8px",
          background: "var(--surface-1)",
          border: `1px solid ${profileDef.badgeBorder}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", minWidth: 0 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              background: "var(--surface-2)",
              border: `1px solid ${profileDef.badgeBorder}`,
              borderRadius: "4px",
              padding: "0.2rem 0.5rem",
              fontSize: "11px",
              fontFamily: "var(--font-mono), monospace",
              fontWeight: 700,
              color: profileDef.badgeColor,
              letterSpacing: "0.04em",
            }}
          >
            <Shield size={12} />
            <span>{profileDef.roleTag}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", minWidth: 0 }}>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--text)",
                whiteSpace: "nowrap",
              }}
            >
              {profileDef.title}
            </span>
            <span style={{ color: "var(--text-faint)", fontSize: "12px" }}>•</span>
            <span
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {profileDef.targetPersona} — &quot;{profileDef.mainQuestion}&quot;
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
          <span
            style={{
              fontSize: "10.5px",
              fontFamily: "var(--font-mono), monospace",
              color: "var(--text-faint)",
              textTransform: "uppercase",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: profileDef.badgeColor,
              }}
            />
            {profileDef.hierarchyLevel}
          </span>

          <button
            onClick={() => onNavigate("settings")}
            className="btn-secondary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              padding: "0.2rem 0.6rem",
              borderRadius: "5px",
              fontSize: "11px",
              fontFamily: "var(--font-mono), monospace",
              fontWeight: 600,
              cursor: "pointer",
            }}
            title="Configure Workstation Profiles and Access Control in Settings"
          >
            <Sliders size={11} />
            <span>CONFIGURE RBAC</span>
          </button>
        </div>
      </div>

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
