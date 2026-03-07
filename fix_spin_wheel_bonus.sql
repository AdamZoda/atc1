-- ==============================================================================
-- 🎡 FIX: SPIN WHEEL (Handling Bonus Spins)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.spin_wheel(user_uuid UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    spins_today INT;
    max_spins INT;
    user_bonus_spins INT;
    wheel_is_active BOOLEAN;
    
    random_val NUMERIC;
    current_percentage_sum NUMERIC := 0;
    
    selected_reward RECORD;
    used_bonus BOOLEAN := false;
BEGIN
    -- 1. Verify if wheel is enabled
    SELECT (value = 'true') INTO wheel_is_active FROM public.settings WHERE key = 'wheel_enabled' LIMIT 1;
    IF NOT wheel_is_active THEN
        RAISE EXCEPTION 'La roue de la fortune est actuellement désactivée.';
    END IF;

    -- 2. Fetch User Stats (Daily Limit & Bonus Spins)
    SELECT COALESCE(bonus_spins, 0) INTO user_bonus_spins FROM public.profiles WHERE id = user_uuid;
    
    SELECT CAST(value AS INT) INTO max_spins FROM public.settings WHERE key = 'wheel_spins_per_day' LIMIT 1;
    
    SELECT COUNT(*) INTO spins_today 
    FROM public.spin_history 
    WHERE user_id = user_uuid 
    AND date_trunc('day', created_at) = date_trunc('day', timezone('utc'::text, now()));

    -- 3. Logic: If daily limit reached, check for bonus spins
    IF spins_today >= max_spins THEN
        IF user_bonus_spins > 0 THEN
            used_bonus := true;
        ELSE
            RAISE EXCEPTION 'Vous avez atteint votre limite de tours pour aujourd''hui.';
        END IF;
    END IF;

    -- 4. Calculate Reward (Percentage based logic from V4)
    random_val := random() * 100;
    
    FOR selected_reward IN (
        SELECT id, label, reward_type, reward_value, percentage, color 
        FROM public.wheel_rewards 
        WHERE is_active = true 
        ORDER BY id
    ) LOOP
        current_percentage_sum := current_percentage_sum + selected_reward.percentage;
        IF random_val <= current_percentage_sum THEN
            EXIT;
        END IF;
    END LOOP;

    -- Fallback
    IF selected_reward IS NULL THEN
        SELECT id, label, reward_type, reward_value, percentage, color INTO selected_reward 
        FROM public.wheel_rewards 
        WHERE is_active = true 
        ORDER BY percentage DESC 
        LIMIT 1;
    END IF;

    -- 5. Record the Spin
    INSERT INTO public.spin_history (user_id, reward_id, points_won)
    VALUES (
        user_uuid, 
        selected_reward.id, 
        CASE WHEN selected_reward.reward_type = 'points' THEN selected_reward.reward_value::INTEGER ELSE 0 END
    );

    -- 6. Update User Profile (Points & Bonus Spins)
    IF selected_reward.reward_type = 'points' AND selected_reward.reward_value::INTEGER > 0 THEN
        UPDATE public.profiles
        SET points = COALESCE(points, 0) + selected_reward.reward_value::INTEGER
        WHERE id = user_uuid;
    END IF;

    IF used_bonus THEN
        UPDATE public.profiles
        SET bonus_spins = GREATEST(0, COALESCE(bonus_spins, 0) - 1)
        WHERE id = user_uuid;
    END IF;

    -- 7. Return the Result
    RETURN json_build_object(
        'success', true,
        'reward_id', selected_reward.id,
        'label', selected_reward.label,
        'reward_type', selected_reward.reward_type,
        'reward_value', selected_reward.reward_value,
        'points_won', CASE WHEN selected_reward.reward_type = 'points' THEN selected_reward.reward_value::INTEGER ELSE 0 END,
        'color', selected_reward.color,
        'used_bonus', used_bonus
    );
END;
$$;
