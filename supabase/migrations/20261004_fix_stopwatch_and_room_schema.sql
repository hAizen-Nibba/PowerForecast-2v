-- ==============================================================================
-- PowerForecast Patch Migration: Fix Stopwatch Schema & Room Member Functions
-- Version: 3.7.1av
-- Description: 
--   1. Create `public.simulated_appliance_usage` table with full constraints,
--      indices, and RLS policies for simulation & test-run stopwatch.
--   2. Fix `public.list_room_members()` RPC replacing non-existent `acc.name` 
--      with `acc.full_name` (PostgreSQL error 42703).
--   3. Fix `public.list_my_rooms()` RPC replacing `acc.name` with `acc.full_name`.
--   4. Reload PostgREST schema cache immediately via `NOTIFY pgrst`.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Create simulated_appliance_usage table if missing
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.simulated_appliance_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    appliance_id UUID REFERENCES public.user_appliances(id) ON DELETE CASCADE NOT NULL,
    usage_date DATE NOT NULL,
    hours_used NUMERIC(5,2) NOT NULL DEFAULT 0,
    kwh_consumed NUMERIC(10,4) NOT NULL DEFAULT 0,
    estimated_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    start_hour INT,
    end_hour INT,
    source TEXT DEFAULT 'simulation_plan',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
    CONSTRAINT simulated_appliance_usage_unique_day UNIQUE(user_id, appliance_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_simulated_usage_user_date ON public.simulated_appliance_usage(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_simulated_usage_appliance ON public.simulated_appliance_usage(appliance_id);

ALTER TABLE public.simulated_appliance_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own simulated usage" ON public.simulated_appliance_usage;
CREATE POLICY "Users can view own simulated usage" ON public.simulated_appliance_usage 
FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL OR public.is_room_member(user_id));

DROP POLICY IF EXISTS "Users can insert own simulated usage" ON public.simulated_appliance_usage;
CREATE POLICY "Users can insert own simulated usage" ON public.simulated_appliance_usage 
FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL OR public.is_room_admin(user_id));

DROP POLICY IF EXISTS "Users can update own simulated usage" ON public.simulated_appliance_usage;
CREATE POLICY "Users can update own simulated usage" ON public.simulated_appliance_usage 
FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL OR public.is_room_admin(user_id));

DROP POLICY IF EXISTS "Users can delete own simulated usage" ON public.simulated_appliance_usage;
CREATE POLICY "Users can delete own simulated usage" ON public.simulated_appliance_usage 
FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL OR public.is_room_admin(user_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.simulated_appliance_usage TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 2. Fix public.list_room_members() RPC (Replace acc.name with acc.full_name)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_room_members(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_result JSONB;
BEGIN
    IF NOT public.can_access_room(p_room_id) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    WITH all_members AS (
        -- Owner
        SELECT
            r.owner_id AS user_id,
            coalesce(nullif(acc.full_name, ''), 'Room Owner') AS display_name,
            coalesce(acc.email, '') AS email,
            'owner' AS role,
            true AS is_owner,
            r.created_at AS joined_at
        FROM public.rooms r
        LEFT JOIN public.accounts acc ON acc.id = r.owner_id
        WHERE r.id = p_room_id

        UNION ALL

        -- Members
        SELECT
            rm.user_id,
            coalesce(nullif(rm.display_name, ''), nullif(acc.full_name, ''), 'Member') AS display_name,
            coalesce(nullif(rm.email, ''), nullif(acc.email, ''), '') AS email,
            rm.role,
            false AS is_owner,
            rm.joined_at
        FROM public.room_members rm
        LEFT JOIN public.accounts acc ON acc.id = rm.user_id
        WHERE rm.room_id = p_room_id
    )
    SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY is_owner DESC, joined_at ASC), '[]'::jsonb)
    INTO v_result
    FROM all_members m;

    RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. Fix public.list_my_rooms() RPC (Replace acc.name with acc.full_name)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_my_rooms()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_result JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;

    WITH user_rooms AS (
        -- 1. Owned room
        SELECT
            r.id AS room_id,
            r.name AS room_name,
            r.code AS room_code,
            r.owner_id,
            coalesce(nullif(acc.full_name, ''), 'You') AS owner_name,
            coalesce(acc.email, '') AS owner_email,
            'owner' AS role,
            true AS is_owner,
            r.created_at
        FROM public.rooms r
        LEFT JOIN public.accounts acc ON acc.id = r.owner_id
        WHERE r.owner_id = v_user_id

        UNION ALL

        -- 2. Joined rooms
        SELECT
            r.id AS room_id,
            r.name AS room_name,
            r.code AS room_code,
            r.owner_id,
            coalesce(nullif(acc.full_name, ''), 'Owner') AS owner_name,
            coalesce(acc.email, '') AS owner_email,
            rm.role AS role,
            false AS is_owner,
            rm.joined_at AS created_at
        FROM public.room_members rm
        JOIN public.rooms r ON r.id = rm.room_id
        LEFT JOIN public.accounts acc ON acc.id = r.owner_id
        WHERE rm.user_id = v_user_id
    )
    SELECT coalesce(jsonb_agg(to_jsonb(ur) ORDER BY is_owner DESC, room_name ASC), '[]'::jsonb)
    INTO v_result
    FROM user_rooms ur;

    RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. Reload PostgREST schema cache
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
