"""
AeroTwin Physics-Informed Fault Diagnosis - Fault Rules & Signatures
====================================================================
Defines explainable fault signatures, physics residual thresholds,
and rule evaluation logic for the 10 major UAV piston engine faults:

1. INJECTOR_DEGRADATION ("Injector Degradation")
2. MISFIRE ("Misfire")
3. LUBRICATION_FAULT ("Lubrication Problem")
4. OVERHEATING ("Overheating")
5. ABNORMAL_VIBRATION ("Abnormal Vibration")
6. SENSOR_DRIFT ("Sensor Drift")
7. SENSOR_FAILURE ("Sensor Failure")
8. COMBUSTION_INSTABILITY ("Combustion Instability")
9. ELECTRICAL_ABNORMALITY ("Electrical Abnormality")
10. ENGINE_FAILURE_MULTI ("Multi-System / Engine Failure")

Maps existing simulation scenario names without breaking compatibility.
"""

from typing import Dict, Any, List, Optional
from enum import Enum


class FaultCode(str, Enum):
    NORMAL = "NORMAL"
    INJECTOR_DEGRADATION = "INJECTOR_DEGRADATION"
    MISFIRE = "MISFIRE"
    LUBRICATION_FAULT = "LUBRICATION_FAULT"
    OVERHEATING = "OVERHEATING"
    ABNORMAL_VIBRATION = "ABNORMAL_VIBRATION"
    SENSOR_DRIFT = "SENSOR_DRIFT"
    SENSOR_FAILURE = "SENSOR_FAILURE"
    COMBUSTION_INSTABILITY = "COMBUSTION_INSTABILITY"
    ELECTRICAL_ABNORMALITY = "ELECTRICAL_ABNORMALITY"
    ENGINE_FAILURE_MULTI = "ENGINE_FAILURE_MULTI"


FAULT_DISPLAY_NAMES: Dict[FaultCode, str] = {
    FaultCode.NORMAL: "Nominal Operation",
    FaultCode.INJECTOR_DEGRADATION: "Injector Degradation",
    FaultCode.MISFIRE: "Misfire",
    FaultCode.LUBRICATION_FAULT: "Lubrication Problem",
    FaultCode.OVERHEATING: "Overheating",
    FaultCode.ABNORMAL_VIBRATION: "Abnormal Vibration",
    FaultCode.SENSOR_DRIFT: "Sensor Drift",
    FaultCode.SENSOR_FAILURE: "Sensor Failure",
    FaultCode.COMBUSTION_INSTABILITY: "Combustion Instability",
    FaultCode.ELECTRICAL_ABNORMALITY: "Electrical Abnormality",
    FaultCode.ENGINE_FAILURE_MULTI: "Multi-System / Engine Failure"
}

FAULT_SUBSYSTEM_MAP: Dict[FaultCode, str] = {
    FaultCode.NORMAL: "All Systems Nominal",
    FaultCode.INJECTOR_DEGRADATION: "Combustion",
    FaultCode.MISFIRE: "Combustion",
    FaultCode.LUBRICATION_FAULT: "Lubrication",
    FaultCode.OVERHEATING: "Thermal",
    FaultCode.ABNORMAL_VIBRATION: "Mechanical",
    FaultCode.SENSOR_DRIFT: "Sensors",
    FaultCode.SENSOR_FAILURE: "Sensors",
    FaultCode.COMBUSTION_INSTABILITY: "Combustion",
    FaultCode.ELECTRICAL_ABNORMALITY: "Electrical",
    FaultCode.ENGINE_FAILURE_MULTI: "Multiple Subsystems"
}

# Compatibility mapping from existing scenario injection strings to FaultCodes
SCENARIO_TO_FAULT_MAP: Dict[str, FaultCode] = {
    "Normal": FaultCode.NORMAL,
    "Injector_Degradation": FaultCode.INJECTOR_DEGRADATION,
    "Misfire": FaultCode.MISFIRE,
    "Oil_Pressure_Loss": FaultCode.LUBRICATION_FAULT,
    "Lubrication": FaultCode.LUBRICATION_FAULT,
    "Overheating": FaultCode.OVERHEATING,
    "High_Vibration": FaultCode.ABNORMAL_VIBRATION,
    "Vibration_Fault": FaultCode.ABNORMAL_VIBRATION,
    "RPM_Drop": FaultCode.COMBUSTION_INSTABILITY,
    "Sensor_Fault_CHT": FaultCode.SENSOR_FAILURE,
    "Sensor_Fault_Temp": FaultCode.SENSOR_FAILURE,
    "Sensor_Drift": FaultCode.SENSOR_DRIFT,
    "Combustion_Instability": FaultCode.COMBUSTION_INSTABILITY,
    "Electrical_Fault": FaultCode.ELECTRICAL_ABNORMALITY,
    "Electrical_Abnormality": FaultCode.ELECTRICAL_ABNORMALITY,
    "Engine_Failure_Multi": FaultCode.ENGINE_FAILURE_MULTI
}


def _extract_residual(residuals: Dict[str, Any], key: str) -> Dict[str, float]:
    """Helper to safely retrieve residual statistics for a given channel."""
    if not residuals or key not in residuals:
        return {
            "actual": 0.0,
            "expected": 0.0,
            "residual": 0.0,
            "normalized_residual": 0.0,
            "pct_deviation": 0.0
        }
    item = residuals[key]
    if isinstance(item, dict):
        return {
            "actual": float(item.get("actual", 0.0)),
            "expected": float(item.get("expected", 0.0)),
            "residual": float(item.get("residual", 0.0)),
            "normalized_residual": float(item.get("normalized_residual", 0.0)),
            "pct_deviation": float(item.get("pct_deviation", 0.0))
        }
    return {
        "actual": float(item),
        "expected": float(item),
        "residual": 0.0,
        "normalized_residual": 0.0,
        "pct_deviation": 0.0
    }


class FaultRuleEngine:
    """
    Evaluates raw telemetry, Digital Twin residuals, subsystem health,
    and degradation wear against the 10 domain fault signatures.
    """

    def evaluate_all_rules(
        self,
        telemetry: Dict[str, Any],
        residuals: Dict[str, Any],
        subsystem_health: Dict[str, float],
        overall_health: float,
        degradation: Dict[str, float],
        sensor_diagnosis: Dict[str, Any],
        anomaly: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Evaluates candidate match scores across all 10 fault types.
        Returns a list of candidate dictionaries sorted by raw match strength.
        """
        candidates: List[Dict[str, Any]] = []

        # Extract normalized residuals & pct deviations
        r_rpm = _extract_residual(residuals, "rpm")
        r_cht = _extract_residual(residuals, "cht_c")
        r_egt = _extract_residual(residuals, "egt_c")
        r_oil_p = _extract_residual(residuals, "oil_pressure_bar")
        r_oil_t = _extract_residual(residuals, "oil_temperature_c")
        r_fuel = _extract_residual(residuals, "fuel_flow_lh")
        r_vib = _extract_residual(residuals, "vibration_g")
        r_volt = _extract_residual(residuals, "battery_voltage_v")
        r_tim = _extract_residual(residuals, "injection_timing_deg")

        # Health indices (default to 100.0)
        h_therm = subsystem_health.get("thermal", 100.0)
        h_comb = subsystem_health.get("combustion", 100.0)
        h_lub = subsystem_health.get("lubrication", 100.0)
        h_mech = subsystem_health.get("mechanical", 100.0)
        h_elec = subsystem_health.get("electrical", 100.0)
        h_sens = subsystem_health.get("sensor", 100.0)

        # Degradation wear states (default to 0.0)
        d_inj = degradation.get("injector", 0.0)
        d_lub = degradation.get("lubrication", 0.0)
        d_cool = degradation.get("cooling", 0.0)
        d_mech = degradation.get("mechanical", 0.0)
        d_elec = degradation.get("electrical", 0.0)
        d_sens = degradation.get("sensors", 0.0)

        # ML Anomaly
        is_if_anomaly = anomaly.get("is_anomaly", False)
        if_score = anomaly.get("score", 0.0)

        # Sensor Diagnosis ML
        diag_type = sensor_diagnosis.get("diagnosis_type", "NORMAL")
        suspected_sensor = sensor_diagnosis.get("suspected_sensor")
        sensor_fault_conf = sensor_diagnosis.get("sensor_fault_confidence", 0.0)
        engine_fault_conf = sensor_diagnosis.get("engine_fault_confidence", 0.0)
        sensor_scores = sensor_diagnosis.get("sensor_scores", {})

        # Count how many subsystems are significantly degraded (< 75.0)
        degraded_subsystems = [
            name for name, score in [
                ("Thermal", h_therm), ("Combustion", h_comb),
                ("Lubrication", h_lub), ("Mechanical", h_mech),
                ("Electrical", h_elec)
            ] if score < 75.0
        ]
        num_degraded = len(degraded_subsystems)

        # -----------------------------------------------------------------
        # 10. MULTI-SYSTEM / ENGINE FAILURE (Evaluated first to gauge system-wide collapse)
        # -----------------------------------------------------------------
        multi_score = 0.0
        if num_degraded >= 3 or overall_health < 45.0:
            multi_score = 0.50 + 0.12 * num_degraded + (1.0 - overall_health / 100.0) * 0.35
            if engine_fault_conf > 0.8:
                multi_score += 0.10
        elif num_degraded == 2 and overall_health < 60.0:
            multi_score = 0.35 + (1.0 - overall_health / 100.0) * 0.25

        candidates.append({
            "fault_code": FaultCode.ENGINE_FAILURE_MULTI,
            "fault_name": FAULT_DISPLAY_NAMES[FaultCode.ENGINE_FAILURE_MULTI],
            "subsystem": FAULT_SUBSYSTEM_MAP[FaultCode.ENGINE_FAILURE_MULTI],
            "raw_match": min(1.0, max(0.0, multi_score)),
            "primary_signals": {
                "degraded_subsystems_count": num_degraded,
                "overall_health": overall_health,
                "cht_residual": r_cht["residual"],
                "egt_residual": r_egt["residual"],
                "oil_pressure_residual": r_oil_p["residual"],
                "vibration_residual": r_vib["residual"]
            },
            "sensitive_sensor": None
        })

        # -----------------------------------------------------------------
        # 1. INJECTOR DEGRADATION
        # Signatures: EGT residual (+), Fuel flow residual (+),
        # RPM fluctuation, Combustion Health reduced, Injector wear state
        # -----------------------------------------------------------------
        inj_score = 0.0
        # Positive EGT and Fuel Flow deviations above model expectations
        if r_egt["pct_deviation"] > 2.0 and r_fuel["pct_deviation"] > 2.0:
            inj_score += 0.40
            inj_score += min(0.30, (r_egt["pct_deviation"] / 20.0) * 0.15 + (r_fuel["pct_deviation"] / 20.0) * 0.15)
        elif r_egt["pct_deviation"] > 2.0 or r_fuel["pct_deviation"] > 2.0:
            inj_score += 0.20

        # Subsystem health & degradation support
        if h_comb < 85.0:
            inj_score += (1.0 - h_comb / 100.0) * 0.25
        if d_inj > 0.10:
            inj_score += min(0.20, d_inj * 0.30)

        # Distinguish from general misfire: In injector degradation, fuel flow is elevated (over-fueling / nozzle wear)
        if r_fuel["residual"] > 0.4 and r_egt["residual"] > 15.0:
            inj_score += 0.10

        candidates.append({
            "fault_code": FaultCode.INJECTOR_DEGRADATION,
            "fault_name": FAULT_DISPLAY_NAMES[FaultCode.INJECTOR_DEGRADATION],
            "subsystem": FAULT_SUBSYSTEM_MAP[FaultCode.INJECTOR_DEGRADATION],
            "raw_match": min(1.0, max(0.0, inj_score)),
            "primary_signals": {
                "egt_residual": r_egt["residual"],
                "egt_pct_deviation": r_egt["pct_deviation"],
                "fuel_flow_residual": r_fuel["residual"],
                "fuel_flow_pct_deviation": r_fuel["pct_deviation"],
                "rpm_residual": r_rpm["residual"],
                "combustion_health": h_comb,
                "injector_degradation": d_inj
            },
            "sensitive_sensor": None
        })

        # -----------------------------------------------------------------
        # 2. MISFIRE
        # Signatures: RPM drop/fluctuation, EGT drop/loss of combustion,
        # Vibration rise (asymmetric cylinder torque pulse), Combustion/Mechanical drop
        # -----------------------------------------------------------------
        misfire_score = 0.0
        # In misfire, RPM is suppressed and vibration elevates due to power pulse asymmetry
        if r_rpm["residual"] < -100.0:
            misfire_score += min(0.40, abs(r_rpm["residual"]) / 500.0 * 0.40)
        if r_vib["residual"] > 0.30 or r_vib["pct_deviation"] > 20.0:
            misfire_score += 0.25

        # EGT drop is classic misfire symptom (dead/cold cylinder)
        if r_egt["residual"] < -15.0:
            misfire_score += 0.20

        if h_comb < 80.0:
            misfire_score += (1.0 - h_comb / 100.0) * 0.15

        candidates.append({
            "fault_code": FaultCode.MISFIRE,
            "fault_name": FAULT_DISPLAY_NAMES[FaultCode.MISFIRE],
            "subsystem": FAULT_SUBSYSTEM_MAP[FaultCode.MISFIRE],
            "raw_match": min(1.0, max(0.0, misfire_score)),
            "primary_signals": {
                "rpm_residual": r_rpm["residual"],
                "vibration_residual": r_vib["residual"],
                "egt_residual": r_egt["residual"],
                "combustion_health": h_comb,
                "mechanical_health": h_mech
            },
            "sensitive_sensor": None
        })

        # -----------------------------------------------------------------
        # 3. LUBRICATION PROBLEM
        # Signatures: Oil pressure below DT expectation, Oil temp above DT expectation,
        # Lubrication health reduced, Lubrication degradation accumulated
        # -----------------------------------------------------------------
        lub_score = 0.0
        if r_oil_p["residual"] < -0.25:
            # Low oil pressure relative to engine state
            lub_score += min(0.50, abs(r_oil_p["residual"]) / 2.0 * 0.50)
        if r_oil_t["residual"] > 4.0:
            # Elevated oil temp
            lub_score += min(0.25, (r_oil_t["residual"] / 20.0) * 0.25)

        if h_lub < 85.0:
            lub_score += (1.0 - h_lub / 100.0) * 0.25
        if d_lub > 0.10:
            lub_score += min(0.15, d_lub * 0.25)

        candidates.append({
            "fault_code": FaultCode.LUBRICATION_FAULT,
            "fault_name": FAULT_DISPLAY_NAMES[FaultCode.LUBRICATION_FAULT],
            "subsystem": FAULT_SUBSYSTEM_MAP[FaultCode.LUBRICATION_FAULT],
            "raw_match": min(1.0, max(0.0, lub_score)),
            "primary_signals": {
                "oil_pressure_residual": r_oil_p["residual"],
                "oil_temperature_residual": r_oil_t["residual"],
                "lubrication_health": h_lub,
                "lubrication_degradation": d_lub
            },
            "sensitive_sensor": "oil_pressure_bar"
        })

        # -----------------------------------------------------------------
        # 4. OVERHEATING
        # Signatures: Actual CHT and EGT above DT expectation,
        # Oil temp elevated, Thermal health reduced, Cooling degradation
        # -----------------------------------------------------------------
        overheat_score = 0.0
        if r_cht["residual"] > 8.0:
            overheat_score += min(0.40, (r_cht["residual"] / 40.0) * 0.40)
        if r_egt["residual"] > 20.0:
            overheat_score += min(0.25, (r_egt["residual"] / 80.0) * 0.25)
        if r_oil_t["residual"] > 5.0:
            overheat_score += 0.15

        if h_therm < 85.0:
            overheat_score += (1.0 - h_therm / 100.0) * 0.25
        if d_cool > 0.10:
            overheat_score += min(0.15, d_cool * 0.25)

        candidates.append({
            "fault_code": FaultCode.OVERHEATING,
            "fault_name": FAULT_DISPLAY_NAMES[FaultCode.OVERHEATING],
            "subsystem": FAULT_SUBSYSTEM_MAP[FaultCode.OVERHEATING],
            "raw_match": min(1.0, max(0.0, overheat_score)),
            "primary_signals": {
                "cht_residual": r_cht["residual"],
                "cht_pct_deviation": r_cht["pct_deviation"],
                "egt_residual": r_egt["residual"],
                "oil_temperature_residual": r_oil_t["residual"],
                "thermal_health": h_therm,
                "cooling_degradation": d_cool
            },
            "sensitive_sensor": "cht_c"
        })

        # -----------------------------------------------------------------
        # 5. ABNORMAL VIBRATION
        # Signatures: Vibration residual > DT expectation, Absolute vibration elevated,
        # Mechanical health reduced, Mechanical degradation
        # -----------------------------------------------------------------
        vib_score = 0.0
        if r_vib["residual"] > 0.20 or telemetry.get("vibration_g", 0.0) > 1.80:
            vib_score += min(0.60, (r_vib["residual"] / 1.0) * 0.60)
        if h_mech < 85.0:
            vib_score += (1.0 - h_mech / 100.0) * 0.25
        if d_mech > 0.10:
            vib_score += min(0.15, d_mech * 0.25)

        candidates.append({
            "fault_code": FaultCode.ABNORMAL_VIBRATION,
            "fault_name": FAULT_DISPLAY_NAMES[FaultCode.ABNORMAL_VIBRATION],
            "subsystem": FAULT_SUBSYSTEM_MAP[FaultCode.ABNORMAL_VIBRATION],
            "raw_match": min(1.0, max(0.0, vib_score)),
            "primary_signals": {
                "vibration_residual": r_vib["residual"],
                "vibration_actual": r_vib["actual"],
                "mechanical_health": h_mech,
                "mechanical_degradation": d_mech
            },
            "sensitive_sensor": "vibration_g"
        })

        # -----------------------------------------------------------------
        # 6. SENSOR DRIFT
        # Signatures: Single sensor shows steady, moderate divergence,
        # SensorDiagnosisEngine shows isolated anomaly on 1 sensor,
        # other cross-sensors stay healthy, Sensor health moderately reduced
        # -----------------------------------------------------------------
        drift_score = 0.0
        is_isolated_sensor_anomaly = (
            diag_type == "POSSIBLE_SENSOR_FAILURE" or
            (suspected_sensor and sensor_fault_conf > 0.50)
        )
        
        cht_actual = telemetry.get("cht_c") or telemetry.get("cht", 142.0)
        is_moderate_cht_drift = (25.0 <= r_cht["residual"] <= 65.0) and (r_egt["residual"] < 15.0 and r_oil_t["residual"] < 6.0)

        if is_moderate_cht_drift or (is_isolated_sensor_anomaly and sensor_fault_conf < 0.96):
            drift_score = 0.70
            if suspected_sensor:
                drift_score += 0.15
            if h_sens < 85.0:
                drift_score += (1.0 - h_sens / 100.0) * 0.15

        candidates.append({
            "fault_code": FaultCode.SENSOR_DRIFT,
            "fault_name": FAULT_DISPLAY_NAMES[FaultCode.SENSOR_DRIFT],
            "subsystem": FAULT_SUBSYSTEM_MAP[FaultCode.SENSOR_DRIFT],
            "raw_match": min(1.0, max(0.0, drift_score)),
            "primary_signals": {
                "suspected_sensor": suspected_sensor or "cht_c",
                "sensor_health": h_sens,
                "sensor_diagnosis_conf": sensor_fault_conf,
                "residual": r_cht["residual"] if is_moderate_cht_drift else 0.0
            },
            "sensitive_sensor": None
        })

        # -----------------------------------------------------------------
        # 7. SENSOR FAILURE
        # Signatures: Severe single-sensor divergence (e.g. CHT spike > 200°C),
        # SensorDiagnosisEngine classifies POSSIBLE_SENSOR_FAILURE with high confidence,
        # All independent cross-sensors remain completely healthy
        # -----------------------------------------------------------------
        sensor_fail_score = 0.0
        cht_severe_spike = (cht_actual > 210.0 or r_cht["residual"] > 60.0) and (r_egt["residual"] < 20.0 and r_oil_t["residual"] < 10.0)
        
        if diag_type == "POSSIBLE_SENSOR_FAILURE" or cht_severe_spike:
            sensor_fail_score = 0.65
            if sensor_fault_conf > 0.85:
                sensor_fail_score += 0.20
            if cht_severe_spike:
                sensor_fail_score += 0.15
            if h_sens < 60.0:
                sensor_fail_score += 0.10

        candidates.append({
            "fault_code": FaultCode.SENSOR_FAILURE,
            "fault_name": FAULT_DISPLAY_NAMES[FaultCode.SENSOR_FAILURE],
            "subsystem": FAULT_SUBSYSTEM_MAP[FaultCode.SENSOR_FAILURE],
            "raw_match": min(1.0, max(0.0, sensor_fail_score)),
            "primary_signals": {
                "suspected_sensor": suspected_sensor or ("cht_c" if cht_severe_spike else None),
                "sensor_fault_confidence": sensor_fault_conf,
                "sensor_health": h_sens,
                "cht_residual": r_cht["residual"]
            },
            "sensitive_sensor": None
        })

        # -----------------------------------------------------------------
        # 8. COMBUSTION INSTABILITY
        # Signatures: Combined RPM fluctuation + EGT fluctuation +
        # fuel flow deviation + timing deviation, combustion health reduced
        # -----------------------------------------------------------------
        comb_instab_score = 0.0
        rpm_unstable = abs(r_rpm["residual"]) > 80.0
        egt_deviated = abs(r_egt["residual"]) > 25.0
        fuel_deviated = abs(r_fuel["residual"]) > 1.0
        
        instability_indicators = sum([rpm_unstable, egt_deviated, fuel_deviated])
        if instability_indicators >= 2:
            comb_instab_score += 0.35 + 0.15 * instability_indicators
        if h_comb < 80.0:
            comb_instab_score += (1.0 - h_comb / 100.0) * 0.25

        candidates.append({
            "fault_code": FaultCode.COMBUSTION_INSTABILITY,
            "fault_name": FAULT_DISPLAY_NAMES[FaultCode.COMBUSTION_INSTABILITY],
            "subsystem": FAULT_SUBSYSTEM_MAP[FaultCode.COMBUSTION_INSTABILITY],
            "raw_match": min(1.0, max(0.0, comb_instab_score)),
            "primary_signals": {
                "rpm_residual": r_rpm["residual"],
                "egt_residual": r_egt["residual"],
                "fuel_flow_residual": r_fuel["residual"],
                "combustion_health": h_comb
            },
            "sensitive_sensor": None
        })

        # -----------------------------------------------------------------
        # 9. ELECTRICAL ABNORMALITY
        # Signatures: Bus / battery voltage residual (drop or surge),
        # Electrical health reduced, Electrical degradation
        # -----------------------------------------------------------------
        elec_score = 0.0
        volt_residual = r_volt["residual"]
        volt_actual = r_volt["actual"]
        
        # Nominal is 27.6 V; caution below 25.0 V or above 29.5 V
        if abs(volt_residual) > 1.5 or (volt_actual < 25.5 or volt_actual > 29.2):
            elec_score += min(0.60, (abs(volt_residual) / 3.0) * 0.60)
        if h_elec < 85.0:
            elec_score += (1.0 - h_elec / 100.0) * 0.25
        if d_elec > 0.10:
            elec_score += min(0.15, d_elec * 0.25)

        candidates.append({
            "fault_code": FaultCode.ELECTRICAL_ABNORMALITY,
            "fault_name": FAULT_DISPLAY_NAMES[FaultCode.ELECTRICAL_ABNORMALITY],
            "subsystem": FAULT_SUBSYSTEM_MAP[FaultCode.ELECTRICAL_ABNORMALITY],
            "raw_match": min(1.0, max(0.0, elec_score)),
            "primary_signals": {
                "battery_voltage_residual": volt_residual,
                "battery_voltage_actual": volt_actual,
                "electrical_health": h_elec,
                "electrical_degradation": d_elec
            },
            "sensitive_sensor": "battery_voltage_v"
        })

        # -----------------------------------------------------------------
        # NORMAL OPERATION
        # -----------------------------------------------------------------
        norm_score = 0.0
        if overall_health >= 90.0 and not is_if_anomaly and diag_type == "NORMAL":
            norm_score = (overall_health / 100.0) * 0.98
        elif overall_health >= 85.0 and diag_type == "NORMAL":
            norm_score = 0.85
        elif overall_health >= 75.0:
            norm_score = 0.50

        candidates.append({
            "fault_code": FaultCode.NORMAL,
            "fault_name": FAULT_DISPLAY_NAMES[FaultCode.NORMAL],
            "subsystem": FAULT_SUBSYSTEM_MAP[FaultCode.NORMAL],
            "raw_match": min(1.0, max(0.0, norm_score)),
            "primary_signals": {
                "overall_health": overall_health
            },
            "sensitive_sensor": None
        })

        # Sort descending by raw match
        candidates.sort(key=lambda c: c["raw_match"], reverse=True)
        return candidates
