"use client";

import React, { useState } from "react";
import { getSensorStatus, getStatusColor } from "@/lib/limits";
import { UnifiedTelemetryPayload } from "@/types/telemetry";

interface AirframeSchematicProps {
  payload: UnifiedTelemetryPayload;
  viewMode: "full" | "engine" | "thermal";
  focusedComponent?: string | null;
  onSelectComponent: (componentKey: string) => void;
}

export default function AirframeSchematic({
  payload,
  viewMode,
  focusedComponent,
  onSelectComponent,
}: AirframeSchematicProps) {
  const [hoveredPart, setHoveredPart] = useState<{
    id: string;
    name: string;
    status: string;
    valStr: string;
    desc: string;
  } | null>(null);

  // Sensor values from payload with graceful certified defaults
  const rpm = payload.sensors?.rpm?.value ?? payload.rpm ?? 2450;
  const cht = payload.sensors?.cht?.value ?? payload.cht_c ?? 142.0;
  const egt = payload.sensors?.egt?.value ?? payload.egt_c ?? 615.0;
  const oilP = payload.sensors?.oil_pressure?.value ?? (payload.oil_pressure_bar ? payload.oil_pressure_bar * 14.5038 : 68.0);
  const oilT = payload.sensors?.oil_temperature?.value ?? payload.oil_temperature_c ?? 92.0;
  const fuel = payload.sensors?.fuel_flow?.value ?? payload.fuel_flow_lh ?? 17.6;
  const vib = payload.sensors?.vibration?.value ?? payload.vibration_g ?? 1.42;
  const busVoltage = payload.sensors?.bus_voltage?.value ?? payload.battery_voltage_v ?? 28.2;
  const injTiming = payload.sensors?.injection_timing?.value ?? payload.injection_timing_deg ?? 14.5;

  // Derive status from limits.ts
  const rpmStatus = getSensorStatus("rpm", rpm);
  const chtStatus = getSensorStatus("cht", cht);
  const egtStatus = getSensorStatus("egt", egt);
  const oilPStatus = getSensorStatus("oil_pressure", oilP);
  const oilTStatus = getSensorStatus("oil_temperature", oilT);
  const fuelStatus = getSensorStatus("fuel_flow", fuel);
  const vibStatus = getSensorStatus("vibration", vib);
  const busVoltageStatus = getSensorStatus("bus_voltage", busVoltage);
  const injTimingStatus = getSensorStatus("injection_timing", injTiming);

  // Overall oil system status
  const oilStatus =
    oilPStatus === "ALERT" || oilTStatus === "ALERT"
      ? "ALERT"
      : oilPStatus === "CAUTION" || oilTStatus === "CAUTION"
      ? "CAUTION"
      : "NORMAL";

  // Status colors
  const rpmColor = getStatusColor(rpmStatus);
  const chtColor = getStatusColor(chtStatus);
  const egtColor = getStatusColor(egtStatus);
  const oilColor = getStatusColor(oilStatus);
  const fuelColor = getStatusColor(fuelStatus);
  const vibColor = getStatusColor(vibStatus);
  const busVoltageColor = getStatusColor(busVoltageStatus);
  const injTimingColor = getStatusColor(injTimingStatus);

  // Pusher prop spin duration
  const spinDuration = Math.max(0.06, 60 / Math.max(rpm, 800));

  // Transform for view modes
  let svgTransform = "scale(1) translate(0, 0)";
  if (viewMode === "engine") {
    svgTransform = "scale(2.35) translate(-270px, -15px)";
  } else if (viewMode === "thermal") {
    svgTransform = "scale(1.4) translate(-90px, 0)";
  }

  return (
    <div
      className="airframe-schematic-wrapper"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Interactive Tooltip HUD Overlay */}
      {hoveredPart && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "12px",
            background: "rgba(9, 14, 28, 0.96)",
            border: `1px solid ${getStatusColor(hoveredPart.status)}`,
            borderRadius: "6px",
            padding: "0.45rem 0.75rem",
            fontSize: "0.7rem",
            fontFamily: "'JetBrains Mono', monospace",
            zIndex: 40,
            pointerEvents: "none",
            boxShadow: `0 4px 20px rgba(0,0,0,0.6), 0 0 12px ${getStatusColor(hoveredPart.status)}33`,
            maxWidth: "260px",
          }}
        >
          <div style={{ fontWeight: 800, color: "#f8fafc", fontSize: "0.72rem" }}>
            {hoveredPart.name}
          </div>
          <div
            style={{
              color: getStatusColor(hoveredPart.status),
              fontWeight: 800,
              marginTop: "0.15rem",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>[{hoveredPart.status}]</span>
            <span>{hoveredPart.valStr}</span>
          </div>
          <div style={{ fontSize: "0.62rem", color: "#94a3b8", marginTop: "0.2rem", lineHeight: 1.3 }}>
            {hoveredPart.desc}
          </div>
          <div style={{ fontSize: "0.58rem", color: "var(--accent-cyan)", marginTop: "0.25rem", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "0.2rem" }}>
            Click to isolate sensor across GCS
          </div>
        </div>
      )}

      <svg
        viewBox="0 0 760 360"
        style={{
          width: "100%",
          height: "100%",
          maxHeight: "360px",
          transform: svgTransform,
          transition: "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
          overflow: "visible",
        }}
        aria-label="MALE UAV Digital Twin Propulsion Schematic"
      >
        <defs>
          {/* Fuselage composite surface gradient */}
          <linearGradient id="fuselageBodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0a1224" />
            <stop offset="15%" stopColor="#131e36" />
            <stop offset="50%" stopColor="#1e2c4a" />
            <stop offset="85%" stopColor="#131e36" />
            <stop offset="100%" stopColor="#0a1224" />
          </linearGradient>

          {/* Wing carbon-fiber aerofoil gradient */}
          <linearGradient id="wingSurfaceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#080e1c" />
            <stop offset="45%" stopColor="#15223c" />
            <stop offset="55%" stopColor="#1a2b4c" />
            <stop offset="100%" stopColor="#080e1c" />
          </linearGradient>

          {/* Engine nacelle metallic gradient */}
          <linearGradient id="engineNacelleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* FLIR Thermal Heatmap Radial Gradients */}
          <radialGradient id="thermalCylinderHeat" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
            <stop offset="40%" stopColor="#f97316" stopOpacity="0.65" />
            <stop offset="75%" stopColor="#eab308" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="thermalExhaustHeat" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#ea580c" stopOpacity="0.7" />
            <stop offset="80%" stopColor="#f59e0b" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </radialGradient>

          {/* Glow filter for active sensors */}
          <filter id="hud-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ==================================================================== */}
        {/* 1. MALE UAV AERODYNAMIC AIRFRAME (Dorsal / Top-Down CAD Wireframe)   */}
        {/* ==================================================================== */}

        {/* High-Aspect-Ratio Slender Glider Wings (16m–20m Class Wingspan) */}
        <g id="uav-wings">
          {/* Port (Upper) Wing */}
          <polygon
            points="270,154 286,28 316,25 328,154"
            fill="url(#wingSurfaceGrad)"
            stroke="rgba(56, 189, 248, 0.4)"
            strokeWidth="1.2"
          />
          {/* Port Upswept Winglet */}
          <polygon
            points="286,28 290,14 312,16 316,25"
            fill="#0f1b33"
            stroke="rgba(56, 189, 248, 0.5)"
            strokeWidth="1.2"
          />
          {/* Port Navigation Strobe Light (Red) */}
          <circle cx="288" cy="18" r="2.5" fill="#ef4444" filter="url(#hud-glow)" />

          {/* Port Inboard Fowler Flap */}
          <line x1="316" y1="154" x2="319" y2="92" stroke="rgba(56, 189, 248, 0.3)" strokeDasharray="3,2" />
          {/* Port Outboard Aileron */}
          <line x1="319" y1="92" x2="317" y2="30" stroke="rgba(56, 189, 248, 0.3)" strokeDasharray="3,2" />
          {/* Port Underwing Weapons/Sensor Pylon */}
          <rect x="296" y="86" width="16" height="5" rx="1.5" fill="#0b1324" stroke="rgba(56, 189, 248, 0.35)" />

          {/* Starboard (Lower) Wing */}
          <polygon
            points="270,206 286,332 316,335 328,206"
            fill="url(#wingSurfaceGrad)"
            stroke="rgba(56, 189, 248, 0.4)"
            strokeWidth="1.2"
          />
          {/* Starboard Upswept Winglet */}
          <polygon
            points="286,332 290,346 312,344 316,335"
            fill="#0f1b33"
            stroke="rgba(56, 189, 248, 0.5)"
            strokeWidth="1.2"
          />
          {/* Starboard Navigation Strobe Light (Green) */}
          <circle cx="288" cy="342" r="2.5" fill="#10b981" filter="url(#hud-glow)" />

          {/* Starboard Inboard Fowler Flap */}
          <line x1="316" y1="206" x2="319" y2="268" stroke="rgba(56, 189, 248, 0.3)" strokeDasharray="3,2" />
          {/* Starboard Outboard Aileron */}
          <line x1="319" y1="268" x2="317" y2="330" stroke="rgba(56, 189, 248, 0.3)" strokeDasharray="3,2" />
          {/* Starboard Underwing Weapons/Sensor Pylon */}
          <rect x="296" y="269" width="16" height="5" rx="1.5" fill="#0b1324" stroke="rgba(56, 189, 248, 0.35)" />

          {/* Wing Main Structural Spar */}
          <line x1="298" y1="30" x2="298" y2="330" stroke="rgba(56, 189, 248, 0.18)" strokeDasharray="4,3" />
        </g>

        {/* Inverted V-Tail Empennage (Predator / Heron MALE configuration) */}
        <g id="uav-vtail">
          {/* Upper Inverted V-Stabilizer Fin */}
          <polygon
            points="480,166 558,102 574,105 528,172"
            fill="#0e172c"
            stroke="rgba(56, 189, 248, 0.4)"
            strokeWidth="1.2"
          />
          {/* Upper Ruddervator Control Surface */}
          <line x1="550" y1="104" x2="515" y2="171" stroke="rgba(56, 189, 248, 0.35)" strokeDasharray="3,2" />

          {/* Lower Inverted V-Stabilizer Fin */}
          <polygon
            points="480,194 558,258 574,255 528,188"
            fill="#0e172c"
            stroke="rgba(56, 189, 248, 0.4)"
            strokeWidth="1.2"
          />
          {/* Lower Ruddervator Control Surface */}
          <line x1="550" y1="256" x2="515" y2="189" stroke="rgba(56, 189, 248, 0.35)" strokeDasharray="3,2" />
        </g>

        {/* Slender Aerodynamic Composite Fuselage */}
        <path
          d="M 75,180 C 75,160 98,152 145,152 L 265,153 L 278,149 L 335,142 L 470,146 L 540,172 L 565,176 L 565,184 L 540,188 L 470,214 L 335,218 L 278,211 L 265,207 L 145,208 C 98,208 75,200 75,180 Z"
          fill="url(#fuselageBodyGrad)"
          stroke="rgba(56, 189, 248, 0.6)"
          strokeWidth="1.4"
        />

        {/* Longitudinal Centerline Reference Axis */}
        <line x1="55" y1="180" x2="570" y2="180" stroke="rgba(56, 189, 248, 0.12)" strokeDasharray="6,4" />

        {/* Forward Pitot-Static Air Data Probe Needle */}
        <line x1="45" y1="180" x2="75" y2="180" stroke="#38bdf8" strokeWidth="1.6" />
        <circle cx="45" cy="180" r="1.5" fill="#38bdf8" />

        {/* Forward Chin EO/IR Gimbal Sensor Turret Ball (FLIR Camera) */}
        <g id="chin-flir-turret">
          <circle cx="112" cy="180" r="15" fill="#080e1a" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="1.2" />
          <circle cx="112" cy="180" r="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="0.8" />
          <circle cx="114" cy="178" r="3.5" fill="#0284c7" />
          <rect x="105" y="174" width="3" height="5" rx="1" fill="#f59e0b" />
        </g>

        {/* Forward SATCOM Radome Bay & Avionics Bus */}
        <g
          id="hotspot-avionics"
          className="schematic-hotspot"
          style={{ cursor: "pointer" }}
          onClick={() => onSelectComponent("bus_voltage")}
          onMouseEnter={() =>
            setHoveredPart({
              id: "bus_voltage",
              name: "Ku/Ka-Band SATCOM Radome & Avionics Bus",
              status: busVoltageStatus,
              valStr: `${busVoltage.toFixed(1)} V`,
              desc: "Dual-redundant flight management computers, INS/GPS navigation unit, and 28V DC bus.",
            })
          }
          onMouseLeave={() => setHoveredPart(null)}
        >
          <path
            d="M 80,180 C 80,165 98,158 135,158 L 145,158 L 145,202 L 135,202 C 98,202 80,195 80,180 Z"
            fill={focusedComponent === "bus_voltage" ? "rgba(56, 189, 248, 0.3)" : "rgba(15, 23, 42, 0.5)"}
            stroke={focusedComponent === "bus_voltage" ? "var(--accent-cyan)" : "rgba(56, 189, 248, 0.35)"}
            strokeWidth={focusedComponent === "bus_voltage" ? 2 : 1}
          />
          {/* Satellite Dish Icon Arc */}
          <path d="M 125,170 C 132,175 132,185 125,190" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="130" cy="180" r="2" fill={busVoltageColor} />
        </g>

        {/* Mid-Fuselage Main Fuel Bladder Cell & Fuel Feed Rail */}
        <g
          id="hotspot-fuel"
          className="schematic-hotspot"
          style={{ cursor: "pointer" }}
          onClick={() => onSelectComponent("fuel_flow")}
          onMouseEnter={() =>
            setHoveredPart({
              id: "fuel_flow",
              name: "Fuselage Fuel Cell & Injection Rail",
              status: fuelStatus,
              valStr: `${fuel.toFixed(1)} L/h`,
              desc: "Composite fuel cell with submerged boost pump feeding Rotax fuel distribution rail.",
            })
          }
          onMouseLeave={() => setHoveredPart(null)}
        >
          {/* Fuel Tank Outline */}
          <rect
            x="172"
            y="162"
            width="78"
            height="36"
            rx="4"
            fill={focusedComponent === "fuel_flow" ? "rgba(56, 189, 248, 0.25)" : "rgba(14, 28, 54, 0.6)"}
            stroke={fuelColor}
            strokeWidth={focusedComponent === "fuel_flow" ? 2 : 1.2}
            strokeDasharray="4,2"
          />
          {/* Fuel Internal Baffles */}
          <line x1="198" y1="164" x2="198" y2="196" stroke="rgba(56, 189, 248, 0.2)" />
          <line x1="224" y1="164" x2="224" y2="196" stroke="rgba(56, 189, 248, 0.2)" />
          {/* Fuel Feed Line with Transducer */}
          <path
            d="M 245,180 L 320,180 L 340,174"
            fill="none"
            stroke={fuelColor}
            strokeWidth={focusedComponent === "fuel_flow" ? 2.5 : 1.8}
          />
          <circle cx="282" cy="180" r="4" fill={fuelColor} filter="url(#hud-glow)" />
        </g>

        {/* Ram-Air Dorsal NACA Cooling Ducts */}
        <polygon points="305,145 325,148 325,152 305,149" fill="#070b14" stroke="rgba(56, 189, 248, 0.35)" />
        <polygon points="305,215 325,212 325,208 305,211" fill="#070b14" stroke="rgba(56, 189, 248, 0.35)" />

        {/* ==================================================================== */}
        {/* 2. ROTAX 914 F TURBOCHARGED BOXER-4 PROPULSION BAY (AFT NACELLE)     */}
        {/* ==================================================================== */}

        {/* Structural Engine Firewall */}
        <line x1="336" y1="145" x2="336" y2="215" stroke="#64748b" strokeWidth="2" strokeDasharray="3,2" />

        {/* Dynafocal Crankcase Shock Mounts & Vibration Accelerometer */}
        <g
          id="hotspot-vib"
          className="schematic-hotspot"
          style={{ cursor: "pointer" }}
          onClick={() => onSelectComponent("vibration")}
          onMouseEnter={() =>
            setHoveredPart({
              id: "vibration",
              name: "Crankcase Dynafocal Mounts & Accelerometer",
              status: vibStatus,
              valStr: `${vib.toFixed(2)} g RMS`,
              desc: "3-axis piezoresistive accelerometer detecting harmonic imbalances and detonation shock.",
            })
          }
          onMouseLeave={() => setHoveredPart(null)}
        >
          {/* Rubber Bushings */}
          <circle cx="340" cy="156" r="3.5" fill={vibColor} />
          <circle cx="340" cy="204" r="3.5" fill={vibColor} />
          <rect x="337" y="174" width="6" height="12" rx="1.5" fill={vibColor} filter="url(#hud-glow)" />
        </g>

        {/* Engine Crankcase Core */}
        <rect
          x="346"
          y="164"
          width="80"
          height="32"
          rx="3"
          fill="url(#engineNacelleGrad)"
          stroke="#475569"
          strokeWidth="1.2"
        />

        {/* 4 Horizontally Opposed Boxer Cylinder Heads (CHT SENSORS) */}
        <g
          id="hotspot-cht"
          className="schematic-hotspot"
          style={{ cursor: "pointer" }}
          onClick={() => onSelectComponent("cht")}
          onMouseEnter={() =>
            setHoveredPart({
              id: "cht",
              name: "Rotax 914 F Cylinder Head Thermocouples (CHT 1–4)",
              status: chtStatus,
              valStr: `${cht.toFixed(1)} °C`,
              desc: "Monitors cylinder head thermal saturation across boxer cylinders 1, 2, 3, and 4.",
            })
          }
          onMouseLeave={() => setHoveredPart(null)}
        >
          {/* Starboard (Top) Bank: Cyl 1 & Cyl 3 */}
          <g id="cyl-bank-starboard">
            {/* Cylinder 1 */}
            <rect
              x="358"
              y="144"
              width="28"
              height="18"
              rx="2"
              fill={focusedComponent === "cht" ? "rgba(56, 189, 248, 0.35)" : "rgba(30, 41, 59, 0.95)"}
              stroke={chtColor}
              strokeWidth={focusedComponent === "cht" ? 2 : 1.2}
            />
            {/* Finned cooling ribs */}
            <line x1="362" y1="141" x2="382" y2="141" stroke={chtColor} strokeWidth="1" />
            <line x1="362" y1="144" x2="382" y2="144" stroke={chtColor} strokeWidth="1" />
            {/* CHT Thermocouple Sensor Node 1 */}
            <circle cx="372" cy="142" r="3" fill={chtColor} filter="url(#hud-glow)" />

            {/* Cylinder 3 */}
            <rect
              x="396"
              y="144"
              width="28"
              height="18"
              rx="2"
              fill={focusedComponent === "cht" ? "rgba(56, 189, 248, 0.35)" : "rgba(30, 41, 59, 0.95)"}
              stroke={chtColor}
              strokeWidth={focusedComponent === "cht" ? 2 : 1.2}
            />
            <line x1="400" y1="141" x2="420" y2="141" stroke={chtColor} strokeWidth="1" />
            <line x1="400" y1="144" x2="420" y2="144" stroke={chtColor} strokeWidth="1" />
            {/* CHT Thermocouple Sensor Node 3 */}
            <circle cx="410" cy="142" r="3" fill={chtColor} filter="url(#hud-glow)" />
          </g>

          {/* Port (Bottom) Bank: Cyl 2 & Cyl 4 */}
          <g id="cyl-bank-port">
            {/* Cylinder 2 */}
            <rect
              x="358"
              y="198"
              width="28"
              height="18"
              rx="2"
              fill={focusedComponent === "cht" ? "rgba(56, 189, 248, 0.35)" : "rgba(30, 41, 59, 0.95)"}
              stroke={chtColor}
              strokeWidth={focusedComponent === "cht" ? 2 : 1.2}
            />
            <line x1="362" y1="216" x2="382" y2="216" stroke={chtColor} strokeWidth="1" />
            <line x1="362" y1="219" x2="382" y2="219" stroke={chtColor} strokeWidth="1" />
            {/* CHT Thermocouple Sensor Node 2 */}
            <circle cx="372" cy="218" r="3" fill={chtColor} filter="url(#hud-glow)" />

            {/* Cylinder 4 */}
            <rect
              x="396"
              y="198"
              width="28"
              height="18"
              rx="2"
              fill={focusedComponent === "cht" ? "rgba(56, 189, 248, 0.35)" : "rgba(30, 41, 59, 0.95)"}
              stroke={chtColor}
              strokeWidth={focusedComponent === "cht" ? 2 : 1.2}
            />
            <line x1="400" y1="216" x2="420" y2="216" stroke={chtColor} strokeWidth="1" />
            <line x1="400" y1="219" x2="420" y2="219" stroke={chtColor} strokeWidth="1" />
            {/* CHT Thermocouple Sensor Node 4 */}
            <circle cx="410" cy="218" r="3" fill={chtColor} filter="url(#hud-glow)" />
          </g>
        </g>

        {/* Stainless Steel Exhaust Collector Manifolds (EGT SENSORS) */}
        <g
          id="hotspot-egt"
          className="schematic-hotspot"
          style={{ cursor: "pointer" }}
          onClick={() => onSelectComponent("egt")}
          onMouseEnter={() =>
            setHoveredPart({
              id: "egt",
              name: "Exhaust Collector Headers & Thermocouples (EGT 1–4)",
              status: egtStatus,
              valStr: `${egt.toFixed(1)} °C`,
              desc: "Measures combustion flame temperature directly in the exhaust manifold runner ports.",
            })
          }
          onMouseLeave={() => setHoveredPart(null)}
        >
          {/* Exhaust Header Starboard Runner */}
          <path
            d="M 372,162 L 378,168 L 436,174"
            fill="none"
            stroke={egtColor}
            strokeWidth={focusedComponent === "egt" ? 2.8 : 2}
          />
          <path
            d="M 410,162 L 416,168 L 436,174"
            fill="none"
            stroke={egtColor}
            strokeWidth={focusedComponent === "egt" ? 2.8 : 2}
          />
          {/* Exhaust Header Port Runner */}
          <path
            d="M 372,198 L 378,192 L 436,186"
            fill="none"
            stroke={egtColor}
            strokeWidth={focusedComponent === "egt" ? 2.8 : 2}
          />
          <path
            d="M 410,198 L 416,192 L 436,186"
            fill="none"
            stroke={egtColor}
            strokeWidth={focusedComponent === "egt" ? 2.8 : 2}
          />
          {/* EGT Thermocouple Probes */}
          <circle cx="390" cy="170" r="3.5" fill={egtColor} filter="url(#hud-glow)" />
          <circle cx="390" cy="190" r="3.5" fill={egtColor} filter="url(#hud-glow)" />
        </g>

        {/* Turbocharger Unit, Wastegate & Injection Timing */}
        <g
          id="hotspot-turbo"
          className="schematic-hotspot"
          style={{ cursor: "pointer" }}
          onClick={() => onSelectComponent("injection_timing")}
          onMouseEnter={() =>
            setHoveredPart({
              id: "injection_timing",
              name: "Turbo Wastegate & ECU Injection Timing",
              status: injTimingStatus,
              valStr: `${injTiming.toFixed(1)}° BTDC`,
              desc: "Monitors ECU advance timing curves and high-altitude turbocharger wastegate boost regulation.",
            })
          }
          onMouseLeave={() => setHoveredPart(null)}
        >
          {/* Turbine Housing */}
          <ellipse
            cx="444"
            cy="180"
            rx="11"
            ry="13"
            fill={focusedComponent === "injection_timing" ? "rgba(56, 189, 248, 0.4)" : "rgba(24, 32, 47, 0.9)"}
            stroke={injTimingColor}
            strokeWidth={focusedComponent === "injection_timing" ? 2.2 : 1.4}
          />
          {/* Compressor Scroll Housing */}
          <ellipse cx="462" cy="180" rx="9" ry="11" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
          {/* Wastegate Actuator Canister & Linkage Rod */}
          <rect x="446" y="160" width="8" height="6" rx="1.5" fill={injTimingColor} />
          <line x1="450" y1="166" x2="450" y2="174" stroke={injTimingColor} strokeWidth="1.2" />
          <circle cx="444" cy="180" r="3.5" fill={injTimingColor} filter="url(#hud-glow)" />
        </g>

        {/* Lubrication Dry Sump Tank & Oil Cooling Circuit */}
        <g
          id="hotspot-oil"
          className="schematic-hotspot"
          style={{ cursor: "pointer" }}
          onClick={() => onSelectComponent("oil_pressure")}
          onMouseEnter={() =>
            setHoveredPart({
              id: "oil_pressure",
              name: "Dry Sump Lubrication Circuit & Oil Radiator",
              status: oilStatus,
              valStr: `${oilP.toFixed(1)} psi | ${oilT.toFixed(1)} °C`,
              desc: "Pressure and scavenge oil circuit feeding crankcase bearings and hydraulic propeller governor.",
            })
          }
          onMouseLeave={() => setHoveredPart(null)}
        >
          {/* Dry Sump Oil Tank */}
          <rect
            x="348"
            y="170"
            width="14"
            height="20"
            rx="2.5"
            fill={focusedComponent === "oil_pressure" || focusedComponent === "oil_temperature" ? "rgba(56, 189, 248, 0.35)" : "rgba(15, 23, 42, 0.95)"}
            stroke={oilColor}
            strokeWidth={focusedComponent === "oil_pressure" ? 2 : 1.3}
          />
          {/* Ram-Air Oil Cooler Matrix Radiator */}
          <rect x="330" y="196" width="14" height="10" rx="1.5" fill="#0f172a" stroke={oilColor} strokeWidth="1" />
          <line x1="333" y1="196" x2="333" y2="206" stroke={oilColor} strokeWidth="0.8" />
          <line x1="337" y1="196" x2="337" y2="206" stroke={oilColor} strokeWidth="0.8" />
          <line x1="341" y1="196" x2="341" y2="206" stroke={oilColor} strokeWidth="0.8" />
          {/* Oil Pressure/Temp Sensor Node */}
          <circle cx="355" cy="180" r="4" fill={oilColor} filter="url(#hud-glow)" />
        </g>

        {/* ==================================================================== */}
        {/* 3. REAR PUSHER PROPELLER HUB & VARIABLE-PITCH ROTOR BLADES            */}
        {/* ==================================================================== */}
        <g
          id="hotspot-propeller"
          className="schematic-hotspot"
          style={{ cursor: "pointer" }}
          onClick={() => onSelectComponent("rpm")}
          onMouseEnter={() =>
            setHoveredPart({
              id: "rpm",
              name: "Variable-Pitch Pusher Propeller & Governor",
              status: rpmStatus,
              valStr: `${Math.round(rpm).toLocaleString()} RPM`,
              desc: "3-blade constant-speed composite propeller driven via Rotax 1:2.43 reduction gearbox.",
            })
          }
          onMouseLeave={() => setHoveredPart(null)}
        >
          {/* Propeller Reduction Gearbox Drive Shaft */}
          <rect x="532" y="177" width="30" height="6" fill="#334155" stroke="#64748b" strokeWidth="0.8" />

          {/* Aerodynamic Spinner Hub */}
          <path d="M 562,174 L 575,180 L 562,186 Z" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />

          {/* Spinning Propeller Disc (Blur effect) */}
          <ellipse
            cx="562"
            cy="180"
            rx="5"
            ry="48"
            fill="none"
            stroke={rpmColor}
            strokeWidth="1.2"
            strokeDasharray="5,3"
            opacity="0.55"
          />

          {/* Rotating Propeller Blades */}
          <g transform="translate(562, 180)">
            <g
              style={{
                transformOrigin: "0 0",
                animation: `spin-propeller ${spinDuration}s linear infinite`,
              }}
            >
              {/* Blade 1 */}
              <path
                d="M 0,-4 L 3,-46 L -3,-46 Z"
                fill={rpmColor}
                opacity="0.88"
              />
              <rect x="-3" y="-46" width="6" height="4" fill="#facc15" />

              {/* Blade 2 */}
              <path
                d="M 3,2 L 40,24 L 37,29 Z"
                fill={rpmColor}
                opacity="0.88"
              />
              <rect x="36" y="22" width="5" height="5" fill="#facc15" />

              {/* Blade 3 */}
              <path
                d="M -3,2 L -40,24 L -37,29 Z"
                fill={rpmColor}
                opacity="0.88"
              />
              <rect x="-41" y="22" width="5" height="5" fill="#facc15" />
            </g>
          </g>

          {/* Propeller Speed Sensor Node */}
          <circle cx="562" cy="180" r="3.5" fill={rpmColor} filter="url(#hud-glow)" />
        </g>

        {/* ==================================================================== */}
        {/* 4. FLIR THERMAL HEATMAP OVERLAY (Active only in "thermal" viewMode)  */}
        {/* ==================================================================== */}
        {viewMode === "thermal" && (
          <g id="thermal-flir-heatmap" style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
            {/* Cylinder 1 & 3 Heat Zone */}
            <ellipse cx="388" cy="148" rx="44" ry="24" fill="url(#thermalCylinderHeat)" />
            {/* Cylinder 2 & 4 Heat Zone */}
            <ellipse cx="388" cy="212" rx="44" ry="24" fill="url(#thermalCylinderHeat)" />
            {/* Exhaust Header & Turbo Turbine Searing Heat Zone */}
            <ellipse cx="438" cy="180" rx="36" ry="22" fill="url(#thermalExhaustHeat)" />
            {/* Thermal FLIR HUD Legend Overlay */}
            <text x="60" y="340" fill="#f43f5e" fontSize="8" fontFamily="'JetBrains Mono', monospace" fontWeight="800">
              ● IR THERMAL FLIR MATRIX: PEAK {egt.toFixed(0)} °C EXH | {cht.toFixed(0)} °C CYL
            </text>
          </g>
        )}

        {/* ==================================================================== */}
        {/* 5. TACTICAL HUD LEADER LINES & SENSOR METRIC CALLOUT PILLS          */}
        {/* ==================================================================== */}
        <g id="hud-leader-callouts" style={{ pointerEvents: "none" }}>
          {/* --- TOP CALLOUTS --- */}

          {/* Callout 1: AVIONICS BUS VOLTAGE (Nose) */}
          <line x1="112" y1="165" x2="112" y2="105" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
          <line x1="112" y1="105" x2="90" y2="85" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
          <line x1="90" y1="85" x2="25" y2="85" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
          <circle cx="112" cy="165" r="2.5" fill={busVoltageColor} />
          <g transform="translate(25, 68)">
            <rect x="0" y="0" width="105" height="24" rx="4" fill="rgba(8, 14, 28, 0.85)" stroke={busVoltageColor} strokeWidth="0.8" />
            <text x="6" y="10" fill="#94a3b8" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">BUS VOLTAGE / ADC</text>
            <text x="6" y="19" fill={busVoltageColor} fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fontWeight="800">{busVoltage.toFixed(1)} V • {busVoltageStatus}</text>
          </g>

          {/* Callout 2: FUEL SYSTEM (Mid Fuselage) */}
          <line x1="240" y1="162" x2="240" y2="95" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
          <line x1="240" y1="95" x2="215" y2="70" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
          <line x1="215" y1="70" x2="155" y2="70" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
          <circle cx="240" cy="162" r="2.5" fill={fuelColor} />
          <g transform="translate(155, 53)">
            <rect x="0" y="0" width="100" height="24" rx="4" fill="rgba(8, 14, 28, 0.85)" stroke={fuelColor} strokeWidth="0.8" />
            <text x="6" y="10" fill="#94a3b8" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">FUEL INJECTION</text>
            <text x="6" y="19" fill={fuelColor} fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fontWeight="800">{fuel.toFixed(1)} L/h</text>
          </g>

          {/* Callout 3: CYLINDER HEAD TEMP (CHT 1–4) */}
          <line x1="390" y1="144" x2="390" y2="85" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
          <line x1="390" y1="85" x2="415" y2="60" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
          <line x1="415" y1="60" x2="480" y2="60" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
          <circle cx="390" cy="144" r="2.5" fill={chtColor} />
          <g transform="translate(480, 48)">
            <rect x="0" y="0" width="112" height="24" rx="4" fill="rgba(8, 14, 28, 0.85)" stroke={chtColor} strokeWidth="0.8" />
            <text x="6" y="10" fill="#94a3b8" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">CHT (CYL 1–4)</text>
            <text x="6" y="19" fill={chtColor} fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fontWeight="800">{cht.toFixed(1)} °C • {chtStatus}</text>
          </g>

          {/* Callout 4: INJECTION TIMING */}
          <line x1="455" y1="172" x2="455" y2="95" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
          <line x1="455" y1="95" x2="485" y2="65" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
          <line x1="485" y1="65" x2="620" y2="65" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
          <circle cx="455" cy="172" r="2.5" fill={injTimingColor} />
          <g transform="translate(620, 53)">
            <rect x="0" y="0" width="115" height="24" rx="4" fill="rgba(8, 14, 28, 0.85)" stroke={injTimingColor} strokeWidth="0.8" />
            <text x="6" y="10" fill="#94a3b8" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">INJECTION TIMING</text>
            <text x="6" y="19" fill={injTimingColor} fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fontWeight="800">{injTiming.toFixed(1)}° BTDC • {injTimingStatus}</text>
          </g>

          {/* --- BOTTOM CALLOUTS --- */}

          {/* Callout 5: CRANKCASE VIBRATION */}
          <line x1="338" y1="185" x2="338" y2="250" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
          <line x1="338" y1="250" x2="310" y2="278" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
          <line x1="310" y1="278" x2="215" y2="278" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
          <circle cx="338" cy="185" r="2.5" fill={vibColor} />
          <g transform="translate(215, 266)">
            <rect x="0" y="0" width="105" height="24" rx="4" fill="rgba(8, 14, 28, 0.85)" stroke={vibColor} strokeWidth="0.8" />
            <text x="6" y="10" fill="#94a3b8" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">VIBRATION RMS</text>
            <text x="6" y="19" fill={vibColor} fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fontWeight="800">{vib.toFixed(2)} g • {vibStatus}</text>
          </g>

          {/* Callout 6: OIL LUBRICATION CIRCUIT */}
          <line x1="355" y1="188" x2="355" y2="260" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
          <line x1="355" y1="260" x2="375" y2="280" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
          <line x1="375" y1="280" x2="390" y2="280" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
          <circle cx="355" cy="188" r="2.5" fill={oilColor} />
          <g transform="translate(390, 268)">
            <rect x="0" y="0" width="125" height="24" rx="4" fill="rgba(8, 14, 28, 0.85)" stroke={oilColor} strokeWidth="0.8" />
            <text x="6" y="10" fill="#94a3b8" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">OIL LUBRICATION</text>
            <text x="6" y="19" fill={oilColor} fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fontWeight="800">{oilP.toFixed(0)} psi • {oilT.toFixed(0)} °C</text>
          </g>

          {/* Callout 7: EXHAUST GAS TEMP (EGT) */}
          <line x1="410" y1="192" x2="410" y2="260" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
          <line x1="410" y1="260" x2="435" y2="285" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
          <line x1="435" y1="285" x2="520" y2="285" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
          <circle cx="410" cy="192" r="2.5" fill={egtColor} />
          <g transform="translate(520, 273)">
            <rect x="0" y="0" width="115" height="24" rx="4" fill="rgba(8, 14, 28, 0.85)" stroke={egtColor} strokeWidth="0.8" />
            <text x="6" y="10" fill="#94a3b8" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">EGT EXHAUST</text>
            <text x="6" y="19" fill={egtColor} fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fontWeight="800">{egt.toFixed(1)} °C • {egtStatus}</text>
          </g>

          {/* Callout 8: PUSHER PROPELLER SPEED (RPM) */}
          <line x1="562" y1="188" x2="562" y2="245" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
          <line x1="562" y1="245" x2="585" y2="268" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
          <line x1="585" y1="268" x2="640" y2="268" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
          <circle cx="562" cy="188" r="2.5" fill={rpmColor} />
          <g transform="translate(640, 256)">
            <rect x="0" y="0" width="105" height="24" rx="4" fill="rgba(8, 14, 28, 0.85)" stroke={rpmColor} strokeWidth="0.8" />
            <text x="6" y="10" fill="#94a3b8" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">PUSHER PROP</text>
            <text x="6" y="19" fill={rpmColor} fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fontWeight="800">{Math.round(rpm).toLocaleString()} RPM</text>
          </g>
        </g>
      </svg>

      <style jsx>{`
        @keyframes spin-propeller {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
