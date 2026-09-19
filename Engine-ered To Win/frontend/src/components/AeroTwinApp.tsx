"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { useTelemetry } from "@/context/TelemetryContext";
import AuthScreen from "@/components/AuthScreen";
import Header from "@/components/Header";
import Sidebar, { NavView } from "@/components/Sidebar";

// View Components
import MainDashboardView from "@/components/MainDashboardView";
import LiveTelemetryView from "@/components/LiveTelemetryView";
import DiagnosticsView from "@/components/DiagnosticsView";
import RulPrognosticsView from "@/components/RulPrognosticsView";
import RegressionTrendsView from "@/components/RegressionTrendsView";
import MaintenanceView from "@/components/MaintenanceView";
import AlertsView from "@/components/AlertsView";
import TimeScrubBar from "@/components/common/TimeScrubBar";

interface AeroTwinAppProps {
  initialView?: NavView;
}

export default function AeroTwinApp({ initialView = "dashboard" }: AeroTwinAppProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentView, setCurrentView] = useState<NavView>(initialView);
  const [selectedEngine, setSelectedEngine] = useState<string>("UAV_ENG_001");

  const { payload, activeScenario, injectScenario, linkState } = useTelemetry();

  // URL sync & browser navigation
  useEffect(() => {
    const handleUrlSync = () => {
      if (typeof window === "undefined") return;
      const path = window.location.pathname.replace(/^\//, "").toLowerCase();
      const hash = window.location.hash.replace("#", "").toLowerCase();
      const target = hash || path;

      const validViews: Record<string, NavView> = {
        "": initialView,
        dashboard: "dashboard",
        telemetry: "telemetry",
        diagnostics: "diagnostics",
        prognostics: "rul",
        rul: "rul",
        regression: "regression",
        maintenance: "maintenance",
        alerts: "alerts",
      };

      if (validViews[target] && validViews[target] !== currentView) {
        setCurrentView(validViews[target]);
      }

      // Automatically redirect legacy hash URLs to proper App Router routes
      if (hash && validViews[hash]) {
        const canonicalPath = hash === "dashboard" ? "/" : hash === "rul" ? "/prognostics" : `/${hash}`;
        window.history.replaceState({}, "", canonicalPath);
      }
    };

    handleUrlSync();
    window.addEventListener("popstate", handleUrlSync);
    window.addEventListener("hashchange", handleUrlSync);
    return () => {
      window.removeEventListener("popstate", handleUrlSync);
      window.removeEventListener("hashchange", handleUrlSync);
    };
  }, [initialView, currentView]);

  const handleNavigate = (view: NavView) => {
    setCurrentView(view);
    const targetPath =
      view === "dashboard" ? "/" : `/${view === "rul" ? "prognostics" : view}`;
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", targetPath);
    }
  };

  // Profile ensure helper
  const ensureProfile = async (user: User) => {
    try {
      await supabase.from("profiles").upsert(
        {
          id: user.id,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || "",
          email: user.email || "",
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || "",
        },
        { onConflict: "id", ignoreDuplicates: true }
      );
    } catch (e) {
      console.warn("[AeroTwin] Profile ensure error:", e);
    }
  };

  // Auth Session Setup
  useEffect(() => {
    const initAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        await ensureProfile(session.user);
        setCurrentUser(session.user);
      }
      setAuthChecked(true);
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await ensureProfile(session.user);
        setCurrentUser(session.user);
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        setCurrentUser(session.user);
      } else if (event === "SIGNED_OUT") {
        setCurrentUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  if (!authChecked) {
    return null;
  }

  const activeAlertsCount = payload.alerts
    ? payload.alerts.filter((a) => a.level === "ALERT" || a.level === "CAUTION").length
    : 0;

  return (
    <>
      {!currentUser && (
        <AuthScreen
          onAuthenticated={(user) => {
            setCurrentUser(user);
          }}
        />
      )}

      {currentUser && (
        <div className="gcs-app-container">
          {/* TOP MISSION HEADER */}
          <Header
            userEmail={currentUser.email || "Operator"}
            isConnected={linkState === "live"}
            vehicleId={selectedEngine}
            missionId={payload.vehicle?.mission_id || "ISR_PATROL_27"}
            altitude={payload.vehicle?.altitude || 15000}
            throttle={payload.vehicle?.throttle || 75}
            remainingTimeStr={payload.prognostics?.remaining_time_str || "01:57:32"}
            onLogout={handleLogout}
          />

          {/* MAIN GCS WORKSPACE (SIDEBAR + ACTIVE DETAIL VIEW) */}
          <div className="gcs-workspace-layout">
            {/* Operational Navigation Sidebar */}
            <Sidebar
              currentView={currentView}
              onSelectView={handleNavigate}
              selectedEngine={selectedEngine}
              onSelectEngine={setSelectedEngine}
              activeAlertCount={activeAlertsCount}
            />

            {/* Active Operational View */}
            <main id="app-main" className="gcs-view-area">
              {currentView === "dashboard" && (
                <MainDashboardView
                  payload={payload}
                  activeScenario={activeScenario}
                  onInjectScenario={injectScenario}
                  onNavigate={handleNavigate}
                />
              )}

              {currentView === "telemetry" && (
                <LiveTelemetryView payload={payload} />
              )}

              {currentView === "diagnostics" && (
                <DiagnosticsView payload={payload} />
              )}

              {currentView === "rul" && (
                <RulPrognosticsView payload={payload} />
              )}

              {currentView === "regression" && (
                <RegressionTrendsView payload={payload} />
              )}

              {currentView === "maintenance" && (
                <MaintenanceView payload={payload} />
              )}

              {currentView === "alerts" && (
                <AlertsView
                  alerts={payload.alerts || []}
                  activeScenario={activeScenario}
                  onInjectScenario={injectScenario}
                />
              )}
            </main>
            <TimeScrubBar />
          </div>
        </div>
      )}
    </>
  );
}

