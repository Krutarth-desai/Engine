"""
End-to-End Integration Tests for AeroTwin Mission Recording, History & Replay
=============================================================================

Executes a complete 30-tick simulated UAV mission spanning:
  Takeoff -> Climb -> Cruise -> Overheating Fault Injection -> Recovery -> Landing
Verifies:
  1. Synchronized recording of Telemetry, Digital Twin, Health, and Fault Fusion.
  2. Automatic and explicit mission event logging (profile changes, fault lifecycle).
  3. Post-flight mathematical summarization and health trend computation.
  4. Local store persistence, atomic file write, and directory indexing.
  5. Deterministic replay of historical flight data with exact numerical fidelity.
  6. Replay timeline seeking, fault reconstruction, and clean live restoration.
"""

import os
import sys
import shutil
import tempfile
import unittest
from datetime import datetime

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

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


class TestMissionIntegration(unittest.TestCase):

    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="aerotwin_integration_test_")
        self.store = LocalMissionStore(storage_dir=self.test_dir)
        self.recorder = MissionRecorder()
        self.replay = MissionReplay()
        self.telemetry_processor = TelemetryProcessor()
        self.digital_twin = DigitalTwinCore()
        self.fault_fusion = FaultFusionEngine()

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_full_flight_mission_record_and_replay(self):
        """Simulate a 30-second flight mission, save, reload, and verify exact replay."""
        # 1. Start Mission Recording
        mission = self.recorder.start_mission(
            mission_name="ISR Border Recon Alpha-7",
            uav_id="AEROTWIN-MALE-01",
            notes="Full-flight phase 5 integration verification run",
            tags=["recon", "high-altitude", "overheat-test"],
            initial_profile="TAKEOFF",
            initial_scenario="Normal"
        )
        self.assertTrue(self.recorder.is_recording())
        mission_id = mission.metadata.mission_id

        # Simulation state
        sim_state = {
            "tick": 0,
            "scenario": "Normal",
            "mission_profile": "TAKEOFF",
            "altitude": 0.0,
            "ambient_temp": 25.0,
            "throttle": 95.0,
            "simulation_speed": 1.0
        }

        # 2. Run 30 simulated seconds across mission phases
        recorded_frames = []
        for tick in range(1, 31):
            sim_state["tick"] = tick

            # Phase transitions
            if tick == 6:
                sim_state["mission_profile"] = "CLIMB"
                sim_state["altitude"] = 5000.0
                sim_state["throttle"] = 90.0
                self.digital_twin.set_mission_profile("CLIMB")
                self.recorder.log_profile_change("CLIMB")

            elif tick == 11:
                sim_state["mission_profile"] = "CRUISE"
                sim_state["altitude"] = 15000.0
                sim_state["ambient_temp"] = 15.0
                sim_state["throttle"] = 75.0
                self.digital_twin.set_mission_profile("CRUISE")
                self.recorder.log_profile_change("CRUISE")

            elif tick == 16:
                # Inject Cylinder Overheating
                sim_state["scenario"] = "Overheating"
                self.digital_twin.reset_degradation()
                self.fault_fusion.reset()
                self.recorder.log_scenario_injection("Overheating")

            elif tick == 23:
                # Recover engine back to nominal
                sim_state["scenario"] = "Normal"
                self.fault_fusion.reset()
                self.recorder.log_scenario_injection("Normal")

            elif tick == 27:
                sim_state["mission_profile"] = "LANDING"
                sim_state["altitude"] = 1000.0
                sim_state["throttle"] = 40.0
                self.digital_twin.set_mission_profile("LANDING")
                self.recorder.log_profile_change("LANDING")

            # 2a. Synthesize Telemetry
            unified = self.telemetry_processor.process_tick(tick, sim_state["scenario"], sim_state)

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

            # 2b. Digital Twin Core Update
            env_state = {
                "throttle_pct": sim_state["throttle"],
                "altitude_ft": sim_state["altitude"],
                "ambient_temp_c": sim_state["ambient_temp"]
            }
            sc_progress = min(tick / 20.0, 1.0)
            dt_out = self.digital_twin.update(
                telemetry=flat,
                environment=env_state,
                dt=1.0,
                scenario=sim_state["scenario"],
                scenario_progress=sc_progress
            )
            flat["digital_twin"] = dt_out
            unified["digital_twin"] = dt_out
            if "health_index" in dt_out:
                flat["health_index"] = dt_out["health_index"]
                unified["health_index"] = dt_out["health_index"]
            flat["environment"] = dt_out.get("environment", {})
            unified["environment"] = dt_out.get("environment", {})

            # 2c. Fault Fusion Engine
            fusion_diag = self.fault_fusion.diagnose(
                telemetry=flat,
                digital_twin=dt_out,
                anomaly={"is_anomaly": sim_state["scenario"] != "Normal", "score": -0.2 if sim_state["scenario"] != "Normal" else 0.5},
                sensor_diagnosis={"diagnosis_type": "NORMAL", "sensor_fault_confidence": 0.0, "engine_fault_confidence": 0.0, "suspected_sensor": None},
                existing_fault={},
                degradation=dt_out.get("degradation", {}),
                subsystem_health=dt_out.get("subsystem_health", {}),
                scenario=sim_state["scenario"]
            )
            flat["diagnosis"] = fusion_diag
            unified["diagnosis"] = fusion_diag
            unified.update(flat)

            # 2d. Record sample
            recorded_sample = self.recorder.record_sample(unified)
            self.assertIsNotNone(recorded_sample)
            recorded_frames.append(unified)

        # 3. Stop Mission and Verify Summary
        stopped_mission = self.recorder.stop_mission()
        self.assertIsNotNone(stopped_mission)
        self.assertEqual(len(stopped_mission.samples), 30)
        self.assertEqual(stopped_mission.metadata.status, MissionStatus.COMPLETED)
        self.assertIsNotNone(stopped_mission.summary)

        # Verify summary analytics
        summary = stopped_mission.summary
        self.assertEqual(summary.total_samples, 30)
        self.assertTrue(summary.start_health >= 90.0)
        self.assertTrue(summary.min_health < summary.start_health)  # Degraded during overheat
        self.assertTrue(summary.total_faults >= 1)
        self.assertIn("overheat-test", stopped_mission.metadata.tags)

        # Verify events logged
        events = stopped_mission.events
        event_types = [e.event_type for e in events]
        self.assertIn(MissionEventType.MISSION_STARTED, event_types)
        self.assertIn(MissionEventType.MISSION_PROFILE_CHANGED, event_types)
        self.assertIn(MissionEventType.FAULT_INJECTED, event_types)
        self.assertIn(MissionEventType.MISSION_STOPPED, event_types)

        # 4. Save to Mission Store and Index
        save_path = self.store.save_mission(stopped_mission)
        self.assertTrue(os.path.exists(save_path))

        missions_list = self.store.list_missions()
        self.assertEqual(len(missions_list), 1)
        self.assertEqual(missions_list[0]["metadata"]["mission_id"], mission_id)
        self.assertEqual(missions_list[0]["metadata"]["name"], "ISR Border Recon Alpha-7")

        # 5. Load Stored Mission into Replay Engine
        loaded_mission = self.store.load_mission(mission_id)
        self.assertIsNotNone(loaded_mission)
        self.assertEqual(len(loaded_mission.samples), 30)

        self.replay.load_mission(loaded_mission)
        self.replay.start_replay(speed=2.0)
        self.assertTrue(self.replay.is_active)
        self.assertEqual(self.replay.speed, 2.0)

        # 6. Replay Verification: Frame-by-Frame Fidelity
        first_frame = self.replay.step()
        self.assertIsNotNone(first_frame)
        self.assertEqual(first_frame["mode"], "REPLAY")
        self.assertEqual(first_frame["replay"]["current_index"], 0)
        self.assertAlmostEqual(first_frame["rpm"], recorded_frames[0]["rpm"], places=1)
        self.assertAlmostEqual(first_frame["health_index"], recorded_frames[0]["health_index"], places=1)

        # 7. Seek to Overheat Injection Point (tick 18 -> index 17)
        overheat_frame = self.replay.seek_to_index(17)
        self.assertIsNotNone(overheat_frame)
        self.assertEqual(overheat_frame["replay"]["current_index"], 17)
        self.assertEqual(overheat_frame["scenario"], "Overheating")
        self.assertAlmostEqual(overheat_frame["cht_c"], recorded_frames[17]["cht_c"], places=1)
        self.assertAlmostEqual(overheat_frame["egt_c"], recorded_frames[17]["egt_c"], places=1)
        self.assertEqual(overheat_frame["diagnosis"]["fault"], recorded_frames[17]["diagnosis"]["fault"])

        # 8. Seek by Time (time = 24.0s -> post-recovery)
        recovery_frame = self.replay.seek_to_time(24.0)
        self.assertIsNotNone(recovery_frame)
        self.assertEqual(recovery_frame["scenario"], "Normal")

        # 9. Complete replay and stop
        self.replay.stop_replay()
        self.assertFalse(self.replay.is_active)
        self.assertEqual(self.replay.current_index, 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
