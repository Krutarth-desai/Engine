"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Chart, registerables } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { useTelemetry } from "@/context/TelemetryContext";
import { useTheme } from "@/context/ThemeContext";
import { getThemeColors, prefersReducedMotion } from "@/lib/chartTheme";
import { fmt } from "@/lib/format";
import { Cpu, CheckCircle2, AlertTriangle } from "lucide-react";

Chart.register(...registerables, annotationPlugin);

type ResidualChannel = "cht" | "egt" | "oil_pressure";

export default function DigitalTwinResidualChart() {
  const { historyBuffer, payload, activeScenario, unitPreference } = useTelemetry();
  const { theme } = useTheme();
  const [selectedChannel, setSelectedChannel] = useState<ResidualChannel>("cht");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  // Digital Twin baseline formulas under nominal cruise flight
  const twinBaselines = useMemo(() => ({
    cht: 142.0, // °C nominal
    egt: 615.0, // °C nominal
    oil_pressure: unitPreference === "bar" ? 4.69 : 68.0, // bar or psi
    tolerance: {
      cht: 6.0, // ±6°C tolerance
      egt: 20.0, // ±20°C tolerance
      oil_pressure: unitPreference === "bar" ? 0.35 : 5.0, // ±0.35 bar or ±5 psi
    },
  }), [unitPreference]);

  // Current live values
  const currentMeas = {
    cht: payload.sensors?.cht?.value ?? payload.cht_c ?? 142.0,
    egt: payload.sensors?.egt?.value ?? payload.egt_c ?? 615.0,
    oil_pressure:
      unitPreference === "bar"
        ? (payload.sensors?.oil_pressure?.value ? payload.sensors.oil_pressure.value / 14.5038 : (payload.oil_pressure_bar ?? 4.69))
        : (payload.sensors?.oil_pressure?.value ?? (payload.oil_pressure_bar ? payload.oil_pressure_bar * 14.5038 : 68.0)),
  };

  const currentResiduals = {
    cht: currentMeas.cht - twinBaselines.cht,
    egt: currentMeas.egt - twinBaselines.egt,
    oil_pressure: currentMeas.oil_pressure - twinBaselines.oil_pressure,
  };

  const channelConfig = {
    cht: {
      title: "CYLINDER HEAD TEMPERATURE (CHT) RESIDUAL",
      unit: "°C",
      measColor: "var(--accent)",
      twinColor: "var(--surface-3)",
      tolerance: twinBaselines.tolerance.cht,
      baseline: twinBaselines.cht,
      measVal: currentMeas.cht,
      residualVal: currentResiduals.cht,
    },
    egt: {
      title: "EXHAUST GAS TEMPERATURE (EGT) RESIDUAL",
      unit: "°C",
      measColor: "var(--status-warning)",
      twinColor: "var(--surface-3)",
      tolerance: twinBaselines.tolerance.egt,
      baseline: twinBaselines.egt,
      measVal: currentMeas.egt,
      residualVal: currentResiduals.egt,
    },
    oil_pressure: {
      title: `OIL PRESSURE RESIDUAL (${unitPreference.toUpperCase()})`,
      unit: unitPreference,
      measColor: "var(--status-nominal)",
      twinColor: "var(--surface-3)",
      tolerance: twinBaselines.tolerance.oil_pressure,
      baseline: twinBaselines.oil_pressure,
      measVal: currentMeas.oil_pressure,
      residualVal: currentResiduals.oil_pressure,
    },
  }[selectedChannel];

  // Initialize or update Chart.js
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const theme = getThemeColors();
    const reducedMotion = prefersReducedMotion();

    const sliced = historyBuffer.slice(-30);
    const labels = sliced.map((p, i) => {
      if (p.timestamp) {
        return new Date(p.timestamp).toLocaleTimeString([], { hour12: false, minute: "2-digit", second: "2-digit" });
      }
      return `T-${30 - i}`;
    });

    const measData = sliced.map((p) => {
      if (selectedChannel === "cht") {
        return p.sensors?.cht?.value ?? p.cht_c ?? 142.0;
      }
      if (selectedChannel === "egt") {
        return p.sensors?.egt?.value ?? p.egt_c ?? 615.0;
      }
      return unitPreference === "bar"
        ? (p.sensors?.oil_pressure?.value ? p.sensors.oil_pressure.value / 14.5038 : (p.oil_pressure_bar ?? 4.69))
        : (p.sensors?.oil_pressure?.value ?? (p.oil_pressure_bar ? p.oil_pressure_bar * 14.5038 : 68.0));
    });

    // Digital twin simulation line with slight dynamic physics coupling
    const twinData = sliced.map((p) => {
      const base = channelConfig.baseline;
      // Small simulated physical dynamic fluctuation
      const rpmCoupling = ((p.sensors?.rpm?.value ?? p.rpm ?? 2450) - 2450) * 0.002;
      return base + rpmCoupling;
    });

    const upperTol = twinData.map((v) => v + channelConfig.tolerance);
    const lowerTol = twinData.map((v) => v - channelConfig.tolerance);

    // Event Annotations: Injected faults and alerts
    const annotations: Record<string, unknown> = {};

    // 1. Injected Fault Marker if active
    if (activeScenario && activeScenario !== "Normal") {
      annotations["injectedFaultMarker"] = {
        type: "line",
        xMin: labels[Math.max(0, labels.length - 8)],
        xMax: labels[Math.max(0, labels.length - 8)],
        borderColor: "var(--status-warning)",
        borderWidth: 2,
        borderDash: [5, 4],
        label: {
          display: true,
          content: `FAULT INJECTED: ${activeScenario.toUpperCase()}`,
          position: "start",
          color: "var(--status-warning)",
          backgroundColor: theme.tooltipBg,
          font: { family: "'JetBrains Mono', monospace", size: 8, weight: "bold" },
        },
      };
    }

    // 2. Alert Raised Marker if non-nominal alert exists
    const raisedAlert = (payload.alerts || []).find((a) => a.level === "ALERT" || a.level === "CAUTION");
    if (raisedAlert) {
      annotations["alertRaisedMarker"] = {
        type: "line",
        xMin: labels[Math.max(0, labels.length - 4)],
        xMax: labels[Math.max(0, labels.length - 4)],
        borderColor: "var(--status-caution)",
        borderWidth: 1.5,
        borderDash: [3, 3],
        label: {
          display: true,
          content: `ALERT RAISED: ${raisedAlert.title}`,
          position: "center",
          color: "var(--status-caution)",
          backgroundColor: theme.tooltipBg,
          font: { family: "'JetBrains Mono', monospace", size: 8 },
        },
      };
    }

    if (chartRef.current) {
      chartRef.current.data.labels = labels;
      chartRef.current.data.datasets[0].data = measData;
      chartRef.current.data.datasets[1].data = twinData;
      chartRef.current.data.datasets[2].data = upperTol;
      chartRef.current.data.datasets[3].data = lowerTol;
      chartRef.current.update("none");
      return;
    }

    const newChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Sensor Measured Value",
            data: measData,
            borderColor: channelConfig.measColor,
            borderWidth: 2.2,
            tension: 0.2,
            pointRadius: 2,
            pointBackgroundColor: channelConfig.measColor,
          },
          {
            label: "Physics Twin Nominal Expectation",
            data: twinData,
            borderColor: channelConfig.twinColor,
            borderDash: [6, 4],
            borderWidth: 2,
            tension: 0.1,
            pointRadius: 0,
          },
          {
            label: `Residual Tolerance (+${channelConfig.tolerance}${channelConfig.unit})`,
            data: upperTol,
            borderColor: "var(--surface-3)",
            borderDash: [2, 2],
            borderWidth: 1,
            backgroundColor: "var(--surface-3)",
            fill: "+1",
            pointRadius: 0,
          },
          {
            label: `Residual Tolerance (-${channelConfig.tolerance}${channelConfig.unit})`,
            data: lowerTol,
            borderColor: "var(--surface-3)",
            borderDash: [2, 2],
            borderWidth: 1,
            fill: false,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: reducedMotion ? false : { duration: 200 },
        plugins: {
          legend: {
            display: true,
            labels: {
              color: theme.textSecondary,
              font: { family: "'JetBrains Mono', monospace", size: 10 },
              boxWidth: 12,
              filter: (item) => item.text !== `Residual Tolerance (-${channelConfig.tolerance}${channelConfig.unit})`,
            },
          },
          annotation: {
            annotations: annotations as never,
          },
          tooltip: {
            mode: "index",
            intersect: false,
            backgroundColor: theme.tooltipBg,
            borderColor: theme.borderGlow,
            borderWidth: 1,
            titleFont: { family: "'JetBrains Mono', monospace", size: 11 },
            bodyFont: { family: "'JetBrains Mono', monospace", size: 10 },
          },
        },
        scales: {
          x: {
            grid: { color: theme.gridColor },
            ticks: {
              color: theme.textMuted,
              font: { family: "'JetBrains Mono', monospace", size: 9 },
              maxRotation: 0,
              maxTicksLimit: 6,
            },
          },
          y: {
            grid: { color: theme.gridColor },
            ticks: {
              color: theme.textMuted,
              font: { family: "'JetBrains Mono', monospace", size: 9 },
            },
          },
        },
      },
    });

    chartRef.current = newChart;

    return () => {
      newChart.destroy();
      chartRef.current = null;
    };
  }, [historyBuffer, selectedChannel, unitPreference, activeScenario, channelConfig, payload.alerts, theme]);

  const isExceeded = Math.abs(channelConfig.residualVal) > channelConfig.tolerance;

  return (
    <div className="panel digital-twin-residual-panel" style={{ display: "flex", flexDirection: "column", gap: "0.85rem", height: "100%" }}>
      {/* Top Header Strip */}
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Cpu size={15} style={{ color: "var(--surface-3)" }} />
          <span className="panel-title">
            <strong>DIGITAL TWIN VS MEASURED RESIDUAL OVERLAY</strong>
          </span>
          <span
            style={{
              fontSize: "0.62rem",
              fontFamily: "var(--font-mono), monospace",
              background: "var(--surface-3)",
              color: "var(--surface-3)",
              border: "1px solid var(--surface-3)",
              padding: "0.15rem 0.45rem",
              borderRadius: "4px",
            }}
          >
            ANALYTICAL RESIDUAL r(t) = y_meas - y_twin
          </span>
        </div>

        {/* Channel Switcher Buttons */}
        <div style={{ display: "flex", gap: "0.35rem" }} role="tablist" aria-label="Residual channel selector">
          {(["cht", "egt", "oil_pressure"] as const).map((ch) => (
            <button
              key={ch}
              role="tab"
              aria-selected={selectedChannel === ch}
              onClick={() => setSelectedChannel(ch)}
              className={`filter-pill-btn ${selectedChannel === ch ? "active" : ""}`}
              style={{
                fontSize: "0.66rem",
                padding: "0.2rem 0.55rem",
                fontWeight: 700,
                background: selectedChannel === ch ? "var(--surface-3)" : "var(--border)",
                color: selectedChannel === ch ? "var(--text)" : "var(--text-muted)",
                border: `1px solid ${selectedChannel === ch ? "var(--surface-3)" : "var(--border)"}`,
                borderRadius: "4px",
                fontFamily: "var(--font-mono), monospace",
                cursor: "pointer",
              }}
            >
              {ch === "cht" ? "CHT (°C)" : ch === "egt" ? "EGT (°C)" : `OIL PRESS (${unitPreference.toUpperCase()})`}
            </button>
          ))}
        </div>
      </div>

      {/* Residual Analytics Metric Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.5rem",
          background: "var(--bg)",
          padding: "0.6rem 0.85rem",
          borderRadius: "6px",
          border: "1px solid var(--border)",
        }}
      >
        <div>
          <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}>MEASURED y_meas</div>
          <div style={{ fontSize: "1.05rem", fontWeight: 800, color: channelConfig.measColor }} className="font-mono">
            {fmt(channelConfig.measVal, 1)} {channelConfig.unit}
          </div>
        </div>

        <div>
          <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}>TWIN MODEL y_twin</div>
          <div style={{ fontSize: "1.05rem", fontWeight: 800, color: channelConfig.twinColor }} className="font-mono">
            {fmt(channelConfig.baseline, 1)} {channelConfig.unit}
          </div>
        </div>

        <div>
          <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}>RESIDUAL r(t) = Δy</div>
          <div
            style={{
              fontSize: "1.05rem",
              fontWeight: 800,
              color: isExceeded ? "var(--status-warning)" : "var(--status-nominal)",
            }}
            className="font-mono"
          >
            {channelConfig.residualVal >= 0 ? "+" : ""}{fmt(channelConfig.residualVal, 1)} {channelConfig.unit}
          </div>
        </div>

        <div>
          <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}>CORRIDOR STATUS</div>
          <div style={{ marginTop: "0.15rem" }}>
            {isExceeded ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  fontSize: "0.68rem",
                  color: "var(--status-warning)",
                  fontWeight: 800,
                  fontFamily: "var(--font-mono), monospace",
                }}
              >
                <AlertTriangle size={12} /> DIVERGENT (&gt; ±{channelConfig.tolerance})
              </span>
            ) : (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  fontSize: "0.68rem",
                  color: "var(--status-nominal)",
                  fontWeight: 800,
                  fontFamily: "var(--font-mono), monospace",
                }}
              >
                <CheckCircle2 size={12} /> WITHIN ±{channelConfig.tolerance} BAND
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div style={{ flex: 1, minHeight: "220px", position: "relative" }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
