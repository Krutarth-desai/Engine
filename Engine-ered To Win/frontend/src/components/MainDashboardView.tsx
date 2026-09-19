"use client";

import React from "react";
import { UnifiedTelemetryPayload, SensorItem } from "../types/telemetry";
import DigitalTwinCenterpiece from "./DigitalTwinCenterpiece";
import DashboardKpiCards from "./dashboard/DashboardKpiCards";
import SensorCard from "./common/SensorCard";
import { NavView } from "./Sidebar";
import { SensorKey } from "@/lib/limits";
import { useTelemetry } from "@/context/TelemetryContext";
import { BellRing, CheckCircle2, ChevronRight } from "lucide-react";

interface MainDashboardViewProps {
  payload: UnifiedTelemetryPayload;
  activeScenario: string;
  onInjectScenario: (scenario: string) => void;
  onNavigate: (view: NavView) => void;
}

export default function MainDashboardView({
  payload,
  activeScenario,
  onInjectScenario,
  onNavigate,
}: MainDashboardViewProps) {
  const { focusedComponent, setFocusedComponent, historyBuffer } = useTelemetry();

  // Active alerts only (exclude nominal items)
  const activeAlerts = (payload.alerts || []).filter((a) => {
    const lvl = (a.level || "").toUpperCase();
    return lvl === "ALERT" || lvl === "CRITICAL" || lvl === "WARNING" || lvl === "CAUTION" || lvl === "ADVISORY";
  });

  const topActiveAlert = activeAlerts.length > 0 ? activeAlerts[0] : null;
  const sensors: SensorItem[] = payload.sensor_list || [];

  return (
    <div className="main-dashboard-container" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* 1. TOP: ALERT STRIP (Collapses to a slim "No active alerts" line when clear) */}
      {topActiveAlert ? (() => {
        const isCrit = topActiveAlert.level === "ALERT" || topActiveAlert.level === "CRITICAL" || topActiveAlert.level === "WARNING";
        const isWarn = topActiveAlert.level === "CAUTION";
        const stripColor = isCrit ? "#ef4444" : isWarn ? "#f59e0b" : "#38bdf8";
        return (
          <div
            className={`dashboard-active-alert-strip ${isCrit ? "alert-strip-crit" : isWarn ? "alert-strip-warn" : "alert-strip-info"}`}
            onClick={() => onNavigate("alerts")}
            title="Click to open full Alerts manager"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.45rem 0.85rem",
              borderRadius: "6px",
              background: isCrit ? "rgba(239, 68, 68, 0.15)" : isWarn ? "rgba(245, 158, 11, 0.15)" : "rgba(56, 189, 248, 0.15)",
              border: `1px solid ${isCrit ? "rgba(239, 68, 68, 0.5)" : isWarn ? "rgba(245, 158, 11, 0.5)" : "rgba(56, 189, 248, 0.5)"}`,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <BellRing size={15} style={{ color: stripColor }} />
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: stripColor,
                }}
              >
                [{topActiveAlert.level}]
              </span>
            <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#f8fafc" }}>
              {topActiveAlert.title}
            </span>
            <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>— {topActiveAlert.message}</span>
          </div>

          <button
            className="alert-bar-action-btn"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--accent-cyan)",
              fontSize: "0.68rem",
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              cursor: "pointer",
            }}
          >
            VIEW ALL ALERTS ({activeAlerts.length}) →
          </button>
        </div>
        );
      })() : (
        /* Slim "No active alerts" collapsed line */
        <div
          onClick={() => onNavigate("alerts")}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.3rem 0.75rem",
            borderRadius: "4px",
            background: "rgba(16, 185, 129, 0.05)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            fontSize: "0.68rem",
            color: "#10b981",
            fontFamily: "'JetBrains Mono', monospace",
            cursor: "pointer",
          }}
          title="All systems nominal. Click to view chronological log."
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <CheckCircle2 size={13} style={{ color: "#10b981" }} />
            <span>NO ACTIVE ALERTS — Propulsion envelope and predictive thresholds nominal</span>
          </div>
          <span style={{ color: "#64748b", display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
            Alerts Log ({payload.alerts?.length || 0}) <ChevronRight size={12} />
          </span>
        </div>
      )}

      {/* 2. KPI SUMMARY CARDS */}
      <DashboardKpiCards payload={payload} onNavigate={onNavigate} />

      {/* 3. ~60/40 SPLIT ON WIDE SCREENS: TWIN SCHEMATIC & LIVE SENSOR CARDS */}
      <div
        className="dashboard-main-split"
        style={{
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr",
          gap: "0.75rem",
          alignItems: "stretch",
        }}
      >
        {/* Left 60%: Digital Twin Centerpiece Schematic */}
        <div style={{ minHeight: "360px" }}>
          <DigitalTwinCenterpiece
            telemetry={payload}
            activeScenario={activeScenario}
            onInjectScenario={onInjectScenario}
            focusedComponent={focusedComponent}
            onSelectComponent={(k) => {
              setFocusedComponent(focusedComponent === k ? null : k);
            }}
          />
        </div>

        {/* Right 40%: Live 9-Channel Sensor Strip using unified SensorCard */}
        <div className="panel" style={{ display: "flex", flexDirection: "column", minHeight: "360px" }}>
          <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="panel-title">
              <strong>9-CHANNEL ENGINE SENSORS</strong>
            </div>
            <button
              onClick={() => onNavigate("telemetry")}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--accent-cyan)",
                fontSize: "0.66rem",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.2rem",
              }}
            >
              TIME-SERIES →
            </button>
          </div>

          <div
            className="compact-sensor-card-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "0.45rem",
              overflowY: "auto",
              paddingRight: "0.2rem",
              maxHeight: "340px",
            }}
          >
            {sensors.map((sensor) => {
              const sKey = sensor.key as SensorKey;
              const isFocused = focusedComponent === sKey || focusedComponent === sensor.key;

              // Extract rolling history for sparkline
              const history = historyBuffer
                .map((h) => {
                  const val = h.sensors?.[sKey]?.value ?? h.sensors?.[sensor.key]?.value;
                  return typeof val === "number" ? val : null;
                })
                .filter((v): v is number => v !== null);

              return (
                <SensorCard
                  key={sensor.key}
                  sensorKey={sKey}
                  value={typeof sensor.value === "number" ? sensor.value : Number(sensor.value)}
                  name={sensor.name}
                  unit={sensor.unit}
                  history={history}
                  trend={sensor.trend}
                  compact={true}
                  isFocused={isFocused}
                  onFocus={(k) => {
                    setFocusedComponent(focusedComponent === k ? null : k);
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
