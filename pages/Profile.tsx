import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { MapPin, Navigation, Upload, X, Copy, Check, Ticket, Bell, Send, RefreshCcw, MessageSquare, ChevronRight, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ProfilePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatar_url, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [showLocationHelp, setShowLocationHelp] = useState(false);
  const [canEditProfile, setCanEditProfile] = useState(true);
  const [userId, setUserId] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'tickets' | 'notifications'>('profile');

  // Tickets state
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [userReply, setUserReply] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const [hasTicketNotification, setHasTicketNotification] = useState(false);
  const [hasGlobalNotification, setHasGlobalNotification] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const DEFAULT_AVATAR = 'https://i.postimg.cc/rF1jc0R2/depositphotos-51405259-stock-illustration-male-avatar-profile-picture-use.jpg';
  const AVATARS_BUCKET = (import.meta as any).env.VITE_AVATARS_BUCKET || 'avatars';

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase.auth.getUser();
        const user = (data as any)?.user;
        if (!user) {
          navigate('/login');
          return;
        }

        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profileData) {
          setUserId(profileData.id);
          setUsername(profileData.username || '');
          setDisplayName(profileData.display_name || '');
          setAvatarUrl(profileData.avatar_url || '');
          setAvatarPreview(profileData.avatar_url || '');
          setLatitude(profileData.latitude || null);
          setLongitude(profileData.longitude || null);
          setHasTicketNotification(profileData.has_ticket_notification || false);
          setHasGlobalNotification(profileData.has_global_notification || false);

          // Par défaut REFUSÉ sauf si l'admin a explicitement autorisé
          setCanEditProfile(profileData.can_edit_profile === true);
        }
      } catch (e) {
        console.error('Could not load profile', e);
        setMessage('Erreur lors du chargement du profil');
      } finally {
        setLoading(false);
      }
    })();

    // Realtime listener for profile changes (notifications)
    if (!userId) return;

    const channel = supabase
      .channel(`profile-page-updates-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          if (payload.new) {
            setHasTicketNotification(payload.new.has_ticket_notification || false);
            setHasGlobalNotification(payload.new.has_global_notification || false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate, userId]);

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { data } = await supabase.auth.getUser();
      const user = (data as any)?.user;
      if (!user) return;

      const payload: any = { id: user.id, username, display_name: displayName };
      if (avatar_url) payload.avatar_url = avatar_url;

      const { error } = await supabase.from('profiles').upsert(payload);
      if (error) throw error;

      setMessage('Profil mis à jour');
      // Force a refresh so App re-fetches the updated profile
      setTimeout(() => window.location.reload(), 700);
    } catch (e: any) {
      console.error('Save error', e);
      setMessage('Erreur lors de la sauvegarde');
      setLoading(false);
    }
  };

  const handleRequestLocation = async () => {
    setRequestingLocation(true);
    setMessage(null);

    if (!navigator.geolocation) {
      setMessage('Géolocalisation non supportée par votre navigateur');
      setRequestingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        try {
          const { data } = await supabase.auth.getUser();
          const user = (data as any)?.user;
          if (!user) throw new Error('Non authentifié');

          const { error } = await supabase
            .from('profiles')
            .update({ latitude: lat, longitude: lon })
            .eq('id', user.id);

          if (error) throw error;

          setLatitude(lat);
          setLongitude(lon);
          setMessage('✓ Position capturée et sauvegardée');
        } catch (err: any) {
          console.error('Error saving location:', err);
          setMessage('Erreur lors de la sauvegarde de la position');
        } finally {
          setRequestingLocation(false);
        }
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setMessage('tester avec un autre navigateur. Vérifiez les permissions.');
        setShowLocationHelp(true);
        setRequestingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const user = (data as any)?.user;
      if (!user) throw new Error('Not authenticated');

      const fileExt = (file.name.split('.').pop() || 'png').replace(/[^a-zA-Z0-9]/g, '');
      const filePath = `${AVATARS_BUCKET}/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from(AVATARS_BUCKET).upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      // getPublicUrl is synchronous in Supabase client; destructure safely
      const publicRes = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(filePath);
      const publicUrl = (publicRes as any)?.data?.publicUrl || (publicRes as any)?.publicUrl || '';
      if (!publicUrl) throw new Error('No public URL returned (check bucket public settings)');

      setAvatarUrl(publicUrl);
      setMessage('✓ Avatar mis à jour avec succès');

      // Auto-save the avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      // Refresh user profile data
      const { data: refreshedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (refreshedProfile) {
        setAvatarUrl(refreshedProfile.avatar_url || '');
        setAvatarPreview(refreshedProfile.avatar_url || '');
      }
    } catch (err: any) {
      console.error('Upload error', err);
      setMessage('Erreur lors de l\'upload: ' + (err.message || err.toString()));
      setAvatarPreview(avatar_url); // Reset to previous
    } finally {
      setUploading(false);
    }
  };

  const fetchUserTickets = async () => {
    setTicketsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);

      // Clear ticket notification flag
      if (hasTicketNotification) {
        await supabase
          .from('profiles')
          .update({ has_ticket_notification: false })
          .eq('id', userId);
        setHasTicketNotification(false);
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setTicketsLoading(false);
    }
  };

  const fetchTicketMessages = async (ticketId: string) => {
    setMessagesLoading(true);
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTicketMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!userReply.trim() || !selectedTicket) return;

    setReplySubmitting(true);
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .insert([{
          ticket_id: selectedTicket.id,
          user_id: userId,
          username: displayName || username || 'Utilisateur',
          message: userReply,
          is_admin: false
        }])
        .select();

      if (error) throw error;
      if (data) {
        setTicketMessages([...ticketMessages, data[0]]);
        setUserReply('');
      }
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    } finally {
      setReplySubmitting(false);
    }
  };

  const fetchGlobalNotifications = async () => {
    setNotifsLoading(true);
    try {
      const { data, error } = await supabase
        .from('global_notifications')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);

      // Clear global notification flag
      if (hasGlobalNotification) {
        await supabase
          .from('profiles')
          .update({ has_global_notification: false })
          .eq('id', userId);
        setHasGlobalNotification(false);
      }
    } catch (err) {
      console.error('Error fetching notifs:', err);
    } finally {
      setNotifsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      if (activeTab === 'tickets') fetchUserTickets();
      if (activeTab === 'notifications') fetchGlobalNotifications();
    }
  }, [activeTab, userId]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-luxury-dark">
        <div className="w-12 h-12 border-4 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-luxury-dark pt-32 md:pt-40 lg:pt-48 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-cinzel text-4xl font-black text-white mb-2 flex items-center gap-4">
              Mon Profil
              {(hasTicketNotification || hasGlobalNotification) && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white shadow-red-500/50 shadow-lg"
                >
                  <Bell size={16} className="animate-bounce" />
                </motion.span>
              )}
            </h1>
            <p className="text-gray-400">Gérez vos paramètres et accédez au support</p>
          </div>
        </header>

        {/* Tab Switcher */}
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => { setActiveTab('profile'); setSelectedTicket(null); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${activeTab === 'profile' ? 'bg-luxury-gold text-black border-luxury-gold' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'}`}
          >
            <MapPin size={16} /> Profil
          </button>
          <button
            onClick={() => { setActiveTab('tickets'); setSelectedTicket(null); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border relative ${activeTab === 'tickets' ? 'bg-luxury-gold text-black border-luxury-gold' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'}`}
          >
            <Ticket size={16} /> Mes Tickets
            {hasTicketNotification && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 border-2 border-luxury-dark rounded-full shadow-lg animate-pulse" />
            )}
          </button>
          <button
            onClick={() => { setActiveTab('notifications'); setSelectedTicket(null); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border relative ${activeTab === 'notifications' ? 'bg-luxury-gold text-black border-luxury-gold' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'}`}
          >
            <Bell size={16} /> Notifications
            {hasGlobalNotification && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-luxury-dark rounded-full shadow-lg animate-pulse" />
            )}
          </button>
        </div>

        {/* Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${message.includes('✓')
            ? 'bg-green-500/10 border-green-500/30 text-green-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}>
            {message}
          </div>
        )}

        <div className="bg-white/5 p-8 rounded-2xl border border-white/10">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div
                key="profile-tab"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-8"
              >
                {/* Avatar Section */}
                <div className="mb-8 pb-8 border-b border-white/10">
                  <h2 className="text-lg font-cinzel font-bold text-white mb-6 uppercase tracking-wider">Avatar</h2>
                  {!canEditProfile && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
                      🔒 Modification désactivée par un admin
                    </div>
                  )}
                  <div className="flex items-center gap-8">
                    <div className="relative group">
                      <img
                        src={avatarPreview || avatar_url || DEFAULT_AVATAR}
                        alt="avatar"
                        className="w-32 h-32 rounded-full object-cover border-4 border-luxury-gold shadow-lg transition-transform group-hover:scale-105"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || username || 'User')}&background=random&color=fff`;
                        }}
                      />
                      {uploading && (
                        <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                          <RefreshCcw className="animate-spin text-luxury-gold" size={24} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || !canEditProfile}
                        className="flex items-center gap-2 px-6 py-3 rounded-lg bg-luxury-gold text-black hover:bg-luxury-goldLight transition-all text-xs font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed mb-3"
                      >
                        <Upload size={16} />
                        {uploading ? 'Upload...' : 'Changer l\'image'}
                      </button>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                        JPG, PNG ou GIF • Max 5MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Info Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-white/10">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Nom affiché</label>
                    <input
                      className={`w-full p-4 rounded-xl bg-black border border-white/10 text-white focus:border-luxury-gold outline-none transition-all ${!canEditProfile ? 'opacity-50 cursor-not-allowed' : ''}`}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Votre nom public"
                      disabled={!canEditProfile}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">ID Utilisateur</label>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 p-4 rounded-xl bg-black/40 border border-white/10 text-gray-500 font-mono text-sm outline-none"
                        value={userId}
                        readOnly
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(userId);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className={`px-4 rounded-xl flex items-center justify-center transition-all ${copied ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'}`}
                      >
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Location Section */}
                <div className="p-6 rounded-2xl bg-black/40 border border-white/10">
                  <div className="flex items-center gap-3 mb-6">
                    <MapPin size={24} className="text-luxury-gold" />
                    <h2 className="text-lg font-cinzel font-bold text-white uppercase tracking-wider">Vérification de Compte</h2>
                  </div>

                  {latitude && longitude ? (
                    <div className="flex flex-col md:flex-row items-center gap-4">
                      <div className="flex-1 text-sm text-green-400 flex items-center gap-2">
                        <Check size={18} /> Position enregistrée : {latitude.toFixed(4)}, {longitude.toFixed(4)}
                      </div>
                      <button
                        onClick={handleRequestLocation}
                        disabled={requestingLocation}
                        className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all text-xs font-black uppercase tracking-widest disabled:opacity-50"
                      >
                        {requestingLocation ? <RefreshCcw className="animate-spin" size={16} /> : 'Mettre à jour'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 text-center py-4">
                      <p className="text-sm text-gray-400">Vérifiez votre compte pour permettre aux admins de vous localiser en jeu.</p>
                      <button
                        onClick={handleRequestLocation}
                        disabled={requestingLocation}
                        className="px-10 py-4 rounded-xl bg-luxury-gold text-black font-black uppercase tracking-widest hover:bg-luxury-goldLight transition-all disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
                      >
                        <Navigation size={18} />
                        {requestingLocation ? 'Localisation...' : 'Vérifier mon compte'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleSave}
                    className="flex-1 px-10 py-4 rounded-xl bg-luxury-gold text-black font-black uppercase tracking-widest hover:bg-luxury-goldLight transition-all"
                  >
                    Enregistrer les modifications
                  </button>
                  <button
                    onClick={() => navigate(-1)}
                    className="px-10 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Retour
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'tickets' && (
              <motion.div
                key="tickets-tab"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-cinzel font-bold text-white uppercase tracking-wider">Support Client</h2>
                  <button onClick={fetchUserTickets} className="p-2 text-gray-500 hover:text-luxury-gold transition-all">
                    <RefreshCcw size={18} className={ticketsLoading ? 'animate-spin' : ''} />
                  </button>
                </div>

                {selectedTicket ? (
                  <div className="space-y-6">
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="text-xs font-black text-luxury-gold uppercase tracking-widest flex items-center gap-1 hover:brightness-125 transition-all mb-4"
                    >
                      ← Retour à la liste
                    </button>

                    <div className="bg-black/60 border border-white/10 rounded-2xl overflow-hidden flex flex-col h-[500px]">
                      <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-black text-luxury-gold uppercase tracking-widest mb-1">Ticket #{selectedTicket.id.substring(0, 8)}</p>
                          <p className="text-white text-sm font-bold truncate max-w-[200px]">{selectedTicket.description}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedTicket.status === 'OUVERT' ? 'bg-yellow-500/20 text-yellow-400' :
                          selectedTicket.status === 'RESOLU' ? 'bg-green-500/20 text-green-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                          {selectedTicket.status}
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
                        <div className="p-4 bg-white/5 border border-white/5 rounded-2xl italic text-gray-400 text-sm">
                          {selectedTicket.description}
                          <p className="text-[10px] mt-2 font-bold uppercase tracking-widest opacity-50">Description initiale</p>
                        </div>

                        {messagesLoading ? (
                          <div className="flex justify-center p-8"><RefreshCcw className="animate-spin text-luxury-gold" /></div>
                        ) : (
                          ticketMessages.map((msg) => (
                            <div key={msg.id} className={`flex flex-col ${msg.is_admin ? 'items-start' : 'items-end'}`}>
                              <div className={`max-w-[80%] p-4 rounded-2xl ${msg.is_admin
                                ? 'bg-luxury-gold/10 border border-luxury-gold/30 text-luxury-gold'
                                : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-300'
                                }`}>
                                <p className="text-sm font-semibold mb-1 flex items-center gap-2">
                                  {msg.is_admin ? '👨‍💼 Admin' : '👤 Vous'}
                                  <span className="text-[10px] opacity-50 font-mono">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </p>
                                <p className="text-sm text-white/90">{msg.message}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {(selectedTicket.allow_user_replies !== false && selectedTicket.status !== 'FERMÉ') ? (
                        <div className="p-4 bg-white/5 border-t border-white/10 flex gap-2">
                          <input
                            type="text"
                            value={userReply}
                            onChange={(e) => setUserReply(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
                            placeholder="Votre réponse..."
                            className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-luxury-gold transition-all"
                          />
                          <button
                            onClick={handleSendReply}
                            disabled={replySubmitting || !userReply.trim()}
                            className="w-12 h-12 rounded-xl bg-luxury-gold text-black flex items-center justify-center hover:bg-luxury-goldLight transition-all disabled:opacity-50"
                          >
                            <Send size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 bg-red-500/5 border-t border-white/10 text-center text-xs text-red-400 font-bold uppercase tracking-widest">
                          🔒 Les réponses sont fermées pour ce ticket
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ticketsLoading ? (
                      <div className="flex justify-center p-12"><RefreshCcw className="animate-spin text-luxury-gold" size={32} /></div>
                    ) : tickets.length === 0 ? (
                      <div className="text-center py-20 bg-black/20 rounded-2xl border border-dashed border-white/10">
                        <MessageCircle className="mx-auto text-gray-700 mb-4" size={48} />
                        <p className="text-gray-500 uppercase font-black text-xs tracking-widest">Aucun ticket en cours</p>
                        <p className="text-gray-600 text-sm mt-2">Vous n'avez pas encore contacté le support.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {tickets.map((ticket) => (
                          <button
                            key={ticket.id}
                            onClick={() => {
                              setSelectedTicket(ticket);
                              fetchTicketMessages(ticket.id);
                            }}
                            className="bg-black/40 border border-white/10 p-5 rounded-2xl flex items-center justify-between hover:border-luxury-gold/50 transition-all group"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ticket.status === 'OUVERT' ? 'bg-yellow-500/10 text-yellow-500' :
                                ticket.status === 'RESOLU' ? 'bg-green-500/10 text-green-500' :
                                  'bg-gray-500/10 text-gray-500'
                                }`}>
                                <Ticket size={24} />
                              </div>
                              <div className="text-left">
                                <p className="text-white font-bold text-sm tracking-tight">{ticket.description.substring(0, 40)}...</p>
                                <p className="text-xs text-gray-500 mt-1 uppercase font-black tracking-widest">
                                  #{ticket.id.substring(0, 8)} • {new Date(ticket.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${ticket.status === 'OUVERT' ? 'bg-yellow-500/20 text-yellow-500' :
                                ticket.status === 'RESOLU' ? 'bg-green-500/20 text-green-500' :
                                  'bg-red-500/20 text-red-500'
                                }`}>
                                {ticket.status}
                              </span>
                              <ChevronRight className="text-gray-600 group-hover:text-luxury-gold transition-colors" size={20} />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div
                key="notifications-tab"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-cinzel font-bold text-white uppercase tracking-wider">Avis Administratifs</h2>
                  <button onClick={fetchGlobalNotifications} className="p-2 text-gray-500 hover:text-luxury-gold transition-all">
                    <RefreshCcw size={18} className={notifsLoading ? 'animate-spin' : ''} />
                  </button>
                </div>

                {notifsLoading ? (
                  <div className="flex justify-center p-12"><RefreshCcw className="animate-spin text-luxury-gold" size={32} /></div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-20 bg-black/20 rounded-2xl border border-dashed border-white/10">
                    <Bell className="mx-auto text-gray-700 mb-4" size={48} />
                    <p className="text-gray-500 uppercase font-black text-xs tracking-widest">Silence radio</p>
                    <p className="text-gray-600 text-sm mt-2">Aucune annonce administrative pour le moment.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {notifications.map((notif) => (
                      <div key={notif.id} className="bg-black/60 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        {notif.image_url && (
                          <img src={notif.image_url} alt="Notification" className="w-full h-48 object-cover border-b border-white/10" />
                        )}
                        <div className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-luxury-gold/10 flex items-center justify-center shrink-0">
                              <Bell size={20} className="text-luxury-gold" />
                            </div>
                            <div>
                              <p className="text-white text-base leading-relaxed whitespace-pre-wrap">{notif.content}</p>
                              <div className="flex items-center gap-4 mt-6">
                                <span className="text-[10px] font-black uppercase tracking-widest text-luxury-gold bg-luxury-gold/10 px-3 py-1 rounded-md">
                                  Urgent
                                </span>
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                  Publié le {new Date(notif.created_at).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Location Help Notification Moved inside activeTab === 'profile' */}
          {activeTab === 'profile' && showLocationHelp && (
            <div className="fixed bottom-6 right-6 max-w-sm bg-black/70 backdrop-blur-sm border border-white/20 rounded-lg p-4 text-sm text-white shadow-lg z-50">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="font-bold text-luxury-gold mb-2">Problème de géolocalisation ?</h3>
                  <ul className="space-y-2 text-[10px] text-gray-300 uppercase font-bold tracking-tight">
                    <li>🎯 Cliquez sur le cadenas 🔒 dans la barre d'adresse</li>
                    <li>🎯 Autorisez l'accès à votre position</li>
                    <li>🎯 Actualisez la page pour appliquer</li>
                  </ul>
                </div>
                <button
                  onClick={() => setShowLocationHelp(false)}
                  className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
