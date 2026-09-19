"use client";

import React from "react";
import { TelemetryData } from "@/types/telemetry";
import { getStatusColor } from "@/lib/limits";
import { AlertTriangle, CheckCircle2, AlertOctagon } from "lucide-react";

interface DiagnosisAdvisoryProps {
  telemetry: TelemetryData | null;
}

export default function DiagnosisAdvisory({ telemetry }: DiagnosisAdvisoryProps) {
  const faultLabel = telemetry?.fault_label || "Normal";
  const cht = telemetry?.cht_c ?? 142.0;
  const egt = telemetry?.egt_c ?? 615.0;
  const oilP = telemetry?.oil_pressure_bar ?? 4.69;
  const oilT = telemetry?.oil_temperature_c ?? 92.0;
  const fuel = telemetry?.fuel_flow_lh ?? 17.6;
  const vib = telemetry?.vibration_g ?? 1.42;

  let title = "Propulsion Health: Nominal";
  let desc =
    "All thermal, combustion, and lubrication parameters are operating within baseline tolerances. Digital Twin physics residuals are < 2.5%.";
  let action = "RECOMMENDATION: Continue planned mission profile. No maintenance required.";
  let badgeText = "PHM AI: OPTIMAL";
  let severity: "NORMAL" | "CAUTION" | "ALERT" = "NORMAL";
  let statPriority = "ROUTINE";
  let statResidual = "< 2.1% RMS";

  if (faultLabel === "Overheating") {
    severity = "ALERT";
    title = "Alert: Engine Overheating Trend Detected";
    desc = `CHT reached ${cht.toFixed(1)}°C and Oil Temp reached ${oilT.toFixed(1)}°C. Physics residual exceeds +35°C thermal model boundary.`;
    action =
      "ACTION: Reduce cruise throttle to 55%. Plan altitude descent for enhanced ram-air cooling. Inspect radiator fins post-flight.";
    badgeText = "PHM AI: CRITICAL ALERT";
    statPriority = "URGENT (P1)";
    statResidual = "+38.4°C CHT DIV";
  } else if (faultLabel === "Injector_Degradation") {
    severity = "CAUTION";
    title = "Warning: Fuel Injector Delivery Degradation";
    desc = `Fuel flow elevated (${fuel.toFixed(1)} L/h) with abnormal EGT (${egt.toFixed(1)}°C) and RPM fluctuations. Flow coefficient dropped 18%.`;
    action =
      "ACTION: Monitor fuel consumption vs endurance margin. Schedule injector ultrasonic cleaning at next turnaround.";
    badgeText = "PHM AI: DEGRADED";
    statPriority = "ACTION REQ";
    statResidual = "+4.6 L/H BIAS";
  } else if (faultLabel === "Lubrication" || faultLabel === "Oil_Pressure_Loss") {
    severity = "ALERT";
    title = "Emergency: Oil Galley Pressure Collapse";
    desc = `Oil pressure dropped to ${oilP.toFixed(2)} bar with oil temperature elevating to ${oilT.toFixed(1)}°C. Hydrodynamic bearing film thinning detected.`;
    action =
      "ACTION: Retard throttle immediately. Declare operational pan-pan. Identify nearest airfield for precautionary recovery.";
    badgeText = "PHM AI: SYSTEM CRITICAL";
    statPriority = "EMERGENCY";
    statResidual = "-2.1 BAR HYD DIV";
  } else if (faultLabel === "Vibration_Fault" || faultLabel === "High_Vibration") {
    severity = "ALERT";
    title = "Alert: Crankcase Harmonic Imbalance";
    desc = `Vibration level elevated to ${vib.toFixed(2)} g RMS. Rotational frequency harmonics indicate propeller blade imbalance or bearing race pitting.`;
    action =
      "ACTION: Avoid 2350-2450 RPM resonant band. Log peak G excursion for airframe structural inspection.";
    badgeText = "PHM AI: VIBRATION SPIKE";
    statPriority = "RESTRICTED";
    statResidual = "+1.42 g RMS BIAS";
  } else if (faultLabel === "Sensor_Drift") {
    severity = "CAUTION";
    title = "Advisory: CHT Sensor Calibration Drift";
    desc = `Cylinder head temperature reads ${cht.toFixed(1)}°C with zero corresponding change in EGT (${egt.toFixed(1)}°C) or Oil Temp (${oilT.toFixed(1)}°C). Cross-sensor model confirms engine is healthy.`;
    action =
      "ACTION: Continue planned flight profile. Tag CHT channel #1 thermocouple harness for recalibration upon landing.";
    badgeText = "PHM AI: SENSOR HARNESS";
    statPriority = "DEFERRED";
    statResidual = "CROSS-PRED MISMATCH";
  } else if (faultLabel === "Misfire") {
    severity = "ALERT";
    title = "Alert: Cylinder #1 Intermittent Misfire";
    desc = `Combustion chamber pressure drop with EGT (${egt.toFixed(1)}°C) and rotational jerk. Unburned fuel mixture passing to exhaust manifold.`;
    action =
      "ACTION: Switch dual ignition circuit to alternate magneto. Monitor exhaust temperature stability.";
    badgeText = "PHM AI: IGNITION LOSS";
    statPriority = "URGENT";
    statResidual = "COMBUSTION ROUGHNESS";
  } else if (faultLabel === "Sensor_Fault_Temp") {
    severity = "CAUTION";
    title = "Sensor Isolation: Isolated Thermocouple Fault";
    desc = `CHT sensor spike (${cht.toFixed(1)}°C) is decoupled from all hydrodynamic and combustion parameters. Engine propulsion core is operating at 100% nominal.`;
    action =
      "ACTION: Disregard false cockpit temperature alarm. Engine is healthy. Log sensor replacement ticket.";
    badgeText = "PHM AI: FALSE POSITIVE";
    statPriority = "ROUTINE";
    statResidual = "ISOLATED SENSOR ERROR";
  } else if (faultLabel === "Engine_Failure_Multi") {
    severity = "ALERT";
    title = "Critical Emergency: Multi-System Engine Failure";
    desc = `Correlated multi-sensor breakdown across CHT (${cht.toFixed(1)}°C), EGT (${egt.toFixed(1)}°C), and Oil Pressure (${oilP.toFixed(2)} bar). Complete loss of operational margin.`;
    action =
      "DIRECTIVE: Execute emergency descent profile and divert to primary recovery site immediately.";
    badgeText = "PHM AI: TOTAL FAILURE";
    statPriority = "CRITICAL (E1)";
    statResidual = "SYSTEM-LEVEL COLLAPSE";
  }

  const statusColor = getStatusColor(severity);

  const getSeverityIcon = () => {
    switch (severity) {
      case "ALERT":
        return <AlertOctagon className="w-5 h-5 text-rose-500 flex-shrink-0" />;
      case "CAUTION":
        return <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />;
      case "NORMAL":
      default:
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />;
    }
  };

  return (
    <div className={`advisory-box ${severity.toLowerCase()}`}>
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          {getSeverityIcon()}
          <span className="advisory-title font-bold text-sm tracking-wide text-white">
            {title}
          </span>
        </div>
        <span
          className="px-2.5 py-0.5 rounded text-xs font-mono font-bold"
          style={{
            color: statusColor,
            backgroundColor: `${statusColor}20`,
            border: `1px solid ${statusColor}60`,
          }}
        >
          {badgeText}
        </span>
      </div>

      <p className="advisory-desc text-slate-300 text-xs leading-relaxed mb-3">
        {desc}
      </p>

      <div className="advisory-actions-box bg-black/40 border border-white/5 rounded p-2.5 mb-3">
        <span className="text-cyan-400 font-mono text-xs font-semibold">
          {action}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="bg-slate-900/60 p-2 rounded border border-white/5 flex justify-between">
          <span className="text-slate-400">PRIORITY:</span>
          <span style={{ color: statusColor }} className="font-bold">
            {statPriority}
          </span>
        </div>
        <div className="bg-slate-900/60 p-2 rounded border border-white/5 flex justify-between">
          <span className="text-slate-400">RESIDUAL:</span>
          <span className="text-cyan-400 font-bold">{statResidual}</span>
        </div>
      </div>
    </div>
  );
}
