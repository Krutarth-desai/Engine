"use client";

import React, { useState } from "react";
import { SCENARIO_REGISTRY, ScenarioItem } from "@/lib/scenarios";
import { useTelemetry } from "@/context/TelemetryContext";
import {
  ChevronDown,
  ChevronUp,
  RotateCcw,
  FlaskConical,
  Flame,
  Droplets,
  Activity,
  Radio,
  Zap,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface FaultInjectionPanelProps {
  defaultExpanded?: boolean;
  compact?: boolean;
}

export default function FaultInjectionPanel({
  defaultExpanded = false,
  compact = false,
}: FaultInjectionPanelProps) {
  const { activeScenario, injectScenario, resetScenario } = useTelemetry();
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  const isSimulationActive = activeScenario !== "Normal";
  const currentScenario =
    SCENARIO_REGISTRY.find((s) => s.id === activeScenario) || SCENARIO_REGISTRY[0];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "THERMAL":
        return <Flame size={14} style={{ color: "var(--status-caution)" }} />;
      case "LUBRICATION":
        return <Droplets size={14} style={{ color: "var(--accent)" }} />;
      case "COMBUSTION":
        return <Flame size={14} style={{ color: "var(--status-caution)" }} />;
      case "MECHANICAL":
        return <Activity size={14} style={{ color: "var(--surface-3)" }} />;
      case "AVIONICS":
        return <Radio size={14} style={{ color: "var(--accent)" }} />;
      case "IGNITION":
        return <Zap size={14} style={{ color: "var(--status-caution)" }} />;
      case "PROPULSION":
        return <AlertTriangle size={14} style={{ color: "var(--status-warning)" }} />;
      case "NORMAL":
      default:
        return <CheckCircle2 size={14} style={{ color: "var(--status-nominal)" }} />;
    }
  };

  return (
    <div className="fault-injection-wrapper">
      {/* Persistent Active Simulation Banner */}
      {isSimulationActive && (
        <div className="simulation-active-banner" role="status" aria-live="polite">
          <div className="sim-banner-content">
            <span className="sim-pulse-dot" />
            <span className="sim-banner-label">
              SIMULATION ACTIVE: <strong>{currentScenario.label.toUpperCase()}</strong>
            </span>
            <span className="sim-category-tag">{currentScenario.category}</span>
          </div>
          <button
            className="sim-reset-btn"
            onClick={resetScenario}
            title="Restore Nominal Cruise Baseline"
          >
            <RotateCcw size={13} />
            <span>Reset to Nominal</span>
          </button>
        </div>
      )}

      {/* Collapsible Simulation Section */}
      <div className="panel simulation-panel">
        <div
          className="panel-header sim-panel-header cursor-pointer select-none"
          onClick={() => setIsExpanded(!isExpanded)}
          role="button"
          aria-expanded={isExpanded}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsExpanded(!isExpanded);
            }
          }}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FlaskConical size={16} style={{ color: "var(--accent)" }} />
            <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Fault Injection Simulation Matrix</span>
            <span className="sim-badge-count font-mono" style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
              ({SCENARIO_REGISTRY.length} SCENARIOS)
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="sim-active-indicator font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              ACTIVE: <strong style={{ color: "var(--accent)" }}>{currentScenario.label}</strong>
            </span>
            <button
              className="sim-toggle-btn"
              aria-label={isExpanded ? "Collapse simulation section" : "Expand simulation section"}
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              style={{
                background: "var(--border)",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                color: "var(--text-muted)",
                padding: "0.2rem 0.45rem",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                minHeight: "26px",
              }}
            >
              {isExpanded ? (
                <ChevronUp size={14} style={{ color: "var(--text-muted)" }} />
              ) : (
                <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
              )}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="simulation-content-body">
            <p className="sim-instructions-text">
              Inject synthetic operational degradation and multi-sensor failures to test real-time PHM isolation, cross-regression models, and RUL decay response.
            </p>

            <div className={`simulation-grid ${compact ? "compact-grid" : ""}`}>
              {SCENARIO_REGISTRY.map((sc: ScenarioItem) => {
                const isActive = activeScenario === sc.id;
                const isNominal = sc.id === "Normal";

                return (
                  <button
                    key={sc.id}
                    className={`scenario-card ${isActive ? "active" : ""} ${
                      isNominal ? "nominal-card" : ""
                    }`}
                    onClick={() => injectScenario(sc.id)}
                    title={sc.description}
                  >
                    <div className="scenario-card-header">
                      <span className="scenario-card-label font-semibold">
                        {sc.label}
                      </span>
                      <div className="scenario-category-chip">
                        {getCategoryIcon(sc.category)}
                        <span className="font-mono text-xs">{sc.category}</span>
                      </div>
                    </div>

                    <p className="scenario-card-desc">{sc.description}</p>

                    <div className="scenario-card-footer">
                      <span className="target-component-tag">
                        Target: {sc.affectedComponent}
                      </span>
                      {isActive && (
                        <span className="active-tag-pill">ACTIVE</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
