"""
AeroTwin Digital Twin - Degradation Model
=========================================
Tracks and accumulates multi-subsystem physical degradation over mission cycles.
Maintains normalized wear indices [0.0 = factory new / healthy, 1.0 = end-of-life]
for major UAV piston-engine subsystems.
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


class DegradationModel:
    """
    Continuous degradation tracking model for UAV engine subsystems.
    Updates wear states using mission exposure time and operational stress factors.
    Supports external degradation injection for simulated fault scenarios.
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
        
        # Initialize wear states to 0.0 (or initial_state if provided)
        self.state: Dict[str, float] = {s: 0.0 for s in self._subsystems}
        if initial_state:
            for k, v in initial_state.items():
                if k in self.state:
                    self.state[k] = max(0.0, min(1.0, float(v)))

    def update(self, telemetry: Dict[str, Any], dt: float = 1.0) -> Dict[str, float]:
        """
        Advances the degradation state based on telemetry stresses and elapsed time dt (seconds).
        Wear evolves smoothly and monotonically under operational stress.

        Args:
            telemetry: Current sensor readings.
            dt: Time delta in seconds since last update (default 1.0s).

        Returns:
            Dict of normalized degradation values [0.0 - 1.0].
        """
        dt_clamped = max(0.0, min(60.0, float(dt)))

        # Extract relevant sensor readings with safe fallbacks
        cht = float(telemetry.get("cht_c") or telemetry.get("cht") or 142.0)
        egt = float(telemetry.get("egt_c") or telemetry.get("egt") or 615.0)
        oil_temp = float(telemetry.get("oil_temperature_c") or telemetry.get("oil_temperature") or 92.0)
        
        # Oil pressure: handle bar or psi gracefully
        raw_oil_p = telemetry.get("oil_pressure_bar")
        if raw_oil_p is None and "oil_pressure" in telemetry:
            # If in psi (> 15), convert to bar
            val = float(telemetry["oil_pressure"])
            oil_p = val / 14.5038 if val > 15.0 else val
        else:
            oil_p = float(raw_oil_p or 4.69)

        vib = float(telemetry.get("vibration_g") or telemetry.get("vibration") or 1.42)
        voltage = float(telemetry.get("battery_voltage_v") or telemetry.get("bus_voltage") or 27.6)

        # 1. Injector Stress Factor (Thermal & fuel demand strain)
        inj_mult = 1.0
        if egt > STRESS_THRESHOLDS["egt_caution"]:
            inj_mult += (egt - STRESS_THRESHOLDS["egt_caution"]) * 0.05
        self.state["injector"] += DEFAULT_DEGRADATION_RATES["injector"] * inj_mult * dt_clamped

        # 2. Lubrication Breakdown Factor (High oil temp, low oil pressure)
        lub_mult = 1.0
        if oil_temp > STRESS_THRESHOLDS["oil_temp_caution"]:
            lub_mult += (oil_temp - STRESS_THRESHOLDS["oil_temp_caution"]) * 0.08
        if oil_p < STRESS_THRESHOLDS["oil_p_low_caution"]:
            lub_mult += (STRESS_THRESHOLDS["oil_p_low_caution"] - oil_p) * 2.0
        self.state["lubrication"] += DEFAULT_DEGRADATION_RATES["lubrication"] * lub_mult * dt_clamped

        # 3. Cooling System Degradation (Sustained high CHT / thermal load)
        cool_mult = 1.0
        if cht > STRESS_THRESHOLDS["cht_caution"]:
            cool_mult += (cht - STRESS_THRESHOLDS["cht_caution"]) * 0.10
        self.state["cooling"] += DEFAULT_DEGRADATION_RATES["cooling"] * cool_mult * dt_clamped

        # 4. Mechanical Wear Factor (High dynamic vibration & rotational fatigue)
        mech_mult = 1.0
        if vib > STRESS_THRESHOLDS["vibration_caution"]:
            mech_mult += ((vib - STRESS_THRESHOLDS["vibration_caution"]) / 0.5) ** 1.5 * 3.0
        self.state["mechanical"] += DEFAULT_DEGRADATION_RATES["mechanical"] * mech_mult * dt_clamped

        # 5. Electrical Degradation Factor (Voltage instability / regulator stress)
        elec_mult = 1.0
        if voltage < STRESS_THRESHOLDS["voltage_low_caution"]:
            elec_mult += (STRESS_THRESHOLDS["voltage_low_caution"] - voltage) * 0.5
        elif voltage > STRESS_THRESHOLDS["voltage_high_caution"]:
            elec_mult += (voltage - STRESS_THRESHOLDS["voltage_high_caution"]) * 0.5
        self.state["electrical"] += DEFAULT_DEGRADATION_RATES["electrical"] * elec_mult * dt_clamped

        # 6. Sensor Channel Degradation (Environmental exposure / thermal drift)
        sensor_mult = 1.0
        if cht > 190.0 or egt > 750.0:
            sensor_mult += 1.5
        self.state["sensors"] += DEFAULT_DEGRADATION_RATES["sensors"] * sensor_mult * dt_clamped

        # Clamp all values strictly between 0.0 and 1.0
        for s in self._subsystems:
            self.state[s] = round(max(0.0, min(1.0, self.state[s])), 5)

        return self.get_state()

    def get_state(self) -> Dict[str, float]:
        """Returns a copy of the current degradation states."""
        return dict(self.state)

    def set_degradation(self, subsystem: str, value: float) -> None:
        """
        Manually sets the degradation level for a subsystem (clamped to [0.0, 1.0]).
        Enables external fault injection or test harnesses to simulate component wear.
        """
        sub = subsystem.lower().strip()
        if sub in self.state:
            self.state[sub] = round(max(0.0, min(1.0, float(value))), 5)
        else:
            raise KeyError(f"Unknown subsystem '{subsystem}'. Valid subsystems: {self._subsystems}")

    def reset(self) -> None:
        """Resets all subsystem degradation levels back to healthy (0.0)."""
        for s in self._subsystems:
            self.state[s] = 0.0
