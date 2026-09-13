"""
AeroTwin Digital Twin Core Framework
====================================
Physics-informed virtual engine model, continuous degradation tracking,
state estimation residuals, and modular subsystem health calculations
for MALE UAV piston propulsion.
"""

from .engine_model import EngineModel, ENGINE_CONFIG, calculate_air_density_ratio
from .degradation_model import DegradationModel, DEFAULT_DEGRADATION_RATES, STRESS_THRESHOLDS
from .state_estimator import StateEstimator, RESIDUAL_SCALES, SENSOR_ALIASES
from .health_index import HealthIndexCalculator, DEFAULT_HEALTH_WEIGHTS
from .digital_twin_core import DigitalTwinCore

__all__ = [
    "EngineModel",
    "ENGINE_CONFIG",
    "calculate_air_density_ratio",
    "DegradationModel",
    "DEFAULT_DEGRADATION_RATES",
    "STRESS_THRESHOLDS",
    "StateEstimator",
    "RESIDUAL_SCALES",
    "SENSOR_ALIASES",
    "HealthIndexCalculator",
    "DEFAULT_HEALTH_WEIGHTS",
    "DigitalTwinCore"
]
