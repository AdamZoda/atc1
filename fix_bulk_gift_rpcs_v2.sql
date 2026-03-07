-- ==============================================================================
-- 🛠️ FIX V2: UNIFIED GIFT BULK RPC (Resolving 400 Bad Request)
-- ==============================================================================

-- 1. DROP OLD FUNCTIONS (Clean state)
DROP FUNCTION IF EXISTS public.gift_bonus_spins_bulk();
DROP FUNCTION IF EXISTS public.gift_bonus_spins_bulk(INT);
DROP FUNCTION IF EXISTS public.gift_bonus_spins_bulk(INTEGER);
DROP FUNCTION IF EXISTS public.gift_points_bulk();
DROP FUNCTION IF EXISTS public.gift_points_bulk(INT);
DROP FUNCTION IF EXISTS public.gift_points_bulk(INTEGER);

-- 2. CREATE NEW UNIFIED FUNCTION
-- This name is unique and avoids any potential signature caching issues.
CREATE OR REPLACE FUNCTION public.gift_bulk_assets(p_spins INTEGER DEFAULT 0, p_points INTEGER DEFAULT 0)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_role TEXT;
BEGIN
    -- Security Check
    SELECT LOWER(TRIM(role)) INTO admin_role FROM public.profiles WHERE id = auth.uid();
    
    IF admin_role IS NULL OR admin_role != 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Expected admin role, found "%".', COALESCE(admin_role, 'NULL');
    END IF;

    -- Bulk Update Spins
    IF p_spins > 0 THEN
        UPDATE public.profiles
        SET bonus_spins = COALESCE(bonus_spins, 0) + p_spins
        WHERE id IS NOT NULL;
    END IF;

    -- Bulk Update Points
    IF p_points > 0 THEN
        UPDATE public.profiles
        SET points = COALESCE(points, 0) + p_points
        WHERE id IS NOT NULL;
    END IF;

    RETURN json_build_object(
        'success', true,
        'message', 'Bulk rewards distributed: ' || p_spins || ' spins, ' || p_points || ' points.'
    );
END;
$$;

-- 3. PERMISSIONS
REVOKE ALL ON FUNCTION public.gift_bulk_assets(INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gift_bulk_assets(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gift_bulk_assets(INTEGER, INTEGER) TO service_role;
