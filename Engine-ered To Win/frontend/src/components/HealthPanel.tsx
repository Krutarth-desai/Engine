"use client";

import React from "react";
import { TelemetryData } from "@/types/telemetry";

interface HealthPanelProps {
  telemetry: TelemetryData | null;
}

export default function HealthPanel({ telemetry }: HealthPanelProps) {
  const health = telemetry ? Math.max(Math.min(telemetry.health_index, 100), 0) : 100;
  const faultLabel = telemetry?.fault_label || "Normal";
  const estRulHours = telemetry
    ? telemetry.rul !== undefined
      ? telemetry.rul
      : Math.round((health / 100) * 160)
    : 160;

  const circumference = 2 * Math.PI * 70; // ~439.82
  const offset = circumference - (health / 100) * circumference;

  let strokeColor = "var(--status-nominal)";
  let badgeClass = "badge-optimal";
  let badgeText = "OPTIMAL";
  let stateColor = "var(--status-nominal)";

  if (health > 85) {
    strokeColor = "var(--status-nominal)";
    badgeClass = "badge-optimal";
    badgeText = "OPTIMAL";
    stateColor = "var(--status-nominal)";
  } else if (health > 60) {
    strokeColor = "var(--status-caution)";
    badgeClass = "badge-warning";
    badgeText = "DEGRADED";
    stateColor = "var(--status-caution)";
  } else {
    strokeColor = "var(--status-warning)";
    badgeClass = "badge-critical";
    badgeText = "CRITICAL";
    stateColor = "var(--status-warning)";
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Engine Health Index</span>
        <span id="health-badge" className={`status-badge-lg ${badgeClass}`}>
          {badgeText}
        </span>
      </div>
      <div className="health-display">
        <div className="health-circle-wrapper">
          <svg className="health-circle-svg" viewBox="0 0 160 160">
            <circle className="health-circle-bg" cx="80" cy="80" r="70" />
            <circle
              id="health-circle-bar"
              className="health-circle-bar"
              cx="80"
              cy="80"
              r="70"
              style={{
                strokeDashoffset: offset,
                stroke: strokeColor,
              }}
            />
          </svg>
          <div className="health-inner-text">
            <span id="health-val" className="health-number">
              {health.toFixed(0)}
            </span>
            <span className="health-unit">HEALTH INDEX</span>
          </div>
        </div>
      </div>
      <div className="health-meta-grid">
        <div className="meta-stat">
          <div className="meta-label">Est. RUL</div>
          <div className="meta-val" id="val-rul">
            {estRulHours} hrs
          </div>
        </div>
        <div className="meta-stat">
          <div className="meta-label">Anomaly State</div>
          <div className="meta-val" id="val-state" style={{ color: stateColor }}>
            {faultLabel.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}
