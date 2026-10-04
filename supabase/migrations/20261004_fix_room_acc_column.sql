-- ==============================================================================
-- PowerForecast Patch Migration: Fix Room Account Column Reference
-- Version: 3.7.0bv
-- Description: Replace non-existent `acc.name` with `acc.full_name` in
--              `public.list_my_rooms()` and `public.list_room_members()`.
-- ==============================================================================

-- 1. Fix list_my_rooms
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

-- 2. Fix list_room_members
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
