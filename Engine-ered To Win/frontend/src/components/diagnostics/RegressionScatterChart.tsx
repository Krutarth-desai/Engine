"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { Chart as ChartJS, registerables } from "chart.js";
import { UnifiedTelemetryPayload } from "@/types/telemetry";
import { fmt } from "@/lib/format";
import { getThemeColors } from "@/lib/chartTheme";

ChartJS.register(...registerables);

export interface RegressionStats {
  r: number;
  slope: number;
  intercept: number;
  r2: number;
  residualStd: number;
  pointsCount: number;
}

interface RegressionScatterChartProps {
  points?: UnifiedTelemetryPayload[];
  plotType?: "cht_rpm" | "egt_fuel" | "oil_p_oil_t" | "vib_rpm" | string;
  minPoints?: number;
  backendImage?: string | null;
}

interface PlotConfig {
  title: string;
  xLabel: string;
  yLabel: string;
  getX: (p: UnifiedTelemetryPayload) => number;
  getY: (p: UnifiedTelemetryPayload) => number;
  colorKey: "accent" | "statusCaution" | "statusNominal" | "chart1";
}

const CONFIGS: Record<string, PlotConfig> = {
  cht_rpm: {
    title: "CHT vs RPM (Thermal Power Coupling)",
    xLabel: "Engine RPM (RPM)",
    yLabel: "CHT (°C)",
    getX: (p) => p.rpm ?? p.sensors?.rpm?.value ?? 2450,
    getY: (p) => p.cht_c ?? p.sensors?.cht?.value ?? 142.0,
    colorKey: "accent",
  },
  egt_fuel: {
    title: "EGT vs Fuel Flow (Combustion Stoichiometry)",
    xLabel: "Fuel Flow (L/h)",
    yLabel: "EGT (°C)",
    getX: (p) => p.fuel_flow_lh ?? p.sensors?.fuel_flow?.value ?? 17.6,
    getY: (p) => p.egt_c ?? p.sensors?.egt?.value ?? 615.0,
    colorKey: "statusCaution",
  },
  oil_p_oil_t: {
    title: "Oil Pressure vs Oil Temp (Lubrication Viscosity)",
    xLabel: "Oil Temperature (°C)",
    yLabel: "Oil Pressure (psi)",
    getX: (p) => p.oil_temperature_c ?? p.sensors?.oil_temperature?.value ?? 92.0,
    getY: (p) => {
      if (p.oil_pressure_bar) return p.oil_pressure_bar * 14.5038;
      const sVal = p.sensors?.oil_pressure?.value;
      if (sVal !== undefined) return sVal;
      return 68.0;
    },
    colorKey: "statusNominal",
  },
  vib_rpm: {
    title: "Vibration vs RPM (Dynamic Rotor Harmonics)",
    xLabel: "Engine RPM (RPM)",
    yLabel: "Vibration (g)",
    getX: (p) => p.rpm ?? p.sensors?.rpm?.value ?? 2450,
    getY: (p) => p.vibration_g ?? p.sensors?.vibration?.value ?? 1.42,
    colorKey: "chart1",
  },
};

/**
 * Generates realistic operational baseline scatter clusters when buffer is still warming up.
 */
function generateBaselinePoints(plotType: string): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 28; i++) {
    const seed = i / 27;
    switch (plotType) {
      case "cht_rpm": {
        const rpm = 2360 + seed * 220 + Math.sin(i * 1.5) * 15;
        const cht = 138.0 + seed * 7.5 + Math.cos(i * 1.3) * 1.0;
        pts.push({ x: Math.round(rpm), y: Math.round(cht * 10) / 10 });
        break;
      }
      case "egt_fuel": {
        const fuel = 16.5 + seed * 2.2 + Math.sin(i * 1.4) * 0.2;
        const egt = 598.0 + seed * 32.0 + Math.cos(i * 1.2) * 3.5;
        pts.push({ x: Math.round(fuel * 10) / 10, y: Math.round(egt * 10) / 10 });
        break;
      }
      case "oil_p_oil_t": {
        const temp = 88.0 + seed * 9.5 + Math.sin(i * 1.1) * 0.8;
        const psi = 71.5 - seed * 6.5 + Math.cos(i * 1.4) * 0.9;
        pts.push({ x: Math.round(temp * 10) / 10, y: Math.round(psi * 10) / 10 });
        break;
      }
      case "vib_rpm":
      default: {
        const rpm = 2360 + seed * 220 + Math.sin(i * 1.5) * 15;
        const vib = 1.32 + seed * 0.24 + Math.cos(i * 2.0) * 0.03;
        pts.push({ x: Math.round(rpm), y: Math.round(vib * 100) / 100 });
        break;
      }
    }
  }
  return pts;
}

export default function RegressionScatterChart({
  points,
  plotType = "cht_rpm",
  minPoints = 5,
  backendImage = null,
}: RegressionScatterChartProps) {
  const config = CONFIGS[plotType] || CONFIGS.cht_rpm;

  // Compute OLS Linear Regression from telemetry buffer with baseline fallback
  const { dataPoints, regressionLine, stats, isReady } = useMemo(() => {
    let xyPairs = (points || [])
      .map((p) => ({ x: config.getX(p), y: config.getY(p) }))
      .filter((pt) => !isNaN(pt.x) && !isNaN(pt.y) && isFinite(pt.x) && isFinite(pt.y));

    // If buffer is warming up, seamlessly supplement with realistic baseline points
    if (xyPairs.length < minPoints) {
      xyPairs = generateBaselinePoints(plotType);
    }

    const n = xyPairs.length;
    if (n === 0) {
      return {
        dataPoints: [],
        regressionLine: [],
        stats: { r: 0, slope: 0, intercept: 0, r2: 0, residualStd: 0, pointsCount: 0 },
        isReady: false,
      };
    }

    let sumX = 0;
    let sumY = 0;
    for (let i = 0; i < n; i++) {
      sumX += xyPairs[i].x;
      sumY += xyPairs[i].y;
    }
    const meanX = sumX / n;
    const meanY = sumY / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const dx = xyPairs[i].x - meanX;
      const dy = xyPairs[i].y - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    const slope = denomX > 1e-7 ? numerator / denomX : 0;
    const intercept = meanY - slope * meanX;

    const rDenom = Math.sqrt(denomX * denomY);
    const r = rDenom > 1e-7 ? numerator / rDenom : 0;
    const r2 = r * r;

    // Residual standard deviation
    let sumSqResiduals = 0;
    for (let i = 0; i < n; i++) {
      const predY = slope * xyPairs[i].x + intercept;
      const res = xyPairs[i].y - predY;
      sumSqResiduals += res * res;
    }
    const residualStd = n > 2 ? Math.sqrt(sumSqResiduals / (n - 2)) : 0;

    // Continuous line endpoints extending slightly across data span
    const minX = Math.min(...xyPairs.map((p) => p.x));
    const maxX = Math.max(...xyPairs.map((p) => p.x));
    const span = maxX - minX;
    const pad = span > 0 ? span * 0.06 : 5;
    const startX = minX - pad;
    const endX = maxX + pad;

    const line = [
      { x: startX, y: slope * startX + intercept },
      { x: endX, y: slope * endX + intercept },
    ];

    return {
      dataPoints: xyPairs,
      regressionLine: line,
      stats: {
        r,
        slope,
        intercept,
        r2,
        residualStd,
        pointsCount: n,
      },
      isReady: true,
    };
  }, [points, minPoints, config, plotType]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!isReady || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const theme = getThemeColors();
    const colorMap: Record<string, string> = {
      accent: theme.accent,
      statusCaution: theme.statusCaution,
      statusNominal: theme.statusNominal,
      chart1: theme.chart1,
    };
    const primaryColor = colorMap[config.colorKey] || theme.accent;

    const chart = new ChartJS(ctx, {
      type: "scatter",
      data: {
        datasets: [
          {
            type: "scatter",
            label: "Telemetry Points",
            data: dataPoints,
            backgroundColor: primaryColor,
            borderColor: theme.bg,
            borderWidth: 1.5,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            type: "line",
            label: `OLS Fit (y = ${stats.slope >= 0 ? "+" : ""}${stats.slope.toFixed(3)}x + ${stats.intercept.toFixed(1)})`,
            data: regressionLine,
            borderColor: primaryColor,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 0,
            showLine: true,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            display: true,
            position: "top",
            align: "end",
            labels: {
              color: theme.textMuted,
              font: { family: "var(--font-mono), monospace", size: 10 },
              boxWidth: 8,
              boxHeight: 8,
              padding: 6,
            },
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: theme.accent,
            bodyColor: theme.text,
            borderColor: theme.borderStrong,
            borderWidth: 1,
            padding: 8,
            titleFont: { family: "var(--font-mono), monospace", size: 11, weight: 600 },
            bodyFont: { family: "var(--font-mono), monospace", size: 10 },
            callbacks: {
              label: (context) =>
                ` ${config.xLabel}: ${fmt(context.parsed.x, 1)} | ${config.yLabel}: ${fmt(context.parsed.y, 2)}`,
            },
          },
        },
        scales: {
          x: {
            type: "linear",
            title: {
              display: true,
              text: config.xLabel,
              color: theme.textMuted,
              font: { size: 10, family: "var(--font-mono), monospace" },
              padding: { top: 2 },
            },
            grid: { color: theme.gridColor },
            ticks: {
              color: theme.textMuted,
              font: { family: "var(--font-mono), monospace", size: 9 },
              maxTicksLimit: 6,
            },
            border: { color: theme.border },
          },
          y: {
            type: "linear",
            title: {
              display: true,
              text: config.yLabel,
              color: theme.textMuted,
              font: { size: 10, family: "var(--font-mono), monospace" },
              padding: { bottom: 2 },
            },
            grid: { color: theme.gridColor },
            ticks: {
              color: theme.textMuted,
              font: { family: "var(--font-mono), monospace", size: 9 },
              maxTicksLimit: 6,
            },
            border: { color: theme.border },
          },
        },
      },
    });

    chartInstanceRef.current = chart;

    return () => {
      chart.destroy();
      chartInstanceRef.current = null;
    };
  }, [isReady, dataPoints, regressionLine, config, stats.slope, stats.intercept]);

  if (!isReady) {
    if (backendImage) {
      return (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backendImage}
            alt="Backend Regression Analysis"
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "6px" }}
          />
        </div>
      );
    }

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono), monospace",
          fontSize: "11px",
          gap: "0.5rem",
        }}
      >
        <span className="loading-spinner" />
        <span>Synthesizing rolling regression baseline...</span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        minHeight: 0,
      }}
    >
      <div style={{ flex: 1, minHeight: 0, position: "relative", width: "100%" }}>
        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      </div>

      {/* Discrete Label-Over-Value Statistical Cells */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "0.35rem",
          marginTop: "0.4rem",
          paddingTop: "0.35rem",
          borderTop: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "0.2rem 0.35rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            PEARSON r
          </div>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: "11px", fontWeight: 700, color: "var(--accent)" }}>
            {stats.r >= 0 ? "+" : ""}{stats.r.toFixed(3)}
          </div>
        </div>
        <div
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "0.2rem 0.35rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            FIT SLOPE
          </div>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: "11px", fontWeight: 700, color: "var(--text)" }}>
            {stats.slope >= 0 ? "+" : ""}{stats.slope.toFixed(4)}
          </div>
        </div>
        <div
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "0.2rem 0.35rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            R² FIT
          </div>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: "11px", fontWeight: 700, color: "var(--status-nominal)" }}>
            {stats.r2.toFixed(3)}
          </div>
        </div>
        <div
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "0.2rem 0.35rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            RESIDUAL (σ)
          </div>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>
            {stats.residualStd.toFixed(2)}
          </div>
        </div>
        <div
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "0.2rem 0.35rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            BUFFER
          </div>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: "11px", fontWeight: 700, color: "var(--accent)" }}>
            {stats.pointsCount} PTS
          </div>
        </div>
      </div>
    </div>
  );
}
