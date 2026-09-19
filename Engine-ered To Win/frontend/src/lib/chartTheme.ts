/**
 * lib/chartTheme.ts
 * Unified Chart Theming Utility for AeroTwin GCS.
 * Dynamically reads CSS custom properties from documentElement via getComputedStyle,
 * respects user motion preferences (prefers-reduced-motion), and ensures consistent
 * HUD/glassmorphism aesthetics across all Chart.js visualizations.
 */

import { ChartOptions } from "chart.js";

export interface ThemeColors {
  bg: string;
  surface1: string;
  surface2: string;
  surface3: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentContrast: string;
  statusNominal: string;
  statusAdvisory: string;
  statusCaution: string;
  statusWarning: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  gridColor: string;
  tooltipBg: string;

  // Backwards compatibility aliases
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
}

const FALLBACK_THEME: ThemeColors = {
  bg: "var(--bg)",
  surface1: "var(--surface-1)",
  surface2: "var(--surface-2)",
  surface3: "var(--surface-3)",
  border: "var(--border)",
  borderStrong: "var(--border-strong)",
  text: "var(--text)",
  textMuted: "var(--text-muted)",
  textFaint: "var(--text-faint)",
  accent: "var(--accent)",
  accentContrast: "var(--accent-contrast)",
  statusNominal: "var(--status-nominal)",
  statusAdvisory: "var(--status-advisory)",
  statusCaution: "var(--status-caution)",
  statusWarning: "var(--status-warning)",
  chart1: "var(--chart-1)",
  chart2: "var(--chart-2)",
  chart3: "var(--chart-3)",
  chart4: "var(--chart-4)",
  gridColor: "var(--border)",
  tooltipBg: "var(--surface-1)",

  // Aliases
  bgBase: "var(--bg)",
  bgSurface: "var(--surface-1)",
  bgCard: "var(--surface-1)",
  borderSubtle: "var(--border)",
  borderGlow: "var(--border-strong)",
  accentCyan: "var(--accent)",
  accentBlue: "var(--accent)",
  accentEmerald: "var(--status-nominal)",
  accentAmber: "var(--status-caution)",
  accentRose: "var(--status-warning)",
  accentPurple: "var(--surface-3)",
  textPrimary: "var(--text)",
  textSecondary: "var(--text-muted)",
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

  const bg = get("--bg", FALLBACK_THEME.bg);
  const surface1 = get("--surface-1", FALLBACK_THEME.surface1);
  const surface2 = get("--surface-2", FALLBACK_THEME.surface2);
  const surface3 = get("--surface-3", FALLBACK_THEME.surface3);
  const border = get("--border", FALLBACK_THEME.border);
  const borderStrong = get("--border-strong", FALLBACK_THEME.borderStrong);
  const text = get("--text", FALLBACK_THEME.text);
  const textMuted = get("--text-muted", FALLBACK_THEME.textMuted);
  const textFaint = get("--text-faint", FALLBACK_THEME.textFaint);
  const accent = get("--accent", FALLBACK_THEME.accent);
  const accentContrast = get("--accent-contrast", FALLBACK_THEME.accentContrast);
  const statusNominal = get("--status-nominal", FALLBACK_THEME.statusNominal);
  const statusAdvisory = get("--status-advisory", FALLBACK_THEME.statusAdvisory);
  const statusCaution = get("--status-caution", FALLBACK_THEME.statusCaution);
  const statusWarning = get("--status-warning", FALLBACK_THEME.statusWarning);
  const chart1 = get("--chart-1", FALLBACK_THEME.chart1);
  const chart2 = get("--chart-2", FALLBACK_THEME.chart2);
  const chart3 = get("--chart-3", FALLBACK_THEME.chart3);
  const chart4 = get("--chart-4", FALLBACK_THEME.chart4);

  return {
    bg,
    surface1,
    surface2,
    surface3,
    border,
    borderStrong,
    text,
    textMuted,
    textFaint,
    accent,
    accentContrast,
    statusNominal,
    statusAdvisory,
    statusCaution,
    statusWarning,
    chart1,
    chart2,
    chart3,
    chart4,
    gridColor: border,
    tooltipBg: surface1,

    // Aliases
    bgBase: bg,
    bgSurface: surface1,
    bgCard: surface1,
    borderSubtle: border,
    borderGlow: borderStrong,
    accentCyan: accent,
    accentBlue: accent,
    accentEmerald: statusNominal,
    accentAmber: statusCaution,
    accentRose: statusWarning,
    accentPurple: surface3,
    textPrimary: text,
    textSecondary: textMuted,
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
 * Returns cohesive, accessible Chart.js base options for the black theme.
 */
export function getBaseChartOptions<TType extends "line" | "scatter" | "bar">(
  custom?: ChartOptions<TType>
): ChartOptions<TType> {
  const theme = getThemeColors();
  const reducedMotion = prefersReducedMotion();

  const base: ChartOptions<TType> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: reducedMotion ? false : { duration: 200 },
    plugins: {
      legend: {
        display: true,
        position: "top",
        align: "end",
        labels: {
          color: theme.textMuted,
          font: {
            family: "var(--font-mono), monospace",
            size: 11,
          },
          boxWidth: 10,
          boxHeight: 10,
          padding: 10,
        },
      },
      tooltip: {
        backgroundColor: theme.tooltipBg,
        borderColor: theme.borderStrong,
        borderWidth: 1,
        titleColor: theme.text,
        bodyColor: theme.textMuted,
        padding: 8,
        cornerRadius: 6,
        titleFont: {
          family: "var(--font-mono), monospace",
          size: 11,
          weight: 600,
        },
        bodyFont: {
          family: "var(--font-mono), monospace",
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
            family: "var(--font-mono), monospace",
            size: 10,
          },
        },
        border: {
          color: theme.border,
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
            family: "var(--font-mono), monospace",
            size: 10,
          },
        },
        border: {
          color: theme.border,
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
