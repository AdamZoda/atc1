-- ==============================================================================
-- 🎡 WHEEL OF FORTUNE - DATABASE SCHEMA & LOGIC
-- ==============================================================================

-- 1. Create Wheel Rewards Table
CREATE TABLE IF NOT EXISTS public.wheel_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    probability_weight INTEGER NOT NULL DEFAULT 1,
    color TEXT NOT NULL DEFAULT '#D4AF37', -- Default luxury gold
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies for wheel_rewards
ALTER TABLE public.wheel_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users on wheel_rewards"
ON public.wheel_rewards FOR SELECT USING (true);

CREATE POLICY "Enable write access for admins on wheel_rewards"
ON public.wheel_rewards FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- 2. Create Spin History Table
CREATE TABLE IF NOT EXISTS public.spin_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reward_id UUID REFERENCES public.wheel_rewards(id) ON DELETE SET NULL,
    points_won INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies for spin_history
ALTER TABLE public.spin_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users on spin_history" 
ON public.spin_history FOR SELECT USING (true); -- Public to allow the live feed

CREATE POLICY "Enable insert for authenticated users" 
ON public.spin_history FOR INSERT WITH CHECK (
    auth.uid() = user_id
);


-- 3. Settings for Spin Limits
-- Insert default values into settings if they don't exist
INSERT INTO public.settings (key, value, type)
VALUES 
    ('wheel_spins_per_day', '1', 'image'),
    ('wheel_enabled', 'true', 'image')
ON CONFLICT (key) DO NOTHING;


-- 4. RPC Function: spin_wheel
-- This function securely calculates the spin outcome and updates the user's points
CREATE OR REPLACE FUNCTION public.spin_wheel(user_uuid UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    spins_today INT;
    max_spins INT;
    wheel_is_active BOOLEAN;
    
    total_weight INT;
    random_val NUMERIC;
    current_weight_sum INT := 0;
    
    selected_reward RECORD;
BEGIN
    -- 1. Verify if wheel is enabled
    SELECT (value = 'true') INTO wheel_is_active FROM public.settings WHERE key = 'wheel_enabled';
    IF NOT wheel_is_active THEN
        RAISE EXCEPTION 'La roue de la fortune est actuellement désactivée.';
    END IF;

    -- 2. Check Daily Limits
    SELECT CAST(value AS INT) INTO max_spins FROM public.settings WHERE key = 'wheel_spins_per_day';
    
    SELECT COUNT(*) INTO spins_today 
    FROM public.spin_history 
    WHERE user_id = user_uuid 
    AND date_trunc('day', created_at) = date_trunc('day', timezone('utc'::text, now()));

    IF spins_today >= max_spins THEN
        RAISE EXCEPTION 'Vous avez atteint votre limite de tours pour aujourd''hui.';
    END IF;

    -- 3. Calculate Reward based on probability_weight
    SELECT SUM(probability_weight) INTO total_weight FROM public.wheel_rewards WHERE is_active = true;
    
    IF total_weight IS NULL OR total_weight = 0 THEN
        RAISE EXCEPTION 'Aucune récompense active sur la roue.';
    END IF;

    -- Generate a random number between 0 and total_weight
    random_val := random() * total_weight;
    
    -- Find the winning reward
    FOR selected_reward IN (SELECT id, label, points, probability_weight, color FROM public.wheel_rewards WHERE is_active = true ORDER BY id) LOOP
        current_weight_sum := current_weight_sum + selected_reward.probability_weight;
        IF random_val <= current_weight_sum THEN
            EXIT; -- We found the winner!
        END IF;
    END LOOP;

    -- 4. Record the Spin
    INSERT INTO public.spin_history (user_id, reward_id, points_won)
    VALUES (user_uuid, selected_reward.id, selected_reward.points);

    -- 5. Update User Points
    IF selected_reward.points > 0 THEN
        UPDATE public.profiles
        SET points = COALESCE(points, 0) + selected_reward.points
        WHERE id = user_uuid;
    END IF;

    -- 6. Return the Result
    RETURN json_build_object(
        'success', true,
        'reward_id', selected_reward.id,
        'label', selected_reward.label,
        'points_won', selected_reward.points,
        'color', selected_reward.color
    );
END;
$$;

-- Pre-populate some initial rewards
INSERT INTO public.wheel_rewards (label, points, probability_weight, color)
VALUES
    ('5 Points', 5, 40, '#D4AF37'),
    ('10 Points', 10, 30, '#E5E7EB'), -- Silver
    ('20 Points', 20, 15, '#F59E0B'), -- Amber
    ('50 Points', 50, 10, '#10B981'), -- Emerald
    ('100 Points', 100, 3, '#8B5CF6'), -- Violet
    ('Jackpot 500!', 500, 1, '#EF4444'), -- Red
    ('Réessayez demain', 0, 1, '#4B5563') -- Gray
ON CONFLICT DO NOTHING;
