"""
AeroTwin Digital Twin - Core Orchestrator (Phase 2)
===================================================
Top-level orchestrator for the AeroTwin MALE UAV Piston Engine Digital Twin.
Coordinates:
  1. Subsystem degradation updates & fault scenario tracking
  2. Physics-informed expected state predictions
  3. Parameter residual calculations (actual vs expected)
  4. Subsystem health evaluations with status classification
  5. Overall Health Index synthesis
  6. Rolling health history, delta calculation, and rapid degradation detection
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
from collections import deque

from .engine_model import EngineModel
from .degradation_model import DegradationModel
from .state_estimator import StateEstimator
from .health_index import HealthIndexCalculator
from .environment import EnvironmentModel


class DigitalTwinCore:
    """
    Phase 4 Digital Twin Core Orchestrator.
    Maintains real-time synchronization between live UAV telemetry, environmental
    atmosphere / mission profiles, and the virtual engine model.
    Tracks rolling health history, deltas, and rapid degradation indicators.
    """

    def __init__(
        self,
        engine_model: Optional[EngineModel] = None,
        degradation_model: Optional[DegradationModel] = None,
        state_estimator: Optional[StateEstimator] = None,
        health_calculator: Optional[HealthIndexCalculator] = None,
        environment_model: Optional[EnvironmentModel] = None,
        max_history: int = 60
    ):
        self.engine_model = engine_model or EngineModel()
        self.degradation_model = degradation_model or DegradationModel()
        self.state_estimator = state_estimator or StateEstimator()
        self.health_calculator = health_calculator or HealthIndexCalculator()
        self.environment_model = environment_model or EnvironmentModel()
        
        # Bounded rolling history buffer to avoid memory leaks
        self.max_history = max_history
        self._history: deque = deque(maxlen=max_history)

        # Track previous health for delta and degradation rate
        self._prev_overall_health: Optional[float] = None
        self._tick_counter: int = 0

    def update(
        self,
        telemetry: Dict[str, Any],
        environment: Optional[Dict[str, Any]] = None,
        dt: float = 1.0,
        scenario: Optional[str] = None,
        scenario_progress: float = 1.0,
        sensor_diagnosis: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Executes one complete Digital Twin update cycle.

        Args:
            telemetry: Current sensor measurements dictionary.
            environment: Optional ambient conditions (throttle_pct, altitude_ft, ambient_temp_c).
            dt: Time elapsed since last update in seconds.
            scenario: Optional active fault scenario name for degradation synchronization.
            scenario_progress: Progress [0.0 to 1.0] of current scenario.
            sensor_diagnosis: Optional ML diagnosis from SensorDiagnosisEngine.

        Returns:
            Structured Digital Twin payload containing:
            - timestamp, actual, expected, residuals
            - environment: atmospheric state, throttle transients, and operating conditions
            - health: {overall, status, thermal, combustion, lubrication, mechanical, electrical, sensor}
            - subsystem_health (Phase 1 backward compatibility)
            - health_index (Phase 1 backward compatibility)
            - degradation: {injector, lubrication, cooling, mechanical, electrical, sensors}
            - trend: {overall_delta, degradation_rate, rapid_degradation, warning}
            - history: rolling window of past health states
        """
        self._tick_counter += 1

        # 0. Synchronize & Advance Environmental Simulation
        if environment:
            alt = environment.get("altitude_ft") if "altitude_ft" in environment else environment.get("altitude")
            amb = environment.get("ambient_temp_c") if "ambient_temp_c" in environment else environment.get("ambient_temp")
            thr = environment.get("throttle_pct") if "throttle_pct" in environment else environment.get("throttle")
            self.environment_model.set_environment(
                altitude_ft=alt,
                ambient_temp_c=amb,
                throttle_pct=thr
            )
        env_state = self.environment_model.update(dt=dt)

        # 1. Update Subsystem Degradation
        # Apply operational stress wear
        self.degradation_model.update(telemetry, dt=dt)
        
        # If scenario is specified, synchronize degradation
        if scenario and scenario != "Normal":
            self.degradation_model.apply_scenario_degradation(scenario, scenario_progress)

        degradation_state = self.degradation_model.get_all_degradation()

        # 2. Predict Expected Engine Operating State
        expected_state = self.engine_model.predict(
            telemetry=telemetry,
            environment=env_state,
            degradation=degradation_state
        )

        # 3. Calculate Parameter Residuals (Actual vs Expected)
        residuals = self.state_estimator.calculate_residuals(
            actual=telemetry,
            expected=expected_state
        )

        actual_state = {k: v["actual"] for k, v in residuals.items()}

        # 4. Calculate Subsystem Health, Overall Index & Status
        health_result = self.health_calculator.compute(
            telemetry=telemetry,
            residuals=residuals,
            degradation=degradation_state,
            sensor_diagnosis=sensor_diagnosis,
            environment=env_state
        )

        current_overall = health_result["overall"]
        current_status = health_result["status"]
        subsystems = health_result["subsystems"]

        # 5. Calculate Health Delta, Trend & Degradation Rate
        if self._prev_overall_health is not None:
            overall_delta = round(current_overall - self._prev_overall_health, 2)
        else:
            overall_delta = 0.0

        # Rapid degradation check: sudden drop of >= 3.0 health points in a single tick
        rapid_degradation = overall_delta <= -3.0
        warning = "RAPID HEALTH DEGRADATION" if rapid_degradation else None

        # Rolling degradation rate over recent history (average delta per tick)
        if len(self._history) >= 5:
            first_val = self._history[0]["overall"]
            rate_per_cycle = round((current_overall - first_val) / len(self._history), 3)
        else:
            rate_per_cycle = overall_delta

        trend_data = {
            "current_health": current_overall,
            "previous_health": self._prev_overall_health if self._prev_overall_health is not None else current_overall,
            "overall_delta": overall_delta,
            "degradation_rate": rate_per_cycle,
            "rapid_degradation": rapid_degradation,
            "warning": warning
        }

        # 6. Record to Rolling History
        timestamp_str = telemetry.get("timestamp") or datetime.now().isoformat()
        history_entry = {
            "tick": self._tick_counter,
            "timestamp": timestamp_str,
            "overall": current_overall,
            "status": current_status,
            "thermal": subsystems["thermal"],
            "combustion": subsystems["combustion"],
            "lubrication": subsystems["lubrication"],
            "mechanical": subsystems["mechanical"],
            "electrical": subsystems["electrical"],
            "sensor": subsystems["sensor"]
        }
        self._history.append(history_entry)

        # Update previous health for next tick
        self._prev_overall_health = current_overall

        # 7. Formulate Unified Payload (Preserves Phase 1 fields + Adds Phase 2 extensions)
        enhanced_health_block = {
            "overall": current_overall,
            "status": current_status,
            "thermal": subsystems["thermal"],
            "combustion": subsystems["combustion"],
            "lubrication": subsystems["lubrication"],
            "mechanical": subsystems["mechanical"],
            "electrical": subsystems["electrical"],
            "sensor": subsystems["sensor"]
        }

        return {
            "timestamp": timestamp_str,
            "actual": actual_state,
            "expected": expected_state,
            "residuals": residuals,
            "degradation": degradation_state,
            # Phase 4 Environment & Mission Simulation
            "environment": env_state,
            # Phase 2 Enhanced Health Block
            "health": enhanced_health_block,
            # Phase 1 Backward Compatibility fields
            "subsystem_health": subsystems,
            "health_index": current_overall,
            # Phase 2 Trend & History
            "trend": trend_data,
            "history": list(self._history)
        }

    def set_environment(
        self,
        altitude_ft: Optional[float] = None,
        ambient_temp_c: Optional[float] = None,
        throttle_pct: Optional[float] = None
    ) -> Dict[str, Any]:
        """Sets environmental conditions and returns updated state."""
        self.environment_model.set_environment(
            altitude_ft=altitude_ft,
            ambient_temp_c=ambient_temp_c,
            throttle_pct=throttle_pct
        )
        return self.environment_model.get_state()

    def set_mission_profile(self, profile_name: str) -> Dict[str, Any]:
        """Sets flight phase mission profile."""
        return self.environment_model.set_mission_profile(profile_name)

    def set_simulation_speed(self, speed_multiplier: float) -> None:
        """Sets simulation speed multiplier for accelerated endurance."""
        self.environment_model.set_simulation_speed(speed_multiplier)

    def get_environment(self) -> Dict[str, Any]:
        """Returns current environmental and mission state."""
        return self.environment_model.get_state()

    def set_degradation(self, subsystem: str, value: float) -> None:
        """Manually sets degradation for a subsystem [0.0 - 1.0]."""
        self.degradation_model.set_degradation(subsystem, value)

    def get_degradation(self, subsystem: Optional[str] = None):
        """Retrieves degradation. If subsystem is None, returns all as dict. If string, returns float."""
        return self.degradation_model.get_degradation(subsystem)

    def get_all_degradation(self) -> Dict[str, float]:
        """Retrieves degradation for all subsystems."""
        return self.degradation_model.get_all_degradation()

    def reset_degradation(self) -> None:
        """Resets all degradation states back to 0.0."""
        self.degradation_model.reset_degradation()

    def get_health_history(self) -> List[Dict[str, Any]]:
        """Retrieves the rolling history of health records."""
        return list(self._history)
