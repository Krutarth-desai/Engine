"""
AeroTwin Digital Twin - Subsystem & Overall Health Index Calculator
===================================================================
Calculates deterministic health scores (0-100) for 6 core engine subsystems:
1. Thermal Subsystem
2. Combustion Subsystem
3. Lubrication Subsystem
4. Mechanical Subsystem
5. Electrical Subsystem
6. Sensor Channel & Diagnostic Consistency

Aggregates subsystem scores into an Overall Health Index using configurable weights.
"""

from typing import Dict, Any, Optional
import math


# Configurable subsystem weights summing to 1.0 (100%)
DEFAULT_HEALTH_WEIGHTS: Dict[str, float] = {
    "thermal": 0.20,
    "combustion": 0.20,
    "lubrication": 0.20,
    "mechanical": 0.20,
    "electrical": 0.10,
    "sensor": 0.10
}


def _residual_penalty_score(norm_res: float, linear_penalty: float = 12.0, deadband: float = 0.5) -> float:
    """
    Computes a 0-100 health score from a normalized residual.
    Scores 100 within nominal deadband, and drops smoothly as residual grows.
    """
    excess = max(0.0, abs(norm_res) - deadband)
    # Quadratic-linear progressive penalty
    penalty = (linear_penalty * excess) + (1.8 * (excess ** 1.8))
    return max(0.0, min(100.0, 100.0 - penalty))


class HealthIndexCalculator:
    """
    Evaluates engine subsystem health and overall airworthiness index
    based on residual vectors, subsystem degradation, and cross-channel consistency.
    """

    def __init__(self, weights: Optional[Dict[str, float]] = None):
        self.weights = weights or DEFAULT_HEALTH_WEIGHTS
        # Validate weights sum to 1.0
        total_w = sum(self.weights.values())
        if abs(total_w - 1.0) > 1e-4:
            self.weights = {k: v / total_w for k, v in self.weights.items()}

    def calculate_subsystem_health(
        self,
        telemetry: Dict[str, Any],
        residuals: Dict[str, Dict[str, float]],
        degradation: Dict[str, float]
    ) -> Dict[str, float]:
        """
        Calculates individual 0-100 health scores for the 6 monitored subsystems.
        """
        # Helper to safely retrieve normalized residual
        def get_norm_res(key: str) -> float:
            return residuals.get(key, {}).get("normalized_residual", 0.0)

        # -------------------------------------------------------------
        # 1. Cross-Sensor Consistency & Sensor Health
        # -------------------------------------------------------------
        # Evaluate residuals across primary thermodynamic sensors
        cht_norm = get_norm_res("cht_c")
        egt_norm = get_norm_res("egt_c")
        oil_t_norm = get_norm_res("oil_temperature_c")
        oil_p_norm = get_norm_res("oil_pressure_bar")
        rpm_norm = get_norm_res("rpm")
        fuel_norm = get_norm_res("fuel_flow_lh")
        vib_norm = get_norm_res("vibration_g")
        volt_norm = get_norm_res("battery_voltage_v")

        # Check for isolated sensor divergence (e.g. CHT spikes alone vs all other thermal sensors)
        is_isolated_cht_spike = (abs(cht_norm) > 2.5) and (abs(egt_norm) < 1.5) and (abs(oil_t_norm) < 1.5)
        is_isolated_oil_p_spike = (abs(oil_p_norm) > 2.5) and (abs(oil_t_norm) < 1.5) and (abs(vib_norm) < 1.5)
        
        # Sensor score drops when individual channels exhibit large unexplained discordance
        all_norm_abs = [
            abs(cht_norm), abs(egt_norm), abs(oil_t_norm),
            abs(oil_p_norm), abs(rpm_norm), abs(fuel_norm),
            abs(vib_norm), abs(volt_norm)
        ]
        
        # Check if single sensor is an extreme outlier
        max_norm = max(all_norm_abs)
        mean_other = (sum(all_norm_abs) - max_norm) / max(1, len(all_norm_abs) - 1)
        sensor_divergence = max(0.0, max_norm - (mean_other * 2.5)) if max_norm > 2.5 else 0.0

        sensor_deg = degradation.get("sensors", 0.0)
        base_sensor_score = 100.0 - (sensor_divergence * 16.0) - (sensor_deg * 40.0)
        sensor_health = max(10.0, min(100.0, base_sensor_score))

        # -------------------------------------------------------------
        # 2. Thermal Subsystem Health
        # -------------------------------------------------------------
        cht_score = _residual_penalty_score(cht_norm, linear_penalty=12.0)
        egt_score = _residual_penalty_score(egt_norm, linear_penalty=10.0)
        oil_t_score = _residual_penalty_score(oil_t_norm, linear_penalty=10.0)
        cooling_deg = degradation.get("cooling", 0.0)

        if is_isolated_cht_spike:
            # Single CHT thermocouple fault: other thermal sensors normal.
            # Engine is physically healthy; do not falsely collapse thermal health.
            thermal_score = (0.50 * egt_score) + (0.50 * oil_t_score) - (cooling_deg * 25.0)
        else:
            # Genuine thermal distress: multiple thermal sensors elevated
            thermal_score = (0.40 * cht_score) + (0.35 * egt_score) + (0.25 * oil_t_score) - (cooling_deg * 30.0)
        
        thermal_health = max(5.0, min(100.0, thermal_score))

        # -------------------------------------------------------------
        # 3. Combustion Subsystem Health
        # -------------------------------------------------------------
        rpm_score = _residual_penalty_score(rpm_norm, linear_penalty=11.0)
        fuel_score = _residual_penalty_score(fuel_norm, linear_penalty=12.0)
        timing_norm = get_norm_res("injection_timing_deg")
        timing_score = _residual_penalty_score(timing_norm, linear_penalty=10.0)
        injector_deg = degradation.get("injector", 0.0)

        comb_score = (
            (0.35 * rpm_score) +
            (0.25 * fuel_score) +
            (0.25 * egt_score) +
            (0.15 * timing_score) -
            (injector_deg * 35.0)
        )
        combustion_health = max(5.0, min(100.0, comb_score))

        # -------------------------------------------------------------
        # 4. Lubrication Subsystem Health
        # -------------------------------------------------------------
        # Oil pressure: Low pressure is far more critical than high pressure
        oil_p_penalty_mult = 16.0 if oil_p_norm < 0 else 8.0
        oil_p_score = _residual_penalty_score(oil_p_norm, linear_penalty=oil_p_penalty_mult)
        lub_deg = degradation.get("lubrication", 0.0)

        if is_isolated_oil_p_spike and oil_p_norm > 0:
            # High pressure reading without thermal/mechanical coupling
            lub_score = (0.50 * oil_p_score) + (0.50 * oil_t_score) - (lub_deg * 25.0)
        else:
            lub_score = (0.65 * oil_p_score) + (0.35 * oil_t_score) - (lub_deg * 35.0)
        
        lubrication_health = max(5.0, min(100.0, lub_score))

        # -------------------------------------------------------------
        # 5. Mechanical Subsystem Health
        # -------------------------------------------------------------
        vib_score = _residual_penalty_score(vib_norm, linear_penalty=15.0)
        mech_deg = degradation.get("mechanical", 0.0)

        mech_score = (0.75 * vib_score) + (0.25 * rpm_score) - (mech_deg * 35.0)
        mechanical_health = max(5.0, min(100.0, mech_score))

        # -------------------------------------------------------------
        # 6. Electrical Subsystem Health
        # -------------------------------------------------------------
        volt_score = _residual_penalty_score(volt_norm, linear_penalty=14.0)
        elec_deg = degradation.get("electrical", 0.0)

        elec_score = volt_score - (elec_deg * 35.0)
        electrical_health = max(5.0, min(100.0, elec_score))

        return {
            "thermal": round(thermal_health, 1),
            "combustion": round(combustion_health, 1),
            "lubrication": round(lubrication_health, 1),
            "mechanical": round(mechanical_health, 1),
            "electrical": round(electrical_health, 1),
            "sensor": round(sensor_health, 1)
        }

    def calculate_overall_health(self, subsystems: Dict[str, float]) -> float:
        """
        Computes weighted Overall Health Index on a 0-100 scale.
        """
        total_score = 0.0
        for sub, weight in self.weights.items():
            total_score += subsystems.get(sub, 100.0) * weight
        
        return round(max(0.0, min(100.0, total_score)), 1)

    def compute(
        self,
        telemetry: Dict[str, Any],
        residuals: Dict[str, Dict[str, float]],
        degradation: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        High-level calculation returning overall health and full subsystem breakdown.
        """
        subsystems = self.calculate_subsystem_health(telemetry, residuals, degradation)
        overall = self.calculate_overall_health(subsystems)
        return {
            "overall": overall,
            "subsystems": subsystems
        }
