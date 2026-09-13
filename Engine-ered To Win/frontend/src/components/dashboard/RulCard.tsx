"use client";

import React from "react";
import { useTelemetry } from "@/context/TelemetryContext";
import { NavView } from "@/components/Sidebar";

interface RulCardProps {
  onNavigate?: (view: NavView) => void;
}

export default function RulCard({ onNavigate }: RulCardProps) {
  const { prognostics, healthIndex, environment, isConnected, connectionStatus } = useTelemetry();

  const rulVal = prognostics?.predicted_rul != null ? Math.round(prognostics.predicted_rul) : null;
  const actualRul = prognostics?.actual_rul != null ? Math.round(prognostics.actual_rul) : null;
  const remainingTime = prognostics?.remaining_time_str || null;
  const trend = prognostics?.degradation_trend || "Stable";
  const confidence = prognostics?.confidence != null ? Math.round(prognostics.confidence) : null;
  const modelMae = prognostics?.model_mae != null ? prognostics.model_mae.toFixed(1) : null;
  const maxLife = prognostics?.max_useful_life || 250;
  const currentCycle = prognostics?.current_cycle || 1;

  const rulPct = rulVal != null ? Math.min(100, Math.max(0, Math.round((rulVal / maxLife) * 100))) : null;

  return (
    <div
      className="rul-card"
      style={{
        background: "var(--bg-card, rgba(14, 21, 38, 0.75))",
        border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
        borderRadius: "10px",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "0.85rem",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.95rem", fontWeight: 800, letterSpacing: "0.5px", color: "#f8fafc" }}>
              REMAINING USEFUL LIFE (RUL PROGNOSTICS)
            </span>
            <span
              style={{
                fontSize: "0.62rem",
                fontWeight: 800,
                padding: "0.15rem 0.45rem",
                borderRadius: "4px",
                background: "rgba(56, 189, 248, 0.15)",
                color: "var(--accent-cyan, #38bdf8)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
              }}
            >
              LSTM ENGINE
            </span>
            {connectionStatus === "RECONNECTING" && (
              <span
                style={{
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  padding: "0.15rem 0.45rem",
                  borderRadius: "4px",
                  background: "rgba(245, 158, 11, 0.2)",
                  color: "var(--accent-amber, #f59e0b)",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                }}
              >
                STALE
              </span>
            )}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary, #94a3b8)", marginTop: "0.15rem" }}>
            Deep learning cycle-by-cycle degradation estimation trained on aero engine wear
          </div>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate("rul")}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--accent-cyan, #38bdf8)",
              fontSize: "0.72rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            TRAJECTORY &amp; METRICS →
          </button>
        )}
      </div>

      {/* Main RUL Value & Progress */}
      {(isConnected || connectionStatus === "RECONNECTING") && rulVal != null ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
              <span
                style={{
                  fontSize: "2.5rem",
                  fontWeight: 900,
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  color: "var(--accent-cyan, #38bdf8)",
                  lineHeight: 1,
                }}
              >
                {rulVal}
              </span>
              <span style={{ fontSize: "0.9rem", color: "var(--text-muted, #64748b)" }}>CYCLES REMAINING</span>
            </div>

            {remainingTime && (
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "0.68rem", color: "var(--text-muted, #64748b)" }}>EST. FLIGHT TIME</span>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, fontFamily: "var(--font-mono, monospace)", color: "#f8fafc" }}>
                  ≈ {remainingTime}
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar of Useful Life */}
          <div style={{ width: "100%", height: "6px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "3px", overflow: "hidden" }}>
            <div
              style={{
                width: `${rulPct ?? 50}%`,
                height: "100%",
                background: "linear-gradient(90deg, #38bdf8, #10b981)",
                borderRadius: "3px",
                transition: "width 0.6s ease",
              }}
            />
          </div>

          {/* Metrics Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
              gap: "0.5rem",
              background: "rgba(0, 0, 0, 0.2)",
              padding: "0.6rem",
              borderRadius: "6px",
              fontSize: "0.7rem",
            }}
          >
            <div>
              <span style={{ color: "var(--text-muted)" }}>Degradation Trend:</span>
              <div style={{ fontWeight: 800, color: "#f8fafc", marginTop: "0.1rem" }}>{trend}</div>
            </div>

            {confidence != null && (
              <div>
                <span style={{ color: "var(--text-muted)" }}>Confidence:</span>
                <div style={{ fontWeight: 800, color: "#10b981", marginTop: "0.1rem" }}>{confidence}%</div>
              </div>
            )}

            {actualRul != null && (
              <div>
                <span style={{ color: "var(--text-muted)" }}>Benchmark Ground Truth:</span>
                <div style={{ fontWeight: 800, color: "#94a3b8", marginTop: "0.1rem" }}>{actualRul} Cycles</div>
              </div>
            )}

            {modelMae != null && (
              <div>
                <span style={{ color: "var(--text-muted)" }}>Model MAE:</span>
                <div style={{ fontWeight: 800, color: "#38bdf8", marginTop: "0.1rem" }}>±{modelMae} Cycles</div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ padding: "1.5rem 0", color: "var(--text-muted, #64748b)", fontSize: "0.8rem" }}>
          {connectionStatus === "CONNECTING"
            ? "Connecting to prognostics engine..."
            : connectionStatus === "RECONNECTING"
            ? "Reconnecting to prognostics engine..."
            : "Prognostics engine offline (Disconnected)."}
        </div>
      )}
    </div>
  );
}
