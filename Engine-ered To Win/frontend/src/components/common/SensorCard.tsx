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
  const svgWidth = compact ? 56 : 80;
  const svgHeight = compact ? 18 : 22;

  const sparkCoords = sparkPoints.map((v, i) => {
    const x = (i / (sparkPoints.length - 1)) * svgWidth;
    const y = svgHeight - ((v - sparkMin) / sparkRange) * (svgHeight - 4) - 2;
    return { x, y };
  });

  const sparkLinePath = sparkCoords
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(" ");

  const sparkAreaPath = `${sparkLinePath} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`;
  const lastPt = sparkCoords[sparkCoords.length - 1] || { x: svgWidth, y: svgHeight / 2 };

  // Compact name preference
  const displayName = compact
    ? (def?.shortName || name || sensorKey).toUpperCase()
    : (name || def?.name || sensorKey);

  if (compact) {
    return (
      <div
        className={`sensor-universal-card compact ${isFocused ? "focused" : ""}`}
        onClick={() => onFocus?.(sensorKey)}
        style={{
          background: isFocused
            ? "linear-gradient(135deg, rgba(56, 189, 248, 0.16) 0%, rgba(14, 21, 38, 0.95) 100%)"
            : "linear-gradient(135deg, rgba(16, 24, 44, 0.82) 0%, rgba(10, 16, 30, 0.92) 100%)",
          border: `1px solid ${isFocused ? "var(--accent-cyan)" : "rgba(255, 255, 255, 0.08)"}`,
          borderRadius: "6px",
          padding: "0.42rem 0.55rem",
          cursor: onFocus ? "pointer" : "default",
          transition: "all 0.18s ease",
          position: "relative",
          boxShadow: isFocused ? "0 0 14px rgba(56, 189, 248, 0.25)" : "0 2px 6px rgba(0, 0, 0, 0.3)",
          height: "100%",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minHeight: 0,
        }}
        title={`Click to isolate ${displayName} (${status})`}
      >
        {/* Top line: Short Name & Micro Status Pill */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.15rem" }}>
          <span
            style={{
              fontSize: "0.64rem",
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 800,
              color: isFocused ? "var(--accent-cyan)" : "#cbd5e1",
              letterSpacing: "0.5px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {displayName}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <span
              style={{
                fontSize: "0.54rem",
                fontWeight: 800,
                padding: "0.05rem 0.28rem",
                borderRadius: "3px",
                background: `${statusColor}18`,
                color: statusColor,
                border: `1px solid ${statusColor}40`,
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 1,
              }}
            >
              {status}
            </span>
            <span
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                backgroundColor: statusColor,
                boxShadow: `0 0 5px ${statusColor}`,
              }}
            />
          </div>
        </div>

        {/* Middle Readout + Sparkline Trace */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "0.2rem" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.2rem" }}>
            <span
              className="font-mono"
              style={{
                fontSize: "1.18rem",
                fontWeight: 800,
                color: statusColor,
                letterSpacing: "-0.5px",
                lineHeight: 1,
              }}
            >
              {formattedVal}
            </span>
            <span
              style={{
                fontSize: "0.6rem",
                color: "#94a3b8",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
              }}
            >
              {displayUnit}
            </span>
          </div>

          {/* Mini Sparkline with Oscilloscope Gradient Fill */}
          <svg width={svgWidth} height={svgHeight} style={{ overflow: "visible" }}>
            <defs>
              <linearGradient id={`spark-grad-${sensorKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={statusColor} stopOpacity={0.35} />
                <stop offset="100%" stopColor={statusColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <path d={sparkAreaPath} fill={`url(#spark-grad-${sensorKey})`} />
            <path
              d={sparkLinePath}
              fill="none"
              stroke={statusColor}
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={lastPt.x} cy={lastPt.y} r="2" fill={statusColor} filter="url(#hud-glow)" />
          </svg>
        </div>

        {/* Bottom Micro Range Progress Bar & Trend */}
        <div>
          <div
            style={{
              height: "3px",
              background: "rgba(255, 255, 255, 0.08)",
              borderRadius: "2px",
              position: "relative",
              overflow: "hidden",
              marginBottom: "0.15rem",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                width: `${pct}%`,
                top: 0,
                bottom: 0,
                background: statusColor,
                borderRadius: "2px",
                transition: "width 0.4s ease",
                boxShadow: `0 0 6px ${statusColor}80`,
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.55rem",
              color: "#64748b",
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1,
            }}
          >
            {delta10s !== undefined && delta10s !== 0 ? (
              <span
                style={{
                  color: delta10s > 0 ? (status === "ALERT" ? "#ef4444" : "var(--accent-cyan)") : "#10b981",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.1rem",
                  fontWeight: 700,
                }}
              >
                {delta10s > 0 ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
                {delta10s > 0 ? `+${delta10s.toFixed(1)}` : delta10s.toFixed(1)}/10s
              </span>
            ) : (
              <span style={{ color: trend === "UP" ? "var(--accent-cyan)" : trend === "DOWN" ? "#f59e0b" : "#64748b" }}>
                {trend}
              </span>
            )}
            <span>MAX {def ? def.max : 100}</span>
          </div>
        </div>
      </div>
    );
  }

  // Full Expanded Card Layout (when compact === false)
  return (
    <div
      className={`sensor-universal-card ${isFocused ? "focused" : ""}`}
      onClick={() => onFocus?.(sensorKey)}
      style={{
        background: isFocused ? "rgba(56, 189, 248, 0.08)" : "rgba(14, 21, 38, 0.7)",
        border: `1px solid ${isFocused ? "var(--accent-cyan)" : "rgba(255, 255, 255, 0.08)"}`,
        borderRadius: "8px",
        padding: "0.85rem 1rem",
        cursor: onFocus ? "pointer" : "default",
        transition: "all 0.2s ease",
        position: "relative",
        boxShadow: isFocused ? "0 0 16px rgba(56, 189, 248, 0.2)" : "none",
      }}
      title={`Click to focus ${displayName}`}
    >
      {/* Top line: Name & Status Dot */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
        <span
          style={{
            fontSize: "0.78rem",
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            color: isFocused ? "var(--accent-cyan)" : "#e2e8f0",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {displayName}
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
              fontSize: "1.55rem",
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

        {/* Mini Sparkline with Area Fill */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.15rem" }}>
          <svg width={svgWidth} height={svgHeight} style={{ overflow: "visible" }}>
            <defs>
              <linearGradient id={`spark-grad-full-${sensorKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={statusColor} stopOpacity={0.35} />
                <stop offset="100%" stopColor={statusColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <path d={sparkAreaPath} fill={`url(#spark-grad-full-${sensorKey})`} />
            <path
              d={sparkLinePath}
              fill="none"
              stroke={statusColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
            />
            <circle cx={lastPt.x} cy={lastPt.y} r="2.5" fill={statusColor} />
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
