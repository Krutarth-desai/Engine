"""
AeroTwin Digital Twin - Atmospheric Physics Model (ISA)
======================================================
Implements International Standard Atmosphere (ISA) barometric,
thermal, and volumetric air density formulations for MALE UAV flight envelopes.

Calculates:
- Pressure (kPa)
- Standard ISA Temperature (°C / K)
- Actual Air Density (kg/m³) via Ideal Gas Law incorporating ambient temp
- Air Density Ratio (sigma = rho / rho_0)
- Relative Density Ratio vs baseline nominal cruise (15,000 ft)
"""

from typing import Dict, Any, NamedTuple
import math


# ISA Standard Sea Level Constants
P0_KPA = 101.325          # Standard sea-level pressure (kPa)
T0_K = 288.15             # Standard sea-level temperature (15 °C in K)
RHO0_KG_M3 = 1.2250       # Standard sea-level air density (kg/m³)
R_SPECIFIC = 287.058      # Specific gas constant for dry air (J/(kg·K))
G0 = 9.80665              # Gravitational acceleration (m/s²)
LAPSE_RATE_K_M = 0.0065   # Tropospheric lapse rate (6.5 K / km)
FT_TO_M = 0.3048          # Conversion from feet to meters


class AtmosphericState(NamedTuple):
    altitude_ft: float
    ambient_temp_c: float
    pressure_kpa: float
    air_density_kg_m3: float
    density_ratio: float
    isa_temp_c: float
    isa_temp_dev_c: float
    relative_density_to_cruise: float


def compute_atmospheric_state(
    altitude_ft: float,
    ambient_temp_c: float,
    baseline_alt_ft: float = 15000.0
) -> AtmosphericState:
    """
    Computes rigorous aerodynamic and thermodynamic atmospheric parameters.

    Args:
        altitude_ft: Geometric altitude above sea level (0 - 40,000 ft).
        ambient_temp_c: Ambient static air temperature (°C).
        baseline_alt_ft: Nominal cruise reference altitude for relative scaling.

    Returns:
        AtmosphericState tuple containing pressure, density, and deviations.
    """
    # Clamp altitude for physical stability within troposphere
    alt_ft_clamped = max(0.0, min(40000.0, float(altitude_ft)))
    alt_m = alt_ft_clamped * FT_TO_M

    # 1. Standard ISA Temperature at Altitude
    isa_temp_k = T0_K - (LAPSE_RATE_K_M * alt_m)
    isa_temp_c = isa_temp_k - 273.15

    # 2. Barometric Pressure via ISA Tropospheric Formula
    # P = P0 * (1 - L*h/T0)^(g / (R*L)) where exponent = 5.25588
    pressure_ratio = max(0.01, 1.0 - (LAPSE_RATE_K_M * alt_m / T0_K)) ** 5.25588
    pressure_kpa = P0_KPA * pressure_ratio

    # 3. Actual Air Density using Ideal Gas Law with actual ambient temperature
    actual_temp_k = max(180.0, float(ambient_temp_c) + 273.15)
    # rho = P_Pa / (R_spec * T_K) = (P_kPa * 1000) / (R_spec * T_K)
    air_density = (pressure_kpa * 1000.0) / (R_SPECIFIC * actual_temp_k)
    density_ratio = air_density / RHO0_KG_M3

    # 4. Reference density at nominal cruise baseline (15,000 ft ISA standard)
    ref_alt_m = baseline_alt_ft * FT_TO_M
    ref_isa_t_k = T0_K - (LAPSE_RATE_K_M * ref_alt_m)
    ref_p_ratio = max(0.01, 1.0 - (LAPSE_RATE_K_M * ref_alt_m / T0_K)) ** 5.25588
    ref_density = (P0_KPA * ref_p_ratio * 1000.0) / (R_SPECIFIC * ref_isa_t_k)
    rel_density_to_cruise = air_density / max(0.01, ref_density)

    return AtmosphericState(
        altitude_ft=round(alt_ft_clamped, 1),
        ambient_temp_c=round(float(ambient_temp_c), 1),
        pressure_kpa=round(float(pressure_kpa), 2),
        air_density_kg_m3=round(float(air_density), 4),
        density_ratio=round(float(density_ratio), 4),
        isa_temp_c=round(float(isa_temp_c), 1),
        isa_temp_dev_c=round(float(ambient_temp_c - isa_temp_c), 1),
        relative_density_to_cruise=round(float(rel_density_to_cruise), 4)
    )
