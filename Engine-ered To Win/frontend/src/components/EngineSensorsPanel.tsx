"use client";

import React from "react";
import { SensorItem } from "../types/telemetry";
import SensorCard from "./common/SensorCard";
import { SensorKey } from "@/lib/limits";
import { useTelemetry } from "@/context/TelemetryContext";

interface EngineSensorsPanelProps {
  sensors: SensorItem[];
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

export default function EngineSensorsPanel({ sensors }: EngineSensorsPanelProps) {
  const { historyBuffer, focusedComponent, setFocusedComponent } = useTelemetry();

  return (
    <div className="panel engine-sensors-panel">
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="panel-title">
          <strong>9-CHANNEL ENGINE SENSORS</strong>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {focusedComponent && (
            <button
              onClick={() => setFocusedComponent(null)}
              style={{
                background: "rgba(56, 189, 248, 0.15)",
                border: "1px solid rgba(56, 189, 248, 0.4)",
                color: "var(--accent-cyan)",
                borderRadius: "4px",
                padding: "0.15rem 0.45rem",
                fontSize: "0.62rem",
                cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace",
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
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "0.5rem",
          maxHeight: "calc(100vh - 240px)",
          overflowY: "auto",
          paddingRight: "0.25rem",
        }}
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

