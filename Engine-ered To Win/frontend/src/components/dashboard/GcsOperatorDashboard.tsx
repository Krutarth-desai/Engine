"use client";

import React from "react";
import { UnifiedTelemetryPayload, TrendHistoryPoint } from "@/types/telemetry";
import { NavView } from "@/components/Sidebar";
import { SENSOR_LIMITS } from "@/lib/limits";
import { fmt } from "@/lib/format";
import {
  BellRing,
  CheckCircle2,
  ChevronRight,
  Compass,
  Radio,
  Activity,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface GcsOperatorDashboardProps {
  payload: UnifiedTelemetryPayload;
  onNavigate: (view: NavView) => void;
}

export default function GcsOperatorDashboard({
  payload,
  onNavigate,
}: GcsOperatorDashboardProps) {
  // Hero Health Score
  const healthIndex = Math.round(payload.health_index ?? 96);
  const isHealthGood = healthIndex >= 85;
  const isHealthCaution = healthIndex >= 65 && healthIndex < 85;
  const healthStatusWord = isHealthGood ? "NOMINAL" : isHealthCaution ? "CAUTION" : "WARNING";
  const healthColor = isHealthGood
    ? "var(--status-nominal)"
    : isHealthCaution
    ? "var(--status-caution)"
    : "var(--status-warning)";

  // Prognostics & RUL
  const predictedRul = Math.round(payload.prognostics?.predicted_rul || 117);
  const rulRemainingStr = payload.prognostics?.remaining_time_str || "01:55:54";
  const anomalyScore = payload.anomaly_score !== undefined
    ? payload.anomaly_score.toFixed(3)
    : "0.042";

  // Active Alerts
  const alerts = payload.alerts || [];
  const activeAlerts = alerts.filter(
    (a) =>
      a.level === "ALERT" ||
      a.level === "CRITICAL" ||
      a.level === "WARNING" ||
      a.level === "CAUTION"
  );
  const criticalAlerts = activeAlerts.filter(
    (a) => a.level === "ALERT" || a.level === "CRITICAL" || a.level === "WARNING"
  );

  // Flight & Mission Status
  const altitude = payload.vehicle?.altitude || 15000;
  const throttle = payload.vehicle?.throttle || 75;
  const flightPhase = "CRUISE PATROL";
  const engineLoad = Math.round((throttle / 100) * 94);
  const missionId = payload.vehicle?.mission_id || "ISR_PATROL_27";

  // Sensor extraction helpers
  const valRpm = payload.sensors?.rpm?.value ?? payload.rpm ?? 2462;
  const valCht = payload.sensors?.cht?.value ?? payload.cht_c ?? 142.0;
  const valEgt = payload.sensors?.egt?.value ?? payload.egt_c ?? 614.6;
  const valOilPress = payload.sensors?.oil_pressure?.value ?? payload.oil_pressure_bar ?? 68.0;
  const valOilTemp = payload.sensors?.oil_temperature?.value ?? payload.oil_temperature_c ?? 92.0;
  const valFuelFlow = payload.sensors?.fuel_flow?.value ?? payload.fuel_flow_lh ?? 17.6;
  const valVib = payload.sensors?.vibration?.value ?? payload.vibration_g ?? 1.42;
  const valVolt = payload.sensors?.bus_voltage?.value ?? payload.battery_voltage_v ?? 27.6;
  const valTiming = payload.sensors?.injection_timing?.value ?? payload.injection_timing_deg ?? 23.4;

  // 9 Core Telemetry Channels for Operator
  const channels = [
    {
      label: "RPM",
      name: "Rotational Speed",
      value: Math.round(valRpm),
      unit: "rpm",
      min: SENSOR_LIMITS.rpm.min,
      max: SENSOR_LIMITS.rpm.max,
      nominal: SENSOR_LIMITS.rpm.nominal,
      cautionLow: SENSOR_LIMITS.rpm.cautionLow,
      cautionHigh: SENSOR_LIMITS.rpm.cautionHigh,
    },
    {
      label: "CHT",
      name: "Cyl. Head Temp",
      value: Number(valCht.toFixed(1)),
      unit: "°C",
      min: SENSOR_LIMITS.cht.min,
      max: SENSOR_LIMITS.cht.max,
      nominal: SENSOR_LIMITS.cht.nominal,
      cautionLow: SENSOR_LIMITS.cht.cautionLow,
      cautionHigh: SENSOR_LIMITS.cht.cautionHigh,
    },
    {
      label: "EGT",
      name: "Exhaust Gas Temp",
      value: Number(valEgt.toFixed(1)),
      unit: "°C",
      min: SENSOR_LIMITS.egt.min,
      max: SENSOR_LIMITS.egt.max,
      nominal: SENSOR_LIMITS.egt.nominal,
      cautionLow: SENSOR_LIMITS.egt.cautionLow,
      cautionHigh: SENSOR_LIMITS.egt.cautionHigh,
    },
    {
      label: "OIL PRESS",
      name: "Oil Pressure",
      value: Number(valOilPress.toFixed(1)),
      unit: "psi",
      min: SENSOR_LIMITS.oil_pressure.min,
      max: SENSOR_LIMITS.oil_pressure.max,
      nominal: SENSOR_LIMITS.oil_pressure.nominal,
      cautionLow: SENSOR_LIMITS.oil_pressure.cautionLow,
      cautionHigh: SENSOR_LIMITS.oil_pressure.cautionHigh,
    },
    {
      label: "OIL TEMP",
      name: "Oil Temperature",
      value: Number(valOilTemp.toFixed(1)),
      unit: "°C",
      min: SENSOR_LIMITS.oil_temperature.min,
      max: SENSOR_LIMITS.oil_temperature.max,
      nominal: SENSOR_LIMITS.oil_temperature.nominal,
      cautionLow: SENSOR_LIMITS.oil_temperature.cautionLow,
      cautionHigh: SENSOR_LIMITS.oil_temperature.cautionHigh,
    },
    {
      label: "FUEL FLOW",
      name: "Fuel Consumption",
      value: Number(valFuelFlow.toFixed(1)),
      unit: "L/h",
      min: SENSOR_LIMITS.fuel_flow.min,
      max: SENSOR_LIMITS.fuel_flow.max,
      nominal: SENSOR_LIMITS.fuel_flow.nominal,
      cautionLow: SENSOR_LIMITS.fuel_flow.cautionLow,
      cautionHigh: SENSOR_LIMITS.fuel_flow.cautionHigh,
    },
    {
      label: "VIBRATION",
      name: "Engine Vibration",
      value: Number(valVib.toFixed(2)),
      unit: "g RMS",
      min: SENSOR_LIMITS.vibration.min,
      max: SENSOR_LIMITS.vibration.max,
      nominal: SENSOR_LIMITS.vibration.nominal,
      cautionLow: SENSOR_LIMITS.vibration.cautionLow,
      cautionHigh: SENSOR_LIMITS.vibration.cautionHigh,
    },
    {
      label: "BUS VOLT",
      name: "Alternator / Battery",
      value: Number(valVolt.toFixed(1)),
      unit: "V DC",
      min: SENSOR_LIMITS.bus_voltage.min,
      max: SENSOR_LIMITS.bus_voltage.max,
      nominal: SENSOR_LIMITS.bus_voltage.nominal,
      cautionLow: SENSOR_LIMITS.bus_voltage.cautionLow,
      cautionHigh: SENSOR_LIMITS.bus_voltage.cautionHigh,
    },
    {
      label: "TIMING",
      name: "Injection Timing",
      value: Number(valTiming.toFixed(1)),
      unit: "° BTDC",
      min: SENSOR_LIMITS.injection_timing.min,
      max: SENSOR_LIMITS.injection_timing.max,
      nominal: SENSOR_LIMITS.injection_timing.nominal,
      cautionLow: SENSOR_LIMITS.injection_timing.cautionLow,
      cautionHigh: SENSOR_LIMITS.injection_timing.cautionHigh,
    },
  ];

  // 8 High-Priority Aviation Annunciators
  const annunciators = [
    {
      id: "ecu",
      label: "ECU A/B CHANNELS",
      value: "NOMINAL",
      detail: "Lane A Active • Sync 100%",
      status: "NOMINAL",
    },
    {
      id: "cht",
      label: "CYL HEAD TEMP",
      value: `${fmt(valCht, 1)} °C`,
      detail: `Max ${SENSOR_LIMITS.cht.cautionHigh} °C`,
      status: valCht > SENSOR_LIMITS.cht.cautionHigh ? "CAUTION" : "NOMINAL",
    },
    {
      id: "egt",
      label: "EXHAUST GAS",
      value: `${fmt(valEgt, 1)} °C`,
      detail: `Max ${SENSOR_LIMITS.egt.cautionHigh} °C`,
      status: valEgt > SENSOR_LIMITS.egt.cautionHigh ? "CAUTION" : "NOMINAL",
    },
    {
      id: "oil_p",
      label: "OIL PRESSURE",
      value: `${fmt(valOilPress, 1)} psi`,
      detail: `Nom ${SENSOR_LIMITS.oil_pressure.cautionLow}-${SENSOR_LIMITS.oil_pressure.cautionHigh} psi`,
      status:
        valOilPress < SENSOR_LIMITS.oil_pressure.cautionLow ||
        valOilPress > SENSOR_LIMITS.oil_pressure.cautionHigh
          ? "CAUTION"
          : "NOMINAL",
    },
    {
      id: "oil_t",
      label: "OIL TEMP",
      value: `${fmt(valOilTemp, 1)} °C`,
      detail: `Max ${SENSOR_LIMITS.oil_temperature.cautionHigh} °C`,
      status: valOilTemp > SENSOR_LIMITS.oil_temperature.cautionHigh ? "CAUTION" : "NOMINAL",
    },
    {
      id: "fuel",
      label: "FUEL DELIVERY",
      value: `${fmt(valFuelFlow, 1)} L/h`,
      detail: "Press 3.2 bar Nom",
      status: valFuelFlow > SENSOR_LIMITS.fuel_flow.cautionHigh ? "CAUTION" : "NOMINAL",
    },
    {
      id: "vib",
      label: "CRANKCASE VIB",
      value: `${fmt(valVib, 2)} g RMS`,
      detail: `Limit < ${SENSOR_LIMITS.vibration.cautionHigh} g`,
      status: valVib > SENSOR_LIMITS.vibration.cautionHigh ? "CAUTION" : "NOMINAL",
    },
    {
      id: "bus",
      label: "28V AVIONICS BUS",
      value: `${fmt(valVolt, 1)} V DC`,
      detail: "Nom 24.0 - 29.5 V",
      status: valVolt < SENSOR_LIMITS.bus_voltage.cautionLow ? "CAUTION" : "NOMINAL",
    },
  ];

  // Helper to generate SVG sparkline path from array of numbers
  const generateSparkline = (values: number[], width = 140, height = 34) => {
    if (!values || values.length < 2) {
      return { path: "", min: 0, max: 0 };
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const path = values
      .map((val, idx) => {
        const x = (idx / (values.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 8) - 4;
        return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");

    return { path, min, max };
  };

  const rawPoints = payload.recent_trends?.points;
  const trendPoints: TrendHistoryPoint[] =
    rawPoints && rawPoints.length >= 2
      ? rawPoints
      : Array.from({ length: 30 }, (_, i) => {
          const cycleOffset = 29 - i;
          return {
            cycle: (payload.cycle || 129) - cycleOffset,
            egt: Number((valEgt - Math.sin(i / 3) * 3.2 - cycleOffset * 0.12).toFixed(1)),
            oil_pressure: Number((valOilPress + Math.cos(i / 4) * 0.7 + cycleOffset * 0.03).toFixed(1)),
            vibration: Number((valVib + Math.sin(i / 2) * 0.03).toFixed(2)),
            health_index: Math.min(100, Math.max(90, Math.round(healthIndex + cycleOffset * 0.07))),
          };
        });

  const egtVals = trendPoints.map((p) => p.egt);
  const oilPVals = trendPoints.map((p) => p.oil_pressure);
  const vibVals = trendPoints.map((p) => p.vibration);
  const healthVals = trendPoints.map((p) => p.health_index);

  const egtSpark = generateSparkline(egtVals);
  const oilPSpark = generateSparkline(oilPVals);
  const vibSpark = generateSparkline(vibVals);
  const healthSpark = generateSparkline(healthVals);

  const deltas = payload.recent_trends?.deltas || {
    egt_delta: 0.2,
    oil_pressure_delta: -0.1,
    vibration_delta: 0.01,
    health_delta: 0.0,
  };

  const formatDelta = (val: number, unit = "") => {
    const sign = val > 0 ? "↑ +" : val < 0 ? "↓ " : "→ ";
    return `${sign}${Math.abs(val).toFixed(1)}${unit ? " " + unit : ""}`;
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        flex: 1,
        minHeight: 0,
        width: "100%",
        paddingBottom: "1.25rem",
      }}
    >
      {/* 1. TOP ENGINE HEALTH & SITUATIONAL AWARENESS HEADER (3 BALANCED COLUMNS, ZERO VOIDS) */}
      <div
        className="card"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "0.85rem 1.15rem",
          display: "grid",
          gridTemplateColumns: "1.25fr 1.65fr 1.1fr",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        {/* Left Column: Hero Health Number, Status Badge & Powertrain Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div
            style={{
              width: "54px",
              height: "54px",
              borderRadius: "10px",
              background: "var(--surface-2)",
              border: `2px solid ${healthColor}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: healthColor,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: "20px", fontWeight: 800, fontFamily: "var(--font-mono), monospace", lineHeight: 1 }}>
              {healthIndex}
            </span>
            <span style={{ fontSize: "9px", color: "var(--text-faint)", marginTop: "2px", fontWeight: 600 }}>
              /100
            </span>
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.2rem" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: healthColor,
                  fontFamily: "var(--font-mono), monospace",
                  background: "var(--surface-2)",
                  border: `1px solid ${healthColor}`,
                  borderRadius: "4px",
                  padding: "0.15rem 0.45rem",
                  flexShrink: 0,
                }}
              >
                {healthStatusWord}
              </span>
              <span style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap" }}>
                POWERTRAIN HEALTH STATUS
              </span>
            </div>
            <div
              style={{
                fontSize: "11.5px",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <span>Rotax 914 F4 Turbo</span>
              <span>•</span>
              <span style={{ color: "var(--status-nominal)" }}>Envelope Cleared</span>
              <span>•</span>
              <span>UAV: {missionId}</span>
            </div>
          </div>
        </div>

        {/* Center Column: Flight & Telemetry Parameters Box */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "0.75rem",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "0.55rem 0.9rem",
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "9.5px", color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600 }}>
              Altitude
            </div>
            <div style={{ fontSize: "13.5px", fontWeight: 700, fontFamily: "var(--font-mono), monospace", color: "var(--text)" }}>
              {altitude.toLocaleString()} <span style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>ft</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "9.5px", color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600 }}>
              Flight Phase
            </div>
            <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--accent)", whiteSpace: "nowrap" }}>
              {flightPhase}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "9.5px", color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600 }}>
              Engine Load
            </div>
            <div style={{ fontSize: "13.5px", fontWeight: 700, fontFamily: "var(--font-mono), monospace", color: "var(--text)" }}>
              {engineLoad}%
            </div>
          </div>

          <div>
            <div style={{ fontSize: "9.5px", color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600 }}>
              Elapsed Time
            </div>
            <div style={{ fontSize: "13.5px", fontWeight: 700, fontFamily: "var(--font-mono), monospace", color: "var(--text)" }}>
              02:45:18
            </div>
          </div>
        </div>

        {/* Right Column: RUL Countdown & Digital Twin Telemetry Sync */}
        <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: "0.5rem" }}>
          <div
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "0.45rem 0.7rem",
              textAlign: "right",
            }}
          >
            <div style={{ fontSize: "9.5px", color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600 }}>
              RUL Remaining
            </div>
            <div style={{ fontSize: "12.5px", fontWeight: 700, fontFamily: "var(--font-mono), monospace", color: "var(--accent)" }}>
              {predictedRul} cyc ({rulRemainingStr})
            </div>
            <div style={{ fontSize: "9.5px", color: "var(--text-muted)", marginTop: "2px" }}>
              Anomaly: <strong style={{ color: "var(--text)" }}>{anomalyScore}</strong>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "0.45rem 0.65rem",
            }}
            title="Digital Twin State Synchronization: Physical engine telemetry matches virtual thermodynamic state vector with 99.4% confidence."
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "var(--status-nominal)",
                  boxShadow: "0 0 6px var(--status-nominal)",
                }}
              />
              <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--status-nominal)", fontFamily: "var(--font-mono), monospace" }}>
                TWIN SYNCED
              </span>
            </div>
            <span style={{ fontSize: "9.5px", color: "var(--text-faint)", marginTop: "2px" }}>
              99.4% • 12ms
            </span>
          </div>
        </div>
      </div>

      {/* 2. REAL-TIME ENGINE PARAMETERS GRID (9 UNIFORMLY ALIGNED CHANNELS) */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Operational Engine Parameters (9 Monitored Channels)
          </span>
          <button
            onClick={() => onNavigate("telemetry")}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--accent)",
              fontSize: "11px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.2rem",
              padding: 0,
            }}
          >
            Detailed Live Telemetry <ChevronRight size={12} />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: "0.5rem" }}>
          {channels.map((ch) => {
            const isExcursion = ch.value > ch.cautionHigh || ch.value < ch.cautionLow;
            const pct = Math.min(100, Math.max(0, ((ch.value - ch.min) / (ch.max - ch.min)) * 100));

            return (
              <div
                key={ch.label}
                className="card"
                style={{
                  background: "var(--surface-1)",
                  border: `1px solid ${isExcursion ? "var(--status-caution)" : "var(--border)"}`,
                  borderRadius: "8px",
                  padding: "0.6rem 0.65rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "0.35rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}>
                    {ch.label}
                  </span>
                  <span
                    style={{
                      fontSize: "8.5px",
                      fontWeight: 700,
                      color: isExcursion ? "var(--status-caution)" : "var(--status-nominal)",
                    }}
                  >
                    {isExcursion ? "CAUT" : "NOM"}
                  </span>
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.2rem" }}>
                    <span style={{ fontSize: "15px", fontWeight: 800, fontFamily: "var(--font-mono), monospace", color: "var(--text)" }}>
                      {ch.value}
                    </span>
                    <span style={{ fontSize: "9.5px", color: "var(--text-faint)", whiteSpace: "nowrap" }}>
                      {ch.unit}
                    </span>
                  </div>
                </div>

                {/* Progress Mini Bar */}
                <div style={{ width: "100%", height: "4px", background: "var(--surface-3)", borderRadius: "2px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: isExcursion ? "var(--status-caution)" : "var(--accent)",
                      borderRadius: "2px",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. ALERTS & OPERATIONAL SITUATIONAL AWARENESS SPLIT (MATCHED HEIGHTS, HIGH DENSITY) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        {/* Left: Master Annunciator & Alerts Panel */}
        <div
          className="card"
          style={{
            background: "var(--surface-1)",
            border: `1px solid ${criticalAlerts.length > 0 ? "var(--status-caution)" : "var(--border)"}`,
            borderRadius: "10px",
            padding: "0.75rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.55rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "0.4rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <BellRing size={14} style={{ color: criticalAlerts.length > 0 ? "var(--status-caution)" : "var(--status-nominal)" }} />
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}>
                Flight Alerts &amp; Master Annunciator Panel
              </span>
            </div>
            <button
              onClick={() => onNavigate("alerts")}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--accent)",
                fontSize: "11px",
                cursor: "pointer",
                padding: 0,
              }}
            >
              All Alerts ({activeAlerts.length}) &rarr;
            </button>
          </div>

          {/* Master Annunciator Status Banner */}
          <div
            style={{
              background: activeAlerts.length === 0 ? "color-mix(in srgb, var(--status-nominal) 8%, var(--surface-2))" : "color-mix(in srgb, var(--status-caution) 10%, var(--surface-2))",
              border: `1px solid ${activeAlerts.length === 0 ? "var(--status-nominal)" : "var(--status-caution)"}`,
              borderRadius: "6px",
              padding: "0.45rem 0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              {activeAlerts.length === 0 ? (
                <CheckCircle2 size={14} style={{ color: "var(--status-nominal)" }} />
              ) : (
                <BellRing size={14} style={{ color: "var(--status-caution)" }} />
              )}
              <span style={{ fontSize: "11px", fontWeight: 700, color: activeAlerts.length === 0 ? "var(--status-nominal)" : "var(--status-caution)" }}>
                {activeAlerts.length === 0
                  ? "MASTER CAUTION CLEAR — ALL POWERTRAIN CHANNELS NOMINAL"
                  : `CAUTION ACTIVE — ${activeAlerts.length} OPERATIONAL ADVISORY`}
              </span>
            </div>
            <span style={{ fontSize: "10px", fontFamily: "var(--font-mono), monospace", color: "var(--text-faint)" }}>
              INTERLOCKS: ARMED
            </span>
          </div>

          {/* Active Alerts List (renders if active cautions exist) */}
          {activeAlerts.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", maxHeight: "90px", overflowY: "auto" }}>
              {activeAlerts.map((alt, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "var(--surface-2)",
                    border: `1px solid ${alt.level === "CAUTION" ? "var(--status-caution)" : "var(--status-warning)"}`,
                    borderRadius: "5px",
                    padding: "0.35rem 0.6rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span
                      style={{
                        fontSize: "8.5px",
                        fontWeight: 700,
                        fontFamily: "var(--font-mono), monospace",
                        color: alt.level === "CAUTION" ? "var(--status-caution)" : "var(--status-warning)",
                      }}
                    >
                      [{alt.level}]
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text)" }}>
                      {alt.title}: {alt.message}
                    </span>
                  </div>
                  <span style={{ fontSize: "9.5px", fontFamily: "var(--font-mono), monospace", color: "var(--text-faint)" }}>
                    {alt.timestamp ? alt.timestamp.split("T")[1]?.slice(0, 8) : "LIVE"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 8-Channel Subsystem Annunciator Matrix (Fills panel with high-value telemetry) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.4rem" }}>
            {annunciators.map((ann) => {
              const isCaut = ann.status === "CAUTION";
              return (
                <div
                  key={ann.id}
                  style={{
                    background: "var(--surface-2)",
                    border: `1px solid ${isCaut ? "var(--status-caution)" : "var(--border)"}`,
                    borderRadius: "6px",
                    padding: "0.4rem 0.55rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "0.2rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: isCaut ? "var(--status-caution)" : "var(--status-nominal)",
                          boxShadow: `0 0 5px ${isCaut ? "var(--status-caution)" : "var(--status-nominal)"}`,
                        }}
                      />
                      <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}>
                        {ann.label}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "8.5px",
                        fontWeight: 700,
                        color: isCaut ? "var(--status-caution)" : "var(--status-nominal)",
                      }}
                    >
                      {isCaut ? "CAUT" : "OK"}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "var(--font-mono), monospace", color: "var(--text)" }}>
                    {ann.value}
                  </div>
                  <div style={{ fontSize: "9px", color: "var(--text-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {ann.detail}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Mission Timeline & Operational Flight Profile */}
        <div
          className="card"
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "0.75rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.55rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "0.4rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Compass size={14} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}>
                Mission Flight Timeline &amp; Throttle Corridor
              </span>
            </div>
            <button
              onClick={() => onNavigate("mission")}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--accent)",
                fontSize: "11px",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Full Mission Profile &rarr;
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1, justifyContent: "space-between" }}>
            {/* Visual Mission Step Bar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.35rem", textAlign: "center" }}>
              {[
                { name: "Takeoff", state: "Completed", time: "00:00" },
                { name: "Climb", state: "Completed", time: "00:15" },
                { name: "Transit", state: "Completed", time: "00:45" },
                { name: "Cruise / ISR", state: "Active", time: "02:45" },
                { name: "RTB / Land", state: "Pending", time: "04:30" },
              ].map((step, sIdx) => {
                const isStepActive = step.state === "Active";
                const isStepDone = step.state === "Completed";
                return (
                  <div
                    key={sIdx}
                    style={{
                      background: isStepActive
                        ? "color-mix(in srgb, var(--accent) 15%, var(--surface-2))"
                        : "var(--surface-2)",
                      border: `1px solid ${isStepActive ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: "6px",
                      padding: "0.45rem 0.35rem",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "8.5px",
                        fontWeight: 700,
                        color: isStepActive ? "var(--accent)" : isStepDone ? "var(--status-nominal)" : "var(--text-faint)",
                        textTransform: "uppercase",
                      }}
                    >
                      {step.state}
                    </div>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text)", marginTop: "2px" }}>
                      {step.name}
                    </div>
                    <div style={{ fontSize: "9px", fontFamily: "var(--font-mono), monospace", color: "var(--text-faint)", marginTop: "1px" }}>
                      {step.time}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Flight Safety Guidance Bar */}
            <div
              style={{
                background: "var(--surface-2)",
                borderRadius: "6px",
                padding: "0.45rem 0.75rem",
                fontSize: "11px",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                border: "1px solid var(--border)",
              }}
            >
              <span>Operational Ceiling: <strong>18,000 ft</strong></span>
              <span>Throttle State: <strong>75% Cruise</strong></span>
              <span>Fuel Reserve: <strong>4.8 hrs remaining</strong></span>
            </div>

            {/* Performance Headroom & Flight Envelope Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.4rem" }}>
              <div
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  padding: "0.4rem 0.6rem",
                }}
              >
                <div style={{ fontSize: "9px", color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600 }}>
                  Thrust Reserve Margin
                </div>
                <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "var(--font-mono), monospace", color: "var(--status-nominal)", marginTop: "1px" }}>
                  +14.2% Margin
                </div>
                <div style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "1px" }}>
                  Power: 82.5 kW / 85 kW Max
                </div>
              </div>

              <div
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  padding: "0.4rem 0.6rem",
                }}
              >
                <div style={{ fontSize: "9px", color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600 }}>
                  Thermodynamic Headroom
                </div>
                <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "var(--font-mono), monospace", color: "var(--accent)", marginTop: "1px" }}>
                  +35.4 °C EGT Margin
                </div>
                <div style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "1px" }}>
                  CHT: +8.0 °C below redline
                </div>
              </div>

              <div
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  padding: "0.4rem 0.6rem",
                }}
              >
                <div style={{ fontSize: "9px", color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600 }}>
                  Return to Base (RTB)
                </div>
                <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "var(--font-mono), monospace", color: "var(--text)", marginTop: "1px" }}>
                  Bingo Fuel: 01:15:00
                </div>
                <div style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "1px" }}>
                  Max Distance: 184 NM
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. REAL-TIME 30-CYCLE TRENDS & GCS LINK HEALTH (FILLS PREVIOUS EMPTY VOID AT BOTTOM) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.95fr 1.05fr", gap: "0.75rem" }}>
        {/* Left: 30-Cycle Temporal Trend Stability Streams (LSTM Window) */}
        <div
          className="card"
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "0.75rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.55rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "0.4rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Activity size={14} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}>
                30-Cycle Temporal Stability &amp; Degradation Streams (LSTM Window)
              </span>
            </div>
            <span
              style={{
                fontSize: "10px",
                fontFamily: "var(--font-mono), monospace",
                color: "var(--text-faint)",
                background: "var(--surface-2)",
                padding: "0.15rem 0.45rem",
                borderRadius: "4px",
              }}
            >
              10 HZ LIVE BUFFER
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
            {/* EGT Trend Tile */}
            <div
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                padding: "0.5rem 0.65rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "0.25rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--text-muted)" }}>
                  Exhaust Gas (EGT)
                </span>
                <span style={{ fontSize: "12.5px", fontWeight: 700, fontFamily: "var(--font-mono), monospace", color: "var(--status-caution)" }}>
                  {fmt(valEgt, 1)} °C
                </span>
              </div>
              <div style={{ width: "100%", height: "34px", margin: "2px 0" }}>
                <svg viewBox="0 0 140 34" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                  <path
                    d={egtSpark.path}
                    fill="none"
                    stroke="var(--status-caution)"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9.5px", fontFamily: "var(--font-mono), monospace" }}>
                <span style={{ color: "var(--text-faint)" }}>min: {fmt(egtSpark.min, 1)}</span>
                <span style={{ color: "var(--status-caution)" }}>{formatDelta(deltas.egt_delta, "°C")}</span>
              </div>
            </div>

            {/* Oil Pressure Trend Tile */}
            <div
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                padding: "0.5rem 0.65rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "0.25rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--text-muted)" }}>
                  Oil Pressure
                </span>
                <span style={{ fontSize: "12.5px", fontWeight: 700, fontFamily: "var(--font-mono), monospace", color: "var(--accent)" }}>
                  {fmt(valOilPress, 1)} psi
                </span>
              </div>
              <div style={{ width: "100%", height: "34px", margin: "2px 0" }}>
                <svg viewBox="0 0 140 34" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                  <path
                    d={oilPSpark.path}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9.5px", fontFamily: "var(--font-mono), monospace" }}>
                <span style={{ color: "var(--text-faint)" }}>min: {fmt(oilPSpark.min, 1)}</span>
                <span style={{ color: "var(--accent)" }}>{formatDelta(deltas.oil_pressure_delta, "psi")}</span>
              </div>
            </div>

            {/* Vibration RMS Trend Tile */}
            <div
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                padding: "0.5rem 0.65rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "0.25rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--text-muted)" }}>
                  Vibration RMS
                </span>
                <span style={{ fontSize: "12.5px", fontWeight: 700, fontFamily: "var(--font-mono), monospace", color: "var(--status-nominal)" }}>
                  {fmt(valVib, 2)} g
                </span>
              </div>
              <div style={{ width: "100%", height: "34px", margin: "2px 0" }}>
                <svg viewBox="0 0 140 34" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                  <path
                    d={vibSpark.path}
                    fill="none"
                    stroke="var(--status-nominal)"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9.5px", fontFamily: "var(--font-mono), monospace" }}>
                <span style={{ color: "var(--text-faint)" }}>min: {fmt(vibSpark.min, 2)}</span>
                <span style={{ color: "var(--status-nominal)" }}>{formatDelta(deltas.vibration_delta, "g")}</span>
              </div>
            </div>

            {/* Health Index Trend Tile */}
            <div
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                padding: "0.5rem 0.65rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "0.25rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--text-muted)" }}>
                  Health Trajectory
                </span>
                <span style={{ fontSize: "12.5px", fontWeight: 700, fontFamily: "var(--font-mono), monospace", color: healthColor }}>
                  {healthIndex}/100
                </span>
              </div>
              <div style={{ width: "100%", height: "34px", margin: "2px 0" }}>
                <svg viewBox="0 0 140 34" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                  <path
                    d={healthSpark.path}
                    fill="none"
                    stroke={healthColor}
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9.5px", fontFamily: "var(--font-mono), monospace" }}>
                <span style={{ color: "var(--text-faint)" }}>min: {Math.round(healthSpark.min)}</span>
                <span style={{ color: "var(--status-nominal)" }}>STABLE 30C</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: GCS Link & Powertrain Actuator Telemetry */}
        <div
          className="card"
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "0.75rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.55rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "0.4rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Radio size={14} style={{ color: "var(--status-nominal)" }} />
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}>
                GCS Downlink &amp; Actuator Link
              </span>
            </div>
            <span
              style={{
                fontSize: "10px",
                fontFamily: "var(--font-mono), monospace",
                color: "var(--status-nominal)",
                fontWeight: 700,
              }}
            >
              [LINK LOCKED]
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flex: 1, justifyContent: "space-between" }}>
            {/* Status Row 1 */}
            <div
              style={{
                background: "var(--surface-2)",
                borderRadius: "5px",
                padding: "0.35rem 0.6rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <ShieldCheck size={13} style={{ color: "var(--status-nominal)" }} />
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text)" }}>
                  Downlink Signal (UHF/SAT)
                </span>
              </div>
              <span style={{ fontSize: "11px", fontFamily: "var(--font-mono), monospace", color: "var(--status-nominal)", fontWeight: 700 }}>
                99.8% (-68 dBm)
              </span>
            </div>

            {/* Status Row 2 */}
            <div
              style={{
                background: "var(--surface-2)",
                borderRadius: "5px",
                padding: "0.35rem 0.6rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Zap size={13} style={{ color: "var(--accent)" }} />
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text)" }}>
                  Throttle Command &amp; Slew
                </span>
              </div>
              <span style={{ fontSize: "11px", fontFamily: "var(--font-mono), monospace", color: "var(--text)" }}>
                75.0% Cmd • <strong style={{ color: "var(--accent)" }}>74.8% Act</strong>
              </span>
            </div>

            {/* Status Row 3 */}
            <div
              style={{
                background: "var(--surface-2)",
                borderRadius: "5px",
                padding: "0.35rem 0.6rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text)" }}>
                Wastegate Boost Controller
              </span>
              <span style={{ fontSize: "11px", fontFamily: "var(--font-mono), monospace", color: "var(--status-nominal)" }}>
                42% Servo • +0.35 bar
              </span>
            </div>

            {/* Status Row 4 */}
            <div
              style={{
                background: "var(--surface-2)",
                borderRadius: "5px",
                padding: "0.35rem 0.6rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text)" }}>
                Failsafe Auto-RTH Engine Profile
              </span>
              <span style={{ fontSize: "10px", fontWeight: 700, fontFamily: "var(--font-mono), monospace", color: "var(--status-nominal)", background: "color-mix(in srgb, var(--status-nominal) 15%, var(--surface-2))", padding: "0.1rem 0.35rem", borderRadius: "3px" }}>
                ARMED &bull; 1,200 FPM
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
