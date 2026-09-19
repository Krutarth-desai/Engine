"use client";

import React from "react";
import { UnifiedTelemetryPayload, SensorItem } from "../types/telemetry";
import DigitalTwinCenterpiece from "./DigitalTwinCenterpiece";
import DashboardKpiCards from "./dashboard/DashboardKpiCards";
import SensorCard from "./common/SensorCard";
import { NavView } from "./Sidebar";
import { SensorKey } from "@/lib/limits";
import { useTelemetry } from "@/context/TelemetryContext";
import { BellRing, CheckCircle2, ChevronRight, X } from "lucide-react";

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
        const stripColor = isCrit ? "var(--status-warning)" : isWarn ? "var(--status-caution)" : "var(--accent)";
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
              background: isCrit ? "var(--surface-1)" : isWarn ? "var(--surface-1)" : "var(--border)",
              border: `1px solid ${isCrit ? "var(--status-warning)" : isWarn ? "var(--status-caution)" : "var(--accent)"}`,
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
                  fontFamily: "var(--font-mono), monospace",
                  color: stripColor,
                }}
              >
                [{topActiveAlert.level}]
              </span>
            <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--text)" }}>
              {topActiveAlert.title}
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>— {topActiveAlert.message}</span>
          </div>

          <button
            className="alert-bar-action-btn"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--accent)",
              fontSize: "0.68rem",
              fontWeight: 700,
              fontFamily: "var(--font-mono), monospace",
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
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            fontSize: "0.68rem",
            color: "var(--status-nominal)",
            fontFamily: "var(--font-mono), monospace",
            cursor: "pointer",
          }}
          title="All systems nominal. Click to view chronological log."
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <CheckCircle2 size={13} style={{ color: "var(--status-nominal)" }} />
            <span>NO ACTIVE ALERTS — Propulsion envelope and predictive thresholds nominal</span>
          </div>
          <span style={{ color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
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
        <div style={{ display: "flex", flexDirection: "column", minHeight: "360px" }}>
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

        {/* Right 40%: Live 9-Channel Sensor Strip using unified SensorCard - LOCKED TO SINGLE FRAME, ZERO SCROLLING */}
        <div
          className="panel"
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: "360px",
            height: "100%",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
            <div className="panel-title" style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", boxShadow: "none" }} />
              <strong>9-CHANNEL ENGINE SENSORS</strong>
            </div>
            <button
              onClick={() => onNavigate("telemetry")}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--accent)",
                fontSize: "0.66rem",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "var(--font-mono), monospace",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.2rem",
              }}
            >
              TIME-SERIES →
            </button>
          </div>

          {focusedComponent && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--border)",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                padding: "0.2rem 0.5rem",
                marginBottom: "0.35rem",
                fontSize: "0.68rem",
                color: "var(--accent)",
                fontFamily: "var(--font-mono), monospace",
              }}
            >
              <span>FOCUS: <strong>{focusedComponent.replace(/_/g, " ").toUpperCase()}</strong></span>
              <button
                onClick={() => setFocusedComponent(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.2rem",
                  fontSize: "0.65rem",
                }}
              >
                <X size={12} /> CLEAR
              </button>
            </div>
          )}

          <div
            className="compact-sensor-card-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gridTemplateRows: "repeat(3, 1fr)",
              gap: "0.38rem",
              flex: 1,
              overflow: "hidden", // STRICTLY NO SCROLLBAR: Fits completely in one single frame
              minHeight: 0,
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
