-- ==============================================================================
-- 🎡 WHEEL UPGRADE V2 - Bonus Spins + Updated RPC
-- ==============================================================================

-- 1. Add bonus_spins column to profiles (extra spins given by admin)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bonus_spins INTEGER NOT NULL DEFAULT 0;

-- 2. Updated spin_wheel function: supports bonus spins
-- If the user has exhausted their daily limit but has bonus_spins > 0,
-- they can still spin and 1 bonus spin is consumed.
CREATE OR REPLACE FUNCTION public.spin_wheel(user_uuid UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    spins_today INT;
    max_spins INT;
    wheel_is_active BOOLEAN;
    user_bonus_spins INT;
    
    total_weight INT;
    random_val NUMERIC;
    current_weight_sum INT := 0;
    
    selected_reward RECORD;
    used_bonus BOOLEAN := false;
BEGIN
    -- 1. Verify if wheel is enabled
    SELECT (value = 'true') INTO wheel_is_active FROM public.settings WHERE key = 'wheel_enabled';
    IF NOT wheel_is_active THEN
        RAISE EXCEPTION 'La roue de la fortune est actuellement désactivée.';
    END IF;

    -- 2. Check Daily Limits + Bonus Spins
    SELECT CAST(value AS INT) INTO max_spins FROM public.settings WHERE key = 'wheel_spins_per_day';
    
    SELECT COUNT(*) INTO spins_today 
    FROM public.spin_history 
    WHERE user_id = user_uuid 
    AND date_trunc('day', created_at) = date_trunc('day', timezone('utc'::text, now()));

    -- Get the user's bonus spins
    SELECT COALESCE(bonus_spins, 0) INTO user_bonus_spins FROM public.profiles WHERE id = user_uuid;

    IF spins_today >= max_spins THEN
        -- Check if user has bonus spins
        IF user_bonus_spins > 0 THEN
            used_bonus := true;
        ELSE
            RAISE EXCEPTION 'Vous avez atteint votre limite de tours pour aujourd''hui.';
        END IF;
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
            EXIT;
        END IF;
    END LOOP;

    -- 4. Record the Spin
    INSERT INTO public.spin_history (user_id, reward_id, points_won)
    VALUES (user_uuid, selected_reward.id, selected_reward.points);

    -- 5. Consume bonus spin if used
    IF used_bonus THEN
        UPDATE public.profiles SET bonus_spins = bonus_spins - 1 WHERE id = user_uuid;
    END IF;

    -- 6. Update User Points
    IF selected_reward.points > 0 THEN
        UPDATE public.profiles
        SET points = COALESCE(points, 0) + selected_reward.points
        WHERE id = user_uuid;
    END IF;

    -- 7. Return the Result
    RETURN json_build_object(
        'success', true,
        'reward_id', selected_reward.id,
        'label', selected_reward.label,
        'points_won', selected_reward.points,
        'color', selected_reward.color,
        'used_bonus', used_bonus
    );
END;
$$;

-- 3. RPC function for admin to gift bonus spins
CREATE OR REPLACE FUNCTION public.gift_bonus_spins(target_user_id UUID, spins_count INT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_role TEXT;
BEGIN
    -- Verify caller is admin
    SELECT role INTO admin_role FROM public.profiles WHERE id = auth.uid();
    IF admin_role != 'admin' THEN
        RAISE EXCEPTION 'Seuls les administrateurs peuvent offrir des tours bonus.';
    END IF;

    -- Add bonus spins
    UPDATE public.profiles
    SET bonus_spins = COALESCE(bonus_spins, 0) + spins_count
    WHERE id = target_user_id;

    RETURN json_build_object(
        'success', true,
        'message', spins_count || ' tours bonus offerts avec succès.'
    );
END;
$$;
