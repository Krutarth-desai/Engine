"""
AeroTwin Phase 2 Automated Test Suite - Subsystem Health Index & Degradation Model
==================================================================================
Verifies the 12 core Phase 2 requirements:
1. Normal engine operation (health close to 100, status HEALTHY)
2. Mild injector degradation (20% wear reduces combustion health moderately)
3. Severe injector degradation (80% wear reduces combustion health significantly)
4. Lubrication fault (low oil pressure / high oil temp degrades lubrication health)
5. Overheating fault (high CHT / EGT degrades thermal health)
6. Vibration fault (elevated dynamic vibration degrades mechanical health)
7. Sensor failure isolation (sensor fault flags sensor health without collapsing engine)
8. Multi-system engine failure (simultaneous thermal, hydraulic, and mechanical degradation)
9. Reset verification (reset restores nominal health baseline)
10. Health index numerical bounds (all health scores strictly within [0, 100])
11. Degradation numerical bounds (all degradation states strictly within [0, 1])
12. Configurable weights verification (overall index strictly matches configured weights)

Usage:
    python tests/test_health_index.py
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

from src.digital_twin import (
    DigitalTwinCore,
    EngineModel,
    DegradationModel,
    StateEstimator,
    HealthIndexCalculator,
    DEFAULT_HEALTH_WEIGHTS,
    DEFAULT_STATUS_THRESHOLDS
)


def get_nominal_telemetry():
    """Returns baseline cruise telemetry matching Rotax 914/915 nominal cruise."""
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
        "ambient_temp_c": 15.0
    }


def run_test(num: int, title: str, fn):
    """Test runner helper with formatted output."""
    print(f"\n{'='*70}")
    print(f"TEST {num}: {title}")
    print(f"{'='*70}")
    try:
        passed, details = fn()
        status = "[PASS]" if passed else "[FAIL]"
        print(f"  Result:  {status}")
        print(f"  Details: {details}")
        return passed
    except Exception as e:
        print(f"  Result:  [ERROR]")
        print(f"  Exception: {e}")
        return False


def test_1_normal():
    """Test 1: Normal engine produces health close to 100 and HEALTHY status."""
    core = DigitalTwinCore()
    tel = get_nominal_telemetry()
    res = core.update(tel)

    overall = res["health"]["overall"]
    status = res["health"]["status"]
    subs = res["health"]

    passed = (overall >= 98.0) and (status == "HEALTHY") and all(subs[s] >= 98.0 for s in ["thermal", "combustion", "lubrication", "mechanical", "electrical", "sensor"])
    details = f"Overall={overall:.1f}%, Status={status}, Subsystems={ {s: subs[s] for s in ['thermal', 'combustion', 'lubrication']} }"
    return passed, details


def test_2_mild_injector():
    """Test 2: Mild injector degradation (20%) reduces combustion health moderately."""
    core = DigitalTwinCore()
    tel = get_nominal_telemetry()

    # Baseline nominal
    res_base = core.update(tel)
    base_comb = res_base["health"]["combustion"]

    # Apply 20% injector degradation + slight fuel delivery rich bias
    core.reset_degradation()
    core.set_degradation("injector", 0.20)
    tel_mild = dict(tel)
    tel_mild["fuel_flow_lh"] += 1.2
    tel_mild["egt_c"] += 18.0

    res_mild = core.update(tel_mild)
    mild_comb = res_mild["health"]["combustion"]
    comb_drop = base_comb - mild_comb

    passed = (mild_comb < base_comb) and (comb_drop >= 5.0) and (mild_comb >= 75.0)
    details = f"Base Combustion={base_comb:.1f}%, Mild (20% wear)={mild_comb:.1f}% (Drop: -{comb_drop:.1f}%)"
    return passed, details


def test_3_severe_injector():
    """Test 3: Severe injector degradation (80%) reduces combustion health significantly."""
    core = DigitalTwinCore()
    tel = get_nominal_telemetry()

    # Mild 20%
    core.set_degradation("injector", 0.20)
    res_mild = core.update(dict(tel))
    mild_comb = res_mild["health"]["combustion"]

    # Severe 80%
    core.reset_degradation()
    core.set_degradation("injector", 0.80)
    tel_severe = dict(tel)
    tel_severe["fuel_flow_lh"] += 5.5
    tel_severe["egt_c"] += 65.0
    tel_severe["rpm"] -= 120.0

    res_severe = core.update(tel_severe)
    severe_comb = res_severe["health"]["combustion"]

    passed = (severe_comb < mild_comb) and (severe_comb <= 50.0)
    details = f"Mild Combustion={mild_comb:.1f}%, Severe (80% wear)={severe_comb:.1f}%"
    return passed, details


def test_4_lubrication_fault():
    """Test 4: Lubrication fault reduces lubrication health significantly."""
    core = DigitalTwinCore()
    tel = get_nominal_telemetry()
    core.update(tel)

    # Inject lubrication fault (oil pressure drops, oil temperature rises)
    tel_lub = dict(tel)
    tel_lub["oil_pressure_bar"] = 2.15  # Critical drop below 2.41 redline
    tel_lub["oil_temperature_c"] = 118.0
    core.set_degradation("lubrication", 0.50)

    res = core.update(tel_lub)
    lub_health = res["health"]["lubrication"]
    status = res["health"]["status"]

    passed = (lub_health < 40.0) and (res["health"]["overall"] < 85.0)
    details = f"Lubrication Health={lub_health:.1f}%, Overall Health={res['health']['overall']:.1f}%, Status={status}"
    return passed, details


def test_5_overheating():
    """Test 5: Overheating degrades thermal health while combustion/mechanical remain less affected."""
    core = DigitalTwinCore()
    tel = get_nominal_telemetry()
    core.update(tel)

    tel_heat = dict(tel)
    tel_heat["cht_c"] = 192.0
    tel_heat["egt_c"] = 720.0
    tel_heat["oil_temperature_c"] = 119.0
    core.set_degradation("cooling", 0.60)

    res = core.update(tel_heat)
    thermal_health = res["health"]["thermal"]
    mech_health = res["health"]["mechanical"]

    passed = (thermal_health < 35.0) and (mech_health >= 90.0)
    details = f"Thermal Health={thermal_health:.1f}%, Mechanical Health={mech_health:.1f}%, Status={res['health']['status']}"
    return passed, details


def test_6_vibration_fault():
    """Test 6: Vibration fault degrades mechanical health."""
    core = DigitalTwinCore()
    tel = get_nominal_telemetry()

    tel_vib = dict(tel)
    tel_vib["vibration_g"] = 2.75  # Elevated dynamic vibration
    core.set_degradation("mechanical", 0.55)

    res = core.update(tel_vib)
    mech_health = res["health"]["mechanical"]
    elec_health = res["health"]["electrical"]

    passed = (mech_health < 35.0) and (elec_health >= 95.0)
    details = f"Mechanical Health={mech_health:.1f}%, Electrical Health={elec_health:.1f}%"
    return passed, details


def test_7_sensor_failure():
    """Test 7: Sensor failure drops sensor health but does NOT falsely collapse engine mechanical/combustion health."""
    core = DigitalTwinCore()
    tel = get_nominal_telemetry()

    # Single CHT thermocouple spike
    tel_sensor = dict(tel)
    tel_sensor["cht_c"] = 245.0  # Spurious high reading while engine is nominal

    diag_mock = {
        "diagnosis_type": "POSSIBLE_SENSOR_FAILURE",
        "suspected_sensor": "cht_c",
        "sensor_fault_confidence": 0.95
    }

    res = core.update(tel_sensor, sensor_diagnosis=diag_mock)
    sensor_health = res["health"]["sensor"]
    comb_health = res["health"]["combustion"]
    mech_health = res["health"]["mechanical"]
    lub_health = res["health"]["lubrication"]
    overall = res["health"]["overall"]

    passed = (sensor_health < 40.0) and (comb_health >= 95.0) and (mech_health >= 95.0) and (lub_health >= 95.0) and (overall >= 75.0)
    details = (
        f"Sensor Health={sensor_health:.1f}%, Combustion={comb_health:.1f}%, "
        f"Mechanical={mech_health:.1f}%, Overall={overall:.1f}% (Correctly isolated)"
    )
    return passed, details


def test_8_multi_system_failure():
    """Test 8: Multi-system engine failure decreases multiple subsystems and produces CRITICAL or SEVERE status."""
    core = DigitalTwinCore()
    tel = get_nominal_telemetry()

    # Correlated simultaneous system breakdowns
    tel_multi = dict(tel)
    tel_multi["rpm"] = 1950.0
    tel_multi["cht_c"] = 198.0
    tel_multi["egt_c"] = 745.0
    tel_multi["oil_pressure_bar"] = 2.05
    tel_multi["oil_temperature_c"] = 126.0
    tel_multi["vibration_g"] = 2.80
    tel_multi["fuel_flow_lh"] = 26.0

    core.set_degradation("cooling", 0.70)
    core.set_degradation("lubrication", 0.75)
    core.set_degradation("mechanical", 0.65)
    core.set_degradation("injector", 0.60)

    res = core.update(tel_multi)
    overall = res["health"]["overall"]
    status = res["health"]["status"]

    passed = (overall < 40.0) and (status in ["CRITICAL", "SEVERE"])
    details = f"Multi-failure Overall Health={overall:.1f}%, Status={status}"
    return passed, details


def test_9_reset():
    """Test 9: Reset restores degradation to 0.0 and health returns to nominal baseline."""
    core = DigitalTwinCore()
    
    # Induce severe wear
    core.set_degradation("cooling", 0.90)
    core.set_degradation("lubrication", 0.85)
    core.set_degradation("mechanical", 0.80)

    # Reset
    core.reset_degradation()
    all_deg = core.get_all_degradation()
    is_deg_cleared = all(v == 0.0 for v in all_deg.values())

    # Process nominal
    res = core.update(get_nominal_telemetry())
    overall = res["health"]["overall"]
    status = res["health"]["status"]

    passed = is_deg_cleared and (overall >= 98.0) and (status == "HEALTHY")
    details = f"All degradation zero={is_deg_cleared}, Recovered Health={overall:.1f}%, Status={status}"
    return passed, details


def test_10_health_bounds():
    """Test 10: Invariant check - all subsystem and overall health scores remain strictly within [0, 100]."""
    core = DigitalTwinCore()
    
    extreme_cases = [
        {"rpm": 9999.0, "cht_c": 999.0, "egt_c": 2000.0, "oil_pressure_bar": 50.0, "oil_temperature_c": 500.0, "fuel_flow_lh": 200.0, "vibration_g": 50.0, "battery_voltage_v": 100.0},
        {"rpm": -500.0, "cht_c": -100.0, "egt_c": -50.0, "oil_pressure_bar": -10.0, "oil_temperature_c": -100.0, "fuel_flow_lh": -10.0, "vibration_g": -5.0, "battery_voltage_v": -10.0},
        {"rpm": 0.0, "cht_c": 0.0, "egt_c": 0.0, "oil_pressure_bar": 0.0, "oil_temperature_c": 0.0, "fuel_flow_lh": 0.0, "vibration_g": 0.0, "battery_voltage_v": 0.0}
    ]

    all_in_bounds = True
    min_found = 100.0
    max_found = 0.0

    for tel in extreme_cases:
        res = core.update(tel)
        health_dict = res["health"]
        for key in ["thermal", "combustion", "lubrication", "mechanical", "electrical", "sensor", "overall"]:
            val = health_dict[key]
            min_found = min(min_found, val)
            max_found = max(max_found, val)
            if val < 0.0 or val > 100.0:
                all_in_bounds = False

    passed = all_in_bounds and (min_found >= 0.0) and (max_found <= 100.0)
    details = f"All scores bounded: min={min_found:.1f}%, max={max_found:.1f}%"
    return passed, details


def test_11_degradation_bounds():
    """Test 11: Invariant check - all degradation values remain strictly within [0.0, 1.0]."""
    model = DegradationModel()

    # Attempt to set out-of-bound values
    model.set_degradation("cooling", 2.5)
    model.set_degradation("lubrication", -0.5)
    model.set_degradation("mechanical", 1.0)
    model.set_degradation("injector", 0.0)

    states = model.get_all_degradation()
    passed = (states["cooling"] == 1.0) and (states["lubrication"] == 0.0) and (states["mechanical"] == 1.0) and (states["injector"] == 0.0)
    details = f"Cooling={states['cooling']} (clamped from 2.5), Lubrication={states['lubrication']} (clamped from -0.5)"
    return passed, details


def test_12_configurable_weights():
    """Test 12: Overall health correctly follows configurable subsystem weights."""
    custom_weights = {
        "thermal": 0.50,
        "combustion": 0.10,
        "lubrication": 0.10,
        "mechanical": 0.10,
        "electrical": 0.10,
        "sensor": 0.10
    }
    calc = HealthIndexCalculator(weights=custom_weights)

    subsystems = {
        "thermal": 50.0,
        "combustion": 100.0,
        "lubrication": 100.0,
        "mechanical": 100.0,
        "electrical": 100.0,
        "sensor": 100.0
    }
    # Expected overall = 50*0.50 + 100*(0.10*5) = 25.0 + 50.0 = 75.0
    computed_overall = calc.calculate_overall_health(subsystems)
    expected_overall = 75.0

    passed = abs(computed_overall - expected_overall) < 0.1
    details = f"Computed Overall={computed_overall:.1f}%, Expected Overall={expected_overall:.1f}% (Weight verification)"
    return passed, details


def main():
    print("=" * 70)
    print("AeroTwin Phase 2 Automated Test Suite - Health Index & Degradation")
    print("=" * 70)

    tests = [
        (1, "Normal Engine Operation (Health > 98, Status HEALTHY)", test_1_normal),
        (2, "Mild Injector Degradation (20% Progressive Wear)", test_2_mild_injector),
        (3, "Severe Injector Degradation (80% Wear vs Mild)", test_3_severe_injector),
        (4, "Lubrication Failure (Hydraulic Residuals & Temp)", test_4_lubrication_fault),
        (5, "Overheating Fault (Thermal Distress)", test_5_overheating),
        (6, "Vibration Fault (Mechanical Degradation)", test_6_vibration_fault),
        (7, "Sensor Failure Isolation (Sensor vs Engine Health)", test_7_sensor_failure),
        (8, "Multi-System Engine Failure (Correlated Breakdown)", test_8_multi_system_failure),
        (9, "System Reset Verification (Restoration of Baseline)", test_9_reset),
        (10, "Health Index Numerical Clamping [0, 100]", test_10_health_bounds),
        (11, "Degradation Numerical Clamping [0, 1]", test_11_degradation_bounds),
        (12, "Configurable Subsystem Weights Verification", test_12_configurable_weights),
    ]

    results = []
    for num, title, fn in tests:
        results.append(run_test(num, title, fn))

    total = len(results)
    passed_count = sum(results)

    print(f"\n{'='*70}")
    print(f"PHASE 2 TEST SUMMARY: {passed_count}/{total} tests passed")
    print(f"{'='*70}")

    if passed_count == total:
        print("[SUCCESS] All 12 Phase 2 Health Index & Degradation tests passed!")
        sys.exit(0)
    else:
        print(f"[FAIL] {total - passed_count} tests failed.")
        sys.exit(1)


if __name__ == "__main__":
    main()
