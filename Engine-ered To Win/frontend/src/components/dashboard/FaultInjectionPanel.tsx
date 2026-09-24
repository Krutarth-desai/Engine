"use client";

import React, { useState } from "react";
import { useTelemetry } from "@/context/TelemetryContext";
import { useRole } from "@/context/RoleContext";

interface ScenarioItem {
  id: string;
  name: string;
  subsystem: string;
  desc: string;
  defaultSeverity: "NOMINAL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  maintenancePreset?: boolean;
}

const ALL_SCENARIOS: ScenarioItem[] = [
  {
    id: "Normal",
    name: "Nominal Baseline",
    subsystem: "All Systems",
    desc: "2450 RPM nominal cruise, standard thermodynamic equilibrium",
    defaultSeverity: "NOMINAL",
    maintenancePreset: true,
  },
  {
    id: "Sensor_Drift",
    name: "Sensor Drift / Failure",
    subsystem: "Avionics & Sensors",
    desc: "Transducer bias +35°C; isolated via cross-sensor parity",
    defaultSeverity: "LOW",
    maintenancePreset: true,
  },
  {
    id: "Misfire",
    name: "Combustion Misfire",
    subsystem: "Combustion",
    desc: "Cylinder ignition miss: RPM drops -280, vibration surges, EGT drop",
    defaultSeverity: "HIGH",
    maintenancePreset: true,
  },
  {
    id: "Injector_Degradation",
    name: "Injector Abnormality",
    subsystem: "Combustion",
    desc: "Clogged nozzle: Fuel flow +7 L/h, EGT +68°C, RPM instability",
    defaultSeverity: "MEDIUM",
    maintenancePreset: true,
  },
  {
    id: "Overheating",
    name: "Overheating Trend",
    subsystem: "Thermal",
    desc: "Thermal runaway: CHT ramps +55°C, EGT +95°C, oil temp +26°C",
    defaultSeverity: "HIGH",
    maintenancePreset: true,
  },
  {
    id: "Vibration_Fault",
    name: "Abnormal Vibration",
    subsystem: "Mechanical",
    desc: "Harmonic mechanical resonance: Vibration +1.35 g, bearing load",
    defaultSeverity: "HIGH",
    maintenancePreset: true,
  },
  {
    id: "Coating_Degradation",
    name: "Coating Degradation",
    subsystem: "Mechanical",
    desc: "Thermal barrier wear: CHT +28°C, oil temp +12°C, friction wear",
    defaultSeverity: "MEDIUM",
    maintenancePreset: false,
  },
  {
    id: "Lubrication",
    name: "Lubrication Issue",
    subsystem: "Lubrication",
    desc: "Oil pressure drops -38 psi, oil temp +24°C, bearing wear",
    defaultSeverity: "HIGH",
    maintenancePreset: false,
  },
  {
    id: "Combustion_Instability",
    name: "Combustion Instability",
    subsystem: "Combustion",
    desc: "Flame speed flutter: oscillatory RPM ±140 & fuel delivery swings",
    defaultSeverity: "MEDIUM",
    maintenancePreset: false,
  },
  {
    id: "Engine_Failure_Multi",
    name: "Catastrophic Multi-Fault",
    subsystem: "All Systems",
    desc: "Correlated multi-subsystem cascading catastrophic breakdown",
    defaultSeverity: "CRITICAL",
    maintenancePreset: false,
  },
];

interface FaultInjectionPanelProps {
  compact?: boolean;
}

export default function FaultInjectionPanel({ compact = false }: FaultInjectionPanelProps) {
  const { role } = useRole();
  const {
    activeScenario,
    activeFaults = [],
    engineCondition = "NOMINAL",
    injectScenario,
    injectFault,
    removeFault,
    clearFaults,
    resetOverhaul,
    isConnected,
  } = useTelemetry();

  const [injectingId, setInjectingId] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("HIGH");
  const [customMultiMode, setCustomMultiMode] = useState(false);

  // If GCS Operator, Fault Injection is strictly not accessible
  if (role === "gcs_operator") {
    return null;
  }

  const isMaintenance = role === "maintenance_tech";
  const isPropulsion = role === "propulsion_engineer";

  // Filter scenarios based on user role
  const visibleScenarios = isMaintenance
    ? ALL_SCENARIOS.filter((s) => s.maintenancePreset)
    : ALL_SCENARIOS;

  const checkIsActive = (scId: string) => {
    if (scId === "Normal") {
      return activeFaults.length === 0 || (activeFaults.length === 1 && activeFaults[0].toLowerCase() === "normal");
    }
    const target = scId.toLowerCase().replace(/_/g, "");
    return (
      activeFaults.some((f) => {
        const cleanF = f.toLowerCase().replace(/_/g, "");
        return cleanF === target || cleanF.includes(target) || target.includes(cleanF);
      }) ||
      (activeScenario && activeScenario.toLowerCase().replace(/_/g, "") === target && activeFaults.length <= 1)
    );
  };

  const handleToggle = async (scId: string) => {
    setInjectingId(scId);
    try {
      if (scId === "Normal") {
        await clearFaults();
        injectScenario("Normal");
      } else {
        const isActive = checkIsActive(scId);
        if (isActive) {
          await removeFault(scId);
        } else {
          // Use selected severity if Propulsion Engineer, otherwise default scenario severity
          const sev = isPropulsion ? selectedSeverity : "MEDIUM";
          await injectFault(scId, sev);
          injectScenario(scId);
        }
      }
    } catch (err) {
      console.warn("[FaultInjectionPanel] Fault toggle error:", err);
    } finally {
      setTimeout(() => setInjectingId(null), 250);
    }
  };

  const conditionColorMap: Record<string, { bg: string; text: string; border: string }> = {
    NOMINAL: { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981", border: "rgba(16, 185, 129, 0.35)" },
    MINOR_DEGRADATION: { bg: "rgba(56, 189, 248, 0.15)", text: "#38bdf8", border: "rgba(56, 189, 248, 0.35)" },
    DEGRADED: { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.35)" },
    SEVERE: { bg: "rgba(249, 115, 22, 0.18)", text: "#f97316", border: "rgba(249, 115, 22, 0.4)" },
    CRITICAL: { bg: "rgba(239, 68, 68, 0.2)", text: "#ef4444", border: "rgba(239, 68, 68, 0.45)" },
    FAILURE: { bg: "rgba(185, 28, 28, 0.3)", text: "#fca5a5", border: "rgba(239, 68, 68, 0.7)" },
  };

  const activeCond = conditionColorMap[engineCondition] || conditionColorMap.NOMINAL;
  const isNormal = activeFaults.length === 0 || (activeFaults.length === 1 && activeFaults[0]?.toLowerCase() === "normal");

  return (
    <div
      className="fault-injection-panel"
      style={{
        background: "var(--bg-card, rgba(14, 21, 38, 0.85))",
        border: `1px solid ${isPropulsion ? "rgba(168, 85, 247, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
        borderRadius: "10px",
        padding: "0.95rem 1.1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.65rem",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.4rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.88rem", fontWeight: 800, letterSpacing: "0.5px", color: "#f8fafc" }}>
              {isPropulsion ? "⚙️ PROPULSION FAULT INJECTION ENGINE" : "🔧 MAINTENANCE PRESET DIAGNOSTIC TESTS"}
            </span>
            <span
              style={{
                fontSize: "0.58rem",
                fontWeight: 800,
                padding: "0.1rem 0.4rem",
                borderRadius: "3px",
                background: isPropulsion ? "rgba(168, 85, 247, 0.15)" : "rgba(16, 185, 129, 0.15)",
                color: isPropulsion ? "#c084fc" : "#34d399",
                border: `1px solid ${isPropulsion ? "rgba(168, 85, 247, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
              }}
            >
              {isPropulsion ? "FULL ACCESS / CUSTOM ENGINE" : "PRESET SCENARIOS & DRIFT TESTING"}
            </span>
            <span
              style={{
                fontSize: "0.58rem",
                fontWeight: 800,
                padding: "0.1rem 0.45rem",
                borderRadius: "3px",
                background: activeCond.bg,
                color: activeCond.text,
                border: `1px solid ${activeCond.border}`,
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              ENGINE STATE: {engineCondition}
            </span>
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-secondary, #94a3b8)", marginTop: "0.1rem" }}>
            {isPropulsion
              ? "Full simulation control: adjust severities, combine multi-fault dynamics, and evaluate physical cross-synergies."
              : "Execute standard diagnostic test routines and simulate sensor drift to evaluate maintenance and overhaul thresholds."}
          </div>
        </div>

        {/* Right Status Badges & Quick Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <div
            style={{
              fontSize: "0.65rem",
              fontWeight: 800,
              padding: "0.2rem 0.55rem",
              borderRadius: "4px",
              background: isNormal ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
              color: isNormal ? "var(--accent-emerald, #10b981)" : "var(--accent-amber, #f59e0b)",
              border: `1px solid ${isNormal ? "rgba(16, 185, 129, 0.35)" : "rgba(245, 158, 11, 0.35)"}`,
              fontFamily: "var(--font-mono, monospace)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: isNormal ? "#10b981" : "#f59e0b",
                boxShadow: isNormal ? "0 0 6px #10b981" : "0 0 6px #f59e0b",
              }}
            />
            <span>{isNormal ? "NOMINAL BASELINE" : `${activeFaults.length} ACTIVE FAULT${activeFaults.length > 1 ? "S" : ""}`}</span>
          </div>

          <button
            onClick={() => {
              clearFaults();
              injectScenario("Normal");
            }}
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              padding: "0.25rem 0.6rem",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "4px",
              color: "#f8fafc",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="Clear all active driving faults"
          >
            CLEAR ALL
          </button>

          <button
            onClick={() => resetOverhaul()}
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              padding: "0.25rem 0.6rem",
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              borderRadius: "4px",
              color: "#10b981",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="Perform maintenance overhaul (resets all accumulated wear & degradation)"
          >
            OVERHAUL
          </button>
        </div>
      </div>

      {/* Propulsion-Only Controls: Severity Tuning & Multi-Fault Scenario Builder */}
      {isPropulsion && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.5rem",
            padding: "0.4rem 0.65rem",
            borderRadius: "6px",
            background: "rgba(168, 85, 247, 0.08)",
            border: "1px solid rgba(168, 85, 247, 0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#e9d5ff" }}>
              INJECTION SEVERITY:
            </span>
            {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((sev) => {
              const isSel = selectedSeverity === sev;
              const color =
                sev === "CRITICAL"
                  ? "#ef4444"
                  : sev === "HIGH"
                  ? "#f97316"
                  : sev === "MEDIUM"
                  ? "#f59e0b"
                  : "#38bdf8";
              return (
                <button
                  key={sev}
                  onClick={() => setSelectedSeverity(sev)}
                  style={{
                    fontSize: "0.6rem",
                    fontWeight: isSel ? 800 : 600,
                    padding: "0.15rem 0.45rem",
                    borderRadius: "4px",
                    background: isSel ? `${color}33` : "transparent",
                    color: isSel ? color : "#94a3b8",
                    border: isSel ? `1px solid ${color}88` : "1px solid rgba(255, 255, 255, 0.08)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {sev}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <span style={{ fontSize: "0.62rem", color: "#c084fc", fontWeight: 600 }}>
              ⚡ Custom Multi-Fault Combiner Active
            </span>
          </div>
        </div>
      )}

      {/* Maintenance Notice for Limited Presets */}
      {isMaintenance && (
        <div
          style={{
            fontSize: "0.62rem",
            color: "var(--text-secondary, #94a3b8)",
            padding: "0.3rem 0.55rem",
            borderRadius: "5px",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          ℹ️ <strong>Maintenance Mode</strong>: Preset diagnostic routines (Misfire, Injector, Overheat, Vibration, Sensor Drift) available at standard calibration levels. Custom scenario design requires Propulsion Engineer clearance.
        </div>
      )}

      {/* Responsive Grid of Fault Scenarios */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.55rem",
        }}
      >
        {visibleScenarios.map((sc) => {
          const isActive = checkIsActive(sc.id);
          const isInjecting = injectingId === sc.id;

          const sevColor =
            sc.defaultSeverity === "CRITICAL"
              ? "var(--accent-rose, #ef4444)"
              : sc.defaultSeverity === "HIGH"
              ? "var(--accent-rose, #ef4444)"
              : sc.defaultSeverity === "MEDIUM"
              ? "var(--accent-amber, #f59e0b)"
              : sc.defaultSeverity === "LOW"
              ? "var(--accent-cyan, #38bdf8)"
              : "var(--accent-emerald, #10b981)";

          return (
            <button
              key={sc.id}
              onClick={() => handleToggle(sc.id)}
              style={{
                background: isActive
                  ? isPropulsion
                    ? "rgba(168, 85, 247, 0.2)"
                    : "rgba(16, 185, 129, 0.2)"
                  : "rgba(255, 255, 255, 0.035)",
                border: `1px solid ${
                  isActive
                    ? isPropulsion
                      ? "#a855f7"
                      : "#10b981"
                    : "rgba(255, 255, 255, 0.1)"
                }`,
                borderRadius: "6px",
                padding: "0.5rem 0.6rem",
                textAlign: "left",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "0.25rem",
                minHeight: "72px",
                boxShadow: isActive
                  ? isPropulsion
                    ? "0 0 12px rgba(168, 85, 247, 0.3)"
                    : "0 0 12px rgba(16, 185, 129, 0.3)"
                  : "none",
                userSelect: "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: 800,
                    color: isActive ? (isPropulsion ? "#e9d5ff" : "#a7f3d0") : "#f8fafc",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={sc.name}
                >
                  {sc.name}
                </span>
                <span
                  style={{
                    fontSize: "0.54rem",
                    fontWeight: 800,
                    padding: "0.06rem 0.28rem",
                    borderRadius: "3px",
                    background: `${sevColor}22`,
                    color: sevColor,
                    border: `1px solid ${sevColor}44`,
                  }}
                >
                  {isPropulsion && isActive ? selectedSeverity : sc.defaultSeverity}
                </span>
              </div>
              <div
                style={{
                  fontSize: "0.62rem",
                  color: "var(--text-secondary, #94a3b8)",
                  lineHeight: 1.25,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={sc.desc}
              >
                {sc.desc}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.58rem",
                  color: "var(--text-muted, #64748b)",
                  borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                  paddingTop: "0.2rem",
                }}
              >
                <span>SYS: {sc.subsystem}</span>
                {isActive ? (
                  <span style={{ color: isPropulsion ? "#c084fc" : "#34d399", fontWeight: 800 }}>
                    ● ACTIVE
                  </span>
                ) : isInjecting ? (
                  <span style={{ color: "#f59e0b" }}>UPDATING...</span>
                ) : (
                  <span
                    style={{
                      color: isPropulsion ? "#c084fc" : "#34d399",
                      fontWeight: 700,
                    }}
                  >
                    {isMaintenance ? "RUN TEST ↻" : "TOGGLE ↻"}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
