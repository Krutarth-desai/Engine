/**
 * lib/chartTheme.ts
 * Unified Chart Theming Utility for AeroTwin GCS.
 * Dynamically reads CSS custom properties from documentElement via getComputedStyle,
 * respects user motion preferences (prefers-reduced-motion), and ensures consistent
 * HUD/glassmorphism aesthetics across all Chart.js visualizations.
 */

import { ChartOptions } from "chart.js";

export interface ThemeColors {
  bgBase: string;
  bgSurface: string;
  bgCard: string;
  borderSubtle: string;
  borderGlow: string;
  accentCyan: string;
  accentBlue: string;
  accentEmerald: string;
  accentAmber: string;
  accentRose: string;
  accentPurple: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  gridColor: string;
  tooltipBg: string;
}

const FALLBACK_THEME: ThemeColors = {
  bgBase: "#070b14",
  bgSurface: "#0e1526",
  bgCard: "rgba(18, 28, 48, 0.75)",
  borderSubtle: "rgba(255, 255, 255, 0.08)",
  borderGlow: "rgba(56, 189, 248, 0.2)",
  accentCyan: "#38bdf8",
  accentBlue: "#2563eb",
  accentEmerald: "#10b981",
  accentAmber: "#f59e0b",
  accentRose: "#ef4444",
  accentPurple: "#a855f7",
  textPrimary: "#f8fafc",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  gridColor: "rgba(255, 255, 255, 0.06)",
  tooltipBg: "rgba(14, 21, 38, 0.94)",
};

/**
 * Reads live CSS custom properties from document.documentElement.
 */
export function getThemeColors(): ThemeColors {
  if (typeof window === "undefined" || !window.document?.documentElement) {
    return FALLBACK_THEME;
  }

  const styles = window.getComputedStyle(document.documentElement);
  const get = (prop: string, fallback: string) => styles.getPropertyValue(prop).trim() || fallback;

  return {
    bgBase: get("--bg-base", FALLBACK_THEME.bgBase),
    bgSurface: get("--bg-surface", FALLBACK_THEME.bgSurface),
    bgCard: get("--bg-card", FALLBACK_THEME.bgCard),
    borderSubtle: get("--border-subtle", FALLBACK_THEME.borderSubtle),
    borderGlow: get("--border-glow", FALLBACK_THEME.borderGlow),
    accentCyan: get("--accent-cyan", FALLBACK_THEME.accentCyan),
    accentBlue: get("--accent-blue", FALLBACK_THEME.accentBlue),
    accentEmerald: get("--accent-emerald", FALLBACK_THEME.accentEmerald),
    accentAmber: get("--accent-amber", FALLBACK_THEME.accentAmber),
    accentRose: get("--accent-rose", FALLBACK_THEME.accentRose),
    accentPurple: get("--accent-purple", FALLBACK_THEME.accentPurple),
    textPrimary: get("--text-primary", FALLBACK_THEME.textPrimary),
    textSecondary: get("--text-secondary", FALLBACK_THEME.textSecondary),
    textMuted: get("--text-muted", FALLBACK_THEME.textMuted),
    gridColor: "rgba(255, 255, 255, 0.06)",
    tooltipBg: "rgba(14, 21, 38, 0.94)",
  };
}

/**
 * Determines whether user prefers reduced motion.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Returns cohesive, accessible Chart.js base options.
 */
export function getBaseChartOptions<TType extends "line" | "scatter" | "bar">(
  custom?: ChartOptions<TType>
): ChartOptions<TType> {
  const theme = getThemeColors();
  const reducedMotion = prefersReducedMotion();

  const base: ChartOptions<TType> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: reducedMotion ? false : { duration: 250 },
    plugins: {
      legend: {
        display: true,
        position: "top",
        align: "end",
        labels: {
          color: theme.textSecondary,
          font: {
            family: "var(--font-jetbrains-mono), monospace",
            size: 11,
          },
          boxWidth: 12,
          boxHeight: 12,
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: theme.tooltipBg,
        borderColor: theme.borderGlow,
        borderWidth: 1,
        titleColor: theme.textPrimary,
        bodyColor: theme.textSecondary,
        padding: 10,
        cornerRadius: 6,
        titleFont: {
          family: "var(--font-jetbrains-mono), monospace",
          size: 11,
          weight: "bold",
        },
        bodyFont: {
          family: "var(--font-jetbrains-mono), monospace",
          size: 11,
        },
        displayColors: true,
      },
    },
    scales: {
      x: {
        grid: {
          color: theme.gridColor,
          drawOnChartArea: true,
        },
        ticks: {
          color: theme.textMuted,
          font: {
            family: "var(--font-jetbrains-mono), monospace",
            size: 10,
          },
        },
        border: {
          color: theme.borderSubtle,
        },
      },
      y: {
        grid: {
          color: theme.gridColor,
          drawOnChartArea: true,
        },
        ticks: {
          color: theme.textMuted,
          font: {
            family: "var(--font-jetbrains-mono), monospace",
            size: 10,
          },
        },
        border: {
          color: theme.borderSubtle,
        },
      },
    },
  } as unknown as ChartOptions<TType>;

  if (!custom) return base;

  // Merge custom over base
  return {
    ...base,
    ...custom,
    plugins: {
      ...(base?.plugins || {}),
      ...(custom?.plugins || {}),
    },
    scales: {
      ...(base?.scales || {}),
      ...(custom?.scales || {}),
    },
  };
}
