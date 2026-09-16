"""
AeroTwin - Fault Propagation and Engine Degradation Test Suite
==============================================================
Verifies:
1. Single fault injection (all 8 canonical types)
2. Multi-fault simultaneous injection & cross-fault physical synergies
3. Time-based progressive degradation & secondary cascading faults
4. Sensor drift isolation (sensor confidence drops without false mechanical wear)
5. Engine Condition State Machine transitions (NOMINAL -> FAILURE)
6. Independent fault removal & persistent accumulated component wear
"""

import unittest
import math
from src.digital_twin.fault_propagation import (
    FaultPropagationEngine,
    EngineConditionState,
    FAULT_MISFIRE,
    FAULT_INJECTOR,
    FAULT_COATING,
    FAULT_LUBRICATION,
    FAULT_SENSOR_DRIFT,
    FAULT_COMBUSTION_INSTABILITY,
    FAULT_OVERHEATING,
    FAULT_VIBRATION,
    FAULT_ENGINE_FAILURE_MULTI,
)
from src.digital_twin.digital_twin_core import DigitalTwinCore
from src.unified_telemetry import TelemetryProcessor


class TestFaultPropagation(unittest.TestCase):
    def setUp(self):
        self.nominal_sensors = {
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
        self.engine = FaultPropagationEngine()

    def test_01_nominal_baseline(self):
        """Test nominal baseline produces expected parameters and NOMINAL state."""
        perturbed, metrics = self.engine.update(base_sensors=self.nominal_sensors, dt=1.0)
        self.assertEqual(metrics["condition_state"], EngineConditionState.NOMINAL.value)
        self.assertGreaterEqual(metrics["computed_health"], 95.0)
        self.assertEqual(metrics["sensor_confidence"], 100.0)
        self.assertEqual(len(metrics["active_faults"]), 0)

    def test_02_misfire_injection(self):
        """Test misfire causes RPM drop, vibration increase, and lower EGT."""
        self.engine.inject_fault(FAULT_MISFIRE, initial_intensity=0.8)
        perturbed, metrics = self.engine.update(base_sensors=self.nominal_sensors, dt=1.0)
        self.assertLess(perturbed["rpm"], self.nominal_sensors["rpm"] - 150)
        self.assertGreater(perturbed["vibration"], self.nominal_sensors["vibration"])
        self.assertLess(perturbed["egt"], self.nominal_sensors["egt"])
        self.assertIn(FAULT_MISFIRE, self.engine.get_active_fault_ids())

    def test_03_injector_abnormality(self):
        """Test injector abnormality causes higher fuel flow and elevated EGT."""
        self.engine.inject_fault(FAULT_INJECTOR, initial_intensity=0.8)
        perturbed, metrics = self.engine.update(base_sensors=self.nominal_sensors, dt=1.0)
        self.assertGreater(perturbed["fuel_flow"], self.nominal_sensors["fuel_flow"])
        self.assertGreater(perturbed["egt"], self.nominal_sensors["egt"])
        self.assertIn(FAULT_INJECTOR, self.engine.get_active_fault_ids())

    def test_04_coating_degradation(self):
        """Test coating degradation causes elevated CHT, oil temp, and accumulates wear."""
        self.engine.inject_fault(FAULT_COATING, initial_intensity=0.7)
        # Advance for 10 seconds to accumulate wear
        for _ in range(10):
            perturbed, metrics = self.engine.update(base_sensors=self.nominal_sensors, dt=1.0)
        self.assertGreater(perturbed["cht"], self.nominal_sensors["cht"])
        self.assertGreater(perturbed["oil_temperature"], self.nominal_sensors["oil_temperature"])
        wear = self.engine.get_accumulated_wear()
        self.assertGreater(wear["coating"], 0.0)

    def test_05_lubrication_issue(self):
        """Test lubrication issue causes oil pressure drop and oil temp rise."""
        self.engine.inject_fault(FAULT_LUBRICATION, initial_intensity=0.8)
        perturbed, metrics = self.engine.update(base_sensors=self.nominal_sensors, dt=1.0)
        self.assertLess(perturbed["oil_pressure"], self.nominal_sensors["oil_pressure"] - 20)
        self.assertGreater(perturbed["oil_temperature"], self.nominal_sensors["oil_temperature"] + 10)
        wear = self.engine.get_accumulated_wear()
        self.assertGreater(wear["bearings"], 0.0)

    def test_06_sensor_drift_isolation(self):
        """
        Critical Requirement: Sensor drift must bias CHT reading and lower sensor confidence,
        WITHOUT causing mechanical/bearing wear or thermal damage.
        """
        self.engine.inject_fault(FAULT_SENSOR_DRIFT, initial_intensity=0.9)
        for _ in range(15):
            perturbed, metrics = self.engine.update(base_sensors=self.nominal_sensors, dt=1.0)
        
        # Sensor reading biased upward
        self.assertGreater(perturbed["cht"], self.nominal_sensors["cht"] + 25)
        # Sensor confidence heavily penalized
        self.assertLess(metrics["sensor_confidence"], 70.0)
        # BUT no mechanical or bearing damage accumulated!
        wear = self.engine.get_accumulated_wear()
        self.assertEqual(wear["bearings"], 0.0)
        self.assertEqual(wear["coating"], 0.0)
        # Engine health remains relatively high because engine is physically intact
        self.assertGreaterEqual(metrics["computed_health"], 85.0)

    def test_07_combustion_instability(self):
        """Test combustion instability produces oscillating RPM and fuel flow."""
        self.engine.inject_fault(FAULT_COMBUSTION_INSTABILITY, initial_intensity=0.8)
        rpm_readings = []
        for _ in range(12):
            perturbed, _ = self.engine.update(base_sensors=self.nominal_sensors, dt=1.0)
            rpm_readings.append(perturbed["rpm"])
        
        # Verify oscillation by checking that standard deviation is notable
        mean_rpm = sum(rpm_readings) / len(rpm_readings)
        variance = sum((r - mean_rpm) ** 2 for r in rpm_readings) / len(rpm_readings)
        self.assertGreater(math.sqrt(variance), 20.0)

    def test_08_overheating_trend(self):
        """Test overheating produces progressive temperature increase over time."""
        self.engine.inject_fault(FAULT_OVERHEATING, initial_intensity=0.2)
        cht_progression = []
        for _ in range(8):
            perturbed, _ = self.engine.update(base_sensors=self.nominal_sensors, dt=1.0)
            cht_progression.append(perturbed["cht"])
        
        # Verify monotonically increasing trend as intensity ramps up
        self.assertGreater(cht_progression[-1], cht_progression[0] + 15)

    def test_09_abnormal_vibration(self):
        """Test abnormal vibration increases vibration sensor and mechanical wear."""
        self.engine.inject_fault(FAULT_VIBRATION, initial_intensity=0.8)
        for _ in range(5):
            perturbed, _ = self.engine.update(base_sensors=self.nominal_sensors, dt=1.0)
        self.assertGreater(perturbed["vibration"], self.nominal_sensors["vibration"] + 0.8)
        wear = self.engine.get_accumulated_wear()
        self.assertGreater(wear["mechanical"], 0.0)

    def test_10_multi_fault_thermal_synergy(self):
        """Test Injector + Overheating synergistically compounds thermal stress."""
        engine_single = FaultPropagationEngine()
        engine_single.inject_fault(FAULT_OVERHEATING, initial_intensity=0.7)
        pert_single, _ = engine_single.update(base_sensors=self.nominal_sensors, dt=1.0)

        engine_dual = FaultPropagationEngine()
        engine_dual.inject_fault(FAULT_OVERHEATING, initial_intensity=0.7)
        engine_dual.inject_fault(FAULT_INJECTOR, initial_intensity=0.7)
        pert_dual, metrics_dual = engine_dual.update(base_sensors=self.nominal_sensors, dt=1.0)

        # Thermal synergy multiplier > 1.0
        self.assertGreater(metrics_dual["synergies"]["thermal"], 1.0)
        # Compound CHT and EGT should exceed single fault
        self.assertGreater(pert_dual["cht"], pert_single["cht"])

    def test_11_multi_fault_mechanical_synergy(self):
        """Test Lubrication + Vibration synergistically accelerates mechanical degradation."""
        engine_dual = FaultPropagationEngine()
        engine_dual.inject_fault(FAULT_LUBRICATION, initial_intensity=0.8)
        engine_dual.inject_fault(FAULT_VIBRATION, initial_intensity=0.8)
        pert_dual, metrics_dual = engine_dual.update(base_sensors=self.nominal_sensors, dt=1.0)

        self.assertGreater(metrics_dual["synergies"]["mechanical"], 1.0)
        # Condition should be SEVERE or CRITICAL under dual mechanical stress
        self.assertIn(metrics_dual["condition_state"], [EngineConditionState.SEVERE.value, EngineConditionState.CRITICAL.value, EngineConditionState.FAILURE.value])

    def test_12_multi_fault_friction_synergy(self):
        """Test Coating + Lubrication triggers friction synergy."""
        engine_dual = FaultPropagationEngine()
        engine_dual.inject_fault(FAULT_COATING, initial_intensity=0.6)
        engine_dual.inject_fault(FAULT_LUBRICATION, initial_intensity=0.6)
        _, metrics_dual = engine_dual.update(base_sensors=self.nominal_sensors, dt=1.0)
        self.assertGreater(metrics_dual["synergies"]["friction"], 1.0)

    def test_13_secondary_fault_cascades(self):
        """Test that severe primary fault (Lubrication) spawns secondary vibration & thermal cascades."""
        self.engine.inject_fault(FAULT_LUBRICATION, initial_intensity=0.9)
        for _ in range(5):
            _, metrics = self.engine.update(base_sensors=self.nominal_sensors, dt=1.0)
        cascades = self.engine.get_cascaded_fault_ids()
        self.assertIn("secondary_vibration", cascades)
        self.assertIn("secondary_thermal", cascades)

    def test_14_fault_removal_wear_persistence(self):
        """
        Test that removing a driving fault removes active driving stress,
        but accumulated permanent wear remains (no instant snap to 100% health).
        """
        # Inject lubrication fault and run for 10 ticks to accumulate wear
        self.engine.inject_fault(FAULT_LUBRICATION, initial_intensity=0.9)
        for _ in range(10):
            self.engine.update(base_sensors=self.nominal_sensors, dt=1.0)
        
        wear_before = dict(self.engine.get_accumulated_wear())
        self.assertGreater(wear_before["bearings"], 0.0)

        # Remove the lubrication fault
        removed = self.engine.remove_fault(FAULT_LUBRICATION)
        self.assertTrue(removed)
        self.assertNotIn(FAULT_LUBRICATION, self.engine.get_active_fault_ids())

        # Update without driving fault
        _, metrics_after = self.engine.update(base_sensors=self.nominal_sensors, dt=1.0)
        wear_after = self.engine.get_accumulated_wear()
        
        # Wear must NOT disappear!
        self.assertGreater(wear_after["bearings"], 0.0)
        # Health must NOT instantly snap to 100%
        self.assertLess(metrics_after["computed_health"], 100.0)

    def test_15_engine_condition_state_machine(self):
        """Test engine condition state transitions across severity tiers."""
        engine = FaultPropagationEngine()
        
        # 1. NOMINAL
        _, m1 = engine.update(base_sensors=self.nominal_sensors, dt=1.0)
        self.assertEqual(m1["condition_state"], EngineConditionState.NOMINAL.value)

        # 2. Inject minor fault -> DEGRADED / MINOR_DEGRADATION
        engine.inject_fault(FAULT_INJECTOR, initial_intensity=0.5)
        for _ in range(3):
            _, m2 = engine.update(base_sensors=self.nominal_sensors, dt=1.0)
        self.assertIn(m2["condition_state"], [EngineConditionState.MINOR_DEGRADATION.value, EngineConditionState.DEGRADED.value])

        # 3. Inject catastrophic multi-fault -> CRITICAL / FAILURE
        engine.inject_fault(FAULT_ENGINE_FAILURE_MULTI, initial_intensity=1.0)
        for _ in range(5):
            _, m3 = engine.update(base_sensors=self.nominal_sensors, dt=1.0)
        self.assertIn(m3["condition_state"], [EngineConditionState.CRITICAL.value, EngineConditionState.FAILURE.value])


class TestTelemetryIntegration(unittest.TestCase):
    def test_telemetry_processor_multi_fault(self):
        """Test TelemetryProcessor integration with multi-fault simulation state."""
        tp = TelemetryProcessor()
        # Normal
        frame_norm = tp.process_tick(1, "Normal", {"active_faults": []})
        self.assertEqual(frame_norm["engine_condition"], "NOMINAL")
        self.assertGreaterEqual(frame_norm["health_index"], 95.0)

        # Multi-fault injection
        frame_multi = tp.process_tick(2, "Normal", {"active_faults": ["misfire", "lubrication"]})
        self.assertIn("misfire", frame_multi["active_faults"])
        self.assertIn("lubrication_issue", frame_multi["active_faults"])
        self.assertLess(frame_multi["health_index"], 90.0)

    def test_digital_twin_core_multi_fault(self):
        """Test DigitalTwinCore update with active_faults set."""
        dt = DigitalTwinCore()
        nominal = {
            "cht": 142.0,
            "egt": 615.0,
            "oil_pressure": 68.0,
            "oil_temperature": 92.0,
            "vibration": 1.42,
            "rpm": 2450.0,
        }
        res = dt.update(
            telemetry=nominal,
            dt=1.0,
            active_faults=["overheating_trend", "injector_abnormality"]
        )
        self.assertIn("overheating_trend", res["active_faults"])
        self.assertIn("injector_abnormality", res["active_faults"])
        self.assertIn("engine_condition", res)
        self.assertIn("accumulated_wear", res)

    def test_fault_progression_persistence_across_ticks(self):
        """Regression Test: Verify that repeating set_active_faults across ticks does NOT reset intensity or ticks_active to 0."""
        engine = FaultPropagationEngine()
        engine.inject_fault("Overheating")
        self.assertIn("overheating_trend", engine.get_active_fault_ids())

        # Tick 1
        _, m1 = engine.update(dt=1.0)
        t1 = engine._active_faults["overheating_trend"]["ticks_active"]
        i1 = engine._active_faults["overheating_trend"]["intensity"]
        self.assertGreater(t1, 0)
        self.assertGreater(i1, 0.0)

        # Tick 2 with set_active_faults containing the same fault
        engine.set_active_faults(["Overheating"])
        _, m2 = engine.update(dt=1.0)
        t2 = engine._active_faults["overheating_trend"]["ticks_active"]
        i2 = engine._active_faults["overheating_trend"]["intensity"]

        # Must have progressed further, NOT reset to 0!
        self.assertGreater(t2, t1)
        self.assertGreaterEqual(i2, i1)
        self.assertNotEqual(m2["condition_state"], "NOMINAL")

    def test_idempotent_inject_fault(self):
        """Test that injecting a fault multiple times does not reset its intensity or toggle it off."""
        engine = FaultPropagationEngine()
        engine.inject_fault("misfire")
        _, _ = engine.update(dt=1.0)
        first_ticks = engine._active_faults["misfire"]["ticks_active"]

        # Inject again
        engine.inject_fault("misfire")
        self.assertEqual(engine._active_faults["misfire"]["ticks_active"], first_ticks)
        self.assertIn("misfire", engine.get_active_fault_ids())


if __name__ == "__main__":
    unittest.main()
