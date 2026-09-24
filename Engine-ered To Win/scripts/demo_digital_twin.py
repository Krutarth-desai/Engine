"""
AeroTwin Digital Twin - Standalone Demonstration Script
======================================================
Executes a multi-scenario demonstration of the AeroTwin Digital Twin Framework:
  1. NORMAL (Nominal Cruise)
  2. OVERHEATING (Thermal Distress)
  3. INJECTOR DEGRADATION (Mixture & Combustion Variance)
  4. VIBRATION FAULT (Dynamic Rotational Harmonic Imbalance)
  5. SENSOR FAULT (Isolated CHT Thermocouple Divergence)

Runs completely standalone in the terminal without requiring the React frontend.
Usage:
    python scripts/demo_digital_twin.py
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
    """Simple terminal table formatter."""
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


def run_scenario_demo(core: DigitalTwinCore, scenario_name: str, telemetry: dict, description: str):
    """Executes a single scenario and renders the diagnostics report."""
    print("\n" + "=" * 70)
    print(f"AEROTWIN DIGITAL TWIN DEMO :: SCENARIO: {scenario_name.upper()}")
    print("=" * 70)
    print(f"Context: {description}\n")

    result = core.update(telemetry)

    # 1. Parameter Table (Actual vs Expected vs Residual)
    headers = ["Parameter", "Actual", "Expected", "Residual", "Norm Dev", "Status"]
    param_display = [
        ("rpm", "RPM", "RPM"),
        ("cht_c", "CHT", "°C"),
        ("egt_c", "EGT", "°C"),
        ("oil_pressure_bar", "Oil Press", "bar"),
        ("oil_temperature_c", "Oil Temp", "°C"),
        ("fuel_flow_lh", "Fuel Flow", "L/h"),
        ("vibration_g", "Vibration", "g"),
        ("battery_voltage_v", "Voltage", "V"),
        ("injection_timing_deg", "Timing", "°CA")
    ]

    rows = []
    for key, label, unit in param_display:
        res = result["residuals"].get(key, {})
        act = res.get("actual", 0.0)
        exp = res.get("expected", 0.0)
        diff = res.get("residual", 0.0)
        norm = res.get("normalized_residual", 0.0)
        
        abs_norm = abs(norm)
        if abs_norm > 3.0:
            status = "CRITICAL"
        elif abs_norm > 1.5:
            status = "CAUTION"
        else:
            status = "NOMINAL"

        rows.append([
            f"{label} ({unit})",
            f"{act:.2f}" if key in ["vibration_g", "oil_pressure_bar"] else f"{act:.1f}",
            f"{exp:.2f}" if key in ["vibration_g", "oil_pressure_bar"] else f"{exp:.1f}",
            f"{diff:+.2f}" if key in ["vibration_g", "oil_pressure_bar"] else f"{diff:+.1f}",
            f"{norm:+.2f} sigma",
            status
        ])

    print("--- 1. PARAMETER STATE ESTIMATION ---")
    print(format_table(headers, rows))

    # 2. Subsystem Health Breakdown
    subs = result["subsystem_health"]
    print("\n--- 2. SUBSYSTEM HEALTH INDICES (0 - 100) ---")
    print(f"  Thermal Health:       {subs['thermal']:5.1f} / 100")
    print(f"  Combustion Health:    {subs['combustion']:5.1f} / 100")
    print(f"  Lubrication Health:   {subs['lubrication']:5.1f} / 100")
    print(f"  Mechanical Health:    {subs['mechanical']:5.1f} / 100")
    print(f"  Electrical Health:    {subs['electrical']:5.1f} / 100")
    print(f"  Sensor Health:        {subs['sensor']:5.1f} / 100")
    print("  " + "-" * 35)
    print(f"  OVERALL HEALTH INDEX: {result['health_index']:5.1f} / 100")

    # 3. Subsystem Degradation State
    degs = result["degradation"]
    print("\n--- 3. SUBSYSTEM PHYSICAL DEGRADATION (0.00 - 1.00) ---")
    deg_str = " | ".join(f"{k.capitalize()}: {v:.4f}" for k, v in degs.items())
    print(f"  {deg_str}")
    print("=" * 70)


def main():
    print("\n" + "#" * 70)
    print("#  AEROTWIN DIGITAL TWIN CORE FRAMEWORK - CAPABILITY DEMO            #")
    print("#  Physics-Informed Surrogate Tracking & Health Diagnostics         #")
    print("#" * 70)

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

    # 1. Scenario: NORMAL
    core.reset_degradation()
    run_scenario_demo(
        core=core,
        scenario_name="NORMAL",
        telemetry=dict(nominal),
        description="Standard cruise profile at 75% throttle, 15,000 ft, 15°C. All telemetry matches virtual physics expectations."
    )

    # 2. Scenario: OVERHEATING
    core.reset_degradation()
    overheating = dict(nominal)
    overheating["cht_c"] = 192.0
    overheating["egt_c"] = 720.0
    overheating["oil_temperature_c"] = 122.0
    run_scenario_demo(
        core=core,
        scenario_name="OVERHEATING",
        telemetry=overheating,
        description="Cooling air baffle restriction causes acute thermal stress. CHT, EGT, and Oil Temperature deviate significantly above model baseline."
    )

    # 3. Scenario: INJECTOR DEGRADATION
    core.reset_degradation()
    injector_fault = dict(nominal)
    injector_fault["fuel_flow_lh"] = 24.5
    injector_fault["egt_c"] = 695.0
    injector_fault["rpm"] = 2390.0
    core.set_degradation("injector", 0.40)
    run_scenario_demo(
        core=core,
        scenario_name="INJECTOR DEGRADATION",
        telemetry=injector_fault,
        description="Fuel injector nozzle fouling and wear cause rich mixture deviation, higher EGT, and RPM power lag. Combustion health deteriorates."
    )

    # 4. Scenario: VIBRATION FAULT
    core.reset_degradation()
    vib_fault = dict(nominal)
    vib_fault["vibration_g"] = 2.85
    core.set_degradation("mechanical", 0.35)
    run_scenario_demo(
        core=core,
        scenario_name="VIBRATION FAULT",
        telemetry=vib_fault,
        description="Propeller/bearing dynamic unbalance creates 2.85 g vibration harmonics. Mechanical subsystem health plummets."
    )

    # 5. Scenario: SENSOR FAULT (Isolated Thermocouple Fault)
    core.reset_degradation()
    sensor_fault = dict(nominal)
    sensor_fault["cht_c"] = 245.0  # False spike while engine is physically running nominally
    run_scenario_demo(
        core=core,
        scenario_name="SENSOR FAULT (CHT THERMOCOUPLE SPIKE)",
        telemetry=sensor_fault,
        description="Single CHT thermocouple probe develops electrical short. Digital Twin flags high sensor discordance without falsely alarming engine failure."
    )

    print("\n[DEMO COMPLETE] Digital Twin demonstration finished successfully.\n")


if __name__ == "__main__":
    main()
