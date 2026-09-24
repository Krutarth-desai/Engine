"""
Unit Tests for AeroTwin Mission Store
====================================

Tests LocalMissionStore persistence, atomic file writes, fast summary indexing,
retrieval, deletion, and resilient error handling for corrupt or missing files.
"""

import os
import sys
import shutil
import tempfile
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
from src.mission.mission_store import LocalMissionStore


class TestMissionStore(unittest.TestCase):

    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="aerotwin_store_test_")
        self.store = LocalMissionStore(storage_dir=self.test_dir)

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def _create_dummy_mission(self, mission_id: str = "MISSION_TEST_001") -> Mission:
        """Helper to create a populated dummy mission."""
        now_iso = datetime.now().isoformat()
        metadata = MissionMetadata(
            mission_id=mission_id,
            name="Test Mission Recon",
            created_at=now_iso,
            started_at=now_iso,
            ended_at=now_iso,
            duration_sec=10.0,
            status=MissionStatus.COMPLETED.value,
            selected_unit=1,
            mission_profile="CRUISE",
            simulation_speed=1.0,
            sample_rate_hz=1.0,
            total_samples=2,
            uav_id="AEROTWIN-MALE-01",
            notes="Automated store test run",
            tags=["recon", "test"]
        )
        events = [
            MissionEvent(
                timestamp=now_iso,
                mission_time_sec=0.0,
                event_type=MissionEventType.MISSION_STARTED.value,
                description="Mission started",
                details={"profile": "CRUISE"}
            )
        ]
        samples = [
            MissionSample(
                timestamp=now_iso,
                mission_time_sec=0.0,
                tick=1,
                telemetry={"rpm": 2450.0, "cht_c": 142.0, "egt_c": 615.0},
                environment={"altitude_ft": 15000.0, "throttle_pct": 75.0},
                digital_twin={"health_index": 98.0},
                health={"overall": 98.0, "thermal": 98.0},
                degradation={"thermal_wear": 0.01},
                diagnosis={"fault": "Nominal Operation", "state": "NORMAL", "confidence": 0.98},
                mission_profile="CRUISE",
                scenario="Normal"
            ),
            MissionSample(
                timestamp=now_iso,
                mission_time_sec=1.0,
                tick=2,
                telemetry={"rpm": 2455.0, "cht_c": 142.5, "egt_c": 616.0},
                environment={"altitude_ft": 15000.0, "throttle_pct": 75.0},
                digital_twin={"health_index": 97.5},
                health={"overall": 97.5, "thermal": 97.5},
                degradation={"thermal_wear": 0.01},
                diagnosis={"fault": "Nominal Operation", "state": "NORMAL", "confidence": 0.98},
                mission_profile="CRUISE",
                scenario="Normal"
            )
        ]
        summary = MissionSummary(
            duration_sec=10.0,
            total_samples=2,
            start_health=98.0,
            end_health=97.5,
            min_health=97.5,
            max_health=98.0,
            avg_health=97.75,
            health_delta=-0.5,
            max_altitude_ft=15000.0,
            avg_altitude_ft=15000.0,
            max_throttle_pct=75.0,
            avg_throttle_pct=75.0,
            total_faults=0,
            fault_types=[],
            highest_severity="INFO"
        )
        return Mission(metadata=metadata, events=events, samples=samples, summary=summary)

    def test_save_and_load_mission(self):
        """Test saving a mission to disk and loading it with exact fidelity."""
        mission = self._create_dummy_mission("MISSION_SAVE_01")
        filepath = self.store.save_mission(mission)

        self.assertTrue(os.path.exists(filepath))
        self.assertTrue(filepath.endswith("MISSION_SAVE_01.json"))

        # Load back
        loaded = self.store.load_mission("MISSION_SAVE_01")
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded.metadata.mission_id, "MISSION_SAVE_01")
        self.assertEqual(loaded.metadata.name, "Test Mission Recon")
        self.assertEqual(len(loaded.samples), 2)
        self.assertEqual(len(loaded.events), 1)
        self.assertIsNotNone(loaded.summary)
        self.assertEqual(loaded.summary.start_health, 98.0)
        self.assertEqual(loaded.summary.end_health, 97.5)

    def test_list_missions(self):
        """Test listing missions returning metadata and summary items."""
        m1 = self._create_dummy_mission("MISSION_LIST_01")
        m2 = self._create_dummy_mission("MISSION_LIST_02")
        self.store.save_mission(m1)
        self.store.save_mission(m2)

        listing = self.store.list_missions()
        self.assertEqual(len(listing), 2)

        ids = [item["metadata"]["mission_id"] for item in listing]
        self.assertIn("MISSION_LIST_01", ids)
        self.assertIn("MISSION_LIST_02", ids)

        # Check summary is present
        for item in listing:
            self.assertIn("metadata", item)
            self.assertIn("summary", item)
            self.assertIsNotNone(item["summary"])

    def test_delete_mission(self):
        """Test deleting a mission from the store."""
        mission = self._create_dummy_mission("MISSION_DEL_01")
        self.store.save_mission(mission)

        self.assertTrue(self.store.mission_exists("MISSION_DEL_01"))

        deleted = self.store.delete_mission("MISSION_DEL_01")
        self.assertTrue(deleted)
        self.assertFalse(self.store.mission_exists("MISSION_DEL_01"))

        # Deleting non-existent mission returns False
        self.assertFalse(self.store.delete_mission("NON_EXISTENT_MISSION"))

    def test_load_non_existent_mission(self):
        """Loading an invalid mission ID returns None."""
        loaded = self.store.load_mission("DOES_NOT_EXIST")
        self.assertIsNone(loaded)

    def test_corrupted_json_resilience(self):
        """Verify that corrupted JSON files do not crash list_missions or load_mission."""
        corrupt_path = os.path.join(self.test_dir, "MISSION_CORRUPT_01.json")
        with open(corrupt_path, "w") as f:
            f.write("{ this is incomplete corrupted JSON content !!!")

        # load_mission should handle gracefully
        loaded = self.store.load_mission("MISSION_CORRUPT_01")
        self.assertIsNone(loaded)

        # list_missions should not crash
        valid_mission = self._create_dummy_mission("MISSION_VALID_01")
        self.store.save_mission(valid_mission)

        listing = self.store.list_missions()
        # Should still contain the valid mission
        ids = [item["metadata"]["mission_id"] for item in listing]
        self.assertIn("MISSION_VALID_01", ids)


if __name__ == "__main__":
    unittest.main(verbosity=2)
