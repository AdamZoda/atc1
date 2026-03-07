-- 1. Fonction pour offrir des tours bonus à TOUS les utilisateurs
CREATE OR REPLACE FUNCTION public.gift_bonus_spins_bulk(spins_count INT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_role TEXT;
BEGIN
    SELECT role INTO admin_role FROM public.profiles WHERE id = auth.uid();
    IF admin_role != 'admin' THEN
        RAISE EXCEPTION 'Seuls les administrateurs peuvent offrir des tours bonus.';
    END IF;

    UPDATE public.profiles
    SET bonus_spins = COALESCE(bonus_spins, 0) + spins_count;

    RETURN json_build_object(
        'success', true,
        'message', 'Tours bonus offerts à tous les utilisateurs.'
    );
END;
$$;

-- 2. Fonction pour offrir des points à TOUS les utilisateurs
CREATE OR REPLACE FUNCTION public.gift_points_bulk(points_count INT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_role TEXT;
BEGIN
    SELECT role INTO admin_role FROM public.profiles WHERE id = auth.uid();
    IF admin_role != 'admin' THEN
        RAISE EXCEPTION 'Seuls les administrateurs peuvent offrir des points.';
    END IF;

    UPDATE public.profiles
    SET points = COALESCE(points, 0) + points_count;

    RETURN json_build_object(
        'success', true,
        'message', 'Points offerts à tous les utilisateurs.'
    );
END;
$$;
