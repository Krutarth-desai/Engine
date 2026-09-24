"use client";

import React, { useState } from "react";
import { useTelemetry } from "@/context/TelemetryContext";
import PageLayout from "./common/PageLayout";
import ExportAuditModal from "./mission/ExportAuditModal";
import { Compass, Navigation, Clock, ShieldCheck, Fuel, FileDown, Download } from "lucide-react";

export default function MissionView() {
  const { payload, linkState } = useTelemetry();
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const waypoints = [
    { id: "WP-01", name: "AL-DHAFRA DEP", alt: "2,500 FT", speed: "95 KTAS", status: "PASSED", time: "20:15:00 Z" },
    { id: "WP-02", name: "CLIMB TRANSITION", alt: "10,000 FT", speed: "105 KTAS", status: "PASSED", time: "20:45:00 Z" },
    { id: "WP-03", name: "PATROL INGRESS", alt: "15,000 FT", speed: "112 KTAS", status: "PASSED", time: "21:30:00 Z" },
    { id: "WP-04", name: "ORBIT STATION ALPHA", alt: "15,000 FT", speed: "110 KTAS", status: "ACTIVE", time: "23:24:00 Z" },
    { id: "WP-05", name: "ORBIT STATION BRAVO", alt: "15,000 FT", speed: "110 KTAS", status: "PENDING", time: "01:00:00 Z" },
    { id: "WP-06", name: "PATROL EGRESS", alt: "14,000 FT", speed: "115 KTAS", status: "PENDING", time: "02:15:00 Z" },
    { id: "WP-07", name: "DESCENT VECTOR", alt: "4,000 FT", speed: "100 KTAS", status: "PENDING", time: "03:00:00 Z" },
    { id: "WP-08", name: "AL-DHAFRA RECOVERY", alt: "SFC", speed: "72 KTAS", status: "PENDING", time: "03:30:00 Z" },
  ];

  return (
    <PageLayout
      title="Mission Profile & Tactical Operational Envelope"
      subtitle="MALE UAV ISR Patrol 27 • Route Waypoints, Endurance Budget & Propulsion Limits"
      icon={<Compass size={18} />}
      tags={
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <span className="nav-tag" style={{ color: "var(--accent)", borderColor: "var(--border-strong)" }}>
            PROFILE: ISR_PATROL_27
          </span>
          <span className="nav-tag" style={{ color: linkState === "live" ? "var(--accent)" : "var(--status-caution)", borderColor: "var(--border)" }}>
            TAIL: UAV_ENG_001
          </span>
        </div>
      }
      actions={
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={() => setIsAuditModalOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.32rem 0.75rem",
              borderRadius: "6px",
              background: "var(--accent)",
              border: "1px solid var(--accent)",
              color: "#05070B",
              fontSize: "11.5px",
              fontWeight: 700,
              fontFamily: "var(--font-mono), monospace",
              cursor: "pointer",
              boxShadow: "0 2px 10px color-mix(in srgb, var(--accent) 30%, transparent)",
              transition: "all 0.15s ease",
            }}
            title="Export certified flight audit dossier & compliance records"
          >
            <FileDown size={13} />
            <span>EXPORT AUDIT</span>
          </button>
        </div>
      }
    >

      {/* Metric Cards Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        <div className="card" style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1rem" }}>
          <div className="text-caption" style={{ color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Navigation size={14} /> Waypoint Progress
          </div>
          <div className="kpi-value" style={{ marginTop: "0.35rem", color: "var(--text)" }}>
            WP 04 <span className="unit">/ 08</span>
          </div>
          <div className="text-caption" style={{ color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Current: Orbit Station Alpha
          </div>
        </div>

        <div className="card" style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1rem" }}>
          <div className="text-caption" style={{ color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Clock size={14} /> Time on Station
          </div>
          <div className="kpi-value" style={{ marginTop: "0.35rem", color: "var(--text)" }}>
            03:42:15 <span className="unit">HRS</span>
          </div>
          <div className="text-caption" style={{ color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Planned loiter: 06:00:00 hrs
          </div>
        </div>

        <div className="card" style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1rem" }}>
          <div className="text-caption" style={{ color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Fuel size={14} /> Fuel Endurance
          </div>
          <div className="kpi-value" style={{ marginTop: "0.35rem", color: "var(--text)" }}>
            07:18:40 <span className="unit">REM</span>
          </div>
          <div className="text-caption" style={{ color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Flow: {(payload.fuel_flow_lh || 17.6).toFixed(1)} L/h (Nominal)
          </div>
        </div>

        <div className="card" style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1rem" }}>
          <div className="text-caption" style={{ color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <ShieldCheck size={14} /> Propulsion Margin
          </div>
          <div className="kpi-value" style={{ marginTop: "0.35rem", color: "var(--status-nominal)" }}>
            +240 <span className="unit">NM RESERVE</span>
          </div>
          <div className="text-caption" style={{ color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Recovery alternate: OMRK (28 NM)
          </div>
        </div>
      </div>

      {/* Main Mission Grid: Waypoint Log & Operational Envelope */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1rem", flex: 1, minHeight: 0 }}>
        {/* Left Column: Waypoints Table */}
        <div className="card" style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.25rem", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h3 className="card-title" style={{ margin: 0 }}>Mission Flight Plan Legs</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span className="text-caption" style={{ color: "var(--text-muted)" }}>8 WAYPOINTS</span>
              <button
                onClick={() => setIsAuditModalOpen(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  padding: "0.2rem 0.5rem",
                  borderRadius: "4px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--accent)",
                  fontSize: "11px",
                  fontFamily: "var(--font-mono), monospace",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                title="View & Export Waypoint Audit Trail"
              >
                <Download size={11} />
                <span>AUDIT TRAIL</span>
              </button>
            </div>
          </div>

          <div style={{ overflowX: "auto", flex: 1 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--text-muted)" }}>
                  <th style={{ padding: "0.5rem 0.5rem" }}>ID</th>
                  <th style={{ padding: "0.5rem 0.5rem" }}>Fix Name</th>
                  <th className="numeric" style={{ padding: "0.5rem 0.5rem" }}>Alt</th>
                  <th className="numeric" style={{ padding: "0.5rem 0.5rem" }}>TAS</th>
                  <th style={{ padding: "0.5rem 0.5rem" }}>Status</th>
                  <th className="numeric" style={{ padding: "0.5rem 0.5rem" }}>Est. Time</th>
                </tr>
              </thead>
              <tbody>
                {waypoints.map((wp) => {
                  const isActive = wp.status === "ACTIVE";
                  const isPassed = wp.status === "PASSED";
                  return (
                    <tr
                      key={wp.id}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        background: isActive ? "var(--surface-2)" : "transparent",
                      }}
                    >
                      <td style={{ padding: "0.55rem 0.5rem", fontFamily: "var(--font-mono), monospace", fontWeight: 600, color: isActive ? "var(--accent)" : "var(--text)" }}>
                        {wp.id}
                      </td>
                      <td style={{ padding: "0.55rem 0.5rem", color: isActive ? "var(--text)" : isPassed ? "var(--text-muted)" : "var(--text)" }}>
                        {wp.name}
                      </td>
                      <td className="numeric" style={{ padding: "0.55rem 0.5rem", color: "var(--text-muted)" }}>
                        {wp.alt}
                      </td>
                      <td className="numeric" style={{ padding: "0.55rem 0.5rem", color: "var(--text-muted)" }}>
                        {wp.speed}
                      </td>
                      <td style={{ padding: "0.55rem 0.5rem" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "0.15rem 0.45rem",
                            borderRadius: "4px",
                            fontWeight: 600,
                            background: isActive
                              ? "var(--surface-3)"
                              : isPassed
                              ? "color-mix(in srgb, var(--status-nominal) 14%, var(--surface-1))"
                              : "var(--surface-2)",
                            color: isActive
                              ? "var(--accent)"
                              : isPassed
                              ? "var(--status-nominal)"
                              : "var(--text-muted)",
                            border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                          }}
                        >
                          {wp.status}
                        </span>
                      </td>
                      <td className="numeric" style={{ padding: "0.55rem 0.5rem", color: "var(--text)" }}>
                        {wp.time}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Operational Propulsion Envelope */}
        <div className="card" style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <h3 className="card-title" style={{ margin: 0 }}>Propulsion Operational Envelope</h3>
            <p className="text-caption" style={{ color: "var(--text-muted)", margin: "0.25rem 0 0 0" }}>
              Continuous flight parameters validated against Rotax 914 F certified envelope.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", flex: 1 }}>
            <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.75rem 1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="text-caption" style={{ color: "var(--text-muted)" }}>Engine Throttle & Governor Setting</span>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontWeight: 600, color: "var(--text)" }}>
                  75% MCP (Cruise)
                </span>
              </div>
              <div style={{ width: "100%", height: "4px", background: "var(--surface-3)", borderRadius: "2px", marginTop: "0.5rem", overflow: "hidden" }}>
                <div style={{ width: "75%", height: "100%", background: "var(--accent)" }} />
              </div>
            </div>

            <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.75rem 1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="text-caption" style={{ color: "var(--text-muted)" }}>Engine RPM Governing Hub</span>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontWeight: 600, color: "var(--text)" }}>
                  {(payload.rpm || 2450).toFixed(0)} RPM <span className="unit">(Max 3200)</span>
                </span>
              </div>
              <div style={{ width: "100%", height: "4px", background: "var(--surface-3)", borderRadius: "2px", marginTop: "0.5rem", overflow: "hidden" }}>
                <div style={{ width: `${((payload.rpm || 2450) / 3200) * 100}%`, height: "100%", background: "var(--status-nominal)" }} />
              </div>
            </div>

            <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.75rem 1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="text-caption" style={{ color: "var(--text-muted)" }}>Cylinder Thermal Headroom</span>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontWeight: 600, color: "var(--text)" }}>
                  {(payload.cht_c || 142.0).toFixed(1)} °C <span className="unit">(Limit 165 °C)</span>
                </span>
              </div>
              <div style={{ width: "100%", height: "4px", background: "var(--surface-3)", borderRadius: "2px", marginTop: "0.5rem", overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, ((payload.cht_c || 142.0) / 165) * 100)}%`, height: "100%", background: "var(--status-nominal)" }} />
              </div>
            </div>

            <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.75rem 1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="text-caption" style={{ color: "var(--text-muted)" }}>Exhaust Gas Temp Margin</span>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontWeight: 600, color: "var(--text)" }}>
                  {(payload.egt_c || 615.0).toFixed(1)} °C <span className="unit">(Limit 680 °C)</span>
                </span>
              </div>
              <div style={{ width: "100%", height: "4px", background: "var(--surface-3)", borderRadius: "2px", marginTop: "0.5rem", overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, ((payload.egt_c || 615.0) / 680) * 100)}%`, height: "100%", background: "var(--status-nominal)" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Audit Modal */}
      <ExportAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        payload={payload}
        linkState={linkState}
        waypoints={waypoints}
      />
    </PageLayout>
  );
}
