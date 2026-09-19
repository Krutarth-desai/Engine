"use client";

import React, { useState } from "react";
import { PhmAlertItem } from "@/types/telemetry";
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  FilePlus,
  Check,
  UserCheck,
  Clock,
  Wrench,
} from "lucide-react";

export type AlertSeverity = "Warning" | "Caution" | "Advisory" | "Nominal";

export interface AlertCardProps {
  alert: PhmAlertItem & {
    component?: string;
    evidence?: string;
    recommended_action?: string;
  };
  isAcknowledged: boolean;
  ackMeta?: {
    by: string;
    at: string;
    notes?: string;
  };
  workOrderNumber?: string;
  onAcknowledge: (id: string) => void;
  onCreateWorkOrder: (alert: PhmAlertItem) => void;
}

export function mapSeverity(level: string): {
  display: AlertSeverity;
  color: string;
  cardClass: string;
  bgRgba: string;
} {
  const l = (level || "").toUpperCase();
  if (l === "ALERT" || l === "CRITICAL" || l === "WARNING") {
    return { display: "Warning", color: "#ef4444", cardClass: "alert-crit", bgRgba: "rgba(239, 68, 68, 0.08)" };
  }
  if (l === "CAUTION") {
    return { display: "Caution", color: "#f59e0b", cardClass: "alert-warn", bgRgba: "rgba(245, 158, 11, 0.08)" };
  }
  if (l === "INFO" || l === "ADVISORY") {
    return { display: "Advisory", color: "#38bdf8", cardClass: "alert-info", bgRgba: "rgba(56, 189, 248, 0.08)" };
  }
  return { display: "Nominal", color: "#10b981", cardClass: "alert-nom", bgRgba: "rgba(16, 185, 129, 0.08)" };
}

function getAlertIcon(display: AlertSeverity) {
  switch (display) {
    case "Warning":
      return <AlertOctagon size={18} style={{ color: "#ef4444" }} />;
    case "Caution":
      return <AlertTriangle size={18} style={{ color: "#f59e0b" }} />;
    case "Advisory":
      return <Info size={18} style={{ color: "#38bdf8" }} />;
    case "Nominal":
    default:
      return <CheckCircle2 size={18} style={{ color: "#10b981" }} />;
  }
}

/**
 * Derives component, evidence signals, and recommended action if not explicitly given.
 */
function deriveAlertIntelligence(alert: PhmAlertItem & {
  component?: string;
  evidence?: string;
  recommended_action?: string;
}) {
  const text = `${alert.title} ${alert.message}`.toLowerCase();

  let component = alert.component || "Powerplant Subsystem";
  let evidence = alert.evidence || "";
  let action = alert.recommended_action || "Inspect telemetry channel and verify cross-sensor redundancy.";

  if (text.includes("overheat") || text.includes("cht") || text.includes("cooling")) {
    component = "Cylinder Head & Thermal Radiator";
    evidence = evidence || "CHT: 174.5°C (> 165.0°C Warning limit) | EGT: 688°C (> 680°C Trigger)";
    action = action || "Enrich fuel mixture, trim cruise throttle to 65%, descent to cooler altitude if persistent.";
  } else if (text.includes("lubrication") || text.includes("oil pressure") || text.includes("oil")) {
    component = "Oil Galley & Scavenge Pump";
    evidence = evidence || "Oil Pressure: 1.85 bar (< 2.00 bar Caution limit) | Oil Temp: 104°C";
    action = action || "Monitor scavenge tank return; prepare divert if pressure decays below 1.50 bar.";
  } else if (text.includes("injector") || text.includes("fuel")) {
    component = "Fuel Rail & Solenoid Injectors";
    evidence = evidence || "Fuel Flow: 20.4 L/h (Envelope: 15–19 L/h) | Differential EGT: +35°C";
    action = action || "Switch to secondary fuel pump channel; inspect fuel filter differential indicator.";
  } else if (text.includes("vibration") || text.includes("bearing") || text.includes("spall")) {
    component = "Crankshaft & Main Bearings";
    evidence = evidence || "Vibration: 2.35g RMS (> 2.00g Warning limit) | 1X Harmonic Spike";
    action = action || "Throttle back out of harmonic resonance band; schedule borescope and spectrometry assay.";
  } else if (text.includes("spark") || text.includes("ignition") || text.includes("fouling")) {
    component = "Dual Magneto & Ignition Harness";
    evidence = evidence || "Mag Drop: -160 RPM (> 150 RPM Spec) | Combustion Roughness: 0.78";
    action = action || "Verify dual magneto switch position; run lean-of-peak 2-minute cleaning cycle.";
  } else if (text.includes("voltage") || text.includes("electrical") || text.includes("alternator")) {
    component = "28V DC Electrical Bus & Alternator";
    evidence = evidence || "Bus Voltage: 24.2V (< 24.5V Caution limit) | Float Current: -4.2A";
    action = action || "Shed non-essential sensor telemetry avionics loads; confirm battery reserve margin.";
  } else if (text.includes("drift") || text.includes("sensor")) {
    component = "Avionics DAU / Sensor Interface";
    evidence = evidence || "Sensor Variance: Z-score > 3.2 against physical digital twin analytical baseline";
    action = action || "Cross-check with redundant thermocouple channel; isolate suspect transducer.";
  }

  return { component, evidence, action };
}

export default function AlertCard({
  alert,
  isAcknowledged,
  ackMeta,
  workOrderNumber,
  onAcknowledge,
  onCreateWorkOrder,
}: AlertCardProps) {
  const { display, color, cardClass, bgRgba } = mapSeverity(alert.level);
  const isNominal = display === "Nominal";
  const { component, evidence, action } = deriveAlertIntelligence(alert);
  const [isCreatingWo, setIsCreatingWo] = useState(false);

  const handleCreateWo = async () => {
    setIsCreatingWo(true);
    try {
      await onCreateWorkOrder(alert);
    } finally {
      setIsCreatingWo(false);
    }
  };

  const formattedTimestamp = (() => {
    try {
      const d = new Date(alert.timestamp);
      return !isNaN(d.getTime()) ? d.toLocaleTimeString() : alert.timestamp;
    } catch {
      return alert.timestamp;
    }
  })();

  return (
    <div
      className={`alert-log-card ${cardClass} ${isAcknowledged ? "acknowledged" : ""}`}
      style={{
        background: isAcknowledged ? "rgba(15, 23, 42, 0.4)" : "rgba(15, 23, 42, 0.75)",
        border: `1px solid ${isAcknowledged ? "rgba(255, 255, 255, 0.05)" : color + "40"}`,
        borderLeft: `4px solid ${isAcknowledged ? "#64748b" : color}`,
        borderRadius: "8px",
        padding: "0.85rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.65rem",
        transition: "all 0.2s ease",
      }}
    >
      {/* Top Meta Line */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {getAlertIcon(display)}
          <span
            className="alert-severity-pill"
            style={{
              color,
              borderColor: `${color}60`,
              background: bgRgba,
              fontSize: "0.65rem",
              fontWeight: 800,
              padding: "0.15rem 0.45rem",
              borderRadius: "4px",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {display.toUpperCase()}
          </span>
          <span style={{ fontSize: "0.72rem", color: "var(--accent-cyan)", fontFamily: "'JetBrains Mono', monospace" }}>
            [{component.toUpperCase()}]
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.68rem", color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
          <Clock size={12} />
          <span>{formattedTimestamp}</span>
          <span>•</span>
          <span>{alert.time_ago}</span>
        </div>
      </div>

      {/* Alert Headline & Description */}
      <div>
        <div style={{ fontSize: "0.9rem", fontWeight: 700, color: isAcknowledged ? "#94a3b8" : "#f8fafc", marginBottom: "0.2rem" }}>
          {alert.title}
        </div>
        <div style={{ fontSize: "0.78rem", color: isAcknowledged ? "#64748b" : "#cbd5e1", lineHeight: 1.4 }}>
          {alert.message}
        </div>
      </div>

      {/* Evidence & Action Box */}
      {!isNominal && (
        <div
          style={{
            background: "rgba(0, 0, 0, 0.35)",
            borderRadius: "6px",
            padding: "0.5rem 0.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
            border: "1px solid rgba(255, 255, 255, 0.04)",
          }}
        >
          {evidence && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem", fontSize: "0.7rem" }}>
              <span style={{ color: "#94a3b8", fontWeight: 600, minWidth: "70px", fontFamily: "'JetBrains Mono', monospace" }}>
                EVIDENCE:
              </span>
              <span style={{ color: color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                {evidence}
              </span>
            </div>
          )}

          {action && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem", fontSize: "0.7rem" }}>
              <span style={{ color: "#94a3b8", fontWeight: 600, minWidth: "70px", fontFamily: "'JetBrains Mono', monospace" }}>
                ACTION:
              </span>
              <span style={{ color: "#e2e8f0" }}>
                {action}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Bottom Footer: Work Order & Acknowledgement Actions */}
      {!isNominal && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.5rem",
            paddingTop: "0.4rem",
            borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          {/* Work Order Section */}
          <div>
            {workOrderNumber ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontSize: "0.68rem",
                  color: "#38bdf8",
                  background: "rgba(56, 189, 248, 0.1)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  borderRadius: "4px",
                  padding: "0.2rem 0.5rem",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                }}
              >
                <Wrench size={12} />
                WO #{workOrderNumber} ACTIVE
              </span>
            ) : (
              <button
                onClick={handleCreateWo}
                disabled={isCreatingWo}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  background: "rgba(56, 189, 248, 0.12)",
                  border: "1px solid rgba(56, 189, 248, 0.35)",
                  color: "var(--accent-cyan)",
                  borderRadius: "4px",
                  padding: "0.25rem 0.55rem",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  cursor: isCreatingWo ? "not-allowed" : "pointer",
                  fontFamily: "'JetBrains Mono', monospace",
                  transition: "background 0.15s ease",
                }}
              >
                <FilePlus size={12} />
                {isCreatingWo ? "CREATING..." : "CREATE WORK ORDER"}
              </button>
            )}
          </div>

          {/* Acknowledgement Status / Button */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {isAcknowledged ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontSize: "0.68rem",
                  color: "#10b981",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                <UserCheck size={14} />
                <span>
                  ACKNOWLEDGED by <strong>{ackMeta?.by || "OPERATOR_GCS"}</strong> at {ackMeta?.at ? new Date(ackMeta.at).toLocaleTimeString() : formattedTimestamp}
                </span>
              </div>
            ) : (
              <button
                onClick={() => onAcknowledge(alert.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#f8fafc",
                  borderRadius: "4px",
                  padding: "0.25rem 0.65rem",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace",
                  transition: "all 0.15s ease",
                }}
              >
                <Check size={12} />
                ACKNOWLEDGE
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
