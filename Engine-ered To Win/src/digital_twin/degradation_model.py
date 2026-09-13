"""
AeroTwin Digital Twin - Degradation Model (Phase 2)
===================================================
Tracks, accumulates, and simulates multi-subsystem physical degradation over mission cycles.
Maintains normalized wear states [0.0 = pristine / new, 1.0 = critical wear / end-of-life]
for the 6 core UAV piston-engine subsystems:
- injector
- lubrication
- cooling
- mechanical
- electrical
- sensors

Supports continuous operational stress accumulation, gradual wear increments (0% to 100%),
and fault-injection scenario synchronization.
"""

from typing import Dict, Any, Optional


DEFAULT_DEGRADATION_RATES: Dict[str, float] = {
    # Baseline nominal wear rate per second of operation (~1000 operational flight hours to EOL)
    "injector": 2.5e-7,
    "lubrication": 3.0e-7,
    "cooling": 2.0e-7,
    "mechanical": 2.5e-7,
    "electrical": 1.5e-7,
    "sensors": 1.0e-7
}

# Operational thresholds above which component degradation accelerates
STRESS_THRESHOLDS: Dict[str, Any] = {
    "cht_caution": 165.0,        # °C
    "egt_caution": 680.0,        # °C
    "oil_temp_caution": 105.0,   # °C
    "oil_p_low_caution": 3.45,   # Bar (~50 psi)
    "vibration_caution": 2.10,   # g
    "voltage_low_caution": 25.0, # V
    "voltage_high_caution": 29.5 # V
}

# Scenario to subsystem degradation mappings for fault injection
SCENARIO_DEGRADATION_MAP: Dict[str, Dict[str, float]] = {
    "Normal": {
        "cooling": 0.0, "injector": 0.0, "lubrication": 0.0,
        "mechanical": 0.0, "electrical": 0.0, "sensors": 0.0
    },
    "Overheating": {
        "cooling": 0.65, "lubrication": 0.20
    },
    "Injector_Degradation": {
        "injector": 0.55
    },
    "Lubrication": {
        "lubrication": 0.70, "mechanical": 0.25
    },
    "Oil_Pressure_Loss": {
        "lubrication": 0.80, "mechanical": 0.35
    },
    "Vibration_Fault": {
        "mechanical": 0.60
    },
    "High_Vibration": {
        "mechanical": 0.60
    },
    "Sensor_Drift": {
        "sensors": 0.45
    },
    "Sensor_Fault_Temp": {
        "sensors": 0.60
    },
    "Sensor_Fault_CHT": {
        "sensors": 0.60
    },
    "Misfire": {
        "injector": 0.35, "mechanical": 0.30
    },
    "RPM_Drop": {
        "injector": 0.40, "mechanical": 0.20
    },
    "Engine_Failure_Multi": {
        "cooling": 0.70, "lubrication": 0.75, "mechanical": 0.65, "injector": 0.60
    }
}


class DegradationModel:
    """
    Phase 2 Subsystem Degradation Model.
    Provides continuous accumulation, manual override APIs, scenario mapping,
    and progressive wear simulation.
    """

    def __init__(self, initial_state: Optional[Dict[str, float]] = None):
        self._subsystems = [
            "injector",
            "lubrication",
            "cooling",
            "mechanical",
            "electrical",
            "sensors"
        ]
        
        # Initialize wear states to 0.0
        self.state: Dict[str, float] = {s: 0.0 for s in self._subsystems}
        if initial_state:
            for k, v in initial_state.items():
                if k in self.state:
                    self.state[k] = max(0.0, min(1.0, float(v)))

    def update(self, telemetry: Dict[str, Any], dt: float = 1.0) -> Dict[str, float]:
        """
        Advances the degradation state based on operational stress factors over elapsed time dt (seconds).
        """
        dt_clamped = max(0.0, min(60.0, float(dt)))

        cht = float(telemetry.get("cht_c") or telemetry.get("cht") or 142.0)
        egt = float(telemetry.get("egt_c") or telemetry.get("egt") or 615.0)
        oil_temp = float(telemetry.get("oil_temperature_c") or telemetry.get("oil_temperature") or 92.0)
        
        raw_oil_p = telemetry.get("oil_pressure_bar")
        if raw_oil_p is None and "oil_pressure" in telemetry:
            val = float(telemetry["oil_pressure"])
            oil_p = val / 14.5038 if val > 15.0 else val
        else:
            oil_p = float(raw_oil_p or 4.69)

        vib = float(telemetry.get("vibration_g") or telemetry.get("vibration") or 1.42)
        voltage = float(telemetry.get("battery_voltage_v") or telemetry.get("bus_voltage") or 27.6)

        # 1. Injector stress
        inj_mult = 1.0
        if egt > STRESS_THRESHOLDS["egt_caution"]:
            inj_mult += (egt - STRESS_THRESHOLDS["egt_caution"]) * 0.05
        self.state["injector"] += DEFAULT_DEGRADATION_RATES["injector"] * inj_mult * dt_clamped

        # 2. Lubrication stress
        lub_mult = 1.0
        if oil_temp > STRESS_THRESHOLDS["oil_temp_caution"]:
            lub_mult += (oil_temp - STRESS_THRESHOLDS["oil_temp_caution"]) * 0.08
        if oil_p < STRESS_THRESHOLDS["oil_p_low_caution"]:
            lub_mult += (STRESS_THRESHOLDS["oil_p_low_caution"] - oil_p) * 2.0
        self.state["lubrication"] += DEFAULT_DEGRADATION_RATES["lubrication"] * lub_mult * dt_clamped

        # 3. Cooling stress
        cool_mult = 1.0
        if cht > STRESS_THRESHOLDS["cht_caution"]:
            cool_mult += (cht - STRESS_THRESHOLDS["cht_caution"]) * 0.10
        self.state["cooling"] += DEFAULT_DEGRADATION_RATES["cooling"] * cool_mult * dt_clamped

        # 4. Mechanical stress
        mech_mult = 1.0
        if vib > STRESS_THRESHOLDS["vibration_caution"]:
            mech_mult += ((vib - STRESS_THRESHOLDS["vibration_caution"]) / 0.5) ** 1.5 * 3.0
        self.state["mechanical"] += DEFAULT_DEGRADATION_RATES["mechanical"] * mech_mult * dt_clamped

        # 5. Electrical stress
        elec_mult = 1.0
        if voltage < STRESS_THRESHOLDS["voltage_low_caution"]:
            elec_mult += (STRESS_THRESHOLDS["voltage_low_caution"] - voltage) * 0.5
        elif voltage > STRESS_THRESHOLDS["voltage_high_caution"]:
            elec_mult += (voltage - STRESS_THRESHOLDS["voltage_high_caution"]) * 0.5
        self.state["electrical"] += DEFAULT_DEGRADATION_RATES["electrical"] * elec_mult * dt_clamped

        # 6. Sensor stress
        sensor_mult = 1.0
        if cht > 190.0 or egt > 750.0:
            sensor_mult += 1.5
        self.state["sensors"] += DEFAULT_DEGRADATION_RATES["sensors"] * sensor_mult * dt_clamped

        # Clamp all values strictly to [0.0, 1.0]
        for s in self._subsystems:
            self.state[s] = round(max(0.0, min(1.0, self.state[s])), 5)

        return self.get_state()

    def get_state(self) -> Dict[str, float]:
        """Returns a copy of all current degradation states."""
        return dict(self.state)

    def get_all_degradation(self) -> Dict[str, float]:
        """Alias for get_state() providing clean API access."""
        return self.get_state()

    def get_degradation(self, subsystem: Optional[str] = None):
        """
        Retrieves degradation. If subsystem is provided, returns float for that subsystem.
        If subsystem is None, returns a copy of all subsystem degradation values.
        """
        if subsystem is None:
            return self.get_all_degradation()
        sub = subsystem.lower().strip()
        if sub in self.state:
            return self.state[sub]
        raise KeyError(f"Unknown subsystem '{subsystem}'. Valid: {self._subsystems}")

    def set_degradation(self, subsystem: str, value: float) -> None:
        """
        Manually sets degradation for a subsystem (clamped strictly between 0.0 and 1.0).
        """
        sub = subsystem.lower().strip()
        if sub in self.state:
            self.state[sub] = round(max(0.0, min(1.0, float(value))), 5)
        else:
            raise KeyError(f"Unknown subsystem '{subsystem}'. Valid: {self._subsystems}")

    def reset_degradation(self) -> None:
        """Resets all subsystem degradation levels back to healthy (0.0)."""
        for s in self._subsystems:
            self.state[s] = 0.0

    def reset(self) -> None:
        """Alias for reset_degradation()."""
        self.reset_degradation()

    def apply_scenario_degradation(self, scenario: str, progress: float = 1.0) -> Dict[str, float]:
        """
        Applies degradation from a named fault scenario, scaled by progress [0.0 to 1.0].
        Allows seamless synchronization with the existing fault injection engine.
        """
        mapping = SCENARIO_DEGRADATION_MAP.get(scenario, {})
        prog_clamped = max(0.0, min(1.0, float(progress)))

        for sub, base_val in mapping.items():
            if sub in self.state:
                target_val = base_val * prog_clamped
                # Retain the higher wear level if already degraded
                self.state[sub] = round(max(self.state[sub], target_val), 5)

        return self.get_state()

    def apply_degradation(self, **kwargs) -> Dict[str, float]:
        """
        Convenience method to set multiple subsystem values simultaneously.
        E.g. apply_degradation(cooling=0.4, lubrication=0.2)
        """
        for k, v in kwargs.items():
            if k in self.state:
                self.set_degradation(k, v)
        return self.get_state()
