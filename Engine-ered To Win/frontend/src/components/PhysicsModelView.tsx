"use client";

import React, { useState } from "react";
import { UnifiedTelemetryPayload } from "../types/telemetry";
import PageLayout from "./common/PageLayout";
import SubsystemHealthList from "./diagnostics/SubsystemHealthList";
import { NavView } from "./Sidebar";
import {
  Atom,
  Activity,
  Flame,
  Zap,
  Info,
  Sliders,
  Cpu,
} from "lucide-react";

interface PhysicsModelViewProps {
  payload: UnifiedTelemetryPayload;
  onNavigate?: (view: NavView) => void;
}

export default function PhysicsModelView({ payload, onNavigate }: PhysicsModelViewProps) {
  const [showModelDetails, setShowModelDetails] = useState(false);

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
    status: payload.risk?.anomaly ?? "Normal",
    severity: payload.risk?.level ?? "LOW",
    fault: payload.fault_label ?? "Nominal",
    evidence: payload.risk?.action ?? "All parameters within standard cruise envelope",
    treatment: payload.risk?.action ?? "Continue standard cruise",
    prevention: "Regular line inspection of wiring harness and sensors",
    sensor_diagnosis: payload.sensor_diagnosis,
  };

  const isNominal = (payload.fault_label || "Normal") === "Normal";

  return (
    <PageLayout
      title="Propulsion Physics Model & Subsystem Integrity"
      subtitle="First-principles thermodynamic coupling, combustion stoichiometry, hydrodynamic lubrication boundaries, and subsystem physical integrity"
      icon={<Atom size={18} />}
      tags={
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span
            className="nav-tag"
            style={{
              color: isNominal ? "var(--status-nominal)" : "var(--status-warning)",
              borderColor: "var(--border)",
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            STATUS: {isNominal ? "PHYSICS NOMINAL" : (payload.fault_label || "DEVIATION").toUpperCase()}
          </span>
          <span
            className="nav-tag"
            style={{
              color: "var(--accent)",
              borderColor: "var(--border)",
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            TWIN RESIDUAL: &lt; 2.5%
          </span>
          <span
            className="nav-tag"
            style={{
              color: "var(--text-muted)",
              borderColor: "var(--border)",
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            AEROTWIN-4T-1352
          </span>
        </div>
      }
      actions={
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          {onNavigate && (
            <button
              className="window-pill"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.25rem 0.6rem",
                borderRadius: "5px",
                background: "var(--surface-2)",
                border: "1px solid var(--status-nominal)",
                color: "var(--status-nominal)",
                fontSize: "0.68rem",
                fontFamily: "var(--font-mono), monospace",
                fontWeight: 700,
                cursor: "pointer",
              }}
              onClick={() => onNavigate("dashboard")}
              title="Open the Propulsion Engineer Dashboard with Digital Twin & FFT Spectrum"
            >
              <Cpu size={12} />
              <span>PROPULSION DASHBOARD &rarr;</span>
            </button>
          )}
          <button
            className="window-pill"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.25rem 0.6rem",
              borderRadius: "5px",
              background: showModelDetails ? "var(--surface-2)" : "var(--border)",
              border: "1px solid var(--border)",
              color: showModelDetails ? "var(--accent)" : "var(--text)",
              fontSize: "0.68rem",
              fontFamily: "var(--font-mono), monospace",
              fontWeight: 700,
              cursor: "pointer",
            }}
            onClick={() => setShowModelDetails(!showModelDetails)}
            title="Toggle physics engine configuration details"
          >
            <Info size={12} />
            <span>MODEL SPECS</span>
          </button>
        </div>
      }
    >
      {/* Optional Top Explanatory Banner */}
      {showModelDetails && (
        <div
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-strong)",
            borderRadius: "8px",
            padding: "0.75rem 1rem",
            fontSize: "0.72rem",
            color: "var(--text-muted)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.75rem",
          }}
        >
          <div>
            <strong style={{ color: "var(--accent)" }}>AeroTwin Closed-Loop Physics Engine:</strong> Computes real-time analytical state estimators across thermodynamic heat dissipation, Reynolds lubrication wedge dynamics, and gas combustion stoichiometry calibrated against the 1,352 cc 4-stroke boxer powertrain.
          </div>
          <button
            onClick={() => setShowModelDetails(false)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              marginLeft: "1rem",
              fontSize: "14px",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Physics Model Split Grid */}
      <div
        className="physics-model-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
          gap: "1.25rem",
          alignItems: "start",
        }}
      >
        {/* Left Column: Subsystem Physics Health & Integrity + Physical Regime Commentary */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* 1. Subsystem Physics Health & Integrity Section */}
          <div
            className="panel"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "1rem 1.15rem",
            }}
          >
            <div className="panel-header" style={{ marginBottom: "0.6rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border)" }}>
              <div className="panel-title flex items-center gap-2">
                <Activity className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <span style={{ fontWeight: 800, fontSize: "0.85rem", letterSpacing: "0.5px" }}>
                  SUBSYSTEM PHYSICS HEALTH &amp; INTEGRITY
                </span>
              </div>
              <span className="overview-badge font-mono" style={{ fontSize: "0.65rem" }}>
                PHYSICAL TOLERANCE: ±5%
              </span>
            </div>

            {/* Subsystem Health Progress Bars & Status Badges */}
            <SubsystemHealthList telemetry={flatTelemetry} />
          </div>

          {/* 2. Physical Regime Commentary */}
          <div
            className="panel analytical-insights-card"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "1rem 1.15rem",
            }}
          >
            <div className="panel-header" style={{ marginBottom: "0.6rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border)" }}>
              <div className="panel-title flex items-center gap-2">
                <Sliders className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <span style={{ fontWeight: 800, fontSize: "0.85rem", letterSpacing: "0.5px" }}>
                  PHYSICAL REGIME COMMENTARY
                </span>
              </div>
              <span className="font-mono text-xs" style={{ color: "var(--accent)" }}>
                EMPIRICAL EQUATIONS
              </span>
            </div>

            <div className="insights-body text-xs leading-relaxed space-y-2.5 text-slate-300">
              <div
                style={{
                  background: "var(--surface-2)",
                  padding: "0.6rem 0.8rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.72rem", marginBottom: "0.2rem" }}>
                  • Thermodynamic Coupling (CHT vs RPM):
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>
                  Cylinder Head Temperature (CHT) couples directly to RPM power output with a characteristic ~2.4 s thermal inertia phase lag. Thermal dissipation efficiency remains linear across nominal cruise envelopes.
                </div>
              </div>

              <div
                style={{
                  background: "var(--surface-2)",
                  padding: "0.6rem 0.8rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ color: "var(--status-caution)", fontWeight: 700, fontSize: "0.72rem", marginBottom: "0.2rem" }}>
                  • Combustion Stoichiometry (EGT vs Fuel Flow):
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>
                  EGT vs Fuel Flow gradient identifies peak exhaust gas temperature and lean-of-peak vs rich-of-peak operating regimes. Slope divergence greater than +15 °C/(L/h) indicates lean misfire risk.
                </div>
              </div>

              <div
                style={{
                  background: "var(--surface-2)",
                  padding: "0.6rem 0.8rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ color: "var(--status-nominal)", fontWeight: 700, fontSize: "0.72rem", marginBottom: "0.2rem" }}>
                  • Viscous Scavenge Boundary (Oil Pressure vs Temp):
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>
                  Oil pressure inversely correlates with oil temperature. Hydrodynamic journal bearing wedge integrity requires slopes flatter than -0.015 psi/°C for stable multigrade synthetic lubricant film maintenance.
                </div>
              </div>

              <div
                style={{
                  background: "var(--surface-2)",
                  padding: "0.6rem 0.8rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ color: "var(--status-warning)", fontWeight: 700, fontSize: "0.72rem", marginBottom: "0.2rem" }}>
                  • Rotational Harmonics (Vibration RMS vs RPM):
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>
                  Baseline vibration RMS remains below 1.5 g at cruise RPM. Excursions above 2.0 g trigger dynamic balancing advisories and isolate crankshaft dynamic balance and mount integrity.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Physics Domain Attribution Guide & Engine Physical Specifications */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* 1. Physics Domain Attribution Guide */}
          <div
            className="panel"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "1rem 1.15rem",
            }}
          >
            <div className="panel-header" style={{ marginBottom: "0.6rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border)" }}>
              <div className="panel-title flex items-center gap-2">
                <Flame className="w-4 h-4" style={{ color: "var(--status-warning)" }} />
                <span style={{ fontWeight: 800, fontSize: "0.85rem", letterSpacing: "0.5px" }}>
                  PHYSICS DOMAIN ATTRIBUTION GUIDE
                </span>
              </div>
              <span className="font-mono text-xs" style={{ color: "var(--status-nominal)" }}>
                ROOT MECHANISMS
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.7rem" }}>
              <div
                style={{
                  background: "var(--surface-2)",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ color: "var(--status-warning)", fontWeight: 700, fontFamily: "var(--font-mono), monospace", marginBottom: "0.15rem" }}>
                  ↑ EGT / CHT (Thermal Domain):
                </div>
                <div style={{ color: "var(--text-muted)", lineHeight: 1.4 }}>
                  Excessive combustion flame temperatures and cylinder head saturation induce valve guide micro-cracking, seat degradation, and cylinder barrel thermal fatigue.
                </div>
              </div>

              <div
                style={{
                  background: "var(--surface-2)",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ color: "var(--accent)", fontWeight: 700, fontFamily: "var(--font-mono), monospace", marginBottom: "0.15rem" }}>
                  ↓ Oil Pressure (Lubrication Domain):
                </div>
                <div style={{ color: "var(--text-muted)", lineHeight: 1.4 }}>
                  Loss of hydrodynamic oil wedge thickness in crankshaft journal bearings; primary failure precursor for scavenge pump cavitation, line rupture, or thermal viscosity thinning.
                </div>
              </div>

              <div
                style={{
                  background: "var(--surface-2)",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ color: "var(--status-caution)", fontWeight: 700, fontFamily: "var(--font-mono), monospace", marginBottom: "0.15rem" }}>
                  ↑ Vibration RMS (Mechanical Rotor Domain):
                </div>
                <div style={{ color: "var(--text-muted)", lineHeight: 1.4 }}>
                  Detects high-frequency mechanical shock, shaft unbalance, dynamic propeller governor hunting, and bearing race spalling before catastrophic fatigue propagation.
                </div>
              </div>

              <div
                style={{
                  background: "var(--surface-2)",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ color: "var(--status-nominal)", fontWeight: 700, fontFamily: "var(--font-mono), monospace", marginBottom: "0.15rem" }}>
                  Stoichiometry (Fuel Flow &amp; Injection Timing):
                </div>
                <div style={{ color: "var(--text-muted)", lineHeight: 1.4 }}>
                  Monitors mass fuel flow and closed-loop ECU injection advance timing curves to ensure detonation-free peak combustion efficiency and balanced cylinder work output.
                </div>
              </div>
            </div>
          </div>

          {/* 2. AeroTwin Engine Physical Parameters & Constants Card */}
          <div
            className="panel"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "1rem 1.15rem",
            }}
          >
            <div className="panel-header" style={{ marginBottom: "0.6rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border)" }}>
              <div className="panel-title flex items-center gap-2">
                <Zap className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <span style={{ fontWeight: 800, fontSize: "0.85rem", letterSpacing: "0.5px" }}>
                  AEROTWIN ENGINE PHYSICAL SPECIFICATIONS
                </span>
              </div>
              <span className="overview-badge font-mono" style={{ fontSize: "0.65rem" }}>
                BENCH CALIBRATED
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.5rem",
                fontFamily: "var(--font-mono), monospace",
                fontSize: "0.68rem",
              }}
            >
              <div style={{ background: "var(--surface-2)", padding: "0.5rem 0.65rem", borderRadius: "5px", border: "1px solid var(--border)" }}>
                <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.6rem" }}>ARCHITECTURE</span>
                <strong style={{ color: "var(--text)" }}>4-CYLINDER BOXER</strong>
              </div>

              <div style={{ background: "var(--surface-2)", padding: "0.5rem 0.65rem", borderRadius: "5px", border: "1px solid var(--border)" }}>
                <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.6rem" }}>DISPLACEMENT</span>
                <strong style={{ color: "var(--text)" }}>1,352 CC (82.5 CU IN)</strong>
              </div>

              <div style={{ background: "var(--surface-2)", padding: "0.5rem 0.65rem", borderRadius: "5px", border: "1px solid var(--border)" }}>
                <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.6rem" }}>COMPRESSION RATIO</span>
                <strong style={{ color: "var(--accent)" }}>10.5 : 1</strong>
              </div>

              <div style={{ background: "var(--surface-2)", padding: "0.5rem 0.65rem", borderRadius: "5px", border: "1px solid var(--border)" }}>
                <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.6rem" }}>MAX TAKEOFF POWER</span>
                <strong style={{ color: "var(--status-nominal)" }}>115 HP @ 2,550 RPM</strong>
              </div>

              <div style={{ background: "var(--surface-2)", padding: "0.5rem 0.65rem", borderRadius: "5px", border: "1px solid var(--border)" }}>
                <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.6rem" }}>THERMAL REDLINE</span>
                <strong style={{ color: "var(--status-warning)" }}>165 °C CHT / 720 °C EGT</strong>
              </div>

              <div style={{ background: "var(--surface-2)", padding: "0.5rem 0.65rem", borderRadius: "5px", border: "1px solid var(--border)" }}>
                <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.6rem" }}>LUBRICATION TARGET</span>
                <strong style={{ color: "var(--accent)" }}>45 - 75 PSI (DRY SUMP)</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
