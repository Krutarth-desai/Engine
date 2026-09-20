"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { CheckSquare, Square, Clock, User, PlusCircle, CheckCircle2 } from "lucide-react";

export type ChecklistType = "pre_flight" | "post_flight" | "50h" | "100h";
export type ItemStatus = "Normal" | "Due" | "Done";

export interface ChecklistItemData {
  id: string;
  label: string;
  subsystem: string;
  spec: string;
  status: ItemStatus;
  technician?: string;
  timestamp?: string;
  notes?: string;
}

const DEFAULT_ITEMS: Record<ChecklistType, { title: string; items: ChecklistItemData[] }> = {
  pre_flight: {
    title: "PRE-FLIGHT TURNAROUND (8 ITEMS)",
    items: [
      { id: "pf-1", label: "Fuel System & Sump Sampling", subsystem: "FUEL", spec: "Sample gascolator & both wing sumps; 0% water contamination", status: "Done", technician: "TECH_A", timestamp: "10:15Z", notes: "Clear visual sample" },
      { id: "pf-2", label: "Oil Sump Dipstick & Viscosity", subsystem: "LUBRICATION", spec: "Verify 3.8–4.2 L quantity; Aeroshell 15W-50 nominal clarity", status: "Done", technician: "TECH_A", timestamp: "10:18Z", notes: "4.0L level confirmed" },
      { id: "pf-3", label: "Dual Spark Plug Lead Continuity", subsystem: "IGNITION", spec: "Check shielding braid & top/bottom harness security", status: "Done", technician: "TECH_B", timestamp: "10:22Z" },
      { id: "pf-4", label: "Throttle Servo & Linkage Free Play", subsystem: "MECHANICAL", spec: "Full travel 0–100% without binding; return spring verified", status: "Done", technician: "TECH_B", timestamp: "10:25Z" },
      { id: "pf-5", label: "Air Intake Plenum & Air Filter", subsystem: "AIR/THERMAL", spec: "Inspect for FOD, dusting ingress, and duct clamp torques", status: "Normal" },
      { id: "pf-6", label: "Propeller Blade Leading Edge", subsystem: "PROPULSION", spec: "Zero stone nicks > 0.5mm; hub pitch mechanism security", status: "Normal" },
      { id: "pf-7", label: "Alternator Belt Tension & Ground", subsystem: "ELECTRICAL", spec: "Deflection 8–10mm under 20N; chassis bond < 0.05 ohm", status: "Normal" },
      { id: "pf-8", label: "Exhaust Header & Slip Joints", subsystem: "EXHAUST", spec: "Verify no orange lead oxide stains or thermal stress cracks", status: "Normal" },
    ],
  },
  post_flight: {
    title: "POST-FLIGHT SERVICING (6 ITEMS)",
    items: [
      { id: "pst-1", label: "2-Minute Idle Cooldown Verification", subsystem: "THERMAL", spec: "CHT < 130°C and EGT < 550°C before engine shutdown", status: "Due" },
      { id: "pst-2", label: "Scavenge Pump Residual Scrutiny", subsystem: "LUBRICATION", spec: "Inspect dry sump tank sight glass within 5 min of cutoff", status: "Due" },
      { id: "pst-3", label: "Thermal Soak & Vapor Lock Bleed", subsystem: "FUEL", spec: "Confirm high-pressure fuel rail purge accumulator seated", status: "Normal" },
      { id: "pst-4", label: "Oil Filter Impending Bypass Pin", subsystem: "LUBRICATION", spec: "Red pop-up indicator button must remain flush", status: "Normal" },
      { id: "pst-5", label: "Visual Airframe Cowling Weeping", subsystem: "AIRFRAME", spec: "No fuel, coolant, or oil weeping from lower cowling gills", status: "Normal" },
      { id: "pst-6", label: "Avionics Bus Battery Float Voltage", subsystem: "ELECTRICAL", spec: "Terminal voltage >= 27.2 V after main bus de-energized", status: "Normal" },
    ],
  },
  "50h": {
    title: "50-HOUR PERIODIC INSPECTION",
    items: [
      { id: "50h-1", label: "Engine Oil & Filter Element Replacement", subsystem: "LUBRICATION", spec: "Cut open paper pleats; inspect for non-ferrous flakes", status: "Due" },
      { id: "50h-2", label: "Differential Cylinder Pressure Test", subsystem: "POWERPLANT", spec: "Cyl 1–4 min 72/80 psi at 80 psi test pressure", status: "Normal" },
      { id: "50h-3", label: "Intake/Exhaust Valve Lash Check", subsystem: "MECHANICAL", spec: "Cold clearance 0.35mm intake, 0.40mm exhaust ±0.03", status: "Normal" },
      { id: "50h-4", label: "Fuel Injector Ultrasonic Cleaning", subsystem: "FUEL", spec: "Equal flow across injectors within 2.5% variance", status: "Normal" },
      { id: "50h-5", label: "Dynafocal Engine Isolator Bushings", subsystem: "MOUNTS", spec: "Inspect elastomeric mount sag; torque cradle to 42 Nm", status: "Normal" },
    ],
  },
  "100h": {
    title: "100-HOUR / ANNUAL OVERHAUL",
    items: [
      { id: "100h-1", label: "Internal Magneto E-Gap & Point Timing", subsystem: "IGNITION", spec: "Sync internal contact points to 23.4° BTDC advance", status: "Normal" },
      { id: "100h-2", label: "Propeller Dynamic Vibration Balancing", subsystem: "PROPULSION", spec: "Balance with optical tachometer to < 0.08 IPS peak", status: "Normal" },
      { id: "100h-3", label: "Fuel Servo Diaphragm & Pressure Relief", subsystem: "FUEL", spec: "Measure differential fuel metered pressure 4.5–5.2 psi", status: "Normal" },
      { id: "100h-4", label: "Borescope Combustion Chamber Inspection", subsystem: "POWERPLANT", spec: "Examine piston crown carbon, exhaust valve seat face", status: "Normal" },
    ],
  },
};

export default function MaintenanceChecklist() {
  const [activeTab, setActiveTab] = useState<ChecklistType>("pre_flight");
  const [itemsMap, setItemsMap] = useState<Record<string, ChecklistItemData>>({});
  const [technicianName] = useState<string>("OPERATOR_GCS");
  const [workOrderNotice, setWorkOrderNotice] = useState<string | null>(null);

  // Initialize from default items
  useEffect(() => {
    const flat: Record<string, ChecklistItemData> = {};
    Object.values(DEFAULT_ITEMS).forEach((grp) => {
      grp.items.forEach((it) => {
        flat[it.id] = { ...it };
      });
    });

    // Try Supabase fetch
    const fetchRemote = async () => {
      try {
        const { data, error } = await supabase
          .from("maintenance_checklists")
          .select("item_id, status, completed, completed_by, completed_at, notes")
          .eq("vehicle_id", "UAV_ENG_001");

        if (data && !error && data.length > 0) {
          data.forEach((row: { item_id: string; status: ItemStatus; completed_by?: string; completed_at?: string; notes?: string }) => {
            if (flat[row.item_id]) {
              flat[row.item_id].status = row.status || (row.status === "Done" ? "Done" : "Normal");
              flat[row.item_id].technician = row.completed_by;
              flat[row.item_id].timestamp = row.completed_at ? new Date(row.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined;
              flat[row.item_id].notes = row.notes;
            }
          });
          setItemsMap({ ...flat });
          return;
        }
      } catch {
        // Fallback
      }

      // Fallback to localStorage
      try {
        const saved = localStorage.getItem("aerotwin_maint_items");
        if (saved) {
          const parsed = JSON.parse(saved);
          setItemsMap({ ...flat, ...parsed });
          return;
        }
      } catch {
        // Ignore
      }

      setItemsMap(flat);
    };

    fetchRemote();
  }, []);

  const handleCycleStatus = async (item: ChecklistItemData) => {
    const nextStatus: ItemStatus = item.status === "Normal" ? "Due" : item.status === "Due" ? "Done" : "Normal";
    const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const updatedItem: ChecklistItemData = {
      ...item,
      status: nextStatus,
      technician: nextStatus === "Done" ? technicianName : item.technician,
      timestamp: nextStatus === "Done" ? nowStr : undefined,
    };

    const nextMap = { ...itemsMap, [item.id]: updatedItem };
    setItemsMap(nextMap);

    try {
      localStorage.setItem("aerotwin_maint_items", JSON.stringify(nextMap));
    } catch {
      // Ignore
    }

    try {
      await supabase.from("maintenance_checklists").upsert(
        {
          vehicle_id: "UAV_ENG_001",
          checklist_type: activeTab,
          item_id: item.id,
          status: nextStatus,
          completed: nextStatus === "Done",
          completed_by: nextStatus === "Done" ? technicianName : null,
          completed_at: nextStatus === "Done" ? new Date().toISOString() : null,
          notes: updatedItem.notes || null,
        },
        { onConflict: "vehicle_id,checklist_type,item_id" }
      );
    } catch {
      // In-memory fallback works silently
    }
  };

  const handleUpdateNotes = (itemId: string, notesText: string) => {
    const item = itemsMap[itemId];
    if (!item) return;
    const updated = { ...itemsMap, [itemId]: { ...item, notes: notesText } };
    setItemsMap(updated);
    try {
      localStorage.setItem("aerotwin_maint_items", JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const handleCreateWorkOrder = async (item: ChecklistItemData) => {
    const woNum = `WO-${Date.now().toString().slice(-6)}`;
    setWorkOrderNotice(`Work order ${woNum} created for "${item.label}" (Assigned: ${technicianName})`);
    setTimeout(() => setWorkOrderNotice(null), 4000);

    try {
      await supabase.from("work_orders").insert({
        wo_number: woNum,
        vehicle_id: "UAV_ENG_001",
        title: item.label,
        description: `${item.subsystem} spec: ${item.spec}. Notes: ${item.notes || "None"}`,
        priority: item.status === "Due" ? "High" : "Medium",
        status: "Open",
        assigned_to: technicianName,
        source: "Checklist",
      });
    } catch {
      // In-memory fallback
    }
  };

  const currentItems = DEFAULT_ITEMS[activeTab].items.map((it) => itemsMap[it.id] || it);
  const doneCount = currentItems.filter((it) => it.status === "Done").length;
  const progressPct = Math.round((doneCount / currentItems.length) * 100);

  return (
    <div className="panel maint-checklist-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="panel-title">
          <strong>FIELD MAINTENANCE CHECKLIST &amp; SIGN-OFF</strong>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="model-chip font-mono">
            {doneCount} / {currentItems.length} COMPLETED ({progressPct}%)
          </span>
        </div>
      </div>

      {/* Work order confirmation banner */}
      {workOrderNotice && (
        <div
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            color: "var(--status-nominal)",
            borderRadius: "4px",
            padding: "0.35rem 0.65rem",
            fontSize: "0.68rem",
            marginBottom: "0.5rem",
            fontFamily: "var(--font-mono), monospace",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <CheckCircle2 size={13} />
          {workOrderNotice}
        </div>
      )}

      {/* Checklist Tabs */}
      <div style={{ display: "flex", gap: "0.35rem", marginBottom: "0.65rem", flexWrap: "wrap" }} role="tablist" aria-label="Maintenance intervals">
        {(["pre_flight", "post_flight", "50h", "100h"] as const).map((tab, idx, arr) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            tabIndex={activeTab === tab ? 0 : -1}
            onClick={() => setActiveTab(tab)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                e.preventDefault();
                const next = arr[(idx + 1) % arr.length];
                setActiveTab(next);
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                const prev = arr[(idx - 1 + arr.length) % arr.length];
                setActiveTab(prev);
              }
            }}
            className={`filter-pill-btn ${activeTab === tab ? "active" : ""}`}
            style={{ fontSize: "0.68rem", padding: "0.25rem 0.55rem" }}
          >
            <strong>{tab.replace("_", "-").toUpperCase()}</strong>
          </button>
        ))}
      </div>

      {/* Progress Bar */}
      <div style={{ height: "4px", background: "var(--border)", borderRadius: "2px", marginBottom: "0.75rem", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${progressPct}%`,
            background: progressPct === 100 ? "var(--status-nominal)" : "var(--accent)",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Checklist Items List */}
      <div
        className="checklist-items-wrap"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.45rem",
          overflowY: "auto",
          paddingRight: "0.25rem",
          maxHeight: "340px",
          flex: 1,
        }}
      >
        {currentItems.map((chk) => {
          const isDone = chk.status === "Done";
          const isDue = chk.status === "Due";
          const statusBadgeColor = isDone ? "var(--status-nominal)" : isDue ? "var(--status-warning)" : "var(--text-muted)";

          return (
            <div
              key={chk.id}
              style={{
                background: isDone ? "var(--surface-2)" : isDue ? "color-mix(in srgb, var(--status-warning) 14%, var(--surface-2))" : "var(--surface-2)",
                border: `1px solid ${isDue ? "var(--status-warning)" : "var(--border)"}`,
                borderRadius: "6px",
                padding: "0.55rem 0.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <button
                    onClick={() => handleCycleStatus(chk)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: statusBadgeColor,
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                    title={`Click to cycle status (Current: ${chk.status})`}
                  >
                    {isDone ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                  <span
                    style={{
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      color: isDone ? "var(--text)" : "var(--text)",
                      textDecoration: isDone ? "line-through" : "none",
                    }}
                  >
                    {chk.label}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  {/* Status Toggle Button */}
                  <button
                    onClick={() => handleCycleStatus(chk)}
                    style={{
                      background: `${statusBadgeColor}15`,
                      border: `1px solid ${statusBadgeColor}40`,
                      color: statusBadgeColor,
                      borderRadius: "3px",
                      padding: "0.1rem 0.35rem",
                      fontSize: "0.6rem",
                      fontWeight: 800,
                      fontFamily: "var(--font-mono), monospace",
                      cursor: "pointer",
                    }}
                  >
                    {chk.status.toUpperCase()}
                  </button>

                  <span
                    style={{
                      fontSize: "0.58rem",
                      fontFamily: "var(--font-mono), monospace",
                      padding: "0.1rem 0.35rem",
                      borderRadius: "3px",
                      background: "var(--border)",
                      color: "var(--accent)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {chk.subsystem}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: "0.64rem", color: "var(--text-muted)" }}>{chk.spec}</div>

              {/* Technician, Timestamp, Notes, and Create Work Order Button */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.15rem", borderTop: "1px solid var(--border)", paddingTop: "0.3rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.62rem", color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}>
                  {chk.technician && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                      <User size={10} /> {chk.technician}
                    </span>
                  )}
                  {chk.timestamp && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                      <Clock size={10} /> {chk.timestamp}
                    </span>
                  )}
                  <input
                    type="text"
                    placeholder="Add inspection notes..."
                    value={chk.notes || ""}
                    onChange={(e) => handleUpdateNotes(chk.id, e.target.value)}
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: "3px",
                      color: "var(--text)",
                      fontSize: "0.62rem",
                      padding: "0.1rem 0.35rem",
                      width: "160px",
                    }}
                  />
                </div>

                <button
                  onClick={() => handleCreateWorkOrder(chk)}
                  style={{
                    background: "var(--border)",
                    border: "1px solid var(--border)",
                    color: "var(--accent)",
                    borderRadius: "3px",
                    padding: "0.15rem 0.45rem",
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    fontFamily: "var(--font-mono), monospace",
                  }}
                  title="Generate maintenance work order ticket"
                >
                  <PlusCircle size={10} />
                  CREATE WO
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
