"""
AeroTwin Mission Recording & Replay - Data Models
=================================================
Typed, structured representations of UAV missions, telemetry time-series samples,
chronological event logs, and aggregate post-mission performance summaries.
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field, asdict
from enum import Enum
import uuid
from datetime import datetime


class MissionStatus(str, Enum):
    RECORDING = "RECORDING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class MissionEventType(str, Enum):
    MISSION_STARTED = "MISSION_STARTED"
    MISSION_START = "MISSION_STARTED"
    MISSION_STOPPED = "MISSION_STOPPED"
    MISSION_STOP = "MISSION_STOPPED"
    MISSION_PROFILE_CHANGED = "MISSION_PROFILE_CHANGED"
    PROFILE_CHANGE = "MISSION_PROFILE_CHANGED"
    ENVIRONMENT_CHANGED = "ENVIRONMENT_CHANGED"
    SCENARIO_CHANGED = "SCENARIO_CHANGED"
    FAULT_INJECTED = "FAULT_INJECTED"
    SCENARIO_INJECTED = "FAULT_INJECTED"
    FAULT_DETECTED = "FAULT_DETECTED"
    FAULT_CONFIRMED = "FAULT_CONFIRMED"
    FAULT_CLEARED = "FAULT_CLEARED"
    OPERATOR_COMMAND = "OPERATOR_COMMAND"


@dataclass
class MissionMetadata:
    mission_id: str
    name: str
    created_at: str
    started_at: str
    ended_at: Optional[str] = None
    duration_sec: float = 0.0
    status: str = MissionStatus.RECORDING.value
    selected_unit: int = 1
    mission_profile: str = "CRUISE"
    simulation_speed: float = 1.0
    sample_rate_hz: float = 1.0
    total_samples: int = 0
    uav_id: str = "AEROTWIN-MALE-01"
    owner_id: str = "usr_guest_operator"
    notes: str = ""
    tags: List[str] = field(default_factory=list)

    @property
    def mission_name(self) -> str:
        return self.name

    @property
    def start_time(self) -> str:
        return self.started_at

    @property
    def end_time(self) -> Optional[str]:
        return self.ended_at

    @property
    def sample_count(self) -> int:
        return self.total_samples

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MissionMetadata":
        return cls(
            mission_id=data.get("mission_id", ""),
            name=data.get("name") or data.get("mission_name", "Unnamed Mission"),
            created_at=data.get("created_at", ""),
            started_at=data.get("started_at") or data.get("start_time", ""),
            ended_at=data.get("ended_at") or data.get("end_time"),
            duration_sec=float(data.get("duration_sec", 0.0)),
            status=data.get("status", MissionStatus.RECORDING.value),
            selected_unit=int(data.get("selected_unit", 1)),
            mission_profile=data.get("mission_profile", "CRUISE"),
            simulation_speed=float(data.get("simulation_speed", 1.0)),
            sample_rate_hz=float(data.get("sample_rate_hz", 1.0)),
            total_samples=int(data.get("total_samples") or data.get("sample_count", 0)),
            uav_id=data.get("uav_id", "AEROTWIN-MALE-01"),
            owner_id=data.get("owner_id", "usr_guest_operator"),
            notes=data.get("notes", ""),
            tags=data.get("tags", [])
        )


@dataclass
class MissionEvent:
    timestamp: str
    mission_time_sec: float
    event_type: str
    description: str
    details: Dict[str, Any] = field(default_factory=dict)

    @property
    def data(self) -> Dict[str, Any]:
        return self.details

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MissionEvent":
        return cls(
            timestamp=data.get("timestamp", ""),
            mission_time_sec=float(data.get("mission_time_sec", 0.0)),
            event_type=data.get("event_type", ""),
            description=data.get("description", ""),
            details=data.get("details", {})
        )


@dataclass
class MissionSample:
    timestamp: str
    mission_time_sec: float
    tick: int
    telemetry: Dict[str, float]
    environment: Dict[str, Any]
    digital_twin: Dict[str, Any]
    health: Dict[str, Any]
    degradation: Dict[str, float]
    diagnosis: Dict[str, Any]
    mission_profile: str = "CRUISE"
    scenario: str = "Normal"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MissionSample":
        return cls(
            timestamp=data.get("timestamp", ""),
            mission_time_sec=float(data.get("mission_time_sec", 0.0)),
            tick=int(data.get("tick", 0)),
            telemetry=data.get("telemetry", {}),
            environment=data.get("environment", {}),
            digital_twin=data.get("digital_twin", {}),
            health=data.get("health", {}),
            degradation=data.get("degradation", {}),
            diagnosis=data.get("diagnosis", {}),
            mission_profile=data.get("mission_profile", "CRUISE"),
            scenario=data.get("scenario", "Normal")
        )


@dataclass
class MissionSummary:
    duration_sec: float = 0.0
    total_samples: int = 0
    start_health: float = 100.0
    end_health: float = 100.0
    min_health: float = 100.0
    max_health: float = 100.0
    avg_health: float = 100.0
    health_delta: float = 0.0
    max_altitude_ft: float = 0.0
    avg_altitude_ft: float = 0.0
    max_throttle_pct: float = 0.0
    avg_throttle_pct: float = 0.0
    total_faults: int = 0
    fault_types: List[str] = field(default_factory=list)
    highest_severity: str = "INFO"
    time_of_first_fault_sec: Optional[float] = None
    time_spent_degraded_sec: float = 0.0
    time_spent_critical_sec: float = 0.0
    operating_conditions_encountered: List[str] = field(default_factory=list)
    mission_profiles_encountered: List[str] = field(default_factory=list)
    health_trend_timeline: List[Dict[str, Any]] = field(default_factory=list)
    fault_timeline: List[Dict[str, Any]] = field(default_factory=list)

    @property
    def sample_count(self) -> int:
        return self.total_samples

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MissionSummary":
        return cls(
            duration_sec=float(data.get("duration_sec", 0.0)),
            total_samples=int(data.get("total_samples", 0)),
            start_health=float(data.get("start_health", 100.0)),
            end_health=float(data.get("end_health", 100.0)),
            min_health=float(data.get("min_health", 100.0)),
            max_health=float(data.get("max_health", 100.0)),
            avg_health=float(data.get("avg_health", 100.0)),
            health_delta=float(data.get("health_delta", 0.0)),
            max_altitude_ft=float(data.get("max_altitude_ft", 0.0)),
            avg_altitude_ft=float(data.get("avg_altitude_ft", 0.0)),
            max_throttle_pct=float(data.get("max_throttle_pct", 0.0)),
            avg_throttle_pct=float(data.get("avg_throttle_pct", 0.0)),
            total_faults=int(data.get("total_faults", 0)),
            fault_types=data.get("fault_types", []),
            highest_severity=data.get("highest_severity", "INFO"),
            time_of_first_fault_sec=data.get("time_of_first_fault_sec"),
            time_spent_degraded_sec=float(data.get("time_spent_degraded_sec", 0.0)),
            time_spent_critical_sec=float(data.get("time_spent_critical_sec", 0.0)),
            operating_conditions_encountered=data.get("operating_conditions_encountered", []),
            mission_profiles_encountered=data.get("mission_profiles_encountered", []),
            health_trend_timeline=data.get("health_trend_timeline", []),
            fault_timeline=data.get("fault_timeline", [])
        )


@dataclass
class Mission:
    metadata: MissionMetadata
    events: List[MissionEvent] = field(default_factory=list)
    samples: List[MissionSample] = field(default_factory=list)
    summary: Optional[MissionSummary] = None
    schema_version: str = "1.0"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "schema_version": self.schema_version,
            "metadata": self.metadata.to_dict(),
            "summary": self.summary.to_dict() if self.summary else None,
            "events": [e.to_dict() for e in self.events],
            "samples": [s.to_dict() for s in self.samples]
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Mission":
        metadata = MissionMetadata.from_dict(data.get("metadata", {}))
        summary = MissionSummary.from_dict(data["summary"]) if data.get("summary") else None
        events = [MissionEvent.from_dict(e) for e in data.get("events", [])]
        samples = [MissionSample.from_dict(s) for s in data.get("samples", [])]
        schema_version = data.get("schema_version", "1.0")

        return cls(
            metadata=metadata,
            events=events,
            samples=samples,
            summary=summary,
            schema_version=schema_version
        )


def generate_mission_id(prefix: str = "MSN") -> str:
    """Generates a structured, human-readable yet unique Mission ID."""
    now_str = datetime.now().strftime("%Y%m%d-%H%M%S")
    short_uuid = uuid.uuid4().hex[:4].upper()
    return f"{prefix}-{now_str}-{short_uuid}"
