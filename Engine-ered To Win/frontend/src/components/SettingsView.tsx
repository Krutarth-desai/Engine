"use client";

import React, { useState } from "react";
import {
  useProfile,
  WorkstationProfile,
  WORKSTATION_PROFILES,
  ACCESS_MATRIX_DATA,
  FAULT_INJECTION_MATRIX,
} from "@/context/ProfileContext";
import PageLayout from "./common/PageLayout";
import {
  ShieldCheck,
  Compass,
  Wrench,
  Cpu,
  Layers,
  Table,
  Lock,
  Unlock,
  Zap,
  Check,
  Search,
  BookOpen,
  Sparkles,
} from "lucide-react";

type SettingsTab = "profiles" | "matrix" | "simulation" | "blueprints";

export default function SettingsView() {
  const { profile, setProfile, profileDef } = useProfile();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profiles");
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

  return (
    <PageLayout
      title="Workstation Operational Profiles & RBAC"
      subtitle="Role-Based Access Control (RBAC) across GCS Operator, Maintenance Team, and Propulsion Engineer personas."
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
            }}
          >
            ACTIVE PROFILE: {profileDef.roleTag}
          </span>
        </div>
      }
    >
      {/* Activation Confirmation Banner */}
      {activationNotice && (
        <div
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--accent)",
            color: "var(--text)",
            borderRadius: "8px",
            padding: "0.6rem 1rem",
            fontSize: "0.78rem",
            marginBottom: "0.5rem",
            fontFamily: "var(--font-mono), monospace",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            boxShadow: "0 2px 8px color-mix(in srgb, var(--accent) 20%, transparent)",
            animation: "fadeIn 0.2s ease-in-out",
          }}
        >
          <Sparkles size={16} style={{ color: "var(--accent)" }} />
          <span>{activationNotice}</span>
        </div>
      )}

      {/* Main Settings Split: Left Navigation, Right Content Panel */}
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "1.25rem", flex: 1, minHeight: 0 }}>
        {/* Left Section List */}
        <div
          className="card"
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "0.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
            height: "fit-content",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text-faint)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              padding: "0.35rem 0.65rem 0.2rem",
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            RBAC &amp; Profiles
          </div>

          <button
            className={`nav-item-btn ${activeTab === "profiles" ? "active" : ""}`}
            onClick={() => setActiveTab("profiles")}
            style={{ borderRadius: "6px", textAlign: "left", display: "flex", alignItems: "center", gap: "0.6rem" }}
          >
            <Layers size={16} />
            <span>Select Profile</span>
          </button>

          <button
            className={`nav-item-btn ${activeTab === "matrix" ? "active" : ""}`}
            onClick={() => setActiveTab("matrix")}
            style={{ borderRadius: "6px", textAlign: "left", display: "flex", alignItems: "center", gap: "0.6rem" }}
          >
            <Table size={16} />
            <span>Access Matrix (29)</span>
          </button>

          <button
            className={`nav-item-btn ${activeTab === "simulation" ? "active" : ""}`}
            onClick={() => setActiveTab("simulation")}
            style={{ borderRadius: "6px", textAlign: "left", display: "flex", alignItems: "center", gap: "0.6rem" }}
          >
            <Zap size={16} />
            <span>Fault Simulation RBAC</span>
          </button>

          <button
            className={`nav-item-btn ${activeTab === "blueprints" ? "active" : ""}`}
            onClick={() => setActiveTab("blueprints")}
            style={{ borderRadius: "6px", textAlign: "left", display: "flex", alignItems: "center", gap: "0.6rem" }}
          >
            <BookOpen size={16} />
            <span>Dashboard Blueprints</span>
          </button>

          {/* Active Profile Info Box */}
          <div
            style={{
              marginTop: "1.25rem",
              padding: "0.75rem",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
            }}
          >
            <div style={{ fontSize: "10.5px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
              Current Hierarchy
            </div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: profileDef.badgeColor, display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: profileDef.badgeColor }} />
              {profileDef.shortTitle}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.35 }}>
              {profileDef.hierarchyLevel}
            </div>
          </div>
        </div>

        {/* Right Content Container */}
        <div
          className="card"
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            minHeight: 0,
            overflowY: "auto",
          }}
        >
          {/* TAB 1: WORKSTATION PROFILES SELECTOR */}
          {activeTab === "profiles" && (
            <>
              <div>
                <h3 className="card-title" style={{ margin: "0 0 0.25rem 0", fontSize: "15px" }}>
                  Workstation Operational Profiles
                </h3>
                <p className="text-caption" style={{ color: "var(--text-muted)", margin: 0 }}>
                  Select your operational persona to reconfigure the AeroTwin interface, dashboard widgets, and feature permissions according to certified aviation defense bounds.
                </p>
              </div>

              {/* 3 Interactive Profile Cards Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                {/* 1. GCS Operator Card */}
                {(() => {
                  const def = WORKSTATION_PROFILES.operator;
                  const isCurrent = profile === "operator";
                  return (
                    <div
                      style={{
                        background: isCurrent ? "var(--surface-2)" : "var(--surface-1)",
                        border: `1px solid ${isCurrent ? "var(--accent)" : "var(--border)"}`,
                        borderRadius: "10px",
                        padding: "1.1rem",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: "1rem",
                        position: "relative",
                        transition: "all 0.2s ease",
                        boxShadow: isCurrent ? "0 0 12px color-mix(in srgb, var(--accent) 18%, transparent)" : "none",
                      }}
                    >
                      <div>
                        {/* Header Chip & Active Badge */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                          <span
                            style={{
                              fontSize: "10.5px",
                              fontFamily: "var(--font-mono), monospace",
                              fontWeight: 700,
                              color: "var(--accent)",
                              background: "color-mix(in srgb, var(--accent) 14%, var(--surface-1))",
                              padding: "0.15rem 0.45rem",
                              borderRadius: "4px",
                              border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
                            }}
                          >
                            🛰️ TIER 1 // OPERATIONS
                          </span>
                          {isCurrent && (
                            <span
                              style={{
                                fontSize: "10.5px",
                                background: "var(--accent)",
                                color: "var(--accent-contrast)",
                                padding: "0.15rem 0.5rem",
                                borderRadius: "4px",
                                fontWeight: 700,
                                fontFamily: "var(--font-mono), monospace",
                              }}
                            >
                              ACTIVE
                            </span>
                          )}
                        </div>

                        <h4 style={{ margin: "0 0 0.35rem 0", fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>
                          {def.title}
                        </h4>

                        {/* Main Question Callout */}
                        <div
                          style={{
                            background: "var(--surface-1)",
                            borderLeft: "3px solid var(--accent)",
                            border: "1px solid var(--border)",
                            borderLeftWidth: "3px",
                            padding: "0.5rem 0.65rem",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontStyle: "italic",
                            color: "var(--text)",
                            marginBottom: "0.75rem",
                          }}
                        >
                          “{def.mainQuestion}”
                        </div>

                        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 0.75rem 0", lineHeight: 1.45 }}>
                          {def.description}
                        </p>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "11px", color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: "0.6rem" }}>
                          <div><strong>Target Persona:</strong> {def.targetPersona}</div>
                          <div><strong>Primary Focus:</strong> Situational awareness &amp; immediate safety</div>
                          <div><strong>Fault Simulation:</strong> <span style={{ color: "var(--status-caution)" }}>Concealed (Flight Safety Lock)</span></div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleActivateProfile("operator")}
                        className={isCurrent ? "btn-secondary" : "btn-primary"}
                        style={{
                          width: "100%",
                          padding: "0.45rem",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: isCurrent ? "default" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.4rem",
                        }}
                        disabled={isCurrent}
                      >
                        {isCurrent ? <Check size={14} /> : <Compass size={14} />}
                        {isCurrent ? "CURRENT ACTIVE PROFILE" : "ACTIVATE OPERATOR PROFILE"}
                      </button>
                    </div>
                  );
                })()}

                {/* 2. Maintenance Team Card */}
                {(() => {
                  const def = WORKSTATION_PROFILES.maintenance;
                  const isCurrent = profile === "maintenance";
                  return (
                    <div
                      style={{
                        background: isCurrent ? "var(--surface-2)" : "var(--surface-1)",
                        border: `1px solid ${isCurrent ? "var(--status-caution)" : "var(--border)"}`,
                        borderRadius: "10px",
                        padding: "1.1rem",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: "1rem",
                        position: "relative",
                        transition: "all 0.2s ease",
                        boxShadow: isCurrent ? "0 0 12px color-mix(in srgb, var(--status-caution) 18%, transparent)" : "none",
                      }}
                    >
                      <div>
                        {/* Header Chip & Active Badge */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                          <span
                            style={{
                              fontSize: "10.5px",
                              fontFamily: "var(--font-mono), monospace",
                              fontWeight: 700,
                              color: "var(--status-caution)",
                              background: "color-mix(in srgb, var(--status-caution) 14%, var(--surface-1))",
                              padding: "0.15rem 0.45rem",
                              borderRadius: "4px",
                              border: "1px solid color-mix(in srgb, var(--status-caution) 30%, transparent)",
                            }}
                          >
                            🔧 TIER 2 // MAINTENANCE
                          </span>
                          {isCurrent && (
                            <span
                              style={{
                                fontSize: "10.5px",
                                background: "var(--status-caution)",
                                color: "#000",
                                padding: "0.15rem 0.5rem",
                                borderRadius: "4px",
                                fontWeight: 700,
                                fontFamily: "var(--font-mono), monospace",
                              }}
                            >
                              ACTIVE
                            </span>
                          )}
                        </div>

                        <h4 style={{ margin: "0 0 0.35rem 0", fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>
                          {def.title}
                        </h4>

                        {/* Main Question Callout */}
                        <div
                          style={{
                            background: "var(--surface-1)",
                            borderLeft: "3px solid var(--status-caution)",
                            border: "1px solid var(--border)",
                            borderLeftWidth: "3px",
                            padding: "0.5rem 0.65rem",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontStyle: "italic",
                            color: "var(--text)",
                            marginBottom: "0.75rem",
                          }}
                        >
                          “{def.mainQuestion}”
                        </div>

                        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 0.75rem 0", lineHeight: 1.45 }}>
                          {def.description}
                        </p>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "11px", color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: "0.6rem" }}>
                          <div><strong>Target Persona:</strong> {def.targetPersona}</div>
                          <div><strong>Primary Focus:</strong> Component wear, RUL, checklists &amp; actions</div>
                          <div><strong>Fault Simulation:</strong> <span style={{ color: "var(--accent)" }}>Preset Scenarios (Validation Mode)</span></div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleActivateProfile("maintenance")}
                        className={isCurrent ? "btn-secondary" : "btn-primary"}
                        style={{
                          width: "100%",
                          padding: "0.45rem",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: isCurrent ? "default" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.4rem",
                        }}
                        disabled={isCurrent}
                      >
                        {isCurrent ? <Check size={14} /> : <Wrench size={14} />}
                        {isCurrent ? "CURRENT ACTIVE PROFILE" : "ACTIVATE MAINTENANCE PROFILE"}
                      </button>
                    </div>
                  );
                })()}

                {/* 3. Propulsion Engineer Card */}
                {(() => {
                  const def = WORKSTATION_PROFILES.propulsion;
                  const isCurrent = profile === "propulsion";
                  return (
                    <div
                      style={{
                        background: isCurrent ? "var(--surface-2)" : "var(--surface-1)",
                        border: `1px solid ${isCurrent ? "var(--status-nominal)" : "var(--border)"}`,
                        borderRadius: "10px",
                        padding: "1.1rem",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: "1rem",
                        position: "relative",
                        transition: "all 0.2s ease",
                        boxShadow: isCurrent ? "0 0 12px color-mix(in srgb, var(--status-nominal) 18%, transparent)" : "none",
                      }}
                    >
                      <div>
                        {/* Header Chip & Active Badge */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                          <span
                            style={{
                              fontSize: "10.5px",
                              fontFamily: "var(--font-mono), monospace",
                              fontWeight: 700,
                              color: "var(--status-nominal)",
                              background: "color-mix(in srgb, var(--status-nominal) 14%, var(--surface-1))",
                              padding: "0.15rem 0.45rem",
                              borderRadius: "4px",
                              border: "1px solid color-mix(in srgb, var(--status-nominal) 30%, transparent)",
                            }}
                          >
                            ⚙️ TIER 3 // ENGINEERING
                          </span>
                          {isCurrent && (
                            <span
                              style={{
                                fontSize: "10.5px",
                                background: "var(--status-nominal)",
                                color: "#000",
                                padding: "0.15rem 0.5rem",
                                borderRadius: "4px",
                                fontWeight: 700,
                                fontFamily: "var(--font-mono), monospace",
                              }}
                            >
                              ACTIVE
                            </span>
                          )}
                        </div>

                        <h4 style={{ margin: "0 0 0.35rem 0", fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>
                          {def.title}
                        </h4>

                        {/* Main Question Callout */}
                        <div
                          style={{
                            background: "var(--surface-1)",
                            borderLeft: "3px solid var(--status-nominal)",
                            border: "1px solid var(--border)",
                            borderLeftWidth: "3px",
                            padding: "0.5rem 0.65rem",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontStyle: "italic",
                            color: "var(--text)",
                            marginBottom: "0.75rem",
                          }}
                        >
                          “{def.mainQuestion}”
                        </div>

                        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 0.75rem 0", lineHeight: 1.45 }}>
                          {def.description}
                        </p>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "11px", color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: "0.6rem" }}>
                          <div><strong>Target Persona:</strong> {def.targetPersona}</div>
                          <div><strong>Primary Focus:</strong> First-principles physics &amp; model validation</div>
                          <div><strong>Fault Simulation:</strong> <span style={{ color: "var(--status-nominal)" }}>Full Interactive Control (All Scenarios)</span></div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleActivateProfile("propulsion")}
                        className={isCurrent ? "btn-secondary" : "btn-primary"}
                        style={{
                          width: "100%",
                          padding: "0.45rem",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: isCurrent ? "default" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.4rem",
                        }}
                        disabled={isCurrent}
                      >
                        {isCurrent ? <Check size={14} /> : <Cpu size={14} />}
                        {isCurrent ? "CURRENT ACTIVE PROFILE" : "ACTIVATE PROPULSION PROFILE"}
                      </button>
                    </div>
                  );
                })()}
              </div>
            </>
          )}

          {/* TAB 2: COMPLETE ACCESS MATRIX TABLE */}
          {activeTab === "matrix" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
                <div>
                  <h3 className="card-title" style={{ margin: "0 0 0.25rem 0", fontSize: "15px" }}>
                    Workstation Capability &amp; Access Matrix
                  </h3>
                  <p className="text-caption" style={{ color: "var(--text-muted)", margin: 0 }}>
                    Detailed feature entitlement and data granularity matrix across all 29 propulsion subsystems and analytics capabilities.
                  </p>
                </div>

                {/* Search & Filter */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ position: "relative", width: "180px" }}>
                    <input
                      type="text"
                      placeholder="Search capability..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.3rem 0.5rem 0.3rem 1.8rem",
                        fontSize: "11px",
                        borderRadius: "4px",
                      }}
                    />
                    <Search size={12} style={{ position: "absolute", left: "6px", top: "7px", color: "var(--text-muted)" }} />
                  </div>

                  <select
                    value={matrixCategoryFilter}
                    onChange={(e) => setMatrixCategoryFilter(e.target.value)}
                    style={{ padding: "0.3rem 0.5rem", fontSize: "11px", borderRadius: "4px" }}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Matrix Table */}
              <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "8px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px", fontFamily: "var(--font-mono), monospace" }}>
                  <thead>
                    <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", textAlign: "left" }}>
                      <th style={{ padding: "0.55rem 0.75rem", width: "32%" }}>CAPABILITY / FEATURE</th>
                      <th style={{ padding: "0.55rem 0.75rem", width: "22%" }}>
                        <span style={{ color: profile === "operator" ? "var(--accent)" : "inherit" }}>
                          🛰️ GCS OPERATOR
                        </span>
                      </th>
                      <th style={{ padding: "0.55rem 0.75rem", width: "23%" }}>
                        <span style={{ color: profile === "maintenance" ? "var(--status-caution)" : "inherit" }}>
                          🔧 MAINTENANCE TEAM
                        </span>
                      </th>
                      <th style={{ padding: "0.55rem 0.75rem", width: "23%" }}>
                        <span style={{ color: profile === "propulsion" ? "var(--status-nominal)" : "inherit" }}>
                          ⚙️ PROPULSION ENGINEER
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMatrix.map((row, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: "1px solid var(--border)",
                          background: idx % 2 === 0 ? "transparent" : "color-mix(in srgb, var(--surface-2) 40%, transparent)",
                        }}
                      >
                        <td style={{ padding: "0.45rem 0.75rem" }}>
                          <div style={{ fontWeight: 600, color: "var(--text)" }}>{row.capability}</div>
                          <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{row.category}</div>
                        </td>
                        <td style={{ padding: "0.45rem 0.75rem" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              color:
                                row.operatorStatus === "full"
                                  ? "var(--status-nominal)"
                                  : row.operatorStatus === "limited"
                                  ? "var(--status-caution)"
                                  : "var(--text-muted)",
                            }}
                          >
                            {row.operatorStatus === "full" && "✅"}
                            {row.operatorStatus === "limited" && "⚠️"}
                            {row.operatorStatus === "none" && "❌"}
                            <span>{row.operator}</span>
                          </span>
                        </td>
                        <td style={{ padding: "0.45rem 0.75rem" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              color:
                                row.maintenanceStatus === "full"
                                  ? "var(--status-nominal)"
                                  : row.maintenanceStatus === "limited"
                                  ? "var(--status-caution)"
                                  : "var(--text-muted)",
                            }}
                          >
                            {row.maintenanceStatus === "full" && "✅"}
                            {row.maintenanceStatus === "limited" && "⚠️"}
                            {row.maintenanceStatus === "none" && "❌"}
                            <span>{row.maintenance}</span>
                          </span>
                        </td>
                        <td style={{ padding: "0.45rem 0.75rem" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              color:
                                row.propulsionStatus === "full"
                                  ? "var(--status-nominal)"
                                  : row.propulsionStatus === "limited"
                                  ? "var(--status-caution)"
                                  : "var(--text-muted)",
                            }}
                          >
                            {row.propulsionStatus === "full" && "✅"}
                            {row.propulsionStatus === "limited" && "⚠️"}
                            {row.propulsionStatus === "none" && "❌"}
                            <span>{row.propulsion}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* TAB 3: FAULT INJECTION SIMULATION RBAC */}
          {activeTab === "simulation" && (
            <>
              <div>
                <h3 className="card-title" style={{ margin: "0 0 0.25rem 0", fontSize: "15px" }}>
                  Fault Injection Simulation RBAC &amp; Flight Safety Rationale
                </h3>
                <p className="text-caption" style={{ color: "var(--text-muted)", margin: 0 }}>
                  Controlled simulation permissions designed to eliminate operational confusion between simulated failures and live in-flight anomalies.
                </p>
              </div>

              {/* Rationale Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.75rem" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent)", marginBottom: "0.3rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Lock size={13} /> GCS Operator Safety
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0, lineHeight: 1.4 }}>
                    <strong>Zero access during live sorties.</strong> A simulation control on the primary pilot display introduces critical risk of confusion between simulated and authentic engine failures.
                  </p>
                </div>

                <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.75rem" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--status-caution)", marginBottom: "0.3rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Unlock size={13} /> Maintenance Validation
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0, lineHeight: 1.4 }}>
                    <strong>Preset failure scenarios only.</strong> Technicians validate sensor response and warning triggers against calibrated manufacturer test benches without altering underlying physics models.
                  </p>
                </div>

                <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.75rem" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--status-nominal)", marginBottom: "0.3rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Zap size={13} /> Engineering Closed-Loop
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0, lineHeight: 1.4 }}>
                    <strong>Unrestricted research access.</strong> Engineers inject complex coupled faults to analyze: <em>Fault → Sensor response → Digital Twin → AI detection → RUL degradation</em>.
                  </p>
                </div>
              </div>

              {/* Simulation Matrix Table */}
              <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "8px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px", fontFamily: "var(--font-mono), monospace" }}>
                  <thead>
                    <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", textAlign: "left" }}>
                      <th style={{ padding: "0.55rem 0.75rem", width: "40%" }}>SIMULATION CAPABILITY</th>
                      <th style={{ padding: "0.55rem 0.75rem", width: "20%" }}>GCS OPERATOR</th>
                      <th style={{ padding: "0.55rem 0.75rem", width: "20%" }}>MAINTENANCE TEAM</th>
                      <th style={{ padding: "0.55rem 0.75rem", width: "20%" }}>PROPULSION ENGINEER</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FAULT_INJECTION_MATRIX.map((row, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: "1px solid var(--border)",
                          background: idx % 2 === 0 ? "transparent" : "color-mix(in srgb, var(--surface-2) 40%, transparent)",
                        }}
                      >
                        <td style={{ padding: "0.5rem 0.75rem", fontWeight: 600, color: "var(--text)" }}>
                          {row.feature}
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem" }}>
                          <span style={{ color: row.operatorAllowed ? "var(--status-nominal)" : "var(--status-warning)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            {row.operatorAllowed ? "✅" : "❌"} {row.operator}
                          </span>
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem" }}>
                          <span style={{ color: row.maintenanceAllowed ? "var(--status-caution)" : "var(--status-warning)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            {row.maintenanceAllowed ? "⚠️" : "❌"} {row.maintenance}
                          </span>
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem" }}>
                          <span style={{ color: row.propulsionAllowed ? "var(--status-nominal)" : "var(--status-warning)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            {row.propulsionAllowed ? "✅" : "❌"} {row.propulsion}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* TAB 4: DASHBOARD BLUEPRINTS & PERSONA SPECIFICATIONS */}
          {activeTab === "blueprints" && (
            <>
              <div>
                <h3 className="card-title" style={{ margin: "0 0 0.25rem 0", fontSize: "15px" }}>
                  Dashboard Design Blueprints &amp; Persona Prompts
                </h3>
                <p className="text-caption" style={{ color: "var(--text-muted)", margin: 0 }}>
                  Certified display philosophy and layout specifications for each of the three defense-grade workstation environments.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* 1. Operator Blueprint */}
                <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent)" }}>
                      1. GCS Operator Dashboard Specification
                    </div>
                    <span style={{ fontSize: "11px", fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>
                      MAIN QUESTION: “Is the engine safe and what is happening right now?”
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--text)", lineHeight: 1.5, margin: 0 }}>
                    Design a professional defence-grade MALE UAV Ground Control Station (GCS) Engine Monitoring Dashboard for UAV operators. The interface should prioritize quick situational awareness and real-time decision making, with a clean modern dark/navy aviation-style UI. Show a large overall ENGINE HEALTH STATUS indicator at the top, followed by real-time engine parameters: RPM, CHT, EGT, Oil Pressure, Oil Temperature, Fuel Flow, Vibration, Battery/Alternator and Injection Timing. Include live trend graphs, engine health index, current UAV status, altitude, flight phase, engine load and mission elapsed time. Add a prominent Alerts &amp; Warnings panel showing severity levels such as Normal, Warning and Critical. Include a compact RUL estimate, anomaly score and current engine state. Add a Mission Timeline showing takeoff, climb, cruise, throttle transitions and current flight phase. Include a small Digital Twin Status indicator showing synchronization between physical engine and virtual engine. Keep maintenance details minimal because this dashboard is for the operator. Emphasize readability, large numbers, clear status indicators, real-time charts, minimal clutter and information that can be understood within seconds. No mobile app, no Android/iOS interface, only a desktop/web-based GCS dashboard.
                  </p>
                </div>

                {/* 2. Maintenance Blueprint */}
                <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--status-caution)" }}>
                      2. Maintenance Team Dashboard Specification
                    </div>
                    <span style={{ fontSize: "11px", fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>
                      MAIN QUESTION: “What needs maintenance and when?”
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--text)", lineHeight: 1.5, margin: 0 }}>
                    Design a professional Predictive Maintenance Dashboard for MALE UAV Aero-Piston Engines, specifically for the maintenance team. Use a clean industrial/aviation interface with a light or dark technical theme. Focus on maintenance planning, component health, degradation and actionable recommendations, rather than live flight control. At the top show overall Engine Health Index, RUL, operating hours, cycles and maintenance status. Include a Maintenance Priority section listing components or systems requiring attention, with risk level, estimated degradation and recommended action. Show degradation trends for CHT, EGT, oil pressure, oil temperature, vibration, fuel flow and engine efficiency. Include Fault History, previous anomalies, detected fault type, timestamp and severity. Add a RUL Prediction graph showing remaining useful life over time and projected degradation trajectory. Include a Maintenance Advisory panel with recommendations such as injector inspection, lubrication inspection, vibration investigation and sensor validation. Add mission-wise maintenance history and post-flight health reports. Include a component health overview and distinguish between actual engine faults and possible sensor faults. The dashboard should feel like a predictive maintenance workstation, with detailed trends and actionable information but without overwhelming the user with raw telemetry.
                  </p>
                </div>

                {/* 3. Propulsion Engineer Blueprint */}
                <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--status-nominal)" }}>
                      3. Propulsion Engineer Dashboard Specification
                    </div>
                    <span style={{ fontSize: "11px", fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>
                      MAIN QUESTION: “Why is the engine behaving this way, and how is it degrading?”
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--text)", lineHeight: 1.5, margin: 0 }}>
                    Design an advanced Aero-Piston Engine Digital Twin and Propulsion Engineering Dashboard for propulsion engineers working with MALE UAV engines. The interface should be technical, analytical and engineering-focused, with a professional aerospace research/engineering aesthetic. Make the Digital Twin the central element of the dashboard, showing the relationship between the physical engine and its virtual model. Display real-time engine parameters including RPM, CHT, EGT, Oil Pressure, Oil Temperature, Fuel Flow, Vibration, Battery/Alternator and Injection Timing. Include Actual vs Predicted plots generated from physics-based and thermodynamic models. Show engine performance maps, operating envelope, engine efficiency, state estimation and sensor-fusion results. Include an AI/ML Analytics section with anomaly score, fault classification, degradation trajectory and RUL prediction. Provide detailed vibration analysis/frequency spectrum visualization and sensor correlation plots. Add Mission Simulation controls allowing engineers to simulate High Altitude, Endurance Mission, Hot Weather and Rapid Throttle Transition scenarios. Include Historical Mission Replay with a timeline and synchronized sensor data. Show model residuals, prediction error and Digital Twin synchronization status. Include an engineering diagnostics panel that explains the major factors contributing to a detected anomaly. The dashboard should prioritize deep analysis, model validation, simulation and engine behavior understanding rather than simple operator alerts.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
