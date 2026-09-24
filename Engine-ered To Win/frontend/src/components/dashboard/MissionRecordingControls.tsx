"use client";

import React, { useState, useEffect } from "react";
import { useTelemetry } from "@/context/TelemetryContext";

export default function MissionRecordingControls() {
  const { recording, healthIndex, environment, startMission, stopMission, isConnected } = useTelemetry();

  const [missionName] = useState<string>("ISR Sortie Patrol");
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
      className="gcs-card mission-recording-panel"
      style={{
        border: `1px solid ${isRecording ? "rgba(239, 68, 68, 0.5)" : "rgba(255, 255, 255, 0.08)"}`,
        boxShadow: isRecording ? "0 0 20px rgba(239, 68, 68, 0.15)" : "none",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Header */}
      <div className="gcs-card-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <span className="gcs-card-title">
            <span>⏺</span> MISSION RECORDING
          </span>
          <span
            style={{
              fontSize: "0.58rem",
              fontWeight: 800,
              padding: "0.1rem 0.4rem",
              borderRadius: "3px",
              background: isRecording ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.04)",
              color: isRecording ? "#ef4444" : "var(--text-muted, #64748b)",
              border: `1px solid ${isRecording ? "rgba(239, 68, 68, 0.5)" : "rgba(255, 255, 255, 0.08)"}`,
              animation: isRecording ? "pulse 1.5s infinite" : "none",
            }}
          >
            {isRecording ? "RECORDING" : "IDLE"}
          </span>
        </div>

        {/* Start / Stop Action Button */}
        <button
          onClick={handleToggleRecording}
          disabled={!isConnected || isSubmitting}
          id="btn-toggle-mission"
          className={`gcs-btn gcs-btn-sm ${isRecording ? "gcs-btn-danger" : "gcs-btn-success"}`}
        >
          {isRecording ? "⏹ STOP MISSION" : "⏺ START MISSION"}
        </button>
      </div>

      {/* Target Key-Value Layout */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.38rem",
          background: "rgba(0, 0, 0, 0.2)",
          padding: "0.65rem 0.85rem",
          borderRadius: "6px",
          border: "1px solid rgba(255, 255, 255, 0.04)",
          fontSize: "0.75rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--text-muted, #64748b)" }}>Active Mission ID</span>
          <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 700, color: isRecording ? "#38bdf8" : "#94a3b8" }}>
            {missionId ? (missionId.length > 18 ? `${missionId.slice(0, 16)}…` : missionId) : "—"}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--text-muted, #64748b)" }}>Duration</span>
          <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 700, color: isRecording ? "#f8fafc" : "#94a3b8" }}>
            {isRecording ? formatElapsed(elapsedTimer) : "00:00"}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--text-muted, #64748b)" }}>Samples</span>
          <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 700, color: isRecording ? "#f59e0b" : "#94a3b8" }}>
            {sampleCount.toLocaleString()}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--text-muted, #64748b)" }}>Flight Phase</span>
          <span style={{ fontWeight: 700, color: "#38bdf8" }}>
            {environment?.mission_profile || "CRUISE"}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--text-muted, #64748b)" }}>Current Health</span>
          <span
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontWeight: 800,
              color: healthIndex >= 85 ? "#10b981" : healthIndex >= 60 ? "#f59e0b" : "#ef4444",
            }}
          >
            {healthIndex} / 100
          </span>
        </div>
      </div>
    </div>
  );
}
