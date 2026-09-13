"use client";

import React from "react";
import { useTelemetry } from "@/context/TelemetryContext";

const SPEED_OPTIONS = [0.25, 0.5, 1.0, 2.0, 5.0, 10.0];

export default function ReplayControlsBar() {
  const {
    mode,
    replay,
    pauseReplay,
    resumeReplay,
    stopReplay,
    seekReplay,
    setReplaySpeed,
    isConnected,
  } = useTelemetry();

  const isReplaying = mode === "REPLAY" || replay?.is_active || false;
  const isPaused = replay?.is_paused || false;
  const missionId = replay?.mission_id || "MISSION_ARCHIVE";
  const missionName = replay?.mission_name || missionId;
  const currentIndex = replay?.current_index ?? 0;
  const totalSamples = replay?.total_samples ?? 1;
  const progressPct = replay?.progress_pct ?? 0;
  const currentSpeed = replay?.speed ?? 1.0;
  const missionTimeSec = replay?.mission_time_sec ?? 0;

  const formatReplayTime = (sec: number) => {
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
  };

  const handleSliderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIdx = Number(e.target.value);
    await seekReplay(newIdx);
  };

  if (!isReplaying) {
    // When in LIVE mode, show an elegant, unobtrusive live status bar with quick hint
    return (
      <div
        className="live-mode-banner"
        style={{
          background: "rgba(16, 185, 129, 0.08)",
          border: "1px solid rgba(16, 185, 129, 0.2)",
          borderRadius: "8px",
          padding: "0.55rem 1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: isConnected ? "#10b981" : "#64748b",
              boxShadow: isConnected ? "0 0 8px #10b981" : "none",
            }}
          />
          <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#f8fafc", letterSpacing: "0.5px" }}>
            MODE: LIVE ENGINE STREAM
          </span>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted, #64748b)" }}>
            | Continuous 1 Hz propulsion telemetry
          </span>
        </div>

        <div style={{ fontSize: "0.7rem", color: "var(--text-secondary, #94a3b8)" }}>
          To inspect a previous sortie, select a mission in <strong>MISSION HISTORY</strong> below.
        </div>
      </div>
    );
  }

  // When in REPLAY mode, show a high-visibility glowing control banner
  return (
    <div
      className="replay-controls-bar"
      style={{
        background: "rgba(14, 21, 38, 0.95)",
        border: "1px solid rgba(56, 189, 248, 0.4)",
        borderRadius: "8px",
        padding: "0.85rem 1.15rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        boxShadow: "0 0 25px rgba(56, 189, 248, 0.2)",
        marginBottom: "1rem",
        position: "sticky",
        top: "70px",
        zIndex: 50,
      }}
    >
      {/* Top Banner Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 900,
              padding: "0.2rem 0.6rem",
              borderRadius: "4px",
              background: "rgba(56, 189, 248, 0.25)",
              color: "#38bdf8",
              border: "1px solid #38bdf8",
              letterSpacing: "0.5px",
              animation: isPaused ? "none" : "pulse 1.8s infinite",
            }}
          >
            {isPaused ? "⏸ MISSION REPLAY (PAUSED)" : "▶ MISSION REPLAY ACTIVE"}
          </span>

          <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#f8fafc" }}>
            {missionName}
          </span>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted, #64748b)" }}>
            ({missionId})
          </span>
        </div>

        {/* Playback Controls & Stop Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* Play/Pause Toggle */}
          <button
            onClick={() => (isPaused ? resumeReplay() : pauseReplay())}
            style={{
              background: "rgba(56, 189, 248, 0.2)",
              border: "1px solid #38bdf8",
              color: "#38bdf8",
              borderRadius: "4px",
              padding: "0.3rem 0.75rem",
              fontSize: "0.75rem",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {isPaused ? "▶ RESUME" : "⏸ PAUSE"}
          </button>

          {/* Speed Multipliers */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            {SPEED_OPTIONS.map((spd) => (
              <button
                key={spd}
                onClick={() => setReplaySpeed(spd)}
                style={{
                  background: currentSpeed === spd ? "#38bdf8" : "rgba(255, 255, 255, 0.04)",
                  color: currentSpeed === spd ? "#070b14" : "#94a3b8",
                  border: `1px solid ${currentSpeed === spd ? "#38bdf8" : "rgba(255, 255, 255, 0.08)"}`,
                  borderRadius: "3px",
                  padding: "0.2rem 0.4rem",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Return to Live Stream */}
          <button
            onClick={() => stopReplay()}
            style={{
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.5)",
              color: "#ef4444",
              borderRadius: "4px",
              padding: "0.3rem 0.75rem",
              fontSize: "0.75rem",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            ⏹ STOP &amp; RETURN TO LIVE
          </button>
        </div>
      </div>

      {/* Scrub Timeline Slider Row */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono, monospace)", color: "#38bdf8", fontWeight: 700 }}>
          {formatReplayTime(missionTimeSec)}
        </span>

        <input
          type="range"
          min="0"
          max={Math.max(1, totalSamples - 1)}
          value={currentIndex}
          onChange={handleSliderChange}
          style={{
            flex: 1,
            accentColor: "var(--accent-cyan, #38bdf8)",
            cursor: "pointer",
            height: "6px",
          }}
        />

        <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, monospace)", color: "var(--text-muted, #64748b)" }}>
          {currentIndex + 1} / {totalSamples} samples ({progressPct.toFixed(0)}%)
        </span>
      </div>
    </div>
  );
}
