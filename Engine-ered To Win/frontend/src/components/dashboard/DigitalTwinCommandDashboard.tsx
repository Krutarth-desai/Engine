"use client";

import React, { useState } from "react";
import { useTelemetry } from "@/context/TelemetryContext";
import { useRole } from "@/context/RoleContext";
import { isPanelAllowed } from "@/config/roleConfig";
import ReplayControlsBar from "./ReplayControlsBar";
import EngineHealthCard from "./EngineHealthCard";
import SubsystemHealthGrid from "./SubsystemHealthGrid";
import DigitalTwinComparison from "./DigitalTwinComparison";
import ResidualPanel from "./ResidualPanel";
import FaultDiagnosisCard from "./FaultDiagnosisCard";
import FaultInjectionPanel from "./FaultInjectionPanel";
import EnvironmentPanel from "./EnvironmentPanel";
import MissionPhaseTimeline from "./MissionPhaseTimeline";
import MissionRecordingControls from "./MissionRecordingControls";
import MissionHistory from "./MissionHistory";
import RulCard from "./RulCard";
import MaintenanceAdvisory from "./MaintenanceAdvisory";
import DigitalTwinCenterpiece from "../DigitalTwinCenterpiece";
import EngineStatusGrid from "./EngineStatusGrid";
import { NavView } from "../Sidebar";

interface DigitalTwinCommandDashboardProps {
  onNavigate?: (view: NavView) => void;
}

export default function DigitalTwinCommandDashboard({ onNavigate }: DigitalTwinCommandDashboardProps) {
  const { payload, activeScenario, injectScenario, faultDiagnosis, subsystemHealth } = useTelemetry();
  const { role } = useRole();
  const [selectedHotspot, setSelectedHotspot] = useState<string | undefined>(undefined);

  /** Helper: returns true if the panel should be shown for the current role */
  const show = (panelKey: string) => isPanelAllowed(role, panelKey);

  return (
    <div
      className="digital-twin-command-dashboard"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.1rem",
        padding: "0.85rem 1.25rem 2.5rem",
        maxWidth: "1880px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* 1. DASHBOARD STATUS & REPLAY CONTROLS BAR */}
      {show("replay_controls") && <ReplayControlsBar />}

      {/* 2. PRIMARY HERO COMMAND CENTER: UAV DIGITAL TWIN CENTERPIECE + ENGINE STATUS & HEALTH */}
      <section
        aria-label="Digital Twin Command Center Hero"
        className="hero-command-grid"
      >
        {/* Left: MALE UAV Digital Twin Centerpiece (35–45% Desktop Width) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {show("digital_twin_centerpiece") && (
            <DigitalTwinCenterpiece
              telemetry={{
                ...payload,
                rpm: payload.sensors?.rpm?.value ?? payload.rpm ?? 2450,
                cht_c: payload.sensors?.cht?.value ?? payload.cht_c ?? 142.0,
                egt_c: payload.sensors?.egt?.value ?? payload.egt_c ?? 615.0,
                oil_pressure_bar: payload.sensors?.oil_pressure?.value
                  ? payload.sensors.oil_pressure.value / 14.5038
                  : (payload.oil_pressure_bar ?? 4.7),
                oil_temperature_c: payload.sensors?.oil_temperature?.value ?? payload.oil_temperature_c ?? 92.0,
                fuel_flow_lh: payload.sensors?.fuel_flow?.value ?? payload.fuel_flow_lh ?? 17.6,
                vibration_g: payload.sensors?.vibration?.value ?? payload.vibration_g ?? 1.42,
                battery_voltage_v: payload.battery_voltage_v ?? 28.2,
                health_index: payload.health_index,
                fault_label: payload.fault_label ?? activeScenario,
                digital_twin: {
                  ...payload.digital_twin,
                  subsystem_health: subsystemHealth,
                },
                fault_diagnosis: faultDiagnosis,
              }}
              activeScenario={activeScenario}
              onInjectScenario={(sc) => injectScenario(sc)}
              selectedHotspot={selectedHotspot}
              onSelectHotspot={(sub) => setSelectedHotspot(sub)}
              showFaultMatrix={false}
            />
          )}
          {/* FAULT INJECTION MATRIX: Only for Propulsion Engineers */}
          {show("fault_injection") && <FaultInjectionPanel />}
        </div>

        {/* Right: Health KPI + RUL Prognostics + Live Telemetry + AI Diagnosis */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {/* Top Row: Overall Health Radial Card + RUL Prognostics Card (Balanced 1:1) */}
          {(show("engine_health") || show("rul_card")) && (
            <div className="hero-health-rul-row">
              {show("engine_health") && <EngineHealthCard />}
              {show("rul_card") && <RulCard onNavigate={onNavigate} />}
            </div>
          )}

          {/* Middle Row: 8-Channel Live Engineering Readouts */}
          {show("engine_status_grid") && (
            <EngineStatusGrid
              onNavigate={onNavigate}
              onSelectParam={(paramKey) => {
                if (paramKey === "cht_c" || paramKey === "egt_c") setSelectedHotspot("thermal");
                else if (paramKey === "oil_pressure_bar" || paramKey === "oil_temperature_c") setSelectedHotspot("lubrication");
                else if (paramKey === "fuel_flow_lh") setSelectedHotspot("combustion");
                else if (paramKey === "rpm" || paramKey === "vibration_g") setSelectedHotspot("mechanical");
                else if (paramKey === "battery_voltage_v") setSelectedHotspot("sensor");
              }}
            />
          )}

          {/* Bottom Row: AI Fault Diagnosis & Fusion Card */}
          {show("fault_diagnosis") && <FaultDiagnosisCard />}
        </div>
      </section>

      {/* 3. SUBSYSTEM HEALTH INDEX LAYER (6-AXIS ISOLATION) */}
      {show("subsystem_health") && (
        <section aria-label="Subsystem Health Layer">
          <SubsystemHealthGrid />
        </section>
      )}

      {/* 4. DIGITAL TWIN LAYER: ACTUAL VS EXPECTED & RESIDUAL MATRIX */}
      {(show("digital_twin_comparison") || show("residual_panel")) && (
        <section
          aria-label="Digital Twin Comparison and Residuals"
          className="twin-benchmark-grid"
        >
          {show("digital_twin_comparison") && <DigitalTwinComparison />}
          {show("residual_panel") && <ResidualPanel />}
        </section>
      )}

      {/* 5. ENVIRONMENT & MISSION OPERATIONS */}
      {(show("environment_panel") || show("mission_phase_timeline") || show("mission_recording") || show("maintenance_advisory")) && (
        <section
          aria-label="Operating Environment and Mission Execution"
          className="env-mission-grid"
        >
          {show("environment_panel") && <EnvironmentPanel />}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {show("mission_phase_timeline") && <MissionPhaseTimeline />}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.85rem",
              }}
            >
              {show("mission_recording") && <MissionRecordingControls />}
              {show("maintenance_advisory") && <MaintenanceAdvisory onNavigate={onNavigate} />}
            </div>
          </div>
        </section>
      )}

      {/* 6. MISSION FLIGHT ARCHIVES & REPLAY CATALOG (COLLAPSIBLE) */}
      {show("mission_history") && (
        <section aria-label="Mission Archives and Replay">
          <MissionHistory />
        </section>
      )}
    </div>
  );
}
