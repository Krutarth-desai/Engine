"use client";

import React, { useState } from "react";
import { useTelemetry } from "@/context/TelemetryContext";
import { useTheme } from "@/context/ThemeContext";
import { useProfile } from "@/context/ProfileContext";
import { fmtTimestamp, fmtRelativeTime, fmtRulCountdown } from "@/lib/format";
import UserMenuDropdown from "./header/UserMenuDropdown";
import { SCENARIO_REGISTRY } from "@/lib/scenarios";
import { NavView } from "./Sidebar";
import {
  Clock,
  Radio,
  WifiOff,
  RotateCcw,
  AlertTriangle,
  FlaskConical,
  Sun,
  Moon,
  Lock,
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
  onSelectView?: (view: NavView) => void;
}

export default function Header({
  userEmail,
  isConnected = false,
  vehicleId = "UAV_ENG_001",
  missionId = "ISR_PATROL_27",
  altitude = 15000,
  throttle = 75,
  onLogout,
  onSelectView,
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
    injectScenario,
    resetScenario,
  } = useTelemetry();

  const { profile } = useProfile();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

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
        return "var(--status-nominal)"; // Emerald
      case "stale":
        return "var(--status-caution)"; // Amber
      case "reconnecting":
        return "var(--status-caution)"; // Amber (not red; red reserved for real faults)
      case "offline":
      default:
        return "var(--status-warning)"; // Red
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
          <span style={{ color: "var(--accent)", fontSize: "1.05rem" }}>▲</span>
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
          gap: "0.85rem",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          padding: "0 0.75rem",
          height: "30px",
          whiteSpace: "nowrap",
          flexWrap: "nowrap",
          flexShrink: 0,
          boxSizing: "border-box",
        }}
      >
        <div className="metric-chip" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span className="metric-label" style={{ fontSize: "10.5px", color: "var(--text-faint)", fontFamily: "var(--font-mono), monospace", fontWeight: 600 }}>TAIL</span>
          <span className="metric-value" style={{ fontSize: "12px", color: "var(--text)", fontFamily: "var(--font-mono), monospace", fontWeight: 700 }}>
            {vehicleId}
          </span>
        </div>
        <div className="metric-chip mission-chip-optional" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span className="metric-label" style={{ fontSize: "10.5px", color: "var(--text-faint)", fontFamily: "var(--font-mono), monospace", fontWeight: 600 }}>MISSION</span>
          <span className="metric-value" style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace", fontWeight: 600 }}>
            {missionId}
          </span>
        </div>
        <div className="metric-chip" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span className="metric-label" style={{ fontSize: "10.5px", color: "var(--text-faint)", fontFamily: "var(--font-mono), monospace", fontWeight: 600 }}>MODE</span>
          <span className="metric-value" style={{ fontSize: "11px", color: "var(--status-nominal)", fontFamily: "var(--font-mono), monospace", fontWeight: 700 }}>
            CRUISE
          </span>
        </div>
        <div className="metric-chip" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span className="metric-label" style={{ fontSize: "10.5px", color: "var(--text-faint)", fontFamily: "var(--font-mono), monospace", fontWeight: 600 }}>ALT</span>
          <span className="metric-value font-mono tabular-nums" style={{ fontSize: "12px", color: "var(--text)", fontWeight: 600 }}>
            {altitude >= 10000 ? `${(altitude / 1000).toFixed(0)}K` : altitude.toLocaleString()} FT
          </span>
        </div>
        <div className="metric-chip" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span className="metric-label" style={{ fontSize: "10.5px", color: "var(--text-faint)", fontFamily: "var(--font-mono), monospace", fontWeight: 600 }}>THR</span>
          <span className="metric-value font-mono tabular-nums" style={{ fontSize: "12px", color: "var(--text)", fontWeight: 600 }}>
            {throttle}%
          </span>
        </div>
      </div>

      {/* Right: Clock, Active Scenario, Engine Countdown, Link-State & User Menu */}
      <div
        className="mission-right-bar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        {/* Dynamic Zulu/Local Clock */}
        <button
          className="header-clock-pill"
          onClick={() => setTimeDisplay(isZulu ? "local" : "zulu")}
          title={`Click to switch to ${isZulu ? "Local" : "Zulu"} time`}
          style={{
            height: "30px",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "0 0.6rem",
            boxSizing: "border-box",
            cursor: "pointer",
          }}
        >
          <Clock size={12} style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: "11.5px", fontFamily: "var(--font-mono), monospace", fontVariantNumeric: "tabular-nums", color: "var(--text)" }}>{clockFormatted}</span>
          <span style={{ fontSize: "10px", color: isZulu ? "var(--accent)" : "var(--text-muted)", fontWeight: 700, fontFamily: "var(--font-mono), monospace" }}>
            {isZulu ? "ZULU" : "LOC"}
          </span>
        </button>

        {/* Dedicated Top Mission SIM Option */}
        {profile === "operator" ? (
          <div
            style={{
              height: "30px",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "0 0.55rem",
              fontSize: "11px",
              fontFamily: "var(--font-mono), monospace",
              fontWeight: 700,
              boxSizing: "border-box",
            }}
            title="Fault injection simulation controls are restricted in GCS Operator profile to avoid accidental in-flight trigger. Switch to Propulsion Engineer in Settings to test simulations."
          >
            <Lock size={11} style={{ color: "var(--status-nominal)", flexShrink: 0 }} />
            <span
              style={{
                fontSize: "10px",
                color: "var(--text-faint)",
                textTransform: "uppercase",
              }}
            >
              FLIGHT SIM:
            </span>
            <span
              style={{
                color: isSimulationActive ? "var(--status-caution)" : "var(--status-nominal)",
                fontSize: "11px",
              }}
            >
              {isSimulationActive ? activeScenario?.toUpperCase() : "NOMINAL"}
            </span>
          </div>
        ) : (
          <div
            style={{
              height: "30px",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              background: isSimulationActive
                ? "color-mix(in srgb, var(--status-caution) 12%, var(--surface-1))"
                : "var(--surface-2)",
              border: `1px solid ${
                isSimulationActive
                  ? "color-mix(in srgb, var(--status-caution) 35%, transparent)"
                  : "var(--border)"
              }`,
              borderRadius: "6px",
              padding: "0 0.45rem",
              fontSize: "11px",
              fontFamily: "var(--font-mono), monospace",
              fontWeight: 700,
              boxSizing: "border-box",
            }}
          >
            {isSimulationActive ? (
              <AlertTriangle size={12} style={{ color: "var(--status-caution)", flexShrink: 0 }} />
            ) : (
              <FlaskConical size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />
            )}
            <span
              style={{
                fontSize: "10.5px",
                color: isSimulationActive ? "var(--status-caution)" : "var(--text-faint)",
                textTransform: "uppercase",
              }}
            >
              SIM:
            </span>
            <select
              value={activeScenario || "Normal"}
              onChange={(e) => injectScenario(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                color: isSimulationActive ? "var(--status-caution)" : "var(--text)",
                fontSize: "11px",
                fontFamily: "var(--font-mono), monospace",
                fontWeight: 700,
                cursor: "pointer",
                outline: "none",
                padding: "0 0.15rem",
                maxWidth: "155px",
              }}
              title="Switch simulation scenario across ground station"
            >
              {SCENARIO_REGISTRY.map((s) => (
                <option key={s.id} value={s.id} style={{ background: "var(--surface-1)", color: "var(--text)" }}>
                  {s.label} ({s.category})
                </option>
              ))}
            </select>

            {isSimulationActive && (
              <button
                onClick={resetScenario}
                title="Reset simulation to nominal baseline"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--status-caution)",
                  borderRadius: "4px",
                  padding: "0.1rem 0.35rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.2rem",
                  fontSize: "10px",
                  fontFamily: "var(--font-mono), monospace",
                  fontWeight: 600,
                }}
              >
                <RotateCcw size={9} />
                RESET
              </button>
            )}
          </div>
        )}

        {/* Est. Engine Time Remaining */}
        <div
          className="remaining-time-badge"
          title="Estimated operational engine time remaining based on active RUL (1 cycle = 60s)"
          style={{
            height: "30px",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "0 0.6rem",
            boxSizing: "border-box",
            opacity: isStale ? 0.65 : 1,
          }}
        >
          <span style={{ fontSize: "10.5px", color: "var(--text-faint)", fontFamily: "var(--font-mono), monospace", fontWeight: 600 }}>REM</span>
          <span
            id="header-remaining-time"
            style={{
              fontSize: "12px",
              fontFamily: "var(--font-mono), monospace",
              fontWeight: 700,
              color: "var(--accent)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {dynamicRemainingTime}
          </span>
        </div>

        {/* Link-State Indicator */}
        <div
          id="conn-badge"
          className="status-pill"
          role="status"
          aria-live="polite"
          style={{
            height: "30px",
            color: getLinkColor(),
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
            padding: "0 0.55rem",
            borderRadius: "6px",
            boxSizing: "border-box",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "11px",
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
                boxShadow: "none",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
              }}
            />
          )}
          <span style={{ fontWeight: 700 }}>{getLinkLabel()}</span>
        </div>



        {/* Tactical / Light Theme Toggle */}
        <button
          id="theme-toggle-btn"
          className="window-pill"
          onClick={toggleTheme}
          title={theme === "light" ? "Switch to Tactical Dark Theme" : "Switch to Aero Light Blue Theme"}
          style={{
            height: "30px",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "0 0.6rem",
            boxSizing: "border-box",
            cursor: "pointer",
            color: "var(--text)",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "11px",
            fontWeight: 700,
            transition: "all 0.15s ease",
          }}
        >
          {theme === "light" ? (
            <>
              <Moon size={12} style={{ color: "var(--accent)" }} />
              <span>DARK</span>
            </>
          ) : (
            <>
              <Sun size={12} style={{ color: "var(--status-caution)" }} />
              <span>LIGHT</span>
            </>
          )}
        </button>

        {/* Modular Operator Profile Dropdown */}
        <UserMenuDropdown
          userEmail={userEmail}
          vehicleId={vehicleId}
          isOpen={userMenuOpen}
          onToggle={() => setUserMenuOpen(!userMenuOpen)}
          onClose={() => setUserMenuOpen(false)}
          onLogout={onLogout}
          onSelectView={onSelectView}
          getLinkColor={getLinkColor}
          getLinkLabel={getLinkLabel}
          relativeTime={relativeTime}
        />
      </div>
    </header>
  );
}
