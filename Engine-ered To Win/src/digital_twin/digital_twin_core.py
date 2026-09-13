"""
AeroTwin Digital Twin - Core Orchestrator
=========================================
Top-level orchestrator for the AeroTwin MALE UAV Piston Engine Digital Twin.
Coordinates:
  1. Subsystem degradation updates
  2. Physics-informed expected state predictions
  3. Parameter residual calculations (actual vs expected)
  4. Subsystem health evaluations
  5. Overall Health Index synthesis
"""

from typing import Dict, Any, Optional
from datetime import datetime

from .engine_model import EngineModel
from .degradation_model import DegradationModel
from .state_estimator import StateEstimator
from .health_index import HealthIndexCalculator


class DigitalTwinCore:
    """
    Orchestrates the AeroTwin virtual engine digital twin framework.
    Maintains synchronization between live engine telemetry and the virtual model.
    """

    def __init__(
        self,
        engine_model: Optional[EngineModel] = None,
        degradation_model: Optional[DegradationModel] = None,
        state_estimator: Optional[StateEstimator] = None,
        health_calculator: Optional[HealthIndexCalculator] = None
    ):
        self.engine_model = engine_model or EngineModel()
        self.degradation_model = degradation_model or DegradationModel()
        self.state_estimator = state_estimator or StateEstimator()
        self.health_calculator = health_calculator or HealthIndexCalculator()

    def update(
        self,
        telemetry: Dict[str, Any],
        environment: Optional[Dict[str, Any]] = None,
        dt: float = 1.0
    ) -> Dict[str, Any]:
        """
        Executes one complete Digital Twin update cycle.

        Args:
            telemetry: Current sensor measurements dictionary.
            environment: Optional ambient conditions (throttle_pct, altitude_ft, ambient_temp_c).
            dt: Time elapsed since last update in seconds.

        Returns:
            Structured Digital Twin payload:
            {
                "timestamp": str,
                "actual": Dict[str, float],
                "expected": Dict[str, float],
                "residuals": Dict[str, Dict[str, float]],
                "degradation": Dict[str, float],
                "subsystem_health": Dict[str, float],
                "health_index": float
            }
        """
        # 1. Update Subsystem Degradation
        degradation_state = self.degradation_model.update(telemetry, dt=dt)

        # 2. Predict Expected Engine Operating State
        expected_state = self.engine_model.predict(
            telemetry=telemetry,
            environment=environment,
            degradation=degradation_state
        )

        # 3. Calculate Parameter Residuals (Actual vs Expected)
        residuals = self.state_estimator.calculate_residuals(
            actual=telemetry,
            expected=expected_state
        )

        # Extract clean actual values dictionary from residuals
        actual_state = {k: v["actual"] for k, v in residuals.items()}

        # 4. Calculate Subsystem Health & Overall Health Index
        health_result = self.health_calculator.compute(
            telemetry=telemetry,
            residuals=residuals,
            degradation=degradation_state
        )

        timestamp_str = telemetry.get("timestamp") or datetime.now().isoformat()

        return {
            "timestamp": timestamp_str,
            "actual": actual_state,
            "expected": expected_state,
            "residuals": residuals,
            "degradation": degradation_state,
            "subsystem_health": health_result["subsystems"],
            "health_index": health_result["overall"]
        }

    def set_degradation(self, subsystem: str, value: float) -> None:
        """Manually sets degradation for testing or scenario injection."""
        self.degradation_model.set_degradation(subsystem, value)

    def reset_degradation(self) -> None:
        """Resets all degradation states back to 0.0."""
        self.degradation_model.reset()

    def get_degradation(self) -> Dict[str, float]:
        """Retrieves the current degradation state."""
        return self.degradation_model.get_state()
