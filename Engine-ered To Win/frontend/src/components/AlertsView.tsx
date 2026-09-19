"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PhmAlertItem } from "../types/telemetry";
import { supabase } from "@/lib/supabase";
import FaultInjectionPanel from "./common/FaultInjectionPanel";
import AlertCard, { mapSeverity } from "./alerts/AlertCard";
import {
  BellRing,
  History,
  CheckCircle2,
  Filter,
  X,
  Search,
  Download,
  CheckCheck,
  AlertOctagon,
  AlertTriangle,
  Info,
  ShieldCheck,
  Wrench,
  Flame,
  Droplets,
  Activity,
  Zap,
  Radio,
  SlidersHorizontal,
} from "lucide-react";
import { useTelemetry } from "@/context/TelemetryContext";

interface AlertsViewProps {
  alerts?: PhmAlertItem[];
  activeScenario?: string;
  onInjectScenario?: (scenario: string) => void;
}

type TabType = "ACTIVE" | "LOG";
type SeverityFilter = "ALL" | "WARNING" | "CAUTION" | "ADVISORY";
type SubsystemCategory =
  | "ALL"
  | "THERMAL"
  | "LUBRICATION"
  | "COMBUSTION"
  | "MECHANICAL"
  | "IGNITION"
  | "AVIONICS";

interface AckRecord {
  by: string;
  at: string;
  notes?: string;
}

interface HistoricalLogItem extends PhmAlertItem {
  ackBy?: string;
  ackAt?: string;
  woNumber?: string;
}

const BASELINE_INCIDENTS: HistoricalLogItem[] = [
  {
    id: "hist-001",
    level: "INFO",
    title: "PRIMARY TELEMETRY DOWNLINK ESTABLISHED",
    message: "Bi-directional GCS datalink locked on Primary 900 MHz avionics transponder.",
    component: "Avionics Data Acquisition",
    evidence: "RSSI: -62 dBm | Packet Loss: 0.00% | Latency: 16 ms",
    recommended_action: "Maintain continuous flight link monitoring.",
    time_ago: "14 min ago",
    timestamp: new Date(Date.now() - 14 * 60000).toISOString(),
    ackBy: "SYS_AUTO",
    ackAt: new Date(Date.now() - 14 * 60000).toISOString(),
  },
  {
    id: "hist-002",
    level: "INFO",
    title: "PRE-FLIGHT MAGNETO DROP CHECK PASSED",
    message: "Ignition circuit differential test within DO-178C flight envelope tolerances.",
    component: "Dual Magneto & Ignition Harness",
    evidence: "Left Mag: -35 RPM | Right Mag: -40 RPM (Max Allowable: -150 RPM)",
    recommended_action: "Ignition system certified for mission patrol.",
    time_ago: "10 min ago",
    timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
    ackBy: "OPERATOR_GCS",
    ackAt: new Date(Date.now() - 10 * 60000).toISOString(),
  },
  {
    id: "hist-003",
    level: "INFO",
    title: "LUBRICATION CIRCUIT EQUALIZATION",
    message: "Oil pressure and coolant temperature stabilized at operational cruise baseline setpoints.",
    component: "Oil Galley & Scavenge Pump",
    evidence: "Oil Press: 4.69 bar | Oil Temp: 92.0°C | Coolant Temp: 88.5°C",
    recommended_action: "Cleared for normal cruise throttle envelope.",
    time_ago: "6 min ago",
    timestamp: new Date(Date.now() - 6 * 60000).toISOString(),
    ackBy: "SYS_AUTO",
    ackAt: new Date(Date.now() - 6 * 60000).toISOString(),
  },
  {
    id: "hist-004",
    level: "ADVISORY",
    title: "TURBOCHARGER WASTEGATE ACTUATOR CALIBRATION",
    message: "Manifold boost pressure calibration verified during initial climb profile transition.",
    component: "Turbocharger & Boost Control",
    evidence: "Manifold Pressure: 1.15 bar (Target: 1.15 bar) | Wastegate Duty: 42%",
    recommended_action: "Routine telemetry logged for engine trend monitoring.",
    time_ago: "3 min ago",
    timestamp: new Date(Date.now() - 3 * 60000).toISOString(),
    ackBy: "OPERATOR_GCS",
    ackAt: new Date(Date.now() - 3 * 60000).toISOString(),
  },
];

export default function AlertsView({
  alerts = [],
}: AlertsViewProps) {
  const { focusedComponent, setFocusedComponent, payload } = useTelemetry();
  const [activeTab, setActiveTab] = useState<TabType>("ACTIVE");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("ALL");
  const [subsystemFilter, setSubsystemFilter] = useState<SubsystemCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
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
      // Graceful fallback
    }
  };

  // Handle Acknowledge All Active
  const handleAcknowledgeAll = async () => {
    const unacknowledgedActive = alerts.filter((a) => {
      const { display } = mapSeverity(a.level);
      return display !== "Nominal" && !ackMap[a.id];
    });

    if (unacknowledgedActive.length === 0) return;

    const now = new Date().toISOString();
    const updated = { ...ackMap };
    unacknowledgedActive.forEach((a) => {
      updated[a.id] = { by: "OPERATOR_GCS", at: now };
    });
    setAckMap(updated);

    try {
      localStorage.setItem("aerotwin_alert_acks", JSON.stringify(updated));
    } catch {
      // Ignored
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
        priority: alert.level === "ALERT" || alert.level === "CRITICAL" ? "Critical" : alert.level === "CAUTION" ? "High" : "Medium",
        status: "Open",
        source: "Alert",
        assigned_to: "LINE_MAINT_TEAM",
      });
    } catch {
      // Graceful fallback
    }
  };

  // Handle Export Audit Log
  const handleExportLog = () => {
    const exportData = {
      vehicle_id: "UAV_ENG_001",
      exported_at: new Date().toISOString(),
      active_scenario: payload.scenario || "Normal",
      total_active_alerts: alerts.length,
      historical_records: BASELINE_INCIDENTS.concat(alerts as HistoricalLogItem[]),
      acknowledgements: ackMap,
      work_orders: woMap,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AEROTWIN_INCIDENT_AUDIT_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Subsystem matcher helper
  const matchesSubsystem = (a: PhmAlertItem, cat: SubsystemCategory) => {
    if (cat === "ALL") return true;
    const text = `${a.title} ${a.message} ${a.component || ""}`.toLowerCase();
    switch (cat) {
      case "THERMAL":
        return text.includes("cht") || text.includes("egt") || text.includes("heat") || text.includes("temp") || text.includes("cooling");
      case "LUBRICATION":
        return text.includes("oil") || text.includes("lubrication") || text.includes("scavenge") || text.includes("sump");
      case "COMBUSTION":
        return text.includes("fuel") || text.includes("injector") || text.includes("mixture") || text.includes("combustion");
      case "MECHANICAL":
        return text.includes("vibration") || text.includes("bearing") || text.includes("mount") || text.includes("crankcase") || text.includes("rpm");
      case "IGNITION":
        return text.includes("spark") || text.includes("magneto") || text.includes("misfire") || text.includes("ignition");
      case "AVIONICS":
        return text.includes("voltage") || text.includes("bus") || text.includes("sensor") || text.includes("telemetry") || text.includes("dau");
      default:
        return true;
    }
  };

  // Component focus matcher helper
  const matchesFocus = React.useCallback((a: PhmAlertItem) => {
    if (!focusedComponent) return true;
    const text = `${a.title} ${a.message} ${a.component || ""}`.toLowerCase();
    const fc = focusedComponent.toLowerCase().replace(/_/g, " ");
    return text.includes(fc) || fc.includes(text.split(" ")[0]);
  }, [focusedComponent]);

  // Search filter matcher
  const matchesSearch = React.useCallback((a: PhmAlertItem) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.message.toLowerCase().includes(q) ||
      (a.component && a.component.toLowerCase().includes(q)) ||
      (a.evidence && a.evidence.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  // Filter active alerts
  const activeAlerts = useMemo(() => {
    return alerts.filter((a) => {
      const { display } = mapSeverity(a.level);
      const isNominal = display === "Nominal";
      const isAck = !!ackMap[a.id];
      const matchesSev = severityFilter === "ALL" || display.toUpperCase() === severityFilter;
      return !isNominal && !isAck && matchesSev && matchesSubsystem(a, subsystemFilter) && matchesFocus(a) && matchesSearch(a);
    });
  }, [alerts, ackMap, severityFilter, subsystemFilter, matchesFocus, matchesSearch]);

  // Overall counts for KPIs
  const activeWarningCount = alerts.filter((a) => {
    const { display } = mapSeverity(a.level);
    return display === "Warning" && !ackMap[a.id];
  }).length;

  const activeCautionCount = alerts.filter((a) => {
    const { display } = mapSeverity(a.level);
    return display === "Caution" && !ackMap[a.id];
  }).length;

  const activeAdvisoryCount = alerts.filter((a) => {
    const { display } = mapSeverity(a.level);
    return display === "Advisory" && !ackMap[a.id];
  }).length;

  const totalActiveCount = alerts.filter((a) => {
    const { display } = mapSeverity(a.level);
    return display !== "Nominal" && !ackMap[a.id];
  }).length;

  const totalAckCount = Object.keys(ackMap).length;
  const totalWoCount = Object.keys(woMap).length;

  // Combine baseline incidents with current alerts for the full chronological incident log
  const combinedIncidentLog = useMemo(() => {
    const currentList: HistoricalLogItem[] = alerts.map((a) => ({
      ...a,
      ackBy: ackMap[a.id]?.by,
      ackAt: ackMap[a.id]?.at,
      woNumber: woMap[a.id],
    }));

    const currentIds = new Set(currentList.map((a) => a.id));
    const prior = BASELINE_INCIDENTS.filter((b) => !currentIds.has(b.id));

    const full = [...currentList, ...prior];

    return full.filter((a) => {
      if (!matchesFocus(a)) return false;
      if (!matchesSubsystem(a, subsystemFilter)) return false;
      if (!matchesSearch(a)) return false;
      if (severityFilter === "ALL") return true;
      const { display } = mapSeverity(a.level);
      return display.toUpperCase() === severityFilter;
    });
  }, [alerts, ackMap, woMap, severityFilter, subsystemFilter, matchesFocus, matchesSearch]);

  const displayedList = activeTab === "ACTIVE" ? activeAlerts : combinedIncidentLog;

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
              background: activeTab === "ACTIVE" ? (totalActiveCount > 0 ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)") : "rgba(255, 255, 255, 0.04)",
              color: activeTab === "ACTIVE" ? (totalActiveCount > 0 ? "#ef4444" : "#10b981") : "#94a3b8",
              border: `1px solid ${activeTab === "ACTIVE" ? (totalActiveCount > 0 ? "rgba(239, 68, 68, 0.4)" : "rgba(16, 185, 129, 0.4)") : "rgba(255, 255, 255, 0.08)"}`,
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
            <span>INCIDENT LOG ({combinedIncidentLog.length})</span>
          </button>
        </div>
      </div>

      {/* Operational KPI Counters & Quick Actions Bar */}
      <div
        className="alerts-kpi-bar"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.65rem",
        }}
      >
        {/* Critical & Warning KPI */}
        <div
          style={{
            background: activeWarningCount > 0 ? "rgba(239, 68, 68, 0.1)" : "rgba(15, 23, 42, 0.6)",
            border: `1px solid ${activeWarningCount > 0 ? "rgba(239, 68, 68, 0.4)" : "rgba(255, 255, 255, 0.08)"}`,
            borderRadius: "6px",
            padding: "0.6rem 0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <div style={{ color: activeWarningCount > 0 ? "#ef4444" : "#64748b" }}>
            <AlertOctagon size={20} />
          </div>
          <div>
            <div style={{ fontSize: "0.62rem", color: "#94a3b8", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
              WARNINGS
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: activeWarningCount > 0 ? "#ef4444" : "#f8fafc", fontFamily: "'JetBrains Mono', monospace" }}>
              {activeWarningCount}
            </div>
          </div>
        </div>

        {/* Caution KPI */}
        <div
          style={{
            background: activeCautionCount > 0 ? "rgba(245, 158, 11, 0.1)" : "rgba(15, 23, 42, 0.6)",
            border: `1px solid ${activeCautionCount > 0 ? "rgba(245, 158, 11, 0.4)" : "rgba(255, 255, 255, 0.08)"}`,
            borderRadius: "6px",
            padding: "0.6rem 0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <div style={{ color: activeCautionCount > 0 ? "#f59e0b" : "#64748b" }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <div style={{ fontSize: "0.62rem", color: "#94a3b8", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
              CAUTIONS
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: activeCautionCount > 0 ? "#f59e0b" : "#f8fafc", fontFamily: "'JetBrains Mono', monospace" }}>
              {activeCautionCount}
            </div>
          </div>
        </div>

        {/* Advisory KPI */}
        <div
          style={{
            background: activeAdvisoryCount > 0 ? "rgba(56, 189, 248, 0.1)" : "rgba(15, 23, 42, 0.6)",
            border: `1px solid ${activeAdvisoryCount > 0 ? "rgba(56, 189, 248, 0.4)" : "rgba(255, 255, 255, 0.08)"}`,
            borderRadius: "6px",
            padding: "0.6rem 0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <div style={{ color: activeAdvisoryCount > 0 ? "var(--accent-cyan)" : "#64748b" }}>
            <Info size={20} />
          </div>
          <div>
            <div style={{ fontSize: "0.62rem", color: "#94a3b8", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
              ADVISORIES
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: activeAdvisoryCount > 0 ? "var(--accent-cyan)" : "#f8fafc", fontFamily: "'JetBrains Mono', monospace" }}>
              {activeAdvisoryCount}
            </div>
          </div>
        </div>

        {/* Acknowledged KPI */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "6px",
            padding: "0.6rem 0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <div style={{ color: "#10b981" }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: "0.62rem", color: "#94a3b8", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
              ACKNOWLEDGED
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#10b981", fontFamily: "'JetBrains Mono', monospace" }}>
              {totalAckCount}
            </div>
          </div>
        </div>

        {/* Work Orders KPI */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "6px",
            padding: "0.6rem 0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <div style={{ color: "#a855f7" }}>
            <Wrench size={20} />
          </div>
          <div>
            <div style={{ fontSize: "0.62rem", color: "#94a3b8", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
              WORK ORDERS
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#a855f7", fontFamily: "'JetBrains Mono', monospace" }}>
              {totalWoCount}
            </div>
          </div>
        </div>
      </div>

      {/* Fault Injection Simulation Matrix */}
      <FaultInjectionPanel />

      {/* Controls Strip: Search, Severity Filter, Subsystem Filter & Export */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          padding: "0.5rem 0",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        {/* Left: Severity & Subsystem Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
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

          <div style={{ width: "1px", height: "16px", background: "rgba(255, 255, 255, 0.1)", margin: "0 0.2rem" }} />

          {/* Subsystem Dropdown Filter */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
            <SlidersHorizontal size={12} style={{ color: "#64748b" }} />
            <select
              value={subsystemFilter}
              onChange={(e) => setSubsystemFilter(e.target.value as SubsystemCategory)}
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: subsystemFilter === "ALL" ? "#94a3b8" : "var(--accent-cyan)",
                borderRadius: "4px",
                padding: "0.2rem 0.5rem",
                fontSize: "0.68rem",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="ALL">ALL SUBSYSTEMS</option>
              <option value="THERMAL">THERMAL CIRCUIT (CHT/EGT)</option>
              <option value="LUBRICATION">LUBRICATION &amp; OIL</option>
              <option value="COMBUSTION">FUEL &amp; INJECTION</option>
              <option value="MECHANICAL">MECHANICAL &amp; VIBRATION</option>
              <option value="IGNITION">IGNITION &amp; MAGNETOS</option>
              <option value="AVIONICS">AVIONICS &amp; ELECTRICAL</option>
            </select>
          </div>

          {focusedComponent && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                background: "rgba(56, 189, 248, 0.15)",
                border: "1px solid rgba(56, 189, 248, 0.4)",
                borderRadius: "4px",
                padding: "0.2rem 0.55rem",
                fontSize: "0.68rem",
                color: "var(--accent-cyan)",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
              }}
            >
              <span>FOCUS: {focusedComponent.toUpperCase()}</span>
              <button
                onClick={() => setFocusedComponent(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent-cyan)",
                  cursor: "pointer",
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                }}
                title="Clear component focus"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Right: Search Input & Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          {/* Search Box */}
          <div
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <Search size={12} style={{ position: "absolute", left: "8px", color: "#64748b" }} />
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#f8fafc",
                borderRadius: "4px",
                padding: "0.2rem 0.5rem 0.2rem 1.6rem",
                fontSize: "0.68rem",
                fontFamily: "'JetBrains Mono', monospace",
                outline: "none",
                width: "160px",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "6px",
                  background: "transparent",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Acknowledge All Active Button */}
          {activeTab === "ACTIVE" && totalActiveCount > 0 && (
            <button
              onClick={handleAcknowledgeAll}
              title="Acknowledge all unacknowledged active alerts"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#10b981",
                borderRadius: "4px",
                padding: "0.25rem 0.6rem",
                fontSize: "0.68rem",
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <CheckCheck size={12} />
              <span>ACK ALL</span>
            </button>
          )}

          {/* Export Audit Log Button */}
          <button
            onClick={handleExportLog}
            title="Download JSON incident audit report"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#cbd5e1",
              borderRadius: "4px",
              padding: "0.25rem 0.6rem",
              fontSize: "0.68rem",
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Download size={12} />
            <span>EXPORT AUDIT</span>
          </button>
        </div>
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
          activeTab === "ACTIVE" ? (
            /* ALL SYSTEMS NOMINAL FLIGHT CLEARANCE PANEL */
            <div
              className="all-nominal-panel"
              style={{
                background: "rgba(10, 18, 32, 0.75)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                borderRadius: "8px",
                padding: "2rem 1.5rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1.25rem",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "2px solid rgba(16, 185, 129, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#10b981",
                  boxShadow: "0 0 20px rgba(16, 185, 129, 0.25)",
                }}
              >
                <ShieldCheck size={32} />
              </div>

              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#10b981", letterSpacing: "0.04em" }}>
                  ALL POWERTRAIN CHANNELS NOMINAL
                </h3>
                <p style={{ margin: "0.35rem 0 0", fontSize: "0.76rem", color: "#94a3b8", maxWidth: "560px", lineHeight: 1.5 }}>
                  Continuous digital twin residual monitoring confirms all Rotax 914 F powertrain parameters are operating within certified flight operational envelopes. Zero active cautions or warnings.
                </p>
              </div>

              {/* Subsystem Health Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "0.75rem",
                  width: "100%",
                  maxWidth: "960px",
                  marginTop: "0.5rem",
                }}
              >
                {/* 1. Thermal */}
                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "6px",
                    padding: "0.75rem",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Flame size={13} style={{ color: "#f59e0b" }} /> THERMAL
                    </span>
                    <span style={{ fontSize: "0.62rem", color: "#10b981", fontWeight: 700, background: "rgba(16, 185, 129, 0.12)", padding: "0.1rem 0.35rem", borderRadius: "3px" }}>
                      NOMINAL
                    </span>
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                    CHT: {payload.cht_c ?? 142.0}°C | EGT: {payload.egt_c ?? 615.0}°C
                  </div>
                  <div style={{ fontSize: "0.64rem", color: "#64748b", marginTop: "0.2rem" }}>
                    Thermal margin: +23.0°C
                  </div>
                </div>

                {/* 2. Lubrication */}
                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "6px",
                    padding: "0.75rem",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Droplets size={13} style={{ color: "#38bdf8" }} /> LUBRICATION
                    </span>
                    <span style={{ fontSize: "0.62rem", color: "#10b981", fontWeight: 700, background: "rgba(16, 185, 129, 0.12)", padding: "0.1rem 0.35rem", borderRadius: "3px" }}>
                      NOMINAL
                    </span>
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                    Press: {payload.oil_pressure_bar ?? 4.69} bar | Temp: {payload.oil_temperature_c ?? 92.0}°C
                  </div>
                  <div style={{ fontSize: "0.64rem", color: "#64748b", marginTop: "0.2rem" }}>
                    Hydrodynamic film stable
                  </div>
                </div>

                {/* 3. Combustion */}
                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "6px",
                    padding: "0.75rem",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Zap size={13} style={{ color: "#eab308" }} /> COMBUSTION
                    </span>
                    <span style={{ fontSize: "0.62rem", color: "#10b981", fontWeight: 700, background: "rgba(16, 185, 129, 0.12)", padding: "0.1rem 0.35rem", borderRadius: "3px" }}>
                      NOMINAL
                    </span>
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                    Flow: {payload.fuel_flow_lh ?? 17.6} L/h | Timing: {payload.injection_timing_deg ?? 23.4}°
                  </div>
                  <div style={{ fontSize: "0.64rem", color: "#64748b", marginTop: "0.2rem" }}>
                    4-cylinder balance 100%
                  </div>
                </div>

                {/* 4. Dynamics */}
                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "6px",
                    padding: "0.75rem",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Activity size={13} style={{ color: "#a855f7" }} /> ROTOR BALANCE
                    </span>
                    <span style={{ fontSize: "0.62rem", color: "#10b981", fontWeight: 700, background: "rgba(16, 185, 129, 0.12)", padding: "0.1rem 0.35rem", borderRadius: "3px" }}>
                      NOMINAL
                    </span>
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                    Vib: {payload.vibration_g ?? 1.42}g RMS | RPM: {payload.rpm ?? 2450}
                  </div>
                  <div style={{ fontSize: "0.64rem", color: "#64748b", marginTop: "0.2rem" }}>
                    Harmonics within 1X/2X limits
                  </div>
                </div>

                {/* 5. Avionics */}
                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "6px",
                    padding: "0.75rem",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Radio size={13} style={{ color: "#38bdf8" }} /> ELECTRICAL
                    </span>
                    <span style={{ fontSize: "0.62rem", color: "#10b981", fontWeight: 700, background: "rgba(16, 185, 129, 0.12)", padding: "0.1rem 0.35rem", borderRadius: "3px" }}>
                      NOMINAL
                    </span>
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                    Bus: {payload.battery_voltage_v ?? 27.6}V | ECU Link: DUAL A/B
                  </div>
                  <div style={{ fontSize: "0.64rem", color: "#64748b", marginTop: "0.2rem" }}>
                    Alternator float current normal
                  </div>
                </div>
              </div>

              {/* Injected Scenario Helper Hint */}
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "#64748b",
                  maxWidth: "520px",
                  lineHeight: 1.4,
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px dashed rgba(255, 255, 255, 0.08)",
                  borderRadius: "6px",
                  padding: "0.5rem 0.8rem",
                }}
              >
                <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>Tip: </span>
                Click any scenario in the <strong>Fault Injection Simulation Matrix</strong> above (e.g., <em>Lubrication Starvation</em> or <em>Cooling / Overheating</em>) to test real-time alert generation, cross-sensor isolation, and work order creation.
              </div>
            </div>
          ) : (
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
                No Matching Incident Records
              </span>
              <span style={{ fontSize: "0.76rem", color: "#64748b", maxWidth: "460px" }}>
                No historical events match the current filter criteria (Severity: &quot;{severityFilter}&quot;, Subsystem: &quot;{subsystemFilter}&quot;).
              </span>
            </div>
          )
        ) : (
          displayedList.map((alert: HistoricalLogItem) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              isAcknowledged={!!ackMap[alert.id] || !!alert.ackBy}
              ackMeta={ackMap[alert.id] || (alert.ackBy ? { by: alert.ackBy, at: alert.ackAt || alert.timestamp } : undefined)}
              workOrderNumber={woMap[alert.id] || alert.woNumber}
              onAcknowledge={handleAcknowledge}
              onCreateWorkOrder={handleCreateWorkOrder}
            />
          ))
        )}
      </div>
    </div>
  );
}

