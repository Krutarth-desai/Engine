"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { Chart as ChartJS, registerables } from "chart.js";
import { UnifiedTelemetryPayload } from "@/types/telemetry";
import { useTheme } from "@/context/ThemeContext";
import { fmt } from "@/lib/format";

ChartJS.register(...registerables);

export interface RegressionStats {
  r: number;
  slope: number;
  intercept: number;
  r2: number;
  residualStd: number;
  pointsCount: number;
}

export interface RegressionScatterChartProps {
  points?: UnifiedTelemetryPayload[];
  plotType?: "cht_rpm" | "egt_fuel" | "oil_p_oil_t" | "vib_rpm" | string;
  minPoints?: number;
  backendImage?: string | null;
  compact?: boolean;
  onSelect?: () => void;
}

interface PlotConfig {
  title: string;
  shortTitle: string;
  regime: string;
  xLabel: string;
  yLabel: string;
  getX: (p: UnifiedTelemetryPayload) => number;
  getY: (p: UnifiedTelemetryPayload) => number;
  color: string;
}

const CONFIGS: Record<string, PlotConfig> = {
  cht_rpm: {
    title: "CHT vs RPM (Thermal Power Coupling)",
    shortTitle: "CHT vs RPM",
    regime: "Thermal Power Coupling",
    xLabel: "Engine RPM",
    yLabel: "CHT (°C)",
    getX: (p) => p.sensors?.rpm?.value ?? p.rpm ?? 2450,
    getY: (p) => p.sensors?.cht?.value ?? p.cht_c ?? 142.0,
    color: "#38BDF8", // Cyan
  },
  egt_fuel: {
    title: "EGT vs Fuel Flow (Combustion Stoichiometry)",
    shortTitle: "EGT vs Fuel Flow",
    regime: "Combustion Stoichiometry",
    xLabel: "Fuel Flow (L/h)",
    yLabel: "EGT (°C)",
    getX: (p) => p.sensors?.fuel_flow?.value ?? p.fuel_flow_lh ?? 17.6,
    getY: (p) => p.sensors?.egt?.value ?? p.egt_c ?? 615.0,
    color: "#F59E0B", // Amber
  },
  oil_p_oil_t: {
    title: "Oil Pressure vs Oil Temp (Lubrication Viscosity)",
    shortTitle: "Oil Press vs Oil Temp",
    regime: "Lubrication Viscosity",
    xLabel: "Oil Temperature (°C)",
    yLabel: "Oil Pressure (psi)",
    getX: (p) => p.sensors?.oil_temperature?.value ?? p.oil_temperature_c ?? 92.0,
    getY: (p) => {
      const sVal = p.sensors?.oil_pressure?.value;
      if (sVal !== undefined) return sVal;
      if (p.oil_pressure_bar) return p.oil_pressure_bar * 14.5038;
      return 68.0;
    },
    color: "#5BA872", // Emerald Green
  },
  vib_rpm: {
    title: "Vibration vs RPM (Dynamic Rotor Harmonics)",
    shortTitle: "Vibration vs RPM",
    regime: "Rotor Harmonics",
    xLabel: "Engine RPM",
    yLabel: "Vibration (g)",
    getX: (p) => p.sensors?.rpm?.value ?? p.rpm ?? 2450,
    getY: (p) => p.sensors?.vibration?.value ?? p.vibration_g ?? 1.42,
    color: "#F87171", // Coral/Red
  },
};

export default function RegressionScatterChart({
  points,
  plotType = "cht_rpm",
  minPoints = 5,
  backendImage = null,
  compact = false,
  onSelect,
}: RegressionScatterChartProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const config = CONFIGS[plotType] || CONFIGS.cht_rpm;

  // Compute OLS Linear Regression from telemetry buffer
  const { dataPoints, regressionLine, stats, isReady } = useMemo(() => {
    const xyPairs = (points || [])
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

    // Continuous line endpoints extending slightly across data span
    const minX = Math.min(...xyPairs.map((p) => p.x));
    const maxX = Math.max(...xyPairs.map((p) => p.x));
    const span = maxX - minX;
    const pad = span > 0 ? span * 0.05 : 5;
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
  }, [points, minPoints, config]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);

  // Initialize or update chart
  useEffect(() => {
    if (!isReady || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const primaryColor = config.color;

    // If chart already exists, update data smoothly without tearing down canvas
    if (chartInstanceRef.current) {
      chartInstanceRef.current.data.datasets[0].data = dataPoints;
      chartInstanceRef.current.data.datasets[1].data = regressionLine;
      chartInstanceRef.current.data.datasets[1].label = `OLS Fit (y = ${stats.slope >= 0 ? "+" : ""}${stats.slope.toFixed(3)}x + ${stats.intercept.toFixed(1)})`;
      chartInstanceRef.current.update("none");
      return;
    }

    const chart = new ChartJS(ctx, {
      type: "scatter",
      data: {
        datasets: [
          {
            type: "scatter",
            label: "Telemetry Points",
            data: dataPoints,
            backgroundColor: primaryColor,
            borderColor: isLight ? "#FFFFFF" : "#0A0A0D",
            borderWidth: compact ? 1.0 : 1.5,
            pointRadius: compact ? 3.5 : 4.5,
            pointHoverRadius: compact ? 5.5 : 6.5,
          },
          {
            type: "line",
            label: `OLS Fit (y = ${stats.slope >= 0 ? "+" : ""}${stats.slope.toFixed(3)}x + ${stats.intercept.toFixed(1)})`,
            data: regressionLine,
            borderColor: primaryColor,
            borderWidth: compact ? 1.8 : 2.2,
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
            display: !compact,
            position: "top",
            align: "end",
            labels: {
              color: isLight ? "#3B536E" : "#94A3B8",
              font: { family: "'JetBrains Mono', monospace", size: 9 },
              boxWidth: 8,
              boxHeight: 8,
              padding: 6,
            },
          },
          tooltip: {
            backgroundColor: isLight ? "#FFFFFF" : "#1E2026",
            titleColor: isLight ? "#0B192C" : "#F0EFF4",
            bodyColor: isLight ? "#3B536E" : "#94A3B8",
            borderColor: isLight ? "#C8DCF0" : "#3F4350",
            borderWidth: 1,
            padding: 7,
            titleFont: { family: "'JetBrains Mono', monospace", size: 10, weight: 600 },
            bodyFont: { family: "'JetBrains Mono', monospace", size: 9 },
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
              color: isLight ? "#3B536E" : "#94A3B8",
              font: { size: compact ? 8 : 10, family: "'JetBrains Mono', monospace" },
              padding: { top: 2 },
            },
            grid: { color: isLight ? "rgba(11, 25, 44, 0.08)" : "rgba(255, 255, 255, 0.06)" },
            ticks: {
              color: isLight ? "#3B536E" : "#94A3B8",
              font: { family: "'JetBrains Mono', monospace", size: compact ? 8 : 9 },
              maxTicksLimit: compact ? 4 : 6,
            },
            border: { color: isLight ? "rgba(11, 25, 44, 0.15)" : "rgba(255, 255, 255, 0.12)" },
          },
          y: {
            type: "linear",
            title: {
              display: true,
              text: config.yLabel,
              color: isLight ? "#3B536E" : "#94A3B8",
              font: { size: compact ? 8 : 10, family: "'JetBrains Mono', monospace" },
              padding: { bottom: 2 },
            },
            grid: { color: isLight ? "rgba(11, 25, 44, 0.08)" : "rgba(255, 255, 255, 0.06)" },
            ticks: {
              color: isLight ? "#3B536E" : "#94A3B8",
              font: { family: "'JetBrains Mono', monospace", size: compact ? 8 : 9 },
              maxTicksLimit: compact ? 4 : 6,
            },
            border: { color: isLight ? "rgba(11, 25, 44, 0.15)" : "rgba(255, 255, 255, 0.12)" },
          },
        },
      },
    });

    chartInstanceRef.current = chart;

    return () => {
      chart.destroy();
      chartInstanceRef.current = null;
    };
  }, [isReady, dataPoints, regressionLine, config, stats.slope, stats.intercept, compact, isLight]);

  if (!isReady) {
    if (backendImage) {
      return (
        <div style={{ width: "100%", height: "100%", minHeight: compact ? "160px" : "220px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backendImage}
            alt="Backend Regression Analysis"
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "6px" }}
          />
        </div>
      );
    }

    if (compact) {
      return (
        <div
          className="regression-compact-card"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "195px",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "1rem",
            color: "var(--text-muted)",
            fontSize: "0.72rem",
            fontFamily: "var(--font-mono), monospace",
          }}
        >
          <span className="loading-spinner mb-2" style={{ width: "18px", height: "18px" }} />
          <span>Collecting {config.shortTitle}...</span>
          <span style={{ color: config.color, marginTop: "0.2rem" }}>
            {stats.pointsCount}/{minPoints} pts
          </span>
        </div>
      );
    }

    return (
      <div
        className="plot-placeholder"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          minHeight: "220px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <span className="loading-spinner mb-3" />
        <span style={{ fontSize: "0.8rem", color: "var(--text)" }}>
          Collecting rolling telemetry buffer...
        </span>
        <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono), monospace", color: "var(--accent)", marginTop: "0.25rem" }}>
          {stats.pointsCount}/{minPoints} points collected
        </span>
        <div style={{ width: "12rem", height: "6px", background: "var(--border)", borderRadius: "9999px", overflow: "hidden", marginTop: "0.5rem" }}>
          <div
            style={{
              height: "100%",
              background: "var(--accent)",
              transition: "width 0.3s ease",
              width: `${Math.min(100, (stats.pointsCount / minPoints) * 100)}%`,
            }}
          />
        </div>
      </div>
    );
  }

  // Compact card representation for the 4-Grid multi-correlation matrix
  if (compact) {
    return (
      <div
        className="regression-compact-card"
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          minHeight: "205px",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          padding: "0.5rem 0.6rem",
          boxSizing: "border-box",
          cursor: onSelect ? "pointer" : "default",
          transition: "border-color 0.2s ease, background 0.2s ease",
        }}
        onClick={onSelect}
        title={onSelect ? `Click to view full detail of ${config.title}` : undefined}
      >
        {/* Compact Card Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.3rem",
            paddingBottom: "0.25rem",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: config.color,
                display: "inline-block",
                boxShadow: `0 0 6px ${config.color}88`,
              }}
            />
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "var(--text)",
                letterSpacing: "0.4px",
                fontFamily: "var(--font-jetbrains-mono), monospace",
              }}
            >
              {config.shortTitle}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span
              style={{
                fontSize: "0.62rem",
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontWeight: 700,
                padding: "0.1rem 0.35rem",
                borderRadius: "3px",
                background: "rgba(56, 189, 248, 0.1)",
                color: config.color,
                border: `1px solid ${config.color}33`,
              }}
            >
              r = {stats.r >= 0 ? "+" : ""}{stats.r.toFixed(2)}
            </span>
            {onSelect && (
              <span
                style={{
                  fontSize: "0.65rem",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                }}
                title="Expand single plot view"
              >
                ↗
              </span>
            )}
          </div>
        </div>

        {/* Canvas container */}
        <div style={{ flex: 1, minHeight: "120px", height: "135px", position: "relative", width: "100%" }}>
          <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
        </div>

        {/* Compact stats pill strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "0.3rem",
            marginTop: "0.35rem",
            paddingTop: "0.25rem",
            borderTop: "1px solid var(--border)",
          }}
        >
          <div style={{ textAlign: "center", background: "var(--surface-1)", padding: "0.15rem 0.2rem", borderRadius: "4px" }}>
            <div style={{ fontSize: "7.5px", color: "var(--text-muted)", textTransform: "uppercase" }}>SLOPE</div>
            <div style={{ fontSize: "9px", fontFamily: "var(--font-jetbrains-mono), monospace", fontWeight: 700, color: "var(--text)" }}>
              {stats.slope >= 0 ? "+" : ""}{stats.slope.toFixed(3)}
            </div>
          </div>
          <div style={{ textAlign: "center", background: "var(--surface-1)", padding: "0.15rem 0.2rem", borderRadius: "4px" }}>
            <div style={{ fontSize: "7.5px", color: "var(--text-muted)", textTransform: "uppercase" }}>R²</div>
            <div style={{ fontSize: "9px", fontFamily: "var(--font-jetbrains-mono), monospace", fontWeight: 700, color: "var(--status-nominal)" }}>
              {stats.r2.toFixed(2)}
            </div>
          </div>
          <div style={{ textAlign: "center", background: "var(--surface-1)", padding: "0.15rem 0.2rem", borderRadius: "4px" }}>
            <div style={{ fontSize: "7.5px", color: "var(--text-muted)", textTransform: "uppercase" }}>σ RES</div>
            <div style={{ fontSize: "9px", fontFamily: "var(--font-jetbrains-mono), monospace", fontWeight: 700, color: "var(--text-muted)" }}>
              {stats.residualStd.toFixed(1)}
            </div>
          </div>
          <div style={{ textAlign: "center", background: "var(--surface-1)", padding: "0.15rem 0.2rem", borderRadius: "4px" }}>
            <div style={{ fontSize: "7.5px", color: "var(--text-muted)", textTransform: "uppercase" }}>PTS</div>
            <div style={{ fontSize: "9px", fontFamily: "var(--font-jetbrains-mono), monospace", fontWeight: 700, color: config.color }}>
              {stats.pointsCount}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full-size standard single plot card
  return (
    <div
      className="regression-chart-card"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        minHeight: "260px",
      }}
    >
      <div style={{ flex: 1, minHeight: "200px", position: "relative", width: "100%" }}>
        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      </div>

      {/* Discrete Label-Over-Value Statistical Cells */}
      <div
        className="regression-stats-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "0.35rem",
          marginTop: "0.5rem",
          paddingTop: "0.35rem",
          borderTop: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div
          className="stat-card-cell"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "0.25rem 0.35rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            PEARSON r
          </div>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: "11px", fontWeight: 700, color: config.color }}>
            {stats.r >= 0 ? "+" : ""}{stats.r.toFixed(3)}
          </div>
        </div>
        <div
          className="stat-card-cell"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "0.25rem 0.35rem",
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
          className="stat-card-cell"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "0.25rem 0.35rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            DETERMINATION (R²)
          </div>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: "11px", fontWeight: 700, color: "var(--status-nominal)" }}>
            {stats.r2.toFixed(3)}
          </div>
        </div>
        <div
          className="stat-card-cell"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "0.25rem 0.35rem",
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
          className="stat-card-cell"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "0.25rem 0.35rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            BUFFER
          </div>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: "11px", fontWeight: 700, color: config.color }}>
            {stats.pointsCount} PTS
          </div>
        </div>
      </div>
    </div>
  );
}
