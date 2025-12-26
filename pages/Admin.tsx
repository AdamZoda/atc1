import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { Profile, Post, RuleCategory, Rule } from '../types';
import { Users, FilePlus, ShieldCheck, Trash2, Upload, Send, LayoutDashboard, Settings, Video, Image as ImageIcon, BookOpen, History, Activity, Ticket, Music, Play, Pause, Copy, Check } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import LocationDisplay from '../components/LocationDisplay';

// Fonction silencieuse pour afficher une notification sans alerte
const showToast = (message: string) => {
  console.log('ℹ️', message);
};

// Composant pour copier le Discord ID au format <@id>
const CopyProviderIdButton: React.FC<{ providerId: string }> = ({ providerId }) => {
  const handleCopy = async () => {
    try {
      const formattedId = `<@${providerId}>`;
      await navigator.clipboard.writeText(formattedId);
      console.log(`✅ Discord ID copié: ${formattedId}`);
    } catch (err) {
      console.error('❌ Erreur lors de la copie:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-2 rounded-lg hover:bg-indigo-500/30 transition-all duration-200 text-indigo-400 hover:text-indigo-300"
      title={`Copier: <@${providerId}>`}
    >
      <Copy size={20} />
    </button>
  );
};

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'posts' | 'config' | 'rules' | 'logs' | 'tickets' | 'music'>('users');
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
      // Récupérer les profils avec TOUS les champs incluant provider_id
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*');
      
      if (error) {
        console.error('Erreur chargement profils:', error);
        setLoading(false);
        return;
      }

      if (profiles) {
        // Debug: afficher les données récupérées
        console.log('📥 Profils chargés:', profiles);
        profiles.forEach((p: any) => {
          console.log(`  👤 ${p.username}: provider_id = ${p.provider_id || 'NULL'}`);
        });
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
      
      // Log l'action
      const pageNames: { [key: string]: string } = {
        'page-home': 'Accueil',
        'page-features': 'Fonctionnalités',
        'page-rules': 'Règles',
        'page-community': 'Communauté',
        'page-game': 'Jeu',
        'page-shop': 'Shop',
        'page-gallery': 'Galerie'
      };
      const pageName = pageNames[pageId] || pageId;
      const action = isVisible ? '👁️ a rendu visible' : '🚫 a caché';
      await logAdminAction('page_visibility', `${action} la page ${pageName}`, 'page', pageName, { isVisible });
    } catch (error) {
      console.error('❌ ERREUR COMPLÈTE:', error);
      console.log('Erreur lors de la mise à jour: ' + (error as any).message);
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
      alert(`Erreur: ${err.message}`);
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
      alert(`Erreur: ${error.message}`);
    }
  };

  // Retirer le rôle admin
  const removeAdmin = async (userId: string, username: string) => {
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

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !mediaUrl) return console.log('Remplissez tous les champs (URL requise)');
    
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([{
          title,
          content,
          media_type: mediaType,
          media_url: mediaUrl
        }])
        .select();

      if (error) throw error;

      console.log('Post publié avec succès !');
      // Log l'action
      await logAdminAction('create_post', `📝 Création d'un nouveau post "${title}"`, 'post', title);
      setTitle('');
      setContent('');
      setMediaUrl('');
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
    if (!title || !content || !mediaUrl) return console.log('Remplissez tous les champs');
    
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
        order: rules.filter(r => r.category_id === selectedCategoryId).length + 1,
      });

    if (!error) {
      // Log l'action
      const category = categories.find(c => c.id === selectedCategoryId);
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
      setTickets(data || []);
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
              onClick={() => setActiveTab('config')}
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
          </div>
        </header>

        {activeTab === 'users' && (
          <div>
            {/* Filtres et Recherche */}
            <div className="glass rounded-3xl overflow-hidden border border-white/5 mb-6 p-6">
              <div className="space-y-6">
                {/* Search Bar */}
                <div>
                  <input
                    type="text"
                    placeholder="🔍 Chercher un utilisateur..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-black/50 border border-white/10 focus:border-luxury-gold text-white placeholder-gray-500 outline-none transition-all text-sm"
                  />
                </div>

                {/* Toggle Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Role Filter - Toggle */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold uppercase tracking-widest text-gray-300">👑 Admin Seulement</label>
                    <motion.button
                      onClick={() => setRoleFilter(roleFilter === 'admin' ? 'all' : 'admin')}
                      className="relative w-16 h-8 rounded-full transition-colors"
                      style={{
                        backgroundColor: roleFilter === 'admin' ? '#10b981' : '#6b7280'
                      }}
                    >
                      <motion.div
                        className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg"
                        animate={{
                          x: roleFilter === 'admin' ? 32 : 0
                        }}
                        transition={{
                          type: 'spring',
                          stiffness: 500,
                          damping: 40
                        }}
                      />
                    </motion.button>
                  </div>

                  {/* Status Filter - Toggle */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold uppercase tracking-widest text-gray-300">🚫 Afficher Bannis</label>
                    <motion.button
                      onClick={() => setStatusFilter(statusFilter === 'banned' ? 'all' : 'banned')}
                      className="relative w-16 h-8 rounded-full transition-colors"
                      style={{
                        backgroundColor: statusFilter === 'banned' ? '#ef4444' : '#6b7280'
                      }}
                    >
                      <motion.div
                        className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg"
                        animate={{
                          x: statusFilter === 'banned' ? 32 : 0
                        }}
                        transition={{
                          type: 'spring',
                          stiffness: 500,
                          damping: 40
                        }}
                      />
                    </motion.button>
                  </div>

                  {/* Location Filter - Toggle */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold uppercase tracking-widest text-gray-300">📍 Avec Localisation</label>
                    <motion.button
                      onClick={() => setLocationFilter(locationFilter === 'with' ? 'all' : 'with')}
                      className="relative w-16 h-8 rounded-full transition-colors"
                      style={{
                        backgroundColor: locationFilter === 'with' ? '#06b6d4' : '#6b7280'
                      }}
                    >
                      <motion.div
                        className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg"
                        animate={{
                          x: locationFilter === 'with' ? 32 : 0
                        }}
                        transition={{
                          type: 'spring',
                          stiffness: 500,
                          damping: 40
                        }}
                      />
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tableau */}
            <div className="glass rounded-3xl overflow-hidden border border-white/5">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-4 text-sm font-bold uppercase tracking-widest text-gray-400 w-1/4">Utilisateur</th>
                  <th className="px-6 py-4 text-sm font-bold uppercase tracking-widest text-gray-400 w-1/6 text-center">Rôle</th>
                  <th className="px-6 py-4 text-sm font-bold uppercase tracking-widest text-gray-400 w-1/6 text-center">Statut</th>
                  <th className="px-6 py-4 text-sm font-bold uppercase tracking-widest text-gray-400 w-1/5 text-center">Localisation</th>
                  <th className="px-6 py-4 text-sm font-bold uppercase tracking-widest text-gray-400 w-1/6 text-center">Créé le</th>
                  <th className="px-6 py-4 text-sm font-bold uppercase tracking-widest text-gray-400 w-1/6 text-center">Discord ID</th>
                  <th className="px-6 py-4 text-sm font-bold uppercase tracking-widest text-gray-400 w-1/5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users
                  .filter((user) => {
                    // Filtre recherche
                    const searchMatch = (user.display_name || user.username || user.email || '')
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase());

                    // Filtre rôle
                    const roleMatch =
                      roleFilter === 'all' || user.role === roleFilter;

                    // Filtre statut
                    const statusMatch =
                      statusFilter === 'all' ||
                      (statusFilter === 'active' && !user.banned) ||
                      (statusFilter === 'banned' && user.banned);

                    // Filtre localisation
                    const hasLocation = user.latitude && user.longitude;
                    const locationMatch =
                      locationFilter === 'all' ||
                      (locationFilter === 'with' && hasLocation) ||
                      (locationFilter === 'without' && !hasLocation);

                    return searchMatch && roleMatch && statusMatch && locationMatch;
                  })
                  .map((user) => (
                  <tr key={user.id} className={`hover:bg-white/5 transition-colors ${user.banned ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
                            alt={user.display_name || user.username}
                            className="w-10 h-10 rounded-full object-cover border border-white/10 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-luxury-gold/20 flex items-center justify-center text-luxury-gold font-bold flex-shrink-0">
                            {(user.display_name || user.username).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-bold text-white truncate">{user.display_name || user.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block ${user.role === 'admin' ? 'bg-luxury-gold/20 text-luxury-gold' : 'bg-white/10 text-gray-400'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user.banned ? (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-500/20 text-red-400 inline-block">
                          🚫 Banni
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-green-500/20 text-green-400 inline-block">
                          ✓ Actif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <LocationDisplay 
                        latitude={user.latitude}
                        longitude={user.longitude}
                        linkClassName="text-luxury-gold hover:text-luxury-goldLight text-xs font-bold uppercase tracking-widest underline"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs text-gray-400 block">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', { 
                          year: 'numeric', 
                          month: 'numeric', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user.provider_id ? (
                        <CopyProviderIdButton providerId={user.provider_id} />
                      ) : (
                        <span className="px-3 py-2 rounded-lg bg-gray-500/10 text-gray-500 text-xs font-bold uppercase tracking-widest inline-block cursor-not-allowed">
                          ❌ Pas Discord
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-center flex-wrap">
                        {/* Toggle Edit Profile Permission */}
                        <button
                          onClick={() => toggleEditProfilePermission(user.id, user.username, user.can_edit_profile)}
                          className={`px-3 py-2 rounded-lg transition-all text-xs font-bold uppercase tracking-widest ${
                            user.can_edit_profile 
                              ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/40' 
                              : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/40'
                          }`}
                          title={user.can_edit_profile ? 'Bloquer modifications' : 'Autoriser modifications'}
                        >
                          {user.can_edit_profile ? '🔓 Édition' : '🔒 Bloqué'}
                        </button>

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
                  'page-home': '🏠 Accueil',
                  'page-features': '✨ Fonctionnalités',
                  'page-rules': '📋 Règles',
                  'page-community': '👥 Communauté',
                  'page-game': '🎮 Jeu',
                  'page-shop': '🛍️ Shop',
                  'page-gallery': '🎨 Galerie',
                  'About': 'ℹ️ À propos',
                }).map(([pageId, label]) => (
                  <div
                    key={pageId}
                    className="p-5 rounded-xl border border-white/10 bg-black/30 hover:bg-black/50 transition-all flex items-center justify-between"
                  >
                    <span className="font-bold uppercase tracking-widest text-sm">{label}</span>
                    
                    {/* Toggle Switch */}
                    <motion.button
                      onClick={() => updatePageVisibility(pageId, !pageVisibilities[pageId])}
                      disabled={pageVisibilityLoading}
                      className="relative w-14 h-8 rounded-full transition-colors"
                      style={{
                        backgroundColor: pageVisibilities[pageId] ? '#10b981' : '#6b7280'
                      }}
                    >
                      <motion.div
                        className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg"
                        animate={{
                          x: pageVisibilities[pageId] ? 24 : 0
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
                {/* Server Info */}
                <div className="p-5 rounded-lg bg-black/50 border border-white/10">
                  <h4 className="font-bold uppercase tracking-widest text-xs mb-3">Informations du Serveur</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Uptime du Serveur</label>
                      <input type="text" placeholder="Ex: 99.9%" className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 focus:border-luxury-gold text-white outline-none text-xs" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Latence</label>
                      <input type="text" placeholder="Ex: ⚡ Faible Latence" className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 focus:border-luxury-gold text-white outline-none text-xs" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Taille Communauté</label>
                      <input type="text" placeholder="Ex: 5000+ Joueurs" className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 focus:border-luxury-gold text-white outline-none text-xs" />
                    </div>
                  </div>
                </div>

                {/* Discord Link */}
                <div className="p-5 rounded-lg bg-black/50 border border-white/10">
                  <h4 className="font-bold uppercase tracking-widest text-xs mb-3">Lien Discord</h4>
                  <input type="url" placeholder="https://discord.gg/..." className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 focus:border-luxury-gold text-white outline-none text-xs" />
                </div>

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
                          <option value="">-- Sélectionner --</option>
                          <option value="1">1 - Haut (Owner)</option>
                          <option value="2">2 - Admins</option>
                          <option value="3">3 - Modérateurs</option>
                          <option value="4">4 - Support</option>
                          <option value="5">5</option>
                          <option value="6">6 - Bas</option>
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
                      alert('✅ Tous les profils sont bloqués');
                      await logAdminAction('bulk_block_profiles', '🔒 Tous les profils ont été bloqués', 'config', 'bulk');
                      fetchUsers();
                    } else {
                      alert('❌ Erreur: ' + error.message);
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
                      alert('✅ Tous les profils sont débloqués');
                      await logAdminAction('bulk_unlock_profiles', '🔓 Tous les profils ont été débloqués', 'config', 'bulk');
                      fetchUsers();
                    } else {
                      alert('❌ Erreur: ' + error.message);
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
                      className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                        ticketStatusFilter === status
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
                          className={`w-full text-left p-4 rounded-lg transition-all border ${
                            selectedTicket?.id === ticket.id
                              ? 'bg-luxury-gold/20 border-luxury-gold'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <p className="text-sm font-bold text-white truncate">
                            {ticket.username || 'Anonyme'}
                          </p>
                          <p className="text-xs text-gray-400 truncate mt-1">
                            {ticket.description?.substring(0, 50)}...
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              ticket.status === 'OUVERT' ? 'bg-yellow-500/20 text-yellow-400' :
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
                          {selectedTicket.username || 'Anonyme'}
                        </h4>
                        <p className="text-gray-400 text-sm">
                          ID: {selectedTicket.id.substring(0, 8)}...
                        </p>
                      </div>
                      <span className={`px-4 py-2 rounded-lg text-sm font-bold ${
                        selectedTicket.status === 'OUVERT' ? 'bg-yellow-500/20 text-yellow-400' :
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
      </div>
    </motion.div>
  );
};

export default Admin;