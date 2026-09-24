"""
AeroTwin Physics-Informed Fault Diagnosis - Severity Engine
==========================================================
Classifies diagnostic severity into 5 standardized levels:
- INFO: Informational status / nominal operating condition
- LOW: Minor deviation or early-stage drift, fully within safe envelope
- MEDIUM: Significant deviation or isolated sensor failure; advisory maintenance
- HIGH: Subsystem health degraded; operational risk; prompt pilot/maintenance action
- CRITICAL: Multiple system failures or severe redline breach; emergency condition

Severity is synthesized from:
- Overall and Subsystem Health Indices
- Normalized Residual Magnitudes
- Confidence Level
- Fault State Machine Stage
- Multi-Sensor Agreement
"""

from typing import Dict, Any, Optional
from enum import Enum
from .fault_rules import FaultCode


class SeverityLevel(str, Enum):
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class SeverityEngine:
    """
    Synthesizes multi-channel evidence to assign calibrated severity ratings.
    """

    def __init__(
        self,
        critical_overall_threshold: float = 35.0,
        high_overall_threshold: float = 60.0,
        medium_overall_threshold: float = 78.0,
        critical_subsystem_threshold: float = 25.0,
        high_subsystem_threshold: float = 50.0
    ):
        self.crit_overall = critical_overall_threshold
        self.high_overall = high_overall_threshold
        self.med_overall = medium_overall_threshold
        self.crit_subsystem = critical_subsystem_threshold
        self.high_subsystem = high_subsystem_threshold

    def calculate_severity(
        self,
        fault_code: FaultCode,
        confidence: float,
        overall_health: float,
        subsystem_health: Dict[str, float],
        residuals: Dict[str, Any],
        degradation: Dict[str, float],
        fault_state: str = "CONFIRMED"
    ) -> SeverityLevel:
        """
        Calculates the appropriate severity level.
        """
        # 1. Nominal case
        if fault_code == FaultCode.NORMAL:
            if overall_health >= 90.0:
                return SeverityLevel.INFO
            elif overall_health >= 75.0:
                return SeverityLevel.LOW
            else:
                return SeverityLevel.MEDIUM

        # 2. Multi-System / Catastrophic Breakdown
        if fault_code == FaultCode.ENGINE_FAILURE_MULTI or overall_health < self.crit_overall or fault_state == "CRITICAL":
            return SeverityLevel.CRITICAL

        # 3. Isolated Sensor Faults
        # Sensor faults should NOT cause emergency alarms because engine physical dynamics remain safe
        if fault_code in (FaultCode.SENSOR_DRIFT, FaultCode.SENSOR_FAILURE):
            if fault_code == FaultCode.SENSOR_DRIFT:
                return SeverityLevel.LOW if confidence < 0.80 else SeverityLevel.MEDIUM
            # Severe sensor failure is capped at MEDIUM advisory (engine is healthy)
            return SeverityLevel.MEDIUM

        # 4. Check affected subsystem health
        affected_health = 100.0
        sub_key_map = {
            FaultCode.INJECTOR_DEGRADATION: "combustion",
            FaultCode.MISFIRE: "combustion",
            FaultCode.COMBUSTION_INSTABILITY: "combustion",
            FaultCode.LUBRICATION_FAULT: "lubrication",
            FaultCode.OVERHEATING: "thermal",
            FaultCode.ABNORMAL_VIBRATION: "mechanical",
            FaultCode.ELECTRICAL_ABNORMALITY: "electrical"
        }
        sub_key = sub_key_map.get(fault_code)
        if sub_key and sub_key in subsystem_health:
            affected_health = subsystem_health[sub_key]

        # 5. Check maximum normalized residual for extreme spikes
        max_norm_res = 0.0
        for k, v in residuals.items():
            if isinstance(v, dict):
                norm_r = abs(float(v.get("normalized_residual", 0.0)))
                if norm_r > max_norm_res:
                    max_norm_res = norm_r

        # Evaluate thresholds
        if affected_health < self.crit_subsystem or overall_health < self.crit_overall or max_norm_res > 4.5:
            if confidence > 0.65:
                return SeverityLevel.CRITICAL
            return SeverityLevel.HIGH

        if affected_health < self.high_subsystem or overall_health < self.high_overall or max_norm_res > 2.5:
            if confidence > 0.50:
                return SeverityLevel.HIGH
            return SeverityLevel.MEDIUM

        if overall_health < self.med_overall or affected_health < 75.0 or max_norm_res > 1.5:
            return SeverityLevel.MEDIUM

        if confidence < 0.40:
            return SeverityLevel.LOW

        return SeverityLevel.MEDIUM
