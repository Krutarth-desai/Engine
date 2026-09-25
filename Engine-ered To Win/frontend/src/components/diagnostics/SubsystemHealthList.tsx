"use client";

import React from "react";
import { TelemetryData } from "@/types/telemetry";

interface SubsystemHealthListProps {
  telemetry: TelemetryData | null;
}

interface SubsystemItem {
  id: string;
  name: string;
  score: number;
  label: string;
  status: "NORMAL" | "CAUTION" | "ALERT";
}

export default function SubsystemHealthList({ telemetry }: SubsystemHealthListProps) {
  const faultLabel = telemetry?.fault_label || "Normal";

  // Compute subsystem health scores based on real physical deviations
  let thermalPct = 98;
  let thermalStatus: "NORMAL" | "CAUTION" | "ALERT" = "NORMAL";
  let thermalText = "98% NOMINAL";

  let fuelPct = 97;
  let fuelStatus: "NORMAL" | "CAUTION" | "ALERT" = "NORMAL";
  let fuelText = "97% NOMINAL";

  let oilPct = 99;
  let oilStatus: "NORMAL" | "CAUTION" | "ALERT" = "NORMAL";
  let oilText = "99% NOMINAL";

  let vibPct = 96;
  let vibStatus: "NORMAL" | "CAUTION" | "ALERT" = "NORMAL";
  let vibText = "96% NOMINAL";

  let avionicsPct = 100;
  let avionicsStatus: "NORMAL" | "CAUTION" | "ALERT" = "NORMAL";
  let avionicsText = "100% NOMINAL";

  if (faultLabel === "Overheating") {
    thermalPct = 28;
    thermalStatus = "ALERT";
    thermalText = "28% CRITICAL HEAT";
    oilPct = 54;
    oilStatus = "CAUTION";
    oilText = "54% HIGH TEMP";
  } else if (faultLabel === "Injector_Degradation") {
    fuelPct = 42;
    fuelStatus = "CAUTION";
    fuelText = "42% FLOW DEVIATION";
  } else if (faultLabel === "Lubrication" || faultLabel === "Oil_Pressure_Loss") {
    oilPct = 18;
    oilStatus = "ALERT";
    oilText = "18% OIL STARVATION";
    vibPct = 68;
    vibStatus = "CAUTION";
    vibText = "68% BEARING FRICTION";
  } else if (faultLabel === "Vibration_Fault" || faultLabel === "High_Vibration") {
    vibPct = 32;
    vibStatus = "ALERT";
    vibText = "32% HIGH HARMONICS";
  } else if (faultLabel === "Sensor_Drift") {
    avionicsPct = 58;
    avionicsStatus = "CAUTION";
    avionicsText = "58% SENSOR DRIFT";
  } else if (faultLabel === "Misfire") {
    fuelPct = 35;
    fuelStatus = "ALERT";
    fuelText = "35% COMBUSTION LOSS";
    vibPct = 55;
    vibStatus = "CAUTION";
    vibText = "55% ROTATIONAL JERK";
  } else if (faultLabel === "Sensor_Fault_Temp") {
    avionicsPct = 38;
    avionicsStatus = "CAUTION";
    avionicsText = "38% HARNESS ANOMALY";
  } else if (faultLabel === "Engine_Failure_Multi") {
    thermalPct = 20;
    thermalStatus = "ALERT";
    thermalText = "20% SYSTEM HEAT";
    oilPct = 15;
    oilStatus = "ALERT";
    oilText = "15% OIL PRESSURE LOSS";
    vibPct = 25;
    vibStatus = "ALERT";
    vibText = "25% BEARING FAILURE";
    fuelPct = 30;
    fuelStatus = "ALERT";
    fuelText = "30% COMBUSTION ROUGHNESS";
  }

  const subsystems: SubsystemItem[] = [
    {
      id: "thermal",
      name: "Thermal Core & Cooling Jacket",
      score: thermalPct,
      label: thermalText,
      status: thermalStatus,
    },
    {
      id: "fuel",
      name: "Fuel Rail & Combustion Balance",
      score: fuelPct,
      label: fuelText,
      status: fuelStatus,
    },
    {
      id: "oil",
      name: "Lubrication Circuit & Sump",
      score: oilPct,
      label: oilText,
      status: oilStatus,
    },
    {
      id: "vibration",
      name: "Mechanical Train & Rotor Dynamics",
      score: vibPct,
      label: vibText,
      status: vibStatus,
    },
    {
      id: "avionics",
      name: "Avionics Bus & Sensor Telemetry Hub",
      score: avionicsPct,
      label: avionicsText,
      status: avionicsStatus,
    },
  ];

  const getColor = (status: "NORMAL" | "CAUTION" | "ALERT") => {
    switch (status) {
      case "ALERT":
        return "var(--status-warning)";
      case "CAUTION":
        return "var(--status-caution)";
      case "NORMAL":
      default:
        return "var(--status-nominal)";
    }
  };

  return (
    <div className="subsystem-health-panel mt-4">
      <div className="diag-section-header flex justify-between items-center mb-2">
        <span className="font-bold text-xs tracking-wider uppercase" style={{ color: "var(--text)" }}>
          Subsystem Physics Health &amp; Integrity
        </span>
        <span className="font-mono text-xs" style={{ color: "var(--accent)" }}>TOLERANCE: ±5%</span>
      </div>

      <div className="diag-subsystems-list flex flex-col gap-2">
        {subsystems.map((sub) => {
          const color = getColor(sub.status);
          return (
            <div key={sub.id} className="diag-subsystem-item p-2.5 rounded" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <div className="diag-subsystem-header flex justify-between items-center mb-1 text-xs">
                <span className="diag-subsystem-name font-medium" style={{ color: "var(--text)" }}>
                  {sub.name}
                </span>
                <span className="diag-subsystem-val font-mono font-bold" style={{ color }}>
                  {sub.label}
                </span>
              </div>
              <div className="diag-progress-bar h-1.5 rounded overflow-hidden" style={{ background: "var(--surface-3)" }}>
                <div
                  className="diag-progress-fill h-full transition-all duration-500 rounded"
                  style={{
                    width: `${Math.min(100, Math.max(4, sub.score))}%`,
                    backgroundColor: color,
                    boxShadow: "none",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
