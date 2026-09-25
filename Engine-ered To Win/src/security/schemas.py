from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
import re

class ScenarioPayload(BaseModel):
    scenario: str = Field(..., max_length=100)

    @field_validator("scenario")
    @classmethod
    def validate_scenario_name(cls, v: str) -> str:
        cleaned = v.strip()
        if not re.match(r"^[a-zA-Z0-9_\-\s]+$", cleaned):
            raise ValueError("Scenario name contains invalid characters.")
        return cleaned

class FaultInjectPayload(BaseModel):
    fault_id: Optional[str] = Field(None, max_length=100)
    scenario: Optional[str] = Field(None, max_length=100)

class EnvironmentPayload(BaseModel):
    altitude: Optional[float] = Field(None, ge=0, le=60000)
    altitude_ft: Optional[float] = Field(None, ge=0, le=60000)
    ambient_temp: Optional[float] = Field(None, ge=-80, le=80)
    ambient_temp_c: Optional[float] = Field(None, ge=-80, le=80)
    throttle: Optional[float] = Field(None, ge=0, le=100)
    throttle_pct: Optional[float] = Field(None, ge=0, le=100)

class MissionProfilePayload(BaseModel):
    profile: Optional[str] = Field(None, max_length=50)
    mission_profile: Optional[str] = Field(None, max_length=50)

class EndurancePayload(BaseModel):
    simulation_speed: Optional[float] = Field(None, ge=0.1, le=50.0)
    speed: Optional[float] = Field(None, ge=0.1, le=50.0)

class MissionStartPayload(BaseModel):
    mission_name: str = Field("Autonomous Patrol", max_length=120)
    uav_id: str = Field("AEROTWIN-MALE-01", max_length=100)
    notes: Optional[str] = Field("", max_length=1000)
    tags: Optional[List[str]] = Field(default_factory=list)

class ReplaySpeedPayload(BaseModel):
    speed: float = Field(1.0, ge=0.1, le=20.0)

class ReplaySeekPayload(BaseModel):
    seconds: Optional[float] = Field(None, ge=0)
    percent: Optional[float] = Field(None, ge=0, le=100)
    index: Optional[int] = Field(None, ge=0)

class RegressionPlotQuery(BaseModel):
    type: str = Field("all", max_length=30)

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        valid_types = {"all", "cht_rpm", "egt_fuel", "oil_p_oil_t", "vib_rpm"}
        if v.lower().strip() not in valid_types:
            raise ValueError("Invalid plot type requested.")
        return v.lower().strip()

class IncidentStatusPayload(BaseModel):
    status: str = Field(..., max_length=30)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid_statuses = {"OPEN", "INVESTIGATING", "CONTAINED", "RESOLVED", "FALSE_POSITIVE"}
        cleaned = v.upper().strip()
        if cleaned not in valid_statuses:
            raise ValueError(f"Invalid incident status: {v}. Must be one of {valid_statuses}")
        return cleaned


