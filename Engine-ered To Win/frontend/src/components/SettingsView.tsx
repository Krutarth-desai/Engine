"use client";

import React, { useState } from "react";
import {
  useProfile,
  WorkstationProfile,
  WORKSTATION_PROFILES,
  ACCESS_MATRIX_DATA,
  FAULT_INJECTION_MATRIX,
} from "@/context/ProfileContext";
import { useTelemetry } from "@/context/TelemetryContext";
import { useTheme } from "@/context/ThemeContext";
import PageLayout from "./common/PageLayout";
import {
  ShieldCheck,
  Compass,
  Wrench,
  Cpu,
  Layers,
  Table,
  Lock,
  Zap,
  Check,
  Search,
  BookOpen,
  Sliders,
  Activity,
  BellRing,
  Info,
  Moon,
  Sun,
  Shield,
} from "lucide-react";

type SettingsSection = "rbac" | "units" | "telemetry" | "alerts" | "system";
type RbacSubTab = "profiles" | "matrix" | "simulation" | "blueprints";

export default function SettingsView() {
  const { profile, setProfile, profileDef } = useProfile();
  const {
    unitPreference,
    setUnitPreference,
    timeDisplay,
    setTimeDisplay,
  } = useTelemetry();
  const { theme, setTheme } = useTheme();

  const [activeSection, setActiveSection] = useState<SettingsSection>("rbac");
  const [rbacTab, setRbacTab] = useState<RbacSubTab>("profiles");
  const [searchQuery, setSearchQuery] = useState("");
  const [matrixCategoryFilter, setMatrixCategoryFilter] = useState<string>("ALL");
  const [activationNotice, setActivationNotice] = useState<string | null>(null);

  // Telemetry stream and audio alert preferences
  const [streamRate, setStreamRate] = useState<string>("10");
  const [audioAlerts, setAudioAlerts] = useState<boolean>(true);

  const handleActivateProfile = (selectedProfile: WorkstationProfile) => {
    setProfile(selectedProfile);
    const def = WORKSTATION_PROFILES[selectedProfile];
    setActivationNotice(`Workstation interface reconfigured for ${def.title}. RBAC boundaries applied.`);
    setTimeout(() => {
      setActivationNotice(null);
    }, 4500);
  };

  // Filter Access Matrix by search and category
  const categories = ["ALL", ...Array.from(new Set(ACCESS_MATRIX_DATA.map((r) => r.category)))];

  const filteredMatrix = ACCESS_MATRIX_DATA.filter((row) => {
    const matchesCat = matrixCategoryFilter === "ALL" || row.category === matrixCategoryFilter;
    const matchesSearch =
      searchQuery === "" ||
      row.capability.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.operator.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.maintenance.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.propulsion.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const SETTINGS_SECTIONS = [
    {
      id: "rbac" as SettingsSection,
      label: "Workstation Roles & RBAC",
      icon: <ShieldCheck size={16} />,
      tag: profileDef.roleTag,
    },
    {
      id: "units" as SettingsSection,
      label: "Units & Display",
      icon: <Sliders size={16} />,
    },
    {
      id: "telemetry" as SettingsSection,
      label: "Telemetry Stream",
      icon: <Activity size={16} />,
    },
    {
      id: "alerts" as SettingsSection,
      label: "Audio & Alerts",
      icon: <BellRing size={16} />,
    },
    {
      id: "system" as SettingsSection,
      label: "System Information",
      icon: <Info size={16} />,
    },
  ];

  return (
    <PageLayout
      title="Workstation Settings & GCS Preferences"
      subtitle="Ground Control Station display units, telemetry sampling rates, and alert trigger thresholds."
      icon={<Sliders size={18} />}
      tags={
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            className="nav-tag font-mono"
            style={{
              color: profileDef.badgeColor,
              borderColor: profileDef.badgeBorder,
              background: "var(--surface-2)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.2rem 0.55rem",
              borderRadius: "4px",
              fontWeight: 700,
              fontSize: "11px",
            }}
          >
            ACTIVE ROLE: {profileDef.roleTag}
          </span>
        </div>
      }
    >
      {/* 2-Column Split: Left Navigation + Right Content Pane */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "250px 1fr",
          gap: "1.25rem",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Left Section Navigation Card */}
        <div
          className="card"
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "0.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
            height: "fit-content",
          }}
        >
          {SETTINGS_SECTIONS.map((sec) => {
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={isActive ? "btn-primary" : "btn-secondary"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.6rem 0.85rem",
                  borderRadius: "8px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: isActive ? "1px solid var(--accent)" : "1px solid transparent",
                  textAlign: "left",
                  width: "100%",
                  justifyContent: "flex-start",
                  transition: "all 0.15s ease",
                }}
              >
                {sec.icon}
                <span style={{ flex: 1 }}>{sec.label}</span>
                {sec.tag && (
                  <span
                    style={{
                      fontSize: "9px",
                      fontFamily: "var(--font-mono), monospace",
                      fontWeight: 700,
                      padding: "1px 5px",
                      borderRadius: "4px",
                      background: "var(--surface-2)",
                      color: profileDef.badgeColor,
                      border: `1px solid ${profileDef.badgeBorder}`,
                    }}
                  >
                    {sec.tag}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Content Area Card */}
        <div
          className="card"
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            overflowY: "auto",
            minHeight: 0,
          }}
        >
          {/* SECTION 1: ROLE-BASED ACCESS CONTROL (RBAC) */}
          {activeSection === "rbac" && (
            <>
              {/* RBAC Header & Active Role Status Strip */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: "1rem",
                }}
              >
                <div>
                  <h3 className="card-title" style={{ margin: "0 0 0.25rem 0", fontSize: "16px" }}>
                    Workstation Roles & Role-Based Access Control (RBAC)
                  </h3>
                  <p className="text-caption" style={{ color: "var(--text-muted)", margin: 0 }}>
                    Select operational profiles tailored for GCS UAV Operators, Maintenance Technicians, or Propulsion Engineers.
                  </p>
                </div>

                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.3rem 0.6rem",
                    borderRadius: "6px",
                    background: "var(--surface-2)",
                    border: `1px solid ${profileDef.badgeBorder}`,
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: profileDef.badgeColor,
                  }}
                >
                  <Shield size={12} />
                  <span>ACTIVE: {profileDef.roleTag}</span>
                </div>
              </div>

              {/* Activation Notice Banner */}
              {activationNotice && (
                <div
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--accent)",
                    color: "var(--text)",
                    borderRadius: "8px",
                    padding: "0.6rem 1rem",
                    fontSize: "0.78rem",
                    fontFamily: "var(--font-mono), monospace",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Check size={14} style={{ color: "var(--accent)" }} />
                  <span>{activationNotice}</span>
                </div>
              )}

              {/* RBAC Sub-navigation Pills */}
              <div
                style={{
                  display: "flex",
                  gap: "0.4rem",
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: "0.75rem",
                }}
              >
                <button
                  className={rbacTab === "profiles" ? "btn-primary" : "btn-secondary"}
                  onClick={() => setRbacTab("profiles")}
                  style={{
                    padding: "0.35rem 0.85rem",
                    borderRadius: "6px",
                    fontSize: "12px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    cursor: "pointer",
                  }}
                >
                  <Layers size={13} />
                  Workstation Profiles
                </button>
                <button
                  className={rbacTab === "matrix" ? "btn-primary" : "btn-secondary"}
                  onClick={() => setRbacTab("matrix")}
                  style={{
                    padding: "0.35rem 0.85rem",
                    borderRadius: "6px",
                    fontSize: "12px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    cursor: "pointer",
                  }}
                >
                  <Table size={13} />
                  Access Matrix (29 Capabilities)
                </button>
                <button
                  className={rbacTab === "simulation" ? "btn-primary" : "btn-secondary"}
                  onClick={() => setRbacTab("simulation")}
                  style={{
                    padding: "0.35rem 0.85rem",
                    borderRadius: "6px",
                    fontSize: "12px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    cursor: "pointer",
                  }}
                >
                  <Zap size={13} />
                  Simulation RBAC & Safety
                </button>
                <button
                  className={rbacTab === "blueprints" ? "btn-primary" : "btn-secondary"}
                  onClick={() => setRbacTab("blueprints")}
                  style={{
                    padding: "0.35rem 0.85rem",
                    borderRadius: "6px",
                    fontSize: "12px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    cursor: "pointer",
                  }}
                >
                  <BookOpen size={13} />
                  Persona Blueprints
                </button>
              </div>

              {/* RBAC TAB 1: WORKSTATION PROFILES */}
              {rbacTab === "profiles" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
                    {(Object.keys(WORKSTATION_PROFILES) as WorkstationProfile[]).map((profKey) => {
                      const item = WORKSTATION_PROFILES[profKey];
                      const isActive = profile === profKey;

                      return (
                        <div
                          key={profKey}
                          className="card"
                          style={{
                            background: isActive
                              ? "var(--surface-2)"
                              : "var(--surface-1)",
                            border: `1px solid ${isActive ? item.badgeBorder : "var(--border)"}`,
                            borderRadius: "10px",
                            padding: "1.15rem",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            gap: "0.9rem",
                            boxShadow: isActive ? "0 0 0 1px " + item.badgeBorder : "none",
                            transition: "all 0.2s ease",
                          }}
                        >
                          <div>
                            {/* Card Header: Icon + Role Tag + Status */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <div
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "8px",
                                    background: "var(--surface-3)",
                                    border: `1px solid ${item.badgeBorder}`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: item.badgeColor,
                                  }}
                                >
                                  {profKey === "operator" ? (
                                    <Compass size={17} />
                                  ) : profKey === "maintenance" ? (
                                    <Wrench size={17} />
                                  ) : (
                                    <Cpu size={17} />
                                  )}
                                </div>
                                <div>
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: 700,
                                      fontFamily: "var(--font-mono), monospace",
                                      color: item.badgeColor,
                                      letterSpacing: "0.06em",
                                    }}
                                  >
                                    {item.roleTag}
                                  </span>
                                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                    {item.hierarchyLevel}
                                  </div>
                                </div>
                              </div>

                              {isActive ? (
                                <span
                                  style={{
                                    fontSize: "10.5px",
                                    background: "var(--accent)",
                                    color: "var(--accent-contrast)",
                                    borderRadius: "4px",
                                    padding: "0.15rem 0.5rem",
                                    fontWeight: 700,
                                    fontFamily: "var(--font-mono), monospace",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.25rem",
                                  }}
                                >
                                  <Check size={11} /> ACTIVE
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: "10px",
                                    background: "var(--surface-3)",
                                    color: "var(--text-faint)",
                                    borderRadius: "4px",
                                    padding: "0.15rem 0.45rem",
                                    fontFamily: "var(--font-mono), monospace",
                                  }}
                                >
                                  STANDBY
                                </span>
                              )}
                            </div>

                            {/* Card Title & Core Question */}
                            <h4 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 0.35rem 0", color: "var(--text)" }}>
                              {item.title}
                            </h4>
                            <div
                              style={{
                                fontSize: "12px",
                                fontStyle: "italic",
                                color: item.badgeColor,
                                marginBottom: "0.6rem",
                                padding: "0.35rem 0.55rem",
                                background: "var(--surface-3)",
                                borderRadius: "4px",
                                borderLeft: `2px solid ${item.badgeBorder}`,
                              }}
                            >
                              &quot;{item.mainQuestion}&quot;
                            </div>

                            <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 0.75rem 0", lineHeight: "1.5" }}>
                              {item.description}
                            </p>

                            {/* Persona Details Box */}
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.35rem",
                                background: "var(--surface-3)",
                                borderRadius: "6px",
                                padding: "0.6rem 0.75rem",
                                fontSize: "11px",
                                border: "1px solid var(--border)",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "var(--text-faint)" }}>Target Persona:</span>
                                <span style={{ color: "var(--text)", fontWeight: 600 }}>{item.targetPersona}</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "var(--text-faint)" }}>Default Entry:</span>
                                <span style={{ fontFamily: "var(--font-mono), monospace", color: "var(--accent)" }}>
                                  /{item.defaultView}
                                </span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "var(--text-faint)" }}>Fault Injection:</span>
                                <span
                                  style={{
                                    fontFamily: "var(--font-mono), monospace",
                                    fontWeight: 600,
                                    color:
                                      item.faultInjectionTier === "none"
                                        ? "var(--status-caution)"
                                        : item.faultInjectionTier === "preset"
                                        ? "var(--accent)"
                                        : "var(--status-nominal)",
                                  }}
                                >
                                  {item.faultInjectionTier === "none"
                                    ? "Locked (Flight Safety)"
                                    : item.faultInjectionTier === "preset"
                                    ? "Preset Test Bench"
                                    : "Unrestricted Full"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Button */}
                          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
                            {isActive ? (
                              <button
                                disabled
                                className="btn-secondary"
                                style={{
                                  width: "100%",
                                  padding: "0.45rem 0",
                                  fontSize: "12px",
                                  fontFamily: "var(--font-mono), monospace",
                                  fontWeight: 700,
                                  opacity: 0.85,
                                  cursor: "default",
                                }}
                              >
                                CURRENT ACTIVE PROFILE
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivateProfile(profKey)}
                                className="btn-primary"
                                style={{
                                  width: "100%",
                                  padding: "0.45rem 0",
                                  fontSize: "12px",
                                  fontFamily: "var(--font-mono), monospace",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                ACTIVATE {item.roleTag}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* RBAC TAB 2: ACCESS MATRIX TABLE */}
              {rbacTab === "matrix" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {/* Category Filter & Search Bar */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setMatrixCategoryFilter(cat)}
                          className={matrixCategoryFilter === cat ? "btn-primary" : "btn-secondary"}
                          style={{
                            padding: "0.25rem 0.6rem",
                            borderRadius: "5px",
                            fontSize: "11px",
                            cursor: "pointer",
                          }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <div style={{ position: "relative", minWidth: "220px" }}>
                      <Search size={13} style={{ position: "absolute", left: "0.55rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)" }} />
                      <input
                        type="text"
                        placeholder="Search capabilities..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.35rem 0.55rem 0.35rem 1.8rem",
                          borderRadius: "6px",
                          fontSize: "11.5px",
                          background: "var(--surface-2)",
                          border: "1px solid var(--border)",
                          color: "var(--text)",
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>

                  {/* 29-Row Comparative Table */}
                  <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "8px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                          <th style={{ padding: "0.6rem 0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>Capability</th>
                          <th style={{ padding: "0.6rem 0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>Category</th>
                          <th style={{ padding: "0.6rem 0.85rem", color: "var(--accent)", fontWeight: 700 }}>1. GCS Operator</th>
                          <th style={{ padding: "0.6rem 0.85rem", color: "var(--status-caution)", fontWeight: 700 }}>2. Maintenance Team</th>
                          <th style={{ padding: "0.6rem 0.85rem", color: "var(--status-nominal)", fontWeight: 700 }}>3. Propulsion Engineer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMatrix.map((row, idx) => (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: "1px solid var(--border)",
                              background: idx % 2 === 0 ? "transparent" : "var(--surface-2)",
                            }}
                          >
                            <td style={{ padding: "0.55rem 0.85rem", fontWeight: 600, color: "var(--text)" }}>{row.capability}</td>
                            <td style={{ padding: "0.55rem 0.85rem", color: "var(--text-faint)", fontSize: "11px" }}>{row.category}</td>
                            <td style={{ padding: "0.55rem 0.85rem" }}>
                              <span
                                style={{
                                  fontSize: "11px",
                                  padding: "0.15rem 0.45rem",
                                  borderRadius: "4px",
                                  fontFamily: "var(--font-mono), monospace",
                                  fontWeight: 600,
                                  background:
                                    row.operatorStatus === "full"
                                      ? "color-mix(in srgb, var(--accent) 15%, var(--surface-1))"
                                      : row.operatorStatus === "limited"
                                      ? "color-mix(in srgb, var(--status-caution) 15%, var(--surface-1))"
                                      : "var(--surface-3)",
                                  color:
                                    row.operatorStatus === "full"
                                      ? "var(--accent)"
                                      : row.operatorStatus === "limited"
                                      ? "var(--status-caution)"
                                      : "var(--text-faint)",
                                }}
                              >
                                {row.operator}
                              </span>
                            </td>
                            <td style={{ padding: "0.55rem 0.85rem" }}>
                              <span
                                style={{
                                  fontSize: "11px",
                                  padding: "0.15rem 0.45rem",
                                  borderRadius: "4px",
                                  fontFamily: "var(--font-mono), monospace",
                                  fontWeight: 600,
                                  background:
                                    row.maintenanceStatus === "full"
                                      ? "color-mix(in srgb, var(--accent) 15%, var(--surface-1))"
                                      : row.maintenanceStatus === "limited"
                                      ? "color-mix(in srgb, var(--status-caution) 15%, var(--surface-1))"
                                      : "var(--surface-3)",
                                  color:
                                    row.maintenanceStatus === "full"
                                      ? "var(--accent)"
                                      : row.maintenanceStatus === "limited"
                                      ? "var(--status-caution)"
                                      : "var(--text-faint)",
                                }}
                              >
                                {row.maintenance}
                              </span>
                            </td>
                            <td style={{ padding: "0.55rem 0.85rem" }}>
                              <span
                                style={{
                                  fontSize: "11px",
                                  padding: "0.15rem 0.45rem",
                                  borderRadius: "4px",
                                  fontFamily: "var(--font-mono), monospace",
                                  fontWeight: 600,
                                  background:
                                    row.propulsionStatus === "full"
                                      ? "color-mix(in srgb, var(--accent) 15%, var(--surface-1))"
                                      : row.propulsionStatus === "limited"
                                      ? "color-mix(in srgb, var(--status-caution) 15%, var(--surface-1))"
                                      : "var(--surface-3)",
                                  color:
                                    row.propulsionStatus === "full"
                                      ? "var(--accent)"
                                      : row.propulsionStatus === "limited"
                                      ? "var(--status-caution)"
                                      : "var(--text-faint)",
                                }}
                              >
                                {row.propulsion}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* RBAC TAB 3: SIMULATION RBAC & SAFETY RATIONALE */}
              {rbacTab === "simulation" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      padding: "1rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Lock size={15} style={{ color: "var(--status-caution)" }} />
                      <strong style={{ fontSize: "13px", color: "var(--text)" }}>
                        Defense Aviation Flight Safety Rationale
                      </strong>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0, lineHeight: "1.5" }}>
                      In actual defense UAV operations, operators are flying real airframes. Showing an interactive &quot;Inject Turbocharger Seizure&quot; control on the active flight console creates catastrophic risk of accidental activation or cognitive confusion during live sorties. Fault simulation is therefore strictly restricted to Ground Maintenance and Propulsion Engineering stations.
                    </p>
                  </div>

                  <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "8px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                          <th style={{ padding: "0.6rem 0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>Simulation Feature</th>
                          <th style={{ padding: "0.6rem 0.85rem", color: "var(--accent)", fontWeight: 700 }}>1. GCS Operator</th>
                          <th style={{ padding: "0.6rem 0.85rem", color: "var(--status-caution)", fontWeight: 700 }}>2. Maintenance Team</th>
                          <th style={{ padding: "0.6rem 0.85rem", color: "var(--status-nominal)", fontWeight: 700 }}>3. Propulsion Engineer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {FAULT_INJECTION_MATRIX.map((row, idx) => (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: "1px solid var(--border)",
                              background: idx % 2 === 0 ? "transparent" : "var(--surface-2)",
                            }}
                          >
                            <td style={{ padding: "0.6rem 0.85rem", fontWeight: 600, color: "var(--text)" }}>{row.feature}</td>
                            <td style={{ padding: "0.6rem 0.85rem" }}>
                              <span
                                style={{
                                  fontSize: "11px",
                                  padding: "0.15rem 0.45rem",
                                  borderRadius: "4px",
                                  fontFamily: "var(--font-mono), monospace",
                                  fontWeight: 600,
                                  background: row.operatorAllowed
                                    ? "color-mix(in srgb, var(--accent) 15%, var(--surface-1))"
                                    : "color-mix(in srgb, var(--status-caution) 15%, var(--surface-1))",
                                  color: row.operatorAllowed ? "var(--accent)" : "var(--status-caution)",
                                }}
                              >
                                {row.operator}
                              </span>
                            </td>
                            <td style={{ padding: "0.6rem 0.85rem" }}>
                              <span
                                style={{
                                  fontSize: "11px",
                                  padding: "0.15rem 0.45rem",
                                  borderRadius: "4px",
                                  fontFamily: "var(--font-mono), monospace",
                                  fontWeight: 600,
                                  background: row.maintenanceAllowed
                                    ? "color-mix(in srgb, var(--accent) 15%, var(--surface-1))"
                                    : "var(--surface-3)",
                                  color: row.maintenanceAllowed ? "var(--accent)" : "var(--text-faint)",
                                }}
                              >
                                {row.maintenance}
                              </span>
                            </td>
                            <td style={{ padding: "0.6rem 0.85rem" }}>
                              <span
                                style={{
                                  fontSize: "11px",
                                  padding: "0.15rem 0.45rem",
                                  borderRadius: "4px",
                                  fontFamily: "var(--font-mono), monospace",
                                  fontWeight: 600,
                                  background: row.propulsionAllowed
                                    ? "color-mix(in srgb, var(--status-nominal) 15%, var(--surface-1))"
                                    : "var(--surface-3)",
                                  color: row.propulsionAllowed ? "var(--status-nominal)" : "var(--text-faint)",
                                }}
                              >
                                {row.propulsion}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* RBAC TAB 4: PERSONA BLUEPRINTS */}
              {rbacTab === "blueprints" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {(Object.keys(WORKSTATION_PROFILES) as WorkstationProfile[]).map((profKey) => {
                    const item = WORKSTATION_PROFILES[profKey];
                    return (
                      <div
                        key={profKey}
                        style={{
                          background: "var(--surface-2)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          padding: "1rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: item.badgeColor }}>
                            {item.title}
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--text-faint)", fontFamily: "var(--font-mono), monospace" }}>
                            [{item.roleTag}]
                          </span>
                        </div>
                        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 0.5rem 0", lineHeight: "1.5" }}>
                          {item.description}
                        </p>
                        <div style={{ fontSize: "11px", color: "var(--text-faint)" }}>
                          <strong>Permitted Navigation Views:</strong> {item.allowedViews.join(", ")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* SECTION 2: UNITS & DISPLAY */}
          {activeSection === "units" && (
            <>
              <div>
                <h3 className="card-title" style={{ margin: "0 0 0.25rem 0", fontSize: "16px" }}>
                  Display Units &amp; Formatting
                </h3>
                <p className="text-caption" style={{ color: "var(--text-muted)", margin: 0 }}>
                  Select standardized aerospace measurement systems for pressure, timestamps, and interface themes.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "480px" }}>
                <div>
                  <label className="text-caption" style={{ display: "block", color: "var(--text-muted)", marginBottom: "0.4rem", fontWeight: 600 }}>
                    OIL PRESSURE UNIT
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      className={unitPreference === "psi" ? "btn-primary" : "btn-secondary"}
                      onClick={() => setUnitPreference("psi")}
                      style={{ padding: "0.4rem 1rem", borderRadius: "6px", fontSize: "13px", cursor: "pointer" }}
                    >
                      Pounds per Sq. Inch (psi)
                    </button>
                    <button
                      className={unitPreference === "bar" ? "btn-primary" : "btn-secondary"}
                      onClick={() => setUnitPreference("bar")}
                      style={{ padding: "0.4rem 1rem", borderRadius: "6px", fontSize: "13px", cursor: "pointer" }}
                    >
                      Metric Bar (bar)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-caption" style={{ display: "block", color: "var(--text-muted)", marginBottom: "0.4rem", fontWeight: 600 }}>
                    STATION CLOCK DISPLAY
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      className={timeDisplay === "zulu" ? "btn-primary" : "btn-secondary"}
                      onClick={() => setTimeDisplay("zulu")}
                      style={{ padding: "0.4rem 1rem", borderRadius: "6px", fontSize: "13px", cursor: "pointer" }}
                    >
                      Zulu Time (UTC / GMT)
                    </button>
                    <button
                      className={timeDisplay === "local" ? "btn-primary" : "btn-secondary"}
                      onClick={() => setTimeDisplay("local")}
                      style={{ padding: "0.4rem 1rem", borderRadius: "6px", fontSize: "13px", cursor: "pointer" }}
                    >
                      Local Station Time (IST)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-caption" style={{ display: "block", color: "var(--text-muted)", marginBottom: "0.4rem", fontWeight: 600 }}>
                    WORKSTATION INTERFACE THEME
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      className={theme === "dark" ? "btn-primary" : "btn-secondary"}
                      onClick={() => setTheme("dark")}
                      style={{
                        padding: "0.4rem 1rem",
                        borderRadius: "6px",
                        fontSize: "13px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                      }}
                    >
                      <Moon size={14} /> Tactical Dark
                    </button>
                    <button
                      className={theme === "light" ? "btn-primary" : "btn-secondary"}
                      onClick={() => setTheme("light")}
                      style={{
                        padding: "0.4rem 1rem",
                        borderRadius: "6px",
                        fontSize: "13px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                      }}
                    >
                      <Sun size={14} /> Aero Light Blue
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* SECTION 3: TELEMETRY STREAM */}
          {activeSection === "telemetry" && (
            <>
              <div>
                <h3 className="card-title" style={{ margin: "0 0 0.25rem 0", fontSize: "16px" }}>
                  Telemetry Streaming Rate
                </h3>
                <p className="text-caption" style={{ color: "var(--text-muted)", margin: 0 }}>
                  Adjust WebSocket polling and streaming frequency across all 9 propulsion sensor channels.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "340px" }}>
                <label className="text-caption" style={{ color: "var(--text-muted)", fontWeight: 600 }}>
                  STREAM FREQUENCY
                </label>
                <select
                  value={streamRate}
                  onChange={(e) => setStreamRate(e.target.value)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "6px",
                    fontSize: "13px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    outline: "none",
                  }}
                >
                  <option value="5">5 Hz (Low Bandwidth Satcom)</option>
                  <option value="10">10 Hz (Standard Certified Default)</option>
                  <option value="20">20 Hz (High Fidelity Engineering)</option>
                </select>
              </div>
            </>
          )}

          {/* SECTION 4: AUDIO & ALERTS */}
          {activeSection === "alerts" && (
            <>
              <div>
                <h3 className="card-title" style={{ margin: "0 0 0.25rem 0", fontSize: "16px" }}>
                  Audio Chimes &amp; Alert Dispatch
                </h3>
                <p className="text-caption" style={{ color: "var(--text-muted)", margin: 0 }}>
                  Control audible annunciators and automated alert dispatch parameters.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <input
                  type="checkbox"
                  id="audio-toggle"
                  checked={audioAlerts}
                  onChange={(e) => setAudioAlerts(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label htmlFor="audio-toggle" className="text-body" style={{ color: "var(--text)", cursor: "pointer", fontSize: "13px" }}>
                  Audible warning tones on Warning/Critical state excursions
                </label>
              </div>
            </>
          )}

          {/* SECTION 5: SYSTEM INFORMATION */}
          {activeSection === "system" && (
            <>
              <div>
                <h3 className="card-title" style={{ margin: "0 0 0.25rem 0", fontSize: "16px" }}>
                  System &amp; Build Diagnostics
                </h3>
                <p className="text-caption" style={{ color: "var(--text-muted)", margin: 0 }}>
                  AeroTwin Digital Twin Ground Control Station Build Specification.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ background: "var(--surface-2)", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
                  <span className="text-caption" style={{ color: "var(--text-muted)" }}>Application Framework</span>
                  <div style={{ fontFamily: "var(--font-mono), monospace", fontWeight: 600, color: "var(--text)", marginTop: "0.25rem" }}>
                    Next.js 16.3.4 (App Router, Turbopack)
                  </div>
                </div>

                <div style={{ background: "var(--surface-2)", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
                  <span className="text-caption" style={{ color: "var(--text-muted)" }}>Target UAV Engine</span>
                  <div style={{ fontFamily: "var(--font-mono), monospace", fontWeight: 600, color: "var(--text)", marginTop: "0.25rem" }}>
                    Rotax 914 F4 Turbocharged Aero Piston
                  </div>
                </div>

                <div style={{ background: "var(--surface-2)", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
                  <span className="text-caption" style={{ color: "var(--text-muted)" }}>PHM Inference Engine</span>
                  <div style={{ fontFamily: "var(--font-mono), monospace", fontWeight: 600, color: "var(--text)", marginTop: "0.25rem" }}>
                    LSTM Autoencoder &amp; OLS Linear Regression
                  </div>
                </div>

                <div style={{ background: "var(--surface-2)", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
                  <span className="text-caption" style={{ color: "var(--text-muted)" }}>Active Workstation Persona</span>
                  <div style={{ fontFamily: "var(--font-mono), monospace", fontWeight: 600, color: profileDef.badgeColor, marginTop: "0.25rem" }}>
                    {profileDef.title} ({profileDef.roleTag})
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
