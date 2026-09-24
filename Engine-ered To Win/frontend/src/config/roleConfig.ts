import { NavView } from "@/components/Sidebar";

// ──────────────────────────────────────────────────────────────
// AeroTwin Role Definitions & Per-Role Dashboard Configuration
// ──────────────────────────────────────────────────────────────

export type UserRole = "gcs_operator" | "propulsion_engineer" | "maintenance_tech" | "unset";

export interface RoleMeta {
  id: UserRole;
  label: string;
  shortLabel: string;
  tagline: string;
  description: string;
  icon: string;
  accentColor: string;
  accentBg: string;
}

export interface RoleDashboardConfig {
  /** Which sidebar NavViews this role can access */
  allowedViews: NavView[];
  /** Dashboard panel composition keys for the main dashboard home view */
  dashboardPanels: string[];
}

// ── Role Metadata (used in header badge + role selection screen) ──

export const ROLE_META: Record<Exclude<UserRole, "unset">, RoleMeta> = {
  gcs_operator: {
    id: "gcs_operator",
    label: "GCS Operator",
    shortLabel: "GCS OPS",
    tagline: "Mission Command & Control",
    description:
      "Monitor live missions, manage telemetry streams, control environment parameters, record flights, and respond to real-time alerts.",
    icon: "🎯",
    accentColor: "#38bdf8",
    accentBg: "rgba(56, 189, 248, 0.12)",
  },
  propulsion_engineer: {
    id: "propulsion_engineer",
    label: "Propulsion Engineer",
    shortLabel: "PROPULSION",
    tagline: "Engine Performance Analytics",
    description:
      "Analyze digital twin residuals, inject fault scenarios, study regression trends, and evaluate RUL prognostics for engine performance optimization.",
    icon: "⚙️",
    accentColor: "#a855f7",
    accentBg: "rgba(168, 85, 247, 0.12)",
  },
  maintenance_tech: {
    id: "maintenance_tech",
    label: "Maintenance Technician",
    shortLabel: "MAINTENANCE",
    tagline: "Health Monitoring & Repair",
    description:
      "Track subsystem health indices, review sensor diagnosis results, manage maintenance advisories, and inspect anomaly history for scheduled overhauls.",
    icon: "🔧",
    accentColor: "#10b981",
    accentBg: "rgba(16, 185, 129, 0.12)",
  },
};

// ── Per-Role Dashboard Configuration ──

export const ROLE_DASHBOARD_CONFIG: Record<Exclude<UserRole, "unset">, RoleDashboardConfig> = {
  gcs_operator: {
    allowedViews: ["dashboard", "telemetry", "alerts"],
    dashboardPanels: [
      "replay_controls",
      "digital_twin_centerpiece",
      "engine_health",
      "rul_card",
      "engine_status_grid",
      "environment_panel",
      "mission_phase_timeline",
      "mission_recording",
      "mission_history",
    ],
  },
  propulsion_engineer: {
    allowedViews: ["dashboard", "telemetry", "diagnostics", "rul", "regression"],
    dashboardPanels: [
      "replay_controls",
      "digital_twin_centerpiece",
      "engine_health",
      "rul_card",
      "engine_status_grid",
      "fault_diagnosis",
      "fault_injection",
      "subsystem_health",
      "digital_twin_comparison",
      "residual_panel",
      "environment_panel",
    ],
  },
  maintenance_tech: {
    allowedViews: ["dashboard", "diagnostics", "rul", "maintenance", "alerts"],
    dashboardPanels: [
      "replay_controls",
      "engine_health",
      "rul_card",
      "engine_status_grid",
      "fault_diagnosis",
      "fault_injection",
      "subsystem_health",
      "maintenance_advisory",
      "mission_history",
    ],
  },
};

/** Helper to check if a view is allowed for a given role */
export function isViewAllowed(role: UserRole, view: NavView): boolean {
  if (role === "unset") return false;
  return ROLE_DASHBOARD_CONFIG[role].allowedViews.includes(view);
}

/** Helper to check if a dashboard panel should be shown for a given role */
export function isPanelAllowed(role: UserRole, panelKey: string): boolean {
  if (role === "unset") return false;
  return ROLE_DASHBOARD_CONFIG[role].dashboardPanels.includes(panelKey);
}

/** Get the default landing view for a role */
export function getDefaultView(role: UserRole): NavView {
  if (role === "unset") return "dashboard";
  return ROLE_DASHBOARD_CONFIG[role].allowedViews[0] || "dashboard";
}
