"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface SecurityMetrics {
  total_events: number;
  critical_events: number;
  high_events: number;
  medium_events: number;
  low_events: number;
  failed_logins: number;
  access_denied: number;
  recent_exports: number;
  active_alerts_count: number;
}

interface SecurityAlertItem {
  alert_id: string;
  timestamp: string;
  title: string;
  severity: string;
  category: string;
  description: string;
  source_ip: string;
  user_id: string;
  event_count: number;
  is_active: boolean;
}

interface SecurityEventItem {
  event_id: string;
  timestamp: string;
  event_type: string;
  action: string;
  severity: string;
  user_id: string;
  user_role: string;
  resource_type: string;
  resource_id: string;
  result: string;
  ip_address: string;
  request_id?: string;
  details: string;
  status: string;
}

export default function SecurityDashboardView() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlertItem[]>([]);
  const [events, setEvents] = useState<SecurityEventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  const fetchSecurityData = async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const [overviewRes, eventsRes] = await Promise.all([
        fetch("http://localhost:8000/api/security/overview", { headers }),
        fetch("http://localhost:8000/api/security/events?limit=50", { headers }),
      ]);

      if (!overviewRes.ok || !eventsRes.ok) {
        if (overviewRes.status === 403 || eventsRes.status === 403) {
          setError("Access Denied: Requires Administrator / GCS Operator role.");
        } else {
          setError("Failed to fetch security monitoring telemetry from backend.");
        }
        setLoading(false);
        return;
      }

      const overviewData = await overviewRes.json();
      const eventsData = await eventsRes.json();

      setMetrics(overviewData.metrics || null);
      setAlerts(overviewData.active_alerts || []);
      setEvents(eventsData.events || []);
    } catch (err: any) {
      setError(err.message || "Network error fetching security overview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
    const interval = setInterval(fetchSecurityData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDismissAlert = async (alertId: string) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`http://localhost:8000/api/security/alerts/${alertId}/dismiss`, {
        method: "POST",
        headers,
      });

      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.alert_id !== alertId));
      }
    } catch (err) {
      console.error("Error dismissing alert:", err);
    }
  };

  const handleUpdateStatus = async (eventId: string, newStatus: string) => {
    setStatusUpdating(eventId);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`http://localhost:8000/api/security/incidents/${eventId}/status`, {
        method: "POST",
        headers,
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setEvents((prev) =>
          prev.map((evt) => (evt.event_id === eventId ? { ...evt, status: newStatus } : evt))
        );
      }
    } catch (err) {
      console.error("Error updating incident status:", err);
    } finally {
      setStatusUpdating(null);
    }
  };

  const filteredEvents = events.filter((e) => {
    if (severityFilter === "ALL") return true;
    return e.severity === severityFilter;
  });

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "badge-crit";
      case "HIGH":
        return "badge-high";
      case "MEDIUM":
        return "badge-warn";
      case "LOW":
      default:
        return "badge-info";
    }
  };

  return (
    <div className="gcs-view-container security-dashboard-view" style={{ padding: "1.2rem", color: "#f8fafc" }}>
      {/* Header */}
      <div className="gcs-view-header" style={{ marginBottom: "1.2rem" }}>
        <div className="gcs-view-title-wrap">
          <h2 className="gcs-view-title" style={{ fontSize: "1.35rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>🛡️</span> PHASE 3 SECURITY MONITORING &amp; THREAT DETECTION
          </h2>
          <span className="gcs-view-tagline" style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
            Real-time Threat Alerts, Correlation ID Auditing, Access Control Monitoring &amp; Incident SOP Management
          </span>
        </div>
        <button className="gcs-btn gcs-btn-sm gcs-btn-secondary" onClick={fetchSecurityData}>
          🔄 Refresh Security Telemetry
        </button>
      </div>

      {error && (
        <div className="gcs-card" style={{ padding: "1rem", backgroundColor: "rgba(239, 68, 68, 0.15)", borderColor: "#ef4444", marginBottom: "1rem" }}>
          ⚠️ <strong>Security Audit Error:</strong> {error}
        </div>
      )}

      {/* Security Metrics Overview Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.8rem", marginBottom: "1.2rem" }}>
        <div className="gcs-card" style={{ padding: "0.9rem", textAlign: "center" }}>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Total Audit Events</div>
          <div style={{ fontSize: "1.6rem", fontWeight: "bold", color: "#38bdf8" }}>{metrics?.total_events ?? 0}</div>
        </div>
        <div className="gcs-card" style={{ padding: "0.9rem", textAlign: "center" }}>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Active Threat Alerts</div>
          <div style={{ fontSize: "1.6rem", fontWeight: "bold", color: (metrics?.active_alerts_count ?? 0) > 0 ? "#ef4444" : "#10b981" }}>
            {metrics?.active_alerts_count ?? 0}
          </div>
        </div>
        <div className="gcs-card" style={{ padding: "0.9rem", textAlign: "center" }}>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Failed Login Attempts</div>
          <div style={{ fontSize: "1.6rem", fontWeight: "bold", color: (metrics?.failed_logins ?? 0) > 0 ? "#f59e0b" : "#38bdf8" }}>
            {metrics?.failed_logins ?? 0}
          </div>
        </div>
        <div className="gcs-card" style={{ padding: "0.9rem", textAlign: "center" }}>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Access Denied (403/IDOR)</div>
          <div style={{ fontSize: "1.6rem", fontWeight: "bold", color: (metrics?.access_denied ?? 0) > 0 ? "#a855f7" : "#38bdf8" }}>
            {metrics?.access_denied ?? 0}
          </div>
        </div>
        <div className="gcs-card" style={{ padding: "0.9rem", textAlign: "center" }}>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Data Exports</div>
          <div style={{ fontSize: "1.6rem", fontWeight: "bold", color: "#10b981" }}>{metrics?.recent_exports ?? 0}</div>
        </div>
      </div>

      {/* Active Security Threat Alerts Panel */}
      <div className="gcs-card" style={{ padding: "1rem", marginBottom: "1.2rem" }}>
        <h3 style={{ fontSize: "1rem", color: "#f8fafc", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          🚨 ACTIVE SECURITY THREAT ALERTS ({alerts.length})
        </h3>
        {alerts.length === 0 ? (
          <div style={{ padding: "0.8rem", color: "#10b981", background: "rgba(16, 185, 129, 0.1)", borderRadius: "4px", fontSize: "0.85rem" }}>
            ✅ No active threat alerts detected. Automated intrusion and brute force detectors are monitoring.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {alerts.map((alt) => (
              <div
                key={alt.alert_id}
                style={{
                  padding: "0.75rem",
                  borderRadius: "6px",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontWeight: "bold", color: "#ef4444", fontSize: "0.9rem" }}>{alt.title}</span>
                    <span style={{ background: "#ef4444", color: "#fff", fontSize: "0.65rem", padding: "2px 6px", borderRadius: "3px", fontWeight: "bold" }}>
                      {alt.severity}
                    </span>
                    <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>({alt.category})</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#cbd5e1", marginTop: "0.2rem" }}>{alt.description}</div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.2rem" }}>
                    Source IP: <code>{alt.source_ip}</code> | User: {alt.user_id} | Events: {alt.event_count} | {new Date(alt.timestamp).toLocaleString()}
                  </div>
                </div>
                <button
                  className="gcs-btn gcs-btn-sm"
                  style={{ background: "#334155", color: "#f8fafc", border: "1px solid #475569" }}
                  onClick={() => handleDismissAlert(alt.alert_id)}
                >
                  Dismiss Alert
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Structured Security Audit Log Feed */}
      <div className="gcs-card" style={{ padding: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
          <h3 style={{ fontSize: "1rem", color: "#f8fafc", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            📜 AUDIT TRAIL &amp; CORRELATION LOG (Last {filteredEvents.length} Events)
          </h3>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
              <button
                key={sev}
                className={`gcs-btn gcs-btn-sm ${severityFilter === sev ? "gcs-btn-primary" : "gcs-btn-secondary"}`}
                style={{ fontSize: "0.72rem", padding: "3px 8px" }}
                onClick={() => setSeverityFilter(sev)}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155", color: "#94a3b8", textTransform: "uppercase" }}>
                <th style={{ padding: "8px" }}>Time</th>
                <th style={{ padding: "8px" }}>Event Type</th>
                <th style={{ padding: "8px" }}>Severity</th>
                <th style={{ padding: "8px" }}>User (Role)</th>
                <th style={{ padding: "8px" }}>Result</th>
                <th style={{ padding: "8px" }}>Correlation ID</th>
                <th style={{ padding: "8px" }}>Incident Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((evt) => (
                <tr key={evt.event_id} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "8px", whiteSpace: "nowrap", color: "#cbd5e1" }}>
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: "8px", fontWeight: "bold", color: "#f8fafc" }}>
                    {evt.event_type}
                  </td>
                  <td style={{ padding: "8px" }}>
                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: "3px",
                        fontSize: "0.68rem",
                        fontWeight: "bold",
                        background:
                          evt.severity === "CRITICAL"
                            ? "#ef4444"
                            : evt.severity === "HIGH"
                            ? "#f59e0b"
                            : evt.severity === "MEDIUM"
                            ? "#3b82f6"
                            : "#475569",
                        color: "#fff",
                      }}
                    >
                      {evt.severity}
                    </span>
                  </td>
                  <td style={{ padding: "8px", color: "#cbd5e1" }}>
                    {evt.user_id} <span style={{ color: "#64748b" }}>({evt.user_role})</span>
                  </td>
                  <td style={{ padding: "8px" }}>
                    <span style={{ color: evt.result === "SUCCESS" ? "#10b981" : "#ef4444", fontWeight: "bold" }}>
                      {evt.result}
                    </span>
                  </td>
                  <td style={{ padding: "8px" }}>
                    <code style={{ fontSize: "0.72rem", color: "#38bdf8" }}>{evt.request_id || "N/A"}</code>
                  </td>
                  <td style={{ padding: "8px" }}>
                    <select
                      value={evt.status}
                      disabled={statusUpdating === evt.event_id}
                      onChange={(e) => handleUpdateStatus(evt.event_id, e.target.value)}
                      style={{
                        background: "#1e293b",
                        color: "#f8fafc",
                        border: "1px solid #475569",
                        borderRadius: "4px",
                        padding: "2px 6px",
                        fontSize: "0.75rem",
                      }}
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="INVESTIGATING">INVESTIGATING</option>
                      <option value="CONTAINED">CONTAINED</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="FALSE_POSITIVE">FALSE_POSITIVE</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
