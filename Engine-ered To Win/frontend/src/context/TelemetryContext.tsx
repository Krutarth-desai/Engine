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
  alerts: [],
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
    copy.sensors = Object.fromEntries(copy.sensor_list.map((s) => [s.key, s]));
  }

  return copy;
}

const INITIAL_HISTORY: UnifiedTelemetryPayload[] = Array.from({ length: 30 }, (_, i) => {
  const cycle = i + 1;
  const timeOffset = (30 - i) * 60000;
  const ts = new Date(Date.now() - timeOffset).toISOString();

  // Realistic operational flight envelope variance for regression & prognostic analysis
  const seed = i / 29;
  const rpm = Math.round(2360 + seed * 220 + Math.sin(i * 1.5) * 15);
  const cht_c = Math.round((138.0 + seed * 7.5 + Math.cos(i * 1.3) * 1.0) * 10) / 10;
  const fuel_flow_lh = Math.round((16.5 + seed * 2.2 + Math.sin(i * 1.4) * 0.2) * 10) / 10;
  const egt_c = Math.round((598.0 + seed * 32.0 + Math.cos(i * 1.2) * 3.5) * 10) / 10;
  const oil_temperature_c = Math.round((88.0 + seed * 9.5 + Math.sin(i * 1.1) * 0.8) * 10) / 10;
  const oil_pressure_psi = Math.round((71.5 - seed * 6.5 + Math.cos(i * 1.4) * 0.9) * 10) / 10;
  const oil_pressure_bar = Math.round((oil_pressure_psi / 14.5038) * 100) / 100;
  const vibration_g = Math.round((1.32 + seed * 0.24 + Math.cos(i * 2.0) * 0.03) * 100) / 100;

  const cycleSensors = {
    ...DEFAULT_PAYLOAD.sensors,
    rpm: { ...DEFAULT_PAYLOAD.sensors.rpm, value: rpm },
    cht: { ...DEFAULT_PAYLOAD.sensors.cht, value: cht_c },
    egt: { ...DEFAULT_PAYLOAD.sensors.egt, value: egt_c },
    oil_pressure: { ...DEFAULT_PAYLOAD.sensors.oil_pressure, value: oil_pressure_psi },
    oil_temperature: { ...DEFAULT_PAYLOAD.sensors.oil_temperature, value: oil_temperature_c },
    fuel_flow: { ...DEFAULT_PAYLOAD.sensors.fuel_flow, value: fuel_flow_lh },
    vibration: { ...DEFAULT_PAYLOAD.sensors.vibration, value: vibration_g },
  };

  return {
    ...DEFAULT_PAYLOAD,
    cycle,
    timestamp: ts,
    rpm,
    cht_c,
    egt_c,
    oil_pressure_bar,
    oil_temperature_c,
    fuel_flow_lh,
    vibration_g,
    sensors: cycleSensors,
    sensor_list: Object.values(cycleSensors),
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
    // In autonomous standalone simulation mode, maintain active simulated live stream
    linkState = "live";
  }

  // Autonomous 1-second simulation ticker when not connected to real backend
  useEffect(() => {
    if (isConnected) return;

    const interval = setInterval(() => {
      setPayload((prev) => {
        const nextTime = new Date();
        const jitter = (Math.random() - 0.5) * 0.4;

        // Count down RUL remaining time
        let remStr = prev.prognostics?.remaining_time_str || "01:57:32";
        const parts = remStr.split(":").map(Number);
        if (parts.length === 3) {
          let totalSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
          if (totalSec > 0) totalSec -= 1;
          const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
          const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
          const s = String(totalSec % 60).padStart(2, "0");
          remStr = `${h}:${m}:${s}`;
        }

        const nextRpm = Math.round((prev.rpm ?? 2450) + (Math.random() - 0.5) * 4);
        const nextCht = Math.round(((prev.cht_c ?? 142) + jitter * 0.2) * 10) / 10;
        const nextEgt = Math.round(((prev.egt_c ?? 615) + jitter * 0.5) * 10) / 10;
        const nextOilBar = Math.round(((prev.oil_pressure_bar ?? 4.69) + jitter * 0.01) * 100) / 100;
        const nextOilT = Math.round(((prev.oil_temperature_c ?? 92) + jitter * 0.08) * 10) / 10;
        const nextFuel = Math.round(((prev.fuel_flow_lh ?? 17.6) + jitter * 0.05) * 10) / 10;
        const nextVib = Math.round(((prev.vibration_g ?? 1.42) + jitter * 0.02) * 100) / 100;

        // Synchronize updated sensor_list and sensors so all dashboard components see live variations
        const nextSensorList = (prev.sensor_list || []).map((s) => {
          let val = s.value;
          if (s.key === "rpm") val = nextRpm;
          else if (s.key === "cht") val = nextCht;
          else if (s.key === "egt") val = nextEgt;
          else if (s.key === "oil_pressure") val = Math.round(nextOilBar * 14.5038 * 10) / 10;
          else if (s.key === "oil_temperature") val = nextOilT;
          else if (s.key === "fuel_flow") val = nextFuel;
          else if (s.key === "vibration") val = nextVib;
          return { ...s, value: val };
        });
        const nextSensors = Object.fromEntries(nextSensorList.map((s) => [s.key, s]));

        const updated: UnifiedTelemetryPayload = {
          ...prev,
          cycle: (prev.cycle ?? 31) + 1,
          timestamp: nextTime.toISOString(),
          rpm: nextRpm,
          cht_c: nextCht,
          egt_c: nextEgt,
          oil_pressure_bar: nextOilBar,
          oil_temperature_c: nextOilT,
          fuel_flow_lh: nextFuel,
          vibration_g: nextVib,
          sensor_list: nextSensorList,
          sensors: nextSensors,
          prognostics: {
            ...prev.prognostics,
            remaining_time_str: remStr,
          },
        };
        const reconciled = reconcilePayload(updated);

        setHistoryBuffer((prevHist) => {
          const nextHist = [...prevHist, reconciled];
          return nextHist.length > 120 ? nextHist.slice(nextHist.length - 120) : nextHist;
        });

        return reconciled;
      });
      setLastUpdateAt(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected]);

  // Inject Scenario handler with full realistic client-side simulation dispatch
  const injectScenario = useCallback((scenarioId: string) => {
    const normalized = normalizeScenarioId(scenarioId);
    setActiveScenario(normalized);

    // Apply immediate client-side simulation payload so UI reacts instantly
    setPayload((prev) => {
      const now = new Date();
      let overrides: Partial<UnifiedTelemetryPayload> = {};

      switch (normalized) {
        case "Overheating":
          overrides = {
            health_index: 68,
            anomaly_score: 0.884,
            evidence: "Cylinder #3 CHT at 178.4°C exceeded 165°C limit; EGT elevated to 695°C.",
            sensor_diagnosis: {
              diagnosis_type: "ISOLATED (THERMAL SPIKE)",
              engine_fault_confidence: 0.96,
              evidence: "Cylinder #3 CHT at 178.4°C exceeded 165°C limit; EGT elevated to 695°C.",
              top_fault_attribution: "Cylinder Head #3 & Cooling Radiator",
            },
            risk: {
              level: "HIGH",
              anomaly: "ALERT",
              action: "Thermal Redline Excursion - Enrich Fuel Mixture",
              status_label: "THERMAL OVERHEAT",
              guidance: "Trim cruise throttle to 65%, descent to cooler ambient air layer.",
            },
            rpm: 2410,
            cht_c: 178.4,
            egt_c: 695.0,
            oil_pressure_bar: 4.45,
            oil_temperature_c: 99.5,
            fuel_flow_lh: 18.2,
            vibration_g: 1.55,
            alerts: [
              {
                id: `alt-ovh-1-${now.getTime()}`,
                level: "ALERT",
                title: "CYLINDER HEAD TEMPERATURE OVERHEAT (CYL #3)",
                message: "Cylinder #3 CHT exceeded maximum continuous redline threshold of 165°C.",
                component: "Cylinder Head #3 & Water Jacket",
                evidence: "CHT #3: 178.4°C (> 165.0°C Warning limit) | Thermal Gradient: +1.2°C/s",
                recommended_action: "Enrich fuel-air mixture, trim throttle to 65%, initiate cooling shallow descent.",
                time_ago: "Just now",
                timestamp: now.toISOString(),
              },
              {
                id: `alt-ovh-2-${now.getTime()}`,
                level: "CAUTION",
                title: "EXHAUST GAS TEMPERATURE SPREAD SPIKE",
                message: "EGT cylinder differential spread exceeds maximum 45°C tolerance.",
                component: "Exhaust Header Collector",
                evidence: "EGT: 695.0°C (> 680.0°C Caution limit) | Differential: +48°C",
                recommended_action: "Inspect fuel delivery manifold and check turbo wastegate actuator line.",
                time_ago: "1 min ago",
                timestamp: new Date(now.getTime() - 60000).toISOString(),
              },
            ],
            prognostics: {
              ...prev.prognostics,
              predicted_rul: 42.6,
              degradation_trend: "Accelerating",
            },
          };
          break;

        case "Lubrication":
          overrides = {
            health_index: 48,
            anomaly_score: 0.942,
            evidence: "Oil galley pressure collapsed to 1.82 bar (26.4 psi); oil temperature elevated to 106.8°C.",
            sensor_diagnosis: {
              diagnosis_type: "ISOLATED (PRESSURE DECAY)",
              engine_fault_confidence: 0.98,
              evidence: "Oil galley pressure collapsed to 1.82 bar (26.4 psi); oil temperature elevated to 106.8°C.",
              top_fault_attribution: "Oil Galley & Scavenge Pump",
            },
            risk: {
              level: "CRITICAL",
              anomaly: "ALERT",
              action: "Oil Galley Pressure Collapse - Throttle Back",
              status_label: "CRITICAL LUBRICATION",
              guidance: "Immediate throttle reduction to minimize hydrodynamic bearing wear. Prepare for priority diversion.",
            },
            rpm: 2390,
            cht_c: 146.2,
            egt_c: 618.0,
            oil_pressure_bar: 1.82,
            oil_temperature_c: 106.8,
            fuel_flow_lh: 17.4,
            vibration_g: 1.68,
            alerts: [
              {
                id: `alt-lub-1-${now.getTime()}`,
                level: "ALERT",
                title: "OIL GALLEY PRESSURE COLLAPSE DETECTED",
                message: "Hydrodynamic bearing lubrication film compromised by decaying main oil line pressure.",
                component: "Oil Galley & Scavenge Pump",
                evidence: "Oil Pressure: 1.82 bar (< 2.00 bar Caution / 1.50 bar Redline) | Decay: -0.18 bar/min",
                recommended_action: "Reduce throttle to minimum sustain power (55%); prepare immediate diversion to nearest airfield.",
                time_ago: "Just now",
                timestamp: now.toISOString(),
              },
              {
                id: `alt-lub-2-${now.getTime()}`,
                level: "CAUTION",
                title: "OIL RADIATOR THERMAL ELEVATION",
                message: "Oil sump temperature approaching maximum continuous operating limit.",
                component: "Oil Cooler Matrix",
                evidence: "Oil Temp: 106.8°C (> 105.0°C Caution limit) | Radiator Delta: -4.2°C",
                recommended_action: "Verify ram-air scoop intake; maintain forward airspeed for cooler airflow.",
                time_ago: "2 min ago",
                timestamp: new Date(now.getTime() - 120000).toISOString(),
              },
            ],
            prognostics: {
              ...prev.prognostics,
              predicted_rul: 28.5,
              degradation_trend: "Accelerating",
            },
          };
          break;

        case "Vibration_Fault":
          overrides = {
            health_index: 62,
            anomaly_score: 0.815,
            evidence: "Crankcase accelerometer detected persistent 1X harmonic resonance spike at 2.45g RMS.",
            sensor_diagnosis: {
              diagnosis_type: "ISOLATED (HARMONIC SPIKE)",
              engine_fault_confidence: 0.95,
              evidence: "Crankcase accelerometer detected persistent 1X harmonic resonance spike at 2.45g RMS.",
              top_fault_attribution: "Crankcase & Dynafocal Mounts",
            },
            risk: {
              level: "HIGH",
              anomaly: "ALERT",
              action: "Bearing Harmonic Resonance - Evade RPM Band",
              status_label: "EXCESSIVE VIBRATION",
              guidance: "Trim RPM out of resonance band; schedule borescope and spectrometry inspection upon landing.",
            },
            rpm: 2450,
            cht_c: 144.0,
            egt_c: 620.0,
            oil_pressure_bar: 4.58,
            oil_temperature_c: 94.0,
            fuel_flow_lh: 17.6,
            vibration_g: 2.45,
            alerts: [
              {
                id: `alt-vib-1-${now.getTime()}`,
                level: "ALERT",
                title: "CRANKSHAFT BEARING HARMONIC VIBRATION SPIKE",
                message: "Crankcase accelerometer detected persistent 1X harmonic resonance spike exceeding structural limits.",
                component: "Crankshaft & Main Bearings",
                evidence: "Vibration: 2.45g RMS (> 2.00g Warning limit) | 1X Harmonic Spike at 40.8 Hz",
                recommended_action: "Throttle back out of critical harmonic resonance band (2,300–2,450 RPM); schedule engine mount and spectrometry inspection.",
                time_ago: "Just now",
                timestamp: now.toISOString(),
              },
            ],
            prognostics: {
              ...prev.prognostics,
              predicted_rul: 56.0,
              degradation_trend: "Decreasing",
            },
          };
          break;

        case "Injector_Degradation":
          overrides = {
            health_index: 75,
            anomaly_score: 0.680,
            evidence: "Fuel delivery restricted to 14.2 L/h (< 15.0 L/h); cylinder #2 running lean-biased.",
            sensor_diagnosis: {
              diagnosis_type: "ISOLATED (LEAN EXCURSION)",
              engine_fault_confidence: 0.92,
              evidence: "Fuel delivery restricted to 14.2 L/h (< 15.0 L/h); cylinder #2 running lean-biased.",
              top_fault_attribution: "Fuel Rail & Solenoid Injectors",
            },
            risk: {
              level: "MEDIUM",
              anomaly: "CAUTION",
              action: "Fuel Flow Lean Excursion - Switch Boost Pump",
              status_label: "INJECTOR BIAS",
              guidance: "Switch to secondary fuel pump channel; inspect fuel manifold differential pressure.",
            },
            rpm: 2420,
            cht_c: 148.0,
            egt_c: 665.0,
            oil_pressure_bar: 4.65,
            oil_temperature_c: 93.0,
            fuel_flow_lh: 14.2,
            vibration_g: 1.58,
            alerts: [
              {
                id: `alt-inj-1-${now.getTime()}`,
                level: "CAUTION",
                title: "CYLINDER 2 FUEL INJECTOR RESTRICTION",
                message: "Lean mixture excursion detected on cylinder 2 injector nozzle.",
                component: "Fuel Rail & Solenoid Injectors",
                evidence: "Fuel Flow: 14.2 L/h (< 15.0 L/h Envelope) | Cylinder #2 EGT: +42°C bias",
                recommended_action: "Switch to secondary boost pump channel; inspect fuel filter differential pressure.",
                time_ago: "Just now",
                timestamp: now.toISOString(),
              },
            ],
            prognostics: {
              ...prev.prognostics,
              predicted_rul: 78.4,
              degradation_trend: "Decreasing",
            },
          };
          break;

        case "Misfire":
          overrides = {
            health_index: 58,
            anomaly_score: 0.790,
            evidence: "RPM drop of 170 RPM with combustion roughness 0.82; intermittent spark failure on Cylinder 1.",
            sensor_diagnosis: {
              diagnosis_type: "ISOLATED (COMBUSTION RIPPLE)",
              engine_fault_confidence: 0.94,
              evidence: "RPM drop of 170 RPM with combustion roughness 0.82; intermittent spark failure on Cylinder 1.",
              top_fault_attribution: "Dual Magneto & Ignition Harness",
            },
            risk: {
              level: "HIGH",
              anomaly: "ALERT",
              action: "Cylinder Misfire - Switch Magnetos",
              status_label: "IGNITION FAULT",
              guidance: "Test individual magneto circuits; run lean-of-peak 2-minute cleaning cycle.",
            },
            rpm: 2280,
            cht_c: 138.0,
            egt_c: 560.0,
            oil_pressure_bar: 4.52,
            oil_temperature_c: 91.0,
            fuel_flow_lh: 16.2,
            vibration_g: 2.15,
            alerts: [
              {
                id: `alt-mis-1-${now.getTime()}`,
                level: "ALERT",
                title: "CYLINDER 1 INTERMITTENT IGNITION MISFIRE",
                message: "Incomplete combustion stroke detected on Cylinder 1; torque ripple observed.",
                component: "Dual Magneto & Ignition Harness",
                evidence: "RPM drop: -170 RPM | Combustion Roughness: 0.82 (> 0.50 limit) | EGT fluctuation ±35°C",
                recommended_action: "Verify dual magneto switch position; run lean-of-peak 2-minute cleaning cycle.",
                time_ago: "Just now",
                timestamp: now.toISOString(),
              },
            ],
            prognostics: {
              ...prev.prognostics,
              predicted_rul: 49.0,
              degradation_trend: "Accelerating",
            },
          };
          break;

        case "Sensor_Drift":
          overrides = {
            health_index: 82,
            anomaly_score: 0.440,
            evidence: "Thermocouple readout diverging from physics-based digital twin thermal model (Z-score 3.42).",
            sensor_diagnosis: {
              diagnosis_type: "ISOLATED (ANALYTICAL DRIFT)",
              engine_fault_confidence: 0.89,
              evidence: "Thermocouple readout diverging from physics-based digital twin thermal model (Z-score 3.42).",
              top_fault_attribution: "CHT Thermocouple Harness",
            },
            risk: {
              level: "LOW",
              anomaly: "CAUTION",
              action: "Sensor Divergence - Cross-Check Channels",
              status_label: "ANALYTICAL DRIFT",
              guidance: "Cross-check with redundant cylinder 4 thermocouple; isolate transducer.",
            },
            rpm: 2450,
            cht_c: 162.0,
            egt_c: 615.0,
            oil_pressure_bar: 4.69,
            oil_temperature_c: 92.0,
            fuel_flow_lh: 17.6,
            vibration_g: 1.42,
            alerts: [
              {
                id: `alt-drf-1-${now.getTime()}`,
                level: "CAUTION",
                title: "CHT SENSOR 3 ANALYTICAL DIVERGENCE (DRIFT)",
                message: "Thermocouple readout diverging from physics-based digital twin thermal model.",
                component: "CHT Thermocouple Harness",
                evidence: "CHT Sensor Variance: Z-score 3.42 against digital twin model prediction",
                recommended_action: "Cross-check with redundant cylinder 4 thermocouple; isolate transducer.",
                time_ago: "Just now",
                timestamp: now.toISOString(),
              },
            ],
            prognostics: {
              ...prev.prognostics,
              predicted_rul: 94.0,
              degradation_trend: "Stable",
            },
          };
          break;

        case "Sensor_Fault_Temp":
          overrides = {
            health_index: 84,
            anomaly_score: 0.520,
            evidence: "Erratic temperature step-gradient > 25°C/s detected without matching EGT change.",
            sensor_diagnosis: {
              diagnosis_type: "ISOLATED (STEP TRANSIENT)",
              engine_fault_confidence: 0.93,
              evidence: "Erratic temperature step-gradient > 25°C/s detected without matching EGT change.",
              top_fault_attribution: "Avionics DAU / CHT Probe",
            },
            risk: {
              level: "LOW",
              anomaly: "CAUTION",
              action: "Sensor Transient Spike - Engage Voting",
              status_label: "TRANSDUCER BIAS",
              guidance: "Engage software sensor voting logic; flag sensor channel as unserviceable.",
            },
            rpm: 2450,
            cht_c: 175.0,
            egt_c: 615.0,
            oil_pressure_bar: 4.69,
            oil_temperature_c: 92.0,
            fuel_flow_lh: 17.6,
            vibration_g: 1.42,
            alerts: [
              {
                id: `alt-sft-1-${now.getTime()}`,
                level: "CAUTION",
                title: "ISOLATED THERMOCOUPLE BIAS FAULT",
                message: "Erratic temperature readings with physically impossible step-response gradient.",
                component: "Avionics DAU / CHT Probe",
                evidence: "CHT Gradient: > 25°C/s instantaneous step | Engine block thermal inertia intact",
                recommended_action: "Engage software sensor voting logic; flag sensor channel as unserviceable.",
                time_ago: "Just now",
                timestamp: now.toISOString(),
              },
            ],
            prognostics: {
              ...prev.prognostics,
              predicted_rul: 98.0,
              degradation_trend: "Stable",
            },
          };
          break;

        case "Engine_Failure_Multi":
          overrides = {
            health_index: 24,
            anomaly_score: 0.985,
            evidence: "Correlated multi-sensor breakdown across thermal, hydraulic, and mechanical systems.",
            sensor_diagnosis: {
              diagnosis_type: "COMPOUND SYSTEM FAILURE",
              engine_fault_confidence: 0.99,
              evidence: "Correlated multi-sensor breakdown across thermal, hydraulic, and mechanical systems.",
              top_fault_attribution: "Core Propulsion Bay",
            },
            risk: {
              level: "CRITICAL",
              anomaly: "ALERT",
              action: "Emergency Descent & Forced Landing Procedure",
              status_label: "CRITICAL MULTI-SYSTEM",
              guidance: "Initiate emergency power-off glide checklist; declare PAN-PAN / MAYDAY to air traffic control.",
            },
            rpm: 2150,
            cht_c: 176.5,
            egt_c: 705.0,
            oil_pressure_bar: 1.65,
            oil_temperature_c: 112.0,
            fuel_flow_lh: 21.5,
            vibration_g: 2.48,
            alerts: [
              {
                id: `alt-efm-1-${now.getTime()}`,
                level: "CRITICAL",
                title: "MULTIPLE SUBSYSTEM COMPOUND DEGRADATION",
                message: "Correlated multi-sensor breakdown across thermal, hydraulic, and mechanical systems.",
                component: "Core Propulsion Bay",
                evidence: "Oil Press: 1.65 bar | CHT: 176.5°C | Vibration: 2.48g RMS | RUL decayed to 8.2 cycles",
                recommended_action: "Initiate emergency power-off glide checklist; declare PAN-PAN / MAYDAY to air traffic control.",
                time_ago: "Just now",
                timestamp: now.toISOString(),
              },
              {
                id: `alt-efm-2-${now.getTime()}`,
                level: "ALERT",
                title: "OIL PRESSURE COLLAPSE DETECTED",
                message: "Severe loss of lubrication oil line pressure.",
                component: "Oil Galley & Scavenge Pump",
                evidence: "Oil Pressure: 1.65 bar (< 1.50 bar Redline approach)",
                recommended_action: "Execute immediate forced-landing checklist.",
                time_ago: "Just now",
                timestamp: now.toISOString(),
              },
            ],
            prognostics: {
              ...prev.prognostics,
              predicted_rul: 8.2,
              degradation_trend: "Accelerating",
            },
          };
          break;

        case "Normal":
        default:
          overrides = {
            health_index: 96,
            anomaly_score: 0.028,
            evidence: "Cross-sensor telemetry correlates nominally with calibrated baseline bounds.",
            sensor_diagnosis: {
              diagnosis_type: "NOMINAL",
              engine_fault_confidence: 0.98,
              evidence: "Cross-sensor telemetry correlates nominally with calibrated baseline bounds.",
              top_fault_attribution: "All Subsystems Nominal",
            },
            risk: {
              level: "LOW",
              anomaly: "NORMAL",
              action: "Nominal Cruise Profile - All Systems Normal",
              status_label: "SYSTEMS OPTIMAL",
              guidance: "Continuous telemetry baseline nominal. No flight plan deviation required.",
            },
            rpm: 2450,
            cht_c: 142.0,
            egt_c: 615.0,
            oil_pressure_bar: 4.69,
            oil_temperature_c: 92.0,
            fuel_flow_lh: 17.6,
            vibration_g: 1.42,
            alerts: [],
            prognostics: {
              ...prev.prognostics,
              predicted_rul: 117.4,
              degradation_trend: "Stable",
            },
          };
          break;
      }

      // Also update sensor_list entries with corresponding numeric overrides
      const updatedSensorList = prev.sensor_list.map((s) => {
        let val = s.value;
        if (s.key === "rpm" && overrides.rpm !== undefined) val = overrides.rpm;
        if (s.key === "cht" && overrides.cht_c !== undefined) val = overrides.cht_c;
        if (s.key === "egt" && overrides.egt_c !== undefined) val = overrides.egt_c;
        if (s.key === "oil_pressure" && overrides.oil_pressure_bar !== undefined) val = Math.round(overrides.oil_pressure_bar * 14.5038 * 10) / 10;
        if (s.key === "oil_temperature" && overrides.oil_temperature_c !== undefined) val = overrides.oil_temperature_c;
        if (s.key === "fuel_flow" && overrides.fuel_flow_lh !== undefined) val = overrides.fuel_flow_lh;
        if (s.key === "vibration" && overrides.vibration_g !== undefined) val = overrides.vibration_g;
        return { ...s, value: val };
      });

      const updatedPayload: UnifiedTelemetryPayload = {
        ...prev,
        ...overrides,
        scenario: normalized,
        fault_label: normalized,
        timestamp: now.toISOString(),
        sensor_list: updatedSensorList,
        sensors: Object.fromEntries(updatedSensorList.map((s) => [s.key, s])),
      };

      return reconcilePayload(updatedPayload);
    });

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
