"use client";

import React from "react";
import { useTelemetry } from "@/context/TelemetryContext";
import { NavView } from "@/components/Sidebar";

interface TopKpiCardsProps {
  onNavigate?: (view: NavView) => void;
}

export default function TopKpiCards({ onNavigate }: TopKpiCardsProps) {
  const { telemetry, healthIndex, prognostics, payload, isConnected } = useTelemetry();

  // 1. Overall Health
  const healthStatus = payload.digital_twin?.health?.status || (
    healthIndex >= 85 ? "HEALTHY" : healthIndex >= 60 ? "DEGRADED" : "CRITICAL"
  );
  const healthColor =
    healthIndex >= 85 ? "var(--accent-emerald, #10b981)" : healthIndex >= 60 ? "var(--accent-amber, #f59e0b)" : "var(--accent-rose, #ef4444)";

  // 2. RUL
  const rulVal = prognostics?.predicted_rul != null ? Math.round(prognostics.predicted_rul) : null;
  const rulTrend = prognostics?.degradation_trend || "Stable";
  const rulRemainingTime = prognostics?.remaining_time_str || null;

  // 3. RPM
  const rpmVal = isConnected ? telemetry.rpm : null;
  const rpmStatus =
    rpmVal == null ? "—" : rpmVal > 2750 ? "OVERSPEED" : rpmVal < 2100 ? "LOW RPM" : "NOMINAL";
  const rpmColor =
    rpmVal == null ? "#94a3b8" : rpmVal > 2750 || rpmVal < 2100 ? "var(--accent-rose, #ef4444)" : "var(--accent-cyan, #38bdf8)";

  // 4. CHT
  const chtVal = isConnected ? telemetry.cht_c : null;
  const chtStatus =
    chtVal == null ? "—" : chtVal > 200 ? "CRITICAL" : chtVal > 175 ? "ELEVATED" : "NOMINAL";
  const chtColor =
    chtVal == null ? "#94a3b8" : chtVal > 175 ? "var(--accent-rose, #ef4444)" : "var(--accent-emerald, #10b981)";

  // 5. EGT
  const egtVal = isConnected ? telemetry.egt_c : null;
  const egtStatus =
    egtVal == null ? "—" : egtVal > 780 ? "CRITICAL" : egtVal > 720 ? "ELEVATED" : "NOMINAL";
  const egtColor =
    egtVal == null ? "#94a3b8" : egtVal > 720 ? "var(--accent-rose, #ef4444)" : "var(--accent-emerald, #10b981)";

  // 6. Oil Pressure
  const oilPVal = isConnected ? telemetry.oil_pressure_bar : null;
  const oilPStatus =
    oilPVal == null ? "—" : oilPVal < 2.5 ? "LOW PRESSURE" : oilPVal > 6.0 ? "HIGH PRESSURE" : "NOMINAL";
  const oilPColor =
    oilPVal == null ? "#94a3b8" : oilPVal < 2.5 || oilPVal > 6.0 ? "var(--accent-rose, #ef4444)" : "var(--accent-emerald, #10b981)";

  return (
    <div className="top-kpis-grid" style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: "0.75rem",
      marginBottom: "1rem"
    }}>
      {/* 1. Engine Health Card */}
      <div
        className="kpi-card"
        style={{
          background: "var(--bg-card, rgba(14, 21, 38, 0.75))",
          border: `1px solid ${healthIndex < 70 ? healthColor : "var(--border-subtle, rgba(255, 255, 255, 0.08))"}`,
          borderRadius: "8px",
          padding: "0.75rem 0.9rem",
          cursor: onNavigate ? "pointer" : "default",
          position: "relative",
          overflow: "hidden",
        }}
        onClick={() => onNavigate?.("dashboard")}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.5px", color: "var(--text-secondary, #94a3b8)" }}>
            ENGINE HEALTH
          </span>
          <span style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            padding: "0.15rem 0.4rem",
            borderRadius: "4px",
            background: `${healthColor}22`,
            color: healthColor,
            border: `1px solid ${healthColor}44`,
          }}>
            {isConnected ? healthStatus : "DISCONNECTED"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
          <span style={{ fontSize: "1.85rem", fontWeight: 900, fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: healthColor }}>
            {isConnected ? healthIndex : "—"}
          </span>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted, #64748b)" }}>/ 100</span>
        </div>
        <div style={{ fontSize: "0.68rem", color: "var(--text-secondary, #94a3b8)", marginTop: "0.25rem" }}>
          {isConnected ? (healthIndex >= 85 ? "Full Mission Envelope" : "Subsystem Stress Active") : "Awaiting Telemetry"}
        </div>
      </div>

      {/* 2. RUL Card */}
      <div
        className="kpi-card"
        style={{
          background: "var(--bg-card, rgba(14, 21, 38, 0.75))",
          border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
          borderRadius: "8px",
          padding: "0.75rem 0.9rem",
          cursor: onNavigate ? "pointer" : "default",
        }}
        onClick={() => onNavigate?.("rul")}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.5px", color: "var(--text-secondary, #94a3b8)" }}>
            PREDICTED RUL
          </span>
          <span style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            padding: "0.15rem 0.4rem",
            borderRadius: "4px",
            background: "rgba(56, 189, 248, 0.15)",
            color: "var(--accent-cyan, #38bdf8)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
          }}>
            {rulTrend.toUpperCase()}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
          <span style={{ fontSize: "1.85rem", fontWeight: 900, fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "var(--accent-cyan, #38bdf8)" }}>
            {rulVal != null ? rulVal : "—"}
          </span>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted, #64748b)" }}>CYCLES</span>
        </div>
        <div style={{ fontSize: "0.68rem", color: "var(--text-secondary, #94a3b8)", marginTop: "0.25rem" }}>
          {rulRemainingTime ? `≈ ${rulRemainingTime} Remaining` : "RUL model active"}
        </div>
      </div>

      {/* 3. RPM Card */}
      <div
        className="kpi-card"
        style={{
          background: "var(--bg-card, rgba(14, 21, 38, 0.75))",
          border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
          borderRadius: "8px",
          padding: "0.75rem 0.9rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.5px", color: "var(--text-secondary, #94a3b8)" }}>
            ENGINE RPM
          </span>
          <span style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            padding: "0.15rem 0.4rem",
            borderRadius: "4px",
            background: `${rpmColor}22`,
            color: rpmColor,
          }}>
            {rpmStatus}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
          <span style={{ fontSize: "1.85rem", fontWeight: 900, fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: rpmColor }}>
            {rpmVal != null ? rpmVal.toLocaleString() : "—"}
          </span>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted, #64748b)" }}>RPM</span>
        </div>
        <div style={{ fontSize: "0.68rem", color: "var(--text-secondary, #94a3b8)", marginTop: "0.25rem" }}>
          Baseline: 2450 RPM cruise
        </div>
      </div>

      {/* 4. CHT Card */}
      <div
        className="kpi-card"
        style={{
          background: "var(--bg-card, rgba(14, 21, 38, 0.75))",
          border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
          borderRadius: "8px",
          padding: "0.75rem 0.9rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.5px", color: "var(--text-secondary, #94a3b8)" }}>
            CYLINDER HEAD (CHT)
          </span>
          <span style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            padding: "0.15rem 0.4rem",
            borderRadius: "4px",
            background: `${chtColor}22`,
            color: chtColor,
          }}>
            {chtStatus}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
          <span style={{ fontSize: "1.85rem", fontWeight: 900, fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: chtColor }}>
            {chtVal != null ? chtVal.toFixed(1) : "—"}
          </span>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted, #64748b)" }}>°C</span>
        </div>
        <div style={{ fontSize: "0.68rem", color: "var(--text-secondary, #94a3b8)", marginTop: "0.25rem" }}>
          Max limit: 200 °C
        </div>
      </div>

      {/* 5. EGT Card */}
      <div
        className="kpi-card"
        style={{
          background: "var(--bg-card, rgba(14, 21, 38, 0.75))",
          border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
          borderRadius: "8px",
          padding: "0.75rem 0.9rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.5px", color: "var(--text-secondary, #94a3b8)" }}>
            EXHAUST GAS (EGT)
          </span>
          <span style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            padding: "0.15rem 0.4rem",
            borderRadius: "4px",
            background: `${egtColor}22`,
            color: egtColor,
          }}>
            {egtStatus}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
          <span style={{ fontSize: "1.85rem", fontWeight: 900, fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: egtColor }}>
            {egtVal != null ? egtVal.toFixed(1) : "—"}
          </span>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted, #64748b)" }}>°C</span>
        </div>
        <div style={{ fontSize: "0.68rem", color: "var(--text-secondary, #94a3b8)", marginTop: "0.25rem" }}>
          Nominal: 615 °C | Limit: 800 °C
        </div>
      </div>

      {/* 6. Oil Pressure Card */}
      <div
        className="kpi-card"
        style={{
          background: "var(--bg-card, rgba(14, 21, 38, 0.75))",
          border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
          borderRadius: "8px",
          padding: "0.75rem 0.9rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.5px", color: "var(--text-secondary, #94a3b8)" }}>
            OIL PRESSURE
          </span>
          <span style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            padding: "0.15rem 0.4rem",
            borderRadius: "4px",
            background: `${oilPColor}22`,
            color: oilPColor,
          }}>
            {oilPStatus}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
          <span style={{ fontSize: "1.85rem", fontWeight: 900, fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: oilPColor }}>
            {oilPVal != null ? oilPVal.toFixed(2) : "—"}
          </span>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted, #64748b)" }}>
            bar {oilPVal != null ? `(${(oilPVal * 14.5038).toFixed(0)} psi)` : ""}
          </span>
        </div>
        <div style={{ fontSize: "0.68rem", color: "var(--text-secondary, #94a3b8)", marginTop: "0.25rem" }}>
          Nominal range: 3.5 – 5.5 bar
        </div>
      </div>
    </div>
  );
}
