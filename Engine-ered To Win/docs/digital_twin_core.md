# AeroTwin Digital Twin Core Framework

## Technical Architecture & Engineering Documentation

> [!IMPORTANT]
> **SIH 2026 Prototype Notice & System Boundaries**  
> The AeroTwin Digital Twin Core Framework is a **simplified, representative physics-informed surrogate model** engineered for real-time telemetry synchronization, residual state estimation, and health diagnostics demonstration. It is **NOT** a certified engine control unit (ECU), flight-control law model, or full computational fluid dynamics (CFD) / 3D conjugate heat transfer simulation.

---

## 1. System Architecture

The Digital Twin layer operates underneath the existing AeroTwin Ground Control Station (GCS) telemetry server, providing expected physical behaviors against which live incoming sensor data is compared.

```
+-------------------------------------------------------------------------------+
|                             ACTUAL ENGINE TELEMETRY                           |
|       (RPM, CHT, EGT, Oil P, Oil Temp, Fuel Flow, Vib, Bus V, Injection Deg)  |
+-------------------------------------------------------------------------------+
                                        │
                                        ▼
+-------------------------------------------------------------------------------+
|                       DIGITAL TWIN CORE ORCHESTRATOR                          |
|                                                                               |
|  1. DEGRADATION MODEL (src/digital_twin/degradation_model.py)                 |
|     Tracks subsystem wear: injector, lubrication, cooling, mechanical,        |
|     electrical, and sensors on a normalized [0.0, 1.0] scale.                 |
|                                                                               |
|  2. PHYSICS-INFORMED ENGINE MODEL (src/digital_twin/engine_model.py)          |
|     ISA atmosphere & thermodynamic/aerodynamic surrogate relationships        |
|     Inputs: Throttle, Altitude, Ambient Temp, Degradation                     |
|     Outputs: Expected states for all 9 telemetry channels                     |
|                                                                               |
|  3. STATE ESTIMATOR (src/digital_twin/state_estimator.py)                     |
|     Calculates parameter residuals:                                           |
|       - Absolute Residual: Delta = Actual - Expected                          |
|       - Normalized Residual: z = Delta / Sigma_scale                          |
|       - Percentage Deviation: % = 100 * (Delta / Expected)                    |
|                                                                               |
|  4. SUBSYSTEM HEALTH CALCULATOR (src/digital_twin/health_index.py)            |
|     Computes 0-100 health indices for 6 key domains:                          |
|     Thermal, Combustion, Lubrication, Mechanical, Electrical, Sensor          |
|                                                                               |
|  5. OVERALL HEALTH INDEX                                                      |
|     Configurable weighted airworthiness score:                                |
|     Thermal (20%), Combustion (20%), Lubrication (20%), Mechanical (20%),     |
|     Electrical (10%), Sensor (10%)                                            |
+-------------------------------------------------------------------------------+
                                        │
                                        ▼
+-------------------------------------------------------------------------------+
|                           INTEGRATED TELEMETRY PACKET                         |
|  - "digital_twin": { expected, residuals, degradation, subsystem_health, ... }|
|  - Isolation Forest Anomaly Detection Score                                   |
|  - Cross-Sensor Diagnosis Engine (Sensor Fault vs Engine Failure)            |
|  - RUL LSTM Prognostics                                                       |
|  - WebSocket Streaming (/ws/telemetry) -> GCS Next.js Dashboard               |
+-------------------------------------------------------------------------------+
```

---

## 2. Engine Model Physics & Assumptions

The virtual engine represents a typical medium-altitude long-endurance (MALE) UAV piston powerplant (e.g. turbocharged 4-stroke 4-cylinder aircraft engine such as the Rotax 914 / 915 iS series).

### 2.1 Atmospheric Model (ISA Troposphere)
Ambient air density ratio $\sigma(h) = \frac{\rho(h)}{\rho_0}$ is computed using the standard International Standard Atmosphere (ISA) barometric formula:

$$\sigma(h) = \left( 1 - 2.25577 \times 10^{-5} \cdot h_m \right)^{4.25588}$$

Where:
- $h_m = h_{ft} \times 0.3048$ (altitude converted to meters)
- Relative density deficit relative to nominal cruise (15,000 ft) is:

$$\Delta\sigma_{rel} = \max\left(0.0, 1.0 - \frac{\sigma(h)}{\sigma(15000)}\right)$$

### 2.2 Governed Rotational Speed (RPM)
Constant-speed governor models maintain cruise RPM around 2,450 RPM at 75% throttle, with proportional load response outside the governor deadband:

$$RPM_{exp} = RPM_{ref} + K_{rpm\_throttle} \cdot (\delta_{throttle} - 75.0)$$

Where $K_{rpm\_throttle} = 12.0\text{ RPM}/\%$.

### 2.3 Combustion & Fuel Consumption
Brake specific fuel consumption (BSFC) and fuel delivery scale with throttle load and volumetric efficiency:

$$\dot{m}_{f,exp} = \dot{m}_{f,ref} + K_{ff\_throttle} \cdot (\delta_{throttle} - 75.0)$$

Where $K_{ff\_throttle} = 0.28\text{ L/h}/\%$.

### 2.4 Thermal Balances (CHT, EGT, Oil Temperature)
- **Exhaust Gas Temperature (EGT)**: Reflects combustion heat release and air-fuel ratio:
  $$EGT_{exp} = EGT_{ref} + K_{egt\_th} \cdot \Delta\delta_{th} + K_{egt\_amb} \cdot \Delta T_{amb} + K_{egt\_alt} \cdot \Delta\sigma_{rel}$$
- **Cylinder Head Temperature (CHT)**: Balances heat generation from cylinder combustion against ram-air convective heat rejection ($\dot{Q}_{cool} \propto \rho \cdot v$):
  $$CHT_{exp} = CHT_{ref} + K_{cht\_th} \cdot \Delta\delta_{th} + K_{cht\_amb} \cdot \Delta T_{amb} + K_{cht\_alt} \cdot \Delta\sigma_{rel}$$
- **Oil Temperature**:
  $$T_{oil,exp} = T_{oil,ref} + K_{oilt\_th} \cdot \Delta\delta_{th} + K_{oilt\_amb} \cdot \Delta T_{amb} + K_{oilt\_alt} \cdot \Delta\sigma_{rel}$$

### 2.5 Lubrication Hydraulics (Oil Pressure)
Oil pressure is governed by engine-driven positive-displacement pump displacement (increasing with RPM) and kinematic viscosity (decreasing with higher oil temperature):

$$P_{oil,exp} = P_{oil,ref} + K_{oilp\_rpm} \cdot (RPM_{exp} - RPM_{ref}) + K_{oilp\_temp} \cdot (T_{oil,exp} - T_{oil,ref})$$

Where:
- $K_{oilp\_rpm} = +0.0015\text{ bar/RPM}$
- $K_{oilp\_temp} = -0.018\text{ bar/}^\circ\text{C}$

### 2.6 Mechanical Vibration & Rotational Harmonics
Dynamic rotational unbalance scales quadratically with rotational speed:

$$Vib_{exp} = Vib_{ref} \cdot \left(\frac{RPM_{exp}}{RPM_{ref}}\right)^{1.8}$$

### 2.7 Electrical DC Bus
Alternator voltage regulator maintains a steady $27.6\text{ V}$ bus above cut-in speed ($1,600\text{ RPM}$).

---

## 3. Residual Calculation & State Estimation

For each monitored parameter $i$:

$$\text{Residual}_i = x_{actual,i} - x_{expected,i}$$

$$\text{Normalized Residual}_i = \frac{\text{Residual}_i}{\text{Tolerance}_i}$$

$$\text{Percentage Deviation}_i = \frac{\text{Residual}_i}{x_{expected,i}} \times 100\%$$

### Standard Scale Tolerances

| Parameter | Symbol | Nominal Baseline | Normalization Tolerance ($\sigma$) | Unit |
| :--- | :--- | :--- | :--- | :--- |
| **Rotational Speed** | `rpm` | 2,450.0 | 100.0 | RPM |
| **Cylinder Head Temp** | `cht_c` | 142.0 | 8.333 | °C |
| **Exhaust Gas Temp** | `egt_c` | 615.0 | 25.0 | °C |
| **Oil Pressure** | `oil_pressure_bar` | 4.69 | 0.50 | bar |
| **Oil Temperature** | `oil_temperature_c` | 92.0 | 6.0 | °C |
| **Fuel Flow** | `fuel_flow_lh` | 17.6 | 1.50 | L/h |
| **Vibration** | `vibration_g` | 1.42 | 0.25 | g |
| **Battery Voltage** | `battery_voltage_v` | 27.6 | 0.80 | V |
| **Injection Timing** | `injection_timing_deg`| 23.4 | 1.50 | °CA |

---

## 4. Degradation Model

Physical degradation is modeled continuously across 6 domains on a normalized $[0.0, 1.0]$ scale:
- `injector`
- `lubrication`
- `cooling`
- `mechanical`
- `electrical`
- `sensors`

### Stress-Accelerated Degradation
Degradation updates smoothly over operational time $dt$ with stress multipliers:
- **Thermal Stress**: Activated when CHT $> 165^\circ\text{C}$ or EGT $> 680^\circ\text{C}$.
- **Lubrication Breakdown**: Activated when Oil Temp $> 105^\circ\text{C}$ or Oil Pressure $< 3.45\text{ bar}$ ($50\text{ psi}$).
- **Mechanical Fatigue**: Activated when Vibration $> 2.10\text{ g}$.
- **Electrical Stress**: Activated during undervoltage ($< 25.0\text{ V}$) or overvoltage ($> 29.5\text{ V}$).

---

## 5. Subsystem Health Indices & Sensor Fault Isolation

Each subsystem produces an airworthiness health score from $0$ to $100$:

$$\text{Health}_{subsystem} = \text{Score}(\mathbf{z}_{residuals}) - (\text{Degradation} \times W_{deg})$$

### Sensor-Fault Isolation Distinction
A critical requirement in UAV predictive maintenance is distinguishing **sensor hardware failure** from **genuine engine degradation**:
- If a single sensor (such as CHT) diverges by $+10\sigma$ while all correlated thermodynamic sensors (EGT, Oil Temp, Fuel Flow) remain nominal:
  - Cross-sensor consistency is violated.
  - **Sensor Health** drops to alert the operator of instrumentation failure.
  - **Combustion, Mechanical, and Lubrication Health** remain high ($> 90\%$), preventing premature engine shutdown or emergency forced landing directives.

### Overall Health Index Synthesis
Weighted aggregation with default configurable proportions:

$$\text{Overall Health} = 0.20 \cdot H_{thermal} + 0.20 \cdot H_{combustion} + 0.20 \cdot H_{lubrication} + 0.20 \cdot H_{mechanical} + 0.10 \cdot H_{electrical} + 0.10 \cdot H_{sensor}$$

All values are clamped to $[0.0, 100.0]$.

---

## 6. Real-World Engine Test-Rig Calibration Pathway

When transitioning from the SIH 2026 demonstrator to a physical UAV engine test rig or dyno test cell:
1. **Parameter Identification**: Fit `ENGINE_CONFIG` sensitivity gradients using steady-state multi-point dyno mapping (RPM sweep, manifold pressure sweep, ambient temperature chamber tests).
2. **Dynamic Time Constants**: Replace the static equilibrium surrogate with first-order lag filter transfer functions:
   $$\tau_{thermal} \frac{dT}{dt} + T = T_{ss}(throttle, alt, T_{amb})$$
   (Typical CHT thermal time constant $\tau \approx 25-45\text{ s}$; EGT time constant $\tau \approx 1.5-3\text{ s}$).
3. **CAN Bus Integration**: Direct binding to UAV CANAerospace / ArduPilot / PX4 MAVLink telemetry streams for real-time edge processing.
