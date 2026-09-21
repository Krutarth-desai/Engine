"use client";

import React from "react";
import { UnifiedTelemetryPayload } from "../types/telemetry";
import EngineSensorsPanel from "./EngineSensorsPanel";
import TelemetryChart from "./TelemetryChart";
import PageLayout from "./common/PageLayout";
import { Activity } from "lucide-react";

interface LiveTelemetryViewProps {
  payload: UnifiedTelemetryPayload;
}

export default function LiveTelemetryView({ payload }: LiveTelemetryViewProps) {
  // Convert payload to TelemetryData format for TelemetryChart
  const flatTelemetry = {
    timestamp: payload.timestamp,
    engine_id: payload.vehicle?.vehicle_id || "ENG_001",
    rpm: payload.sensors?.rpm?.value ?? payload.rpm ?? 2450,
    cht_c: payload.sensors?.cht?.value ?? payload.cht_c ?? 142.0,
    egt_c: payload.sensors?.egt?.value ?? payload.egt_c ?? 615.0,
    oil_pressure_bar: payload.sensors?.oil_pressure?.value
      ? payload.sensors.oil_pressure.value / 14.5038
      : (payload.oil_pressure_bar ?? 4.7),
    oil_temperature_c: payload.sensors?.oil_temperature?.value ?? payload.oil_temperature_c ?? 92.0,
    fuel_flow_lh: payload.sensors?.fuel_flow?.value ?? payload.fuel_flow_lh ?? 17.6,
    vibration_g: payload.sensors?.vibration?.value ?? payload.vibration_g ?? 1.42,
    battery_voltage_v: payload.sensors?.bus_voltage?.value ?? payload.battery_voltage_v ?? 27.6,
    injection_timing_deg: payload.sensors?.injection_timing?.value ?? payload.injection_timing_deg ?? 23.4,
    health_index: payload.health_index ?? 72,
    rul: payload.prognostics?.predicted_rul ?? 117,
    fault_label: payload.fault_label ?? "Normal",
  };

  return (
    <PageLayout
      title="Live Telemetry"
      subtitle="High-frequency 1 Hz avionics telemetry stream, real-time waveform dynamics, and 9-channel sensor status"
      icon={<Activity size={18} />}
      noScroll={true}
      tags={
        <span
          className="nav-tag"
          style={{
            color: "var(--accent)",
            borderColor: "var(--border-strong)",
            fontFamily: "var(--font-mono), monospace",
          }}
        >
          LIVE 1 Hz STREAM
        </span>
      }
    >
      <div className="telemetry-view-split-50">
        {/* Left 50%: ENGINE SYSTEM SENSORS (Responsive 3x3 Grid) */}
        <div className="telemetry-split-col">
          <EngineSensorsPanel sensors={payload.sensor_list || []} />
        </div>

        {/* Right 50%: THERMAL & COMBUSTION WAVEFORMS */}
        <div className="telemetry-split-col">
          <TelemetryChart telemetry={flatTelemetry} />
        </div>
      </div>
    </PageLayout>
  );
}

