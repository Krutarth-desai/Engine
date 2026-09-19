"use client";

import React, { useState } from "react";
import { UnifiedTelemetryPayload } from "../types/telemetry";
import RulPrognosticsGauge from "./RulPrognosticsGauge";
import RulTrajectoryChart from "./RulTrajectoryChart";
import LstmMetricsPanel from "./LstmMetricsPanel";
import RecentTrendsCard from "./RecentTrendsCard";
import RulPrognosticsPanel from "./RulPrognosticsPanel";
import ModelInfoPopover from "./prognostics/ModelInfoPopover";

interface RulPrognosticsViewProps {
  payload: UnifiedTelemetryPayload;
}

export default function RulPrognosticsView({ payload }: RulPrognosticsViewProps) {
  const [activeTab, setActiveTab] = useState<"piston" | "cmapss">("piston");

  return (
    <div className="view-container rul-prognostics-view">
      <div className="view-header-strip">
        <div>
          <h2 className="view-title">
            <strong>REMAINING USEFUL LIFE (RUL) &amp; PROGNOSTICS SUITE</strong>
          </h2>
          <p className="view-subtitle">
            Deep LSTM degradation modeling, 30-cycle temporal sequence memory, and cycle-to-failure forecasting
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <ModelInfoPopover />

          {/* Dataset Tabs with explicit cycle definitions */}
          <div className="rul-view-tabs" role="tablist" aria-label="Prognostics engine model tabs">
            <button
              role="tab"
              aria-selected={activeTab === "piston"}
              tabIndex={activeTab === "piston" ? 0 : -1}
              className={`rul-tab-btn ${activeTab === "piston" ? "active" : ""}`}
              onClick={() => setActiveTab("piston")}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  e.preventDefault();
                  setActiveTab("cmapss");
                }
              }}
              title="Live MALE UAV Piston Engine (1 cycle = 60s cruise)"
            >
              <strong>UAV PISTON (60s/CYCLE)</strong>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "cmapss"}
              tabIndex={activeTab === "cmapss" ? 0 : -1}
              className={`rul-tab-btn ${activeTab === "cmapss" ? "active" : ""}`}
              onClick={() => setActiveTab("cmapss")}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  e.preventDefault();
                  setActiveTab("piston");
                }
              }}
              title="NASA C-MAPSS Turbofan Fleet Benchmarks (1 cycle = 1 flight mission)"
            >
              <strong>NASA C-MAPSS FLEET</strong>
            </button>
          </div>
        </div>
      </div>

      {activeTab === "piston" ? (
        <div className="rul-prognostics-grid" style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {/* Row 1: Left RUL Centerpiece Arc Gauge & Overview | Right LSTM Diagnostic Metrics */}
          <div className="rul-deck-row">
            <div className="rul-deck-col-left">
              <RulPrognosticsGauge prognostics={payload.prognostics} />
            </div>
            <div className="rul-deck-col-right">
              <LstmMetricsPanel prognostics={payload.prognostics} />
            </div>
          </div>

          {/* Row 2: Actual vs Predicted RUL Trajectory Graph with Degradation Zones */}
          <div className="rul-trajectory-full-card">
            <RulTrajectoryChart
              trajectory={payload.trajectory || []}
              currentCycle={payload.cycle || 31}
              currentActualRul={payload.prognostics?.actual_rul || 112}
              currentPredictedRul={payload.prognostics?.predicted_rul || 117.4}
              modelMae={payload.prognostics?.model_mae || 10.08}
            />
          </div>

          {/* Row 3: Recent 30-Cycle Trend Cards */}
          <div className="rul-trends-card-wrap">
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
        /* NASA CMAPSS Turbofan Fleet Explorer (E1-E100) */
        <div className="cmapss-view-wrap">
          <RulPrognosticsPanel isVisible={true} />
        </div>
      )}
    </div>
  );
}
