"use client";

import React from "react";
import { TrendHistoryPoint } from "../types/telemetry";
import { fmt, fmtHealthIndex } from "@/lib/format";

interface RecentTrendsCardProps {
  points: TrendHistoryPoint[];
  deltas: {
    egt_delta: number;
    oil_pressure_delta: number;
    vibration_delta: number;
    health_delta: number;
  };
}

export default function RecentTrendsCard({ points, deltas }: RecentTrendsCardProps) {
  // Helper to generate SVG sparkline path from array of numbers
  const generateSparkline = (values: number[], width = 140, height = 36) => {
    if (!values || values.length < 2) {
      return { path: "", min: 0, max: 0 };
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const path = values
      .map((val, idx) => {
        const x = (idx / (values.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 8) - 4;
        return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");

    return { path, min, max };
  };

  const egtVals = points.map((p) => p.egt);
  const oilPVals = points.map((p) => p.oil_pressure);
  const vibVals = points.map((p) => p.vibration);
  const healthVals = points.map((p) => p.health_index);

  const egtSpark = generateSparkline(egtVals);
  const oilPSpark = generateSparkline(oilPVals);
  const vibSpark = generateSparkline(vibVals);
  const healthSpark = generateSparkline(healthVals);

  const formatDelta = (val: number, unit = "") => {
    const sign = val > 0 ? "↑ +" : val < 0 ? "↓ " : "→ ";
    return `${sign}${Math.abs(val).toFixed(1)}${unit ? " " + unit : ""}`;
  };

  const currentEgt = egtVals.length > 0 ? egtVals[egtVals.length - 1] : 615.0;
  const currentOilP = oilPVals.length > 0 ? oilPVals[oilPVals.length - 1] : 68.0;
  const currentVib = vibVals.length > 0 ? vibVals[vibVals.length - 1] : 1.42;
  const currentHealth = healthVals.length > 0 ? healthVals[healthVals.length - 1] : 96;

  return (
    <div className="panel recent-trends-panel">
      <div className="panel-header flex justify-between items-center">
        <div className="panel-title">
          <strong>30-CYCLE TEMPORAL TRENDS (LSTM WINDOW)</strong>
        </div>
        <div className="flex items-center gap-2">
          <span className="window-pill font-mono text-xs">
            SIMULATED (30 CYCLES)
          </span>
        </div>
      </div>

      <div className="trends-grid grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
        {/* EGT Trend Tile */}
        <div className="trend-tile bg-slate-900/60 p-3 rounded-lg border border-white/5 flex flex-col justify-between">
          <div className="trend-meta flex justify-between items-baseline mb-1">
            <span className="trend-name font-semibold text-xs text-slate-400">
              Exhaust Gas Temp
            </span>
            <span className="trend-curr font-mono font-bold text-sm text-amber-400">
              {fmt(currentEgt, 1)} °C
            </span>
          </div>

          <div className="sparkline-container my-1">
            <svg viewBox="0 0 140 36" className="w-full h-8 overflow-visible">
              <path
                d={egtSpark.path}
                fill="none"
                stroke="var(--status-caution)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <div className="spark-range flex justify-between text-[10px] font-mono text-slate-500">
              <span>min: {fmt(egtSpark.min, 1)}</span>
              <span>max: {fmt(egtSpark.max, 1)}</span>
            </div>
          </div>

          <div className="trend-delta text-xs font-mono text-amber-400 mt-1">
            {formatDelta(deltas.egt_delta, "°C")}
          </div>
        </div>

        {/* Oil Pressure Trend Tile */}
        <div className="trend-tile bg-slate-900/60 p-3 rounded-lg border border-white/5 flex flex-col justify-between">
          <div className="trend-meta flex justify-between items-baseline mb-1">
            <span className="trend-name font-semibold text-xs text-slate-400">
              Oil Pressure
            </span>
            <span className="trend-curr font-mono font-bold text-sm text-cyan-400">
              {fmt(currentOilP, 1)} psi
            </span>
          </div>

          <div className="sparkline-container my-1">
            <svg viewBox="0 0 140 36" className="w-full h-8 overflow-visible">
              <path
                d={oilPSpark.path}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <div className="spark-range flex justify-between text-[10px] font-mono text-slate-500">
              <span>min: {fmt(oilPSpark.min, 1)}</span>
              <span>max: {fmt(oilPSpark.max, 1)}</span>
            </div>
          </div>

          <div className="trend-delta text-xs font-mono text-cyan-400 mt-1">
            {formatDelta(deltas.oil_pressure_delta, "psi")}
          </div>
        </div>

        {/* Vibration Trend Tile */}
        <div className="trend-tile bg-slate-900/60 p-3 rounded-lg border border-white/5 flex flex-col justify-between">
          <div className="trend-meta flex justify-between items-baseline mb-1">
            <span className="trend-name font-semibold text-xs text-slate-400">
              Vibration RMS
            </span>
            <span className="trend-curr font-mono font-bold text-sm text-pink-400">
              {fmt(currentVib, 2)} g
            </span>
          </div>

          <div className="sparkline-container my-1">
            <svg viewBox="0 0 140 36" className="w-full h-8 overflow-visible">
              <path
                d={vibSpark.path}
                fill="none"
                stroke="var(--status-warning)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <div className="spark-range flex justify-between text-[10px] font-mono text-slate-500">
              <span>min: {fmt(vibSpark.min, 2)}</span>
              <span>max: {fmt(vibSpark.max, 2)}</span>
            </div>
          </div>

          <div className="trend-delta text-xs font-mono text-pink-400 mt-1">
            {formatDelta(deltas.vibration_delta, "g")}
          </div>
        </div>

        {/* Health Index Trend Tile */}
        <div className="trend-tile bg-slate-900/60 p-3 rounded-lg border border-white/5 flex flex-col justify-between">
          <div className="trend-meta flex justify-between items-baseline mb-1">
            <span className="trend-name font-semibold text-xs text-slate-400">
              Health Index
            </span>
            <span className="trend-curr font-mono font-bold text-sm text-emerald-400">
              {fmtHealthIndex(currentHealth)} / 100
            </span>
          </div>

          <div className="sparkline-container my-1">
            <svg viewBox="0 0 140 36" className="w-full h-8 overflow-visible">
              <path
                d={healthSpark.path}
                fill="none"
                stroke="var(--status-nominal)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <div className="spark-range flex justify-between text-[10px] font-mono text-slate-500">
              <span>min: {fmtHealthIndex(healthSpark.min)}</span>
              <span>max: {fmtHealthIndex(healthSpark.max)}</span>
            </div>
          </div>

          <div className="trend-delta text-xs font-mono text-emerald-400 mt-1">
            {formatDelta(deltas.health_delta, "%")}
          </div>
        </div>
      </div>
    </div>
  );
}
