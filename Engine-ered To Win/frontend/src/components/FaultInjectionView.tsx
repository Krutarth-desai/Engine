"use client";

import React from "react";
import { useTelemetry } from "@/context/TelemetryContext";
import { useProfile } from "@/context/ProfileContext";
import PageLayout from "./common/PageLayout";
import {
  Zap,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Lock,
  Shield,
  Sparkles,
  Wrench,
} from "lucide-react";
import { SCENARIO_REGISTRY, ScenarioItem } from "@/lib/scenarios";

export default function FaultInjectionView() {
  const { activeScenario, injectScenario, resetScenario } = useTelemetry();
  const { profile, profileDef, setProfile } = useProfile();

  const isSimulationActive = activeScenario && activeScenario !== "Normal";
  const activeObj: ScenarioItem =
    SCENARIO_REGISTRY.find((s) => s.id === activeScenario) || SCENARIO_REGISTRY[0];

  return (
    <PageLayout
      title="Fault Injection Simulation Matrix"
      subtitle="Evaluate predictive model anomaly detection, RUL degradation rates, and isolation confidence across 9 failure modes."
      icon={<Zap size={18} />}
      actions={
        isSimulationActive && profile !== "operator" ? (
          <button
            onClick={resetScenario}
            className="btn-secondary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.35rem 0.85rem",
              borderRadius: "6px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} />
            Reset to Nominal Cruise
          </button>
        ) : undefined
      }
    >
      {/* RBAC Operator Safety Lockout Banner */}
      {profile === "operator" ? (
        <div
          className="card"
          style={{
            background: "var(--surface-1)",
            border: "1px solid color-mix(in srgb, var(--status-caution) 40%, var(--surface-1))",
            borderRadius: "12px",
            padding: "1.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            maxWidth: "800px",
            margin: "1rem auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "color-mix(in srgb, var(--status-caution) 12%, var(--surface-1))",
                border: "1px solid var(--status-caution)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Lock size={22} style={{ color: "var(--status-caution)" }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "var(--status-caution)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontFamily: "var(--font-mono), monospace",
                  }}
                >
                  RBAC Flight Safety Interlock Active
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "4px",
                    padding: "0.1rem 0.4rem",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono), monospace",
                  }}
                >
                  GCS OPERATOR PROFILE
                </span>
              </div>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)", margin: "0 0 0.5rem 0" }}>
                Fault Injection Simulation Restricted During Live Flight
              </h2>
              <p style={{ fontSize: "13px", lineHeight: "1.6", color: "var(--text-muted)", margin: 0 }}>
                <strong>Defense Flight Safety Rationale:</strong> In live defense UAV operations, GCS operators are actively managing airframe survivability and tactical flight corridors. Exposing manual fault injection triggers on the operational console presents an unacceptable risk of accidental activation or cognitive confusion during live sorties.
              </p>
            </div>
          </div>

          <div
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "1rem",
              fontSize: "12px",
              color: "var(--text-muted)",
              lineHeight: "1.5",
            }}
          >
            <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: "0.25rem" }}>
              Authorized Testing Personas:
            </div>
            <ul style={{ margin: "0.35rem 0 0 1.25rem", padding: 0 }}>
              <li><strong>Maintenance Team:</strong> Allowed preset component diagnostic validation for pre-flight BIT and bench harnesses.</li>
              <li><strong>Propulsion Engineer:</strong> Unrestricted multi-fault injection matrix for digital twin degradation modeling and ML stress testing.</li>
            </ul>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              onClick={() => setProfile("propulsion")}
              className="btn-primary"
              style={{
                padding: "0.5rem 1.2rem",
                borderRadius: "6px",
                fontSize: "12.5px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <Sparkles size={14} />
              Switch to Propulsion Engineer Role
            </button>
            <button
              onClick={() => setProfile("maintenance")}
              className="btn-secondary"
              style={{
                padding: "0.5rem 1.2rem",
                borderRadius: "6px",
                fontSize: "12.5px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <Wrench size={14} />
              Switch to Maintenance Role
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Active Persona Entitlement Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.6rem 1rem",
              background: "var(--surface-2)",
              border: `1px solid ${profileDef.badgeBorder}`,
              borderRadius: "8px",
              fontSize: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Shield size={14} style={{ color: profileDef.badgeColor }} />
              <span style={{ color: "var(--text)", fontWeight: 600 }}>
                {profileDef.title}:
              </span>
              <span style={{ color: "var(--text-muted)" }}>
                {profile === "maintenance"
                  ? "Preset Component Validation Mode (Bench Test)"
                  : "Unrestricted Multi-Fault Simulation Matrix (Tier 3 Engineering)"}
              </span>
            </div>
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: 700,
                color: profileDef.badgeColor,
                fontFamily: "var(--font-mono), monospace",
                textTransform: "uppercase",
              }}
            >
              {profileDef.faultInjectionTier === "preset" ? "PRESET ACCESS" : "FULL ACCESS"}
            </span>
          </div>

      {/* Active Scenario Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.85rem 1.25rem",
          background: isSimulationActive ? "var(--surface-2)" : "var(--surface-1)",
          border: `1px solid ${isSimulationActive ? "var(--status-caution)" : "var(--border)"}`,
          borderRadius: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {isSimulationActive ? (
            <AlertTriangle size={20} style={{ color: "var(--status-caution)" }} />
          ) : (
            <CheckCircle2 size={20} style={{ color: "var(--status-nominal)" }} />
          )}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="text-caption" style={{ color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Active State:
              </span>
              <strong style={{ color: isSimulationActive ? "var(--status-caution)" : "var(--text)" }}>
                {activeObj.label}
              </strong>
              {isSimulationActive && (
                <span
                  style={{
                    fontSize: "11px",
                    background: "color-mix(in srgb, var(--status-caution) 14%, var(--surface-1))",
                    color: "var(--status-caution)",
                    border: "1px solid var(--status-caution)",
                    borderRadius: "4px",
                    padding: "0.1rem 0.4rem",
                    fontWeight: 600,
                  }}
                >
                  SIMULATION ACTIVE
                </span>
              )}
            </div>
            <p className="text-caption" style={{ color: "var(--text-muted)", margin: "0.2rem 0 0 0" }}>
              {activeObj.description}
            </p>
          </div>
        </div>

        {isSimulationActive && (
          <button
            onClick={resetScenario}
            className="btn-primary"
            style={{
              padding: "0.4rem 1rem",
              borderRadius: "6px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Clear Fault
          </button>
        )}
      </div>

      {/* 3x3 Scenario Matrix Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.85rem", flex: 1, minHeight: 0 }}>
        {SCENARIO_REGISTRY.map((sc: ScenarioItem) => {
          const isCurrent = activeScenario === sc.id;
          return (
            <div
              key={sc.id}
              className="card"
              style={{
                background: isCurrent ? "var(--surface-2)" : "var(--surface-1)",
                border: `1px solid ${isCurrent ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "12px",
                padding: "1.15rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "0.85rem",
                transition: "all 0.15s ease",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    {sc.category}
                  </span>
                  {isCurrent && (
                    <span
                      style={{
                        fontSize: "11px",
                        background: "var(--accent)",
                        color: "var(--accent-contrast)",
                        borderRadius: "4px",
                        padding: "0.1rem 0.4rem",
                        fontWeight: 600,
                      }}
                    >
                      ACTIVE
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: "15px", lineHeight: "20px", fontWeight: 600, margin: "0 0 0.35rem 0", color: "var(--text)" }}>
                  {sc.label}
                </h3>
                <p className="text-caption" style={{ color: "var(--text-muted)", margin: 0 }}>
                  {sc.description}
                </p>
                {sc.affectedComponent && (
                  <p className="text-caption" style={{ color: "var(--text-faint)", marginTop: "0.35rem", fontSize: "11px" }}>
                    Component: {sc.affectedComponent}
                  </p>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
                <span className="text-caption" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace", fontSize: "11px" }}>
                  ID: {sc.id}
                </span>
                <button
                  className={isCurrent ? "btn-secondary" : "btn-primary"}
                  onClick={() => injectScenario(sc.id)}
                  style={{
                    padding: "0.35rem 0.85rem",
                    borderRadius: "6px",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  {isCurrent ? "Active" : "Inject Mode"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  )}
</PageLayout>
);
}
