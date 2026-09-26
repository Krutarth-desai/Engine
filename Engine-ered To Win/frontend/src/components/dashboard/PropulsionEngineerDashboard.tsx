"use client";

import React, { useState } from "react";
import { UnifiedTelemetryPayload } from "@/types/telemetry";
import { NavView } from "@/components/Sidebar";
import DigitalTwinCenterpiece from "@/components/DigitalTwinCenterpiece";
import { SCENARIO_REGISTRY } from "@/lib/scenarios";
import {
  Cpu,
  Activity,
  Zap,
  RotateCcw,
  Atom,
} from "lucide-react";

interface PropulsionEngineerDashboardProps {
  payload: UnifiedTelemetryPayload;
  activeScenario: string;
  onInjectScenario: (scenario: string) => void;
  onNavigate: (view: NavView) => void;
}

export default function PropulsionEngineerDashboard({
  payload,
  activeScenario,
  onInjectScenario,
  onNavigate,
}: PropulsionEngineerDashboardProps) {
  const [focusedComponent, setFocusedComponent] = useState<string | null>(null);
  const [selectedSimScenario, setSelectedSimScenario] = useState<string>(activeScenario || "Normal");

  // Physics Model Actual vs Predicted Metrics
  const valRpm = payload.sensors?.rpm?.value ?? payload.rpm ?? 5240;
  const valCht = payload.sensors?.cht?.value ?? payload.cht_c ?? 118.4;
  const valEgt = payload.sensors?.egt?.value ?? payload.egt_c ?? 842.1;
  const rpmActual = Math.round(valRpm);
  const rpmPredicted = 5235;
  const chtActual = Number(valCht.toFixed(1));
  const chtPredicted = 117.8;
  const egtActual = Number(valEgt.toFixed(1));
  const egtPredicted = 839.5;
  const pResidual = 0.014; // RMS model residual error

  // FFT Vibration Spectrum Peaks
  const vibrationPeaks = [
    { order: "1X Crankshaft", freq: "87.3 Hz", amplitude: "0.28 g", status: "NOMINAL" },
    { order: "2X Firing", freq: "174.6 Hz", amplitude: "0.41 g", status: "NOMINAL" },
    { order: "4X Secondary", freq: "349.2 Hz", amplitude: "0.19 g", status: "NOMINAL" },
    { order: "Turbo Impeller", freq: "1,420 Hz", amplitude: "0.12 g", status: "NOMINAL" },
  ];

  // Engineering Attributions
  const factors = [
    { factor: "Thermodynamic Volumetric Efficiency", impact: "+4.2%", status: "Nominal" },
    { factor: "Exhaust Manifold Backpressure", impact: "+1.8%", status: "Marginal" },
    { factor: "Fuel Injector Stoichiometric Ratio", impact: "-0.4%", status: "Nominal" },
    { factor: "Oil Viscosity Shear Rate", impact: "0.0%", status: "Nominal" },
  ];

  const isSimActive = activeScenario && activeScenario !== "Normal";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", flex: 1, minHeight: 0 }}>
      {/* 1. TOP PROPULSION ENGINEERING BANNER & SIMULATION TOOLBAR */}
      <div
        className="card"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "0.85rem 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "var(--surface-2)",
              border: "1px solid var(--status-nominal)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--status-nominal)",
            }}
          >
            <Cpu size={22} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "var(--status-nominal)",
                  fontFamily: "var(--font-mono), monospace",
                  background: "var(--surface-2)",
                  border: "1px solid var(--status-nominal)",
                  borderRadius: "4px",
                  padding: "0.15rem 0.45rem",
                }}
              >
                PROPULSION ENGINEERING SUITE
              </span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>
                Digital Twin Thermodynamic &amp; Boundary Calibration
              </span>
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
              State Estimator: <strong style={{ color: "var(--text)" }}>Extended Kalman Filter</strong> • Model Prediction Error: <strong style={{ color: "var(--status-nominal)", fontFamily: "var(--font-mono), monospace" }}>RMS {pResidual}</strong>
            </div>
          </div>
        </div>

        {/* Mission Simulation Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            background: "var(--surface-2)",
            border: `1px solid ${isSimActive ? "var(--status-caution)" : "var(--border)"}`,
            borderRadius: "8px",
            padding: "0.4rem 0.75rem",
          }}
        >
          <Zap size={14} style={{ color: isSimActive ? "var(--status-caution)" : "var(--accent)" }} />
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
            Mission SIM:
          </span>
          <select
            value={selectedSimScenario}
            onChange={(e) => {
              setSelectedSimScenario(e.target.value);
              onInjectScenario(e.target.value);
            }}
            style={{
              background: "transparent",
              border: "none",
              color: isSimActive ? "var(--status-caution)" : "var(--text)",
              fontSize: "11.5px",
              fontFamily: "var(--font-mono), monospace",
              fontWeight: 700,
              cursor: "pointer",
              outline: "none",
            }}
          >
            {SCENARIO_REGISTRY.map((sc) => (
              <option key={sc.id} value={sc.id} style={{ background: "var(--surface-1)", color: "var(--text)" }}>
                {sc.label} ({sc.category})
              </option>
            ))}
          </select>

          {isSimActive && (
            <button
              onClick={() => {
                setSelectedSimScenario("Normal");
                onInjectScenario("Normal");
              }}
              className="btn-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.2rem 0.5rem",
                fontSize: "10.5px",
                fontFamily: "var(--font-mono), monospace",
                cursor: "pointer",
                borderRadius: "4px",
              }}
            >
              <RotateCcw size={10} /> RESET
            </button>
          )}
        </div>
      </div>

      {/* 2. MAIN SPLIT: DIGITAL TWIN CENTERPIECE (8 COLS) + PHYSICS & ML ANALYTICS (4 COLS) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "0.75rem", flex: 1, minHeight: 0 }}>
        {/* Left: Digital Twin Interactive Centerpiece */}
        <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
          <DigitalTwinCenterpiece
            telemetry={payload}
            activeScenario={activeScenario}
            onInjectScenario={onInjectScenario}
            focusedComponent={focusedComponent}
            onSelectComponent={(k) => setFocusedComponent(focusedComponent === k ? null : k)}
          />
        </div>

        {/* Right: Actual vs Predicted Plots & FFT Frequency Spectrum */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", height: "100%", minHeight: 0 }}>
          {/* Actual vs Predicted Physics Models Card */}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "0.4rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Atom size={14} style={{ color: "var(--accent)" }} />
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}>
                  Thermodynamic Model: Actual vs. Predicted
                </span>
              </div>
              <button
                onClick={() => onNavigate("physics-model")}
                style={{ background: "transparent", border: "none", color: "var(--accent)", fontSize: "11px", cursor: "pointer", padding: 0 }}
              >
                Physics Model Suite &rarr;
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <div style={{ background: "var(--surface-2)", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "10px", color: "var(--text-faint)" }}>RPM (Physical vs Kalman)</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "2px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 800, fontFamily: "var(--font-mono), monospace", color: "var(--text)" }}>{rpmActual}</span>
                  <span style={{ fontSize: "11px", color: "var(--accent)", fontFamily: "var(--font-mono), monospace" }}>Pred: {rpmPredicted}</span>
                </div>
                <div style={{ fontSize: "9.5px", color: "var(--status-nominal)", marginTop: "2px" }}>Residual: +5 rpm (+0.09%)</div>
              </div>

              <div style={{ background: "var(--surface-2)", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "10px", color: "var(--text-faint)" }}>CHT (°C Physical vs Model)</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "2px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 800, fontFamily: "var(--font-mono), monospace", color: "var(--text)" }}>{chtActual}°C</span>
                  <span style={{ fontSize: "11px", color: "var(--accent)", fontFamily: "var(--font-mono), monospace" }}>Pred: {chtPredicted}°C</span>
                </div>
                <div style={{ fontSize: "9.5px", color: "var(--status-nominal)", marginTop: "2px" }}>Residual: +0.6 °C (+0.5%)</div>
              </div>

              <div style={{ background: "var(--surface-2)", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "10px", color: "var(--text-faint)" }}>EGT (°C Combustion Enthalpy)</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "2px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 800, fontFamily: "var(--font-mono), monospace", color: "var(--text)" }}>{egtActual}°C</span>
                  <span style={{ fontSize: "11px", color: "var(--accent)", fontFamily: "var(--font-mono), monospace" }}>Pred: {egtPredicted}°C</span>
                </div>
                <div style={{ fontSize: "9.5px", color: "var(--status-nominal)", marginTop: "2px" }}>Residual: +2.6 °C (+0.3%)</div>
              </div>

              <div style={{ background: "var(--surface-2)", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "10px", color: "var(--text-faint)" }}>Thermal Efficiency (ηth)</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "2px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 800, fontFamily: "var(--font-mono), monospace", color: "var(--text)" }}>34.2%</span>
                  <span style={{ fontSize: "11px", color: "var(--accent)", fontFamily: "var(--font-mono), monospace" }}>Map: 34.5%</span>
                </div>
                <div style={{ fontSize: "9.5px", color: "var(--status-nominal)", marginTop: "2px" }}>BSFC: 268 g/kWh</div>
              </div>
            </div>
          </div>

          {/* Vibration Frequency Spectrum (FFT) Card */}
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
              flex: 1,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "0.4rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Activity size={14} style={{ color: "var(--status-nominal)" }} />
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}>
                  Harmonic Vibration FFT Spectrum &amp; Orders
                </span>
              </div>
              <span style={{ fontSize: "10.5px", color: "var(--text-faint)", fontFamily: "var(--font-mono), monospace" }}>
                Accelerometer AX-1
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {vibrationPeaks.map((peak, pIdx) => (
                <div
                  key={pIdx}
                  style={{
                    background: "var(--surface-2)",
                    borderRadius: "6px",
                    padding: "0.45rem 0.65rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "11.5px",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: "var(--text)" }}>{peak.order}</span>
                    <span style={{ color: "var(--text-faint)", marginLeft: "0.4rem", fontFamily: "var(--font-mono), monospace" }}>
                      ({peak.freq})
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span style={{ fontFamily: "var(--font-mono), monospace", fontWeight: 700, color: "var(--text)" }}>
                      {peak.amplitude}
                    </span>
                    <span style={{ fontSize: "9px", color: "var(--status-nominal)", fontWeight: 700 }}>
                      {peak.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. ROOT CAUSE ANOMALY ATTRIBUTION & PERFORMANCE CORRELATION */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        {/* Factor Attribution Breakdown */}
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
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)", borderBottom: "1px solid var(--border)", paddingBottom: "0.4rem" }}>
            Physics Attribution: Factor Decomposition Matrix
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {factors.map((f, fIdx) => (
              <div key={fIdx} style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", padding: "0.25rem 0" }}>
                <span style={{ color: "var(--text-muted)" }}>{f.factor}</span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontWeight: 600, color: "var(--text)" }}>{f.impact}</span>
                  <span style={{ color: "var(--status-nominal)", fontSize: "10.5px" }}>{f.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Operating Envelope Status */}
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
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)", borderBottom: "1px solid var(--border)", paddingBottom: "0.4rem" }}>
            Operating Envelope &amp; Manifold Pressure Map
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", padding: "0.35rem 0" }}>
            <span style={{ color: "var(--text-muted)" }}>Manifold Absolute Pressure (MAP):</span>
            <strong style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text)" }}>39.4 inHg (Boost Active)</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", padding: "0.35rem 0" }}>
            <span style={{ color: "var(--text-muted)" }}>Wastegate Actuator Position:</span>
            <strong style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text)" }}>42% Open</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", padding: "0.35rem 0" }}>
            <span style={{ color: "var(--text-muted)" }}>Volumetric Air Mass Flow:</span>
            <strong style={{ fontFamily: "var(--font-mono), monospace", color: "var(--accent)" }}>0.114 kg/s</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
