"use client";

import React from "react";
import { UnifiedTelemetryPayload } from "../types/telemetry";

interface MaintenanceViewProps {
  payload: UnifiedTelemetryPayload;
}

export default function MaintenanceView({ payload }: MaintenanceViewProps) {
  const riskLevel = payload.risk?.level || "LOW";
  const action = payload.risk?.action || "All engine systems and sensors are performing nominally. Continue planned cruise profile.";
  const guidance = payload.risk?.guidance;
  const health = Math.round(payload.health_index || 96);

  const getPriorityStyle = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return { color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", border: "#ef4444" };
      case "HIGH":
        return { color: "#f97316", bg: "rgba(249, 115, 22, 0.15)", border: "#f97316" };
      case "MEDIUM":
        return { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)", border: "#f59e0b" };
      case "LOW":
      default:
        return { color: "#10b981", bg: "rgba(16, 185, 129, 0.15)", border: "#10b981" };
    }
  };

  const prio = getPriorityStyle(riskLevel);

  const checklist = [
    { item: "Cylinder Head & Barrel Temperature Harness", status: payload.sensors?.cht?.status || "NORMAL", action: "Verify CHT thermocouple seating & continuity" },
    { item: "High-Pressure Fuel Injection Rail & Filter", status: payload.sensors?.fuel_flow?.status || "NORMAL", action: "Check fuel line pressure & ultrasonic injector spray" },
    { item: "Lubrication Sump & Oil Scavenge Circuit", status: payload.sensors?.oil_pressure?.status || "NORMAL", action: "Inspect magnetic drain plug & oil filter element" },
    { item: "Dynafocal Engine Mounts & Crankcase Balance", status: payload.sensors?.vibration?.status || "NORMAL", action: "Torque engine bed bolts & inspect rubber isolators" },
    { item: "Avionics Power Bus & Voltage Regulators", status: payload.sensors?.bus_voltage?.status || "NORMAL", action: "Check 28V alternator belt tension & ground straps" },
  ];

  return (
    <div className="gcs-view-container maintenance-view">
      {/* Standardized GCS View Header */}
      <div className="gcs-view-header">
        <div className="gcs-view-title-wrap">
          <h2 className="gcs-view-title">
            <span>🔧</span> PREDICTIVE MAINTENANCE &amp; ACTION PROTOCOL
          </h2>
          <span className="gcs-view-tagline">
            Condition-based maintenance (CBM), component wear life thresholds, and field action procedures
          </span>
        </div>
        <div className="gcs-view-actions">
          <span
            className="status-pill"
            style={{
              color: prio.color,
              backgroundColor: prio.bg,
              borderColor: prio.border,
              fontSize: "0.68rem",
              fontWeight: 800,
            }}
          >
            PRIORITY: {riskLevel}
          </span>
        </div>
      </div>

      {/* Balanced 2-Column Maintenance Grid */}
      <div
        className="gcs-grid-2col"
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
          gap: "0.95rem",
          alignItems: "stretch",
        }}
      >
        {/* Left Column: Immediate Operational Action Card & Protocols */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.95rem" }}>
          <div className="gcs-card maint-action-hero">
            <div className="gcs-card-header">
              <span className="gcs-card-title">
                <span>⚠️</span> CURRENT PILOT / OPERATOR DIRECTIVE
              </span>
              <span className="status-pill" style={{ fontSize: "0.6rem" }}>
                {riskLevel} RISK
              </span>
            </div>

            <div className="maint-action-body">
              <div className="action-large-readout">
                <span className="action-hero-text">{action}</span>
              </div>
              <p className="action-context" style={{ marginTop: "0.5rem" }}>
                {guidance ||
                  `Automated recommendation generated based on cross-correlated physical telemetry, remaining useful life estimates (${Math.round(
                    payload.prognostics?.predicted_rul || 117
                  )} cycles), and current health index (${health}/100).`}
              </p>
            </div>
          </div>

          <div className="gcs-card maint-protocols-card">
            <div className="gcs-card-header">
              <span className="gcs-card-title">
                <span>📋</span> PREVENTATIVE MAINTENANCE PROTOCOLS
              </span>
            </div>
            <div className="protocols-list" style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
              <div className="protocol-item">
                <span className="protocol-tag tag-thermal">THERMAL MITIGATION</span>
                <p className="protocol-desc">
                  If CHT exceeds 165°C or EGT exceeds 680°C, enrich mixture to rich-of-peak and reduce continuous throttle below 70% to prevent detonation.
                </p>
              </div>
              <div className="protocol-item">
                <span className="protocol-tag tag-hydraulic">LUBRICATION PROTECT</span>
                <p className="protocol-desc">
                  If oil pressure drops below 50 psi during high-G maneuvers, execute immediate level flight recovery and throttle back to cruise idle.
                </p>
              </div>
              <div className="protocol-item">
                <span className="protocol-tag tag-mechanical">VIBRATION DAMPENING</span>
                <p className="protocol-desc">
                  Sustained vibration above 2.0 g indicates prop imbalance or bearing brinelling; schedule ground dynamic balancing within 5 flight hours.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Subsystem Maintenance Inspection Checklist */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div className="gcs-card maint-checklist-card" style={{ height: "100%" }}>
            <div className="gcs-card-header">
              <span className="gcs-card-title">
                <span>🔍</span> SUBSYSTEM INSPECTION CHECKLIST
              </span>
              <span className="model-chip">5 CRITICAL NODES</span>
            </div>

            <div className="checklist-items-wrap" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {checklist.map((chk, i) => (
                <div key={i} className={`checklist-item status-${chk.status.toLowerCase()}`}>
                  <div className="chk-top-line">
                    <span className="chk-name">{chk.item}</span>
                    <span className={`chk-badge status-${chk.status.toLowerCase()}`}>
                      {chk.status}
                    </span>
                  </div>
                  <div className="chk-action-line">{chk.action}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
