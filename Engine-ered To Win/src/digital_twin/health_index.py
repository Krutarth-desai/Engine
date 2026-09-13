"""
AeroTwin Digital Twin - Subsystem & Overall Health Index Calculator (Phase 2)
=============================================================================
Calculates deterministic, explainable health scores (0-100) across 6 core engine subsystems:
1. Thermal Subsystem
2. Combustion Subsystem
3. Lubrication Subsystem
4. Mechanical Subsystem
5. Electrical Subsystem
6. Sensor Channel & Diagnostic Consistency

Synthesizes an Overall Health Index and categorizes health status:
- 90 - 100: HEALTHY
- 75 - 89.9: NORMAL / MONITORED
- 50 - 74.9: DEGRADED
- 25 - 49.9: CRITICAL
-  0 - 24.9: SEVERE
"""

from typing import Dict, Any, Optional
import math


# Configurable default health subsystem weights (must sum to 1.0)
DEFAULT_HEALTH_WEIGHTS: Dict[str, float] = {
    "thermal": 0.20,
    "combustion": 0.20,
    "lubrication": 0.20,
    "mechanical": 0.20,
    "electrical": 0.10,
    "sensor": 0.10
}

# Configurable health status classification boundaries
DEFAULT_STATUS_THRESHOLDS: Dict[str, float] = {
    "HEALTHY": 90.0,
    "NORMAL / MONITORED": 75.0,
    "DEGRADED": 50.0,
    "CRITICAL": 25.0,
    "SEVERE": 0.0
}

# Critical redline thresholds for absolute operating condition evaluation
CRITICAL_OPERATING_LIMITS: Dict[str, float] = {
    "cht_caution": 165.0,
    "cht_redline": 195.0,
    "egt_caution": 680.0,
    "egt_redline": 760.0,
    "oil_temp_caution": 108.0,
    "oil_temp_redline": 125.0,
    "oil_pressure_caution_low": 3.45,   # Bar (~50 psi)
    "oil_pressure_redline_low": 2.41,   # Bar (~35 psi)
    "vibration_caution": 2.10,          # g
    "vibration_redline": 2.90,          # g
    "voltage_caution_low": 25.0,        # V
    "voltage_redline_low": 23.5         # V
}


def _residual_penalty_score(norm_res: float, linear_penalty: float = 12.0, deadband: float = 0.5) -> float:
    """
    Computes a 0-100 score from a normalized residual.
    Maintains 100 within deadband and drops smoothly and progressively as residual increases.
    """
    excess = max(0.0, abs(norm_res) - deadband)
    penalty = (linear_penalty * excess) + (1.8 * (excess ** 1.75))
    return max(0.0, min(100.0, 100.0 - penalty))


class HealthIndexCalculator:
    """
    Phase 2 Subsystem Health & Airworthiness Index Calculator.
    Provides modular, explainable calculations combining live telemetry,
    Digital Twin physics residuals, and progressive subsystem degradation.
    """

    def __init__(
        self,
        weights: Optional[Dict[str, float]] = None,
        status_thresholds: Optional[Dict[str, float]] = None
    ):
        self.weights = dict(weights or DEFAULT_HEALTH_WEIGHTS)
        # Normalize weights to sum strictly to 1.0
        total_w = sum(self.weights.values())
        if abs(total_w - 1.0) > 1e-4:
            self.weights = {k: v / total_w for k, v in self.weights.items()}

        self.status_thresholds = status_thresholds or DEFAULT_STATUS_THRESHOLDS

    def _get_res_data(self, residuals: Dict[str, Dict[str, float]], key: str) -> Dict[str, float]:
        """Safely extracts residual metrics for a given key."""
        return residuals.get(key, {
            "actual": 0.0, "expected": 0.0, "residual": 0.0, "normalized_residual": 0.0, "pct_deviation": 0.0
        })

    def calculate_thermal_health(
        self,
        telemetry: Dict[str, Any],
        residuals: Dict[str, Dict[str, float]],
        degradation: Dict[str, float],
        environment: Optional[Dict[str, Any]] = None
    ) -> float:
        """
        Calculates Thermal Health (0-100).
        Factors: CHT, EGT, ambient temperature, altitude, CHT residual, EGT residual, and cooling degradation.
        Evaluates both absolute operating condition and actual-vs-expected residuals.
        Applies sensor-fault isolation dampening if CHT anomaly is strictly single-channel.
        """
        cht_data = self._get_res_data(residuals, "cht_c")
        egt_data = self._get_res_data(residuals, "egt_c")
        oil_t_data = self._get_res_data(residuals, "oil_temperature_c")

        cht_norm = cht_data.get("normalized_residual", 0.0)
        egt_norm = egt_data.get("normalized_residual", 0.0)
        oil_t_norm = oil_t_data.get("normalized_residual", 0.0)

        cht_act = cht_data.get("actual", float(telemetry.get("cht_c") or 142.0))
        egt_act = egt_data.get("actual", float(telemetry.get("egt_c") or 615.0))

        # Check for isolated single-sensor CHT spike (thermocouple issue, not physical engine heating)
        is_isolated_cht = (abs(cht_norm) > 2.5) and (abs(egt_norm) < 1.5) and (abs(oil_t_norm) < 1.5)

        # 1. Residual-based thermal scores
        cht_res_score = _residual_penalty_score(cht_norm, linear_penalty=12.0)
        egt_res_score = _residual_penalty_score(egt_norm, linear_penalty=10.0)
        oil_t_res_score = _residual_penalty_score(oil_t_norm, linear_penalty=10.0)

        # 2. Absolute operating condition penalty (exceeding redline)
        abs_penalty = 0.0
        if not is_isolated_cht:
            if cht_act > CRITICAL_OPERATING_LIMITS["cht_caution"]:
                abs_penalty += min(25.0, (cht_act - CRITICAL_OPERATING_LIMITS["cht_caution"]) * 0.8)
            if egt_act > CRITICAL_OPERATING_LIMITS["egt_caution"]:
                abs_penalty += min(20.0, (egt_act - CRITICAL_OPERATING_LIMITS["egt_caution"]) * 0.25)

        # 3. Cooling physical degradation
        cooling_deg = degradation.get("cooling", 0.0)

        if is_isolated_cht:
            # Isolated CHT thermocouple fault: protect thermal score; engine is physically safe
            score = (0.50 * egt_res_score) + (0.50 * oil_t_res_score) - (cooling_deg * 25.0)
        else:
            # Genuine thermal condition: correlated temperature deviations
            score = (
                (0.40 * cht_res_score) +
                (0.35 * egt_res_score) +
                (0.25 * oil_t_res_score) -
                abs_penalty -
                (cooling_deg * 30.0)
            )

        return round(max(0.0, min(100.0, score)), 1)

    def calculate_combustion_health(
        self,
        telemetry: Dict[str, Any],
        residuals: Dict[str, Dict[str, float]],
        degradation: Dict[str, float]
    ) -> float:
        """
        Calculates Combustion Health (0-100).
        Factors: RPM, EGT, fuel flow, injection timing, RPM stability, EGT residual,
        fuel-flow residual, injection timing residual, and injector degradation.
        Responds to misfires and mixture anomalies.
        """
        rpm_data = self._get_res_data(residuals, "rpm")
        egt_data = self._get_res_data(residuals, "egt_c")
        fuel_data = self._get_res_data(residuals, "fuel_flow_lh")
        timing_data = self._get_res_data(residuals, "injection_timing_deg")

        rpm_norm = rpm_data.get("normalized_residual", 0.0)
        egt_norm = egt_data.get("normalized_residual", 0.0)
        fuel_norm = fuel_data.get("normalized_residual", 0.0)
        timing_norm = timing_data.get("normalized_residual", 0.0)

        # Base residual scores
        rpm_score = _residual_penalty_score(rpm_norm, linear_penalty=11.0)
        egt_score = _residual_penalty_score(egt_norm, linear_penalty=9.0)
        fuel_score = _residual_penalty_score(fuel_norm, linear_penalty=12.0)
        timing_score = _residual_penalty_score(timing_norm, linear_penalty=10.0)

        # Misfire condition check: drop in RPM + drop in EGT
        misfire_penalty = 0.0
        if rpm_norm < -1.5 and egt_norm < -1.0:
            misfire_penalty = min(30.0, (abs(rpm_norm) + abs(egt_norm)) * 7.0)

        injector_deg = degradation.get("injector", 0.0)

        score = (
            (0.35 * rpm_score) +
            (0.25 * fuel_score) +
            (0.25 * egt_score) +
            (0.15 * timing_score) -
            misfire_penalty -
            (injector_deg * 35.0)
        )

        return round(max(0.0, min(100.0, score)), 1)

    def calculate_lubrication_health(
        self,
        telemetry: Dict[str, Any],
        residuals: Dict[str, Dict[str, float]],
        degradation: Dict[str, float]
    ) -> float:
        """
        Calculates Lubrication Health (0-100).
        Factors: oil pressure, oil temperature, oil pressure residual, oil temp residual,
        and lubrication degradation.
        Low oil pressure is heavily penalized. High oil temp alone does not cause total failure.
        """
        oil_p_data = self._get_res_data(residuals, "oil_pressure_bar")
        oil_t_data = self._get_res_data(residuals, "oil_temperature_c")

        oil_p_norm = oil_p_data.get("normalized_residual", 0.0)
        oil_t_norm = oil_t_data.get("normalized_residual", 0.0)
        oil_p_act = oil_p_data.get("actual", float(telemetry.get("oil_pressure_bar") or 4.69))

        # Low oil pressure is life-threatening to bearings; high pressure is less critical
        oil_p_penalty_mult = 18.0 if oil_p_norm < 0 else 8.0
        oil_p_score = _residual_penalty_score(oil_p_norm, linear_penalty=oil_p_penalty_mult)
        oil_t_score = _residual_penalty_score(oil_t_norm, linear_penalty=10.0)

        # Absolute critical low pressure penalty
        abs_p_penalty = 0.0
        if oil_p_act < CRITICAL_OPERATING_LIMITS["oil_pressure_caution_low"]:
            abs_p_penalty = min(40.0, (CRITICAL_OPERATING_LIMITS["oil_pressure_caution_low"] - oil_p_act) * 35.0)

        lub_deg = degradation.get("lubrication", 0.0)

        score = (0.65 * oil_p_score) + (0.35 * oil_t_score) - abs_p_penalty - (lub_deg * 35.0)
        return round(max(0.0, min(100.0, score)), 1)

    def calculate_mechanical_health(
        self,
        telemetry: Dict[str, Any],
        residuals: Dict[str, Dict[str, float]],
        degradation: Dict[str, float]
    ) -> float:
        """
        Calculates Mechanical Health (0-100).
        Factors: vibration, RPM stability, vibration residual, and mechanical degradation.
        """
        vib_data = self._get_res_data(residuals, "vibration_g")
        rpm_data = self._get_res_data(residuals, "rpm")

        vib_norm = vib_data.get("normalized_residual", 0.0)
        rpm_norm = rpm_data.get("normalized_residual", 0.0)
        vib_act = vib_data.get("actual", float(telemetry.get("vibration_g") or 1.42))

        vib_score = _residual_penalty_score(vib_norm, linear_penalty=15.0)
        rpm_score = _residual_penalty_score(rpm_norm, linear_penalty=10.0)

        # Absolute vibration penalty if above caution limit (2.1 g)
        abs_vib_penalty = 0.0
        if vib_act > CRITICAL_OPERATING_LIMITS["vibration_caution"]:
            abs_vib_penalty = min(35.0, (vib_act - CRITICAL_OPERATING_LIMITS["vibration_caution"]) * 40.0)

        mech_deg = degradation.get("mechanical", 0.0)

        score = (0.75 * vib_score) + (0.25 * rpm_score) - abs_vib_penalty - (mech_deg * 35.0)
        return round(max(0.0, min(100.0, score)), 1)

    def calculate_electrical_health(
        self,
        telemetry: Dict[str, Any],
        residuals: Dict[str, Dict[str, float]],
        degradation: Dict[str, float]
    ) -> float:
        """
        Calculates Electrical Health (0-100).
        Factors: bus voltage / battery voltage, voltage residual, and electrical degradation.
        (NOTE: Current UAV avionics package does not provide alternator current telemetry;
        health is evaluated using regulated 28V DC bus stability).
        """
        volt_data = self._get_res_data(residuals, "battery_voltage_v")
        volt_norm = volt_data.get("normalized_residual", 0.0)
        volt_act = volt_data.get("actual", float(telemetry.get("battery_voltage_v") or 27.6))

        volt_score = _residual_penalty_score(volt_norm, linear_penalty=14.0)

        # Undervoltage penalty
        abs_volt_penalty = 0.0
        if volt_act < CRITICAL_OPERATING_LIMITS["voltage_caution_low"]:
            abs_volt_penalty = min(40.0, (CRITICAL_OPERATING_LIMITS["voltage_caution_low"] - volt_act) * 20.0)

        elec_deg = degradation.get("electrical", 0.0)

        score = volt_score - abs_volt_penalty - (elec_deg * 35.0)
        return round(max(0.0, min(100.0, score)), 1)

    def calculate_sensor_health(
        self,
        telemetry: Dict[str, Any],
        residuals: Dict[str, Dict[str, float]],
        degradation: Dict[str, float],
        sensor_diagnosis: Optional[Dict[str, Any]] = None
    ) -> float:
        """
        Calculates Sensor Health (0-100).
        Factors: cross-sensor consistency, sensor residual outliers, and diagnosis engine output.
        Distinguishes 'SENSOR PROBLEM' from 'ENGINE PROBLEM'.
        """
        # 1. Collect normalized residuals across all channels
        norm_abs_list = []
        for key in ["cht_c", "egt_c", "oil_temperature_c", "oil_pressure_bar", "rpm", "fuel_flow_lh", "vibration_g", "battery_voltage_v"]:
            val = abs(self._get_res_data(residuals, key).get("normalized_residual", 0.0))
            norm_abs_list.append(val)

        max_norm = max(norm_abs_list) if norm_abs_list else 0.0
        mean_other = (sum(norm_abs_list) - max_norm) / max(1, len(norm_abs_list) - 1)

        # Outlier divergence: one sensor reading deviates wildly while others are normal
        sensor_divergence = max(0.0, max_norm - (mean_other * 2.5)) if max_norm > 2.5 else 0.0

        # 2. Factor in ML SensorDiagnosisEngine results if provided
        diagnosis_penalty = 0.0
        if sensor_diagnosis:
            diag_type = sensor_diagnosis.get("diagnosis_type", "NORMAL")
            sensor_conf = sensor_diagnosis.get("sensor_fault_confidence", 0.0)
            if diag_type == "POSSIBLE_SENSOR_FAILURE":
                diagnosis_penalty = 40.0 * sensor_conf

        sensor_deg = degradation.get("sensors", 0.0)
        base_score = 100.0 - (sensor_divergence * 16.0) - diagnosis_penalty - (sensor_deg * 40.0)

        return round(max(0.0, min(100.0, base_score)), 1)

    def calculate_overall_health(self, subsystems: Dict[str, float]) -> float:
        """
        Calculates the weighted Overall Health Index (0-100).
        """
        total_score = 0.0
        for sub, weight in self.weights.items():
            total_score += subsystems.get(sub, 100.0) * weight

        return round(max(0.0, min(100.0, total_score)), 1)

    def get_health_status(self, overall_health: float) -> str:
        """
        Maps numerical health score to standard operational airworthiness status.
        """
        h = max(0.0, min(100.0, float(overall_health)))
        if h >= self.status_thresholds.get("HEALTHY", 90.0):
            return "HEALTHY"
        elif h >= self.status_thresholds.get("NORMAL / MONITORED", 75.0):
            return "NORMAL / MONITORED"
        elif h >= self.status_thresholds.get("DEGRADED", 50.0):
            return "DEGRADED"
        elif h >= self.status_thresholds.get("CRITICAL", 25.0):
            return "CRITICAL"
        else:
            return "SEVERE"

    def calculate_subsystem_health(
        self,
        telemetry: Dict[str, Any],
        residuals: Dict[str, Dict[str, float]],
        degradation: Dict[str, float],
        sensor_diagnosis: Optional[Dict[str, Any]] = None,
        environment: Optional[Dict[str, Any]] = None
    ) -> Dict[str, float]:
        """
        Calculates individual 0-100 scores for all 6 subsystems.
        """
        return {
            "thermal": self.calculate_thermal_health(telemetry, residuals, degradation, environment),
            "combustion": self.calculate_combustion_health(telemetry, residuals, degradation),
            "lubrication": self.calculate_lubrication_health(telemetry, residuals, degradation),
            "mechanical": self.calculate_mechanical_health(telemetry, residuals, degradation),
            "electrical": self.calculate_electrical_health(telemetry, residuals, degradation),
            "sensor": self.calculate_sensor_health(telemetry, residuals, degradation, sensor_diagnosis)
        }

    def compute(
        self,
        telemetry: Dict[str, Any],
        residuals: Dict[str, Dict[str, float]],
        degradation: Dict[str, float],
        sensor_diagnosis: Optional[Dict[str, Any]] = None,
        environment: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Synthesizes complete health diagnostics payload:
        Overall Health Index, Health Status, and all Subsystem Scores.
        """
        subsystems = self.calculate_subsystem_health(
            telemetry=telemetry,
            residuals=residuals,
            degradation=degradation,
            sensor_diagnosis=sensor_diagnosis,
            environment=environment
        )
        overall = self.calculate_overall_health(subsystems)
        status = self.get_health_status(overall)

        return {
            "overall": overall,
            "status": status,
            "subsystems": subsystems
        }
