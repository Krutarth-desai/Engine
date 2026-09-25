"use client";

import React, { useEffect, useState } from "react";
import { TelemetryData } from "@/types/telemetry";
import { useTelemetry } from "@/context/TelemetryContext";
import DiagnosisAdvisory from "./diagnostics/DiagnosisAdvisory";
import RegressionScatterChart from "./diagnostics/RegressionScatterChart";
import { Activity } from "lucide-react";

interface DiagnosisPanelProps {
  telemetry: TelemetryData | null;
}

export default function DiagnosisPanel({ telemetry }: DiagnosisPanelProps) {
  const { historyBuffer } = useTelemetry();
  const [backendImage, setBackendImage] = useState<string | null>(null);

  // Poll regression plot every 5 seconds (backend fallback)
  useEffect(() => {
    let isMounted = true;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

    const fetchPlot = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/regression_plot?type=cht_rpm`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.image) {
            setBackendImage(json.image);
          }
        }
      } catch {
        // Silent catch for background poller
      }
    };

    fetchPlot();
    const interval = setInterval(fetchPlot, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="panel diagnosis-panel" style={{ height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
      <div className="panel-header">
        <div className="panel-title flex items-center gap-2">
          <Activity className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <span>Physics Health &amp; Subsystem Diagnosis</span>
        </div>
        <span className="overview-badge font-mono">
          DIGITAL TWIN RESIDUAL: &lt; 2.5%
        </span>
      </div>

      {/* 1. Propulsion Health Advisory & Directive */}
      <DiagnosisAdvisory telemetry={telemetry} />

      {/* 2. Real-Time Telemetry Feature Regression Scatter & OLS Fit */}
      <div className="diag-section-header mt-4 mb-2 flex justify-between items-center">
        <span className="font-bold text-xs tracking-wider uppercase text-slate-300">
          Telemetry Feature Regression (CHT vs RPM)
        </span>
        <span className="font-mono text-xs" style={{ color: "var(--accent)" }}>
          LIVE BUFFER ({historyBuffer.length} PTS)
        </span>
      </div>

      {/* Native Chart.js Scatter + OLS line with loading skeleton & backend fallback */}
      <RegressionScatterChart
        points={historyBuffer}
        plotType="cht_rpm"
        minPoints={5}
        backendImage={backendImage}
      />
    </div>
  );
}
