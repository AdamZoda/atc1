-- ==============================================================================
-- 🛒 SHOP UPGRADE: POINT-BASED PRICING, INVENTORY & ATOMIC PURCHASES
-- ==============================================================================

-- 1. Update products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS points_price INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_points_enabled INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_money_enabled BOOLEAN DEFAULT true;

-- Ensure is_points_enabled is INTEGER (handles cases where it was previously BOOLEAN)
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'is_points_enabled' 
        AND data_type = 'boolean'
    ) THEN
        -- Drop default first to avoid casting error
        ALTER TABLE public.products ALTER COLUMN is_points_enabled DROP DEFAULT;
        ALTER TABLE public.products ALTER COLUMN is_points_enabled TYPE INTEGER USING (CASE WHEN is_points_enabled THEN 1 ELSE 0 END);
        ALTER TABLE public.products ALTER COLUMN is_points_enabled SET DEFAULT 0;
    END IF;
END $$;

-- 2. Create user_inventory table to track ownership
CREATE TABLE IF NOT EXISTS public.user_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    purchase_type TEXT DEFAULT 'points', -- 'points' or 'money'
    purchase_price INTEGER,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, product_id) -- Avoid duplicate purchases for the same item
);

-- Enable RLS on user_inventory
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own inventory" ON public.user_inventory;
CREATE POLICY "Users can view their own inventory" 
ON public.user_inventory FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all inventories" ON public.user_inventory;
CREATE POLICY "Admins can view all inventories" 
ON public.user_inventory FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND LOWER(TRIM(role)) = 'admin'
    )
);

-- 3. Create shop_orders table (for transaction logs)
CREATE TABLE IF NOT EXISTS public.shop_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    price_points INTEGER NOT NULL,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own orders" ON public.shop_orders;
CREATE POLICY "Users can view their own orders" 
ON public.shop_orders FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all orders" ON public.shop_orders;
CREATE POLICY "Admins can view all orders" 
ON public.shop_orders FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND LOWER(TRIM(role)) = 'admin'
    )
);

-- 4. RPC Function for Point Purchase (Atomic & with Inventory)
CREATE OR REPLACE FUNCTION public.purchase_product_with_points(p_product_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_points INTEGER;
    v_prod_points INTEGER;
    v_prod_enabled INTEGER;
    v_prod_stock INTEGER;
    v_already_owned BOOLEAN;
BEGIN
    -- Get user points
    SELECT COALESCE(points, 0) INTO v_user_points FROM public.profiles WHERE id = v_user_id;
    
    -- Get product info
    SELECT points_price, is_points_enabled, stock INTO v_prod_points, v_prod_enabled, v_prod_stock 
    FROM public.products WHERE id = p_product_id;

    -- Validations
    IF v_prod_points IS NULL THEN
        RAISE EXCEPTION 'Produit introuvable.';
    END IF;

    IF v_prod_enabled IS NULL OR v_prod_enabled = 0 THEN
        RAISE EXCEPTION 'Ce produit ne peut pas être acheté avec des points.';
    END IF;

    IF v_prod_stock = 0 THEN
        RAISE EXCEPTION 'Ce produit est en rupture de stock.';
    END IF;

    IF v_user_points < v_prod_points THEN
        RAISE EXCEPTION 'Points insuffisants (Requis: %, Vous avez: %).', v_prod_points, v_user_points;
    END IF;

    -- Check if already owned
    SELECT EXISTS(SELECT 1 FROM public.user_inventory WHERE user_id = v_user_id AND product_id = p_product_id) INTO v_already_owned;
    IF v_already_owned THEN
        RAISE EXCEPTION 'Vous possédez déjà ce produit.';
    END IF;

    -- Atomic Transaction
    -- 1. Deduct Points
    UPDATE public.profiles 
    SET points = points - v_prod_points 
    WHERE id = v_user_id;

    -- 2. Create Inventory Record
    INSERT INTO public.user_inventory (user_id, product_id, purchase_type, purchase_price)
    VALUES (v_user_id, p_product_id, 'points', v_prod_points);

    -- 3. Create Order Record (Log)
    INSERT INTO public.shop_orders (user_id, product_id, price_points)
    VALUES (v_user_id, p_product_id, v_prod_points);

    -- NOTE: Stock decrement is removed for point purchases to treat them as digital unlocks.
    -- If limited stock is required, it should be managed manually or via a separate flag.

    RETURN json_build_object(
        'success', true,
        'message', 'Achat réussi ! Produit ajouté à votre inventaire.',
        'points_spent', v_prod_points,
        'new_balance', v_user_points - v_prod_points
    );
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.purchase_product_with_points(UUID) TO authenticated;
