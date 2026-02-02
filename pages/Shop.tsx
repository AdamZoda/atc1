import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '../LanguageContext';
import { AlertCircle, Search, X, ChevronLeft, ChevronRight, Copy, Check, Heart, HeartOff, Star } from 'lucide-react';
import { toast } from 'sonner';
import AccessControl from '../components/AccessControl';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'; // You might need to install this or create a wrapper if not available, simply using a hidden class works too for accessibility if VisuallyHidden is not present. Actually, for DialogTitle/Description warning, we can just render them. 

interface Product {
  id: string;
  name: string;
  model_name?: string | null;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  featured: boolean;
  stock: number;
  on_sale?: boolean;
  sale_price?: number | null;
  images: string[] | null;
  youtube_url: string | null;
  is_favorite?: boolean;
  favorites_count?: number;
}

const getYouTubeId = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const getYouTubeThumbnail = (id: string) => `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;


const Shop: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    // Check authentication first
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/login');
      return;
    }

    // Fetch products
    const { data: productsData, error } = await supabase
      .from('products')
      .select('id, name, model_name, description, price, image_url, images, youtube_url, category, created_at, featured, stock, on_sale, sale_price')
      .order('created_at', { ascending: false });

    if (!error && productsData) {
      // Fetch user's favorites
      const { data: favoritesData } = await supabase
        .from('product_favorites')
        .select('product_id')
        .eq('user_id', session.user.id);

      const favoriteIds = new Set(favoritesData?.map(f => f.product_id) || []);

      // Fetch global favorite counts
      const { data: countsData } = await supabase
        .from('product_favorites')
        .select('product_id');

      const countsMap: Record<string, number> = {};
      countsData?.forEach(f => {
        countsMap[f.product_id] = (countsMap[f.product_id] || 0) + 1;
      });

      setProducts(productsData.map(product => ({
        ...product,
        category: typeof product.category === 'string' ? product.category : null,
        stock: typeof product.stock === 'number' ? product.stock : 0,
        on_sale: !!product.on_sale,
        sale_price: product.sale_price !== undefined && product.sale_price !== null ? Number(product.sale_price) : null,
        images: product.images || (product.image_url ? [product.image_url] : []),
        is_favorite: favoriteIds.has(product.id),
        favorites_count: countsMap[product.id] || 0,
      })));
    }
    setLoading(false);
  };

  const toggleFavorite = async (productId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Veuillez vous connecter pour ajouter des favoris");
      return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (product.is_favorite) {
      // Remove favorite
      const { error } = await supabase
        .from('product_favorites')
        .delete()
        .match({ user_id: session.user.id, product_id: productId });

      if (!error) {
        setProducts(prev => prev.map(p =>
          p.id === productId
            ? { ...p, is_favorite: false, favorites_count: Math.max(0, (p.favorites_count || 1) - 1) }
            : p
        ));
        toast.info("Retiré des favoris");
      } else {
        console.error("Error removing favorite:", error);
        toast.error("Échec de la suppression");
      }
    } else {
      // Add favorite
      const { error } = await supabase
        .from('product_favorites')
        .insert({ user_id: session.user.id, product_id: productId });

      if (!error) {
        setProducts(prev => prev.map(p =>
          p.id === productId
            ? { ...p, is_favorite: true, favorites_count: (p.favorites_count || 0) + 1 }
            : p
        ));
        toast.success("Ajouté aux favoris ! ❤️");
      } else {
        console.error("Error adding favorite:", error);
        toast.error("Échec de l'ajout aux favoris");
      }
    }
  };

  // Extraction des catégories uniques
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  // Filtrage des produits selon la recherche et la catégorie
  const filteredProducts = products.filter(product => {
    const query = search.trim().toLowerCase();
    const matchSearch =
      !query ||
      product.name.toLowerCase().includes(query) ||
      (product.description ? product.description.toLowerCase().includes(query) : false);
    const matchCategory = !category || product.category === category;
    const matchFavorite = !showOnlyFavorites || product.is_favorite;
    return matchSearch && matchCategory && matchFavorite;
  });

  const featuredProducts = filteredProducts.filter(p => p.featured);
  const regularProducts = filteredProducts.filter(p => !p.featured);

  return (
    <AccessControl pageName="Shop">
      <div className="min-h-screen pt-32 md:pt-40 lg:pt-48 pb-12 px-4 md:px-8 max-w-7xl mx-auto">

        {/* Header Section */}
        <div className="mb-16 text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black font-cinzel text-white mb-4 tracking-wider">
            ATLAN<span className="text-luxury-gold">TIC</span> SHOP
          </h1>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-luxury-gold/30 hidden md:block"></div>
            <p className="text-gray-400 text-sm md:text-lg uppercase tracking-[0.4em] font-light">
              Exclusivité & Prestige
            </p>
            <div className="h-px w-12 bg-luxury-gold/30 hidden md:block"></div>
          </div>
        </div>

        {/* Filters - Sticky on Mobile/Desktop */}
        <div className="sticky top-24 z-20 flex flex-col md:flex-row gap-4 mb-12 bg-black/60 p-4 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un véhicule, un item..."
              className="w-full pl-10 pr-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white focus:border-luxury-gold/50 focus:outline-none focus:ring-1 focus:ring-luxury-gold/50 transition-all placeholder:text-gray-600"
            />
          </div>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white focus:border-luxury-gold/50 focus:outline-none focus:ring-1 focus:ring-luxury-gold/50 cursor-pointer"
          >
            <option value="">Toutes les catégories</option>
            {categories.map(cat => (
              <option key={cat!} value={cat!}>{cat}</option>
            ))}
          </select>

          <button
            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg border transition-all ${showOnlyFavorites
              ? 'bg-luxury-gold/20 border-luxury-gold text-luxury-gold shadow-[0_0_15px_rgba(197,160,89,0.3)]'
              : 'bg-black/50 border-white/10 text-gray-400 hover:border-white/30'}`}
          >
            <Heart size={18} className={showOnlyFavorites ? 'fill-luxury-gold' : ''} />
            <span className="text-sm font-bold uppercase tracking-widest">Favoris</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-luxury-gold"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-black/20 rounded-2xl border border-white/5">
            <AlertCircle className="mx-auto h-12 w-12 text-luxury-gold mb-4 opacity-50" />
            <p className="text-gray-400 text-lg">Aucun produit trouvé.</p>
          </div>
        ) : (
          <div className="space-y-16">
            {/* Featured Section */}
            {featuredProducts.length > 0 && (
              <section>
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-luxury-gold/50"></div>
                  <h2 className="text-2xl font-cinzel font-bold text-luxury-gold uppercase tracking-widest">À la Une</h2>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-luxury-gold/50"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {featuredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onToggleFavorite={toggleFavorite} />
                  ))}
                </div>
              </section>
            )}

            {/* All Products Section */}
            <section>
              {featuredProducts.length > 0 && regularProducts.length > 0 && (
                <div className="flex items-center gap-4 mb-6">
                  <h2 className="text-xl font-cinzel font-bold text-white uppercase tracking-widest">Catalogue</h2>
                  <div className="h-px flex-1 bg-white/10"></div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {(featuredProducts.length > 0 ? regularProducts : filteredProducts).map((product) => (
                  <ProductCard key={product.id} product={product} onToggleFavorite={toggleFavorite} />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </AccessControl>
  );
};

const ProductCard: React.FC<{ product: Product, onToggleFavorite: (id: string) => void }> = ({ product, onToggleFavorite }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  const rawImages = product.images && product.images.length > 0 ? product.images : (product.image_url ? [product.image_url] : []);
  const youtubeId = product.youtube_url ? getYouTubeId(product.youtube_url) : null;

  const firstImage = rawImages.length > 0 ? rawImages[0] : null;
  const restImages = rawImages.length > 1 ? rawImages.slice(1) : [];

  const media = [
    ...(firstImage ? [{ type: 'image' as const, url: firstImage }] : []),
    ...(youtubeId ? [{ type: 'video' as const, url: product.youtube_url, id: youtubeId }] : []),
    ...restImages.map(url => ({ type: 'image' as const, url }))
  ];

  // Auto-rotate images locally and only when hovered to save resources
  useEffect(() => {
    if (!isHovered || media.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % media.length);
    }, 1500); // Faster rotation on hover (1.5s) for better responsiveness

    return () => clearInterval(interval);
  }, [isHovered, media.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
    >
      <Dialog>
        <DialogTrigger asChild>
          <Card
            className="overflow-hidden bg-black/40 border-luxury-gold/20 hover:border-luxury-gold/50 transition-all duration-300 group h-full flex flex-col cursor-pointer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
              setIsHovered(false);
              setCurrentImageIndex(0); // Optional: reset on leave
            }}
          >
            <div className="aspect-video overflow-hidden bg-black/50 relative">
              {media.length > 0 ? (
                <>
                  {media[currentImageIndex].type === 'video' ? (
                    <div className="relative w-full h-full group-hover:scale-110 transition-transform duration-500">
                      <img
                        src={getYouTubeThumbnail(media[currentImageIndex].id!)}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                          <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1"></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={media[currentImageIndex].url!}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  )}

                  {/* Pagination Dots */}
                  {media.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                      {media.map((_, idx) => (
                        <div
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'bg-luxury-gold w-3' : 'bg-white/50'}`}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-luxury-gold/20">
                  <span className="font-cinzel text-4xl font-bold">ATC</span>
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-2 right-2 flex flex-col gap-2 items-end">
                {product.stock === 0 && (
                  <span className="px-3 py-1 bg-red-900/90 text-white text-xs font-black uppercase tracking-widest border border-red-500/30 rounded-sm shadow-lg backdrop-blur-sm">
                    Rupture
                  </span>
                )}
                {product.on_sale && product.sale_price && (
                  <span className="px-3 py-1 bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-black uppercase tracking-widest rounded-sm shadow-lg">
                    Promo
                  </span>
                )}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(product.id);
                }}
                className="absolute top-2 left-2 p-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-white hover:text-red-500 transition-all z-10 group/heart"
              >
                <div className="flex flex-col items-center">
                  <Heart
                    size={18}
                    className={`${product.is_favorite ? 'fill-red-500 text-red-500' : 'text-white/70 group-hover/heart:text-red-500'} transition-colors`}
                  />
                  {product.favorites_count && product.favorites_count > 0 ? (
                    <span className="text-[8px] font-bold mt-0.5">{product.favorites_count}</span>
                  ) : null}
                </div>
              </button>
            </div>

            <CardContent className="p-5 flex-grow">
              <div className="mb-2">
                <h3 className="font-cinzel font-bold text-lg text-white truncate group-hover:text-luxury-gold transition-colors">
                  {product.name}
                </h3>
                {product.category && (
                  <p className="text-xs text-luxury-gold/60 uppercase tracking-wider">{product.category}</p>
                )}
              </div>
              {/* Description removed from card for cleaner look, moved to modal */}
              <div className="mt-4 flex items-end justify-between">
                <div className="flex flex-col">
                  {product.on_sale && product.sale_price ? (
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 line-through decoration-red-500/50">
                        {Number(product.price).toLocaleString('fr-FR')} $
                      </span>
                      <span className="text-xl font-bold text-red-500">
                        {Number(product.sale_price).toLocaleString('fr-FR')} $
                      </span>
                    </div>
                  ) : (
                    <span className="text-xl font-bold text-luxury-gold">
                      {Number(product.price).toLocaleString('fr-FR')} $
                    </span>
                  )}
                </div>
                {product.model_name && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-white/10 bg-white/5 hover:bg-luxury-gold hover:text-black transition-all gap-2 px-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(product.model_name!);
                      setCopied(true);
                      toast.success("Code copié");
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span className="text-[10px] font-bold uppercase tracking-widest">{product.model_name}</span>
                  </Button>
                )}
              </div>
            </CardContent>

            <CardFooter className="p-0">
              {/* Hidden footer, entire card is clickable */}
            </CardFooter>
          </Card>
        </DialogTrigger>
        <DialogContent className="bg-black/95 border border-luxury-gold/20 text-white w-[95vw] max-w-[1800px] h-[90vh] p-0 overflow-hidden rounded-3xl">
          <VisuallyHidden.Root>
            <DialogTitle>{product.name}</DialogTitle>
            <DialogDescription>Détails du produit</DialogDescription>
          </VisuallyHidden.Root>
          <div className="flex flex-col md:grid md:grid-cols-[70%_30%] w-full h-full overflow-y-auto md:overflow-hidden">
            {/* Left: Images */}
            <div className="relative h-64 md:h-full bg-black/50 group">
              {media.length > 0 ? (
                media[currentImageIndex].type === 'video' ? (
                  <div className="w-full h-full flex items-center justify-center bg-black">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${media[currentImageIndex].id}?autoplay=1`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="w-full h-full"
                    ></iframe>
                  </div>
                ) : (
                  <img
                    src={media[currentImageIndex].url!}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-luxury-gold/20">
                  <span className="font-cinzel text-6xl font-bold">ATC</span>
                </div>
              )}

              {/* Image Navigation */}
              {media.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(prev => (prev - 1 + media.length) % media.length);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-luxury-gold hover:text-black transition-all opacity-0 group-hover:opacity-100 z-10"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(prev => (prev + 1) % media.length);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-luxury-gold hover:text-black transition-all opacity-0 group-hover:opacity-100 z-10"
                  >
                    <ChevronRight size={24} />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {media.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(idx);
                        }}
                        className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIndex ? 'bg-luxury-gold w-4' : 'bg-white/50 hover:bg-white'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Right: Info */}
            <div className="p-6 md:p-8 flex flex-col h-full bg-gradient-to-b from-black/80 to-black/40 border-t md:border-t-0 md:border-l border-white/10">
              <div className="mb-6">
                <h2 className="text-3xl md:text-4xl font-cinzel font-black text-white mb-2">{product.name}</h2>
                {product.category && (
                  <span className="px-3 py-1 bg-white/10 text-luxury-gold text-xs font-bold uppercase tracking-widest rounded">
                    {product.category}
                  </span>
                )}
              </div>

              {/* Stats Bar */}
              <div className="flex gap-4 mb-6 pb-6 border-b border-white/5">
                <button
                  onClick={() => onToggleFavorite(product.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:border-red-500 transition-all group/modal-heart"
                >
                  <Heart
                    size={20}
                    className={`${product.is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-400 group-hover/modal-heart:text-red-500'}`}
                  />
                  <span className={`text-sm font-bold ${product.is_favorite ? 'text-red-500' : 'text-gray-400'}`}>
                    {product.favorites_count || 0} Favoris
                  </span>
                </button>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400">
                  <Star size={20} className="text-luxury-gold" />
                  <span className="text-sm font-bold">Produit Premium</span>
                </div>
              </div>

              {product.model_name && (
                <div className="mb-6 flex flex-col gap-2">
                  <span className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-bold">Spawn Code</span>
                  <div
                    className="bg-white/5 px-5 py-3 rounded-xl border border-white/10 flex items-center justify-between group/copy hover:bg-white/10 transition-all cursor-pointer"
                    onClick={() => {
                      navigator.clipboard.writeText(product.model_name || "");
                      toast.success("Code spawn copié !");
                    }}
                  >
                    <code className="text-luxury-gold font-bold font-mono text-lg tracking-widest">{product.model_name}</code>
                    <div className="flex items-center gap-2 text-gray-400 group-hover/copy:text-luxury-gold transition-colors">
                      <span className="text-[10px] uppercase font-bold tracking-widest opacity-0 group-hover/copy:opacity-100 transition-opacity">Copier</span>
                      <Copy size={20} />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto pr-2 mb-8 custom-scrollbar">
                <p className="text-gray-300 leading-relaxed text-lg whitespace-pre-wrap">
                  {product.description || "Aucune description disponible pour ce produit d'exception."}
                </p>
              </div>

              <div className="mt-auto space-y-6">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-gray-400 uppercase tracking-widest text-sm">Prix</span>
                  <div className="text-right">
                    {product.on_sale && product.sale_price ? (
                      <>
                        <div className="text-sm text-gray-500 line-through decoration-red-500/50">
                          {Number(product.price).toLocaleString('fr-FR')} $
                        </div>
                        <div className="text-3xl font-bold text-red-500">
                          {Number(product.sale_price).toLocaleString('fr-FR')} $
                        </div>
                      </>
                    ) : (
                      <div className="text-3xl font-bold text-luxury-gold">
                        {Number(product.price).toLocaleString('fr-FR')} $
                      </div>
                    )}
                  </div>
                </div>

                <a
                  href="https://discord.gg/pNsJ3RzDv2"
                  target="_blank"
                  rel="noreferrer"
                  className={`w-full bg-luxury-gold hover:bg-luxury-goldLight text-black font-black uppercase tracking-[0.2em] py-6 text-lg rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all flex items-center justify-center ${product.stock === 0 ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {product.stock === 0 ? 'Indisponible' : 'Acheter maintenant'}
                </a>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default Shop;

