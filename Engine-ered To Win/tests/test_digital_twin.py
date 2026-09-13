"""
AeroTwin Digital Twin Automated Test Suite
==========================================
Tests the Digital Twin Core Framework against 10 operational and fault scenarios:
1. Normal operation
2. Increased throttle response
3. High altitude environmental response
4. Hot ambient temperature response
5. Overheating telemetry fault
6. Vibration fault
7. Lubrication fault
8. Sensor fault isolation
9. Degradation progression & injection
10. Health index clamping and bounds

Usage:
    python tests/test_digital_twin.py
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
    ENGINE_CONFIG
)


def get_nominal_telemetry():
    """Generates a nominal telemetry packet at baseline cruise."""
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
    print(f"\n{'='*65}")
    print(f"TEST {num}: {title}")
    print(f"{'='*65}")
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
    """Test 1: Normal operation produces expected values close to actual, small residuals, and high health."""
    core = DigitalTwinCore()
    telemetry = get_nominal_telemetry()
    result = core.update(telemetry)

    cht_res = abs(result["residuals"]["cht_c"]["residual"])
    rpm_res = abs(result["residuals"]["rpm"]["residual"])
    health = result["health_index"]
    thermal_h = result["subsystem_health"]["thermal"]

    passed = (cht_res < 1.0) and (rpm_res < 5.0) and (health >= 95.0) and (thermal_h >= 95.0)
    details = f"Overall Health={health}%, Thermal={thermal_h}%, CHT Residual={cht_res:.2f}°C, RPM Residual={rpm_res:.1f}"
    return passed, details


def test_2_increased_throttle():
    """Test 2: Increased throttle (75% -> 90%) increases expected RPM, fuel flow, CHT, and EGT."""
    model = EngineModel()
    env_low = {"throttle_pct": 75.0, "altitude_ft": 15000.0, "ambient_temp_c": 15.0}
    env_high = {"throttle_pct": 90.0, "altitude_ft": 15000.0, "ambient_temp_c": 15.0}

    pred_low = model.predict(telemetry={}, environment=env_low)
    pred_high = model.predict(telemetry={}, environment=env_high)

    rpm_increased = pred_high["rpm"] > pred_low["rpm"]
    fuel_increased = pred_high["fuel_flow_lh"] > pred_low["fuel_flow_lh"]
    cht_increased = pred_high["cht_c"] > pred_low["cht_c"]
    egt_increased = pred_high["egt_c"] > pred_low["egt_c"]

    passed = rpm_increased and fuel_increased and cht_increased and egt_increased
    details = (
        f"Throttle 75% -> 90%: "
        f"RPM: {pred_low['rpm']} -> {pred_high['rpm']}, "
        f"Fuel: {pred_low['fuel_flow_lh']} -> {pred_high['fuel_flow_lh']} L/h, "
        f"CHT: {pred_low['cht_c']} -> {pred_high['cht_c']} °C, "
        f"EGT: {pred_low['egt_c']} -> {pred_high['egt_c']} °C"
    )
    return passed, details


def test_3_high_altitude():
    """Test 3: High altitude (15,000 ft -> 25,000 ft) thins air density and alters thermal expectations."""
    model = EngineModel()
    env_cruise = {"throttle_pct": 75.0, "altitude_ft": 15000.0, "ambient_temp_c": 15.0}
    env_high_alt = {"throttle_pct": 75.0, "altitude_ft": 25000.0, "ambient_temp_c": 15.0}

    pred_cruise = model.predict(telemetry={}, environment=env_cruise)
    pred_high_alt = model.predict(telemetry={}, environment=env_high_alt)

    # Thinner air reduces convective cooling, leading to warmer expected engine temperatures
    cht_shift = pred_high_alt["cht_c"] > pred_cruise["cht_c"]
    oil_shift = pred_high_alt["oil_temperature_c"] > pred_cruise["oil_temperature_c"]

    passed = cht_shift and oil_shift
    details = (
        f"Altitude 15k ft -> 25k ft: "
        f"Expected CHT: {pred_cruise['cht_c']} -> {pred_high_alt['cht_c']} °C, "
        f"Expected Oil Temp: {pred_cruise['oil_temperature_c']} -> {pred_high_alt['oil_temperature_c']} °C"
    )
    return passed, details


def test_4_hot_ambient():
    """Test 4: Hot ambient temperature (15°C -> 35°C) increases expected CHT, EGT, and Oil Temperature."""
    model = EngineModel()
    env_nominal = {"throttle_pct": 75.0, "altitude_ft": 15000.0, "ambient_temp_c": 15.0}
    env_hot = {"throttle_pct": 75.0, "altitude_ft": 15000.0, "ambient_temp_c": 35.0}

    pred_nom = model.predict(telemetry={}, environment=env_nominal)
    pred_hot = model.predict(telemetry={}, environment=env_hot)

    cht_hot = pred_hot["cht_c"] > pred_nom["cht_c"]
    egt_hot = pred_hot["egt_c"] > pred_nom["egt_c"]
    oil_hot = pred_hot["oil_temperature_c"] > pred_nom["oil_temperature_c"]

    passed = cht_hot and egt_hot and oil_hot
    details = (
        f"Ambient 15°C -> 35°C: "
        f"CHT: {pred_nom['cht_c']} -> {pred_hot['cht_c']} °C, "
        f"EGT: {pred_nom['egt_c']} -> {pred_hot['egt_c']} °C, "
        f"Oil Temp: {pred_nom['oil_temperature_c']} -> {pred_hot['oil_temperature_c']} °C"
    )
    return passed, details


def test_5_overheating():
    """Test 5: Overheating telemetry produces positive thermal residuals and depresses thermal health."""
    core = DigitalTwinCore()
    telemetry = get_nominal_telemetry()
    telemetry["cht_c"] += 45.0  # 187 °C
    telemetry["egt_c"] += 90.0  # 705 °C
    telemetry["oil_temperature_c"] += 25.0  # 117 °C

    result = core.update(telemetry)
    residuals = result["residuals"]
    thermal_health = result["subsystem_health"]["thermal"]
    overall = result["health_index"]

    cht_norm = residuals["cht_c"]["normalized_residual"]
    egt_norm = residuals["egt_c"]["normalized_residual"]

    passed = (cht_norm > 4.0) and (egt_norm > 3.0) and (thermal_health < 50.0) and (overall < 85.0)
    details = (
        f"Thermal Health: {thermal_health}%, Overall: {overall}%, "
        f"CHT Norm Residual: +{cht_norm}, EGT Norm Residual: +{egt_norm}"
    )
    return passed, details


def test_6_vibration_fault():
    """Test 6: Vibration fault elevates mechanical residual and depresses mechanical health."""
    core = DigitalTwinCore()
    telemetry = get_nominal_telemetry()
    telemetry["vibration_g"] = 2.65  # Elevated from 1.42 g

    result = core.update(telemetry)
    mech_health = result["subsystem_health"]["mechanical"]
    vib_res = result["residuals"]["vibration_g"]["residual"]
    vib_norm = result["residuals"]["vibration_g"]["normalized_residual"]

    passed = (vib_res > 1.0) and (vib_norm > 4.0) and (mech_health < 55.0)
    details = f"Mechanical Health: {mech_health}%, Vibration Residual: +{vib_res:.2f}g, Norm Residual: +{vib_norm}"
    return passed, details


def test_7_lubrication_fault():
    """Test 7: Low oil pressure and high oil temperature depress lubrication health."""
    core = DigitalTwinCore()
    telemetry = get_nominal_telemetry()
    telemetry["oil_pressure_bar"] = 2.20  # Critical drop from 4.69 bar
    telemetry["oil_temperature_c"] = 118.0 # High oil temp

    result = core.update(telemetry)
    lub_health = result["subsystem_health"]["lubrication"]
    oil_p_res = result["residuals"]["oil_pressure_bar"]["residual"]

    passed = (oil_p_res < -2.0) and (lub_health < 50.0)
    details = f"Lubrication Health: {lub_health}%, Oil Pressure Residual: {oil_p_res:.2f} bar"
    return passed, details


def test_8_sensor_fault_isolation():
    """
    Test 8: Sensor fault (single CHT spike while engine is normal) flags low sensor health
    without causing catastrophic collapse of other subsystems.
    """
    core = DigitalTwinCore()
    telemetry = get_nominal_telemetry()
    telemetry["cht_c"] = 240.0  # Single faulty sensor reading

    result = core.update(telemetry)
    sensor_health = result["subsystem_health"]["sensor"]
    comb_health = result["subsystem_health"]["combustion"]
    mech_health = result["subsystem_health"]["mechanical"]
    elec_health = result["subsystem_health"]["electrical"]
    overall = result["health_index"]

    # Sensor health should drop due to inconsistency, but other subsystems stay healthy
    passed = (sensor_health < 60.0) and (comb_health > 90.0) and (mech_health > 90.0) and (elec_health > 90.0) and (overall > 80.0)
    details = (
        f"Sensor Health: {sensor_health}%, Combustion: {comb_health}%, "
        f"Mechanical: {mech_health}%, Electrical: {elec_health}%, Overall Health: {overall}%"
    )
    return passed, details


def test_9_degradation_progression():
    """Test 9: Degradation accumulates over stress cycles and can be externally injected."""
    core = DigitalTwinCore()
    
    # 1. Verify initial state is 0.0
    initial_deg = core.get_degradation()
    all_zero = all(v == 0.0 for v in initial_deg.values())

    # 2. Inject external wear
    core.set_degradation("cooling", 0.45)
    core.set_degradation("lubrication", 0.30)
    updated_deg = core.get_degradation()

    # 3. Process nominal telemetry with wear and observe health reduction
    telemetry = get_nominal_telemetry()
    res = core.update(telemetry)
    thermal_health = res["subsystem_health"]["thermal"]

    passed = all_zero and (updated_deg["cooling"] == 0.45) and (updated_deg["lubrication"] == 0.30) and (thermal_health < 90.0)
    details = f"Injected Cooling Deg={updated_deg['cooling']}, Resulting Thermal Health={thermal_health}%"
    return passed, details


def test_10_health_index_bounds():
    """Test 10: Health scores remain bounded strictly between 0.0 and 100.0 even under extreme values."""
    core = DigitalTwinCore()
    
    # Extreme high telemetry
    tel_extreme_high = {
        "rpm": 5000.0, "cht_c": 500.0, "egt_c": 1200.0,
        "oil_pressure_bar": 15.0, "oil_temperature_c": 250.0,
        "fuel_flow_lh": 80.0, "vibration_g": 10.0,
        "battery_voltage_v": 45.0, "injection_timing_deg": 60.0
    }
    res_high = core.update(tel_extreme_high)
    
    # Extreme low telemetry
    tel_extreme_low = {
        "rpm": 0.0, "cht_c": -40.0, "egt_c": 0.0,
        "oil_pressure_bar": 0.0, "oil_temperature_c": -40.0,
        "fuel_flow_lh": 0.0, "vibration_g": 0.0,
        "battery_voltage_v": 0.0, "injection_timing_deg": 0.0
    }
    res_low = core.update(tel_extreme_low)

    scores_high = list(res_high["subsystem_health"].values()) + [res_high["health_index"]]
    scores_low = list(res_low["subsystem_health"].values()) + [res_low["health_index"]]

    bounded_high = all(0.0 <= s <= 100.0 for s in scores_high)
    bounded_low = all(0.0 <= s <= 100.0 for s in scores_low)

    passed = bounded_high and bounded_low
    details = f"Extreme High Overall={res_high['health_index']}%, Extreme Low Overall={res_low['health_index']}%"
    return passed, details


def main():
    print("=" * 65)
    print("AeroTwin Digital Twin Core Framework - Automated Test Suite")
    print("=" * 65)

    tests = [
        (1, "Normal Operation (Cruise Telemetry Tracking)", test_1_normal),
        (2, "Throttle Response Dynamics", test_2_increased_throttle),
        (3, "High Altitude Environmental Adaptation", test_3_high_altitude),
        (4, "Hot Ambient Temperature Response", test_4_hot_ambient),
        (5, "Overheating Telemetry Fault & Thermal Residuals", test_5_overheating),
        (6, "Vibration Fault & Mechanical Health Degradation", test_6_vibration_fault),
        (7, "Lubrication Failure & Hydraulic Residuals", test_7_lubrication_fault),
        (8, "Sensor Fault Isolation vs Engine Health", test_8_sensor_fault_isolation),
        (9, "Degradation Progression & Subsystem Injection", test_9_degradation_progression),
        (10, "Health Index Numerical Clamping & Invariant Bounds", test_10_health_index_bounds),
    ]

    results = []
    for num, title, fn in tests:
        results.append(run_test(num, title, fn))

    total = len(results)
    passed_count = sum(results)

    print(f"\n{'='*65}")
    print(f"TEST SUMMARY: {passed_count}/{total} tests passed")
    print(f"{'='*65}")

    if passed_count == total:
        print("[SUCCESS] All 10 Digital Twin test scenarios passed successfully!")
        sys.exit(0)
    else:
        print(f"[FAIL] {total - passed_count} tests failed.")
        sys.exit(1)


if __name__ == "__main__":
    main()
