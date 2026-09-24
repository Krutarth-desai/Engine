"""
AeroTwin Digital Twin - Physics-Informed Engine Model
====================================================
Modular surrogate physics model for a MALE UAV piston engine (e.g. Rotax 914/915 iS class).
Synchronizes with vehicle environment and operational inputs to calculate expected
nominal engine behavior across 9 core telemetry channels.

NOTE: This is a simplified representative physics-informed surrogate model for the SIH 2026
demonstrator, designed for high computational speed and deterministic telemetry tracking.
It is NOT a CFD or multi-zone thermodynamic simulator, nor a certified flight control model.
"""

from typing import Dict, Any, Optional
import math


# Default configuration parameters and empirical engineering coefficients
ENGINE_CONFIG: Dict[str, Any] = {
    # Baseline nominal cruise operating condition
    "baseline": {
        "throttle_pct": 75.0,
        "altitude_ft": 15000.0,
        "ambient_temp_c": 15.0,
        "rpm": 2450.0,
        "cht_c": 142.0,
        "egt_c": 615.0,
        "oil_pressure_bar": 4.69,
        "oil_temperature_c": 92.0,
        "fuel_flow_lh": 17.6,
        "vibration_g": 1.42,
        "battery_voltage_v": 27.6,
        "injection_timing_deg": 23.4
    },
    
    # Atmospheric / ISA parameters
    "atmosphere": {
        "sea_level_temp_k": 288.15,
        "lapse_rate_k_per_ft": 0.0019812,  # ~6.5 K/km
        "density_scale_ft": 30000.0,
        "baseline_alt_ft": 15000.0
    },

    # Sensitivity coefficients (Response gradients)
    "coefficients": {
        # Throttle & RPM response
        "rpm_per_throttle_pct": 12.0,       # Rotax constant-speed governor load response
        "fuel_flow_per_throttle_pct": 0.28,  # L/h per % throttle
        "egt_per_throttle_pct": 2.40,        # °C per % throttle
        "cht_per_throttle_pct": 0.90,        # °C per % throttle
        "oil_temp_per_throttle_pct": 0.40,   # °C per % throttle

        # Ambient temperature response
        "cht_per_ambient_deg": 0.35,        # Cylinder cooling heat sink shift
        "egt_per_ambient_deg": 0.20,        # Intake air temp shift
        "oil_temp_per_ambient_deg": 0.30,   # Cooler heat rejection shift

        # Altitude / Thin-air cooling derating coefficients (relative density deviation)
        "cht_density_penalty": 18.0,        # °C rise per (1.0 - rel_density)
        "oil_temp_density_penalty": 10.0,   # °C rise per (1.0 - rel_density)
        "egt_density_penalty": 8.0,         # Exhaust backpressure & mixture shift

        # Lubrication hydrodynamic response
        "oil_p_per_rpm": 0.0015,            # Bar per RPM (displacement pump output)
        "oil_p_per_temp": -0.018,           # Bar per °C (viscosity reduction)

        # Harmonic mechanical dynamics
        "vibration_rpm_exponent": 1.80,     # Dynamic unbalance scales non-linearly

        # Electrical bus voltage
        "bus_voltage_nominal": 27.6,        # 28V DC regulated bus
        "alternator_cutin_rpm": 1600.0,     # Cut-in RPM for regulated output
        "battery_nominal_v": 24.0,          # Resting battery voltage

        # ECU ignition map
        "timing_per_rpm": 0.04,             # Advance per RPM above baseline
        "timing_per_throttle": -0.08        # Advance retard under high MAP/throttle
    }
}


def calculate_air_density_ratio(altitude_ft: float) -> float:
    """
    Computes standard atmospheric density ratio (rho / rho_0) relative to sea level.
    Uses the International Standard Atmosphere (ISA) troposphere equation.
    Clamped up to 40,000 ft for numerical stability.
    """
    alt = max(0.0, min(altitude_ft, 40000.0))
    alt_m = alt * 0.3048
    # ISA tropospheric density ratio: (1 - 2.25577e-5 * h)^4.25588
    base = max(0.1, 1.0 - 2.25577e-5 * alt_m)
    return float(base ** 4.25588)


class EngineModel:
    """
    Virtual Piston Engine Model for MALE UAVs.
    Predicts expected thermodynamic, hydraulic, electrical, and mechanical states
    based on throttle demand, altitude, ambient temperature, and operational baselines.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or ENGINE_CONFIG
        self.base = self.config["baseline"]
        self.coeff = self.config["coefficients"]
        
        # Precompute baseline altitude density for relative scaling
        self.baseline_density_ratio = calculate_air_density_ratio(self.base["altitude_ft"])

    def predict(
        self,
        telemetry: Dict[str, Any],
        environment: Optional[Dict[str, Any]] = None,
        degradation: Optional[Dict[str, float]] = None
    ) -> Dict[str, float]:
        """
        Calculates expected engine operating state for the current inputs.

        Args:
            telemetry: Current sensor dictionary containing at least throttle/RPM if available.
            environment: Optional ambient conditions (altitude_ft, ambient_temp_c, throttle_pct).
            degradation: Optional wear state dict (injector, lubrication, cooling, mechanical, etc.).

        Returns:
            Dict containing expected values for:
            - rpm
            - cht_c
            - egt_c
            - oil_pressure_bar
            - oil_temperature_c
            - fuel_flow_lh
            - vibration_g
            - battery_voltage_v
            - injection_timing_deg
        """
        env = environment or {}
        
        # 1. Resolve operational inputs with graceful fallback hierarchy
        # Prioritize transient-filtered effective throttle if available
        effective_throttle = env.get("effective_throttle_pct") or env.get("effective_throttle")
        if effective_throttle is not None:
            throttle = float(effective_throttle)
        else:
            throttle = float(
                env.get("throttle_pct") or 
                env.get("throttle") or 
                telemetry.get("throttle_pct") or 
                telemetry.get("throttle") or 
                self.base["throttle_pct"]
            )
        throttle = max(0.0, min(100.0, throttle))

        altitude = float(
            env.get("altitude_ft") or 
            env.get("altitude") or 
            telemetry.get("altitude_ft") or 
            telemetry.get("altitude") or 
            self.base["altitude_ft"]
        )
        altitude = max(0.0, min(40000.0, altitude))

        ambient_temp = float(
            env.get("ambient_temp_c") or 
            env.get("ambient_temp") or 
            telemetry.get("ambient_temp_c") or 
            telemetry.get("ambient_temp") or 
            self.base["ambient_temp_c"]
        )

        # Calculate atmospheric density relative to nominal cruise (15,000 ft)
        current_density_ratio = calculate_air_density_ratio(altitude)
        rel_density = current_density_ratio / max(0.01, self.baseline_density_ratio)
        density_deficit = max(0.0, 1.0 - rel_density)

        delta_throttle = throttle - self.base["throttle_pct"]
        delta_ambient_temp = ambient_temp - self.base["ambient_temp_c"]

        # 2. Predict RPM (Rotational speed)
        # Governed propeller response to throttle demand
        exp_rpm = self.base["rpm"] + (self.coeff["rpm_per_throttle_pct"] * delta_throttle)
        exp_rpm = max(1000.0, min(3200.0, exp_rpm))

        # 3. Predict Fuel Flow (Combustion stoichiometry & load)
        exp_fuel_flow = self.base["fuel_flow_lh"] + (self.coeff["fuel_flow_per_throttle_pct"] * delta_throttle)
        exp_fuel_flow = max(4.0, min(38.0, exp_fuel_flow))

        # 4. Predict Thermal States (EGT, CHT, Oil Temperature)
        # Exhaust Gas Temperature: Combustion heat release and ambient shift
        exp_egt = (
            self.base["egt_c"] +
            (self.coeff["egt_per_throttle_pct"] * delta_throttle) +
            (self.coeff["egt_per_ambient_deg"] * delta_ambient_temp) +
            (self.coeff["egt_density_penalty"] * density_deficit)
        )

        # Cylinder Head Temperature: Heat generation minus ram-air cooling heat transfer
        exp_cht = (
            self.base["cht_c"] +
            (self.coeff["cht_per_throttle_pct"] * delta_throttle) +
            (self.coeff["cht_per_ambient_deg"] * delta_ambient_temp) +
            (self.coeff["cht_density_penalty"] * density_deficit)
        )

        # Oil Temperature: Thermal equilibrium with engine block and oil radiator
        exp_oil_temp = (
            self.base["oil_temperature_c"] +
            (self.coeff["oil_temp_per_throttle_pct"] * delta_throttle) +
            (self.coeff["oil_temp_per_ambient_deg"] * delta_ambient_temp) +
            (self.coeff["oil_temp_density_penalty"] * density_deficit)
        )

        # 5. Predict Hydraulic State (Oil Pressure)
        # Positive-displacement pump flow tracks RPM; kinematic viscosity decreases with temperature
        delta_oil_temp = exp_oil_temp - self.base["oil_temperature_c"]
        delta_rpm = exp_rpm - self.base["rpm"]
        exp_oil_pressure = (
            self.base["oil_pressure_bar"] +
            (self.coeff["oil_p_per_rpm"] * delta_rpm) +
            (self.coeff["oil_p_per_temp"] * delta_oil_temp)
        )
        exp_oil_pressure = max(0.5, min(7.5, exp_oil_pressure))

        # 6. Predict Mechanical Vibration
        # Harmonic rotational dynamics scale with RPM ratio
        rpm_ratio = exp_rpm / max(100.0, self.base["rpm"])
        exp_vibration = self.base["vibration_g"] * (rpm_ratio ** self.coeff["vibration_rpm_exponent"])
        exp_vibration = max(0.2, min(5.0, exp_vibration))

        # 7. Predict Electrical Bus Voltage
        # Regulated alternator output above cut-in RPM
        if exp_rpm >= self.coeff["alternator_cutin_rpm"]:
            exp_battery_voltage = self.coeff["bus_voltage_nominal"]
        else:
            # Linear dropout below alternator cut-in
            fraction = max(0.0, exp_rpm / self.coeff["alternator_cutin_rpm"])
            exp_battery_voltage = self.coeff["battery_nominal_v"] + (
                self.coeff["bus_voltage_nominal"] - self.coeff["battery_nominal_v"]
            ) * fraction

        # 8. Predict Ignition / Injection Timing
        # Engine management advance vs RPM and throttle
        exp_injection_timing = (
            self.base["injection_timing_deg"] +
            (self.coeff["timing_per_rpm"] * delta_rpm / 10.0) +
            (self.coeff["timing_per_throttle"] * delta_throttle / 10.0)
        )
        exp_injection_timing = max(10.0, min(36.0, exp_injection_timing))

        # 9. Optional Wear-Compensated Expectation (if degradation is provided)
        # By default, expected returns the nominal healthy baseline for residual calculation.
        # If wear state is explicitly modeled as expected baseline, offsets can be factored:
        if degradation:
            # Wear offsets are documented and available for dual-mode prediction
            pass

        return {
            "rpm": round(float(exp_rpm), 1),
            "cht_c": round(float(exp_cht), 1),
            "egt_c": round(float(exp_egt), 1),
            "oil_pressure_bar": round(float(exp_oil_pressure), 2),
            "oil_temperature_c": round(float(exp_oil_temp), 1),
            "fuel_flow_lh": round(float(exp_fuel_flow), 1),
            "vibration_g": round(float(exp_vibration), 3),
            "battery_voltage_v": round(float(exp_battery_voltage), 1),
            "injection_timing_deg": round(float(exp_injection_timing), 1)
        }
