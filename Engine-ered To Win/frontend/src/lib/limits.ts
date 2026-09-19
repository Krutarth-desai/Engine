/**
 * lib/limits.ts
 * Single source of truth for engine limits, caution/warning zones,
 * RUL zones, and status colors across AeroTwin GCS.
 */

export type SensorKey =
  | "rpm"
  | "cht"
  | "egt"
  | "oil_pressure"
  | "oil_temperature"
  | "fuel_flow"
  | "vibration"
  | "bus_voltage"
  | "injection_timing";

export type SensorStatus = "NORMAL" | "CAUTION" | "ALERT";
export type AlertSeverity = "Warning" | "Caution" | "Advisory" | "Nominal";

export interface SensorLimitDefinition {
  key: SensorKey;
  name: string;
  shortName: string;
  unit: string;
  min: number;
  max: number;
  nominal: number;
  cautionLow: number;
  cautionHigh: number;
  warningLow: number;
  warningHigh: number;
  step?: number;
  description: string;
  precision: number;
}

export const SENSOR_LIMITS: Record<SensorKey, SensorLimitDefinition> = {
  rpm: {
    key: "rpm",
    name: "Engine RPM",
    shortName: "RPM",
    unit: "RPM",
    min: 0,
    max: 3200,
    nominal: 2450,
    cautionLow: 2100,
    cautionHigh: 2750,
    warningLow: 1800,
    warningHigh: 2950,
    step: 50,
    description: "Rotational engine speed governed at constant-speed propeller hub",
    precision: 0,
  },
  cht: {
    key: "cht",
    name: "Cylinder Head Temp",
    shortName: "CHT",
    unit: "°C",
    min: 50,
    max: 240,
    nominal: 142.0,
    cautionLow: 80,
    cautionHigh: 165, // Maintenance trigger: 165 °C
    warningLow: 60,
    warningHigh: 195,
    step: 1,
    description: "Cylinder head spark-plug thermocouple temperature",
    precision: 1,
  },
  egt: {
    key: "egt",
    name: "Exhaust Gas Temp",
    shortName: "EGT",
    unit: "°C",
    min: 250,
    max: 950,
    nominal: 615.0,
    cautionLow: 450,
    cautionHigh: 680, // Maintenance trigger: 680 °C
    warningLow: 400,
    warningHigh: 760,
    step: 5,
    description: "Exhaust runner turbine entry temperature",
    precision: 1,
  },
  oil_pressure: {
    key: "oil_pressure",
    name: "Oil Pressure",
    shortName: "Oil Press",
    unit: "psi",
    min: 0,
    max: 100,
    nominal: 68.0,
    cautionLow: 50, // Maintenance trigger: low 50 psi
    cautionHigh: 85,
    warningLow: 35,
    warningHigh: 95,
    step: 1,
    description: "Main bearing journal oil galley supply pressure",
    precision: 1,
  },
  oil_temperature: {
    key: "oil_temperature",
    name: "Oil Temperature",
    shortName: "Oil Temp",
    unit: "°C",
    min: 30,
    max: 150,
    nominal: 92.0,
    cautionLow: 60,
    cautionHigh: 108,
    warningLow: 45,
    warningHigh: 125,
    step: 1,
    description: "Oil sump scavenge circuit return temperature",
    precision: 1,
  },
  fuel_flow: {
    key: "fuel_flow",
    name: "Fuel Flow",
    shortName: "Fuel Flow",
    unit: "L/h",
    min: 0,
    max: 40,
    nominal: 17.6,
    cautionLow: 12.0,
    cautionHigh: 24.0,
    warningLow: 9.0,
    warningHigh: 28.0,
    step: 0.5,
    description: "Electronic high-pressure fuel injection delivery mass flow",
    precision: 1,
  },
  vibration: {
    key: "vibration",
    name: "Vibration RMS",
    shortName: "Vibration",
    unit: "g",
    min: 0,
    max: 4.5,
    nominal: 1.42,
    cautionLow: 0.0,
    cautionHigh: 2.0, // Maintenance trigger: high 2.0 g
    warningLow: 0.0,
    warningHigh: 2.9,
    step: 0.1,
    description: "Crankcase accelerometer vibration RMS harmonics",
    precision: 2,
  },
  bus_voltage: {
    key: "bus_voltage",
    name: "Bus Voltage",
    shortName: "Bus Volt",
    unit: "V",
    min: 18,
    max: 34,
    nominal: 27.6,
    cautionLow: 25.0,
    cautionHigh: 29.5,
    warningLow: 23.5,
    warningHigh: 31.0,
    step: 0.2,
    description: "Avionics primary 28V DC generator bus potential",
    precision: 1,
  },
  injection_timing: {
    key: "injection_timing",
    name: "Injection Timing",
    shortName: "Timing",
    unit: "°BTDC",
    min: 10,
    max: 38,
    nominal: 23.4,
    cautionLow: 19.0,
    cautionHigh: 27.5,
    warningLow: 16.0,
    warningHigh: 30.0,
    step: 0.5,
    description: "Crankshaft advance angle Before Top Dead Center",
    precision: 1,
  },
};

// Unified 4-tier RUL Zone Scheme across the entire application
export type RulZoneId = "HEALTHY" | "DEGRADING" | "CRITICAL" | "FAILURE";

export interface RulZone {
  id: RulZoneId;
  label: string;
  minCycles: number;
  maxCycles: number;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

export const RUL_ZONES: Record<RulZoneId, RulZone> = {
  HEALTHY: {
    id: "HEALTHY",
    label: "HEALTHY",
    minCycles: 125,
    maxCycles: 250,
    color: "var(--status-nominal)",
    bgColor: "color-mix(in srgb, var(--status-nominal) 14%, var(--surface-1))",
    borderColor: "var(--border)",
    description: "Nominal operational envelope; full mission capability.",
  },
  DEGRADING: {
    id: "DEGRADING",
    label: "DEGRADING",
    minCycles: 50,
    maxCycles: 125,
    color: "var(--status-caution)",
    bgColor: "color-mix(in srgb, var(--status-caution) 14%, var(--surface-1))",
    borderColor: "var(--status-caution)",
    description: "Moderate wear detected; schedule turnaround inspection.",
  },
  CRITICAL: {
    id: "CRITICAL",
    label: "CRITICAL",
    minCycles: 15,
    maxCycles: 50,
    color: "var(--status-warning)",
    bgColor: "color-mix(in srgb, var(--status-warning) 14%, var(--surface-1))",
    borderColor: "var(--status-warning)",
    description: "Accelerated degradation; prepare to divert or overhaul.",
  },
  FAILURE: {
    id: "FAILURE",
    label: "FAILURE",
    minCycles: 0,
    maxCycles: 15,
    color: "var(--status-warning)",
    bgColor: "color-mix(in srgb, var(--status-warning) 24%, var(--surface-1))",
    borderColor: "var(--status-warning)",
    description: "Imminent mechanical/thermal failure threshold.",
  },
};

/**
 * Maintenance Trigger Protocols (from Maintenance page)
 */
export const MAINTENANCE_PROTOCOLS = [
  {
    id: "thermal",
    name: "Thermal Mitigation",
    tag: "THERMAL MITIGATION",
    triggerDesc: "CHT > 165 °C or EGT > 680 °C",
    actionDesc:
      "Enrich mixture to rich-of-peak and reduce continuous throttle below 70% to prevent detonation.",
    isTriggered: (telemetry: { cht_c?: number; egt_c?: number }) => {
      const cht = telemetry.cht_c ?? 142;
      const egt = telemetry.egt_c ?? 615;
      return cht > 165 || egt > 680;
    },
    getMargin: (telemetry: { cht_c?: number; egt_c?: number }) => {
      const cht = telemetry.cht_c ?? 142;
      const egt = telemetry.egt_c ?? 615;
      const chtMargin = 165 - cht;
      const egtMargin = 680 - egt;
      if (cht > 165) return `CHT ${cht.toFixed(1)} °C exceeds trigger by ${(cht - 165).toFixed(1)} °C`;
      if (egt > 680) return `EGT ${egt.toFixed(1)} °C exceeds trigger by ${(egt - 680).toFixed(1)} °C`;
      return `CHT ${cht.toFixed(1)} °C — ${chtMargin.toFixed(1)} °C below trigger (EGT margin ${egtMargin.toFixed(1)} °C)`;
    },
  },
  {
    id: "lubrication",
    name: "Lubrication Protect",
    tag: "LUBRICATION PROTECT",
    triggerDesc: "Oil pressure < 50 psi",
    actionDesc:
      "Execute immediate level flight recovery and throttle back to cruise idle.",
    isTriggered: (telemetry: { oil_pressure_psi?: number; oil_pressure_bar?: number }) => {
      const psi =
        telemetry.oil_pressure_psi ??
        (telemetry.oil_pressure_bar ? telemetry.oil_pressure_bar * 14.5038 : 68);
      return psi < 50;
    },
    getMargin: (telemetry: { oil_pressure_psi?: number; oil_pressure_bar?: number }) => {
      const psi =
        telemetry.oil_pressure_psi ??
        (telemetry.oil_pressure_bar ? telemetry.oil_pressure_bar * 14.5038 : 68);
      if (psi < 50) return `Oil Pressure ${psi.toFixed(1)} psi is ${(50 - psi).toFixed(1)} psi BELOW trigger!`;
      return `Oil Pressure ${psi.toFixed(1)} psi — ${(psi - 50).toFixed(1)} psi above trigger`;
    },
  },
  {
    id: "vibration",
    name: "Vibration Dampening",
    tag: "VIBRATION DAMPENING",
    triggerDesc: "Vibration > 2.0 g RMS",
    actionDesc:
      "Schedule ground dynamic propeller balancing and bearing inspection within 5 flight hours.",
    isTriggered: (telemetry: { vibration_g?: number }) => {
      const vib = telemetry.vibration_g ?? 1.42;
      return vib > 2.0;
    },
    getMargin: (telemetry: { vibration_g?: number }) => {
      const vib = telemetry.vibration_g ?? 1.42;
      if (vib > 2.0) return `Vibration ${vib.toFixed(2)} g exceeds trigger by ${(vib - 2.0).toFixed(2)} g`;
      return `Vibration ${vib.toFixed(2)} g — ${(2.0 - vib).toFixed(2)} g below trigger`;
    },
  },
];

/**
 * Derives the sensor status (NORMAL | CAUTION | ALERT) strictly from SENSOR_LIMITS.
 */
export function getSensorStatus(key: SensorKey, value: number | null | undefined): SensorStatus {
  if (value === null || value === undefined || isNaN(value)) {
    return "NORMAL";
  }

  const def = SENSOR_LIMITS[key];
  if (!def) return "NORMAL";

  // Alert/Warning conditions
  if (value >= def.warningHigh || value <= def.warningLow) {
    return "ALERT";
  }

  // Caution conditions
  if (value >= def.cautionHigh || value <= def.cautionLow) {
    return "CAUTION";
  }

  return "NORMAL";
}

/**
 * Maps RUL cycles to one of the 4 defined RUL zones.
 */
export function getRulZone(cycles: number | null | undefined): RulZone {
  const c = Math.max(0, cycles ?? 0);
  if (c >= RUL_ZONES.HEALTHY.minCycles) return RUL_ZONES.HEALTHY;
  if (c >= RUL_ZONES.DEGRADING.minCycles) return RUL_ZONES.DEGRADING;
  if (c >= RUL_ZONES.CRITICAL.minCycles) return RUL_ZONES.CRITICAL;
  return RUL_ZONES.FAILURE;
}

/**
 * Standard Status Colors. Red/amber are reserved strictly for deviations; nominal is neutral.
 */
export const STATUS_COLORS = {
  NORMAL: "var(--status-nominal)",
  CAUTION: "var(--status-caution)",
  ALERT: "var(--status-warning)",
  CRITICAL: "var(--status-warning)",
  HIGH: "var(--status-warning)",
  MEDIUM: "var(--status-caution)",
  LOW: "var(--status-nominal)",
  OPTIMAL: "var(--status-nominal)",
  DEGRADED: "var(--status-caution)",
  STABLE: "var(--status-nominal)",
  NEUTRAL: "var(--text-muted)",
  CYAN: "var(--accent)",
  ADVISORY: "var(--status-advisory)",
};

/**
 * Derive CSS token for any status string without hardcoding.
 */
export function getStatusColor(status: string | null | undefined): string {
  const s = (status || "").toUpperCase();
  if (s === "ALERT" || s === "CRITICAL" || s === "FAILURE" || s === "WARNING") return STATUS_COLORS.ALERT;
  if (s === "CAUTION" || s === "DEGRADING" || s === "MEDIUM" || s === "DEGRADED") return STATUS_COLORS.CAUTION;
  if (s === "HIGH") return STATUS_COLORS.HIGH;
  if (s === "NORMAL" || s === "HEALTHY" || s === "LOW" || s === "OPTIMAL" || s === "STABLE" || s === "NOMINAL") {
    return STATUS_COLORS.NORMAL;
  }
  return STATUS_COLORS.NEUTRAL;
}

/**
 * Resolves diagnosis fault confidence color.
 * 0% fault confidence must NEVER be orange/red.
 */
export function getConfidenceColor(confidenceRatio: number): string {
  if (confidenceRatio <= 0.05) return STATUS_COLORS.NORMAL; // 0% is healthy/nominal!
  if (confidenceRatio >= 0.7) return STATUS_COLORS.ALERT;
  if (confidenceRatio >= 0.3) return STATUS_COLORS.CAUTION;
  return STATUS_COLORS.NEUTRAL;
}
