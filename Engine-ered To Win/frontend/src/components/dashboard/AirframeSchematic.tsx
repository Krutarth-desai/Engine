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

  // Zoom & Pan transform for inner stage
  let gTransform = "none";
  if (viewMode === "engine") {
    // Exact mathematical centering of engine bay (origin 450, 180) to canvas center (380, 180) at 2.2x zoom
    gTransform = "translate(380px, 180px) scale(2.2) translate(-450px, -180px)";
  } else if (viewMode === "thermal") {
    // Panoramic propulsion & fuel heat envelope centered at 1.45x
    gTransform = "translate(380px, 180px) scale(1.45) translate(-410px, -180px)";
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
          overflow: "hidden",
        }}
        aria-label="MALE UAV Digital Twin Propulsion Schematic"
      >
        <defs>
          {/* Fuselage composite surface gradient */}
          <linearGradient id="fuselageBodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0a1428" />
            <stop offset="20%" stopColor="#14223d" />
            <stop offset="50%" stopColor="#1e3052" />
            <stop offset="80%" stopColor="#14223d" />
            <stop offset="100%" stopColor="#0a1428" />
          </linearGradient>

          {/* Wing carbon-fiber aerofoil gradient */}
          <linearGradient id="wingSurfaceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#080f1e" />
            <stop offset="45%" stopColor="#132038" />
            <stop offset="55%" stopColor="#182846" />
            <stop offset="100%" stopColor="#080f1e" />
          </linearGradient>

          {/* Boxer Engine Block Machined Titanium Gradient */}
          <linearGradient id="engineBlockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Heat-Treated Inconel Violet / Burnt Bronze Exhaust Gradient */}
          <linearGradient id="inconelExhaustGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="35%" stopColor="#a855f7" />
            <stop offset="70%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>

          {/* Turbocharger Hot Cast Iron Turbine Scroll Gradient */}
          <radialGradient id="turboHotGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="60%" stopColor="#c2410c" />
            <stop offset="100%" stopColor="#7c2d12" />
          </radialGradient>

          {/* Aviation Fuel Bladder Cell Gradient */}
          <linearGradient id="fuelCellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(5, 150, 105, 0.18)" />
            <stop offset="50%" stopColor="rgba(16, 185, 129, 0.28)" />
            <stop offset="100%" stopColor="rgba(5, 150, 105, 0.18)" />
          </linearGradient>

          {/* Dry Sump Hydrodynamic Oil Tank Gradient */}
          <linearGradient id="oilCircuitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="60%" stopColor="#0369a1" />
            <stop offset="100%" stopColor="#075985" />
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
        {/* INNER STAGE: ANIMATED ZOOM & PAN CENTERED ON AIRFRAME / ENGINE BAY   */}
        {/* ==================================================================== */}
        <g
          id="schematic-zoom-stage"
          style={{
            transform: gTransform,
            transformOrigin: "0 0",
            transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* 1. MALE UAV AERODYNAMIC AIRFRAME (Carbon Navy & Sky Blue lines) */}
          <g id="uav-wings">
            {/* Port (Upper) Wing */}
            <polygon
              points="270,154 286,28 316,25 328,154"
              fill="url(#wingSurfaceGrad)"
              stroke="rgba(56, 189, 248, 0.5)"
              strokeWidth="1.2"
            />
            {/* Port Upswept Winglet */}
            <polygon
              points="286,28 290,14 312,16 316,25"
              fill="#0d172a"
              stroke="#38bdf8"
              strokeWidth="1.2"
            />
            {/* Port Navigation Strobe Light (Red) */}
            <circle cx="288" cy="18" r="3" fill="#ef4444" filter="url(#hud-glow)" />

            {/* Port Inboard Fowler Flap */}
            <line x1="316" y1="154" x2="319" y2="92" stroke="#0284c7" strokeWidth="1.2" strokeDasharray="3,2" />
            {/* Port Outboard Aileron */}
            <line x1="319" y1="92" x2="317" y2="30" stroke="#0284c7" strokeWidth="1.2" strokeDasharray="3,2" />
            {/* Port Underwing Weapons/Sensor Pylon */}
            <rect x="296" y="86" width="16" height="5" rx="1.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.8" />

            {/* Starboard (Lower) Wing */}
            <polygon
              points="270,206 286,332 316,335 328,206"
              fill="url(#wingSurfaceGrad)"
              stroke="rgba(56, 189, 248, 0.5)"
              strokeWidth="1.2"
            />
            {/* Starboard Upswept Winglet */}
            <polygon
              points="286,332 290,346 312,344 316,335"
              fill="#0d172a"
              stroke="#38bdf8"
              strokeWidth="1.2"
            />
            {/* Starboard Navigation Strobe Light (Green) */}
            <circle cx="288" cy="342" r="3" fill="#10b981" filter="url(#hud-glow)" />

            {/* Starboard Inboard Fowler Flap */}
            <line x1="316" y1="206" x2="319" y2="268" stroke="#0284c7" strokeWidth="1.2" strokeDasharray="3,2" />
            {/* Starboard Outboard Aileron */}
            <line x1="319" y1="268" x2="317" y2="330" stroke="#0284c7" strokeWidth="1.2" strokeDasharray="3,2" />
            {/* Starboard Underwing Weapons/Sensor Pylon */}
            <rect x="296" y="269" width="16" height="5" rx="1.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.8" />

            {/* Wing Main Titanium Spar */}
            <line x1="298" y1="30" x2="298" y2="330" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4,3" opacity="0.4" />
          </g>

          {/* Inverted V-Tail Empennage (Predator / Heron MALE configuration) */}
          <g id="uav-vtail">
            {/* Upper Inverted V-Stabilizer Fin */}
            <polygon
              points="480,166 558,102 574,105 528,172"
              fill="#0c1527"
              stroke="rgba(56, 189, 248, 0.5)"
              strokeWidth="1.2"
            />
            <line x1="550" y1="104" x2="515" y2="171" stroke="#38bdf8" strokeWidth="0.9" strokeDasharray="3,2" />

            {/* Lower Inverted V-Stabilizer Fin */}
            <polygon
              points="480,194 558,258 574,255 528,188"
              fill="#0c1527"
              stroke="rgba(56, 189, 248, 0.5)"
              strokeWidth="1.2"
            />
            <line x1="550" y1="256" x2="515" y2="189" stroke="#38bdf8" strokeWidth="0.9" strokeDasharray="3,2" />
          </g>

          {/* Slender Aerodynamic Composite Fuselage */}
          <path
            d="M 75,180 C 75,160 98,152 145,152 L 265,153 L 278,149 L 335,142 L 470,146 L 540,172 L 565,176 L 565,184 L 540,188 L 470,214 L 335,218 L 278,211 L 265,207 L 145,208 C 98,208 75,200 75,180 Z"
            fill="url(#fuselageBodyGrad)"
            stroke="var(--accent-cyan)"
            strokeWidth="1.4"
          />

          {/* Centerline Reference Axis */}
          <line x1="55" y1="180" x2="570" y2="180" stroke="rgba(56, 189, 248, 0.18)" strokeDasharray="6,4" />

          {/* Pitot-Static Probe Needle */}
          <line x1="42" y1="180" x2="75" y2="180" stroke="#38bdf8" strokeWidth="1.8" />
          <circle cx="42" cy="180" r="1.8" fill="#38bdf8" />

          {/* Forward Chin EO/IR Gimbal Turret (FLIR Sapphire Optics) */}
          <g id="chin-flir-turret">
            <circle cx="112" cy="180" r="16" fill="#0b1324" stroke="#475569" strokeWidth="1.4" />
            <circle cx="112" cy="180" r="9" fill="#1e293b" stroke="#818cf8" strokeWidth="1" />
            <circle cx="114" cy="178" r="4.5" fill="#06b6d4" />
            <circle cx="115" cy="177" r="1.5" fill="#ffffff" opacity="0.7" />
            <rect x="104" y="174" width="3" height="6" rx="1" fill="#f59e0b" />
          </g>

          {/* Forward SATCOM Radome & Avionics Bus (Dielectric / Gold Foil) */}
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
                desc: "Dual-redundant flight computers, INS/GPS navigation unit, and 28V DC bus.",
              })
            }
            onMouseLeave={() => setHoveredPart(null)}
          >
            <path
              d="M 80,180 C 80,165 98,158 135,158 L 145,158 L 145,202 L 135,202 C 98,202 80,195 80,180 Z"
              fill={focusedComponent === "bus_voltage" ? "rgba(99, 102, 241, 0.3)" : "rgba(30, 41, 59, 0.55)"}
              stroke={focusedComponent === "bus_voltage" ? "#818cf8" : "rgba(148, 163, 184, 0.4)"}
              strokeWidth={focusedComponent === "bus_voltage" ? 2 : 1}
            />
            {/* Gold Kapton Dielectric Antenna Arc */}
            <path d="M 124,168 C 133,174 133,186 124,192" fill="none" stroke="#f59e0b" strokeWidth="1.8" />
            <circle cx="130" cy="180" r="2.5" fill={busVoltageColor} filter="url(#hud-glow)" />
          </g>

          {/* Mid-Fuselage Main Fuel Bladder Cell & Fuel Feed Rail (Emerald Theme) */}
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
                desc: "Kevlar-reinforced fuel cell with submerged boost pump feeding Rotax fuel injection rail.",
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
              fill={focusedComponent === "fuel_flow" ? "rgba(16, 185, 129, 0.35)" : "url(#fuelCellGrad)"}
              stroke="#10b981"
              strokeWidth={focusedComponent === "fuel_flow" ? 2 : 1.3}
            />
            {/* Anti-slosh Internal Baffles */}
            <line x1="198" y1="164" x2="198" y2="196" stroke="#059669" strokeWidth="1" strokeDasharray="2,2" />
            <line x1="224" y1="164" x2="224" y2="196" stroke="#059669" strokeWidth="1" strokeDasharray="2,2" />
            {/* High-Pressure Fuel Feed Rail */}
            <path
              d="M 245,180 L 320,180 L 340,174"
              fill="none"
              stroke="#34d399"
              strokeWidth={focusedComponent === "fuel_flow" ? 2.6 : 1.8}
            />
            <circle cx="282" cy="180" r="4.5" fill={fuelColor} filter="url(#hud-glow)" />
          </g>

          {/* Ram-Air Dorsal NACA Cooling Ducts */}
          <polygon points="305,145 325,148 325,152 305,149" fill="#050811" stroke="#38bdf8" strokeWidth="0.8" />
          <polygon points="305,215 325,212 325,208 305,211" fill="#050811" stroke="#38bdf8" strokeWidth="0.8" />

          {/* ==================================================================== */}
          {/* 2. ROTAX 914 F TURBOCHARGED PROPULSION BAY (ENGINE COMPONENT PALETTES)*/}
          {/* ==================================================================== */}

          {/* Structural Titanium Firewall */}
          <line x1="336" y1="144" x2="336" y2="216" stroke="#94a3b8" strokeWidth="2.5" />
          <line x1="335" y1="144" x2="335" y2="216" stroke="#475569" strokeWidth="1" strokeDasharray="3,2" />

          {/* Chromoly 4130 Tubular Engine Mount Truss */}
          <g id="engine-mount-truss" opacity="0.85">
            <line x1="336" y1="152" x2="352" y2="166" stroke="#94a3b8" strokeWidth="1.2" />
            <line x1="336" y1="208" x2="352" y2="194" stroke="#94a3b8" strokeWidth="1.2" />
            <line x1="336" y1="180" x2="348" y2="180" stroke="#94a3b8" strokeWidth="1.2" />
          </g>

          {/* Dynafocal Crankcase Shock Mounts (Polyurethane Safety Orange) & Vibration Sensor */}
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
                desc: "High-damping polyurethane dynafocal mounts with 3-axis accelerometer detecting harmonic imbalances.",
              })
            }
            onMouseLeave={() => setHoveredPart(null)}
          >
            {/* Upper Dynafocal Bushing */}
            <circle cx="340" cy="156" r="4" fill="#f97316" stroke="#ea580c" strokeWidth="1" />
            {/* Lower Dynafocal Bushing */}
            <circle cx="340" cy="204" r="4" fill="#f97316" stroke="#ea580c" strokeWidth="1" />
            {/* 3-Axis Piezoresistive Accelerometer Node */}
            <rect x="337" y="174" width="7" height="12" rx="1.5" fill={vibColor} filter="url(#hud-glow)" />
          </g>

          {/* Engine Crankcase Core (Machined Aluminum / Slate) */}
          <rect
            x="346"
            y="164"
            width="82"
            height="32"
            rx="3"
            fill="url(#engineBlockGrad)"
            stroke="#64748b"
            strokeWidth="1.3"
          />

          {/* 4 Horizontally Opposed Boxer Cylinder Heads (Machined Gunmetal with Silver Fins) */}
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
                desc: "Boxer cylinders 1–4 with machined aluminum cooling fins and spark-plug thermocouples.",
              })
            }
            onMouseLeave={() => setHoveredPart(null)}
          >
            {/* Starboard (Top) Bank: Cyl 1 & Cyl 3 */}
            <g id="cyl-bank-starboard">
              {/* Cylinder 1 */}
              <rect
                x="358"
                y="142"
                width="28"
                height="20"
                rx="2"
                fill={focusedComponent === "cht" ? "rgba(56, 189, 248, 0.35)" : "#1e293b"}
                stroke={chtColor}
                strokeWidth={focusedComponent === "cht" ? 2 : 1.3}
              />
              {/* CNC Machined Cooling Fins */}
              <line x1="360" y1="139" x2="384" y2="139" stroke="#cbd5e1" strokeWidth="1" />
              <line x1="360" y1="142" x2="384" y2="142" stroke="#cbd5e1" strokeWidth="1" />
              {/* Red Silicone Spark Plug Boot */}
              <circle cx="372" cy="138" r="2" fill="#f43f5e" />
              {/* CHT Thermocouple Sensor Node 1 */}
              <circle cx="372" cy="143" r="3.5" fill={chtColor} filter="url(#hud-glow)" />

              {/* Cylinder 3 */}
              <rect
                x="396"
                y="142"
                width="28"
                height="20"
                rx="2"
                fill={focusedComponent === "cht" ? "rgba(56, 189, 248, 0.35)" : "#1e293b"}
                stroke={chtColor}
                strokeWidth={focusedComponent === "cht" ? 2 : 1.3}
              />
              <line x1="398" y1="139" x2="422" y2="139" stroke="#cbd5e1" strokeWidth="1" />
              <line x1="398" y1="142" x2="422" y2="142" stroke="#cbd5e1" strokeWidth="1" />
              <circle cx="410" cy="138" r="2" fill="#f43f5e" />
              {/* CHT Thermocouple Sensor Node 3 */}
              <circle cx="410" cy="143" r="3.5" fill={chtColor} filter="url(#hud-glow)" />
            </g>

            {/* Port (Bottom) Bank: Cyl 2 & Cyl 4 */}
            <g id="cyl-bank-port">
              {/* Cylinder 2 */}
              <rect
                x="358"
                y="198"
                width="28"
                height="20"
                rx="2"
                fill={focusedComponent === "cht" ? "rgba(56, 189, 248, 0.35)" : "#1e293b"}
                stroke={chtColor}
                strokeWidth={focusedComponent === "cht" ? 2 : 1.3}
              />
              <line x1="360" y1="218" x2="384" y2="218" stroke="#cbd5e1" strokeWidth="1" />
              <line x1="360" y1="221" x2="384" y2="221" stroke="#cbd5e1" strokeWidth="1" />
              <circle cx="372" cy="222" r="2" fill="#f43f5e" />
              {/* CHT Thermocouple Sensor Node 2 */}
              <circle cx="372" cy="217" r="3.5" fill={chtColor} filter="url(#hud-glow)" />

              {/* Cylinder 4 */}
              <rect
                x="396"
                y="198"
                width="28"
                height="20"
                rx="2"
                fill={focusedComponent === "cht" ? "rgba(56, 189, 248, 0.35)" : "#1e293b"}
                stroke={chtColor}
                strokeWidth={focusedComponent === "cht" ? 2 : 1.3}
              />
              <line x1="398" y1="218" x2="422" y2="218" stroke="#cbd5e1" strokeWidth="1" />
              <line x1="398" y1="221" x2="422" y2="221" stroke="#cbd5e1" strokeWidth="1" />
              <circle cx="410" cy="222" r="2" fill="#f43f5e" />
              {/* CHT Thermocouple Sensor Node 4 */}
              <circle cx="410" cy="217" r="3.5" fill={chtColor} filter="url(#hud-glow)" />
            </g>

            {/* Cylinder Labels in Engine Bay Mode */}
            {viewMode === "engine" && (
              <g style={{ pointerEvents: "none" }}>
                <text x="364" y="134" fill="#94a3b8" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">CYL 1</text>
                <text x="402" y="134" fill="#94a3b8" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">CYL 3</text>
                <text x="364" y="231" fill="#94a3b8" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">CYL 2</text>
                <text x="402" y="231" fill="#94a3b8" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">CYL 4</text>
              </g>
            )}
          </g>

          {/* Stainless / Inconel 4-into-1 Exhaust Headers (Titanium Violet / Burnt Bronze) */}
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
                desc: "Tuned Inconel exhaust runners leading into 4-into-1 collector and turbo turbine.",
              })
            }
            onMouseLeave={() => setHoveredPart(null)}
          >
            {/* Exhaust Header Starboard Runner Pipes */}
            <path
              d="M 372,162 L 380,168 L 436,174"
              fill="none"
              stroke="url(#inconelExhaustGrad)"
              strokeWidth={focusedComponent === "egt" ? 3 : 2.2}
            />
            <path
              d="M 410,162 L 418,168 L 436,174"
              fill="none"
              stroke="url(#inconelExhaustGrad)"
              strokeWidth={focusedComponent === "egt" ? 3 : 2.2}
            />
            {/* Exhaust Header Port Runner Pipes */}
            <path
              d="M 372,198 L 380,192 L 436,186"
              fill="none"
              stroke="url(#inconelExhaustGrad)"
              strokeWidth={focusedComponent === "egt" ? 3 : 2.2}
            />
            <path
              d="M 410,198 L 418,192 L 436,186"
              fill="none"
              stroke="url(#inconelExhaustGrad)"
              strokeWidth={focusedComponent === "egt" ? 3 : 2.2}
            />
            {/* EGT Thermocouple Probes */}
            <circle cx="390" cy="170" r="3.5" fill={egtColor} filter="url(#hud-glow)" />
            <circle cx="390" cy="190" r="3.5" fill={egtColor} filter="url(#hud-glow)" />

            {viewMode === "engine" && (
              <text x="412" y="183" fill="#a855f7" fontSize="5.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">
                INCONEL 4-1
              </text>
            )}
          </g>

          {/* Turbocharger Unit & Wastegate (Burnt Bronze / Metallic Silver & Anodized Magenta) */}
          <g
            id="hotspot-turbo"
            className="schematic-hotspot"
            style={{ cursor: "pointer" }}
            onClick={() => onSelectComponent("injection_timing")}
            onMouseEnter={() =>
              setHoveredPart({
                id: "injection_timing",
                name: "Turbocharger & Wastegate Actuator",
                status: injTimingStatus,
                valStr: `${injTiming.toFixed(1)}° BTDC`,
                desc: "High-altitude turbocharger turbine with pneumatic wastegate boost actuator and injection timing.",
              })
            }
            onMouseLeave={() => setHoveredPart(null)}
          >
            {/* Hot Turbine Housing (Cast Bronze) */}
            <ellipse
              cx="444"
              cy="180"
              rx="12"
              ry="14"
              fill="url(#turboHotGrad)"
              stroke="#ea580c"
              strokeWidth={focusedComponent === "injection_timing" ? 2.4 : 1.4}
            />
            {/* Cold Compressor Scroll Housing (Machined Silver Alloy) */}
            <ellipse cx="463" cy="180" rx="10" ry="12" fill="#334155" stroke="#cbd5e1" strokeWidth="1.2" />
            {/* Intercooler Duct Outlet */}
            <path d="M 463,168 L 472,165" stroke="#cbd5e1" strokeWidth="2.5" />
            {/* Wastegate Actuator Canister (Anodized Magenta) */}
            <rect x="446" y="158" width="9" height="7" rx="1.5" fill="#d946ef" stroke="#a21caf" strokeWidth="0.8" />
            {/* Steel Linkage Control Rod */}
            <line x1="450" y1="165" x2="450" y2="174" stroke="#e2e8f0" strokeWidth="1.4" />
            <circle cx="444" cy="180" r="4" fill={injTimingColor} filter="url(#hud-glow)" />

            {viewMode === "engine" && (
              <text x="448" y="152" fill="#ea580c" fontSize="5.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">
                TURBO/WG
              </text>
            )}
          </g>

          {/* Dry Sump Lubrication Circuit & Oil Radiator (Hydrodynamic Ocean Blue & Cyan) */}
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
                desc: "Dry sump reservoir tank, high-pressure lines, and ram-air matrix oil cooler.",
              })
            }
            onMouseLeave={() => setHoveredPart(null)}
          >
            {/* Dry Sump Oil Tank */}
            <rect
              x="348"
              y="169"
              width="15"
              height="22"
              rx="2.5"
              fill="url(#oilCircuitGrad)"
              stroke={oilColor}
              strokeWidth={focusedComponent === "oil_pressure" ? 2 : 1.3}
            />
            {/* Oil Level Sight Glass */}
            <line x1="352" y1="173" x2="352" y2="187" stroke="#38bdf8" strokeWidth="1.2" />

            {/* Ram-Air Oil Cooler Matrix Radiator */}
            <rect x="330" y="196" width="14" height="11" rx="1.5" fill="#0f172a" stroke="#0284c7" strokeWidth="1.2" />
            {/* Cooling Matrix Fin Tubes */}
            <line x1="333" y1="196" x2="333" y2="207" stroke="#38bdf8" strokeWidth="0.8" />
            <line x1="337" y1="196" x2="337" y2="207" stroke="#38bdf8" strokeWidth="0.8" />
            <line x1="341" y1="196" x2="341" y2="207" stroke="#38bdf8" strokeWidth="0.8" />

            {/* Braided Scavenge Return Line */}
            <path d="M 337,196 L 337,185 L 348,185" fill="none" stroke="#0284c7" strokeWidth="1.2" />
            {/* Oil Sensor Node */}
            <circle cx="355" cy="180" r="4.5" fill={oilColor} filter="url(#hud-glow)" />

            {viewMode === "engine" && (
              <text x="328" y="217" fill="#0284c7" fontSize="5.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">
                OIL SUMP
              </text>
            )}
          </g>

          {/* 3. REAR PUSHER PROPELLER HUB & ROTOR BLADES (Carbon with Hazard Safety Tips) */}
          <g
            id="hotspot-propeller"
            className="schematic-hotspot"
            style={{ cursor: "pointer" }}
            onClick={() => onSelectComponent("rpm")}
            onMouseEnter={() =>
              setHoveredPart({
                id: "rpm",
                name: "Rotax Reduction Drive & Pusher Propeller",
                status: rpmStatus,
                valStr: `${Math.round(rpm).toLocaleString()} RPM`,
                desc: "Rotax 1:2.43 reduction gearbox driving constant-speed composite 3-blade pusher propeller.",
              })
            }
            onMouseLeave={() => setHoveredPart(null)}
          >
            {/* Reduction Gearbox Housing */}
            <rect x="526" y="174" width="22" height="12" rx="2" fill="#334155" stroke="#64748b" strokeWidth="1" />
            {/* Propeller Drive Shaft */}
            <rect x="548" y="177" width="14" height="6" fill="#94a3b8" stroke="#475569" strokeWidth="0.8" />

            {/* Mirror Chrome Aerodynamic Spinner */}
            <path d="M 562,173 L 577,180 L 562,187 Z" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.2" />

            {/* Spinning Propeller Disc Blur Ring */}
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

            {/* Rotating 3-Blade Propeller with High-Visibility Hazard Yellow Safety Tips */}
            <g transform="translate(562, 180)">
              <g
                style={{
                  transformOrigin: "0 0",
                  animation: `spin-propeller ${spinDuration}s linear infinite`,
                }}
              >
                {/* Blade 1 */}
                <path d="M 0,-4 L 3,-46 L -3,-46 Z" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
                {/* Yellow Safety Tip */}
                <rect x="-3" y="-46" width="6" height="5" fill="#facc15" stroke="#eab308" strokeWidth="0.5" />

                {/* Blade 2 */}
                <path d="M 3,2 L 40,24 L 37,29 Z" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
                <rect x="36" y="22" width="5" height="5" fill="#facc15" stroke="#eab308" strokeWidth="0.5" />

                {/* Blade 3 */}
                <path d="M -3,2 L -40,24 L -37,29 Z" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
                <rect x="-41" y="22" width="5" height="5" fill="#facc15" stroke="#eab308" strokeWidth="0.5" />
              </g>
            </g>

            {/* Propeller RPM Sensor Node */}
            <circle cx="562" cy="180" r="4" fill={rpmColor} filter="url(#hud-glow)" />

            {viewMode === "engine" && (
              <text x="532" y="170" fill="#cbd5e1" fontSize="5.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">
                PRGB 1:2.43
              </text>
            )}
          </g>

          {/* 4. FLIR THERMAL HEATMAP OVERLAY (Active only in "thermal" viewMode) */}
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
        </g>

        {/* ==================================================================== */}
        {/* VIEWPORT HUD CALLOUTS: ADAPTS DYNAMICALLY TO FULL vs ENGINE vs THERMAL*/}
        {/* ==================================================================== */}
        <g id="hud-leader-callouts" style={{ pointerEvents: "none" }}>
          {/* A. FULL AIRFRAME VIEW MODE CALLOUTS */}
          {viewMode === "full" && (
            <g id="full-airframe-callouts">
              {/* Callout 1: AVIONICS BUS VOLTAGE (Nose) */}
              <line x1="112" y1="165" x2="112" y2="105" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
              <line x1="112" y1="105" x2="90" y2="85" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
              <line x1="90" y1="85" x2="25" y2="85" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
              <circle cx="112" cy="165" r="2.5" fill={busVoltageColor} />
              <g transform="translate(25, 68)">
                <rect x="0" y="0" width="105" height="24" rx="4" fill="rgba(8, 14, 28, 0.9)" stroke={busVoltageColor} strokeWidth="0.8" />
                <text x="6" y="10" fill="#94a3b8" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">BUS VOLTAGE / ADC</text>
                <text x="6" y="19" fill={busVoltageColor} fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fontWeight="800">{busVoltage.toFixed(1)} V • {busVoltageStatus}</text>
              </g>

              {/* Callout 2: FUEL SYSTEM (Mid Fuselage) */}
              <line x1="240" y1="162" x2="240" y2="95" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
              <line x1="240" y1="95" x2="215" y2="70" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
              <line x1="215" y1="70" x2="155" y2="70" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
              <circle cx="240" cy="162" r="2.5" fill={fuelColor} />
              <g transform="translate(155, 53)">
                <rect x="0" y="0" width="100" height="24" rx="4" fill="rgba(8, 14, 28, 0.9)" stroke={fuelColor} strokeWidth="0.8" />
                <text x="6" y="10" fill="#94a3b8" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">FUEL INJECTION</text>
                <text x="6" y="19" fill={fuelColor} fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fontWeight="800">{fuel.toFixed(1)} L/h</text>
              </g>

              {/* Callout 3: CYLINDER HEAD TEMP (CHT 1–4) */}
              <line x1="390" y1="144" x2="390" y2="85" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
              <line x1="390" y1="85" x2="415" y2="60" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
              <line x1="415" y1="60" x2="480" y2="60" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
              <circle cx="390" cy="144" r="2.5" fill={chtColor} />
              <g transform="translate(480, 48)">
                <rect x="0" y="0" width="112" height="24" rx="4" fill="rgba(8, 14, 28, 0.9)" stroke={chtColor} strokeWidth="0.8" />
                <text x="6" y="10" fill="#94a3b8" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">CHT (CYL 1–4)</text>
                <text x="6" y="19" fill={chtColor} fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fontWeight="800">{cht.toFixed(1)} °C • {chtStatus}</text>
              </g>

              {/* Callout 4: INJECTION TIMING */}
              <line x1="455" y1="172" x2="455" y2="95" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
              <line x1="455" y1="95" x2="485" y2="65" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
              <line x1="485" y1="65" x2="620" y2="65" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
              <circle cx="455" cy="172" r="2.5" fill={injTimingColor} />
              <g transform="translate(620, 53)">
                <rect x="0" y="0" width="115" height="24" rx="4" fill="rgba(8, 14, 28, 0.9)" stroke={injTimingColor} strokeWidth="0.8" />
                <text x="6" y="10" fill="#94a3b8" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">INJECTION TIMING</text>
                <text x="6" y="19" fill={injTimingColor} fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fontWeight="800">{injTiming.toFixed(1)}° BTDC • {injTimingStatus}</text>
              </g>

              {/* Callout 5: CRANKCASE VIBRATION */}
              <line x1="338" y1="185" x2="338" y2="250" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
              <line x1="338" y1="250" x2="310" y2="278" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
              <line x1="310" y1="278" x2="215" y2="278" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
              <circle cx="338" cy="185" r="2.5" fill={vibColor} />
              <g transform="translate(215, 266)">
                <rect x="0" y="0" width="105" height="24" rx="4" fill="rgba(8, 14, 28, 0.9)" stroke={vibColor} strokeWidth="0.8" />
                <text x="6" y="10" fill="#94a3b8" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">VIBRATION RMS</text>
                <text x="6" y="19" fill={vibColor} fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fontWeight="800">{vib.toFixed(2)} g • {vibStatus}</text>
              </g>

              {/* Callout 6: OIL LUBRICATION CIRCUIT */}
              <line x1="355" y1="188" x2="355" y2="260" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
              <line x1="355" y1="260" x2="375" y2="280" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
              <line x1="375" y1="280" x2="390" y2="280" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
              <circle cx="355" cy="188" r="2.5" fill={oilColor} />
              <g transform="translate(390, 268)">
                <rect x="0" y="0" width="125" height="24" rx="4" fill="rgba(8, 14, 28, 0.9)" stroke={oilColor} strokeWidth="0.8" />
                <text x="6" y="10" fill="#94a3b8" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">OIL LUBRICATION</text>
                <text x="6" y="19" fill={oilColor} fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fontWeight="800">{oilP.toFixed(0)} psi • {oilT.toFixed(0)} °C</text>
              </g>

              {/* Callout 7: EXHAUST GAS TEMP (EGT) */}
              <line x1="410" y1="192" x2="410" y2="260" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
              <line x1="410" y1="260" x2="435" y2="285" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
              <line x1="435" y1="285" x2="520" y2="285" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
              <circle cx="410" cy="192" r="2.5" fill={egtColor} />
              <g transform="translate(520, 273)">
                <rect x="0" y="0" width="115" height="24" rx="4" fill="rgba(8, 14, 28, 0.9)" stroke={egtColor} strokeWidth="0.8" />
                <text x="6" y="10" fill="#94a3b8" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">EGT EXHAUST</text>
                <text x="6" y="19" fill={egtColor} fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fontWeight="800">{egt.toFixed(1)} °C • {egtStatus}</text>
              </g>

              {/* Callout 8: PUSHER PROPELLER SPEED (RPM) */}
              <line x1="562" y1="188" x2="562" y2="245" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
              <line x1="562" y1="245" x2="585" y2="268" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
              <line x1="585" y1="268" x2="640" y2="268" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.8" />
              <circle cx="562" cy="188" r="2.5" fill={rpmColor} />
              <g transform="translate(640, 256)">
                <rect x="0" y="0" width="105" height="24" rx="4" fill="rgba(8, 14, 28, 0.9)" stroke={rpmColor} strokeWidth="0.8" />
                <text x="6" y="10" fill="#94a3b8" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">PUSHER PROP</text>
                <text x="6" y="19" fill={rpmColor} fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fontWeight="800">{Math.round(rpm).toLocaleString()} RPM</text>
              </g>
            </g>
          )}

          {/* B. DEDICATED ENGINE BAY CUTAWAY VIEW MODE CALLOUTS */}
          {viewMode === "engine" && (
            <g id="engine-bay-callouts">
              {/* Callout 1: CHT 1-4 (Top Left) */}
              <line x1="248" y1="95" x2="248" y2="52" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="0.8" />
              <line x1="248" y1="52" x2="160" y2="52" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="0.8" />
              <circle cx="248" cy="95" r="2.5" fill={chtColor} />
              <g transform="translate(30, 40)">
                <rect x="0" y="0" width="125" height="24" rx="4" fill="rgba(8, 14, 28, 0.92)" stroke={chtColor} strokeWidth="0.9" />
                <text x="6" y="10" fill="#94a3b8" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">CHT (CYL 1–4)</text>
                <text x="6" y="19" fill={chtColor} fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fontWeight="800">{cht.toFixed(1)} °C • {chtStatus}</text>
              </g>

              {/* Callout 2: INJECTION TIMING & BOOST (Top Right) */}
              <line x1="380" y1="135" x2="380" y2="52" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="0.8" />
              <line x1="380" y1="52" x2="460" y2="52" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="0.8" />
              <circle cx="380" cy="135" r="2.5" fill={injTimingColor} />
              <g transform="translate(460, 40)">
                <rect x="0" y="0" width="135" height="24" rx="4" fill="rgba(8, 14, 28, 0.92)" stroke={injTimingColor} strokeWidth="0.9" />
                <text x="6" y="10" fill="#94a3b8" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">INJ TIMING & TURBO</text>
                <text x="6" y="19" fill={injTimingColor} fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fontWeight="800">{injTiming.toFixed(1)}° BTDC • {injTimingStatus}</text>
              </g>

              {/* Callout 3: VIBRATION RMS (Bottom Left) */}
              <line x1="138" y1="195" x2="138" y2="280" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="0.8" />
              <line x1="138" y1="280" x2="90" y2="280" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="0.8" />
              <circle cx="138" cy="195" r="2.5" fill={vibColor} />
              <g transform="translate(20, 268)">
                <rect x="0" y="0" width="115" height="24" rx="4" fill="rgba(8, 14, 28, 0.92)" stroke={vibColor} strokeWidth="0.9" />
                <text x="6" y="10" fill="#94a3b8" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">CRANKCASE VIB</text>
                <text x="6" y="19" fill={vibColor} fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fontWeight="800">{vib.toFixed(2)} g • {vibStatus}</text>
              </g>

              {/* Callout 4: OIL LUBRICATION (Bottom Center) */}
              <line x1="180" y1="210" x2="230" y2="280" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="0.8" />
              <circle cx="180" cy="210" r="2.5" fill={oilColor} />
              <g transform="translate(230, 268)">
                <rect x="0" y="0" width="130" height="24" rx="4" fill="rgba(8, 14, 28, 0.92)" stroke={oilColor} strokeWidth="0.9" />
                <text x="6" y="10" fill="#94a3b8" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">DRY SUMP OIL CIRCUIT</text>
                <text x="6" y="19" fill={oilColor} fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fontWeight="800">{oilP.toFixed(0)} psi • {oilT.toFixed(0)} °C</text>
              </g>

              {/* Callout 5: EGT EXHAUST (Bottom Right) */}
              <line x1="310" y1="215" x2="385" y2="280" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="0.8" />
              <circle cx="310" cy="215" r="2.5" fill={egtColor} />
              <g transform="translate(385, 268)">
                <rect x="0" y="0" width="125" height="24" rx="4" fill="rgba(8, 14, 28, 0.92)" stroke={egtColor} strokeWidth="0.9" />
                <text x="6" y="10" fill="#94a3b8" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">EGT 4-INTO-1 EXHAUST</text>
                <text x="6" y="19" fill={egtColor} fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fontWeight="800">{egt.toFixed(1)} °C • {egtStatus}</text>
              </g>

              {/* Callout 6: PUSHER PROPELLER (Far Right) */}
              <line x1="626" y1="180" x2="626" y2="260" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="0.8" />
              <circle cx="626" cy="180" r="2.5" fill={rpmColor} />
              <g transform="translate(565, 260)">
                <rect x="0" y="0" width="115" height="24" rx="4" fill="rgba(8, 14, 28, 0.92)" stroke={rpmColor} strokeWidth="0.9" />
                <text x="6" y="10" fill="#94a3b8" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700">PUSHER PROPELLER</text>
                <text x="6" y="19" fill={rpmColor} fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fontWeight="800">{Math.round(rpm).toLocaleString()} RPM</text>
              </g>
            </g>
          )}

          {/* C. THERMAL HUD MODE CALLOUT */}
          {viewMode === "thermal" && (
            <g id="thermal-mode-callouts">
              <g transform="translate(20, 20)">
                <rect x="0" y="0" width="230" height="28" rx="4" fill="rgba(8, 14, 28, 0.92)" stroke="#f43f5e" strokeWidth="1" />
                <text x="8" y="12" fill="#f43f5e" fontSize="7" fontFamily="'JetBrains Mono', monospace" fontWeight="800">
                  FLIR THERMAL SPECTRUM
                </text>
                <text x="8" y="22" fill="#cbd5e1" fontSize="7" fontFamily="'JetBrains Mono', monospace">
                  EXH PEAK: {egt.toFixed(0)} °C | CYL PEAK: {cht.toFixed(0)} °C
                </text>
              </g>
            </g>
          )}
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
