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
    id: "Overheating",
    name: "Cylinder Overheating",
    subsystem: "Thermal",
    desc: "Thermal runaway: CHT ramps +40°C, EGT ramps +60°C",
    severity: "HIGH",
  },
  {
    id: "Injector_Degradation",
    name: "Injector Degradation",
    subsystem: "Combustion",
    desc: "Partially clogged nozzle: Fuel flow +5 L/h, EGT +40°C, RPM instability",
    severity: "MEDIUM",
  },
  {
    id: "Lubrication",
    name: "Lubrication Failure",
    subsystem: "Lubrication",
    desc: "Oil pressure drops -1.8 bar, oil temp climbs +25°C, bearing friction",
    severity: "HIGH",
  },
  {
    id: "Vibration_Fault",
    name: "Mechanical Imbalance",
    subsystem: "Mechanical",
    desc: "Crankshaft / propeller harmonic imbalance: Vibration +0.8 g",
    severity: "MEDIUM",
  },
  {
    id: "Sensor_Drift",
    name: "CHT Sensor Drift",
    subsystem: "Sensor",
    desc: "Slow thermocouple bias drift without engine stress",
    severity: "LOW",
  },
  {
    id: "Misfire",
    name: "Combustion Misfire",
    subsystem: "Combustion",
    desc: "Intermittent ignition miss: RPM drops 300 RPM, vibration surges",
    severity: "HIGH",
  },
  {
    id: "Sensor_Fault_Temp",
    name: "Sensor Failure Isolation",
    subsystem: "Sensor",
    desc: "CHT spikes to 350°C; AI isolates sensor error, suppressing false engine alarm",
    severity: "LOW",
  },
  {
    id: "Engine_Failure_Multi",
    name: "Multi-Sensor Engine Failure",
    subsystem: "All Systems",
    desc: "Correlated multi-subsystem catastrophic breakdown",
    severity: "CRITICAL",
  },
];

interface FaultInjectionPanelProps {
  compact?: boolean;
}

export default function FaultInjectionPanel({ compact = false }: FaultInjectionPanelProps) {
  const { activeScenario, injectScenario, isConnected } = useTelemetry();
  const [injectingId, setInjectingId] = useState<string | null>(null);

  const handleInject = async (scId: string) => {
    setInjectingId(scId);
    try {
      await injectScenario(scId);
    } finally {
      setInjectingId(null);
    }
  };

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.5px", color: "#f8fafc" }}>
              FAULT INJECTION MATRIX
            </span>
            <span style={{ fontSize: "0.62rem", color: "var(--text-muted, #64748b)" }}>
              (PHYSICS TEST HARNESS)
            </span>
          </div>
          <span
            style={{
              fontSize: "0.62rem",
              fontWeight: 800,
              padding: "0.1rem 0.4rem",
              borderRadius: "3px",
              background: activeScenario === "Normal" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
              color: activeScenario === "Normal" ? "var(--accent-emerald, #10b981)" : "var(--accent-amber, #f59e0b)",
              border: `1px solid ${activeScenario === "Normal" ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            ACTIVE: {activeScenario.toUpperCase()}
          </span>
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
            const isActive = activeScenario === sc.id;
            const isInjecting = injectingId === sc.id;

            return (
              <button
                key={sc.id}
                disabled={!isConnected || isInjecting}
                onClick={() => handleInject(sc.id)}
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <span style={{ fontSize: "0.88rem", fontWeight: 800, letterSpacing: "0.5px", color: "#f8fafc" }}>
              FAULT INJECTION MATRIX
            </span>
            <span
              style={{
                fontSize: "0.58rem",
                fontWeight: 800,
                padding: "0.1rem 0.4rem",
                borderRadius: "3px",
                background: "rgba(245, 158, 11, 0.15)",
                color: "var(--accent-amber, #f59e0b)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
              }}
            >
              PHYSICS TEST HARNESS
            </span>
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-secondary, #94a3b8)", marginTop: "0.1rem" }}>
            Inject thermodynamic &amp; sensor anomalies to benchmark live twin divergence
          </div>
        </div>

        {/* Active Scenario Status Pill */}
        <div
          style={{
            fontSize: "0.65rem",
            fontWeight: 800,
            padding: "0.2rem 0.55rem",
            borderRadius: "4px",
            background: activeScenario === "Normal" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
            color: activeScenario === "Normal" ? "var(--accent-emerald, #10b981)" : "var(--accent-amber, #f59e0b)",
            border: `1px solid ${activeScenario === "Normal" ? "rgba(16, 185, 129, 0.35)" : "rgba(245, 158, 11, 0.35)"}`,
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
              backgroundColor: activeScenario === "Normal" ? "#10b981" : "#f59e0b",
              boxShadow: activeScenario === "Normal" ? "0 0 6px #10b981" : "0 0 6px #f59e0b",
            }}
          />
          <span>ACTIVE: {activeScenario.toUpperCase()}</span>
        </div>
      </div>

      {/* 3x3 Responsive Matrix of 9 Real Backend Scenarios */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
          gap: "0.5rem",
        }}
      >
        {BACKEND_SCENARIOS.map((sc) => {
          const isActive = activeScenario === sc.id;
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
              onClick={() => handleInject(sc.id)}
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
                boxShadow: isActive ? "0 0 12px rgba(56, 189, 248, 0.18)" : "none",
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
                  <span style={{ color: "#f59e0b" }}>INJECTING...</span>
                ) : (
                  <span style={{ color: "var(--accent-cyan, #38bdf8)" }}>INJECT →</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
