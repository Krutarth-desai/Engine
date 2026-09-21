"use client";

import React from "react";
import { SensorItem } from "../types/telemetry";
import SensorCard from "./common/SensorCard";
import { SensorKey } from "@/lib/limits";
import { useTelemetry } from "@/context/TelemetryContext";

interface EngineSensorsPanelProps {
  sensors: SensorItem[];
  horizontal?: boolean;
  compact?: boolean;
}

const KEY_MAP: Record<string, SensorKey> = {
  rpm: "rpm",
  cht: "cht",
  egt: "egt",
  oil_pressure: "oil_pressure",
  oil_temperature: "oil_temperature",
  fuel_flow: "fuel_flow",
  vibration: "vibration",
  bus_voltage: "bus_voltage",
  injection_timing: "injection_timing",
};

export default function EngineSensorsPanel({
  sensors,
  horizontal = true,
  compact = true,
}: EngineSensorsPanelProps) {
  const { historyBuffer, focusedComponent, setFocusedComponent } = useTelemetry();

  return (
    <div
      className="panel engine-sensors-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        boxSizing: "border-box",
        padding: "0.6rem 0.85rem",
        gap: "0.45rem",
        height: horizontal ? "auto" : "100%",
        flexShrink: 0,
      }}
    >
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div className="panel-title">
            <strong>ENGINE SYSTEM SENSORS</strong>
          </div>
          <span
            style={{
              fontSize: "0.62rem",
              color: "var(--accent)",
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            [9-CHANNEL REAL-TIME STREAM]
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {focusedComponent && (
            <button
              onClick={() => setFocusedComponent(null)}
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--accent)",
                borderRadius: "4px",
                padding: "0.15rem 0.45rem",
                fontSize: "0.62rem",
                cursor: "pointer",
                fontFamily: "var(--font-mono), monospace",
              }}
            >
              CLEAR FOCUS
            </button>
          )}
          <span className="badge-live-pulse"><strong>REAL-TIME 1 Hz</strong></span>
        </div>
      </div>

      <div
        className="sensors-list"
        style={
          horizontal
            ? {
                display: "grid",
                gridTemplateColumns: "repeat(9, minmax(115px, 1fr))",
                gap: "0.45rem",
                overflowX: "auto",
                paddingBottom: "0.15rem",
              }
            : {
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                paddingRight: "0.25rem",
              }
        }
      >
        {sensors.map((sensor) => {
          const sKey = KEY_MAP[sensor.key] || (sensor.key as SensorKey);
          const isFocused = focusedComponent === sKey || focusedComponent === sensor.key;

          // Extract rolling history for sparkline
          const history = historyBuffer
            .map((h) => {
              const val = h.sensors?.[sKey]?.value ?? h.sensors?.[sensor.key]?.value;
              return typeof val === "number" ? val : null;
            })
            .filter((v): v is number => v !== null);

          // Calculate 10s delta
          let delta10s: number | undefined;
          if (history.length >= 10) {
            const current = history[history.length - 1];
            const past = history[history.length - 10];
            delta10s = Math.round((current - past) * 10) / 10;
          }

          return (
            <SensorCard
              key={sensor.key}
              sensorKey={sKey}
              value={typeof sensor.value === "number" ? sensor.value : Number(sensor.value)}
              name={sensor.name}
              unit={sensor.unit}
              history={history}
              trend={sensor.trend}
              delta10s={delta10s}
              isFocused={isFocused}
              compact={compact}
              onFocus={(k) => {
                setFocusedComponent(focusedComponent === k ? null : k);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

