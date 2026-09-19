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
        return <Flame className="w-3.5 h-3.5 text-amber-400" />;
      case "LUBRICATION":
        return <Droplets className="w-3.5 h-3.5 text-blue-400" />;
      case "COMBUSTION":
        return <Flame className="w-3.5 h-3.5 text-orange-400" />;
      case "MECHANICAL":
        return <Activity className="w-3.5 h-3.5 text-purple-400" />;
      case "AVIONICS":
        return <Radio className="w-3.5 h-3.5 text-cyan-400" />;
      case "IGNITION":
        return <Zap className="w-3.5 h-3.5 text-yellow-400" />;
      case "PROPULSION":
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />;
      case "NORMAL":
      default:
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
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
            <RotateCcw className="w-3.5 h-3.5" />
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
        >
          <div className="panel-title flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-cyan-400" />
            <span>Fault Injection Simulation Matrix</span>
            <span className="sim-badge-count font-mono">
              ({SCENARIO_REGISTRY.length} SCENARIOS)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="sim-active-indicator font-mono">
              ACTIVE: <strong className="text-cyan-400">{currentScenario.label}</strong>
            </span>
            <button
              className="sim-toggle-btn"
              aria-label={isExpanded ? "Collapse simulation section" : "Expand simulation section"}
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
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
