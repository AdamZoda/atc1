-- Upgrade Wheel to V4: Text Rewards and Percentage Probabilities

-- 1. Update wheel_rewards table
ALTER TABLE public.wheel_rewards 
ADD COLUMN IF NOT EXISTS reward_type TEXT DEFAULT 'points',
ADD COLUMN IF NOT EXISTS reward_value TEXT,
ADD COLUMN IF NOT EXISTS percentage NUMERIC DEFAULT 0;

-- 2. Migrate existing data
UPDATE public.wheel_rewards 
SET reward_value = points::text,
    percentage = (probability_weight::numeric / (SELECT SUM(probability_weight) FROM public.wheel_rewards WHERE is_active = true) * 100)
WHERE reward_value IS NULL;

-- 3. Update spin_wheel function
CREATE OR REPLACE FUNCTION public.spin_wheel(user_uuid UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    spins_today INT;
    max_spins INT;
    wheel_is_active BOOLEAN;
    
    random_val NUMERIC;
    current_percentage_sum NUMERIC := 0;
    
    selected_reward RECORD;
BEGIN
    -- 1. Verify if wheel is enabled
    SELECT (value = 'true') INTO wheel_is_active FROM public.settings WHERE key = 'wheel_enabled' LIMIT 1;
    IF NOT wheel_is_active THEN
        RAISE EXCEPTION 'La roue de la fortune est actuellement désactivée.';
    END IF;

    -- 2. Check Daily Limits
    SELECT CAST(value AS INT) INTO max_spins FROM public.settings WHERE key = 'wheel_spins_per_day' LIMIT 1;
    
    SELECT COUNT(*) INTO spins_today 
    FROM public.spin_history 
    WHERE user_id = user_uuid 
    AND date_trunc('day', created_at) = date_trunc('day', timezone('utc'::text, now()));

    IF spins_today >= max_spins THEN
        RAISE EXCEPTION 'Vous avez atteint votre limite de tours pour aujourd''hui.';
    END IF;

    -- 3. Calculate Reward based on percentage
    -- We'll use a random number from 0 to 100
    random_val := random() * 100;
    
    -- Find the winning reward based on the percentage sum
    FOR selected_reward IN (SELECT id, label, reward_type, reward_value, percentage, color FROM public.wheel_rewards WHERE is_active = true ORDER BY id) LOOP
        current_percentage_sum := current_percentage_sum + selected_reward.percentage;
        IF random_val <= current_percentage_sum THEN
            EXIT; -- We found the winner!
        END IF;
    END LOOP;

    -- Fallback if random_val was slightly above total percentage due to rounding
    IF selected_reward IS NULL THEN
        SELECT id, label, reward_type, reward_value, percentage, color INTO selected_reward 
        FROM public.wheel_rewards 
        WHERE is_active = true 
        ORDER BY percentage DESC 
        LIMIT 1;
    END IF;

    -- 4. Record the Spin
    INSERT INTO public.spin_history (user_id, reward_id, points_won)
    VALUES (
        user_uuid, 
        selected_reward.id, 
        CASE WHEN selected_reward.reward_type = 'points' THEN selected_reward.reward_value::INTEGER ELSE 0 END
    );

    -- 5. Update User Points
    IF selected_reward.reward_type = 'points' AND selected_reward.reward_value::INTEGER > 0 THEN
        UPDATE public.profiles
        SET points = COALESCE(points, 0) + selected_reward.reward_value::INTEGER
        WHERE id = user_uuid;
    END IF;

    -- 6. Return the Result
    RETURN json_build_object(
        'success', true,
        'reward_id', selected_reward.id,
        'label', selected_reward.label,
        'reward_type', selected_reward.reward_type,
        'reward_value', selected_reward.reward_value,
        'points_won', CASE WHEN selected_reward.reward_type = 'points' THEN selected_reward.reward_value::INTEGER ELSE 0 END,
        'color', selected_reward.color
    );
END;
$$;
