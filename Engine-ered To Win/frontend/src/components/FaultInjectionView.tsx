"use client";

import React from "react";
import { useTelemetry } from "@/context/TelemetryContext";
import { Zap, AlertTriangle, RefreshCw, CheckCircle2 } from "lucide-react";
import { SCENARIO_REGISTRY, ScenarioItem } from "@/lib/scenarios";

export default function FaultInjectionView() {
  const { activeScenario, injectScenario, resetScenario } = useTelemetry();

  const isSimulationActive = activeScenario && activeScenario !== "Normal";
  const activeObj: ScenarioItem =
    SCENARIO_REGISTRY.find((s) => s.id === activeScenario) || SCENARIO_REGISTRY[0];

  return (
    <div className="view-container" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem 1.25rem", minHeight: "100%", boxSizing: "border-box" }}>
      {/* Page Header */}
      <div className="view-header-strip" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
        <div>
          <h1 className="page-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Zap size={20} style={{ color: "var(--accent)" }} />
            Fault Injection Simulation Matrix
          </h1>
          <p className="text-caption" style={{ color: "var(--text-muted)", margin: "0.25rem 0 0 0" }}>
            Evaluate predictive model anomaly detection, RUL degradation rates, and isolation confidence across 9 failure modes.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {isSimulationActive && (
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
          )}
        </div>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem", flex: 1, minHeight: 0 }}>
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
    </div>
  );
}
