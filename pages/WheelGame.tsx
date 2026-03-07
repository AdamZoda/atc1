import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import Wheel from '../components/Wheel';
import confetti from 'canvas-confetti';
import { Gift, RotateCcw, AlertTriangle, Trophy, History as HistoryIcon, Clock } from 'lucide-react';

interface Reward {
    id: string;
    label: string;
    points: number;
    reward_type: 'points' | 'text';
    reward_value: string;
    percentage: number;
    probability_weight: number;
    color: string;
}

interface SpinResult {
    id: string;
    created_at: string;
    reward_id: string;
    points_won: number;
    reward_type?: string;
    reward_value?: string;
    wheel_rewards?: {
        label: string;
        color: string;
        reward_type: string;
        reward_value: string;
    };
}

interface LeaderboardEntry {
    user_id: string;
    points_won: number;
    created_at: string;
    profiles?: {
        username: string;
        avatar_url: string;
    };
    wheel_rewards?: {
        label: string;
        color: string;
        reward_type: string;
        reward_value: string;
    };
}

export default function WheelGame() {
    const [profile, setProfile] = useState<any>(null);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [wheelLayout, setWheelLayout] = useState<string[] | undefined>(undefined);
    const [spinning, setSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [spinResult, setSpinResult] = useState<any>(null);
    const [showResultModal, setShowResultModal] = useState(false);

    const [spinHistory, setSpinHistory] = useState<SpinResult[]>([]);
    const [liveFeed, setLiveFeed] = useState<LeaderboardEntry[]>([]);
    const [spinsLeftToday, setSpinsLeftToday] = useState<number>(0);
    const [maxSpins, setMaxSpins] = useState<number>(1);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const currentRotationRef = useRef(0);

    useEffect(() => {
        const initGame = async () => {
            setLoading(true);

            // 1. Fetch Auth Profile
            const { data: { session } } = await supabase.auth.getSession();
            let currentProfile = null;
            if (session) {
                const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                if (data) {
                    currentProfile = data;
                    setProfile(data);
                }
            }

            await fetchRewards();

            // Fetch wheel layout
            const { data: layouts } = await supabase.from('settings').select('value').eq('key', 'wheel_layout');
            if (layouts && layouts.length > 0 && layouts[0].value) {
                try {
                    setWheelLayout(JSON.parse(layouts[0].value));
                } catch (e) {
                    console.error('Initial layout parse error:', e);
                }
            }

            // 2. Fetch User Specific Stats
            if (currentProfile) {
                await fetchUserStats(currentProfile);
                await fetchSpinHistory(currentProfile);
            }

            // 3. Fetch Global Data
            await fetchLiveFeed();
            setLoading(false);

            // Setup real-time subscriptions
            setupRealtimeSubscription(session.user.id);
        };

        initGame();

        return () => {
            supabase.removeAllChannels();
        };
    }, []);

    const setupRealtimeSubscription = (userId: string) => {
        // 1. Live winners feed subscription
        const feedChannel = supabase
            .channel('public:spin_history_feed')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'spin_history' },
                async (payload) => {
                    const { data } = await supabase
                        .from('spin_history')
                        .select(`
                            points_won,
                            created_at,
                            user_id,
                            profiles(username, avatar_url),
                            wheel_rewards(label, color)
                        `)
                        .eq('id', payload.new.id)
                        .single();

                    if (data) {
                        setLiveFeed(prev => [data as unknown as LeaderboardEntry, ...prev].slice(0, 10));
                    }
                }
            )
            .subscribe();

        // 2. Real-time profile subscription (for points and bonus spins updates)
        const profileChannel = supabase
            .channel(`public:profile_updates_${userId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
                (payload) => {
                    console.log('Profile real-time update:', payload.new);
                    setProfile(payload.new);
                }
            )
            .subscribe();
    };

    const fetchRewards = async () => {
        try {
            const { data, error } = await supabase
                .from('wheel_rewards')
                .select('*')
                .eq('is_active', true)
                .order('id');

            if (error) throw error;
            if (data) setRewards(data);
        } catch (err) {
            console.error("Error fetching rewards:", err);
            setError('Impossible de charger la roue.');
        }
    };

    const fetchUserStats = async (userProfile: any) => {
        if (!userProfile) return;
        try {
            // Get max spins setting
            const { data: settingsData } = await supabase
                .from('settings')
                .select('value')
                .eq('key', 'wheel_spins_per_day')
                .single();

            const limit = settingsData ? parseInt(settingsData.value) : 1;
            setMaxSpins(limit);

            // Get today's spins
            const startOfDay = new Date();
            startOfDay.setUTCHours(0, 0, 0, 0);

            const { count, error } = await supabase
                .from('spin_history')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userProfile.id)
                .gte('created_at', startOfDay.toISOString());

            if (error) throw error;
            setSpinsLeftToday(Math.max(0, limit - (count || 0)));
        } catch (err) {
            console.error("Error fetching user stats:", err);
        }
    };

    const fetchSpinHistory = async (userProfile: any) => {
        if (!userProfile) return;
        try {
            const { data, error } = await supabase
                .from('spin_history')
                .select('id, created_at, reward_id, points_won, wheel_rewards(label, color, reward_type, reward_value)')
                .eq('user_id', userProfile.id)
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) throw error;
            if (data) setSpinHistory(data as unknown as SpinResult[]);
        } catch (err) {
            console.error("Error fetching history:", err);
        }
    };

    const fetchLiveFeed = async () => {
        try {
            const { data, error } = await supabase
                .from('spin_history')
                .select(`
                    points_won,
                    created_at,
                    user_id,
                    profiles(username, avatar_url),
                    wheel_rewards(label, color, reward_type, reward_value)
                `)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            if (data) setLiveFeed(data as unknown as LeaderboardEntry[]);
        } catch (err) {
            console.error("Error fetching live feed:", err);
        }
    };

    const handleSpin = async () => {
        if (!profile) return;
        const totalSpinsAvailable = (spinsLeftToday > 0 ? spinsLeftToday : 0) + (profile.bonus_spins || 0);

        if (totalSpinsAvailable <= 0) {
            setError('Vous n\'avez plus de tours disponibles.');
            return;
        }
        if (spinning) return;
        if (rewards.length === 0) return;

        setError('');
        setSpinning(true);

        try {
            // 1. Call RPC to determine result securely
            const { data, error: rpcError } = await supabase.rpc('spin_wheel', {
                user_uuid: profile.id
            });

            if (rpcError) throw rpcError;

            const result = data;

            // 2. Map Reward to Virtual Segments (24 segments total)
            const TOTAL_VIRTUAL_SEGMENTS = 24;

            // Try fetch manual layout
            const { data: layoutsArr } = await supabase.from('settings').select('value').eq('key', 'wheel_layout');
            let interlacedWheel: number[] = [];

            if (layoutsArr && layoutsArr.length > 0 && layoutsArr[0].value) {
                try {
                    const manualLayout = JSON.parse(layoutsArr[0].value);
                    if (Array.isArray(manualLayout) && manualLayout.length === TOTAL_VIRTUAL_SEGMENTS) {
                        interlacedWheel = manualLayout.map(id => rewards.findIndex(r => r.id === id)).map(idx => idx === -1 ? 0 : idx);
                    }
                } catch (e) {
                    console.error('Manual layout parse error:', e);
                }
            }

            // Fallback to automatic interlaced distribution
            if (interlacedWheel.length === 0) {
                const totalWeight = rewards.reduce((sum, r) => sum + r.probability_weight, 0);
                let virtualWheel: number[] = [];
                rewards.forEach((reward, index) => {
                    const segmentCount = Math.max(1, Math.round((reward.probability_weight / totalWeight) * TOTAL_VIRTUAL_SEGMENTS));
                    for (let i = 0; i < segmentCount; i++) virtualWheel.push(index);
                });

                while (virtualWheel.length < TOTAL_VIRTUAL_SEGMENTS) virtualWheel.push(0);
                if (virtualWheel.length > TOTAL_VIRTUAL_SEGMENTS) virtualWheel = virtualWheel.slice(0, TOTAL_VIRTUAL_SEGMENTS);

                interlacedWheel = new Array(TOTAL_VIRTUAL_SEGMENTS);
                let currentPos = 0;
                virtualWheel.forEach((val) => {
                    while (interlacedWheel[currentPos] !== undefined) currentPos = (currentPos + 1) % TOTAL_VIRTUAL_SEGMENTS;
                    interlacedWheel[currentPos] = val;
                    currentPos = (currentPos + 7) % TOTAL_VIRTUAL_SEGMENTS;
                });
            }

            // Find all segments containing the winning reward
            const possibleSegments = [];
            for (let i = 0; i < TOTAL_VIRTUAL_SEGMENTS; i++) {
                if (rewards[interlacedWheel[i]]?.id === result.reward_id) {
                    possibleSegments.push(i);
                }
            }

            // Pick a random segment from the possible ones
            const targetSegmentIndex = possibleSegments[Math.floor(Math.random() * possibleSegments.length)];

            // 3. Calculate rotation
            const segmentAngle = 360 / TOTAL_VIRTUAL_SEGMENTS;
            const extraSpins = 360 * 6; // At least 6 full spins
            const centerOfSegment = targetSegmentIndex * segmentAngle;

            // ADD RANDOMNESS: Offset within the segment (+/- 40% of segment width)
            const randomOffset = (Math.random() - 0.5) * segmentAngle * 0.8;
            const finalAngle = centerOfSegment + randomOffset;

            // Rotation math: current + full spins + (360 - offset to bring it to top)
            const newRotation = currentRotationRef.current + extraSpins + (360 - finalAngle);

            currentRotationRef.current = newRotation;
            setRotation(newRotation);

            // 4. Wait for animation to finish (5 seconds as set in CSS/Framer)
            setTimeout(async () => {
                setSpinning(false);
                setSpinResult(result);
                setShowResultModal(true);

                // Fire confetti if won points or text reward
                if (result.points_won > 0 || result.reward_type === 'text') {
                    fireConfetti();
                }

                // Update UI state
                if (!result.used_bonus) {
                    setSpinsLeftToday(prev => Math.max(0, prev - 1));
                }

                // Refresh profile (points and bonus spins)
                const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', profile.id).single();
                if (updatedProfile) setProfile(updatedProfile);

                await fetchSpinHistory(updatedProfile || profile); // Update local history
            }, 5000);

        } catch (err: any) {
            console.error("Spin error:", err);
            setError(err.message || 'Une erreur est survenue lors du tour.');
            setSpinning(false);
        }
    };

    const fireConfetti = () => {
        const duration = 3000;
        const end = Date.now() + duration;

        const frame = () => {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#D4AF37', '#FFFFFF']
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#D4AF37', '#FFFFFF']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };
        frame();
    };


    if (loading) {
        return (
            <div className="min-h-screen text-white flex items-center justify-center font-cinzel">
                <div className="w-12 h-12 border-4 border-luxury-gold/30 border-t-luxury-gold rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen text-white font-inter">

            <div className="pt-28 pb-20 px-4 md:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">

                {/* LEFT COL: Live Feed & History */}
                <div className="w-full lg:w-1/4 space-y-6 order-2 lg:order-1">
                    {/* Spin History */}
                    {profile && (
                        <div className="glass p-6 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-2 mb-4">
                                <HistoryIcon className="text-luxury-gold" size={20} />
                                <h3 className="font-cinzel font-bold text-lg uppercase tracking-wider">Votre Historique</h3>
                            </div>

                            <div className="space-y-3">
                                {spinHistory.length === 0 ? (
                                    <p className="text-gray-500 text-sm italic">Aucun tour récent.</p>
                                ) : (
                                    spinHistory.map(spin => (
                                        <div key={spin.id} className="flex justify-between items-center bg-black/30 p-3 rounded-lg border border-white/5">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-gray-400">
                                                    {new Date(spin.created_at).toLocaleDateString()}
                                                </span>
                                                <span className="text-sm font-bold truncate max-w-[120px]" style={{ color: spin.wheel_rewards?.color || '#fff' }}>
                                                    {spin.wheel_rewards?.label || 'Récompense'}
                                                </span>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                <span className={`font-black text-sm ${spin.points_won > 0 || spin.wheel_rewards?.reward_type === 'text' ? 'text-green-400' : 'text-gray-500'}`}>
                                                    {spin.wheel_rewards?.reward_type === 'text'
                                                        ? 'GAGNÉ'
                                                        : (spin.points_won > 0 ? `+${spin.points_won} pts` : '0 pts')}
                                                </span>
                                                {spin.wheel_rewards?.reward_type === 'text' && (
                                                    <span className="text-[10px] text-gray-400 italic truncate max-w-[80px]">
                                                        {spin.wheel_rewards.reward_value}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Live Feed */}
                    <div className="glass p-6 rounded-2xl border border-white/5 relative overflow-hidden">
                        {/* Glow effect */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-luxury-gold/10 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2"></div>

                        <div className="flex items-center gap-2 mb-4 relative z-10">
                            <Trophy className="text-luxury-gold" size={20} />
                            <h3 className="font-cinzel font-bold text-lg uppercase tracking-wider">Gagnants en direct</h3>
                        </div>

                        <div className="space-y-3 relative z-10">
                            <AnimatePresence initial={false}>
                                {liveFeed.length === 0 ? (
                                    <p className="text-gray-500 text-sm italic">En attente du prochain lancer...</p>
                                ) : (
                                    liveFeed.map((entry, idx) => (
                                        <motion.div
                                            key={`${entry.user_id}-${entry.created_at}`}
                                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, transition: { duration: 0.2 } }}
                                            className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-luxury-gold/10"
                                        >
                                            <img
                                                src={entry.profiles?.avatar_url || 'https://i.postimg.cc/Hx8Y4f2N/default-avatar.png'}
                                                alt="avatar"
                                                className="w-8 h-8 rounded-full border border-white/20 object-cover"
                                            />
                                            <div className="text-right">
                                                <p className={`font-black text-sm ${entry.points_won > 0 || entry.wheel_rewards?.reward_type === 'text' ? 'text-luxury-gold' : 'text-gray-500'}`}>
                                                    {entry.wheel_rewards?.reward_type === 'text'
                                                        ? 'CADEAU !'
                                                        : (entry.points_won > 0 ? `+${entry.points_won} PTS` : '0 PTS')}
                                                </p>
                                                <p className="text-[9px] text-gray-500 uppercase font-bold tracking-tighter">
                                                    {entry.wheel_rewards?.label || 'Récompense'}
                                                </p>
                                            </div>
                                            <div className="text-[10px] text-gray-500 flex flex-col items-end">
                                                <Clock size={10} className="mb-0.5" />
                                                {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* MIDDLE COL: The Wheel Game */}
                <div className="w-full lg:w-2/4 flex flex-col items-center justify-center order-1 lg:order-2 perspective-1000">
                    <div className="text-center mb-8 relative z-10">
                        <h1 className="text-4xl md:text-5xl font-cinzel font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-luxury-goldLight via-luxury-gold to-luxury-gold/70 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] filter">
                            Roue de la Fortune
                        </h1>
                        <p className="text-gray-400 mt-2 font-medium tracking-wide">Tournez pour gagner des points boutique</p>
                        {profile && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mt-4 inline-flex items-center gap-3 bg-luxury-gold/10 border border-luxury-gold/30 px-6 py-2 rounded-full shadow-[0_0_20px_rgba(212,175,55,0.1)]"
                            >
                                <Trophy size={16} className="text-luxury-gold" />
                                <span className="text-sm font-black uppercase tracking-widest text-white">
                                    Votre Solde : <span className="text-luxury-gold">{profile.points || 0} PTS</span>
                                </span>
                            </motion.div>
                        )}
                    </div>

                    <div className="relative w-full max-w-md mx-auto mb-12">
                        <Wheel rewards={rewards} spinning={spinning} rotation={rotation} manualLayout={wheelLayout} />
                    </div>

                    {/* Controls */}
                    <div className="w-full max-w-sm mx-auto flex flex-col items-center relative z-10">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className="w-full p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400"
                            >
                                <AlertTriangle size={20} className="shrink-0" />
                                <p className="text-sm font-medium">{error}</p>
                            </motion.div>
                        )}

                        <div className="glass px-8 py-5 rounded-3xl border border-luxury-gold/30 shadow-[0_0_30px_rgba(212,175,55,0.1)] flex flex-col items-center gap-4 w-full">
                            <div className="flex flex-col items-center gap-1 text-luxury-gold">
                                <div className="flex items-center gap-2">
                                    <RotateCcw size={18} />
                                    <span className="font-bold tracking-wider uppercase text-sm">
                                        {profile ? (
                                            (spinsLeftToday > 0 || profile.bonus_spins > 0)
                                                ? (spinsLeftToday > 0 ? `${spinsLeftToday} TOURS GRATUITS` : 'UTILISATION TOUR BONUS')
                                                : 'LIMITE QUOTIDIENNE ATTEINTE'
                                        ) : 'CONNECTEZ-VOUS'}
                                    </span>
                                </div>
                                {profile?.bonus_spins > 0 && (
                                    <span className="text-[10px] font-black bg-luxury-gold text-black px-2 py-0.5 rounded-full animate-pulse">
                                        + {profile.bonus_spins} TOUR(S) BONUS DISPONIBLES
                                    </span>
                                )}
                            </div>

                            <button
                                onClick={handleSpin}
                                disabled={spinning || !profile || (spinsLeftToday <= 0 && profile.bonus_spins <= 0) || rewards.length === 0}
                                className="w-full py-4 bg-gradient-to-r from-luxury-gold to-luxury-goldLight hover:from-luxury-goldLight hover:to-luxury-gold text-black font-cinzel font-black text-xl tracking-widest uppercase rounded-xl transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:grayscale shadow-[0_0_20px_rgba(212,175,55,0.4)] relative overflow-hidden group"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                <span className="relative z-10">
                                    {spinning ? 'En cours...' : 'TOURNER'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT COL: Leaderboard / Info (Optional/Future expansion) */}
                <div className="w-full lg:w-1/4 order-3 lg:order-3">
                    <div className="glass p-6 text-center rounded-2xl border border-white/5 h-full flex flex-col items-center justify-center gap-4 relative overflow-hidden group hover:border-luxury-gold/30 transition-colors">
                        <div className="absolute inset-0 bg-gradient-to-br from-luxury-gold/5 to-transparent"></div>
                        <Gift size={48} className="text-luxury-gold drop-shadow-[0_0_15px_rgba(212,175,55,0.5)] group-hover:scale-110 transition-transform" />
                        <div className="relative z-10">
                            <h3 className="font-cinzel font-bold text-xl uppercase tracking-widest text-white mb-2">Comment jouer ?</h3>
                            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                                Les points gagnés ici peuvent être utilisés dans la boutique pour obtenir des récompenses exclusives et des rôles spéciaux.
                            </p>
                            <div className="inline-block px-4 py-2 bg-luxury-gold/10 text-luxury-gold rounded-full text-xs font-bold border border-luxury-gold/20 uppercase tracking-wider">
                                1 Tour = {maxSpins > 1 ? `1 des ${maxSpins} quotidiens` : '1 Quotidien'}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Result Modal */}
            <AnimatePresence>
                {showResultModal && spinResult && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 50 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                            className="glass p-2 rounded-3xl max-w-sm w-full relative overflow-hidden border border-luxury-gold/30 shadow-[0_0_50px_rgba(212,175,55,0.2)]"
                        >
                            <div className="absolute top-0 left-0 right-0 h-2" style={{ backgroundColor: spinResult.color || '#D4AF37' }}></div>

                            <div className="p-8 text-center flex flex-col items-center">
                                <div
                                    className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner border-4 border-black"
                                    style={{ backgroundColor: spinResult.color || '#D4AF37' }}
                                >
                                    <Gift size={32} className={spinResult.points_won === 0 ? 'text-gray-300' : 'text-white'} />
                                </div>

                                <h2 className="text-3xl font-cinzel font-black uppercase mb-2 text-white drop-shadow-lg">
                                    {(spinResult.points_won > 0 || spinResult.reward_type === 'text') ? 'FÉLICITATIONS !' : 'DOMMAGE...'}
                                </h2>

                                <p className="text-gray-300 mb-8 font-medium">
                                    Vous êtes tombé sur <br />
                                    <span className="text-2xl font-black block mt-2" style={{ color: spinResult.color || '#D4AF37' }}>
                                        "{spinResult.label}"
                                    </span>
                                </p>

                                <button
                                    onClick={() => setShowResultModal(false)}
                                    className="w-full py-3 bg-white hover:bg-gray-200 text-black font-bold uppercase tracking-widest rounded-xl transition-colors"
                                >
                                    Fermer
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
