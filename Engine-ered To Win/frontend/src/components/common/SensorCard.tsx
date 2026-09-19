"use client";

import React from "react";
import { SENSOR_LIMITS, SensorKey, getSensorStatus, getStatusColor } from "@/lib/limits";
import { fmt } from "@/lib/format";
import { useTelemetry } from "@/context/TelemetryContext";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export interface SensorCardProps {
  sensorKey: SensorKey;
  value?: number | null;
  name?: string;
  unit?: string;
  history?: number[];
  trend?: "UP" | "DOWN" | "STABLE";
  delta10s?: number;
  isFocused?: boolean;
  onFocus?: (sensorKey: SensorKey) => void;
  compact?: boolean;
}

export default function SensorCard({
  sensorKey,
  value,
  name,
  unit: propUnit,
  history = [],
  trend = "STABLE",
  delta10s,
  isFocused = false,
  onFocus,
  compact = false,
}: SensorCardProps) {
  const { unitPreference } = useTelemetry();
  const def = SENSOR_LIMITS[sensorKey];

  const rawVal = value ?? def?.nominal ?? 0;

  // Handle unit conversions (oil pressure psi <-> bar)
  let displayVal = rawVal;
  let displayUnit = propUnit || def?.unit || "";

  if (sensorKey === "oil_pressure") {
    displayUnit = unitPreference;
    if (unitPreference === "bar") {
      displayVal = rawVal / 14.5038;
    }
  }

  const precision = def?.precision ?? 1;
  const formattedVal = fmt(displayVal, precision);
  const status = getSensorStatus(sensorKey, rawVal);
  const statusColor = getStatusColor(status);

  const min = def?.min ?? 0;
  const max = def?.max ?? 100;
  const span = max - min || 1;
  const pct = Math.min(100, Math.max(0, ((rawVal - min) / span) * 100));

  // Compute caution & warning band percentages for range track
  const cautionLowPct = def?.cautionLow !== undefined ? ((def.cautionLow - min) / span) * 100 : null;
  const cautionHighPct = def?.cautionHigh !== undefined ? ((def.cautionHigh - min) / span) * 100 : null;
  const warningLowPct = def?.warningLow !== undefined ? ((def.warningLow - min) / span) * 100 : null;
  const warningHighPct = def?.warningHigh !== undefined ? ((def.warningHigh - min) / span) * 100 : null;

  // Mini sparkline SVG generator
  const sparkPoints = history.length > 1 ? history : [rawVal, rawVal];
  const sparkMin = Math.min(...sparkPoints);
  const sparkMax = Math.max(...sparkPoints);
  const sparkRange = sparkMax - sparkMin || 1;
  const svgWidth = 80;
  const svgHeight = 22;

  const sparkPath = sparkPoints
    .map((v, i) => {
      const x = (i / (sparkPoints.length - 1)) * svgWidth;
      const y = svgHeight - ((v - sparkMin) / sparkRange) * (svgHeight - 4) - 2;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div
      className={`sensor-universal-card ${compact ? "compact" : ""} ${isFocused ? "focused" : ""}`}
      onClick={() => onFocus?.(sensorKey)}
      style={{
        background: isFocused ? "rgba(56, 189, 248, 0.08)" : "rgba(14, 21, 38, 0.7)",
        border: `1px solid ${isFocused ? "var(--accent-cyan)" : "rgba(255, 255, 255, 0.08)"}`,
        borderRadius: "8px",
        padding: compact ? "0.6rem 0.75rem" : "0.85rem 1rem",
        cursor: onFocus ? "pointer" : "default",
        transition: "all 0.2s ease",
        position: "relative",
        boxShadow: isFocused ? "0 0 16px rgba(56, 189, 248, 0.2)" : "none",
      }}
      title={`Click to focus ${name || def?.name || sensorKey}`}
    >
      {/* Top line: Name & Status Dot */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
        <span
          style={{
            fontSize: compact ? "0.7rem" : "0.78rem",
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            color: isFocused ? "var(--accent-cyan)" : "#e2e8f0",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {name || def?.name || sensorKey}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span
            style={{
              fontSize: "0.6rem",
              fontWeight: 800,
              padding: "0.1rem 0.35rem",
              borderRadius: "3px",
              background: `${statusColor}18`,
              color: statusColor,
              border: `1px solid ${statusColor}40`,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {status}
          </span>
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: statusColor,
              boxShadow: `0 0 6px ${statusColor}`,
            }}
          />
        </div>
      </div>

      {/* Middle Readout + Sparkline */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "0.6rem" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem" }}>
          <span
            className="font-mono"
            style={{
              fontSize: compact ? "1.2rem" : "1.55rem",
              fontWeight: 800,
              color: statusColor,
              letterSpacing: "-0.5px",
            }}
          >
            {formattedVal}
          </span>
          <span
            style={{
              fontSize: "0.72rem",
              color: "#94a3b8",
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
            }}
          >
            {displayUnit}
          </span>
        </div>

        {/* Mini Sparkline */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.15rem" }}>
          <svg width={svgWidth} height={svgHeight} style={{ overflow: "visible" }}>
            <path
              d={sparkPath}
              fill="none"
              stroke={statusColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
            />
          </svg>
          <div style={{ display: "flex", gap: "0.4rem", fontSize: "0.58rem", color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
            <span>L: {fmt(sparkMin, 0)}</span>
            <span>H: {fmt(sparkMax, 0)}</span>
          </div>
        </div>
      </div>

      {/* Segmented Horizontal Range Bar with Caution & Warning Bands */}
      <div
        style={{
          height: "8px",
          background: "rgba(255, 255, 255, 0.06)",
          borderRadius: "4px",
          position: "relative",
          overflow: "hidden",
          marginBottom: "0.35rem",
        }}
      >
        {/* Warning Low band */}
        {warningLowPct !== null && (
          <div
            style={{
              position: "absolute",
              left: 0,
              width: `${Math.max(0, warningLowPct)}%`,
              top: 0,
              bottom: 0,
              background: "rgba(239, 68, 68, 0.35)",
            }}
          />
        )}
        {/* Caution Low band */}
        {cautionLowPct !== null && warningLowPct !== null && (
          <div
            style={{
              position: "absolute",
              left: `${warningLowPct}%`,
              width: `${Math.max(0, cautionLowPct - warningLowPct)}%`,
              top: 0,
              bottom: 0,
              background: "rgba(245, 158, 11, 0.3)",
            }}
          />
        )}
        {/* Caution High band */}
        {cautionHighPct !== null && (
          <div
            style={{
              position: "absolute",
              left: `${cautionHighPct}%`,
              width: warningHighPct !== null ? `${Math.max(0, warningHighPct - cautionHighPct)}%` : `${100 - cautionHighPct}%`,
              top: 0,
              bottom: 0,
              background: "rgba(245, 158, 11, 0.3)",
            }}
          />
        )}
        {/* Warning High band */}
        {warningHighPct !== null && (
          <div
            style={{
              position: "absolute",
              left: `${warningHighPct}%`,
              right: 0,
              top: 0,
              bottom: 0,
              background: "rgba(239, 68, 68, 0.35)",
            }}
          />
        )}

        {/* Current Value Fill */}
        <div
          style={{
            position: "absolute",
            left: 0,
            width: `${pct}%`,
            top: 0,
            bottom: 0,
            background: statusColor,
            borderRadius: "4px",
            transition: "width 0.4s ease",
            boxShadow: `0 0 8px ${statusColor}60`,
          }}
        />
      </div>

      {/* Footer Limits & 10s Delta */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.62rem",
          color: "#64748b",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <span>{def ? def.min : 0} {displayUnit}</span>
        {delta10s !== undefined && delta10s !== 0 ? (
          <span
            style={{
              color: delta10s > 0 ? (status === "ALERT" ? "#ef4444" : "var(--accent-cyan)") : "#10b981",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.15rem",
              fontWeight: 700,
            }}
          >
            {delta10s > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {delta10s > 0 ? `+${delta10s.toFixed(1)}` : delta10s.toFixed(1)} /10s
          </span>
        ) : (
          <span style={{ color: trend === "UP" ? "var(--accent-cyan)" : trend === "DOWN" ? "#f59e0b" : "#64748b", fontSize: "0.6rem" }}>
            {trend}
          </span>
        )}
        <span>{def ? def.max : 100} {displayUnit}</span>
      </div>
    </div>
  );
}
