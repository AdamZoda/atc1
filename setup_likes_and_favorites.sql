-- Création de la table pour les Likes de la galerie Media
CREATE TABLE IF NOT EXISTS public.post_likes (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id BIGINT REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, post_id)
);

-- Index pour la performance
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);

-- RLS pour post_likes
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tout le monde peut voir les likes" 
ON public.post_likes FOR SELECT 
USING (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent liker" 
ON public.post_likes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent supprimer leur like" 
ON public.post_likes FOR DELETE 
USING (auth.uid() = user_id);


-- Création de la table pour les Favoris du Shop
CREATE TABLE IF NOT EXISTS public.product_favorites (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, product_id)
);

-- Index pour la performance
CREATE INDEX IF NOT EXISTS idx_product_favorites_product_id ON public.product_favorites(product_id);

-- RLS pour product_favorites
ALTER TABLE public.product_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tout le monde peut voir les favoris" 
ON public.product_favorites FOR SELECT 
USING (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent ajouter des favoris" 
ON public.product_favorites FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent supprimer leurs favoris" 
ON public.product_favorites FOR DELETE 
USING (auth.uid() = user_id);
