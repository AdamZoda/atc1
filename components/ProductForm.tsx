import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const productSchema = z.object({
    name: z.string().trim().min(1, { message: 'Name is required' }),
    model_name: z.string().optional(),
    description: z.string().max(1000).optional(),
    price: z.number().positive(),
    image_url: z.string().url().optional().or(z.literal('')),
    youtube_url: z.string().url().optional().or(z.literal('')),
});

interface ProductFormProps {
    productId?: string | null;
    onSuccess: () => void;
    onCancel: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ productId, onSuccess, onCancel }) => {
    const isEditing = !!productId;
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        model_name: '',
        description: '',
        price: 0,
        image_url: '',
        youtube_url: '',
        category: '',
        featured: false,
        stock: 1,
        soldOut: false,
        newCategory: '',
        on_sale: false,
        sale_price: '',
        images: [] as string[],
    });
    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        fetchCategories();
        if (isEditing && productId) {
            fetchProduct(productId);
        }
    }, [productId, isEditing]);

    const fetchCategories = async () => {
        const { data, error } = await supabase
            .from('categories')
            .select('name')
            .order('name');

        if (!error && data) {
            const uniqueCats = data.map((cat: { name: string }) => cat.name);
            setCategories(uniqueCats);
        }
    };

    const fetchProduct = async (id: string) => {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error || !data) {
            toast.error('Produit non trouvé');
            onCancel();
        } else {
            setFormData({
                name: data.name,
                model_name: data.model_name || '',
                description: data.description || '',
                price: data.price,
                image_url: data.image_url || '',
                youtube_url: data.youtube_url || '',
                category: data.category || '',
                featured: data.featured || false,
                stock: typeof data.stock === 'number' ? data.stock : 1,
                soldOut: data.stock === 0,
                newCategory: '',
                on_sale: !!data.on_sale,
                sale_price: data.sale_price ? data.sale_price.toString() : '',
                images: data.images || [],
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validation = productSchema.safeParse({
            name: formData.name,
            description: formData.description,
            price: Number(formData.price),
            image_url: formData.image_url,
        });

        if (!validation.success) {
            toast.error(validation.error.errors[0].message);
            return;
        }

        setLoading(true);

        const productData = {
            name: formData.name.trim(),
            model_name: formData.model_name.trim(),
            description: formData.description.trim() || null,
            price: Number(formData.price),
            image_url: formData.image_url.trim() || null,
            youtube_url: formData.youtube_url.trim() || null,
            category: formData.category || null,
            featured: formData.featured,
            stock: formData.soldOut ? 0 : (Number(formData.stock) || 1),
            on_sale: !!formData.on_sale,
            sale_price: formData.on_sale && formData.sale_price ? Number(formData.sale_price) : null,
            images: formData.images.length > 0 ? formData.images : (formData.image_url ? [formData.image_url] : []),
        };

        if (isEditing && productId) {
            const { error } = await supabase
                .from('products')
                .update(productData)
                .eq('id', productId);

            if (error) {
                toast.error('Erreur lors de la mise à jour');
            } else {
                toast.success('Produit mis à jour');
                onSuccess();
            }
        } else {
            const { error } = await supabase
                .from('products')
                .insert([productData]);

            if (error) {
                toast.error('Erreur lors de la création');
            } else {
                toast.success('Produit créé');
                onSuccess();
            }
        }

        setLoading(false);
    };

    const handleCreateCategory = async () => {
        if (!formData.newCategory.trim()) return;

        try {
            const newCat = formData.newCategory.trim();
            const { error: categoryError } = await supabase
                .from('categories')
                .insert([{ name: newCat }]);

            if (categoryError) {
                if (categoryError.code === '23505') {
                    toast.error('Cette catégorie existe déjà');
                } else {
                    throw categoryError;
                }
                return;
            }

            await fetchCategories();
            setFormData(prev => ({
                ...prev,
                category: newCat,
                newCategory: ''
            }));

            toast.success('Catégorie créée');
        } catch (error) {
            toast.error("Erreur lors de la création de la catégorie");
        }
    };

    return (
        <Card className="bg-black/50 border-luxury-gold/20 text-white">
            <CardHeader>
                <CardTitle className="text-2xl text-luxury-gold font-cinzel">
                    {isEditing ? 'Modifier le Produit' : 'Ajouter un Produit'}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-gray-300">Nom du Produit *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: BMW M5 CS"
                            className="bg-black/40 border-white/10 focus:border-luxury-gold/50 text-white"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="model_name" className="text-gray-300">
                            Nom du Modèle *
                        </Label>
                        <Input
                            id="model_name"
                            value={formData.model_name}
                            onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                            placeholder="Ex: bmwm5cs (spawn name)"
                            required
                            className="bg-black/40 border-white/10 focus:border-luxury-gold/50 text-white font-mono"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-gray-300">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Description détaillée..."
                            rows={4}
                            className="bg-black/40 border-white/10 focus:border-luxury-gold/50 text-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="price" className="text-gray-300">Prix ($) *</Label>
                        <Input
                            id="price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                            placeholder="0.00"
                            required
                            className="bg-black/40 border-white/10 focus:border-luxury-gold/50 text-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-gray-300 flex justify-between">
                            Galerie Images ({formData.images.length})
                            <a href="https://postimages.org/" target="_blank" rel="noreferrer" className="text-xs text-luxury-gold hover:underline">Héberger une image</a>
                        </Label>

                        {/* URL principale (legacy/cover) */}
                        <div className="flex gap-2">
                            <Input
                                id="image_url"
                                type="url"
                                value={formData.image_url}
                                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                placeholder="Image principale (Cover)"
                                className="bg-black/40 border-white/10 focus:border-luxury-gold/50 text-white"
                            />
                            <Button
                                type="button"
                                onClick={() => {
                                    if (formData.image_url) {
                                        setFormData(prev => ({
                                            ...prev,
                                            images: [...prev.images, prev.image_url],
                                            image_url: ''
                                        }));
                                    }
                                }}
                                className="bg-green-600/20 hover:bg-green-600 text-green-500 hover:text-white"
                            >
                                +
                            </Button>
                        </div>

                        {/* YouTube URL */}
                        <div className="space-y-2">
                            <Label htmlFor="youtube_url" className="text-gray-300">Vidéo YouTube (Optionnel)</Label>
                            <Input
                                id="youtube_url"
                                type="url"
                                value={formData.youtube_url}
                                onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                                placeholder="https://www.youtube.com/watch?v=..."
                                className="bg-black/40 border-white/10 focus:border-luxury-gold/50 text-white"
                            />
                        </div>

                        {/* Liste des images supplémentaires */}
                        <div className="space-y-2 max-h-40 overflow-y-auto p-2 bg-black/20 rounded">
                            {formData.images.map((img, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                    <img src={img} alt="" className="w-8 h-8 object-cover rounded border border-white/10" />
                                    <Input
                                        value={img}
                                        onChange={(e) => {
                                            const newImages = [...formData.images];
                                            newImages[idx] = e.target.value;
                                            setFormData(prev => ({ ...prev, images: newImages }));
                                        }}
                                        className="h-8 text-xs bg-black/40 border-white/10"
                                    />
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            const newImages = formData.images.filter((_, i) => i !== idx);
                                            setFormData(prev => ({ ...prev, images: newImages }));
                                        }}
                                        className="h-8 w-8 p-0 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white"
                                    >
                                        ×
                                    </Button>
                                </div>
                            ))}
                            <Button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, images: [...prev.images, ''] }))}
                                className="w-full h-8 text-xs bg-white/5 hover:bg-white/10 text-gray-400"
                            >
                                + Ajouter une autre image
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category" className="text-gray-300">Catégorie</Label>
                        <div className="flex gap-2 items-center">
                            <select
                                id="category"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value, newCategory: '' })}
                                className="flex-1 px-4 py-2 rounded-md bg-black/40 text-white border border-white/10 focus:outline-none focus:border-luxury-gold/50"
                            >
                                <option value="">Choisir une catégorie</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="text"
                                    value={formData.newCategory}
                                    onChange={e => setFormData({ ...formData, newCategory: e.target.value, category: '' })}
                                    placeholder="Nouvelle cat."
                                    className="w-32 bg-black/40 border-white/10 text-white"
                                />
                                <Button
                                    type="button"
                                    onClick={handleCreateCategory}
                                    className="bg-luxury-gold/20 hover:bg-luxury-gold text-luxury-gold hover:text-black border border-luxury-gold/50"
                                >
                                    +
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 p-4 border border-white/10 rounded-lg bg-black/20">
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="featured"
                                checked={formData.featured}
                                onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                                className="w-4 h-4 rounded border-luxury-gold/50 text-luxury-gold focus:ring-luxury-gold bg-black"
                            />
                            <Label htmlFor="featured" className="text-gray-300 cursor-pointer">Mettre à la Une</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="soldOut"
                                checked={formData.soldOut}
                                onChange={(e) => setFormData(prev => ({ ...prev, soldOut: e.target.checked }))}
                                className="w-4 h-4 rounded border-red-500/50 text-red-500 focus:ring-red-500 bg-black"
                            />
                            <Label htmlFor="soldOut" className="text-red-400 cursor-pointer">Marquer comme Vendu (Rupture)</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="on_sale"
                                checked={formData.on_sale}
                                onChange={e => setFormData(prev => ({ ...prev, on_sale: e.target.checked }))}
                                className="w-4 h-4 rounded border-green-500/50 text-green-500 focus:ring-green-500 bg-black"
                            />
                            <Label htmlFor="on_sale" className="text-green-400 cursor-pointer">En Promotion</Label>
                        </div>

                        {formData.on_sale && (
                            <Input
                                type="number"
                                placeholder="Prix Promotionnel"
                                value={formData.sale_price}
                                onChange={e => setFormData(prev => ({ ...prev, sale_price: e.target.value }))}
                                className="bg-black/40 border-green-500/30 focus:border-green-500 text-white w-full"
                            />
                        )}
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button type="submit" disabled={loading} className="flex-1 bg-luxury-gold text-black hover:bg-white font-bold">
                            {loading ? 'Sauvegarde...' : isEditing ? 'Mettre à jour' : 'Créer le Produit'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            className="border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                        >
                            Annuler
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};

export default ProductForm;
