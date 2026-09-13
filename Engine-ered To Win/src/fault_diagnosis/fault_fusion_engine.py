"""
AeroTwin Physics-Informed Fault Diagnosis - Fault Fusion Engine
==============================================================
Central orchestration engine that fuses:
1. Raw live telemetry
2. Digital Twin virtual engine state and physics residuals
3. Subsystem Health Indices (0-100)
4. Subsystem Degradation wear states (0-1)
5. Isolation Forest ML Anomaly Detection (AeroTwinAnomalyDetector)
6. Cross-sensor ML Random Forest Regressors (SensorDiagnosisEngine)
7. Existing domain scenario / heuristic fault inference (infer_fault)

Implements:
- Fault State Machine: NORMAL -> ANOMALY -> SUSPECTED -> CONFIRMED -> CRITICAL (with RECOVERING)
- Temporal Persistence Confirmation
- Multi-Sensor vs Isolated Sensor Prioritization
- Alternative Candidate Generation
- Predictive Maintenance Context
"""

from typing import Dict, Any, List, Optional
from collections import deque
from enum import Enum

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


class FaultState(str, Enum):
    NORMAL = "NORMAL"
    ANOMALY = "ANOMALY"
    SUSPECTED = "SUSPECTED"
    CONFIRMED = "CONFIRMED"
    CRITICAL = "CRITICAL"
    RECOVERING = "RECOVERING"


class FaultFusionEngine:
    """
    Modular, physics-informed fault fusion engine for AeroTwin.
    """

    def __init__(
        self,
        anomaly_ticks_threshold: int = 1,
        suspected_ticks_threshold: int = 3,
        confirmed_ticks_threshold: int = 5,
        recovering_ticks_threshold: int = 3
    ):
        self.anomaly_thresh = anomaly_ticks_threshold
        self.suspected_thresh = suspected_ticks_threshold
        self.confirmed_thresh = confirmed_ticks_threshold
        self.recovering_thresh = recovering_ticks_threshold

        # Modular engines
        self.rule_engine = FaultRuleEngine()
        self.confidence_engine = ConfidenceEngine()
        self.severity_engine = SeverityEngine()
        self.evidence_engine = EvidenceEngine()

        # State machine & persistence tracking
        self.current_state: FaultState = FaultState.NORMAL
        self.active_fault: FaultCode = FaultCode.NORMAL
        self.consecutive_fault_ticks: int = 0
        self.consecutive_normal_ticks: int = 0
        self.fault_history: deque = deque(maxlen=60)

    def reset(self) -> None:
        """Resets the state machine and temporal persistence back to nominal."""
        self.current_state = FaultState.NORMAL
        self.active_fault = FaultCode.NORMAL
        self.consecutive_fault_ticks = 0
        self.consecutive_normal_ticks = 0
        self.fault_history.clear()

    def diagnose(
        self,
        telemetry: Dict[str, Any],
        digital_twin: Dict[str, Any],
        anomaly: Dict[str, Any],
        sensor_diagnosis: Dict[str, Any],
        existing_fault: Optional[Dict[str, Any]] = None,
        degradation: Optional[Dict[str, float]] = None,
        subsystem_health: Optional[Dict[str, float]] = None,
        scenario: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Main fusion diagnosis pipeline.
        Fuses all 7 data sources into a deterministic, explainable diagnosis payload.
        """
        residuals = digital_twin.get("residuals", {})
        
        # Subsystem health extraction
        if subsystem_health is None:
            subsystem_health = digital_twin.get("health", {}).get("subsystems") or digital_twin.get("subsystem_health", {})
        
        overall_health = float(
            digital_twin.get("health", {}).get("overall") or
            digital_twin.get("health_index") or
            telemetry.get("health_index", 100.0)
        )
        
        # Degradation state extraction
        if degradation is None:
            degradation = digital_twin.get("degradation", {})

        # Active scenario context
        scenario_name = scenario or telemetry.get("scenario", "Normal")
        expected_scenario_fault = SCENARIO_TO_FAULT_MAP.get(scenario_name)

        # 1. Rule Evaluation across 10 Fault Candidates
        candidates = self.rule_engine.evaluate_all_rules(
            telemetry=telemetry,
            residuals=residuals,
            subsystem_health=subsystem_health,
            overall_health=overall_health,
            degradation=degradation,
            sensor_diagnosis=sensor_diagnosis,
            anomaly=anomaly
        )

        # 2. Confidence Calculation for each Candidate
        scored_candidates = []
        for cand in candidates:
            # If a known scenario is injected, give a slight prior to the scenario match if supported by residuals
            if expected_scenario_fault and cand["fault_code"] == expected_scenario_fault:
                if cand["raw_match"] > 0.15:
                    cand["raw_match"] = min(1.0, cand["raw_match"] + 0.15)

            conf = self.confidence_engine.calculate_confidence(
                fault_candidate=cand,
                telemetry=telemetry,
                residuals=residuals,
                subsystem_health=subsystem_health,
                overall_health=overall_health,
                degradation=degradation,
                anomaly=anomaly,
                sensor_diagnosis=sensor_diagnosis
            )
            cand["confidence"] = conf
            scored_candidates.append(cand)

        # Sort descending by confidence
        scored_candidates.sort(key=lambda c: (c["confidence"], c["raw_match"]), reverse=True)

        # Determine Primary Candidate
        primary_candidate = scored_candidates[0]
        
        # If the top candidate is NORMAL, but overall health is low or an anomaly is confirmed, fallback to strongest fault
        if primary_candidate["fault_code"] == FaultCode.NORMAL and (overall_health < 75.0 or anomaly.get("is_anomaly", False)):
            fault_candidates = [c for c in scored_candidates if c["fault_code"] != FaultCode.NORMAL and c["confidence"] > 0.20]
            if fault_candidates:
                primary_candidate = fault_candidates[0]

        primary_fault = primary_candidate["fault_code"]
        primary_conf = primary_candidate["confidence"]

        # 3. Update Temporal Persistence & State Machine
        self._update_state_machine(primary_fault, primary_conf, overall_health)

        # 4. Severity Determination
        severity = self.severity_engine.calculate_severity(
            fault_code=primary_fault,
            confidence=primary_conf,
            overall_health=overall_health,
            subsystem_health=subsystem_health,
            residuals=residuals,
            degradation=degradation,
            fault_state=self.current_state.value
        )

        # 5. Evidence Generation
        evidence = self.evidence_engine.generate_evidence(
            fault_code=primary_fault,
            telemetry=telemetry,
            residuals=residuals,
            subsystem_health=subsystem_health,
            overall_health=overall_health,
            degradation=degradation,
            anomaly=anomaly,
            sensor_diagnosis=sensor_diagnosis,
            confidence=primary_conf
        )

        # 6. Supporting Signals Extraction
        supporting_signals = self._extract_supporting_signals(
            primary_fault, residuals, telemetry, subsystem_health, degradation
        )

        # 7. Alternative Faults (Filtered to candidates with confidence >= 0.20, excluding primary and normal)
        alternative_faults = []
        for cand in scored_candidates:
            if cand["fault_code"] != primary_fault and cand["fault_code"] != FaultCode.NORMAL:
                if cand["confidence"] >= 0.20:
                    cand_sev = self.severity_engine.calculate_severity(
                        fault_code=cand["fault_code"],
                        confidence=cand["confidence"],
                        overall_health=overall_health,
                        subsystem_health=subsystem_health,
                        residuals=residuals,
                        degradation=degradation,
                        fault_state=self.current_state.value
                    )
                    alternative_faults.append({
                        "fault": cand["fault_name"],
                        "fault_code": cand["fault_code"].value,
                        "confidence": cand["confidence"],
                        "severity": cand_sev.value,
                        "affected_subsystem": cand["subsystem"]
                    })
        # Keep top 3 alternatives
        alternative_faults = alternative_faults[:3]

        # 8. Suspected Sensor
        suspected_sensor = None
        if primary_fault in (FaultCode.SENSOR_DRIFT, FaultCode.SENSOR_FAILURE):
            suspected_sensor = sensor_diagnosis.get("suspected_sensor") or "cht_c"
        elif sensor_diagnosis.get("diagnosis_type") == "POSSIBLE_SENSOR_FAILURE":
            suspected_sensor = sensor_diagnosis.get("suspected_sensor")

        # 9. Maintenance Context for Phase 4/5 consumption
        maintenance_context = {
            "fault": FAULT_DISPLAY_NAMES[primary_fault],
            "fault_code": primary_fault.value,
            "severity": severity.value,
            "confidence": primary_conf,
            "affected_subsystem": FAULT_SUBSYSTEM_MAP[primary_fault],
            "health_score": round(overall_health, 1),
            "degradation_wear": degradation.get(
                self._get_degradation_key(primary_fault), 0.0
            ),
            "trend": digital_twin.get("trend", {}).get("warning") or "Degrading" if overall_health < 85.0 else "Stable",
            "persistence_ticks": self.consecutive_fault_ticks if primary_fault != FaultCode.NORMAL else 0
        }

        # Formulate final diagnosis contract
        diagnosis_result = {
            "fault": FAULT_DISPLAY_NAMES[primary_fault],
            "fault_code": primary_fault.value,
            "state": self.current_state.value,
            "confidence": primary_conf,
            "severity": severity.value,
            "affected_subsystem": FAULT_SUBSYSTEM_MAP[primary_fault],
            "evidence": evidence,
            "supporting_signals": supporting_signals,
            "suspected_sensor": suspected_sensor,
            "alternative_faults": alternative_faults,
            "maintenance_context": maintenance_context,
            "persistence_ticks": self.consecutive_fault_ticks,
            "is_sensor_fault": primary_fault in (FaultCode.SENSOR_DRIFT, FaultCode.SENSOR_FAILURE)
        }

        # Record history
        self.fault_history.append({
            "fault": primary_fault.value,
            "state": self.current_state.value,
            "confidence": primary_conf,
            "health": overall_health
        })

        return diagnosis_result

    def _update_state_machine(self, fault: FaultCode, confidence: float, overall_health: float) -> None:
        """
        Updates the Fault State Machine according to temporal persistence and recovery logic:
        NORMAL -> ANOMALY -> SUSPECTED -> CONFIRMED -> CRITICAL
        CRITICAL/CONFIRMED -> RECOVERING -> NORMAL
        """
        if fault == FaultCode.NORMAL:
            self.consecutive_fault_ticks = 0
            self.consecutive_normal_ticks += 1

            if self.current_state in (FaultState.CRITICAL, FaultState.CONFIRMED, FaultState.SUSPECTED):
                self.current_state = FaultState.RECOVERING
            elif self.current_state == FaultState.RECOVERING:
                if self.consecutive_normal_ticks >= self.recovering_thresh:
                    self.current_state = FaultState.NORMAL
                    self.active_fault = FaultCode.NORMAL
            else:
                self.current_state = FaultState.NORMAL
                self.active_fault = FaultCode.NORMAL
        else:
            # Active fault detected
            self.consecutive_normal_ticks = 0
            self.consecutive_fault_ticks += 1
            self.active_fault = fault

            # Critical override if health has collapsed or catastrophic multi-system failure
            if overall_health < 35.0 or (fault == FaultCode.ENGINE_FAILURE_MULTI and self.consecutive_fault_ticks >= 2):
                self.current_state = FaultState.CRITICAL
            elif self.consecutive_fault_ticks >= self.confirmed_thresh:
                self.current_state = FaultState.CONFIRMED
            elif self.consecutive_fault_ticks >= self.suspected_thresh:
                self.current_state = FaultState.SUSPECTED
            elif self.consecutive_fault_ticks >= self.anomaly_thresh:
                self.current_state = FaultState.ANOMALY
            else:
                self.current_state = FaultState.NORMAL

    def _extract_supporting_signals(
        self,
        fault: FaultCode,
        residuals: Dict[str, Any],
        telemetry: Dict[str, Any],
        health: Dict[str, float],
        degradation: Dict[str, float]
    ) -> Dict[str, Any]:
        """Extracts numerical supporting signals formatted for UI and logging."""
        def res(k: str) -> float:
            v = residuals.get(k, {})
            return round(float(v.get("residual", 0.0)), 2) if isinstance(v, dict) else 0.0

        def pct(k: str) -> float:
            v = residuals.get(k, {})
            return round(float(v.get("pct_deviation", 0.0)), 2) if isinstance(v, dict) else 0.0

        signals = {
            "rpm_residual": res("rpm"),
            "egt_residual": res("egt_c"),
            "cht_residual": res("cht_c"),
            "oil_pressure_residual": res("oil_pressure_bar"),
            "oil_temperature_residual": res("oil_temperature_c"),
            "fuel_flow_residual": res("fuel_flow_lh"),
            "vibration_residual": res("vibration_g"),
            "battery_voltage_residual": res("battery_voltage_v")
        }

        if fault == FaultCode.INJECTOR_DEGRADATION:
            signals.update({
                "egt_pct_deviation": pct("egt_c"),
                "fuel_flow_pct_deviation": pct("fuel_flow_lh"),
                "combustion_health": round(health.get("combustion", 100.0), 1),
                "injector_degradation": round(degradation.get("injector", 0.0), 3)
            })
        elif fault == FaultCode.LUBRICATION_FAULT:
            signals.update({
                "lubrication_health": round(health.get("lubrication", 100.0), 1),
                "lubrication_degradation": round(degradation.get("lubrication", 0.0), 3)
            })
        elif fault == FaultCode.OVERHEATING:
            signals.update({
                "cht_pct_deviation": pct("cht_c"),
                "thermal_health": round(health.get("thermal", 100.0), 1),
                "cooling_degradation": round(degradation.get("cooling", 0.0), 3)
            })
        elif fault == FaultCode.ABNORMAL_VIBRATION:
            signals.update({
                "mechanical_health": round(health.get("mechanical", 100.0), 1),
                "mechanical_degradation": round(degradation.get("mechanical", 0.0), 3)
            })

        return signals

    def _get_degradation_key(self, fault: FaultCode) -> str:
        """Maps fault code to internal degradation model key."""
        mapping = {
            FaultCode.INJECTOR_DEGRADATION: "injector",
            FaultCode.LUBRICATION_FAULT: "lubrication",
            FaultCode.OVERHEATING: "cooling",
            FaultCode.ABNORMAL_VIBRATION: "mechanical",
            FaultCode.ELECTRICAL_ABNORMALITY: "electrical",
            FaultCode.SENSOR_DRIFT: "sensors",
            FaultCode.SENSOR_FAILURE: "sensors"
        }
        return mapping.get(fault, "injector")
