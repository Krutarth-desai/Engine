"""
AeroTwin Phase 2 - Subsystem Health & Progressive Degradation Demo
==================================================================
Demonstrates progressive degradation and subsystem health response across:
  1. NORMAL (Baseline nominal cruise)
  2. INJECTOR DEGRADATION 20% (Mild progressive wear)
  3. INJECTOR DEGRADATION 40% (Moderate progressive wear)
  4. INJECTOR DEGRADATION 60% (Severe progressive wear)
  5. LUBRICATION FAULT (Low oil pressure & high oil temperature)
  6. VIBRATION FAULT (Rotational dynamic harmonic fatigue)
  7. SENSOR FAULT (Isolated CHT thermocouple failure)
  8. MULTI-SYSTEM ENGINE FAILURE (Simultaneous catastrophic breakdown)

Usage:
    python scripts/demo_health_degradation.py
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


def format_table(headers, rows):
    """Formats a clean terminal table."""
    col_widths = [len(h) for h in headers]
    for row in rows:
        for i, val in enumerate(row):
            col_widths[i] = max(col_widths[i], len(str(val)))

    sep_line = "+-" + "-+-".join("-" * w for w in col_widths) + "-+"
    header_line = "| " + " | ".join(h.ljust(col_widths[i]) for i, h in enumerate(headers)) + " |"
    
    out = [sep_line, header_line, sep_line]
    for row in rows:
        row_line = "| " + " | ".join(str(val).ljust(col_widths[i]) for i, val in enumerate(row)) + " |"
        out.append(row_line)
    out.append(sep_line)
    return "\n".join(out)


def run_phase2_scenario(core: DigitalTwinCore, scenario_title: str, telemetry: dict, description: str, sensor_diag=None):
    """Processes a scenario tick and prints a structured health assessment report."""
    print("\n" + "=" * 75)
    print(f"SCENARIO: {scenario_title}")
    print("=" * 75)
    print(f"Condition: {description}")

    result = core.update(telemetry, sensor_diagnosis=sensor_diag)
    health = result["health"]
    trend = result["trend"]
    degs = result["degradation"]

    # 1. Subsystem Health Table
    headers = ["Subsystem", "Health Score", "Status Bar", "Key Drivers"]
    drivers_map = {
        "Thermal": "CHT, EGT, Oil Temp, Altitude Cooling",
        "Combustion": "RPM, Fuel Flow, EGT, Injection Advance",
        "Lubrication": "Oil Pressure, Oil Temp, Viscosity",
        "Mechanical": "Vibration Harmonics, Dynamic Balance",
        "Electrical": "Regulated 28V DC Bus Stability",
        "Sensor": "Cross-Sensor Parity & Consistency"
    }

    sub_keys = [
        ("thermal", "Thermal"),
        ("combustion", "Combustion"),
        ("lubrication", "Lubrication"),
        ("mechanical", "Mechanical"),
        ("electrical", "Electrical"),
        ("sensor", "Sensor")
    ]

    rows = []
    for key, label in sub_keys:
        val = health[key]
        bar_len = int(val / 5)
        bar_str = "[" + "#" * bar_len + "-" * (20 - bar_len) + "]"
        rows.append([label, f"{val:5.1f} / 100", bar_str, drivers_map.get(label, "")])

    print("\n--- 1. SUBSYSTEM HEALTH ASSESSMENT ---")
    print(format_table(headers, rows))

    # 2. Overall Health & Trend Summary
    delta_str = f"{trend['overall_delta']:+.2f}" if trend["overall_delta"] != 0.0 else " 0.00"
    warning_str = f" [ALERT: {trend['warning']}]" if trend.get("rapid_degradation") else ""

    print("\n--- 2. OVERALL AIRWORTHINESS STATUS ---")
    print(f"  OVERALL HEALTH INDEX : {health['overall']:5.1f} / 100")
    print(f"  HEALTH STATUS        : {health['status']}")
    print(f"  HEALTH DELTA (TICK)  : {delta_str}{warning_str}")
    print(f"  DEGRADATION RATE     : {trend['degradation_rate']:+.3f} pts/cycle")

    # 3. Component Wear Levels
    print("\n--- 3. SUBSYSTEM DEGRADATION (0.00 - 1.00) ---")
    deg_str = " | ".join(f"{k.capitalize()}: {v:.2f}" for k, v in degs.items())
    print(f"  {deg_str}")
    print("-" * 75)


def main():
    print("\n" + "#" * 75)
    print("#  AEROTWIN PHASE 2 - SUBSYSTEM HEALTH & PROGRESSIVE DEGRADATION DEMO    #")
    print("#  Independent Multi-Subsystem Diagnostics & Airworthiness Scoring      #")
    print("#" * 75)

    core = DigitalTwinCore()

    # Base nominal telemetry
    nominal = {
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

    # 1. NORMAL
    core.reset_degradation()
    run_phase2_scenario(
        core=core,
        scenario_title="NORMAL",
        telemetry=dict(nominal),
        description="Standard cruise at 75% throttle, 15,000 ft, 15 deg C ambient. All sensor channels nominal."
    )

    # 2. INJECTOR DEGRADATION 20%
    core.reset_degradation()
    core.set_degradation("injector", 0.20)
    inj_20 = dict(nominal)
    inj_20["fuel_flow_lh"] += 1.4
    inj_20["egt_c"] += 18.0
    run_phase2_scenario(
        core=core,
        scenario_title="INJECTOR DEGRADATION 20%",
        telemetry=inj_20,
        description="Mild injector nozzle wear. Fuel flow increases slightly (+1.4 L/h) with slight EGT rise."
    )

    # 3. INJECTOR DEGRADATION 40%
    core.set_degradation("injector", 0.40)
    inj_40 = dict(nominal)
    inj_40["fuel_flow_lh"] += 3.2
    inj_40["egt_c"] += 38.0
    inj_40["rpm"] -= 45.0
    run_phase2_scenario(
        core=core,
        scenario_title="INJECTOR DEGRADATION 40%",
        telemetry=inj_40,
        description="Moderate injector wear. Noticeable mixture rich drift (+3.2 L/h) and RPM power lag."
    )

    # 4. INJECTOR DEGRADATION 60%
    core.set_degradation("injector", 0.60)
    inj_60 = dict(nominal)
    inj_60["fuel_flow_lh"] += 5.5
    inj_60["egt_c"] += 62.0
    inj_60["rpm"] -= 95.0
    run_phase2_scenario(
        core=core,
        scenario_title="INJECTOR DEGRADATION 60%",
        telemetry=inj_60,
        description="Severe injector fouling. Combustion health deteriorates heavily; status changes to DEGRADED."
    )

    # 5. LUBRICATION FAULT
    core.reset_degradation()
    core.set_degradation("lubrication", 0.55)
    lub_fault = dict(nominal)
    lub_fault["oil_pressure_bar"] = 2.10
    lub_fault["oil_temperature_c"] = 119.0
    run_phase2_scenario(
        core=core,
        scenario_title="LUBRICATION FAULT",
        telemetry=lub_fault,
        description="Oil pump pressure relief valve failure. Oil pressure drops to 2.10 bar; oil temp reaches 119 deg C."
    )

    # 6. VIBRATION FAULT
    core.reset_degradation()
    core.set_degradation("mechanical", 0.50)
    vib_fault = dict(nominal)
    vib_fault["vibration_g"] = 2.78
    run_phase2_scenario(
        core=core,
        scenario_title="VIBRATION FAULT",
        telemetry=vib_fault,
        description="Propeller blade erosion causing harmonic airframe vibration (2.78 g). Mechanical health drops."
    )

    # 7. SENSOR FAULT (Isolated CHT Spike)
    core.reset_degradation()
    sensor_fault = dict(nominal)
    sensor_fault["cht_c"] = 245.0  # Spurious thermocouple reading
    diag_mock = {
        "diagnosis_type": "POSSIBLE_SENSOR_FAILURE",
        "suspected_sensor": "cht_c",
        "sensor_fault_confidence": 0.96
    }
    run_phase2_scenario(
        core=core,
        scenario_title="SENSOR FAULT (CHT THERMOCOUPLE SHORT)",
        telemetry=sensor_fault,
        description="Single CHT thermocouple diverges to 245 deg C while engine is running nominally. Sensor health flags fault.",
        sensor_diag=diag_mock
    )

    # 8. MULTI-SYSTEM ENGINE FAILURE
    core.reset_degradation()
    core.set_degradation("cooling", 0.70)
    core.set_degradation("lubrication", 0.75)
    core.set_degradation("mechanical", 0.65)
    core.set_degradation("injector", 0.60)
    multi_fail = dict(nominal)
    multi_fail["rpm"] = 1880.0
    multi_fail["cht_c"] = 196.0
    multi_fail["egt_c"] = 740.0
    multi_fail["oil_pressure_bar"] = 2.05
    multi_fail["oil_temperature_c"] = 125.0
    multi_fail["vibration_g"] = 2.82
    multi_fail["fuel_flow_lh"] = 25.0
    run_phase2_scenario(
        core=core,
        scenario_title="MULTI-SYSTEM ENGINE FAILURE",
        telemetry=multi_fail,
        description="Catastrophic concurrent degradation of cooling, lubrication, and combustion systems. Status: SEVERE."
    )

    print("\n[DEMO COMPLETE] Phase 2 Demonstration successfully executed.\n")


if __name__ == "__main__":
    main()
