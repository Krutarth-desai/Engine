"""
AeroTwin Digital Twin - State Estimator
=======================================
Calculates parameter residuals between actual telemetry measurements and
expected virtual engine model predictions.
Computes absolute residual, normalized residual, and percentage deviation.
"""

from typing import Dict, Any, Optional


# Configurable normal operating tolerances / scale denominators for normalization.
# E.g. For CHT, 8.333 °C yields normalized_residual = 1.8 when residual = +15 °C.
RESIDUAL_SCALES: Dict[str, float] = {
    "rpm": 100.0,                 # RPM
    "cht_c": 8.333,               # °C (aligned with prompt specification)
    "egt_c": 25.0,                # °C
    "oil_pressure_bar": 0.50,     # Bar (~7.25 psi)
    "oil_temperature_c": 6.0,     # °C
    "fuel_flow_lh": 1.50,         # L/h
    "vibration_g": 0.25,          # g
    "battery_voltage_v": 0.80,    # V
    "injection_timing_deg": 1.50  # °CA
}

# Sensor key aliases for robust extraction across flat and nested telemetry dictionaries
SENSOR_ALIASES: Dict[str, list] = {
    "rpm": ["rpm", "RPM", "rotational_speed"],
    "cht_c": ["cht_c", "cht", "CHT", "cylinder_head_temp"],
    "egt_c": ["egt_c", "egt", "EGT", "exhaust_gas_temp"],
    "oil_pressure_bar": ["oil_pressure_bar", "oil_pressure", "oil_p"],
    "oil_temperature_c": ["oil_temperature_c", "oil_temperature", "oil_temp", "oil_t"],
    "fuel_flow_lh": ["fuel_flow_lh", "fuel_flow", "fuel"],
    "vibration_g": ["vibration_g", "vibration", "vib"],
    "battery_voltage_v": ["battery_voltage_v", "bus_voltage", "voltage"],
    "injection_timing_deg": ["injection_timing_deg", "injection_timing", "timing"]
}


class StateEstimator:
    """
    State Estimator for the AeroTwin Digital Twin.
    Compares live telemetry observations against virtual engine model expectations.
    """

    def __init__(self, scales: Optional[Dict[str, float]] = None):
        self.scales = scales or RESIDUAL_SCALES

    def _extract_actual_value(self, telemetry: Dict[str, Any], canonical_key: str, default_val: float) -> float:
        """
        Safely extracts an actual sensor reading using canonical names and aliases.
        Converts oil pressure in PSI to Bar if detected (> 15 PSI).
        Handles nested sensor items (e.g. {'value': 2450}).
        """
        aliases = SENSOR_ALIASES.get(canonical_key, [canonical_key])
        
        # Check direct keys
        for alias in aliases:
            if alias in telemetry:
                val = telemetry[alias]
                if isinstance(val, dict) and "value" in val:
                    val = val["value"]
                if val is not None:
                    try:
                        f_val = float(val)
                        # Conversion check for oil pressure: if given in PSI (> 15), convert to Bar
                        if canonical_key == "oil_pressure_bar" and alias in ["oil_pressure", "oil_p"] and f_val > 15.0:
                            return round(f_val / 14.5038, 2)
                        return f_val
                    except (ValueError, TypeError):
                        pass

        # Check inside nested 'sensors' dictionary if present
        if "sensors" in telemetry and isinstance(telemetry["sensors"], dict):
            sensors_dict = telemetry["sensors"]
            for alias in aliases:
                if alias in sensors_dict:
                    val = sensors_dict[alias]
                    if isinstance(val, dict) and "value" in val:
                        val = val["value"]
                    if val is not None:
                        try:
                            f_val = float(val)
                            if canonical_key == "oil_pressure_bar" and alias in ["oil_pressure", "oil_p"] and f_val > 15.0:
                                return round(f_val / 14.5038, 2)
                            return f_val
                        except (ValueError, TypeError):
                            pass

        return default_val

    def calculate_residuals(
        self,
        actual: Dict[str, Any],
        expected: Dict[str, float]
    ) -> Dict[str, Dict[str, float]]:
        """
        Computes absolute, normalized, and percentage residuals for all monitored channels.

        Args:
            actual: Dictionary of live telemetry data.
            expected: Dictionary of expected engine values from EngineModel.

        Returns:
            Dict mapping each channel to:
            {
                "actual": float,
                "expected": float,
                "residual": float,
                "normalized_residual": float,
                "pct_deviation": float
            }
        """
        residuals_result: Dict[str, Dict[str, float]] = {}

        for key, exp_val in expected.items():
            act_val = self._extract_actual_value(actual, key, exp_val)
            
            # Absolute residual: Actual - Expected
            raw_residual = act_val - exp_val

            # Normalized residual: Residual / Scale (with zero-division guard)
            scale = self.scales.get(key, 1.0)
            if abs(scale) < 1e-4:
                scale = 1.0
            normalized_residual = raw_residual / scale

            # Percentage deviation: 100 * (Residual / Expected)
            if abs(exp_val) > 1e-4:
                pct_deviation = (raw_residual / exp_val) * 100.0
            else:
                pct_deviation = 0.0

            residuals_result[key] = {
                "actual": round(act_val, 2 if key in ["vibration_g", "oil_pressure_bar"] else 1),
                "expected": round(exp_val, 2 if key in ["vibration_g", "oil_pressure_bar"] else 1),
                "residual": round(raw_residual, 2 if key in ["vibration_g", "oil_pressure_bar"] else 1),
                "normalized_residual": round(normalized_residual, 2),
                "pct_deviation": round(pct_deviation, 2)
            }

        return residuals_result
