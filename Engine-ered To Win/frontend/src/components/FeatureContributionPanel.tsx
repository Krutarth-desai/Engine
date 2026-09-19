"use client";

import React from "react";
import { FeatureContribution } from "../types/telemetry";

interface FeatureContributionPanelProps {
  features: FeatureContribution[];
}

export default function FeatureContributionPanel({ features }: FeatureContributionPanelProps) {
  // Sort by magnitude (absolute score) descending
  const sortedFeatures = [...features].sort((a, b) => {
    const magA = Math.abs(a.score);
    const magB = Math.abs(b.score);
    return magB - magA;
  });

  // Maximum magnitude for proportional scale
  const maxMag = Math.max(0.25, ...sortedFeatures.map((f) => Math.abs(f.score)));

  return (
    <div className="panel feature-contribution-panel" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="panel-title">
          <strong>FEATURE ATTRIBUTION &amp; SHAP GRADIENTS (EXPLAINABLE PHM)</strong>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ fontSize: "0.62rem", color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
            SIGNED DIVERGING BASELINE
          </span>
          <span className="explainable-badge">
            <strong>SHAP KERNEL EXPLAINER</strong>
          </span>
        </div>
      </div>

      <div className="feature-columns-split" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1rem", flex: 1 }}>
        {/* Left: Diverging Bars around Zero Baseline */}
        <div className="feature-bars-list" style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
          {/* Zero baseline legend */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.62rem", color: "#64748b", fontFamily: "'JetBrains Mono', monospace", padding: "0 0.5rem" }}>
            <span>← STABILIZING (NORMALIZING)</span>
            <span style={{ color: "var(--accent-cyan)", fontWeight: 700 }}>BASELINE (0.00)</span>
            <span>DEGRADING (RISK RAMP) →</span>
          </div>

          {sortedFeatures.map((feat) => {
            // Determine sign: if direction is DOWN or score < 0, it's negative (stabilizing)
            // if direction is UP or score > 0, it's positive (degrading)
            const isNegative = feat.direction === "DOWN" || feat.score < 0;
            const mag = Math.abs(feat.score);
            const pct = Math.min(100, (mag / maxMag) * 100);

            const barColor = isNegative ? "#38bdf8" : feat.direction === "STABLE" ? "#10b981" : "#f43f5e";

            return (
              <div key={feat.name} className="feature-bar-row" style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                {/* Feature Name & Direction Indicator */}
                <div style={{ width: "130px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#f8fafc" }}>
                    {feat.name}
                  </span>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      color: barColor,
                    }}
                  >
                    {isNegative ? "-" : "+"}{mag.toFixed(3)}
                  </span>
                </div>

                {/* Signed Diverging Bar around 50% Centerline */}
                <div
                  style={{
                    flex: 1,
                    height: "12px",
                    background: "rgba(255, 255, 255, 0.04)",
                    borderRadius: "6px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Center zero baseline */}
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: 0,
                      bottom: 0,
                      width: "1px",
                      background: "rgba(255, 255, 255, 0.25)",
                      zIndex: 2,
                    }}
                  />

                  {/* Left (Negative) Diverging Bar */}
                  {isNegative && (
                    <div
                      style={{
                        position: "absolute",
                        right: "50%",
                        width: `${pct / 2}%`,
                        top: 0,
                        bottom: 0,
                        background: barColor,
                        borderRadius: "4px 0 0 4px",
                        boxShadow: `0 0 6px ${barColor}60`,
                        transition: "width 0.3s ease",
                      }}
                    />
                  )}

                  {/* Right (Positive) Diverging Bar */}
                  {!isNegative && (
                    <div
                      style={{
                        position: "absolute",
                        left: "50%",
                        width: `${pct / 2}%`,
                        top: 0,
                        bottom: 0,
                        background: barColor,
                        borderRadius: "0 4px 4px 0",
                        boxShadow: `0 0 6px ${barColor}60`,
                        transition: "width 0.3s ease",
                      }}
                    />
                  )}
                </div>

                {/* Subsystem Impact Note */}
                <span
                  style={{
                    width: "150px",
                    fontSize: "0.62rem",
                    color: "#94a3b8",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {feat.impact}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right: Physics Domain Impact Commentary */}
        <div
          className="feature-impact-guide"
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "8px",
            padding: "0.85rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div className="guide-title" style={{ fontSize: "0.76rem", fontWeight: 800, color: "#f8fafc", marginBottom: "0.5rem" }}>
              <strong>PHYSICAL ATTRIBUTION GUIDE</strong>
            </div>

            <div className="guide-items" style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              <div className="guide-item" style={{ fontSize: "0.7rem" }}>
                <span className="text-amber font-mono font-bold">↑ EGT + CHT:</span>
                <span className="guide-desc" style={{ color: "#94a3b8", marginLeft: "0.3rem" }}>
                  Elevates cylinder head stress &amp; valve thermal fatigue.
                </span>
              </div>

              <div className="guide-item" style={{ fontSize: "0.7rem" }}>
                <span className="text-rose font-mono font-bold">↑ Vibration:</span>
                <span className="guide-desc" style={{ color: "#94a3b8", marginLeft: "0.3rem" }}>
                  Direct indicator of journal bearing wear &amp; dynamic prop unbalance.
                </span>
              </div>

              <div className="guide-item" style={{ fontSize: "0.7rem" }}>
                <span className="text-cyan font-mono font-bold">↓ Oil Pressure:</span>
                <span className="guide-desc" style={{ color: "#94a3b8", marginLeft: "0.3rem" }}>
                  Signals oil pump cavitation or hydrodynamic film thinning.
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "0.65rem",
              padding: "0.45rem 0.65rem",
              background: "rgba(56, 189, 248, 0.08)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              borderRadius: "5px",
              fontSize: "0.65rem",
              color: "var(--accent-cyan)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Multi-stress vector projection informs remaining useful life LSTM regression.
          </div>
        </div>
      </div>
    </div>
  );
}
