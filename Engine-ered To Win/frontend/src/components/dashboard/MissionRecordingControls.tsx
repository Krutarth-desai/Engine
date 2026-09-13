"use client";

import React, { useState, useEffect } from "react";
import { useTelemetry } from "@/context/TelemetryContext";

export default function MissionRecordingControls() {
  const { recording, healthIndex, environment, startMission, stopMission, isConnected } = useTelemetry();

  const [missionName, setMissionName] = useState<string>("ISR Sortie Patrol");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [elapsedTimer, setElapsedTimer] = useState<number>(0);

  const isRecording = recording?.is_recording || false;
  const missionId = recording?.mission_id || null;
  const sampleCount = recording?.sample_count || 0;

  // Local elapsed timer when recording is active
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      interval = setInterval(() => {
        setElapsedTimer((t) => t + 1);
      }, 1000);
    } else {
      setElapsedTimer(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const handleToggleRecording = async () => {
    if (!isConnected || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (isRecording) {
        await stopMission();
      } else {
        await startMission({ mission_name: missionName });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div
      className="mission-recording-panel"
      style={{
        background: "var(--bg-card, rgba(14, 21, 38, 0.75))",
        border: `1px solid ${isRecording ? "rgba(239, 68, 68, 0.5)" : "var(--border-subtle, rgba(255, 255, 255, 0.08))"}`,
        borderRadius: "10px",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
        boxShadow: isRecording ? "0 0 20px rgba(239, 68, 68, 0.15)" : "none",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.95rem", fontWeight: 800, letterSpacing: "0.5px", color: "#f8fafc" }}>
              MISSION RECORDING (PHASE 5)
            </span>
            <span
              style={{
                fontSize: "0.62rem",
                fontWeight: 800,
                padding: "0.15rem 0.45rem",
                borderRadius: "4px",
                background: isRecording ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.04)",
                color: isRecording ? "#ef4444" : "var(--text-muted, #64748b)",
                border: `1px solid ${isRecording ? "rgba(239, 68, 68, 0.5)" : "rgba(255, 255, 255, 0.08)"}`,
                animation: isRecording ? "pulse 1.5s infinite" : "none",
              }}
            >
              {isRecording ? "● RECORDING" : "IDLE"}
            </span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary, #94a3b8)", marginTop: "0.15rem" }}>
            Deterministic high-frequency logging of engine telemetry, health, physics residuals &amp; fault events
          </div>
        </div>

        {/* Start / Stop Action Button */}
        <button
          onClick={handleToggleRecording}
          disabled={!isConnected || isSubmitting}
          style={{
            background: isRecording ? "var(--accent-rose, #ef4444)" : "var(--accent-emerald, #10b981)",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            padding: "0.45rem 1.1rem",
            fontSize: "0.78rem",
            fontWeight: 800,
            cursor: isConnected ? "pointer" : "not-allowed",
            transition: "all 0.2s ease",
            opacity: isConnected ? 1 : 0.6,
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span>{isRecording ? "⏹ STOP MISSION" : "⏺ START MISSION"}</span>
        </button>
      </div>

      {/* Recording Status & Metadata Fields */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.65rem",
          background: "rgba(0, 0, 0, 0.2)",
          padding: "0.75rem",
          borderRadius: "6px",
          border: "1px solid rgba(255, 255, 255, 0.04)",
        }}
      >
        {/* Mission ID */}
        <div>
          <div style={{ fontSize: "0.65rem", color: "var(--text-muted, #64748b)" }}>ACTIVE MISSION ID</div>
          <div
            style={{
              fontSize: "0.85rem",
              fontWeight: 800,
              fontFamily: "var(--font-mono, monospace)",
              color: isRecording ? "#38bdf8" : "#94a3b8",
              marginTop: "0.1rem",
            }}
          >
            {missionId || "—"}
          </div>
        </div>

        {/* Elapsed Time */}
        <div>
          <div style={{ fontSize: "0.65rem", color: "var(--text-muted, #64748b)" }}>RECORDING DURATION</div>
          <div
            style={{
              fontSize: "0.85rem",
              fontWeight: 800,
              fontFamily: "var(--font-mono, monospace)",
              color: isRecording ? "#f8fafc" : "#94a3b8",
              marginTop: "0.1rem",
            }}
          >
            {isRecording ? formatElapsed(elapsedTimer) : "00:00"}
          </div>
        </div>

        {/* Sample Count */}
        <div>
          <div style={{ fontSize: "0.65rem", color: "var(--text-muted, #64748b)" }}>SAMPLES LOGGED</div>
          <div
            style={{
              fontSize: "0.85rem",
              fontWeight: 800,
              fontFamily: "var(--font-mono, monospace)",
              color: isRecording ? "#f59e0b" : "#94a3b8",
              marginTop: "0.1rem",
            }}
          >
            {sampleCount.toLocaleString()}
          </div>
        </div>

        {/* Current Phase */}
        <div>
          <div style={{ fontSize: "0.65rem", color: "var(--text-muted, #64748b)" }}>FLIGHT PHASE</div>
          <div
            style={{
              fontSize: "0.85rem",
              fontWeight: 800,
              color: "#38bdf8",
              marginTop: "0.1rem",
            }}
          >
            {environment?.mission_profile || "CRUISE"}
          </div>
        </div>

        {/* Current Health */}
        <div>
          <div style={{ fontSize: "0.65rem", color: "var(--text-muted, #64748b)" }}>CURRENT HEALTH</div>
          <div
            style={{
              fontSize: "0.85rem",
              fontWeight: 800,
              fontFamily: "var(--font-mono, monospace)",
              color: healthIndex >= 85 ? "#10b981" : healthIndex >= 60 ? "#f59e0b" : "#ef4444",
              marginTop: "0.1rem",
            }}
          >
            {healthIndex} / 100
          </div>
        </div>
      </div>
    </div>
  );
}
