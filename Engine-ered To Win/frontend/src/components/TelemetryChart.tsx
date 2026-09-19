"use client";

import React, { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { TelemetryData } from "@/types/telemetry";
import { useTelemetry } from "@/context/TelemetryContext";
import { fmtTimestamp } from "@/lib/format";
import { getThemeColors } from "@/lib/chartTheme";

Chart.register(...registerables, annotationPlugin);

interface TelemetryChartProps {
  telemetry?: TelemetryData | null;
}

export default function TelemetryChart({ telemetry: propTelemetry }: TelemetryChartProps) {
  const { historyBuffer, payload, linkState, lastUpdateAt, timeDisplay } = useTelemetry();
  const [windowSeconds, setWindowSeconds] = useState<30 | 60 | 120>(30);

  const canvasEgtRef = useRef<HTMLCanvasElement | null>(null);
  const canvasChtRef = useRef<HTMLCanvasElement | null>(null);

  const chartEgtInstance = useRef<Chart | null>(null);
  const chartChtInstance = useRef<Chart | null>(null);

  // 1. Initialize EGT Chart
  useEffect(() => {
    if (!canvasEgtRef.current) return;
    const ctx = canvasEgtRef.current.getContext("2d");
    if (!ctx) return;

    const theme = getThemeColors();

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "EGT — Exhaust Gas Temp (°C)",
            data: [],
            borderColor: "var(--status-warning)",
            backgroundColor: "color-mix(in srgb, var(--status-warning) 14%, var(--surface-1))",
            borderWidth: 2,
            tension: 0.25,
            pointRadius: 0,
            fill: true,
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
            labels: {
              color: theme.textSecondary,
              font: { family: "'JetBrains Mono', monospace", size: 10 },
              boxWidth: 12,
            },
          },
          annotation: {
            annotations: {
              triggerLine: {
                type: "line",
                yMin: 680,
                yMax: 680,
                borderColor: "color-mix(in srgb, var(--status-caution) 14%, var(--surface-1))",
                borderWidth: 1.5,
                borderDash: [4, 3],
                label: {
                  display: true,
                  content: "TRIGGER 680 °C",
                  position: "end",
                  color: "var(--status-caution)",
                  backgroundColor: theme.tooltipBg,
                  font: { family: "'JetBrains Mono', monospace", size: 8 },
                },
              },
            },
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
              autoSkip: true,
              maxTicksLimit: 6,
            },
          },
          y: {
            min: 500,
            max: 850,
            grid: { color: theme.gridColor },
            ticks: {
              color: theme.textMuted,
              font: { family: "'JetBrains Mono', monospace", size: 9 },
              stepSize: 50,
            },
          },
        },
      },
    });

    chartEgtInstance.current = chart;
    return () => {
      chart.destroy();
      chartEgtInstance.current = null;
    };
  }, []);

  // 2. Initialize CHT & Oil Temp Stacked Chart
  useEffect(() => {
    if (!canvasChtRef.current) return;
    const ctx = canvasChtRef.current.getContext("2d");
    if (!ctx) return;

    const theme = getThemeColors();

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "CHT — Cylinder Head (°C)",
            data: [],
            borderColor: "var(--accent)",
            backgroundColor: "var(--border)",
            borderWidth: 2,
            tension: 0.25,
            pointRadius: 0,
            fill: true,
          },
          {
            label: "Oil Temp (°C)",
            data: [],
            borderColor: "var(--status-caution)",
            backgroundColor: "transparent",
            borderWidth: 1.5,
            tension: 0.25,
            pointRadius: 0,
            borderDash: [3, 3],
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
            labels: {
              color: theme.textSecondary,
              font: { family: "'JetBrains Mono', monospace", size: 10 },
              boxWidth: 12,
            },
          },
          annotation: {
            annotations: {
              triggerLine: {
                type: "line",
                yMin: 165,
                yMax: 165,
                borderColor: "color-mix(in srgb, var(--status-caution) 14%, var(--surface-1))",
                borderWidth: 1.5,
                borderDash: [4, 3],
                label: {
                  display: true,
                  content: "TRIGGER CHT 165 °C",
                  position: "end",
                  color: "var(--status-caution)",
                  backgroundColor: theme.tooltipBg,
                  font: { family: "'JetBrains Mono', monospace", size: 8 },
                },
              },
            },
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
              autoSkip: true,
              maxTicksLimit: 6,
            },
          },
          y: {
            min: 50,
            max: 220,
            grid: { color: theme.gridColor },
            ticks: {
              color: theme.textMuted,
              font: { family: "'JetBrains Mono', monospace", size: 9 },
            },
          },
        },
      },
    });

    chartChtInstance.current = chart;
    return () => {
      chart.destroy();
      chartChtInstance.current = null;
    };
  }, []);

  // 3. Update data on both charts when buffer or window changes
  useEffect(() => {
    const rawBuffer = historyBuffer.length > 0 ? historyBuffer : [payload];
    const sliced = rawBuffer.slice(-windowSeconds);

    const labels = sliced.map((p) => {
      const ts = p.timestamp ? new Date(p.timestamp) : new Date();
      return ts.toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    });

    const egtData = sliced.map((p) => {
      const val = p.sensors?.egt?.value ?? (p as unknown as Record<string, unknown>).egt_c ?? (propTelemetry?.egt_c ?? 615);
      return typeof val === "number" ? val : Number(val);
    });

    const chtData = sliced.map((p) => {
      const val = p.sensors?.cht?.value ?? (p as unknown as Record<string, unknown>).cht_c ?? (propTelemetry?.cht_c ?? 142);
      return typeof val === "number" ? val : Number(val);
    });

    const oilTData = sliced.map((p) => {
      const val = p.sensors?.oil_temperature?.value ?? (p as unknown as Record<string, unknown>).oil_temperature_c ?? (propTelemetry?.oil_temperature_c ?? 92);
      return typeof val === "number" ? val : Number(val);
    });

    if (chartEgtInstance.current) {
      chartEgtInstance.current.data.labels = labels;
      chartEgtInstance.current.data.datasets[0].data = egtData;
      chartEgtInstance.current.update("none");
    }

    if (chartChtInstance.current) {
      chartChtInstance.current.data.labels = labels;
      chartChtInstance.current.data.datasets[0].data = chtData;
      chartChtInstance.current.data.datasets[1].data = oilTData;
      chartChtInstance.current.update("none");
    }
  }, [historyBuffer, payload, propTelemetry, windowSeconds]);

  const lastUpdateFormatted = lastUpdateAt ? fmtTimestamp(lastUpdateAt, timeDisplay === "zulu") : "--:--:--";

  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "0.65rem", height: "100%", position: "relative" }}>
      {/* Stale Overlay */}
      {linkState !== "live" && (
        <div className="chart-stale-overlay">
          <div className="chart-stale-badge">
            NO NEW DATA SINCE {lastUpdateFormatted}
          </div>
        </div>
      )}

      {/* Header with Time-Window Selector */}
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="panel-title">
            <strong>STACKED THERMAL &amp; COMBUSTION DYNAMICS</strong>
          </span>
          <span style={{ fontSize: "0.62rem", color: "var(--accent)", fontFamily: "var(--font-mono), monospace" }}>
            [SYNCHRONIZED TIME AXIS]
          </span>
        </div>

        {/* Time-Window Pills: 30s, 60s, 120s */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span style={{ fontSize: "0.64rem", color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}>WINDOW:</span>
          {([30, 60, 120] as const).map((sec) => (
            <button
              key={sec}
              onClick={() => setWindowSeconds(sec)}
              style={{
                background: windowSeconds === sec ? "var(--border)" : "var(--border)",
                border: `1px solid ${windowSeconds === sec ? "var(--accent)" : "var(--border)"}`,
                color: windowSeconds === sec ? "var(--accent)" : "var(--text-muted)",
                borderRadius: "4px",
                padding: "0.15rem 0.45rem",
                fontSize: "0.65rem",
                fontWeight: 700,
                fontFamily: "var(--font-mono), monospace",
                cursor: "pointer",
              }}
            >
              {sec}s
            </button>
          ))}
        </div>
      </div>

      {/* Stacked Chart Top: EGT Combustion */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 0.25rem" }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--status-warning)", fontFamily: "var(--font-mono), monospace" }}>
            EXHAUST GAS TEMPERATURE (EGT)
          </span>
          <span style={{ fontSize: "0.62rem", color: "var(--status-caution)", fontFamily: "var(--font-mono), monospace" }}>
            TRIGGER: 680 °C
          </span>
        </div>
        <div style={{ height: "140px", position: "relative" }}>
          <canvas ref={canvasEgtRef} />
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "var(--border)", margin: "0.2rem 0" }} />

      {/* Stacked Chart Bottom: CHT & Oil Temp */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 0.25rem" }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-mono), monospace" }}>
            CYLINDER HEAD TEMP (CHT) &amp; OIL TEMP
          </span>
          <span style={{ fontSize: "0.62rem", color: "var(--status-caution)", fontFamily: "var(--font-mono), monospace" }}>
            TRIGGER: CHT 165 °C
          </span>
        </div>
        <div style={{ height: "140px", position: "relative" }}>
          <canvas ref={canvasChtRef} />
        </div>
      </div>
    </div>
  );
}
