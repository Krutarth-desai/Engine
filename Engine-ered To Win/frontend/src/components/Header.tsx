"use client";

import { ConnectionState } from "@/context/TelemetryContext";

interface HeaderProps {
  userEmail: string;
  isConnected: boolean;
  connectionStatus?: ConnectionState;
  vehicleId?: string;
  missionId?: string;
  altitude?: number;
  throttle?: number;
  remainingTimeStr?: string;
  mode?: "LIVE" | "REPLAY";
  missionStatus?: string;
  onLogout: () => void;
}

export default function Header({
  userEmail,
  isConnected,
  connectionStatus = isConnected ? "CONNECTED" : "CONNECTING",
  vehicleId = "UAV_ENG_001",
  missionId = "ISR_PATROL_27",
  altitude = 15000,
  throttle = 75,
  remainingTimeStr = "01:57:32",
  mode = "LIVE",
  missionStatus = "NOMINAL CRUISE",
  onLogout,
}: HeaderProps) {
  return (
    <header id="app-header" className="gcs-mission-header">
      {/* Top Banner Row: Centralized System Title across top with reduced, crisp typography */}
      <div className="gcs-header-top-banner">
        <div className="gcs-header-title-wrap">
          <span className="gcs-header-accent-pip">◀</span>
          <h1 className="gcs-header-system-title">MALE UAV PISTON ENGINE DIGITAL TWIN</h1>
          <span className="gcs-header-divider">•</span>
          <span className="gcs-header-suite-title">GROUND CONTROL STATION &amp; PHM SUITE</span>
          <span className="gcs-header-accent-pip">▶</span>
        </div>
      </div>

      {/* Main Operational Bar Row */}
      <div className="gcs-header-main-row">
        {/* Left: Mission Brand Identity */}
        <div className="brand">
          <div className="logo-badge"><span className="aerotwin-icon">▲</span> AEROTWIN</div>
        </div>

      {/* Center: Mission Operational Telemetry */}
      <div className="mission-center-bar">
        <div className="metric-chip">
          <span className="metric-label">VEHICLE</span>
          <span className="metric-value text-cyan">{vehicleId}</span>
        </div>
        <div className="metric-chip">
          <span className="metric-label">MISSION</span>
          <span className="metric-value text-blue">{missionId}</span>
        </div>
        <div className="metric-chip">
          <span className="metric-label">ALTITUDE</span>
          <span className="metric-value">{altitude.toLocaleString()} FT</span>
        </div>
        <div className="metric-chip">
          <span className="metric-label">THROTTLE</span>
          <span className="metric-value">{throttle}%</span>
        </div>
      </div>

      {/* Right: RUL Countdown & Status Badge */}
      <div className="mission-right-bar">
        <div className="remaining-time-badge" title="Estimated Mission Time Remaining based on LSTM RUL Cycles">
          <span className="time-icon">REM:</span>
          <div className="time-content">
            <span className="time-label">REMAINING TIME</span>
            <span className="time-digits" id="header-remaining-time">
              {remainingTimeStr}
            </span>
          </div>
        </div>

        {/* Mode Badge [ LIVE / REPLAY ] */}
        <div
          id="mode-badge"
          className="status-pill"
          style={{
            borderColor: mode === "REPLAY" ? "rgba(56, 189, 248, 0.5)" : "rgba(16, 185, 129, 0.4)",
            color: mode === "REPLAY" ? "#38bdf8" : "#10b981",
            background: mode === "REPLAY" ? "rgba(56, 189, 248, 0.15)" : "rgba(16, 185, 129, 0.1)",
            fontWeight: 800,
          }}
        >
          <span
            className="status-dot"
            style={{ backgroundColor: mode === "REPLAY" ? "#38bdf8" : "#10b981" }}
          ></span>
          <span>{mode === "REPLAY" ? "REPLAY" : "LIVE"}</span>
        </div>

        {/* Mission Status Badge */}
        <div
          id="mission-status-badge"
          className="status-pill"
          style={{
            borderColor: "rgba(255, 255, 255, 0.12)",
            color: "#e2e8f0",
            fontSize: "0.68rem",
          }}
        >
          <span>{missionStatus}</span>
        </div>

        <div
          id="conn-badge"
          className="status-pill"
          style={{
            borderColor:
              connectionStatus === "CONNECTED"
                ? "rgba(16, 185, 129, 0.4)"
                : connectionStatus === "CONNECTING"
                ? "rgba(56, 189, 248, 0.4)"
                : connectionStatus === "RECONNECTING"
                ? "rgba(245, 158, 11, 0.4)"
                : "rgba(239, 68, 68, 0.4)",
            color:
              connectionStatus === "CONNECTED"
                ? "#10b981"
                : connectionStatus === "CONNECTING"
                ? "#38bdf8"
                : connectionStatus === "RECONNECTING"
                ? "#f59e0b"
                : "#ef4444",
            background:
              connectionStatus === "CONNECTED"
                ? "rgba(16, 185, 129, 0.1)"
                : connectionStatus === "CONNECTING"
                ? "rgba(56, 189, 248, 0.1)"
                : connectionStatus === "RECONNECTING"
                ? "rgba(245, 158, 11, 0.1)"
                : "rgba(239, 68, 68, 0.1)",
          }}
        >
          <span
            className="status-dot"
            style={{
              backgroundColor:
                connectionStatus === "CONNECTED"
                  ? "#10b981"
                  : connectionStatus === "CONNECTING"
                  ? "#38bdf8"
                  : connectionStatus === "RECONNECTING"
                  ? "#f59e0b"
                  : "#ef4444",
            }}
          ></span>
          <span id="conn-text">
            {connectionStatus === "CONNECTED"
              ? "LIVE 1 Hz"
              : connectionStatus === "CONNECTING"
              ? "CONNECTING..."
              : connectionStatus === "RECONNECTING"
              ? "RECONNECTING..."
              : "DISCONNECTED"}
          </span>
        </div>

        <div className="auth-user-info">
          <span className="auth-user-email" id="auth-user-email">
            {userEmail || "Operator"}
          </span>
          <button className="auth-logout-btn" id="auth-logout-btn" onClick={onLogout}>
            LOGOUT
          </button>
        </div>
      </div>
    </div>
  </header>
  );
}
