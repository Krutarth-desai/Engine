"""
Unit Tests for AeroTwin Mission Replay Engine
=============================================

Tests deterministic playback, stepping, pause/resume, seeking (time/pct/index),
speed adjustment, unified frame formatting, and immutability guarantees.
"""

import os
import sys
import unittest
from datetime import datetime

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.mission.mission_models import (
    Mission,
    MissionMetadata,
    MissionSample,
    MissionEvent,
    MissionSummary,
    MissionStatus,
    MissionEventType,
)
from src.mission.mission_replay import MissionReplay


def create_mock_mission(sample_count: int = 10) -> Mission:
    """Helper to generate a multi-sample mission for replay testing."""
    now_iso = datetime.now().isoformat()
    metadata = MissionMetadata(
        mission_id="REPLAY_TEST_001",
        name="Test Flight Replay",
        created_at=now_iso,
        started_at=now_iso,
        ended_at=now_iso,
        duration_sec=float(sample_count - 1),
        status=MissionStatus.COMPLETED.value,
        total_samples=sample_count,
        mission_profile="CRUISE"
    )
    samples = []
    for i in range(sample_count):
        samples.append(
            MissionSample(
                timestamp=now_iso,
                mission_time_sec=float(i),
                tick=i + 1,
                telemetry={
                    "rpm": 2400.0 + i * 10.0,
                    "cht_c": 140.0 + i * 0.5,
                    "egt_c": 610.0 + i * 1.0,
                    "oil_pressure_bar": 4.6 - i * 0.02,
                    "oil_temperature_c": 90.0 + i * 0.3,
                    "fuel_flow_lh": 17.0 + i * 0.1,
                    "vibration_g": 1.4 + i * 0.01,
                    "battery_voltage_v": 27.6,
                    "injection_timing_deg": 23.4,
                },
                environment={
                    "altitude_ft": 15000.0 + i * 50.0,
                    "ambient_temp_c": 15.0,
                    "throttle_pct": 75.0,
                    "mission_profile": "CRUISE" if i < 5 else "DESCENT",
                },
                digital_twin={
                    "health_index": 98.0 - i * 0.2,
                    "subsystem_health": {"thermal": 98.0 - i * 0.2, "combustion": 99.0},
                    "degradation": {"thermal_wear": 0.01 * (i + 1)},
                    "residuals": {"cht_residual": {"actual": 140.0 + i * 0.5, "expected": 140.0, "residual": i * 0.5}}
                },
                health={"overall": 98.0 - i * 0.2, "status": "HEALTHY"},
                degradation={"thermal_wear": 0.01 * (i + 1)},
                diagnosis={
                    "fault": "Nominal Operation" if i < 7 else "Cylinder Overheating",
                    "fault_code": "NORMAL" if i < 7 else "OVERHEAT",
                    "state": "NORMAL" if i < 7 else "CONFIRMED",
                    "confidence": 0.95,
                    "severity": "LOW" if i < 7 else "HIGH",
                },
                mission_profile="CRUISE" if i < 5 else "DESCENT",
                scenario="Normal" if i < 7 else "Overheating"
            )
        )
    return Mission(metadata=metadata, samples=samples, events=[], summary=None)


class TestMissionReplay(unittest.TestCase):

    def setUp(self):
        self.replay = MissionReplay()
        self.mission = create_mock_mission(sample_count=10)

    def test_load_mission(self):
        """Test mission loading and initial state."""
        self.assertFalse(self.replay.is_active)
        self.replay.load_mission(self.mission)

        self.assertEqual(self.replay.total_samples, 10)
        self.assertEqual(self.replay.current_index, 0)
        self.assertFalse(self.replay.is_active)

    def test_start_pause_resume_stop(self):
        """Test lifecycle controls: start, pause, resume, stop."""
        self.replay.load_mission(self.mission)
        self.replay.start_replay(speed=2.0)

        self.assertTrue(self.replay.is_active)
        self.assertFalse(self.replay.is_paused)
        self.assertEqual(self.replay.speed, 2.0)

        self.replay.pause_replay()
        self.assertTrue(self.replay.is_paused)

        self.replay.resume_replay()
        self.assertFalse(self.replay.is_paused)

        self.replay.stop_replay()
        self.assertFalse(self.replay.is_active)

    def test_step_advancement_and_completion(self):
        """Test stepping frame by frame through the entire mission."""
        self.replay.load_mission(self.mission)
        self.replay.start_replay(speed=1.0)

        frames = []
        for _ in range(10):
            frame = self.replay.step()
            self.assertIsNotNone(frame)
            frames.append(frame)

        self.assertEqual(len(frames), 10)
        self.assertTrue(self.replay.is_complete)

        # Stepping beyond total samples returns None
        end_frame = self.replay.step()
        self.assertIsNone(end_frame)

    def test_unified_frame_schema(self):
        """Test that replayed frames contain exact telemetry structure with mode: REPLAY."""
        self.replay.load_mission(self.mission)
        self.replay.start_replay()

        frame = self.replay.step()
        self.assertIsNotNone(frame)

        # Check top-level markers
        self.assertEqual(frame["mode"], "REPLAY")
        self.assertIn("replay", frame)
        self.assertEqual(frame["replay"]["is_active"], True)
        self.assertEqual(frame["replay"]["current_index"], 0)
        self.assertEqual(frame["replay"]["total_samples"], 10)
        self.assertAlmostEqual(frame["replay"]["progress_pct"], 0.0, places=1)

        # Check standard telemetry components
        self.assertIn("sensors", frame)
        self.assertIn("vehicle", frame)
        self.assertIn("digital_twin", frame)
        self.assertIn("diagnosis", frame)
        self.assertIn("risk", frame)
        self.assertIn("health_index", frame)
        self.assertEqual(frame["rpm"], 2400.0)

    def test_seeking(self):
        """Test seeking by index, percentage, and timestamp."""
        self.replay.load_mission(self.mission)
        self.replay.start_replay()

        # Seek to index 5
        self.replay.seek_to_index(5)
        self.assertEqual(self.replay.current_index, 5)
        sample = self.replay.get_current_sample()
        self.assertEqual(sample["replay"]["current_index"], 5)
        self.assertEqual(sample["rpm"], 2400.0 + 5 * 10.0)

        # Seek to percentage 80% (index 7 of 10)
        self.replay.seek_to_percentage(80.0)
        self.assertEqual(self.replay.current_index, 7)

        # Seek to seconds (time = 3.0 sec)
        self.replay.seek_to_time(3.0)
        self.assertEqual(self.replay.current_index, 3)

        # Clamping bounds
        self.replay.seek_to_index(999)
        self.assertEqual(self.replay.current_index, 9)

        self.replay.seek_to_index(-10)
        self.assertEqual(self.replay.current_index, 0)

    def test_speed_control(self):
        """Test playback speed configuration and clamping."""
        self.replay.load_mission(self.mission)
        self.replay.set_speed(4.0)
        self.assertEqual(self.replay.speed, 4.0)

        # Speed upper and lower bounds
        self.replay.set_speed(100.0)
        self.assertEqual(self.replay.speed, 10.0)

        self.replay.set_speed(0.01)
        self.assertEqual(self.replay.speed, 0.1)

    def test_immutability(self):
        """Ensure that replaying and stepping does not alter original mission samples."""
        initial_rpm = self.mission.samples[0].telemetry["rpm"]
        initial_health = self.mission.samples[0].health["overall"]

        self.replay.load_mission(self.mission)
        self.replay.start_replay(speed=5.0)

        for _ in range(10):
            self.replay.step()

        # Verify underlying mission data is strictly unchanged
        self.assertEqual(self.mission.samples[0].telemetry["rpm"], initial_rpm)
        self.assertEqual(self.mission.samples[0].health["overall"], initial_health)


if __name__ == "__main__":
    unittest.main(verbosity=2)
