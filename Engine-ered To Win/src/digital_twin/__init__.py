"""
AeroTwin Digital Twin Core Framework (Phase 2)
==============================================
Physics-informed virtual engine model, continuous degradation tracking,
state estimation residuals, modular subsystem health calculations,
and airworthiness health trends for MALE UAV piston propulsion.
"""

from .engine_model import EngineModel, ENGINE_CONFIG, calculate_air_density_ratio
from .degradation_model import (
    DegradationModel,
    DEFAULT_DEGRADATION_RATES,
    STRESS_THRESHOLDS,
    SCENARIO_DEGRADATION_MAP
)
from .state_estimator import StateEstimator, RESIDUAL_SCALES, SENSOR_ALIASES
from .health_index import (
    HealthIndexCalculator,
    DEFAULT_HEALTH_WEIGHTS,
    DEFAULT_STATUS_THRESHOLDS,
    CRITICAL_OPERATING_LIMITS
)
from .digital_twin_core import DigitalTwinCore
from .environment import (
    EnvironmentModel,
    OperatingCondition,
    AtmosphericState,
    compute_atmospheric_state,
    MissionPhase,
    MISSION_PROFILES,
    get_mission_profile,
    ThrottleTransientModel
)
from .fault_propagation import (
    FaultPropagationEngine,
    EngineConditionState,
    FaultCategory,
    FaultDefinition,
    FAULT_CATALOG,
    FAULT_MISFIRE,
    FAULT_INJECTOR,
    FAULT_COATING,
    FAULT_LUBRICATION,
    FAULT_SENSOR_DRIFT,
    FAULT_COMBUSTION_INSTABILITY,
    FAULT_OVERHEATING,
    FAULT_VIBRATION,
    FAULT_ENGINE_FAILURE_MULTI
)

__all__ = [
    "EngineModel",
    "ENGINE_CONFIG",
    "calculate_air_density_ratio",
    "DegradationModel",
    "DEFAULT_DEGRADATION_RATES",
    "STRESS_THRESHOLDS",
    "SCENARIO_DEGRADATION_MAP",
    "StateEstimator",
    "RESIDUAL_SCALES",
    "SENSOR_ALIASES",
    "HealthIndexCalculator",
    "DEFAULT_HEALTH_WEIGHTS",
    "DEFAULT_STATUS_THRESHOLDS",
    "CRITICAL_OPERATING_LIMITS",
    "DigitalTwinCore",
    "EnvironmentModel",
    "OperatingCondition",
    "AtmosphericState",
    "compute_atmospheric_state",
    "MissionPhase",
    "MISSION_PROFILES",
    "get_mission_profile",
    "ThrottleTransientModel",
    "FaultPropagationEngine",
    "EngineConditionState",
    "FaultCategory",
    "FaultDefinition",
    "FAULT_CATALOG",
    "FAULT_MISFIRE",
    "FAULT_INJECTOR",
    "FAULT_COATING",
    "FAULT_LUBRICATION",
    "FAULT_SENSOR_DRIFT",
    "FAULT_COMBUSTION_INSTABILITY",
    "FAULT_OVERHEATING",
    "FAULT_VIBRATION",
    "FAULT_ENGINE_FAILURE_MULTI"
]

