"use client";

import React, { createContext, useContext, useState } from "react";
import { NavView } from "@/components/Sidebar";

export type WorkstationProfile = "operator" | "maintenance" | "propulsion";

export interface ProfileDefinition {
  id: WorkstationProfile;
  title: string;
  shortTitle: string;
  roleTag: string;
  mainQuestion: string;
  targetPersona: string;
  hierarchyLevel: string;
  badgeLabel: string;
  description: string;
  defaultView: NavView;
  allowedViews: NavView[];
  faultInjectionTier: "none" | "preset" | "full";
  badgeColor: string;
  badgeBorder: string;
}

export const WORKSTATION_PROFILES: Record<WorkstationProfile, ProfileDefinition> = {
  operator: {
    id: "operator",
    title: "GCS Operator Dashboard",
    shortTitle: "GCS Operator",
    roleTag: "OPERATOR",
    mainQuestion: "Is the engine safe and what is happening right now?",
    targetPersona: "UAV External Pilot / Flight Engineer",
    hierarchyLevel: "Tier 1 (Operational Awareness)",
    badgeLabel: "OPERATIONAL GCS",
    description:
      "Prioritizes rapid situational awareness, flight envelope safety, and real-time decision making. Emphasizes clean aviation readouts, large numbers, prominent alerts, and flight timelines while concealing complex ML parameters and fault injection controls to prevent in-flight confusion.",
    defaultView: "dashboard",
    allowedViews: ["dashboard", "telemetry", "mission", "alerts", "settings"],
    faultInjectionTier: "none",
    badgeColor: "var(--accent)",
    badgeBorder: "var(--border-strong)",
  },
  maintenance: {
    id: "maintenance",
    title: "Maintenance Team Dashboard",
    shortTitle: "Maintenance Team",
    roleTag: "MAINTENANCE",
    mainQuestion: "What needs maintenance and when?",
    targetPersona: "Ground Support Lead / Propulsion Technician",
    hierarchyLevel: "Tier 2 (Diagnosis & Maintenance Planning)",
    badgeLabel: "PREDICTIVE MAINT",
    description:
      "Dedicated condition-based predictive maintenance workstation. Emphasizes component health, degradation trajectories, RUL countdown, turnaround checklists, historical logs, and work orders. Provides controlled access to preset failure scenarios for sensor validation.",
    defaultView: "dashboard",
    allowedViews: ["dashboard", "maintenance", "rul", "diagnostics", "alerts", "telemetry", "faults", "settings"],
    faultInjectionTier: "preset",
    badgeColor: "var(--status-caution)",
    badgeBorder: "var(--status-caution)",
  },
  propulsion: {
    id: "propulsion",
    title: "Propulsion Engineer Dashboard",
    shortTitle: "Propulsion Engineer",
    roleTag: "PROPULSION ENG",
    mainQuestion: "Why is the engine behaving this way, and how is it degrading?",
    targetPersona: "Powertrain Architect / Digital Twin Specialist",
    hierarchyLevel: "Tier 3 (Deep Analysis & Model Control)",
    badgeLabel: "PROPULSION ENG",
    description:
      "Deep analytical engineering suite centered around the Digital Twin. Explores thermodynamic coupling, 4-grid multi-correlation regression, actual vs. predicted physics models, FFT vibration spectrum, sensor fusion, and unrestricted fault injection simulation.",
    defaultView: "dashboard",
    allowedViews: ["dashboard", "physics-model", "telemetry", "diagnostics", "rul", "mission", "faults", "maintenance", "alerts", "settings"],
    faultInjectionTier: "full",
    badgeColor: "var(--status-nominal)",
    badgeBorder: "var(--status-nominal)",
  },
};

export interface MatrixRow {
  category: string;
  capability: string;
  operator: string;
  operatorStatus: "full" | "limited" | "none";
  maintenance: string;
  maintenanceStatus: "full" | "limited" | "none";
  propulsion: string;
  propulsionStatus: "full" | "limited" | "none";
}

export const ACCESS_MATRIX_DATA: MatrixRow[] = [
  {
    category: "Telemetry & Core Health",
    capability: "Real-time Engine Health",
    operator: "Full",
    operatorStatus: "full",
    maintenance: "Full",
    maintenanceStatus: "full",
    propulsion: "Full",
    propulsionStatus: "full",
  },
  {
    category: "Telemetry & Core Health",
    capability: "Core Propulsion Sensors (RPM, CHT, EGT, Oil P, Oil T, Fuel Flow)",
    operator: "Full (Live 1 Hz)",
    operatorStatus: "full",
    maintenance: "Full (Live 1 Hz)",
    maintenanceStatus: "full",
    propulsion: "Full (Live 1 Hz)",
    propulsionStatus: "full",
  },
  {
    category: "Telemetry & Core Health",
    capability: "Vibration & Dynamic Rotor Harmonics",
    operator: "Basic (g RMS)",
    operatorStatus: "limited",
    maintenance: "Detailed (Multi-axis)",
    maintenanceStatus: "full",
    propulsion: "Advanced (Full Harmonics)",
    propulsionStatus: "full",
  },
  {
    category: "Telemetry & Core Health",
    capability: "Battery / Alternator Bus Voltage",
    operator: "Full (28V Bus)",
    operatorStatus: "full",
    maintenance: "Full (Float & Load)",
    maintenanceStatus: "full",
    propulsion: "Full (Power Budget)",
    propulsionStatus: "full",
  },
  {
    category: "Telemetry & Core Health",
    capability: "Dual Injection Timing Advance",
    operator: "Basic (Deg BTDC)",
    operatorStatus: "limited",
    maintenance: "Detailed (E-Gap)",
    maintenanceStatus: "full",
    propulsion: "Advanced (Mapping)",
    propulsionStatus: "full",
  },
  {
    category: "Telemetry & Core Health",
    capability: "Engine Health Index (EHI)",
    operator: "Full (0-100%)",
    operatorStatus: "full",
    maintenance: "Full (0-100%)",
    maintenanceStatus: "full",
    propulsion: "Full (0-100%)",
    propulsionStatus: "full",
  },
  {
    category: "AI/ML & Diagnostics",
    capability: "Fault Alerts & Warnings",
    operator: "Critical / Operational",
    operatorStatus: "full",
    maintenance: "Detailed (PHM Log)",
    maintenanceStatus: "full",
    propulsion: "Detailed (Diagnostics)",
    propulsionStatus: "full",
  },
  {
    category: "AI/ML & Diagnostics",
    capability: "Anomaly Score",
    operator: "Basic (Score & Status)",
    operatorStatus: "limited",
    maintenance: "Full (Subsystem Attribution)",
    maintenanceStatus: "full",
    propulsion: "Advanced (Latent Vector)",
    propulsionStatus: "full",
  },
  {
    category: "AI/ML & Diagnostics",
    capability: "Fault Classification",
    operator: "Summary",
    operatorStatus: "limited",
    maintenance: "Full (9 Categories)",
    maintenanceStatus: "full",
    propulsion: "Detailed (SHAP Divergence)",
    propulsionStatus: "full",
  },
  {
    category: "AI/ML & Diagnostics",
    capability: "Remaining Useful Life (RUL)",
    operator: "Full (Flight Margin)",
    operatorStatus: "full",
    maintenance: "Primary (Cycles to TBO)",
    maintenanceStatus: "full",
    propulsion: "Full (LSTM Prognostics)",
    propulsionStatus: "full",
  },
  {
    category: "AI/ML & Diagnostics",
    capability: "Degradation Trends",
    operator: "Basic (30-Cycle)",
    operatorStatus: "limited",
    maintenance: "Primary (Weibull Wear)",
    maintenanceStatus: "full",
    propulsion: "Advanced (Regression)",
    propulsionStatus: "full",
  },
  {
    category: "Operations & Maintenance",
    capability: "Maintenance Recommendations",
    operator: "View Only",
    operatorStatus: "limited",
    maintenance: "Manage & Sign-off",
    maintenanceStatus: "full",
    propulsion: "Engineering Review",
    propulsionStatus: "full",
  },
  {
    category: "Operations & Maintenance",
    capability: "Fault History Log",
    operator: "Current Mission",
    operatorStatus: "limited",
    maintenance: "Full Lifetime Archive",
    maintenanceStatus: "full",
    propulsion: "Full Lifetime Archive",
    propulsionStatus: "full",
  },
  {
    category: "Operations & Maintenance",
    capability: "Mission History & Sorties",
    operator: "Full (Current Sortie)",
    operatorStatus: "full",
    maintenance: "Full (Cumulative)",
    maintenanceStatus: "full",
    propulsion: "Full (Fleet Wide)",
    propulsionStatus: "full",
  },
  {
    category: "Operations & Maintenance",
    capability: "Historical Mission Replay",
    operator: "Basic Timeline",
    operatorStatus: "limited",
    maintenance: "Full Sensor Playback",
    maintenanceStatus: "full",
    propulsion: "Advanced Synchronized",
    propulsionStatus: "full",
  },
  {
    category: "Digital Twin & Physics Models",
    capability: "Digital Twin Status & Sync",
    operator: "Status Indicator",
    operatorStatus: "full",
    maintenance: "Status & Residual Bounds",
    maintenanceStatus: "full",
    propulsion: "Full Model & Coupling",
    propulsionStatus: "full",
  },
  {
    category: "Digital Twin & Physics Models",
    capability: "Actual vs. Predicted Waveforms",
    operator: "Restricted",
    operatorStatus: "none",
    maintenance: "Summary Residuals",
    maintenanceStatus: "limited",
    propulsion: "Full High-Fidelity",
    propulsionStatus: "full",
  },
  {
    category: "Digital Twin & Physics Models",
    capability: "Thermodynamic & Physics Model",
    operator: "Restricted",
    operatorStatus: "none",
    maintenance: "Results Only (Health %)",
    maintenanceStatus: "limited",
    propulsion: "Full (Equations & States)",
    propulsionStatus: "full",
  },
  {
    category: "Digital Twin & Physics Models",
    capability: "Engine Performance Maps",
    operator: "Restricted",
    operatorStatus: "none",
    maintenance: "Summary (Cruise Point)",
    maintenanceStatus: "limited",
    propulsion: "Full (BSFC & Envelopes)",
    propulsionStatus: "full",
  },
  {
    category: "Digital Twin & Physics Models",
    capability: "Sensor Fusion / State Estimation",
    operator: "Restricted",
    operatorStatus: "none",
    maintenance: "Residual Results",
    maintenanceStatus: "limited",
    propulsion: "Full Kalman State Vectors",
    propulsionStatus: "full",
  },
  {
    category: "Digital Twin & Physics Models",
    capability: "Vibration Spectrum / FFT",
    operator: "Restricted",
    operatorStatus: "none",
    maintenance: "Peak Harmonics",
    maintenanceStatus: "full",
    propulsion: "Advanced Waterfall FFT",
    propulsionStatus: "full",
  },
  {
    category: "Digital Twin & Physics Models",
    capability: "Sensor Drift & Isolation Analysis",
    operator: "Alert Notification",
    operatorStatus: "limited",
    maintenance: "Full Cross-Check",
    maintenanceStatus: "full",
    propulsion: "Detailed Isolation Vector",
    propulsionStatus: "full",
  },
  {
    category: "Simulation & Modeling",
    capability: "Mission Scenario Simulation",
    operator: "Restricted (Safety Lock)",
    operatorStatus: "none",
    maintenance: "Preset Scenarios Only",
    maintenanceStatus: "limited",
    propulsion: "Full Control (9 Scenarios)",
    propulsionStatus: "full",
  },
  {
    category: "Simulation & Modeling",
    capability: "Environmental Simulation",
    operator: "Restricted (Safety Lock)",
    operatorStatus: "none",
    maintenance: "Ambient View",
    maintenanceStatus: "limited",
    propulsion: "Full ISA Atmosphere Control",
    propulsionStatus: "full",
  },
  {
    category: "Simulation & Modeling",
    capability: "AI/ML Model Explanations (SHAP)",
    operator: "Simplified",
    operatorStatus: "limited",
    maintenance: "Subsystem Health",
    maintenanceStatus: "full",
    propulsion: "Detailed Game Vectors",
    propulsionStatus: "full",
  },
  {
    category: "Simulation & Modeling",
    capability: "Maintenance Audit & Dossier Reports",
    operator: "View / Export PDF",
    operatorStatus: "limited",
    maintenance: "Create, Sign & Export",
    maintenanceStatus: "full",
    propulsion: "Technical Review & Sign",
    propulsionStatus: "full",
  },
  {
    category: "Simulation & Modeling",
    capability: "Engine Physical Configuration",
    operator: "Restricted",
    operatorStatus: "none",
    maintenance: "Limited Field Tolerances",
    maintenanceStatus: "limited",
    propulsion: "Full Calibration Control",
    propulsionStatus: "full",
  },
  {
    category: "Simulation & Modeling",
    capability: "Model Parameter Modification",
    operator: "Restricted",
    operatorStatus: "none",
    maintenance: "Restricted",
    maintenanceStatus: "none",
    propulsion: "Full Parameter Tuning",
    propulsionStatus: "full",
  },
  {
    category: "Simulation & Modeling",
    capability: "Raw Telemetry & High-Rate Data Export",
    operator: "Limited (Incident PDF)",
    operatorStatus: "limited",
    maintenance: "CSV Inspection Logs",
    maintenanceStatus: "full",
    propulsion: "Full High-Rate JSON/CSV",
    propulsionStatus: "full",
  },
];

export interface FaultInjectionRow {
  feature: string;
  operator: string;
  operatorAllowed: boolean;
  maintenance: string;
  maintenanceAllowed: boolean;
  propulsion: string;
  propulsionAllowed: boolean;
}

export const FAULT_INJECTION_MATRIX: FaultInjectionRow[] = [
  {
    feature: "Fault Injection Simulation Access",
    operator: "Concealed (Safety Lock)",
    operatorAllowed: false,
    maintenance: "Limited / Preset Scenarios",
    maintenanceAllowed: true,
    propulsion: "Full Interactive Matrix",
    propulsionAllowed: true,
  },
  {
    feature: "Simulate Misfire",
    operator: "Restricted",
    operatorAllowed: false,
    maintenance: "Preset Scenarios Only",
    maintenanceAllowed: true,
    propulsion: "Full Injection Control",
    propulsionAllowed: true,
  },
  {
    feature: "Simulate Injector Fault",
    operator: "Restricted",
    operatorAllowed: false,
    maintenance: "Preset Scenarios Only",
    maintenanceAllowed: true,
    propulsion: "Full Injection Control",
    propulsionAllowed: true,
  },
  {
    feature: "Simulate Overheating (Cooling Loss)",
    operator: "Restricted",
    operatorAllowed: false,
    maintenance: "Preset Scenarios Only",
    maintenanceAllowed: true,
    propulsion: "Full Injection Control",
    propulsionAllowed: true,
  },
  {
    feature: "Simulate Vibration Fault (Bearing Wear)",
    operator: "Restricted",
    operatorAllowed: false,
    maintenance: "Preset Scenarios Only",
    maintenanceAllowed: true,
    propulsion: "Full Injection Control",
    propulsionAllowed: true,
  },
  {
    feature: "Simulate Sensor Failure / Signal Drift",
    operator: "Restricted",
    operatorAllowed: false,
    maintenance: "Full Validation Control",
    maintenanceAllowed: true,
    propulsion: "Full Validation Control",
    propulsionAllowed: true,
  },
  {
    feature: "Create Custom Fault Scenario",
    operator: "Restricted",
    operatorAllowed: false,
    maintenance: "Restricted",
    maintenanceAllowed: false,
    propulsion: "Full Calibration Control",
    propulsionAllowed: true,
  },
  {
    feature: "Adjust Fault Severity & Dynamics",
    operator: "Restricted",
    operatorAllowed: false,
    maintenance: "Preset Fixed Magnitude",
    maintenanceAllowed: false,
    propulsion: "Full Slider Dynamic Tuning",
    propulsionAllowed: true,
  },
  {
    feature: "Run Simulation & Analyze Response",
    operator: "Restricted",
    operatorAllowed: false,
    maintenance: "Preset Model Validation",
    maintenanceAllowed: true,
    propulsion: "Full Closed-Loop Analysis",
    propulsionAllowed: true,
  },
];

interface ProfileContextType {
  profile: WorkstationProfile;
  profileDef: ProfileDefinition;
  setProfile: (profile: WorkstationProfile) => void;
  canAccessView: (view: NavView) => boolean;
  canAccessFaultInjection: boolean;
  faultInjectionTier: "none" | "preset" | "full";
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<WorkstationProfile>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("aerotwin_profile") as WorkstationProfile | null;
        if (saved && WORKSTATION_PROFILES[saved]) {
          return saved;
        }
      } catch {
        // Storage access restricted
      }
    }
    return "propulsion";
  });

  const setProfile = (newProfile: WorkstationProfile) => {
    setProfileState(newProfile);
    try {
      localStorage.setItem("aerotwin_profile", newProfile);
    } catch {
      // Storage access restricted
    }
  };

  const profileDef = WORKSTATION_PROFILES[profile];

  const canAccessView = (view: NavView): boolean => {
    return profileDef.allowedViews.includes(view);
  };

  const canAccessFaultInjection = profileDef.faultInjectionTier !== "none";
  const faultInjectionTier = profileDef.faultInjectionTier;

  return (
    <ProfileContext.Provider
      value={{
        profile,
        profileDef,
        setProfile,
        canAccessView,
        canAccessFaultInjection,
        faultInjectionTier,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    return {
      profile: "propulsion" as WorkstationProfile,
      profileDef: WORKSTATION_PROFILES.propulsion,
      setProfile: () => {},
      canAccessView: () => true,
      canAccessFaultInjection: true,
      faultInjectionTier: "full" as const,
    };
  }
  return context;
}
