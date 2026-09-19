"use client";

import React, { useState } from "react";
import { PhmAlertItem } from "../types/telemetry";
import ScenarioBar from "./ScenarioBar";
import { AlertOctagon, AlertTriangle, Info, CheckCircle2, BellRing, History } from "lucide-react";

interface AlertsViewProps {
  alerts: PhmAlertItem[];
  activeScenario: string;
  onInjectScenario: (scenario: string) => void;
}

type TabType = "ACTIVE" | "LOG";
type SeverityDisplay = "Warning" | "Caution" | "Advisory" | "Nominal";

function mapSeverity(level: string): { display: SeverityDisplay; color: string; cardClass: string } {
  const l = (level || "").toUpperCase();
  if (l === "ALERT" || l === "CRITICAL" || l === "WARNING") {
    return { display: "Warning", color: "#ef4444", cardClass: "alert-crit" };
  }
  if (l === "CAUTION") {
    return { display: "Caution", color: "#f59e0b", cardClass: "alert-warn" };
  }
  if (l === "INFO" || l === "ADVISORY") {
    return { display: "Advisory", color: "#38bdf8", cardClass: "alert-info" };
  }
  return { display: "Nominal", color: "#10b981", cardClass: "alert-nom" };
}

function getAlertIcon(display: SeverityDisplay) {
  switch (display) {
    case "Warning":
      return <AlertOctagon size={20} style={{ color: "#ef4444" }} />;
    case "Caution":
      return <AlertTriangle size={20} style={{ color: "#f59e0b" }} />;
    case "Advisory":
      return <Info size={20} style={{ color: "#38bdf8" }} />;
    case "Nominal":
    default:
      return <CheckCircle2 size={20} style={{ color: "#10b981" }} />;
  }
}

export default function AlertsView({
  alerts,
  activeScenario,
  onInjectScenario,
}: AlertsViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("ACTIVE");
  const [logFilter, setLogFilter] = useState<string>("ALL");
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

  const handleToggleAck = (id: string) => {
    setAcknowledgedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Active alerts: Unacknowledged Warning, Caution, or Advisory (excludes Nominal)
  const activeAlerts = alerts.filter((a) => {
    const { display } = mapSeverity(a.level);
    const isNominal = display === "Nominal";
    const isAck = acknowledgedIds.has(a.id);
    return !isNominal && !isAck;
  });

  // Log alerts: All alerts with optional filter
  const logAlerts = alerts.filter((a) => {
    if (logFilter === "ALL") return true;
    const { display } = mapSeverity(a.level);
    return display.toUpperCase() === logFilter.toUpperCase();
  });

  const displayList = activeTab === "ACTIVE" ? activeAlerts : logAlerts;

  return (
    <div className="view-container alerts-view">
      <div className="view-header-strip">
        <div>
          <h2 className="view-title"><strong>ALERTS &amp; CHRONOLOGICAL PHM LOG</strong></h2>
          <p className="view-subtitle">Operational incident record, timestamped threshold violations, and telemetry event logs</p>
        </div>

        {/* Tab Switcher: Active vs Log */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            className={`filter-pill-btn ${activeTab === "ACTIVE" ? "active" : ""}`}
            onClick={() => setActiveTab("ACTIVE")}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            <BellRing size={14} />
            <strong>ACTIVE ALERTS ({activeAlerts.length})</strong>
          </button>
          <button
            className={`filter-pill-btn ${activeTab === "LOG" ? "active" : ""}`}
            onClick={() => setActiveTab("LOG")}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            <History size={14} />
            <strong>LOG ({alerts.length})</strong>
          </button>
        </div>
      </div>

      {/* Log severity filter row (only on Log tab) */}
      {activeTab === "LOG" && (
        <div className="alert-filters-row" style={{ marginTop: "0.25rem", marginBottom: "0.75rem" }}>
          {["ALL", "WARNING", "CAUTION", "ADVISORY", "NOMINAL"].map((f) => (
            <button
              key={f}
              className={`filter-pill-btn ${logFilter === f ? "active" : ""}`}
              onClick={() => setLogFilter(f)}
            >
              <strong>{f}</strong>
            </button>
          ))}
        </div>
      )}

      {/* Interactive Scenario Injection Simulator */}
      <div className="alerts-simulator-card">
        <ScenarioBar
          activeScenario={activeScenario}
          onSelectScenario={onInjectScenario}
        />
      </div>

      {/* Alerts Feed List */}
      <div className="alerts-full-list">
        {displayList.length === 0 ? (
          activeTab === "ACTIVE" ? (
            <div className="empty-alerts-box" style={{ padding: "3rem 1.5rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem" }}>
              <CheckCircle2 size={36} style={{ color: "#10b981" }} />
              <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "#f8fafc" }}>No active alerts</span>
              <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", maxWidth: "480px" }}>
                All engine subsystems, thermal parameters, and predictive health margins are operating nominally within envelope.
              </span>
            </div>
          ) : (
            <div className="empty-alerts-box">
              <span>No alerts found matching filter &quot;{logFilter}&quot;.</span>
            </div>
          )
        ) : (
          displayList.map((alert) => {
            const isAck = acknowledgedIds.has(alert.id);
            const { display, color, cardClass } = mapSeverity(alert.level);
            const isNominal = display === "Nominal";

            return (
              <div
                key={alert.id}
                className={`alert-log-card ${cardClass} ${isAck ? "acknowledged" : ""}`}
              >
                <div className="alert-symbol-col">
                  {getAlertIcon(display)}
                </div>

                <div className="alert-details-col">
                  <div className="alert-meta-line">
                    <span
                      className="alert-severity-pill"
                      style={{
                        color,
                        borderColor: `${color}60`,
                        background: `${color}18`,
                      }}
                    >
                      <strong>{display.toUpperCase()}</strong>
                    </span>
                    <span className="alert-headline"><strong>{alert.title}</strong></span>
                    <span className="alert-timestamp-mono">
                      {new Date(alert.timestamp).toLocaleTimeString()} ({alert.time_ago})
                    </span>
                  </div>
                  <div className="alert-desc-line">{alert.message}</div>
                </div>

                {/* Only display Acknowledge button if NOT nominal */}
                {!isNominal && (
                  <div className="alert-action-col">
                    <button
                      className={`ack-btn ${isAck ? "acked" : ""}`}
                      onClick={() => handleToggleAck(alert.id)}
                    >
                      {isAck ? "ACKNOWLEDGED" : "ACKNOWLEDGE"}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

