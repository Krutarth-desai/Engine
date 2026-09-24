"""
AeroTwin Digital Twin - Predefined UAV Mission Operating Profiles
================================================================
Defines canonical flight phase targets for MALE UAV simulation demonstrations:

1. TAKEOFF: Maximum continuous climb power, sea-level ground roll to 1,500 ft
2. CLIMB: Sustained climb profile, 1,500 ft to 12,000 ft cruise ceiling
3. CRUISE: Nominal ISR patrol profile at 15,000 ft, 70% economical power
4. LOITER: Maximum endurance loiter profile at 9,000 ft, 50% low fuel-burn
5. HIGH_SPEED: High-speed ingress/evasion profile at 90% throttle
6. DESCENT: Enroute descent profile at 35% throttle, negative vertical speed
7. LANDING: Final approach and touchdown profile at 25% throttle, ground level

NOTE: These profiles are representative simulation profiles for the AeroTwin
demonstrator and not certified airframe flight manual schedules.
"""

from typing import Dict, Any, Optional
from enum import Enum


class MissionPhase(str, Enum):
    TAKEOFF = "TAKEOFF"
    CLIMB = "CLIMB"
    CRUISE = "CRUISE"
    LOITER = "LOITER"
    HIGH_SPEED = "HIGH_SPEED"
    DESCENT = "DESCENT"
    LANDING = "LANDING"


MISSION_PROFILES: Dict[str, Dict[str, Any]] = {
    MissionPhase.TAKEOFF.value: {
        "name": "Takeoff & Initial Climb",
        "phase": MissionPhase.TAKEOFF.value,
        "throttle_target": 95.0,
        "altitude_target": 1500.0,
        "ambient_temp_target": 25.0,
        "climb_rate_fpm": 900.0,
        "expected_condition": "HIGH_THROTTLE",
        "description": "Full takeoff throttle roll and steep initial obstacle clearance climb."
    },
    MissionPhase.CLIMB.value: {
        "name": "Enroute Climb",
        "phase": MissionPhase.CLIMB.value,
        "throttle_target": 85.0,
        "altitude_target": 12000.0,
        "ambient_temp_target": 15.0,
        "climb_rate_fpm": 600.0,
        "expected_condition": "HIGH_THROTTLE",
        "description": "Continuous climb to transit operational ceiling at 85% governor demand."
    },
    MissionPhase.CRUISE.value: {
        "name": "Operational Transit / Cruise",
        "phase": MissionPhase.CRUISE.value,
        "throttle_target": 70.0,
        "altitude_target": 15000.0,
        "ambient_temp_target": 15.0,
        "climb_rate_fpm": 0.0,
        "expected_condition": "HIGH_ALTITUDE",
        "description": "Standard ISR patrol cruise profile at 15,000 ft altitude."
    },
    MissionPhase.LOITER.value: {
        "name": "Low-Power Endurance Loiter",
        "phase": MissionPhase.LOITER.value,
        "throttle_target": 50.0,
        "altitude_target": 9000.0,
        "ambient_temp_target": 12.0,
        "climb_rate_fpm": 0.0,
        "expected_condition": "CRUISE",
        "description": "Maximum endurance loiter over target area with optimized fuel economy."
    },
    MissionPhase.HIGH_SPEED.value: {
        "name": "High-Speed Ingress / Dash",
        "phase": MissionPhase.HIGH_SPEED.value,
        "throttle_target": 90.0,
        "altitude_target": 12000.0,
        "ambient_temp_target": 10.0,
        "climb_rate_fpm": 0.0,
        "expected_condition": "HIGH_THROTTLE",
        "description": "High-speed operational transit under maximum continuous engine load."
    },
    MissionPhase.DESCENT.value: {
        "name": "Enroute Recovery Descent",
        "phase": MissionPhase.DESCENT.value,
        "throttle_target": 35.0,
        "altitude_target": 3000.0,
        "ambient_temp_target": 22.0,
        "climb_rate_fpm": -700.0,
        "expected_condition": "LOW_THROTTLE",
        "description": "Controlled descent toward recovery airbase at reduced engine power."
    },
    MissionPhase.LANDING.value: {
        "name": "Final Approach & Touchdown",
        "phase": MissionPhase.LANDING.value,
        "throttle_target": 25.0,
        "altitude_target": 100.0,
        "ambient_temp_target": 25.0,
        "climb_rate_fpm": -350.0,
        "expected_condition": "LOW_THROTTLE",
        "description": "Approach power setting, low thermal load, runway alignment and flare."
    }
}


def get_mission_profile(phase_name: str) -> Dict[str, Any]:
    """Retrieves mission profile parameters by name with case-insensitive fallback."""
    key = str(phase_name).upper().strip()
    if key in MISSION_PROFILES:
        return MISSION_PROFILES[key]
    for k, v in MISSION_PROFILES.items():
        if k in key or key in k:
            return v
    return MISSION_PROFILES[MissionPhase.CRUISE.value]
