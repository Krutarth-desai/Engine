"use client";

import React, { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { TrajectoryPoint } from "../types/telemetry";
import { RUL_ZONES } from "@/lib/limits";
import { getThemeColors } from "@/lib/chartTheme";
import { useTheme } from "@/context/ThemeContext";

Chart.register(...registerables, annotationPlugin);

interface RulTrajectoryChartProps {
  trajectory: TrajectoryPoint[];
  currentCycle: number;
  currentActualRul: number;
  currentPredictedRul: number;
  modelMae?: number;
}

export default function RulTrajectoryChart({
  trajectory,
  currentCycle,
  currentActualRul,
  currentPredictedRul,
  modelMae = 10.08,
}: RulTrajectoryChartProps) {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const currentThemeRef = useRef<string>(theme);

  useEffect(() => {
    if (!canvasRef.current) return;

    const labels = trajectory.map((pt) => `C${pt.cycle}`);
    const actualData = trajectory.map((pt, idx) =>
      idx === trajectory.length - 1 ? currentActualRul : pt.actual_rul
    );
    const predictedData = trajectory.map((pt, idx) =>
      idx === trajectory.length - 1 ? currentPredictedRul : pt.predicted_rul
    );

    // Confidence bands (± MAE)
    const upperMae = predictedData.map((v) => (v !== null ? v + modelMae : null));
    const lowerMae = predictedData.map((v) => (v !== null ? Math.max(0, v - modelMae) : null));

    if (chartInstanceRef.current && currentThemeRef.current === theme) {
      chartInstanceRef.current.data.labels = labels;
      chartInstanceRef.current.data.datasets[0].data = actualData;
      chartInstanceRef.current.data.datasets[1].data = predictedData;
      chartInstanceRef.current.data.datasets[2].data = upperMae;
      chartInstanceRef.current.data.datasets[3].data = lowerMae;
      chartInstanceRef.current.update("none");
      return;
    }

    currentThemeRef.current = theme;
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const themeColors = getThemeColors();

    chartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Ground Truth (Replay)",
            data: actualData,
            borderColor: "var(--status-nominal)", // Emerald Green
            backgroundColor: "transparent",
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.1,
          },
          {
            label: `LSTM Predicted RUL (${currentPredictedRul.toFixed(1)} ± ${Math.round(modelMae)})`,
            data: predictedData,
            borderColor: "var(--accent)", // Sky Blue
            borderDash: [5, 4],
            backgroundColor: "transparent",
            borderWidth: 2,
            pointRadius: (context) => (context.dataIndex === actualData.length - 1 ? 6 : 0),
            pointBackgroundColor: "var(--accent)",
            pointBorderColor: "var(--text)",
            pointBorderWidth: 2,
            tension: 0.2,
          },
          {
            label: `± MAE Envelope (${modelMae.toFixed(1)} cyc)`,
            data: upperMae,
            borderColor: "transparent",
            backgroundColor: "var(--border)",
            fill: "+1",
            pointRadius: 0,
            tension: 0.2,
          },
          {
            label: "Lower MAE Bound",
            data: lowerMae,
            borderColor: "transparent",
            backgroundColor: "transparent",
            pointRadius: 0,
            tension: 0.2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              color: themeColors.textSecondary,
              font: { family: "'JetBrains Mono', monospace", size: 10 },
              boxWidth: 14,
              filter: (item) => item.text !== "Lower MAE Bound",
            },
          },
          annotation: {
            annotations: {
              // Healthy Zone Band (125 - 250)
              healthyZone: {
                type: "box",
                yMin: RUL_ZONES.HEALTHY.minCycles,
                yMax: RUL_ZONES.HEALTHY.maxCycles,
                backgroundColor: "var(--surface-1)",
                borderWidth: 0,
              },
              // Degrading Zone Band (50 - 125)
              degradingZone: {
                type: "box",
                yMin: RUL_ZONES.DEGRADING.minCycles,
                yMax: RUL_ZONES.DEGRADING.maxCycles,
                backgroundColor: "color-mix(in srgb, var(--status-caution) 14%, var(--surface-1))",
                borderWidth: 0,
              },
              // Critical Zone Band (15 - 50)
              criticalZone: {
                type: "box",
                yMin: RUL_ZONES.CRITICAL.minCycles,
                yMax: RUL_ZONES.CRITICAL.maxCycles,
                backgroundColor: "color-mix(in srgb, var(--status-caution) 14%, var(--surface-1))",
                borderWidth: 0,
              },
              // Failure Threshold Zone Band (0 - 15)
              failureZone: {
                type: "box",
                yMin: RUL_ZONES.FAILURE.minCycles,
                yMax: RUL_ZONES.FAILURE.maxCycles,
                backgroundColor: "color-mix(in srgb, var(--status-warning) 14%, var(--surface-1))",
                borderWidth: 0,
              },
              // Failure Limit Line
              failureLimit: {
                type: "line",
                yMin: 15,
                yMax: 15,
                borderColor: "color-mix(in srgb, var(--status-warning) 14%, var(--surface-1))",
                borderWidth: 1,
                borderDash: [3, 3],
                label: {
                  display: true,
                  content: "FAILURE THRESHOLD (15 CYCLES)",
                  position: "start",
                  color: "var(--status-warning)",
                  backgroundColor: themeColors.tooltipBg,
                  font: { family: "'JetBrains Mono', monospace", size: 8 },
                },
              },
            },
          },
          tooltip: {
            backgroundColor: themeColors.tooltipBg,
            titleColor: "var(--accent)",
            bodyColor: "var(--text)",
            borderColor: themeColors.borderGlow,
            borderWidth: 1,
            padding: 8,
            titleFont: { family: "'JetBrains Mono', monospace", weight: "bold" },
            bodyFont: { family: "'JetBrains Mono', monospace" },
          },
        },
        scales: {
          x: {
            grid: { color: themeColors.gridColor },
            ticks: {
              color: themeColors.textMuted,
              font: { family: "'JetBrains Mono', monospace", size: 9 },
              maxTicksLimit: 12,
            },
            title: {
              display: true,
              text: "OPERATING FLIGHT CYCLES (30-CYCLE LSTM SLIDING WINDOW)",
              color: themeColors.textMuted,
              font: { size: 9, family: "'JetBrains Mono', monospace" },
            },
          },
          y: {
            min: 0,
            max: 250,
            grid: { color: themeColors.gridColor },
            ticks: {
              color: themeColors.textMuted,
              font: { family: "'JetBrains Mono', monospace", size: 9 },
              stepSize: 50,
            },
            title: {
              display: true,
              text: "REMAINING USEFUL LIFE (CYCLES)",
              color: themeColors.textMuted,
              font: { size: 9, family: "'JetBrains Mono', monospace" },
            },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [trajectory, currentActualRul, currentPredictedRul, modelMae, currentCycle, theme]);

  return (
    <div className="panel rul-trajectory-panel" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="panel-title">
          <strong>ACTUAL VS PREDICTED RUL TRAJECTORY (WITH ZONES &amp; CONFIDENCE BAND)</strong>
        </div>
        <div className="trajectory-current-badge font-mono" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.68rem" }}>
          <span>CURRENT: CYCLE {currentCycle}</span>
          <span style={{ color: "var(--text-muted)" }}>•</span>
          <span className="text-cyan font-bold">RUL: {currentPredictedRul.toFixed(1)} ± {Math.round(modelMae)}</span>
          <span style={{ color: "var(--text-muted)" }}>•</span>
          <span className="text-green">REPLAY REF: {currentActualRul.toFixed(1)}</span>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: "260px", position: "relative" }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
