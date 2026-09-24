"""
AeroTwin Mission Recording & Replay - Mission Replay Engine
===========================================================
Deterministic, read-only mission playback engine that reproduces historical
UAV flight states, digital twin predictions, health indices, and diagnostic events.
Formats replay frames to match the unified live telemetry schema.
"""

import logging
from typing import Dict, Any, List, Optional
from .mission_models import Mission, MissionSample


logger = logging.getLogger(__name__)

SUPPORTED_REPLAY_SPEEDS = [0.25, 0.5, 1.0, 2.0, 5.0, 10.0]


class MissionReplay:
    """
    Simulates playback of a recorded UAV mission at variable speeds.
    """

    def __init__(self, mission: Optional[Mission] = None):
        self._mission: Optional[Mission] = None
        self._current_index: int = 0
        self._is_active: bool = False
        self._is_paused: bool = False
        self._is_complete: bool = False
        self.speed: float = 1.0

        if mission is not None:
            self.load_mission(mission)

    @property
    def is_active(self) -> bool:
        return self._is_active and self._mission is not None

    @property
    def is_paused(self) -> bool:
        return self._is_paused

    @property
    def is_complete(self) -> bool:
        return self._is_complete

    @property
    def mission_id(self) -> Optional[str]:
        return self._mission.metadata.mission_id if self._mission else None

    @property
    def total_samples(self) -> int:
        return len(self._mission.samples) if self._mission else 0

    @property
    def current_index(self) -> int:
        return self._current_index

    def load_mission(self, mission: Mission) -> None:
        """Loads a mission into memory for playback."""
        if not mission or not mission.samples:
            raise ValueError("Cannot load empty mission into replay engine.")

        self._mission = mission
        self._current_index = 0
        self._is_active = False
        self._is_paused = False
        self._is_complete = False
        self._started = False
        logger.info(f"Loaded mission {mission.metadata.mission_id} ({len(mission.samples)} samples) for replay.")

    @property
    def current_mission(self) -> Optional[Mission]:
        return self._mission

    def start_replay(self, speed: float = 1.0) -> Optional[Dict[str, Any]]:
        """Starts or resets playback from current index."""
        if self._mission is None:
            raise RuntimeError("No mission loaded in replay engine.")

        self.set_speed(speed)
        self._is_active = True
        self._is_paused = False
        self._is_complete = False
        self._started = False

        return self.get_current_sample()

    def pause_replay(self) -> None:
        if self._is_active:
            self._is_paused = True

    def resume_replay(self) -> None:
        if self._is_active and not self._is_complete:
            self._is_paused = False

    def stop_replay(self) -> None:
        """Stops playback and resets to start."""
        self._is_active = False
        self._is_paused = False
        self._is_complete = False
        self._started = False
        self._current_index = 0

    def set_speed(self, speed: float) -> float:
        """Sets playback speed multiplier clamped between 0.1x and 10.0x."""
        try:
            val = float(speed)
            self.speed = max(0.1, min(10.0, val))
        except Exception:
            self.speed = 1.0
        return self.speed

    def set_replay_speed(self, speed: float) -> float:
        return self.set_speed(speed)

    def seek_index(self, index: int) -> Optional[Dict[str, Any]]:
        """Jumps directly to a sample index [0, total_samples - 1]."""
        if self._mission is None or not self._mission.samples:
            return None

        self._current_index = max(0, min(len(self._mission.samples) - 1, int(index)))
        self._started = True
        self._is_complete = (self._current_index >= len(self._mission.samples) - 1)
        return self.get_current_sample()

    def seek_to_index(self, index: int) -> Optional[Dict[str, Any]]:
        return self.seek_index(index)

    def seek(self, target_time_sec: float) -> Optional[Dict[str, Any]]:
        """Seeks to the sample closest to the specified mission time in seconds."""
        if self._mission is None or not self._mission.samples:
            return None

        target = float(target_time_sec)
        samples = self._mission.samples

        best_idx = 0
        min_diff = abs(samples[0].mission_time_sec - target)

        for i, s in enumerate(samples):
            diff = abs(s.mission_time_sec - target)
            if diff < min_diff:
                min_diff = diff
                best_idx = i

        return self.seek_index(best_idx)

    def seek_to_time(self, target_time_sec: float) -> Optional[Dict[str, Any]]:
        return self.seek(target_time_sec)

    def seek_percent(self, percent: float) -> Optional[Dict[str, Any]]:
        """Seeks by mission percentage [0.0 to 100.0]."""
        if self._mission is None or not self._mission.samples:
            return None

        pct = max(0.0, min(100.0, float(percent)))
        idx = int(round((pct / 100.0) * (len(self._mission.samples) - 1)))
        return self.seek_index(idx)

    def seek_to_percentage(self, percent: float) -> Optional[Dict[str, Any]]:
        return self.seek_percent(percent)

    def step(self) -> Optional[Dict[str, Any]]:
        """
        Advances playback by 1 tick and returns the formatted telemetry frame.
        If at the end of the mission, marks complete and returns final frame,
        subsequently returning None.
        """
        if not self._is_active or self._mission is None or not self._mission.samples:
            return None

        if self._is_paused:
            return self.get_current_sample()

        if self._is_complete:
            return None

        if not self._started:
            self._started = True
            if len(self._mission.samples) == 1:
                self._is_complete = True
            return self.get_current_sample()

        self._current_index += 1
        if self._current_index >= len(self._mission.samples) - 1:
            self._current_index = len(self._mission.samples) - 1
            self._is_complete = True

        return self.get_current_sample()

    def get_progress_percent(self) -> float:
        if not self._mission or not self._mission.samples:
            return 0.0
        total = len(self._mission.samples)
        if total <= 1:
            return 100.0
        return round((self._current_index / (total - 1)) * 100.0, 1)

    def get_progress(self) -> Dict[str, Any]:
        if not self._mission or not self._mission.samples:
            return {
                "mission_id": None,
                "current_index": 0,
                "total_samples": 0,
                "progress_pct": 0.0,
                "mission_time_sec": 0.0,
                "is_active": False,
                "is_paused": False,
                "is_complete": False,
                "speed": self.speed
            }

        sample = self._mission.samples[self._current_index]
        return {
            "mission_id": self._mission.metadata.mission_id,
            "name": self._mission.metadata.name,
            "current_index": self._current_index,
            "total_samples": len(self._mission.samples),
            "progress_pct": self.get_progress_percent(),
            "mission_time_sec": sample.mission_time_sec,
            "is_active": self._is_active,
            "is_paused": self._is_paused,
            "is_complete": self._is_complete,
            "speed": self.speed
        }

    def get_state(self) -> Dict[str, Any]:
        return self.get_progress()

    def get_current_sample(self) -> Optional[Dict[str, Any]]:
        """
        Synthesizes the current MissionSample into the exact unified telemetry contract
        consumed by the frontend dashboard.
        """
        if self._mission is None or not self._mission.samples:
            return None

        sample: MissionSample = self._mission.samples[self._current_index]
        tel = sample.telemetry
        env = sample.environment
        dt = sample.digital_twin
        hlth = sample.health
        deg = sample.degradation
        diag = sample.diagnosis

        # Formulate unified sensors structure
        sensors_dict = {
            "rpm": {"key": "rpm", "name": "RPM", "value": tel.get("rpm", 2450.0), "unit": "RPM", "status": "NORMAL", "trend": "STABLE", "progressPct": 76.5},
            "cht": {"key": "cht", "name": "CHT", "value": tel.get("cht_c", 142.0), "unit": "°C", "status": "NORMAL", "trend": "STABLE", "progressPct": 48.4},
            "egt": {"key": "egt", "name": "EGT", "value": tel.get("egt_c", 615.0), "unit": "°C", "status": "NORMAL", "trend": "STABLE", "progressPct": 52.1},
            "oil_pressure": {"key": "oil_pressure", "name": "Oil Pressure", "value": round(tel.get("oil_pressure_bar", 4.69) * 14.5038, 1), "unit": "psi", "status": "NORMAL", "trend": "STABLE", "progressPct": 68.0},
            "oil_temperature": {"key": "oil_temperature", "name": "Oil Temperature", "value": tel.get("oil_temperature_c", 92.0), "unit": "°C", "status": "NORMAL", "trend": "STABLE", "progressPct": 51.7},
            "fuel_flow": {"key": "fuel_flow", "name": "Fuel Flow", "value": tel.get("fuel_flow_lh", 17.6), "unit": "L/hr", "status": "NORMAL", "trend": "STABLE", "progressPct": 44.0},
            "vibration": {"key": "vibration", "name": "Vibration", "value": tel.get("vibration_g", 1.42), "unit": "g", "status": "NORMAL", "trend": "STABLE", "progressPct": 31.6},
            "bus_voltage": {"key": "bus_voltage", "name": "Bus Voltage", "value": tel.get("battery_voltage_v", 27.6), "unit": "V", "status": "NORMAL", "trend": "STABLE", "progressPct": 60.0},
            "injection_timing": {"key": "injection_timing", "name": "Injection Timing", "value": tel.get("injection_timing_deg", 23.4), "unit": "°CA", "status": "NORMAL", "trend": "STABLE", "progressPct": 47.9}
        }

        # Subsystems
        subsystem_health = {
            "thermal": hlth.get("thermal", 100.0),
            "combustion": hlth.get("combustion", 100.0),
            "lubrication": hlth.get("lubrication", 100.0),
            "mechanical": hlth.get("mechanical", 100.0),
            "electrical": hlth.get("electrical", 100.0),
            "sensor": hlth.get("sensor", 100.0)
        }

        dt_payload = {
            "timestamp": sample.timestamp,
            "actual": tel,
            "expected": dt.get("expected", {}),
            "residuals": dt.get("residuals", {}),
            "degradation": deg,
            "environment": env,
            "health": {
                "overall": hlth.get("overall", 100.0),
                "status": hlth.get("status", "HEALTHY"),
                **subsystem_health
            },
            "subsystem_health": subsystem_health,
            "health_index": hlth.get("overall", 100.0)
        }

        # Build complete payload identical to live broadcast
        return {
            "mode": "REPLAY",
            "replay": self.get_progress(),
            "cycle": int(sample.tick),
            "timestamp": sample.timestamp,
            "mission_time_sec": sample.mission_time_sec,
            "vehicle": {
                "vehicle_id": "UAV-AEROTWIN-01",
                "mission_id": self._mission.metadata.mission_id,
                "altitude": env.get("altitude_ft", 15000.0),
                "throttle": env.get("throttle_pct", 75.0),
                "update_rate": 1.0
            },
            "sensors": sensors_dict,
            "sensor_list": list(sensors_dict.values()),
            "health_index": hlth.get("overall", 100.0),
            "health": dt_payload["health"],
            "subsystem_health": subsystem_health,
            "degradation": deg,
            "digital_twin": dt_payload,
            "diagnosis": diag,
            "fault_label": diag.get("fault", "Nominal Operation"),
            "scenario": sample.scenario,
            "environment": env,
            "mission_profile": sample.mission_profile,
            "risk": {
                "level": diag.get("severity", "LOW"),
                "status_label": "REPLAY MONITOR",
                "action": diag.get("treatment", f"Mission Replay: {diag.get('fault', 'Nominal Operation')} at t={sample.mission_time_sec:.0f}s")
            },
            # Flat telemetry fields
            **tel
        }
