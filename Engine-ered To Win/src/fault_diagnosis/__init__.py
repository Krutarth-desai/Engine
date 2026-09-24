"""
AeroTwin Physics-Informed Fault Diagnosis & Sensor Fusion Package
================================================================
Phase 3 Core Architecture for UAV Piston Engine Predictive Maintenance.
Fuses Physics-informed Digital Twin Residuals with ML Anomaly Detection,
Cross-Sensor Regressors, Subsystem Health, and Degradation Models.
"""

from .fault_rules import (
    FaultCode,
    FAULT_DISPLAY_NAMES,
    FAULT_SUBSYSTEM_MAP,
    SCENARIO_TO_FAULT_MAP,
    FaultRuleEngine
)
from .confidence_engine import ConfidenceEngine
from .severity_engine import SeverityEngine, SeverityLevel
from .evidence_engine import EvidenceEngine
from .fault_fusion_engine import FaultFusionEngine, FaultState

__all__ = [
    "FaultFusionEngine",
    "FaultState",
    "FaultCode",
    "FAULT_DISPLAY_NAMES",
    "FAULT_SUBSYSTEM_MAP",
    "SCENARIO_TO_FAULT_MAP",
    "FaultRuleEngine",
    "ConfidenceEngine",
    "SeverityEngine",
    "SeverityLevel",
    "EvidenceEngine"
]
