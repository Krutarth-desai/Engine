"use client";

import React from "react";
import { useTelemetry } from "@/context/TelemetryContext";

interface ResidualRowDef {
  key: string;
  name: string;
  unit: string;
  decimals: number;
}

const RESIDUAL_ROWS: ResidualRowDef[] = [
  { key: "rpm", name: "RPM (Engine Speed)", unit: "RPM", decimals: 0 },
  { key: "cht_c", name: "CHT (Cylinder Head Temp)", unit: "°C", decimals: 1 },
  { key: "egt_c", name: "EGT (Exhaust Gas Temp)", unit: "°C", decimals: 1 },
  { key: "oil_pressure_bar", name: "Oil Pressure", unit: "bar", decimals: 2 },
  { key: "oil_temperature_c", name: "Oil Temperature", unit: "°C", decimals: 1 },
  { key: "fuel_flow_lh", name: "Fuel Flow Rate", unit: "L/h", decimals: 1 },
  { key: "vibration_g", name: "Vibration Harmonics", unit: "g", decimals: 3 },
  { key: "battery_voltage_v", name: "Avionics Bus Voltage", unit: "V", decimals: 1 },
];

export default function ResidualPanel() {
  const { telemetry, expectedState, residuals, isConnected } = useTelemetry();

  return (
    <div
      className="residual-panel"
      style={{
        background: "var(--bg-card, rgba(14, 21, 38, 0.75))",
        border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
        borderRadius: "10px",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "0.95rem", fontWeight: 800, letterSpacing: "0.5px", color: "#f8fafc" }}>
            RESIDUAL &amp; DEVIATION MATRIX
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary, #94a3b8)", marginTop: "0.15rem" }}>
            Calculates raw error r = y - y_expected and relative divergence from virtual baseline
          </div>
        </div>
        <div
          style={{
            fontSize: "0.65rem",
            color: "var(--text-muted, #64748b)",
            background: "rgba(255, 255, 255, 0.04)",
            padding: "0.2rem 0.5rem",
            borderRadius: "4px",
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          {residuals ? "BACKEND RESIDUAL PIPELINE ACTIVE" : "SYNCHRONIZING..."}
        </div>
      </div>

      {/* Compact 1-Line Engineering Note */}
      <div style={{ fontSize: "0.68rem", color: "var(--text-muted, #64748b)", fontStyle: "italic" }}>
        Residual error <span style={{ color: "#38bdf8", fontFamily: "var(--font-mono, monospace)" }}>r = y_actual − y_expected</span> isolations benchmarked against virtual thermodynamic baseline.
      </div>

      {/* Compact Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.75rem",
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                color: "var(--text-secondary, #94a3b8)",
                textAlign: "left",
                fontSize: "0.68rem",
                letterSpacing: "0.5px",
              }}
            >
              <th style={{ padding: "0.5rem 0.5rem 0.5rem 0" }}>PARAMETER</th>
              <th style={{ padding: "0.5rem", textAlign: "right" }}>ACTUAL</th>
              <th style={{ padding: "0.5rem", textAlign: "right" }}>EXPECTED</th>
              <th style={{ padding: "0.5rem", textAlign: "right" }}>RESIDUAL</th>
              <th style={{ padding: "0.5rem", textAlign: "right" }}>DEVIATION</th>
              <th style={{ padding: "0.5rem 0 0.5rem 0.5rem", textAlign: "right" }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {RESIDUAL_ROWS.map((row) => {
              const actual = (telemetry as any)[row.key] ?? null;
              const expected = expectedState ? expectedState[row.key] ?? null : null;
              const resObj = residuals ? residuals[row.key] : null;

              const residualVal = resObj ? resObj.residual : (actual != null && expected != null ? actual - expected : null);
              const pctDev = resObj ? resObj.pct_deviation : (
                actual != null && expected != null && Math.abs(expected) > 0.001
                  ? ((actual - expected) / expected) * 100
                  : null
              );

              // Status classification based on deviation magnitude
              const absDev = pctDev != null ? Math.abs(pctDev) : 0;
              const status =
                actual == null
                  ? "—"
                  : absDev >= 12.0
                  ? "CRITICAL"
                  : absDev >= 5.0
                  ? "WARNING"
                  : "NORMAL";

              const statusColor =
                status === "NORMAL"
                  ? "var(--accent-emerald, #10b981)"
                  : status === "WARNING"
                  ? "var(--accent-amber, #f59e0b)"
                  : status === "CRITICAL"
                  ? "var(--accent-rose, #ef4444)"
                  : "#64748b";

              return (
                <tr
                  key={row.key}
                  style={{
                    borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                    transition: "background 0.2s",
                  }}
                >
                  <td style={{ padding: "0.5rem 0.5rem 0.5rem 0", color: "#f8fafc", fontWeight: 700 }}>
                    {row.name}
                  </td>
                  <td style={{ padding: "0.5rem", textAlign: "right", color: "#f8fafc" }}>
                    {actual != null ? `${Number(actual).toFixed(row.decimals)} ${row.unit}` : "—"}
                  </td>
                  <td style={{ padding: "0.5rem", textAlign: "right", color: "var(--accent-cyan, #38bdf8)" }}>
                    {expected != null ? `${Number(expected).toFixed(row.decimals)} ${row.unit}` : "—"}
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      textAlign: "right",
                      color: statusColor,
                      fontWeight: 700,
                    }}
                  >
                    {residualVal != null
                      ? `${residualVal > 0 ? `+${residualVal.toFixed(row.decimals)}` : residualVal.toFixed(row.decimals)} ${row.unit}`
                      : "—"}
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      textAlign: "right",
                      color: statusColor,
                      fontWeight: 800,
                    }}
                  >
                    {pctDev != null ? `${pctDev > 0 ? `+${pctDev.toFixed(1)}` : pctDev.toFixed(1)}%` : "—"}
                  </td>
                  <td style={{ padding: "0.5rem 0 0.5rem 0.5rem", textAlign: "right" }}>
                    <span
                      style={{
                        fontSize: "0.62rem",
                        fontWeight: 800,
                        padding: "0.15rem 0.4rem",
                        borderRadius: "3px",
                        background: `${statusColor}22`,
                        color: statusColor,
                        border: `1px solid ${statusColor}44`,
                      }}
                    >
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
