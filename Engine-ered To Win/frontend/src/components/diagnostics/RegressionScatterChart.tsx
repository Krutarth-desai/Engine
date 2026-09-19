"use client";

import React, { useEffect, useRef, useMemo } from "react";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { UnifiedTelemetryPayload } from "@/types/telemetry";
import { fmt } from "@/lib/format";
import { getThemeColors } from "@/lib/chartTheme";

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

export interface RegressionStats {
  r: number;
  slope: number;
  intercept: number;
  r2: number;
  residualStd: number;
  pointsCount: number;
}

interface RegressionScatterChartProps {
  points: UnifiedTelemetryPayload[];
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
  pointColor: string;
  lineColor: string;
}

const CONFIGS: Record<string, PlotConfig> = {
  cht_rpm: {
    title: "CHT vs RPM (Thermal Power Coupling)",
    xLabel: "Engine RPM",
    yLabel: "CHT (°C)",
    getX: (p) => p.sensors?.rpm?.value ?? p.rpm ?? 2450,
    getY: (p) => p.sensors?.cht?.value ?? p.cht_c ?? 142.0,
    pointColor: "var(--accent)",
    lineColor: "var(--accent)",
  },
  egt_fuel: {
    title: "EGT vs Fuel Flow (Combustion Stoichiometry)",
    xLabel: "Fuel Flow (L/h)",
    yLabel: "EGT (°C)",
    getX: (p) => p.sensors?.fuel_flow?.value ?? p.fuel_flow_lh ?? 17.6,
    getY: (p) => p.sensors?.egt?.value ?? p.egt_c ?? 615.0,
    pointColor: "var(--status-caution)",
    lineColor: "var(--status-caution)",
  },
  oil_p_oil_t: {
    title: "Oil Pressure vs Oil Temp (Lubrication Viscosity)",
    xLabel: "Oil Temperature (°C)",
    yLabel: "Oil Pressure (psi)",
    getX: (p) => p.sensors?.oil_temperature?.value ?? p.oil_temperature_c ?? 92.0,
    getY: (p) =>
      p.sensors?.oil_pressure?.value ??
      (p.oil_pressure_bar ? p.oil_pressure_bar * 14.5038 : 68.0),
    pointColor: "var(--status-nominal)",
    lineColor: "var(--status-nominal)",
  },
  vib_rpm: {
    title: "Vibration vs RPM (Dynamic Rotor Harmonics)",
    xLabel: "Engine RPM",
    yLabel: "Vibration (g)",
    getX: (p) => p.sensors?.rpm?.value ?? p.rpm ?? 2450,
    getY: (p) => p.sensors?.vibration?.value ?? p.vibration_g ?? 1.42,
    pointColor: "var(--surface-3)",
    lineColor: "var(--surface-3)",
  },
};

export default function RegressionScatterChart({
  points,
  plotType = "cht_rpm",
  minPoints = 5,
  backendImage = null,
}: RegressionScatterChartProps) {
  const config = CONFIGS[plotType] || CONFIGS.cht_rpm;

  // Compute OLS Linear Regression from rolling telemetry buffer
  const { dataPoints, regressionLine, stats, isReady } = useMemo(() => {
    if (!points || points.length < minPoints) {
      return {
        dataPoints: [],
        regressionLine: [],
        stats: { r: 0, slope: 0, intercept: 0, r2: 0, residualStd: 0, pointsCount: points?.length || 0 },
        isReady: false,
      };
    }

    const xyPairs = points
      .map((p) => ({ x: config.getX(p), y: config.getY(p) }))
      .filter((pt) => !isNaN(pt.x) && !isNaN(pt.y) && isFinite(pt.x) && isFinite(pt.y));

    const n = xyPairs.length;
    if (n < minPoints) {
      return {
        dataPoints: [],
        regressionLine: [],
        stats: { r: 0, slope: 0, intercept: 0, r2: 0, residualStd: 0, pointsCount: n },
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

    // Line endpoints for smooth regression rendering
    const minX = Math.min(...xyPairs.map((p) => p.x));
    const maxX = Math.max(...xyPairs.map((p) => p.x));

    const line = [
      { x: minX, y: slope * minX + intercept },
      { x: maxX, y: slope * maxX + intercept },
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
  }, [points, minPoints, config]);

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

    const chart = new ChartJS(ctx, {
      type: "scatter",
      data: {
        datasets: [
          {
            type: "scatter",
            label: "Live Telemetry Points",
            data: dataPoints,
            backgroundColor: `${config.pointColor}cc`,
            borderColor: config.pointColor,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            type: "line",
            label: `OLS Fit (y = ${stats.slope >= 0 ? "+" : ""}${stats.slope.toFixed(3)}x + ${stats.intercept.toFixed(1)})`,
            data: regressionLine,
            borderColor: config.lineColor,
            borderWidth: 2,
            pointRadius: 0,
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
            labels: {
              color: theme.textSecondary,
              font: { family: "var(--font-inter), sans-serif", size: 11 },
              boxWidth: 12,
            },
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: "var(--accent)",
            bodyColor: "var(--text)",
            borderColor: theme.borderGlow,
            borderWidth: 1,
            callbacks: {
              label: (context) =>
                ` ${config.xLabel}: ${fmt(context.parsed.x, 1)} | ${config.yLabel}: ${fmt(context.parsed.y, 1)}`,
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: config.xLabel,
              color: theme.textMuted,
              font: { size: 10, family: "var(--font-jetbrains-mono), monospace" },
            },
            grid: { color: theme.gridColor },
            ticks: { color: theme.textMuted, font: { family: "var(--font-jetbrains-mono), monospace", size: 9 } },
          },
          y: {
            title: {
              display: true,
              text: config.yLabel,
              color: theme.textMuted,
              font: { size: 10, family: "var(--font-jetbrains-mono), monospace" },
            },
            grid: { color: theme.gridColor },
            ticks: { color: theme.textMuted, font: { family: "var(--font-jetbrains-mono), monospace", size: 9 } },
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
        <div className="regression-chart-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backendImage}
            alt="Backend Regression Analysis"
            className="regression-img w-full h-[240px] object-contain rounded border border-slate-800"
          />
        </div>
      );
    }

    return (
      <div className="plot-placeholder flex flex-col items-center justify-center p-8 min-h-[240px] bg-slate-950/60 rounded border border-slate-800/60">
        <span className="loading-spinner mb-3" />
        <span className="text-sm text-slate-300 font-medium">
          Collecting rolling telemetry buffer...
        </span>
        <span className="text-xs font-mono text-cyan-400 mt-1">
          {stats.pointsCount}/{minPoints} points collected
        </span>
        <div className="w-48 h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
          <div
            className="h-full bg-cyan-500 transition-all duration-300"
            style={{ width: `${Math.min(100, (stats.pointsCount / minPoints) * 100)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="regression-chart-card">
      <div className="h-[220px] relative">
        <canvas ref={canvasRef} />
      </div>

      {/* Discrete Label-Over-Value Statistical Cells */}
      <div className="regression-stats-grid mt-3">
        <div className="stat-card-cell">
          <span className="stat-cell-label">PEARSON r</span>
          <span className="stat-cell-value text-cyan font-mono">
            {stats.r >= 0 ? "+" : ""}
            {stats.r.toFixed(3)}
          </span>
        </div>
        <div className="stat-card-cell">
          <span className="stat-cell-label">FIT SLOPE</span>
          <span className="stat-cell-value text-amber font-mono">
            {stats.slope >= 0 ? "+" : ""}
            {stats.slope.toFixed(4)}
          </span>
        </div>
        <div className="stat-card-cell">
          <span className="stat-cell-label">DETERMINATION (R²)</span>
          <span className="stat-cell-value text-green font-mono">
            {stats.r2.toFixed(3)}
          </span>
        </div>
        <div className="stat-card-cell">
          <span className="stat-cell-label">RESIDUAL STD (σ)</span>
          <span className="stat-cell-value text-cyan font-mono">
            {stats.residualStd.toFixed(2)}
          </span>
        </div>
        <div className="stat-card-cell">
          <span className="stat-cell-label">BUFFER</span>
          <span className="stat-cell-value text-green font-mono">
            {stats.pointsCount} PTS
          </span>
        </div>
      </div>
    </div>
  );
}
