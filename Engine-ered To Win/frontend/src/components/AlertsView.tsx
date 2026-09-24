"use client";

import React, { useState } from "react";
import { PhmAlertItem } from "../types/telemetry";
import ScenarioBar from "./ScenarioBar";

interface AlertsViewProps {
  alerts: PhmAlertItem[];
  activeScenario: string;
  onInjectScenario: (scenario: string) => void;
}

export default function AlertsView({
  alerts,
  activeScenario,
  onInjectScenario,
}: AlertsViewProps) {
  const [filter, setFilter] = useState<string>("ALL");
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

  const handleToggleAck = (id: string) => {
    setAcknowledgedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filter === "ALL") return true;
    return a.level === filter;
  });

  const getAlertIcon = (level: string) => {
    switch (level) {
      case "ALERT":
        return "🚨";
      case "CAUTION":
        return "⚠️";
      case "INFO":
        return "ℹ️";
      case "NORMAL":
      default:
        return "✅";
    }
  };

  const getAlertCardClass = (level: string, isAck: boolean) => {
    let base = "alert-log-card";
    if (level === "ALERT") base += " alert-crit";
    else if (level === "CAUTION") base += " alert-warn";
    else if (level === "INFO") base += " alert-info";
    else base += " alert-nom";

    if (isAck) base += " acknowledged";
    return base;
  };

  return (
    <div className="gcs-view-container alerts-view">
      {/* Standardized GCS View Header */}
      <div className="gcs-view-header">
        <div className="gcs-view-title-wrap">
          <h2 className="gcs-view-title">
            <span>🔔</span> ACTIVE ALERTS &amp; CHRONOLOGICAL PHM LOG
          </h2>
          <span className="gcs-view-tagline">
            Full operational incident record, timestamped threshold violations, and telemetry event logs
          </span>
        </div>

        {/* Severity Filter Buttons */}
        <div className="gcs-view-actions">
          {["ALL", "ALERT", "CAUTION", "INFO", "NORMAL"].map((f) => (
            <button
              key={f}
              className={`gcs-btn gcs-btn-sm ${
                filter === f ? "gcs-btn-primary" : "gcs-btn-secondary"
              }`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Scenario Injection Simulator */}
      <div className="gcs-card" style={{ padding: "0.65rem 0.9rem" }}>
        <ScenarioBar
          activeScenario={activeScenario}
          onSelectScenario={onInjectScenario}
        />
      </div>

      {/* Alerts Feed List */}
      <div className="alerts-full-list" style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
        {filteredAlerts.length === 0 ? (
          <div
            className="empty-alerts-box"
            style={{
              padding: "2rem",
              textAlign: "center",
              background: "rgba(14, 21, 38, 0.6)",
              borderRadius: "8px",
              border: "1px dashed rgba(255, 255, 255, 0.1)",
              color: "#94a3b8",
              fontSize: "0.82rem",
            }}
          >
            <span>✅ No alerts found matching filter "{filter}". All telemetry nominal.</span>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isAck = acknowledgedIds.has(alert.id);
            return (
              <div key={alert.id} className={getAlertCardClass(alert.level, isAck)}>
                <div className="alert-symbol-col">
                  <span className="symbol-icon">{getAlertIcon(alert.level)}</span>
                </div>

                <div className="alert-details-col">
                  <div className="alert-meta-line">
                    <span className="alert-severity-pill">
                      <strong>{alert.level}</strong>
                    </span>
                    <span className="alert-headline">
                      <strong>{alert.title}</strong>
                    </span>
                    <span className="alert-timestamp-mono">
                      {new Date(alert.timestamp).toLocaleTimeString()} ({alert.time_ago})
                    </span>
                  </div>
                  <div className="alert-desc-line">{alert.message}</div>
                </div>

                <div className="alert-action-col">
                  <button
                    className={`gcs-btn gcs-btn-sm ${isAck ? "gcs-btn-secondary" : "gcs-btn-warning"}`}
                    onClick={() => handleToggleAck(alert.id)}
                  >
                    {isAck ? "ACKNOWLEDGED" : "ACKNOWLEDGE"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
