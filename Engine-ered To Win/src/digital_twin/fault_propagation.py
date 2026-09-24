"""
AeroTwin Digital Twin - Physics-Informed Fault Propagation & Degradation Engine
================================================================================
Simulates realistic multi-fault dynamics, parameter propagation, cross-fault
interactions, progressive component wear, secondary fault cascades, and an
engine condition state machine:

  NOMINAL -> MINOR_DEGRADATION -> DEGRADED -> SEVERE -> CRITICAL -> FAILURE

Core Characteristics:
1. Multi-Fault Support: Active faults operate simultaneously in a set.
2. Physics-Informed Mechanism: Faults apply physical forces to engine states,
   not arbitrary hardcoded health numbers.
3. Gradual Progression: Stresses compound smoothly over time with configurable rates.
4. Synergistic Interactions: Co-occurring faults (e.g., Lubrication + Vibration)
   accelerate degradation nonlinearly.
5. Secondary Cascades: Severe primary conditions spawn secondary faults.
6. Sensor vs. Engine Isolation: Transducer drift/faults do NOT cause physical
   engine heating or mechanical damage.
7. Realistic Recovery: Removing a fault halts driving stress, but accumulated
   wear remains until serviced.
"""

from typing import Dict, Any, List, Set, Optional, Tuple
from enum import Enum
import math
import random
from datetime import datetime


class EngineConditionState(str, Enum):
    NOMINAL = "NOMINAL"
    MINOR_DEGRADATION = "MINOR_DEGRADATION"
    DEGRADED = "DEGRADED"
    SEVERE = "SEVERE"
    CRITICAL = "CRITICAL"
    FAILURE = "FAILURE"


class FaultCategory(str, Enum):
    COMBUSTION = "COMBUSTION"
    THERMAL = "THERMAL"
    LUBRICATION = "LUBRICATION"
    MECHANICAL = "MECHANICAL"
    SENSOR = "SENSOR"
    SYSTEM = "SYSTEM"


# Standardized Fault IDs matching requirements
FAULT_MISFIRE = "misfire"
FAULT_INJECTOR = "injector_abnormality"
FAULT_COATING = "coating_degradation"
FAULT_LUBRICATION = "lubrication_issue"
FAULT_SENSOR_DRIFT = "sensor_drift"
FAULT_COMBUSTION_INSTABILITY = "combustion_instability"
FAULT_OVERHEATING = "overheating_trend"
FAULT_VIBRATION = "abnormal_vibration"
FAULT_ENGINE_FAILURE_MULTI = "engine_failure_multi"

# Legacy / UI alias normalization map
FAULT_ALIAS_MAP: Dict[str, str] = {
    "normal": "normal",
    "misfire": FAULT_MISFIRE,
    "injector_degradation": FAULT_INJECTOR,
    "injector_abnormality": FAULT_INJECTOR,
    "coating_degradation": FAULT_COATING,
    "coating": FAULT_COATING,
    "lubrication": FAULT_LUBRICATION,
    "oil_pressure_loss": FAULT_LUBRICATION,
    "lubrication_issue": FAULT_LUBRICATION,
    "lubrication_fault": FAULT_LUBRICATION,
    "sensor_drift": FAULT_SENSOR_DRIFT,
    "sensor_fault_cht": FAULT_SENSOR_DRIFT,
    "sensor_fault_temp": FAULT_SENSOR_DRIFT,
    "combustion_instability": FAULT_COMBUSTION_INSTABILITY,
    "rpm_drop": FAULT_COMBUSTION_INSTABILITY,
    "overheating": FAULT_OVERHEATING,
    "overheating_trend": FAULT_OVERHEATING,
    "vibration_fault": FAULT_VIBRATION,
    "high_vibration": FAULT_VIBRATION,
    "abnormal_vibration": FAULT_VIBRATION,
    "engine_failure_multi": FAULT_ENGINE_FAILURE_MULTI,
}


class FaultDefinition:
    """Configurable definition for a fault type."""

    def __init__(
        self,
        fault_id: str,
        name: str,
        category: FaultCategory,
        base_severity: str,
        onset_rate: float = 0.15,      # Rate at which intensity ramps to 1.0 per second
        recovery_rate: float = 0.20,   # Rate at which active driving force clears per second
        accumulates_wear: bool = True, # Whether physical component damage accumulates
        is_sensor_only: bool = False,  # True if fault only affects sensor measurement
        description: str = ""
    ):
        self.fault_id = fault_id
        self.name = name
        self.category = category
        self.base_severity = base_severity
        self.onset_rate = onset_rate
        self.recovery_rate = recovery_rate
        self.accumulates_wear = accumulates_wear
        self.is_sensor_only = is_sensor_only
        self.description = description


# Catalog of the 8 canonical fault definitions (+ multi-system failure)
FAULT_CATALOG: Dict[str, FaultDefinition] = {
    FAULT_MISFIRE: FaultDefinition(
        fault_id=FAULT_MISFIRE,
        name="Cylinder Misfire",
        category=FaultCategory.COMBUSTION,
        base_severity="HIGH",
        onset_rate=0.25,
        recovery_rate=0.35,
        accumulates_wear=True,
        description="Intermittent combustion ignition loss causing RPM drops, torque ripple and vibration surge."
    ),
    FAULT_INJECTOR: FaultDefinition(
        fault_id=FAULT_INJECTOR,
        name="Injector Abnormality",
        category=FaultCategory.COMBUSTION,
        base_severity="MEDIUM",
        onset_rate=0.15,
        recovery_rate=0.25,
        accumulates_wear=True,
        description="Partially restricted or leaking fuel nozzle altering mixture, fuel flow, and EGT balance."
    ),
    FAULT_COATING: FaultDefinition(
        fault_id=FAULT_COATING,
        name="Coating Degradation",
        category=FaultCategory.MECHANICAL,
        base_severity="LOW",
        onset_rate=0.04,   # Very gradual wear accumulation
        recovery_rate=0.01,  # Component wear does not vanish easily
        accumulates_wear=True,
        description="Protective thermal barrier and piston coating wear increasing boundary friction and heat."
    ),
    FAULT_LUBRICATION: FaultDefinition(
        fault_id=FAULT_LUBRICATION,
        name="Lubrication Issue",
        category=FaultCategory.LUBRICATION,
        base_severity="HIGH",
        onset_rate=0.18,
        recovery_rate=0.15,
        accumulates_wear=True,
        description="Oil pressure loss and temperature spike causing boundary friction, thermal runaway, and bearing risk."
    ),
    FAULT_SENSOR_DRIFT: FaultDefinition(
        fault_id=FAULT_SENSOR_DRIFT,
        name="CHT Sensor Drift",
        category=FaultCategory.SENSOR,
        base_severity="LOW",
        onset_rate=0.12,
        recovery_rate=0.30,
        accumulates_wear=False,
        is_sensor_only=True,
        description="Transducer calibration bias affecting CHT reading without physical engine heating."
    ),
    FAULT_COMBUSTION_INSTABILITY: FaultDefinition(
        fault_id=FAULT_COMBUSTION_INSTABILITY,
        name="Combustion Instability",
        category=FaultCategory.COMBUSTION,
        base_severity="MEDIUM",
        onset_rate=0.20,
        recovery_rate=0.30,
        accumulates_wear=True,
        description="Cyclic combustion variability creating oscillating high-low parameter swings in RPM and EGT."
    ),
    FAULT_OVERHEATING: FaultDefinition(
        fault_id=FAULT_OVERHEATING,
        name="Overheating Trend",
        category=FaultCategory.THERMAL,
        base_severity="HIGH",
        onset_rate=0.10,
        recovery_rate=0.10,
        accumulates_wear=True,
        description="Progressive thermal escalation with positive temperature slope across cylinder heads and exhaust."
    ),
    FAULT_VIBRATION: FaultDefinition(
        fault_id=FAULT_VIBRATION,
        name="Abnormal Vibration",
        category=FaultCategory.MECHANICAL,
        base_severity="MEDIUM",
        onset_rate=0.20,
        recovery_rate=0.25,
        accumulates_wear=True,
        description="Rotational imbalance or mount deterioration inducing high harmonic vibration loads."
    ),
    FAULT_ENGINE_FAILURE_MULTI: FaultDefinition(
        fault_id=FAULT_ENGINE_FAILURE_MULTI,
        name="Multi-System Catastrophic Breakdown",
        category=FaultCategory.SYSTEM,
        base_severity="CRITICAL",
        onset_rate=0.30,
        recovery_rate=0.05,
        accumulates_wear=True,
        description="Simultaneous multi-subsystem cascading breakdown leading to immediate power loss and critical status."
    ),
}


class FaultPropagationEngine:
    """
    Centralized physics-informed engine for fault propagation, multiple simultaneous
    fault interaction, temporal evolution, accumulated component damage, and condition state.
    """

    def __init__(self):
        # Active faults set: maps normalized fault_id -> active tracking dict
        self._active_faults: Dict[str, Dict[str, Any]] = {}
        
        # Cumulative permanent physical wear states (0.0 = brand new, 1.0 = worn out / failed)
        self._accumulated_wear: Dict[str, float] = {
            "injector": 0.0,
            "lubrication": 0.0,
            "bearings": 0.0,
            "cooling": 0.0,
            "mechanical": 0.0,
            "coating": 0.0,
            "electrical": 0.0,
            "sensors": 0.0,
        }

        
        # Engine condition state machine
        self._condition_state: EngineConditionState = EngineConditionState.NOMINAL
        
        # Simulation tick counter & timeline history
        self._ticks: int = 0
        self._fault_timeline: List[Dict[str, Any]] = []
        
        # Internal oscillation phase for combustion instability
        self._osc_phase: float = 0.0
        
        # Temperature trend buffer for trend slope analysis
        self._cht_history: List[float] = []

        # Cascaded secondary faults and sensor confidence tracking
        self._cascaded_faults: Set[str] = set()
        self._sensor_confidence: float = 100.0


    # =========================================================================
    # Fault Injection & Removal API
    # =========================================================================

    def normalize_id(self, fault_id: str) -> str:
        """Maps any legacy or UI scenario string to standard fault_id."""
        clean = fault_id.lower().strip()
        return FAULT_ALIAS_MAP.get(clean, clean)

    def inject_fault(self, fault_id: str, initial_intensity: Any = None) -> bool:
        """
        Adds a fault to active_faults without resetting existing faults.
        Accepts initial_intensity as float [0.0-1.0] or string ("LOW", "MODERATE", "HIGH", "CRITICAL").
        If the fault is already active, its progression and ticks_active are preserved.
        """
        norm_id = self.normalize_id(fault_id)
        if norm_id == "normal":
            self.clear_active_faults()
            return True

        if norm_id not in FAULT_CATALOG:
            norm_id = FAULT_ALIAS_MAP.get(norm_id, norm_id)
            if norm_id not in FAULT_CATALOG:
                return False

        # If fault is already active, preserve its progression and intensity
        if norm_id in self._active_faults:
            return True

        if initial_intensity is None:
            intensity_val = 0.35  # Immediate noticeable physical onset
        elif isinstance(initial_intensity, str):
            sev_upper = initial_intensity.upper().strip()
            sev_map = {
                "LOW": 0.3,
                "MODERATE": 0.55,
                "HIGH": 0.8,
                "SEVERE": 0.85,
                "CRITICAL": 1.0
            }
            intensity_val = sev_map.get(sev_upper, 0.45)
        else:
            try:
                intensity_val = float(initial_intensity)
            except (ValueError, TypeError):
                intensity_val = 0.35
        intensity_val = max(0.0, min(1.0, intensity_val))

        self._active_faults[norm_id] = {
            "fault_id": norm_id,
            "ticks_active": 0,
            "intensity": intensity_val,
            "injected_at_tick": self._ticks,
            "definition": FAULT_CATALOG[norm_id]
        }
        self._log_timeline(f"Fault Injected: {FAULT_CATALOG[norm_id].name}")
        return True


    def remove_fault(self, fault_id: str) -> bool:
        """
        Removes an individual fault from the active set without clearing other active faults.
        Driving stress stops, but accumulated physical wear remains.
        """
        norm_id = self.normalize_id(fault_id)
        if norm_id in self._active_faults:
            name = self._active_faults[norm_id]["definition"].name
            del self._active_faults[norm_id]
            self._log_timeline(f"Fault Removed: {name} (Driving force cleared)")
            return True
        return False

    def toggle_fault(self, fault_id: str) -> bool:
        """Toggles a fault on or off."""
        norm_id = self.normalize_id(fault_id)
        if norm_id == "normal":
            self.clear_active_faults()
            return True
        if norm_id in self._active_faults:
            self.remove_fault(norm_id)
            return False
        else:
            self.inject_fault(norm_id)
            return True

    def clear_active_faults(self) -> None:
        """Clears all active driving faults. Accumulated component damage remains."""
        if self._active_faults:
            self._log_timeline("All active driving faults cleared - system entering recovery")
            self._active_faults.clear()
        self._cascaded_faults.clear()

    def clear_all_faults(self) -> None:
        """Alias for clear_active_faults()."""
        self.clear_active_faults()

    def set_active_faults(self, fault_ids: Any) -> None:
        """Sets active faults to match the provided collection of fault IDs while preserving progression."""
        if not fault_ids:
            self.clear_active_faults()
            return

        if isinstance(fault_ids, str):
            fault_ids = [fault_ids]

        target_ids = {self.normalize_id(fid) for fid in fault_ids if fid and str(fid).lower() != "normal"}
        current_ids = set(self._active_faults.keys())

        # Remove faults no longer present in target
        for fid in current_ids - target_ids:
            self.remove_fault(fid)

        # Inject newly added faults (existing faults are preserved by inject_fault)
        for fid in target_ids - current_ids:
            self.inject_fault(fid)

    def reset_all(self) -> None:
        """Total maintenance overhaul reset: clears faults, zero wear, nominal state."""
        self._active_faults.clear()
        self._cascaded_faults.clear()
        self._sensor_confidence = 100.0
        for k in self._accumulated_wear:
            self._accumulated_wear[k] = 0.0
        self._condition_state = EngineConditionState.NOMINAL
        self._ticks = 0
        self._fault_timeline.clear()
        self._cht_history.clear()
        self._log_timeline("Full engine overhaul: pristine baseline restored")

    def reset(self) -> None:
        """Alias for reset_all()."""
        self.reset_all()

    def get_active_faults(self) -> List[str]:
        """Returns list of currently active fault IDs."""
        return list(self._active_faults.keys())

    def get_active_fault_ids(self) -> List[str]:
        """Alias for get_active_faults()."""
        return self.get_active_faults()

    def get_cascaded_fault_ids(self) -> List[str]:
        """Returns list of active secondary cascaded faults."""
        return list(self._cascaded_faults)

    def get_sensor_confidence(self) -> float:
        """Returns current sensor confidence percentage."""
        return round(self._sensor_confidence, 2)

    def get_active_fault_names(self) -> List[str]:
        """Returns list of display names for active faults."""
        return [self._active_faults[f]["definition"].name for f in self._active_faults]

    def is_fault_active(self, fault_id: str) -> bool:
        """Checks if a fault is currently active."""
        return self.normalize_id(fault_id) in self._active_faults

    def get_condition_state(self) -> EngineConditionState:
        """Returns current engine condition state machine enum."""
        return self._condition_state

    def get_accumulated_wear(self) -> Dict[str, float]:
        """Returns copy of accumulated physical component wear."""
        return dict(self._accumulated_wear)

    def get_timeline(self) -> List[Dict[str, Any]]:
        """Returns chronological event timeline."""
        return list(self._fault_timeline)

    def get_fault_timeline(self) -> List[Dict[str, Any]]:
        """Alias for get_timeline()."""
        return self.get_timeline()


    def _log_timeline(self, event: str) -> None:
        sec = self._ticks
        mins = sec // 60
        s = sec % 60
        time_str = f"{mins:02d}:{s:02d}"
        self._fault_timeline.append({
            "tick": self._ticks,
            "time_str": time_str,
            "timestamp": datetime.now().isoformat(),
            "event": event
        })
        if len(self._fault_timeline) > 100:
            self._fault_timeline = self._fault_timeline[-100:]

    # =========================================================================
    # Physics Propagation & Tick Advancement
    # =========================================================================

    def update(
        self,
        base_sensors: Optional[Dict[str, float]] = None,
        dt: float = 1.0,
        **kwargs
    ) -> Tuple[Dict[str, float], Dict[str, Any]]:
        """
        Advances the fault propagation engine by dt seconds:
        1. Ramps active fault intensities according to their onset rates.
        2. Evaluates cross-fault synergies.
        3. Applies physical perturbations to base engine sensor values.
        4. Accumulates permanent wear on stressed components.
        5. Triggers secondary cascades if thresholds are breached.
        6. Updates the Engine Condition State Machine.

        Returns:
            (perturbed_sensors, propagation_metrics)
        """
        self._ticks += 1
        raw_base = base_sensors if base_sensors is not None else kwargs.get("base_telemetry", {})
        perturbed = dict(raw_base) if raw_base else {}
        self._osc_phase += 0.45 * dt

        # Ensure standard keys exist with defaults and alias mappings
        defaults = {
            "rpm": 2450.0,
            "cht": 142.0,
            "egt": 615.0,
            "oil_pressure": 68.0,
            "oil_temperature": 92.0,
            "fuel_flow": 17.6,
            "vibration": 1.42,
            "bus_voltage": 27.6,
            "injection_timing": 23.4,
        }
        for k, v in defaults.items():
            if k not in perturbed:
                if k == "cht" and "cht_c" in perturbed:
                    perturbed["cht"] = float(perturbed["cht_c"])
                elif k == "egt" and "egt_c" in perturbed:
                    perturbed["egt"] = float(perturbed["egt_c"])
                elif k == "oil_temperature" and "oil_temperature_c" in perturbed:
                    perturbed["oil_temperature"] = float(perturbed["oil_temperature_c"])
                elif k == "vibration" and "vibration_g" in perturbed:
                    perturbed["vibration"] = float(perturbed["vibration_g"])
                elif k == "oil_pressure" and "oil_pressure_bar" in perturbed:
                    perturbed["oil_pressure"] = float(perturbed["oil_pressure_bar"]) * 14.5038
                elif k == "fuel_flow" and "fuel_flow_lh" in perturbed:
                    perturbed["fuel_flow"] = float(perturbed["fuel_flow_lh"])
                else:
                    perturbed[k] = v



        # 1. Update active fault intensities and durations
        for fid, finfo in list(self._active_faults.items()):
            finfo["ticks_active"] += 1
            rate = finfo["definition"].onset_rate
            # Smooth growth toward 1.0
            finfo["intensity"] = min(1.0, finfo["intensity"] + rate * dt)

        # 2. Extract active intensities
        act_misfire = self._get_intensity(FAULT_MISFIRE)
        act_injector = self._get_intensity(FAULT_INJECTOR)
        act_coating = self._get_intensity(FAULT_COATING)
        act_lube = self._get_intensity(FAULT_LUBRICATION)
        act_drift = self._get_intensity(FAULT_SENSOR_DRIFT)
        act_comb_inst = self._get_intensity(FAULT_COMBUSTION_INSTABILITY)
        act_overheat = self._get_intensity(FAULT_OVERHEATING)
        act_vib = self._get_intensity(FAULT_VIBRATION)
        act_catastrophic = self._get_intensity(FAULT_ENGINE_FAILURE_MULTI)

        # 3. Cross-Fault Synergy Multipliers
        synergy_thermal = 1.0
        if act_injector > 0.2 and act_overheat > 0.2:
            synergy_thermal = 1.0 + 0.6 * min(act_injector, act_overheat)

        synergy_mech = 1.0
        if act_lube > 0.2 and act_vib > 0.2:
            synergy_mech = 1.0 + 0.7 * min(act_lube, act_vib)

        synergy_friction = 1.0
        if act_coating > 0.1 and act_lube > 0.2:
            synergy_friction = 1.0 + 0.8 * min(act_coating, act_lube)

        # 4. Secondary Fault Cascade Evaluation
        secondary_lube_triggered = False
        secondary_vib_triggered = False
        secondary_thermal_triggered = False

        if act_lube > 0.4 or self._accumulated_wear["lubrication"] > 0.35:
            secondary_vib_triggered = True
            secondary_thermal_triggered = True

        if act_misfire > 0.4:
            secondary_vib_triggered = True

        if self._accumulated_wear["coating"] > 0.25:
            secondary_thermal_triggered = True
            secondary_vib_triggered = True

        self._cascaded_faults.clear()
        if secondary_vib_triggered:
            self._cascaded_faults.add("secondary_vibration")
        if secondary_thermal_triggered:
            self._cascaded_faults.add("secondary_thermal")
        if secondary_lube_triggered:
            self._cascaded_faults.add("secondary_lubrication")


        # 5. Apply Physical Parameter Modifications
        # Parameter: RPM
        if act_misfire > 0.0:
            jitter = random.uniform(-40, 40) * act_misfire
            drop = (280.0 + jitter) * act_misfire
            perturbed["rpm"] -= drop

        if act_injector > 0.0:
            perturbed["rpm"] += random.gauss(0, 35.0) * act_injector

        if act_comb_inst > 0.0:
            swing = math.sin(self._osc_phase) * 140.0 * act_comb_inst
            perturbed["rpm"] += swing

        if act_catastrophic > 0.0:
            perturbed["rpm"] -= 650.0 * act_catastrophic

        if self._condition_state == EngineConditionState.FAILURE:
            perturbed["rpm"] = max(0.0, perturbed["rpm"] * 0.15)

        # Parameter: CHT
        if act_overheat > 0.0:
            cht_rise = (35.0 + 30.0 * act_overheat) * act_overheat * synergy_thermal
            perturbed["cht"] += cht_rise

        if act_coating > 0.0 or self._accumulated_wear["coating"] > 0.0:
            coat_factor = max(act_coating, self._accumulated_wear["coating"])
            perturbed["cht"] += 16.0 * coat_factor * synergy_friction

        if act_lube > 0.0:
            perturbed["cht"] += 22.0 * act_lube * synergy_friction

        if act_catastrophic > 0.0:
            perturbed["cht"] += 60.0 * act_catastrophic

        # Track CHT history for trend detection
        self._cht_history.append(float(perturbed.get("cht", 142.0)))
        if len(self._cht_history) > 10:
            self._cht_history = self._cht_history[-10:]

        # Parameter: EGT
        if act_overheat > 0.0:
            perturbed["egt"] += (65.0 + 45.0 * act_overheat) * act_overheat * synergy_thermal

        if act_injector > 0.0:
            perturbed["egt"] += (55.0 + 35.0 * act_injector) * act_injector

        if act_misfire > 0.0:
            perturbed["egt"] -= (50.0 + 30.0 * act_misfire) * act_misfire

        if act_comb_inst > 0.0:
            perturbed["egt"] += math.sin(self._osc_phase + 0.8) * 45.0 * act_comb_inst

        if act_catastrophic > 0.0:
            perturbed["egt"] += 115.0 * act_catastrophic

        # Parameter: Oil Pressure
        if act_lube > 0.0:
            p_drop_psi = (32.0 + 16.0 * act_lube) * act_lube
            perturbed["oil_pressure"] = max(8.0, perturbed["oil_pressure"] - p_drop_psi)

        if act_overheat > 0.0:
            perturbed["oil_pressure"] -= 4.5 * act_overheat

        if act_catastrophic > 0.0:
            perturbed["oil_pressure"] = max(5.0, perturbed["oil_pressure"] - 42.0 * act_catastrophic)

        # Parameter: Oil Temperature
        if act_lube > 0.0:
            perturbed["oil_temperature"] += (22.0 + 16.0 * act_lube) * act_lube * synergy_friction

        if act_overheat > 0.0:
            perturbed["oil_temperature"] += (18.0 + 12.0 * act_overheat) * act_overheat

        if act_coating > 0.0 or self._accumulated_wear["coating"] > 0.0:
            coat_factor = max(act_coating, self._accumulated_wear["coating"])
            perturbed["oil_temperature"] += 12.0 * coat_factor

        if act_catastrophic > 0.0:
            perturbed["oil_temperature"] += 32.0 * act_catastrophic

        # Parameter: Fuel Flow
        if act_injector > 0.0:
            perturbed["fuel_flow"] += (5.5 + 4.0 * act_injector) * act_injector

        if act_comb_inst > 0.0:
            perturbed["fuel_flow"] += math.sin(self._osc_phase * 1.5) * 2.5 * act_comb_inst

        if act_catastrophic > 0.0:
            perturbed["fuel_flow"] += 7.0 * act_catastrophic

        # Parameter: Vibration
        if act_vib > 0.0:
            perturbed["vibration"] += (0.95 + 0.65 * act_vib) * act_vib * synergy_mech

        if act_misfire > 0.0:
            perturbed["vibration"] += (0.65 + 0.40 * act_misfire) * act_misfire

        if act_lube > 0.0 or secondary_vib_triggered:
            eff_lube = max(act_lube, 0.5 if secondary_vib_triggered else 0.0)
            perturbed["vibration"] += (0.45 + 0.35 * eff_lube) * synergy_mech

        if act_coating > 0.0 or self._accumulated_wear["coating"] > 0.0:
            coat_factor = max(act_coating, self._accumulated_wear["coating"])
            perturbed["vibration"] += 0.35 * coat_factor

        if act_comb_inst > 0.0:
            perturbed["vibration"] += abs(math.sin(self._osc_phase)) * 0.45 * act_comb_inst

        if act_catastrophic > 0.0:
            perturbed["vibration"] += 1.45 * act_catastrophic

        # 6. SENSOR DRIFT TRANSDUCER MODIFICATION (Sensor only, not engine!)
        is_sensor_drift_active = (act_drift > 0.0)
        sensor_confidence = 100.0
        if is_sensor_drift_active:
            bias = 28.0 + 20.0 * act_drift
            perturbed["cht"] += bias
            sensor_confidence = max(10.0, 100.0 - bias * 1.8)
        self._sensor_confidence = sensor_confidence


        # 7. Wear Accumulation (Permanent Component Degradation)
        if act_coating > 0.0:
            self._accumulated_wear["coating"] = min(1.0, self._accumulated_wear["coating"] + 0.008 * act_coating * dt)

        if act_lube > 0.0:
            self._accumulated_wear["lubrication"] = min(1.0, self._accumulated_wear["lubrication"] + 0.012 * act_lube * dt)
            self._accumulated_wear["bearings"] = min(1.0, self._accumulated_wear["bearings"] + 0.012 * act_lube * dt)
            if act_lube > 0.4:
                self._accumulated_wear["mechanical"] = min(1.0, self._accumulated_wear["mechanical"] + 0.010 * act_lube * dt)


        if act_overheat > 0.0:
            self._accumulated_wear["cooling"] = min(1.0, self._accumulated_wear["cooling"] + 0.009 * act_overheat * dt)

        if act_injector > 0.0:
            self._accumulated_wear["injector"] = min(1.0, self._accumulated_wear["injector"] + 0.008 * act_injector * dt)

        if act_vib > 0.0 or act_misfire > 0.0:
            self._accumulated_wear["mechanical"] = min(1.0, self._accumulated_wear["mechanical"] + 0.007 * dt)

        if act_catastrophic > 0.0:
            for k in self._accumulated_wear:
                self._accumulated_wear[k] = min(1.0, self._accumulated_wear[k] + 0.025 * dt)

        # 8. Progressive Health Index Synthesis
        computed_health = self._compute_health(
            perturbed=perturbed,
            base=raw_base or {},
            is_sensor_only=is_sensor_drift_active,
            sensor_conf=sensor_confidence
        )

        # 9. Update Engine Condition State Machine
        prev_state = self._condition_state
        self._update_state_machine(computed_health, perturbed)

        # Log significant status transitions
        if self._condition_state != prev_state:
            self._log_timeline(f"Condition State changed: {prev_state.value} -> {self._condition_state.value}")

        prop_metrics = {
            "ticks": self._ticks,
            "condition_state": self._condition_state.value,
            "computed_health": round(computed_health, 2),
            "sensor_confidence": round(sensor_confidence, 2),
            "active_faults": list(self._active_faults.keys()),
            "cascaded_faults": list(self._cascaded_faults),
            "accumulated_wear": {k: round(v, 4) for k, v in self._accumulated_wear.items()},
            "synergies": {
                "thermal": round(synergy_thermal, 2),
                "mechanical": round(synergy_mech, 2),
                "friction": round(synergy_friction, 2)
            }
        }

        return perturbed, prop_metrics

    # =========================================================================
    # Internal Helpers
    # =========================================================================

    def _get_intensity(self, fault_id: str) -> float:
        """Returns dynamic intensity [0.0 to 1.0] of an active fault."""
        return self._active_faults.get(fault_id, {}).get("intensity", 0.0)

    def _compute_health(
        self,
        perturbed: Dict[str, float],
        base: Optional[Dict[str, float]],
        is_sensor_only: bool,
        sensor_conf: float
    ) -> float:
        """
        Synthesizes deterministic Health Index (0-100) from resulting physical deviations,
        accumulated wear, and sensor confidence.
        """
        base = base or {}
        if is_sensor_only and len(self._active_faults) == 1:
            wear_penalty = sum(self._accumulated_wear.values()) * 5.0
            health = max(88.0, 96.0 - wear_penalty - (100.0 - sensor_conf) * 0.08)
            return min(100.0, health)

        # 1. Subsystem physical deviations
        cht_diff = max(0.0, perturbed.get("cht", 142.0) - base.get("cht", 142.0))
        egt_diff = max(0.0, perturbed.get("egt", 615.0) - base.get("egt", 615.0))
        oil_t_diff = max(0.0, perturbed.get("oil_temperature", 92.0) - base.get("oil_temperature", 92.0))
        thermal_penalty = (cht_diff / 50.0) * 16.0 + (egt_diff / 120.0) * 12.0 + (oil_t_diff / 30.0) * 12.0

        oil_p_drop = max(0.0, base.get("oil_pressure", 68.0) - perturbed.get("oil_pressure", 68.0))
        lube_penalty = (oil_p_drop / 35.0) * 35.0

        vib_diff = max(0.0, perturbed.get("vibration", 1.42) - base.get("vibration", 1.42))
        mech_penalty = (vib_diff / 1.5) * 25.0

        rpm_drop = max(0.0, base.get("rpm", 2450.0) - perturbed.get("rpm", 2450.0))
        comb_penalty = (rpm_drop / 600.0) * 25.0

        # 2. Accumulated permanent wear penalty
        wear_sum = sum(self._accumulated_wear.values())
        wear_penalty = wear_sum * 18.0

        total_penalty = thermal_penalty + lube_penalty + mech_penalty + comb_penalty + wear_penalty

        if len(self._active_faults) > 1:
            total_penalty *= (1.0 + 0.20 * (len(self._active_faults) - 1))

        health = max(0.0, 100.0 - total_penalty)
        return min(100.0, health)

    def _update_state_machine(self, health: float, perturbed: Dict[str, float]) -> None:
        """
        Transitions condition state machine based on actual engine health & critical redlines:
        NOMINAL -> MINOR_DEGRADATION -> DEGRADED -> SEVERE -> CRITICAL -> FAILURE
        """
        oil_p = perturbed.get("oil_pressure", 68.0)
        cht = perturbed.get("cht", 142.0)
        vib = perturbed.get("vibration", 1.42)
        active_count = len(self._active_faults)
        max_intensity = max([f["intensity"] for f in self._active_faults.values()], default=0.0)

        if (oil_p < 16.0 and vib > 2.8) or health < 15.0 or (cht > 230.0 and oil_p < 20.0):
            self._condition_state = EngineConditionState.FAILURE
        elif health < 30.0 or oil_p < 25.0 or cht > 200.0 or vib > 3.0 or (max_intensity >= 0.95 and active_count >= 2):
            self._condition_state = EngineConditionState.CRITICAL
        elif health < 55.0 or oil_p < 38.0 or cht > 175.0 or vib > 2.3 or active_count >= 3:
            self._condition_state = EngineConditionState.SEVERE
        elif health < 80.0 or active_count >= 2 or max_intensity >= 0.7:
            self._condition_state = EngineConditionState.DEGRADED
        elif health < 94.0 or active_count >= 1:
            self._condition_state = EngineConditionState.MINOR_DEGRADATION
        else:
            self._condition_state = EngineConditionState.NOMINAL

