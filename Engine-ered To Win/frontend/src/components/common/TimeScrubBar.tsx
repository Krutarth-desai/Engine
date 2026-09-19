"use client";

import React, { useState, useEffect } from "react";
import { useTelemetry } from "@/context/TelemetryContext";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Radio,
  Clock,
  History,
} from "lucide-react";

export default function TimeScrubBar() {
  const {
    historyBuffer,
    replayIndex,
    setReplayIndex,
    payload,
  } = useTelemetry();

  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const totalFrames = historyBuffer.length;
  const isLive = replayIndex === null;
  const currentIndex = isLive ? totalFrames - 1 : replayIndex;

  // Auto-play interval
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setReplayIndex((prev: number | null) => {
        const next = (prev === null ? totalFrames - 1 : prev) + 1;
        if (next >= totalFrames) {
          setIsPlaying(false);
          return null; // Return to live
        }
        return next;
      });
    }, 900);

    return () => clearInterval(interval);
  }, [isPlaying, totalFrames, setReplayIndex]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (val >= totalFrames - 1) {
      setReplayIndex(null);
      setIsPlaying(false);
    } else {
      setReplayIndex(val);
    }
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    if (isLive) {
      setReplayIndex(Math.max(0, totalFrames - 2));
    } else if (replayIndex !== null && replayIndex > 0) {
      setReplayIndex(replayIndex - 1);
    }
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    if (replayIndex !== null) {
      if (replayIndex >= totalFrames - 2) {
        setReplayIndex(null); // Return to live
      } else {
        setReplayIndex(replayIndex + 1);
      }
    }
  };

  const handleReturnToLive = () => {
    setIsPlaying(false);
    setReplayIndex(null);
  };

  const activeTimestamp = (() => {
    try {
      const ts = payload.timestamp ? new Date(payload.timestamp) : new Date();
      return ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return "--:--:--";
    }
  })();

  const currentCycle = payload.cycle || currentIndex + 1;

  return (
    <div
      className="time-scrub-bar-container"
      style={{
        background: isLive ? "rgba(11, 15, 25, 0.95)" : "rgba(24, 18, 12, 0.96)",
        borderTop: `1px solid ${isLive ? "rgba(56, 189, 248, 0.25)" : "rgba(245, 158, 11, 0.5)"}`,
        backdropFilter: "blur(12px)",
        padding: "0.5rem 1.25rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        zIndex: 50,
        boxShadow: isLive ? "0 -4px 20px rgba(0,0,0,0.5)" : "0 -4px 20px rgba(245, 158, 11, 0.15)",
        transition: "all 0.25s ease",
      }}
    >
      {/* Left: Mode Indicator & Active Cycle Information */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: "220px" }}>
        {isLive ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.35)",
              color: "#10b981",
              borderRadius: "4px",
              padding: "0.2rem 0.55rem",
              fontSize: "0.68rem",
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 800,
            }}
          >
            <Radio size={12} className="animate-pulse" />
            <span>LIVE STREAM</span>
          </div>
        ) : (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              background: "rgba(245, 158, 11, 0.15)",
              border: "1px solid rgba(245, 158, 11, 0.5)",
              color: "#f59e0b",
              borderRadius: "4px",
              padding: "0.2rem 0.55rem",
              fontSize: "0.68rem",
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 800,
            }}
          >
            <History size={12} />
            <span>HISTORICAL REPLAY</span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#f8fafc", fontFamily: "'JetBrains Mono', monospace" }}>
            CYCLE {currentCycle} <span style={{ color: "#64748b", fontSize: "0.65rem" }}>/ {totalFrames}</span>
          </div>
          <div style={{ fontSize: "0.62rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: "0.25rem", fontFamily: "'JetBrains Mono', monospace" }}>
            <Clock size={10} />
            <span>{activeTimestamp}</span>
          </div>
        </div>
      </div>

      {/* Center: Playback Controls & Timeline Slider */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, maxWidth: "750px" }}>
        {/* Step Back */}
        <button
          onClick={handleStepBack}
          disabled={currentIndex <= 0}
          title="Step back 1 cycle"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: currentIndex <= 0 ? "#475569" : "#cbd5e1",
            borderRadius: "4px",
            padding: "0.25rem 0.4rem",
            cursor: currentIndex <= 0 ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <SkipBack size={13} />
        </button>

        {/* Play / Pause Toggle */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          title={isPlaying ? "Pause playback" : "Play historical sequence"}
          style={{
            background: isPlaying ? "rgba(245, 158, 11, 0.2)" : "rgba(56, 189, 248, 0.15)",
            border: `1px solid ${isPlaying ? "rgba(245, 158, 11, 0.5)" : "rgba(56, 189, 248, 0.4)"}`,
            color: isPlaying ? "#f59e0b" : "var(--accent-cyan)",
            borderRadius: "4px",
            padding: "0.25rem 0.55rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
            fontSize: "0.68rem",
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          <span>{isPlaying ? "PAUSE" : "PLAY"}</span>
        </button>

        {/* Step Forward */}
        <button
          onClick={handleStepForward}
          disabled={isLive}
          title="Step forward 1 cycle"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: isLive ? "#475569" : "#cbd5e1",
            borderRadius: "4px",
            padding: "0.25rem 0.4rem",
            cursor: isLive ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <SkipForward size={13} />
        </button>

        {/* Scrub Slider */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="range"
            min={0}
            max={Math.max(1, totalFrames - 1)}
            value={currentIndex}
            onChange={handleSliderChange}
            aria-label="Timeline cycle scrubber"
            style={{
              width: "100%",
              accentColor: isLive ? "var(--accent-cyan)" : "#f59e0b",
              cursor: "pointer",
              height: "4px",
            }}
          />
        </div>
      </div>

      {/* Right: Return to Live Button */}
      <div style={{ minWidth: "140px", display: "flex", justifyContent: "flex-end" }}>
        {!isLive && (
          <button
            onClick={handleReturnToLive}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              color: "#10b981",
              borderRadius: "4px",
              padding: "0.25rem 0.65rem",
              fontSize: "0.68rem",
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
              transition: "all 0.15s ease",
            }}
          >
            <RotateCcw size={12} />
            <span>RETURN TO LIVE</span>
          </button>
        )}
      </div>
    </div>
  );
}
