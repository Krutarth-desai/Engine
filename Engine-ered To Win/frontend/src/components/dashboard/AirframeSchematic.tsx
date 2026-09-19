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
  } | null>(null);

  const rpm = payload.sensors?.rpm?.value ?? payload.rpm ?? 2450;
  const cht = payload.sensors?.cht?.value ?? payload.cht_c ?? 142.0;
  const egt = payload.sensors?.egt?.value ?? payload.egt_c ?? 615.0;
  const oilP = payload.sensors?.oil_pressure?.value ?? (payload.oil_pressure_bar ? payload.oil_pressure_bar * 14.5038 : 68.0);
  const oilT = payload.sensors?.oil_temperature?.value ?? payload.oil_temperature_c ?? 92.0;
  const fuel = payload.sensors?.fuel_flow?.value ?? payload.fuel_flow_lh ?? 17.6;
  const vib = payload.sensors?.vibration?.value ?? payload.vibration_g ?? 1.42;

  // Derive status from limits.ts
  const rpmStatus = getSensorStatus("rpm", rpm);
  const chtStatus = getSensorStatus("cht", cht);
  const egtStatus = getSensorStatus("egt", egt);
  const oilPStatus = getSensorStatus("oil_pressure", oilP);
  const oilTStatus = getSensorStatus("oil_temperature", oilT);
  const fuelStatus = getSensorStatus("fuel_flow", fuel);
  const vibStatus = getSensorStatus("vibration", vib);

  // Status colors
  const rpmColor = getStatusColor(rpmStatus);
  const chtColor = getStatusColor(chtStatus);
  const egtColor = getStatusColor(egtStatus);
  const oilColor = getStatusColor(oilPStatus === "ALERT" || oilTStatus === "ALERT" ? "ALERT" : oilPStatus === "CAUTION" || oilTStatus === "CAUTION" ? "CAUTION" : "NORMAL");
  const fuelColor = getStatusColor(fuelStatus);
  const vibColor = getStatusColor(vibStatus);

  // Pusher prop spin duration
  const spinDuration = Math.max(0.08, 60 / Math.max(rpm, 800));

  // Transform for view modes
  let svgTransform = "scale(1) translate(0, 0)";
  if (viewMode === "engine") {
    svgTransform = "scale(1.85) translate(-105px, 0)";
  } else if (viewMode === "thermal") {
    svgTransform = "scale(1.35) translate(-40px, 0)";
  }

  return (
    <div className="airframe-schematic-wrapper" style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Interactive Tooltip HUD Overlay */}
      {hoveredPart && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "12px",
            background: "rgba(10, 16, 30, 0.95)",
            border: `1px solid ${getStatusColor(hoveredPart.status)}`,
            borderRadius: "6px",
            padding: "0.4rem 0.65rem",
            fontSize: "0.68rem",
            fontFamily: "'JetBrains Mono', monospace",
            zIndex: 30,
            pointerEvents: "none",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ fontWeight: 700, color: "#f8fafc" }}>{hoveredPart.name}</div>
          <div style={{ color: getStatusColor(hoveredPart.status), fontWeight: 700, marginTop: "0.15rem" }}>
            STATUS: {hoveredPart.status} ({hoveredPart.valStr})
          </div>
          <div style={{ fontSize: "0.6rem", color: "#94a3b8", marginTop: "0.1rem" }}>
            Click to isolate in Telemetry
          </div>
        </div>
      )}

      <svg
        viewBox="-10 0 540 270"
        style={{
          width: "100%",
          height: "100%",
          maxHeight: "340px",
          transform: svgTransform,
          transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          overflow: "visible",
        }}
        aria-label="MALE UAV Digital Twin Schematic"
      >
        <defs>
          <linearGradient id="maleFuselageGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0b1326" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="85%" stopColor="#131c31" />
            <stop offset="100%" stopColor="#0b1326" />
          </linearGradient>

          <linearGradient id="maleWingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#080e1c" />
            <stop offset="50%" stopColor="#17223b" />
            <stop offset="100%" stopColor="#080e1c" />
          </linearGradient>

          <filter id="glow-schematic" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* High-Aspect Ratio MALE Straight Wings */}
        <g id="male-wings">
          {/* Port Wing (Top) */}
          <polygon
            points="230,135 240,15 265,15 255,135"
            fill="url(#maleWingGrad)"
            stroke="rgba(56, 189, 248, 0.35)"
            strokeWidth="1.2"
          />
          {/* Starboard Wing (Bottom) */}
          <polygon
            points="230,135 240,255 265,255 255,135"
            fill="url(#maleWingGrad)"
            stroke="rgba(56, 189, 248, 0.35)"
            strokeWidth="1.2"
          />
          {/* Wing rib spar markers */}
          <line x1="245" y1="50" x2="260" y2="50" stroke="rgba(56, 189, 248, 0.2)" strokeDasharray="3,2" />
          <line x1="245" y1="90" x2="258" y2="90" stroke="rgba(56, 189, 248, 0.2)" strokeDasharray="3,2" />
          <line x1="245" y1="180" x2="258" y2="180" stroke="rgba(56, 189, 248, 0.2)" strokeDasharray="3,2" />
          <line x1="245" y1="220" x2="260" y2="220" stroke="rgba(56, 189, 248, 0.2)" strokeDasharray="3,2" />
        </g>

        {/* Inverted V-Tail Empennage (Typical for MALE UAVs like Predator/Reaper) */}
        <g id="male-vtail">
          {/* Upper V-Fin */}
          <polygon
            points="385,135 435,80 448,80 415,135"
            fill="#0b1326"
            stroke="rgba(56, 189, 248, 0.35)"
            strokeWidth="1.2"
          />
          {/* Lower V-Fin */}
          <polygon
            points="385,135 435,190 448,190 415,135"
            fill="#0b1326"
            stroke="rgba(56, 189, 248, 0.35)"
            strokeWidth="1.2"
          />
        </g>

        {/* Slender Fuselage with Forward Satellite Fairing and Rear Engine Cradle */}
        <path
          d="M 50,135 C 65,115 130,118 310,120 L 375,123 L 415,130 L 420,135 L 415,140 L 375,147 L 310,150 C 130,152 65,155 50,135 Z"
          fill="url(#maleFuselageGrad)"
          stroke="rgba(56, 189, 248, 0.5)"
          strokeWidth="1.4"
        />

        {/* Forward Avionics & Nose Sensor Probe */}
        <g
          id="hotspot-avionics"
          className="schematic-hotspot"
          style={{ cursor: "pointer" }}
          onClick={() => onSelectComponent("cht")}
          onMouseEnter={() =>
            setHoveredPart({
              id: "cht",
              name: "Nose Avionics & CHT Thermocouple Harness",
              status: chtStatus,
              valStr: `${cht.toFixed(1)} °C`,
            })
          }
          onMouseLeave={() => setHoveredPart(null)}
        >
          <ellipse
            cx="75"
            cy="135"
            rx="18"
            ry="11"
            fill={focusedComponent === "cht" ? "rgba(56, 189, 248, 0.35)" : "rgba(255, 255, 255, 0.04)"}
            stroke={chtColor}
            strokeWidth={focusedComponent === "cht" ? 2.5 : 1.5}
          />
          <circle cx="75" cy="135" r="4" fill={chtColor} filter="url(#glow-schematic)" />
          <text
            x="75"
            y="112"
            fill="#94a3b8"
            fontSize="7"
            fontFamily="'JetBrains Mono', monospace"
            textAnchor="middle"
            fontWeight="700"
          >
            AVIONICS / CHT
          </text>
          <line x1="75" y1="116" x2="75" y2="124" stroke="#64748b" strokeWidth="0.8" />
        </g>

        {/* High-Pressure Fuel Injection Rail */}
        <g
          id="hotspot-fuel"
          className="schematic-hotspot"
          style={{ cursor: "pointer" }}
          onClick={() => onSelectComponent("fuel_flow")}
          onMouseEnter={() =>
            setHoveredPart({
              id: "fuel_flow",
              name: "High-Pressure Fuel Injection Rail",
              status: fuelStatus,
              valStr: `${fuel.toFixed(1)} L/h`,
            })
          }
          onMouseLeave={() => setHoveredPart(null)}
        >
          <path
            d="M 235,130 L 290,130 L 320,126"
            fill="none"
            stroke={fuelColor}
            strokeWidth={focusedComponent === "fuel_flow" ? 2.5 : 1.8}
            strokeDasharray="4,2"
          />
          <circle cx="280" cy="130" r="3.5" fill={fuelColor} />
          <text
            x="280"
            y="114"
            fill="#94a3b8"
            fontSize="7"
            fontFamily="'JetBrains Mono', monospace"
            textAnchor="middle"
            fontWeight="700"
          >
            FUEL RAIL
          </text>
        </g>

        {/* Rear Engine Propulsion Bay (Cylinder Heads & Exhaust) */}
        <g
          id="hotspot-engine"
          className="schematic-hotspot"
          style={{ cursor: "pointer" }}
          onClick={() => onSelectComponent("egt")}
          onMouseEnter={() =>
            setHoveredPart({
              id: "egt",
              name: "Propulsion Engine Core & Exhaust Runners",
              status: egtStatus,
              valStr: `EGT ${egt.toFixed(1)} °C | CHT ${cht.toFixed(1)} °C`,
            })
          }
          onMouseLeave={() => setHoveredPart(null)}
        >
          {/* Cylinder Block */}
          <rect
            x="320"
            y="124"
            width="44"
            height="22"
            rx="3"
            fill={focusedComponent === "egt" || focusedComponent === "cht" ? "rgba(56, 189, 248, 0.25)" : "rgba(30, 41, 59, 0.8)"}
            stroke={egtColor}
            strokeWidth={focusedComponent === "egt" ? 2.5 : 1.5}
          />
          {/* 4 Cylinder Tops */}
          <rect x="325" y="121" width="7" height="4" fill={chtColor} rx="1" />
          <rect x="335" y="121" width="7" height="4" fill={chtColor} rx="1" />
          <rect x="345" y="121" width="7" height="4" fill={chtColor} rx="1" />
          <rect x="355" y="121" width="7" height="4" fill={chtColor} rx="1" />
          {/* Exhaust runner */}
          <path d="M 330,146 L 360,154" stroke={egtColor} strokeWidth="1.5" fill="none" />
          <text
            x="342"
            y="168"
            fill="#94a3b8"
            fontSize="7"
            fontFamily="'JetBrains Mono', monospace"
            textAnchor="middle"
            fontWeight="700"
          >
            ENGINE / EXHAUST
          </text>
        </g>

        {/* Lubrication Dry Sump & Scavenge Pump */}
        <g
          id="hotspot-oil"
          className="schematic-hotspot"
          style={{ cursor: "pointer" }}
          onClick={() => onSelectComponent("oil_pressure")}
          onMouseEnter={() =>
            setHoveredPart({
              id: "oil_pressure",
              name: "Lubrication Dry Sump & Oil Scavenge Circuit",
              status: oilPStatus,
              valStr: `${oilP.toFixed(1)} psi | ${oilT.toFixed(1)} °C`,
            })
          }
          onMouseLeave={() => setHoveredPart(null)}
        >
          <circle
            cx="378"
            cy="135"
            r="7.5"
            fill={focusedComponent === "oil_pressure" ? "rgba(56, 189, 248, 0.35)" : "rgba(15, 23, 42, 0.9)"}
            stroke={oilColor}
            strokeWidth={focusedComponent === "oil_pressure" ? 2.5 : 1.5}
          />
          <circle cx="378" cy="135" r="3" fill={oilColor} />
          <text
            x="378"
            y="114"
            fill="#94a3b8"
            fontSize="7"
            fontFamily="'JetBrains Mono', monospace"
            textAnchor="middle"
            fontWeight="700"
          >
            OIL SUMP
          </text>
        </g>

        {/* Dynafocal Engine Mounts & Vibration Accelerometer */}
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
            })
          }
          onMouseLeave={() => setHoveredPart(null)}
        >
          <circle cx="316" cy="120" r="3" fill={vibColor} />
          <circle cx="316" cy="150" r="3" fill={vibColor} />
        </g>

        {/* Rear Pusher Propeller (MALE UAV pusher propulsion configuration) */}
        <g
          id="hotspot-pusher-prop"
          className="schematic-hotspot"
          style={{ cursor: "pointer" }}
          onClick={() => onSelectComponent("rpm")}
          onMouseEnter={() =>
            setHoveredPart({
              id: "rpm",
              name: "Rear Pusher Propeller & Governor",
              status: rpmStatus,
              valStr: `${Math.round(rpm).toLocaleString()} RPM`,
            })
          }
          onMouseLeave={() => setHoveredPart(null)}
        >
          {/* Propeller Hub */}
          <polygon points="418,131 426,135 418,139" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />
          {/* Spinning Propeller Blades with dynamic animation */}
          <g transform="translate(424, 135)">
            <ellipse
              cx="0"
              cy="0"
              rx="2.5"
              ry="32"
              fill={rpmColor}
              opacity="0.8"
              style={{
                transformOrigin: "center",
                animation: `spin-pusher-prop ${spinDuration}s linear infinite`,
              }}
            />
          </g>
          <text
            x="455"
            y="138"
            fill="#94a3b8"
            fontSize="7"
            fontFamily="'JetBrains Mono', monospace"
            textAnchor="start"
            fontWeight="700"
          >
            PUSHER PROP
          </text>
        </g>
      </svg>

      <style jsx>{`
        @keyframes spin-pusher-prop {
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
