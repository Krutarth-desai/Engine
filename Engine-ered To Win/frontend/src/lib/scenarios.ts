/**
 * lib/scenarios.ts
 * Unified Scenario Registry for Fault Injection Simulation.
 * Reconciles the 9 scenarios on Dashboard and 7 on Alerts into
 * one centralized registry with verified category tags.
 */

export type ScenarioCategory =
  | "NORMAL"
  | "THERMAL"
  | "COMBUSTION"
  | "LUBRICATION"
  | "MECHANICAL"
  | "AVIONICS"
  | "IGNITION"
  | "PROPULSION";

export interface ScenarioItem {
  id: string;
  label: string;
  category: ScenarioCategory;
  description: string;
  severity: "Nominal" | "Caution" | "Warning" | "Critical";
  affectedComponent: string;
  targetSensors: string[];
}

export const SCENARIO_REGISTRY: ScenarioItem[] = [
  {
    id: "Normal",
    label: "Nominal Cruise",
    category: "NORMAL",
    description: "Standard operating envelope; all sensor channels nominal.",
    severity: "Nominal",
    affectedComponent: "All Subsystems",
    targetSensors: [],
  },
  {
    id: "Overheating",
    label: "Cooling / Overheating",
    category: "THERMAL",
    description: "Thermal dissipation deficit: CHT & EGT temperature ramp.",
    severity: "Warning",
    affectedComponent: "Cylinder Head & Cooling Radiator",
    targetSensors: ["cht", "egt", "oil_temperature"],
  },
  {
    id: "Injector_Degradation",
    label: "Injector Degradation",
    category: "COMBUSTION",
    description: "Fuel delivery restriction: flow bias, EGT spike, combustion roughness.",
    severity: "Caution",
    affectedComponent: "Fuel Rail & Injectors",
    targetSensors: ["fuel_flow", "egt", "rpm"],
  },
  {
    id: "Lubrication", // Mapping: handles both "Lubrication" and "Oil_Pressure_Loss"
    label: "Lubrication Starvation",
    category: "LUBRICATION", // Corrected from HYDRAULIC to LUBRICATION
    description: "Oil galley pressure decay and scavenge pump thermal stress.",
    severity: "Critical",
    affectedComponent: "Oil Sump & Scavenge Pump",
    targetSensors: ["oil_pressure", "oil_temperature", "vibration"],
  },
  {
    id: "Vibration_Fault", // Mapping: handles both "Vibration_Fault" and "High_Vibration"
    label: "Abnormal Vibration",
    category: "MECHANICAL",
    description: "Rotor dynamic imbalance and dynafocal engine mount strain.",
    severity: "Warning",
    affectedComponent: "Crankcase & Dynafocal Mounts",
    targetSensors: ["vibration"],
  },
  {
    id: "Sensor_Drift",
    label: "CHT Sensor Drift",
    category: "AVIONICS",
    description: "Thermocouple calibration divergence while engine runs healthy.",
    severity: "Caution",
    affectedComponent: "CHT Thermocouple Harness",
    targetSensors: ["cht"],
  },
  {
    id: "Misfire",
    label: "Cylinder Misfire",
    category: "IGNITION",
    description: "Intermittent spark deficit on Cylinder 1; EGT and RPM fluctuations.",
    severity: "Warning",
    affectedComponent: "Ignition Coil & Cylinder #1 Spark Plug",
    targetSensors: ["rpm", "vibration", "egt"],
  },
  {
    id: "Sensor_Fault_Temp", // Mapping: handles both "Sensor_Fault_Temp" and "Sensor_Fault_CHT"
    label: "Sensor Fault (Temp)",
    category: "AVIONICS",
    description: "Isolated thermocouple bias spike; engine physically healthy.",
    severity: "Caution",
    affectedComponent: "Nose Avionics & CHT Probe",
    targetSensors: ["cht"],
  },
  {
    id: "Engine_Failure_Multi",
    label: "Critical Engine Failure",
    category: "PROPULSION",
    description: "Correlated multi-sensor breakdown across thermal, hydraulic, and mechanical systems.",
    severity: "Critical",
    affectedComponent: "Core Propulsion Bay",
    targetSensors: ["rpm", "cht", "egt", "oil_pressure", "oil_temperature", "fuel_flow", "vibration"],
  },
];

export const SCENARIOS_BY_ID = new Map(SCENARIO_REGISTRY.map((s) => [s.id, s]));

/**
 * Normalizes scenario id for payload compatibility.
 */
export function normalizeScenarioId(id: string | null | undefined): string {
  if (!id) return "Normal";
  if (id === "Oil_Pressure_Loss") return "Lubrication";
  if (id === "High_Vibration") return "Vibration_Fault";
  if (id === "Sensor_Fault_CHT") return "Sensor_Fault_Temp";
  return id;
}
