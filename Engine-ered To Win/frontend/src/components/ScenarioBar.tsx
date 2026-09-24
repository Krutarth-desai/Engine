"use client";

import React from "react";

interface ScenarioBarProps {
  activeScenario: string;
  onSelectScenario: (scenario: string) => void;
}

export default function ScenarioBar({ activeScenario, onSelectScenario }: ScenarioBarProps) {
  const scenarios = [
    { id: "Normal", label: "Normal Cruise", desc: "Nominal 2450 RPM cruise baseline" },
    { id: "Overheating", label: "Overheating", desc: "Thermal stress: EGT/CHT ramp" },
    { id: "Oil_Pressure_Loss", label: "Oil Pressure Loss", desc: "Lubrication failure risk" },
    { id: "RPM_Drop", label: "Power Loss", desc: "Governor / fuel supply restriction" },
    { id: "High_Vibration", label: "High Vibration", desc: "Imbalance & bearing wear" },
    { id: "Sensor_Fault_CHT", label: "Sensor Fault (CHT)", desc: "Isolated thermocouple bias" },
    { id: "Engine_Failure_Multi", label: "Critical Failure", desc: "Correlated multi-sensor breakdown" },
  ];

  return (
    <div
      className="scenario-injector-bar"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "0.5rem",
      }}
    >
      <div className="scenario-label-wrap" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#f8fafc", letterSpacing: "0.5px" }}>
          ⚡ SCENARIO INJECTION:
        </span>
      </div>
      <div className="scenario-buttons-row" style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
        {scenarios.map((sc) => {
          const isActive = activeScenario === sc.id;
          return (
            <button
              key={sc.id}
              className={`gcs-btn gcs-btn-sm ${isActive ? "gcs-btn-primary" : "gcs-btn-ghost"}`}
              onClick={() => onSelectScenario(sc.id)}
              title={sc.desc}
            >
              {sc.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
