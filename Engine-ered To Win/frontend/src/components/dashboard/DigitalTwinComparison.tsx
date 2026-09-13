"use client";

import React from "react";
import { useTelemetry } from "@/context/TelemetryContext";
import ActualVsExpectedChart from "./ActualVsExpectedChart";

interface ParamCardDef {
  key: string;
  name: string;
  unit: string;
  decimals: number;
}

const PARAMS: ParamCardDef[] = [
  { key: "rpm", name: "Engine RPM", unit: "RPM", decimals: 0 },
  { key: "cht_c", name: "CHT", unit: "°C", decimals: 1 },
  { key: "egt_c", name: "EGT", unit: "°C", decimals: 1 },
  { key: "oil_pressure_bar", name: "Oil Pressure", unit: "bar", decimals: 2 },
  { key: "oil_temperature_c", name: "Oil Temp", unit: "°C", decimals: 1 },
  { key: "fuel_flow_lh", name: "Fuel Flow", unit: "L/h", decimals: 1 },
  { key: "vibration_g", name: "Vibration", unit: "g", decimals: 3 },
  { key: "battery_voltage_v", name: "Bus Voltage", unit: "V", decimals: 1 },
];

export default function DigitalTwinComparison() {
  const { telemetry, expectedState, residuals, isConnected } = useTelemetry();

  return (
    <div
      className="digital-twin-comparison-section"
      style={{
        background: "var(--bg-card, rgba(14, 21, 38, 0.75))",
        border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
        borderRadius: "10px",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
    >
      {/* Section Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1rem", fontWeight: 800, letterSpacing: "0.5px", color: "#f8fafc" }}>
              DIGITAL TWIN: ACTUAL VS EXPECTED STATE
            </span>
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 800,
                padding: "0.15rem 0.45rem",
                borderRadius: "4px",
                background: "rgba(56, 189, 248, 0.15)",
                color: "var(--accent-cyan, #38bdf8)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
              }}
            >
              PHYSICS TWIN ACTIVE
            </span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary, #94a3b8)", marginTop: "0.15rem" }}>
            Real sensor telemetry continuously benchmarked against thermodynamic virtual engine model
          </div>
        </div>

        <div style={{ fontSize: "0.72rem", color: "var(--text-muted, #64748b)" }}>
          {isConnected && expectedState ? "Virtual Engine Synchronized" : "Connecting to Twin..."}
        </div>
      </div>

      {/* Grid of 8 Parameter Comparison Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "0.65rem",
        }}
      >
        {PARAMS.map((p) => {
          const actualVal = (telemetry as any)[p.key] ?? null;
          const expectedVal = expectedState ? expectedState[p.key] ?? null : null;
          const resObj = residuals ? residuals[p.key] : null;

          // Residual & % Deviation from backend
          const residualVal = resObj ? resObj.residual : (actualVal != null && expectedVal != null ? actualVal - expectedVal : null);
          const pctDev = resObj ? resObj.pct_deviation : (
            actualVal != null && expectedVal != null && Math.abs(expectedVal) > 0.001
              ? ((actualVal - expectedVal) / expectedVal) * 100
              : null
          );

          const isWarning = pctDev != null && Math.abs(pctDev) >= 5.0;
          const isCritical = pctDev != null && Math.abs(pctDev) >= 12.0;

          const devColor = isCritical
            ? "var(--accent-rose, #ef4444)"
            : isWarning
            ? "var(--accent-amber, #f59e0b)"
            : "var(--accent-emerald, #10b981)";

          return (
            <div
              key={p.key}
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: `1px solid ${isCritical || isWarning ? `${devColor}55` : "rgba(255, 255, 255, 0.06)"}`,
                borderRadius: "6px",
                padding: "0.65rem 0.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#e2e8f0" }}>{p.name}</span>
                {pctDev != null && (
                  <span
                    style={{
                      fontSize: "0.62rem",
                      fontWeight: 800,
                      fontFamily: "var(--font-mono, monospace)",
                      color: devColor,
                    }}
                  >
                    {pctDev > 0 ? `+${pctDev.toFixed(1)}` : pctDev.toFixed(1)}%
                  </span>
                )}
              </div>

              {/* Actual vs Expected Readout */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "0.15rem" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.62rem", color: "var(--text-muted, #64748b)" }}>Actual</span>
                  <span
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      fontFamily: "var(--font-mono, monospace)",
                      color: "#f8fafc",
                    }}
                  >
                    {actualVal != null ? Number(actualVal).toFixed(p.decimals) : "—"}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <span style={{ fontSize: "0.62rem", color: "var(--text-muted, #64748b)" }}>Expected</span>
                  <span
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      fontFamily: "var(--font-mono, monospace)",
                      color: "var(--accent-cyan, #38bdf8)",
                    }}
                  >
                    {expectedVal != null ? Number(expectedVal).toFixed(p.decimals) : "—"}
                  </span>
                </div>
              </div>

              {/* Residual delta tag */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.62rem",
                  paddingTop: "0.3rem",
                  borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                  color: "var(--text-secondary, #94a3b8)",
                }}
              >
                <span>Res: {residualVal != null ? (residualVal > 0 ? `+${residualVal.toFixed(p.decimals)}` : residualVal.toFixed(p.decimals)) : "—"}</span>
                <span>{p.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Embedded Dynamic Time-Series Chart */}
      <div
        style={{
          background: "rgba(0, 0, 0, 0.25)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          borderRadius: "8px",
          padding: "1rem",
          overflow: "hidden",
        }}
      >
        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#e2e8f0", marginBottom: "0.5rem" }}>
          LIVE TEMPORAL BENCHMARK (REAL SENSOR DIVERGENCE FROM TWIN)
        </div>
        <ActualVsExpectedChart />
      </div>
    </div>
  );
}
