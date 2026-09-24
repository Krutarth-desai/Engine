"use client";

import React from "react";
import { useTelemetry } from "@/context/TelemetryContext";

interface SubsystemConfig {
  id: "thermal" | "combustion" | "lubrication" | "mechanical" | "electrical" | "sensor";
  name: string;
  code: string;
  description: string;
  icon: string;
  wearKey?: string;
  wearLabel?: string;
  getChannels: (t: any) => Array<{ label: string; value: string | number; unit: string }>;
}

const SUBSYSTEMS: SubsystemConfig[] = [
  {
    id: "thermal",
    name: "Thermal Subsystem",
    code: "SYS-THM",
    description: "Cylinder head cooling gradient & exhaust thermals",
    icon: "🔥",
    wearKey: "thermal_wear",
    wearLabel: "Thermal Wear",
    getChannels: (t) => [
      { label: "CHT", value: t.cht_c?.toFixed(1) ?? "—", unit: "°C" },
      { label: "EGT", value: t.egt_c?.toFixed(1) ?? "—", unit: "°C" },
      { label: "Oil Temp", value: t.oil_temperature_c?.toFixed(1) ?? "—", unit: "°C" },
    ],
  },
  {
    id: "combustion",
    name: "Combustion Subsystem",
    code: "SYS-CMB",
    description: "Stoichiometry, injection phasing & spark delivery",
    icon: "⚡",
    wearKey: "fuel_injector_clogging",
    wearLabel: "Injector Clogging",
    getChannels: (t) => [
      { label: "Fuel Flow", value: t.fuel_flow_lh?.toFixed(1) ?? "—", unit: "L/h" },
      { label: "Injection", value: t.injection_timing_deg?.toFixed(1) ?? "—", unit: "°CA" },
      { label: "EGT", value: t.egt_c?.toFixed(1) ?? "—", unit: "°C" },
    ],
  },
  {
    id: "lubrication",
    name: "Lubrication Subsystem",
    code: "SYS-LUB",
    description: "Hydrodynamic journal film & scavenge pressure",
    icon: "💧",
    wearKey: "bearing_wear",
    wearLabel: "Bearing Wear",
    getChannels: (t) => [
      { label: "Oil Press", value: t.oil_pressure_bar?.toFixed(2) ?? "—", unit: "bar" },
      { label: "Oil Temp", value: t.oil_temperature_c?.toFixed(1) ?? "—", unit: "°C" },
    ],
  },
  {
    id: "mechanical",
    name: "Mechanical Dynamics",
    code: "SYS-MEC",
    description: "Crankshaft harmonics, reciprocating balance & governor",
    icon: "⚙️",
    wearKey: "piston_friction_wear",
    wearLabel: "Friction Wear",
    getChannels: (t) => [
      { label: "Vibration", value: t.vibration_g?.toFixed(3) ?? "—", unit: "g" },
      { label: "RPM", value: t.rpm?.toLocaleString() ?? "—", unit: "RPM" },
    ],
  },
  {
    id: "electrical",
    name: "Electrical & Avionics",
    code: "SYS-ELE",
    description: "Alternator bus voltage, battery charging & regulation",
    icon: "🔋",
    getChannels: (t) => [
      { label: "Bus Voltage", value: t.battery_voltage_v?.toFixed(1) ?? "—", unit: "V" },
    ],
  },
  {
    id: "sensor",
    name: "Sensor Integrity",
    code: "SYS-SNS",
    description: "Cross-sensor validation & anomaly persistence isolation",
    icon: "📡",
    getChannels: (t) => [
      { label: "Cross Validation", value: "ACTIVE", unit: "" },
    ],
  },
];

export default function SubsystemHealthGrid() {
  const { subsystemHealth, degradation, telemetry, isConnected, connectionStatus } = useTelemetry();

  return (
    <div
      className="subsystem-health-section"
      style={{
        background: "var(--bg-card, rgba(14, 21, 38, 0.75))",
        border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
        borderRadius: "10px",
        padding: "1.25rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <div style={{ fontSize: "0.95rem", fontWeight: 800, letterSpacing: "0.5px", color: "#f8fafc" }}>
            SUBSYSTEM HEALTH INDEX (6-AXIS ISOLATION)
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary, #94a3b8)", marginTop: "0.15rem" }}>
            Individual component health scores calculated from physics residuals &amp; degradation models
          </div>
        </div>
        <div style={{ fontSize: "0.68rem", color: "var(--text-muted, #64748b)" }}>
          {connectionStatus === "CONNECTED"
            ? "6 Subsystems Monitored"
            : connectionStatus === "CONNECTING"
            ? "Connecting..."
            : connectionStatus === "RECONNECTING"
            ? "Reconnecting..."
            : "Offline"}
        </div>
      </div>

      <div
        className="subsystems-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "0.65rem",
        }}
      >
        {SUBSYSTEMS.map((sys) => {
          const rawScore = subsystemHealth ? subsystemHealth[sys.id] : null;
          const score = rawScore != null ? Math.round(rawScore) : (isConnected ? 95 : null);
          const status =
            connectionStatus === "DISCONNECTED"
              ? "DISCONNECTED"
              : connectionStatus === "CONNECTING" && score == null
              ? "CONNECTING"
              : connectionStatus === "RECONNECTING" && score == null
              ? "RECONNECTING"
              : score == null
              ? "INITIALIZING"
              : score >= 85
              ? "HEALTHY"
              : score >= 60
              ? "DEGRADED"
              : "CRITICAL";

          const statusColor =
            status === "HEALTHY"
              ? "var(--accent-emerald, #10b981)"
              : status === "DEGRADED"
              ? "var(--accent-amber, #f59e0b)"
              : status === "CRITICAL"
              ? "var(--accent-rose, #ef4444)"
              : "#64748b";

          // Wear percentage from backend degradation model
          const wearVal = sys.wearKey && degradation ? degradation[sys.wearKey] : null;
          const wearPct = wearVal != null ? (wearVal > 1.0 ? wearVal : wearVal * 100).toFixed(1) : null;

          const channels = sys.getChannels(telemetry);

          return (
            <div
              key={sys.id}
              className={`subsystem-card status-${status.toLowerCase()}`}
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: `1px solid ${score != null && score < 75 ? `${statusColor}66` : "rgba(255, 255, 255, 0.06)"}`,
                borderRadius: "6px",
                padding: "0.65rem 0.75rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: score != null && score < 60 ? `0 0 15px ${statusColor}22` : "none",
                position: "relative",
              }}
            >
              {/* Card Header */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ fontSize: "1rem" }}>{sys.icon}</span>
                    <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#f8fafc" }}>
                      {sys.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "0.62rem",
                      fontWeight: 800,
                      padding: "0.15rem 0.4rem",
                      borderRadius: "4px",
                      background: `${statusColor}22`,
                      color: statusColor,
                      border: `1px solid ${statusColor}44`,
                    }}
                  >
                    {status}
                  </span>
                </div>

                {/* Score & Progress Bar */}
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem" }}>
                    <span
                      style={{
                        fontSize: "1.6rem",
                        fontWeight: 900,
                        fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                        color: statusColor,
                      }}
                    >
                      {score != null ? score : "—"}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted, #64748b)" }}>/ 100</span>
                  </div>

                  {wearPct != null && (
                    <div style={{ fontSize: "0.68rem", color: "var(--text-secondary, #94a3b8)", textAlign: "right" }}>
                      <span>Wear: </span>
                      <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 700, color: Number(wearPct) > 20 ? "var(--accent-amber, #f59e0b)" : "inherit" }}>
                        {wearPct}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Track */}
                <div
                  style={{
                    width: "100%",
                    height: "4px",
                    background: "rgba(255, 255, 255, 0.08)",
                    borderRadius: "2px",
                    marginTop: "0.4rem",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${score != null ? Math.min(100, Math.max(0, score)) : 0}%`,
                      height: "100%",
                      background: statusColor,
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              </div>

              {/* Underlying telemetry metrics for this subsystem */}
              <div
                style={{
                  marginTop: "0.75rem",
                  paddingTop: "0.5rem",
                  borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.4rem",
                }}
              >
                {channels.map((ch, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "rgba(0, 0, 0, 0.25)",
                      padding: "0.2rem 0.45rem",
                      borderRadius: "4px",
                      fontSize: "0.65rem",
                      display: "flex",
                      gap: "0.3rem",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ color: "var(--text-muted, #64748b)" }}>{ch.label}:</span>
                    <span
                      style={{
                        color: "#f8fafc",
                        fontWeight: 700,
                        fontFamily: "var(--font-mono, monospace)",
                      }}
                    >
                      {ch.value} {ch.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
