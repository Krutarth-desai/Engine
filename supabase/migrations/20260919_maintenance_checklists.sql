-- 20260919_maintenance_checklists.sql
-- Maintenance checklists state persistence for AeroTwin GCS

CREATE TABLE IF NOT EXISTS public.maintenance_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id TEXT NOT NULL DEFAULT 'UAV_ENG_001',
    checklist_type TEXT NOT NULL, -- 'pre_flight' | 'post_flight' | '50h' | '100h'
    item_id TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_by TEXT,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_vehicle_checklist_item UNIQUE (vehicle_id, checklist_type, item_id)
);

-- Enable Row Level Security
ALTER TABLE public.maintenance_checklists ENABLE ROW LEVEL SECURITY;

-- Allow read for all users
CREATE POLICY "Allow read of maintenance checklists"
ON public.maintenance_checklists FOR SELECT
USING (true);

-- Allow insert/update for all users
CREATE POLICY "Allow insert/update of maintenance checklists"
ON public.maintenance_checklists FOR ALL
USING (true)
WITH CHECK (true);
