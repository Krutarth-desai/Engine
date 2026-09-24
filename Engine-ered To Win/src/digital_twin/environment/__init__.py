"""
AeroTwin Digital Twin - Environment & Mission Simulation Subpackage
===================================================================
Phase 4 Mission and Atmospheric Physics Simulation for MALE UAVs.
Exposes atmospheric physics, operating condition classification,
dynamic throttle modeling, flight phase profiles, and endurance tracking.
"""

from .atmosphere import (
    AtmosphericState,
    compute_atmospheric_state,
    P0_KPA,
    T0_K,
    RHO0_KG_M3
)
from .operating_condition import (
    OperatingCondition,
    classify_operating_conditions
)
from .transient_model import ThrottleTransientModel
from .mission_profile import (
    MissionPhase,
    MISSION_PROFILES,
    get_mission_profile
)
from .environment_model import EnvironmentModel

__all__ = [
    "EnvironmentModel",
    "AtmosphericState",
    "compute_atmospheric_state",
    "OperatingCondition",
    "classify_operating_conditions",
    "ThrottleTransientModel",
    "MissionPhase",
    "MISSION_PROFILES",
    "get_mission_profile",
    "P0_KPA",
    "T0_K",
    "RHO0_KG_M3"
]
