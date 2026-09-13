# AeroTwin Subsystem Health Model & Degradation Framework

## Phase 2 Technical Architecture & Airworthiness Specification

> [!IMPORTANT]
> **SIH 2026 Engineering Notice**  
> This specification documents the **Subsystem Health Index & Engine Degradation Model** for the **AeroTwin** MALE UAV digital twin demonstrator. It calculates deterministic, explainable, multi-subsystem airworthiness health scores from physical telemetry, digital twin physics residuals, and component wear states.

---

## 1. Subsystem Health Definitions

The AeroTwin Digital Twin evaluates 6 core engine domains, producing normalized $0 - 100$ health indices:

| Subsystem | Scope & Monitored Equipment | Key Telemetry Signals & Residual Inputs |
| :--- | :--- | :--- |
| **Thermal Health** | Cylinder barrels, cylinder heads, exhaust manifolds, cooling baffles | CHT (`cht_c`), EGT (`egt_c`), Oil Temp (`oil_temperature_c`), CHT/EGT residuals, cooling degradation |
| **Combustion Health** | Fuel injectors, dual electronic ignition circuits, combustion chamber | RPM (`rpm`), Fuel Flow (`fuel_flow_lh`), EGT (`egt_c`), Injection Advance (`injection_timing_deg`), injector degradation |
| **Lubrication Health** | Engine oil pump, pressure relief valve, oil radiator, lubrication film | Oil Pressure (`oil_pressure_bar`), Oil Temp (`oil_temperature_c`), hydrodynamic residuals, lubrication degradation |
| **Mechanical Health** | Crankshaft, connecting rods, main bearings, propeller hub | Airframe vibration (`vibration_g`), rotational speed stability, mechanical degradation |
| **Electrical Health** | 28V DC generator/alternator, voltage regulator, starter battery | Bus voltage (`battery_voltage_v`), electrical degradation |
| **Sensor Health** | Thermocouples, piezoresistive pressure transducers, hall-effect sensors | Cross-sensor consistency, outlier divergence, ML sensor diagnosis confidence |

---

## 2. Health Calculation Methodology

Health scoring uses a deterministic penalty-based approach balancing:
1. **Actual Operating Envelope** (proximity to absolute caution/redline limits).
2. **Physics Residuals** (deviation of actual telemetry from expected digital twin state: $z = (x_{act} - x_{exp}) / \sigma$).
3. **Subsystem Physical Degradation** (accumulated wear $[0.0, 1.0]$).

### 2.1 Progressive Penalty Transfer Function
For any normalized residual $z$, the progressive penalty function $\mathcal{P}(z)$ is defined as:

$$\mathcal{P}(z) = K_{linear} \cdot \max(0.0, |z| - z_{deadband}) + K_{prog} \cdot \left(\max(0.0, |z| - z_{deadband})\right)^{1.75}$$

Where $z_{deadband} = 0.5\sigma$, allowing standard instrument noise without health penalties.

### 2.2 Subsystem Formulas

#### Thermal Health ($H_{thermal}$)
$$H_{thermal} = 0.40 \cdot \mathcal{S}(z_{cht}) + 0.35 \cdot \mathcal{S}(z_{egt}) + 0.25 \cdot \mathcal{S}(z_{oilt}) - \Delta_{redline} - (D_{cooling} \times 30.0)$$
*If an isolated CHT spike is detected without correlated EGT/Oil Temp increases, sensor-fault isolation dampening is applied.*

#### Combustion Health ($H_{combustion}$)
$$H_{combustion} = 0.35 \cdot \mathcal{S}(z_{rpm}) + 0.25 \cdot \mathcal{S}(z_{fuel}) + 0.25 \cdot \mathcal{S}(z_{egt}) + 0.15 \cdot \mathcal{S}(z_{timing}) - \Delta_{misfire} - (D_{injector} \times 35.0)$$

#### Lubrication Health ($H_{lubrication}$)
$$H_{lubrication} = 0.65 \cdot \mathcal{S}(z_{oilp}) + 0.35 \cdot \mathcal{S}(z_{oilt}) - \Delta_{low\_pressure} - (D_{lubrication} \times 35.0)$$
*Low oil pressure receives quadratic penalties due to catastrophic bearing seizure risks.*

#### Mechanical Health ($H_{mechanical}$)
$$H_{mechanical} = 0.75 \cdot \mathcal{S}(z_{vib}) + 0.25 \cdot \mathcal{S}(z_{rpm}) - \Delta_{high\_vib} - (D_{mechanical} \times 35.0)$$

#### Electrical Health ($H_{electrical}$)
$$H_{electrical} = \mathcal{S}(z_{volt}) - \Delta_{undervoltage} - (D_{electrical} \times 35.0)$$

#### Sensor Health ($H_{sensor}$)
$$H_{sensor} = 100.0 - (\text{Outlier Divergence} \times 16.0) - (\text{Sensor Diagnosis Confidence} \times 40.0) - (D_{sensors} \times 40.0)$$

All health indices are strictly clamped: $0.0 \le H \le 100.0$.

---

## 3. Overall Health Index & Status Classification

The Overall Health Index is synthesized as a configurable weighted linear combination:

$$H_{overall} = \sum_{i} w_i \cdot H_i$$

### Default Configurable Weights
- **Thermal**: 20% ($0.20$)
- **Combustion**: 20% ($0.20$)
- **Lubrication**: 20% ($0.20$)
- **Mechanical**: 20% ($0.20$)
- **Electrical**: 10% ($0.10$)
- **Sensor**: 10% ($0.10$)

### Airworthiness Health Status Boundaries

| Score Range | Status Classification | Operational Meaning | Recommended Action |
| :--- | :--- | :--- | :--- |
| **90.0 – 100.0** | `HEALTHY` | All systems operating at or near nominal cruise baselines | Continue standard flight profile |
| **75.0 – 89.9** | `NORMAL / MONITORED` | Mild telemetry variance or initial wear accumulation | Monitor trend parameters on GCS |
| **50.0 – 74.9** | `DEGRADED` | Significant subsystem distress or progressive component fouling | Restrict continuous engine power; plan recovery |
| **25.0 – 49.9** | `CRITICAL` | Severe subsystem degradation (e.g. low oil pressure, high vibration) | Reduce throttle; divert to nearest alternate airfield |
| **0.0 – 24.9** | `SEVERE` | Correlated multi-system failure or catastrophic loss of function | Execute forced landing emergency checklist |

---

## 4. Subsystem Degradation & Fault Mapping

Degradation $D \in [0.0, 1.0]$ tracks long-term component wear and synchronizes with simulated scenarios:

```
FAULT INJECTION SCENARIOS               PHYSICAL DEGRADATION DOMAIN
Overheating               ─────────►    Cooling (0.65), Lubrication (0.20)
Injector_Degradation      ─────────►    Injector (0.55)
Lubrication / Oil Loss    ─────────►    Lubrication (0.70 - 0.80), Mechanical (0.25 - 0.35)
Vibration_Fault           ─────────►    Mechanical (0.60)
Sensor_Drift / Fault      ─────────►    Sensors (0.45 - 0.60)
Misfire                   ─────────►    Injector (0.35), Mechanical (0.30)
Engine_Failure_Multi      ─────────►    Cooling (0.70), Lubrication (0.75), Mechanical (0.65), Injector (0.60)
```

### Progressive Wear Response
Degradation states accumulate smoothly over time:
- Incremental increases ($20\% \to 40\% \to 60\% \to 80\%$) produce monotonic, progressive drops in health scores.
- Avoids step-function cliffs, providing actionable prognostics and predictive lead times for ground operators.

---

## 5. Sensor Fault Isolation vs. Engine Failure

A paramount feature of the Phase 2 framework is the ability to distinguish:
- **Sensor Failure**: A single instrument channel diverges (e.g., CHT thermocouple open-circuit reading $245^\circ\text{C}$), while cross-sensor correlation remains healthy (EGT, Oil Temp, and RPM are nominal).
  - Result: **Sensor Health** drops to alert maintenance of instrument failure.
  - Thermal health is protected by sensor discordance dampening.
  - **Mechanical, Combustion, and Lubrication Health remain at 100%**, preventing false in-flight aborts.
- **Genuine Engine Failure**: Multiple coupled physical parameters diverge simultaneously (e.g. CHT $+50^\circ\text{C}$, EGT $+105^\circ\text{C}$, Oil Temp $+30^\circ\text{C}$).
  - Result: **Thermal Health** drops to $\sim 20\%$, triggering an immediate thermal alert.

---

## 6. Health Trend & Rapid Degradation Detection

To support predictive prognostics, the Digital Twin Core tracks rolling history and calculates dynamic trend metrics:
- **`overall_delta`**: Single-tick change in Overall Health ($\Delta H = H_t - H_{t-1}$).
- **`degradation_rate`**: Moving rate of change over the rolling window (health points per tick).
- **`rapid_degradation`**: Boolean flag set to `True` whenever single-tick health drop $\Delta H \le -3.0$.
- **Warning Directive**: Generates an explicit `RAPID HEALTH DEGRADATION` banner to alert flight controllers of imminent subsystem collapse.
- **Rolling Buffer**: Maintained via a bounded `collections.deque(maxlen=60)` to prevent memory leaks during long-duration ISR missions.

---

## 7. Assumptions & Limitations

1. **Surrogate Approximation**: The engine model is a lumped-parameter physics surrogate calibrated around nominal Rotax 914/915 cruise (2,450 RPM, 75% throttle, 15,000 ft).
2. **Electrical Signals**: Avionics telemetry currently provides bus voltage; alternator current and battery state of charge (SoC) will be integrated in future phases when hardware shunt sensors are installed.
3. **Test-Rig Calibration**: Sensitivity coefficients ($K_{linear}, K_{prog}$) can be calibrated against dynamometer test-cell data by performing least-squares minimization on measured vs expected residual distributions.
