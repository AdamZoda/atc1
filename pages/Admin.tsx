  // Supprimer un utilisateur
  const deleteUser = async (userId: string, username: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${username} ? Cette action est irréversible.`)) return;
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (!error) {
      alert(`${username} a été supprimé !`);
      // Si l'utilisateur supprimé est l'utilisateur courant, déconnexion immédiate
      const currentSession = await supabase.auth.getSession();
      const currentUserId = currentSession?.data?.session?.user?.id;
      if (currentUserId && currentUserId === userId) {
        await supabase.auth.signOut();
        window.location.href = '/';
      } else {
        fetchUsers();
      }
    } else {
      alert(`Erreur: ${error.message}`);
    }
  };

  // Retirer le rôle admin
  const removeAdmin = async (userId: string, username: string) => {
    if (!confirm(`Retirer les droits admin à ${username} ?`)) return;
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'user' })
      .eq('id', userId);
    if (!error) {
      alert(`${username} n'est plus admin.`);
      fetchUsers();
    } else {
      alert(`Erreur: ${error.message}`);
    }
  };

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { Profile, Post, RuleCategory, Rule } from '../types';
import { Users, FilePlus, ShieldCheck, Trash2, Upload, Send, LayoutDashboard, Settings, Video, Image as ImageIcon, BookOpen } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import LocationDisplay from '../components/LocationDisplay';

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'posts' | 'config' | 'rules'>('users');
  const [users, setUsers] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<RuleCategory[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  // Post form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'file'>('image');
  const [submitting, setSubmitting] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  // Page visibility state
  const [pageVisibilities, setPageVisibilities] = useState<{ [key: string]: boolean }>({});
  const [pageVisibilityLoading, setPageVisibilityLoading] = useState(false);

  // Rules state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Site Config state
  const [bgUrl, setBgUrl] = useState('');
  const [bgType, setBgType] = useState<'image' | 'video'>('image');
  const [bgSubmitting, setBgSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
        return;
      }
      fetchUsers();
      fetchPosts();
      fetchRules();
      fetchPageVisibilities();
    });
  }, [navigate]);

  const fetchRules = async () => {
    const { data: catData } = await supabase
      .from('rule_categories')
      .select('*')
      .order('created_at', { ascending: true });

    const { data: rulesData } = await supabase
      .from('rules')
      .select('*')
      .order('order', { ascending: true });

    if (catData) {
      setCategories(catData);
      setSelectedCategoryId(catData[0]?.id || null);
    }
    if (rulesData) setRules(rulesData);
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');
    if (data) setUsers(data);
    setLoading(false);
  };

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setPosts(data);
  };

  const promoteAdmin = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userId);
    if (!error) fetchUsers();
  };

  const fetchPageVisibilities = async () => {
    try {
      const { data } = await supabase
        .from('page_visibility')
        .select('*');

      if (data) {
        const visibilities: { [key: string]: boolean } = {};
        data.forEach((page: any) => {
          visibilities[page.id] = page.is_visible;
        });
        setPageVisibilities(visibilities);
      }
    } catch (error) {
      console.error('Error fetching page visibilities:', error);
    }
  };

  const updatePageVisibility = async (pageId: string, isVisible: boolean) => {
    try {
      setPageVisibilityLoading(true);
      console.log('🔄 DÉBUT UPDATE - pageId:', pageId, 'isVisible:', isVisible);
      console.log('📤 Envoi de la requête Supabase UPDATE...');
      
      // Utiliser l'UPDATE direct (RLS disabled)
      const { error } = await supabase
        .from('page_visibility')
        .update({ is_visible: isVisible })
        .eq('id', pageId);

      console.log('✅ RÉPONSE SUPABASE - error:', error);

      if (error) {
        console.error('🔴 ERREUR DÉTECTÉE:', error.message, error.code, error.details);
        throw error;
      }

      console.log('✨ Mise à jour UI locale...');
      setPageVisibilities((prev) => ({
        ...prev,
        [pageId]: isVisible,
      }));
      
      console.log('✅ SUCCESS COMPLET');
      alert('✅ Changement sauvegardé!');
    } catch (error) {
      console.error('❌ ERREUR COMPLÈTE:', error);
      alert('Erreur lors de la mise à jour: ' + (error as any).message);
    } finally {
      setPageVisibilityLoading(false);
    }
  };

  const banUser = async (userId: string, username: string) => {
    if (!confirm(`Êtes-vous sûr de bannir ${username} ? Ils ne pourront plus accéder au site.`)) return;

    const { error } = await supabase
      .from('profiles')
      .update({ banned: true })
      .eq('id', userId);
    
    if (!error) {
      alert(`${username} a été banni avec succès !`);
      fetchUsers();
    } else {
      alert(`Erreur: ${error.message}`);
    }
  };

  const unbanUser = async (userId: string, username: string) => {
    if (!confirm(`Êtes-vous sûr de débannir ${username} ?`)) return;

    const { error } = await supabase
      .from('profiles')
      .update({ banned: false })
      .eq('id', userId);
    
    if (!error) {
      alert(`${username} a été débanni !`);
      fetchUsers();
    } else {
      alert(`Erreur: ${error.message}`);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !mediaUrl) return alert('Remplissez tous les champs (URL requise)');
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('posts')
        .insert([{
          title,
          content,
          media_type: mediaType,
          media_url: mediaUrl
        }]);

      if (error) throw error;

      alert('Post publié avec succès !');
      setTitle('');
      setContent('');
      setMediaUrl('');
      setMediaType('image');
      fetchPosts();
    } catch (err: any) {
      console.error('Error:', err);
      alert(`Erreur: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const deletePost = async (postId: number) => {
    if (!confirm('Êtes-vous sûr de supprimer ce post ?')) return;
    
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      alert('Post supprimé !');
      fetchPosts();
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  const startEditPost = (post: Post) => {
    setEditingPost(post);
    setTitle(post.title);
    setContent(post.content);
    setMediaUrl(post.media_url);
    setMediaType(post.media_type as any);
  };

  const cancelEditPost = () => {
    setEditingPost(null);
    setTitle('');
    setContent('');
    setMediaUrl('');
    setMediaType('image');
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;
    if (!title || !content || !mediaUrl) return alert('Remplissez tous les champs');
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          title,
          content,
          media_type: mediaType,
          media_url: mediaUrl
        })
        .eq('id', editingPost.id);

      if (error) throw error;

      alert('Post mis à jour avec succès !');
      cancelEditPost();
      fetchPosts();
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateBackground = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bgUrl) return alert('Entrez une URL valide');
    
    setBgSubmitting(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ 
          key: 'site_background', 
          value: bgUrl,
          type: bgType
        }, { onConflict: 'key' });

      if (error) throw error;

      alert('Fond d\'écran mis à jour avec succès !');
      setBgUrl('');
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setBgSubmitting(false);
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return alert('Entrez un nom de catégorie');

    const { data, error } = await supabase
      .from('rule_categories')
      .insert({ name: newCategoryName, description: newCategoryDesc })
      .select();

    if (!error && data) {
      setNewCategoryName('');
      setNewCategoryDesc('');
      fetchRules();
    } else {
      alert(`Erreur: ${error?.message}`);
    }
  };

  const deleteCategory = async (categoryId: number) => {
    if (!confirm('Êtes-vous sûr ? Toutes les règles de cette catégorie seront supprimées.')) return;

    const { error } = await supabase
      .from('rule_categories')
      .delete()
      .eq('id', categoryId);

    if (!error) {
      fetchRules();
    } else {
      alert(`Erreur: ${error?.message}`);
    }
  };

  const addRule = async () => {
    if (!selectedCategoryId || !newRuleTitle.trim() || !newRuleContent.trim()) {
      return alert('Remplissez tous les champs');
    }

    const { error } = await supabase
      .from('rules')
      .insert({
        category_id: selectedCategoryId,
        title: newRuleTitle,
        content: newRuleContent,
        order: rules.filter(r => r.category_id === selectedCategoryId).length + 1,
      });

    if (!error) {
      setNewRuleTitle('');
      setNewRuleContent('');
      fetchRules();
    } else {
      alert(`Erreur: ${error?.message}`);
    }
  };

  const deleteRule = async (ruleId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette règle?')) return;

    const { error } = await supabase
      .from('rules')
      .delete()
      .eq('id', ruleId);

    if (!error) {
      fetchRules();
    } else {
      alert(`Erreur: ${error?.message}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pt-32 pb-24 bg-luxury-dark min-h-screen"
    >
      <div className="max-w-7xl mx-auto px-6">
        <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img src="https://i.postimg.cc/L4wgGYg6/ATC.png" alt="Atlantic RP" className="h-16 w-auto" />
            <div>
              <h2 className="font-cinzel text-4xl font-black">ADMIN <span className="text-luxury-gold">PANEL</span></h2>
              <p className="text-gray-500 uppercase tracking-widest text-[10px] font-bold">Gestion Atlantique RP</p>
            </div>
          </div>
          
          <div className="flex gap-2 p-1 glass rounded-xl">
            <button 
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'users' ? 'bg-luxury-gold text-black' : 'hover:bg-white/5'}`}
            >
              <Users size={16} /> Utilisateurs
            </button>
            <button 
              onClick={() => setActiveTab('posts')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'posts' ? 'bg-luxury-gold text-black' : 'hover:bg-white/5'}`}
            >
              <FilePlus size={16} /> Posts
            </button>
            <button 
              onClick={() => setActiveTab('rules')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'rules' ? 'bg-luxury-gold text-black' : 'hover:bg-white/5'}`}
            >
              <BookOpen size={16} /> Règles
            </button>
            <button 
              onClick={() => setActiveTab('config')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'config' ? 'bg-luxury-gold text-black' : 'hover:bg-white/5'}`}
            >
              <Settings size={16} /> Config
            </button>
          </div>
        </header>

        {activeTab === 'users' && (
          <div className="glass rounded-3xl overflow-hidden border border-white/5">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-8 py-6 text-sm font-bold uppercase tracking-widest text-gray-400">Utilisateur</th>
                  <th className="px-8 py-6 text-sm font-bold uppercase tracking-widest text-gray-400">Rôle</th>
                  <th className="px-8 py-6 text-sm font-bold uppercase tracking-widest text-gray-400">Statut</th>
                  <th className="px-8 py-6 text-sm font-bold uppercase tracking-widest text-gray-400">Localisation</th>
                  <th className="px-8 py-6 text-sm font-bold uppercase tracking-widest text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((user) => (
                  <tr key={user.id} className={`hover:bg-white/5 transition-colors ${user.banned ? 'opacity-60' : ''}`}>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-luxury-gold/20 flex items-center justify-center text-luxury-gold font-bold">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-white">{user.username}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-luxury-gold/20 text-luxury-gold' : 'bg-white/10 text-gray-400'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      {user.banned ? (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-500/20 text-red-400">
                          🚫 Banni
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-green-500/20 text-green-400">
                          ✓ Actif
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <LocationDisplay 
                        latitude={user.latitude}
                        longitude={user.longitude}
                        linkClassName="text-luxury-gold hover:text-luxury-goldLight text-xs font-bold uppercase tracking-widest underline"
                      />
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center gap-2 ml-auto justify-end">
                        {user.role !== 'admin' && !user.banned && (
                          <button 
                            onClick={() => promoteAdmin(user.id)}
                            className="px-3 py-2 rounded-lg bg-luxury-gold/10 text-luxury-gold hover:bg-luxury-gold hover:text-black transition-all text-xs font-bold uppercase tracking-widest"
                          >
                            <ShieldCheck size={14} />
                          </button>
                        )}
                        {user.role === 'admin' && (
                          <button
                            onClick={() => removeAdmin(user.id, user.username)}
                            className="px-3 py-2 rounded-lg bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/40 transition-all text-xs font-bold uppercase tracking-widest"
                          >
                            Retirer Admin
                          </button>
                        )}
                        {user.banned ? (
                          <button 
                            onClick={() => unbanUser(user.id, user.username)}
                            className="px-3 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/40 transition-all text-xs font-bold uppercase tracking-widest"
                          >
                            Débannir
                          </button>
                        ) : (
                          <button 
                            onClick={() => banUser(user.id, user.username)}
                            className="px-3 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-all text-xs font-bold uppercase tracking-widest flex items-center gap-1"
                          >
                            <Trash2 size={14} /> Bannir
                          </button>
                        )}
                        <button
                          onClick={() => deleteUser(user.id, user.username)}
                          className="px-3 py-2 rounded-lg bg-red-700/20 text-red-700 hover:bg-red-700/40 transition-all text-xs font-bold uppercase tracking-widest ml-2"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="space-y-8">
            {/* Formulaire de création/édition */}
            <form onSubmit={editingPost ? handleUpdatePost : handleCreatePost} className="max-w-2xl mx-auto glass p-10 rounded-[3rem] border border-white/5">
              <h3 className="text-2xl font-cinzel font-bold mb-8 text-center uppercase tracking-widest">
                {editingPost ? '✏️ Modifier le Post' : 'Nouveau Post Galerie'}
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Titre du Post</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-6 py-4 rounded-xl bg-black border border-white/10 focus:border-luxury-gold transition-all text-white outline-none" placeholder="Moment épique..." />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Description</label>
                  <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="w-full px-6 py-4 rounded-xl bg-black border border-white/10 focus:border-luxury-gold transition-all text-white outline-none resize-none" placeholder="Racontez la scène..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Type</label>
                    <select value={mediaType} onChange={(e) => setMediaType(e.target.value as any)} className="w-full px-6 py-4 rounded-xl bg-black border border-white/10 focus:border-luxury-gold text-white outline-none">
                      <option value="image">Image</option>
                      <option value="video">Vidéo</option>
                      <option value="file">Fichier</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">URL du Média</label>
                    <input type="url" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} required className="w-full px-6 py-4 rounded-xl bg-black border border-white/10 focus:border-luxury-gold transition-all text-white outline-none text-sm" placeholder="https://example.com/image.jpg" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <a href="https://catbox.moe/" target="_blank" rel="noopener noreferrer" className="flex-1 py-4 bg-blue-600 text-white font-black uppercase tracking-widest rounded-xl text-center transition-all hover:bg-blue-700 hover:scale-[1.02] text-sm">
                    🎬 Upload Vidéo (Catbox)
                  </a>
                  <a href="https://postimages.org/" target="_blank" rel="noopener noreferrer" className="flex-1 py-4 bg-purple-600 text-white font-black uppercase tracking-widest rounded-xl text-center transition-all hover:bg-purple-700 hover:scale-[1.02] text-sm">
                    🖼️ Upload Image
                  </a>
                </div>
                <div className="flex gap-4">
                  <button disabled={submitting} className="flex-1 py-5 bg-luxury-gold text-black font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 button-glow transition-all hover:scale-[1.02] disabled:opacity-50">
                    {submitting ? 'Envoi en cours...' : editingPost ? <>✓ Mettre à jour</> : <><Send size={20} /> Publier maintenant</>}
                  </button>
                  {editingPost && (
                    <button 
                      type="button"
                      onClick={cancelEditPost}
                      className="flex-1 py-5 bg-gray-600 text-white font-black uppercase tracking-widest rounded-2xl transition-all hover:scale-[1.02]"
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </div>
            </form>

            {/* Liste des posts */}
            <div>
              <h3 className="text-2xl font-cinzel font-bold mb-6 uppercase tracking-widest">Posts publiés ({posts.length})</h3>
              {posts.length === 0 ? (
                <div className="glass p-10 rounded-3xl text-center">
                  <p className="text-gray-400">Aucun post publié pour le moment.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {posts.map((post) => (
                    <div key={post.id} className="glass p-6 rounded-2xl border border-white/5 hover:border-luxury-gold/30 transition-all">
                      <div className="aspect-video bg-black/50 rounded-xl overflow-hidden mb-4">
                        {post.media_type === 'image' ? (
                          <img src={post.media_url} alt={post.title} className="w-full h-full object-cover" />
                        ) : post.media_type === 'video' ? (
                          <video src={post.media_url} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            Fichier
                          </div>
                        )}
                      </div>
                      <h4 className="font-cinzel font-bold text-white mb-2">{post.title}</h4>
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">{post.content}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{new Date(post.created_at).toLocaleDateString('fr-FR')}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditPost(post)}
                            className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1"
                          >
                            ✏️ Modifier
                          </button>
                          <button
                            onClick={() => deletePost(post.id)}
                            className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1"
                          >
                            <Trash2 size={14} /> Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="space-y-8">
            {/* PAGE VISIBILITY SECTION */}
            <div className="glass p-10 rounded-[3rem] border border-white/5">
              <div className="text-center mb-10">
                <div className="w-16 h-16 bg-luxury-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-luxury-gold">
                  👁️
                </div>
                <h3 className="text-2xl font-cinzel font-bold uppercase tracking-widest">Visibilité des Pages</h3>
                <p className="text-gray-500 text-sm mt-2">Masquez ou affichez les pages pour tous les utilisateurs</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries({
                  'page-home': '🏠 Accueil',
                  'page-features': '✨ Fonctionnalités',
                  'page-rules': '📋 Règles',
                  'page-community': '👥 Communauté',
                  'page-game': '🎮 Jeu',
                  'page-shop': '🛍️ Shop',
                  'page-gallery': '🎨 Galerie',
                }).map(([pageId, label]) => (
                  <button
                    key={pageId}
                    onClick={() => updatePageVisibility(pageId, !pageVisibilities[pageId])}
                    disabled={pageVisibilityLoading}
                    className={`p-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-all flex items-center justify-between ${
                      pageVisibilities[pageId]
                        ? 'bg-green-600/20 border border-green-600 text-green-400 hover:bg-green-600/30'
                        : 'bg-red-600/20 border border-red-600 text-red-400 hover:bg-red-600/30'
                    } disabled:opacity-50`}
                  >
                    <span>{label}</span>
                    <span>{pageVisibilities[pageId] ? '👁️ Visible' : '🚫 Caché'}</span>
                  </button>
                ))}
              </div>

              <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-600/30 rounded-xl">
                <p className="text-yellow-500 text-xs font-bold uppercase tracking-widest">
                  ⚠️ Les pages masquées disparaîtront du menu de navigation et seront inaccessibles même via URL. Les admins les verront toujours.
                </p>
              </div>
            </div>

            {/* BACKGROUND SECTION */}
            <div className="max-w-2xl mx-auto">
            <form onSubmit={handleUpdateBackground} className="glass p-10 rounded-[3rem] border border-white/5">
              <div className="text-center mb-10">
                <div className="w-16 h-16 bg-luxury-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-luxury-gold">
                  <Video size={32} />
                </div>
                <h3 className="text-2xl font-cinzel font-bold uppercase tracking-widest">Fond du Site</h3>
                <p className="text-gray-500 text-sm mt-2">Modifiez l'arrière-plan principal via URL</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Type de média</label>
                  <select value={bgType} onChange={(e) => setBgType(e.target.value as any)} className="w-full px-6 py-4 rounded-xl bg-black border border-white/10 focus:border-luxury-gold text-white outline-none">
                    <option value="image">Image</option>
                    <option value="video">Vidéo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">URL du média</label>
                  <input 
                    type="url" 
                    value={bgUrl} 
                    onChange={(e) => setBgUrl(e.target.value)} 
                    required
                    className="w-full px-6 py-4 rounded-xl bg-black border border-white/10 focus:border-luxury-gold transition-all text-white outline-none"
                    placeholder="https://example.com/background.jpg"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Conseil: Utilisez des services gratuits comme Imgur, imgbb, ou un lien direct vers votre hébergement
                  </p>
                </div>

                <div className="flex gap-3">
                  <a href="https://catbox.moe/" target="_blank" rel="noopener noreferrer" className="flex-1 py-4 bg-blue-600 text-white font-black uppercase tracking-widest rounded-xl text-center transition-all hover:bg-blue-700 hover:scale-[1.02] text-sm">
                    🎬 Upload Vidéo (Catbox)
                  </a>
                  <a href="https://postimages.org/" target="_blank" rel="noopener noreferrer" className="flex-1 py-4 bg-purple-600 text-white font-black uppercase tracking-widest rounded-xl text-center transition-all hover:bg-purple-700 hover:scale-[1.02] text-sm">
                    🖼️ Upload Image
                  </a>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 text-luxury-gold/60 text-xs font-bold uppercase tracking-widest bg-luxury-gold/5 p-4 rounded-xl border border-luxury-gold/10">
                    <ImageIcon size={16} />
                    <span>L'image ou vidéo sera appliquée en plein écran avec un overlay sombre.</span>
                  </div>

                  <button 
                    type="submit"
                    disabled={bgSubmitting || !bgUrl}
                    className="w-full py-5 bg-luxury-gold text-black font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 button-glow transition-all hover:scale-[1.02] disabled:opacity-50 disabled:grayscale"
                  >
                    {bgSubmitting ? 'Mise à jour en cours...' : (
                      <>
                        <ShieldCheck size={20} /> Appliquer les modifications
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-8">
            {/* Add Category */}
            <div className="glass p-8 rounded-2xl border border-white/5">
              <h3 className="text-xl font-cinzel font-bold mb-6 text-white uppercase tracking-widest">Ajouter une Catégorie</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Nom</label>
                  <input 
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full px-6 py-3 rounded-xl bg-black border border-white/10 focus:border-luxury-gold text-white outline-none"
                    placeholder="Ex: Comportement Général"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Description</label>
                  <textarea 
                    value={newCategoryDesc}
                    onChange={(e) => setNewCategoryDesc(e.target.value)}
                    className="w-full px-6 py-3 rounded-xl bg-black border border-white/10 focus:border-luxury-gold text-white outline-none resize-none"
                    placeholder="Description optionnelle"
                    rows={2}
                  />
                </div>
                <button
                  onClick={addCategory}
                  className="w-full py-3 bg-luxury-gold text-black font-bold rounded-lg hover:bg-luxury-goldLight transition-all"
                >
                  Créer la Catégorie
                </button>
              </div>
            </div>

            {/* Categories & Rules */}
            <div className="space-y-6">
              <h3 className="text-xl font-cinzel font-bold text-white uppercase tracking-widest">Gérer les Règles</h3>
              
              {categories.length === 0 ? (
                <p className="text-gray-500">Aucune catégorie créée. Commencez par créer une catégorie.</p>
              ) : (
                categories.map(category => (
                  <div key={category.id} className="glass p-6 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-cinzel font-bold text-white">{category.name}</h4>
                        {category.description && (
                          <p className="text-gray-400 text-sm">{category.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteCategory(category.id)}
                        className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded-lg text-sm font-bold uppercase transition-all flex items-center gap-2"
                      >
                        <Trash2 size={16} /> Supprimer
                      </button>
                    </div>

                    {/* Rules for this category */}
                    <div className="bg-black/30 rounded-xl p-4 mb-4 max-h-40 overflow-y-auto">
                      {rules.filter(r => r.category_id === category.id).length === 0 ? (
                        <p className="text-gray-500 text-sm">Aucune règle dans cette catégorie</p>
                      ) : (
                        <ul className="space-y-2">
                          {rules.filter(r => r.category_id === category.id).map(rule => (
                            <li key={rule.id} className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="font-bold text-white text-sm">{rule.title}</p>
                                <p className="text-gray-400 text-xs">{rule.content}</p>
                              </div>
                              <button
                                onClick={() => deleteRule(rule.id)}
                                className="px-2 py-1 text-red-400 hover:text-red-300 text-xs flex items-center gap-1"
                              >
                                <Trash2 size={12} /> Suppr
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Add Rule to this category */}
                    {selectedCategoryId === category.id && (
                      <div className="bg-black/50 border border-white/10 rounded-xl p-4 space-y-3">
                        <input 
                          type="text"
                          value={newRuleTitle}
                          onChange={(e) => setNewRuleTitle(e.target.value)}
                          placeholder="Titre de la règle"
                          className="w-full px-4 py-2 rounded-lg bg-black border border-white/10 focus:border-luxury-gold text-white text-sm outline-none"
                        />
                        <textarea 
                          value={newRuleContent}
                          onChange={(e) => setNewRuleContent(e.target.value)}
                          placeholder="Contenu de la règle"
                          className="w-full px-4 py-2 rounded-lg bg-black border border-white/10 focus:border-luxury-gold text-white text-sm outline-none resize-none"
                          rows={2}
                        />
                        <button
                          onClick={addRule}
                          className="w-full py-2 bg-luxury-gold text-black font-bold rounded-lg hover:bg-luxury-goldLight transition-all text-sm"
                        >
                          Ajouter la Règle
                        </button>
                      </div>
                    )}

                    {selectedCategoryId !== category.id && (
                      <button
                        onClick={() => setSelectedCategoryId(category.id)}
                        className="w-full py-2 bg-white/5 text-gray-400 hover:text-white rounded-lg transition-all text-sm"
                      >
                        Ajouter une règle à cette catégorie
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Admin;

