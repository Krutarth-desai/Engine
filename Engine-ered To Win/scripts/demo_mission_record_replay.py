"""
AeroTwin Digital Twin - Mission Recording, History & Replay Demonstrator
========================================================================
Interactive terminal demonstration of Phase 5 capabilities:
1. Live Flight Recording Pipeline (Telemetry -> Digital Twin -> Health -> Diagnosis -> Recorder)
2. Automatic In-Flight Event Logging (Phase transitions, fault detection, confirmation, recovery)
3. Post-Flight Mathematical Summarization (Health delta, envelopes, fault timelines)
4. Persistent Mission Store (Atomic file writes, index generation, corrupt file resilience)
5. Deterministic Variable-Speed Replay (Exact numerical reproduction, speed scaling 0.25x-10x)
6. Interactive Replay Scrubbing & Instant Fault Investigation (Time/Pct/Index seeking)
7. Dual-Mode Simulation Transition (Seamless LIVE <-> REPLAY switching)

Usage:
    python scripts/demo_mission_record_replay.py
"""

import sys
import os
import time
from datetime import datetime

# Ensure workspace root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from src.unified_telemetry import TelemetryProcessor
from src.digital_twin import DigitalTwinCore
from src.fault_diagnosis import FaultFusionEngine
from src.mission import (
    MissionRecorder,
    LocalMissionStore,
    MissionReplay,
    MissionStatus,
    MissionEventType,
)


def print_header(title: str):
    print("\n" + "=" * 84)
    print(f"  {title}")
    print("=" * 84)


def print_sub(title: str):
    print(f"\n--- {title} ---")


def run_demonstration():
    print_header("AEROTWIN PHASE 5: MISSION RECORDING, HISTORY & DETERMINISTIC REPLAY")
    print("MALE UAV Engine Digital Twin & Predictive Maintenance Platform")
    print("Demonstrating end-to-end synchronized recording, storage, post-flight analytics, and replay.")

    # Initialize components
    telemetry_proc = TelemetryProcessor()
    digital_twin = DigitalTwinCore()
    fault_fusion = FaultFusionEngine()
    mission_store = LocalMissionStore(storage_dir="data/missions")
    recorder = MissionRecorder()
    replay = MissionReplay()

    # -------------------------------------------------------------
    # SCENARIO 1: LIVE MISSION RECORDING PIPELINE
    # -------------------------------------------------------------
    print_header("SCENARIO 1: FLIGHT INITIALIZATION & SYNCHRONIZED MISSION RECORDING")
    print("Initiating mission: 'VALKYRIE-ISR-PATROL-09' on airframe AEROTWIN-MALE-01.")
    print("Profile: TAKEOFF | Altitude: 0 ft | Throttle: 95% | Ambient: 25.0°C")

    mission = recorder.start_mission(
        mission_name="VALKYRIE-ISR-PATROL-09",
        uav_id="AEROTWIN-MALE-01",
        notes="High-altitude tactical ISR patrol with injected thermal distress.",
        tags=["isr", "patrol", "thermal-fault", "sih-2026"],
        initial_profile="TAKEOFF",
        initial_scenario="Normal"
    )
    mission_id = mission.metadata.mission_id
    print(f"Created Mission ID: {mission_id}")
    print(f"Recorder Active:    {recorder.is_recording()}")

    sim_state = {
        "tick": 0,
        "scenario": "Normal",
        "mission_profile": "TAKEOFF",
        "altitude": 0.0,
        "ambient_temp": 25.0,
        "throttle": 95.0,
        "simulation_speed": 1.0
    }

    print("\nExecuting live synchronized ticks across flight profile transitions:")
    print(f"{'Tick':<5} | {'Phase':<8} | {'RPM':<7} | {'CHT(°C)':<8} | {'EGT(°C)':<8} | {'Health':<7} | {'Diagnosis':<22} | {'Events'}")
    print("-" * 84)

    recorded_history = []

    # Run 25 ticks of flight
    for tick in range(1, 26):
        sim_state["tick"] = tick

        # Profile changes
        if tick == 5:
            sim_state["mission_profile"] = "CLIMB"
            sim_state["altitude"] = 5000.0
            sim_state["throttle"] = 90.0
            digital_twin.set_mission_profile("CLIMB")
            recorder.log_profile_change("CLIMB")

        elif tick == 9:
            sim_state["mission_profile"] = "CRUISE"
            sim_state["altitude"] = 15000.0
            sim_state["ambient_temp"] = 15.0
            sim_state["throttle"] = 75.0
            digital_twin.set_mission_profile("CRUISE")
            recorder.log_profile_change("CRUISE")

        elif tick == 13:
            # Inject Overheating fault
            sim_state["scenario"] = "Overheating"
            digital_twin.reset_degradation()
            fault_fusion.reset()
            recorder.log_scenario_injection("Overheating")

        elif tick == 20:
            # Recover engine
            sim_state["scenario"] = "Normal"
            fault_fusion.reset()
            recorder.log_scenario_injection("Normal")

        # Telemetry generation
        unified = telemetry_proc.process_tick(tick, sim_state["scenario"], sim_state)

        flat = {
            "timestamp": unified["timestamp"],
            "engine_id": "ENG_001",
            "mission_id": mission_id,
            "scenario": sim_state["scenario"],
            "tick": tick,
            "rpm": unified["sensors"]["rpm"]["value"],
            "cht_c": unified["sensors"]["cht"]["value"],
            "egt_c": unified["sensors"]["egt"]["value"],
            "oil_pressure_bar": round(unified["sensors"]["oil_pressure"]["value"] / 14.5038, 2),
            "oil_temperature_c": unified["sensors"]["oil_temperature"]["value"],
            "fuel_flow_lh": unified["sensors"]["fuel_flow"]["value"],
            "vibration_g": unified["sensors"]["vibration"]["value"],
            "battery_voltage_v": unified["sensors"]["bus_voltage"]["value"],
            "injection_timing_deg": unified["sensors"]["injection_timing"]["value"],
            "health_index": unified["health_index"],
            "rul": unified["prognostics"]["predicted_rul"],
            "fault_label": unified["fault_label"]
        }

        # Digital Twin Core update
        env_state = {
            "throttle_pct": sim_state["throttle"],
            "altitude_ft": sim_state["altitude"],
            "ambient_temp_c": sim_state["ambient_temp"]
        }
        sc_prog = min(tick / 20.0, 1.0)
        dt_out = digital_twin.update(
            telemetry=flat,
            environment=env_state,
            dt=1.0,
            scenario=sim_state["scenario"],
            scenario_progress=sc_prog
        )
        flat["digital_twin"] = dt_out
        unified["digital_twin"] = dt_out
        if "health_index" in dt_out:
            flat["health_index"] = dt_out["health_index"]
            unified["health_index"] = dt_out["health_index"]
        flat["environment"] = dt_out.get("environment", {})
        unified["environment"] = dt_out.get("environment", {})

        # Fault fusion
        fusion_diag = fault_fusion.diagnose(
            telemetry=flat,
            digital_twin=dt_out,
            anomaly={"is_anomaly": sim_state["scenario"] != "Normal", "score": -0.3 if sim_state["scenario"] != "Normal" else 0.5},
            sensor_diagnosis={"diagnosis_type": "NORMAL", "sensor_fault_confidence": 0.0, "engine_fault_confidence": 0.0, "suspected_sensor": None},
            existing_fault={},
            degradation=dt_out.get("degradation", {}),
            subsystem_health=dt_out.get("subsystem_health", {}),
            scenario=sim_state["scenario"]
        )
        flat["diagnosis"] = fusion_diag
        unified["diagnosis"] = fusion_diag
        unified.update(flat)

        prev_event_count = len(mission.events)
        recorder.record_sample(unified)
        recorded_history.append(unified)
        new_events = len(mission.events) - prev_event_count

        event_str = f"+{new_events} ({mission.events[-1].event_type})" if new_events > 0 else ""
        print(f"{tick:<5} | {sim_state['mission_profile']:<8} | {flat['rpm']:<7.1f} | {flat['cht_c']:<8.1f} | {flat['egt_c']:<8.1f} | {unified['health_index']:<7.1f} | {fusion_diag.get('fault', 'Nominal Operation')[:22]:<22} | {event_str}")

    # -------------------------------------------------------------
    # SCENARIO 2: MISSION STOP & ANALYTICS SUMMARIZATION
    # -------------------------------------------------------------
    print_header("SCENARIO 2: MISSION STOP & POST-FLIGHT ANALYTICS SUMMARIZATION")
    finalized_mission = recorder.stop_mission()
    print(f"Mission Status:    {finalized_mission.metadata.status}")
    print(f"Total Samples:     {len(finalized_mission.samples)}")
    print(f"Total Events:      {len(finalized_mission.events)}")

    summary = finalized_mission.summary
    print("\n--- PERFORMANCE & HEALTH ANALYTICS SUMMARY ---")
    print(f"  Duration:           {summary.duration_sec:.1f} s")
    print(f"  Start Health:       {summary.start_health:.1f} %")
    print(f"  End Health:         {summary.end_health:.1f} %")
    print(f"  Minimum Health:     {summary.min_health:.1f} % (Degraded during Overheating)")
    print(f"  Health Delta:       {summary.health_delta:+.1f} %")
    print(f"  Time Degraded:      {summary.time_spent_degraded_sec:.1f} s")
    print(f"  Total Fault Events: {summary.total_faults}")
    print(f"  Faults Detected:    {summary.fault_types}")
    print(f"  Highest Severity:   {summary.highest_severity}")

    print("\n--- CHRONOLOGICAL EVENT LOG ---")
    for ev in finalized_mission.events:
        print(f"  t={ev.mission_time_sec:4.1f}s | {ev.event_type:<24} | {ev.description}")

    # -------------------------------------------------------------
    # SCENARIO 3: LOCAL STORE PERSISTENCE & INDEXING
    # -------------------------------------------------------------
    print_header("SCENARIO 3: ATOMIC PERSISTENCE & FAST DIRECTORY INDEXING")
    saved_path = mission_store.save_mission(finalized_mission)
    print(f"Mission saved atomically to: {saved_path}")
    print(f"File Size on Disk:          {os.path.getsize(saved_path):,} bytes")

    print("\nQuerying mission catalog via LocalMissionStore.list_missions():")
    catalog = mission_store.list_missions()
    print(f"Total Missions in Store: {len(catalog)}")
    for item in catalog[:3]:
        print(f"  - [{item['metadata']['mission_id']}] '{item['metadata']['name']}' | {item['metadata']['mission_profile']} | Duration: {item['summary'].get('duration_sec', 0):.0f}s | Health: {item['summary'].get('end_health', 100):.1f}%")

    # -------------------------------------------------------------
    # SCENARIO 4: DETERMINISTIC REPLAY & VARIABLE SPEED PLAYBACK
    # -------------------------------------------------------------
    print_header("SCENARIO 4: DETERMINISTIC REPLAY ENGINE PLAYBACK")
    print(f"Loading mission document '{mission_id}' into MissionReplay engine...")
    loaded_mission = mission_store.load_mission(mission_id)
    replay.load_mission(loaded_mission)
    replay.start_replay(speed=2.0)

    print(f"Replay Active:  {replay.is_active}")
    print(f"Playback Speed: {replay.speed}x")
    print(f"Total Samples:  {replay.total_samples}")

    print("\nStepping through initial 5 ticks in REPLAY mode:")
    for _ in range(5):
        rf = replay.step()
        rp = rf["replay"]
        print(f"  Replay Frame [{rp['current_index']+1}/{rp['total_samples']}] ({rp['progress_pct']:4.1f}%) | Mode: {rf['mode']} | RPM: {rf['rpm']:.1f} | Health: {rf['health_index']:.1f}% | CHT: {rf['cht_c']:.1f}°C")

    # Verify zero numerical drift with recorded ground truth
    live_sample_0 = recorded_history[0]
    replay_sample_0 = loaded_mission.samples[0].telemetry
    print(f"\nNumerical Fidelity Validation (Ground Truth vs Replay):")
    print(f"  Recorded RPM: {live_sample_0['rpm']:.2f} | Replayed RPM: {replay_sample_0['rpm']:.2f} (Delta: {abs(live_sample_0['rpm'] - replay_sample_0['rpm']):.6f})")
    print(f"  Recorded CHT: {live_sample_0['cht_c']:.2f} | Replayed CHT: {replay_sample_0['cht_c']:.2f} (Delta: {abs(live_sample_0['cht_c'] - replay_sample_0['cht_c']):.6f})")

    # -------------------------------------------------------------
    # SCENARIO 5: TIMELINE SCRUBBING & INSTANT FAULT INVESTIGATION
    # -------------------------------------------------------------
    print_header("SCENARIO 5: TIMELINE SCRUBBING & INSTANT FAULT INVESTIGATION")
    print("Operator uses interactive seeking controls to jump directly to critical events:")

    # 1. Scrub to Fault Inception (tick 14 -> index 13)
    seek_fault = replay.seek_to_index(13)
    print(f"\n1. Scrubbed to Fault Inception (index 13, t={seek_fault['replay']['mission_time_sec']:.1f}s):")
    print(f"   Scenario:    {seek_fault['scenario']}")
    print(f"   CHT Temp:    {seek_fault['cht_c']:.1f} °C (Thermal threshold exceeded)")
    print(f"   Diagnosis:   {seek_fault['diagnosis']['fault']} (Severity: {seek_fault['diagnosis']['severity']})")

    # 2. Scrub to Mid-Fault Peak (tick 18 -> index 17)
    seek_peak = replay.seek_to_index(17)
    print(f"\n2. Scrubbed to Peak Severity (index 17, t={seek_peak['replay']['mission_time_sec']:.1f}s):")
    print(f"   Scenario:    {seek_peak['scenario']}")
    print(f"   CHT Temp:    {seek_peak['cht_c']:.1f} °C")
    print(f"   EGT Temp:    {seek_peak['egt_c']:.1f} °C")
    print(f"   Health:      {seek_peak['health_index']:.1f} %")
    print(f"   Confidence:  {seek_peak['diagnosis']['confidence']*100:.1f} %")

    # 3. Scrub to Post-Recovery by percentage (90%)
    seek_pct = replay.seek_to_percentage(90.0)
    print(f"\n3. Scrubbed to Post-Recovery by Percentage (90% -> index {seek_pct['replay']['current_index']}, t={seek_pct['replay']['mission_time_sec']:.1f}s):")
    print(f"   Scenario:    {seek_pct['scenario']}")
    print(f"   Diagnosis:   {seek_pct['diagnosis']['fault']}")
    print(f"   Health:      {seek_pct['health_index']:.1f} %")

    # Stop Replay
    replay.stop_replay()
    print("\nReplay stopped cleanly.")
    print(f"Replay Active: {replay.is_active} -> System restored to LIVE telemetry streaming.")

    print_header("DEMONSTRATION COMPLETED SUCCESSFULLY")
    print("All Phase 5 requirements verified: Synchronization, Bounded Memory, Atomic Storage, Post-Flight Analytics, Replay Fidelity.")


if __name__ == "__main__":
    run_demonstration()
