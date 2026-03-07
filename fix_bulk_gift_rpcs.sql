-- ==============================================================================
-- 🛠️ FIX: GIFT BULK RPCs (Robust Version)
-- ==============================================================================

-- 1. Ensure columns exist in profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bonus_spins INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0;

-- 2. Drop existing functions with any potential signature to avoid conflicts
DROP FUNCTION IF EXISTS public.gift_bonus_spins_bulk();
DROP FUNCTION IF EXISTS public.gift_bonus_spins_bulk(INT);
DROP FUNCTION IF EXISTS public.gift_bonus_spins_bulk(INTEGER);
DROP FUNCTION IF EXISTS public.gift_points_bulk();
DROP FUNCTION IF EXISTS public.gift_points_bulk(INT);
DROP FUNCTION IF EXISTS public.gift_points_bulk(INTEGER);

-- 3. Redefine gift_bonus_spins_bulk with robust role check
CREATE OR REPLACE FUNCTION public.gift_bonus_spins_bulk(spins_count INT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_role TEXT;
BEGIN
    -- Get caller role (case-insensitive and trimmed)
    SELECT LOWER(TRIM(role)) INTO admin_role FROM public.profiles WHERE id = auth.uid();
    
    IF admin_role IS NULL OR admin_role != 'admin' THEN
        RAISE EXCEPTION 'Accès refusé: Rôle attendu "admin", trouvé "%".', COALESCE(admin_role, 'NULL');
    END IF;

    -- Bulk Update
    UPDATE public.profiles
    SET bonus_spins = COALESCE(bonus_spins, 0) + spins_count;

    RETURN json_build_object(
        'success', true,
        'message', 'Tours bonus offerts à tous les utilisateurs (' || spins_count || ').'
    );
END;
$$;

-- 4. Redefine gift_points_bulk with robust role check
CREATE OR REPLACE FUNCTION public.gift_points_bulk(points_count INT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_role TEXT;
BEGIN
    -- Get caller role (case-insensitive and trimmed)
    SELECT LOWER(TRIM(role)) INTO admin_role FROM public.profiles WHERE id = auth.uid();
    
    IF admin_role IS NULL OR admin_role != 'admin' THEN
        RAISE EXCEPTION 'Accès refusé: Rôle attendu "admin", trouvé "%".', COALESCE(admin_role, 'NULL');
    END IF;

    -- Bulk Update
    UPDATE public.profiles
    SET points = COALESCE(points, 0) + points_count;

    RETURN json_build_object(
        'success', true,
        'message', 'Points offerts à tous les utilisateurs (' || points_count || ').'
    );
END;
$$;

-- 5. Set permissions explicitly
GRANT EXECUTE ON FUNCTION public.gift_bonus_spins_bulk(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gift_points_bulk(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gift_bonus_spins_bulk(INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.gift_points_bulk(INT) TO service_role;
