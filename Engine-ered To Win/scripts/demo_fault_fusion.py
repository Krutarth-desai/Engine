"""
AeroTwin Phase 3 Live Demonstration Script - Physics-Informed Fault Diagnosis
=============================================================================
Demonstrates the multi-source fusion of live telemetry, Digital Twin residuals,
subsystem health, degradation wear, Isolation Forest ML anomaly scores, and
cross-sensor random forests across 8 key scenarios:

1. NORMAL
2. INJECTOR_DEGRADATION
3. MISFIRE
4. LUBRICATION
5. OVERHEATING
6. VIBRATION_FAULT
7. SENSOR_FAILURE
8. ENGINE_FAILURE_MULTI

Outputs real-time model predictions, confidence percentages, severity ratings,
and dynamic human-readable evidence statements.

Usage:
    python scripts/demo_fault_fusion.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from src.digital_twin import DigitalTwinCore
from src.fault_diagnosis import FaultFusionEngine


def get_nominal_telemetry():
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


def main():
    print("\n" + "=" * 75)
    print("      AEROTWIN - PHASE 3 PHYSICS-INFORMED AI FAULT DIAGNOSIS DEMO      ")
    print("=" * 75 + "\n")

    env = {"throttle_pct": 75.0, "altitude_ft": 15000.0, "ambient_temp_c": 15.0}

    scenarios = [
        {
            "name": "NORMAL",
            "scenario_key": "Normal",
            "delta": {},
            "deg": {},
            "sensor_diag": {
                "diagnosis_type": "NORMAL",
                "sensor_fault_confidence": 0.0,
                "engine_fault_confidence": 0.0,
                "suspected_sensor": None,
                "affected_sensors": []
            },
            "anomaly": {"is_anomaly": False, "score": 0.12}
        },
        {
            "name": "INJECTOR_DEGRADATION",
            "scenario_key": "Injector_Degradation",
            "delta": {"egt_c": 58.0, "fuel_flow_lh": 2.6, "rpm": -25.0},
            "deg": {"injector": 0.42},
            "sensor_diag": {
                "diagnosis_type": "POSSIBLE_ENGINE_FAILURE",
                "sensor_fault_confidence": 0.05,
                "engine_fault_confidence": 0.94,
                "suspected_sensor": None,
                "affected_sensors": ["egt_c", "fuel_flow_lh"]
            },
            "anomaly": {"is_anomaly": True, "score": -0.16}
        },
        {
            "name": "MISFIRE",
            "scenario_key": "Misfire",
            "delta": {"rpm": -340.0, "vibration_g": 0.85, "egt_c": -45.0},
            "deg": {"injector": 0.30, "mechanical": 0.30},
            "sensor_diag": {
                "diagnosis_type": "POSSIBLE_ENGINE_FAILURE",
                "sensor_fault_confidence": 0.04,
                "engine_fault_confidence": 0.96,
                "suspected_sensor": None,
                "affected_sensors": ["rpm", "vibration_g"]
            },
            "anomaly": {"is_anomaly": True, "score": -0.24}
        },
        {
            "name": "LUBRICATION",
            "scenario_key": "Oil_Pressure_Loss",
            "delta": {"oil_pressure_bar": -2.15, "oil_temperature_c": 24.0, "vibration_g": 0.35},
            "deg": {"lubrication": 0.55},
            "sensor_diag": {
                "diagnosis_type": "POSSIBLE_ENGINE_FAILURE",
                "sensor_fault_confidence": 0.03,
                "engine_fault_confidence": 0.97,
                "suspected_sensor": None,
                "affected_sensors": ["oil_pressure_bar", "oil_temperature_c"]
            },
            "anomaly": {"is_anomaly": True, "score": -0.22}
        },
        {
            "name": "OVERHEATING",
            "scenario_key": "Overheating",
            "delta": {"cht_c": 48.0, "egt_c": 82.0, "oil_temperature_c": 21.0},
            "deg": {"cooling": 0.50},
            "sensor_diag": {
                "diagnosis_type": "POSSIBLE_ENGINE_FAILURE",
                "sensor_fault_confidence": 0.04,
                "engine_fault_confidence": 0.96,
                "suspected_sensor": None,
                "affected_sensors": ["cht_c", "egt_c", "oil_temperature_c"]
            },
            "anomaly": {"is_anomaly": True, "score": -0.28}
        },
        {
            "name": "VIBRATION_FAULT",
            "scenario_key": "High_Vibration",
            "delta": {"vibration_g": 1.25},
            "deg": {"mechanical": 0.45},
            "sensor_diag": {
                "diagnosis_type": "POSSIBLE_ENGINE_FAILURE",
                "sensor_fault_confidence": 0.06,
                "engine_fault_confidence": 0.93,
                "suspected_sensor": None,
                "affected_sensors": ["vibration_g"]
            },
            "anomaly": {"is_anomaly": True, "score": -0.19}
        },
        {
            "name": "SENSOR_FAILURE",
            "scenario_key": "Sensor_Fault_CHT",
            "delta": {"cht_c": 88.0},  # CHT reads 230 °C, but all other engine signals are nominal
            "deg": {"sensors": 0.60},
            "sensor_diag": {
                "diagnosis_type": "POSSIBLE_SENSOR_FAILURE",
                "sensor_fault_confidence": 0.98,
                "engine_fault_confidence": 0.02,
                "suspected_sensor": "cht_c",
                "affected_sensors": ["cht_c"]
            },
            "anomaly": {"is_anomaly": True, "score": -0.18}
        },
        {
            "name": "ENGINE_FAILURE_MULTI",
            "scenario_key": "Engine_Failure_Multi",
            "delta": {
                "rpm": -620.0, "cht_c": 62.0, "egt_c": 115.0,
                "oil_pressure_bar": -2.60, "oil_temperature_c": 32.0,
                "vibration_g": 1.45, "fuel_flow_lh": 5.0
            },
            "deg": {"cooling": 0.70, "lubrication": 0.75, "mechanical": 0.65, "injector": 0.60},
            "sensor_diag": {
                "diagnosis_type": "POSSIBLE_ENGINE_FAILURE",
                "sensor_fault_confidence": 0.02,
                "engine_fault_confidence": 0.99,
                "suspected_sensor": None,
                "affected_sensors": ["rpm", "cht_c", "egt_c", "oil_pressure_bar", "oil_temperature_c", "vibration_g"]
            },
            "anomaly": {"is_anomaly": True, "score": -0.35}
        }
    ]

    for sc in scenarios:
        dt = DigitalTwinCore()
        fusion_engine = FaultFusionEngine()

        # Apply degradation
        for sub, val in sc["deg"].items():
            dt.set_degradation(sub, val)

        # Run 5 consecutive ticks to simulate persistence confirmation
        diag = None
        for tick in range(1, 6):
            tel = get_nominal_telemetry()
            for k, d_val in sc["delta"].items():
                tel[k] += d_val

            dt_output = dt.update(
                telemetry=tel,
                environment=env,
                dt=1.0,
                scenario=sc["scenario_key"],
                scenario_progress=1.0,
                sensor_diagnosis=sc["sensor_diag"]
            )
            diag = fusion_engine.diagnose(
                telemetry=tel,
                digital_twin=dt_output,
                anomaly=sc["anomaly"],
                sensor_diagnosis=sc["sensor_diag"],
                scenario=sc["scenario_key"]
            )

        print("---------------------------------------------------------------------------")
        print(f"SCENARIO: {sc['name']}")
        print("---------------------------------------------------------------------------")
        print(f"Fault:\n{diag['fault']}\n")
        print(f"State:\n{diag['state']}\n")
        print(f"Confidence:\n{diag['confidence']:.0%}\n")
        print(f"Severity:\n{diag['severity']}\n")
        print(f"Affected subsystem:\n{diag['affected_subsystem']}\n")
        print("Evidence:")
        for ev in diag["evidence"]:
            print(f"- {ev}")
        
        if diag.get("alternative_faults"):
            print("\nAlternative Candidates:")
            for alt in diag["alternative_faults"]:
                print(f"  * {alt['fault']} ({alt['affected_subsystem']}) — Confidence: {alt['confidence']:.0%}, Severity: {alt['severity']}")

        print("\nMaintenance Context:")
        mc = diag["maintenance_context"]
        print(f"  Action Subsystem: {mc['affected_subsystem']} | Health: {mc['health_score']}/100 | Wear: {mc['degradation_wear']:.2f} | Trend: {mc['trend']}")
        print()

    print("=" * 75)
    print("[DEMO COMPLETE] All 8 fault fusion scenarios executed successfully.")
    print("=" * 75 + "\n")


if __name__ == "__main__":
    main()
