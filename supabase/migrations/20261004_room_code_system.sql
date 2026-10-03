-- ==============================================================================
-- Migration: 20261004_room_code_system.sql
-- Description: Room-Code System with Admin / View-Only Hierarchy & Widened RLS
-- ==============================================================================

-- 1. Create rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT rooms_owner_unique UNIQUE (owner_id)
);

-- 2. Create room_members table
CREATE TABLE IF NOT EXISTS public.room_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'viewer')) DEFAULT 'viewer',
    display_name TEXT,
    email TEXT,
    joined_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT room_members_room_user_unique UNIQUE (room_id, user_id)
);

-- 3. Enable RLS on rooms & room_members
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

-- 4. Helper Security Definer Functions (Prevents RLS Recursion)
CREATE OR REPLACE FUNCTION public.is_room_member(p_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT (
        auth.uid() = p_owner_id
        OR EXISTS (
            SELECT 1
            FROM public.rooms r
            JOIN public.room_members rm ON rm.room_id = r.id
            WHERE r.owner_id = p_owner_id
              AND rm.user_id = auth.uid()
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_room_admin(p_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT (
        auth.uid() = p_owner_id
        OR EXISTS (
            SELECT 1
            FROM public.rooms r
            JOIN public.room_members rm ON rm.room_id = r.id
            WHERE r.owner_id = p_owner_id
              AND rm.user_id = auth.uid()
              AND rm.role = 'admin'
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_room(p_room_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.rooms r
        LEFT JOIN public.room_members rm ON rm.room_id = r.id
        WHERE r.id = p_room_id
          AND (r.owner_id = auth.uid() OR rm.user_id = auth.uid())
    );
$$;

CREATE OR REPLACE FUNCTION public.can_admin_room(p_room_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.rooms r
        LEFT JOIN public.room_members rm ON rm.room_id = r.id
        WHERE r.id = p_room_id
          AND (
            r.owner_id = auth.uid()
            OR (rm.user_id = auth.uid() AND rm.role = 'admin')
          )
    );
$$;

-- Helper to generate unique room code (6 characters, avoiding 0, O, 1, I)
CREATE OR REPLACE FUNCTION public.generate_unique_room_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    chars CONSTANT TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    code_out TEXT;
    i INT;
    exists_already BOOLEAN;
BEGIN
    LOOP
        code_out := 'PF-';
        FOR i IN 1..6 LOOP
            code_out := code_out || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
        END LOOP;
        
        SELECT EXISTS (SELECT 1 FROM public.rooms WHERE code = code_out) INTO exists_already;
        EXIT WHEN NOT exists_already;
    END LOOP;
    RETURN code_out;
END;
$$;

-- 5. RLS Policies on rooms & room_members
DROP POLICY IF EXISTS "Users can view accessible rooms" ON public.rooms;
CREATE POLICY "Users can view accessible rooms"
ON public.rooms FOR SELECT
USING (public.can_access_room(id));

DROP POLICY IF EXISTS "Owners can update own room" ON public.rooms;
CREATE POLICY "Owners can update own room"
ON public.rooms FOR UPDATE
USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete own room" ON public.rooms;
CREATE POLICY "Owners can delete own room"
ON public.rooms FOR DELETE
USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can view room members for their rooms" ON public.room_members;
CREATE POLICY "Users can view room members for their rooms"
ON public.room_members FOR SELECT
USING (public.can_access_room(room_id));

DROP POLICY IF EXISTS "Admins can manage room members" ON public.room_members;
CREATE POLICY "Admins can manage room members"
ON public.room_members FOR ALL
USING (public.can_admin_room(room_id))
WITH CHECK (public.can_admin_room(room_id));

-- 6. RPC Functions for Room Management

-- get_or_create_my_room: Ensures calling user has their default Main Room
CREATE OR REPLACE FUNCTION public.get_or_create_my_room(p_display_name TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_room RECORD;
    v_name TEXT;
    v_code TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Look for existing room
    SELECT * INTO v_room FROM public.rooms WHERE owner_id = v_user_id;

    IF FOUND THEN
        -- If user provided a display name and room has default generic name, update it
        IF p_display_name IS NOT NULL AND btrim(p_display_name) <> '' AND v_room.name = 'Main Room' THEN
            UPDATE public.rooms SET name = btrim(p_display_name) || '''s Room', updated_at = now()
            WHERE id = v_room.id
            RETURNING * INTO v_room;
        END IF;

        RETURN to_jsonb(v_room);
    END IF;

    -- Create new room
    IF p_display_name IS NOT NULL AND btrim(p_display_name) <> '' THEN
        v_name := btrim(p_display_name) || '''s Room';
    ELSE
        v_name := 'Main Room';
    END IF;

    v_code := public.generate_unique_room_code();

    INSERT INTO public.rooms (owner_id, code, name)
    VALUES (v_user_id, v_code, v_name)
    RETURNING * INTO v_room;

    RETURN to_jsonb(v_room);
END;
$$;

-- join_room_by_code: Join a room by code as viewer
CREATE OR REPLACE FUNCTION public.join_room_by_code(
    p_code TEXT,
    p_display_name TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_clean_code TEXT := upper(btrim(p_code));
    v_room RECORD;
    v_member RECORD;
    v_resolved_name TEXT;
    v_resolved_email TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You must be logged in to join a room.');
    END IF;

    IF v_clean_code IS NULL OR v_clean_code = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Please enter a valid room code.');
    END IF;

    -- Find room by code
    SELECT * INTO v_room FROM public.rooms WHERE code = v_clean_code;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Room code not found. Please check and try again.');
    END IF;

    -- Prevent joining own room
    IF v_room.owner_id = v_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'This is your own room. You are already the owner.');
    END IF;

    -- Resolve display name and email
    v_resolved_name := coalesce(nullif(btrim(p_display_name), ''), 'Member');
    v_resolved_email := coalesce(nullif(btrim(p_email), ''), '');

    -- Check if already joined
    SELECT * INTO v_member FROM public.room_members
    WHERE room_id = v_room.id AND user_id = v_user_id;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'You are already in ' || v_room.name || '.',
            'room', to_jsonb(v_room),
            'role', v_member.role
        );
    END IF;

    -- Insert new member as viewer
    INSERT INTO public.room_members (room_id, user_id, role, display_name, email)
    VALUES (v_room.id, v_user_id, 'viewer', v_resolved_name, v_resolved_email)
    RETURNING * INTO v_member;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined ' || v_room.name || ' as View-only.',
        'room', to_jsonb(v_room),
        'role', 'viewer'
    );
END;
$$;

-- list_my_rooms: Returns all rooms user owns or is a member of
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
            coalesce(acc.name, 'You') AS owner_name,
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
            coalesce(acc.name, 'Owner') AS owner_name,
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

-- list_room_members: Returns all members of a given room
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
            coalesce(acc.name, 'Room Owner') AS display_name,
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
            coalesce(rm.display_name, acc.name, 'Member') AS display_name,
            coalesce(rm.email, acc.email, '') AS email,
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

-- set_room_member_role: Promote / demote member (Admin or Owner only)
CREATE OR REPLACE FUNCTION public.set_room_member_role(
    p_room_id UUID,
    p_target_user_id UUID,
    p_new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_room RECORD;
BEGIN
    IF NOT public.can_admin_room(p_room_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You do not have permission to manage roles in this room.');
    END IF;

    SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Room not found.');
    END IF;

    IF v_room.owner_id = p_target_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'The room owner role cannot be changed.');
    END IF;

    IF p_new_role NOT IN ('admin', 'viewer') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid role. Must be admin or viewer.');
    END IF;

    UPDATE public.room_members
    SET role = p_new_role
    WHERE room_id = p_room_id AND user_id = p_target_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Role updated successfully.');
END;
$$;

-- remove_room_member: Remove a member or leave room
CREATE OR REPLACE FUNCTION public.remove_room_member(
    p_room_id UUID,
    p_target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_room RECORD;
BEGIN
    SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Room not found.');
    END IF;

    IF v_room.owner_id = p_target_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'The room owner cannot be removed from the room.');
    END IF;

    -- Must be admin OR target is removing themselves (leaving)
    IF v_user_id <> p_target_user_id AND NOT public.can_admin_room(p_room_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You do not have permission to remove members from this room.');
    END IF;

    DELETE FROM public.room_members
    WHERE room_id = p_room_id AND user_id = p_target_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Member removed successfully.');
END;
$$;

-- regenerate_room_code: Owner-only code rotation
CREATE OR REPLACE FUNCTION public.regenerate_room_code(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_room RECORD;
    v_new_code TEXT;
BEGIN
    SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Room not found.');
    END IF;

    IF v_room.owner_id <> v_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only the room owner can regenerate the room code.');
    END IF;

    v_new_code := public.generate_unique_room_code();

    UPDATE public.rooms
    SET code = v_new_code, updated_at = now()
    WHERE id = p_room_id;

    RETURN jsonb_build_object('success', true, 'code', v_new_code, 'message', 'Room code regenerated successfully.');
END;
$$;


-- ==============================================================================
-- 7. Widened Data RLS Policies (Removing user_id IS NULL loophole)
-- ==============================================================================

-- Table: user_appliances
DROP POLICY IF EXISTS "Users can view own appliances" ON public.user_appliances;
CREATE POLICY "Users can view own appliances"
ON public.user_appliances FOR SELECT
USING (auth.uid() = user_id OR public.is_room_member(user_id));

DROP POLICY IF EXISTS "Users can insert own appliances" ON public.user_appliances;
CREATE POLICY "Users can insert own appliances"
ON public.user_appliances FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_room_admin(user_id));

DROP POLICY IF EXISTS "Users can update own appliances" ON public.user_appliances;
CREATE POLICY "Users can update own appliances"
ON public.user_appliances FOR UPDATE
USING (auth.uid() = user_id OR public.is_room_admin(user_id))
WITH CHECK (auth.uid() = user_id OR public.is_room_admin(user_id));

DROP POLICY IF EXISTS "Users can delete own appliances" ON public.user_appliances;
CREATE POLICY "Users can delete own appliances"
ON public.user_appliances FOR DELETE
USING (auth.uid() = user_id OR public.is_room_admin(user_id));

-- Table: appliance_usage_logs
DROP POLICY IF EXISTS "Users can view own usage logs" ON public.appliance_usage_logs;
CREATE POLICY "Users can view own usage logs"
ON public.appliance_usage_logs FOR SELECT
USING (auth.uid() = user_id OR public.is_room_member(user_id));

DROP POLICY IF EXISTS "Users can insert own usage logs" ON public.appliance_usage_logs;
CREATE POLICY "Users can insert own usage logs"
ON public.appliance_usage_logs FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_room_admin(user_id));

DROP POLICY IF EXISTS "Users can update own usage logs" ON public.appliance_usage_logs;
CREATE POLICY "Users can update own usage logs"
ON public.appliance_usage_logs FOR UPDATE
USING (auth.uid() = user_id OR public.is_room_admin(user_id))
WITH CHECK (auth.uid() = user_id OR public.is_room_admin(user_id));

DROP POLICY IF EXISTS "Users can delete own usage logs" ON public.appliance_usage_logs;
CREATE POLICY "Users can delete own usage logs"
ON public.appliance_usage_logs FOR DELETE
USING (auth.uid() = user_id OR public.is_room_admin(user_id));

-- Table: daily_appliance_usage
DROP POLICY IF EXISTS "Users can view own daily usage" ON public.daily_appliance_usage;
CREATE POLICY "Users can view own daily usage"
ON public.daily_appliance_usage FOR SELECT
USING (auth.uid() = user_id OR public.is_room_member(user_id));

DROP POLICY IF EXISTS "Users can insert own daily usage" ON public.daily_appliance_usage;
CREATE POLICY "Users can insert own daily usage"
ON public.daily_appliance_usage FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_room_admin(user_id));

DROP POLICY IF EXISTS "Users can update own daily usage" ON public.daily_appliance_usage;
CREATE POLICY "Users can update own daily usage"
ON public.daily_appliance_usage FOR UPDATE
USING (auth.uid() = user_id OR public.is_room_admin(user_id))
WITH CHECK (auth.uid() = user_id OR public.is_room_admin(user_id));

DROP POLICY IF EXISTS "Users can delete own daily usage" ON public.daily_appliance_usage;
CREATE POLICY "Users can delete own daily usage"
ON public.daily_appliance_usage FOR DELETE
USING (auth.uid() = user_id OR public.is_room_admin(user_id));

-- Table: simulated_appliance_usage (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'simulated_appliance_usage') THEN
        DROP POLICY IF EXISTS "Users can view own simulated usage" ON public.simulated_appliance_usage;
        CREATE POLICY "Users can view own simulated usage"
        ON public.simulated_appliance_usage FOR SELECT
        USING (auth.uid() = user_id OR public.is_room_member(user_id));

        DROP POLICY IF EXISTS "Users can insert own simulated usage" ON public.simulated_appliance_usage;
        CREATE POLICY "Users can insert own simulated usage"
        ON public.simulated_appliance_usage FOR INSERT
        WITH CHECK (auth.uid() = user_id OR public.is_room_admin(user_id));

        DROP POLICY IF EXISTS "Users can update own simulated usage" ON public.simulated_appliance_usage;
        CREATE POLICY "Users can update own simulated usage"
        ON public.simulated_appliance_usage FOR UPDATE
        USING (auth.uid() = user_id OR public.is_room_admin(user_id))
        WITH CHECK (auth.uid() = user_id OR public.is_room_admin(user_id));

        DROP POLICY IF EXISTS "Users can delete own simulated usage" ON public.simulated_appliance_usage;
        CREATE POLICY "Users can delete own simulated usage"
        ON public.simulated_appliance_usage FOR DELETE
        USING (auth.uid() = user_id OR public.is_room_admin(user_id));
    END IF;
END $$;

-- Table: user_calendar_events
DROP POLICY IF EXISTS "Users can view own calendar events" ON public.user_calendar_events;
CREATE POLICY "Users can view own calendar events"
ON public.user_calendar_events FOR SELECT
USING (auth.uid() = user_id OR public.is_room_member(user_id));

DROP POLICY IF EXISTS "Users can insert own calendar events" ON public.user_calendar_events;
CREATE POLICY "Users can insert own calendar events"
ON public.user_calendar_events FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_room_admin(user_id));

DROP POLICY IF EXISTS "Users can update own calendar events" ON public.user_calendar_events;
CREATE POLICY "Users can update own calendar events"
ON public.user_calendar_events FOR UPDATE
USING (auth.uid() = user_id OR public.is_room_admin(user_id))
WITH CHECK (auth.uid() = user_id OR public.is_room_admin(user_id));

DROP POLICY IF EXISTS "Users can delete own calendar events" ON public.user_calendar_events;
CREATE POLICY "Users can delete own calendar events"
ON public.user_calendar_events FOR DELETE
USING (auth.uid() = user_id OR public.is_room_admin(user_id));

-- Table: appliance_lists (Spaces)
DROP POLICY IF EXISTS "Users can manage their own appliance lists" ON public.appliance_lists;
CREATE POLICY "Users can view accessible appliance lists"
ON public.appliance_lists FOR SELECT
USING (auth.uid() = user_id OR public.is_room_member(user_id));

CREATE POLICY "Admins can manage appliance lists"
ON public.appliance_lists FOR ALL
USING (auth.uid() = user_id OR public.is_room_admin(user_id))
WITH CHECK (auth.uid() = user_id OR public.is_room_admin(user_id));
