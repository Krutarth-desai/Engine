"use client";

import React, { useState } from "react";
import { useRole } from "@/context/RoleContext";
import { ROLE_META, UserRole, RoleMeta } from "@/config/roleConfig";

// ──────────────────────────────────────────────────────────────
// RoleSelectionScreen: One-time role picker shown after sign-up
// ──────────────────────────────────────────────────────────────

const ROLES_ORDER: Exclude<UserRole, "unset">[] = [
  "gcs_operator",
  "propulsion_engineer",
  "maintenance_tech",
];

export default function RoleSelectionScreen() {
  const { setInitialRole } = useRole();
  const [selectedRole, setSelectedRole] = useState<Exclude<UserRole, "unset"> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleConfirm = async () => {
    if (!selectedRole) return;
    setIsSubmitting(true);
    setErrorMsg("");

    const success = await setInitialRole(selectedRole);
    if (!success) {
      setErrorMsg("Failed to set role. Please try again.");
      setIsSubmitting(false);
    }
    // On success, RoleContext updates role state, which triggers re-render in page.tsx
  };

  return (
    <div style={styles.backdrop}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logoRow}>
            <span style={styles.logoIcon}>▲</span>
            <span style={styles.logoText}>AEROTWIN</span>
          </div>
          <h1 style={styles.title}>Select Your Role</h1>
          <p style={styles.subtitle}>
            Choose your operational role to personalize your Ground Control Station dashboard.
            This selection determines which panels, views, and controls you see.
          </p>
        </div>

        {/* Role Cards */}
        <div style={styles.cardsGrid}>
          {ROLES_ORDER.map((roleId) => {
            const meta: RoleMeta = ROLE_META[roleId];
            const isSelected = selectedRole === roleId;

            return (
              <button
                key={roleId}
                onClick={() => setSelectedRole(roleId)}
                style={{
                  ...styles.card,
                  borderColor: isSelected ? meta.accentColor : "rgba(255,255,255,0.08)",
                  background: isSelected ? meta.accentBg : "rgba(14, 21, 38, 0.75)",
                  boxShadow: isSelected
                    ? `0 0 24px ${meta.accentColor}22, inset 0 1px 0 ${meta.accentColor}33`
                    : "0 1px 3px rgba(0,0,0,0.3)",
                  transform: isSelected ? "scale(1.03)" : "scale(1)",
                }}
              >
                {/* Selection Indicator */}
                <div
                  style={{
                    ...styles.checkCircle,
                    borderColor: isSelected ? meta.accentColor : "rgba(255,255,255,0.15)",
                    background: isSelected ? meta.accentColor : "transparent",
                  }}
                >
                  {isSelected && <span style={styles.checkMark}>✓</span>}
                </div>

                {/* Icon */}
                <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
                  {meta.icon}
                </div>

                {/* Title */}
                <h2
                  style={{
                    ...styles.cardTitle,
                    color: isSelected ? meta.accentColor : "#e2e8f0",
                  }}
                >
                  {meta.label}
                </h2>

                {/* Tagline */}
                <div
                  style={{
                    ...styles.tagline,
                    color: isSelected ? meta.accentColor : "#64748b",
                    background: isSelected
                      ? `${meta.accentColor}18`
                      : "rgba(255,255,255,0.04)",
                  }}
                >
                  {meta.tagline}
                </div>

                {/* Description */}
                <p style={styles.cardDesc}>{meta.description}</p>
              </button>
            );
          })}
        </div>

        {/* Error */}
        {errorMsg && <div style={styles.errorBox}>{errorMsg}</div>}

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          disabled={!selectedRole || isSubmitting}
          style={{
            ...styles.confirmBtn,
            opacity: !selectedRole || isSubmitting ? 0.45 : 1,
            cursor: !selectedRole || isSubmitting ? "not-allowed" : "pointer",
            background: selectedRole
              ? `linear-gradient(135deg, ${ROLE_META[selectedRole].accentColor}cc, ${ROLE_META[selectedRole].accentColor}88)`
              : "rgba(255,255,255,0.08)",
          }}
        >
          {isSubmitting
            ? "Setting up your workspace..."
            : selectedRole
            ? `Continue as ${ROLE_META[selectedRole].label}`
            : "Select a role to continue"}
        </button>

        <p style={styles.footerNote}>
          This is a one-time selection tied to your account.
        </p>
      </div>
    </div>
  );
}

// ── Inline Styles ──

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(145deg, #060a13 0%, #0b1120 50%, #0e1526 100%)",
    zIndex: 9999,
    padding: "1.5rem",
    fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
  },
  container: {
    width: "100%",
    maxWidth: "920px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1.8rem",
  },
  header: {
    textAlign: "center" as const,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "0.6rem",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginBottom: "0.4rem",
  },
  logoIcon: {
    fontSize: "1.4rem",
    color: "#38bdf8",
  },
  logoText: {
    fontSize: "0.85rem",
    fontWeight: 800,
    letterSpacing: "3px",
    color: "#38bdf8",
    fontFamily: "var(--font-chakra-petch, 'Chakra Petch', monospace)",
  },
  title: {
    fontSize: "1.65rem",
    fontWeight: 700,
    color: "#f1f5f9",
    margin: 0,
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: "0.82rem",
    color: "#94a3b8",
    maxWidth: "560px",
    lineHeight: 1.55,
    margin: 0,
  },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "1.1rem",
    width: "100%",
  },
  card: {
    position: "relative" as const,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    textAlign: "center" as const,
    padding: "1.6rem 1.2rem 1.4rem",
    borderRadius: "12px",
    border: "1.5px solid",
    cursor: "pointer",
    transition: "all 0.25s ease",
    outline: "none",
    fontFamily: "inherit",
  },
  checkCircle: {
    position: "absolute" as const,
    top: "12px",
    right: "12px",
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    border: "2px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
  },
  checkMark: {
    color: "#fff",
    fontSize: "0.7rem",
    fontWeight: 900,
  },
  cardTitle: {
    fontSize: "1.05rem",
    fontWeight: 700,
    margin: "0 0 0.5rem",
    letterSpacing: "-0.2px",
    transition: "color 0.2s ease",
  },
  tagline: {
    fontSize: "0.68rem",
    fontWeight: 600,
    letterSpacing: "0.8px",
    textTransform: "uppercase" as const,
    padding: "0.25rem 0.7rem",
    borderRadius: "4px",
    marginBottom: "0.7rem",
    transition: "all 0.2s ease",
  },
  cardDesc: {
    fontSize: "0.78rem",
    color: "#94a3b8",
    lineHeight: 1.5,
    margin: 0,
  },
  errorBox: {
    background: "rgba(239, 68, 68, 0.12)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#fca5a5",
    padding: "0.6rem 1rem",
    borderRadius: "8px",
    fontSize: "0.8rem",
    textAlign: "center" as const,
    width: "100%",
    maxWidth: "480px",
  },
  confirmBtn: {
    padding: "0.85rem 2.4rem",
    borderRadius: "10px",
    border: "none",
    color: "#fff",
    fontSize: "0.9rem",
    fontWeight: 700,
    letterSpacing: "0.3px",
    transition: "all 0.25s ease",
    fontFamily: "inherit",
  },
  footerNote: {
    fontSize: "0.7rem",
    color: "#475569",
    margin: 0,
  },
};
