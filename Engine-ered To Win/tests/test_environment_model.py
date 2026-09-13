"""
AeroTwin Phase 4 Automated Test Suite - Mission & Environmental Simulation
===========================================================================
Verifies the 10 core Phase 4 requirements:
1. Atmospheric Physics (ISA Sea-Level, Pressure drop, Density drop, Lapse rate)
2. Ideal Gas Law (Density altitude reduction under hot ambient temperatures)
3. Operating Condition Multi-Label Classification
4. Throttle Transient Lag Dynamics & Rapid Rate Detection
5. Flight Phase Mission Profiles (TAKEOFF, CLIMB, CRUISE, LOITER, etc.)
6. Accelerated Endurance Stress Accumulation
7. Virtual Engine Model Coupling (Expected state responds to environment)
8. Environmental Variation Alone Does NOT Trigger Engine Faults (Health > 90%, NORMAL)
9. Real Injected Faults ARE Correctly Detected in Extreme Environments
10. DigitalTwinCore Integration & Environment API Management

Usage:
    python tests/test_environment_model.py
"""

import sys
import os
import math
from typing import Dict, Any

# Ensure workspace root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from src.digital_twin.environment import (
    AtmosphericState,
    compute_atmospheric_state,
    OperatingCondition,
    classify_operating_conditions,
    ThrottleTransientModel,
    MissionPhase,
    MISSION_PROFILES,
    get_mission_profile,
    EnvironmentModel
)
from src.digital_twin.engine_model import EngineModel
from src.digital_twin.digital_twin_core import DigitalTwinCore
from src.digital_twin.state_estimator import StateEstimator
from src.digital_twin.health_index import HealthIndexCalculator
from src.fault_diagnosis.fault_fusion_engine import FaultFusionEngine


def run_test(test_num: int, title: str, test_func):
    try:
        success, detail = test_func()
        if success:
            print(f"  [PASS] Test {test_num:02d}: {title}")
            if detail:
                print(f"         {detail}")
            return True
        else:
            print(f"  [FAIL] Test {test_num:02d}: {title}")
            print(f"         Reason: {detail}")
            return False
    except Exception as e:
        print(f"  [ERROR] Test {test_num:02d}: {title}")
        print(f"          Exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_1_atmospheric_physics():
    """Verify standard sea level pressure, density, and monotonic altitude decrease."""
    sl = compute_atmospheric_state(altitude_ft=0.0, ambient_temp_c=15.0)
    if abs(sl.pressure_kpa - 101.32) > 0.1:
        return False, f"Sea level pressure mismatch: {sl.pressure_kpa} kPa (expected ~101.32)"
    if abs(sl.air_density_kg_m3 - 1.225) > 0.01:
        return False, f"Sea level air density mismatch: {sl.air_density_kg_m3} kg/m3 (expected ~1.225)"
    if abs(sl.density_ratio - 1.0) > 0.01:
        return False, f"Sea level density ratio mismatch: {sl.density_ratio}"

    # Verify monotonic drop across flight envelope
    altitudes = [0.0, 5000.0, 15000.0, 25000.0, 35000.0]
    states = [compute_atmospheric_state(alt, 15.0) for alt in altitudes]
    for i in range(len(states) - 1):
        if states[i].pressure_kpa <= states[i+1].pressure_kpa:
            return False, f"Pressure failed monotonic drop between {altitudes[i]} ft and {altitudes[i+1]} ft"
        if states[i].air_density_kg_m3 <= states[i+1].air_density_kg_m3:
            return False, f"Density failed monotonic drop between {altitudes[i]} ft and {altitudes[i+1]} ft"

    # Verify lapse rate ~1.98 °C / 1000 ft
    alt10k = compute_atmospheric_state(10000.0, 15.0)
    lapse = sl.isa_temp_c - alt10k.isa_temp_c
    if not (19.0 <= lapse <= 21.0):
        return False, f"ISA temperature lapse rate unexpected: {lapse:.2f} °C over 10k ft"

    return True, f"SL: P={sl.pressure_kpa} kPa, rho={sl.air_density_kg_m3} kg/m3. 25k ft: rho={states[3].air_density_kg_m3} kg/m3 (sigma={states[3].density_ratio})"


def test_2_temperature_ideal_gas_law():
    """Verify that hot ambient temperature reduces air density at fixed altitude."""
    cold = compute_atmospheric_state(15000.0, ambient_temp_c=-20.0)
    std = compute_atmospheric_state(15000.0, ambient_temp_c=15.0)
    hot = compute_atmospheric_state(15000.0, ambient_temp_c=45.0)

    if not (cold.air_density_kg_m3 > std.air_density_kg_m3 > hot.air_density_kg_m3):
        return False, f"Density not inversely proportional to temp: cold={cold.air_density_kg_m3}, std={std.air_density_kg_m3}, hot={hot.air_density_kg_m3}"

    if not (cold.density_ratio > std.density_ratio > hot.density_ratio):
        return False, f"Density ratio failed: cold={cold.density_ratio}, hot={hot.density_ratio}"

    return True, f"15k ft density: -20°C -> {cold.air_density_kg_m3} kg/m3, +15°C -> {std.air_density_kg_m3} kg/m3, +45°C -> {hot.air_density_kg_m3} kg/m3"


def test_3_operating_condition_classification():
    """Verify multi-label classification across various environmental operating points."""
    # Sea Level Normal
    c1, p1 = classify_operating_conditions(1000.0, 20.0, 75.0, 0.0)
    if OperatingCondition.SEA_LEVEL_NORMAL.value not in c1 or p1 != OperatingCondition.SEA_LEVEL_NORMAL.value:
        return False, f"Expected SEA_LEVEL_NORMAL, got {c1}, primary={p1}"

    # High Altitude Hot
    c2, p2 = classify_operating_conditions(18000.0, 38.0, 80.0, 0.0)
    if OperatingCondition.HIGH_ALTITUDE_HOT.value not in c2 or p2 != OperatingCondition.HIGH_ALTITUDE_HOT.value:
        return False, f"Expected HIGH_ALTITUDE_HOT, got {c2}, primary={p2}"

    # Cold Weather + Low Throttle
    c3, p3 = classify_operating_conditions(8000.0, -15.0, 35.0, 0.0)
    if OperatingCondition.COLD_WEATHER.value not in c3 or OperatingCondition.LOW_THROTTLE.value not in c3:
        return False, f"Expected COLD_WEATHER and LOW_THROTTLE, got {c3}"

    return True, f"Correctly classified: {p1}, {p2}, and {c3}"


def test_4_throttle_transient_dynamics():
    """Verify first-order exponential lag and rapid transient rate detection."""
    transient = ThrottleTransientModel(time_constant_sec=1.5, rapid_rate_threshold=15.0)
    transient.reset(initial_throttle=30.0)

    # Rapid step jump: 30% -> 90% in 0.2s dt
    step = transient.update(target_throttle=90.0, dt=0.2)
    if not step["is_transient"]:
        return False, f"Expected is_transient=True for 60% step, got {step}"
    if step["throttle_rate"] < 15.0:
        return False, f"Expected throttle_rate >= 15%/s, got {step['throttle_rate']}"

    # Step through 8 seconds to verify smooth asymptotic convergence
    for _ in range(8):
        step = transient.update(target_throttle=90.0, dt=1.0)

    if abs(step["effective_throttle"] - 90.0) > 0.1:
        return False, f"Effective throttle failed to converge: {step['effective_throttle']} (expected 90.0)"
    if step["is_transient"]:
        return False, f"is_transient should have cleared to False after convergence"

    return True, f"Lag verified: transient rate={step['throttle_rate']} %/s, converged={step['effective_throttle']}%"


def test_5_mission_profiles():
    """Verify all 7 flight phase mission profiles configure correct parameters."""
    phases = ["TAKEOFF", "CLIMB", "CRUISE", "LOITER", "HIGH_SPEED", "DESCENT", "LANDING"]
    env = EnvironmentModel()

    for p in phases:
        prof = env.set_mission_profile(p)
        if prof["phase"] != p:
            return False, f"Phase mismatch: expected {p}, got {prof['phase']}"
        if not (0.0 <= prof["throttle_target"] <= 100.0):
            return False, f"Invalid throttle in profile {p}: {prof['throttle_target']}"
        if not (0.0 <= prof["altitude_target"] <= 40000.0):
            return False, f"Invalid altitude in profile {p}: {prof['altitude_target']}"

    # Verify active state
    state = env.get_state()
    if state["mission_profile"] != "LANDING":
        return False, f"Environment state mission_profile mismatch: {state['mission_profile']}"

    return True, f"All 7 mission profiles verified. Last profile LANDING: thr={state['throttle_pct']}%, alt={state['altitude_ft']} ft"


def test_6_accelerated_endurance_stress():
    """Verify physical endurance stress accumulation under accelerated simulation speed."""
    env = EnvironmentModel(initial_altitude_ft=15000.0, initial_ambient_temp_c=35.0, initial_throttle_pct=85.0)
    env.set_simulation_speed(60.0)  # 60x accelerated (1 sec = 1 min)

    state_0 = env.get_state()
    stress_0 = state_0["endurance_stress"]

    # Run 60 update steps (representing 1 simulated hour)
    for _ in range(60):
        state = env.update(dt=1.0)

    stress_1 = state["endurance_stress"]
    if state["endurance_hours"] < 0.95:
        return False, f"Endurance hours did not accumulate properly: {state['endurance_hours']} hrs"
    if stress_1["thermal_stress"] <= stress_0["thermal_stress"]:
        return False, "Thermal stress did not accumulate"
    if stress_1["mechanical_stress"] <= stress_0["mechanical_stress"]:
        return False, "Mechanical stress did not accumulate"
    if stress_1["lubrication_stress"] <= stress_0["lubrication_stress"]:
        return False, "Lubrication stress did not accumulate"

    return True, f"Simulated {state['endurance_hours']:.2f} hrs at 60x speed: thermal_stress={stress_1['thermal_stress']:.4f}, mech={stress_1['mechanical_stress']:.4f}"


def test_7_virtual_engine_coupling():
    """Verify EngineModel expected state responds to altitude, ambient temp, and throttle."""
    em = EngineModel()
    telemetry = {
        "rpm": 2450.0, "cht_c": 142.0, "egt_c": 615.0, "oil_pressure_bar": 4.69,
        "oil_temperature_c": 92.0, "fuel_flow_lh": 17.6, "vibration_g": 1.42,
        "battery_voltage_v": 27.6, "injection_timing_deg": 23.4
    }

    # Sea Level Baseline
    sl_exp = em.predict(telemetry, environment={"altitude_ft": 0.0, "ambient_temp_c": 15.0, "throttle_pct": 75.0})
    # High Altitude Hot
    hot_exp = em.predict(telemetry, environment={"altitude_ft": 20000.0, "ambient_temp_c": 38.0, "throttle_pct": 80.0})

    if hot_exp["cht_c"] <= sl_exp["cht_c"]:
        return False, f"CHT did not rise under high altitude / hot day: SL={sl_exp['cht_c']} vs Hot={hot_exp['cht_c']}"
    if hot_exp["egt_c"] <= sl_exp["egt_c"]:
        return False, f"EGT did not rise under high altitude / hot day: SL={sl_exp['egt_c']} vs Hot={hot_exp['egt_c']}"
    if hot_exp["oil_temperature_c"] <= sl_exp["oil_temperature_c"]:
        return False, f"Oil temp did not rise: SL={sl_exp['oil_temperature_c']} vs Hot={hot_exp['oil_temperature_c']}"
    if hot_exp["rpm"] <= sl_exp["rpm"]:
        return False, f"RPM did not increase with 80% throttle: SL={sl_exp['rpm']} vs Hot={hot_exp['rpm']}"

    return True, f"Coupling verified: CHT {sl_exp['cht_c']}°C -> {hot_exp['cht_c']}°C (+{hot_exp['cht_c'] - sl_exp['cht_c']:.1f}°C), EGT {sl_exp['egt_c']}°C -> {hot_exp['egt_c']}°C"


def test_8_environment_only_no_false_alarms():
    """
    CORE SIH REQUIREMENT:
    Shifting environment to 15,000 ft and 40°C ambient with 80% throttle
    must NOT cause false degradation or false fault alarms when the engine
    is operating normally.
    Health must remain >= 90% (HEALTHY) and diagnosis must remain NORMAL.
    """
    dt = DigitalTwinCore()
    fusion = FaultFusionEngine()
    em = EngineModel()

    env_state = {"altitude_ft": 15000.0, "ambient_temp_c": 40.0, "throttle_pct": 80.0}
    exp = em.predict(telemetry={}, environment=env_state)

    # Actual telemetry matches physical expectations (healthy engine)
    telemetry = dict(exp)
    telemetry["cht_c"] += 0.4
    telemetry["egt_c"] += 0.8

    dt_payload = dt.update(
        telemetry=telemetry,
        environment=env_state,
        dt=1.0,
        scenario="Normal"
    )

    overall_health = dt_payload["health"]["overall"]
    status = dt_payload["health"]["status"]
    if overall_health < 90.0:
        return False, f"False degradation: overall_health={overall_health} (< 90.0) in hot environment"
    if status != "HEALTHY":
        return False, f"False status: expected HEALTHY, got {status}"

    diag = fusion.diagnose(
        telemetry=telemetry,
        digital_twin=dt_payload,
        anomaly={"is_anomaly": False, "score": 0.05},
        sensor_diagnosis={"diagnosis_type": "NORMAL"},
        existing_fault={"status": "Normal"},
        degradation=dt_payload["degradation"],
        subsystem_health=dt_payload["subsystem_health"],
        scenario="Normal"
    )

    if diag["fault_code"] != "NORMAL":
        return False, f"False alarm: fault_code={diag['fault_code']} (expected NORMAL)"
    if diag["state"] != "NORMAL":
        return False, f"False state: state={diag['state']} (expected NORMAL)"

    return True, f"15k ft / 40°C ambient: Health={overall_health:.1f} ({status}), Diag={diag['fault']} ({diag['state']})"


def test_9_real_fault_detection_in_extreme_environment():
    """
    CORE SIH REQUIREMENT:
    A real engine fault injected during extreme environmental conditions
    MUST still be detected cleanly, degrading health and confirming the fault.
    """
    dt = DigitalTwinCore()
    fusion = FaultFusionEngine()
    em = EngineModel()

    env_state = {"altitude_ft": 15000.0, "ambient_temp_c": 40.0, "throttle_pct": 80.0}
    exp = em.predict(telemetry={}, environment=env_state)

    # Genuine Overheating Fault: +45°C CHT, +80°C EGT on top of environmental expectation
    telemetry = dict(exp)
    telemetry["cht_c"] += 45.0
    telemetry["egt_c"] += 80.0
    telemetry["oil_temperature_c"] += 22.0

    diag = None
    dt_payload = None
    for _ in range(6):
        dt_payload = dt.update(
            telemetry=telemetry,
            environment=env_state,
            dt=1.0,
            scenario="Overheating",
            scenario_progress=1.0
        )
        diag = fusion.diagnose(
            telemetry=telemetry,
            digital_twin=dt_payload,
            anomaly={"is_anomaly": True, "score": -0.25},
            sensor_diagnosis={"diagnosis_type": "POSSIBLE_ENGINE_FAILURE", "affected_sensors": ["cht", "egt", "oil_temperature"]},
            existing_fault={"status": "Overheating", "fault": "Engine Overheating"},
            degradation=dt_payload["degradation"],
            subsystem_health=dt_payload["subsystem_health"],
            scenario="Overheating"
        )

    thermal_health = dt_payload["health"]["thermal"]
    if thermal_health >= 70.0:
        return False, f"Thermal health failed to drop under overheating: {thermal_health}"

    if diag["fault_code"] not in ["THERMAL_RUNAWAY", "OVERHEATING", "COOLING_DEGRADATION"]:
        return False, f"Fault code not recognized as thermal: {diag['fault_code']}"

    if diag["state"] not in ["CONFIRMED", "CRITICAL"]:
        return False, f"Fault not confirmed: state={diag['state']}"

    if diag["severity"] not in ["HIGH", "CRITICAL"]:
        return False, f"Severity too low: {diag['severity']}"

    return True, f"Overheating confirmed in extreme env: Thermal={thermal_health:.1f}, Fault={diag['fault']}, State={diag['state']}, Severity={diag['severity']}"


def test_10_digital_twin_core_api_and_environment():
    """Verify DigitalTwinCore environment methods and environment payload in output."""
    dt = DigitalTwinCore()

    # set_environment
    env_info = dt.set_environment(altitude_ft=12000.0, ambient_temp_c=22.0, throttle_pct=65.0)
    if env_info["altitude_ft"] != 12000.0 or env_info["throttle_pct"] != 65.0:
        return False, f"set_environment mismatch: {env_info}"

    # set_mission_profile
    prof = dt.set_mission_profile("CLIMB")
    if prof["phase"] != "CLIMB":
        return False, f"set_mission_profile mismatch: {prof}"

    # update cycle output contains environment block
    payload = dt.update(telemetry={}, dt=1.0)
    if "environment" not in payload:
        return False, "Environment block missing from DigitalTwinCore output payload"

    env_block = payload["environment"]
    req_keys = ["altitude_ft", "ambient_temp_c", "pressure_kpa", "air_density_kg_m3", "operating_conditions", "primary_condition", "mission_profile"]
    for k in req_keys:
        if k not in env_block:
            return False, f"Key '{k}' missing from environment block: {env_block.keys()}"

    return True, f"DigitalTwinCore environment methods verified. Mission={env_block['mission_profile']}, Primary={env_block['primary_condition']}"


def run_all_tests():
    print("\n" + "=" * 70)
    print("AeroTwin Phase 4 Automated Test Suite - Mission & Environmental Simulation")
    print("=" * 70 + "\n")

    tests = [
        (1, "Atmospheric Physics (ISA Pressure, Density & Monotonic Altitude)", test_1_atmospheric_physics),
        (2, "Temperature & Ideal Gas Law (Density Altitude Effect)", test_2_temperature_ideal_gas_law),
        (3, "Operating Condition Multi-Label Classification", test_3_operating_condition_classification),
        (4, "Throttle Transient Lag Dynamics & Rapid Rate Detection", test_4_throttle_transient_dynamics),
        (5, "Flight Phase Mission Profiles (7 Predefined Flight Regimes)", test_5_mission_profiles),
        (6, "Accelerated Endurance Stress Accumulation", test_6_accelerated_endurance_stress),
        (7, "Virtual Engine Model Coupling (Sensitivities & Deratings)", test_7_virtual_engine_coupling),
        (8, "Environment-Only Variation Does NOT Trigger Engine Faults", test_8_environment_only_no_false_alarms),
        (9, "Real Injected Fault Detection Under Extreme Environments", test_9_real_fault_detection_in_extreme_environment),
        (10, "DigitalTwinCore Environment Integration & API Methods", test_10_digital_twin_core_api_and_environment),
    ]

    passed_count = 0
    for num, title, func in tests:
        if run_test(num, title, func):
            passed_count += 1

    total = len(tests)
    print("=" * 70)
    print(f"PHASE 4 TEST SUMMARY: {passed_count}/{total} tests passed")
    print("=" * 70)

    if passed_count == total:
        print("[SUCCESS] All 10 Phase 4 Mission & Environmental Simulation tests passed successfully!\n")
        return 0
    else:
        print(f"[FAIL] {total - passed_count} tests failed.\n")
        return 1


if __name__ == "__main__":
    sys.exit(run_all_tests())
