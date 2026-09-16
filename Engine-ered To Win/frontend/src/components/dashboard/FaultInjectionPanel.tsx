"use client";

import React, { useState } from "react";
import { useTelemetry } from "@/context/TelemetryContext";

interface ScenarioItem {
  id: string;
  name: string;
  subsystem: string;
  desc: string;
  severity: "NOMINAL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

const BACKEND_SCENARIOS: ScenarioItem[] = [
  {
    id: "Normal",
    name: "Nominal Baseline",
    subsystem: "All Systems",
    desc: "2450 RPM nominal cruise, standard thermodynamic equilibrium",
    severity: "NOMINAL",
  },
  {
    id: "Misfire",
    name: "Combustion Misfire",
    subsystem: "Combustion",
    desc: "Cylinder ignition miss: RPM drops -280, vibration surges, EGT drop",
    severity: "HIGH",
  },
  {
    id: "Injector_Degradation",
    name: "Injector Abnormality",
    subsystem: "Combustion",
    desc: "Clogged nozzle: Fuel flow +7 L/h, EGT +68°C, RPM instability",
    severity: "MEDIUM",
  },
  {
    id: "Coating_Degradation",
    name: "Coating Degradation",
    subsystem: "Mechanical",
    desc: "Thermal barrier wear: CHT +28°C, oil temp +12°C, friction wear",
    severity: "MEDIUM",
  },
  {
    id: "Lubrication",
    name: "Lubrication Issue",
    subsystem: "Lubrication",
    desc: "Oil pressure drops -38 psi, oil temp +24°C, bearing wear",
    severity: "HIGH",
  },
  {
    id: "Sensor_Drift",
    name: "Sensor Drift",
    subsystem: "Sensor",
    desc: "Transducer bias +35°C; isolated via cross-sensor parity",
    severity: "LOW",
  },
  {
    id: "Combustion_Instability",
    name: "Combustion Instability",
    subsystem: "Combustion",
    desc: "Flame speed flutter: oscillatory RPM ±140 & fuel delivery swings",
    severity: "MEDIUM",
  },
  {
    id: "Overheating",
    name: "Overheating Trend",
    subsystem: "Thermal",
    desc: "Thermal runaway: CHT ramps +55°C, EGT +95°C, oil temp +26°C",
    severity: "HIGH",
  },
  {
    id: "Vibration_Fault",
    name: "Abnormal Vibration",
    subsystem: "Mechanical",
    desc: "Harmonic mechanical resonance: Vibration +1.35 g, bearing load",
    severity: "HIGH",
  },
  {
    id: "Engine_Failure_Multi",
    name: "Catastrophic Multi-Fault",
    subsystem: "All Systems",
    desc: "Correlated multi-subsystem cascading catastrophic breakdown",
    severity: "CRITICAL",
  },
];

interface FaultInjectionPanelProps {
  compact?: boolean;
}

export default function FaultInjectionPanel({ compact = false }: FaultInjectionPanelProps) {
  const {
    activeScenario,
    activeFaults = [],
    engineCondition = "NOMINAL",
    injectScenario,
    toggleFault,
    injectFault,
    removeFault,
    clearFaults,
    resetOverhaul,
    isConnected,
  } = useTelemetry();
  const [injectingId, setInjectingId] = useState<string | null>(null);

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
      (activeScenario.toLowerCase().replace(/_/g, "") === target && activeFaults.length <= 1)
    );
  };

  const handleToggle = async (scId: string) => {
    setInjectingId(scId);
    try {
      if (scId === "Normal") {
        await clearFaults();
      } else {
        const isActive = checkIsActive(scId);
        if (isActive) {
          await removeFault(scId);
        } else {
          await injectFault(scId);
        }
      }
    } finally {
      setInjectingId(null);
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
  const isNormal = activeFaults.length === 0 || (activeFaults.length === 1 && activeFaults[0].toLowerCase() === "normal");

  if (compact) {
    return (
      <div
        className="fault-injection-compact"
        style={{
          background: "var(--bg-card, rgba(14, 21, 38, 0.75))",
          border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
          borderRadius: "8px",
          padding: "0.55rem 0.85rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.3rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.5px", color: "#f8fafc" }}>
              FAULT INJECTION MATRIX
            </span>
            <span style={{ fontSize: "0.62rem", color: "var(--text-muted, #64748b)" }}>
              (MULTI-FAULT HARNESS)
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span
              style={{
                fontSize: "0.62rem",
                fontWeight: 800,
                padding: "0.1rem 0.4rem",
                borderRadius: "3px",
                background: isNormal ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                color: isNormal ? "var(--accent-emerald, #10b981)" : "var(--accent-amber, #f59e0b)",
                border: `1px solid ${isNormal ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {isNormal ? "ACTIVE: NOMINAL" : `ACTIVE: ${activeFaults.length} FAULT${activeFaults.length > 1 ? "S" : ""}`}
            </span>
            <button
              onClick={() => clearFaults()}
              style={{
                fontSize: "0.58rem",
                padding: "0.1rem 0.35rem",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "3px",
                color: "#94a3b8",
                cursor: "pointer",
              }}
              title="Clear all driving faults"
            >
              CLEAR
            </button>
          </div>
        </div>

        {/* Compact Pill Buttons */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.35rem",
          }}
        >
          {BACKEND_SCENARIOS.map((sc) => {
            const isActive = checkIsActive(sc.id);
            const isInjecting = injectingId === sc.id;

            return (
              <button
                key={sc.id}
                disabled={!isConnected || isInjecting}
                onClick={() => handleToggle(sc.id)}
                title={sc.desc}
                style={{
                  background: isActive ? "rgba(56, 189, 248, 0.25)" : "rgba(255, 255, 255, 0.03)",
                  border: `1px solid ${isActive ? "var(--accent-cyan, #38bdf8)" : "rgba(255, 255, 255, 0.08)"}`,
                  color: isActive ? "#38bdf8" : "#cbd5e1",
                  borderRadius: "4px",
                  padding: "0.22rem 0.5rem",
                  fontSize: "0.68rem",
                  fontWeight: isActive ? 800 : 600,
                  cursor: isConnected ? "pointer" : "not-allowed",
                  transition: "all 0.15s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  boxShadow: isActive ? "0 0 8px rgba(56, 189, 248, 0.25)" : "none",
                }}
              >
                {isActive && <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#38bdf8" }} />}
                <span>{sc.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fault-injection-panel"
      style={{
        background: "var(--bg-card, rgba(14, 21, 38, 0.75))",
        border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
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
              FAULT INJECTION MATRIX
            </span>
            <span
              style={{
                fontSize: "0.58rem",
                fontWeight: 800,
                padding: "0.1rem 0.4rem",
                borderRadius: "3px",
                background: "rgba(56, 189, 248, 0.15)",
                color: "var(--accent-cyan, #38bdf8)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
              }}
            >
              MULTI-FAULT PROPAGATION HARNESS
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
              CONDITION: {engineCondition}
            </span>
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-secondary, #94a3b8)", marginTop: "0.1rem" }}>
            Toggle multiple simultaneous faults to observe physics cross-synergies, cascades &amp; degradation
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
            onClick={() => clearFaults()}
            style={{
              fontSize: "0.62rem",
              fontWeight: 700,
              padding: "0.2rem 0.55rem",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "4px",
              color: "#cbd5e1",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="Clear all active driving faults (preserves accumulated wear)"
          >
            CLEAR ALL
          </button>

          <button
            onClick={() => resetOverhaul()}
            style={{
              fontSize: "0.62rem",
              fontWeight: 700,
              padding: "0.2rem 0.55rem",
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "4px",
              color: "#10b981",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="Perform full maintenance overhaul: resets all wear and faults to factory baseline"
          >
            OVERHAUL
          </button>
        </div>
      </div>

      {/* Responsive Grid of Fault Scenarios */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
          gap: "0.5rem",
        }}
      >
        {BACKEND_SCENARIOS.map((sc) => {
          const isActive = checkIsActive(sc.id);
          const isInjecting = injectingId === sc.id;

          const sevColor =
            sc.severity === "CRITICAL"
              ? "var(--accent-rose, #ef4444)"
              : sc.severity === "HIGH"
              ? "var(--accent-rose, #ef4444)"
              : sc.severity === "MEDIUM"
              ? "var(--accent-amber, #f59e0b)"
              : sc.severity === "LOW"
              ? "var(--accent-cyan, #38bdf8)"
              : "var(--accent-emerald, #10b981)";

          return (
            <button
              key={sc.id}
              disabled={!isConnected || isInjecting}
              onClick={() => handleToggle(sc.id)}
              style={{
                background: isActive
                  ? "rgba(56, 189, 248, 0.16)"
                  : "rgba(255, 255, 255, 0.02)",
                border: `1px solid ${
                  isActive
                    ? "var(--accent-cyan, #38bdf8)"
                    : "rgba(255, 255, 255, 0.07)"
                }`,
                borderRadius: "6px",
                padding: "0.45rem 0.55rem",
                textAlign: "left",
                cursor: isConnected ? "pointer" : "not-allowed",
                transition: "all 0.15s ease",
                opacity: isConnected ? 1 : 0.6,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "0.22rem",
                minHeight: "68px",
                boxShadow: isActive ? "0 0 12px rgba(56, 189, 248, 0.22)" : "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    color: isActive ? "#38bdf8" : "#f8fafc",
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
                  {sc.severity}
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
                  borderTop: "1px solid rgba(255, 255, 255, 0.04)",
                  paddingTop: "0.15rem",
                }}
              >
                <span>SYS: {sc.subsystem}</span>
                {isActive ? (
                  <span style={{ color: "#38bdf8", fontWeight: 800 }}>● ACTIVE</span>
                ) : isInjecting ? (
                  <span style={{ color: "#f59e0b" }}>UPDATING...</span>
                ) : (
                  <span style={{ color: "var(--accent-cyan, #38bdf8)" }}>TOGGLE ↻</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
