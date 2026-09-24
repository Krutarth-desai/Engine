"""
AeroTwin Mission Recording & Replay - Mission Summary Generator
===============================================================
Computes mathematical, diagnostic, and operational analytics from
recorded mission samples and events.
"""

from typing import List, Dict, Any, Optional
from .mission_models import MissionSample, MissionEvent, MissionSummary


SEVERITY_ORDER = {
    "CRITICAL": 5,
    "HIGH": 4,
    "MEDIUM": 3,
    "LOW": 2,
    "INFO": 1
}


def compute_mission_summary(
    samples: List[MissionSample],
    events: Optional[List[MissionEvent]] = None,
    max_trend_points: int = 120
) -> MissionSummary:
    """
    Computes rigorous mission summary statistics from raw recorded samples.

    Args:
        samples: Array of recorded MissionSample objects.
        events: Optional array of MissionEvent objects.
        max_trend_points: Maximum points to subsample for the health trend timeline.

    Returns:
        Populated MissionSummary object.
    """
    if not samples:
        return MissionSummary()

    total_samples = len(samples)
    first_sample = samples[0]
    last_sample = samples[-1]
    duration_sec = max(0.0, float(last_sample.mission_time_sec - first_sample.mission_time_sec))
    if duration_sec == 0.0 and total_samples > 1:
        duration_sec = float(total_samples - 1)

    # Health statistics
    health_values: List[float] = []
    altitude_values: List[float] = []
    throttle_values: List[float] = []

    unique_fault_types: set = set()
    highest_severity = "INFO"
    highest_severity_rank = 1
    time_of_first_fault: Optional[float] = None
    time_spent_degraded = 0.0
    time_spent_critical = 0.0
    conditions_set: set = set()
    profiles_set: set = set()

    fault_timeline: List[Dict[str, Any]] = []
    prev_fault_state: Optional[str] = None
    prev_fault_code: Optional[str] = None

    for idx, s in enumerate(samples):
        # Overall health
        h_overall = float(s.health.get("overall", 100.0))
        health_values.append(h_overall)

        if h_overall < 50.0:
            time_spent_critical += 1.0
        elif h_overall < 75.0:
            time_spent_degraded += 1.0

        # Altitude
        alt = float(s.environment.get("altitude_ft") or s.telemetry.get("altitude_ft") or 0.0)
        altitude_values.append(alt)

        # Throttle
        thr = float(s.environment.get("throttle_pct") or s.environment.get("effective_throttle_pct") or s.telemetry.get("throttle_pct") or 0.0)
        throttle_values.append(thr)

        # Profiles and conditions
        prof = s.mission_profile or s.environment.get("mission_profile") or "CRUISE"
        profiles_set.add(prof)

        conds = s.environment.get("operating_conditions", [])
        if isinstance(conds, list):
            conditions_set.update(conds)
        elif isinstance(conds, str):
            conditions_set.add(conds)

        prim_cond = s.environment.get("primary_condition") or s.environment.get("operating_condition")
        if prim_cond:
            conditions_set.add(prim_cond)

        # Diagnosis and Fault tracking
        diag = s.diagnosis or {}
        f_code = diag.get("fault_code") or ("NORMAL" if diag.get("fault") in ["Nominal Operation", "Normal", None] else "FAULT")
        f_name = diag.get("fault") or "Nominal Operation"
        f_state = diag.get("state") or "NORMAL"
        sev = diag.get("severity") or "INFO"

        if f_code != "NORMAL" and f_name not in ["Nominal Operation", "Normal"]:
            unique_fault_types.add(f_name)
            if time_of_first_fault is None:
                time_of_first_fault = round(float(s.mission_time_sec), 1)

            sev_rank = SEVERITY_ORDER.get(sev, 1)
            if sev_rank > highest_severity_rank:
                highest_severity_rank = sev_rank
                highest_severity = sev

        # Track discrete fault state transitions for the event timeline
        if f_state != prev_fault_state or f_code != prev_fault_code:
            fault_timeline.append({
                "timestamp": s.timestamp,
                "mission_time_sec": round(float(s.mission_time_sec), 1),
                "fault": f_name,
                "fault_code": f_code,
                "state": f_state,
                "confidence": round(float(diag.get("confidence", 0.0)), 3),
                "severity": sev,
                "affected_subsystem": diag.get("affected_subsystem", "None")
            })
            prev_fault_state = f_state
            prev_fault_code = f_code

    start_h = round(health_values[0], 1)
    end_h = round(health_values[-1], 1)
    min_h = round(min(health_values), 1)
    max_h = round(max(health_values), 1)
    avg_h = round(sum(health_values) / max(1, len(health_values)), 1)
    delta_h = round(end_h - start_h, 1)

    max_alt = round(max(altitude_values), 1)
    avg_alt = round(sum(altitude_values) / max(1, len(altitude_values)), 1)
    max_thr = round(max(throttle_values), 1)
    avg_thr = round(sum(throttle_values) / max(1, len(throttle_values)), 1)

    # Subsample health trend curve for visual dashboards
    step = max(1, total_samples // max_trend_points)
    trend_timeline: List[Dict[str, Any]] = []
    for i in range(0, total_samples, step):
        sample = samples[i]
        trend_timeline.append({
            "mission_time_sec": round(float(sample.mission_time_sec), 1),
            "overall": round(float(sample.health.get("overall", 100.0)), 1),
            "thermal": round(float(sample.health.get("thermal", 100.0)), 1),
            "combustion": round(float(sample.health.get("combustion", 100.0)), 1),
            "lubrication": round(float(sample.health.get("lubrication", 100.0)), 1),
            "mechanical": round(float(sample.health.get("mechanical", 100.0)), 1),
            "electrical": round(float(sample.health.get("electrical", 100.0)), 1),
            "sensor": round(float(sample.health.get("sensor", 100.0)), 1)
        })

    # Always ensure final sample is in trend timeline
    if trend_timeline and trend_timeline[-1]["mission_time_sec"] != round(float(last_sample.mission_time_sec), 1):
        trend_timeline.append({
            "mission_time_sec": round(float(last_sample.mission_time_sec), 1),
            "overall": round(float(last_sample.health.get("overall", 100.0)), 1),
            "thermal": round(float(last_sample.health.get("thermal", 100.0)), 1),
            "combustion": round(float(last_sample.health.get("combustion", 100.0)), 1),
            "lubrication": round(float(last_sample.health.get("lubrication", 100.0)), 1),
            "mechanical": round(float(last_sample.health.get("mechanical", 100.0)), 1),
            "electrical": round(float(last_sample.health.get("electrical", 100.0)), 1),
            "sensor": round(float(last_sample.health.get("sensor", 100.0)), 1)
        })

    return MissionSummary(
        duration_sec=round(duration_sec, 1),
        total_samples=total_samples,
        start_health=start_h,
        end_health=end_h,
        min_health=min_h,
        max_health=max_h,
        avg_health=avg_h,
        health_delta=delta_h,
        max_altitude_ft=max_alt,
        avg_altitude_ft=avg_alt,
        max_throttle_pct=max_thr,
        avg_throttle_pct=avg_thr,
        total_faults=len(unique_fault_types),
        fault_types=sorted(list(unique_fault_types)),
        highest_severity=highest_severity,
        time_of_first_fault_sec=time_of_first_fault,
        time_spent_degraded_sec=round(time_spent_degraded, 1),
        time_spent_critical_sec=round(time_spent_critical, 1),
        operating_conditions_encountered=sorted(list(conditions_set)),
        mission_profiles_encountered=sorted(list(profiles_set)),
        health_trend_timeline=trend_timeline,
        fault_timeline=fault_timeline
    )


# Function aliases for API compatibility
generate_mission_summary = compute_mission_summary

