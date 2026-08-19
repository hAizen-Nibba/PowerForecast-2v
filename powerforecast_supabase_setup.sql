-- ==============================================================================
-- POWERFORECAST REFINED - COMPLETE SUPABASE SETUP SCRIPT
-- Run this in your NEW Supabase Project: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USER APPLIANCES TABLE
CREATE TABLE IF NOT EXISTS public.user_appliances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    brand TEXT DEFAULT '',
    model TEXT DEFAULT '',
    control_no TEXT DEFAULT '',
    source TEXT DEFAULT 'manual_entry', -- 'pelp_db' | 'ai_vision' | 'manual_entry' | 'catalog'
    watts NUMERIC NOT NULL CHECK (watts > 0),
    voltage NUMERIC DEFAULT 230,
    quantity INTEGER DEFAULT 1 CHECK (quantity >= 1),
    hours_per_day NUMERIC NOT NULL DEFAULT 8 CHECK (hours_per_day >= 0 AND hours_per_day <= 24),
    days_per_month INTEGER DEFAULT 30 CHECK (days_per_month >= 1 AND days_per_month <= 31),
    monthly_kwh NUMERIC NOT NULL DEFAULT 0,
    estimated_cost NUMERIC DEFAULT 0,
    energy_rating TEXT DEFAULT '',
    room_location TEXT DEFAULT 'Living Room',
    is_active BOOLEAN DEFAULT true,
    is_currently_on BOOLEAN DEFAULT false,
    last_turned_on_at TIMESTAMP WITH TIME ZONE,
    ai_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

-- 3. APPLIANCE USAGE SESSIONS & RUNTIME LOGS TABLE
CREATE TABLE IF NOT EXISTS public.appliance_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    appliance_id UUID REFERENCES public.user_appliances(id) ON DELETE CASCADE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_minutes NUMERIC DEFAULT 0,
    kwh_consumed NUMERIC DEFAULT 0,
    is_peak_window BOOLEAN DEFAULT false,
    estimated_cost NUMERIC DEFAULT 0,
    source TEXT DEFAULT 'power_board_toggle',
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

-- 4. USER CALENDAR EVENTS & USAGE SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS public.user_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    appliance_id UUID REFERENCES public.user_appliances(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'appliance', -- 'billing' | 'peak' | 'appliance' | 'audit'
    day TEXT NOT NULL DEFAULT 'mon',
    hour NUMERIC NOT NULL CHECK (hour >= 0 AND hour < 24),
    duration_hours NUMERIC DEFAULT 1.0,
    is_recurring BOOLEAN DEFAULT true,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

-- 5. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.user_appliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appliance_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_calendar_events ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES FOR USER APPLIANCES
DROP POLICY IF EXISTS "Users can view own appliances" ON public.user_appliances;
CREATE POLICY "Users can view own appliances" ON public.user_appliances FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can insert own appliances" ON public.user_appliances;
CREATE POLICY "Users can insert own appliances" ON public.user_appliances FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own appliances" ON public.user_appliances;
CREATE POLICY "Users can update own appliances" ON public.user_appliances FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete own appliances" ON public.user_appliances;
CREATE POLICY "Users can delete own appliances" ON public.user_appliances FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- 7. RLS POLICIES FOR USAGE LOGS
DROP POLICY IF EXISTS "Users can view own usage logs" ON public.appliance_usage_logs;
CREATE POLICY "Users can view own usage logs" ON public.appliance_usage_logs FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can insert own usage logs" ON public.appliance_usage_logs;
CREATE POLICY "Users can insert own usage logs" ON public.appliance_usage_logs FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own usage logs" ON public.appliance_usage_logs;
CREATE POLICY "Users can update own usage logs" ON public.appliance_usage_logs FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete own usage logs" ON public.appliance_usage_logs;
CREATE POLICY "Users can delete own usage logs" ON public.appliance_usage_logs FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- 8. RLS POLICIES FOR CALENDAR EVENTS
DROP POLICY IF EXISTS "Users can view own calendar events" ON public.user_calendar_events;
CREATE POLICY "Users can view own calendar events" ON public.user_calendar_events FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can insert own calendar events" ON public.user_calendar_events;
CREATE POLICY "Users can insert own calendar events" ON public.user_calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own calendar events" ON public.user_calendar_events;
CREATE POLICY "Users can update own calendar events" ON public.user_calendar_events FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete own calendar events" ON public.user_calendar_events;
CREATE POLICY "Users can delete own calendar events" ON public.user_calendar_events FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- 9. REALTIME PUBLICATION ENABLEMENT
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_appliances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appliance_usage_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_calendar_events;
