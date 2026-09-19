"use client";

import React from "react";
import { TelemetryData } from "@/types/telemetry";
import { useTelemetry } from "@/context/TelemetryContext";
import SensorCard from "./common/SensorCard";
import { SENSOR_LIMITS, SensorKey } from "@/lib/limits";
import { fmtTimestamp } from "@/lib/format";

interface TelemetryGaugesProps {
  telemetry: TelemetryData | null;
}

export default function TelemetryGauges({ telemetry }: TelemetryGaugesProps) {
  const { historyBuffer, focusedComponent, setFocusedComponent, timeDisplay } = useTelemetry();

  const timestampStr = telemetry?.timestamp
    ? fmtTimestamp(telemetry.timestamp, timeDisplay === "zulu")
    : "--:--:--";

  const sensorKeys: SensorKey[] = [
    "rpm",
    "cht",
    "egt",
    "oil_pressure",
    "oil_temperature",
    "fuel_flow",
    "vibration",
    "bus_voltage",
    "injection_timing",
  ];

  return (
    <div className="panel telemetry-gauges-panel" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="panel-title">
          <strong>9-CHANNEL SENSOR GAUGES (UNIFIED HUD SCALES)</strong>
        </span>
        <span
          className="metric-tag font-mono"
          style={{ fontSize: "0.68rem" }}
          id="val-timestamp"
        >
          SYNC: {timestampStr}
        </span>
      </div>

      <div
        className="telemetry-gauge-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "0.6rem",
          flex: 1,
          overflowY: "auto",
        }}
      >
        {sensorKeys.map((key) => {
          const def = SENSOR_LIMITS[key];
          const isFocused = focusedComponent === key;

          // Extract value from telemetry
          let val: number | undefined;
          if (key === "rpm") val = telemetry?.rpm;
          else if (key === "cht") val = telemetry?.cht_c;
          else if (key === "egt") val = telemetry?.egt_c;
          else if (key === "oil_pressure") val = telemetry?.oil_pressure_bar ? telemetry.oil_pressure_bar * 14.5038 : undefined;
          else if (key === "oil_temperature") val = telemetry?.oil_temperature_c;
          else if (key === "fuel_flow") val = telemetry?.fuel_flow_lh;
          else if (key === "vibration") val = telemetry?.vibration_g;
          else if (key === "bus_voltage") val = telemetry?.battery_voltage_v;
          else if (key === "injection_timing") val = telemetry?.injection_timing_deg;

          // Extract rolling history for sparkline
          const history = historyBuffer
            .map((h) => {
              const v = h.sensors?.[key]?.value;
              return typeof v === "number" ? v : null;
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
              key={key}
              sensorKey={key}
              value={val ?? def?.nominal}
              name={def?.name}
              unit={def?.unit}
              history={history}
              delta10s={delta10s}
              compact={false}
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
