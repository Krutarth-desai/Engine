"use client";

import React from "react";
import { Download, Printer, History } from "lucide-react";

interface MaintenanceLogEntry {
  id: string;
  date: string;
  flightHours: string;
  type: string;
  description: string;
  technician: string;
  status: "SIGNED_OFF" | "OPEN";
}

const HISTORY_LOG: MaintenanceLogEntry[] = [
  { id: "LOG-104", date: "2026-09-18", flightHours: "36.2 hrs", type: "50h Periodic", description: "Oil filter pleat inspection clean; no metal flakes.", technician: "TECH_B", status: "SIGNED_OFF" },
  { id: "LOG-103", date: "2026-09-15", flightHours: "31.0 hrs", type: "Turnaround", description: "Refueled 45L 100LL; differential pressure test Cyl 1-4 > 74 psi.", technician: "TECH_A", status: "SIGNED_OFF" },
  { id: "LOG-102", date: "2026-09-12", flightHours: "24.8 hrs", type: "Inspection", description: "Borescope inspection of Cylinder #1 intake runner clean.", technician: "TECH_A", status: "SIGNED_OFF" },
  { id: "LOG-101", date: "2026-09-08", flightHours: "18.4 hrs", type: "Servicing", description: "Dual spark plug harness torque verified to 25 Nm.", technician: "TECH_C", status: "SIGNED_OFF" },
];

export default function MaintenanceHistoryTable() {
  const currentHours = 38.4;
  const next50h = 50.0;
  const hoursUntil50h = (next50h - currentHours).toFixed(1);
  const tboHoursRemaining = (2000.0 - currentHours).toFixed(1);

  const handleExportCsv = () => {
    const headers = "Log ID,Date,Flight Hours,Inspection Type,Description,Technician,Status\n";
    const rows = HISTORY_LOG.map(
      (r) => `${r.id},${r.date},${r.flightHours},"${r.type}","${r.description}",${r.technician},${r.status}`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `AeroTwin_Maintenance_History_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="panel maint-history-panel" style={{ marginTop: "0.85rem" }}>
      {/* Header with Export and Print Controls */}
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="panel-title" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <History size={14} style={{ color: "var(--accent)" }} />
          <strong>INSPECTION OVERVIEW &amp; MAINTENANCE HISTORY LOG</strong>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <button
            onClick={handleExportCsv}
            style={{
              background: "var(--border)",
              border: "1px solid var(--border)",
              color: "var(--accent)",
              borderRadius: "4px",
              padding: "0.2rem 0.5rem",
              fontSize: "0.64rem",
              fontFamily: "var(--font-mono), monospace",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
            title="Export Maintenance History to CSV"
          >
            <Download size={11} /> EXPORT CSV
          </button>

          <button
            onClick={handlePrint}
            style={{
              background: "var(--border)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              borderRadius: "4px",
              padding: "0.2rem 0.5rem",
              fontSize: "0.64rem",
              fontFamily: "var(--font-mono), monospace",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
            title="Print Inspection Certification Sheet"
          >
            <Printer size={11} /> PRINT CERT
          </button>
        </div>
      </div>

      {/* TBO & Hours Due Counters */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem", marginBottom: "0.75rem" }}>
        <div style={{ background: "var(--border)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0.5rem 0.75rem" }}>
          <div style={{ fontSize: "0.64rem", color: "var(--text-muted)" }}>CURRENT FLIGHT HOURS</div>
          <div className="font-mono" style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text)", marginTop: "0.15rem" }}>
            {currentHours} <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>HRS</span>
          </div>
          <div style={{ fontSize: "0.58rem", color: "var(--status-nominal)" }}>Logged across 27 sorties</div>
        </div>

        <div style={{ background: "var(--border)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0.5rem 0.75rem" }}>
          <div style={{ fontSize: "0.64rem", color: "var(--text-muted)" }}>50-HR INSPECTION DUE IN</div>
          <div className="font-mono" style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--accent)", marginTop: "0.15rem" }}>
            {hoursUntil50h} <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>HRS</span>
          </div>
          <div style={{ fontSize: "0.58rem", color: "var(--text-muted)" }}>Due at 50.0 flight hours</div>
        </div>

        <div style={{ background: "var(--border)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0.5rem 0.75rem" }}>
          <div style={{ fontSize: "0.64rem", color: "var(--text-muted)" }}>TIME TO OVERHAUL (TBO)</div>
          <div className="font-mono" style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--status-nominal)", marginTop: "0.15rem" }}>
            {tboHoursRemaining} <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>HRS</span>
          </div>
          <div style={{ fontSize: "0.58rem", color: "var(--text-muted)" }}>2,000 hr manufacturer TBO</div>
        </div>
      </div>

      {/* Historical Log Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.68rem", fontFamily: "var(--font-mono), monospace" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)", textAlign: "left" }}>
              <th style={{ padding: "0.35rem 0.5rem" }}>ID</th>
              <th style={{ padding: "0.35rem 0.5rem" }}>DATE</th>
              <th style={{ padding: "0.35rem 0.5rem" }}>HOURS</th>
              <th style={{ padding: "0.35rem 0.5rem" }}>INSPECTION</th>
              <th style={{ padding: "0.35rem 0.5rem" }}>NOTES / FINDINGS</th>
              <th style={{ padding: "0.35rem 0.5rem" }}>TECH</th>
              <th style={{ padding: "0.35rem 0.5rem" }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {HISTORY_LOG.map((row) => (
              <tr key={row.id} style={{ borderBottom: "1px solid var(--border)", color: "var(--text)" }}>
                <td style={{ padding: "0.4rem 0.5rem", color: "var(--accent)" }}>{row.id}</td>
                <td style={{ padding: "0.4rem 0.5rem" }}>{row.date}</td>
                <td style={{ padding: "0.4rem 0.5rem" }}>{row.flightHours}</td>
                <td style={{ padding: "0.4rem 0.5rem", fontWeight: 700, color: "var(--text)" }}>{row.type}</td>
                <td style={{ padding: "0.4rem 0.5rem", color: "var(--text-muted)" }}>{row.description}</td>
                <td style={{ padding: "0.4rem 0.5rem" }}>{row.technician}</td>
                <td style={{ padding: "0.4rem 0.5rem" }}>
                  <span style={{ color: "var(--status-nominal)", background: "var(--border)", padding: "0.1rem 0.35rem", borderRadius: "3px", border: "1px solid var(--border)" }}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
