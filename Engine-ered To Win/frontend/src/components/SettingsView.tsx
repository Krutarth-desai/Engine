"use client";

import React, { useState } from "react";
import { useTelemetry } from "@/context/TelemetryContext";
import { Settings, Sliders, Monitor, Bell, HardDrive } from "lucide-react";

export default function SettingsView() {
  const { unitPreference, setUnitPreference } = useTelemetry();
  const [timeFormat, setTimeFormat] = useState<"zulu" | "local">("zulu");
  const [streamRate, setStreamRate] = useState<string>("10");
  const [audioAlerts, setAudioAlerts] = useState<boolean>(true);
  const [activeSection, setActiveSection] = useState<string>("units");

  return (
    <div className="view-container" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem 1.25rem", minHeight: "100%", boxSizing: "border-box" }}>
      {/* View Header */}
      <div className="view-header-strip" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
        <div>
          <h1 className="page-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Settings size={20} style={{ color: "var(--accent)" }} />
            Workstation Settings & GCS Preferences
          </h1>
          <p className="text-caption" style={{ color: "var(--text-muted)", margin: "0.25rem 0 0 0" }}>
            Ground Control Station display units, telemetry sampling rates, and alert trigger thresholds.
          </p>
        </div>
      </div>

      {/* Main Settings Split: Left List, Right Form */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "1.25rem", flex: 1, minHeight: 0 }}>
        {/* Left Section List */}
        <div className="card" style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "12px", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <button
            className={`nav-item-btn ${activeSection === "units" ? "active" : ""}`}
            onClick={() => setActiveSection("units")}
            style={{ borderRadius: "6px", textAlign: "left" }}
          >
            <Sliders size={16} />
            <span>Units & Display</span>
          </button>

          <button
            className={`nav-item-btn ${activeSection === "telemetry" ? "active" : ""}`}
            onClick={() => setActiveSection("telemetry")}
            style={{ borderRadius: "6px", textAlign: "left" }}
          >
            <Monitor size={16} />
            <span>Telemetry Stream</span>
          </button>

          <button
            className={`nav-item-btn ${activeSection === "alerts" ? "active" : ""}`}
            onClick={() => setActiveSection("alerts")}
            style={{ borderRadius: "6px", textAlign: "left" }}
          >
            <Bell size={16} />
            <span>Audio & Alerts</span>
          </button>

          <button
            className={`nav-item-btn ${activeSection === "system" ? "active" : ""}`}
            onClick={() => setActiveSection("system")}
            style={{ borderRadius: "6px", textAlign: "left" }}
          >
            <HardDrive size={16} />
            <span>System Information</span>
          </button>
        </div>

        {/* Right Form Container */}
        <div className="card" style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {activeSection === "units" && (
            <>
              <div>
                <h3 className="card-title" style={{ margin: "0 0 0.25rem 0" }}>Display Units & Formatting</h3>
                <p className="text-caption" style={{ color: "var(--text-muted)", margin: 0 }}>
                  Select standardized aerospace measurement systems for pressure and timestamp displays.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <label className="text-caption" style={{ display: "block", color: "var(--text-muted)", marginBottom: "0.4rem", fontWeight: 600 }}>
                    OIL PRESSURE UNIT
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      className={unitPreference === "psi" ? "btn-primary" : "btn-secondary"}
                      onClick={() => setUnitPreference("psi")}
                      style={{ padding: "0.4rem 1rem", borderRadius: "6px", fontSize: "13px", cursor: "pointer" }}
                    >
                      Pounds per Sq. Inch (psi)
                    </button>
                    <button
                      className={unitPreference === "bar" ? "btn-primary" : "btn-secondary"}
                      onClick={() => setUnitPreference("bar")}
                      style={{ padding: "0.4rem 1rem", borderRadius: "6px", fontSize: "13px", cursor: "pointer" }}
                    >
                      Metric Bar (bar)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-caption" style={{ display: "block", color: "var(--text-muted)", marginBottom: "0.4rem", fontWeight: 600 }}>
                    STATION CLOCK DISPLAY
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      className={timeFormat === "zulu" ? "btn-primary" : "btn-secondary"}
                      onClick={() => setTimeFormat("zulu")}
                      style={{ padding: "0.4rem 1rem", borderRadius: "6px", fontSize: "13px", cursor: "pointer" }}
                    >
                      Zulu Time (UTC / GMT)
                    </button>
                    <button
                      className={timeFormat === "local" ? "btn-primary" : "btn-secondary"}
                      onClick={() => setTimeFormat("local")}
                      style={{ padding: "0.4rem 1rem", borderRadius: "6px", fontSize: "13px", cursor: "pointer" }}
                    >
                      Local Station Time (IST)
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSection === "telemetry" && (
            <>
              <div>
                <h3 className="card-title" style={{ margin: "0 0 0.25rem 0" }}>Telemetry Streaming Rate</h3>
                <p className="text-caption" style={{ color: "var(--text-muted)", margin: 0 }}>
                  Adjust WebSocket polling and streaming frequency across all 9 propulsion sensor channels.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "320px" }}>
                <label className="text-caption" style={{ color: "var(--text-muted)", fontWeight: 600 }}>
                  STREAM FREQUENCY
                </label>
                <select
                  value={streamRate}
                  onChange={(e) => setStreamRate(e.target.value)}
                  style={{ padding: "0.5rem 0.75rem", borderRadius: "6px", fontSize: "13px" }}
                >
                  <option value="5">5 Hz (Low Bandwidth Satcom)</option>
                  <option value="10">10 Hz (Standard Certified Default)</option>
                  <option value="20">20 Hz (High Fidelity Engineering)</option>
                </select>
              </div>
            </>
          )}

          {activeSection === "alerts" && (
            <>
              <div>
                <h3 className="card-title" style={{ margin: "0 0 0.25rem 0" }}>Audio Chimes & Alert Dispatch</h3>
                <p className="text-caption" style={{ color: "var(--text-muted)", margin: 0 }}>
                  Control audible annunciators and automated work-order generation rules.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <input
                  type="checkbox"
                  id="audio-toggle"
                  checked={audioAlerts}
                  onChange={(e) => setAudioAlerts(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label htmlFor="audio-toggle" className="text-body" style={{ color: "var(--text)", cursor: "pointer" }}>
                  Audible warning tones on Warning/Critical state excursions
                </label>
              </div>
            </>
          )}

          {activeSection === "system" && (
            <>
              <div>
                <h3 className="card-title" style={{ margin: "0 0 0.25rem 0" }}>System & Build Diagnostics</h3>
                <p className="text-caption" style={{ color: "var(--text-muted)", margin: 0 }}>
                  AeroTwin Digital Twin Ground Control Station Build Specification.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ background: "var(--surface-2)", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
                  <span className="text-caption" style={{ color: "var(--text-muted)" }}>Application Framework</span>
                  <div style={{ fontFamily: "var(--font-mono), monospace", fontWeight: 600, color: "var(--text)", marginTop: "0.25rem" }}>
                    Next.js 16.3.4 (App Router, Turbopack)
                  </div>
                </div>

                <div style={{ background: "var(--surface-2)", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
                  <span className="text-caption" style={{ color: "var(--text-muted)" }}>Target UAV Engine</span>
                  <div style={{ fontFamily: "var(--font-mono), monospace", fontWeight: 600, color: "var(--text)", marginTop: "0.25rem" }}>
                    Rotax 914 F4 Turbocharged Aero Piston
                  </div>
                </div>

                <div style={{ background: "var(--surface-2)", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
                  <span className="text-caption" style={{ color: "var(--text-muted)" }}>PHM Inference Engine</span>
                  <div style={{ fontFamily: "var(--font-mono), monospace", fontWeight: 600, color: "var(--text)", marginTop: "0.25rem" }}>
                    LSTM Autoencoder & OLS Linear Regression
                  </div>
                </div>

                <div style={{ background: "var(--surface-2)", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
                  <span className="text-caption" style={{ color: "var(--text-muted)" }}>Color & Design System</span>
                  <div style={{ fontFamily: "var(--font-mono), monospace", fontWeight: 600, color: "var(--text)", marginTop: "0.25rem" }}>
                    Monochrome Black Theme (:root tokens)
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
