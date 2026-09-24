"use client";

import React from "react";
import { useTelemetry } from "@/context/TelemetryContext";

interface PhaseDef {
  id: string;
  label: string;
  shortDesc: string;
  targetAlt: string;
  targetPwr: string;
}

const PHASES: PhaseDef[] = [
  { id: "TAKEOFF", label: "TAKEOFF", shortDesc: "Initial Roll & Climb", targetAlt: "1,500 ft", targetPwr: "95%" },
  { id: "CLIMB", label: "CLIMB", shortDesc: "Enroute Sustained Climb", targetAlt: "12,000 ft", targetPwr: "85%" },
  { id: "CRUISE", label: "CRUISE", shortDesc: "Operational Transit", targetAlt: "15,000 ft", targetPwr: "70%" },
  { id: "LOITER", label: "LOITER", shortDesc: "Max Endurance ISR", targetAlt: "9,000 ft", targetPwr: "50%" },
  { id: "HIGH_SPEED", label: "HIGH SPEED", shortDesc: "Fast Ingress / Dash", targetAlt: "15,000 ft", targetPwr: "90%" },
  { id: "DESCENT", label: "DESCENT", shortDesc: "Enroute Step Descent", targetAlt: "3,000 ft", targetPwr: "35%" },
  { id: "LANDING", label: "LANDING", shortDesc: "Final Approach & Rollout", targetAlt: "Ground", targetPwr: "25%" },
];

export default function MissionPhaseTimeline() {
  const { environment, setMissionProfile, isConnected } = useTelemetry();

  const activePhase = (environment?.mission_profile || "CRUISE").toUpperCase();
  const missionTimeSec = environment?.mission_time_sec != null ? Math.floor(environment.mission_time_sec) : null;

  const formatElapsed = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleSelectPhase = async (phaseId: string) => {
    if (!isConnected) return;
    await setMissionProfile(phaseId);
  };

  return (
    <div
      className="mission-phase-timeline"
      style={{
        background: "var(--bg-card, rgba(14, 21, 38, 0.75))",
        border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
        borderRadius: "10px",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.95rem", fontWeight: 800, letterSpacing: "0.5px", color: "#f8fafc" }}>
              MISSION FLIGHT PHASE TIMELINE
            </span>
            <span
              style={{
                fontSize: "0.62rem",
                fontWeight: 800,
                padding: "0.15rem 0.45rem",
                borderRadius: "4px",
                background: "rgba(56, 189, 248, 0.15)",
                color: "var(--accent-cyan, #38bdf8)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
              }}
            >
              PHASE: {activePhase}
            </span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary, #94a3b8)", marginTop: "0.15rem" }}>
            Real-time UAV mission profile transition schedule with governor power management
          </div>
        </div>

        {missionTimeSec != null && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "rgba(0, 0, 0, 0.25)",
              padding: "0.25rem 0.6rem",
              borderRadius: "4px",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <span style={{ fontSize: "0.68rem", color: "var(--text-muted, #64748b)" }}>FLIGHT TIME:</span>
            <span
              style={{
                fontSize: "0.85rem",
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 800,
                color: "var(--accent-cyan, #38bdf8)",
              }}
            >
              {formatElapsed(missionTimeSec)}
            </span>
          </div>
        )}
      </div>

      {/* Sequential Phase Chevron Badges */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "0.5rem",
        }}
      >
        {PHASES.map((p, idx) => {
          const isActive = activePhase === p.id;
          return (
            <button
              key={p.id}
              onClick={() => handleSelectPhase(p.id)}
              disabled={!isConnected}
              style={{
                background: isActive
                  ? "rgba(56, 189, 248, 0.18)"
                  : "rgba(255, 255, 255, 0.02)",
                border: `1px solid ${
                  isActive
                    ? "var(--accent-cyan, #38bdf8)"
                    : "rgba(255, 255, 255, 0.06)"
                }`,
                borderRadius: "6px",
                padding: "0.65rem 0.6rem",
                textAlign: "left",
                cursor: isConnected ? "pointer" : "not-allowed",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
                boxShadow: isActive ? "0 0 12px rgba(56, 189, 248, 0.2)" : "none",
                position: "relative",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontFamily: "var(--font-mono, monospace)",
                    color: isActive ? "#38bdf8" : "var(--text-muted, #64748b)",
                  }}
                >
                  0{idx + 1}
                </span>
                {isActive && (
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#38bdf8",
                      boxShadow: "0 0 6px #38bdf8",
                    }}
                  />
                )}
              </div>

              <div
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  color: isActive ? "#38bdf8" : "#f8fafc",
                }}
              >
                {p.label}
              </div>

              <div style={{ fontSize: "0.62rem", color: "var(--text-secondary, #94a3b8)" }}>
                {p.targetAlt} | {p.targetPwr}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
