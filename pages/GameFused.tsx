import React, { useRef, useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { motion } from 'framer-motion';
import { Users, Trophy, Play, CheckCircle, MessageSquare, Loader, Volume2, VolumeX } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { Profile } from '../types';

interface Participant {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  status: 'WAITING' | 'ACCEPTED';
}

interface GameRound {
  id: string;
  status: 'IDLE' | 'SPINNING' | 'FINISHED';
  winner_id: string | null;
  winner_name: string | null;
  participant_count: number;
  created_at: string;
}

interface Winner {
  id: string;
  username: string;
  avatar_url: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  username: string;
  avatar_url: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

const GamePage: React.FC<{ profile: Profile | null }> = ({ profile }) => {
  const { t, language } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // States
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [loading, setLoading] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [userParticipation, setUserParticipation] = useState<Participant | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<Participant | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const isAdmin = profile?.role === 'admin';
  const acceptedParticipants = participants.filter((p) => p.status === 'ACCEPTED');
  const acceptedCount = acceptedParticipants.length;
  const pendingCount = participants.filter((p) => p.status === 'WAITING').length;

  // ============================================================================
  // CANVAS ROULETTE DRAWING (from SPIN)
  // ============================================================================
  
  const WHEEL_COLORS = [
    '#D4AF37', // luxury-gold
    '#E8D5B7', // luxury-goldLight
    '#C9B037', // darker gold
    '#F0E6D2', // very light gold
    '#1a1a1a', // dark
    '#2a2a2a', // darker gray
  ];

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;

    ctx.clearRect(0, 0, size, size);

    if (acceptedCount === 0) {
      // Empty wheel
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(26, 26, 26, 0.5)';
      ctx.fill();
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 4;
      ctx.stroke();
      return;
    }

    const sliceAngle = (Math.PI * 2) / acceptedCount;

    // Draw slices
    acceptedParticipants.forEach((user, i) => {
      const startAngle = i * sliceAngle + rotation;
      const endAngle = (i + 1) * sliceAngle + rotation;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = i % WHEEL_COLORS.length === 4 || i % WHEEL_COLORS.length === 5 ? '#fff' : '#000';
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto';
      ctx.fillText(user.username.substring(0, 12), radius - 30, 4);
      ctx.restore();
    });

    // Outer rim glow
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Decorative dots
    for (let i = 0; i < 24; i++) {
      const dotAngle = (i / 24) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(center + Math.cos(dotAngle) * radius, center + Math.sin(dotAngle) * radius, 3, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? '#fff' : '#D4AF37';
      ctx.fill();
    }

    // Center circle with logo
    ctx.beginPath();
    ctx.arc(center, center, 50, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold 24px Cinzel';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ATC', center, center);
  }, [acceptedParticipants, acceptedCount, rotation]);

  const playClick = useCallback(() => {
    if (!isSoundEnabled) return;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }, [isSoundEnabled]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch current round
        const { data: roundData } = await supabase
          .from('game_rounds')
          .select('*')
          .eq('status', 'IDLE')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!roundData) {
          const { data: newRound } = await supabase
            .from('game_rounds')
            .insert([{ status: 'IDLE', participant_count: 0 }])
            .select()
            .single();
          if (newRound) setCurrentRound(newRound);
        } else {
          setCurrentRound(roundData);
        }

        // Fetch participants (using secure view with display_name)
        const { data: participantsData } = await supabase
          .from('game_participants_with_names')
          .select('*')
          .eq('game_round', roundData?.id)
          .order('created_at', { ascending: false });

        if (participantsData) {
          setParticipants(participantsData);
          if (profile?.id) {
            const userParticipant = participantsData.find((p) => p.user_id === profile.id);
            setUserParticipation(userParticipant || null);
          }
        }

        // Fetch winners (using secure view with display_name)
        const { data: winnersData } = await supabase
          .from('game_winners_with_names')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (winnersData) {
          setWinners(winnersData);
        }

        // Fetch chat messages (using secure view with display_name)
        const { data: chatData } = await supabase
          .from('game_chat_messages_with_names')
          .select('*')
          .eq('is_visible', true)
          .order('created_at', { ascending: false })
          .limit(20);

        if (chatData) {
          setChatMessages(chatData.reverse());
        }
      } catch (error) {
        console.error('Error fetching game data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to real-time updates
    const participantsSubscription = supabase
      .channel('public:game_participants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_participants' }, () => fetchData())
      .subscribe();

    const roundsSubscription = supabase
      .channel('public:game_rounds')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rounds' }, () => fetchData())
      .subscribe();

    const chatSubscription = supabase
      .channel('public:game_chat_messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_chat_messages' }, () => fetchData())
      .subscribe();

    return () => {
      participantsSubscription.unsubscribe();
      roundsSubscription.unsubscribe();
      chatSubscription.unsubscribe();
    };
  }, [profile?.id]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleRegister = async () => {
    if (!profile) return;

    try {
      if (userParticipation) {
        alert('Vous êtes déjà inscrit');
        return;
      }

      const { data, error } = await supabase
        .from('game_participants')
        .insert([
          {
            user_id: profile.id,
            username: profile.username || 'Anonymous',
            avatar_url: profile.avatar_url,
            status: 'WAITING',
            game_round: currentRound?.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      setUserParticipation(data);
    } catch (error) {
      console.error('Error registering:', error);
    }
  };

  const handleAcceptUser = async (participantId: string) => {
    try {
      await supabase
        .from('game_participants')
        .update({ status: 'ACCEPTED' })
        .eq('id', participantId);
    } catch (error) {
      console.error('Error accepting participant:', error);
    }
  };

  const handleAcceptAll = async () => {
    try {
      const pendingParticipants = participants.filter((p) => p.status === 'WAITING');
      for (const participant of pendingParticipants) {
        await handleAcceptUser(participant.id);
      }
    } catch (error) {
      console.error('Error accepting all:', error);
    }
  };

  const handleStartSpin = async () => {
    if (!currentRound || acceptedCount === 0) return;

    setIsSpinning(true);
    const spinDuration = 5;
    const finalRotation = Math.random() * Math.PI * 2 + Math.PI * 2 * 10;
    
    setRotation(0);
    let startTime: number | null = null;
    let lastClickAngle = 0;
    const sliceAngle = (Math.PI * 2) / acceptedCount;

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / (spinDuration * 1000), 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      const currentRotation = finalRotation * ease;
      
      setRotation(currentRotation);

      // Sound ticking
      const currentAnglePos = currentRotation % (Math.PI * 2);
      if (Math.abs(currentAnglePos - lastClickAngle) > sliceAngle) {
        playClick();
        lastClickAngle = currentAnglePos;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Determine winner
        const finalAngle = (currentRotation % (Math.PI * 2));
        const pointerAngle = (Math.PI * 2 - finalAngle) % (Math.PI * 2);
        const winnerIndex = Math.floor((pointerAngle / (Math.PI * 2)) * acceptedCount);
        const winner = acceptedParticipants[winnerIndex];

        if (winner) {
          setSelectedWinner(winner);

          // Update database
          (async () => {
            try {
              await supabase
                .from('game_rounds')
                .update({ status: 'FINISHED', winner_id: winner.user_id, winner_name: winner.username })
                .eq('id', currentRound.id);

              await supabase
                .from('game_winners')
                .insert([
                  {
                    user_id: winner.user_id,
                    username: winner.username,
                    avatar_url: winner.avatar_url,
                    game_round: currentRound.id,
                  },
                ]);

              const { data: newRound } = await supabase
                .from('game_rounds')
                .insert([{ status: 'IDLE', participant_count: 0 }])
                .select()
                .single();

              if (newRound) setCurrentRound(newRound);
              setParticipants([]);
              setUserParticipation(null);
            } catch (error) {
              console.error('Error updating results:', error);
            }
          })();
        }

        setIsSpinning(false);
      }
    };

    requestAnimationFrame(animate);
  };

  const handleSendMessage = async () => {
    if (!profile || !newMessage.trim()) return;

    try {
      await supabase
        .from('game_chat_messages')
        .insert([
          {
            user_id: profile.id,
            username: profile.username || 'Anonymous',
            avatar_url: profile.avatar_url,
            message: newMessage,
            is_admin: isAdmin,
            is_visible: true,
          },
        ]);

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-luxury-dark">
        <div className="w-12 h-12 border-4 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-luxury-dark pt-28 md:pt-32 lg:pt-36 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-12">
          <h1 className="font-cinzel text-5xl font-bold text-white mb-2 text-center">JEU</h1>
          <p className="text-gray-400 text-center">Participez à la roulette et tentez de remporter le prix</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Waiting List + Accepted Users */}
          <div className="lg:col-span-4 space-y-6">
            {/* Waiting List */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h2 className="text-lg font-cinzel font-bold text-white mb-4 flex items-center gap-2">
                <Users size={20} className="text-luxury-gold" />
                Liste d'attente
              </h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {participants.filter((p) => p.status === 'WAITING').length > 0 ? (
                  participants
                    .filter((p) => p.status === 'WAITING')
                    .map((participant) => (
                      <div key={participant.id} className="flex items-center justify-between bg-white/5 p-2 rounded border border-white/10">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <img
                            src={participant.avatar_url || 'https://i.postimg.cc/rF1jc0R2/depositphotos-51405259-stock-illustration-male-avatar-profile-picture-use.jpg'}
                            alt={participant.username}
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="text-xs text-white truncate">{participant.username}</span>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => handleAcceptUser(participant.id)}
                            className="text-luxury-gold hover:text-luxury-goldLight transition-colors ml-2"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                      </div>
                    ))
                ) : (
                  <p className="text-gray-500 text-xs text-center py-4">Aucun en attente</p>
                )}
              </div>
            </div>

            {/* Accepted Users */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h2 className="text-lg font-cinzel font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle size={20} className="text-luxury-gold" />
                Validés ({acceptedCount})
              </h2>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {acceptedParticipants.length > 0 ? (
                  acceptedParticipants.map((participant) => (
                    <div key={participant.id} className="flex items-center gap-2 bg-white/5 p-2 rounded border border-white/10">
                      <img
                        src={participant.avatar_url || 'https://i.postimg.cc/rF1jc0R2/depositphotos-51405259-stock-illustration-male-avatar-profile-picture-use.jpg'}
                        alt={participant.username}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-xs text-white truncate flex-1">{participant.username}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-xs text-center py-4">Aucun accepté</p>
                )}
              </div>
            </div>
          </div>

          {/* CENTER: ROULETTE */}
          <div className="lg:col-span-4 flex flex-col items-center">
            <div className="bg-white/5 border border-white/10 rounded-lg p-8 w-full flex flex-col items-center">
              {/* Canvas Wheel */}
              <div className="relative mb-8">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={400}
                  className="w-96 h-96 drop-shadow-2xl"
                  style={{ filter: 'drop-shadow(0 0 30px rgba(212, 175, 55, 0.2))' }}
                />
                {/* Pointer */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-3">
                  <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-red-500"></div>
                </div>
              </div>

              {/* Actions */}
              {!isAdmin && !userParticipation && (
                <button
                  onClick={handleRegister}
                  className="w-full px-6 py-4 rounded-lg bg-luxury-gold text-black hover:bg-luxury-goldLight transition-all font-bold uppercase tracking-widest text-sm"
                >
                  S'inscrire pour participer
                </button>
              )}

              {!isAdmin && userParticipation && (
                <div className="w-full px-6 py-3 rounded-lg bg-white/10 border border-luxury-gold text-luxury-gold font-semibold text-center text-sm">
                  {userParticipation.status === 'WAITING' && '⏳ En attente de validation'}
                  {userParticipation.status === 'ACCEPTED' && '✓ Accepté - Attendez le démarrage'}
                </div>
              )}

              {/* Winner Display */}
              {selectedWinner && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full mt-6 p-6 bg-gradient-to-r from-luxury-gold/20 to-white/10 border border-luxury-gold rounded-lg text-center"
                >
                  <Trophy className="w-12 h-12 text-luxury-gold mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-luxury-gold mb-2">GAGNANT!</h3>
                  <img
                    src={selectedWinner.avatar_url || 'https://i.postimg.cc/rF1jc0R2/depositphotos-51405259-stock-illustration-male-avatar-profile-picture-use.jpg'}
                    alt={selectedWinner.username}
                    className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-luxury-gold"
                  />
                  <p className="text-white text-lg font-cinzel">{selectedWinner.username}</p>
                </motion.div>
              )}
            </div>
          </div>

          {/* RIGHT: Admin Panel + Winners */}
          <div className="lg:col-span-4 space-y-12">
            {/* Admin Panel */}
            {isAdmin && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h2 className="text-lg font-cinzel font-bold text-white mb-4">ZONE ADMIN</h2>
                <div className="space-y-3">
                  <button
                    onClick={handleStartSpin}
                    disabled={isSpinning || acceptedCount === 0}
                    className="w-full px-4 py-3 rounded-lg bg-luxury-gold text-black hover:bg-luxury-goldLight transition-all font-bold uppercase tracking-widest text-xs disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Play size={16} />
                    Lancer ({acceptedCount})
                  </button>

                  <button
                    onClick={handleAcceptAll}
                    disabled={pendingCount === 0}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all font-semibold text-xs disabled:opacity-50"
                  >
                    Accepter tous ({pendingCount})
                  </button>

                  <button
                    onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all font-semibold text-xs flex items-center justify-center gap-2"
                  >
                    {isSoundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    Son {isSoundEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            )}

            {/* Winners History */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h2 className="text-lg font-cinzel font-bold text-white mb-4 flex items-center gap-2">
                <Trophy size={20} className="text-luxury-gold" />
                Gagnants
              </h2>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {winners.length > 0 ? (
                  winners.map((winner) => (
                    <div key={winner.id} className="flex items-center gap-2 text-xs bg-white/5 p-2 rounded border border-white/10">
                      <img
                        src={winner.avatar_url || 'https://i.postimg.cc/rF1jc0R2/depositphotos-51405259-stock-illustration-male-avatar-profile-picture-use.jpg'}
                        alt={winner.username}
                        className="w-5 h-5 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white truncate font-semibold">{winner.username}</p>
                        <p className="text-gray-500 text-[10px]">{new Date(winner.created_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-xs text-center py-4">Aucun gagnant</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CHAT Section (Full Width) */}
        <div className="mt-8 bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-lg font-cinzel font-bold text-white mb-4 flex items-center gap-2">
            <MessageSquare size={20} className="text-luxury-gold" />
            Chat Communautaire
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Messages Display */}
            <div className="lg:col-span-2 bg-white/5 rounded-lg p-4 border border-white/10 max-h-64 overflow-y-auto space-y-2">
              {chatMessages.length > 0 ? (
                chatMessages.map((msg) => (
                  <div key={msg.id} className="flex gap-3 text-xs">
                    <img
                      src={msg.avatar_url || 'https://i.postimg.cc/rF1jc0R2/depositphotos-51405259-stock-illustration-male-avatar-profile-picture-use.jpg'}
                      alt={msg.username}
                      className="w-6 h-6 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1">
                      <p className={msg.is_admin ? 'text-luxury-gold font-bold' : 'text-white'}>
                        {msg.username}
                        {msg.is_admin && ' 👑'}
                      </p>
                      <p className="text-gray-300">{msg.message}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">Aucun message</p>
              )}
            </div>

            {/* Message Input */}
            {profile && (
              <div className="flex flex-col gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Votre message..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-luxury-gold resize-none"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 rounded-lg bg-luxury-gold text-black hover:bg-luxury-goldLight transition-all font-bold text-xs disabled:opacity-50"
                >
                  Envoyer
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamePage;
