"use client";

import React, { useState, useEffect } from "react";
import { useTelemetry } from "@/context/TelemetryContext";
import {
  LayoutDashboard,
  Activity,
  Cpu,
  Gauge,
  TrendingUp,
  Wrench,
  BellRing,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
} from "lucide-react";

export type NavView =
  | "dashboard"
  | "telemetry"
  | "diagnostics"
  | "rul"
  | "regression"
  | "maintenance"
  | "alerts";

interface NavItem {
  id: NavView;
  label: string;
  icon: React.ReactNode;
  shortcut: string;
  tag?: string;
  badge?: number;
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  selectedEngine: string;
  onSelectEngine: (engine: string) => void;
  activeAlertCount: number;
}

export default function Sidebar({
  currentView,
  onSelectView,
  selectedEngine,
  onSelectEngine,
  activeAlertCount,
}: SidebarProps) {
  const { linkState, payload } = useTelemetry();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sensorChannelCount = payload.sensor_list?.length || 9;
  const linkLabel = linkState === "live" ? "LIVE" : linkState.toUpperCase();

  const navSections: NavSection[] = [
    {
      heading: "OVERVIEW",
      items: [
        {
          id: "dashboard",
          label: "Dashboard",
          icon: <LayoutDashboard size={17} />,
          shortcut: "1",
          tag: linkLabel,
        },
      ],
    },
    {
      heading: "MONITORING",
      items: [
        {
          id: "telemetry",
          label: "Live Telemetry",
          icon: <Activity size={17} />,
          shortcut: "2",
          tag: `${sensorChannelCount} CH`,
        },
      ],
    },
    {
      heading: "ANALYSIS",
      items: [
        {
          id: "diagnostics",
          label: "Diagnostics",
          icon: <Cpu size={17} />,
          shortcut: "3",
        },
        {
          id: "rul",
          label: "RUL & Prognostics",
          icon: <Gauge size={17} />,
          shortcut: "4",
        },
        {
          id: "regression",
          label: "Regression & Trends",
          icon: <TrendingUp size={17} />,
          shortcut: "5",
        },
      ],
    },
    {
      heading: "OPERATIONS",
      items: [
        {
          id: "maintenance",
          label: "Maintenance",
          icon: <Wrench size={17} />,
          shortcut: "6",
        },
        {
          id: "alerts",
          label: "Alerts",
          icon: <BellRing size={17} />,
          shortcut: "7",
          badge: activeAlertCount > 0 ? activeAlertCount : undefined,
        },
      ],
    },
  ];

  // Global keyboard shortcuts: 1-7 switch views
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const activeElement = document.activeElement;
      const isInput =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.tagName === "SELECT");
      if (isInput || e.ctrlKey || e.metaKey || e.altKey) return;

      const keyMap: Record<string, NavView> = {
        "1": "dashboard",
        "2": "telemetry",
        "3": "diagnostics",
        "4": "rul",
        "5": "regression",
        "6": "maintenance",
        "7": "alerts",
      };

      if (keyMap[e.key]) {
        onSelectView(keyMap[e.key]);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSelectView]);

  const engineOptions = ["UAV_ENG_001", "UAV_ENG_002", "TEST_BENCH_ROTAX"];

  return (
    <aside className={`gcs-sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {/* Sidebar Top: Clean Station Title (No Duplicate AeroTwin Branding) */}
      <div className="sidebar-header">
        <div className="sidebar-brand-title">
          {!isCollapsed && (
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 800,
                letterSpacing: "1px",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                fontFamily: "var(--font-mono), monospace",
              }}
            >
              GCS WORKSTATION
            </span>
          )}
        </div>
        <button
          className="sidebar-collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label="Toggle Sidebar"
        >
          {isCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>

      {/* Engine Target Selector */}
      <div className="sidebar-engine-selector">
        {!isCollapsed && <span className="engine-selector-label"><strong>ACTIVE VEHICLE</strong></span>}
        <div className="engine-dropdown-wrap">
          <span className="engine-chip-icon">SYS:</span>
          <select
            className="engine-select"
            value={selectedEngine}
            onChange={(e) => onSelectEngine(e.target.value)}
            disabled={isCollapsed}
            title={selectedEngine}
          >
            {engineOptions.map((eng) => (
              <option key={eng} value={eng}>
                {eng}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="sidebar-nav" aria-label="Main Navigation">
        {navSections.map((sec) => (
          <div key={sec.heading} className="nav-group">
            {!isCollapsed && <div className="nav-group-heading">{sec.heading}</div>}
            <ul className="nav-list">
              {sec.items.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <li key={item.id}>
                    <button
                      className={`nav-item-btn ${isActive ? "active" : ""}`}
                      onClick={() => onSelectView(item.id)}
                      aria-current={isActive ? "page" : undefined}
                      title={`${item.label} (Shortcut: [${item.shortcut}])`}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      {!isCollapsed && (
                        <span className="nav-label">{item.label}</span>
                      )}
                      {!isCollapsed && item.tag && (
                        <span
                          className="nav-tag"
                          style={{
                            color: linkState === "live" ? "var(--accent)" : "var(--status-caution)",
                            borderColor: linkState === "live" ? "var(--border-strong)" : "color-mix(in srgb, var(--status-caution) 14%, var(--surface-1))",
                          }}
                        >
                          {item.tag}
                        </span>
                      )}
                      {!isCollapsed && item.badge !== undefined && (
                        <span
                          className="nav-badge-count"
                          style={{
                            background: "var(--border)",
                            color: "var(--status-warning)",
                            border: "1px solid color-mix(in srgb, var(--status-warning) 14%, var(--surface-1))",
                            borderRadius: "10px",
                            padding: "0.1rem 0.45rem",
                            fontSize: "0.62rem",
                            fontWeight: 700,
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                      {!isCollapsed && (
                        <span className="sidebar-shortcut-hint">
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Sidebar Footer Status */}
      <div className="sidebar-footer">
        {!isCollapsed ? (
          <div className="sidebar-telemetry-status">
            <Radio size={12} style={{ color: "var(--status-nominal)" }} />
            <span className="footer-status-text">AVIONICS BUS NOMINAL</span>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "0.5rem 0" }} title="Avionics Bus Nominal">
            <span
              style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "var(--status-nominal)",
                boxShadow: "none",
              }}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
