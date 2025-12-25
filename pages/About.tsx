import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Server, Users, MessageSquare, Mail, Ticket, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { siteConfig } from '../site-config';
import { supabase } from '../supabaseClient';

const About: React.FC = () => {
  const { t } = useLanguage();
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [adminTeam, setAdminTeam] = useState<any[]>([]);
  const [adminTeamLoading, setAdminTeamLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [commentMessage, setCommentMessage] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [userTickets, setUserTickets] = useState<any[]>([]);
  const [userTicketsLoading, setUserTicketsLoading] = useState(false);
  const [selectedUserTicket, setSelectedUserTicket] = useState<any>(null);
  const [ticketMessagesUser, setTicketMessagesUser] = useState<any[]>([]);
  const [ticketMessagesUserLoading, setTicketMessagesUserLoading] = useState(false);
  const [userTicketReply, setUserTicketReply] = useState('');
  const [userTicketReplying, setUserTicketReplying] = useState(false);

  // Charger les commentaires approuvés et vérifier session
  useEffect(() => {
    // Vérifier la session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session) {
        // Récupérer le profil de l'utilisateur
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setUserProfile(profile);
        }
      }
    };

    getSession();
    fetchComments();
    fetchAdminTeam();

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setUserProfile(profile);
        }

        // Charger les tickets de l'utilisateur
        fetchUserTickets(session.user.id);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const fetchComments = async () => {
    setCommentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('about_comments')
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ Erreur chargement commentaires:', error);
      } else {
        setComments(data || []);
        console.log('✅ Commentaires chargés:', data?.length);
      }
    } catch (err: any) {
      console.error('❌ Erreur:', err.message);
    } finally {
      setCommentsLoading(false);
    }
  };

  const fetchAdminTeam = async () => {
    setAdminTeamLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_team')
        .select('*')
        .order('priority', { ascending: true });

      if (error) {
        console.error('❌ Erreur chargement équipe admin:', error);
      } else {
        setAdminTeam(data || []);
        console.log('✅ Équipe admin chargée:', data?.length);
      }
    } catch (err: any) {
      console.error('❌ Erreur:', err.message);
    } finally {
      setAdminTeamLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      console.log('Vous devez être connecté pour commenter');
      return;
    }
    
    if (!commentMessage.trim()) {
      console.log('Veuillez écrire un message');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('about_comments')
        .insert([{
          username: userProfile?.username || 'Anonyme',
          message: commentMessage,
          approved: true // Approbation automatique pour maintenant
        }])
        .select();

      if (error) {
        console.error('❌ Erreur envoi commentaire:', error);
        console.log(`Erreur: ${error.message}`);
      } else {
        console.log('✅ Commentaire publié instantanément');
        
        // Ajouter le commentaire en direct au state (live update)
        if (data && data[0]) {
          setComments([data[0], ...comments]);
        }
        
        console.log('✅ Commentaire publié!');
        setCommentMessage('');
      }
    } catch (err: any) {
      console.error('❌ Erreur:', err.message);
      console.log(`Erreur: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      console.log('Vous devez être connecté pour ouvrir un ticket');
      return;
    }

    if (!ticketDescription.trim()) {
      console.log('Veuillez décrire votre problème');
      return;
    }

    setTicketSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .insert([{
          user_id: session.user.id,
          username: userProfile?.username || 'Anonyme',
          title: 'Nouveau Ticket',
          description: ticketDescription,
          status: 'OUVERT',
          priority: 'NORMAL'
        }])
        .select();

      if (error) {
        console.error('❌ Erreur création ticket:', error);
        console.log(`Erreur: ${error.message}`);
      } else {
        console.log('✅ Ticket créé');
        console.log('✅ Ticket créé avec succès!');
        setTicketDescription('');
        setShowTicketForm(false);
      }
    } catch (err: any) {
      console.error('❌ Erreur:', err.message);
      console.log(`Erreur: ${err.message}`);
    } finally {
      setTicketSubmitting(false);
    }
  };

  const fetchUserTickets = async (userId: string) => {
    try {
      setUserTicketsLoading(true);
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserTickets(data || []);
    } catch (error: any) {
      console.error('❌ Erreur chargement tickets:', error);
    } finally {
      setUserTicketsLoading(false);
    }
  };

  const fetchTicketMessagesUser = async (ticketId: string) => {
    try {
      setTicketMessagesUserLoading(true);
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTicketMessagesUser(data || []);
    } catch (error: any) {
      console.error('❌ Erreur chargement messages:', error);
    } finally {
      setTicketMessagesUserLoading(false);
    }
  };

  const sendUserTicketReply = async (ticketId: string) => {
    if (!userTicketReply.trim() || !session) return;

    setUserTicketReplying(true);
    try {
      // Vérifier d'abord si les réponses sont autorisées
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('allow_user_replies')
        .eq('id', ticketId)
        .single();

      if (ticketError || !ticket?.allow_user_replies) {
        console.log('❌ L\'admin a désactivé les réponses sur ce ticket');
        setUserTicketReplying(false);
        return;
      }

      const { data, error } = await supabase
        .from('ticket_messages')
        .insert([{
          ticket_id: ticketId,
          user_id: session.user.id,
          username: userProfile?.username || 'Utilisateur',
          message: userTicketReply,
          is_admin: false
        }])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        setTicketMessagesUser([...ticketMessagesUser, data[0]]);
      }

      setUserTicketReply('');
    } catch (error: any) {
      console.log(`Erreur: ${error.message}`);
    } finally {
      setUserTicketReplying(false);
    }
  };

  const faqs = [
    {
      question: 'Comment rejoindre le serveur ?',
      answer: 'Rendez-vous sur la page d\'accueil, cliquez sur "Rejoindre" et suivez les instructions pour installer FiveM et se connecter à notre serveur.'
    },
    {
      question: 'Le serveur est-il gratuit ?',
      answer: 'Oui, notre serveur est entièrement gratuit. Aucun paiement n\'est requis pour jouer.'
    },
    {
      question: 'Comment devenir modérateur ?',
      answer: 'Vous devez être actif sur le serveur, respecter les règles et montrer du leadership. Les modérateurs sont recrutés sur invitation.'
    },
    {
      question: 'J\'ai un problème technique, que faire ?',
      answer: 'Ouvrez un ticket via le bouton "Support Technique" ou rejoignez notre Discord pour obtenir une aide rapide.'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative min-h-screen pt-20"
    >
      {/* HEADER SECTION */}
      <div className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="w-16 h-16 bg-luxury-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-luxury-gold">
              <Server size={32} />
            </div>
            <h1 className="text-5xl sm:text-7xl font-cinzel font-bold uppercase tracking-widest mb-6">
              Atlantic RP
            </h1>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto">
              Bienvenue sur Atlantic RP, un serveur immersif où l'authenticit et la communauté sont au cœur de l'expérience. Rejoignez des milliers de joueurs qui créent des histoires inoubliables dans un univers riche et détaillé. Notre staff dédié veille à maintenir un environnement sain et équitable pour tous.
            </p>
          </motion.div>
        </div>
      </div>

      {/* SERVER STATS */}
      <div className="relative py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="glass p-8 rounded-[2rem] border border-white/5 text-center"
          >
            <div className="text-4xl font-bold text-luxury-gold mb-2">99.9%</div>
            <div className="text-gray-400 text-sm uppercase tracking-widest">Uptime Garanti</div>
            <p className="text-xs text-gray-500 mt-2">Performance 24/7</p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="glass p-8 rounded-[2rem] border border-white/5 text-center"
          >
            <div className="text-4xl font-bold text-luxury-gold mb-2">⚡</div>
            <div className="text-gray-400 text-sm uppercase tracking-widest">Faible Latence</div>
            <p className="text-xs text-gray-500 mt-2">Optimisation maximale</p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="glass p-8 rounded-[2rem] border border-white/5 text-center"
          >
            <div className="text-4xl font-bold text-luxury-gold mb-2">5000+</div>
            <div className="text-gray-400 text-sm uppercase tracking-widest">Communauté</div>
            <p className="text-xs text-gray-500 mt-2">Joueurs actifs</p>
          </motion.div>
        </div>
      </div>

      {/* ADMIN LIST */}
      <div className="relative py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <div className="text-center mb-10">
            <div className="w-14 h-14 bg-luxury-gold/10 rounded-xl flex items-center justify-center mx-auto mb-4 text-luxury-gold">
              <Users size={28} />
            </div>
            <h2 className="text-3xl font-cinzel font-bold uppercase tracking-widest mb-2">
               Administration
            </h2>
            <p className="text-gray-500 text-xs">L'équipe dévouée qui fait fonctionner le serveur</p>
          </div>

          {/* PYRAMID HIERARCHY - Dynamic from DB */}
          {adminTeamLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-3 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5">
              {/* Group by priority */}
              {[1, 2, 3, 4, 5, 6].map((priority) => {
                const adminsAtLevel = adminTeam.filter(a => a.priority === priority);
                if (adminsAtLevel.length === 0) return null;

                const levelColors = {
                  1: { border: 'border-purple-600', text: 'text-purple-300' },
                  2: { border: 'border-blue-600', text: 'text-blue-300' },
                  3: { border: 'border-amber-600', text: 'text-amber-300' },
                  4: { border: 'border-green-600', text: 'text-green-300' },
                  5: { border: 'border-rose-600', text: 'text-rose-300' },
                  6: { border: 'border-cyan-600', text: 'text-cyan-300' }
                };

                const maxWidth = {
                  1: 'max-w-[220px]',
                  2: 'max-w-[200px]',
                  3: 'max-w-[180px]',
                  4: 'max-w-[160px]',
                  5: 'max-w-[150px]',
                  6: 'max-w-[140px]'
                };

                return (
                  <div key={priority} className="w-full flex justify-center gap-3 flex-wrap">
                    {adminsAtLevel.map((admin, index) => (
                      <motion.div
                        key={admin.id}
                        initial={{ y: 20, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 * index }}
                        className={`group relative w-full ${maxWidth[priority as keyof typeof maxWidth]}`}
                      >
                        <div className={`relative p-3 rounded-xl border-2 ${levelColors[priority as keyof typeof levelColors].border} bg-black/60 backdrop-blur-sm group-hover:border-luxury-gold transition-all hover:scale-105`}>
                          <div className="aspect-square mb-2 rounded-lg overflow-hidden border border-white/10">
                            <img src={admin.avatar_url} alt={admin.username} className="w-full h-full object-cover" />
                          </div>
                          <div className="text-center">
                            <h3 className="text-xs font-bold uppercase tracking-widest mb-0.5">{admin.username}</h3>
                            <p className="text-xs text-luxury-gold uppercase tracking-widest font-semibold">{admin.role}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="relative py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* DISCORD BUTTON */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            onClick={() => window.open(siteConfig.links.discord, '_blank')}
            className="relative group p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 hover:border-indigo-500/50 transition-all cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-5 transition-opacity" />
            <div className="relative flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-400">
                <Mail size={24} />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold uppercase tracking-widest mb-1">Rejoindre Discord</h3>
                <p className="text-xs text-gray-400">Communauté & Support</p>
              </div>
            </div>
          </motion.div>

          {/* SUPPORT TICKET BUTTON */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            onClick={() => setShowTicketForm(!showTicketForm)}
            className="relative group p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-600/20 to-green-600/20 hover:border-emerald-500/50 transition-all cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-green-600 rounded-2xl opacity-0 group-hover:opacity-5 transition-opacity" />
            <div className="relative flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-emerald-600/20 rounded-xl flex items-center justify-center text-emerald-400">
                <Ticket size={24} />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold uppercase tracking-widest mb-1">Ouvrir un Ticket</h3>
                <p className="text-xs text-gray-400">Support Technique</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* TICKET FORM MODAL */}
      {showTicketForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass p-10 rounded-[2rem] border border-white/5 max-w-2xl w-full"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-cinzel font-bold uppercase tracking-widest">
                🎫 Nouveau Ticket
              </h2>
              <button
                onClick={() => setShowTicketForm(false)}
                className="text-gray-400 hover:text-white transition-colors text-2xl"
              >
                ✕
              </button>
            </div>

            {!session ? (
              <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 font-semibold">
                  ⚠️ Vous devez être connecté pour ouvrir un ticket
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitTicket} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-3 uppercase tracking-widest">
                    👤 Votre Nom
                  </label>
                  <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                    <p className="text-white font-semibold">
                      {userProfile?.username || 'Utilisateur'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-3 uppercase tracking-widest">
                    📝 Description du Problème *
                  </label>
                  <textarea
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    placeholder="Décrivez votre problème en détail..."
                    className="w-full h-40 p-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-luxury-gold/50 focus:bg-white/10 transition-all resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {ticketDescription.length} caractères
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setShowTicketForm(false)}
                    className="py-3 px-4 border border-white/10 rounded-lg text-white font-bold uppercase transition-all hover:bg-white/5"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={ticketSubmitting || !ticketDescription.trim()}
                    className="py-3 px-4 bg-luxury-gold/20 hover:bg-luxury-gold/30 disabled:opacity-50 border border-luxury-gold/50 rounded-lg text-luxury-gold font-bold uppercase transition-all"
                  >
                    {ticketSubmitting ? '⏳ Envoi...' : '✅ Envoyer'}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}

      {/* MES TICKETS MODAL */}
      {session && userTickets.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => setSelectedUserTicket(selectedUserTicket ? null : userTickets[0])}
            className="w-16 h-16 bg-luxury-gold/20 border border-luxury-gold/50 rounded-full flex items-center justify-center text-luxury-gold hover:bg-luxury-gold/30 transition-all"
            title={`Vous avez ${userTickets.length} ticket(s)`}
          >
            <Ticket size={24} />
          </motion.button>
        </div>
      )}

      {selectedUserTicket && session && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass p-8 rounded-[2rem] border border-white/5 max-w-2xl w-full max-h-[90vh]"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-cinzel font-bold uppercase tracking-widest">
                🎫 Mes Tickets
              </h2>
              <button
                onClick={() => setSelectedUserTicket(null)}
                className="text-gray-400 hover:text-white transition-colors text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Liste des tickets côté gauche */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {userTicketsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="md:col-span-1 space-y-2 max-h-[400px] overflow-y-auto">
                  {userTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => {
                        setSelectedUserTicket(ticket);
                        fetchTicketMessagesUser(ticket.id);
                      }}
                      className={`w-full text-left p-3 rounded-lg text-sm transition-all border ${
                        selectedUserTicket?.id === ticket.id
                          ? 'bg-luxury-gold/20 border-luxury-gold'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <p className="font-bold text-white truncate">
                        {ticket.title}
                      </p>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold mt-1 ${
                        ticket.status === 'OUVERT' ? 'bg-yellow-500/20 text-yellow-400' :
                        ticket.status === 'EN_COURS' ? 'bg-blue-500/20 text-blue-400' :
                        ticket.status === 'RÉSOLU' ? 'bg-green-500/20 text-green-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {ticket.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedUserTicket && (
              <div className="border-t border-white/10 pt-6">
                {/* Détail du ticket */}
                <div className="mb-6">
                  <p className="text-xs text-gray-500 mb-2">
                    📅 Créé: {new Date(selectedUserTicket.created_at).toLocaleString('fr-FR')}
                  </p>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
                    <p className="text-white whitespace-pre-wrap text-sm">
                      {selectedUserTicket.description}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                {ticketMessagesUserLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-4 h-4 border-2 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4 max-h-[200px] overflow-y-auto mb-4 space-y-2">
                    {ticketMessagesUser.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">
                        Aucun message
                      </p>
                    ) : (
                      ticketMessagesUser.map((msg) => (
                        <div key={msg.id} className={`p-3 rounded ${msg.is_admin ? 'bg-luxury-gold/10 border-l-2 border-luxury-gold' : 'bg-white/10'}`}>
                          <p className="text-xs font-bold text-gray-400 mb-1">
                            {msg.is_admin ? '👨‍💼 Admin' : '👤 Vous'}
                          </p>
                          <p className="text-sm text-white">{msg.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Zone de réponse */}
                {selectedUserTicket.allow_user_replies !== false && selectedUserTicket.status !== 'FERMÉ' && (
                  <div className="space-y-2">
                    <textarea
                      value={userTicketReply}
                      onChange={(e) => setUserTicketReply(e.target.value)}
                      placeholder="Votre réponse..."
                      className="w-full h-20 p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-luxury-gold/50 transition-all resize-none"
                    />
                    <button
                      onClick={() => sendUserTicketReply(selectedUserTicket.id)}
                      disabled={userTicketReplying || !userTicketReply.trim()}
                      className="w-full py-2 px-4 bg-luxury-gold/20 hover:bg-luxury-gold/30 disabled:opacity-50 border border-luxury-gold/50 rounded-lg text-luxury-gold font-bold text-sm uppercase transition-all"
                    >
                      {userTicketReplying ? '⏳ Envoi...' : '✉️ Répondre'}
                    </button>
                  </div>
                )}

                {selectedUserTicket.status === 'FERMÉ' && (
                  <p className="text-red-400 text-sm text-center p-3 bg-red-500/10 rounded-lg">
                    ❌ Ce ticket est fermé
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* FAQ SECTION */}
      <div className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-luxury-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-luxury-gold">
              <MessageSquare size={32} />
            </div>
            <h2 className="text-4xl font-cinzel font-bold uppercase tracking-widest mb-4">
              Foire Aux Questions
            </h2>
            <p className="text-gray-500 text-sm">Les réponses à vos questions les plus fréquentes</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ y: 10, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="group"
              >
                <button
                  onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                  className="w-full p-6 rounded-xl border border-white/10 bg-black/30 hover:bg-black/50 hover:border-luxury-gold/50 transition-all text-left flex items-center justify-between"
                >
                  <span className="font-bold uppercase tracking-widest text-sm">{faq.question}</span>
                  <div className="text-luxury-gold">
                    {expandedFAQ === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>

                {expandedFAQ === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-6 bg-black/50 border border-white/5 border-t-0 text-gray-300 text-sm"
                  >
                    {faq.answer}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* COMMENTS SECTION (Placeholder) */}
      <div className="relative py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="glass p-10 rounded-[3rem] border border-white/5"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-luxury-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-luxury-gold">
              <MessageSquare size={32} />
            </div>
            <h2 className="text-2xl font-cinzel font-bold uppercase tracking-widest mb-4">
              Espace Commentaires
            </h2>
            <p className="text-gray-500 text-sm">Partagez vos impressions sur notre serveur</p>
          </div>

          {/* Comment input form - Accessible only if logged in */}
          {!session ? (
            <div className="p-6 rounded-lg bg-black/50 border border-white/10 text-center mb-8">
              <p className="text-gray-400 font-semibold mb-3">Vous devez être connecté pour commenter</p>
              <a href="#/login" className="inline-block px-6 py-2 rounded-lg bg-luxury-gold/20 hover:bg-luxury-gold/30 border border-luxury-gold/50 text-luxury-gold font-bold uppercase tracking-widest transition-all">
                🔐 Se connecter
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmitComment} className="space-y-4 mb-8">
              <div className="p-4 rounded-lg bg-black/50 border border-white/10">
                <p className="text-luxury-gold font-bold text-sm mb-1">Votre pseudo:</p>
                <p className="text-white">{userProfile?.username || session?.user?.email || 'Utilisateur'}</p>
              </div>
              <textarea
                placeholder="Votre message..."
                rows={4}
                value={commentMessage}
                onChange={(e) => setCommentMessage(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-black/50 border border-white/10 focus:border-luxury-gold/50 outline-none transition-colors text-white placeholder-gray-500 resize-none"
              />
              <button 
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-lg bg-luxury-gold/20 hover:bg-luxury-gold/30 border border-luxury-gold/50 text-luxury-gold font-bold uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {submitting ? '⏳ Envoi en cours...' : '📤 Publier Commentaire'}
              </button>
              <p className="text-xs text-gray-500 text-center">Votre commentaire sera affiché instantanément</p>
            </form>
          )}

          {/* Comments list */}
          {commentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-3 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="p-4 rounded-lg bg-black/50 border border-white/10">
              <p className="text-gray-400 text-sm font-semibold mb-2">Aucun commentaire pour le moment</p>
              <p className="text-gray-500 text-xs">Soyez le premier à partager votre avis!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ y: 10, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  className="p-4 rounded-lg bg-black/50 border border-white/10 hover:border-luxury-gold/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="font-bold text-luxury-gold text-sm uppercase tracking-widest">
                      👤 {comment.username}
                    </h4>
                    <span className="text-xs text-gray-500">
                      ⏰ {new Date(comment.created_at).toLocaleString('fr-FR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm">{comment.message}</p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Spacing */}
      <div className="h-20" />
    </motion.div>
  );
};

export default About;
