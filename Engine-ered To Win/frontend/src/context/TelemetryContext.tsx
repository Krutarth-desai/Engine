"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  UnifiedTelemetryPayload,
  SensorItem,
} from "@/types/telemetry";
import { SENSOR_LIMITS, SensorKey, getSensorStatus } from "@/lib/limits";
import { normalizeScenarioId } from "@/lib/scenarios";

export type LinkState = "live" | "stale" | "reconnecting" | "offline";
export type UnitPreference = "psi" | "bar";
export type TimeDisplayPreference = "local" | "zulu";

export interface TelemetryContextValue {
  payload: UnifiedTelemetryPayload;
  linkState: LinkState;
  lastUpdateAt: Date | null;
  currentTime: number; // ticks every second for relative timestamps & countdowns
  reconnectAttempts: number;
  activeScenario: string;
  isSimulated: boolean;
  unitPreference: UnitPreference;
  timeDisplay: TimeDisplayPreference;
  focusedComponent: string | null;
  historyBuffer: UnifiedTelemetryPayload[];
  replayIndex: number | null; // null when live, index when scrubbing past
  injectScenario: (scenarioId: string) => void;
  resetScenario: () => void;
  setUnitPreference: (pref: UnitPreference) => void;
  setTimeDisplay: (pref: TimeDisplayPreference) => void;
  setFocusedComponent: (comp: string | null) => void;
  setReplayIndex: React.Dispatch<React.SetStateAction<number | null>>;
}

const TelemetryContext = createContext<TelemetryContextValue | null>(null);

// Default nominal sensor state derived from SENSOR_LIMITS
const DEFAULT_SENSORS: SensorItem[] = (
  Object.keys(SENSOR_LIMITS) as SensorKey[]
).map((key) => {
  const def = SENSOR_LIMITS[key];
  const progressPct =
    def.max > def.min
      ? ((def.nominal - def.min) / (def.max - def.min)) * 100
      : 50;
  return {
    key,
    name: def.name,
    value: def.nominal,
    unit: def.unit,
    min: def.min,
    max: def.max,
    status: "NORMAL",
    trend: "STABLE",
    progressPct: Math.round(progressPct * 10) / 10,
  };
});

// Default initial telemetry baseline matching nominal operational cruise
export const DEFAULT_PAYLOAD: UnifiedTelemetryPayload = {
  cycle: 31,
  timestamp: new Date().toISOString(),
  vehicle: {
    vehicle_id: "UAV_ENG_001",
    mission_id: "ISR_PATROL_27",
    altitude: 15000,
    throttle: 75,
    update_rate: 1,
  },
  sensors: Object.fromEntries(DEFAULT_SENSORS.map((s) => [s.key, s])),
  sensor_list: DEFAULT_SENSORS,
  prognostics: {
    predicted_rul: 117.4,
    actual_rul: 112.0,
    remaining_time_str: "01:57:32",
    current_cycle: 31,
    max_useful_life: 250,
    rul_unclipped: 117.4,
    rul_clipped: 117.4,
    degradation_trend: "Stable",
    confidence: 94.8,
    abs_error: 5.4, // Reconciled: |117.4 - 112.0| = 5.4 (not 4.2)
    model_mae: 10.08,
    window_size: 30,
    sensor_count: 15,
  },
  health_index: 96,
  risk: {
    level: "LOW",
    anomaly: "NORMAL",
    action: "Nominal Cruise Profile - All Systems Normal",
    status_label: "SYSTEMS OPTIMAL",
    guidance: "Continuous telemetry baseline nominal. No flight plan deviation required.",
  },
  contributing_features: [
    { name: "EGT", score: 0.142, impact: "combustion temperature stable", direction: "STABLE" },
    { name: "CHT", score: 0.138, impact: "cylinder thermal gradient balanced", direction: "STABLE" },
    { name: "Oil Pressure", score: 0.125, impact: "hydrodynamic film nominal", direction: "STABLE" },
    { name: "Vibration", score: 0.118, impact: "bearing balance nominal", direction: "STABLE" },
    { name: "Oil Temperature", score: 0.106, impact: "cooling circuit nominal", direction: "STABLE" },
    { name: "Fuel Flow", score: 0.091, impact: "mixture stoichiometry nominal", direction: "STABLE" },
    { name: "RPM", score: 0.082, impact: "governor regulation nominal", direction: "STABLE" },
    { name: "Injection Timing", score: 0.070, impact: "combustion phasing nominal", direction: "STABLE" },
  ],
  recent_trends: {
    points: Array.from({ length: 30 }, (_, i) => ({
      cycle: i + 2,
      egt: Math.round((610 + Math.sin(i / 4) * 2) * 10) / 10,
      oil_pressure: Math.round((68 + Math.cos(i / 4) * 0.5) * 10) / 10,
      vibration: Math.round((1.40 + Math.sin(i / 5) * 0.02) * 100) / 100,
      health_index: Math.round(96 - i * 0.05),
    })),
    deltas: {
      egt_delta: 0.4,
      oil_pressure_delta: -0.2,
      vibration_delta: 0.01,
      health_delta: -1,
    },
  },
  // Trajectory reconciled: last point equals headline predicted RUL
  trajectory: Array.from({ length: 31 }, (_, i) => {
    const cycle = i + 1;
    const actual_rul = Math.max(0, 250 - cycle * 4.45);
    const predicted_rul =
      i === 30 ? 117.4 : Math.max(0, actual_rul + Math.sin(i / 3) * 2.5);
    return {
      cycle,
      actual_rul: Math.round(actual_rul * 10) / 10,
      predicted_rul: Math.round(predicted_rul * 10) / 10,
    };
  }),
  alerts: [
    {
      id: "alt-1",
      level: "NORMAL",
      title: "ALL SYSTEMS NOMINAL",
      message: "Cross-sensor validation confirms genuine propulsion health baseline.",
      time_ago: "Just now",
      timestamp: new Date().toISOString(),
    },
    {
      id: "alt-2",
      level: "INFO",
      title: "VIBRATION & COMBUSTION NOMINAL",
      message: "Dynamic harmonics within standard rotational cruise envelope.",
      time_ago: "2 min ago",
      timestamp: new Date(Date.now() - 120000).toISOString(),
    },
  ],
  fault_label: "Normal",
  scenario: "Normal",
  rpm: 2450,
  cht_c: 142.0,
  egt_c: 615.0,
  oil_pressure_bar: 4.69,
  oil_temperature_c: 92.0,
  fuel_flow_lh: 17.6,
  vibration_g: 1.42,
  battery_voltage_v: 27.6,
  injection_timing_deg: 23.4,
};

/**
 * Ensures payload data correctness and mathematical reconciliation.
 */
function reconcilePayload(raw: UnifiedTelemetryPayload): UnifiedTelemetryPayload {
  const copy: UnifiedTelemetryPayload = { ...raw };

  // Reconcile prognostics errors dynamically
  if (copy.prognostics) {
    const pred = copy.prognostics.predicted_rul ?? 117;
    const actual = copy.prognostics.actual_rul ?? 112;
    copy.prognostics = {
      ...copy.prognostics,
      abs_error: Math.round(Math.abs(pred - actual) * 10) / 10,
    };
  }

  // Reconcile trajectory last point to equal headline predicted RUL
  if (copy.trajectory && copy.trajectory.length > 0 && copy.prognostics) {
    const lastIdx = copy.trajectory.length - 1;
    copy.trajectory = copy.trajectory.map((pt, idx) => {
      if (idx === lastIdx) {
        return {
          ...pt,
          predicted_rul: copy.prognostics.predicted_rul,
        };
      }
      return pt;
    });
  }

  // Reconcile Sensor Statuses and Progress Percentages from limits.ts
  if (copy.sensor_list) {
    copy.sensor_list = copy.sensor_list.map((s) => {
      const def = SENSOR_LIMITS[s.key as SensorKey];
      if (def) {
        const status = getSensorStatus(s.key as SensorKey, s.value);
        const progressPct =
          def.max > def.min
            ? Math.min(100, Math.max(0, ((s.value - def.min) / (def.max - def.min)) * 100))
            : s.progressPct;
        return {
          ...s,
          min: def.min,
          max: def.max,
          unit: def.unit,
          status,
          progressPct: Math.round(progressPct * 10) / 10,
        };
      }
      return s;
    });
  }

  return copy;
}

const INITIAL_HISTORY: UnifiedTelemetryPayload[] = Array.from({ length: 30 }, (_, i) => {
  const cycle = i + 1;
  const timeOffset = (30 - i) * 60000;
  const ts = new Date(Date.now() - timeOffset).toISOString();
  return {
    ...DEFAULT_PAYLOAD,
    cycle,
    timestamp: ts,
    rpm: 2450 + (i % 5) * 5 - 10,
    cht_c: 140.0 + (i % 4) * 0.8,
    egt_c: 610.0 + (i % 6) * 1.5,
    oil_pressure_bar: 4.69 + (i % 3) * 0.02,
    oil_temperature_c: 91.0 + (i % 3) * 0.5,
    fuel_flow_lh: 17.5 + (i % 4) * 0.1,
    vibration_g: 1.40 + (i % 5) * 0.01,
  };
});

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const [payload, setPayload] = useState<UnifiedTelemetryPayload>(DEFAULT_PAYLOAD);
  const [lastUpdateAt, setLastUpdateAt] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  const [activeScenario, setActiveScenario] = useState<string>("Normal");
  const [unitPreference, setUnitPreference] = useState<UnitPreference>("psi");
  const [timeDisplay, setTimeDisplay] = useState<TimeDisplayPreference>("local");
  const [focusedComponent, setFocusedComponent] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return new URLSearchParams(window.location.search).get("focus");
    } catch {
      return null;
    }
  });
  const [historyBuffer, setHistoryBuffer] = useState<UnifiedTelemetryPayload[]>([...INITIAL_HISTORY, DEFAULT_PAYLOAD]);
  const [replayIndex, setReplayIndex] = useState<number | null>(null);
  const isSimulated = true;

  // Listen to popstate for browser back/forward navigation
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePopState = () => {
      try {
        const f = new URLSearchParams(window.location.search).get("focus");
        setFocusedComponent(f);
      } catch {
        // Ignored
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleSetFocusedComponent = useCallback((comp: string | null) => {
    setFocusedComponent(comp);
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        if (comp) {
          url.searchParams.set("focus", comp);
        } else {
          url.searchParams.delete("focus");
        }
        window.history.replaceState({}, "", url.toString());
      } catch {
        // Ignored
      }
    }
  }, []);

  const wsRef = useRef<WebSocket | null>(null);

  // Dynamic 1-second clock
  useEffect(() => {
    const timer = setTimeout(() => setCurrentTime(Date.now()), 0);
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  // Continuous WebSocket connection lifecycle
  useEffect(() => {
    if (typeof window === "undefined") return;

    let isDisposed = false;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const connect = () => {
      if (isDisposed) return;

      const wsHost =
        process.env.NEXT_PUBLIC_WS_URL ||
        `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.hostname}:8000`;
      const wsUrl = `${wsHost}/ws/telemetry`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isDisposed) {
            ws.close();
            return;
          }
          setIsConnected(true);
          setReconnectAttempts(0);
        };

        ws.onmessage = (event) => {
          if (isDisposed) return;
          try {
            const raw = JSON.parse(event.data);
            if (raw.prognostics && raw.sensor_list) {
              const clean = reconcilePayload(raw);
              const now = new Date();
              setLastMessageTimestamp(now.getTime());
              setLastUpdateAt(now);
              setPayload(clean);

              if (clean.scenario) {
                setActiveScenario(normalizeScenarioId(clean.scenario));
              }

              setHistoryBuffer((prev) => {
                const updated = [...prev, clean];
                return updated.length > 120 ? updated.slice(updated.length - 120) : updated;
              });
            }
          } catch (err) {
            console.error("[AeroTwin] Telemetry frame parse error:", err);
          }
        };

        ws.onclose = () => {
          if (isDisposed) return;
          setIsConnected(false);
          setReconnectAttempts((prev) => prev + 1);
          reconnectTimer = setTimeout(connect, 2000);
        };

        ws.onerror = () => {
          if (isDisposed) return;
          setIsConnected(false);
          try {
            ws.close();
          } catch {
            // ignore
          }
        };
      } catch {
        if (!isDisposed) {
          setIsConnected(false);
          reconnectTimer = setTimeout(connect, 3000);
        }
      }
    };

    const initialTimer = setTimeout(connect, 0);

    return () => {
      isDisposed = true;
      clearTimeout(initialTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // Derive Link State: live | stale | reconnecting | offline
  let linkState: LinkState = "offline";
  if (isConnected) {
    const timeSinceLast =
      currentTime > 0 && lastMessageTimestamp > 0
        ? currentTime - lastMessageTimestamp
        : 0;
    if (timeSinceLast > 5000 && lastMessageTimestamp > 0) {
      linkState = "stale";
    } else {
      linkState = "live";
    }
  } else {
    if (reconnectAttempts > 0 && reconnectAttempts < 10) {
      linkState = "reconnecting";
    } else {
      linkState = "offline";
    }
  }

  // Inject Scenario handler
  const injectScenario = useCallback((scenarioId: string) => {
    const normalized = normalizeScenarioId(scenarioId);
    setActiveScenario(normalized);

    // 1. Send via WebSocket if open
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ scenario: normalized }));
      } catch (e) {
        console.warn("[AeroTwin] WS inject scenario failed:", e);
      }
    }

    // 2. HTTP POST fallback for instant processing
    try {
      const apiHost =
        process.env.NEXT_PUBLIC_API_URL ||
        (typeof window !== "undefined"
          ? `${window.location.protocol}//${window.location.hostname}:8000`
          : "http://localhost:8000");
      fetch(`${apiHost}/api/scenario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: normalized }),
      }).catch(() => {});
    } catch {
      // Ignored
    }
  }, []);

  const resetScenario = useCallback(() => {
    injectScenario("Normal");
  }, [injectScenario]);

  // Select active payload: if scrubbing past, use replay frame; else live payload
  const activePayload =
    replayIndex !== null && historyBuffer[replayIndex]
      ? historyBuffer[replayIndex]
      : payload;

  const value: TelemetryContextValue = {
    payload: activePayload,
    linkState,
    lastUpdateAt,
    currentTime,
    reconnectAttempts,
    activeScenario,
    isSimulated,
    unitPreference,
    timeDisplay,
    focusedComponent,
    historyBuffer,
    replayIndex,
    injectScenario,
    resetScenario,
    setUnitPreference,
    setTimeDisplay,
    setFocusedComponent: handleSetFocusedComponent,
    setReplayIndex,
  };

  return (
    <TelemetryContext.Provider value={value}>
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetry(): TelemetryContextValue {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error("useTelemetry must be used within a TelemetryProvider");
  }
  return context;
}
