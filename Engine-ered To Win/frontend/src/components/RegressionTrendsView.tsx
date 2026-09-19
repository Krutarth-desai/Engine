"use client";

import React, { useState } from "react";
import { UnifiedTelemetryPayload } from "../types/telemetry";
import { useTelemetry } from "@/context/TelemetryContext";
import RegressionScatterChart from "./diagnostics/RegressionScatterChart";
import RecentTrendsCard from "./RecentTrendsCard";
import PageLayout from "./common/PageLayout";
import { TrendingUp, LayoutGrid, Maximize2, Info } from "lucide-react";

interface RegressionTrendsViewProps {
  payload: UnifiedTelemetryPayload;
}

const REGRESSION_MODELS = [
  { id: "cht_rpm", label: "CHT vs RPM", desc: "Thermal Power Coupling" },
  { id: "egt_fuel", label: "EGT vs Fuel Flow", desc: "Combustion Stoichiometry" },
  { id: "oil_p_oil_t", label: "Oil Press vs Oil Temp", desc: "Lubrication Viscosity" },
  { id: "vib_rpm", label: "Vibration vs RPM", desc: "Dynamic Rotor Harmonics" },
];

export default function RegressionTrendsView({ payload }: RegressionTrendsViewProps) {
  const { historyBuffer } = useTelemetry();
  const [activeTab, setActiveTab] = useState<string>("2x2");
  const [showInsights, setShowInsights] = useState<boolean>(false);

  return (
    <PageLayout
      title="Regression Modeling & Multi-Cycle Cross-Correlations"
      subtitle="Live Ordinary Least Squares (OLS) fits, Pearson correlation coefficients, and degradation trajectories"
      icon={<TrendingUp size={18} />}
      noScroll={true}
      tags={
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span
            className="nav-tag"
            style={{
              color: "var(--accent)",
              borderColor: "var(--border)",
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            BUFFER: {historyBuffer.length} CYCLES
          </span>
          <span
            className="nav-tag"
            style={{
              color: "var(--text-muted)",
              borderColor: "var(--border)",
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            OLS DEG: 1
          </span>
        </div>
      }
      actions={
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <button
            onClick={() => setActiveTab("2x2")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              padding: "0.3rem 0.65rem",
              borderRadius: "6px",
              background: activeTab === "2x2" ? "var(--surface-2)" : "transparent",
              border: `1px solid ${activeTab === "2x2" ? "var(--accent)" : "var(--border)"}`,
              color: activeTab === "2x2" ? "var(--text)" : "var(--text-muted)",
              fontSize: "11.5px",
              cursor: "pointer",
            }}
            title="2x2 Balanced Matrix"
          >
            <LayoutGrid size={13} />
            2x2 Matrix
          </button>
          {REGRESSION_MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveTab(m.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.3rem 0.65rem",
                borderRadius: "6px",
                background: activeTab === m.id ? "var(--surface-2)" : "transparent",
                border: `1px solid ${activeTab === m.id ? "var(--accent)" : "var(--border)"}`,
                color: activeTab === m.id ? "var(--text)" : "var(--text-muted)",
                fontSize: "11.5px",
                cursor: "pointer",
              }}
              title={m.desc}
            >
              {m.label}
            </button>
          ))}
          <button
            onClick={() => setShowInsights(!showInsights)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              padding: "0.3rem 0.6rem",
              borderRadius: "6px",
              background: showInsights ? "var(--surface-2)" : "transparent",
              border: `1px solid ${showInsights ? "var(--accent)" : "var(--border)"}`,
              color: showInsights ? "var(--accent)" : "var(--text-muted)",
              fontSize: "11.5px",
              cursor: "pointer",
            }}
            title="Toggle Physical Regime Commentary"
          >
            <Info size={13} />
            Insights
          </button>
        </div>
      }
    >
      {/* 2x2 Matrix Mode: 4 Balanced Cards Filling the Viewport */}
      {activeTab === "2x2" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr 1fr",
            gap: "0.65rem",
            flex: 1,
            minHeight: 0,
          }}
        >
          {REGRESSION_MODELS.map((m) => (
            <div
              key={m.id}
              className="card"
              style={{
                background: "var(--surface-1)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "0.65rem 0.85rem",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "0.35rem",
                  borderBottom: "1px solid var(--border)",
                  marginBottom: "0.35rem",
                  flexShrink: 0,
                }}
              >
                <div>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text)" }}>
                    {m.label}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                    ({m.desc})
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab(m.id)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-faint)",
                    cursor: "pointer",
                    padding: "2px",
                  }}
                  title="Expand to single view"
                >
                  <Maximize2 size={12} />
                </button>
              </div>

              <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
                <RegressionScatterChart
                  points={historyBuffer}
                  plotType={m.id}
                  minPoints={5}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Single Plot Expanded Mode (with 30-cycle temporal trends) */
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.65rem", flex: 1, minHeight: 0 }}>
          <div
            className="card"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "0.75rem 1rem",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: "0.45rem",
                borderBottom: "1px solid var(--border)",
                marginBottom: "0.5rem",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>
                {REGRESSION_MODELS.find((m) => m.id === activeTab)?.label}
              </span>
              <button
                onClick={() => setActiveTab("2x2")}
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                  padding: "0.2rem 0.5rem",
                  fontSize: "11px",
                  color: "var(--text)",
                  cursor: "pointer",
                }}
              >
                Back to 2x2 Grid
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
              <RegressionScatterChart
                points={historyBuffer}
                plotType={activeTab}
                minPoints={5}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", minHeight: 0 }}>
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
      )}

      {/* Optional Insights Drawer */}
      {showInsights && (
        <div
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-strong)",
            borderRadius: "8px",
            padding: "0.65rem 1rem",
            fontSize: "11.5px",
            color: "var(--text-muted)",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "0.75rem",
            flexShrink: 0,
          }}
        >
          <div>
            <strong style={{ color: "var(--text)" }}>Thermodynamic Coupling:</strong> CHT couples to RPM power with ~2.4s thermal phase lag.
          </div>
          <div>
            <strong style={{ color: "var(--text)" }}>Combustion Stoichiometry:</strong> EGT gradient identifies peak EGT and lean/rich boundary.
          </div>
          <div>
            <strong style={{ color: "var(--text)" }}>Viscous Scavenge:</strong> Oil P vs T slope flatter than -0.015 psi/°C indicates stable viscosity.
          </div>
          <div>
            <strong style={{ color: "var(--text)" }}>Harmonics:</strong> Baseline vibration remains &lt;1.5g. Above 2.0g triggers rotor advisory.
          </div>
        </div>
      )}
    </PageLayout>
  );
}
