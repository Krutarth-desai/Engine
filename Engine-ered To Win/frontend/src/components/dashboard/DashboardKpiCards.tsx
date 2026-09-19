"use client";

import React from "react";
import { UnifiedTelemetryPayload } from "@/types/telemetry";
import { getRulZone, getStatusColor } from "@/lib/limits";
import { fmtHealthIndex } from "@/lib/format";
import { NavView } from "@/components/Sidebar";
import { Activity, ShieldAlert, Clock, Wrench, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface DashboardKpiCardsProps {
  payload: UnifiedTelemetryPayload;
  onNavigate: (view: NavView) => void;
}

export default function DashboardKpiCards({ payload, onNavigate }: DashboardKpiCardsProps) {
  const safeHealth = fmtHealthIndex(payload.health_index ?? 96);
  const currentRul = Math.round(payload.prognostics?.predicted_rul || 117);
  const rulZone = getRulZone(currentRul);
  const trend = payload.prognostics?.degradation_trend || "Stable";

  // RATE: STABLE must have one colour everywhere (emerald green)
  const trendColor =
    trend.toLowerCase() === "accelerating"
      ? "#ef4444"
      : trend.toLowerCase() === "decreasing"
      ? "#f59e0b"
      : "#10b981";

  const riskLevel = payload.risk?.level || "LOW";
  const anomalyState = payload.risk?.anomaly || "NORMAL";
  const actionText =
    payload.risk?.action ||
    "All engine systems and sensors are performing nominally. Continue planned cruise profile.";
  const actionStatus =
    payload.risk?.status_label || (riskLevel === "LOW" ? "SYSTEMS OPTIMAL" : "OPERATIONAL ADVISORY");
  const actionGuidance =
    payload.risk?.guidance || "Continuous telemetry baseline nominal. No flight plan deviation required.";

  // Health sparkline points from recent trends (30 cycles)
  const healthTrendPoints = payload.recent_trends?.points?.map((p) => p.health_index) || [
    96, 96, 96, 95, 96, 95, 96, safeHealth,
  ];
  const healthDelta = payload.recent_trends?.deltas?.health_delta ?? 0;

  // Mini SVG sparkline for Health Index
  const sparkMin = Math.min(...healthTrendPoints);
  const sparkMax = Math.max(...healthTrendPoints);
  const sparkRange = sparkMax - sparkMin || 1;
  const svgWidth = 80;
  const svgHeight = 24;
  const sparkPath = healthTrendPoints
    .map((v, i) => {
      const x = (i / (healthTrendPoints.length - 1)) * svgWidth;
      const y = svgHeight - ((v - sparkMin) / sparkRange) * (svgHeight - 6) - 3;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const healthColor = safeHealth > 75 ? "#10b981" : safeHealth > 45 ? "#f59e0b" : "#ef4444";

  return (
    <div className="dashboard-kpi-row">
      {/* Card 1: Health Index (Fully Clickable -> Diagnostics) */}
      <div
        className="kpi-card kpi-health clickable"
        onClick={() => onNavigate("diagnostics")}
        title="Click to view full Physics Health and Subsystem Diagnostics"
        role="button"
        tabIndex={0}
      >
        <div className="kpi-header">
          <span className="kpi-label">
            <strong>HEALTH INDEX</strong>
          </span>
          <span className="kpi-icon" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <Activity size={14} style={{ color: "var(--accent-cyan)" }} />
            <span style={{ fontSize: "0.62rem" }}>PHM</span>
          </span>
        </div>

        <div className="kpi-body">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div className="kpi-main-val">
              <span className="kpi-big-num font-mono" style={{ color: healthColor }}>
                {safeHealth}
              </span>
              <span className="kpi-denom">/ 100</span>
            </div>

            {/* Sparkline & Delta */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem" }}>
              <svg width={svgWidth} height={svgHeight} style={{ overflow: "visible" }}>
                <path
                  d={sparkPath}
                  fill="none"
                  stroke={healthColor}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div
                style={{
                  fontSize: "0.62rem",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  color: healthDelta < 0 ? "#ef4444" : "#10b981",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.1rem",
                }}
              >
                {healthDelta < 0 ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
                {healthDelta >= 0 ? `+${healthDelta}` : healthDelta} /30 cyc
              </div>
            </div>
          </div>

          <div className="kpi-subtext" style={{ marginTop: "0.4rem" }}>
            {safeHealth >= 80
              ? "Nominal Operating Envelope"
              : safeHealth >= 50
              ? "Moderate Degradation Detected"
              : "Critical Component Stress"}
          </div>
        </div>
      </div>

      {/* Card 2: Anomaly / Risk Status (Fully Clickable -> Diagnostics) */}
      <div
        className="kpi-card kpi-risk clickable"
        onClick={() => onNavigate("diagnostics")}
        title="Click to view full Diagnostics analysis"
        role="button"
        tabIndex={0}
      >
        <div className="kpi-header">
          <span className="kpi-label">
            <strong>ANOMALY &amp; RISK</strong>
          </span>
          <span className="kpi-link-hint" style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
            <ShieldAlert size={12} /> DETAILS →
          </span>
        </div>
        <div className="kpi-body">
          <div className="risk-dual-readout">
            <div className="risk-item">
              <span className="risk-tag">ANOMALY:</span>
              <span className={`risk-val status-${anomalyState.toLowerCase()}`}>
                {anomalyState}
              </span>
            </div>
            <div className="risk-item">
              <span className="risk-tag">RISK:</span>
              <span className="risk-val" style={{ color: getStatusColor(riskLevel) }}>
                {riskLevel}
              </span>
            </div>
          </div>
          <div className="kpi-subtext">Automated Multi-Sensor Cross Isolation</div>
        </div>
      </div>

      {/* Card 3: Remaining Useful Life (Fully Clickable -> Prognostics) */}
      <div
        className="kpi-card kpi-rul clickable"
        onClick={() => onNavigate("rul")}
        title="Click to view detailed RUL & Prognostics page"
        role="button"
        tabIndex={0}
      >
        <div className="kpi-header">
          <span className="kpi-label">
            <strong>REMAINING USEFUL LIFE</strong>
          </span>
          <span className="kpi-link-hint" style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
            <Clock size={12} /> PROGNOSTICS →
          </span>
        </div>
        <div className="kpi-body">
          <div className="kpi-main-val">
            <span className="kpi-big-num font-mono" style={{ color: rulZone.color }}>
              {currentRul}
            </span>
            <span className="kpi-unit">CYCLES</span>
          </div>
          <div className="rul-trend-row">
            <span
              className="rul-trend-badge"
              style={{
                color: trendColor,
                backgroundColor: `${trendColor}18`,
                borderColor: `${trendColor}40`,
              }}
            >
              RATE: {trend.toUpperCase()}
            </span>
            <span
              style={{
                fontSize: "0.62rem",
                fontWeight: 700,
                color: rulZone.color,
                backgroundColor: rulZone.bgColor,
                border: `1px solid ${rulZone.borderColor}`,
                padding: "0.15rem 0.4rem",
                borderRadius: "4px",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {rulZone.label}
            </span>
            <span className="rul-time-hint">≈ {payload.prognostics?.remaining_time_str || "01:57:32"}</span>
          </div>
        </div>
      </div>

      {/* Card 4: Action Recommendation (Fully Clickable -> Maintenance) */}
      <div
        className="kpi-card kpi-action clickable"
        onClick={() => onNavigate("maintenance")}
        title="Click to view Maintenance action workflows"
        role="button"
        tabIndex={0}
      >
        <div className="kpi-header">
          <span className="kpi-label">
            <strong>ACTION RECOMMENDATION</strong>
          </span>
          <span className="kpi-link-hint" style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
            <Wrench size={12} /> PROTOCOLS →
          </span>
        </div>
        <div className="kpi-body">
          <div className="action-status-badge" style={{ color: getStatusColor(riskLevel) }}>
            <strong>[{actionStatus}]</strong>
          </div>
          <div className="action-highlight-box">
            <span className="action-title-text">
              <strong>{actionText}</strong>
            </span>
          </div>
          <div className="kpi-subtext" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {actionGuidance}
          </div>
        </div>
      </div>
    </div>
  );
}
