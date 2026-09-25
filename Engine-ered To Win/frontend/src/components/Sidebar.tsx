"use client";

import React, { useState } from "react";
import { useRole } from "@/context/RoleContext";
import { isViewAllowed, ROLE_META, UserRole } from "@/config/roleConfig";

export type NavView =
  | "dashboard"
  | "telemetry"
  | "diagnostics"
  | "rul"
  | "regression"
  | "maintenance"
  | "alerts"
  | "security";

interface NavItem {
  id: NavView;
  label: string;
  icon: string;
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

const AVAILABLE_ROLES: Array<{ id: Exclude<UserRole, "unset">; label: string; icon: string }> = [
  { id: "gcs_operator", label: "GCS Operator", icon: "🎯" },
  { id: "propulsion_engineer", label: "Propulsion", icon: "⚙️" },
  { id: "maintenance_tech", label: "Maintenance", icon: "🔧" },
];

export default function Sidebar({
  currentView,
  onSelectView,
  selectedEngine,
  onSelectEngine,
  activeAlertCount,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { role, roleMeta, switchRole } = useRole();

  // Full navigation structure — filtered per-role below
  const allNavSections: NavSection[] = [
    {
      heading: "OVERVIEW",
      items: [
        { id: "dashboard" as NavView, label: "Dashboard", icon: "DASH", tag: "LIVE" },
      ],
    },
    {
      heading: "MONITORING",
      items: [
        { id: "telemetry" as NavView, label: "Live Telemetry", icon: "TLM", tag: "9 CH" },
      ],
    },
    {
      heading: "ANALYSIS",
      items: [
        { id: "diagnostics" as NavView, label: "Diagnostics", icon: "DIAG" },
        { id: "rul" as NavView, label: "RUL & Prognostics", icon: "RUL" },
        { id: "regression" as NavView, label: "Regression & Trends", icon: "REG" },
      ],
    },
    {
      heading: "OPERATIONS",
      items: [
        { id: "maintenance" as NavView, label: "Maintenance", icon: "MNT" },
        {
          id: "alerts" as NavView,
          label: "Alerts",
          icon: "ALR",
          badge: activeAlertCount > 0 ? activeAlertCount : undefined,
        },
        { id: "security" as NavView, label: "Security & Audit", icon: "SEC", tag: "ADM" },
      ],
    },
  ];

  // Filter nav sections by role permissions
  const navSections = allNavSections
    .map((sec) => ({
      ...sec,
      items: sec.items.filter((item) => isViewAllowed(role, item.id)),
    }))
    .filter((sec) => sec.items.length > 0);

  const engineOptions = ["UAV_ENG_001", "UAV_ENG_002", "TEST_BENCH_ROTAX"];

  return (
    <aside className={`gcs-sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {/* Sidebar Header with Toggle */}
      <div className="sidebar-header">
        <div className="sidebar-brand-title">
          {!isCollapsed && (
            <>
              <span className="sidebar-logo">▲</span>
              <span className="sidebar-title-text"><strong>AEROTWIN GCS</strong></span>
            </>
          )}
        </div>
        <button
          className="sidebar-collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label="Toggle Sidebar"
        >
          {isCollapsed ? "▶" : "◀"}
        </button>
      </div>

      {/* Role Switcher Section in Sidebar */}
      {!isCollapsed ? (
        <div
          className="sidebar-role-selector-section"
          style={{
            margin: "0.2rem 0.55rem 0.65rem",
            padding: "0.45rem",
            borderRadius: "7px",
            background: "rgba(255, 255, 255, 0.025)",
            border: "1px solid rgba(255, 255, 255, 0.07)",
          }}
        >
          <div
            style={{
              fontSize: "0.58rem",
              fontWeight: 800,
              letterSpacing: "0.6px",
              color: "var(--text-muted, #94a3b8)",
              marginBottom: "0.35rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>OPERATIONAL ROLE</span>
            {roleMeta && (
              <span
                style={{
                  fontSize: "0.52rem",
                  padding: "0.05rem 0.3rem",
                  borderRadius: "3px",
                  background: roleMeta.accentBg,
                  color: roleMeta.accentColor,
                  fontWeight: 700,
                }}
              >
                ACTIVE
              </span>
            )}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.22rem",
            }}
          >
            {AVAILABLE_ROLES.map((r) => {
              const isSelected = role === r.id;
              const meta = ROLE_META[r.id];
              return (
                <button
                  key={r.id}
                  onClick={() => switchRole(r.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    padding: "0.3rem 0.5rem",
                    borderRadius: "5px",
                    border: isSelected
                      ? `1px solid ${meta.accentColor}66`
                      : "1px solid rgba(255, 255, 255, 0.04)",
                    background: isSelected ? meta.accentBg : "transparent",
                    color: isSelected ? meta.accentColor : "#94a3b8",
                    fontSize: "0.68rem",
                    fontWeight: isSelected ? 800 : 500,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                    boxShadow: isSelected ? `0 0 8px ${meta.accentColor}22` : "none",
                  }}
                  title={meta.description}
                >
                  <span style={{ fontSize: "0.78rem" }}>{r.icon}</span>
                  <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.label}
                  </span>
                  {isSelected && (
                    <span
                      style={{
                        width: "5px",
                        height: "5px",
                        borderRadius: "50%",
                        backgroundColor: meta.accentColor,
                        boxShadow: `0 0 5px ${meta.accentColor}`,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Collapsed role icon */
        roleMeta && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "0.4rem 0",
              fontSize: "1rem",
            }}
            title={`Active Role: ${roleMeta.label}`}
          >
            {roleMeta.icon}
          </div>
        )
      )}

      {/* Engine Selector Dropdown */}
      <div className="sidebar-engine-selector">
        {!isCollapsed && <span className="engine-selector-label"><strong>TARGET ENGINE</strong></span>}
        <div className="engine-dropdown-wrap">
          <span className="engine-chip-icon">SYS:</span>
          <select
            className="engine-select"
            value={selectedEngine}
            onChange={(e) => onSelectEngine(e.target.value)}
            disabled={isCollapsed}
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
      <nav className="sidebar-nav">
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
                      title={item.label}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      {!isCollapsed && (
                        <span className="nav-label">{item.label}</span>
                      )}
                      {!isCollapsed && item.tag && (
                        <span className="nav-tag">{item.tag}</span>
                      )}
                      {!isCollapsed && item.badge !== undefined && (
                        <span className="nav-badge-count">{item.badge}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Sidebar Footer status */}
      <div className="sidebar-footer">
        {!isCollapsed && (
          <div className="sidebar-telemetry-status">
            <span className="footer-status-dot"></span>
            <span className="footer-status-text">AVIONICS BUS OK</span>
          </div>
        )}
      </div>
    </aside>
  );
}
