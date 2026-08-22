-- Supabase Migration: Appliance Usage Logs and RLS Parity
-- Project: https://ezjzuggagfnkjmbcakta.supabase.co

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
    source TEXT DEFAULT 'calendar_live_stop',
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

ALTER TABLE public.appliance_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own usage logs" ON public.appliance_usage_logs;
CREATE POLICY "Users can view own usage logs" ON public.appliance_usage_logs FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can insert own usage logs" ON public.appliance_usage_logs;
CREATE POLICY "Users can insert own usage logs" ON public.appliance_usage_logs FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own usage logs" ON public.appliance_usage_logs;
CREATE POLICY "Users can update own usage logs" ON public.appliance_usage_logs FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete own usage logs" ON public.appliance_usage_logs;
CREATE POLICY "Users can delete own usage logs" ON public.appliance_usage_logs FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.appliance_usage_logs TO authenticated, anon;
