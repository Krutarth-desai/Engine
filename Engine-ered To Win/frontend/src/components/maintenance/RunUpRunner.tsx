"use client";

import React, { useState } from "react";
import { Play, CheckCircle2 } from "lucide-react";

export default function RunUpRunner() {
  const [runUpStep, setRunUpStep] = useState<number>(0); // 0: Standby, 1: Mag Drop, 2: Idle, 3: Full Power, 4: Finished
  const [runUpResults, setRunUpResults] = useState<{
    magDropPass?: boolean;
    idlePass?: boolean;
    fullPowerPass?: boolean;
  }>({});

  const handleStartRunUp = () => {
    setRunUpStep(1);
    setRunUpResults({});

    setTimeout(() => {
      setRunUpResults((prev) => ({ ...prev, magDropPass: true }));
      setRunUpStep(2);

      setTimeout(() => {
        setRunUpResults((prev) => ({ ...prev, idlePass: true }));
        setRunUpStep(3);

        setTimeout(() => {
          setRunUpResults((prev) => ({ ...prev, fullPowerPass: true }));
          setRunUpStep(4);
        }, 2200);
      }, 2200);
    }, 2200);
  };

  return (
    <div className="panel runup-runner-panel" style={{ marginTop: "0.85rem" }}>
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="panel-title">
          <strong>ENGINE PRE-TAKEOFF RUN-UP TEST RUNNER</strong>
        </div>
        <span className="model-chip font-mono text-xs">AUTOMATED SEQUENCE</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
        {/* Step 1: Magneto Drop */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.45rem 0.75rem",
            background: "rgba(255, 255, 255, 0.03)",
            borderRadius: "6px",
          }}
        >
          <div>
            <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#f8fafc" }}>
              1. Magneto Drop &amp; Ignition Advance
            </div>
            <div style={{ fontSize: "0.62rem", color: "#64748b" }}>
              Drop &lt; 150 RPM at 1800 RPM; Differential &lt; 50 RPM
            </div>
          </div>
          <div>
            {runUpStep === 1 ? (
              <span className="text-cyan font-mono" style={{ fontSize: "0.68rem" }}>
                EVALUATING...
              </span>
            ) : runUpResults.magDropPass ? (
              <span style={{ color: "#10b981", fontSize: "0.68rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                <CheckCircle2 size={13} /> PASS (-65 RPM)
              </span>
            ) : (
              <span style={{ color: "#64748b", fontSize: "0.68rem" }}>STANDBY</span>
            )}
          </div>
        </div>

        {/* Step 2: Idle Scavenge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.45rem 0.75rem",
            background: "rgba(255, 255, 255, 0.03)",
            borderRadius: "6px",
          }}
        >
          <div>
            <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#f8fafc" }}>
              2. Idle Scavenge &amp; Minimum Oil Pressure
            </div>
            <div style={{ fontSize: "0.62rem", color: "#64748b" }}>
              Idle 1100–1300 RPM; Sustained Oil Pressure &gt; 35 psi
            </div>
          </div>
          <div>
            {runUpStep === 2 ? (
              <span className="text-cyan font-mono" style={{ fontSize: "0.68rem" }}>
                EVALUATING...
              </span>
            ) : runUpResults.idlePass ? (
              <span style={{ color: "#10b981", fontSize: "0.68rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                <CheckCircle2 size={13} /> PASS (1220 RPM)
              </span>
            ) : (
              <span style={{ color: "#64748b", fontSize: "0.68rem" }}>STANDBY</span>
            )}
          </div>
        </div>

        {/* Step 3: Full Static Power */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.45rem 0.75rem",
            background: "rgba(255, 255, 255, 0.03)",
            borderRadius: "6px",
          }}
        >
          <div>
            <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#f8fafc" }}>
              3. Full Static Power &amp; Thermal Balance
            </div>
            <div style={{ fontSize: "0.62rem", color: "#64748b" }}>
              2650–2750 RPM; Fuel Flow 17–20 L/h; Vib &lt; 2.0g RMS
            </div>
          </div>
          <div>
            {runUpStep === 3 ? (
              <span className="text-cyan font-mono" style={{ fontSize: "0.68rem" }}>
                EVALUATING...
              </span>
            ) : runUpResults.fullPowerPass ? (
              <span style={{ color: "#10b981", fontSize: "0.68rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                <CheckCircle2 size={13} /> PASS (2680 RPM)
              </span>
            ) : (
              <span style={{ color: "#64748b", fontSize: "0.68rem" }}>STANDBY</span>
            )}
          </div>
        </div>

        {/* Trigger Button */}
        <button
          onClick={handleStartRunUp}
          disabled={runUpStep > 0 && runUpStep < 4}
          style={{
            marginTop: "0.3rem",
            background: runUpStep === 4 ? "rgba(16, 185, 129, 0.2)" : "rgba(56, 189, 248, 0.15)",
            border: `1px solid ${runUpStep === 4 ? "rgba(16, 185, 129, 0.5)" : "rgba(56, 189, 248, 0.4)"}`,
            color: runUpStep === 4 ? "#10b981" : "var(--accent-cyan)",
            borderRadius: "6px",
            padding: "0.45rem 0.9rem",
            fontSize: "0.72rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            cursor: runUpStep > 0 && runUpStep < 4 ? "not-allowed" : "pointer",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {runUpStep > 0 && runUpStep < 4 ? (
            <>AUTOMATED RUN-UP SEQUENCE IN PROGRESS...</>
          ) : runUpStep === 4 ? (
            <>
              <CheckCircle2 size={14} /> RUN-UP CERTIFIED NOMINAL — RE-TEST
            </>
          ) : (
            <>
              <Play size={13} /> INITIATE AUTOMATED PRE-TAKEOFF RUN-UP
            </>
          )}
        </button>
      </div>
    </div>
  );
}
