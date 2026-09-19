/**
 * lib/format.ts
 * Unified formatters for engineering quantities, units,
 * timestamps, and relative time tickers.
 */

/**
 * Universal safe float formatting helper.
 * Replaces unrounded numbers like 611.646161758023 with clean precision.
 */
export function fmt(
  val: number | null | undefined,
  digits = 1,
  fallback = "—"
): string {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) {
    return fallback;
  }
  return Number(val).toFixed(digits);
}

/**
 * Universal integer formatting with locale commas (e.g. 2,450).
 */
export function fmtInt(
  val: number | null | undefined,
  fallback = "—"
): string {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) {
    return fallback;
  }
  return Math.round(val).toLocaleString();
}

/**
 * Health Index rounding: Exactly ONE rule across all screens.
 * Dashboard, Maintenance, and Trend cards will never disagree.
 */
export function fmtHealthIndex(val: number | null | undefined): number {
  if (val === null || val === undefined || isNaN(val)) {
    return 100;
  }
  return Math.min(100, Math.max(0, Math.round(val)));
}

/**
 * RUL cycles rounding: standard integer cycles.
 */
export function fmtRulCycles(val: number | null | undefined): number {
  if (val === null || val === undefined || isNaN(val)) {
    return 0;
  }
  return Math.max(0, Math.round(val));
}

/**
 * Oil pressure converter supporting unit preference toggle (psi vs bar).
 * 1 bar = 14.5038 psi
 */
export function fmtOilPressure(
  psiValue: number | null | undefined,
  unitPreference: "psi" | "bar" = "psi"
): { formatted: string; unit: string; numVal: number } {
  if (psiValue === null || psiValue === undefined || isNaN(psiValue)) {
    return { formatted: "—", unit: unitPreference, numVal: 0 };
  }

  if (unitPreference === "bar") {
    const bar = psiValue / 14.5038;
    return {
      formatted: bar.toFixed(2),
      unit: "bar",
      numVal: bar,
    };
  }

  return {
    formatted: psiValue.toFixed(1),
    unit: "psi",
    numVal: psiValue,
  };
}

/**
 * Specific quantity formatters with standard units.
 */
export const formatters = {
  rpm: (val: number | null | undefined) => fmtInt(val),
  cht: (val: number | null | undefined) => fmt(val, 1),
  egt: (val: number | null | undefined) => fmt(val, 1),
  oilTemp: (val: number | null | undefined) => fmt(val, 1),
  fuelFlow: (val: number | null | undefined) => fmt(val, 1),
  vibration: (val: number | null | undefined) => fmt(val, 2),
  voltage: (val: number | null | undefined) => fmt(val, 1),
  injectionTiming: (val: number | null | undefined) => fmt(val, 1),
};

/**
 * Formats RUL cycles into operational countdown timer (HH:MM:SS).
 * Assumption documented: 1 cycle = 60 seconds of operational flight.
 * Shows "-" if stale or unavailable.
 */
export function fmtRulCountdown(
  cycles: number | null | undefined,
  isStale = false,
  secondsPerCycle = 60
): string {
  if (isStale || cycles === null || cycles === undefined || isNaN(cycles) || cycles <= 0) {
    return "—";
  }

  const totalSeconds = Math.round(cycles * secondsPerCycle);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Dynamic relative time ticker (e.g. "Just now", "8s ago", "2 min ago").
 */
export function fmtRelativeTime(
  timestamp: string | number | Date | null | undefined,
  nowTime: number = Date.now()
): string {
  if (!timestamp) return "—";

  const time = typeof timestamp === "string" || typeof timestamp === "number"
    ? new Date(timestamp).getTime()
    : timestamp.getTime();

  if (isNaN(time)) return "—";

  const diffMs = Math.max(0, nowTime - time);
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 3) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return `${Math.floor(diffHours / 24)}d ago`;
}

/**
 * Format timestamps with support for Local and Zulu (UTC) display.
 */
export function fmtTimestamp(
  dateInput: string | number | Date | null | undefined,
  isZulu = false
): string {
  if (!dateInput) return "--:--:--";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "--:--:--";

  if (isZulu) {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}Z`;
  }

  return d.toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
