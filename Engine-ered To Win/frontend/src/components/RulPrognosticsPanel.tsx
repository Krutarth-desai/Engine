"use client";

import React, { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { RulTickData, RulEngineListMsg, RulResetMsg } from "@/types/telemetry";
import HourglassSvg from "./prognostics/HourglassSvg";

Chart.register(...registerables);

interface RulPrognosticsPanelProps {
  isVisible: boolean;
}

export default function RulPrognosticsPanel({ isVisible }: RulPrognosticsPanelProps) {
  const [engineUnits, setEngineUnits] = useState<number[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<number>(1);
  const [predictedRul, setPredictedRul] = useState<number | null>(null);
  const [actualRul, setActualRul] = useState<number | null>(null);
  const [absError, setAbsError] = useState<string>("--");
  const [cycleCounter, setCycleCounter] = useState<number>(0);
  const [logText, setLogText] = useState<string>("Connecting to RUL Prognostics stream...");
  const [badgeState, setBadgeState] = useState<{
    text: string;
    bg: string;
    color: string;
    border: string;
  }>({
    text: "LSTM AI",
    bg: "var(--surface-3)",
    color: "var(--surface-3)",
    border: "var(--surface-3)",
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const labelsRef = useRef<number[]>([]);
  const actualDataRef = useRef<number[]>([]);
  const predictedDataRef = useRef<(number | null)[]>([]);

  // Initialize Chart
  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labelsRef.current,
        datasets: [
          {
            label: "Actual RUL",
            data: actualDataRef.current,
            borderColor: "var(--accent)",
            backgroundColor: "var(--border)",
            tension: 0.3,
            borderWidth: 2.5,
            pointRadius: 0,
            fill: true,
          },
          {
            label: "LSTM Predicted RUL",
            data: predictedDataRef.current,
            borderColor: "var(--surface-3)",
            backgroundColor: "var(--surface-3)",
            tension: 0.3,
            borderWidth: 2.5,
            pointRadius: 0,
            borderDash: [6, 3],
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
            labels: {
              color: "var(--text-muted)",
              font: { family: "Inter", size: 11 },
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: "Cycle", color: "var(--text-muted)" },
            grid: { color: "var(--border)" },
            ticks: {
              color: "var(--text-muted)",
              font: { family: "JetBrains Mono", size: 10 },
              maxTicksLimit: 20,
            },
          },
          y: {
            title: { display: true, text: "RUL (Cycles)", color: "var(--text-muted)" },
            grid: { color: "var(--border)" },
            ticks: {
              color: "var(--text-muted)",
              font: { family: "JetBrains Mono", size: 10 },
            },
            min: 0,
          },
        },
      },
    });

    chartRef.current = chart;

    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, []);

  // Connect WebSocket to /ws/rul
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;

    const connectRulWebSocket = () => {
      const wsHost =
        process.env.NEXT_PUBLIC_WS_URL ||
        (typeof window !== "undefined"
          ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.hostname}:8000`
          : "ws://localhost:8000");
      const wsUrl = `${wsHost}/ws/rul`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setLogText("Connected to RUL Prognostics stream.");
        // Request engine 1 by default
        ws.send(JSON.stringify({ unit: selectedUnit }));
      };

      ws.onmessage = (event) => {
        try {
          const data: RulTickData | RulEngineListMsg | RulResetMsg = JSON.parse(event.data);

          if (data.type === "engine_list") {
            setEngineUnits(data.units);
            return;
          }

          if (data.type === "reset") {
            labelsRef.current.length = 0;
            actualDataRef.current.length = 0;
            predictedDataRef.current.length = 0;
            if (chartRef.current) chartRef.current.update();
            setPredictedRul(null);
            setActualRul(null);
            setAbsError("--");
            setLogText(`Loading engine unit ${data.unit}...`);
            return;
          }

          if (data.type === "rul_tick") {
            const cycle = data.cycle;
            const actual = data.actual_rul;
            const predicted = data.predicted_rul;
            const err =
              predicted !== null ? Math.abs(actual - predicted).toFixed(1) : "--";

            labelsRef.current.push(cycle);
            actualDataRef.current.push(actual);
            predictedDataRef.current.push(predicted !== null ? predicted : null);

            // Keep max 300 points
            if (labelsRef.current.length > 300) {
              labelsRef.current.shift();
              actualDataRef.current.shift();
              predictedDataRef.current.shift();
            }

            if (chartRef.current) chartRef.current.update();

            setCycleCounter(cycle);
            setPredictedRul(predicted);
            setActualRul(actual);
            setAbsError(err);

            if (predicted !== null && predicted < 30) {
              setBadgeState({
                text: "CRITICAL RUL",
                bg: "var(--border)",
                color: "var(--status-warning)",
                border: "var(--status-warning)",
              });
            } else if (predicted !== null && predicted < 60) {
              setBadgeState({
                text: "LOW RUL",
                bg: "var(--border)",
                color: "var(--status-caution)",
                border: "var(--status-caution)",
              });
            } else {
              setBadgeState({
                text: "LSTM AI",
                bg: "var(--surface-3)",
                color: "var(--surface-3)",
                border: "var(--surface-3)",
              });
            }

            setLogText(
              `Cycle ${cycle} | Actual: ${actual.toFixed(0)} | Pred: ${predicted !== null ? predicted.toFixed(1) : "buffering"} | Err: ${err}`
            );
          }
        } catch {
          // ignore parse err
        }
      };

      ws.onclose = () => {
        setLogText("RUL stream disconnected. Reconnecting...");
        reconnectTimeout = setTimeout(connectRulWebSocket, 3000);
      };
    };

    connectRulWebSocket();

    return () => {
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [selectedUnit]);

  const handleSelectEngine = (unitId: number) => {
    setSelectedUnit(unitId);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ unit: unitId }));
    }
  };

  return (
    <div className={`rul-panel-wrapper ${isVisible ? "visible" : ""}`} id="rul-panel">
      <div className="rul-hero">
        {/* Left: Hourglass Logo & Big RUL Number */}
        <div className="panel rul-logo-panel">
          <div className="panel-header" style={{ width: "100%" }}>
            <span className="panel-title">
              <span>⏳</span> Remaining Time
            </span>
            <span
              className="status-badge-lg"
              id="rul-status-badge"
              style={{
                background: badgeState.bg,
                color: badgeState.color,
                border: `1px solid ${badgeState.border}`,
              }}
            >
              {badgeState.text}
            </span>
          </div>

          <HourglassSvg />

          <div className="rul-big-number" id="rul-big-val">
            {predictedRul !== null ? predictedRul.toFixed(0) : "--"}
          </div>
          <div className="rul-big-label">Predicted RUL (Cycles)</div>
          <div style={{ marginTop: "0.5rem" }}>
            <div className="rul-big-label">ENGINE UNIT</div>
            <div className="rul-engine-selector" id="rul-engine-selector">
              {engineUnits.map((u) => (
                <button
                  key={u}
                  className={`rul-engine-btn ${selectedUnit === u ? "active" : ""}`}
                  onClick={() => handleSelectEngine(u)}
                >
                  E{u}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Live RUL Chart */}
        <div className="panel rul-chart-panel">
          <div className="panel-header">
            <span className="panel-title">
              <strong>Actual vs Predicted RUL — CMAPSS FD001 Live Inference</strong>
            </span>
            <span
              className="metric-tag"
              style={{
                fontSize: "0.75rem",
                fontFamily: "var(--font-mono), monospace",
              }}
              id="rul-cycle-counter"
            >
              <strong>CYCLE: {cycleCounter}</strong>
            </span>
          </div>
          <div className="rul-chart-container">
            <canvas id="rulChart" ref={canvasRef}></canvas>
          </div>
        </div>

        {/* Right: RUL Metrics */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">
              <strong>LSTM Prognostic Metrics</strong>
            </span>
          </div>
          <div className="rul-metrics-grid">
            <div className="rul-metric-card">
              <div className="rul-metric-label">Predicted RUL</div>
              <div className="rul-metric-val" id="rul-m-predicted">
                {predictedRul !== null ? predictedRul.toFixed(1) : "--"}
              </div>
            </div>
            <div className="rul-metric-card">
              <div className="rul-metric-label">Actual RUL</div>
              <div
                className="rul-metric-val"
                id="rul-m-actual"
                style={{ color: "var(--accent)" }}
              >
                {actualRul !== null ? actualRul.toFixed(1) : "--"}
              </div>
            </div>
            <div className="rul-metric-card">
              <div className="rul-metric-label">Abs Error</div>
              <div
                className="rul-metric-val"
                id="rul-m-error"
                style={{ color: "var(--status-caution)" }}
              >
                {absError}
              </div>
            </div>
            <div className="rul-metric-card">
              <div className="rul-metric-label">Model MAE</div>
              <div className="rul-metric-val" id="rul-m-mae">
                10.08
              </div>
            </div>
            <div className="rul-metric-card">
              <div className="rul-metric-label">Window Size</div>
              <div className="rul-metric-val" id="rul-m-window">
                30
              </div>
            </div>
            <div className="rul-metric-card">
              <div className="rul-metric-label">Sensors Used</div>
              <div className="rul-metric-val" id="rul-m-sensors">
                15
              </div>
            </div>
          </div>
          <div className="diag-log-container" style={{ marginTop: "0.85rem" }}>
            <span style={{ color: "var(--surface-3)", fontWeight: 700 }}>
              RUL LOG:
            </span>
            <span id="rul-log-text">{logText}</span>
          </div>
          <div style={{ marginTop: "0.85rem" }}>
            <div
              className="advisory-box"
              id="rul-advisory"
              style={{ borderLeftColor: "var(--surface-3)" }}
            >
              <div
                className="advisory-title"
                style={{ color: "var(--surface-3)" }}
              >
                ⏳ CMAPSS FD001 Prognostic Dataset
              </div>
              <div className="advisory-desc">
                The LSTM model was trained on the NASA C-MAPSS turbofan engine
                degradation dataset. It predicts Remaining Useful Life from a rolling
                30-cycle sensor window. RUL is clipped at 125 cycles.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
