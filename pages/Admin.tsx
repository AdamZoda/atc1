import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { Profile, Post, RuleCategory, Rule } from '../types';
import { Users, FilePlus, ShieldCheck, Trash2, Upload, Send, LayoutDashboard, Settings, Video, Image as ImageIcon, BookOpen, History, Activity, Ticket, Music, Play, Pause, Copy, Check, Clock, Calendar, X, RefreshCcw, MessageSquare } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import LocationDisplay from '../components/LocationDisplay';

// Fonction silencieuse pour afficher une notification sans alerte
const showToast = (message: string) => {
  console.log('ℹ️', message);
};

// --- NOUVEAUX COMPOSANTS POUR L'INTERFACE TXADMIN ---

// Carte Utilisateur individuel (txAdmin style)
const UserCard: React.FC<{
  user: Profile;
  onClick: (user: Profile) => void;
}> = ({ user, onClick }) => {
  // SOLUTION FINALE : Si l'utilisateur a donné signe de vie il y a moins de 120 secondes, il est ONLINE.
  const isActuallyOnline = user.last_seen && (Date.now() - new Date(user.last_seen).getTime() < 120000);
  const hasGPS = user.latitude && user.longitude;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(user)}
      className={`relative p-4 rounded-2xl border transition-all cursor-pointer overflow-hidden ${isActuallyOnline
        ? 'bg-green-500/10 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
        : 'bg-white/5 border-white/10 opacity-70 grayscale-[0.8]'
        } ${user.banned ? 'border-red-500/50 bg-red-500/5' : ''}`}
    >
      {/* Status indicator (Glow pulse for online) */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        {isActuallyOnline && (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
        )}
        {!isActuallyOnline && <div className="h-3 w-3 rounded-full bg-gray-600 shadow-inner"></div>}
      </div>

      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.username}
              className={`w-14 h-14 rounded-xl object-cover border-2 transition-colors ${isActuallyOnline ? 'border-green-500' : 'border-white/10'}`}
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name || user.username)}&background=random&color=fff`;
              }}
            />
          ) : (
            <div className={`w-14 h-14 rounded-xl bg-luxury-gold/20 flex items-center justify-center text-luxury-gold font-bold text-xl border ${isActuallyOnline ? 'border-green-500/50' : 'border-transparent'}`}>
              {user.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold truncate transition-colors ${isActuallyOnline ? 'text-green-400' : 'text-white'}`}>
            {user.display_name || user.username}
          </h3>
          <p className="text-[10px] text-gray-400 font-mono truncate opacity-60">ID: {user.id.slice(0, 8)}...</p>

          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-luxury-gold text-black' : 'bg-white/10 text-gray-400'
              }`}>
              {user.role}
            </span>
            {user.banned && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-md font-black bg-red-500 text-white uppercase">BAN</span>
            )}
            {user.warnings && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-md font-black bg-yellow-500 text-black uppercase">{user.warnings} WARNS</span>
            )}
            {hasGPS && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-md font-black bg-cyan-500 text-white uppercase flex items-center gap-1"><Activity size={8} /> GPS</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Panneau latéral détaillé (Side Panel)
const UserSidePanel: React.FC<{
  user: Profile | null;
  isOpen: boolean;
  onClose: () => void;
  onBan: (user: Profile) => void;
  onUnban: (user: Profile) => void;
  onWarn: (user: Profile) => void;
  onDelete: (user: Profile) => void;
  onPromote: (user: Profile) => void;
  onRemoveAdmin: (user: Profile) => void;
  onUpdateNotes: (userId: string, notes: string) => void;
  onSync?: () => void;
  onMessage?: (user: Profile) => void;
}> = ({ user, isOpen, onClose, onBan, onUnban, onWarn, onDelete, onPromote, onRemoveAdmin, onUpdateNotes, onSync, onMessage }) => {
  const [localNotes, setLocalNotes] = React.useState('');
  const [activeSubTab, setActiveSubTab] = React.useState<'overview' | 'json'>('overview');
  const [rawAuthData, setRawAuthData] = React.useState<any>(null);
  const [loadingAuth, setLoadingAuth] = React.useState(false);

  const fetchRawAuth = async (userId: string) => {
    setLoadingAuth(true);
    try {
      const { data, error } = await supabase.rpc('get_full_user_auth', { u_id: userId });
      if (error) throw error;
      setRawAuthData(data);

      // --- LOGIQUE DE SYNCHRONISATION AUTOMATIQUE ---
      const metadata = data?.raw_user_meta_data;
      const discordAvatar = metadata?.avatar_url;
      const discordId = metadata?.sub || metadata?.provider_id;

      const updates: any = {};
      if (discordAvatar && discordAvatar !== user?.avatar_url) updates.avatar_url = discordAvatar;
      if (discordId && discordId !== user?.provider_id) updates.provider_id = discordId;

      if (Object.keys(updates).length > 0) {
        console.log(`🔄 Sync Auto (${user?.username}):`, updates);
        await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId);

        if (onSync) onSync();
      }
    } catch (err) {
      console.error('Erreur RPC Raw JSON:', err);
      setRawAuthData({ ...user, _note: "RPC 'get_full_user_auth' non trouvé ou accès restreint." });
    } finally {
      setLoadingAuth(false);
    }
  };

  React.useEffect(() => {
    if (user) {
      setLocalNotes(user.admin_notes || '');
      setActiveSubTab('overview');
      setRawAuthData(null);
    }
  }, [user]);

  React.useEffect(() => {
    if (user && !rawAuthData) {
      fetchRawAuth(user.id);
    }
  }, [user]);

  if (!user) return null;

  const isActuallyOnline = user.last_seen && (Date.now() - new Date(user.last_seen).getTime() < 120000);
  const hasGPS = user.latitude && user.longitude;

  return (
    <>
      {/* Backdrop overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999]"
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: isOpen ? 0 : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 w-full max-w-md h-full bg-[#0a0a0a] border-l border-white/10 z-[1000] shadow-2xl overflow-y-auto"
      >
        {/* Header Panel */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#0a0a0a] z-10">
          <h2 className="text-xl font-black text-white uppercase tracking-widest">Détails Joueur</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex px-8 mt-4 gap-4 border-b border-white/5">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeSubTab === 'overview' ? 'text-luxury-gold' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Aperçu
            {activeSubTab === 'overview' && <motion.div layoutId="subtab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-luxury-gold" />}
          </button>
          <button
            onClick={() => setActiveSubTab('json')}
            className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeSubTab === 'json' ? 'text-luxury-gold' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Raw JSON
            {activeSubTab === 'json' && <motion.div layoutId="subtab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-luxury-gold" />}
          </button>
        </div>

        <div className="p-8 space-y-8">
          {activeSubTab === 'overview' ? (
            <>
              {/* User Identity Section */}
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  <img
                    src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random&color=fff`}
                    alt={user.username}
                    className={`w-32 h-32 rounded-3xl object-cover border-4 shadow-xl transition-colors ${isActuallyOnline ? 'border-green-500 shadow-green-500/20' : 'border-gray-500'}`}
                    referrerPolicy="no-referrer"
                  />
                  <div className={`absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border-2 border-[#0a0a0a] ${isActuallyOnline ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gray-600 text-white'}`}>
                    {isActuallyOnline ? 'ONLINE' : 'OFFLINE'}
                  </div>
                </div>
                <h1 className="text-2xl font-black text-white">{user.display_name || user.username}</h1>
                <p className="text-gray-500 font-mono text-sm">UID: {user.id}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Clock size={12} />
                    <p className="text-[10px] uppercase font-black tracking-widest">Dernière activité</p>
                  </div>
                  <p className="text-sm text-gray-200">{user.last_seen ? new Date(user.last_seen).toLocaleString() : 'Jamais'}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Calendar size={12} />
                    <p className="text-[10px] uppercase font-black tracking-widest">Inscription</p>
                  </div>
                  <p className="text-sm text-gray-200">{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Inconnue'}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-gray-500">
                    <ShieldCheck size={12} />
                    <p className="text-[10px] uppercase font-black tracking-widest">Rôle</p>
                  </div>
                  <p className="text-sm text-luxury-gold font-bold uppercase tracking-widest">{user.role}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Activity size={12} />
                    <p className="text-[10px] uppercase font-black tracking-widest">Sanctions</p>
                  </div>
                  <p className="text-sm text-yellow-500 font-bold">{user.warnings || 0} Avertis.</p>
                </div>
              </div>

              {/* Discord Section */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Discord ID</p>
                  <p className="text-sm text-indigo-400 font-mono">{user.provider_id || 'Non lié'}</p>
                </div>
                {user.provider_id && (
                  <button onClick={() => { navigator.clipboard.writeText(user.provider_id!); showToast('ID Copié !'); }} className="p-2 hover:bg-white/10 rounded-lg transition-all text-gray-400 hover:text-white">
                    <Copy size={16} />
                  </button>
                )}
              </div>

              {/* Admin Notes Area */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Notes Administrateur</label>
                <textarea
                  value={localNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  onBlur={() => onUpdateNotes(user.id, localNotes)}
                  placeholder="Écrivez des notes sur ce joueur..."
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-gray-300 focus:border-luxury-gold transition-all outline-none resize-none"
                />
              </div>

              {/* Actions Menu */}
              <div className="space-y-4">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Actions de Modération</label>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex gap-3">
                    {user.banned ? (
                      <button onClick={() => onUnban(user)} className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-500 py-3 rounded-xl font-bold uppercase text-[10px] transition-all flex items-center justify-center gap-2 border border-green-500/20">
                        <ShieldCheck size={16} /> Débannir
                      </button>
                    ) : (
                      <button onClick={() => onBan(user)} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-3 rounded-xl font-bold uppercase text-[10px] transition-all flex items-center justify-center gap-2 border border-red-500/20">
                        <Activity size={16} /> Bannir
                      </button>
                    )}
                    <button onClick={() => onWarn(user)} className="flex-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 py-3 rounded-xl font-bold uppercase text-[10px] transition-all flex items-center justify-center gap-2 border border-yellow-500/20">
                      <Settings size={16} /> Warn
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => onMessage && onMessage(user)}
                      className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 py-3 rounded-xl font-bold uppercase text-[10px] transition-all flex items-center justify-center gap-2 border border-blue-500/10"
                    >
                      <Send size={16} /> Message
                    </button>
                    {hasGPS && (
                      <button
                        onClick={() => {
                          window.open(`https://www.google.com/maps?q=${user.latitude},${user.longitude}`, '_blank');
                        }}
                        className="flex-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 py-3 rounded-xl font-bold uppercase text-[10px] transition-all flex items-center justify-center gap-2 border border-cyan-500/10">
                        <Activity size={16} /> Voir GPS
                      </button>
                    )}
                  </div>

                  <div className="flex gap-3">
                    {user.role === 'admin' ? (
                      <button onClick={() => onRemoveAdmin(user)} className="flex-1 bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 py-3 rounded-xl font-bold uppercase text-[10px] transition-all flex items-center justify-center gap-2 border border-white/5">
                        Retirer Admin
                      </button>
                    ) : (
                      <button onClick={() => onPromote(user)} className="flex-1 bg-luxury-gold/10 hover:bg-luxury-gold/20 text-luxury-gold py-3 rounded-xl font-bold uppercase text-[10px] transition-all flex items-center justify-center gap-2 border border-luxury-gold/20">
                        Promouvoir Admin
                      </button>
                    )}
                  </div>

                  <button onClick={() => onDelete(user)} className="w-full bg-red-600/10 hover:bg-red-600/20 text-red-600 py-3 rounded-xl font-bold uppercase text-[10px] transition-all flex items-center justify-center gap-2 border border-red-600/20">
                    <Trash2 size={16} /> Supprimer Définitivement
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Données Brutes (Auth.Users)</label>
                <button
                  onClick={() => { navigator.clipboard.writeText(JSON.stringify(rawAuthData, null, 2)); showToast('JSON Copié !'); }}
                  className="flex items-center gap-2 text-[10px] font-black text-luxury-gold hover:text-white transition-all uppercase"
                >
                  <Copy size={12} /> Copier
                </button>
              </div>
              {loadingAuth ? (
                <div className="flex items-center justify-center p-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-luxury-gold"></div>
                </div>
              ) : (
                <div className="bg-black/50 border border-white/10 rounded-2xl p-6 font-mono text-[11px] text-green-400 overflow-x-auto whitespace-pre max-h-[400px]">
                  {JSON.stringify(rawAuthData, null, 2)}
                </div>
              )}

              <div className="p-4 bg-luxury-gold/5 border border-luxury-gold/20 rounded-xl">
                <p className="text-[10px] text-luxury-gold leading-relaxed">
                  <span className="font-black">Note :</span> Ces données proviennent directement de la table <b>auth.users</b> de Supabase. Elles incluent les métadonnées Discord complètes (avatar original, full name) et les informations de session internes.
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
};

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'posts' | 'config' | 'rules' | 'logs' | 'tickets' | 'music' | 'chat'>('users');
  const [users, setUsers] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<RuleCategory[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  // Chat state
  const [isChatLocked, setIsChatLocked] = useState(false);
  const [chatSubmitting, setChatSubmitting] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [isGroupPublic, setIsGroupPublic] = useState(false);
  const [groupParticipants, setGroupParticipants] = useState('');

  // Post form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>(['']);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'file'>('image');
  const [submitting, setSubmitting] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  // Profile state
  const [profile, setProfile] = useState<any>(null);

  // Page visibility state
  const [pageVisibilities, setPageVisibilities] = useState<{ [key: string]: boolean }>({});
  const [pageVisibilityLoading, setPageVisibilityLoading] = useState(false);

  // Rules state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newRuleContent, setNewRuleContent] = useState('');

  // Site Config state
  const [bgUrl, setBgUrl] = useState('');
  const [bgType, setBgType] = useState<'image' | 'video'>('image');
  const [bgSubmitting, setBgSubmitting] = useState(false);

  // Background history state
  const [backgroundHistory, setBackgroundHistory] = useState<any[]>([]);
  const [bgHistoryLoading, setBgHistoryLoading] = useState(false);

  // Filter state for users
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all');
  const [locationFilter, setLocationFilter] = useState<'all' | 'with' | 'without'>('all');
  const [isOnlineOnly, setIsOnlineOnly] = useState(false);
  const [showSanctionsOnly, setShowSanctionsOnly] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);


  // Admin logs state
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Admin team state
  const [adminTeam, setAdminTeam] = useState<any[]>([]);
  const [adminTeamLoading, setAdminTeamLoading] = useState(false);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminAvatar, setNewAdminAvatar] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('');
  const [newAdminPriority, setNewAdminPriority] = useState('');
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  // Comments state
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentUsername, setCommentUsername] = useState('');
  const [commentMessage, setCommentMessage] = useState('');

  // Roles state
  const [roles, setRoles] = useState<any[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleEmoji, setNewRoleEmoji] = useState('👤');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#D4AF37');
  const [roleSubmitting, setRoleSubmitting] = useState(false);

  // Tickets state
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketStatusFilter, setTicketStatusFilter] = useState('OUVERT');
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [ticketMessagesLoading, setTicketMessagesLoading] = useState(false);
  const [adminReply, setAdminReply] = useState('');
  const [adminReplying, setAdminReplying] = useState(false);

  // Music state
  const [musicUrl, setMusicUrl] = useState('');
  const [musicName, setMusicName] = useState('');
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [musicVolume, setMusicVolume] = useState(50);
  const [musicSubmitting, setMusicSubmitting] = useState(false);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicUploading, setMusicUploading] = useState(false);
  const [musicHistory, setMusicHistory] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTimeRemaining, setUploadTimeRemaining] = useState<string>('');


  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate('/login');
        return;
      }

      // Récupérer le profil de l'admin
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (userProfile) {
        setProfile(userProfile);
      }

      fetchUsers();
      fetchPosts();
      fetchRules();
      fetchPageVisibilities();
      fetchBackgroundHistory();
      fetchAdminLogs();
      fetchAdminTeam();
      fetchComments();
      fetchRoles();
      fetchTickets();
      fetchMusicSettings();
      fetchMusicHistory();
      fetchChatSettings();

      // Realtime subscription for users
      const channel = supabase
        .channel('admin-profiles-changes')
        .on(
          'postgres_changes',
          { event: '*', table: 'profiles', schema: 'public' },
          (payload) => {
            console.log('🔄 Realtime update received:', payload);
            fetchUsers(); // Refresh list on any change
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    });
  }, [navigate]);

  const fetchMusicHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_logs')
        .select('*')
        .or('action_type.eq.music_upload,action_type.eq.music_toggle')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      if (data) setMusicHistory(data);
    } catch (error: any) {
      console.error('Erreur chargement historique musique:', error);
    }
  };

  const fetchChatSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('is_locked')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (data) setIsChatLocked(data.is_locked);
    } catch (error) {
      console.error('Error fetching chat settings:', error);
    }
  };

  const toggleChatLock = async () => {
    setChatSubmitting(true);
    try {
      const newState = !isChatLocked;
      const { error } = await supabase
        .from('chat_rooms')
        .update({ is_locked: newState })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (!error) {
        setIsChatLocked(newState);
        await logAdminAction(
          'chat_lock_toggle',
          `💬 Chat général ${newState ? 'verrouillé' : 'déverrouillé'}`,
          'chat',
          'Général'
        );
      }
    } catch (error) {
      console.error('Error toggling chat lock:', error);
    } finally {
      setChatSubmitting(false);
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) return alert('Nom du groupe requis');

    setChatSubmitting(true);
    try {
      // 1. Create Room
      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          name: newGroupName,
          description: newGroupDesc,
          type: 'group',
          is_public: isGroupPublic,
          created_by: profile.id
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // 2. Add participants if provided
      if (groupParticipants.trim()) {
        const participantIds = groupParticipants.split(',').map(id => id.trim()).filter(id => id);

        // Include creator
        participantIds.push(profile.id);

        const participantEntries = participantIds.map(userId => ({
          room_id: room.id,
          user_id: userId
        }));

        const { error: partError } = await supabase
          .from('chat_participants')
          .insert(participantEntries);

        if (partError) console.error('Error adding participants:', partError);
      } else {
        // Just add the creator
        await supabase.from('chat_participants').insert({
          room_id: room.id,
          user_id: profile.id
        });
      }

      await logAdminAction('create_group', `📁 Création du groupe "${newGroupName}" (${isGroupPublic ? 'Public' : 'Privé'})`, 'chat', newGroupName);

      alert('Groupe créé avec succès');
      setNewGroupName('');
      setNewGroupDesc('');
      setIsGroupPublic(false);
      setGroupParticipants('');
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    } finally {
      setChatSubmitting(false);
    }
  };

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
    try {
      setLoading(true);
      // Récupérer les profils avec TOUS les champs incluant provider_id
      // On trie par created_at pour voir les nouveaux en premier si possible
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur chargement profils:', error);
        setLoading(false);
        return;
      }

      if (profiles) {
        console.log(`📥 ${profiles.length} profils chargés.`);
        setUsers(profiles);
      }
      setLoading(false);
    } catch (err) {
      console.error('Erreur fetchUsers:', err);
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setPosts(data);
  };

  const promoteAdmin = async (userId: string) => {
    // Récupérer le nom d'utilisateur pour le log
    const user = users.find(u => u.id === userId);
    const username = user?.username || 'Unknown';

    if (!window.confirm(`Voulez-vous vraiment promouvoir ${username} en Administrateur ?`)) return;

    const { error } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userId);

    if (!error) {
      // Log l'action
      await logAdminAction('promote_admin', `⬆️ Promotion de ${username} en administrateur`, 'user', username);
      fetchUsers();
    } else {
      console.log(`Erreur: ${error.message}`);
    }
  };

  const toggleEditProfilePermission = async (userId: string, username: string, currentState: boolean) => {
    const newState = !currentState;
    const { error } = await supabase
      .from('profiles')
      .update({ can_edit_profile: newState })
      .eq('id', userId);

    if (!error) {
      // Log l'action
      const action = newState ? '🔓 Autoriser modifications de profil' : '🔒 Bloquer modifications de profil';
      await logAdminAction('edit_profile_permission', `${action} pour ${username}`, 'user', username);
      fetchUsers();
    } else {
      console.log(`Erreur: ${error.message}`);
    }
  };

  const fetchPageVisibilities = async () => {
    try {
      const { data } = await supabase
        .from('page_visibility')
        .select('*');

      if (data) {
        const visibilities: { [key: string]: boolean } = {};
        data.forEach((page: any) => {
          visibilities[page.page_name] = page.is_visible;
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

      // 1. On récupère tout pour être sûr de trouver le bon enregistrement (il y en a peu)
      const { data: records } = await supabase
        .from('page_visibility')
        .select('id, page_name');

      const existing = records?.find(r =>
        r.page_name === pageId ||
        r.id === pageId ||
        r.id === `page-${pageId.toLowerCase()}`
      );


      let finalError;
      if (existing) {
        const { error: updateError } = await supabase
          .from('page_visibility')
          .update({ is_visible: isVisible, page_name: pageId })
          .eq('id', existing.id);
        finalError = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('page_visibility')
          .insert({
            id: pageId, // On utilise le nom de la page comme ID pour éviter l'erreur de contrainte NOT NULL
            page_name: pageId,
            is_visible: isVisible
          });
        finalError = insertError;
      }

      const error = finalError;


      if (error) {
        console.error('🔴 ERREUR DÉTECTÉE:', error.message, error.code, error.details);
        throw error;
      }

      await fetchPageVisibilities();


      // Log l'action
      const pageNames: { [key: string]: string } = {
        'Home': 'Accueil',
        'Features': 'Fonctionnalités',
        'Rules': 'Règles',
        'Community': 'Communauté',
        'Shop': 'Shop',
        'Gallery': 'Galerie',
        'About': 'À propos',
        'Chat': 'Chat'
      };
      const pageName = pageNames[pageId] || pageId;
      const action = isVisible ? '👁️ a rendu visible' : '🚫 a caché';
      await logAdminAction('page_visibility', `${action} la page ${pageName}`, 'page', pageName, { isVisible });
    } catch (error: any) {
      console.error('❌ ERREUR COMPLÈTE:', error);
      alert('Erreur lors de la mise à jour: ' + (error.message || 'Erreur inconnue'));
    } finally {
      setPageVisibilityLoading(false);
    }
  };

  const fetchBackgroundHistory = async () => {
    try {
      setBgHistoryLoading(true);
      const { data, error } = await supabase
        .from('background_history')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(10); // Garder les 10 derniers

      if (error) {
        console.warn('Erreur chargement historique:', error);
        return;
      }

      setBackgroundHistory(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setBgHistoryLoading(false);
    }
  };

  const restoreBackground = async (historyEntry: any) => {
    setBgSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      // Mettre à jour le setting principal
      const { error: settingError } = await supabase
        .from('settings')
        .upsert({
          key: 'site_background',
          value: historyEntry.background_url,
          type: historyEntry.background_type
        }, { onConflict: 'key' });

      if (settingError) throw settingError;

      // Ajouter une nouvelle entrée dans l'historique (pas une restoration, une mise à jour)
      const { error: historyError } = await supabase
        .from('background_history')
        .insert({
          background_url: historyEntry.background_url,
          background_type: historyEntry.background_type,
          changed_by: userId,
          is_current: true
        });

      // Marquer l'ancienne comme non-courant
      await supabase
        .from('background_history')
        .update({ is_current: false })
        .neq('background_url', historyEntry.background_url);

      await fetchBackgroundHistory();
    } catch (err: any) {
      showToast(`❌ Erreur: ${err.message}`);
    } finally {
      setBgSubmitting(false);
    }
  };

  // Function to log admin actions
  const logAdminAction = async (
    actionType: string,
    description: string,
    targetType?: string,
    targetName?: string,
    details?: any
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Récupérer le profil de l'admin pour avoir son username
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single();

      const adminName = adminProfile?.username || session.user.email || 'Admin';

      const { error } = await supabase
        .from('admin_logs')
        .insert({
          admin_id: session.user.id,
          admin_name: adminName,
          action_type: actionType,
          action_description: description,
          target_type: targetType,
          target_name: targetName,
          details: details || {}
        });

      if (error) {
        console.error('❌ Erreur log:', error.message, error.details);
      } else {
        console.log('✅ Log enregistré:', description);
        // Recharger les logs si on est sur l'onglet logs
        if (activeTab === 'logs') {
          await fetchAdminLogs();
        }
      }
    } catch (err) {
      console.error('❌ Erreur logAdminAction:', err);
    }
  };

  // Fetch admin logs
  const fetchAdminLogs = async () => {
    try {
      setLogsLoading(true);
      const { data, error } = await supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50); // Les 50 derniers logs

      if (error) {
        console.error('Erreur chargement logs:', error);
        return;
      }

      setAdminLogs(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  // Supprimer un utilisateur
  const deleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`⚠️ ATTENTION: Voulez-vous vraiment SUPPRIMER DÉFINITIVEMENT le compte de ${username} ? Cette action est irréversible.`)) return;
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (!error) {
      // Log l'action (avant de potentiellement se déconnecter)
      await logAdminAction('delete_user', `🗑️ Suppression de l'utilisateur ${username}`, 'user', username);

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
      showToast(`❌ Erreur: ${error.message}`);
    }
  };

  const handleGlobalSync = async () => {
    if (!window.confirm("Voulez-vous synchroniser les Avatars et IDs Discord pour TOUTE la base de données ? (Récupère les données de auth.users)")) return;

    setLoading(true);
    try {
      const { error } = await supabase.rpc('sync_all_discord_data');
      if (error) throw error;
      showToast("✅ Synchronisation globale terminée !");
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      alert("Erreur: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Retirer le rôle admin
  const removeAdmin = async (userId: string, username: string) => {
    if (!window.confirm(`Voulez-vous vraiment retirer les droits d'administrateur à ${username} ?`)) return;
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'user' })
      .eq('id', userId);
    if (!error) {
      // Log l'action
      await logAdminAction('remove_admin', `⬇️ Retrait des droits admin à ${username}`, 'user', username);
      fetchUsers();
    }
  };

  const banUser = async (userId: string, username: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir BANNIR l'utilisateur ${username} ?`)) return;
    const { error } = await supabase
      .from('profiles')
      .update({ banned: true })
      .eq('id', userId);

    if (!error) {
      // Log l'action
      await logAdminAction('ban_user', `🚫 Bannissement de l'utilisateur ${username}`, 'user', username);
      fetchUsers();
    } else {
      alert(`Erreur: ${error.message}`);
    }
  };

  const unbanUser = async (userId: string, username: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ banned: false })
      .eq('id', userId);

    if (!error) {
      // Log l'action
      await logAdminAction('unban_user', `✅ Débannissement de l'utilisateur ${username}`, 'user', username);
      fetchUsers();
    } else {
      alert(`Erreur: ${error.message}`);
    }
  };

  const warnUser = async (user: Profile) => {
    const currentWarnings = user.warnings || 0;
    const { error } = await supabase
      .from('profiles')
      .update({ warnings: currentWarnings + 1 })
      .eq('id', user.id);

    if (!error) {
      await logAdminAction('warn_user', `⚠️ Avertissement donné à ${user.username} (Total: ${currentWarnings + 1})`, 'user', user.username);
      fetchUsers();
      showToast(`⚠️ Avertissement envoyé à ${user.username}`);
    }
  };

  const updateAdminNotes = async (userId: string, notes: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ admin_notes: notes })
      .eq('id', userId);

    if (!error) {
      console.log('✅ Notes admin mises à jour');
      // No need to fetchUsers for notes to avoid lag while typing
    }
  };


  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalMediaUrl = mediaUrls.filter(u => u.trim()).length > 1
      ? JSON.stringify(mediaUrls.filter(u => u.trim()))
      : (mediaUrls.filter(u => u.trim())[0] || '');

    if (!title || !content || !finalMediaUrl) return console.log('Remplissez tous les champs (URL requise)');

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([{
          title,
          content,
          media_type: mediaType,
          media_url: finalMediaUrl
        }])
        .select();

      if (error) throw error;

      console.log('Post publié avec succès !');
      // Log l'action
      await logAdminAction('create_post', `📝 Création d'un nouveau post "${title}"`, 'post', title);
      setTitle('');
      setContent('');
      setMediaUrls(['']);
      setMediaType('image');
      fetchPosts();
    } catch (err: any) {
      console.error('Error:', err);
      console.log(`Erreur: ${err.message}`);
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
      console.log('Post supprimé !');
      // Log l'action
      await logAdminAction('delete_post', `🗑️ Suppression du post #${postId}`, 'post', `Post #${postId}`);
      fetchPosts();
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  const startEditPost = (post: Post) => {
    setEditingPost(post);
    setTitle(post.title);
    setContent(post.content);
    // Check if it's a JSON array
    try {
      if (post.media_url.startsWith('[')) {
        setMediaUrls(JSON.parse(post.media_url));
      } else {
        setMediaUrls([post.media_url]);
      }
    } catch {
      setMediaUrls([post.media_url]);
    }
    setMediaType(post.media_type as any);
  };

  const cancelEditPost = () => {
    setEditingPost(null);
    setTitle('');
    setContent('');
    setMediaUrls(['']);
    setMediaType('image');
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;
    const finalMediaUrl = mediaUrls.filter(u => u.trim()).length > 1
      ? JSON.stringify(mediaUrls.filter(u => u.trim()))
      : (mediaUrls.filter(u => u.trim())[0] || '');

    if (!title || !content || !finalMediaUrl) return console.log('Remplissez tous les champs');

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          title,
          content,
          media_type: mediaType,
          media_url: finalMediaUrl
        })
        .eq('id', editingPost.id);

      if (error) throw error;

      console.log('Post mis à jour avec succès !');
      // Log l'action
      await logAdminAction('update_post', `✏️ Modification du post "${title}" (ID: ${editingPost.id})`, 'post', title);
      cancelEditPost();
      fetchPosts();
    } catch (err: any) {
      console.log(`Erreur: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateBackground = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bgUrl) return console.log('Entrez une URL valide');

    setBgSubmitting(true);
    try {
      // Récupérer l'ID de l'utilisateur actuel
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      console.log('🔄 UPDATE BACKGROUND - userId:', userId);
      console.log('📝 URL:', bgUrl, 'Type:', bgType);

      // 1. Mettre à jour le setting principal
      const { error: settingError } = await supabase
        .from('settings')
        .upsert({
          key: 'site_background',
          value: bgUrl,
          type: bgType
        }, { onConflict: 'key' });

      if (settingError) {
        console.error('❌ Setting error:', settingError);
        throw settingError;
      }
      console.log('✅ Setting mis à jour');

      // 2. Enregistrer dans l'historique
      console.log('📤 Insertion dans background_history...');
      const { data: insertedData, error: historyError } = await supabase
        .from('background_history')
        .insert({
          background_url: bgUrl,
          background_type: bgType,
          changed_by: userId,
          is_current: true
        })
        .select();

      console.log('📥 Réponse:', { data: insertedData, error: historyError });

      if (historyError) {
        console.error('❌ ERREUR HISTORIQUE:', historyError.message, historyError.code, historyError.details);
        console.log('⚠️ Background mis à jour mais historique échoué. Vérifiez la console (F12)');
      } else {
        console.log('✅ Historique enregistré:', insertedData);
      }

      // 3. Marquer les anciens comme non-courant
      console.log('🔄 Marquage des anciens comme non-courants...');
      const { error: updateError } = await supabase
        .from('background_history')
        .update({ is_current: false })
        .neq('background_url', bgUrl);

      if (updateError) {
        console.warn('⚠️ Erreur marquage ancien:', updateError);
      } else {
        console.log('✅ Anciens marqués comme non-courants');
      }

      console.log('✅ Fond d\'écran mis à jour avec succès !');

      // Log l'action
      await logAdminAction(
        'background_update',
        `🎬 a changé le fond d'écran`,
        'background',
        bgType === 'video' ? 'Vidéo' : 'Image',
        { url: bgUrl, type: bgType }
      );

      setBgUrl('');

      // Recharger l'historique
      console.log('🔄 Rechargement historique...');
      await fetchBackgroundHistory();
      console.log('✅ COMPLET!');
    } catch (err: any) {
      console.error('❌ ERREUR COMPLETE:', err);
      alert(`Erreur: ${err.message}`);
    } finally {
      setBgSubmitting(false);
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return console.log('Entrez un nom de catégorie');

    const { data, error } = await supabase
      .from('rule_categories')
      .insert({ name: newCategoryName, description: newCategoryDesc })
      .select();

    if (!error && data) {
      // Log l'action
      await logAdminAction('add_category', `➕ Création de la catégorie de règles "${newCategoryName}"`, 'category', newCategoryName);
      setNewCategoryName('');
      setNewCategoryDesc('');
      fetchRules();
    } else {
      alert(`Erreur: ${error?.message}`);
    }
  };

  const deleteCategory = async (categoryId: number) => {
    if (!confirm('Êtes-vous sûr ? Toutes les règles de cette catégorie seront supprimées.')) return;

    const category = categories.find(c => c.id === categoryId);
    const categoryName = category?.name || `Catégorie #${categoryId}`;

    const { error } = await supabase
      .from('rule_categories')
      .delete()
      .eq('id', categoryId);

    if (!error) {
      // Log l'action
      await logAdminAction('delete_category', `🗑️ Suppression de la catégorie de règles "${categoryName}"`, 'category', categoryName);
      fetchRules();
    } else {
      alert(`Erreur: ${error?.message}`);
    }
  };

  const addRule = async () => {
    if (!selectedCategoryId || !newRuleTitle.trim() || !newRuleContent.trim()) {
      return console.log('Remplissez tous les champs');
    }

    const { error } = await supabase
      .from('rules')
      .insert({
        category_id: selectedCategoryId,
        title: newRuleTitle,
        content: newRuleContent,
        order: rules.filter(r => Number(r.category_id) === Number(selectedCategoryId)).length + 1,
      });

    if (!error) {
      // Log l'action
      const category = categories.find(c => Number(c.id) === Number(selectedCategoryId));
      const categoryName = category?.name || 'Catégorie inconnue';
      await logAdminAction('add_rule', `📋 Ajout d'une nouvelle règle "${newRuleTitle}" dans "${categoryName}"`, 'rule', newRuleTitle);
      setNewRuleTitle('');
      setNewRuleContent('');
      fetchRules();
    } else {
      alert(`Erreur: ${error?.message}`);
    }
  };

  const deleteRule = async (ruleId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette règle?')) return;

    const rule = rules.find(r => r.id === ruleId);
    const ruleName = rule?.title || `Règle #${ruleId}`;

    const { error } = await supabase
      .from('rules')
      .delete()
      .eq('id', ruleId);

    if (!error) {
      // Log l'action
      await logAdminAction('delete_rule', `🗑️ Suppression de la règle "${ruleName}"`, 'rule', ruleName);
      fetchRules();
    } else {
      alert(`Erreur: ${error?.message}`);
    }
  };

  // Admin Team Management
  const fetchAdminTeam = async () => {
    try {
      setAdminTeamLoading(true);
      const { data, error } = await supabase
        .from('admin_team')
        .select('*')
        .order('priority', { ascending: true });

      if (error) throw error;
      setAdminTeam(data || []);
    } catch (error) {
      console.error('Error fetching admin team:', error);
    } finally {
      setAdminTeamLoading(false);
    }
  };

  const addAdmin = async () => {
    if (!newAdminUsername || !newAdminRole || !newAdminPriority) {
      return console.log('Veuillez remplir tous les champs');
    }

    try {
      setAdminSubmitting(true);
      const { data, error } = await supabase
        .from('admin_team')
        .insert([{
          username: newAdminUsername,
          avatar_url: newAdminAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
          role: newAdminRole,
          priority: parseInt(newAdminPriority)
        }])
        .select();

      if (error) throw error;

      await logAdminAction('add_admin', `👤 Ajout de ${newAdminUsername} en ${newAdminRole}`, 'admin', newAdminUsername);

      setNewAdminUsername('');
      setNewAdminAvatar('');
      setNewAdminRole('');
      setNewAdminPriority('');

      fetchAdminTeam();
    } catch (error: any) {
      console.log(`Erreur: ${error.message}`);
    } finally {
      setAdminSubmitting(false);
    }
  };

  const deleteAdmin = async (adminId: string, username: string) => {
    try {
      const { error } = await supabase
        .from('admin_team')
        .delete()
        .eq('id', adminId);

      if (error) throw error;

      await logAdminAction('delete_admin', `🗑️ Suppression de ${username} de la pyramide d'administration`, 'admin', username);

      fetchAdminTeam();
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    }
  };

  // Comments management
  const fetchComments = async () => {
    try {
      setCommentsLoading(true);
      const { data, error } = await supabase
        .from('about_comments')
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleSubmitComment = async (message: string, username: string) => {
    if (!message.trim()) return;

    try {
      const { data, error } = await supabase
        .from('about_comments')
        .insert([{
          username,
          message,
          approved: true
        }])
        .select();

      if (error) throw error;

      // Add comment immediately without reload
      if (data && data.length > 0) {
        setComments([data[0], ...comments]);
      }

      // Log the action
      await logAdminAction('comment_added', `💬 Nouveau commentaire de ${username}`, 'comment', username);
    } catch (error: any) {
      console.log(`Erreur: ${error.message}`);
    }
  };

  // Roles management
  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setRolesLoading(false);
    }
  };

  const addRole = async () => {
    if (!newRoleName) {
      return console.log('Veuillez entrer un nom de rôle');
    }

    try {
      setRoleSubmitting(true);
      const { data, error } = await supabase
        .from('roles')
        .insert([{
          name: newRoleName.toUpperCase(),
          emoji: newRoleEmoji,
          description: newRoleDescription,
          color: newRoleColor
        }])
        .select();

      if (error) throw error;

      await logAdminAction('add_role', `🎭 Création du rôle "${newRoleName}"`, 'role', newRoleName);

      setNewRoleName('');
      setNewRoleEmoji('👤');
      setNewRoleDescription('');
      setNewRoleColor('#D4AF37');

      fetchRoles();
    } catch (error: any) {
      console.log(`Erreur: ${error.message}`);
    } finally {
      setRoleSubmitting(false);
    }
  };

  const deleteRole = async (roleId: string, roleName: string) => {
    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      await logAdminAction('delete_role', `🗑️ Suppression du rôle "${roleName}"`, 'role', roleName);

      fetchRoles();
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    }
  };

  // Tickets management
  const fetchTickets = async () => {
    try {
      setTicketsLoading(true);
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrichir les tickets avec le display_name depuis les profils
      const enrichedTickets = await Promise.all(
        (data || []).map(async (ticket: any) => {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, username')
              .eq('id', ticket.user_id)
              .single();

            return {
              ...ticket,
              display_name: profile?.display_name || profile?.username || ticket.username || 'Utilisateur'
            };
          } catch (err) {
            return ticket;
          }
        })
      );

      setTickets(enrichedTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setTicketsLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          resolved_by: profile?.id,
          resolved_at: newStatus === 'RÉSOLU' ? new Date().toISOString() : null
        })
        .eq('id', ticketId);

      if (error) throw error;

      await logAdminAction('ticket_status_update', `🎫 Mise à jour du ticket statut: ${newStatus}`, 'ticket', ticketId);

      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    }
  };

  const closeTicket = async (ticketId: string) => {
    await updateTicketStatus(ticketId, 'FERMÉ');
  };

  const resolveTicket = async (ticketId: string) => {
    await updateTicketStatus(ticketId, 'RÉSOLU');
  };

  const deleteTicket = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;

      await logAdminAction('delete_ticket', `🗑️ Suppression du ticket ${ticketId.substring(0, 8)}`, 'ticket', ticketId);

      setTickets(tickets.filter(t => t.id !== ticketId));
      setSelectedTicket(null);
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    }
  };

  const fetchTicketMessages = async (ticketId: string) => {
    try {
      setTicketMessagesLoading(true);
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTicketMessages(data || []);
    } catch (error: any) {
      console.error('❌ Erreur chargement messages:', error);
    } finally {
      setTicketMessagesLoading(false);
    }
  };

  const sendAdminReply = async (ticketId: string) => {
    if (!adminReply.trim()) return;

    setAdminReplying(true);
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .insert([{
          ticket_id: ticketId,
          user_id: profile?.id,
          username: profile?.username || 'Admin',
          message: adminReply,
          is_admin: true
        }])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        setTicketMessages([...ticketMessages, data[0]]);
      }

      await logAdminAction('ticket_reply', `💬 Réponse au ticket ${ticketId.substring(0, 8)}`, 'ticket', ticketId);
      setAdminReply('');
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    } finally {
      setAdminReplying(false);
    }
  };

  const toggleUserReplies = async (ticketId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ allow_user_replies: !currentState })
        .eq('id', ticketId);

      if (error) throw error;

      setSelectedTicket({ ...selectedTicket, allow_user_replies: !currentState });
      setTickets(tickets.map(t =>
        t.id === ticketId ? { ...t, allow_user_replies: !currentState } : t
      ));

      await logAdminAction('toggle_ticket_replies', `🔒 Contrôle des réponses ticket: ${!currentState ? 'Activé' : 'Désactivé'}`, 'ticket', ticketId);
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    }
  };

  const fetchMusicSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_music')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data[0]) {
        setMusicUrl(data[0].music_url);
        setMusicName(data[0].music_name);
        setIsPlayingMusic(data[0].is_playing);
        setMusicVolume(data[0].volume);
      }
    } catch (error: any) {
      console.error('❌ Erreur chargement musique:', error);
    }
  };

  const updateMusicUrl = async (url: string, name: string) => {
    if (!url.trim() || !name.trim()) {
      console.log('Veuillez remplir l\'URL et le nom de la musique');
      return;
    }

    setMusicSubmitting(true);
    try {
      // Récupérer l'ID du premier enregistrement
      const { data: existingData } = await supabase
        .from('site_music')
        .select('id')
        .limit(1);

      if (!existingData || !existingData[0]) {
        console.log('Erreur: Aucun enregistrement de musique trouvé');
        setMusicSubmitting(false);
        return;
      }

      const recordId = existingData[0].id;
      const { error } = await supabase
        .from('site_music')
        .update({ music_url: url, music_name: name })
        .eq('id', recordId);

      if (error) throw error;

      setMusicUrl(url);
      setMusicName(name);
      await logAdminAction('music_update', `🎵 Mise à jour: ${name}`, 'music', name, {
        musicUrl: url,
        musicName: name,
        fileName: url.split('/').pop()
      });
      console.log('✅ Musique mise à jour!');
    } catch (error: any) {
      console.error('❌ Erreur mise à jour musique:', error);
      console.log(`Erreur: ${error.message}`);
    } finally {
      setMusicSubmitting(false);
    }
  };

  const toggleMusicPlayback = async () => {
    try {
      // Récupérer l'ID et infos du premier enregistrement
      const { data: existingData } = await supabase
        .from('site_music')
        .select('id, music_url, music_name')
        .limit(1);

      if (!existingData || !existingData[0]) {
        console.log('Erreur: Aucun enregistrement de musique trouvé');
        return;
      }

      const newPlayingState = !isPlayingMusic;
      const recordId = existingData[0].id;
      const { error } = await supabase
        .from('site_music')
        .update({ is_playing: newPlayingState })
        .eq('id', recordId);

      if (error) throw error;

      setIsPlayingMusic(newPlayingState);
      await logAdminAction('music_toggle', `🎵 Musique ${newPlayingState ? 'activée' : 'désactivée'}`, 'music', existingData[0].music_name, {
        musicUrl: existingData[0].music_url,
        musicName: existingData[0].music_name,
        fileName: existingData[0].music_url?.split('/').pop()
      });
      console.log(`✅ Musique ${newPlayingState ? 'lancée' : 'mise en pause'}!`);
    } catch (error: any) {
      console.error('❌ Erreur toggle musique:', error);
      console.log(`Erreur: ${error.message}`);
    }
  };

  const uploadMusicFile = async () => {
    if (!musicFile) {
      console.log('Veuillez sélectionner un fichier audio');
      return;
    }

    if (!musicName.trim()) {
      console.log('Veuillez donner un nom à la musique');
      return;
    }

    setMusicUploading(true);
    setUploadProgress(0);
    setUploadTimeRemaining('');

    const fileSize = musicFile.size;
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    const startTime = Date.now();

    try {
      // Créer un nom unique pour le fichier - NORMALISER pour éviter les erreurs de clé
      const timestamp = Date.now();
      // Enlever les accents et caractères spéciaux du nom original
      const normalizedName = musicFile.name
        .replace(/[àáâãäå]/g, 'a')
        .replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i')
        .replace(/[òóôõö]/g, 'o')
        .replace(/[ùúûü]/g, 'u')
        .replace(/[ç]/g, 'c')
        .replace(/[^a-z0-9.]/gi, '_')  // Remplacer les caractères spéciaux par _
        .toLowerCase();

      const fileName = `music_${timestamp}_${normalizedName}`;

      // Simuler une progression réelle basée sur la taille du fichier
      // Calcul réaliste: ~1-5 MB/sec selon la connexion
      const chunkSize = 1024 * 1024; // 1 MB chunks
      const totalChunks = Math.ceil(fileSize / chunkSize);
      let uploadedBytes = 0;

      const progressInterval = setInterval(() => {
        // Simuler l'upload graduel
        uploadedBytes = Math.min(uploadedBytes + (Math.random() * fileSize * 0.15), fileSize * 0.95);
        const progress = Math.floor((uploadedBytes / fileSize) * 100);
        const uploadedMB = (uploadedBytes / (1024 * 1024)).toFixed(2);

        setUploadProgress(progress);

        // Calculer le temps restant
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const bytesPerSecond = uploadedBytes / elapsedSeconds;
        const remainingBytes = fileSize - uploadedBytes;
        const remainingSeconds = Math.max(0, remainingBytes / bytesPerSecond);

        if (remainingSeconds > 0) {
          const minutes = Math.floor(remainingSeconds / 60);
          const seconds = Math.floor(remainingSeconds % 60);
          setUploadTimeRemaining(
            minutes > 0
              ? `${minutes}m ${seconds}s`
              : `${seconds}s`
          );
        }
      }, 300);

      // Uploader le fichier dans Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('music')
        .upload(fileName, musicFile, {
          cacheControl: '3600',
          upsert: false
        });

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      // Mettre à jour la progression à 100%
      setUploadProgress(100);
      setUploadTimeRemaining('Finalisation...');

      // Récupérer l'URL publique du fichier
      const { data: publicUrl } = supabase
        .storage
        .from('music')
        .getPublicUrl(fileName);

      console.log('✅ Fichier uploadé:', publicUrl.publicUrl);

      // ⚠️ VALIDATION: Vérifier que l'URL est bien de Supabase
      if (!publicUrl.publicUrl.includes('supabase.co') ||
        !publicUrl.publicUrl.includes('/storage/') ||
        !publicUrl.publicUrl.includes('public/music/')) {
        throw new Error('❌ URL de fichier invalide - non-Supabase');
      }

      // Mettre à jour la base de données avec la nouvelle URL
      const { data: existingData } = await supabase
        .from('site_music')
        .select('id')
        .limit(1);

      if (!existingData || !existingData[0]) {
        console.log('Erreur: Aucun enregistrement de musique trouvé');
        setMusicUploading(false);
        setUploadProgress(0);
        setUploadTimeRemaining('');
        return;
      }

      const { error: updateError } = await supabase
        .from('site_music')
        .update({
          music_url: publicUrl.publicUrl,
          music_name: musicName
        })
        .eq('id', existingData[0].id);

      if (updateError) throw updateError;

      setMusicUrl(publicUrl.publicUrl);
      setMusicFile(null);
      await logAdminAction('music_upload', `🎵 Upload de musique: ${musicName}`, 'music', musicName, {
        musicUrl: publicUrl.publicUrl,
        musicName: musicName,
        fileName: publicUrl.publicUrl.split('/').pop()
      });

      // Attendre un bit pour afficher 100%
      setTimeout(() => {
        setUploadProgress(0);
        setUploadTimeRemaining('');
        console.log('✅ Musique uploadée avec succès!');
      }, 500);
    } catch (error: any) {
      console.error('❌ Erreur upload:', error);

      // Afficher un message d'erreur clair
      let errorMessage = error.message || 'Erreur inconnue';

      if (error.message?.includes('Bucket not found')) {
        errorMessage = '❌ Le bucket "music" n\'existe pas dans Supabase Storage.\n\nSolution:\n1. Allez à: Supabase Dashboard → Storage\n2. Cliquez "New bucket"\n3. Nom: music\n4. Cochez "Public bucket"\n5. Créez le bucket';
      } else if (error.message?.includes('Invalid key')) {
        errorMessage = '❌ Le nom du fichier contient des caractères invalides.\n\nAssurez-vous que le nom contient uniquement des caractères simples (a-z, 0-9).';
      }

      console.log(`Erreur: ${errorMessage}`);
      setUploadProgress(0);
      setUploadTimeRemaining('');
    } finally {
      setMusicUploading(false);
    }
  };

  const updateMusicVolume = async (newVolume: number) => {
    try {
      // Récupérer l'ID du premier enregistrement
      const { data: existingData } = await supabase
        .from('site_music')
        .select('id')
        .limit(1);

      if (!existingData || !existingData[0]) {
        console.error('Erreur: Aucun enregistrement de musique trouvé');
        return;
      }

      const recordId = existingData[0].id;
      const { error } = await supabase
        .from('site_music')
        .update({ volume: newVolume })
        .eq('id', recordId);

      if (error) throw error;

      setMusicVolume(newVolume);
      await logAdminAction('music_volume', `🔊 Volume musique: ${newVolume}%`, 'music', 'music');
    } catch (error: any) {
      console.error('❌ Erreur volume musique:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pt-28 md:pt-32 lg:pt-36 pb-24 bg-luxury-dark min-h-screen"
    >
      <div className="w-full mx-auto px-16 max-w-screen-2xl">
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
              onClick={() => {
                setActiveTab('config');
                fetchAdminTeam();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'config' ? 'bg-luxury-gold text-black' : 'hover:bg-white/5'}`}
            >
              <Settings size={16} /> Config
            </button>
            <button
              onClick={() => {
                setActiveTab('logs');
                fetchAdminLogs();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'logs' ? 'bg-luxury-gold text-black' : 'hover:bg-white/5'}`}
            >
              <Activity size={16} /> Logs
            </button>
            <button
              onClick={() => {
                setActiveTab('tickets');
                fetchTickets();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'tickets' ? 'bg-luxury-gold text-black' : 'hover:bg-white/5'}`}
            >
              <Ticket size={16} /> Tickets
            </button>
            <button
              onClick={() => {
                setActiveTab('music');
                fetchMusicSettings();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'music' ? 'bg-luxury-gold text-black' : 'hover:bg-white/5'}`}
            >
              <Music size={16} /> Musique
            </button>
            <button
              onClick={() => {
                setActiveTab('chat');
                fetchChatSettings();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'chat' ? 'bg-luxury-gold text-black' : 'hover:bg-white/5'}`}
            >
              <MessageSquare size={16} /> Chat
            </button>
          </div>
        </header>

        {activeTab === 'users' && (
          <div className="relative">
            {/* Barre de recherche et filtres de modération */}
            <div className="glass rounded-3xl border border-white/5 mb-8 p-6">
              <div className="flex flex-col lg:flex-row gap-6 items-center">
                <div className="flex-1 w-full">
                  <div className="relative group">
                    <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-luxury-gold transition-colors" size={20} />
                    <input
                      type="text"
                      placeholder="Rechercher par pseudo, ID ou Discord ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-black border border-white/10 focus:border-luxury-gold text-white outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={() => setIsOnlineOnly(!isOnlineOnly)}
                    className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${isOnlineOnly ? 'bg-green-500 border-green-400 text-white shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-white/5 border-white/10 text-gray-400'}`}
                  >
                    🟢 En ligne
                  </button>
                  <button
                    onClick={() => setRoleFilter(roleFilter === 'admin' ? 'all' : 'admin')}
                    className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${roleFilter === 'admin' ? 'bg-luxury-gold border-luxury-goldLight text-black' : 'bg-white/5 border-white/10 text-gray-400'}`}
                  >
                    👑 Admins
                  </button>
                  <button
                    onClick={() => setStatusFilter(statusFilter === 'banned' ? 'all' : 'banned')}
                    className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${statusFilter === 'banned' ? 'bg-red-500 border-red-400 text-white' : 'bg-white/5 border-white/10 text-gray-400'}`}
                  >
                    🚫 Bannis
                  </button>
                  <button
                    onClick={() => setLocationFilter(locationFilter === 'with' ? 'all' : 'with')}
                    className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${locationFilter === 'with' ? 'bg-cyan-500 border-cyan-400 text-white' : 'bg-white/5 border-white/10 text-gray-400'}`}
                  >
                    📍 GPS Actif
                  </button>
                </div>
              </div>
            </div>

            {(() => {
              const filteredUsers = users
                .filter(user => {
                  const s = searchTerm.toLowerCase();
                  const matchSearch =
                    (user.username?.toLowerCase() || '').includes(s) ||
                    (user.display_name?.toLowerCase() || '').includes(s) ||
                    (user.id?.toLowerCase() || '').includes(s) ||
                    (user.provider_id?.toLowerCase() || '').includes(s);

                  if (!matchSearch) return false;

                  const isActuallyOnline = user.last_seen && (Date.now() - new Date(user.last_seen).getTime() < 120000);
                  if (isOnlineOnly && !isActuallyOnline) return false;
                  if (roleFilter === 'admin' && user.role !== 'admin') return false;
                  if (statusFilter === 'banned' && !user.banned) return false;
                  if (locationFilter === 'with' && (!user.latitude || !user.longitude)) return false;

                  return true;
                })
                .sort((a, b) => {
                  const aOnline = a.last_seen && (Date.now() - new Date(a.last_seen).getTime() < 120000);
                  const bOnline = b.last_seen && (Date.now() - new Date(b.last_seen).getTime() < 120000);

                  if (aOnline && !bOnline) return -1;
                  if (!aOnline && bOnline) return 1;

                  const dateA = a.last_seen ? new Date(a.last_seen).getTime() : 0;
                  const dateB = b.last_seen ? new Date(b.last_seen).getTime() : 0;
                  return dateB - dateA;
                });

              return (
                <>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-luxury-gold/10 rounded-lg">
                        <Users className="text-luxury-gold" size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Gestion des Utilisateurs</h2>
                        <p className="text-sm text-gray-400">
                          {filteredUsers.length} utilisateurs affichés / {users.length} au total
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={fetchUsers}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl border border-white/10 text-xs font-black uppercase transition-all"
                      >
                        <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
                        Actualiser
                      </button>
                      <button
                        onClick={handleGlobalSync}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/20 text-xs font-black uppercase transition-all"
                        title="Synchroniser avatars & IDs Discord pour tous les users"
                      >
                        <ShieldCheck size={14} className={loading ? 'animate-spin' : ''} />
                        Sync Global
                      </button>
                      <button
                        onClick={() => setIsOnlineOnly(!isOnlineOnly)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-black uppercase transition-all ${isOnlineOnly
                          ? 'bg-green-500/20 border-green-500/40 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                          }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${isOnlineOnly ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`}></div>
                        En ligne uniquement
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredUsers.map(user => (
                      <UserCard
                        key={user.id}
                        user={user}
                        onClick={(u) => {
                          setSelectedUser(u);
                          setIsSidePanelOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </>
              );
            })()}

            {/* Panneau latéral de détails */}
            <UserSidePanel
              user={selectedUser}
              isOpen={isSidePanelOpen}
              onClose={() => setIsSidePanelOpen(false)}
              onBan={(u) => {
                if (window.confirm(`Voulez-vous vraiment bannir ${u.username} ?`)) {
                  banUser(u.id, u.username);
                }
              }}
              onUnban={(u) => unbanUser(u.id, u.username)}
              onWarn={(u) => warnUser(u)}
              onDelete={(u) => {
                if (window.confirm(`⚠️ ATTENTION: Voulez-vous supprimer DÉFINITIVEMENT ${u.username} ? Cette action est irréversible.`)) {
                  deleteUser(u.id, u.username);
                }
              }}
              onPromote={(u) => {
                if (window.confirm(`Promouvoir ${u.username} au rang d'administrateur ?`)) {
                  promoteAdmin(u.id);
                }
              }}
              onRemoveAdmin={(u) => {
                if (window.confirm(`Retirer les droits administrateur de ${u.username} ?`)) {
                  removeAdmin(u.id, u.username);
                }
              }}
              onUpdateNotes={updateAdminNotes}
              onSync={fetchUsers}
              onMessage={async (targetUser) => {
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) return navigate('/login');

                  const currentUserId = session.user.id;
                  if (currentUserId === targetUser.id) return alert("Vous ne pouvez pas vous envoyer de message à vous-même.");

                  // 1. Chercher si une room privée existe déjà
                  const { data: myParticipants } = await supabase
                    .from('chat_participants')
                    .select('room_id')
                    .eq('user_id', currentUserId);

                  const myRoomIds = myParticipants?.map(p => p.room_id) || [];
                  let existingRoomId = null;

                  if (myRoomIds.length > 0) {
                    const { data: sharedParticipants } = await supabase
                      .from('chat_participants')
                      .select('room_id')
                      .in('room_id', myRoomIds)
                      .eq('user_id', targetUser.id);

                    if (sharedParticipants && sharedParticipants.length > 0) {
                      const { data: existingRooms } = await supabase
                        .from('chat_rooms')
                        .select('id')
                        .eq('type', 'private')
                        .in('id', sharedParticipants.map(sp => sp.room_id));

                      if (existingRooms && existingRooms.length > 0) {
                        existingRoomId = existingRooms[0].id;
                      }
                    }
                  }

                  let finalRoomId = existingRoomId;

                  // 2. Si pas de room, la créer
                  if (!finalRoomId) {
                    const { data: newRoom, error: roomError } = await supabase
                      .from('chat_rooms')
                      .insert({
                        type: 'private',
                        name: `Support: ${targetUser.username}`
                      })
                      .select()
                      .single();

                    if (roomError) throw roomError;

                    const { error: partError } = await supabase.from('chat_participants').insert([
                      { room_id: newRoom.id, user_id: currentUserId },
                      { room_id: newRoom.id, user_id: targetUser.id }
                    ]);

                    if (partError) throw partError;
                    finalRoomId = newRoom.id;
                  }

                  // 3. Rediriger vers le chat avec l'ID de la room
                  navigate('/chat', { state: { openRoomId: finalRoomId } });
                } catch (err: any) {
                  console.error('Error starting message:', err);
                  alert('Erreur lors de l\'ouverture de la discussion');
                }
              }}
            />
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
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Type de média principal</label>
                    <select value={mediaType} onChange={(e) => setMediaType(e.target.value as any)} className="w-full px-6 py-4 rounded-xl bg-black border border-white/10 focus:border-luxury-gold text-white outline-none">
                      <option value="image">Image / Album</option>
                      <option value="video">Vidéo</option>
                      <option value="file">Fichier</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">URLs des Médias (Ajoutez-en plusieurs pour créer un album)</label>
                  <div className="space-y-3">
                    {mediaUrls.map((url, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => {
                            const newUrls = [...mediaUrls];
                            newUrls[index] = e.target.value;
                            setMediaUrls(newUrls);
                          }}
                          required={index === 0}
                          className="flex-1 px-6 py-4 rounded-xl bg-black border border-white/10 focus:border-luxury-gold transition-all text-white outline-none text-sm"
                          placeholder={`Lien image #${index + 1} (JPG, PNG, GIF...)`}
                        />
                        {mediaUrls.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setMediaUrls(mediaUrls.filter((_, i) => i !== index))}
                            className="p-4 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all border border-red-500/20"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setMediaUrls([...mediaUrls, ''])}
                      className="w-full py-3 bg-white/5 border border-dashed border-white/20 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest"
                    >
                      + Ajouter une autre image à l'album
                    </button>
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
                          <img
                            src={(() => {
                              try {
                                if (post.media_url.startsWith('[')) {
                                  return JSON.parse(post.media_url)[0];
                                }
                                return post.media_url;
                              } catch {
                                return post.media_url;
                              }
                            })()}
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 auto-rows-max">
            {/* PAGE VISIBILITY SECTION */}
            <div className="glass p-8 rounded-2xl border border-white/5">
              <div className="text-center mb-8">
                <div className="w-12 h-12 bg-luxury-gold/10 rounded-xl flex items-center justify-center mx-auto mb-4 text-luxury-gold">
                  👁️
                </div>
                <h3 className="text-xl font-cinzel font-bold uppercase tracking-widest">Visibilité des Pages</h3>
                <p className="text-gray-500 text-xs mt-1">Afficher/masquer les pages</p>
              </div>

              <div className="space-y-3">
                {Object.entries({
                  'Home': '🏠 Accueil',
                  'Features': '✨ Fonctionnalités',
                  'Rules': '📋 Règles',
                  'Community': '👥 Communauté',
                  'Shop': '🛍️ Shop',
                  'Gallery': '🎨 Galerie',
                  'About': 'ℹ️ À propos',
                  'Chat': '💬 Chat',
                }).map(([pageId, label]) => (
                  <div
                    key={pageId}
                    className="p-5 rounded-xl border border-white/10 bg-black/30 hover:bg-black/50 transition-all flex items-center justify-between"
                  >
                    <span className="font-bold uppercase tracking-widest text-sm">{label}</span>

                    {/* Toggle Switch */}
                    <motion.button
                      onClick={() => {
                        const currentVal = pageVisibilities[pageId] !== false;
                        updatePageVisibility(pageId, !currentVal);
                      }}
                      disabled={pageVisibilityLoading}
                      className="relative w-14 h-8 rounded-full transition-colors"
                      style={{
                        backgroundColor: (pageVisibilities[pageId] !== false) ? '#10b981' : '#6b7280'
                      }}
                    >
                      <motion.div
                        className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg"
                        animate={{
                          x: (pageVisibilities[pageId] !== false) ? 24 : 0
                        }}
                        transition={{
                          type: 'spring',
                          stiffness: 500,
                          damping: 40
                        }}
                      />
                    </motion.button>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-600/30 rounded-xl">
                <p className="text-yellow-500 text-xs font-bold uppercase tracking-widest">
                  ⚠️ Les pages masquées disparaîtront du menu de navigation et seront inaccessibles même via URL. Les admins les verront toujours.
                </p>
              </div>
            </div>

            {/* BACKGROUND SECTION */}
            <form onSubmit={handleUpdateBackground} className="glass p-8 rounded-2xl border border-white/5">
              <div className="text-center mb-8">
                <div className="w-12 h-12 bg-luxury-gold/10 rounded-xl flex items-center justify-center mx-auto mb-4 text-luxury-gold">
                  <Video size={24} />
                </div>
                <h3 className="text-xl font-cinzel font-bold uppercase tracking-widest">Fond du Site</h3>
                <p className="text-gray-500 text-xs mt-1">Modifiez l'arrière-plan</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Type</label>
                  <select value={bgType} onChange={(e) => setBgType(e.target.value as any)} className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 focus:border-luxury-gold text-white outline-none text-sm">
                    <option value="image">Image</option>
                    <option value="video">Vidéo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">URL</label>
                  <input
                    type="url"
                    value={bgUrl}
                    onChange={(e) => setBgUrl(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 focus:border-luxury-gold transition-all text-white outline-none text-sm"
                    placeholder="https://example.com/bg.jpg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Imgur, imgbb, ou lien direct
                  </p>
                </div>

                <div className="flex gap-2">
                  <a href="https://catbox.moe/" target="_blank" rel="noopener noreferrer" className="flex-1 py-2 bg-blue-600 text-white font-bold uppercase tracking-widest rounded-lg text-center transition-all hover:bg-blue-700 text-xs">
                    🎬 Vidéo
                  </a>
                  <a href="https://postimages.org/" target="_blank" rel="noopener noreferrer" className="flex-1 py-2 bg-purple-600 text-white font-bold uppercase tracking-widest rounded-lg text-center transition-all hover:bg-purple-700 text-xs">
                    🖼️ Image
                  </a>
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
            </form>

            {/* HISTORIQUE DES BACKGROUNDS */}
            <div className="glass p-8 rounded-2xl border border-white/5">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-luxury-gold/10 rounded-xl flex items-center justify-center mx-auto mb-3 text-luxury-gold">
                  <History size={24} />
                </div>
                <h3 className="text-xl font-cinzel font-bold uppercase tracking-widest">📜 Historique des Fonds</h3>
                <p className="text-gray-500 text-xs mt-1">Vos 10 dernières modifications (cliquez pour restaurer)</p>
              </div>

              {bgHistoryLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-3 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : backgroundHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-4 text-xs">Aucun historique disponible</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {backgroundHistory.map((entry, idx) => (
                    <button
                      key={entry.id}
                      onClick={() => restoreBackground(entry)}
                      disabled={bgSubmitting}
                      className="w-full p-3 rounded-lg border border-white/10 hover:border-luxury-gold/50 bg-black/30 hover:bg-black/50 transition-all text-left group disabled:opacity-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-luxury-gold font-bold uppercase tracking-widest">
                            {idx === 0 ? '⭐ Actuelle' : `#${idx}`}
                          </p>
                          <p className="text-gray-300 text-xs font-mono truncate group-hover:text-luxury-gold transition-colors">
                            {entry.background_url}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(entry.changed_at).toLocaleString('fr-FR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <span className="px-1.5 py-0.5 rounded bg-luxury-gold/10 text-luxury-gold font-bold text-xs">
                            {entry.background_type === 'video' ? '🎬 VIDEO' : '🖼️ IMAGE'}
                          </span>
                          <span className="text-luxury-gold group-hover:scale-110 transition-transform">→</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ABOUT PAGE SECTION */}
            <div className="glass p-8 rounded-2xl border border-white/5">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-luxury-gold/10 rounded-xl flex items-center justify-center mx-auto mb-3 text-luxury-gold">
                  ℹ️
                </div>
                <h3 className="text-xl font-cinzel font-bold uppercase tracking-widest">Gestion de la Page À Propos</h3>
                <p className="text-gray-500 text-xs mt-1">Gérez les informations sur le serveur visibles aux utilisateurs</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Admin Team Management */}
                <div className="p-5 rounded-lg bg-black/50 border border-white/10 lg:col-span-2">
                  <h4 className="font-bold uppercase tracking-widest text-xs mb-3">👥 Gestion de la Pyramide d'Administration</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Pseudo (Username)</label>
                      <input
                        type="text"
                        value={newAdminUsername}
                        onChange={(e) => setNewAdminUsername(e.target.value)}
                        placeholder="Ex: ALEX"
                        className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 focus:border-luxury-gold text-white outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">URL Avatar</label>
                      <input
                        type="url"
                        value={newAdminAvatar}
                        onChange={(e) => setNewAdminAvatar(e.target.value)}
                        placeholder="https://example.com/avatar.jpg"
                        className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 focus:border-luxury-gold text-white outline-none text-xs"
                      />
                      {newAdminAvatar && !newAdminAvatar.match(/\.(jpeg|jpg|gif|png|webp)$/i) && (
                        <p className="text-yellow-500 text-[10px] mt-1 font-bold">
                          ⚠️ Attention: Utilisez le "Lien Direct" (doit finir par .jpg, .png).
                          <br />Sur PostImages/Imgur, copiez le lien qui se termine par l'extension.
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Rôle</label>
                        <select
                          value={newAdminRole}
                          onChange={(e) => setNewAdminRole(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 focus:border-luxury-gold text-white outline-none text-xs"
                        >
                          <option value="">-- Sélectionner un rôle --</option>
                          {roles.map((role) => (
                            <option key={role.id} value={role.name}>
                              {role.emoji} {role.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Priorité (Position Pyramide)</label>
                        <select
                          value={newAdminPriority}
                          onChange={(e) => setNewAdminPriority(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 focus:border-luxury-gold text-white outline-none text-xs"
                        >
                          <option value="">-- Sélectionner un rôle --</option>
                          <option value="1">1 - Haut (Owner)</option>
                          <option value="2">2 - CO-OWNER</option>
                          <option value="3">3 - DIRECTOR</option>
                          <option value="4">4 - SUPERVISOR</option>
                          <option value="5">5 - MANAGER</option>
                          <option value="6">6 - SENIOR-ADMIN</option>
                          <option value="7">7 - ADMIN</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={addAdmin}
                    disabled={adminSubmitting}
                    className="w-full mt-3 py-2 rounded-lg bg-luxury-gold/20 hover:bg-luxury-gold/30 border border-luxury-gold/50 text-luxury-gold font-bold uppercase tracking-widest text-xs transition-all disabled:opacity-50"
                  >
                    {adminSubmitting ? '⏳ Ajout en cours...' : '➕ Ajouter Admin'}
                  </button>
                </div>

                {/* Current Admin List */}
                <div className="p-5 rounded-lg bg-black/50 border border-white/10 lg:col-span-2">
                  <h4 className="font-bold uppercase tracking-widest text-xs mb-3">📋 Admins Actuels</h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {adminTeamLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="w-4 h-4 border-2 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : adminTeam.length === 0 ? (
                      <p className="text-gray-500 text-center py-4 text-xs">Aucun admin actuellement</p>
                    ) : (
                      adminTeam.map((admin) => (
                        <div key={admin.id} className="p-2 rounded-lg bg-black/50 border border-white/10 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img src={admin.avatar_url} alt={admin.username} className="w-6 h-6 rounded-full object-cover" />
                            <div>
                              <p className="text-white font-bold text-xs">{admin.username}</p>
                              <p className="text-luxury-gold text-xs">{admin.role} - Priorité {admin.priority}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteAdmin(admin.id, admin.username)}
                            className="px-2 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 text-red-400 font-bold text-xs transition-all"
                          >
                            🗑️ Supprimer
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* FAQ Management */}
                <div className="p-5 rounded-lg bg-black/50 border border-white/10">
                  <h4 className="font-bold uppercase tracking-widest text-xs mb-3">❓ FAQ - Gestion Questions/Réponses</h4>
                  <div className="space-y-2 mb-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Question</label>
                      <input type="text" placeholder="Comment rejoindre le serveur ?" className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 focus:border-luxury-gold text-white outline-none text-xs" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Réponse</label>
                      <textarea placeholder="Saisissez votre réponse ici..." rows={2} className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 focus:border-luxury-gold text-white outline-none text-xs resize-none" />
                    </div>
                  </div>
                  <button className="w-full py-2 rounded-lg bg-luxury-gold/20 hover:bg-luxury-gold/30 border border-luxury-gold/50 text-luxury-gold font-bold uppercase tracking-widest text-xs transition-all">
                    + Ajouter FAQ
                  </button>
                </div>

                {/* Comments Settings */}
                <div className="p-5 rounded-lg bg-black/50 border border-white/10">
                  <h4 className="font-bold uppercase tracking-widest text-xs mb-3">💬 Section Commentaires</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-4 h-4 accent-luxury-gold" />
                      <span className="text-xs">Activer les commentaires</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-4 h-4 accent-luxury-gold" />
                      <span className="text-xs">Modération requise</span>
                    </label>
                  </div>
                </div>
              </div>

              <button className="w-full mt-4 py-3 bg-luxury-gold text-black font-bold uppercase tracking-widest rounded-lg hover:scale-[1.02] transition-transform text-sm">
                💾 Enregistrer les Modifications
              </button>
            </div>

            {/* ROLES MANAGEMENT SECTION */}
            <div className="glass p-8 rounded-2xl border border-white/5">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-luxury-gold/10 rounded-xl flex items-center justify-center mx-auto mb-3 text-luxury-gold">
                  🎭
                </div>
                <h3 className="text-xl font-cinzel font-bold uppercase tracking-widest">Gestion des Rôles</h3>
                <p className="text-gray-500 text-xs mt-1">Créez et gérez les rôles personnalisés</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Add Role Form */}
                <div className="p-5 rounded-lg bg-black/50 border border-white/10">
                  <h4 className="font-bold uppercase tracking-widest text-xs mb-3">➕ Ajouter un Rôle</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Nom du Rôle</label>
                      <input
                        type="text"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        placeholder="Ex: MODÉRATEUR"
                        className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 focus:border-luxury-gold text-white outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Emoji</label>
                      <input
                        type="text"
                        value={newRoleEmoji}
                        onChange={(e) => setNewRoleEmoji(e.target.value)}
                        placeholder="👤"
                        maxLength={2}
                        className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 focus:border-luxury-gold text-white outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Description</label>
                      <input
                        type="text"
                        value={newRoleDescription}
                        onChange={(e) => setNewRoleDescription(e.target.value)}
                        placeholder="Ex: Modérateurs du serveur"
                        className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 focus:border-luxury-gold text-white outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Couleur Hex</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={newRoleColor}
                          onChange={(e) => setNewRoleColor(e.target.value)}
                          className="w-12 h-8 rounded-lg cursor-pointer"
                        />
                        <input
                          type="text"
                          value={newRoleColor}
                          onChange={(e) => setNewRoleColor(e.target.value)}
                          placeholder="#D4AF37"
                          className="flex-1 px-3 py-2 rounded-lg bg-black border border-white/10 focus:border-luxury-gold text-white outline-none text-xs"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={addRole}
                    disabled={roleSubmitting}
                    className="w-full mt-3 py-2 rounded-lg bg-luxury-gold/20 hover:bg-luxury-gold/30 border border-luxury-gold/50 text-luxury-gold font-bold uppercase tracking-widest text-xs transition-all disabled:opacity-50"
                  >
                    {roleSubmitting ? '⏳ Création...' : '➕ Créer le Rôle'}
                  </button>
                </div>

                {/* Roles List */}
                <div className="p-5 rounded-lg bg-black/50 border border-white/10">
                  <h4 className="font-bold uppercase tracking-widest text-xs mb-3">📋 Rôles Existants</h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {rolesLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="w-4 h-4 border-2 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : roles.length === 0 ? (
                      <p className="text-gray-500 text-center py-4 text-xs">Aucun rôle actuellement</p>
                    ) : (
                      roles.map((role) => (
                        <div key={role.id} className="p-2 rounded-lg bg-black/50 border border-white/10 flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-white font-bold text-xs">
                              {role.emoji} {role.name}
                            </p>
                            <p className="text-gray-500 text-xs">{role.description}</p>
                          </div>
                          <button
                            onClick={() => deleteRole(role.id, role.name)}
                            className="px-2 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 text-red-400 font-bold text-xs transition-all"
                          >
                            🗑️
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
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
                      {rules.filter(r => String(r.category_id) === String(category.id)).length === 0 ? (
                        <p className="text-gray-500 text-sm">Aucune règle dans cette catégorie</p>
                      ) : (
                        <ul className="space-y-2">
                          {rules.filter(r => String(r.category_id) === String(category.id)).map(rule => (
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

                    {selectedCategoryId !== String(category.id) && (
                      <button
                        onClick={() => setSelectedCategoryId(String(category.id))}
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

        {/* PROFILE PERMISSIONS SECTION */}
        {activeTab === 'config' && (
          <div className="glass p-8 rounded-2xl border border-white/5 col-span-1 lg:col-span-2 mt-6">
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-luxury-gold/10 rounded-xl flex items-center justify-center mx-auto mb-4 text-luxury-gold">
                🔐
              </div>
              <h3 className="text-xl font-cinzel font-bold uppercase tracking-widest">Permissions de Profil</h3>
              <p className="text-gray-500 text-xs mt-1">Bloquer/Débloquer les modifications pour TOUS les utilisateurs</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Block All Profiles */}
              <button
                onClick={async () => {
                  if (window.confirm('⚠️ Êtes-vous sûr ? Cela bloquera TOUS les utilisateurs')) {
                    const { error } = await supabase.from('profiles').update({ can_edit_profile: false }).gte('created_at', '1900-01-01');
                    if (!error) {
                      showToast('✅ Tous les profils sont bloqués');
                      await logAdminAction('bulk_block_profiles', '🔒 Tous les profils ont été bloqués', 'config', 'bulk');
                      fetchUsers();
                    } else {
                      showToast('❌ Erreur: ' + error.message);
                    }
                  }
                }}
                className="p-6 rounded-lg bg-red-500/10 border-2 border-red-500/30 hover:border-red-500/60 hover:bg-red-500/20 transition-all"
              >
                <div className="text-lg font-bold text-red-400 mb-2">🔒 Bloquer TOUS</div>
                <p className="text-xs text-red-300">Les utilisateurs ne peuvent pas modifier leur profil</p>
              </button>

              {/* Unlock All Profiles */}
              <button
                onClick={async () => {
                  if (window.confirm('✅ Êtes-vous sûr ? Cela débloquera TOUS les utilisateurs')) {
                    const { error } = await supabase.from('profiles').update({ can_edit_profile: true }).gte('created_at', '1900-01-01');
                    if (!error) {
                      showToast('✅ Tous les profils sont débloqués');
                      await logAdminAction('bulk_unlock_profiles', '🔓 Tous les profils ont été débloqués', 'config', 'bulk');
                      fetchUsers();
                    } else {
                      showToast('❌ Erreur: ' + error.message);
                    }
                  }
                }}
                className="p-6 rounded-lg bg-green-500/10 border-2 border-green-500/30 hover:border-green-500/60 hover:bg-green-500/20 transition-all"
              >
                <div className="text-lg font-bold text-green-400 mb-2">🔓 Débloquer TOUS</div>
                <p className="text-xs text-green-300">Les utilisateurs peuvent modifier leur profil</p>
              </button>
            </div>

            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-600/30 rounded-xl">
              <p className="text-yellow-500 text-xs font-bold uppercase tracking-widest">
                ⚠️ Attention: Ces actions s'appliquent à TOUS les utilisateurs à la fois. Vous pouvez aussi gérer les permissions individuelles depuis la liste des utilisateurs.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-6">
            <div className="glass p-10 rounded-[3rem] border border-white/5">
              <div className="text-center mb-10">
                <div className="w-16 h-16 bg-luxury-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-luxury-gold">
                  <Activity size={32} />
                </div>
                <h3 className="text-2xl font-cinzel font-bold uppercase tracking-widest">📊 Historique des Actions Admin</h3>
                <p className="text-gray-500 text-sm mt-2">Suivi de toutes les modifications effectuées par les administrateurs (50 dernières actions)</p>
              </div>

              {logsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-3 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : adminLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-12">📝 Aucun log enregistré pour le moment</p>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {adminLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-5 rounded-xl border border-white/10 bg-black/30 hover:bg-black/50 hover:border-luxury-gold/50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          {/* Admin name & action */}
                          <p className="text-sm font-bold text-luxury-gold">
                            👤 {log.admin_name || 'Administrateur'}
                          </p>

                          {/* Action description */}
                          <p className="text-white text-sm font-semibold mt-2">
                            {log.action_description}
                          </p>

                          {/* Details if present */}
                          {log.target_type && (
                            <p className="text-xs text-gray-400 mt-2">
                              <span className="text-gray-500">Cible:</span> {log.target_type} &gt; <span className="text-luxury-gold/80 font-semibold">{log.target_name}</span>
                            </p>
                          )}

                          {/* Timestamp */}
                          <p className="text-xs text-gray-500 mt-3">
                            ⏰ {new Date(log.created_at).toLocaleString('fr-FR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </p>
                        </div>

                        {/* Action type badge */}
                        <div className="flex flex-col items-end gap-2">
                          <span className="px-3 py-1 rounded-full bg-luxury-gold/10 text-luxury-gold text-xs font-bold uppercase">
                            {log.action_type === 'page_visibility' && '👁️ Page'}
                            {log.action_type === 'background_update' && '🎬 Background'}
                            {log.action_type === 'ban_user' && '🚫 Ban'}
                            {log.action_type === 'unban_user' && '✅ Unban'}
                            {log.action_type === 'delete_user' && '🗑️ Delete User'}
                            {log.action_type === 'remove_admin' && '⬇️ Remove Admin'}
                            {log.action_type === 'promote_admin' && '⬆️ Promote Admin'}
                            {log.action_type === 'create_post' && '📝 Create Post'}
                            {log.action_type === 'update_post' && '✏️ Update Post'}
                            {log.action_type === 'delete_post' && '📝 Delete Post'}
                            {log.action_type === 'add_category' && '➕ Add Category'}
                            {log.action_type === 'delete_category' && '🗑️ Delete Category'}
                            {log.action_type === 'add_rule' && '📋 Add Rule'}
                            {log.action_type === 'delete_rule' && '🗑️ Delete Rule'}
                            {!['page_visibility', 'background_update', 'ban_user', 'unban_user', 'delete_user', 'remove_admin', 'promote_admin', 'create_post', 'update_post', 'delete_post', 'add_category', 'delete_category', 'add_rule', 'delete_rule'].includes(log.action_type) && '📋 Action'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Liste des tickets */}
            <div className="lg:col-span-1">
              <div className="glass p-8 rounded-[3rem] border border-white/5">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-luxury-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-luxury-gold">
                    <Ticket size={32} />
                  </div>
                  <h3 className="text-xl font-cinzel font-bold uppercase tracking-widest">🎫 Tickets</h3>
                </div>

                {/* Filtre par status */}
                <div className="mb-6 flex gap-2 flex-wrap items-center">
                  {['OUVERT', 'EN_COURS', 'RÉSOLU', 'FERMÉ'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setTicketStatusFilter(status)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${ticketStatusFilter === status
                        ? 'bg-luxury-gold text-black'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                    >
                      {status}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      if (window.confirm('Êtes-vous sûr de vouloir SUPPRIMER TOUS les tickets ?')) {
                        tickets.forEach(ticket => deleteTicket(ticket.id));
                      }
                    }}
                    className="ml-auto px-3 py-1 rounded-lg text-xs font-bold uppercase bg-red-700/30 text-red-600 hover:bg-red-700/50 transition-all"
                    title="Supprimer tous les tickets"
                  >
                    🗑️ Tous
                  </button>
                </div>

                {/* Liste des tickets */}
                {ticketsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-3 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : tickets.filter(t => t.status === ticketStatusFilter).length === 0 ? (
                  <p className="text-gray-500 text-center py-8 text-sm">
                    Aucun ticket {ticketStatusFilter.toLowerCase()}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {tickets
                      .filter(t => t.status === ticketStatusFilter)
                      .map((ticket) => (
                        <button
                          key={ticket.id}
                          onClick={() => {
                            setSelectedTicket(ticket);
                            fetchTicketMessages(ticket.id);
                          }}
                          className={`w-full text-left p-4 rounded-lg transition-all border ${selectedTicket?.id === ticket.id
                            ? 'bg-luxury-gold/20 border-luxury-gold'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                        >
                          <p className="text-sm font-bold text-white truncate">
                            {ticket.display_name || ticket.username || 'Anonyme'}
                          </p>
                          <p className="text-xs text-gray-400 truncate mt-1">
                            {ticket.description?.substring(0, 50)}...
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${ticket.status === 'OUVERT' ? 'bg-yellow-500/20 text-yellow-400' :
                              ticket.status === 'EN_COURS' ? 'bg-blue-500/20 text-blue-400' :
                                ticket.status === 'RÉSOLU' ? 'bg-green-500/20 text-green-400' :
                                  'bg-red-500/20 text-red-400'
                              }`}>
                              {ticket.status}
                            </span>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Détail du ticket */}
            <div className="lg:col-span-2">
              {selectedTicket ? (
                <div className="glass p-10 rounded-[3rem] border border-white/5 flex flex-col h-full">
                  <div className="mb-8">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h4 className="text-2xl font-bold text-white mb-2">
                          {selectedTicket.display_name || selectedTicket.username || 'Anonyme'}
                        </h4>
                        <p className="text-gray-400 text-sm">
                          ID: {selectedTicket.id.substring(0, 8)}...
                        </p>
                      </div>
                      <span className={`px-4 py-2 rounded-lg text-sm font-bold ${selectedTicket.status === 'OUVERT' ? 'bg-yellow-500/20 text-yellow-400' :
                        selectedTicket.status === 'EN_COURS' ? 'bg-blue-500/20 text-blue-400' :
                          selectedTicket.status === 'RÉSOLU' ? 'bg-green-500/20 text-green-400' :
                            'bg-red-500/20 text-red-400'
                        }`}>
                        {selectedTicket.status}
                      </span>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-3 text-sm text-gray-400">
                      <p>
                        📅 <strong className="text-gray-300">Créé:</strong> {new Date(selectedTicket.created_at).toLocaleString('fr-FR')}
                      </p>
                      {selectedTicket.resolved_at && (
                        <p>
                          ✅ <strong className="text-gray-300">Résolu:</strong> {new Date(selectedTicket.resolved_at).toLocaleString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Message */}
                  <div className="mb-8">
                    <h5 className="text-luxury-gold font-bold mb-4 uppercase text-sm">Message Initiel</h5>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 min-h-[100px]">
                      <p className="text-white whitespace-pre-wrap">
                        {selectedTicket.description}
                      </p>
                    </div>
                  </div>

                  {/* Historique des messages */}
                  <div className="mb-8 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="text-luxury-gold font-bold uppercase text-sm">💬 Conversation</h5>
                      <button
                        onClick={() => fetchTicketMessages(selectedTicket.id)}
                        className="text-xs text-gray-400 hover:text-gray-300 transition-all"
                      >
                        🔄 Actualiser
                      </button>
                    </div>

                    {ticketMessagesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : ticketMessages.length === 0 ? (
                      <p className="text-gray-500 text-sm py-8 text-center">
                        Aucun message dans cette conversation
                      </p>
                    ) : (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4 overflow-y-auto flex-1 space-y-3 mb-4">
                        {ticketMessages.map((msg) => (
                          <div key={msg.id} className={`p-4 rounded-lg ${msg.is_admin ? 'bg-luxury-gold/10 border border-luxury-gold/30' : 'bg-white/5 border border-white/10'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className={`font-bold text-sm ${msg.is_admin ? 'text-luxury-gold' : 'text-white'}`}>
                                {msg.is_admin ? '👨‍💼 ' : '👤 '}{msg.username}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(msg.created_at).toLocaleString('fr-FR')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-300 whitespace-pre-wrap">
                              {msg.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section Admin Reply */}
                  <div className="mb-8 border-t border-white/10 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="text-luxury-gold font-bold uppercase text-sm">📝 Répondre</h5>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedTicket.allow_user_replies !== false}
                          onChange={() => toggleUserReplies(selectedTicket.id, selectedTicket.allow_user_replies !== false)}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <span className="text-gray-400">Permettre les réponses utilisateur</span>
                      </label>
                    </div>

                    <div className="space-y-3">
                      <textarea
                        value={adminReply}
                        onChange={(e) => setAdminReply(e.target.value)}
                        placeholder="Écrivez votre réponse..."
                        className="w-full h-24 p-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-luxury-gold/50 focus:bg-white/10 transition-all resize-none"
                      />
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          onClick={() => sendAdminReply(selectedTicket.id)}
                          disabled={adminReplying || !adminReply.trim()}
                          className="py-3 px-4 bg-luxury-gold/20 hover:bg-luxury-gold/30 disabled:opacity-50 border border-luxury-gold/50 rounded-lg text-luxury-gold font-bold uppercase transition-all"
                        >
                          {adminReplying ? '⏳' : '✉️'}
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Êtes-vous sûr de vouloir supprimer ce ticket ?')) {
                              deleteTicket(selectedTicket.id);
                            }
                          }}
                          className="py-3 px-4 bg-red-700/20 hover:bg-red-700/30 text-red-700 font-bold rounded-lg transition-all"
                        >
                          🗑️
                        </button>
                        <button
                          onClick={() => setSelectedTicket(null)}
                          className="py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white font-bold transition-all"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass p-10 rounded-[3rem] border border-white/5 flex items-center justify-center min-h-[500px]">
                  <p className="text-gray-500 text-center">
                    👈 Sélectionne un ticket pour voir les détails
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'music' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <h2 className="text-3xl font-bold text-luxury-gold">🎵 Gestion de la Musique</h2>

            {/* Music Settings Form */}
            <div className="glass p-8 rounded-3xl border border-white/10 space-y-6">
              <h3 className="text-xl font-semibold text-luxury-gold uppercase tracking-widest">📤 Upload de Musique</h3>

              {/* Music File Upload */}
              <div>
                <label className="block text-sm text-gray-300 mb-4 font-bold">Sélectionner un fichier audio</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="audio/mp3,audio/wav,audio/ogg,audio/flac,.mp3,.wav,.ogg,.flac"
                    onChange={(e) => setMusicFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="music-file-input"
                  />
                  <label
                    htmlFor="music-file-input"
                    className="block w-full bg-gradient-to-br from-purple-600/40 to-indigo-600/40 hover:from-purple-600/60 hover:to-indigo-600/60 border-2 border-dashed border-purple-400/50 hover:border-purple-400 rounded-2xl px-6 py-8 text-center cursor-pointer transition-all duration-300 group"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="text-4xl group-hover:scale-110 transition-transform duration-300">🎵</div>
                      <div>
                        <p className="text-white font-bold text-lg">Choisir un fichier</p>
                        <p className="text-purple-300 text-sm mt-1">ou glisser-déposer</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">MP3 • WAV • OGG • FLAC</p>
                    </div>
                  </label>
                </div>
                {musicFile && (
                  <div className="mt-4 p-3 bg-purple-500/20 border border-purple-400/50 rounded-lg">
                    <p className="text-sm text-purple-300">✅ <span className="font-bold">{musicFile.name}</span></p>
                    <p className="text-xs text-gray-400 mt-1">📊 {(musicFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                )}
              </div>

              {/* Music Name Input */}
              <div>
                <label className="block text-sm text-gray-300 mb-3 font-bold">Nom de la Musique</label>
                <input
                  type="text"
                  value={musicName}
                  onChange={(e) => setMusicName(e.target.value)}
                  placeholder="Ex: Atlantic RP - Ambiance"
                  className="w-full bg-gradient-to-r from-white/5 to-white/10 border border-purple-400/30 hover:border-purple-400/50 focus:border-purple-400 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:bg-white/15 focus:ring-2 focus:ring-purple-500/30 transition-all"
                />
              </div>

              {/* Upload Button */}
              <motion.button
                onClick={uploadMusicFile}
                disabled={musicUploading || !musicFile || !musicName.trim()}
                className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 hover:from-emerald-500 hover:via-emerald-400 hover:to-green-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all uppercase tracking-widest shadow-lg hover:shadow-emerald-500/50 border border-emerald-400/30 text-lg"
              >
                {musicUploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin">⏳</div>
                    <span>{uploadProgress}% - {uploadTimeRemaining}</span>
                  </div>
                ) : (
                  '📤 Uploader la Musique'
                )}
              </motion.button>

              {/* Upload Progress Bar */}
              {musicUploading && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300 font-semibold">Progression</span>
                      <span className="text-sm font-bold text-emerald-400">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden border border-emerald-400/30">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ duration: 0.3 }}
                        className="h-full bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-400 rounded-full shadow-lg shadow-emerald-500/50"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs bg-black/20 rounded-lg p-3">
                    <span className="text-gray-300">
                      ⏱️ Temps restant: <span className="text-emerald-400 font-bold">{uploadTimeRemaining || 'Calcul...'}</span>
                    </span>
                    {musicFile && (
                      <span className="text-gray-300">
                        📊 <span className="text-emerald-400 font-bold">{(musicFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-lg">
                <p className="text-sm text-emerald-300">
                  ✅ <span className="font-bold">Recommandé:</span> Uploadez votre musique directement pour éviter les problèmes CORS!
                </p>
              </div>
            </div>

            {/* Music Controls */}
            <div className="glass p-8 rounded-3xl border border-white/10">
              <h3 className="text-xl font-semibold text-luxury-gold uppercase tracking-widest mb-6">🎛️ Contrôles</h3>

              <div className="space-y-6">
                {/* Play/Pause Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleMusicPlayback()}
                  disabled={musicSubmitting}
                  className="w-full bg-gradient-to-r from-blue-600/80 to-blue-500/60 hover:from-blue-600 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-lg"
                >
                  {isPlayingMusic ? (
                    <>
                      <Pause size={24} />
                      Mettre en Pause
                    </>
                  ) : (
                    <>
                      <Play size={24} />
                      Lancer la Musique
                    </>
                  )}
                </motion.button>

                {/* Volume Control */}
                <div className="space-y-3 p-4 bg-white/5 rounded-lg border border-white/10">
                  <label className="block text-sm text-gray-300 font-bold">Contrôle du Volume</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={musicVolume}
                    onChange={(e) => updateMusicVolume(parseInt(e.target.value))}
                    className="w-full h-3 bg-white/10 rounded-lg appearance-none cursor-pointer accent-luxury-gold"
                  />
                  <div className="flex justify-between text-xs text-gray-400 font-bold">
                    <span>🔇 Muet</span>
                    <span className="text-luxury-gold">{musicVolume}%</span>
                    <span>🔊 Max</span>
                  </div>
                </div>

                {/* Info Message */}
                <div className="p-4 bg-luxury-gold/10 border border-luxury-gold/30 rounded-lg">
                  <p className="text-sm text-gray-300">
                    💡 <span className="text-luxury-gold font-bold">Info:</span> Les visiteurs verront et entendront la musique, mais seuls les admins peuvent la contrôler.
                  </p>
                </div>
              </div>
            </div>

            {/* Music History */}
            <div className="glass p-8 rounded-3xl border border-white/10">
              <h3 className="text-xl font-semibold text-luxury-gold uppercase tracking-widest mb-6">📜 Historique Musiques</h3>

              {musicHistory.length === 0 ? (
                <p className="text-gray-400 text-center py-6">Aucune musique jouée pour le moment</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {musicHistory.map((entry, idx) => (
                    <div key={idx} className="p-4 bg-white/5 border border-white/10 rounded-lg hover:border-luxury-gold/30 transition-all">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-luxury-gold text-lg">
                              {entry.action_type === 'music_upload' ? '📤' : '▶️'}
                            </span>
                            <p className="text-white font-bold text-sm">
                              {entry.details?.musicName || entry.action_description}
                            </p>
                          </div>
                          {entry.details?.musicUrl && (
                            <p className="text-xs text-gray-400 truncate">
                              📁 {entry.details.musicUrl.split('/').pop()}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            🕐 {new Date(entry.created_at).toLocaleString('fr-FR')}
                          </p>
                        </div>
                      </div>

                      {entry.details?.musicUrl && (
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(entry.details.musicUrl);
                              console.log(`✅ URL copiée`);
                            }}
                            className="px-2 py-1 rounded bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/40 transition-all text-xs font-bold uppercase tracking-widest"
                            title="Copier l'URL"
                          >
                            📋 Copier URL
                          </button>
                          <button
                            onClick={async () => {
                              setMusicUrl(entry.details.musicUrl);
                              setMusicName(entry.details.musicName || 'Musique');
                              await updateMusicUrl(entry.details.musicUrl, entry.details.musicName || 'Musique');
                              console.log(`▶️ Lancement: ${entry.details.musicName}`);
                            }}
                            className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 transition-all text-xs font-bold uppercase tracking-widest"
                            title="Lancer cette musique"
                          >
                            ▶️ Lancer
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
        {activeTab === 'chat' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <h2 className="text-3xl font-bold text-luxury-gold">💬 Gestion du Chat</h2>

            <div className="glass p-10 rounded-[3rem] border border-white/10">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-3">Chat Général</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Contrôlez l'accès au canal de discussion général. Si verrouillé, seuls les administrateurs pourront envoyer des messages.
                  </p>
                </div>

                <div className="flex items-center gap-6 p-6 glass rounded-2xl border border-white/5">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${isChatLocked ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Status</span>
                  </div>

                  <button
                    onClick={toggleChatLock}
                    disabled={chatSubmitting}
                    className={`
                      px-8 py-4 rounded-xl font-black uppercase tracking-[0.2em] transition-all duration-500
                      ${isChatLocked
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'}
                    `}
                  >
                    {chatSubmitting ? '...' : (isChatLocked ? 'Déverrouiller' : 'Verrouiller')}
                  </button>
                </div>
              </div>

              <div className="mt-12 p-6 bg-white/5 rounded-2xl border border-white/5">
                <h4 className="text-sm font-bold text-luxury-gold uppercase tracking-widest mb-4">Fonctionnalités à venir</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 glass rounded-xl opacity-50 grayscale">
                    <p className="text-xs font-bold text-white mb-1">Effacement Auto</p>
                    <p className="text-[10px] text-gray-400">Nettoyage automatique des messages (24h)</p>
                  </div>
                  <div className="p-4 glass rounded-xl opacity-50 grayscale">
                    <p className="text-xs font-bold text-white mb-1">Mots Interdits</p>
                    <p className="text-[10px] text-gray-400">Filtrage des insultes et liens</p>
                  </div>
                  <div className="p-4 glass rounded-xl opacity-50 grayscale">
                    <p className="text-xs font-bold text-white mb-1">Slow Mode</p>
                    <p className="text-[10px] text-gray-400">Délai entre chaque message</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass p-10 rounded-[3rem] border border-white/10 mt-8">
              <h3 className="text-2xl font-bold text-luxury-gold mb-8 uppercase tracking-widest">📁 Créer un Groupe</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Nom du Groupe</label>
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Ex: Staff Atlantic"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white focus:border-luxury-gold/50 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Description</label>
                    <textarea
                      value={newGroupDesc}
                      onChange={(e) => setNewGroupDesc(e.target.value)}
                      placeholder="Objectif du groupe..."
                      className="w-full h-32 bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white focus:border-luxury-gold/50 transition-all outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Participants (IDs séparés par des virgules)</label>
                    <textarea
                      value={groupParticipants}
                      onChange={(e) => setGroupParticipants(e.target.value)}
                      placeholder="00000000-0000-0000-0000-000000000000, ..."
                      className="w-full h-32 bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white font-mono text-xs focus:border-luxury-gold/50 transition-all outline-none resize-none"
                    />
                    <p className="text-[10px] text-gray-500 mt-2">
                      Astuce: Vous pouvez trouver l'ID d'un utilisateur dans l'onglet "Utilisateurs".
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-5 glass rounded-2xl border border-white/5">
                    <div>
                      <p className="text-sm font-bold text-white mb-1">Visibilité Publique</p>
                      <p className="text-[10px] text-gray-400">Si activé, tout le monde pourra voir et rejoindre ce groupe.</p>
                    </div>
                    <button
                      onClick={() => setIsGroupPublic(!isGroupPublic)}
                      className={`w-14 h-7 rounded-full relative transition-all duration-300 ${isGroupPublic ? 'bg-luxury-gold' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-300 ${isGroupPublic ? 'left-8' : 'left-1'}`} />
                    </button>
                  </div>

                  <button
                    onClick={createGroup}
                    disabled={chatSubmitting || !newGroupName.trim()}
                    className="w-full py-5 bg-luxury-gold hover:bg-luxury-goldLight disabled:opacity-50 text-black font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg shadow-luxury-gold/20"
                  >
                    {chatSubmitting ? 'Création...' : 'Créer le Groupe'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default Admin;


