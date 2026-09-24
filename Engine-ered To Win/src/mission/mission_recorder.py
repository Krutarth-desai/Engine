"""
AeroTwin Mission Recording & Replay - Mission Recorder
======================================================
Non-intrusive runtime observer that captures complete, synchronized UAV Digital Twin
telemetry, environmental physics, health states, and diagnostic event logs.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from .mission_models import (
    Mission,
    MissionMetadata,
    MissionSample,
    MissionEvent,
    MissionEventType,
    MissionStatus,
    generate_mission_id
)
from .mission_summary import compute_mission_summary
from .mission_store import MissionStore


logger = logging.getLogger(__name__)

MAX_MISSION_SAMPLES = 7200


class MissionRecorder:
    """
    Observer engine that records full UAV Digital Twin state at every 1 Hz tick.
    """

    def __init__(self, max_samples: int = MAX_MISSION_SAMPLES):
        self.max_samples = max_samples
        self._current_mission: Optional[Mission] = None
        self._is_recording: bool = False
        self._start_time_monotonic: Optional[float] = None
        self._last_recorded_tick: Optional[int] = None
        self._last_recorded_timestamp: Optional[str] = None

        # Tracking state to automatically generate mission events
        self._prev_profile: Optional[str] = None
        self._prev_scenario: Optional[str] = None
        self._prev_fault_state: Optional[str] = None
        self._prev_fault_code: Optional[str] = None

    def is_recording(self) -> bool:
        return self._is_recording and self._current_mission is not None

    @property
    def current_mission(self) -> Optional[Mission]:
        return self._current_mission

    def get_current_mission(self) -> Optional[Mission]:
        return self._current_mission

    def start_mission(
        self,
        name: Optional[str] = None,
        mission_name: Optional[str] = None,
        uav_id: Optional[str] = None,
        notes: Optional[str] = None,
        tags: Optional[List[str]] = None,
        initial_profile: Optional[str] = None,
        initial_scenario: Optional[str] = None,
        metadata_overrides: Optional[Dict[str, Any]] = None
    ) -> Mission:
        """
        Initializes a new mission recording session.
        """
        now = datetime.now()
        now_iso = now.isoformat()
        mid = generate_mission_id()

        resolved_name = (mission_name or name or f"Mission {now.strftime('%Y-%m-%d %H:%M')}").strip()
        overrides = metadata_overrides or {}
        resolved_profile = initial_profile or str(overrides.get("mission_profile", "CRUISE"))
        resolved_scenario = initial_scenario or "Normal"

        metadata = MissionMetadata(
            mission_id=mid,
            name=resolved_name,
            created_at=now_iso,
            started_at=now_iso,
            status=MissionStatus.RECORDING.value,
            selected_unit=int(overrides.get("selected_unit", 1)),
            mission_profile=resolved_profile,
            simulation_speed=float(overrides.get("simulation_speed", 1.0)),
            sample_rate_hz=float(overrides.get("sample_rate_hz", 1.0)),
            total_samples=0,
            uav_id=uav_id or str(overrides.get("uav_id", "AEROTWIN-MALE-01")),
            notes=notes or str(overrides.get("notes", "")),
            tags=tags or overrides.get("tags", [])
        )

        initial_event = MissionEvent(
            timestamp=now_iso,
            mission_time_sec=0.0,
            event_type=MissionEventType.MISSION_STARTED.value,
            description=f"Mission '{metadata.name}' started recording.",
            details={"mission_id": mid, "profile": metadata.mission_profile, "scenario": resolved_scenario}
        )

        self._current_mission = Mission(
            metadata=metadata,
            events=[initial_event],
            samples=[],
            summary=None
        )

        self._is_recording = True
        self._last_recorded_tick = None
        self._last_recorded_timestamp = None
        self._prev_profile = metadata.mission_profile
        self._prev_scenario = resolved_scenario
        self._prev_fault_state = "NORMAL"
        self._prev_fault_code = "NORMAL"

        logger.info(f"Mission recording started: {mid} ({metadata.name})")
        return self._current_mission

    def record_sample(self, payload: Dict[str, Any]) -> Optional[MissionSample]:
        """
        Captures one complete tick payload after Telemetry, Digital Twin,
        Health, and Fault Fusion processing. Returns the recorded MissionSample or None.
        """
        if not self._is_recording or self._current_mission is None:
            return None

        # Check memory bounds
        if len(self._current_mission.samples) >= self.max_samples:
            logger.warning(f"Mission sample limit ({self.max_samples}) reached. Stopping recording.")
            self.stop_mission()
            return None

        # Prevent duplicate recording on the same tick or timestamp
        tick_val = payload.get("tick")
        timestamp_val = payload.get("timestamp") or datetime.now().isoformat()

        if tick_val is not None and self._last_recorded_tick is not None and tick_val == self._last_recorded_tick:
            return None
        if tick_val is None and timestamp_val == self._last_recorded_timestamp:
            return None

        # Resolve mission elapsed time
        sample_count = len(self._current_mission.samples)
        mission_time = float(payload.get("mission_time_sec") or payload.get("environment", {}).get("mission_time_sec") or sample_count)

        # Extract telemetry channels (support flat or nested structure)
        telemetry_dict = {
            "rpm": float(payload.get("rpm", 2450.0)),
            "cht_c": float(payload.get("cht_c", 142.0)),
            "egt_c": float(payload.get("egt_c", 615.0)),
            "oil_pressure_bar": float(payload.get("oil_pressure_bar", 4.69)),
            "oil_temperature_c": float(payload.get("oil_temperature_c", 92.0)),
            "fuel_flow_lh": float(payload.get("fuel_flow_lh", 17.6)),
            "vibration_g": float(payload.get("vibration_g", 1.42)),
            "battery_voltage_v": float(payload.get("battery_voltage_v", 27.6)),
            "injection_timing_deg": float(payload.get("injection_timing_deg", 23.4))
        }

        # Extract environment block
        dt_block = payload.get("digital_twin") or {}
        env_dict = payload.get("environment") or dt_block.get("environment") or {}
        profile_name = env_dict.get("mission_profile") or payload.get("mission_profile") or "CRUISE"

        # Extract health block
        h_block = payload.get("health") or dt_block.get("health") or {}
        subsystems = payload.get("subsystem_health") or dt_block.get("subsystem_health") or {}
        health_dict = {
            "overall": float(h_block.get("overall", payload.get("health_index", 100.0))),
            "status": str(h_block.get("status", "HEALTHY")),
            "thermal": float(h_block.get("thermal", subsystems.get("thermal", 100.0))),
            "combustion": float(h_block.get("combustion", subsystems.get("combustion", 100.0))),
            "lubrication": float(h_block.get("lubrication", subsystems.get("lubrication", 100.0))),
            "mechanical": float(h_block.get("mechanical", subsystems.get("mechanical", 100.0))),
            "electrical": float(h_block.get("electrical", subsystems.get("electrical", 100.0))),
            "sensor": float(h_block.get("sensor", subsystems.get("sensor", 100.0)))
        }

        # Extract degradation block
        deg_dict = payload.get("degradation") or dt_block.get("degradation") or {}

        # Extract Digital Twin expected & residuals
        dt_dict = {
            "expected": dt_block.get("expected", {}),
            "residuals": dt_block.get("residuals", {})
        }

        # Extract diagnosis block
        diag_dict = payload.get("diagnosis") or {}
        scenario_name = payload.get("scenario") or "Normal"

        sample = MissionSample(
            timestamp=timestamp_val,
            mission_time_sec=round(mission_time, 2),
            tick=int(tick_val if tick_val is not None else sample_count),
            telemetry=telemetry_dict,
            environment=env_dict,
            digital_twin=dt_dict,
            health=health_dict,
            degradation=deg_dict,
            diagnosis=diag_dict,
            mission_profile=profile_name,
            scenario=scenario_name
        )

        self._current_mission.samples.append(sample)
        self._last_recorded_tick = tick_val
        self._last_recorded_timestamp = timestamp_val

        # Update metadata duration and counts
        self._current_mission.metadata.total_samples = len(self._current_mission.samples)
        first_time = self._current_mission.samples[0].mission_time_sec
        self._current_mission.metadata.duration_sec = round(mission_time - first_time, 1)

        # 4. Automatic Event Detection
        self._check_and_log_events(sample, timestamp_val, mission_time)

        return sample

    def _check_and_log_events(self, sample: MissionSample, timestamp_str: str, mission_time: float) -> None:
        """Monitors sample changes and logs high-level mission events."""
        # 1. Mission profile change
        if sample.mission_profile and sample.mission_profile != self._prev_profile:
            self.record_event(
                event_type=MissionEventType.MISSION_PROFILE_CHANGED.value,
                description=f"Flight phase transitioned to '{sample.mission_profile}'.",
                details={"from": self._prev_profile, "to": sample.mission_profile},
                timestamp=timestamp_str,
                mission_time=mission_time
            )
            self._prev_profile = sample.mission_profile

        # 2. Scenario injection change
        if sample.scenario and sample.scenario != self._prev_scenario:
            if sample.scenario != "Normal":
                self.record_event(
                    event_type=MissionEventType.FAULT_INJECTED.value,
                    description=f"Fault scenario '{sample.scenario}' injected into live engine.",
                    details={"scenario": sample.scenario},
                    timestamp=timestamp_str,
                    mission_time=mission_time
                )
            self._prev_scenario = sample.scenario

        # 3. Diagnosis / fault state transitions
        diag = sample.diagnosis or {}
        f_state = diag.get("state") or "NORMAL"
        f_code = diag.get("fault_code") or "NORMAL"
        f_name = diag.get("fault") or "Nominal Operation"

        if f_state != self._prev_fault_state or f_code != self._prev_fault_code:
            if f_state in ["ANOMALY", "SUSPECTED"] and self._prev_fault_state == "NORMAL":
                self.record_event(
                    event_type=MissionEventType.FAULT_DETECTED.value,
                    description=f"Anomalous engine signature detected: {f_name} (State: {f_state}).",
                    details={"fault": f_name, "state": f_state, "confidence": diag.get("confidence")},
                    timestamp=timestamp_str,
                    mission_time=mission_time
                )
            elif f_state in ["CONFIRMED", "CRITICAL"] and self._prev_fault_state not in ["CONFIRMED", "CRITICAL"]:
                self.record_event(
                    event_type=MissionEventType.FAULT_CONFIRMED.value,
                    description=f"Fault '{f_name}' CONFIRMED with {diag.get('confidence', 0)*100:.1f}% confidence.",
                    details={"fault": f_name, "severity": diag.get("severity"), "evidence": diag.get("evidence")},
                    timestamp=timestamp_str,
                    mission_time=mission_time
                )
            elif f_state == "NORMAL" and self._prev_fault_state != "NORMAL":
                self.record_event(
                    event_type=MissionEventType.FAULT_CLEARED.value,
                    description="Engine parameters recovered to nominal operating limits.",
                    details={"previous_fault": f_name},
                    timestamp=timestamp_str,
                    mission_time=mission_time
                )

            self._prev_fault_state = f_state
            self._prev_fault_code = f_code

    def record_event(
        self,
        event_type: str,
        description: str,
        details: Optional[Dict[str, Any]] = None,
        timestamp: Optional[str] = None,
        mission_time: Optional[float] = None
    ) -> None:
        """Manually records a milestone event into the active mission."""
        if not self._is_recording or self._current_mission is None:
            return

        ts = timestamp or datetime.now().isoformat()
        if mission_time is None:
            if self._current_mission.samples:
                m_time = self._current_mission.samples[-1].mission_time_sec
            else:
                m_time = 0.0
        else:
            m_time = mission_time

        ev = MissionEvent(
            timestamp=ts,
            mission_time_sec=round(float(m_time), 2),
            event_type=event_type,
            description=description,
            details=details or {}
        )
        self._current_mission.events.append(ev)

    def log_profile_change(self, new_profile: str) -> None:
        """Explicitly records a flight profile transition event."""
        if not self._is_recording or self._current_mission is None:
            return
        now_iso = datetime.now().isoformat()
        last_time = self._current_mission.samples[-1].mission_time_sec if self._current_mission.samples else 0.0
        self.record_event(
            event_type=MissionEventType.MISSION_PROFILE_CHANGED.value,
            description=f"Flight phase transitioned to '{new_profile}'.",
            details={"from": self._prev_profile, "to": new_profile, "new_profile": new_profile},
            timestamp=now_iso,
            mission_time=last_time
        )
        self._prev_profile = new_profile

    def log_scenario_injection(self, scenario: str) -> None:
        """Explicitly records a fault scenario injection event."""
        if not self._is_recording or self._current_mission is None:
            return
        now_iso = datetime.now().isoformat()
        last_time = self._current_mission.samples[-1].mission_time_sec if self._current_mission.samples else 0.0
        self.record_event(
            event_type=MissionEventType.FAULT_INJECTED.value,
            description=f"Fault scenario '{scenario}' injected into live engine.",
            details={"scenario": scenario},
            timestamp=now_iso,
            mission_time=last_time
        )
        self._prev_scenario = scenario

    def stop_mission(self, store: Optional[MissionStore] = None) -> Optional[Mission]:
        """
        Finalizes the recording, computes analytics summary, and optionally persists to store.
        """
        if not self._is_recording or self._current_mission is None:
            return None

        now_iso = datetime.now().isoformat()
        mission = self._current_mission

        # Record stop event
        last_time = mission.samples[-1].mission_time_sec if mission.samples else 0.0
        self.record_event(
            event_type=MissionEventType.MISSION_STOPPED.value,
            description=f"Mission '{mission.metadata.name}' completed and finalized.",
            details={"total_samples": len(mission.samples)},
            timestamp=now_iso,
            mission_time=last_time
        )

        mission.metadata.status = MissionStatus.COMPLETED.value
        mission.metadata.ended_at = now_iso
        mission.metadata.total_samples = len(mission.samples)

        # Compute summary
        mission.summary = compute_mission_summary(mission.samples, mission.events)
        mission.metadata.duration_sec = mission.summary.duration_sec

        self._is_recording = False

        # Optional persistence
        if store is not None:
            try:
                store.save_mission(mission)
                logger.info(f"Mission {mission.metadata.mission_id} persisted successfully.")
            except Exception as e:
                logger.error(f"Failed to persist mission upon stop: {e}")

        logger.info(f"Mission recording stopped: {mission.metadata.mission_id} ({len(mission.samples)} samples)")
        return mission

    def cancel_mission(self) -> None:
        """Cancels recording and discards active buffers without saving."""
        if self._current_mission is not None:
            self._current_mission.metadata.status = MissionStatus.CANCELLED.value
        self._is_recording = False
        self._current_mission = None
        self._last_recorded_tick = None
        self._last_recorded_timestamp = None

    def clear_current_mission(self) -> None:
        self.cancel_mission()
