export interface SensorDiagnosis {
  diagnosis_type: "NORMAL" | "POSSIBLE_SENSOR_FAILURE" | "POSSIBLE_ENGINE_FAILURE" | "UNKNOWN" | string;
  sensor_fault_confidence: number;
  engine_fault_confidence: number;
  persistence_count: number;
  suspected_sensor?: string | null;
  affected_sensors?: string[];
  sensor_scores?: Record<string, number>;
  evidence?: string;
}

export interface DigitalTwinResidualItem {
  actual: number;
  expected: number;
  residual: number;
  normalized_residual: number;
  pct_deviation: number;
}

export interface DigitalTwinSubsystemHealth {
  thermal: number;
  combustion: number;
  lubrication: number;
  mechanical: number;
  electrical: number;
  sensor: number;
}

export interface DigitalTwinHealthBlock extends DigitalTwinSubsystemHealth {
  overall: number;
  status: "HEALTHY" | "NORMAL / MONITORED" | "DEGRADED" | "CRITICAL" | "SEVERE" | string;
}

export interface DigitalTwinTrend {
  current_health: number;
  previous_health: number;
  overall_delta: number;
  degradation_rate: number;
  rapid_degradation: boolean;
  warning?: string | null;
}

export interface DigitalTwinHistoryPoint {
  tick: number;
  timestamp: string;
  overall: number;
  status: string;
  thermal: number;
  combustion: number;
  lubrication: number;
  mechanical: number;
  electrical: number;
  sensor: number;
}

export interface EnvironmentEnduranceStress {
  thermal_stress: number;
  mechanical_stress: number;
  lubrication_stress: number;
}

export interface EnvironmentPayload {
  altitude_ft: number;
  ambient_temp_c: number;
  pressure_kpa: number;
  air_density_kg_m3: number;
  density_ratio: number;
  relative_density_to_cruise: number;
  isa_temp_c: number;
  isa_temp_dev_c: number;
  throttle_pct: number;
  effective_throttle_pct: number;
  throttle_rate: number;
  is_transient: boolean;
  operating_conditions: string[];
  primary_condition: string;
  operating_condition: string;
  mission_profile: string;
  mission_time_sec: number;
  simulation_speed: number;
  endurance_hours: number;
  endurance_stress?: EnvironmentEnduranceStress;
}

export interface DigitalTwinPayload {
  timestamp: string;
  actual: Record<string, number>;
  expected: Record<string, number>;
  residuals: Record<string, DigitalTwinResidualItem>;
  degradation: Record<string, number>;
  subsystem_health: DigitalTwinSubsystemHealth;
  health_index: number;
  health?: DigitalTwinHealthBlock;
  trend?: DigitalTwinTrend;
  history?: DigitalTwinHistoryPoint[];
  environment?: EnvironmentPayload;
}

export interface TelemetryData {
  timestamp: string;
  engine_id: string;
  rpm: number;
  cht_c: number;
  egt_c: number;
  oil_pressure_bar: number;
  oil_temperature_c: number;
  fuel_flow_lh: number;
  vibration_g: number;
  manifold_pressure_bar?: number;
  fuel_remaining_liters?: number;
  battery_voltage_v: number;
  injection_timing_deg: number;
  health_index: number;
  rul: number;
  fault_label: string;
  status?: string;
  severity?: string;
  fault?: string;
  evidence?: string;
  treatment?: string;
  prevention?: string;
  anomaly_score?: number;
  sensor_diagnosis?: SensorDiagnosis;
  digital_twin?: DigitalTwinPayload;
  environment?: EnvironmentPayload;
}

export interface RulTickData {
  type: "rul_tick";
  unit: number;
  cycle: number;
  actual_rul: number;
  predicted_rul: number | null;
}

export interface RulEngineListMsg {
  type: "engine_list";
  units: number[];
}

export interface RulResetMsg {
  type: "reset";
  unit: number;
}

export interface SensorItem {
  key: string;
  name: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  status: "NORMAL" | "CAUTION" | "ALERT";
  trend: "UP" | "DOWN" | "STABLE";
  progressPct: number;
}

export interface PrognosticsData {
  predicted_rul: number;
  actual_rul: number;
  remaining_time_str: string;
  current_cycle: number;
  max_useful_life: number;
  rul_unclipped: number;
  rul_clipped: number;
  degradation_trend: "Increasing" | "Stable" | "Accelerating" | "Decelerating" | "Decreasing";
  confidence: number;
  abs_error: number;
  model_mae: number;
  window_size: number;
  sensor_count: number;
}

export interface RiskData {
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  anomaly: "NORMAL" | "CAUTION" | "ALERT";
  action: string;
  status_label?: string;
  guidance?: string;
}

export interface FeatureContribution {
  name: string;
  score: number; // 0.0 to 1.0
  impact: string;
  direction: "UP" | "DOWN" | "STABLE";
}

export interface TrendHistoryPoint {
  cycle: number;
  egt: number;
  oil_pressure: number;
  vibration: number;
  health_index: number;
}

export interface TrajectoryPoint {
  cycle: number;
  actual_rul: number;
  predicted_rul: number;
}

export interface PhmAlertItem {
  id: string;
  level: "NORMAL" | "INFO" | "CAUTION" | "ALERT";
  title: string;
  message: string;
  time_ago: string;
  timestamp: string;
}

export interface UnifiedTelemetryPayload {
  cycle: number;
  timestamp: string;
  vehicle: {
    vehicle_id: string;
    mission_id: string;
    altitude: number;
    throttle: number;
    update_rate: number;
  };
  sensors: Record<string, SensorItem>;
  sensor_list: SensorItem[];
  prognostics: PrognosticsData;
  health_index: number;
  risk: RiskData;
  contributing_features: FeatureContribution[];
  recent_trends: {
    points: TrendHistoryPoint[];
    deltas: {
      egt_delta: number;
      oil_pressure_delta: number;
      vibration_delta: number;
      health_delta: number;
    };
  };
  trajectory: TrajectoryPoint[];
  alerts: PhmAlertItem[];
  fault_label: string;
  scenario: string;
  sensor_diagnosis?: SensorDiagnosis;
  digital_twin?: DigitalTwinPayload;
  environment?: EnvironmentPayload;
  diagnosis?: FaultDiagnosisPayload;
  rpm?: number;
  cht_c?: number;
  egt_c?: number;
  oil_pressure_bar?: number;
  oil_temperature_c?: number;
  fuel_flow_lh?: number;
  vibration_g?: number;
  battery_voltage_v?: number;
  injection_timing_deg?: number;
}

export interface AlternativeFault {
  fault: string;
  fault_code: string;
  confidence: number;
  severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  affected_subsystem: string;
}

export interface MaintenanceContext {
  fault: string;
  fault_code: string;
  severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number;
  affected_subsystem: string;
  health_score: number;
  degradation_wear: number;
  trend: string;
  persistence_ticks: number;
}

export interface FaultDiagnosisPayload {
  fault: string;
  fault_code: string;
  state: "NORMAL" | "ANOMALY" | "SUSPECTED" | "CONFIRMED" | "CRITICAL" | "RECOVERING";
  confidence: number;
  severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  affected_subsystem: string;
  evidence: string[];
  supporting_signals: Record<string, number>;
  suspected_sensor: string | null;
  alternative_faults: AlternativeFault[];
  maintenance_context: MaintenanceContext;
  persistence_ticks: number;
  is_sensor_fault: boolean;
}
