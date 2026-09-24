"use client";

import React, { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { useTelemetry } from "@/context/TelemetryContext";

Chart.register(...registerables);

interface ParamMeta {
  key: string;
  name: string;
  unit: string;
  actualColor: string;
  expectedColor: string;
  decimals: number;
}

const COMPARISON_PARAMS: ParamMeta[] = [
  { key: "cht_c", name: "CHT (Cylinder Head)", unit: "°C", actualColor: "#ef4444", expectedColor: "#38bdf8", decimals: 1 },
  { key: "egt_c", name: "EGT (Exhaust Gas)", unit: "°C", actualColor: "#f97316", expectedColor: "#38bdf8", decimals: 1 },
  { key: "oil_pressure_bar", name: "Oil Pressure", unit: "bar", actualColor: "#10b981", expectedColor: "#38bdf8", decimals: 2 },
  { key: "oil_temperature_c", name: "Oil Temp", unit: "°C", actualColor: "#f59e0b", expectedColor: "#38bdf8", decimals: 1 },
  { key: "rpm", name: "Engine RPM", unit: "RPM", actualColor: "#a855f7", expectedColor: "#38bdf8", decimals: 0 },
  { key: "fuel_flow_lh", name: "Fuel Flow", unit: "L/h", actualColor: "#06b6d4", expectedColor: "#38bdf8", decimals: 1 },
  { key: "vibration_g", name: "Vibration", unit: "g", actualColor: "#ec4899", expectedColor: "#38bdf8", decimals: 3 },
  { key: "battery_voltage_v", name: "Bus Voltage", unit: "V", actualColor: "#14b8a6", expectedColor: "#38bdf8", decimals: 1 },
];

export default function ActualVsExpectedChart() {
  const { telemetry, expectedState, isConnected } = useTelemetry();
  const [selectedParamKey, setSelectedParamKey] = useState<string>("cht_c");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  // Rolling history for selected parameter (up to 40 seconds)
  const historyActualRef = useRef<number[]>([]);
  const historyExpectedRef = useRef<number[]>([]);
  const historyLabelsRef = useRef<string[]>([]);

  const activeParam = COMPARISON_PARAMS.find((p) => p.key === selectedParamKey) || COMPARISON_PARAMS[0];

  // Extract actual and expected values
  const currentActual = (telemetry as any)[activeParam.key] ?? null;
  const currentExpected = expectedState ? expectedState[activeParam.key] ?? null : null;

  // Reset rolling buffers when selected parameter changes
  useEffect(() => {
    historyActualRef.current = [];
    historyExpectedRef.current = [];
    historyLabelsRef.current = [];
    if (chartRef.current) {
      chartRef.current.data.labels = [];
      chartRef.current.data.datasets[0].data = [];
      chartRef.current.data.datasets[1].data = [];
      chartRef.current.data.datasets[0].label = `Actual ${activeParam.name} (${activeParam.unit})`;
      chartRef.current.data.datasets[0].borderColor = activeParam.actualColor;
      chartRef.current.update("none");
    }
  }, [selectedParamKey, activeParam]);

  // Initialize Chart.js
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: historyLabelsRef.current,
        datasets: [
          {
            label: `Actual ${activeParam.name} (${activeParam.unit})`,
            data: historyActualRef.current,
            borderColor: activeParam.actualColor,
            backgroundColor: `${activeParam.actualColor}15`,
            fill: true,
            tension: 0.25,
            borderWidth: 2.5,
            pointRadius: 0,
          },
          {
            label: `Digital Twin Expected (${activeParam.unit})`,
            data: historyExpectedRef.current,
            borderColor: "#38bdf8",
            borderDash: [5, 4],
            backgroundColor: "transparent",
            fill: false,
            tension: 0.2,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              color: "#94a3b8",
              font: { family: "Inter, sans-serif", size: 11 },
              boxWidth: 16,
              usePointStyle: true,
            },
          },
          tooltip: {
            backgroundColor: "rgba(14, 21, 38, 0.95)",
            borderColor: "rgba(56, 189, 248, 0.3)",
            borderWidth: 1,
            titleColor: "#f8fafc",
            bodyColor: "#94a3b8",
            titleFont: { family: "JetBrains Mono, monospace" },
            bodyFont: { family: "JetBrains Mono, monospace" },
          },
        },
        scales: {
          x: {
            display: true,
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: {
              color: "#64748b",
              font: { family: "JetBrains Mono, monospace", size: 9 },
              maxRotation: 0,
              maxTicksLimit: 6,
            },
          },
          y: {
            display: true,
            grid: { color: "rgba(255, 255, 255, 0.06)" },
            ticks: {
              color: "#94a3b8",
              font: { family: "JetBrains Mono, monospace", size: 10 },
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  // Append new sample on tick
  useEffect(() => {
    if (!isConnected || currentActual == null || !chartRef.current) return;

    const timeLabel = new Date().toLocaleTimeString([], { hour12: false, minute: "2-digit", second: "2-digit" });
    const expectedVal = currentExpected != null ? currentExpected : currentActual;

    historyLabelsRef.current.push(timeLabel);
    historyActualRef.current.push(Number(currentActual));
    historyExpectedRef.current.push(Number(expectedVal));

    if (historyLabelsRef.current.length > 35) {
      historyLabelsRef.current.shift();
      historyActualRef.current.shift();
      historyExpectedRef.current.shift();
    }

    chartRef.current.data.labels = historyLabelsRef.current;
    chartRef.current.data.datasets[0].data = historyActualRef.current;
    chartRef.current.data.datasets[1].data = historyExpectedRef.current;
    chartRef.current.update("none");
  }, [telemetry, expectedState, isConnected, currentActual, currentExpected]);

  // Compute live residual and % deviation
  const liveResidual =
    currentActual != null && currentExpected != null ? currentActual - currentExpected : null;
  const livePctDev =
    currentActual != null && currentExpected != null && Math.abs(currentExpected) > 0.001
      ? (liveResidual! / currentExpected) * 100
      : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      {/* Parameter Selector Pills & Current Readouts */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginBottom: "0.75rem",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
          {COMPARISON_PARAMS.map((param) => {
            const isSelected = param.key === selectedParamKey;
            return (
              <button
                key={param.key}
                onClick={() => setSelectedParamKey(param.key)}
                style={{
                  background: isSelected ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.03)",
                  border: `1px solid ${isSelected ? "var(--accent-cyan, #38bdf8)" : "rgba(255, 255, 255, 0.08)"}`,
                  color: isSelected ? "#38bdf8" : "#94a3b8",
                  padding: "0.25rem 0.55rem",
                  borderRadius: "4px",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {param.name.split(" ")[0]}
              </button>
            );
          })}
        </div>

        {/* Real-time Comparison Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "rgba(0, 0, 0, 0.3)",
              padding: "0.25rem 0.6rem",
              borderRadius: "4px",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              fontSize: "0.72rem",
            }}
          >
            <span style={{ color: "var(--text-muted, #64748b)" }}>Actual:</span>
            <span style={{ color: activeParam.actualColor, fontWeight: 800, fontFamily: "var(--font-mono, monospace)" }}>
              {currentActual != null ? Number(currentActual).toFixed(activeParam.decimals) : "—"} {activeParam.unit}
            </span>
            <span style={{ color: "var(--text-muted, #64748b)", margin: "0 0.2rem" }}>vs</span>
            <span style={{ color: "var(--text-muted, #64748b)" }}>Expected:</span>
            <span style={{ color: "#38bdf8", fontWeight: 800, fontFamily: "var(--font-mono, monospace)" }}>
              {currentExpected != null ? Number(currentExpected).toFixed(activeParam.decimals) : "—"} {activeParam.unit}
            </span>
          </div>

          {livePctDev != null && (
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 800,
                fontFamily: "var(--font-mono, monospace)",
                padding: "0.25rem 0.5rem",
                borderRadius: "4px",
                background: Math.abs(livePctDev) > 8 ? "rgba(239, 68, 68, 0.2)" : Math.abs(livePctDev) > 4 ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.2)",
                color: Math.abs(livePctDev) > 8 ? "#ef4444" : Math.abs(livePctDev) > 4 ? "#f59e0b" : "#10b981",
                border: `1px solid ${Math.abs(livePctDev) > 8 ? "#ef444455" : Math.abs(livePctDev) > 4 ? "#f59e0b55" : "#10b98155"}`,
              }}
            >
              Δ {livePctDev > 0 ? `+${livePctDev.toFixed(1)}` : livePctDev.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* Chart Canvas (Fixed Size to Prevent Layout Resizing Loops) */}
      <div style={{ width: "100%", height: "260px", minHeight: "260px", maxHeight: "260px", position: "relative" }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
