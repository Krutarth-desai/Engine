"use client";

import React, { useEffect, useState } from "react";
import { useTelemetry } from "@/context/TelemetryContext";
import { MissionListItem } from "@/types/telemetry";

export default function MissionHistory() {
  const { fetchMissions, startReplay, replay, isConnected } = useTelemetry();
  const [missions, setMissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingReplayId, setLoadingReplayId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const loadMissionsList = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMissions();
      setMissions(data || []);
    } catch (e) {
      console.warn("Failed to load missions:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMissionsList();
  }, [fetchMissions]);

  const handleLaunchReplay = async (missionId: string) => {
    setLoadingReplayId(missionId);
    try {
      await startReplay(missionId, 1.0);
    } finally {
      setLoadingReplayId(null);
    }
  };

  const activeReplayId = replay?.mission_id;

  const formatDuration = (sec?: number) => {
    if (sec == null) return "—";
    const s = Math.round(sec);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}m ${rem}s`;
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return "—";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return isoStr;
    }
  };

  return (
    <div
      className="mission-history-panel"
      style={{
        background: "var(--bg-card, rgba(14, 21, 38, 0.75))",
        border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
        borderRadius: "10px",
        padding: "1rem 1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.95rem", fontWeight: 800, letterSpacing: "0.5px", color: "#f8fafc" }}>
              RECORDED MISSIONS CATALOG &amp; REPLAY
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
              {missions.length} SORTIES STORED
            </span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary, #94a3b8)", marginTop: "0.15rem" }}>
            Deterministic flight archives with one-click historical playback into the digital twin
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            style={{
              background: isExpanded ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.04)",
              border: `1px solid ${isExpanded ? "var(--accent-cyan, #38bdf8)" : "rgba(255, 255, 255, 0.1)"}`,
              color: isExpanded ? "var(--accent-cyan, #38bdf8)" : "#cbd5e1",
              borderRadius: "4px",
              padding: "0.3rem 0.65rem",
              fontSize: "0.7rem",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            {isExpanded ? "▲ COLLAPSE ARCHIVE" : "▼ EXPAND ARCHIVE"}
          </button>
          <button
            onClick={loadMissionsList}
            disabled={isLoading}
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "var(--text-secondary, #94a3b8)",
              borderRadius: "4px",
              padding: "0.3rem 0.65rem",
              fontSize: "0.7rem",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            {isLoading ? "REFRESHING..." : "↻ REFRESH"}
          </button>
        </div>
      </div>

      {/* Expanded Table or Collapsed Preview */}
      {!isExpanded ? (
        <div
          onClick={() => setIsExpanded(true)}
          style={{
            background: "rgba(0, 0, 0, 0.2)",
            border: "1px dashed rgba(255, 255, 255, 0.08)",
            borderRadius: "6px",
            padding: "0.6rem 1rem",
            fontSize: "0.74rem",
            color: "var(--text-secondary, #94a3b8)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          <span>
            📁 {missions.length} recorded sortie{missions.length === 1 ? "" : "s"} available in local repository. Click to browse missions and launch digital twin playback.
          </span>
          <span style={{ color: "var(--accent-cyan, #38bdf8)", fontWeight: 700 }}>
            BROWSE &amp; REPLAY →
          </span>
        </div>
      ) : isLoading ? (
        <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted, #64748b)", fontSize: "0.8rem" }}>
          Scanning mission storage index...
        </div>
      ) : missions.length === 0 ? (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            background: "rgba(0, 0, 0, 0.2)",
            borderRadius: "8px",
            border: "1px dashed rgba(255, 255, 255, 0.08)",
            color: "var(--text-muted, #64748b)",
            fontSize: "0.8rem",
          }}
        >
          No recorded missions yet. Use <strong>START MISSION</strong> above to record your first flight sortie.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.74rem",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "var(--text-secondary, #94a3b8)",
                  textAlign: "left",
                  fontSize: "0.68rem",
                  letterSpacing: "0.5px",
                }}
              >
                <th style={{ padding: "0.5rem 0.5rem 0.5rem 0" }}>MISSION</th>
                <th style={{ padding: "0.5rem" }}>RECORDED DATE</th>
                <th style={{ padding: "0.5rem" }}>DURATION</th>
                <th style={{ padding: "0.5rem", textAlign: "center" }}>START HLTH</th>
                <th style={{ padding: "0.5rem", textAlign: "center" }}>END HLTH</th>
                <th style={{ padding: "0.5rem", textAlign: "center" }}>MIN HLTH</th>
                <th style={{ padding: "0.5rem" }}>FAULTS DETECTED</th>
                <th style={{ padding: "0.5rem", textAlign: "center" }}>STATUS</th>
                <th style={{ padding: "0.5rem 0 0.5rem 0.5rem", textAlign: "right" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {missions.map((m: any) => {
                const mid = m.mission_id || m.metadata?.mission_id || "UNKNOWN";
                const name = m.name || m.metadata?.name || m.metadata?.mission_name || mid;
                const dateStr = m.started_at || m.created_at || m.metadata?.start_time;
                const duration = m.duration_sec ?? m.summary?.duration_sec ?? m.metadata?.duration_sec;
                const startH = m.start_health ?? m.summary?.initial_health ?? 100;
                const endH = m.end_health ?? m.summary?.final_health ?? 100;
                const minH = m.min_health ?? m.summary?.min_health ?? 100;
                const faultCount = m.fault_count ?? m.summary?.fault_timeline?.length ?? 0;
                const status = m.status || m.metadata?.status || "COMPLETED";
                const isCurrentlyReplaying = activeReplayId === mid;

                return (
                  <tr
                    key={mid}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                      background: isCurrentlyReplaying ? "rgba(56, 189, 248, 0.08)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "0.6rem 0.5rem 0.6rem 0" }}>
                      <div style={{ fontWeight: 800, color: "#f8fafc" }}>{name}</div>
                      <div style={{ fontSize: "0.64rem", color: "var(--text-muted, #64748b)" }}>{mid}</div>
                    </td>
                    <td style={{ padding: "0.6rem", color: "var(--text-secondary, #94a3b8)" }}>
                      {formatDate(dateStr)}
                    </td>
                    <td style={{ padding: "0.6rem", color: "#f8fafc" }}>
                      {formatDuration(duration)}
                    </td>
                    <td style={{ padding: "0.6rem", textAlign: "center", color: "#10b981" }}>
                      {Math.round(startH)}
                    </td>
                    <td
                      style={{
                        padding: "0.6rem",
                        textAlign: "center",
                        color: endH >= 80 ? "#10b981" : endH >= 60 ? "#f59e0b" : "#ef4444",
                      }}
                    >
                      {Math.round(endH)}
                    </td>
                    <td
                      style={{
                        padding: "0.6rem",
                        textAlign: "center",
                        color: minH >= 80 ? "#10b981" : minH >= 60 ? "#f59e0b" : "#ef4444",
                        fontWeight: 700,
                      }}
                    >
                      {Math.round(minH)}
                    </td>
                    <td style={{ padding: "0.6rem" }}>
                      {faultCount > 0 ? (
                        <span style={{ color: "var(--accent-rose, #ef4444)", fontWeight: 700 }}>
                          ⚠️ {faultCount} Event(s)
                        </span>
                      ) : (
                        <span style={{ color: "var(--accent-emerald, #10b981)" }}>✓ Nominal</span>
                      )}
                    </td>
                    <td style={{ padding: "0.6rem", textAlign: "center" }}>
                      <span
                        style={{
                          fontSize: "0.62rem",
                          fontWeight: 700,
                          padding: "0.15rem 0.35rem",
                          borderRadius: "3px",
                          background: status === "COMPLETED" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                          color: status === "COMPLETED" ? "#10b981" : "#f59e0b",
                        }}
                      >
                        {status}
                      </span>
                    </td>
                    <td style={{ padding: "0.6rem 0 0.6rem 0.5rem", textAlign: "right" }}>
                      <button
                        onClick={() => handleLaunchReplay(mid)}
                        disabled={!isConnected || loadingReplayId === mid}
                        style={{
                          background: isCurrentlyReplaying ? "rgba(56, 189, 248, 0.25)" : "var(--accent-cyan, #38bdf8)",
                          color: isCurrentlyReplaying ? "#38bdf8" : "#070b14",
                          border: isCurrentlyReplaying ? "1px solid #38bdf8" : "none",
                          borderRadius: "4px",
                          padding: "0.3rem 0.65rem",
                          fontSize: "0.68rem",
                          fontWeight: 800,
                          cursor: isConnected ? "pointer" : "not-allowed",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {loadingReplayId === mid
                          ? "LOADING..."
                          : isCurrentlyReplaying
                          ? "▶ PLAYING"
                          : "REPLAY →"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
