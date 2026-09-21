"use client";

import React from "react";
import { UnifiedTelemetryPayload } from "../types/telemetry";
import RulPrognosticsGauge from "./RulPrognosticsGauge";
import RulTrajectoryChart from "./RulTrajectoryChart";
import LstmMetricsPanel from "./LstmMetricsPanel";
import RecentTrendsCard from "./RecentTrendsCard";
import ModelInfoPopover from "./prognostics/ModelInfoPopover";
import PageLayout from "./common/PageLayout";
import { Gauge } from "lucide-react";

interface RulPrognosticsViewProps {
  payload: UnifiedTelemetryPayload;
}

export default function RulPrognosticsView({ payload }: RulPrognosticsViewProps) {
  return (
    <PageLayout
      title="Remaining Useful Life (RUL) & Prognostics Suite"
      subtitle="Deep LSTM degradation modeling, 30-cycle temporal sequence memory, and cycle-to-failure forecasting"
      icon={<Gauge size={18} />}
      tags={
        <span
          className="nav-tag"
          style={{
            color: "var(--accent)",
            borderColor: "var(--border)",
            fontFamily: "var(--font-mono), monospace",
          }}
        >
          UAV PISTON (60s/CYCLE)
        </span>
      }
      actions={
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <ModelInfoPopover />
        </div>
      }
    >
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
    </PageLayout>
  );
}
