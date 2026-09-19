"use client";

import React, { useState } from "react";
import { useTelemetry } from "@/context/TelemetryContext";
import { fmtTimestamp, fmtRelativeTime, fmtRulCountdown } from "@/lib/format";
import UserMenuDropdown from "./header/UserMenuDropdown";
import {
  Clock,
  Radio,
  WifiOff,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

interface HeaderProps {
  userEmail: string;
  isConnected?: boolean;
  vehicleId?: string;
  missionId?: string;
  altitude?: number;
  throttle?: number;
  remainingTimeStr?: string;
  onLogout: () => void;
}

export default function Header({
  userEmail,
  isConnected = false,
  vehicleId = "UAV_ENG_001",
  missionId = "ISR_PATROL_27",
  altitude = 15000,
  throttle = 75,
  onLogout,
}: HeaderProps) {
  const {
    payload,
    linkState,
    lastUpdateAt,
    currentTime,
    reconnectAttempts,
    timeDisplay,
    setTimeDisplay,
    activeScenario,
    resetScenario,
  } = useTelemetry();

  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isZulu = timeDisplay === "zulu";
  const clockFormatted = fmtTimestamp(new Date(currentTime), isZulu);
  const relativeTime = lastUpdateAt
    ? fmtRelativeTime(lastUpdateAt, currentTime)
    : "No signal";

  // Cycle-to-time assumption: 1 cycle = 60 seconds of operational cruise flight
  const predictedRul = payload.prognostics?.predicted_rul;
  const isStale = linkState !== "live";
  const dynamicRemainingTime = fmtRulCountdown(predictedRul, isStale, 60);

  const getLinkColor = () => {
    switch (linkState) {
      case "live":
        return "#10b981"; // Emerald
      case "stale":
        return "#f59e0b"; // Amber
      case "reconnecting":
        return "#f59e0b"; // Amber (not red; red reserved for real faults)
      case "offline":
      default:
        return "#ef4444"; // Red
    }
  };

  const getLinkLabel = () => {
    switch (linkState) {
      case "live":
        return isConnected ? "LIVE 1 Hz" : "SIM LIVE 1 Hz";
      case "stale":
        return "LINK STALE";
      case "reconnecting":
        return reconnectAttempts > 0 ? `RECONNECTING (${reconnectAttempts})` : "RECONNECTING";
      case "offline":
      default:
        return "LINK OFFLINE";
    }
  };

  const isSimulationActive =
    activeScenario &&
    activeScenario.toLowerCase() !== "nominal" &&
    activeScenario.toLowerCase() !== "normal";

  return (
    <header id="app-header" className="gcs-mission-header">
      {/* Left: Brand Identity */}
      <div className="brand" style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
        <div className="logo-badge" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span style={{ color: "var(--accent-cyan)", fontSize: "1.05rem" }}>▲</span>
          <span style={{ letterSpacing: "1px", fontWeight: 800 }}>AEROTWIN</span>
        </div>
        <div style={{ whiteSpace: "nowrap" }}>
          <div className="brand-title" style={{ fontSize: "0.78rem", letterSpacing: "0.5px" }}>
            <strong>MALE UAV DIGITAL TWIN</strong>
          </div>
          <div className="brand-subtitle" style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>
            GROUND CONTROL STATION &amp; PHM
          </div>
        </div>
      </div>

      {/* Center: Mission Chips (Responsive, Never Truncated Mid-Value) */}
      <div
        className="mission-center-bar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.65rem",
          whiteSpace: "nowrap",
          flexWrap: "nowrap",
          flexShrink: 1,
          minWidth: 0,
          margin: "0 0.5rem",
        }}
      >
        <div className="metric-chip" style={{ flexShrink: 0 }}>
          <span className="metric-label">TAIL</span>
          <span className="metric-value text-cyan"><strong>{vehicleId}</strong></span>
        </div>
        <div className="metric-chip mission-chip-optional" style={{ flexShrink: 0 }}>
          <span className="metric-label">MISSION</span>
          <span className="metric-value text-blue" style={{ fontSize: "0.75rem" }}>{missionId}</span>
        </div>
        <div className="metric-chip" style={{ flexShrink: 0 }}>
          <span className="metric-label">MODE</span>
          <span className="metric-value" style={{ color: "#10b981", fontSize: "0.72rem" }}>
            <strong>CRUISE</strong>
          </span>
        </div>
        <div className="metric-chip" style={{ flexShrink: 0 }}>
          <span className="metric-label">ALT</span>
          <span className="metric-value font-mono">{altitude >= 10000 ? `${(altitude / 1000).toFixed(0)}K` : altitude.toLocaleString()} FT</span>
        </div>
        <div className="metric-chip" style={{ flexShrink: 0 }}>
          <span className="metric-label">THR</span>
          <span className="metric-value font-mono">{throttle}%</span>
        </div>
      </div>

      {/* Right: Clock, Active Scenario, Engine Countdown, Link-State & User Menu */}
      <div
        className="mission-right-bar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.65rem",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        {/* Dynamic Zulu/Local Clock */}
        <button
          className="header-clock-pill"
          onClick={() => setTimeDisplay(isZulu ? "local" : "zulu")}
          title={`Click to switch to ${isZulu ? "Local" : "Zulu"} time`}
        >
          <Clock size={12} style={{ color: "var(--accent-cyan)" }} />
          <span>{clockFormatted}</span>
          <span style={{ fontSize: "0.6rem", color: isZulu ? "var(--accent-cyan)" : "#94a3b8", fontWeight: 700 }}>
            {isZulu ? "ZULU" : "LOC"}
          </span>
        </button>

        {/* Active Scenario Warning / Nominal Pill */}
        {isSimulationActive ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              background: "rgba(245, 158, 11, 0.15)",
              border: "1px solid rgba(245, 158, 11, 0.5)",
              color: "#f59e0b",
              borderRadius: "5px",
              padding: "0.15rem 0.45rem",
              fontSize: "0.64rem",
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
            }}
          >
            <AlertTriangle size={11} />
            <span>SIM: {activeScenario.replace(/_/g, " ").toUpperCase()}</span>
            <button
              onClick={resetScenario}
              title="Reset simulation to nominal baseline"
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                border: "none",
                color: "#ffffff",
                borderRadius: "3px",
                padding: "0.08rem 0.3rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.2rem",
                fontSize: "0.6rem",
              }}
            >
              <RotateCcw size={9} />
              RESET
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              fontSize: "0.64rem",
              color: "#10b981",
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              borderRadius: "4px",
              padding: "0.15rem 0.4rem",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <ShieldCheck size={11} />
            <span>NOMINAL</span>
          </div>
        )}

        {/* Est. Engine Time Remaining (Count down, '-' when stale) */}
        <div
          className="remaining-time-badge"
          title="Estimated operational engine time remaining based on active RUL (1 cycle = 60s)"
          style={{ opacity: isStale ? 0.65 : 1 }}
        >
          <span className="time-icon" style={{ fontSize: "0.72rem" }}>REM:</span>
          <div className="time-content">
            <span className="time-label" style={{ fontSize: "0.55rem" }}>EST. ENGINE TIME</span>
            <span className="time-digits font-mono" id="header-remaining-time">
              {dynamicRemainingTime}
            </span>
          </div>
        </div>

        {/* Link-State Indicator (Compact chip; reconnecting is amber, not loud red) */}
        <div
          id="conn-badge"
          className="status-pill"
          role="status"
          aria-live="polite"
          style={{
            borderColor: `${getLinkColor()}60`,
            color: getLinkColor(),
            background: `${getLinkColor()}15`,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
            padding: "0.2rem 0.5rem",
            borderRadius: "5px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.68rem",
          }}
          title={`Telemetry Stream State: ${getLinkLabel()} (${relativeTime})`}
        >
          {linkState === "reconnecting" ? (
            <Radio size={11} className="animate-spin" />
          ) : linkState === "offline" ? (
            <WifiOff size={11} />
          ) : (
            <span
              className="status-dot"
              style={{
                backgroundColor: getLinkColor(),
                boxShadow: `0 0 8px ${getLinkColor()}`,
                width: "6px",
                height: "6px",
              }}
            />
          )}
          <span>
            <strong>{getLinkLabel()}</strong>
          </span>
        </div>

        {/* Modular Operator Profile Dropdown */}
        <UserMenuDropdown
          userEmail={userEmail}
          vehicleId={vehicleId}
          isOpen={userMenuOpen}
          onToggle={() => setUserMenuOpen(!userMenuOpen)}
          onClose={() => setUserMenuOpen(false)}
          onLogout={onLogout}
          getLinkColor={getLinkColor}
          getLinkLabel={getLinkLabel}
          relativeTime={relativeTime}
        />
      </div>
    </header>
  );
}
