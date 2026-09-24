"""
AeroTwin Digital Twin - Central Environment & Mission Simulation Model
======================================================================
Coordinates atmospheric physics, operating condition classification,
dynamic throttle transients, mission flight phase profiles, and accelerated
endurance stress modeling.

Provides deterministic, physical coupling between ambient conditions
and the virtual Digital Twin expected engine state.
"""

from typing import Dict, Any, List, Optional
from .atmosphere import compute_atmospheric_state, AtmosphericState
from .operating_condition import classify_operating_conditions, OperatingCondition
from .transient_model import ThrottleTransientModel
from .mission_profile import MISSION_PROFILES, get_mission_profile, MissionPhase


class EnvironmentModel:
    """
    Central environmental and mission simulation engine for AeroTwin.
    """

    def __init__(
        self,
        initial_altitude_ft: float = 15000.0,
        initial_ambient_temp_c: float = 15.0,
        initial_throttle_pct: float = 75.0,
        initial_mission_profile: str = "CRUISE"
    ):
        self.altitude_ft = float(initial_altitude_ft)
        self.ambient_temp_c = float(initial_ambient_temp_c)
        self.target_throttle_pct = float(initial_throttle_pct)
        self.mission_profile_name = str(initial_mission_profile).upper()

        # Dynamic throttle lag filter
        self.transient_model = ThrottleTransientModel(time_constant_sec=1.5, rapid_rate_threshold=15.0)
        self.transient_model.reset(self.target_throttle_pct)

        # Mission timing & simulation speed
        self.mission_time_sec: float = 0.0
        self.simulation_speed: float = 1.0  # 1.0x realtime; supports e.g. 10x or 60x for endurance
        self.endurance_hours: float = 0.0

        # Accumulated physical stress metrics for endurance tracking
        self.accumulated_thermal_stress: float = 0.0
        self.accumulated_mechanical_stress: float = 0.0
        self.accumulated_lubrication_stress: float = 0.0

        # Cached atmospheric state
        self._current_atmosphere: AtmosphericState = compute_atmospheric_state(
            self.altitude_ft, self.ambient_temp_c
        )

    def set_environment(
        self,
        altitude_ft: Optional[float] = None,
        ambient_temp_c: Optional[float] = None,
        throttle_pct: Optional[float] = None
    ) -> None:
        """Sets environmental and throttle conditions."""
        if altitude_ft is not None:
            self.altitude_ft = max(0.0, min(40000.0, float(altitude_ft)))
        if ambient_temp_c is not None:
            self.ambient_temp_c = max(-50.0, min(60.0, float(ambient_temp_c)))
        if throttle_pct is not None:
            self.target_throttle_pct = max(0.0, min(100.0, float(throttle_pct)))

        # Refresh atmospheric state
        self._current_atmosphere = compute_atmospheric_state(
            self.altitude_ft, self.ambient_temp_c
        )

    def set_mission_profile(self, profile_name: str) -> Dict[str, Any]:
        """
        Activates a predefined mission flight phase profile.
        Sets altitude, throttle demand, and ambient targets according to the flight phase.
        """
        prof = get_mission_profile(profile_name)
        self.mission_profile_name = prof["phase"]
        self.target_throttle_pct = prof["throttle_target"]
        self.altitude_ft = prof["altitude_target"]
        if "ambient_temp_target" in prof:
            self.ambient_temp_c = prof["ambient_temp_target"]

        self._current_atmosphere = compute_atmospheric_state(
            self.altitude_ft, self.ambient_temp_c
        )
        return prof

    def set_simulation_speed(self, speed_multiplier: float) -> None:
        """Sets acceleration speed multiplier (e.g. 10.0 for 10x accelerated endurance)."""
        self.simulation_speed = max(0.1, min(120.0, float(speed_multiplier)))

    def update(self, dt: float = 1.0) -> Dict[str, Any]:
        """
        Advances the environment model and transient throttle dynamics over dt seconds.
        """
        effective_dt = dt * self.simulation_speed
        self.mission_time_sec += effective_dt
        self.endurance_hours = round(self.mission_time_sec / 3600.0, 4)

        # Update throttle transient filter
        transient_info = self.transient_model.update(self.target_throttle_pct, dt=dt)

        # Refresh atmospheric parameters
        self._current_atmosphere = compute_atmospheric_state(
            self.altitude_ft, self.ambient_temp_c
        )

        # Classify active operational states
        effective_throttle = transient_info["effective_throttle"]
        throttle_rate = transient_info["throttle_rate"]

        active_conditions, primary_condition = classify_operating_conditions(
            altitude_ft=self.altitude_ft,
            ambient_temp_c=self.ambient_temp_c,
            throttle_pct=effective_throttle,
            throttle_rate_pct_s=throttle_rate,
            endurance_hours=self.endurance_hours
        )

        # Accumulate operating endurance stress
        # Thermal stress: scales with ambient temperature and high power demand
        thermal_factor = max(0.2, (effective_throttle / 75.0) * (1.0 + max(0.0, self.ambient_temp_c - 15.0) * 0.03))
        self.accumulated_thermal_stress += thermal_factor * (effective_dt / 3600.0)

        # Mechanical stress: scales non-linearly with throttle and rapid throttle cycling
        mech_factor = (effective_throttle / 75.0) ** 1.5 + (abs(throttle_rate) / 20.0) * 0.5
        self.accumulated_mechanical_stress += mech_factor * (effective_dt / 3600.0)

        # Lubrication stress: scales with sustained continuous operation
        lub_factor = max(0.3, (effective_throttle / 75.0) * 1.1)
        self.accumulated_lubrication_stress += lub_factor * (effective_dt / 3600.0)

        return self.get_state()

    def get_state(self) -> Dict[str, Any]:
        """
        Returns complete, structured environment and mission state payload.
        """
        transient = self.transient_model
        active_conditions, primary_condition = classify_operating_conditions(
            altitude_ft=self.altitude_ft,
            ambient_temp_c=self.ambient_temp_c,
            throttle_pct=transient.effective_throttle,
            throttle_rate_pct_s=transient.throttle_rate,
            endurance_hours=self.endurance_hours
        )

        return {
            "altitude_ft": round(self.altitude_ft, 1),
            "ambient_temp_c": round(self.ambient_temp_c, 1),
            "pressure_kpa": self._current_atmosphere.pressure_kpa,
            "air_density_kg_m3": self._current_atmosphere.air_density_kg_m3,
            "density_ratio": self._current_atmosphere.density_ratio,
            "relative_density_to_cruise": self._current_atmosphere.relative_density_to_cruise,
            "isa_temp_c": self._current_atmosphere.isa_temp_c,
            "isa_temp_dev_c": self._current_atmosphere.isa_temp_dev_c,
            "throttle_pct": round(self.target_throttle_pct, 1),
            "effective_throttle_pct": round(transient.effective_throttle, 1),
            "throttle_rate": round(transient.throttle_rate, 2),
            "is_transient": transient.is_transient,
            "operating_conditions": active_conditions,
            "primary_condition": primary_condition,
            "operating_condition": primary_condition,
            "mission_profile": self.mission_profile_name,
            "mission_time_sec": round(self.mission_time_sec, 1),
            "simulation_speed": self.simulation_speed,
            "endurance_hours": self.endurance_hours,
            "endurance_stress": {
                "thermal_stress": round(self.accumulated_thermal_stress, 4),
                "mechanical_stress": round(self.accumulated_mechanical_stress, 4),
                "lubrication_stress": round(self.accumulated_lubrication_stress, 4)
            }
        }
