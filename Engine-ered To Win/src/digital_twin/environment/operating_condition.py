"""
AeroTwin Digital Twin - Operating Condition Classifier
======================================================
Classifies vehicle operational regime into multi-label descriptive states:
- SEA_LEVEL_NORMAL: Standard altitude (< 5,000 ft) and temperate weather
- HIGH_ALTITUDE: Flight level >= 12,000 ft (reduced air charge & derated ram cooling)
- HOT_WEATHER: Ambient temperature >= 32 °C (reduced thermal margin)
- HIGH_ALTITUDE_HOT: Simultaneous thin-air and elevated ambient thermal stress
- COLD_WEATHER: Ambient temperature < 0 °C (elevated oil viscosity, dense air)
- LOW_THROTTLE: Throttle demand < 40% (descent / idle / low power)
- CRUISE: Steady cruise power band (55% - 75% throttle)
- HIGH_THROTTLE: Throttle demand >= 85% (takeoff / maximum continuous climb)
- RAPID_THROTTLE_CHANGE: Severe transient rate (|rate| >= 15% / sec)
- ENDURANCE: Prolonged flight operations (extended operational duration)
"""

from typing import List, Dict, Any, Tuple
from enum import Enum


class OperatingCondition(str, Enum):
    SEA_LEVEL_NORMAL = "SEA_LEVEL_NORMAL"
    HIGH_ALTITUDE = "HIGH_ALTITUDE"
    HOT_WEATHER = "HOT_WEATHER"
    HIGH_ALTITUDE_HOT = "HIGH_ALTITUDE_HOT"
    COLD_WEATHER = "COLD_WEATHER"
    LOW_THROTTLE = "LOW_THROTTLE"
    CRUISE = "CRUISE"
    HIGH_THROTTLE = "HIGH_THROTTLE"
    RAPID_THROTTLE_CHANGE = "RAPID_THROTTLE_CHANGE"
    ENDURANCE = "ENDURANCE"


def classify_operating_conditions(
    altitude_ft: float,
    ambient_temp_c: float,
    throttle_pct: float,
    throttle_rate_pct_s: float,
    endurance_hours: float = 0.0
) -> Tuple[List[str], str]:
    """
    Classifies the operational state based on atmospheric and throttle inputs.

    Returns:
        Tuple of (list_of_all_active_conditions, primary_condition_name)
    """
    active: List[str] = []

    is_high_alt = altitude_ft >= 12000.0
    is_hot = ambient_temp_c >= 32.0
    is_cold = ambient_temp_c < 0.0
    is_rapid_throttle = abs(throttle_rate_pct_s) >= 15.0

    # 1. Combined Environmental Conditions
    if is_high_alt and is_hot:
        active.append(OperatingCondition.HIGH_ALTITUDE_HOT.value)
    
    if is_high_alt:
        active.append(OperatingCondition.HIGH_ALTITUDE.value)

    if is_hot:
        active.append(OperatingCondition.HOT_WEATHER.value)

    if is_cold:
        active.append(OperatingCondition.COLD_WEATHER.value)

    # 2. Sea level baseline
    if altitude_ft < 5000.0 and 10.0 <= ambient_temp_c <= 30.0 and not active:
        active.append(OperatingCondition.SEA_LEVEL_NORMAL.value)

    # 3. Throttle state
    if is_rapid_throttle:
        active.append(OperatingCondition.RAPID_THROTTLE_CHANGE.value)

    if throttle_pct >= 85.0:
        active.append(OperatingCondition.HIGH_THROTTLE.value)
    elif throttle_pct < 40.0:
        active.append(OperatingCondition.LOW_THROTTLE.value)
    elif 55.0 <= throttle_pct <= 75.0:
        active.append(OperatingCondition.CRUISE.value)

    # 4. Endurance mode
    if endurance_hours >= 1.0:
        active.append(OperatingCondition.ENDURANCE.value)

    if not active:
        active.append(OperatingCondition.CRUISE.value)

    # Determine primary condition (highest operational significance)
    hierarchy = [
        OperatingCondition.HIGH_ALTITUDE_HOT.value,
        OperatingCondition.RAPID_THROTTLE_CHANGE.value,
        OperatingCondition.HIGH_THROTTLE.value,
        OperatingCondition.HIGH_ALTITUDE.value,
        OperatingCondition.HOT_WEATHER.value,
        OperatingCondition.ENDURANCE.value,
        OperatingCondition.COLD_WEATHER.value,
        OperatingCondition.SEA_LEVEL_NORMAL.value,
        OperatingCondition.LOW_THROTTLE.value,
        OperatingCondition.CRUISE.value
    ]

    primary = active[0]
    for h in hierarchy:
        if h in active:
            primary = h
            break

    return active, primary
