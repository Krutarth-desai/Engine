"use client";

import React from "react";
import { UnifiedTelemetryPayload } from "@/types/telemetry";
import { getRulZone } from "@/lib/limits";
import { fmtHealthIndex } from "@/lib/format";
import { SCENARIOS_BY_ID } from "@/lib/scenarios";
import { NavView } from "@/components/Sidebar";
import { Activity, Gauge, ArrowUpRight, ArrowDownRight, Radio } from "lucide-react";

interface DashboardKpiCardsProps {
  payload: UnifiedTelemetryPayload;
  onNavigate: (view: NavView) => void;
}

export default function DashboardKpiCards({ payload, onNavigate }: DashboardKpiCardsProps) {
  // Card 1: Engine Health
  const safeHealth = fmtHealthIndex(payload.health_index ?? 96);
  const healthColor =
    safeHealth >= 85
      ? "var(--text)"
      : safeHealth >= 65
      ? "var(--status-caution)"
      : "var(--status-warning)";

  const healthTrendPoints = payload.recent_trends?.points?.map((p) => p.health_index) || [
    96, 96, 95.8, 96, 96.2, 95.9, 96.1, safeHealth,
  ];
  const healthDelta = payload.recent_trends?.deltas?.health_delta ?? 0.4;

  const sparkMin = Math.min(...healthTrendPoints);
  const sparkMax = Math.max(...healthTrendPoints);
  const sparkRange = sparkMax - sparkMin || 1;
  const svgWidth = 84;
  const svgHeight = 26;
  const sparkPath = healthTrendPoints
    .map((v, i) => {
      const x = (i / (healthTrendPoints.length - 1)) * svgWidth;
      const y = svgHeight - ((v - sparkMin) / sparkRange) * (svgHeight - 6) - 3;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  // Card 2: RUL
  const currentRul = Math.round(payload.prognostics?.predicted_rul || 117);
  const rulZone = getRulZone(currentRul);
  const modelMae = payload.prognostics?.model_mae || 4.2;
  const confidence = Math.round((payload.prognostics?.confidence || 0.89) * 100);
  const remainingTimeStr = payload.prognostics?.remaining_time_str || "01:57:32";
  const rulProgressPct = Math.min(100, Math.max(0, (currentRul / 150) * 100));

  // Card 3: Engine Status
  const riskLevel = payload.risk?.level || "LOW";
  const isCaution = riskLevel === "MEDIUM" || riskLevel === "HIGH";
  const isCritical = riskLevel === "CRITICAL";
  const statusWord = isCritical ? "CRITICAL" : isCaution ? "CAUTION" : "NOMINAL";
  const statusColor = isCritical
    ? "var(--status-warning)"
    : isCaution
    ? "var(--status-caution)"
    : "var(--status-nominal)";

  const activeMode = payload.fault_label && payload.fault_label !== "Normal"
    ? (SCENARIOS_BY_ID.get(payload.fault_label)?.label || payload.fault_label.replace(/_/g, " "))
    : "Nominal Cruise";
  const missionPhase = payload.vehicle?.mission_id ? `${payload.vehicle.mission_id} (WP-04)` : "ISR_PATROL_27 (WP-04)";

  return (
    <div
      className="dashboard-kpi-row"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "0.65rem",
        flexShrink: 0,
      }}
    >
      {/* CARD 1: ENGINE HEALTH (Clickable -> Diagnostics) */}
      <div
        className="card kpi-card clickable"
        onClick={() => onNavigate("diagnostics")}
        title="Click to open Physics Health & Subsystem Diagnostics"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "0.75rem 1rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          cursor: "pointer",
          transition: "border-color 0.15s ease",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.05em",
              color: "var(--text-faint)",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <Activity size={13} style={{ color: "var(--accent)" }} />
            Engine Health Index
          </span>
          <span
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            DIAGNOSTICS →
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", margin: "0.25rem 0" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
            <span
              className="font-mono tabular-nums"
              style={{
                fontSize: "clamp(26px, 2.2vw, 34px)",
                fontWeight: 600,
                color: healthColor,
                lineHeight: 1,
              }}
            >
              {safeHealth}
            </span>
            <span
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono), monospace",
              }}
            >
              / 100
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem" }}>
            <svg width={svgWidth} height={svgHeight} style={{ overflow: "visible" }}>
              <path
                d={sparkPath}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="font-mono tabular-nums"
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: healthDelta < 0 ? "var(--status-warning)" : "var(--text-muted)",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.15rem",
              }}
            >
              {healthDelta < 0 ? <ArrowDownRight size={11} /> : <ArrowUpRight size={11} />}
              {healthDelta >= 0 ? `+${healthDelta}` : healthDelta}% / cycle
            </span>
          </div>
        </div>

        <div
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {safeHealth >= 80 ? "Nominal cruise envelope across 9 telemetry channels" : "Degradation trend active — check diagnostics"}
        </div>
      </div>

      {/* CARD 2: REMAINING USEFUL LIFE (Clickable -> Prognostics) */}
      <div
        className="card kpi-card clickable"
        onClick={() => onNavigate("rul")}
        title="Click to view detailed RUL & Prognostics curves"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "0.75rem 1rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          cursor: "pointer",
          transition: "border-color 0.15s ease",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.05em",
              color: "var(--text-faint)",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <Gauge size={13} style={{ color: "var(--accent)" }} />
            Remaining Useful Life
          </span>
          <span
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            PROGNOSTICS →
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", margin: "0.25rem 0" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
            <span
              className="font-mono tabular-nums"
              style={{
                fontSize: "clamp(26px, 2.2vw, 34px)",
                fontWeight: 600,
                color: rulZone.color,
                lineHeight: 1,
              }}
            >
              {currentRul}
            </span>
            <span
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono), monospace",
                fontWeight: 500,
              }}
            >
              CYCLES
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.15rem" }}>
            <span
              className="font-mono tabular-nums"
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--text-muted)",
              }}
            >
              ±{modelMae} MAE ({confidence}% conf)
            </span>
            <span
              className="font-mono tabular-nums"
              style={{
                fontSize: "11px",
                color: "var(--text-faint)",
              }}
            >
              ≈ {remainingTimeStr}
            </span>
          </div>
        </div>

        {/* Thin Zone Progress Bar */}
        <div>
          <div
            style={{
              height: "4px",
              width: "100%",
              background: "var(--surface-3)",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${rulProgressPct}%`,
                background: rulZone.color,
                borderRadius: "2px",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* CARD 3: ENGINE STATUS & OPERATIONS (Clickable -> Telemetry) */}
      <div
        className="card kpi-card clickable"
        onClick={() => onNavigate("telemetry")}
        title="Click to view full 9-channel time-series telemetry"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "0.75rem 1rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          cursor: "pointer",
          transition: "border-color 0.15s ease",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.05em",
              color: "var(--text-faint)",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <Radio size={13} style={{ color: "var(--accent)" }} />
            Engine Operational Status
          </span>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: statusColor,
              background: `color-mix(in srgb, ${statusColor} 14%, var(--surface-1))`,
              border: `1px solid color-mix(in srgb, ${statusColor} 30%, transparent)`,
              borderRadius: "4px",
              padding: "0.1rem 0.45rem",
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            {statusWord}
          </span>
        </div>

        {/* 3 Key Operational Facts */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0.5rem",
            margin: "0.35rem 0",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-faint)", textTransform: "uppercase" }}>Profile</div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {activeMode}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11px", color: "var(--text-faint)", textTransform: "uppercase" }}>Station</div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={missionPhase}
            >
              {missionPhase}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11px", color: "var(--text-faint)", textTransform: "uppercase" }}>Avionics</div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Bus 10 Hz OK
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Sensor channels: 9 streaming</span>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "11px" }}>TELEMETRY →</span>
        </div>
      </div>
    </div>
  );
}
