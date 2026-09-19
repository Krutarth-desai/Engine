-- supabase/migrations/20260919_maintenance_and_alerts.sql
-- AeroTwin GCS - Maintenance Checklists, Work Orders, and Alert Acknowledgements

-- 1. Maintenance Checklists Table
CREATE TABLE IF NOT EXISTS public.maintenance_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id TEXT NOT NULL DEFAULT 'UAV_ENG_001',
    checklist_type TEXT NOT NULL, -- 'pre_flight' | 'post_flight' | '50h' | '100h'
    item_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Normal', -- 'Normal' | 'Due' | 'Done'
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_by TEXT,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_vehicle_checklist_item UNIQUE (vehicle_id, checklist_type, item_id)
);

-- 2. Work Orders Table
CREATE TABLE IF NOT EXISTS public.work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_number TEXT UNIQUE NOT NULL,
    vehicle_id TEXT NOT NULL DEFAULT 'UAV_ENG_001',
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'Medium', -- 'Critical' | 'High' | 'Medium' | 'Low'
    status TEXT NOT NULL DEFAULT 'Open', -- 'Open' | 'In_Progress' | 'Closed'
    assigned_to TEXT,
    source TEXT NOT NULL DEFAULT 'Checklist', -- 'Checklist' | 'Alert' | 'Manual'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Alert Acknowledgements Table
CREATE TABLE IF NOT EXISTS public.alert_acknowledgements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL DEFAULT 'UAV_ENG_001',
    acknowledged_by TEXT NOT NULL,
    acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    CONSTRAINT unique_alert_vehicle UNIQUE (alert_id, vehicle_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.maintenance_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_acknowledgements ENABLE ROW LEVEL SECURITY;

-- Policies for maintenance_checklists
CREATE POLICY "Allow public select on maintenance_checklists"
ON public.maintenance_checklists FOR SELECT USING (true);

CREATE POLICY "Allow public upsert on maintenance_checklists"
ON public.maintenance_checklists FOR ALL USING (true) WITH CHECK (true);

-- Policies for work_orders
CREATE POLICY "Allow public select on work_orders"
ON public.work_orders FOR SELECT USING (true);

CREATE POLICY "Allow public upsert on work_orders"
ON public.work_orders FOR ALL USING (true) WITH CHECK (true);

-- Policies for alert_acknowledgements
CREATE POLICY "Allow public select on alert_acknowledgements"
ON public.alert_acknowledgements FOR SELECT USING (true);

CREATE POLICY "Allow public upsert on alert_acknowledgements"
ON public.alert_acknowledgements FOR ALL USING (true) WITH CHECK (true);
