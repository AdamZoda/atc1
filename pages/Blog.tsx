
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import RichTextEditor from '../components/Blog/RichTextEditor';
import {
    ArrowLeft, Save, Eye, Settings, Calendar,
    Globe, Layout, Tag, MapPin, ChevronDown, Check,
    MoreHorizontal, Image as ImageIcon, User, Clock, Plus, Trash2, Share2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Toast from '../components/Toast';
import { useNavigate, useParams } from 'react-router-dom';

interface BlogPost {
    id: string;
    title: string;
    slug: string;
    status: 'draft' | 'published' | 'archived';
    content: string;
    excerpt: string;
    cover_image: string | null;
    author_id: string;
    created_at: string;
    views: number;
    profiles?: { display_name: string };
}

const generateSlug = (text: string) => {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

const Blog: React.FC = () => {
    const [view, setView] = useState<'list' | 'editor' | 'read'>('list');
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Editor State
    const [currentPost, setCurrentPost] = useState<Partial<BlogPost>>({});
    const [editorContent, setEditorContent] = useState<string>('');
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const navigate = useNavigate();

    const { slug } = useParams();

    // Initial Load
    useEffect(() => {
        checkUser();
        if (slug) {
            fetchPostBySlug(slug);
        } else {
            fetchPosts();
        }
    }, [slug]);

    // Toast Auto-clear
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const fetchPostBySlug = async (postSlug: string) => {
        try {
            const { data, error } = await supabase
                .from('blog_posts')
                .select(`*, profiles(display_name)`)
                .eq('slug', postSlug)
                .single();

            if (error) throw error;
            if (data) {
                setCurrentPost(data);
                setEditorContent(data.content || '');
                setView('read');
                // Increment views
                await supabase.from('blog_posts').update({ views: (data.views || 0) + 1 }).eq('id', data.id);
            }
        } catch (err: any) {
            console.error('Error fetching post by slug:', err);
            setToast({ message: "Article introuvable", type: 'error' });
            fetchPosts();
        }
    };

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            if (profile?.role === 'admin') setIsAdmin(true);
        }
    };

    const fetchPosts = async () => {
        try {
            const { data, error } = await supabase
                .from('blog_posts')
                .select(`*, profiles(display_name)`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setPosts(data);
        } catch (err: any) {
            console.error('Error fetching blogs:', err);
            setToast({ message: `Erreur chargement: ${err.message}`, type: 'error' });
        }
    };

    // Auto-save
    useEffect(() => {
        if (view !== 'editor' || !currentPost.title) return;
        const timer = setTimeout(() => savePost(true), 10000); // 10s for auto-save
        return () => clearTimeout(timer);
    }, [currentPost.title, editorContent]);

    const savePost = async (isAutoSave = false, manualStatus?: 'published' | 'draft') => {
        if (!currentPost.title && !isAutoSave) {
            setToast({ message: 'Titre requis', type: 'error' });
            return;
        }

        setIsAutoSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Utilisateur non connecté');

            const slug = currentPost.slug || generateSlug(currentPost.title || 'untitled');

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = editorContent;
            const plainText = tempDiv.textContent || tempDiv.innerText || '';
            const excerpt = plainText.substring(0, 150) + '...';

            const postData = {
                title: currentPost.title || 'Sans titre',
                slug,
                content: editorContent,
                excerpt,
                status: manualStatus || currentPost.status || 'draft',
                author_id: user.id,
                updated_at: new Date().toISOString()
            };

            console.log('Saving post data:', postData);

            let result;
            if (currentPost.id) {
                result = await supabase.from('blog_posts').update(postData).eq('id', currentPost.id).select().single();
            } else {
                result = await supabase.from('blog_posts').insert(postData).select().single();

                // Handle duplicate slug error on NEW post
                if (result.error && result.error.code === '23505' && result.error.message.includes('blog_posts_slug_key')) {
                    console.log('Slug collision detected, retrying with suffix...');
                    const uniqueSlug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
                    postData.slug = uniqueSlug;
                    result = await supabase.from('blog_posts').insert(postData).select().single();
                }
            }

            if (result.error) throw result.error;

            if (result.data) {
                setCurrentPost(result.data);
                if (!isAutoSave) {
                    const isPublished = (manualStatus === 'published' || result.data.status === 'published');
                    setToast({
                        message: isPublished ? 'Article publié avec succès !' : 'Enregistré avec succès !',
                        type: 'success'
                    });
                    setTimeout(() => fetchPosts(), 500);
                }
            }
        } catch (e: any) {
            console.error('Save error:', e);
            let errorMsg = 'Problème lors de l\'enregistrement';
            if (e.code === '23505') errorMsg = 'Ce titre est déjà utilisé (slug existant).';
            setToast({ message: `Erreur: ${errorMsg}`, type: 'error' });
        } finally {
            setIsAutoSaving(false);
        }
    };

    const deletePost = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();

        try {
            const { error } = await supabase.from('blog_posts').delete().eq('id', id);
            if (error) throw error;
            setToast({ message: 'Article supprimé', type: 'success' });
            fetchPosts();
        } catch (err: any) {
            console.error('Delete error:', err);
            setToast({ message: `Erreur suppression: ${err.message}`, type: 'error' });
        }
    };

    const handleNewPost = () => {
        setCurrentPost({ status: 'draft', title: '' });
        setEditorContent('');
        setView('editor');
    };

    const handleEditPost = (post: BlogPost) => {
        setCurrentPost(post);
        setEditorContent(post.content || '');
        setView('editor');
    };

    // --- VIEWS ---

    if (view === 'read' && currentPost) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-20">
                <div className="relative h-[50vh] min-h-[400px]">
                    <div className="absolute inset-0">
                        {currentPost.cover_image ? (
                            <img src={currentPost.cover_image} alt={currentPost.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-900 via-black to-gray-900" />
                        )}
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    </div>

                    <div className="relative h-full max-w-7xl mx-auto px-6 flex flex-col justify-center items-center text-center">
                        <button onClick={() => navigate('/blog')} className="absolute top-8 left-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-lg border border-white/5">
                            <ArrowLeft size={20} /> Retour au journal
                        </button>
                        <h1 className="text-4xl md:text-6xl font-cinzel font-bold text-[#c5a059] mb-6 drop-shadow-2xl">{currentPost.title}</h1>
                        <div className="flex items-center gap-6 text-gray-300">
                            <div className="flex items-center gap-2"><User size={18} className="text-[#c5a059]" /><span>{currentPost.profiles?.display_name || 'Admin'}</span></div>
                            <div className="flex items-center gap-2"><Calendar size={18} className="text-[#c5a059]" /><span>{currentPost.created_at ? format(new Date(currentPost.created_at), 'dd MMMM yyyy', { locale: fr }) : ''}</span></div>
                            <button
                                onClick={() => {
                                    const url = `${window.location.origin}/#/blog/${currentPost.slug}`;
                                    navigator.clipboard.writeText(url);
                                    setToast({ message: 'Lien copié !', type: 'success' });
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all text-xs"
                            >
                                <Share2 size={16} className="text-[#c5a059]" /> Partager
                            </button>
                        </div>
                    </div>
                </div>
                <article className="max-w-3xl mx-auto px-6 py-12">
                    <div dangerouslySetInnerHTML={{ __html: currentPost.content || '' }} className="prose prose-invert prose-lg max-w-none prose-headings:font-cinzel prose-a:text-[#c5a059] prose-img:rounded-xl prose-img:shadow-lg" />
                </article>
                {toast && (
                    <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-xl shadow-2xl text-white font-bold backdrop-blur-xl border border-white/10 animate-fade-in-up z-50 ${toast.type === 'error' ? 'bg-red-500/90' : 'bg-[#c5a059]/90 !text-black'}`}>
                        {toast.message}
                    </div>
                )}
            </div>
        );
    }

    if (view === 'editor') {
        return (
            <div className="flex flex-col h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden pt-28">
                {/* Header Premium */}
                <div className="flex items-center justify-between px-4 py-2 bg-[#111] border-b border-white/10 shadow-lg z-30 h-16 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setView('list')} className="p-2 hover:bg-white/5 rounded-full text-gray-400">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-[#c5a059] rounded text-black flex items-center justify-center font-bold text-lg">A</div>
                            <input
                                type="text"
                                value={currentPost.title || ''}
                                onChange={(e) => setCurrentPost({ ...currentPost, title: e.target.value })}
                                placeholder="Titre de l'article..."
                                className="text-xl font-medium outline-none bg-transparent placeholder-gray-600 min-w-[300px] text-white"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{isAutoSaving ? 'Enregistrement...' : 'Modifications enregistrées'}</span>
                        <button onClick={() => savePost()} className="px-4 py-2 text-gray-300 font-bold hover:bg-white/5 rounded-lg text-sm border border-white/10 transition-all">
                            Sauvegarder
                        </button>
                        <button onClick={() => savePost(false, 'published')} className="bg-[#c5a059] hover:bg-[#b08d4a] text-black px-6 py-2 rounded-lg font-bold shadow-lg transition-all flex items-center gap-2">
                            <Save size={16} /> Publier
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden relative">
                    <div className="flex-1 h-full min-w-0 flex flex-col">
                        <RichTextEditor content={editorContent} onChange={setEditorContent} />
                    </div>

                    {/* Sidebar Premium */}
                    <div className={`w-[300px] bg-[#0d0d0d] border-l border-white/10 h-full overflow-y-auto shrink-0 transition-transform ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full absolute right-0'}`}>
                        <div className="p-6 space-y-8">
                            <h3 className="font-bold text-[#c5a059] text-xs uppercase tracking-[0.2em] border-b border-white/5 pb-4">Paramètres</h3>

                            <div className="space-y-3">
                                <label className="flex items-center gap-3 text-sm font-semibold text-gray-300 cursor-pointer hover:text-[#c5a059] transition-colors"><Tag size={18} /> Libellés <ChevronDown size={14} className="ml-auto" /></label>
                                <input type="text" placeholder="Actualité, Event..." className="w-full p-2.5 bg-white/5 border border-white/10 rounded text-sm text-white focus:border-[#c5a059] outline-none transition-colors" />
                            </div>

                            <div className="space-y-3 border-t border-white/5 pt-6">
                                <label className="flex items-center gap-3 text-sm font-semibold text-gray-300 cursor-pointer hover:text-[#c5a059]"><Calendar size={18} /> Publication <ChevronDown size={14} className="ml-auto" /></label>
                                <div className="space-y-2 text-xs text-gray-400">
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="date" defaultChecked className="accent-[#c5a059]" /> Automatique</label>
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="date" className="accent-[#c5a059]" /> Manuelle</label>
                                </div>
                            </div>

                            <div className="space-y-3 border-t border-white/5 pt-6">
                                <label className="flex items-center gap-3 text-sm font-semibold text-gray-300 cursor-pointer hover:text-[#c5a059]"><Globe size={18} /> Lien permanent <ChevronDown size={14} className="ml-auto" /></label>
                                <div className="space-y-2">
                                    <input type="text" value={currentPost.slug || generateSlug(currentPost.title || '')} onChange={(e) => setCurrentPost({ ...currentPost, slug: e.target.value })} className="w-full p-2.5 bg-white/5 border border-white/10 rounded text-sm text-gray-400 focus:border-[#c5a059] outline-none" placeholder="url-de-l-article" />
                                    <button
                                        onClick={() => {
                                            const slug = currentPost.slug || generateSlug(currentPost.title || 'article');
                                            const url = `${window.location.origin}/#/blog/${slug}`;
                                            navigator.clipboard.writeText(url);
                                            setToast({ message: 'Lien copié !', type: 'success' });
                                        }}
                                        className="text-[10px] text-[#c5a059] hover:underline flex items-center gap-1"
                                    >
                                        Copier le lien complet
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 border-t border-white/5 pt-6">
                                <label className="flex items-center gap-3 text-sm font-semibold text-gray-300 cursor-pointer hover:text-[#c5a059]"><ImageIcon size={18} /> Couverture</label>
                                <input type="text" value={currentPost.cover_image || ''} onChange={(e) => setCurrentPost({ ...currentPost, cover_image: e.target.value })} className="w-full p-2.5 bg-white/5 border border-white/10 rounded text-sm text-white outline-none mb-4 focus:border-[#c5a059]" placeholder="URL de l'image" />
                                {currentPost.cover_image && <div className="rounded-lg overflow-hidden border border-white/10"><img src={currentPost.cover_image} className="w-full h-40 object-cover opacity-80" /></div>}
                            </div>
                        </div>
                    </div>
                </div>

                {toast && (
                    <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-xl shadow-2xl text-white font-bold backdrop-blur-xl border border-white/10 animate-fade-in-up z-50 ${toast.type === 'error' ? 'bg-red-500/90' : 'bg-[#c5a059]/90 !text-black'}`}>
                        {toast.message}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-8 pt-32 md:pt-40 font-sans">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-4xl font-cinzel font-bold text-[#c5a059] mb-2 uppercase tracking-widest">Journal d'Atlantic</h1>
                        <p className="text-gray-500 text-sm">Gérez les actualités et chroniques de la ville.</p>
                    </div>
                    {isAdmin && (
                        <button onClick={handleNewPost} className="bg-[#c5a059] hover:bg-[#b08d4a] text-black px-8 py-3 rounded-full font-bold shadow-2xl transition-all transform hover:scale-105 flex items-center gap-3 uppercase text-sm tracking-widest">
                            <Plus size={20} /> Nouveau
                        </button>
                    )}
                </div>

                <div className="bg-white/5 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 p-6 border-b border-white/10 bg-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
                        <div className="col-span-6 ml-2">Article</div>
                        <div className="col-span-2">Auteur</div>
                        <div className="col-span-2">Date</div>
                        <div className="col-span-2 text-right mr-2">Actions</div>
                    </div>

                    {posts.map(post => (
                        <div key={post.id} className="grid grid-cols-12 gap-4 p-6 border-b border-white/5 items-center hover:bg-white/5 transition-all group">
                            <div className="col-span-6 flex items-center gap-4">
                                {post.cover_image && <img src={post.cover_image} className="w-16 h-16 rounded-lg object-cover border border-white/10 group-hover:scale-105 transition-transform" />}
                                <div>
                                    <h3
                                        className="font-cinzel font-bold text-white text-lg group-hover:text-[#c5a059] transition-colors cursor-pointer"
                                        onClick={() => navigate(`/blog/${post.slug}`)}
                                    >
                                        {post.title}
                                    </h3>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className={`px-2 py-0.5 rounded-[4px] text-[10px] uppercase font-black tracking-wider ${post.status === 'published' ? 'bg-[#c5a059] text-black' : 'bg-gray-800 text-gray-400'}`}>{post.status === 'published' ? 'Publié' : 'Brouillon'}</span>
                                        <span className="text-[10px] text-gray-500 flex items-center gap-1"><Eye size={12} /> {post.views || 0}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="col-span-2 text-sm text-gray-400 font-medium">{post.profiles?.display_name}</div>
                            <div className="col-span-2 text-xs text-gray-500">{format(new Date(post.created_at), 'dd/MM/yyyy', { locale: fr })}</div>
                            <div className="col-span-2 flex justify-end gap-3 pr-2">
                                <button
                                    onClick={() => {
                                        const url = `${window.location.origin}/#/blog/${post.slug}`;
                                        navigator.clipboard.writeText(url);
                                        setToast({ message: 'Lien copié !', type: 'success' });
                                    }}
                                    className="p-2 text-gray-500 hover:text-[#c5a059] hover:bg-[#c5a059]/10 rounded-lg transition-all"
                                    title="Copier le lien"
                                >
                                    <Share2 size={20} />
                                </button>
                                <button onClick={() => { setCurrentPost(post); setView('read'); }} className="p-2 text-gray-500 hover:text-[#c5a059] hover:bg-[#c5a059]/10 rounded-lg transition-all" title="Voir l'aperçu"><Eye size={20} /></button>
                                {isAdmin && (
                                    <button onClick={(e) => deletePost(post.id, e)} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all" title="Supprimer"><Trash2 size={20} /></button>
                                )}
                                <button onClick={() => handleEditPost(post)} className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Éditer"><MoreHorizontal size={20} /></button>
                            </div>
                        </div>
                    ))}
                    {posts.length === 0 && <div className="p-20 text-center text-gray-600 font-cinzel tracking-widest uppercase">Le journal est encore vierge.</div>}
                </div>
                {toast && (
                    <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-xl shadow-2xl text-white font-bold backdrop-blur-xl border border-white/10 animate-fade-in-up z-50 ${toast.type === 'error' ? 'bg-red-500/90' : 'bg-[#c5a059]/90 !text-black'}`}>
                        {toast.message}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Blog;

