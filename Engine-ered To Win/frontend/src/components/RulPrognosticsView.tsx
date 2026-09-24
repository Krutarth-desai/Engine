"use client";

import React, { useState } from "react";
import { UnifiedTelemetryPayload } from "../types/telemetry";
import RulPrognosticsGauge from "./RulPrognosticsGauge";
import RulTrajectoryChart from "./RulTrajectoryChart";
import LstmMetricsPanel from "./LstmMetricsPanel";
import RecentTrendsCard from "./RecentTrendsCard";
import RulPrognosticsPanel from "./RulPrognosticsPanel";

interface RulPrognosticsViewProps {
  payload: UnifiedTelemetryPayload;
}

export default function RulPrognosticsView({ payload }: RulPrognosticsViewProps) {
  const [activeTab, setActiveTab] = useState<"piston" | "cmapss">("piston");

  return (
    <div className="gcs-view-container rul-prognostics-view">
      {/* Standardized GCS View Header */}
      <div className="gcs-view-header">
        <div className="gcs-view-title-wrap">
          <h2 className="gcs-view-title">
            <span>⏳</span> REMAINING USEFUL LIFE (RUL) &amp; PROGNOSTICS SUITE
          </h2>
          <span className="gcs-view-tagline">
            Deep LSTM degradation modeling, 30-cycle temporal sequence memory, and cycle-to-failure forecasting
          </span>
        </div>

        {/* Tab Toggle with Standardized GCS Buttons */}
        <div className="gcs-view-actions">
          <button
            className={`gcs-btn gcs-btn-sm ${activeTab === "piston" ? "gcs-btn-primary" : "gcs-btn-secondary"}`}
            onClick={() => setActiveTab("piston")}
          >
            UAV PISTON PROGNOSTICS
          </button>
          <button
            className={`gcs-btn gcs-btn-sm ${activeTab === "cmapss" ? "gcs-btn-primary" : "gcs-btn-secondary"}`}
            onClick={() => setActiveTab("cmapss")}
          >
            NASA CMAPSS FLEET (E1–E100)
          </button>
        </div>
      </div>

      {activeTab === "piston" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.95rem" }}>
          {/* Row 1: Left RUL Centerpiece Arc Gauge & Overview | Right LSTM Diagnostic Metrics */}
          <div
            className="gcs-grid-2col"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(360px, 42%) 1fr",
              gap: "0.95rem",
              alignItems: "stretch",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <RulPrognosticsGauge prognostics={payload.prognostics} />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <LstmMetricsPanel prognostics={payload.prognostics} />
            </div>
          </div>

          {/* Row 2: Actual vs Predicted RUL Trajectory Graph with Degradation Zones */}
          <div className="gcs-card" style={{ padding: "0.85rem 1rem" }}>
            <RulTrajectoryChart
              trajectory={payload.trajectory || []}
              currentCycle={payload.cycle || 31}
              currentActualRul={payload.prognostics?.actual_rul || 112}
              currentPredictedRul={payload.prognostics?.predicted_rul || 117.4}
            />
          </div>

          {/* Row 3: Recent 30-Cycle Trend Cards */}
          <div style={{ width: "100%" }}>
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
