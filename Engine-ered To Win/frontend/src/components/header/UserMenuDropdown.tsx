"use client";

import React, { useRef, useEffect } from "react";
import { useTelemetry } from "@/context/TelemetryContext";
import {
  ChevronDown,
  User,
  LogOut,
  Sliders,
  Clock,
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
            background: "rgba(56, 189, 248, 0.2)",
            border: "1px solid rgba(56, 189, 248, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.68rem",
            fontWeight: 700,
            color: "var(--accent-cyan)",
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
        <ChevronDown size={12} style={{ color: "#94a3b8" }} />
      </button>

      {isOpen && (
        <div className="user-dropdown-menu">
          <div className="user-dropdown-header">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <User size={16} style={{ color: "var(--accent-cyan)" }} />
              <div>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#f8fafc" }}>
                  {userEmail || "Operator"}
                </div>
                <div style={{ fontSize: "0.65rem", color: "#64748b" }}>
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
              color: "#94a3b8",
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
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              paddingTop: "0.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.3rem",
            }}
          >
            <button
              onClick={() => setTimeDisplay(isZulu ? "local" : "zulu")}
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "4px",
                padding: "0.3rem 0.5rem",
                color: "#cbd5e1",
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
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "4px",
                padding: "0.3rem 0.5rem",
                color: "#cbd5e1",
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

            {/* Neutral logout button - NOT red warning */}
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#cbd5e1",
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
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                e.currentTarget.style.color = "#cbd5e1";
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
