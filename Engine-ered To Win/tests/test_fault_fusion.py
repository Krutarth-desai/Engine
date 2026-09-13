"""
AeroTwin Phase 3 Automated Test Suite - Physics-Informed AI Fault Diagnosis & Sensor Fusion
==========================================================================================
Verifies the 15 core Phase 3 requirements:
1. Normal Engine Operation (NORMAL state, high confidence in nominal)
2. Injector Degradation diagnosis (Combustion subsystem, EGT + Fuel Flow residuals)
3. Misfire diagnosis (RPM drop + vibration rise + combustion health)
4. Lubrication Problem diagnosis (Low oil pressure + high oil temp residuals)
5. Overheating diagnosis (CHT + EGT residuals, thermal health degradation)
6. Abnormal Vibration diagnosis (Vibration residual, mechanical health)
7. Sensor Drift diagnosis (Moderate single sensor bias, cross-sensors healthy)
8. Sensor Failure Isolation (CHT spike diagnosed as sensor fault without declaring engine overheating)
9. Combustion Instability diagnosis (Multi-signal oscillation)
10. Electrical Abnormality diagnosis (Bus/battery voltage deviation)
11. Multi-System / Engine Failure (Multiple degraded subsystems, CRITICAL severity)
12. Fault State Machine Reset & Recovery (Transitions back to NORMAL)
13. Confidence Boundedness & Determinism (0.0 <= conf <= 1.0, repeatable)
14. Severity Consistency with Health & Degradation (Calibrated severity scale)
15. Temporal Persistence Confirmation (ANOMALY -> SUSPECTED -> CONFIRMED progression)

Usage:
    python tests/test_fault_fusion.py
"""

import sys
import os

# Ensure workspace root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from src.digital_twin import DigitalTwinCore
from src.fault_diagnosis import (
    FaultFusionEngine,
    FaultCode,
    FaultState,
    SeverityLevel,
    FAULT_DISPLAY_NAMES
)


def get_nominal_telemetry():
    """Returns baseline cruise telemetry matching Rotax nominal cruise."""
    return {
        "rpm": 2450.0,
        "cht_c": 142.0,
        "egt_c": 615.0,
        "oil_pressure_bar": 4.69,
        "oil_temperature_c": 92.0,
        "fuel_flow_lh": 17.6,
        "vibration_g": 1.42,
        "battery_voltage_v": 27.6,
        "injection_timing_deg": 23.4,
        "throttle_pct": 75.0,
        "altitude_ft": 15000.0,
        "ambient_temp_c": 15.0,
        "health_index": 100.0
    }


def get_nominal_sensor_diagnosis():
    """Returns baseline healthy sensor diagnosis output."""
    return {
        "diagnosis_type": "NORMAL",
        "sensor_fault_confidence": 0.0,
        "engine_fault_confidence": 0.0,
        "suspected_sensor": None,
        "affected_sensors": [],
        "sensor_scores": {
            "rpm": 0.2, "cht_c": 0.3, "egt_c": 0.2,
            "oil_pressure_bar": 0.3, "oil_temperature_c": 0.2,
            "fuel_flow_lh": 0.1, "vibration_g": 0.2
        },
        "evidence": "All engine sensors operating within expected cross-predictions.",
        "persistence_count": 0
    }


def run_test(num: int, title: str, test_func):
    """Test runner helper reporting clean PASS / FAIL."""
    print("=" * 70)
    print(f"TEST {num}: {title}")
    print("=" * 70)
    try:
        passed, details = test_func()
        result_str = "[PASS]" if passed else "[FAIL]"
        print(f"  Result:  {result_str}")
        print(f"  Details: {details}\n")
        return passed
    except Exception as e:
        print(f"  Result:  [ERROR] Exception occurred: {e}\n")
        return False


# -------------------------------------------------------------------------
# Test 1: Normal Engine Operation
# -------------------------------------------------------------------------
def test_1_normal():
    dt = DigitalTwinCore()
    engine = FaultFusionEngine()
    tel = get_nominal_telemetry()
    env = {"throttle_pct": 75.0, "altitude_ft": 15000.0, "ambient_temp_c": 15.0}
    diag_sd = get_nominal_sensor_diagnosis()
    
    dt_out = dt.update(tel, env, dt=1.0, scenario="Normal", sensor_diagnosis=diag_sd)
    res = engine.diagnose(
        telemetry=tel,
        digital_twin=dt_out,
        anomaly={"is_anomaly": False, "score": 0.12},
        sensor_diagnosis=diag_sd,
        scenario="Normal"
    )
    
    passed = (
        res["fault_code"] == "NORMAL" and
        res["confidence"] >= 0.85 and
        res["severity"] == "INFO" and
        res["state"] == "NORMAL"
    )
    details = f"Fault: {res['fault']}, State: {res['state']}, Conf: {res['confidence']:.2%}, Severity: {res['severity']}"
    return passed, details


# -------------------------------------------------------------------------
# Test 2: Injector Degradation
# -------------------------------------------------------------------------
def test_2_injector_degradation():
    dt = DigitalTwinCore()
    engine = FaultFusionEngine()
    env = {"throttle_pct": 75.0, "altitude_ft": 15000.0, "ambient_temp_c": 15.0}
    diag_sd = get_nominal_sensor_diagnosis()

    # Apply 5 ticks to confirm
    for tick in range(1, 6):
        tel = get_nominal_telemetry()
        # Elevated fuel flow (+2.5 L/h) and elevated EGT (+55 °C)
        tel["fuel_flow_lh"] += 2.5
        tel["egt_c"] += 55.0
        dt.set_degradation("injector", 0.40)
        
        dt_out = dt.update(tel, env, dt=1.0, scenario="Injector_Degradation", scenario_progress=1.0, sensor_diagnosis=diag_sd)
        res = engine.diagnose(
            telemetry=tel,
            digital_twin=dt_out,
            anomaly={"is_anomaly": True, "score": -0.15},
            sensor_diagnosis=diag_sd,
            scenario="Injector_Degradation"
        )

    passed = (
        res["fault_code"] == "INJECTOR_DEGRADATION" and
        res["affected_subsystem"] == "Combustion" and
        res["state"] == "CONFIRMED" and
        res["confidence"] > 0.70 and
        len(res["evidence"]) >= 3
    )
    details = f"Fault: {res['fault']}, Conf: {res['confidence']:.2%}, Subsystem: {res['affected_subsystem']}, State: {res['state']}"
    return passed, details


# -------------------------------------------------------------------------
# Test 3: Misfire
# -------------------------------------------------------------------------
def test_3_misfire():
    dt = DigitalTwinCore()
    engine = FaultFusionEngine()
    env = {"throttle_pct": 75.0, "altitude_ft": 15000.0, "ambient_temp_c": 15.0}
    diag_sd = get_nominal_sensor_diagnosis()

    for tick in range(1, 6):
        tel = get_nominal_telemetry()
        # RPM drops by 320, vibration rises by 0.75g, cold cylinder drops EGT
        tel["rpm"] -= 320.0
        tel["vibration_g"] += 0.75
        tel["egt_c"] -= 40.0
        
        dt_out = dt.update(tel, env, dt=1.0, scenario="Misfire", scenario_progress=1.0, sensor_diagnosis=diag_sd)
        res = engine.diagnose(
            telemetry=tel,
            digital_twin=dt_out,
            anomaly={"is_anomaly": True, "score": -0.22},
            sensor_diagnosis=diag_sd,
            scenario="Misfire"
        )

    passed = (
        res["fault_code"] == "MISFIRE" and
        res["state"] == "CONFIRMED" and
        res["confidence"] > 0.70
    )
    details = f"Fault: {res['fault']}, State: {res['state']}, Conf: {res['confidence']:.2%}, Evidence count: {len(res['evidence'])}"
    return passed, details


# -------------------------------------------------------------------------
# Test 4: Lubrication Fault
# -------------------------------------------------------------------------
def test_4_lubrication():
    dt = DigitalTwinCore()
    engine = FaultFusionEngine()
    env = {"throttle_pct": 75.0, "altitude_ft": 15000.0, "ambient_temp_c": 15.0}
    diag_sd = get_nominal_sensor_diagnosis()

    for tick in range(1, 6):
        tel = get_nominal_telemetry()
        # Oil pressure drop (-2.0 bar) and oil temp increase (+22 °C)
        tel["oil_pressure_bar"] -= 2.0
        tel["oil_temperature_c"] += 22.0
        dt.set_degradation("lubrication", 0.50)
        
        dt_out = dt.update(tel, env, dt=1.0, scenario="Oil_Pressure_Loss", scenario_progress=1.0, sensor_diagnosis=diag_sd)
        res = engine.diagnose(
            telemetry=tel,
            digital_twin=dt_out,
            anomaly={"is_anomaly": True, "score": -0.19},
            sensor_diagnosis=diag_sd,
            scenario="Oil_Pressure_Loss"
        )

    passed = (
        res["fault_code"] == "LUBRICATION_FAULT" and
        res["affected_subsystem"] == "Lubrication" and
        res["state"] == "CONFIRMED" and
        res["confidence"] > 0.75
    )
    details = f"Fault: {res['fault']}, Subsystem: {res['affected_subsystem']}, Conf: {res['confidence']:.2%}"
    return passed, details


# -------------------------------------------------------------------------
# Test 5: Overheating Fault
# -------------------------------------------------------------------------
def test_5_overheating():
    dt = DigitalTwinCore()
    engine = FaultFusionEngine()
    env = {"throttle_pct": 75.0, "altitude_ft": 15000.0, "ambient_temp_c": 15.0}
    diag_sd = {
        "diagnosis_type": "POSSIBLE_ENGINE_FAILURE",
        "sensor_fault_confidence": 0.05,
        "engine_fault_confidence": 0.95,
        "suspected_sensor": None,
        "affected_sensors": ["cht_c", "egt_c", "oil_temperature_c"],
        "sensor_scores": {"cht_c": 6.8, "egt_c": 8.2, "oil_temperature_c": 5.1}
    }

    for tick in range(1, 6):
        tel = get_nominal_telemetry()
        tel["cht_c"] += 45.0
        tel["egt_c"] += 80.0
        tel["oil_temperature_c"] += 18.0
        dt.set_degradation("cooling", 0.45)
        
        dt_out = dt.update(tel, env, dt=1.0, scenario="Overheating", scenario_progress=1.0, sensor_diagnosis=diag_sd)
        res = engine.diagnose(
            telemetry=tel,
            digital_twin=dt_out,
            anomaly={"is_anomaly": True, "score": -0.25},
            sensor_diagnosis=diag_sd,
            scenario="Overheating"
        )

    passed = (
        res["fault_code"] == "OVERHEATING" and
        res["affected_subsystem"] == "Thermal" and
        res["state"] == "CONFIRMED" and
        res["confidence"] > 0.80
    )
    details = f"Fault: {res['fault']}, Thermal Health: {dt_out['health']['thermal']}%, Conf: {res['confidence']:.2%}"
    return passed, details


# -------------------------------------------------------------------------
# Test 6: Abnormal Vibration Fault
# -------------------------------------------------------------------------
def test_6_vibration():
    dt = DigitalTwinCore()
    engine = FaultFusionEngine()
    env = {"throttle_pct": 75.0, "altitude_ft": 15000.0, "ambient_temp_c": 15.0}
    diag_sd = get_nominal_sensor_diagnosis()

    for tick in range(1, 6):
        tel = get_nominal_telemetry()
        tel["vibration_g"] += 1.20
        dt.set_degradation("mechanical", 0.40)
        
        dt_out = dt.update(tel, env, dt=1.0, scenario="High_Vibration", scenario_progress=1.0, sensor_diagnosis=diag_sd)
        res = engine.diagnose(
            telemetry=tel,
            digital_twin=dt_out,
            anomaly={"is_anomaly": True, "score": -0.18},
            sensor_diagnosis=diag_sd,
            scenario="High_Vibration"
        )

    passed = (
        res["fault_code"] == "ABNORMAL_VIBRATION" and
        res["affected_subsystem"] == "Mechanical" and
        res["state"] == "CONFIRMED" and
        res["confidence"] > 0.70
    )
    details = f"Fault: {res['fault']}, Mechanical Health: {dt_out['health']['mechanical']}%, Conf: {res['confidence']:.2%}"
    return passed, details


# -------------------------------------------------------------------------
# Test 7: Sensor Drift
# -------------------------------------------------------------------------
def test_7_sensor_drift():
    dt = DigitalTwinCore()
    engine = FaultFusionEngine()
    env = {"throttle_pct": 75.0, "altitude_ft": 15000.0, "ambient_temp_c": 15.0}
    diag_sd = {
        "diagnosis_type": "POSSIBLE_SENSOR_FAILURE",
        "sensor_fault_confidence": 0.75,
        "engine_fault_confidence": 0.05,
        "suspected_sensor": "cht_c",
        "affected_sensors": ["cht_c"],
        "sensor_scores": {"cht_c": 3.8, "egt_c": 0.3, "oil_temperature_c": 0.4}
    }

    for tick in range(1, 6):
        tel = get_nominal_telemetry()
        tel["cht_c"] += 35.0  # Moderate drift on CHT
        
        dt_out = dt.update(tel, env, dt=1.0, scenario="Sensor_Drift", scenario_progress=1.0, sensor_diagnosis=diag_sd)
        res = engine.diagnose(
            telemetry=tel,
            digital_twin=dt_out,
            anomaly={"is_anomaly": True, "score": -0.09},
            sensor_diagnosis=diag_sd,
            scenario="Sensor_Drift"
        )

    passed = (
        res["fault_code"] in ("SENSOR_DRIFT", "SENSOR_FAILURE") and
        res["affected_subsystem"] == "Sensors" and
        res["is_sensor_fault"] is True and
        res["suspected_sensor"] == "cht_c"
    )
    details = f"Fault: {res['fault']}, Suspected: {res['suspected_sensor']}, Subsystem: {res['affected_subsystem']}"
    return passed, details


# -------------------------------------------------------------------------
# Test 8: Sensor Failure Isolation (CHT spike vs Overheating)
# -------------------------------------------------------------------------
def test_8_sensor_failure_isolation():
    """
    CRITICAL REQUIREMENT #16:
    When CHT sensor spikes wildly (230 °C) but EGT, Oil Temp, Oil P, and RPM
    remain perfectly nominal, the system MUST diagnose SENSOR FAILURE rather
    than Engine Overheating, suppressing the false engine alarm!
    """
    dt = DigitalTwinCore()
    engine = FaultFusionEngine()
    env = {"throttle_pct": 75.0, "altitude_ft": 15000.0, "ambient_temp_c": 15.0}
    diag_sd = {
        "diagnosis_type": "POSSIBLE_SENSOR_FAILURE",
        "sensor_fault_confidence": 0.98,
        "engine_fault_confidence": 0.02,
        "suspected_sensor": "cht_c",
        "affected_sensors": ["cht_c"],
        "sensor_scores": {"cht_c": 12.5, "egt_c": 0.2, "oil_temperature_c": 0.3, "rpm": 0.1}
    }

    for tick in range(1, 6):
        tel = get_nominal_telemetry()
        # Thermocouple hardware failure: CHT reading spikes to 232 °C while engine is completely fine
        tel["cht_c"] = 232.0
        
        dt_out = dt.update(tel, env, dt=1.0, scenario="Sensor_Fault_CHT", scenario_progress=1.0, sensor_diagnosis=diag_sd)
        res = engine.diagnose(
            telemetry=tel,
            digital_twin=dt_out,
            anomaly={"is_anomaly": True, "score": -0.20},
            sensor_diagnosis=diag_sd,
            scenario="Sensor_Fault_CHT"
        )

    # Primary diagnosis MUST be Sensor Failure
    # Engine Overheating MUST be heavily suppressed or alternative
    is_sensor_favored = res["fault_code"] == "SENSOR_FAILURE"
    overheating_conf = 0.0
    for alt in res["alternative_faults"]:
        if alt["fault_code"] == "OVERHEATING":
            overheating_conf = alt["confidence"]

    passed = (
        is_sensor_favored and
        res["confidence"] > 0.85 and
        overheating_conf < 0.35 and
        res["suspected_sensor"] == "cht_c" and
        res["severity"] in ("LOW", "MEDIUM")  # Sensor fault doesn't trigger emergency engine directive
    )
    details = (
        f"Primary Fault: {res['fault']} (Conf: {res['confidence']:.2%}), "
        f"Overheating Conf: {overheating_conf:.2%}, Severity: {res['severity']}"
    )
    return passed, details


# -------------------------------------------------------------------------
# Test 9: Combustion Instability
# -------------------------------------------------------------------------
def test_9_combustion_instability():
    dt = DigitalTwinCore()
    engine = FaultFusionEngine()
    env = {"throttle_pct": 75.0, "altitude_ft": 15000.0, "ambient_temp_c": 15.0}
    diag_sd = get_nominal_sensor_diagnosis()

    for tick in range(1, 6):
        tel = get_nominal_telemetry()
        tel["rpm"] -= 150.0
        tel["egt_c"] += 35.0
        tel["fuel_flow_lh"] += 1.8
        
        dt_out = dt.update(tel, env, dt=1.0, scenario="Combustion_Instability", scenario_progress=1.0, sensor_diagnosis=diag_sd)
        res = engine.diagnose(
            telemetry=tel,
            digital_twin=dt_out,
            anomaly={"is_anomaly": True, "score": -0.16},
            sensor_diagnosis=diag_sd,
            scenario="Combustion_Instability"
        )

    passed = (
        res["fault_code"] in ("COMBUSTION_INSTABILITY", "INJECTOR_DEGRADATION") and
        res["affected_subsystem"] == "Combustion" and
        res["confidence"] > 0.60
    )
    details = f"Fault: {res['fault']}, Subsystem: {res['affected_subsystem']}, Conf: {res['confidence']:.2%}"
    return passed, details


# -------------------------------------------------------------------------
# Test 10: Electrical Abnormality
# -------------------------------------------------------------------------
def test_10_electrical_abnormality():
    dt = DigitalTwinCore()
    engine = FaultFusionEngine()
    env = {"throttle_pct": 75.0, "altitude_ft": 15000.0, "ambient_temp_c": 15.0}
    diag_sd = get_nominal_sensor_diagnosis()

    for tick in range(1, 6):
        tel = get_nominal_telemetry()
        tel["battery_voltage_v"] = 23.8  # Drop into alert threshold
        dt.set_degradation("electrical", 0.45)
        
        dt_out = dt.update(tel, env, dt=1.0, scenario="Electrical_Fault", scenario_progress=1.0, sensor_diagnosis=diag_sd)
        res = engine.diagnose(
            telemetry=tel,
            digital_twin=dt_out,
            anomaly={"is_anomaly": True, "score": -0.14},
            sensor_diagnosis=diag_sd,
            scenario="Electrical_Fault"
        )

    passed = (
        res["fault_code"] == "ELECTRICAL_ABNORMALITY" and
        res["affected_subsystem"] == "Electrical" and
        res["confidence"] > 0.65
    )
    details = f"Fault: {res['fault']}, Subsystem: {res['affected_subsystem']}, Conf: {res['confidence']:.2%}"
    return passed, details


# -------------------------------------------------------------------------
# Test 11: Multi-System / Engine Failure
# -------------------------------------------------------------------------
def test_11_multi_system_failure():
    dt = DigitalTwinCore()
    engine = FaultFusionEngine()
    env = {"throttle_pct": 75.0, "altitude_ft": 15000.0, "ambient_temp_c": 15.0}
    diag_sd = {
        "diagnosis_type": "POSSIBLE_ENGINE_FAILURE",
        "sensor_fault_confidence": 0.02,
        "engine_fault_confidence": 0.98,
        "suspected_sensor": None,
        "affected_sensors": ["rpm", "cht_c", "egt_c", "oil_pressure_bar", "oil_temperature_c", "vibration_g"],
        "sensor_scores": {s: 7.5 for s in ["rpm", "cht_c", "egt_c", "oil_pressure_bar", "oil_temperature_c", "vibration_g"]}
    }

    for tick in range(1, 6):
        tel = get_nominal_telemetry()
        tel["rpm"] -= 600.0
        tel["cht_c"] += 60.0
        tel["egt_c"] += 110.0
        tel["oil_pressure_bar"] -= 2.6
        tel["oil_temperature_c"] += 30.0
        tel["vibration_g"] += 1.40
        dt.set_degradation("cooling", 0.70)
        dt.set_degradation("lubrication", 0.75)
        dt.set_degradation("mechanical", 0.65)
        
        dt_out = dt.update(tel, env, dt=1.0, scenario="Engine_Failure_Multi", scenario_progress=1.0, sensor_diagnosis=diag_sd)
        res = engine.diagnose(
            telemetry=tel,
            digital_twin=dt_out,
            anomaly={"is_anomaly": True, "score": -0.32},
            sensor_diagnosis=diag_sd,
            scenario="Engine_Failure_Multi"
        )

    passed = (
        res["fault_code"] == "ENGINE_FAILURE_MULTI" and
        res["severity"] == "CRITICAL" and
        res["state"] in ("CONFIRMED", "CRITICAL") and
        res["confidence"] > 0.85
    )
    details = f"Fault: {res['fault']}, Severity: {res['severity']}, State: {res['state']}, Conf: {res['confidence']:.2%}"
    return passed, details


# -------------------------------------------------------------------------
# Test 12: Fault Reset & Recovery
# -------------------------------------------------------------------------
def test_12_reset_and_recovery():
    dt = DigitalTwinCore()
    engine = FaultFusionEngine()
    env = {"throttle_pct": 75.0, "altitude_ft": 15000.0, "ambient_temp_c": 15.0}
    diag_sd = get_nominal_sensor_diagnosis()

    # 1. Drive into confirmed fault
    for _ in range(5):
        tel = get_nominal_telemetry()
        tel["cht_c"] += 45.0
        tel["egt_c"] += 70.0
        dt_out = dt.update(tel, env, dt=1.0, scenario="Overheating", sensor_diagnosis=diag_sd)
        engine.diagnose(tel, dt_out, {"is_anomaly": True, "score": -0.2}, diag_sd)
    
    assert engine.current_state in (FaultState.CONFIRMED, FaultState.CRITICAL)

    # 2. Reset engine (as occurs when user resets scenario)
    engine.reset()
    dt.reset_degradation()

    # 3. Feed nominal tick
    nom_tel = get_nominal_telemetry()
    dt_out_nom = dt.update(nom_tel, env, dt=1.0, scenario="Normal", sensor_diagnosis=diag_sd)
    res = engine.diagnose(nom_tel, dt_out_nom, {"is_anomaly": False, "score": 0.10}, diag_sd, scenario="Normal")

    passed = (
        res["fault_code"] == "NORMAL" and
        res["state"] == "NORMAL" and
        engine.consecutive_fault_ticks == 0
    )
    details = f"Post-reset State: {res['state']}, Fault: {res['fault']}, Consecutive Fault Ticks: {engine.consecutive_fault_ticks}"
    return passed, details


# -------------------------------------------------------------------------
# Test 13: Confidence Bounds & Determinism
# -------------------------------------------------------------------------
def test_13_confidence_bounds_and_determinism():
    dt = DigitalTwinCore()
    engine = FaultFusionEngine()
    env = {"throttle_pct": 75.0, "altitude_ft": 15000.0, "ambient_temp_c": 15.0}
    diag_sd = get_nominal_sensor_diagnosis()
    tel = get_nominal_telemetry()
    tel["egt_c"] += 30.0
    tel["fuel_flow_lh"] += 1.5

    dt_out = dt.update(tel, env, dt=1.0, scenario="Injector_Degradation", sensor_diagnosis=diag_sd)
    
    # Run twice with identical inputs
    res1 = engine.diagnose(tel, dt_out, {"is_anomaly": True, "score": -0.10}, diag_sd)
    res2 = engine.diagnose(tel, dt_out, {"is_anomaly": True, "score": -0.10}, diag_sd)

    conf1 = res1["confidence"]
    conf2 = res2["confidence"]

    is_bounded = 0.0 <= conf1 <= 1.0
    is_deterministic = (conf1 == conf2)

    passed = is_bounded and is_deterministic
    details = f"Conf1: {conf1:.4f}, Conf2: {conf2:.4f}, Bounded [0, 1]: {is_bounded}, Deterministic: {is_deterministic}"
    return passed, details


# -------------------------------------------------------------------------
# Test 14: Severity Consistency with Health & Degradation
# -------------------------------------------------------------------------
def test_14_severity_consistency():
    dt = DigitalTwinCore()
    engine = FaultFusionEngine()
    env = {"throttle_pct": 75.0, "altitude_ft": 15000.0, "ambient_temp_c": 15.0}
    diag_sd = get_nominal_sensor_diagnosis()

    # Mild overheating: should be MEDIUM or LOW
    tel_mild = get_nominal_telemetry()
    tel_mild["cht_c"] += 12.0
    dt_mild = dt.update(tel_mild, env, dt=1.0, scenario="Overheating", sensor_diagnosis=diag_sd)
    res_mild = engine.diagnose(tel_mild, dt_mild, {"is_anomaly": True, "score": -0.06}, diag_sd)

    # Severe overheating: should be HIGH or CRITICAL
    tel_sev = get_nominal_telemetry()
    tel_sev["cht_c"] += 55.0
    tel_sev["egt_c"] += 90.0
    dt.set_degradation("cooling", 0.60)
    dt_sev = dt.update(tel_sev, env, dt=1.0, scenario="Overheating", sensor_diagnosis=diag_sd)
    res_sev = engine.diagnose(tel_sev, dt_sev, {"is_anomaly": True, "score": -0.28}, diag_sd)

    passed = (
        res_mild["severity"] in ("LOW", "MEDIUM") and
        res_sev["severity"] in ("HIGH", "CRITICAL")
    )
    details = f"Mild Overheating Severity: {res_mild['severity']}, Severe Overheating Severity: {res_sev['severity']}"
    return passed, details


# -------------------------------------------------------------------------
# Test 15: Temporal Persistence Progression
# -------------------------------------------------------------------------
def test_15_temporal_persistence():
    """
    Requirement 18 & 19:
    1 tick -> ANOMALY
    3 ticks -> SUSPECTED
    5 ticks -> CONFIRMED
    """
    dt = DigitalTwinCore()
    engine = FaultFusionEngine()
    env = {"throttle_pct": 75.0, "altitude_ft": 15000.0, "ambient_temp_c": 15.0}
    diag_sd = get_nominal_sensor_diagnosis()

    states = []
    for tick in range(1, 6):
        tel = get_nominal_telemetry()
        tel["fuel_flow_lh"] += 3.0
        tel["egt_c"] += 60.0
        dt_out = dt.update(tel, env, dt=1.0, scenario="Injector_Degradation", sensor_diagnosis=diag_sd)
        res = engine.diagnose(tel, dt_out, {"is_anomaly": True, "score": -0.15}, diag_sd)
        states.append(res["state"])

    # Expect tick 1 to be ANOMALY, tick 3 to be SUSPECTED, tick 5 to be CONFIRMED
    t1_state = states[0]
    t3_state = states[2]
    t5_state = states[4]

    passed = (
        t1_state == "ANOMALY" and
        t3_state == "SUSPECTED" and
        t5_state == "CONFIRMED"
    )
    details = f"Tick 1: {t1_state}, Tick 2: {states[1]}, Tick 3: {t3_state}, Tick 4: {states[3]}, Tick 5: {t5_state}"
    return passed, details


def run_all_tests():
    print("\n" + "=" * 70)
    print("AeroTwin Phase 3 Automated Test Suite - Fault Diagnosis & Fusion")
    print("=" * 70 + "\n")

    tests = [
        (1, "Normal Engine Operation", test_1_normal),
        (2, "Injector Degradation Diagnosis", test_2_injector_degradation),
        (3, "Misfire Diagnosis", test_3_misfire),
        (4, "Lubrication Problem Diagnosis", test_4_lubrication),
        (5, "Overheating Diagnosis", test_5_overheating),
        (6, "Abnormal Vibration Diagnosis", test_6_vibration),
        (7, "Sensor Drift Diagnosis", test_7_sensor_drift),
        (8, "Sensor Failure Isolation (CHT vs Overheating)", test_8_sensor_failure_isolation),
        (9, "Combustion Instability Diagnosis", test_9_combustion_instability),
        (10, "Electrical Abnormality Diagnosis", test_10_electrical_abnormality),
        (11, "Multi-System / Engine Failure", test_11_multi_system_failure),
        (12, "Fault State Machine Reset & Recovery", test_12_reset_and_recovery),
        (13, "Confidence Bounds & Determinism", test_13_confidence_bounds_and_determinism),
        (14, "Severity Consistency with Health & Degradation", test_14_severity_consistency),
        (15, "Temporal Persistence Progression", test_15_temporal_persistence),
    ]

    passed_count = 0
    for num, title, func in tests:
        if run_test(num, title, func):
            passed_count += 1

    total = len(tests)
    print("=" * 70)
    print(f"PHASE 3 TEST SUMMARY: {passed_count}/{total} tests passed")
    print("=" * 70)

    if passed_count == total:
        print("[SUCCESS] All 15 Phase 3 Fault Diagnosis & Fusion tests passed successfully!\n")
        return 0
    else:
        print(f"[FAIL] {total - passed_count} tests failed.\n")
        return 1


if __name__ == "__main__":
    sys.exit(run_all_tests())
