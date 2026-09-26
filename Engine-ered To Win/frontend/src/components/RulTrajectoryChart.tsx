"use client";

import React, { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { TrajectoryPoint } from "../types/telemetry";
import { RUL_ZONES } from "@/lib/limits";
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
      chartInstanceRef.current.data.datasets[1].label = `LSTM Predicted RUL (${currentPredictedRul.toFixed(1)} ± ${Math.round(modelMae)})`;
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

    const isLight = theme === "light";

    // Chart Data Colors (concrete hex / rgba values compatible with HTML5 Canvas 2D)
    const groundTruthColor = isLight ? "#15803D" : "#5BA872";
    const lstmColor = isLight ? "#0284C7" : "#38BDF8";
    const maeEnvelopeColor = isLight ? "rgba(2, 132, 199, 0.16)" : "rgba(56, 189, 248, 0.18)";
    const lstmPointBorder = isLight ? "#FFFFFF" : "#0B192C";

    // Zone Background Bands (soft translucent RGBA tints for 2D Canvas)
    const healthyZoneBg = isLight ? "rgba(21, 128, 61, 0.05)" : "rgba(91, 168, 114, 0.06)";
    const degradingZoneBg = isLight ? "rgba(180, 83, 9, 0.06)" : "rgba(227, 165, 58, 0.07)";
    const criticalZoneBg = isLight ? "rgba(185, 28, 28, 0.08)" : "rgba(235, 95, 87, 0.09)";
    const failureZoneBg = isLight ? "rgba(185, 28, 28, 0.15)" : "rgba(235, 95, 87, 0.18)";

    const failureLimitColor = isLight ? "#B91C1C" : "#EB5F57";
    const failureLabelBg = isLight ? "#FFFFFF" : "#1E2026";
    const failureLabelColor = isLight ? "#B91C1C" : "#EB5F57";

    const gridColor = isLight ? "rgba(200, 220, 240, 0.6)" : "rgba(43, 45, 55, 0.6)";
    const textColor = isLight ? "#0B192C" : "#F0EFF4";
    const textMuted = isLight ? "#3B536E" : "#ACB0BD";
    const tooltipBg = isLight ? "#FFFFFF" : "#15161A";
    const tooltipBorder = isLight ? "#96C0E6" : "#3F4350";

    chartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Ground Truth (Replay)",
            data: actualData,
            borderColor: groundTruthColor,
            backgroundColor: "transparent",
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.1,
          },
          {
            label: `LSTM Predicted RUL (${currentPredictedRul.toFixed(1)} ± ${Math.round(modelMae)})`,
            data: predictedData,
            borderColor: lstmColor,
            borderDash: [5, 4],
            backgroundColor: "transparent",
            borderWidth: 2,
            pointRadius: (context) => (context.dataIndex === actualData.length - 1 ? 6 : 0),
            pointBackgroundColor: lstmColor,
            pointBorderColor: lstmPointBorder,
            pointBorderWidth: 2,
            tension: 0.2,
          },
          {
            label: `± MAE Envelope (${modelMae.toFixed(1)} cyc)`,
            data: upperMae,
            borderColor: "transparent",
            backgroundColor: maeEnvelopeColor,
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
              color: textMuted,
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
                drawTime: "beforeDatasetsDraw",
                yMin: RUL_ZONES.HEALTHY.minCycles,
                yMax: RUL_ZONES.HEALTHY.maxCycles,
                backgroundColor: healthyZoneBg,
                borderWidth: 0,
              },
              // Degrading Zone Band (50 - 125)
              degradingZone: {
                type: "box",
                drawTime: "beforeDatasetsDraw",
                yMin: RUL_ZONES.DEGRADING.minCycles,
                yMax: RUL_ZONES.DEGRADING.maxCycles,
                backgroundColor: degradingZoneBg,
                borderWidth: 0,
              },
              // Critical Zone Band (15 - 50)
              criticalZone: {
                type: "box",
                drawTime: "beforeDatasetsDraw",
                yMin: RUL_ZONES.CRITICAL.minCycles,
                yMax: RUL_ZONES.CRITICAL.maxCycles,
                backgroundColor: criticalZoneBg,
                borderWidth: 0,
              },
              // Failure Threshold Zone Band (0 - 15)
              failureZone: {
                type: "box",
                drawTime: "beforeDatasetsDraw",
                yMin: RUL_ZONES.FAILURE.minCycles,
                yMax: RUL_ZONES.FAILURE.maxCycles,
                backgroundColor: failureZoneBg,
                borderWidth: 0,
              },
              // Failure Limit Line
              failureLimit: {
                type: "line",
                drawTime: "afterDatasetsDraw",
                yMin: 15,
                yMax: 15,
                borderColor: failureLimitColor,
                borderWidth: 1.5,
                borderDash: [4, 4],
                label: {
                  display: true,
                  content: "FAILURE THRESHOLD (15 CYCLES)",
                  position: "start",
                  color: failureLabelColor,
                  backgroundColor: failureLabelBg,
                  borderColor: failureLimitColor,
                  borderWidth: 1,
                  borderRadius: 4,
                  padding: 4,
                  font: { family: "'JetBrains Mono', monospace", size: 8, weight: "bold" },
                },
              },
            },
          },
          tooltip: {
            backgroundColor: tooltipBg,
            titleColor: lstmColor,
            bodyColor: textColor,
            borderColor: tooltipBorder,
            borderWidth: 1,
            padding: 8,
            titleFont: { family: "'JetBrains Mono', monospace", weight: "bold" },
            bodyFont: { family: "'JetBrains Mono', monospace" },
          },
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: {
              color: textMuted,
              font: { family: "'JetBrains Mono', monospace", size: 9 },
              maxTicksLimit: 12,
            },
            title: {
              display: true,
              text: "OPERATING FLIGHT CYCLES (30-CYCLE LSTM SLIDING WINDOW)",
              color: textMuted,
              font: { size: 9, family: "'JetBrains Mono', monospace" },
            },
          },
          y: {
            min: 0,
            max: 250,
            grid: { color: gridColor },
            ticks: {
              color: textMuted,
              font: { family: "'JetBrains Mono', monospace", size: 9 },
              stepSize: 50,
            },
            title: {
              display: true,
              text: "REMAINING USEFUL LIFE (CYCLES)",
              color: textMuted,
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
