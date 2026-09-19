"use client";

import React, { useState } from "react";
import { UnifiedTelemetryPayload } from "@/types/telemetry";
import { ChevronDown, ChevronRight, Layers } from "lucide-react";

interface SubsystemHealthCardProps {
  payload: UnifiedTelemetryPayload;
}

interface SubsystemItem {
  id: string;
  name: string;
  health: number;
  drivers: Array<{ name: string; value: string; status: "NORMAL" | "CAUTION" | "ALERT" }>;
}

export default function SubsystemHealthCard({ payload }: SubsystemHealthCardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Extract actual telemetry values with safe fallbacks
  const cht = payload.sensors?.cht?.value ?? payload.cht_c ?? 142.0;
  const egt = payload.sensors?.egt?.value ?? payload.egt_c ?? 615.0;
  const oilP = payload.sensors?.oil_pressure?.value ?? (payload.oil_pressure_bar ? payload.oil_pressure_bar * 14.5038 : 68.0);
  const oilT = payload.sensors?.oil_temperature?.value ?? payload.oil_temperature_c ?? 92.0;
  const fuel = payload.sensors?.fuel_flow?.value ?? payload.fuel_flow_lh ?? 17.6;
  const vib = payload.sensors?.vibration?.value ?? payload.vibration_g ?? 1.42;
  const busVoltage = payload.sensors?.bus_voltage?.value ?? payload.battery_voltage_v ?? 28.2;
  const overallHealth = payload.health_index ?? 96;

  // Subsystem definitions with dynamic drivers
  const subsystems: SubsystemItem[] = [
    {
      id: "cylinders",
      name: "Cylinder & Combustion",
      health: Math.min(100, Math.round(overallHealth * 0.99)),
      drivers: [
        { name: "CHT Avg", value: `${cht.toFixed(1)} °C`, status: cht > 165 ? "ALERT" : cht > 150 ? "CAUTION" : "NORMAL" },
        { name: "EGT Avg", value: `${egt.toFixed(0)} °C`, status: egt > 800 ? "ALERT" : egt > 750 ? "CAUTION" : "NORMAL" },
      ],
    },
    {
      id: "lubrication",
      name: "Lubrication System",
      health: Math.min(100, Math.round(overallHealth * 1.01)),
      drivers: [
        { name: "Oil Pressure", value: `${(oilP / 14.5038).toFixed(2)} bar`, status: oilP < 30 ? "ALERT" : oilP < 45 ? "CAUTION" : "NORMAL" },
        { name: "Oil Temp", value: `${oilT.toFixed(1)} °C`, status: oilT > 120 ? "ALERT" : oilT > 110 ? "CAUTION" : "NORMAL" },
      ],
    },
    {
      id: "fuel",
      name: "Fuel Rail & Delivery",
      health: Math.min(100, Math.round(overallHealth * 0.98)),
      drivers: [
        { name: "Fuel Flow", value: `${fuel.toFixed(1)} L/h`, status: fuel > 28 ? "CAUTION" : "NORMAL" },
        { name: "Fuel Rail Rem", value: "48.2 L", status: "NORMAL" },
      ],
    },
    {
      id: "turbo",
      name: "Turbo & Induction",
      health: Math.min(100, Math.round(overallHealth * 0.97)),
      drivers: [
        { name: "Manifold Press", value: "1.24 bar", status: "NORMAL" },
        { name: "Vibration FFT", value: `${vib.toFixed(2)} g`, status: vib > 2.8 ? "ALERT" : vib > 2.2 ? "CAUTION" : "NORMAL" },
      ],
    },
    {
      id: "avionics",
      name: "Avionics & Bus",
      health: 99,
      drivers: [
        { name: "Bus Voltage", value: `${busVoltage.toFixed(1)} V`, status: busVoltage < 24 ? "ALERT" : "NORMAL" },
        { name: "Sync Frequency", value: "10.0 Hz", status: "NORMAL" },
      ],
    },
  ];

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div
      className="card"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "0.75rem 1rem",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", flexShrink: 0 }}>
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.05em",
            color: "var(--text-faint)",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <Layers size={13} style={{ color: "var(--accent)" }} />
          Subsystem Health Index
        </span>
        <span
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono), monospace",
          }}
        >
          5 SUBSYSTEMS
        </span>
      </div>

      {/* Subsystems List */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.35rem",
          overflowY: "auto",
          flex: 1,
          minHeight: 0,
          paddingRight: "0.15rem",
        }}
      >
        {subsystems.map((sub) => {
          const isExpanded = expandedId === sub.id;
          const barColor =
            sub.health >= 85
              ? "var(--accent)"
              : sub.health >= 65
              ? "var(--status-caution)"
              : "var(--status-warning)";

          return (
            <div
              key={sub.id}
              style={{
                background: isExpanded ? "var(--surface-2)" : "transparent",
                border: `1px solid ${isExpanded ? "var(--border-strong)" : "var(--border)"}`,
                borderRadius: "6px",
                padding: "0.35rem 0.55rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onClick={() => toggleExpand(sub.id)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  {isExpanded ? (
                    <ChevronDown size={13} style={{ color: "var(--accent)" }} />
                  ) : (
                    <ChevronRight size={13} style={{ color: "var(--text-faint)" }} />
                  )}
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--text)",
                    }}
                  >
                    {sub.name}
                  </span>
                </div>

                <span
                  className="font-mono tabular-nums"
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--text)",
                  }}
                >
                  {sub.health}%
                </span>
              </div>

              {/* Neutral progress bar */}
              <div
                style={{
                  height: "3px",
                  background: "var(--surface-3)",
                  borderRadius: "2px",
                  overflow: "hidden",
                  marginTop: "0.3rem",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${sub.health}%`,
                    background: barColor,
                    borderRadius: "2px",
                  }}
                />
              </div>

              {/* Expandable row drivers */}
              {isExpanded && (
                <div
                  style={{
                    marginTop: "0.45rem",
                    paddingTop: "0.4rem",
                    borderTop: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: "10.5px",
                      color: "var(--text-faint)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Top Sensor Drivers:
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem" }}>
                    {sub.drivers.map((d) => (
                      <div
                        key={d.name}
                        style={{
                          background: "var(--surface-1)",
                          borderRadius: "4px",
                          padding: "0.25rem 0.4rem",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "11px",
                        }}
                      >
                        <span style={{ color: "var(--text-muted)" }}>{d.name}</span>
                        <span className="font-mono tabular-nums" style={{ color: "var(--text)", fontWeight: 500 }}>
                          {d.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
