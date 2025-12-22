
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { Profile, Post } from '../types';
import { Users, FilePlus, ShieldCheck, Trash2, Upload, Send, LayoutDashboard, Settings, Video, Image as ImageIcon } from 'lucide-react';

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'posts' | 'config'>('users');
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Post form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'file'>('image');
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // Site Config state
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgUploading, setBgUploading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');
    if (data) setUsers(data);
    setLoading(false);
  };

  const promoteAdmin = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userId);
    if (!error) fetchUsers();
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert('Veuillez sélectionner un fichier');
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('posts')
        .insert([{
          title,
          content,
          media_type: mediaType,
          media_url: urlData.publicUrl
        }]);

      if (insertError) throw insertError;

      alert('Post publié avec succès !');
      setTitle('');
      setContent('');
      setFile(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateBackground = async () => {
    if (!bgFile) return alert('Sélectionnez un média (Image ou Vidéo)');
    
    // Limite de 300 Mo
    const maxSize = 300 * 1024 * 1024;
    if (bgFile.size > maxSize) {
      return alert('Le fichier est trop volumineux (Max 300 Mo)');
    }

    setBgUploading(true);
    try {
      const fileExt = bgFile.name.split('.').pop();
      const fileName = `site_bg_${Date.now()}.${fileExt}`;
      const type: 'image' | 'video' = bgFile.type.startsWith('video') ? 'video' : 'image';

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(`config/${fileName}`, bgFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(`config/${fileName}`);

      const { error: settingError } = await supabase
        .from('settings')
        .upsert({ 
          key: 'site_background', 
          value: urlData.publicUrl,
          type: type
        });

      if (settingError) throw settingError;

      alert('Fond d\'écran mis à jour avec succès !');
      setBgFile(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBgUploading(false);
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
            <div className="w-16 h-16 rounded-2xl bg-luxury-gold/10 flex items-center justify-center text-luxury-gold">
              <LayoutDashboard size={32} />
            </div>
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
                  <th className="px-8 py-6 text-sm font-bold uppercase tracking-widest text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
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
                    <td className="px-8 py-6 text-right">
                      {user.role !== 'admin' && (
                        <button 
                          onClick={() => promoteAdmin(user.id)}
                          className="flex items-center gap-2 ml-auto px-4 py-2 rounded-lg bg-luxury-gold/10 text-luxury-gold hover:bg-luxury-gold hover:text-black transition-all text-xs font-bold uppercase tracking-widest"
                        >
                          <ShieldCheck size={14} /> Promouvoir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleCreatePost} className="glass p-10 rounded-[3rem] border border-white/5">
              <h3 className="text-2xl font-cinzel font-bold mb-8 text-center uppercase tracking-widest">Nouveau Post Galerie</h3>
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
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Média</label>
                    <div className="relative">
                      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" id="file-upload" />
                      <label htmlFor="file-upload" className="w-full px-6 py-4 rounded-xl bg-white/5 border border-dashed border-white/20 hover:border-luxury-gold transition-all flex items-center justify-center gap-2 cursor-pointer text-sm text-gray-400">
                        <Upload size={18} /> {file ? file.name : 'Choisir'}
                      </label>
                    </div>
                  </div>
                </div>
                <button disabled={uploading} className="w-full mt-8 py-5 bg-luxury-gold text-black font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 button-glow transition-all hover:scale-[1.02] disabled:opacity-50">
                  {uploading ? 'Envoi en cours...' : <><Send size={20} /> Publier maintenant</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="max-w-2xl mx-auto">
            <div className="glass p-10 rounded-[3rem] border border-white/5">
              <div className="text-center mb-10">
                <div className="w-16 h-16 bg-luxury-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-luxury-gold">
                  <Video size={32} />
                </div>
                <h3 className="text-2xl font-cinzel font-bold uppercase tracking-widest">Fond du Site</h3>
                <p className="text-gray-500 text-sm mt-2">Modifiez l'arrière-plan principal (Vidéo ou Image)</p>
              </div>

              <div className="space-y-8">
                <div className="p-8 border-2 border-dashed border-white/10 rounded-3xl text-center bg-black/30">
                  <input 
                    type="file" 
                    onChange={(e) => setBgFile(e.target.files?.[0] || null)} 
                    className="hidden" 
                    id="bg-upload" 
                    accept="image/*,video/*"
                  />
                  <label 
                    htmlFor="bg-upload" 
                    className="cursor-pointer flex flex-col items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-luxury-gold">
                      <Upload size={24} />
                    </div>
                    <div>
                      <span className="block text-lg font-bold text-white mb-1">
                        {bgFile ? bgFile.name : 'Glissez ou cliquez pour importer'}
                      </span>
                      <span className="text-xs text-gray-500 uppercase tracking-widest font-black">
                        MÉDIA MAX 300 MO (MP4, WEBM, JPG, PNG)
                      </span>
                    </div>
                  </label>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 text-luxury-gold/60 text-xs font-bold uppercase tracking-widest bg-luxury-gold/5 p-4 rounded-xl border border-luxury-gold/10">
                    <ImageIcon size={16} />
                    <span>L'image ou vidéo sera appliquée en plein écran avec un overlay sombre.</span>
                  </div>

                  <button 
                    onClick={handleUpdateBackground}
                    disabled={bgUploading || !bgFile}
                    className="w-full py-5 bg-luxury-gold text-black font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 button-glow transition-all hover:scale-[1.02] disabled:opacity-50 disabled:grayscale"
                  >
                    {bgUploading ? 'Mise à jour en cours...' : (
                      <>
                        <ShieldCheck size={20} /> Appliquer les modifications
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Admin;
