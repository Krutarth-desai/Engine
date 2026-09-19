"use client";

import React from "react";
import { UnifiedTelemetryPayload } from "@/types/telemetry";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface LiveTelemetryCompactRowProps {
  payload: UnifiedTelemetryPayload;
  onSelectChannel?: (channelKey: string) => void;
}

interface ChannelDef {
  key: string;
  label: string;
  value: number;
  displayValue: string;
  unit: string;
  min: number;
  max: number;
  trend: "UP" | "DOWN" | "STABLE";
}

export default function LiveTelemetryCompactRow({
  payload,
  onSelectChannel,
}: LiveTelemetryCompactRowProps) {
  const rpm = payload.sensors?.rpm?.value ?? payload.rpm ?? 2450;
  const cht = payload.sensors?.cht?.value ?? payload.cht_c ?? 142.0;
  const egt = payload.sensors?.egt?.value ?? payload.egt_c ?? 615.0;
  const oilPBar = payload.oil_pressure_bar ?? (payload.sensors?.oil_pressure?.value ? payload.sensors.oil_pressure.value / 14.5038 : 4.69);
  const oilT = payload.sensors?.oil_temperature?.value ?? payload.oil_temperature_c ?? 92.0;
  const fuel = payload.sensors?.fuel_flow?.value ?? payload.fuel_flow_lh ?? 17.6;
  const vib = payload.sensors?.vibration?.value ?? payload.vibration_g ?? 1.42;
  const mapBar = payload.manifold_pressure_bar ?? 1.24;
  const fuelRem = payload.fuel_remaining_liters ?? 48.2;

  const channels: ChannelDef[] = [
    {
      key: "rpm",
      label: "RPM",
      value: rpm,
      displayValue: Math.round(rpm).toLocaleString(),
      unit: "RPM",
      min: 2000,
      max: 2700,
      trend: "STABLE",
    },
    {
      key: "cht",
      label: "CHT",
      value: cht,
      displayValue: cht.toFixed(1),
      unit: "°C",
      min: 100,
      max: 165,
      trend: "UP",
    },
    {
      key: "egt",
      label: "EGT",
      value: egt,
      displayValue: Math.round(egt).toString(),
      unit: "°C",
      min: 550,
      max: 780,
      trend: "STABLE",
    },
    {
      key: "oil_p",
      label: "Oil Press",
      value: oilPBar,
      displayValue: oilPBar.toFixed(2),
      unit: "bar",
      min: 3.0,
      max: 5.5,
      trend: "STABLE",
    },
    {
      key: "oil_t",
      label: "Oil Temp",
      value: oilT,
      displayValue: oilT.toFixed(1),
      unit: "°C",
      min: 70,
      max: 115,
      trend: "STABLE",
    },
    {
      key: "fuel_flow",
      label: "Fuel Flow",
      value: fuel,
      displayValue: fuel.toFixed(1),
      unit: "L/h",
      min: 12,
      max: 26,
      trend: "DOWN",
    },
    {
      key: "vibration",
      label: "Vibration",
      value: vib,
      displayValue: vib.toFixed(2),
      unit: "g",
      min: 0.5,
      max: 2.5,
      trend: "STABLE",
    },
    {
      key: "map",
      label: "MAP",
      value: mapBar,
      displayValue: mapBar.toFixed(2),
      unit: "bar",
      min: 0.8,
      max: 1.4,
      trend: "STABLE",
    },
    {
      key: "fuel_rem",
      label: "Fuel Rem",
      value: fuelRem,
      displayValue: fuelRem.toFixed(1),
      unit: "L",
      min: 10,
      max: 65,
      trend: "DOWN",
    },
  ];

  return (
    <div
      className="telemetry-compact-row-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(9, 1fr)",
        gap: "0.5rem",
        flexShrink: 0,
        height: "86px",
      }}
    >
      {channels.map((ch) => {
        const pct = Math.min(100, Math.max(0, ((ch.value - ch.min) / (ch.max - ch.min)) * 100));
        const status =
          pct > 95 || pct < 5
            ? "ALERT"
            : pct > 85 || pct < 15
            ? "CAUTION"
            : "NORMAL";
        const statusClr =
          status === "ALERT"
            ? "var(--status-warning)"
            : status === "CAUTION"
            ? "var(--status-caution)"
            : "var(--accent)";

        return (
          <div
            key={ch.key}
            className="card"
            onClick={() => onSelectChannel && onSelectChannel(ch.key)}
            title={`${ch.label}: ${ch.displayValue} ${ch.unit} (Nominal range: ${ch.min} - ${ch.max})`}
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "0.5rem 0.65rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              cursor: "pointer",
              transition: "border-color 0.15s ease",
              minWidth: 0,
            }}
          >
            {/* Tile Top: Label + Trend */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  color: "var(--text-faint)",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {ch.label}
              </span>
              <span style={{ color: "var(--text-muted)" }}>
                {ch.trend === "UP" ? (
                  <ArrowUpRight size={11} />
                ) : ch.trend === "DOWN" ? (
                  <ArrowDownRight size={11} />
                ) : (
                  <Minus size={11} />
                )}
              </span>
            </div>

            {/* Tile Value */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem", overflow: "hidden" }}>
              <span
                className="font-mono tabular-nums"
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "var(--text)",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {ch.displayValue}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono), monospace",
                }}
              >
                {ch.unit}
              </span>
            </div>

            {/* Mini Nominal Range Bar */}
            <div
              style={{
                height: "3px",
                width: "100%",
                background: "var(--surface-3)",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: statusClr,
                  borderRadius: "2px",
                  transition: "width 0.25s ease",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
