import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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
  const [pageVisible, setPageVisible] = useState(true);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [gameState, setGameState] = useState<'IDLE' | 'SPINNING' | 'FINISHED'>('IDLE');
  const [isLocked, setIsLocked] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [isLive, setIsLive] = useState(true);
  const [newParticipantId, setNewParticipantId] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    // Center circle (empty)
    ctx.beginPath();
    ctx.arc(center, center, 50, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 3;
    ctx.stroke();
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

  // ============================================================================
  // AUTHENTICATION CHECK
  // ============================================================================

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      }
    });
  }, [navigate]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  // ============================================================================
  // DATA FETCHING & REAL-TIME SUBSCRIPTIONS
  // ============================================================================

  // Fetch all game data
  const fetchGameData = useCallback(async () => {
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

      // Fetch participants
      const { data: participantsData } = await supabase
        .from('game_participants')
        .select('*')
        .eq('game_round', roundData?.id)
        .order('created_at', { ascending: false });

      if (participantsData) {
        console.log('✅ Participants fetched:', participantsData.length);
        setParticipants(participantsData);
        if (profile?.id) {
          const userParticipant = participantsData.find((p) => p.user_id === profile.id);
          setUserParticipation(userParticipant || null);
        }
      }

      // Fetch winners
      const { data: winnersData } = await supabase
        .from('game_winners')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (winnersData) {
        setWinners(winnersData);
      }

      // Fetch chat messages
      const { data: chatData } = await supabase
        .from('game_chat_messages')
        .select('*')
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (chatData) {
        setChatMessages(chatData.reverse());
      }

      // Fetch admin settings
      const { data: settingsData } = await supabase
        .from('game_admin_settings')
        .select('*')
        .eq('id', 'game-settings')
        .single();

      if (settingsData) {
        setPageVisible(settingsData.page_visible ?? true);
        setChatEnabled(settingsData.chat_enabled ?? true);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching game data:', error);
      setLoading(false);
    }
  }, [profile?.id]);

  // Debounced version of fetchGameData (waits 100ms before fetching to batch updates)
  const debouncedFetchGameData = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    fetchTimeoutRef.current = setTimeout(() => {
      console.log('⏱️ Fetching data after debounce...');
      fetchGameData();
    }, 100);
  }, [fetchGameData]);

  // Initial fetch and subscribe to real-time updates
  useEffect(() => {
    fetchGameData();

    // Subscribe to participants changes
    const participantsSubscription = supabase
      .channel('public:game_participants')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_participants' },
        (payload) => {
          console.log('🟢 NEW PARTICIPANT:', payload);
          debouncedFetchGameData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_participants' },
        (payload) => {
          console.log('🔄 PARTICIPANT UPDATED:', payload);
          debouncedFetchGameData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'game_participants' },
        (payload) => {
          console.log('🔴 PARTICIPANT DELETED:', payload);
          debouncedFetchGameData();
        }
      )
      .subscribe();

    // Subscribe to winners changes
    const winnersSubscription = supabase
      .channel('public:game_winners')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_winners' },
        (payload) => {
          console.log('🏆 NEW WINNER:', payload);
          debouncedFetchGameData();
        }
      )
      .subscribe();

    // Subscribe to chat messages
    const chatSubscription = supabase
      .channel('public:game_chat_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_chat_messages' },
        (payload) => {
          console.log('💬 NEW MESSAGE:', payload);
          debouncedFetchGameData();
        }
      )
      .subscribe();

    // Subscribe to admin settings
    const settingsSubscription = supabase
      .channel('public:game_admin_settings')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_admin_settings' },
        (payload) => {
          console.log('⚙️ SETTINGS UPDATED:', payload);
          debouncedFetchGameData();
        }
      )
      .subscribe();

    // Subscribe to rounds changes
    const roundsSubscription = supabase
      .channel('public:game_rounds')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_rounds' },
        (payload) => {
          console.log('⏭️ ROUND UPDATED:', payload);
          debouncedFetchGameData();
        }
      )
      .subscribe();

    return () => {
      participantsSubscription.unsubscribe();
      winnersSubscription.unsubscribe();
      chatSubscription.unsubscribe();
      settingsSubscription.unsubscribe();
      roundsSubscription.unsubscribe();
    };
  }, [debouncedFetchGameData]);

  // Listen for broadcast events
  useEffect(() => {
    const spinChannel = supabase
      .channel('game-event:SPIN_START', {
        config: {
          broadcast: { ack: false },
        },
      })
      .on('broadcast', { event: 'SPIN_START' }, (payload) => {
        console.log('🔄 Received SPIN_START broadcast:', payload.payload);
        // All clients will animate their own roulette in sync
        if (acceptedCount > 0) {
          // Trigger the same spin animation on all clients
          setIsLocked(true);
          setGameState('SPINNING');
          setIsSpinning(true);
          
          const spinDuration = 5;
          const finalRotation = Math.random() * Math.PI * 2 + Math.PI * 2 * 10;
          const sliceAngle = (Math.PI * 2) / acceptedCount;
          
          setRotation(0);
          let startTime: number | null = null;
          let lastClickAngle = 0;

          const animate = (time: number) => {
            if (!startTime) startTime = time;
            const progress = Math.min((time - startTime) / (spinDuration * 1000), 1);
            const ease = 1 - Math.pow(1 - progress, 4);
            const currentRotation = finalRotation * ease;
            
            setRotation(currentRotation);

            const currentAnglePos = currentRotation % (Math.PI * 2);
            if (Math.abs(currentAnglePos - lastClickAngle) > sliceAngle) {
              playClick();
              lastClickAngle = currentAnglePos;
            }

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setIsSpinning(false);
              // Auto-return to IDLE after 7 seconds
              setTimeout(() => {
                setGameState('IDLE');
                setIsLocked(false);
              }, 7000);
            }
          };

          requestAnimationFrame(animate);
        }
      })
      .subscribe();

    const participantChannel = supabase
      .channel('game-event:PARTICIPANT_REGISTERED', {
        config: {
          broadcast: { ack: false },
        },
      })
      .on('broadcast', { event: 'PARTICIPANT_REGISTERED' }, (payload) => {
        console.log('✅ New participant registered:', payload.payload);
      })
      .subscribe();

    return () => {
      spinChannel.unsubscribe();
      participantChannel.unsubscribe();
    };
  }, [acceptedCount]);

  // Cleanup fetch timeout on unmount
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  // ============================================================================
  // REAL-TIME SYNCHRONIZATION
  // ============================================================================

  // Update online counter and detect new participants
  useEffect(() => {
    // Online count = all participants + admin
    const totalOnline = participants.length + (isAdmin ? 1 : 0);
    setOnlineCount(totalOnline || 1);
    setIsLive(true); // Always live while game is running

    // Set newParticipantId if list changed (for fade-in animation)
    if (participants.length > 0) {
      // Get the most recently added participant
      const lastParticipant = participants[0]; // Assuming order by created_at desc
      setNewParticipantId(lastParticipant.id);
      
      // Clear it after animation completes
      const timer = setTimeout(() => setNewParticipantId(null), 500);
      return () => clearTimeout(timer);
    }
  }, [participants, isAdmin]);

  // ============================================================================
  // BROADCAST EVENT SYSTEM (For Real-Time Synchronization)
  // ============================================================================

  const broadcastEvent = async (eventType: string, payload: any) => {
    // Send broadcast to all clients via Supabase realtime
    try {
      const channel = supabase.channel(`game-event:${eventType}`, {
        config: {
          broadcast: { ack: false },
        },
      });

      channel.send({
        type: 'broadcast',
        event: eventType,
        payload,
      });
    } catch (error) {
      console.log('Broadcast sent (client-side only):', eventType);
    }
  };

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

      // Broadcast participant registration
      broadcastEvent('PARTICIPANT_REGISTERED', {
        participantId: data.id,
        username: data.username,
        timestamp: Date.now(),
      });
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

      // Broadcast participant acceptance
      broadcastEvent('PARTICIPANT_ACCEPTED', {
        participantId,
        timestamp: Date.now(),
      });
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

      // Broadcast accept all event
      broadcastEvent('PARTICIPANTS_ACCEPT_ALL', {
        count: pendingParticipants.length,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error accepting all:', error);
    }
  };

  const handleDemoteUser = async (participantId: string) => {
    try {
      // Retirer un participant: le remettre en WAITING ou le supprimer
      await supabase
        .from('game_participants')
        .delete()
        .eq('id', participantId);

      // Broadcast participant removal
      broadcastEvent('PARTICIPANT_DEMOTED', {
        participantId,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error demoting participant:', error);
    }
  };

  const handleDemoteAll = async () => {
    try {
      // Vider le Spin: réinitialiser tous les ACCEPTED à WAITING
      const acceptedParticipantsList = participants.filter((p) => p.status === 'ACCEPTED');
      for (const participant of acceptedParticipantsList) {
        await supabase
          .from('game_participants')
          .update({ status: 'WAITING' })
          .eq('id', participant.id);
      }
    } catch (error) {
      console.error('Error demoting all:', error);
    }
  };

  const handleTogglePageVisibility = async () => {
    try {
      const newState = !pageVisible;
      setPageVisible(newState);
      
      // Update in Supabase
      await supabase
        .from('game_admin_settings')
        .update({ page_visible: newState, updated_at: new Date() })
        .eq('id', 'game-settings');

      // Broadcast to all clients
      broadcastEvent('PAGE_VISIBILITY_CHANGED', {
        page_visible: newState,
        timestamp: Date.now(),
      });

      // Refetch immediately
      debouncedFetchGameData();
    } catch (error) {
      console.error('Error toggling page visibility:', error);
    }
  };

  const handleToggleChatVisibility = async () => {
    try {
      const newState = !chatEnabled;
      setChatEnabled(newState);
      
      // Update in Supabase
      await supabase
        .from('game_admin_settings')
        .update({ chat_enabled: newState, updated_at: new Date() })
        .eq('id', 'game-settings');

      // Broadcast to all clients
      broadcastEvent('CHAT_VISIBILITY_CHANGED', {
        chat_enabled: newState,
        timestamp: Date.now(),
      });

      // Refetch immediately
      debouncedFetchGameData();
    } catch (error) {
      console.error('Error toggling chat visibility:', error);
    }
  };

  const handleCancelRegistration = async () => {
    if (!userParticipation) return;
    
    // Constraint: Cannot cancel if ACCEPTED (Empêche les désistements de dernière minute)
    if (userParticipation.status === 'ACCEPTED') {
      alert('❌ Vous ne pouvez pas annuler une fois accepté. Contactez un admin.');
      return;
    }

    try {
      // Delete participation from database (Only if WAITING)
      await supabase
        .from('game_participants')
        .delete()
        .eq('id', userParticipation.id);
      
      setUserParticipation(null);
    } catch (error) {
      console.error('Error canceling registration:', error);
    }
  };

  const handleStartSpin = async () => {
    if (!currentRound || acceptedCount === 0) return;

    // Broadcast SPIN event to all clients
    broadcastEvent('SPIN_START', {
      timestamp: Date.now(),
      acceptedCount,
      adminId: profile?.id,
    });

    // Lock interface: Empêche toute action pendant le spin
    setIsLocked(true);
    setGameState('SPINNING');
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
          setGameState('FINISHED');

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

              // Auto-return to IDLE after 7 seconds
              setTimeout(async () => {
                const { data: newRound } = await supabase
                  .from('game_rounds')
                  .insert([{ status: 'IDLE', participant_count: 0 }])
                  .select()
                  .single();

                if (newRound) setCurrentRound(newRound);
                setParticipants([]);
                setUserParticipation(null);
                setSelectedWinner(null);
                setGameState('IDLE');
                setIsLocked(false);
              }, 7000);
            } catch (error) {
              console.error('Error updating results:', error);
              setIsLocked(false);
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
    <div className="min-h-screen bg-luxury-dark pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Page Visibility Check */}
        {!pageVisible && !isAdmin && (
          <div className="mb-12 p-8 bg-gradient-to-r from-red-600/20 to-red-600/10 border border-red-600/50 rounded-lg text-center">
            <h2 className="text-2xl font-cinzel font-bold text-red-400 mb-4">🔒 L'espace Jeu est temporairement fermé</h2>
            <p className="text-gray-300">L'admin prépare le prochain événement. Revenez bientôt!</p>
          </div>
        )}

        {/* Header with LIVE Indicators */}
        <header className="mb-12 relative">
          <div className="flex items-center justify-center gap-4 mb-4">
            {/* LIVE Badge - Pulsing Animation */}
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/20 border border-red-600 rounded-full"
            >
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-400 font-bold text-sm">LIVE</span>
            </motion.div>

            {/* Online Counter */}
            <div className="px-4 py-2 bg-luxury-gold/10 border border-luxury-gold/30 rounded-full">
              <span className="text-luxury-gold font-bold text-sm">👥 {onlineCount} en ligne</span>
            </div>
          </div>

          <h1 className="font-cinzel text-5xl font-bold text-white mb-2 text-center">JEU</h1>
          <p className="text-gray-400 text-center">Participez à la roulette et tentez de remporter le prix</p>
        </header>

        {/* MAIN 3-COLUMN LAYOUT - Only show if page is visible or user is admin */}
        {pageVisible || isAdmin ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 relative">
          {/* LEFT COLUMN (2 cols): LISTE D'ATTENTE */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 sticky top-24 z-10">
              <h2 className="text-lg font-cinzel font-bold text-white mb-4 flex items-center gap-2">
                <Users size={20} className="text-luxury-gold" />
                LISTE D'ATTENTE
              </h2>
              <div className="text-xs text-gray-400 mb-3 font-bold">{pendingCount}</div>
              
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {participants.filter((p) => p.status === 'WAITING').length > 0 ? (
                  participants
                    .filter((p) => p.status === 'WAITING')
                    .map((participant) => (
                      <motion.div
                        key={participant.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center gap-2 bg-white/5 p-3 rounded border border-white/10 hover:border-luxury-gold/50 transition-all group"
                      >
                        <img
                          src={participant.avatar_url || 'https://i.postimg.cc/rF1jc0R2/depositphotos-51405259-stock-illustration-male-avatar-profile-picture-use.jpg'}
                          alt={participant.username}
                          className="w-8 h-8 rounded-full flex-shrink-0"
                        />
                        <span className="text-xs text-white flex-1 truncate font-medium">{participant.username}</span>
                        {isAdmin && (
                          <button
                            onClick={() => handleAcceptUser(participant.id)}
                            disabled={isLocked}
                            className="px-2 py-1 bg-green-600/20 border border-green-600 text-green-400 rounded text-[10px] hover:bg-green-600/30 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          >
                            OK
                          </button>
                        )}
                      </motion.div>
                    ))
                ) : (
                  <p className="text-gray-500 text-xs text-center py-6">Aucun en attente</p>
                )}
              </div>
            </div>
          </div>

          {/* CENTER COLUMN (6 cols): ROULETTE + CHAT */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            
            {/* ROULETTE SECTION */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <div className="flex flex-col items-center space-y-6">
                {/* Canvas Roulette */}
                <div className="relative inline-block">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={400}
                    className="w-80 h-80 drop-shadow-2xl"
                    style={{ filter: 'drop-shadow(0 0 30px rgba(212, 175, 55, 0.2))' }}
                  />
                  {/* Pointer */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                    <div className="w-0 h-0 border-l-6 border-r-6 border-t-6 border-l-transparent border-r-transparent border-t-red-500"></div>
                  </div>
                </div>

                {/* Winner Display */}
                {selectedWinner && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full p-6 bg-gradient-to-r from-luxury-gold/20 to-white/10 border border-luxury-gold rounded-lg text-center"
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

                {/* Action Buttons */}
                <div className="w-full space-y-3">
                  {!isAdmin && !userParticipation && (
                    <button
                      onClick={handleRegister}
                      disabled={isLocked}
                      className="w-full px-6 py-4 rounded-lg bg-luxury-gold text-black hover:bg-luxury-goldLight transition-all font-bold uppercase tracking-widest text-sm disabled:opacity-50"
                    >
                      S'inscrire pour participer
                    </button>
                  )}

                  {!isAdmin && userParticipation && userParticipation.status === 'WAITING' && (
                    <div className="w-full space-y-2">
                      <div className="w-full px-6 py-3 rounded-lg bg-white/10 border border-luxury-gold text-luxury-gold font-semibold text-center text-sm">
                        ⏳ En attente de validation
                      </div>
                      <button
                        onClick={handleCancelRegistration}
                        disabled={isLocked}
                        className="w-full px-6 py-3 rounded-lg bg-red-600/20 border border-red-600 text-red-400 hover:bg-red-600/30 transition-all font-bold uppercase tracking-widest text-sm disabled:opacity-50"
                      >
                        ANNULER L'INSCRIPTION
                      </button>
                    </div>
                  )}

                  {!isAdmin && userParticipation && userParticipation.status === 'ACCEPTED' && (
                    <div className="w-full px-6 py-3 rounded-lg bg-green-600/20 border border-green-600 text-green-400 font-semibold text-center text-sm">
                      ✓ Accepté - Attendez le démarrage
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CHAT SECTION */}
            {isAdmin || (userParticipation && userParticipation.status === 'ACCEPTED') ? (
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h2 className="text-lg font-cinzel font-bold text-white mb-4 flex items-center gap-2">
                  <MessageSquare size={20} className="text-luxury-gold" />
                  CHAT COMMUNAUTAIRE
                </h2>

                <div className="space-y-4">
                  {/* Messages Display */}
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10 max-h-56 overflow-y-auto space-y-3">
                    {chatMessages.length > 0 ? (
                      chatMessages.map((msg) => (
                        <div key={msg.id} className="flex gap-3">
                          <img
                            src={msg.avatar_url || 'https://i.postimg.cc/rF1jc0R2/depositphotos-51405259-stock-illustration-male-avatar-profile-picture-use.jpg'}
                            alt={msg.username}
                            className="w-6 h-6 rounded-full flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold ${msg.is_admin ? 'text-luxury-gold' : 'text-white'}`}>
                              {msg.username}
                              {msg.is_admin && ' 👑'}
                            </p>
                            <p className="text-xs text-gray-300">{msg.message}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-xs text-center py-4">Aucun message</p>
                    )}
                  </div>

                  {/* Message Input */}
                  {profile && (
                    <>
                      {!chatEnabled && !isAdmin && (
                        <div className="bg-white/10 rounded-lg p-3 border border-white/10 text-center">
                          <p className="text-xs text-gray-400">🔒 Le chat est réservé aux admins en ce moment</p>
                        </div>
                      )}
                      <div className={`flex gap-2 ${!chatEnabled && !isAdmin ? 'opacity-50 pointer-events-none' : ''}`}>
                        <textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder={chatEnabled || isAdmin ? 'Votre message...' : 'Chat désactivé'}
                          disabled={!chatEnabled && !isAdmin}
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-luxury-gold resize-none max-h-20 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || (!chatEnabled && !isAdmin)}
                          className="px-4 py-2 rounded-lg bg-luxury-gold text-black hover:bg-luxury-goldLight transition-all font-bold text-xs disabled:opacity-50 h-fit"
                        >
                          Envoyer
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h2 className="text-lg font-cinzel font-bold text-white mb-4 flex items-center gap-2">
                  <MessageSquare size={20} className="text-luxury-gold" />
                  CHAT COMMUNAUTAIRE
                </h2>
                <div className="bg-white/5 rounded-lg p-6 border border-white/10 text-center">
                  <p className="text-gray-400 text-sm">
                    🔒 Seuls les participants acceptés peuvent accéder au chat
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    Inscrivez-vous et attendez la validation pour participer
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN (4 cols): ZONE ADMIN + VALIDÉS + GAGNANTS */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* ZONE ADMIN */}
            {isAdmin && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-6 sticky top-24">
                <h2 className="text-sm font-cinzel font-bold text-white mb-4 uppercase">ZONE ADMIN</h2>
                <div className="space-y-3">
                  {/* Button 1: Toggle Page Visibility */}
                  <button
                    onClick={handleTogglePageVisibility}
                    className={`w-full px-4 py-3 rounded-lg font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all ${
                      pageVisible
                        ? 'bg-luxury-gold text-black hover:bg-luxury-goldLight'
                        : 'bg-gray-600 text-white hover:bg-gray-700'
                    }`}
                  >
                    {pageVisible ? '👁️ PUBLIC' : '🚫 CACHÉ'}
                  </button>

                  {/* Button 2: Toggle Chat Visibility */}
                  <button
                    onClick={handleToggleChatVisibility}
                    className={`w-full px-4 py-3 rounded-lg font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all border ${
                      chatEnabled
                        ? 'bg-green-600/20 border-green-600 text-green-400 hover:bg-green-600/30'
                        : 'bg-red-600/20 border-red-600 text-red-400 hover:bg-red-600/30'
                    }`}
                  >
                    {chatEnabled ? '💬 CHAT' : '🔇 CHAT OFF'}
                  </button>

                  {/* Button 3: Accept All */}
                  <button
                    onClick={handleAcceptAll}
                    disabled={pendingCount === 0 || isLocked}
                    className="w-full px-4 py-3 rounded-lg bg-green-600/20 border border-green-600 text-green-400 hover:bg-green-600/30 transition-all font-semibold text-xs disabled:opacity-50 uppercase"
                  >
                    ACCEPTER TOUS ({pendingCount})
                  </button>

                  {/* Button 4: Launch Spin */}
                  <button
                    onClick={handleStartSpin}
                    disabled={isSpinning || acceptedCount === 0 || isLocked}
                    className="w-full px-4 py-3 rounded-lg bg-luxury-gold text-black hover:bg-luxury-goldLight transition-all font-bold uppercase tracking-widest text-xs disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Play size={14} />
                    LANCER LE SPIN ({acceptedCount})
                  </button>

                  {/* Button 5: Empty Spin (Vider le Spin) */}
                  <button
                    onClick={handleDemoteAll}
                    disabled={acceptedCount === 0 || isLocked}
                    className="w-full px-4 py-3 rounded-lg bg-red-600/20 border border-red-600 text-red-400 hover:bg-red-600/30 transition-all font-semibold text-xs disabled:opacity-50 uppercase"
                  >
                    VIDER LE SPIN
                  </button>
                </div>
              </div>
            )}

            {/* PARTICIPANTS VALIDÉS */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h2 className="text-sm font-cinzel font-bold text-white mb-4 flex items-center gap-2 uppercase">
                <CheckCircle size={16} className="text-luxury-gold" />
                Participants Validés
              </h2>
              <div className="text-xs text-gray-400 mb-3 font-bold">{acceptedCount}</div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {acceptedParticipants.length > 0 ? (
                  acceptedParticipants.map((participant) => (
                    <motion.div
                      key={participant.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-2 bg-white/5 p-2 rounded border border-white/10 group hover:border-red-600/50 transition-all"
                    >
                      <img
                        src={participant.avatar_url || 'https://i.postimg.cc/rF1jc0R2/depositphotos-51405259-stock-illustration-male-avatar-profile-picture-use.jpg'}
                        alt={participant.username}
                        className="w-6 h-6 rounded-full flex-shrink-0"
                      />
                      <span className="text-xs text-white truncate flex-1">{participant.username}</span>
                      <span className="text-[10px] text-luxury-gold">✓</span>
                      {isAdmin && (
                        <button
                          onClick={() => handleDemoteUser(participant.id)}
                          disabled={isLocked}
                          className="px-1.5 py-0.5 bg-red-600/20 border border-red-600 text-red-400 rounded text-[10px] hover:bg-red-600/30 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                        >
                          ✕
                        </button>
                      )}
                    </motion.div>
                  ))
                ) : (
                  <p className="text-gray-500 text-xs text-center py-4">Aucun accepté</p>
                )}
              </div>
            </div>

            {/* HISTORIQUE DES GAGNANTS */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h2 className="text-sm font-cinzel font-bold text-white mb-4 flex items-center gap-2 uppercase">
                <Trophy size={16} className="text-luxury-gold" />
                Historique Gagnants
              </h2>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {winners.length > 0 ? (
                  winners.map((winner) => (
                    <div key={winner.id} className="flex items-center gap-2 bg-white/5 p-2 rounded border border-white/10">
                      <img
                        src={winner.avatar_url || 'https://i.postimg.cc/rF1jc0R2/depositphotos-51405259-stock-illustration-male-avatar-profile-picture-use.jpg'}
                        alt={winner.username}
                        className="w-5 h-5 rounded-full flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white truncate font-semibold">{winner.username}</p>
                        <p className="text-[10px] text-gray-500">{new Date(winner.created_at).toLocaleDateString('fr-FR')} - {new Date(winner.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
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
        ) : null}
      </div>
    </div>
  );
};

export default GamePage;
