"use client";

import React, { useState, useEffect } from "react";
import { PhmAlertItem } from "../types/telemetry";
import { supabase } from "@/lib/supabase";
import FaultInjectionPanel from "./common/FaultInjectionPanel";
import AlertCard, { mapSeverity } from "./alerts/AlertCard";
import { BellRing, History, CheckCircle2, Filter } from "lucide-react";

interface AlertsViewProps {
  alerts?: PhmAlertItem[];
  activeScenario?: string;
  onInjectScenario?: (scenario: string) => void;
}

type TabType = "ACTIVE" | "LOG";
type SeverityFilter = "ALL" | "WARNING" | "CAUTION" | "ADVISORY";

interface AckRecord {
  by: string;
  at: string;
  notes?: string;
}

export default function AlertsView({
  alerts = [],
}: AlertsViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("ACTIVE");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("ALL");
  const [ackMap, setAckMap] = useState<Record<string, AckRecord>>({});
  const [woMap, setWoMap] = useState<Record<string, string>>({}); // alert.id -> wo_number

  // Load persistent acknowledgements & work orders from Supabase (with localStorage fallback)
  useEffect(() => {
    const loadData = async () => {
      // 1. Load Acks from Supabase
      try {
        const { data: ackData, error: ackErr } = await supabase
          .from("alert_acknowledgements")
          .select("alert_id, acknowledged_by, acknowledged_at, notes")
          .eq("vehicle_id", "UAV_ENG_001");

        if (ackData && !ackErr && ackData.length > 0) {
          const map: Record<string, AckRecord> = {};
          ackData.forEach((row: { alert_id: string; acknowledged_by: string; acknowledged_at: string; notes?: string }) => {
            map[row.alert_id] = {
              by: row.acknowledged_by,
              at: row.acknowledged_at,
              notes: row.notes,
            };
          });
          setAckMap(map);
        } else {
          // Fallback to localStorage
          const localAcks = localStorage.getItem("aerotwin_alert_acks");
          if (localAcks) setAckMap(JSON.parse(localAcks));
        }
      } catch {
        const localAcks = localStorage.getItem("aerotwin_alert_acks");
        if (localAcks) setAckMap(JSON.parse(localAcks));
      }

      // 2. Load WOs from Supabase
      try {
        const { data: woData, error: woErr } = await supabase
          .from("work_orders")
          .select("wo_number, description")
          .eq("vehicle_id", "UAV_ENG_001");

        if (woData && !woErr && woData.length > 0) {
          const map: Record<string, string> = {};
          woData.forEach((row: { wo_number: string; description?: string }) => {
            if (row.description && row.description.startsWith("ALERT_ID:")) {
              const alertId = row.description.split(" ")[0].replace("ALERT_ID:", "");
              map[alertId] = row.wo_number;
            }
          });
          setWoMap(map);
        } else {
          const localWos = localStorage.getItem("aerotwin_alert_wos");
          if (localWos) setWoMap(JSON.parse(localWos));
        }
      } catch {
        const localWos = localStorage.getItem("aerotwin_alert_wos");
        if (localWos) setWoMap(JSON.parse(localWos));
      }
    };

    loadData();
  }, []);

  // Handle Acknowledgement
  const handleAcknowledge = async (alertId: string) => {
    const record: AckRecord = {
      by: "OPERATOR_GCS",
      at: new Date().toISOString(),
    };
    const updated = { ...ackMap, [alertId]: record };
    setAckMap(updated);

    try {
      localStorage.setItem("aerotwin_alert_acks", JSON.stringify(updated));
    } catch {
      // Ignored
    }

    try {
      await supabase.from("alert_acknowledgements").upsert(
        {
          alert_id: alertId,
          vehicle_id: "UAV_ENG_001",
          acknowledged_by: record.by,
          acknowledged_at: record.at,
        },
        { onConflict: "alert_id,vehicle_id" }
      );
    } catch {
      // Supabase table gracefully falls back
    }
  };

  // Handle Work Order Creation
  const handleCreateWorkOrder = async (alert: PhmAlertItem) => {
    const woNum = `WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const updated = { ...woMap, [alert.id]: woNum };
    setWoMap(updated);

    try {
      localStorage.setItem("aerotwin_alert_wos", JSON.stringify(updated));
    } catch {
      // Ignored
    }

    try {
      await supabase.from("work_orders").insert({
        wo_number: woNum,
        vehicle_id: "UAV_ENG_001",
        title: `Corrective Action: ${alert.title}`,
        description: `ALERT_ID:${alert.id} - ${alert.message}`,
        priority: alert.level === "ALERT" ? "Critical" : alert.level === "CAUTION" ? "High" : "Medium",
        status: "Open",
        source: "Alert",
        assigned_to: "LINE_MAINT_TEAM",
      });
    } catch {
      // Graceful fallback
    }
  };

  // Filter alerts by active status & severity
  const activeAlerts = alerts.filter((a) => {
    const { display } = mapSeverity(a.level);
    const isNominal = display === "Nominal";
    const isAck = !!ackMap[a.id];
    const matchesSev = severityFilter === "ALL" || display.toUpperCase() === severityFilter;
    return !isNominal && !isAck && matchesSev;
  });

  const totalActiveCount = alerts.filter((a) => {
    const { display } = mapSeverity(a.level);
    return display !== "Nominal" && !ackMap[a.id];
  }).length;

  const logAlerts = alerts.filter((a) => {
    if (severityFilter === "ALL") return true;
    const { display } = mapSeverity(a.level);
    return display.toUpperCase() === severityFilter;
  });

  const displayedList = activeTab === "ACTIVE" ? activeAlerts : logAlerts;

  return (
    <div className="view-container alerts-view" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Header Strip */}
      <div className="view-header-strip" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h2 className="view-title" style={{ margin: 0, fontSize: "1.2rem", letterSpacing: "0.04em" }}>
            <strong>ALERTS &amp; CHRONOLOGICAL PHM LOG</strong>
          </h2>
          <p className="view-subtitle" style={{ margin: "0.2rem 0 0", fontSize: "0.72rem", color: "#64748b" }}>
            Operational incident record, threshold violation tracking, and dispatch work orders
          </p>
        </div>

        {/* Tab Switcher with A11y Tablist & Keyboard Nav */}
        <div
          role="tablist"
          aria-label="Alerts view tabs"
          style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}
        >
          <button
            role="tab"
            id="tab-active-alerts"
            aria-selected={activeTab === "ACTIVE"}
            aria-controls="panel-alerts-content"
            tabIndex={activeTab === "ACTIVE" ? 0 : -1}
            className={`filter-pill-btn ${activeTab === "ACTIVE" ? "active" : ""}`}
            onClick={() => setActiveTab("ACTIVE")}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                setActiveTab("LOG");
              }
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.35rem 0.75rem",
              borderRadius: "6px",
              fontSize: "0.72rem",
              fontWeight: 700,
              background: activeTab === "ACTIVE" ? "rgba(239, 68, 68, 0.15)" : "rgba(255, 255, 255, 0.04)",
              color: activeTab === "ACTIVE" ? "#ef4444" : "#94a3b8",
              border: `1px solid ${activeTab === "ACTIVE" ? "rgba(239, 68, 68, 0.4)" : "rgba(255, 255, 255, 0.08)"}`,
              cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <BellRing size={13} />
            <span>ACTIVE ALERTS ({totalActiveCount})</span>
          </button>

          <button
            role="tab"
            id="tab-incident-log"
            aria-selected={activeTab === "LOG"}
            aria-controls="panel-alerts-content"
            tabIndex={activeTab === "LOG" ? 0 : -1}
            className={`filter-pill-btn ${activeTab === "LOG" ? "active" : ""}`}
            onClick={() => setActiveTab("LOG")}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                setActiveTab("ACTIVE");
              }
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.35rem 0.75rem",
              borderRadius: "6px",
              fontSize: "0.72rem",
              fontWeight: 700,
              background: activeTab === "LOG" ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.04)",
              color: activeTab === "LOG" ? "var(--accent-cyan)" : "#94a3b8",
              border: `1px solid ${activeTab === "LOG" ? "rgba(56, 189, 248, 0.4)" : "rgba(255, 255, 255, 0.08)"}`,
              cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <History size={13} />
            <span>INCIDENT LOG ({alerts.length})</span>
          </button>
        </div>
      </div>

      {/* Fault Injection Panel */}
      <FaultInjectionPanel />

      {/* Severity Filter Chips Row */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", padding: "0.4rem 0" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.68rem", color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
          <Filter size={12} /> SEVERITY:
        </span>
        {(["ALL", "WARNING", "CAUTION", "ADVISORY"] as const).map((sev) => {
          const isActive = severityFilter === sev;
          const color = sev === "WARNING" ? "#ef4444" : sev === "CAUTION" ? "#f59e0b" : sev === "ADVISORY" ? "#38bdf8" : "#94a3b8";
          return (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              style={{
                fontSize: "0.68rem",
                padding: "0.2rem 0.6rem",
                borderRadius: "4px",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
                cursor: "pointer",
                background: isActive ? `${color}20` : "rgba(255, 255, 255, 0.03)",
                color: isActive ? color : "#64748b",
                border: `1px solid ${isActive ? color : "rgba(255, 255, 255, 0.08)"}`,
                transition: "all 0.15s ease",
              }}
            >
              {sev}
            </button>
          );
        })}
      </div>

      {/* Alerts Feed List */}
      <div
        id="panel-alerts-content"
        role="region"
        aria-label="Alerts feed"
        aria-live="polite"
        className="alerts-full-list"
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
      >
        {displayedList.length === 0 ? (
          <div
            className="empty-alerts-box"
            style={{
              padding: "3.5rem 1.5rem",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.6rem",
              background: "rgba(15, 23, 42, 0.4)",
              border: "1px dashed rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
            }}
          >
            <CheckCircle2 size={36} style={{ color: "#10b981" }} />
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "#f8fafc" }}>
              {activeTab === "ACTIVE" ? "No Active Critical Alerts" : "No Matching Historical Records"}
            </span>
            <span style={{ fontSize: "0.76rem", color: "#64748b", maxWidth: "460px" }}>
              {activeTab === "ACTIVE"
                ? "All powerplant channels and health margins are operating nominally within envelope. Injected scenarios will populate real-time alerts here."
                : `No alert events match filter "${severityFilter}".`}
            </span>
          </div>
        ) : (
          displayedList.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              isAcknowledged={!!ackMap[alert.id]}
              ackMeta={ackMap[alert.id]}
              workOrderNumber={woMap[alert.id]}
              onAcknowledge={handleAcknowledge}
              onCreateWorkOrder={handleCreateWorkOrder}
            />
          ))
        )}
      </div>
    </div>
  );
}
