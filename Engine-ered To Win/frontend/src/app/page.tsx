"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AuthScreen from "@/components/AuthScreen";
import RoleSelectionScreen from "@/components/RoleSelectionScreen";
import Header from "@/components/Header";
import Sidebar, { NavView } from "@/components/Sidebar";
import { TelemetryProvider, useTelemetry } from "@/context/TelemetryContext";
import { RoleProvider, useRole } from "@/context/RoleContext";
import { isViewAllowed, getDefaultView } from "@/config/roleConfig";

// View Components
import DigitalTwinCommandDashboard from "@/components/dashboard/DigitalTwinCommandDashboard";
import LiveTelemetryView from "@/components/LiveTelemetryView";
import DiagnosticsView from "@/components/DiagnosticsView";
import RulPrognosticsView from "@/components/RulPrognosticsView";
import RegressionTrendsView from "@/components/RegressionTrendsView";
import MaintenanceView from "@/components/MaintenanceView";
import AlertsView from "@/components/AlertsView";

// ──────────────────────────────────────────────────────────────
// Inner Workspace: Role-gated GCS dashboard
// ──────────────────────────────────────────────────────────────

function GcsWorkspace({
  currentUser,
  onLogout,
}: {
  currentUser: any;
  onLogout: () => void;
}) {
  const {
    payload,
    isConnected,
    connectionStatus,
    mode,
    activeScenario,
    injectScenario,
    environment,
  } = useTelemetry();

  const { role, isRoleSet, isLoaded } = useRole();

  const [currentView, setCurrentView] = useState<NavView>("dashboard");
  const [selectedEngine, setSelectedEngine] = useState<string>("UAV_ENG_001");

  // Set default view once role loads
  useEffect(() => {
    if (isLoaded && isRoleSet) {
      const defaultView = getDefaultView(role);
      setCurrentView(defaultView);
    }
  }, [isLoaded, isRoleSet, role]);

  // Sync with browser hash on initial mount and hashchange
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace("#", "").toLowerCase() as NavView;
      const validViews: NavView[] = [
        "dashboard",
        "telemetry",
        "diagnostics",
        "rul",
        "regression",
        "maintenance",
        "alerts",
      ];
      if (validViews.includes(hash) && isViewAllowed(role, hash)) {
        setCurrentView(hash);
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [role]);

  const handleNavigate = (view: NavView) => {
    if (!isViewAllowed(role, view)) return;
    setCurrentView(view);
    window.location.hash = view;
  };

  // Show role selection screen if role is not yet set
  if (isLoaded && !isRoleSet) {
    return <RoleSelectionScreen />;
  }

  // Show nothing while role is loading
  if (!isLoaded) {
    return null;
  }

  const activeAlertsCount = payload.alerts
    ? payload.alerts.filter((a) => a.level === "ALERT" || a.level === "CAUTION").length
    : 0;

  const primaryCondition =
    environment?.primary_condition || environment?.operating_condition || "NOMINAL CRUISE";

  return (
    <div className="gcs-app-container">
      {/* TOP MISSION HEADER */}
      <Header
        userEmail={currentUser?.email || "Operator"}
        isConnected={isConnected}
        connectionStatus={connectionStatus}
        vehicleId={selectedEngine}
        missionId={payload.vehicle?.mission_id || "ISR_PATROL_27"}
        altitude={environment?.altitude_ft ?? payload.vehicle?.altitude ?? 15000}
        throttle={environment?.throttle_pct ?? payload.vehicle?.throttle ?? 75}
        remainingTimeStr={payload.prognostics?.remaining_time_str || "01:57:32"}
        mode={mode}
        missionStatus={primaryCondition}
        onLogout={onLogout}
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
            <DigitalTwinCommandDashboard onNavigate={handleNavigate} />
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
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Root Page: Auth → Role → Workspace
// ──────────────────────────────────────────────────────────────

export default function Home() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Helper to ensure public.profiles row
  const ensureProfile = async (user: any) => {
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
        <RoleProvider userId={currentUser.id}>
          <TelemetryProvider>
            <GcsWorkspace currentUser={currentUser} onLogout={handleLogout} />
          </TelemetryProvider>
        </RoleProvider>
      )}
    </>
  );
}
