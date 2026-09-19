"use client";

import React, { useState } from "react";
import { UnifiedTelemetryPayload } from "../types/telemetry";
import RulPrognosticsGauge from "./RulPrognosticsGauge";
import RulTrajectoryChart from "./RulTrajectoryChart";
import LstmMetricsPanel from "./LstmMetricsPanel";
import RecentTrendsCard from "./RecentTrendsCard";
import RulPrognosticsPanel from "./RulPrognosticsPanel";
import ModelInfoPopover from "./prognostics/ModelInfoPopover";
import PageLayout from "./common/PageLayout";
import { Gauge } from "lucide-react";

interface RulPrognosticsViewProps {
  payload: UnifiedTelemetryPayload;
}

export default function RulPrognosticsView({ payload }: RulPrognosticsViewProps) {
  const [activeTab, setActiveTab] = useState<"piston" | "cmapss">("piston");

  return (
    <PageLayout
      title="Remaining Useful Life (RUL) & Prognostics Suite"
      subtitle="Deep LSTM degradation modeling, 30-cycle temporal sequence memory, and cycle-to-failure forecasting"
      icon={<Gauge size={18} />}
      actions={
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <ModelInfoPopover />

          <div style={{ display: "flex", gap: "0.3rem" }} role="tablist" aria-label="Prognostics dataset selector">
            <button
              role="tab"
              aria-selected={activeTab === "piston"}
              className={`nav-tag ${activeTab === "piston" ? "active" : ""}`}
              style={{
                cursor: "pointer",
                background: activeTab === "piston" ? "var(--surface-2)" : "transparent",
                color: activeTab === "piston" ? "var(--text)" : "var(--text-muted)",
                borderColor: activeTab === "piston" ? "var(--accent)" : "var(--border)",
                padding: "0.25rem 0.6rem",
                borderRadius: "4px",
                fontSize: "11.5px",
                fontFamily: "var(--font-mono), monospace",
                fontWeight: 600,
              }}
              onClick={() => setActiveTab("piston")}
              title="Live MALE UAV Piston Engine (1 cycle = 60s cruise)"
            >
              UAV PISTON (60s/CYCLE)
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "cmapss"}
              className={`nav-tag ${activeTab === "cmapss" ? "active" : ""}`}
              style={{
                cursor: "pointer",
                background: activeTab === "cmapss" ? "var(--surface-2)" : "transparent",
                color: activeTab === "cmapss" ? "var(--text)" : "var(--text-muted)",
                borderColor: activeTab === "cmapss" ? "var(--accent)" : "var(--border)",
                padding: "0.25rem 0.6rem",
                borderRadius: "4px",
                fontSize: "11.5px",
                fontFamily: "var(--font-mono), monospace",
                fontWeight: 600,
              }}
              onClick={() => setActiveTab("cmapss")}
              title="NASA C-MAPSS Turbofan Fleet Benchmarks"
            >
              NASA C-MAPSS FLEET
            </button>
          </div>
        </div>
      }
    >
      {activeTab === "piston" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1, minHeight: 0 }}>
          {/* Row 1: Left RUL Centerpiece Arc Gauge | Right LSTM Diagnostic Metrics */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.25fr 1fr",
              gap: "0.75rem",
              alignItems: "stretch",
            }}
          >
            <RulPrognosticsGauge prognostics={payload.prognostics} />
            <LstmMetricsPanel prognostics={payload.prognostics} />
          </div>

          {/* Row 2: Actual vs Predicted RUL Trajectory Graph with Degradation Zones */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <RulTrajectoryChart
              trajectory={payload.trajectory || []}
              currentCycle={payload.cycle || 31}
              currentActualRul={payload.prognostics?.actual_rul || 112}
              currentPredictedRul={payload.prognostics?.predicted_rul || 117.4}
              modelMae={payload.prognostics?.model_mae || 10.08}
            />
          </div>

          {/* Row 3: Recent 30-Cycle Trend Cards */}
          <div>
            <RecentTrendsCard
              points={payload.recent_trends?.points || []}
              deltas={
                payload.recent_trends?.deltas || {
                  egt_delta: 0,
                  oil_pressure_delta: 0,
                  vibration_delta: 0,
                  health_delta: 0,
                }
              }
            />
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0 }}>
          <RulPrognosticsPanel isVisible={activeTab === "cmapss"} />
        </div>
      )}
    </PageLayout>
  );
}
