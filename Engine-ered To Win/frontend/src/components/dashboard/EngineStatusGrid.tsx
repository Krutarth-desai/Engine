"use client";

import React from "react";
import { useTelemetry } from "@/context/TelemetryContext";
import { NavView } from "@/components/Sidebar";

interface EngineStatusGridProps {
  onNavigate?: (view: NavView) => void;
  onSelectParam?: (paramKey: string) => void;
}

interface TelemetryChannel {
  key: string;
  name: string;
  code: string;
  unit: string;
  decimals: number;
  min: number;
  max: number;
  warnLow?: number;
  warnHigh?: number;
  critLow?: number;
  critHigh?: number;
  getValue: (t: any) => number | null;
}

const CHANNELS: TelemetryChannel[] = [
  {
    key: "rpm",
    name: "Engine Speed",
    code: "RPM",
    unit: "RPM",
    decimals: 0,
    min: 0,
    max: 3200,
    warnLow: 2100,
    warnHigh: 2750,
    critHigh: 2900,
    getValue: (t) => t?.rpm ?? t?.sensors?.rpm?.value ?? null,
  },
  {
    key: "cht_c",
    name: "Cylinder Head",
    code: "CHT",
    unit: "°C",
    decimals: 1,
    min: 20,
    max: 250,
    warnHigh: 175,
    critHigh: 200,
    getValue: (t) => t?.cht_c ?? t?.sensors?.cht?.value ?? null,
  },
  {
    key: "egt_c",
    name: "Exhaust Gas",
    code: "EGT",
    unit: "°C",
    decimals: 1,
    min: 200,
    max: 900,
    warnHigh: 720,
    critHigh: 780,
    getValue: (t) => t?.egt_c ?? t?.sensors?.egt?.value ?? null,
  },
  {
    key: "oil_pressure_bar",
    name: "Oil Pressure",
    code: "OIL PRESS",
    unit: "bar",
    decimals: 2,
    min: 0,
    max: 8.0,
    warnLow: 2.8,
    warnHigh: 6.2,
    critLow: 2.2,
    getValue: (t) => {
      if (t?.oil_pressure_bar != null) return t.oil_pressure_bar;
      if (t?.sensors?.oil_pressure?.value != null) return t.sensors.oil_pressure.value / 14.5038;
      return null;
    },
  },
  {
    key: "oil_temperature_c",
    name: "Oil Temp",
    code: "OIL TEMP",
    unit: "°C",
    decimals: 1,
    min: 20,
    max: 150,
    warnHigh: 105,
    critHigh: 120,
    getValue: (t) => t?.oil_temperature_c ?? t?.sensors?.oil_temperature?.value ?? null,
  },
  {
    key: "fuel_flow_lh",
    name: "Fuel Flow",
    code: "FUEL FLOW",
    unit: "L/h",
    decimals: 1,
    min: 0,
    max: 35,
    warnHigh: 24,
    critHigh: 28,
    getValue: (t) => t?.fuel_flow_lh ?? t?.sensors?.fuel_flow?.value ?? null,
  },
  {
    key: "vibration_g",
    name: "Vibration",
    code: "VIBRATION",
    unit: "g",
    decimals: 3,
    min: 0,
    max: 5.0,
    warnHigh: 2.5,
    critHigh: 3.5,
    getValue: (t) => t?.vibration_g ?? t?.sensors?.vibration?.value ?? null,
  },
  {
    key: "battery_voltage_v",
    name: "Bus Voltage",
    code: "VOLTAGE",
    unit: "V",
    decimals: 1,
    min: 18,
    max: 32,
    warnLow: 24.0,
    warnHigh: 30.0,
    critLow: 22.0,
    getValue: (t) => t?.battery_voltage_v ?? 28.2,
  },
];

export default function EngineStatusGrid({ onNavigate, onSelectParam }: EngineStatusGridProps) {
  const { telemetry, isConnected } = useTelemetry();

  return (
    <div
      className="engine-status-readouts-panel"
      style={{
        background: "var(--bg-card, rgba(14, 21, 38, 0.75))",
        border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
        borderRadius: "8px",
        padding: "0.85rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.5px", color: "#f8fafc" }}>
            ENGINE STATUS READOUTS (LIVE HUD)
          </span>
          <span
            style={{
              fontSize: "0.62rem",
              fontWeight: 700,
              padding: "0.1rem 0.35rem",
              borderRadius: "3px",
              background: isConnected ? "rgba(16, 185, 129, 0.15)" : "rgba(100, 116, 139, 0.2)",
              color: isConnected ? "var(--accent-emerald, #10b981)" : "#94a3b8",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            {isConnected ? "8 CHANNELS LIVE" : "DISCONNECTED"}
          </span>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate("telemetry")}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--accent-cyan, #38bdf8)",
              fontSize: "0.68rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.15rem 0.35rem",
            }}
          >
            TELEMETRY →
          </button>
        )}
      </div>

      {/* 8-Channel Compact Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "0.5rem",
        }}
      >
        {CHANNELS.map((ch) => {
          const val = isConnected ? ch.getValue(telemetry) : null;

          let status: "NOMINAL" | "WARNING" | "CRITICAL" = "NOMINAL";
          if (val != null) {
            if (
              (ch.critHigh != null && val >= ch.critHigh) ||
              (ch.critLow != null && val <= ch.critLow)
            ) {
              status = "CRITICAL";
            } else if (
              (ch.warnHigh != null && val >= ch.warnHigh) ||
              (ch.warnLow != null && val <= ch.warnLow)
            ) {
              status = "WARNING";
            }
          }

          const statusColor =
            status === "CRITICAL"
              ? "var(--accent-rose, #ef4444)"
              : status === "WARNING"
              ? "var(--accent-amber, #f59e0b)"
              : "var(--accent-emerald, #10b981)";

          const pct =
            val != null
              ? Math.min(100, Math.max(0, ((val - ch.min) / (ch.max - ch.min)) * 100))
              : 0;

          return (
            <div
              key={ch.key}
              onClick={() => onSelectParam?.(ch.key)}
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: `1px solid ${status !== "NOMINAL" ? `${statusColor}55` : "rgba(255, 255, 255, 0.06)"}`,
                borderRadius: "6px",
                padding: "0.45rem 0.6rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.2rem",
                cursor: onSelectParam ? "pointer" : "default",
                transition: "background 0.2s ease, border-color 0.2s ease",
              }}
            >
              {/* Channel Label & Status Dot */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span
                  style={{
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                    color: "var(--text-secondary, #94a3b8)",
                    textTransform: "uppercase",
                  }}
                >
                  {ch.code}
                </span>
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: val != null ? statusColor : "#64748b",
                    boxShadow: val != null && status !== "NOMINAL" ? `0 0 6px ${statusColor}` : "none",
                  }}
                />
              </div>

              {/* Value & Unit */}
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <span
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 900,
                    fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                    color: val != null ? (status !== "NOMINAL" ? statusColor : "#f8fafc") : "#64748b",
                    lineHeight: 1.1,
                  }}
                >
                  {val != null ? (ch.decimals === 0 ? Math.round(val).toLocaleString() : val.toFixed(ch.decimals)) : "—"}
                </span>
                <span
                  style={{
                    fontSize: "0.62rem",
                    color: "var(--text-muted, #64748b)",
                    fontFamily: "var(--font-mono, monospace)",
                    fontWeight: 600,
                  }}
                >
                  {ch.unit}
                </span>
              </div>

              {/* Mini Range Bar */}
              <div
                style={{
                  width: "100%",
                  height: "3px",
                  background: "rgba(255, 255, 255, 0.06)",
                  borderRadius: "2px",
                  overflow: "hidden",
                  marginTop: "0.15rem",
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: statusColor,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
