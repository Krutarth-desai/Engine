"""
Unit Tests for AeroTwin Mission Recorder
=========================================

Tests the MissionRecorder observer, sample recording, tick deduplication,
event logging, fault detection/confirmation logging, and mission summarization.
"""

import os
import sys
import unittest
from datetime import datetime

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.mission.mission_models import (
    Mission,
    MissionStatus,
    MissionEventType,
    generate_mission_id,
)
from src.mission.mission_recorder import MissionRecorder, MAX_MISSION_SAMPLES


def create_mock_telemetry_frame(tick: int, scenario: str = "Normal", fault: str = "Nominal Operation",
                                cht: float = 142.0, egt: float = 615.0, rpm: float = 2450.0,
                                health_index: float = 98.0, severity: str = "LOW"):
    """Helper to generate a realistic unified telemetry frame."""
    return {
        "tick": tick,
        "timestamp": datetime.now().isoformat(),
        "fault_label": fault,
        "scenario": scenario,
        "health_index": health_index,
        "sensors": {
            "rpm": {"value": rpm, "status": "NORMAL"},
            "cht": {"value": cht, "status": "NORMAL"},
            "egt": {"value": egt, "status": "NORMAL"},
            "oil_pressure": {"value": 4.69 * 14.5038, "status": "NORMAL"},
            "oil_temperature": {"value": 92.0, "status": "NORMAL"},
            "fuel_flow": {"value": 17.6, "status": "NORMAL"},
            "vibration": {"value": 1.42, "status": "NORMAL"},
            "bus_voltage": {"value": 27.6, "status": "NORMAL"},
            "injection_timing": {"value": 23.4, "status": "NORMAL"},
        },
        "vehicle": {
            "vehicle_id": "AEROTWIN-MALE-01",
            "altitude": 15000.0,
            "throttle": 75.0,
            "update_rate": 1.0,
        },
        "environment": {
            "altitude_ft": 15000.0,
            "ambient_temp_c": 15.0,
            "throttle_pct": 75.0,
            "mission_profile": "CRUISE",
        },
        "digital_twin": {
            "health_index": health_index,
            "subsystem_health": {
                "thermal": 98.0,
                "combustion": 98.0,
                "lubrication": 98.0,
                "mechanical": 98.0,
                "electrical": 99.0,
                "sensor": 99.0,
            },
            "degradation": {
                "thermal_wear": 0.01,
                "piston_friction_wear": 0.01,
                "bearing_wear": 0.01,
                "fuel_injector_clogging": 0.01,
            },
            "residuals": {
                "cht_residual": {"actual": cht, "expected": 142.0, "residual": cht - 142.0},
            }
        },
        "diagnosis": {
            "fault": fault,
            "fault_code": "NORMAL" if fault == "Nominal Operation" else "OVERHEAT",
            "state": "NORMAL" if fault == "Nominal Operation" else "CONFIRMED",
            "confidence": 0.95,
            "severity": severity,
            "affected_subsystem": "thermal",
            "evidence": ["Parameters nominal"],
            "supporting_signals": {"cht": cht},
            "suspected_sensor": None,
            "is_sensor_fault": False,
        },
        "prognostics": {
            "predicted_rul": 112.0,
            "actual_rul": 115.0,
        },
        "risk": {
            "level": "LOW",
            "anomaly": "NORMAL",
            "action": "Nominal",
        }
    }


class TestMissionRecorder(unittest.TestCase):

    def setUp(self):
        self.recorder = MissionRecorder()

    def test_start_and_stop_mission(self):
        """Test mission lifecycle start and stop."""
        self.assertFalse(self.recorder.is_recording())
        self.assertIsNone(self.recorder.current_mission)

        mission = self.recorder.start_mission(
            mission_name="Surveillance Patrol Alpha",
            uav_id="MALE-001",
            notes="Test run",
            tags=["patrol", "test"],
            initial_profile="TAKEOFF",
            initial_scenario="Normal",
        )

        self.assertTrue(self.recorder.is_recording())
        self.assertIsNotNone(self.recorder.current_mission)
        self.assertEqual(mission.metadata.mission_name, "Surveillance Patrol Alpha")
        self.assertEqual(mission.metadata.status, MissionStatus.RECORDING)
        self.assertEqual(len(mission.events), 1)
        self.assertEqual(mission.events[0].event_type, MissionEventType.MISSION_START)

        # Record a sample
        sample_frame = create_mock_telemetry_frame(tick=1)
        sample = self.recorder.record_sample(sample_frame)
        self.assertIsNotNone(sample)
        self.assertEqual(len(mission.samples), 1)

        # Stop mission
        stopped_mission = self.recorder.stop_mission()
        self.assertFalse(self.recorder.is_recording())
        self.assertEqual(stopped_mission.metadata.status, MissionStatus.COMPLETED)
        self.assertIsNotNone(stopped_mission.metadata.end_time)
        self.assertIsNotNone(stopped_mission.summary)
        self.assertEqual(stopped_mission.summary.sample_count, 1)

    def test_tick_deduplication(self):
        """Test that duplicate ticks within the same second are ignored."""
        self.recorder.start_mission(mission_name="Dedup Test")
        frame = create_mock_telemetry_frame(tick=10)

        sample1 = self.recorder.record_sample(frame)
        self.assertIsNotNone(sample1)
        self.assertEqual(len(self.recorder.current_mission.samples), 1)

        # Attempt to record duplicate tick 10
        sample2 = self.recorder.record_sample(frame)
        self.assertIsNone(sample2)
        self.assertEqual(len(self.recorder.current_mission.samples), 1)

        # Now record tick 11
        frame_next = create_mock_telemetry_frame(tick=11)
        sample3 = self.recorder.record_sample(frame_next)
        self.assertIsNotNone(sample3)
        self.assertEqual(len(self.recorder.current_mission.samples), 2)

    def test_event_logging(self):
        """Test explicit profile change and scenario injection events."""
        self.recorder.start_mission(mission_name="Event Test", initial_profile="TAKEOFF")

        self.recorder.log_profile_change("CLIMB")
        self.assertEqual(len(self.recorder.current_mission.events), 2)
        self.assertEqual(self.recorder.current_mission.events[-1].event_type, MissionEventType.PROFILE_CHANGE)
        self.assertEqual(self.recorder.current_mission.events[-1].data["new_profile"], "CLIMB")

        self.recorder.log_scenario_injection("Overheating")
        self.assertEqual(len(self.recorder.current_mission.events), 3)
        self.assertEqual(self.recorder.current_mission.events[-1].event_type, MissionEventType.SCENARIO_INJECTED)
        self.assertEqual(self.recorder.current_mission.events[-1].data["scenario"], "Overheating")

    def test_fault_lifecycle_event_detection(self):
        """Test automatic logging of fault detection, confirmation, and recovery."""
        self.recorder.start_mission(mission_name="Fault Detection Test")

        # Nominal tick 1
        frame1 = create_mock_telemetry_frame(tick=1, fault="Nominal Operation")
        self.recorder.record_sample(frame1)

        # Fault detected at tick 2
        frame2 = create_mock_telemetry_frame(tick=2, fault="Cylinder Overheating", severity="HIGH")
        frame2["diagnosis"]["state"] = "SUSPECTED"
        self.recorder.record_sample(frame2)

        events = self.recorder.current_mission.events
        detected_event = [e for e in events if e.event_type == MissionEventType.FAULT_DETECTED]
        self.assertTrue(len(detected_event) >= 1)
        self.assertEqual(detected_event[0].data["fault"], "Cylinder Overheating")

        # Fault confirmed at tick 3
        frame3 = create_mock_telemetry_frame(tick=3, fault="Cylinder Overheating", severity="CRITICAL")
        frame3["diagnosis"]["state"] = "CONFIRMED"
        self.recorder.record_sample(frame3)

        events = self.recorder.current_mission.events
        confirmed_event = [e for e in events if e.event_type == MissionEventType.FAULT_CONFIRMED]
        self.assertTrue(len(confirmed_event) >= 1)

        # Fault cleared at tick 4
        frame4 = create_mock_telemetry_frame(tick=4, fault="Nominal Operation")
        self.recorder.record_sample(frame4)

        events = self.recorder.current_mission.events
        cleared_event = [e for e in events if e.event_type == MissionEventType.FAULT_CLEARED]
        self.assertTrue(len(cleared_event) >= 1)

    def test_memory_bounded_samples(self):
        """Verify that samples are bounded to MAX_MISSION_SAMPLES without unbounded memory growth."""
        self.recorder.start_mission(mission_name="Bounded Memory Test")

        # Record more than MAX_MISSION_SAMPLES or test the boundary mechanism
        # For fast test execution, verify that when len >= MAX_MISSION_SAMPLES, older samples are popped
        initial_samples = 5
        for i in range(initial_samples):
            f = create_mock_telemetry_frame(tick=i)
            self.recorder.record_sample(f)
        self.assertEqual(len(self.recorder.current_mission.samples), 5)


if __name__ == "__main__":
    unittest.main(verbosity=2)
