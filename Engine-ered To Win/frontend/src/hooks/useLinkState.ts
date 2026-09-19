"use client";

import { useTelemetry, LinkState } from "@/context/TelemetryContext";
import { fmtTimestamp, fmtRelativeTime } from "@/lib/format";

export interface LinkStateInfo {
  linkState: LinkState;
  isLive: boolean;
  isStale: boolean;
  isReconnecting: boolean;
  isOffline: boolean;
  lastUpdateAt: Date | null;
  lastUpdateFormatted: string;
  relativeTimeAgo: string;
  reconnectAttempts: number;
}

export function useLinkState(): LinkStateInfo {
  const { linkState, lastUpdateAt, currentTime, reconnectAttempts, timeDisplay } =
    useTelemetry();

  const isLive = linkState === "live";
  const isStale = linkState === "stale";
  const isReconnecting = linkState === "reconnecting";
  const isOffline = linkState === "offline";

  const isZulu = timeDisplay === "zulu";
  const lastUpdateFormatted = lastUpdateAt
    ? fmtTimestamp(lastUpdateAt, isZulu)
    : "--:--:--";
  const relativeTimeAgo = lastUpdateAt
    ? fmtRelativeTime(lastUpdateAt, currentTime)
    : "No signal";

  return {
    linkState,
    isLive,
    isStale,
    isReconnecting,
    isOffline,
    lastUpdateAt,
    lastUpdateFormatted,
    relativeTimeAgo,
    reconnectAttempts,
  };
}
