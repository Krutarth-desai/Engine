"use client";

import React, { useRef, useEffect } from "react";
import { useTelemetry } from "@/context/TelemetryContext";
import { useTheme } from "@/context/ThemeContext";
import {
  ChevronDown,
  User,
  LogOut,
  Sliders,
  Clock,
  Sun,
  Moon,
} from "lucide-react";

interface UserMenuDropdownProps {
  userEmail: string;
  vehicleId: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onLogout: () => void;
  getLinkColor: () => string;
  getLinkLabel: () => string;
  relativeTime: string;
}

export default function UserMenuDropdown({
  userEmail,
  vehicleId,
  isOpen,
  onToggle,
  onClose,
  onLogout,
  getLinkColor,
  getLinkLabel,
  relativeTime,
}: UserMenuDropdownProps) {
  const {
    timeDisplay,
    setTimeDisplay,
    unitPreference,
    setUnitPreference,
  } = useTelemetry();
  const { theme, toggleTheme } = useTheme();

  const menuRef = useRef<HTMLDivElement>(null);
  const isZulu = timeDisplay === "zulu";

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div style={{ position: "relative" }} ref={menuRef}>
      <button
        className="header-user-btn"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User profile and preferences"
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            background: "var(--border)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.68rem",
            fontWeight: 700,
            color: "var(--accent)",
          }}
        >
          {userEmail ? userEmail.charAt(0).toUpperCase() : "O"}
        </div>
        <span
          style={{
            fontSize: "0.74rem",
            maxWidth: "110px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {userEmail ? userEmail.split("@")[0] : "Operator"}
        </span>
        <ChevronDown size={12} style={{ color: "var(--text-muted)" }} />
      </button>

      {isOpen && (
        <div className="user-dropdown-menu">
          <div className="user-dropdown-header">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <User size={16} style={{ color: "var(--accent)" }} />
              <div>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text)" }}>
                  {userEmail || "Operator"}
                </div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                  Flight Engineer / GCS-1
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem",
              fontSize: "0.7rem",
              color: "var(--text-muted)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Vehicle Target:</span>
              <span className="text-cyan font-mono">{vehicleId}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Telemetry Link:</span>
              <span style={{ color: getLinkColor() }} className="font-mono">{getLinkLabel()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Last Update:</span>
              <span className="font-mono">{relativeTime}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Platform Suite:</span>
              <span className="font-mono">v2.4-PHM Turbopack</span>
            </div>
          </div>

          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: "0.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.3rem",
            }}
          >
            <button
              onClick={() => setTimeDisplay(isZulu ? "local" : "zulu")}
              style={{
                background: "var(--border)",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                padding: "0.3rem 0.5rem",
                color: "var(--text)",
                fontSize: "0.7rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Clock size={12} /> Time Standard
              </span>
              <span className="text-cyan font-mono">{isZulu ? "ZULU (UTC)" : "LOCAL"}</span>
            </button>

            <button
              onClick={() => setUnitPreference(unitPreference === "psi" ? "bar" : "psi")}
              style={{
                background: "var(--border)",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                padding: "0.3rem 0.5rem",
                color: "var(--text)",
                fontSize: "0.7rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Sliders size={12} /> Oil Pressure Unit
              </span>
              <span className="text-cyan font-mono">{unitPreference.toUpperCase()}</span>
            </button>

            <button
              onClick={toggleTheme}
              style={{
                background: "var(--border)",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                padding: "0.3rem 0.5rem",
                color: "var(--text)",
                fontSize: "0.7rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                {theme === "light" ? (
                  <Sun size={12} style={{ color: "var(--status-caution)" }} />
                ) : (
                  <Moon size={12} style={{ color: "var(--accent)" }} />
                )}
                UI Theme Mode
              </span>
              <span className="text-cyan font-mono">
                {theme === "light" ? "LIGHT BLUE" : "TACTICAL DARK"}
              </span>
            </button>

            {/* Neutral logout button - NOT red warning */}
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              style={{
                background: "var(--border)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                borderRadius: "4px",
                padding: "0.35rem 0.5rem",
                fontSize: "0.72rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                cursor: "pointer",
                marginTop: "0.3rem",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--border)";
                e.currentTarget.style.color = "var(--text)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--border)";
                e.currentTarget.style.color = "var(--text)";
              }}
            >
              <LogOut size={13} />
              Sign Out of GCS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
