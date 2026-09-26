"use client";

import React, { useRef, useEffect } from "react";
import { useTelemetry } from "@/context/TelemetryContext";
import { useTheme } from "@/context/ThemeContext";
import { useProfile } from "@/context/ProfileContext";
import { NavView } from "../Sidebar";
import {
  ChevronDown,
  User,
  LogOut,
  Sliders,
  Clock,
  Sun,
  Moon,
  Shield,
} from "lucide-react";

interface UserMenuDropdownProps {
  userEmail: string;
  vehicleId: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onLogout: () => void;
  onSelectView?: (view: NavView) => void;
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
  onSelectView,
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
  const { profileDef } = useProfile();

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
            border: `1px solid ${profileDef.badgeBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.68rem",
            fontWeight: 700,
            color: profileDef.badgeColor,
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
              <User size={16} style={{ color: profileDef.badgeColor }} />
              <div>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text)" }}>
                  {userEmail || "Operator"}
                </div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                  {profileDef.targetPersona}
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
              <span>Workstation Role:</span>
              <span style={{ color: profileDef.badgeColor, fontWeight: 700 }} className="font-mono">
                {profileDef.roleTag}
              </span>
            </div>
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
              onClick={() => {
                onClose();
                onSelectView?.("settings");
              }}
              style={{
                background: "var(--border)",
                border: `1px solid ${profileDef.badgeBorder}`,
                borderRadius: "4px",
                padding: "0.3rem 0.5rem",
                color: "var(--text)",
                fontSize: "0.7rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
              title="Open Settings to switch workstation persona"
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Shield size={12} style={{ color: profileDef.badgeColor }} /> Switch Profile
              </span>
              <span style={{ color: profileDef.badgeColor, fontWeight: 700, fontSize: "0.68rem" }} className="font-mono">
                {profileDef.roleTag} &rarr;
              </span>
            </button>
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
