"use client";

import React, { useState, useEffect } from "react";
import { useTelemetry } from "@/context/TelemetryContext";

export default function EnvironmentPanel() {
  const { environment, payload, setEnvironment, setSimulationSpeed, isConnected } = useTelemetry();

  // Local state for sliders/inputs before submitting
  const [altInput, setAltInput] = useState<number>(15000);
  const [tempInput, setTempInput] = useState<number>(15.0);
  const [throttleInput, setThrottleInput] = useState<number>(75);
  const [speedInput, setSpeedInput] = useState<number>(1.0);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Sync with backend values when environment updates
  useEffect(() => {
    if (environment) {
      if (environment.altitude_ft != null) setAltInput(Math.round(environment.altitude_ft));
      if (environment.ambient_temp_c != null) setTempInput(Number(environment.ambient_temp_c.toFixed(1)));
      if (environment.throttle_pct != null) setThrottleInput(Math.round(environment.throttle_pct));
      if (environment.simulation_speed != null) setSpeedInput(environment.simulation_speed);
    } else if (payload.vehicle) {
      if (payload.vehicle.altitude != null) setAltInput(payload.vehicle.altitude);
      if (payload.vehicle.throttle != null) setThrottleInput(payload.vehicle.throttle);
    }
  }, [environment, payload.vehicle]);

  const handleApplyEnv = async () => {
    setIsUpdating(true);
    try {
      await setEnvironment({
        altitude_ft: Number(altInput),
        ambient_temp_c: Number(tempInput),
        throttle_pct: Number(throttleInput),
      });
      if (speedInput !== (environment?.simulation_speed || 1.0)) {
        await setSimulationSpeed(Number(speedInput));
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSpeedQuickSet = async (multiplier: number) => {
    setSpeedInput(multiplier);
    await setSimulationSpeed(multiplier);
  };

  // Extract live backend metrics
  const alt = environment?.altitude_ft ?? payload.vehicle?.altitude ?? 15000;
  const temp = environment?.ambient_temp_c ?? 15.0;
  const airDensity = environment?.air_density_kg_m3 ?? 0.771;
  const densityRatio = environment?.density_ratio ?? 0.629;
  const throttle = environment?.effective_throttle_pct ?? environment?.throttle_pct ?? payload.vehicle?.throttle ?? 75;
  const primaryCondition = environment?.primary_condition ?? environment?.operating_condition ?? "HIGH_ALTITUDE";
  const speed = environment?.simulation_speed ?? 1.0;
  const enduranceHrs = environment?.endurance_hours ?? (environment?.mission_time_sec ? environment.mission_time_sec / 3600 : 0);

  return (
    <div
      className="environment-panel"
      style={{
        background: "var(--bg-card, rgba(14, 21, 38, 0.75))",
        border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
        borderRadius: "10px",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.95rem", fontWeight: 800, letterSpacing: "0.5px", color: "#f8fafc" }}>
              ATMOSPHERE &amp; OPERATING CONDITIONS (PHASE 4)
            </span>
            <span
              style={{
                fontSize: "0.62rem",
                fontWeight: 800,
                padding: "0.15rem 0.45rem",
                borderRadius: "4px",
                background: "rgba(56, 189, 248, 0.15)",
                color: "var(--accent-cyan, #38bdf8)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
              }}
            >
              ISA MODEL
            </span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary, #94a3b8)", marginTop: "0.15rem" }}>
            Real-time barometric lapse rate, air density ratio (σ), and transient governor demand
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.68rem", color: "var(--text-muted, #64748b)" }}>CONDITION:</span>
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 800,
              padding: "0.2rem 0.5rem",
              borderRadius: "4px",
              background: "rgba(16, 185, 129, 0.15)",
              color: "#10b981",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              letterSpacing: "0.5px",
            }}
          >
            {primaryCondition}
          </span>
        </div>
      </div>

      {/* 4 Live Environmental Telemetry Chips */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "0.6rem",
        }}
      >
        {/* Altitude */}
        <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "6px", padding: "0.6rem" }}>
          <div style={{ fontSize: "0.65rem", color: "var(--text-muted, #64748b)" }}>ALTITUDE</div>
          <div style={{ fontSize: "1.15rem", fontWeight: 800, fontFamily: "var(--font-mono, monospace)", color: "#f8fafc", marginTop: "0.1rem" }}>
            {alt.toLocaleString()} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ft</span>
          </div>
        </div>

        {/* Ambient Temperature */}
        <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "6px", padding: "0.6rem" }}>
          <div style={{ fontSize: "0.65rem", color: "var(--text-muted, #64748b)" }}>AMBIENT TEMP</div>
          <div style={{ fontSize: "1.15rem", fontWeight: 800, fontFamily: "var(--font-mono, monospace)", color: "#f8fafc", marginTop: "0.1rem" }}>
            {temp > 0 ? `+${temp.toFixed(1)}` : temp.toFixed(1)} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>°C</span>
          </div>
        </div>

        {/* Air Density */}
        <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "6px", padding: "0.6rem" }}>
          <div style={{ fontSize: "0.65rem", color: "var(--text-muted, #64748b)" }}>AIR DENSITY (ρ)</div>
          <div style={{ fontSize: "1.15rem", fontWeight: 800, fontFamily: "var(--font-mono, monospace)", color: "var(--accent-cyan, #38bdf8)", marginTop: "0.1rem" }}>
            {airDensity.toFixed(3)} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>kg/m³</span>
          </div>
        </div>

        {/* Density Ratio */}
        <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "6px", padding: "0.6rem" }}>
          <div style={{ fontSize: "0.65rem", color: "var(--text-muted, #64748b)" }}>DENSITY RATIO (σ)</div>
          <div style={{ fontSize: "1.15rem", fontWeight: 800, fontFamily: "var(--font-mono, monospace)", color: "var(--accent-cyan, #38bdf8)", marginTop: "0.1rem" }}>
            {densityRatio.toFixed(3)} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>σ/σ₀</span>
          </div>
        </div>

        {/* Throttle Demand */}
        <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "6px", padding: "0.6rem" }}>
          <div style={{ fontSize: "0.65rem", color: "var(--text-muted, #64748b)" }}>THROTTLE DEMAND</div>
          <div style={{ fontSize: "1.15rem", fontWeight: 800, fontFamily: "var(--font-mono, monospace)", color: "#f8fafc", marginTop: "0.1rem" }}>
            {throttle.toFixed(0)} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>%</span>
          </div>
        </div>

        {/* Sim Speed */}
        <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "6px", padding: "0.6rem" }}>
          <div style={{ fontSize: "0.65rem", color: "var(--text-muted, #64748b)" }}>SIM ACCELERATION</div>
          <div style={{ fontSize: "1.15rem", fontWeight: 800, fontFamily: "var(--font-mono, monospace)", color: "#f59e0b", marginTop: "0.1rem" }}>
            {speed.toFixed(1)}x <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>({enduranceHrs.toFixed(1)}h flight)</span>
          </div>
        </div>
      </div>

      {/* Interactive Environment Controls */}
      <div
        style={{
          background: "rgba(0, 0, 0, 0.2)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          borderRadius: "8px",
          padding: "0.85rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary, #94a3b8)" }}>
          OPERATOR ENVIRONMENT INJECTION CONTROLS:
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "0.75rem",
            alignItems: "center",
          }}
        >
          {/* Altitude Slider */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Altitude:</span>
              <span style={{ color: "#38bdf8", fontFamily: "var(--font-mono, monospace)", fontWeight: 700 }}>
                {altInput.toLocaleString()} ft
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="30000"
              step="500"
              value={altInput}
              onChange={(e) => setAltInput(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent-cyan, #38bdf8)", cursor: "pointer" }}
            />
          </div>

          {/* Ambient Temp Slider */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Ambient Temp:</span>
              <span style={{ color: "#f59e0b", fontFamily: "var(--font-mono, monospace)", fontWeight: 700 }}>
                {tempInput > 0 ? `+${tempInput}°C` : `${tempInput}°C`}
              </span>
            </div>
            <input
              type="range"
              min="-40"
              max="50"
              step="1"
              value={tempInput}
              onChange={(e) => setTempInput(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent-amber, #f59e0b)", cursor: "pointer" }}
            />
          </div>

          {/* Throttle Slider */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Throttle:</span>
              <span style={{ color: "#10b981", fontFamily: "var(--font-mono, monospace)", fontWeight: 700 }}>
                {throttleInput}%
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              step="1"
              value={throttleInput}
              onChange={(e) => setThrottleInput(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent-emerald, #10b981)", cursor: "pointer" }}
            />
          </div>
        </div>

        {/* Speed multiplier buttons + Apply button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Speed:</span>
            {[1.0, 2.0, 5.0, 10.0].map((s) => (
              <button
                key={s}
                onClick={() => handleSpeedQuickSet(s)}
                style={{
                  background: speed === s ? "rgba(245, 158, 11, 0.25)" : "rgba(255, 255, 255, 0.04)",
                  border: `1px solid ${speed === s ? "#f59e0b" : "rgba(255, 255, 255, 0.08)"}`,
                  color: speed === s ? "#f59e0b" : "#94a3b8",
                  padding: "0.2rem 0.45rem",
                  borderRadius: "4px",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {s}x
              </button>
            ))}
          </div>

          <button
            onClick={handleApplyEnv}
            disabled={!isConnected || isUpdating}
            style={{
              background: "var(--accent-cyan, #38bdf8)",
              color: "#070b14",
              border: "none",
              borderRadius: "5px",
              padding: "0.35rem 0.9rem",
              fontSize: "0.72rem",
              fontWeight: 800,
              cursor: isConnected ? "pointer" : "not-allowed",
              transition: "opacity 0.2s",
              opacity: isConnected ? 1 : 0.6,
            }}
          >
            {isUpdating ? "APPLYING..." : "UPDATE ENVIRONMENT"}
          </button>
        </div>
      </div>
    </div>
  );
}
