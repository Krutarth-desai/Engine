"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PhmAlertItem } from "../types/telemetry";
import { supabase } from "@/lib/supabase";
import { generateAlertsAuditPdf } from "@/lib/alertsPdfGenerator";
import AlertCard, { mapSeverity } from "./alerts/AlertCard";
import PageLayout from "./common/PageLayout";
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
  Printer,
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

  // Handle Export Audit Log as Certified PDF
  const handleExportPdf = () => {
    try {
      const allIncidents: HistoricalLogItem[] = [
        ...alerts.map((a) => ({
          ...a,
          ackBy: ackMap[a.id]?.by,
          ackAt: ackMap[a.id]?.at,
          woNumber: woMap[a.id],
        })),
        ...BASELINE_INCIDENTS.filter((b) => !alerts.some((a) => a.id === b.id)),
      ];

      const incidentsToExport = displayedList.length > 0 ? displayedList : allIncidents;

      const doc = generateAlertsAuditPdf({
        vehicleId: payload.vehicle?.vehicle_id || "UAV_ENG_001",
        missionId: payload.vehicle?.mission_id || "ISR_PATROL_27",
        scenario: payload.scenario || "Nominal Cruise",
        payload,
        activeWarningCount,
        activeCautionCount,
        activeAdvisoryCount,
        totalAckCount,
        totalWoCount,
        incidents: incidentsToExport,
        ackMap,
        woMap,
      });

      const dateStr = new Date().toISOString().slice(0, 10);
      doc.save(`AeroTwin_Alerts_PHM_Audit_${payload.vehicle?.vehicle_id || "UAV_ENG_001"}_${dateStr}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF audit report:", err);
    }
  };

  // Handle Direct Browser Print
  const handlePrint = () => {
    window.print();
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
    <PageLayout
      title="Alerts & Chronological PHM Log"
      subtitle="Operational incident record, threshold violation tracking, and dispatch work orders"
      icon={<BellRing size={18} />}
      actions={
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
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.25rem 0.65rem",
              borderRadius: "4px",
              fontSize: "11.5px",
              fontWeight: 600,
              background: activeTab === "ACTIVE" ? "var(--surface-2)" : "transparent",
              color: activeTab === "ACTIVE" ? "var(--text)" : "var(--text-muted)",
              border: `1px solid ${activeTab === "ACTIVE" ? "var(--accent)" : "var(--border)"}`,
              cursor: "pointer",
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            <BellRing size={12} />
            <span>ACTIVE ({totalActiveCount})</span>
          </button>

          <button
            role="tab"
            id="tab-incident-log"
            aria-selected={activeTab === "LOG"}
            aria-controls="panel-alerts-content"
            tabIndex={activeTab === "LOG" ? 0 : -1}
            className={`filter-pill-btn ${activeTab === "LOG" ? "active" : ""}`}
            onClick={() => setActiveTab("LOG")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.25rem 0.65rem",
              borderRadius: "4px",
              fontSize: "11.5px",
              fontWeight: 600,
              background: activeTab === "LOG" ? "var(--surface-2)" : "transparent",
              color: activeTab === "LOG" ? "var(--text)" : "var(--text-muted)",
              border: `1px solid ${activeTab === "LOG" ? "var(--accent)" : "var(--border)"}`,
              cursor: "pointer",
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            <History size={12} />
            <span>INCIDENT LOG ({combinedIncidentLog.length})</span>
          </button>
        </div>
      }
    >

      {/* Print-Only Header Banner */}
      <div className="alerts-print-header" style={{ display: "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #111827", paddingBottom: "8px", marginBottom: "12px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "16pt", fontWeight: 800, color: "#111827" }}>
              AEROTWIN UAV GROUND CONTROL STATION
            </h1>
            <div style={{ fontSize: "11pt", fontWeight: 700, color: "#374151", marginTop: "2px" }}>
              ALERTS &amp; CHRONOLOGICAL PHM AUDIT REPORT
            </div>
            <div style={{ fontSize: "9pt", color: "#6B7280", marginTop: "2px" }}>
              AIRFRAME: {payload.vehicle?.vehicle_id || "UAV_ENG_001"} • MISSION: {payload.vehicle?.mission_id || "ISR_PATROL_27"} • PROPULSION: ROTAX 914 F TURBO
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "9pt", fontWeight: 700, color: "#DC2626" }}>
              UNCLASSIFIED // GCS PHM AUDIT
            </div>
            <div style={{ fontSize: "8.5pt", color: "#4B5563", marginTop: "2px" }}>
              {new Date().toUTCString()}
            </div>
            <div style={{ fontSize: "8pt", color: "#059669", fontWeight: 700, marginTop: "2px" }}>
              STATUS: AIRWORTHY // VERIFIED
            </div>
          </div>
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
            background: activeWarningCount > 0 ? "color-mix(in srgb, var(--status-warning) 14%, var(--surface-1))" : "var(--surface-1)",
            border: `1px solid ${activeWarningCount > 0 ? "color-mix(in srgb, var(--status-warning) 14%, var(--surface-1))" : "var(--border)"}`,
            borderRadius: "6px",
            padding: "0.6rem 0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <div style={{ color: activeWarningCount > 0 ? "var(--status-warning)" : "var(--text-muted)" }}>
            <AlertOctagon size={20} />
          </div>
          <div>
            <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontWeight: 600, fontFamily: "var(--font-mono), monospace" }}>
              WARNINGS
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: activeWarningCount > 0 ? "var(--status-warning)" : "var(--text)", fontFamily: "var(--font-mono), monospace" }}>
              {activeWarningCount}
            </div>
          </div>
        </div>

        {/* Caution KPI */}
        <div
          style={{
            background: activeCautionCount > 0 ? "color-mix(in srgb, var(--status-caution) 14%, var(--surface-1))" : "var(--surface-1)",
            border: `1px solid ${activeCautionCount > 0 ? "color-mix(in srgb, var(--status-caution) 14%, var(--surface-1))" : "var(--border)"}`,
            borderRadius: "6px",
            padding: "0.6rem 0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <div style={{ color: activeCautionCount > 0 ? "var(--status-caution)" : "var(--text-muted)" }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontWeight: 600, fontFamily: "var(--font-mono), monospace" }}>
              CAUTIONS
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: activeCautionCount > 0 ? "var(--status-caution)" : "var(--text)", fontFamily: "var(--font-mono), monospace" }}>
              {activeCautionCount}
            </div>
          </div>
        </div>

        {/* Advisory KPI */}
        <div
          style={{
            background: activeAdvisoryCount > 0 ? "var(--border)" : "var(--surface-1)",
            border: `1px solid ${activeAdvisoryCount > 0 ? "var(--accent)" : "var(--border)"}`,
            borderRadius: "6px",
            padding: "0.6rem 0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <div style={{ color: activeAdvisoryCount > 0 ? "var(--accent)" : "var(--text-muted)" }}>
            <Info size={20} />
          </div>
          <div>
            <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontWeight: 600, fontFamily: "var(--font-mono), monospace" }}>
              ADVISORIES
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: activeAdvisoryCount > 0 ? "var(--accent)" : "var(--text)", fontFamily: "var(--font-mono), monospace" }}>
              {activeAdvisoryCount}
            </div>
          </div>
        </div>

        {/* Acknowledged KPI */}
        <div
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "0.6rem 0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <div style={{ color: "var(--status-nominal)" }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontWeight: 600, fontFamily: "var(--font-mono), monospace" }}>
              ACKNOWLEDGED
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--status-nominal)", fontFamily: "var(--font-mono), monospace" }}>
              {totalAckCount}
            </div>
          </div>
        </div>

        {/* Work Orders KPI */}
        <div
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "0.6rem 0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <div style={{ color: "var(--surface-3)" }}>
            <Wrench size={20} />
          </div>
          <div>
            <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontWeight: 600, fontFamily: "var(--font-mono), monospace" }}>
              WORK ORDERS
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--surface-3)", fontFamily: "var(--font-mono), monospace" }}>
              {totalWoCount}
            </div>
          </div>
        </div>
      </div>

      {/* Controls Strip: Search, Severity Filter, Subsystem Filter & Export */}
      <div
        className="alerts-controls-strip"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          padding: "0.5rem 0",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {/* Left: Severity & Subsystem Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}>
            <Filter size={12} /> SEVERITY:
          </span>
          {(["ALL", "WARNING", "CAUTION", "ADVISORY"] as const).map((sev) => {
            const isActive = severityFilter === sev;
            const color = sev === "WARNING" ? "var(--status-warning)" : sev === "CAUTION" ? "var(--status-caution)" : sev === "ADVISORY" ? "var(--accent)" : "var(--text-muted)";
            return (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                style={{
                  fontSize: "0.68rem",
                  padding: "0.2rem 0.6rem",
                  borderRadius: "4px",
                  fontFamily: "var(--font-mono), monospace",
                  fontWeight: 700,
                  cursor: "pointer",
                  background: isActive ? `${color}20` : "var(--border)",
                  color: isActive ? color : "var(--text-muted)",
                  border: `1px solid ${isActive ? color : "var(--border)"}`,
                  transition: "all 0.15s ease",
                }}
              >
                {sev}
              </button>
            );
          })}

          <div style={{ width: "1px", height: "16px", background: "var(--border)", margin: "0 0.2rem" }} />

          {/* Subsystem Dropdown Filter */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
            <SlidersHorizontal size={12} style={{ color: "var(--text-muted)" }} />
            <select
              value={subsystemFilter}
              onChange={(e) => setSubsystemFilter(e.target.value as SubsystemCategory)}
              style={{
                background: "var(--surface-1)",
                border: "1px solid var(--border)",
                color: subsystemFilter === "ALL" ? "var(--text-muted)" : "var(--accent)",
                borderRadius: "4px",
                padding: "0.2rem 0.5rem",
                fontSize: "0.68rem",
                fontFamily: "var(--font-mono), monospace",
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
                background: "var(--border)",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                padding: "0.2rem 0.55rem",
                fontSize: "0.68rem",
                color: "var(--accent)",
                fontFamily: "var(--font-mono), monospace",
                fontWeight: 700,
              }}
            >
              <span>FOCUS: {focusedComponent.toUpperCase()}</span>
              <button
                onClick={() => setFocusedComponent(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent)",
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
            <Search size={12} style={{ position: "absolute", left: "8px", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "var(--surface-1)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                borderRadius: "4px",
                padding: "0.2rem 0.5rem 0.2rem 1.6rem",
                fontSize: "0.68rem",
                fontFamily: "var(--font-mono), monospace",
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
                  color: "var(--text-muted)",
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
                background: "var(--border)",
                border: "1px solid var(--border)",
                color: "var(--status-nominal)",
                borderRadius: "4px",
                padding: "0.25rem 0.6rem",
                fontSize: "0.68rem",
                fontWeight: 700,
                fontFamily: "var(--font-mono), monospace",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <CheckCheck size={12} />
              <span>ACK ALL</span>
            </button>
          )}

          {/* Export Audit PDF Button */}
          <button
            onClick={handleExportPdf}
            title="Download certified PDF incident audit report"
            className="alerts-export-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              background: "var(--border)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              borderRadius: "4px",
              padding: "0.25rem 0.6rem",
              fontSize: "0.68rem",
              fontWeight: 700,
              fontFamily: "var(--font-mono), monospace",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Download size={12} />
            <span>EXPORT AUDIT</span>
          </button>

          {/* Direct Print Button */}
          <button
            onClick={handlePrint}
            title="Open browser print dialog"
            className="alerts-print-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              background: "var(--border)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              borderRadius: "4px",
              padding: "0.25rem 0.6rem",
              fontSize: "0.68rem",
              fontWeight: 700,
              fontFamily: "var(--font-mono), monospace",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Printer size={12} />
            <span>PRINT</span>
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
            <div className="all-nominal-panel">
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "var(--border)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--status-nominal)",
                  boxShadow: "none",
                }}
              >
                <ShieldCheck size={22} />
              </div>

              <div>
                <h3 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700, color: "var(--status-nominal)", letterSpacing: "0.03em" }}>
                  ALL POWERTRAIN CHANNELS NOMINAL
                </h3>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.74rem", color: "var(--text-muted)", maxWidth: "580px", lineHeight: 1.45 }}>
                  Continuous digital twin residual monitoring confirms all Rotax 914 F powertrain parameters are operating within certified flight operational envelopes. Zero active cautions or warnings.
                </p>
              </div>

              {/* Subsystem Health Grid: 4 cards row 1, Electrical centered row 2 */}
              <div className="nominal-cards-grid">
                {/* 1. Thermal */}
                <div className="nominal-subsystem-card">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--accent)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Flame size={13} style={{ color: "var(--status-caution)" }} /> THERMAL
                    </span>
                    <span style={{ fontSize: "0.62rem", color: "var(--status-nominal)", fontWeight: 700, background: "var(--border)", padding: "0.1rem 0.35rem", borderRadius: "3px" }}>
                      NOMINAL
                    </span>
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}>
                    CHT: {payload.cht_c ?? 142.0}°C | EGT: {payload.egt_c ?? 615.0}°C
                  </div>
                  <div style={{ fontSize: "0.64rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    Thermal margin: +23.0°C
                  </div>
                </div>

                {/* 2. Lubrication */}
                <div className="nominal-subsystem-card">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--accent)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Droplets size={13} style={{ color: "var(--accent)" }} /> LUBRICATION
                    </span>
                    <span style={{ fontSize: "0.62rem", color: "var(--status-nominal)", fontWeight: 700, background: "var(--border)", padding: "0.1rem 0.35rem", borderRadius: "3px" }}>
                      NOMINAL
                    </span>
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}>
                    Press: {payload.oil_pressure_bar ?? 4.69} bar | Temp: {payload.oil_temperature_c ?? 92.0}°C
                  </div>
                  <div style={{ fontSize: "0.64rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    Hydrodynamic film stable
                  </div>
                </div>

                {/* 3. Combustion */}
                <div className="nominal-subsystem-card">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--accent)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Zap size={13} style={{ color: "var(--status-caution)" }} /> COMBUSTION
                    </span>
                    <span style={{ fontSize: "0.62rem", color: "var(--status-nominal)", fontWeight: 700, background: "var(--border)", padding: "0.1rem 0.35rem", borderRadius: "3px" }}>
                      NOMINAL
                    </span>
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}>
                    Flow: {payload.fuel_flow_lh ?? 17.6} L/h | Timing: {payload.injection_timing_deg ?? 23.4}°
                  </div>
                  <div style={{ fontSize: "0.64rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    4-cylinder balance 100%
                  </div>
                </div>

                {/* 4. Dynamics */}
                <div className="nominal-subsystem-card">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--accent)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Activity size={13} style={{ color: "var(--surface-3)" }} /> ROTOR BALANCE
                    </span>
                    <span style={{ fontSize: "0.62rem", color: "var(--status-nominal)", fontWeight: 700, background: "var(--border)", padding: "0.1rem 0.35rem", borderRadius: "3px" }}>
                      NOMINAL
                    </span>
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}>
                    Vib: {payload.vibration_g ?? 1.42}g RMS | RPM: {payload.rpm ?? 2450}
                  </div>
                  <div style={{ fontSize: "0.64rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    Harmonics within 1X/2X limits
                  </div>
                </div>

                {/* 5. Avionics / Electrical */}
                <div className="nominal-subsystem-card nominal-subsystem-card-center">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--accent)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Radio size={13} style={{ color: "var(--accent)" }} /> ELECTRICAL
                    </span>
                    <span style={{ fontSize: "0.62rem", color: "var(--status-nominal)", fontWeight: 700, background: "var(--border)", padding: "0.1rem 0.35rem", borderRadius: "3px" }}>
                      NOMINAL
                    </span>
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}>
                    Bus: {payload.battery_voltage_v ?? 27.6}V | ECU Link: DUAL A/B
                  </div>
                  <div style={{ fontSize: "0.64rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    Alternator float current normal
                  </div>
                </div>
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
                background: "var(--surface-1)",
                border: "1px dashed var(--border)",
                borderRadius: "8px",
              }}
            >
              <CheckCircle2 size={36} style={{ color: "var(--status-nominal)" }} />
              <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>
                No Matching Incident Records
              </span>
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", maxWidth: "460px" }}>
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
    </PageLayout>
  );
}

