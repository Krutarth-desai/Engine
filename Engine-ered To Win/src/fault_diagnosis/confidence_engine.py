"""
AeroTwin Physics-Informed Fault Diagnosis - Confidence Engine
============================================================
Calculates deterministic, explainable confidence scores [0.0 - 1.0]
synthesized from 5 key evidence vectors:

1. Physics Residual Evidence (Digital Twin virtual engine deviation)
2. Raw Telemetry Threshold Proximity
3. ML Anomaly Evidence (Isolation Forest score)
4. Subsystem Health Index Degradation
5. Component Degradation State

Implements strict Sensor-vs-Engine Fault Prioritization:
- When a sensor channel is diagnosed as faulty, engine fault candidates
  relying on that sensor are suppressed/discounted.
- Independent multi-sensor corroboration awards a confidence bonus.
"""

from typing import Dict, Any, Optional
from .fault_rules import FaultCode


class ConfidenceEngine:
    """
    Deterministic confidence calculation engine.
    Produces repeatable, evidence-grounded confidence scores.
    """

    def __init__(
        self,
        weight_physics: float = 0.35,
        weight_telemetry: float = 0.15,
        weight_ml: float = 0.15,
        weight_health: float = 0.20,
        weight_degradation: float = 0.15,
        sensor_suppression_factor: float = 0.10,
        multi_sensor_bonus: float = 0.10
    ):
        self.w_physics = weight_physics
        self.w_telemetry = weight_telemetry
        self.w_ml = weight_ml
        self.w_health = weight_health
        self.w_degradation = weight_degradation
        self.sensor_suppression_factor = sensor_suppression_factor
        self.multi_sensor_bonus = multi_sensor_bonus

    def calculate_confidence(
        self,
        fault_candidate: Dict[str, Any],
        telemetry: Dict[str, Any],
        residuals: Dict[str, Any],
        subsystem_health: Dict[str, float],
        overall_health: float,
        degradation: Dict[str, float],
        anomaly: Dict[str, Any],
        sensor_diagnosis: Dict[str, Any]
    ) -> float:
        """
        Calculates a deterministic confidence score in [0.0, 1.0] for a fault candidate.
        """
        fault_code = fault_candidate["fault_code"]
        raw_match = fault_candidate.get("raw_match", 0.0)

        # 1. Normal Operation special case
        if fault_code == FaultCode.NORMAL:
            if overall_health >= 95.0 and not anomaly.get("is_anomaly", False):
                return round(min(0.99, 0.90 + (overall_health - 95.0) * 0.018), 4)
            elif overall_health >= 85.0:
                return round(0.80 + (overall_health - 85.0) * 0.01, 4)
            else:
                return round(max(0.10, overall_health / 100.0 * 0.60), 4)

        # If raw rule matching found zero correlation, confidence is negligible
        if raw_match < 0.05:
            return 0.0

        # Extract evidence components
        c_physics = self._eval_physics_evidence(fault_code, residuals)
        c_telemetry = self._eval_telemetry_evidence(fault_code, telemetry)
        c_ml = self._eval_ml_evidence(anomaly)
        c_health = self._eval_health_evidence(fault_code, subsystem_health, overall_health)
        c_degradation = self._eval_degradation_evidence(fault_code, degradation)

        # Weighted baseline confidence
        c_base = (
            self.w_physics * c_physics +
            self.w_telemetry * c_telemetry +
            self.w_ml * c_ml +
            self.w_health * c_health +
            self.w_degradation * c_degradation
        )

        # Blend with rule match strength
        confidence = 0.50 * c_base + 0.50 * raw_match

        # -----------------------------------------------------------------
        # REQUIREMENT 16: Sensor vs Engine Fault Priority
        # -----------------------------------------------------------------
        diag_type = sensor_diagnosis.get("diagnosis_type", "NORMAL")
        suspected_sensor = sensor_diagnosis.get("suspected_sensor")
        sensor_fault_conf = sensor_diagnosis.get("sensor_fault_confidence", 0.0)
        sensitive_sensor = fault_candidate.get("sensitive_sensor")

        # Case A: If this candidate is a Sensor Fault and SensorDiagnosisEngine agrees
        if fault_code in (FaultCode.SENSOR_FAILURE, FaultCode.SENSOR_DRIFT):
            if diag_type == "POSSIBLE_SENSOR_FAILURE" or sensor_fault_conf > 0.60:
                confidence = max(confidence, sensor_fault_conf * 0.96)
            elif suspected_sensor is not None:
                confidence = max(confidence, 0.85)

        # Case B: If this candidate is an Engine Fault, but its primary sensor is broken
        elif sensitive_sensor is not None:
            if diag_type == "POSSIBLE_SENSOR_FAILURE" and suspected_sensor == sensitive_sensor:
                # Sensor failure confirmed by cross-sensor ML -> Heavily suppress engine fault confidence
                confidence *= self.sensor_suppression_factor
            elif suspected_sensor == sensitive_sensor and sensor_fault_conf > 0.70:
                confidence *= self.sensor_suppression_factor

        # -----------------------------------------------------------------
        # REQUIREMENT 17: Multi-Sensor Confirmation Bonus
        # -----------------------------------------------------------------
        has_multi_sensor_confirmation = self._check_multi_sensor_confirmation(
            fault_code, residuals, telemetry, sensor_diagnosis
        )
        if has_multi_sensor_confirmation and fault_code not in (FaultCode.SENSOR_FAILURE, FaultCode.SENSOR_DRIFT):
            confidence += self.multi_sensor_bonus

        # Bounded between 0.00 and 0.99 (leaving room for epistemic uncertainty)
        return round(float(min(0.99, max(0.0, confidence))), 4)

    def _eval_physics_evidence(self, fault_code: FaultCode, residuals: Dict[str, Any]) -> float:
        """Evaluates normalized residuals specific to the fault domain."""
        if not residuals:
            return 0.20

        def get_norm(k: str) -> float:
            item = residuals.get(k, {})
            if isinstance(item, dict):
                return abs(float(item.get("normalized_residual", 0.0)))
            return 0.0

        if fault_code == FaultCode.INJECTOR_DEGRADATION:
            # EGT and Fuel Flow residuals
            return min(1.0, 0.5 * get_norm("egt_c") + 0.5 * get_norm("fuel_flow_lh"))

        elif fault_code == FaultCode.MISFIRE:
            # RPM drop and vibration rise
            return min(1.0, 0.6 * get_norm("rpm") + 0.4 * get_norm("vibration_g"))

        elif fault_code == FaultCode.LUBRICATION_FAULT:
            # Oil pressure and oil temperature residuals
            return min(1.0, 0.6 * get_norm("oil_pressure_bar") + 0.4 * get_norm("oil_temperature_c"))

        elif fault_code == FaultCode.OVERHEATING:
            # CHT, EGT, and oil temperature
            return min(1.0, 0.5 * get_norm("cht_c") + 0.3 * get_norm("egt_c") + 0.2 * get_norm("oil_temperature_c"))

        elif fault_code == FaultCode.ABNORMAL_VIBRATION:
            # Vibration residual
            return min(1.0, get_norm("vibration_g") * 0.8)

        elif fault_code in (FaultCode.SENSOR_DRIFT, FaultCode.SENSOR_FAILURE):
            # Check maximum single sensor normalized residual
            max_res = max([get_norm(k) for k in residuals.keys()] or [0.0])
            return min(1.0, max_res / 5.0)

        elif fault_code == FaultCode.COMBUSTION_INSTABILITY:
            return min(1.0, 0.4 * get_norm("rpm") + 0.3 * get_norm("egt_c") + 0.3 * get_norm("fuel_flow_lh"))

        elif fault_code == FaultCode.ELECTRICAL_ABNORMALITY:
            return min(1.0, get_norm("battery_voltage_v") * 0.7)

        elif fault_code == FaultCode.ENGINE_FAILURE_MULTI:
            # Average of top 4 residuals
            norms = sorted([get_norm(k) for k in residuals.keys()], reverse=True)
            return min(1.0, sum(norms[:4]) / 4.0 * 0.4)

        return 0.30

    def _eval_telemetry_evidence(self, fault_code: FaultCode, telemetry: Dict[str, Any]) -> float:
        """Evaluates raw telemetry relative to caution and alert redlines."""
        cht = float(telemetry.get("cht_c") or telemetry.get("cht") or 142.0)
        egt = float(telemetry.get("egt_c") or telemetry.get("egt") or 615.0)
        oil_t = float(telemetry.get("oil_temperature_c") or telemetry.get("oil_temperature") or 92.0)
        
        raw_oil_p = telemetry.get("oil_pressure_bar")
        if raw_oil_p is None and "oil_pressure" in telemetry:
            val = float(telemetry["oil_pressure"])
            oil_p = val / 14.5038 if val > 15.0 else val
        else:
            oil_p = float(raw_oil_p or 4.69)
            
        vib = float(telemetry.get("vibration_g") or telemetry.get("vibration") or 1.42)
        volt = float(telemetry.get("battery_voltage_v") or telemetry.get("bus_voltage") or 27.6)

        if fault_code == FaultCode.OVERHEATING:
            score = 0.0
            if cht > 165.0: score += 0.5
            if cht > 185.0: score += 0.3
            if egt > 680.0: score += 0.2
            return min(1.0, score)

        elif fault_code == FaultCode.LUBRICATION_FAULT:
            score = 0.0
            if oil_p < 3.8: score += 0.5
            if oil_p < 2.8: score += 0.3
            if oil_t > 105.0: score += 0.2
            return min(1.0, score)

        elif fault_code == FaultCode.ABNORMAL_VIBRATION:
            if vib > 2.2: return 0.90
            if vib > 1.8: return 0.65
            return 0.15

        elif fault_code == FaultCode.ELECTRICAL_ABNORMALITY:
            if volt < 25.0 or volt > 29.5: return 0.90
            if volt < 26.0 or volt > 28.8: return 0.60
            return 0.15

        elif fault_code == FaultCode.INJECTOR_DEGRADATION:
            fuel = float(telemetry.get("fuel_flow_lh") or telemetry.get("fuel_flow") or 17.6)
            if fuel > 20.0 and egt > 650.0: return 0.85
            if fuel > 19.0: return 0.55
            return 0.20

        return 0.40

    def _eval_ml_evidence(self, anomaly: Dict[str, Any]) -> float:
        """Evaluates Isolation Forest anomaly detection score."""
        is_anomaly = anomaly.get("is_anomaly", False)
        score = float(anomaly.get("score", 0.0))
        if not is_anomaly:
            return 0.05
        # Isolation Forest score: negative values indicate anomaly (e.g. -0.05 to -0.30)
        if score < -0.15:
            return 0.95
        elif score < -0.05:
            return 0.75
        return 0.50

    def _eval_health_evidence(
        self,
        fault_code: FaultCode,
        subsystem_health: Dict[str, float],
        overall_health: float
    ) -> float:
        """Evaluates subsystem health degradation."""
        subsystem_key_map = {
            FaultCode.INJECTOR_DEGRADATION: "combustion",
            FaultCode.MISFIRE: "combustion",
            FaultCode.COMBUSTION_INSTABILITY: "combustion",
            FaultCode.LUBRICATION_FAULT: "lubrication",
            FaultCode.OVERHEATING: "thermal",
            FaultCode.ABNORMAL_VIBRATION: "mechanical",
            FaultCode.ELECTRICAL_ABNORMALITY: "electrical",
            FaultCode.SENSOR_DRIFT: "sensor",
            FaultCode.SENSOR_FAILURE: "sensor",
        }
        if fault_code == FaultCode.ENGINE_FAILURE_MULTI:
            return min(1.0, max(0.0, (100.0 - overall_health) / 70.0))

        key = subsystem_key_map.get(fault_code)
        if key and key in subsystem_health:
            h_val = subsystem_health[key]
            return min(1.0, max(0.0, (100.0 - h_val) / 60.0))

        return min(1.0, max(0.0, (100.0 - overall_health) / 60.0))

    def _eval_degradation_evidence(self, fault_code: FaultCode, degradation: Dict[str, float]) -> float:
        """Evaluates component degradation wear accumulation."""
        deg_map = {
            FaultCode.INJECTOR_DEGRADATION: "injector",
            FaultCode.LUBRICATION_FAULT: "lubrication",
            FaultCode.OVERHEATING: "cooling",
            FaultCode.ABNORMAL_VIBRATION: "mechanical",
            FaultCode.ELECTRICAL_ABNORMALITY: "electrical",
            FaultCode.SENSOR_DRIFT: "sensors",
            FaultCode.SENSOR_FAILURE: "sensors"
        }
        key = deg_map.get(fault_code)
        if key and key in degradation:
            wear = degradation[key]
            return min(1.0, wear * 1.5)
        return 0.20

    def _check_multi_sensor_confirmation(
        self,
        fault_code: FaultCode,
        residuals: Dict[str, Any],
        telemetry: Dict[str, Any],
        sensor_diagnosis: Dict[str, Any]
    ) -> bool:
        """
        Verifies if at least 2 independent sensor channels corroborate the fault.
        """
        def get_norm(k: str) -> float:
            item = residuals.get(k, {})
            if isinstance(item, dict):
                return abs(float(item.get("normalized_residual", 0.0)))
            return 0.0

        if fault_code == FaultCode.OVERHEATING:
            # Corroborated if CHT AND (EGT or Oil Temp) both show significant positive residual
            return get_norm("cht_c") > 1.2 and (get_norm("egt_c") > 1.2 or get_norm("oil_temperature_c") > 1.0)

        elif fault_code == FaultCode.INJECTOR_DEGRADATION:
            # Corroborated if EGT AND Fuel Flow both show significant positive residual
            return get_norm("egt_c") > 1.0 and get_norm("fuel_flow_lh") > 1.0

        elif fault_code == FaultCode.LUBRICATION_FAULT:
            # Corroborated if Oil Pressure drop AND Oil Temp rise both confirm
            return get_norm("oil_pressure_bar") > 1.0 and get_norm("oil_temperature_c") > 0.8

        elif fault_code == FaultCode.MISFIRE:
            # Corroborated if RPM drop AND vibration rise
            return get_norm("rpm") > 1.0 and get_norm("vibration_g") > 1.0

        elif fault_code == FaultCode.ENGINE_FAILURE_MULTI:
            # Multiple sensors diverging
            affected = sensor_diagnosis.get("affected_sensors", [])
            return len(affected) >= 3 or (get_norm("cht_c") > 1.5 and get_norm("oil_pressure_bar") > 1.5)

        return False
