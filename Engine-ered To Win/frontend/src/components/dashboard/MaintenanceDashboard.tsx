"use client";

import React, { useState } from "react";
import { UnifiedTelemetryPayload } from "@/types/telemetry";
import { NavView } from "@/components/Sidebar";
import {
  Wrench,
  CheckCircle2,
  FileText,
  TrendingDown,
  TrendingUp,
  Sparkles,
  ClipboardList,
} from "lucide-react";

interface MaintenanceDashboardProps {
  payload: UnifiedTelemetryPayload;
  onNavigate: (view: NavView) => void;
}

export default function MaintenanceDashboard({
  payload,
  onNavigate,
}: MaintenanceDashboardProps) {
  const [selectedComponent, setSelectedComponent] = useState<string>("turbo");

  // Top Metrics
  const healthIndex = Math.round(payload.health_index ?? 96);
  const predictedRul = Math.round(payload.prognostics?.predicted_rul || 117);
  const operatingHours = 482.5;
  const cyclesCompleted = 218;
  const maintenanceStatus = "A-CHECK DUE IN 32.5 HRS";

  // Sensor extraction helpers
  const valCht = payload.sensors?.cht?.value ?? payload.cht_c ?? 118.4;
  const valEgt = payload.sensors?.egt?.value ?? payload.egt_c ?? 842.1;
  const valOilPress = payload.sensors?.oil_pressure?.value ?? payload.oil_pressure_bar ?? 64.2;
  const valOilTemp = payload.sensors?.oil_temperature?.value ?? payload.oil_temperature_c ?? 96.5;
  const valVib = payload.sensors?.vibration?.value ?? payload.vibration_g ?? 0.42;
  const valFuelFlow = payload.sensors?.fuel_flow?.value ?? payload.fuel_flow_lh ?? 24.3;

  // Maintenance Priority Items
  const priorityItems = [
    {
      id: "turbo",
      name: "Turbocharger Wastegate & Bearing",
      subsystem: "Air Induction / Forced Induction",
      riskLevel: "MEDIUM",
      riskColor: "var(--status-caution)",
      wearPct: 18,
      leadTime: "32.5 flight hrs",
      action: "Inspect wastegate shaft play, check seal coking & lube line torque",
      faultNature: "Actual Mechanical Degradation",
    },
    {
      id: "injector",
      name: "Fuel Injector Nozzle Bank B",
      subsystem: "Fuel Delivery / Injection",
      riskLevel: "LOW",
      riskColor: "var(--status-nominal)",
      wearPct: 12,
      leadTime: "75.0 flight hrs",
      action: "Perform ultrasonic bench flush, run fuel spray volume balance check",
      faultNature: "Possible Sensor / Nozzle Delta",
    },
    {
      id: "crank",
      name: "Main Crankshaft Journal Bearings",
      subsystem: "Rotary Mechanical",
      riskLevel: "LOW",
      riskColor: "var(--status-nominal)",
      wearPct: 8,
      leadTime: "120.0 flight hrs",
      action: "Oil spectrometry wear metal check (Fe, Cu, Pb ppm)",
      faultNature: "Normal Wear Trajectory",
    },
    {
      id: "oilpump",
      name: "High-Pressure Oil Pump & Relief Valve",
      subsystem: "Lubrication",
      riskLevel: "LOW",
      riskColor: "var(--status-nominal)",
      wearPct: 6,
      leadTime: "180.0 flight hrs",
      action: "Check relief spring tension and pressure regulator O-rings",
      faultNature: "Normal Operational State",
    },
  ];

  // Degradation Trends Data
  const degradationTrends = [
    {
      channel: "CHT Trend",
      baseline: "115.0 °C",
      current: `${valCht.toFixed(1)} °C`,
      slope: "+0.12 °C / 10 cyc",
      isElevated: true,
      subsystem: "Thermal Health",
    },
    {
      channel: "EGT Trend",
      baseline: "830.0 °C",
      current: `${valEgt.toFixed(1)} °C`,
      slope: "+0.25 °C / 10 cyc",
      isElevated: true,
      subsystem: "Combustion Efficiency",
    },
    {
      channel: "Oil Pressure",
      baseline: "65.0 psi",
      current: `${valOilPress.toFixed(1)} psi`,
      slope: "-0.08 psi / 10 cyc",
      isElevated: false,
      subsystem: "Hydrodynamic Lubrication",
    },
    {
      channel: "Oil Temp",
      baseline: "95.0 °C",
      current: `${valOilTemp.toFixed(1)} °C`,
      slope: "+0.15 °C / 10 cyc",
      isElevated: false,
      subsystem: "Heat Exchanger Loop",
    },
    {
      channel: "Vibration RMS",
      baseline: "0.38 g",
      current: `${valVib.toFixed(2)} g`,
      slope: "+0.004 g / 10 cyc",
      isElevated: false,
      subsystem: "Mechanical Rotational",
    },
    {
      channel: "Fuel Efficiency",
      baseline: "23.8 L/h",
      current: `${valFuelFlow.toFixed(1)} L/h`,
      slope: "+0.05 L/h / 10 cyc",
      isElevated: false,
      subsystem: "Specific Fuel Consumption",
    },
  ];

  // Historical Maintenance / Anomaly Log
  const faultHistory = [
    {
      timestamp: "2026-09-24 14:12 UTC",
      fault: "Exhaust Gas Temp Gradient Excursion",
      component: "Exhaust Header Cyl 3",
      nature: "Engine Physical",
      severity: "CAUTION",
      actionTaken: "Cleaned injector nozzle B3; re-torqued manifold clamp",
      signedOff: "Chief Tech R. Vance",
    },
    {
      timestamp: "2026-09-21 09:35 UTC",
      fault: "Dual CHT Sensor Bias Discrepancy",
      component: "Thermocouple Harness A",
      nature: "Sensor Harness",
      severity: "ADVISORY",
      actionTaken: "Cleaned grounding pin; bench tested resistance 108Ω",
      signedOff: "Avionics Tech M. Davis",
    },
    {
      timestamp: "2026-09-18 16:50 UTC",
      fault: "Oil Pressure Transducer Ripple",
      component: "Transducer OP-01",
      nature: "Sensor Harness",
      severity: "ADVISORY",
      actionTaken: "Replaced sensor copper sealing washer; re-calibrated offset",
      signedOff: "Chief Tech R. Vance",
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
        flex: 1,
        minHeight: 0,
        width: "100%",
        paddingBottom: "2.5rem",
      }}
    >
      {/* 1. TOP PREDICTIVE MAINTENANCE WORKSTATION HEADER */}
      <div
        className="card"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "1rem 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "12px",
              background: "var(--surface-2)",
              border: "2px solid var(--status-caution)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--status-caution)",
            }}
          >
            <Wrench size={22} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.2rem" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  color: "var(--status-caution)",
                  fontFamily: "var(--font-mono), monospace",
                  background: "var(--surface-2)",
                  border: "1px solid var(--status-caution)",
                  borderRadius: "4px",
                  padding: "0.15rem 0.5rem",
                }}
              >
                MAINTENANCE WORKSTATION
              </span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>
                PREDICTIVE ENGINE HEALTH &amp; TURNAROUND
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Engine S/N: <strong style={{ color: "var(--text)" }}>ROTAX-914-F4-8841</strong> • Maintenance Lead: <strong style={{ color: "var(--text)" }}>Ground Propulsion Team</strong>
            </div>
          </div>
        </div>

        {/* 4 Core Maintenance Counters */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ background: "var(--surface-2)", padding: "0.5rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "10px", color: "var(--text-faint)", textTransform: "uppercase" }}>Health Index</div>
            <div style={{ fontSize: "16px", fontWeight: 800, fontFamily: "var(--font-mono), monospace", color: "var(--text)" }}>
              {healthIndex} <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>/100</span>
            </div>
          </div>

          <div style={{ background: "var(--surface-2)", padding: "0.5rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "10px", color: "var(--text-faint)", textTransform: "uppercase" }}>Predicted RUL</div>
            <div style={{ fontSize: "16px", fontWeight: 800, fontFamily: "var(--font-mono), monospace", color: "var(--accent)" }}>
              {predictedRul} <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Cycles</span>
            </div>
          </div>

          <div style={{ background: "var(--surface-2)", padding: "0.5rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "10px", color: "var(--text-faint)", textTransform: "uppercase" }}>Operating Hours</div>
            <div style={{ fontSize: "16px", fontWeight: 800, fontFamily: "var(--font-mono), monospace", color: "var(--text)" }}>
              {operatingHours} <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>hrs</span>
            </div>
          </div>

          <div style={{ background: "var(--surface-2)", padding: "0.5rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "10px", color: "var(--text-faint)", textTransform: "uppercase" }}>Total Cycles</div>
            <div style={{ fontSize: "16px", fontWeight: 800, fontFamily: "var(--font-mono), monospace", color: "var(--text)" }}>
              {cyclesCompleted} <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Completed</span>
            </div>
          </div>

          <div style={{ background: "var(--surface-2)", padding: "0.5rem 0.85rem", borderRadius: "8px", border: "1px solid var(--status-caution)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: "10px", color: "var(--status-caution)", textTransform: "uppercase", fontWeight: 700 }}>Inspection Window</div>
            <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "var(--font-mono), monospace", color: "var(--status-caution)" }}>
              {maintenanceStatus}
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAINTENANCE PRIORITY QUEUE + COMPONENT HEALTH OVERVIEW */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "0.75rem" }}>
        {/* Priority Components Queue */}
        <div
          className="card"
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "0.85rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "0.45rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <ClipboardList size={14} style={{ color: "var(--status-caution)" }} />
              <span style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--text)" }}>
                Maintenance Priority Attention Queue
              </span>
            </div>
            <button
              onClick={() => onNavigate("maintenance")}
              style={{ background: "transparent", border: "none", color: "var(--accent)", fontSize: "11px", cursor: "pointer", padding: 0 }}
            >
              Open Full Checklist &rarr;
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {priorityItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedComponent(item.id)}
                style={{
                  background: selectedComponent === item.id ? "var(--surface-2)" : "transparent",
                  border: `1px solid ${selectedComponent === item.id ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: "8px",
                  padding: "0.65rem 0.85rem",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.75rem",
                  transition: "all 0.15s ease",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--text)" }}>
                      {item.name}
                    </span>
                    <span
                      style={{
                        fontSize: "9.5px",
                        fontWeight: 700,
                        color: item.riskColor,
                        fontFamily: "var(--font-mono), monospace",
                        background: "var(--surface-3)",
                        padding: "1px 5px",
                        borderRadius: "3px",
                      }}
                    >
                      {item.riskLevel} RISK
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                    {item.action}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-faint)", marginTop: "2px" }}>
                    Classification: <strong>{item.faultNature}</strong> • Due: {item.leadTime}
                  </div>
                </div>

                <div style={{ textAlign: "right", minWidth: "70px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-mono), monospace", color: item.riskColor }}>
                    {item.wearPct}% Wear
                  </div>
                  <div style={{ width: "65px", height: "4px", background: "var(--surface-3)", borderRadius: "2px", marginTop: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${item.wearPct * 2}%`, height: "100%", background: item.riskColor }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Maintenance Advisory & Sensor vs Engine Fault Diagnostic */}
        <div
          className="card"
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "0.85rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
          }}
        >
          <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.45rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Sparkles size={14} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--text)" }}>
                Diagnostic Isolation &amp; Pre-Flight Advisory
              </span>
            </div>
          </div>

          {/* Actual Engine Fault vs Sensor Discrepancy Card */}
          <div
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "0.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text)", textTransform: "uppercase" }}>
              Fault Attribution Confidence:
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px" }}>
              <span>Engine Mechanical Wear:</span>
              <strong style={{ color: "var(--status-caution)", fontFamily: "var(--font-mono), monospace" }}>78% Confidence</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px" }}>
              <span>Sensor Signal Drift / False Alarm:</span>
              <strong style={{ color: "var(--status-nominal)", fontFamily: "var(--font-mono), monospace" }}>22% Confidence</strong>
            </div>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "0.25rem 0 0 0", lineHeight: "1.4" }}>
              Cross-correlation between EGT rise and fuel flow increase confirms combustion thermal shift rather than sensor thermocouple wiring failure.
            </p>
          </div>

          {/* Recommended Action Checklist */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "11.5px" }}>
            <div style={{ fontWeight: 600, color: "var(--text)" }}>Next Turnaround Action Items:</div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)" }}>
              <CheckCircle2 size={13} style={{ color: "var(--status-nominal)" }} />
              <span>1. Run 30-second post-flight turbo spin-down friction check</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)" }}>
              <CheckCircle2 size={13} style={{ color: "var(--status-nominal)" }} />
              <span>2. Sample 100ml crankcase oil for laboratory spectrometry</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)" }}>
              <CheckCircle2 size={13} style={{ color: "var(--status-caution)" }} />
              <span>3. Validate cylinder head thermal paste on thermocouple #2</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DEGRADATION TRENDS MATRIX (6 Subsystems) */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}>
          <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Subsystem Degradation Trends &amp; Wear Trajectories
          </span>
          <button
            onClick={() => onNavigate("rul")}
            style={{ background: "transparent", border: "none", color: "var(--accent)", fontSize: "11px", cursor: "pointer" }}
          >
            RUL Prognostics Trajectory &rarr;
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.6rem" }}>
          {degradationTrends.map((deg, dIdx) => (
            <div
              key={dIdx}
              className="card"
              style={{
                background: "var(--surface-1)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "0.65rem 0.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text)" }}>
                  {deg.channel}
                </span>
                {deg.isElevated ? (
                  <TrendingUp size={13} style={{ color: "var(--status-caution)" }} />
                ) : (
                  <TrendingDown size={13} style={{ color: "var(--status-nominal)" }} />
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "10px", color: "var(--text-faint)" }}>Nom: {deg.baseline}</span>
                <span style={{ fontSize: "12.5px", fontWeight: 700, fontFamily: "var(--font-mono), monospace", color: deg.isElevated ? "var(--status-caution)" : "var(--text)" }}>
                  {deg.current}
                </span>
              </div>

              <div style={{ fontSize: "10px", fontFamily: "var(--font-mono), monospace", color: "var(--accent)" }}>
                Slope: {deg.slope}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. HISTORICAL MAINTENANCE & ANOMALY CHRONOLOGY */}
      <div
        className="card"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "0.85rem 1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "0.45rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <FileText size={14} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--text)" }}>
              Historical Anomaly Log &amp; Sign-off Records
            </span>
          </div>
          <span style={{ fontSize: "11px", color: "var(--text-faint)", fontFamily: "var(--font-mono), monospace" }}>
            3 Recent Entries
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px", textAlign: "left" }}>
            <thead>
              <tr style={{ color: "var(--text-faint)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "0.4rem 0.5rem" }}>Timestamp</th>
                <th style={{ padding: "0.4rem 0.5rem" }}>Detected Anomaly / Fault</th>
                <th style={{ padding: "0.4rem 0.5rem" }}>Affected System</th>
                <th style={{ padding: "0.4rem 0.5rem" }}>Nature</th>
                <th style={{ padding: "0.4rem 0.5rem" }}>Resolution Action</th>
                <th style={{ padding: "0.4rem 0.5rem" }}>Sign-off Tech</th>
              </tr>
            </thead>
            <tbody>
              {faultHistory.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.45rem 0.5rem", fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>{item.timestamp}</td>
                  <td style={{ padding: "0.45rem 0.5rem", fontWeight: 600, color: "var(--text)" }}>{item.fault}</td>
                  <td style={{ padding: "0.45rem 0.5rem", color: "var(--text-muted)" }}>{item.component}</td>
                  <td style={{ padding: "0.45rem 0.5rem" }}>
                    <span
                      style={{
                        fontSize: "9.5px",
                        fontFamily: "var(--font-mono), monospace",
                        padding: "1px 5px",
                        borderRadius: "3px",
                        background: "var(--surface-2)",
                        color: item.nature === "Engine Physical" ? "var(--status-caution)" : "var(--accent)",
                      }}
                    >
                      {item.nature}
                    </span>
                  </td>
                  <td style={{ padding: "0.45rem 0.5rem", color: "var(--text-muted)" }}>{item.actionTaken}</td>
                  <td style={{ padding: "0.45rem 0.5rem", fontFamily: "var(--font-mono), monospace", color: "var(--status-nominal)" }}>{item.signedOff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
