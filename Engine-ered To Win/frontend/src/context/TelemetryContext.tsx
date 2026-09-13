"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import {
  UnifiedTelemetryPayload,
  DigitalTwinPayload,
  DigitalTwinResidualItem,
  DigitalTwinSubsystemHealth,
  FaultDiagnosisPayload,
  EnvironmentPayload,
  PrognosticsData,
  MissionReplayState,
  MissionRecordingState,
  MissionListItem,
  SensorItem,
} from "@/types/telemetry";

export type ConnectionState = "CONNECTED" | "CONNECTING" | "DISCONNECTED" | "RECONNECTING";

export interface FlatTelemetryChannels {
  rpm: number;
  cht_c: number;
  egt_c: number;
  oil_pressure_bar: number;
  oil_temperature_c: number;
  fuel_flow_lh: number;
  vibration_g: number;
  battery_voltage_v: number;
  injection_timing_deg: number;
}

export interface TelemetryContextType {
  payload: UnifiedTelemetryPayload;
  isConnected: boolean;
  connectionStatus: ConnectionState;
  activeScenario: string;
  mode: "LIVE" | "REPLAY";
  
  // Directly accessible telemetry slices
  telemetry: FlatTelemetryChannels;
  expectedState: Record<string, number> | null;
  residuals: Record<string, DigitalTwinResidualItem> | null;
  healthIndex: number;
  subsystemHealth: DigitalTwinSubsystemHealth | null;
  degradation: Record<string, number> | null;
  faultDiagnosis: FaultDiagnosisPayload | null;
  environment: EnvironmentPayload | null;
  recording: MissionRecordingState | null;
  replay: MissionReplayState | null;
  prognostics: PrognosticsData | null;
  sensorList: SensorItem[];

  // Action Dispatchers
  injectScenario: (scenario: string) => Promise<void>;
  setEnvironment: (env: {
    altitude_ft?: number;
    ambient_temp_c?: number;
    throttle_pct?: number;
  }) => Promise<void>;
  setMissionProfile: (profile: string) => Promise<void>;
  setSimulationSpeed: (speed: number) => Promise<void>;
  startMission: (options?: { mission_name?: string; notes?: string }) => Promise<any>;
  stopMission: () => Promise<any>;
  fetchMissions: () => Promise<MissionListItem[]>;
  startReplay: (missionId: string, speed?: number) => Promise<any>;
  pauseReplay: () => Promise<any>;
  resumeReplay: () => Promise<any>;
  stopReplay: () => Promise<any>;
  seekReplay: (sampleIndex: number) => Promise<any>;
  setReplaySpeed: (speed: number) => Promise<any>;
}

const DEFAULT_SENSORS: SensorItem[] = [
  { key: "rpm", name: "RPM", value: 2450, unit: "RPM", min: 0, max: 3200, status: "NORMAL", trend: "STABLE", progressPct: 76.5 },
  { key: "cht", name: "CHT", value: 142.0, unit: "°C", min: 50, max: 240, status: "NORMAL", trend: "STABLE", progressPct: 48.4 },
  { key: "egt", name: "EGT", value: 615.0, unit: "°C", min: 250, max: 950, status: "NORMAL", trend: "STABLE", progressPct: 52.1 },
  { key: "oil_pressure", name: "Oil Pressure", value: 68.0, unit: "psi", min: 0, max: 100, status: "NORMAL", trend: "STABLE", progressPct: 68.0 },
  { key: "oil_temperature", name: "Oil Temperature", value: 92.0, unit: "°C", min: 30, max: 150, status: "NORMAL", trend: "STABLE", progressPct: 51.6 },
  { key: "fuel_flow", name: "Fuel Flow", value: 17.6, unit: "L/hr", min: 0, max: 40, status: "NORMAL", trend: "STABLE", progressPct: 44.0 },
  { key: "vibration", name: "Vibration", value: 1.42, unit: "g", min: 0, max: 4.5, status: "NORMAL", trend: "STABLE", progressPct: 31.5 },
  { key: "bus_voltage", name: "Bus Voltage", value: 27.6, unit: "V", min: 18, max: 34, status: "NORMAL", trend: "STABLE", progressPct: 60.0 },
  { key: "injection_timing", name: "Injection Timing", value: 23.4, unit: "°CA", min: 10, max: 38, status: "NORMAL", trend: "STABLE", progressPct: 47.8 },
];

const DEFAULT_PAYLOAD: UnifiedTelemetryPayload = {
  cycle: 0,
  timestamp: new Date().toISOString(),
  vehicle: {
    vehicle_id: "UAV_ENG_001",
    mission_id: "ISR_PATROL_27",
    altitude: 15000,
    throttle: 75,
    update_rate: 1,
  },
  sensors: {},
  sensor_list: DEFAULT_SENSORS,
  prognostics: {
    predicted_rul: 120.0,
    actual_rul: 120.0,
    remaining_time_str: "02:00:00",
    current_cycle: 1,
    max_useful_life: 250,
    rul_unclipped: 120.0,
    rul_clipped: 120.0,
    degradation_trend: "Stable",
    confidence: 95.0,
    abs_error: 0.0,
    model_mae: 8.5,
    window_size: 30,
    sensor_count: 9,
  },
  health_index: 98,
  risk: {
    level: "LOW",
    anomaly: "NORMAL",
    action: "Nominal Cruise Profile - All Systems Normal",
  },
  contributing_features: [],
  recent_trends: {
    points: [],
    deltas: {
      egt_delta: 0,
      oil_pressure_delta: 0,
      vibration_delta: 0,
      health_delta: 0,
    },
  },
  trajectory: [],
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

const TelemetryContext = createContext<TelemetryContextType | null>(null);

function getApiBaseUrl(): string {
  let apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!apiUrl) {
    if (typeof window !== "undefined") {
      apiUrl = `${window.location.protocol}//${window.location.hostname}:8000`;
    } else {
      apiUrl = "http://localhost:8000";
    }
  }
  return apiUrl.replace(/\/+$/, "");
}

function getWsUrl(): string {
  let wsHost = process.env.NEXT_PUBLIC_WS_URL;
  if (!wsHost) {
    if (typeof window !== "undefined") {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsHost = `${protocol}//${window.location.hostname}:8000`;
    } else {
      wsHost = "ws://localhost:8000";
    }
  }
  // Strip trailing slash
  wsHost = wsHost.replace(/\/+$/, "");
  // Ensure it points to the telemetry websocket endpoint
  if (!wsHost.endsWith("/ws/telemetry")) {
    wsHost = `${wsHost}/ws/telemetry`;
  }
  return wsHost;
}

export function TelemetryProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<UnifiedTelemetryPayload>(DEFAULT_PAYLOAD);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>("CONNECTING");
  const [activeScenario, setActiveScenario] = useState<string>("Normal");

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasConnectedOnce = useRef<boolean>(false);

  // Connect to Central Telemetry WebSocket
  const connectWebSocket = useCallback(() => {
    if (typeof window === "undefined") return;

    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setConnectionStatus(hasConnectedOnce.current ? "RECONNECTING" : "CONNECTING");
    const wsUrl = getWsUrl();
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      hasConnectedOnce.current = true;
      setIsConnected(true);
      setConnectionStatus("CONNECTED");
    };

    ws.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        if (raw && (raw.sensor_list || raw.sensors || raw.health_index !== undefined)) {
          setPayload((prev) => ({
            ...prev,
            ...raw,
          }));
          if (raw.scenario) {
            setActiveScenario(raw.scenario);
          }
        }
      } catch (err) {
        console.error("[TelemetryContext] Frame parsing error:", err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setConnectionStatus(hasConnectedOnce.current ? "RECONNECTING" : "DISCONNECTED");
      wsRef.current = null;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 2000);
    };

    ws.onerror = () => {
      setIsConnected(false);
      setConnectionStatus(hasConnectedOnce.current ? "RECONNECTING" : "DISCONNECTED");
    };
  }, []);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectWebSocket]);

  // Command dispatchers
  const sendWsMessage = useCallback((msg: Record<string, any>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(msg));
        return true;
      } catch (e) {
        console.warn("[TelemetryContext] WS send error:", e);
      }
    }
    return false;
  }, []);

  const injectScenario = useCallback(
    async (scenario: string) => {
      setActiveScenario(scenario);
      sendWsMessage({ scenario });
      try {
        const baseUrl = getApiBaseUrl();
        await fetch(`${baseUrl}/api/scenario`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenario }),
        });
      } catch (e) {
        console.warn("[TelemetryContext] HTTP scenario injection fallback failed:", e);
      }
    },
    [sendWsMessage]
  );

  const setEnvironment = useCallback(
    async (env: { altitude_ft?: number; ambient_temp_c?: number; throttle_pct?: number }) => {
      sendWsMessage({ environment: env });
      try {
        const baseUrl = getApiBaseUrl();
        await fetch(`${baseUrl}/api/environment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(env),
        });
      } catch (e) {
        console.warn("[TelemetryContext] setEnvironment failed:", e);
      }
    },
    [sendWsMessage]
  );

  const setMissionProfile = useCallback(
    async (profile: string) => {
      sendWsMessage({ mission_profile: profile });
      try {
        const baseUrl = getApiBaseUrl();
        await fetch(`${baseUrl}/api/mission`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile }),
        });
      } catch (e) {
        console.warn("[TelemetryContext] setMissionProfile failed:", e);
      }
    },
    [sendWsMessage]
  );

  const setSimulationSpeed = useCallback(
    async (speed: number) => {
      sendWsMessage({ simulation_speed: speed });
      try {
        const baseUrl = getApiBaseUrl();
        await fetch(`${baseUrl}/api/endurance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ simulation_speed: speed }),
        });
      } catch (e) {
        console.warn("[TelemetryContext] setSimulationSpeed failed:", e);
      }
    },
    [sendWsMessage]
  );

  const startMission = useCallback(
    async (options?: { mission_name?: string; notes?: string }) => {
      sendWsMessage({
        action: "start_mission",
        mission_name: options?.mission_name || "Mission",
        notes: options?.notes || "",
      });
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/missions/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mission_name: options?.mission_name || "MALE UAV Surveillance Sortie",
            notes: options?.notes || "Live mission recording",
          }),
        });
        return await res.json();
      } catch (e) {
        console.warn("[TelemetryContext] startMission failed:", e);
        return null;
      }
    },
    [sendWsMessage]
  );

  const stopMission = useCallback(async () => {
    sendWsMessage({ action: "stop_mission" });
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/missions/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      return await res.json();
    } catch (e) {
      console.warn("[TelemetryContext] stopMission failed:", e);
      return null;
    }
  }, [sendWsMessage]);

  const fetchMissions = useCallback(async (): Promise<MissionListItem[]> => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/missions`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.missions) ? data.missions : [];
    } catch (e) {
      console.warn("[TelemetryContext] fetchMissions failed:", e);
      return [];
    }
  }, []);

  const startReplay = useCallback(
    async (missionId: string, speed: number = 1.0) => {
      sendWsMessage({ action: "start_replay", mission_id: missionId, speed });
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/missions/${encodeURIComponent(missionId)}/replay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ speed }),
        });
        return await res.json();
      } catch (e) {
        console.warn("[TelemetryContext] startReplay failed:", e);
        return null;
      }
    },
    [sendWsMessage]
  );

  const pauseReplay = useCallback(async () => {
    sendWsMessage({ action: "pause_replay" });
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/missions/replay/pause`, { method: "POST" });
      return await res.json();
    } catch (e) {
      console.warn("[TelemetryContext] pauseReplay failed:", e);
      return null;
    }
  }, [sendWsMessage]);

  const resumeReplay = useCallback(async () => {
    sendWsMessage({ action: "resume_replay" });
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/missions/replay/resume`, { method: "POST" });
      return await res.json();
    } catch (e) {
      console.warn("[TelemetryContext] resumeReplay failed:", e);
      return null;
    }
  }, [sendWsMessage]);

  const stopReplay = useCallback(async () => {
    sendWsMessage({ action: "stop_replay" });
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/missions/replay/stop`, { method: "POST" });
      return await res.json();
    } catch (e) {
      console.warn("[TelemetryContext] stopReplay failed:", e);
      return null;
    }
  }, [sendWsMessage]);

  const seekReplay = useCallback(
    async (sampleIndex: number) => {
      sendWsMessage({ action: "seek_replay", index: sampleIndex });
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/missions/replay/seek`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ index: sampleIndex }),
        });
        return await res.json();
      } catch (e) {
        console.warn("[TelemetryContext] seekReplay failed:", e);
        return null;
      }
    },
    [sendWsMessage]
  );

  const setReplaySpeed = useCallback(
    async (speed: number) => {
      sendWsMessage({ action: "speed_replay", speed });
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/missions/replay/speed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ speed }),
        });
        return await res.json();
      } catch (e) {
        console.warn("[TelemetryContext] setReplaySpeed failed:", e);
        return null;
      }
    },
    [sendWsMessage]
  );

  // Derived telemetry slices with robust fallback extraction
  const telemetry = useMemo<FlatTelemetryChannels>(() => {
    const sensors = payload.sensors || {};
    const rpmVal = sensors.rpm?.value ?? payload.rpm ?? 2450;
    const chtVal = sensors.cht?.value ?? payload.cht_c ?? 142.0;
    const egtVal = sensors.egt?.value ?? payload.egt_c ?? 615.0;
    const oilPVal = sensors.oil_pressure?.value
      ? sensors.oil_pressure.value / 14.5038
      : (payload.oil_pressure_bar ?? 4.69);
    const oilTVal = sensors.oil_temperature?.value ?? payload.oil_temperature_c ?? 92.0;
    const fuelVal = sensors.fuel_flow?.value ?? payload.fuel_flow_lh ?? 17.6;
    const vibVal = sensors.vibration?.value ?? payload.vibration_g ?? 1.42;
    const voltVal = sensors.bus_voltage?.value ?? payload.battery_voltage_v ?? 27.6;
    const timingVal = sensors.injection_timing?.value ?? payload.injection_timing_deg ?? 23.4;

    return {
      rpm: roundVal(rpmVal, 1),
      cht_c: roundVal(chtVal, 1),
      egt_c: roundVal(egtVal, 1),
      oil_pressure_bar: roundVal(oilPVal, 2),
      oil_temperature_c: roundVal(oilTVal, 1),
      fuel_flow_lh: roundVal(fuelVal, 1),
      vibration_g: roundVal(vibVal, 3),
      battery_voltage_v: roundVal(voltVal, 1),
      injection_timing_deg: roundVal(timingVal, 1),
    };
  }, [payload]);

  const expectedState = payload.digital_twin?.expected || null;
  const residuals = payload.digital_twin?.residuals || null;
  const healthIndex = Math.min(100, Math.max(0, Math.round(payload.health_index ?? 98)));
  const subsystemHealth = payload.digital_twin?.subsystem_health || null;
  const degradation = payload.digital_twin?.degradation || null;
  const faultDiagnosis = payload.diagnosis || null;
  const environment = payload.environment || null;
  const recording = payload.recording || null;
  const replay = payload.replay || null;
  const prognostics = payload.prognostics || null;
  const sensorList = payload.sensor_list || DEFAULT_SENSORS;
  const mode: "LIVE" | "REPLAY" = payload.mode || (payload.replay?.is_active ? "REPLAY" : "LIVE");

  const value = useMemo<TelemetryContextType>(
    () => ({
      payload,
      isConnected,
      connectionStatus,
      activeScenario,
      mode,
      telemetry,
      expectedState,
      residuals,
      healthIndex,
      subsystemHealth,
      degradation,
      faultDiagnosis,
      environment,
      recording,
      replay,
      prognostics,
      sensorList,
      injectScenario,
      setEnvironment,
      setMissionProfile,
      setSimulationSpeed,
      startMission,
      stopMission,
      fetchMissions,
      startReplay,
      pauseReplay,
      resumeReplay,
      stopReplay,
      seekReplay,
      setReplaySpeed,
    }),
    [
      payload,
      isConnected,
      connectionStatus,
      activeScenario,
      mode,
      telemetry,
      expectedState,
      residuals,
      healthIndex,
      subsystemHealth,
      degradation,
      faultDiagnosis,
      environment,
      recording,
      replay,
      prognostics,
      sensorList,
      injectScenario,
      setEnvironment,
      setMissionProfile,
      setSimulationSpeed,
      startMission,
      stopMission,
      fetchMissions,
      startReplay,
      pauseReplay,
      resumeReplay,
      stopReplay,
      seekReplay,
      setReplaySpeed,
    ]
  );

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}

export function useTelemetry(): TelemetryContextType {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error("useTelemetry must be used within a <TelemetryProvider>");
  }
  return context;
}

function roundVal(num: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}
