"use client";

import React, { useState, useEffect } from "react";
import { useTelemetry } from "@/context/TelemetryContext";
import { useProfile } from "@/context/ProfileContext";
import {
  LayoutDashboard,
  Activity,
  Cpu,
  Gauge,
  Compass,
  Wrench,
  BellRing,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  FlaskConical,
  Atom,
  Shield,
} from "lucide-react";

export type NavView =
  | "dashboard"
  | "telemetry"
  | "diagnostics"
  | "rul"
  | "mission"
  | "physics-model"
  | "regression"
  | "faults"
  | "maintenance"
  | "alerts"
  | "settings";

interface NavItem {
  id: NavView;
  label: string;
  icon: React.ReactNode;
  shortcut: string;
  tag?: string;
  badge?: number;
  badgeSeverity?: "nominal" | "caution" | "warning";
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
  activeAlertCount?: number;
  alertsSeverity?: "nominal" | "caution" | "warning";
}

export default function Sidebar({
  currentView,
  onSelectView,
  selectedEngine,
  onSelectEngine,
  activeAlertCount = 0,
  alertsSeverity = "nominal",
}: SidebarProps) {
  const { linkState, payload } = useTelemetry();
  const { profile, profileDef, canAccessView } = useProfile();

  // Collapsed state initialized from localStorage for persistent preference
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("aerotwin_sidebar_collapsed") === "true";
      } catch {
        return false;
      }
    }
    return false;
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("aerotwin_sidebar_collapsed", String(next));
        } catch {
          // ignore storage quota / sandbox issues
        }
      }
      return next;
    });
  };

  const sensorChannelCount = payload.sensor_list?.length || 9;
  const linkLabel = linkState === "live" ? "LIVE" : linkState.toUpperCase();

  // 5 strict groups per layout specification
  const navSections: NavSection[] = [
    {
      heading: "OVERVIEW",
      items: [
        {
          id: "dashboard",
          label: "Dashboard",
          icon: <LayoutDashboard size={16} />,
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
          icon: <Activity size={16} />,
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
          icon: <Cpu size={16} />,
          shortcut: "3",
        },
        {
          id: "rul",
          label: "RUL & Prognostics",
          icon: <Gauge size={16} />,
          shortcut: "4",
        },
        {
          id: "mission",
          label: "Mission Profile",
          icon: <Compass size={16} />,
          shortcut: "5",
        },
        {
          id: "physics-model",
          label: "Physics Model",
          icon: <Atom size={16} />,
          shortcut: "6",
        },
      ],
    },
    {
      heading: "SIMULATION",
      items: [
        {
          id: "faults",
          label: "Simulation (SIM)",
          icon: <FlaskConical size={16} />,
          shortcut: "7",
          tag: "9 SCEN",
        },
      ],
    },
    {
      heading: "OPERATIONS",
      items: [
        {
          id: "maintenance",
          label: "Maintenance",
          icon: <Wrench size={16} />,
          shortcut: "8",
        },
        {
          id: "alerts",
          label: "Alerts",
          icon: <BellRing size={16} />,
          shortcut: "9",
          badge: activeAlertCount > 0 ? activeAlertCount : undefined,
          badgeSeverity: alertsSeverity,
        },
      ],
    },
  ];

  // Filter navigation items by active profile RBAC permissions
  const visibleNavSections = navSections
    .map((sec) => ({
      ...sec,
      items: sec.items.filter((item) => canAccessView(item.id)),
    }))
    .filter((sec) => sec.items.length > 0);

  // Global keyboard shortcuts: 1-9 switch views, 0 for Settings
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
        "5": "mission",
        "6": "physics-model",
        "7": "faults",
        "8": "maintenance",
        "9": "alerts",
        "0": "settings",
      };

      if (keyMap[e.key] && canAccessView(keyMap[e.key])) {
        onSelectView(keyMap[e.key]);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSelectView, canAccessView]);

  const engineOptions = ["UAV_ENG_001", "UAV_ENG_002", "TEST_BENCH_ROTAX"];

  return (
    <aside className={`gcs-sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {/* Sidebar Top: Collapse Toggle and Brand / Vehicle Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand-title">
          {!isCollapsed && (
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.05em",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                fontFamily: "var(--font-sans), system-ui, sans-serif",
              }}
            >
              GCS Station
            </span>
          )}
        </div>
        <button
          className="sidebar-collapse-btn"
          onClick={toggleCollapse}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label="Toggle sidebar"
        >
          {isCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>

      {/* Target-Engine Selector at top */}
      <div className="sidebar-engine-selector">
        {!isCollapsed && <span className="engine-selector-label">Target Engine</span>}
        <div className="engine-dropdown-wrap">
          <span
            className="engine-chip-icon"
            style={{
              color: "var(--text-muted)",
              fontSize: "11px",
              fontFamily: "var(--font-mono), monospace",
              fontWeight: 500,
            }}
          >
            ENG
          </span>
          <select
            className="engine-select"
            value={selectedEngine}
            onChange={(e) => onSelectEngine(e.target.value)}
            disabled={isCollapsed}
            title={selectedEngine}
            aria-label="Target engine selection"
          >
            {engineOptions.map((eng) => (
              <option key={eng} value={eng}>
                {eng}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Workstation Profile Indicator */}
      {!isCollapsed ? (
        <div
          className="sidebar-profile-indicator"
          style={{
            padding: "0.35rem 0.65rem",
            margin: "0 0.5rem 0.5rem 0.5rem",
            background: "var(--surface-2)",
            border: `1px solid ${profileDef.badgeBorder}`,
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.4rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", minWidth: 0 }}>
            <Shield size={12} style={{ color: profileDef.badgeColor, flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span
                style={{
                  fontSize: "9px",
                  color: "var(--text-faint)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                Workstation
              </span>
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 700,
                  color: profileDef.badgeColor,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontFamily: "var(--font-mono), monospace",
                  marginTop: "2px",
                }}
                title={profileDef.title}
              >
                {profileDef.roleTag}
              </span>
            </div>
          </div>
          <button
            onClick={() => onSelectView("settings")}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              fontSize: "10px",
              cursor: "pointer",
              padding: "2px 4px",
              borderRadius: "3px",
              textDecoration: "underline",
              fontFamily: "var(--font-mono), monospace",
            }}
            title="Configure Workstation Profile & RBAC Matrix in Settings"
          >
            ROLE
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "0.2rem 0 0.4rem 0",
          }}
          title={`Active Workstation: ${profileDef.title}`}
        >
          <button
            onClick={() => onSelectView("settings")}
            style={{
              background: "var(--surface-2)",
              border: `1px solid ${profileDef.badgeBorder}`,
              borderRadius: "4px",
              padding: "2px 4px",
              cursor: "pointer",
              fontSize: "8.5px",
              fontWeight: 800,
              fontFamily: "var(--font-mono), monospace",
              color: profileDef.badgeColor,
            }}
            title="Open Settings to change profile"
          >
            {profile === "operator" ? "GCS" : profile === "maintenance" ? "MNT" : "ENG"}
          </button>
        </div>
      )}

      {/* Navigation Sections */}
      <nav className="sidebar-nav" aria-label="Main Navigation">
        {visibleNavSections.map((sec) => (
          <div key={sec.heading} className="nav-group">
            {!isCollapsed && <div className="nav-group-heading">{sec.heading}</div>}
            <ul className="nav-list">
              {sec.items.map((item) => {
                const isActive = currentView === item.id;
                const isWarningBadge = item.badgeSeverity === "warning";
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
                      {item.badge !== undefined && (
                        <span
                          className="nav-badge-count"
                          style={{
                            background: isWarningBadge
                              ? "color-mix(in srgb, var(--status-warning) 16%, var(--surface-1))"
                              : "color-mix(in srgb, var(--status-caution) 16%, var(--surface-1))",
                            color: isWarningBadge ? "var(--status-warning)" : "var(--status-caution)",
                            border: `1px solid ${isWarningBadge ? "color-mix(in srgb, var(--status-warning) 30%, transparent)" : "color-mix(in srgb, var(--status-caution) 30%, transparent)"}`,
                            borderRadius: "10px",
                            padding: "0.1rem 0.45rem",
                            fontSize: "11px",
                            fontWeight: 600,
                            fontFamily: "var(--font-mono), monospace",
                            marginLeft: isCollapsed ? "auto" : undefined,
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                      {!isCollapsed && !item.badge && (
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

      {/* Pinned Settings at bottom above hairline divider */}
      <div
        className="sidebar-pinned-settings"
        style={{
          borderTop: "1px solid var(--border)",
          padding: "0.5rem",
        }}
      >
        <button
          className={`nav-item-btn ${currentView === "settings" ? "active" : ""}`}
          onClick={() => onSelectView("settings")}
          aria-current={currentView === "settings" ? "page" : undefined}
          title="Settings (Shortcut: [0])"
        >
          <span className="nav-icon">
            <Settings size={16} />
          </span>
          {!isCollapsed && <span className="nav-label">Settings</span>}
          {!isCollapsed && <span className="sidebar-shortcut-hint">0</span>}
        </button>
      </div>

      {/* Sidebar Footer Status */}
      <div className="sidebar-footer">
        {!isCollapsed ? (
          <div className="sidebar-telemetry-status">
            <Radio size={12} style={{ color: "var(--status-nominal)" }} />
            <span className="footer-status-text">AVIONICS BUS NOMINAL</span>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "0.35rem 0" }} title="Avionics Bus Nominal">
            <span
              style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "var(--status-nominal)",
              }}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
