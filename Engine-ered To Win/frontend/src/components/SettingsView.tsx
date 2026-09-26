"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useProfile,
  WorkstationProfile,
  WORKSTATION_PROFILES,
  ACCESS_MATRIX_DATA,
  FAULT_INJECTION_MATRIX,
} from "@/context/ProfileContext";
import { useTheme } from "@/context/ThemeContext";
import PageLayout from "./common/PageLayout";
import { NavView } from "./Sidebar";
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
  Moon,
  Sun,
  Shield,
  Eye,
} from "lucide-react";

type SettingsSection = "rbac" | "theme";
type RbacSubTab = "profiles" | "matrix" | "simulation" | "blueprints";

interface SettingsViewProps {
  onNavigate?: (view: NavView) => void;
}

export default function SettingsView({ onNavigate }: SettingsViewProps) {
  const router = useRouter();
  const { profile, setProfile, profileDef } = useProfile();
  const { theme, setTheme } = useTheme();

  const [activeSection, setActiveSection] = useState<SettingsSection>("rbac");
  const [rbacTab, setRbacTab] = useState<RbacSubTab>("profiles");
  const [searchQuery, setSearchQuery] = useState("");
  const [matrixCategoryFilter, setMatrixCategoryFilter] = useState<string>("ALL");
  const [activationNotice, setActivationNotice] = useState<string | null>(null);

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
      id: "theme" as SettingsSection,
      label: "Workstation Theme",
      icon: theme === "light" ? <Sun size={16} /> : <Moon size={16} />,
      tag: theme === "light" ? "LIGHT" : "DARK",
    },
  ];

  const PROFILE_KEYS: WorkstationProfile[] = ["propulsion", "operator", "maintenance"];

  return (
    <PageLayout
      title="Workstation Settings & GCS Preferences"
      subtitle="Configure operational workstation roles, access permissions, and interface theme."
      icon={<ShieldCheck size={18} />}
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
          <span
            className="nav-tag font-mono"
            style={{
              color: "var(--accent)",
              borderColor: "var(--border)",
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
            THEME: {theme === "light" ? "LIGHT" : "DARK"}
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
                  <div
                    className="workstation-roles-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "1rem",
                      alignItems: "stretch",
                      width: "100%",
                    }}
                  >
                    {PROFILE_KEYS.map((profKey) => {
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
                            gap: "0.85rem",
                            height: "100%",
                            boxShadow: isActive ? "0 0 0 1.5px " + item.badgeBorder : "none",
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
                            <h4 style={{ fontSize: "14.5px", fontWeight: 700, margin: "0 0 0.35rem 0", color: "var(--text)", minHeight: "36px" }}>
                              {item.title}
                            </h4>
                            <div
                              style={{
                                fontSize: "11.5px",
                                fontStyle: "italic",
                                color: item.badgeColor,
                                marginBottom: "0.6rem",
                                padding: "0.35rem 0.55rem",
                                background: "var(--surface-3)",
                                borderRadius: "4px",
                                borderLeft: `2px solid ${item.badgeBorder}`,
                                minHeight: "52px",
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              &quot;{item.mainQuestion}&quot;
                            </div>

                            <p style={{ fontSize: "11.5px", color: "var(--text-muted)", margin: "0 0 0.75rem 0", lineHeight: "1.45", minHeight: "68px" }}>
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
                                minHeight: "88px",
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

                          {/* Action Buttons: View Active Dashboard or Switch & Launch Dashboard */}
                          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
                            {isActive ? (
                              <button
                                onClick={() =>
                                  onNavigate ? onNavigate("dashboard") : router.push("/")
                                }
                                className="btn-primary"
                                style={{
                                  width: "100%",
                                  padding: "0.5rem 0",
                                  fontSize: "12px",
                                  fontFamily: "var(--font-mono), monospace",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "0.4rem",
                                }}
                                title={`Open the active ${item.title}`}
                              >
                                <Eye size={13} />
                                <span>VIEW {item.roleTag} DASHBOARD</span>
                                <span>&rarr;</span>
                              </button>
                            ) : (
                              <div style={{ display: "flex", gap: "0.4rem" }}>
                                <button
                                  onClick={() => {
                                    setProfile(profKey);
                                    if (onNavigate) {
                                      onNavigate("dashboard");
                                    } else {
                                      router.push("/");
                                    }
                                  }}
                                  className="btn-primary"
                                  style={{
                                    flex: 1,
                                    padding: "0.5rem 0.5rem",
                                    fontSize: "11.5px",
                                    fontFamily: "var(--font-mono), monospace",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "0.35rem",
                                  }}
                                  title={`Activate and immediately open the ${item.title}`}
                                >
                                  <Eye size={12} />
                                  <span>LAUNCH DASHBOARD</span>
                                  <span>&rarr;</span>
                                </button>
                                <button
                                  onClick={() => handleActivateProfile(profKey)}
                                  className="btn-secondary"
                                  style={{
                                    padding: "0.5rem 0.65rem",
                                    fontSize: "11px",
                                    fontFamily: "var(--font-mono), monospace",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                  title="Set as active role without leaving settings"
                                >
                                  ACTIVATE
                                </button>
                              </div>
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

          {/* SECTION 2: WORKSTATION THEME */}
          {activeSection === "theme" && (
            <>
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
                    Workstation Interface Theme
                  </h3>
                  <p className="text-caption" style={{ color: "var(--text-muted)", margin: 0 }}>
                    Select standardized visual theme for the AeroTwin GCS ground station environment.
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
                    border: "1px solid var(--border)",
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "var(--accent)",
                  }}
                >
                  {theme === "light" ? <Sun size={12} /> : <Moon size={12} />}
                  <span>ACTIVE: {theme === "light" ? "AERO LIGHT BLUE" : "TACTICAL DARK"}</span>
                </div>
              </div>

              {/* 2-Column Theme Selection Cards */}
              <div className="settings-theme-grid">
                {/* 1. Tactical Dark Theme Card */}
                <div
                  className="card"
                  style={{
                    background: theme === "dark" ? "var(--surface-2)" : "var(--surface-1)",
                    border: `1px solid ${theme === "dark" ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: "10px",
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "1rem",
                    boxShadow: theme === "dark" ? "0 0 0 1px var(--accent)" : "none",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onClick={() => setTheme("dark")}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "8px",
                            background: "#0A0A0D",
                            border: "1px solid #3F4350",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#F2EFE9",
                          }}
                        >
                          <Moon size={18} />
                        </div>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Tactical Dark</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Aviation Ground Station Spec</div>
                        </div>
                      </div>

                      {theme === "dark" ? (
                        <span
                          style={{
                            fontSize: "10.5px",
                            background: "var(--accent)",
                            color: "var(--accent-contrast)",
                            borderRadius: "4px",
                            padding: "0.2rem 0.55rem",
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

                    <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.5", margin: "0 0 0.85rem 0" }}>
                      Deep space black and charcoal palette optimized for low-light UAV ground control station operations and reduced ocular strain during long-duration ISR missions.
                    </p>

                    {/* Color Swatches */}
                    <div style={{ background: "var(--surface-3)", borderRadius: "6px", padding: "0.6rem 0.75rem", border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: "10px", color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.4rem" }}>
                        Palette Token Architecture:
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <div style={{ flex: 1, textAlign: "center" }}>
                          <div style={{ height: "24px", background: "#0A0A0D", borderRadius: "4px", border: "1px solid #3F4350" }} />
                          <span style={{ fontSize: "9px", fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>Base #0A</span>
                        </div>
                        <div style={{ flex: 1, textAlign: "center" }}>
                          <div style={{ height: "24px", background: "#15161A", borderRadius: "4px", border: "1px solid #3F4350" }} />
                          <span style={{ fontSize: "9px", fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>Surface #15</span>
                        </div>
                        <div style={{ flex: 1, textAlign: "center" }}>
                          <div style={{ height: "24px", background: "#F2EFE9", borderRadius: "4px" }} />
                          <span style={{ fontSize: "9px", fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>Ivory #F2</span>
                        </div>
                        <div style={{ flex: 1, textAlign: "center" }}>
                          <div style={{ height: "24px", background: "#5BA872", borderRadius: "4px" }} />
                          <span style={{ fontSize: "9px", fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>Emerald #5B</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTheme("dark");
                    }}
                    className={theme === "dark" ? "btn-primary" : "btn-secondary"}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                    }}
                  >
                    {theme === "dark" ? (
                      <>
                        <Check size={13} /> Active Tactical Dark
                      </>
                    ) : (
                      "Switch to Tactical Dark"
                    )}
                  </button>
                </div>

                {/* 2. Aero Light Blue Theme Card */}
                <div
                  className="card"
                  style={{
                    background: theme === "light" ? "var(--surface-2)" : "var(--surface-1)",
                    border: `1px solid ${theme === "light" ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: "10px",
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "1rem",
                    boxShadow: theme === "light" ? "0 0 0 1px var(--accent)" : "none",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onClick={() => setTheme("light")}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "8px",
                            background: "#FFFFFF",
                            border: "1px solid #96C0E6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#0284C7",
                          }}
                        >
                          <Sun size={18} />
                        </div>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Aero Light Blue</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>High-Visibility Day Hangar Spec</div>
                        </div>
                      </div>

                      {theme === "light" ? (
                        <span
                          style={{
                            fontSize: "10.5px",
                            background: "var(--accent)",
                            color: "var(--accent-contrast)",
                            borderRadius: "4px",
                            padding: "0.2rem 0.55rem",
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

                    <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.5", margin: "0 0 0.85rem 0" }}>
                      Clean, high-contrast crisp white and aero light-blue palette with navy typography, optimized for daylight ground stations, maintenance hangars, and high ambient light.
                    </p>

                    {/* Color Swatches */}
                    <div style={{ background: "var(--surface-3)", borderRadius: "6px", padding: "0.6rem 0.75rem", border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: "10px", color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.4rem" }}>
                        Palette Token Architecture:
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <div style={{ flex: 1, textAlign: "center" }}>
                          <div style={{ height: "24px", background: "#F0F4F8", borderRadius: "4px", border: "1px solid #96C0E6" }} />
                          <span style={{ fontSize: "9px", fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>Base #F0</span>
                        </div>
                        <div style={{ flex: 1, textAlign: "center" }}>
                          <div style={{ height: "24px", background: "#FFFFFF", borderRadius: "4px", border: "1px solid #96C0E6" }} />
                          <span style={{ fontSize: "9px", fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>Surface #FF</span>
                        </div>
                        <div style={{ flex: 1, textAlign: "center" }}>
                          <div style={{ height: "24px", background: "#0284C7", borderRadius: "4px" }} />
                          <span style={{ fontSize: "9px", fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>Aero #02</span>
                        </div>
                        <div style={{ flex: 1, textAlign: "center" }}>
                          <div style={{ height: "24px", background: "#15803D", borderRadius: "4px" }} />
                          <span style={{ fontSize: "9px", fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>Green #15</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTheme("light");
                    }}
                    className={theme === "light" ? "btn-primary" : "btn-secondary"}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                    }}
                  >
                    {theme === "light" ? (
                      <>
                        <Check size={13} /> Active Aero Light Blue
                      </>
                    ) : (
                      "Switch to Aero Light Blue"
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
