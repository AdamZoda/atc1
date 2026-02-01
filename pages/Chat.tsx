
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { Profile } from '../types';
import {
    Send,
    Search,
    MoreVertical,
    User,
    MessageSquare,
    Hash,
    Lock,
    X,
    ChevronLeft,
    Smile,
    Image as ImageIcon,
    PlusCircle,
    UserPlus,
    Users,
    Star,
    CheckCircle,
    Copy,
    Check,
    Trash2,
    Shield
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Message {
    id: string;
    content: string;
    user_id: string;
    room_id: string;
    created_at: string;
    type: 'text' | 'image' | 'system';
    profiles?: Profile;
}

interface Room {
    id: string;
    name: string;
    type: 'general' | 'private' | 'group';
    is_locked: boolean;
    is_public: boolean;
    created_by?: string;
    created_at?: string;
    description?: string;
    participant_name?: string;
    participant_avatar?: string;
    last_message?: string;
    unread_count?: number;
}

const GENERAL_ROOM_ID = '00000000-0000-0000-0000-000000000001';

const Chat: React.FC = () => {
    const { t } = useLanguage();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [activeRoom, setActiveRoom] = useState<Room | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUser, setCurrentUser] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [showProfile, setShowProfile] = useState<Profile | null>(null);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarMenuOpen, setIsSidebarMenuOpen] = useState(false);
    const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isIdModalOpen, setIsIdModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [targetId, setTargetId] = useState('');
    const [newMemberId, setNewMemberId] = useState('');
    const [isSubmittingId, setIsSubmittingId] = useState(false);
    const [idError, setIdError] = useState('');
    const [copiedId, setCopiedId] = useState(false);
    const [isRoomInfoOpen, setIsRoomInfoOpen] = useState(false);
    const [activeRoomParticipants, setActiveRoomParticipants] = useState<any[]>([]);
    const [participantsLoading, setParticipantsLoading] = useState(false);
    const [groupSettingsTab, setGroupSettingsTab] = useState<'info' | 'permissions'>('info');

    // Admin Group creation state (in-chat)
    const [gName, setGName] = useState('');
    const [gDesc, setGDesc] = useState('');
    const [gPublic, setGPublic] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userSearchResults, setUserSearchResults] = useState<Profile[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchUserAndRooms();
    }, []);

    // 1. Subscription for NEW messages and Room updates (Global)
    useEffect(() => {
        const globalChannel = supabase
            .channel('global_chat_updates')
            .on('postgres_changes' as any, {
                event: 'INSERT',
                table: 'chat_messages'
            }, (payload: any) => {
                const msg = payload.new as Message;
                // Update last message in room list for everyone
                setRooms(prev => prev.map(r =>
                    r.id === msg.room_id ? { ...r, last_message: msg.content } : r
                ));
                // If it's for our active room
                if (activeRoom && msg.room_id === activeRoom.id) {
                    fetchMessageWithProfile(msg);
                }
            })
            .on('postgres_changes' as any, {
                event: 'INSERT',
                table: 'chat_rooms'
            }, (payload: any) => {
                const newRoom = payload.new as Room;
                if (newRoom.is_public || newRoom.type === 'general') {
                    fetchUserAndRooms();
                }
            })
            .on('postgres_changes' as any, {
                event: 'UPDATE',
                table: 'chat_rooms'
            }, (payload: any) => {
                const updatedRoom = payload.new as Room;
                if (activeRoom && updatedRoom.id === activeRoom.id) {
                    setActiveRoom(prev => prev ? { ...prev, is_locked: updatedRoom.is_locked, name: updatedRoom.name, description: updatedRoom.description, is_public: updatedRoom.is_public } : null);
                }
                setRooms(prev => prev.map(r => r.id === updatedRoom.id ? { ...r, is_locked: updatedRoom.is_locked, name: updatedRoom.name, description: updatedRoom.description, is_public: updatedRoom.is_public } : r));

                if (updatedRoom.is_public) fetchUserAndRooms();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(globalChannel);
        };
    }, [activeRoom?.id]);

    // 2. Subscription for MY participation (Private chats/Group invites)
    useEffect(() => {
        if (!currentUser) return;

        const participantChannel = supabase
            .channel(`my_participation_${currentUser.id}`)
            .on('postgres_changes' as any, {
                event: 'INSERT',
                table: 'chat_participants',
                filter: `user_id=eq.${currentUser.id}`
            }, () => {
                fetchUserAndRooms();
            })
            .on('postgres_changes' as any, {
                event: 'DELETE',
                table: 'chat_participants',
                filter: `user_id=eq.${currentUser.id}`
            }, () => {
                fetchUserAndRooms();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(participantChannel);
        };
    }, [currentUser?.id]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchUserAndRooms = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            setCurrentUser(profile);

            // Fetch Rooms: We fetch in two steps to be more robust
            // 1. General and Public rooms
            const { data: publicRooms, error: publicError } = await supabase
                .from('chat_rooms')
                .select('*')
                .or('type.eq.general,is_public.eq.true');

            // 2. Private/Group rooms where the user is a participant
            const { data: privateRooms, error: privateError } = await supabase
                .from('chat_participants')
                .select('chat_rooms(*)')
                .eq('user_id', session.user.id)
                .not('chat_rooms.type', 'eq', 'general') // Avoid duplicates
                .not('chat_rooms.is_public', 'eq', 'true');

            if (publicError) console.error('Error fetching public rooms:', publicError);
            if (privateError) console.error('Error fetching private rooms:', privateError);

            let allRoomsData: any[] = [...(publicRooms || [])];

            if (privateRooms) {
                const mappedPrivate = privateRooms
                    .filter(p => p.chat_rooms)
                    .map(p => p.chat_rooms);
                allRoomsData = [...allRoomsData, ...mappedPrivate];
            }

            // Remove duplicates by ID
            const uniqueRooms = Array.from(new Map(allRoomsData.map(item => [item.id, item])).values());

            // Process rooms (fetch participant info for private chats)
            const processedRooms = await Promise.all(uniqueRooms.map(async (room: any) => {
                if (room.type === 'private') {
                    const { data: otherPart } = await supabase
                        .from('chat_participants')
                        .select('profiles(*)')
                        .eq('room_id', room.id)
                        .neq('user_id', session.user.id)
                        .maybeSingle();

                    return {
                        ...room,
                        participant_name: (otherPart as any)?.profiles?.display_name || (otherPart as any)?.profiles?.username || 'Utilisateur inconnu',
                        participant_avatar: (otherPart as any)?.profiles?.avatar_url
                    };
                }
                return room;
            }));

            // Sort: General first, then latest first
            const sorted = processedRooms.sort((a, b) => {
                if (a.id === GENERAL_ROOM_ID) return -1;
                if (b.id === GENERAL_ROOM_ID) return 1;
                return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
            });

            setRooms(sorted);

            if (!activeRoom && sorted.length > 0) {
                const general = sorted.find(r => r.id === GENERAL_ROOM_ID) || sorted[0];
                setActiveRoom(general);
                fetchMessages(general.id);
                fetchActiveRoomParticipants(general.id);
            } else if (activeRoom) {
                fetchActiveRoomParticipants(activeRoom.id);
            }
        } catch (err) {
            console.error('Fatal error in fetchUserAndRooms:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchActiveRoomParticipants = async (roomId: string) => {
        setParticipantsLoading(true);
        try {
            const { data, error } = await supabase
                .from('chat_participants')
                .select('*, profiles(*)')
                .eq('room_id', roomId);

            if (data) {
                setActiveRoomParticipants(data);
            }
        } catch (err) {
            console.error('Error fetching participants:', err);
        } finally {
            setParticipantsLoading(false);
        }
    };

    const fetchMessages = async (roomId: string) => {
        const { data } = await supabase
            .from('chat_messages')
            .select('*, profiles(*)')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true })
            .limit(50);

        if (data) setMessages(data as Message[]);
    };

    const fetchMessageWithProfile = async (msg: Message) => {
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', msg.user_id)
            .single();

        setMessages(prev => [...prev, { ...msg, profiles: profile }]);
    };

    const sendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !activeRoom || !currentUser) return;
        if (activeRoom.is_locked && currentUser.role !== 'admin') return;

        const content = newMessage;
        setNewMessage('');

        const { error } = await supabase
            .from('chat_messages')
            .insert({
                content,
                room_id: activeRoom.id,
                user_id: currentUser.id
            });

        if (error) {
            console.error('Error sending message:', error);
        }
    };

    const searchUsers = async (query: string) => {
        setUserSearchQuery(query);
        if (query.trim().length < 2) {
            setUserSearchResults([]);
            return;
        }
        try {
            let queryBuilder = supabase
                .from('profiles')
                .select('*')
                .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
                .limit(5);

            if (currentUser?.id) {
                queryBuilder = queryBuilder.neq('id', currentUser.id);
            }

            const { data } = await queryBuilder;
            if (data) setUserSearchResults(data);
        } catch (err) {
            console.error('Error searching users:', err);
        }
    };

    const toggleSelectUser = (user: Profile) => {
        if (selectedUsers.some(u => u.id === user.id)) {
            setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
        } else {
            setSelectedUsers(prev => [...prev, user]);
        }
    };

    const startChatById = async () => {
        const id = targetId.trim();
        if (!id) return;

        // Simple UUID validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            setIdError('Format d\'ID invalide (doit être un UUID)');
            return;
        }

        setIsSubmittingId(true);
        setIdError('');

        try {
            if (currentUser && id === currentUser.id) {
                setIdError('Vous ne pouvez pas démarrer une discussion avec vous-même.');
                return;
            }

            // Find user by ID
            const { data: targetUser, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !targetUser) {
                setIdError('Utilisateur introuvable. Vérifiez l\'ID.');
                return;
            }

            const success = await startPrivateChat(targetUser);
            if (success) {
                setIsIdModalOpen(false);
                setTargetId('');
            }
        } catch (err) {
            console.error('Error in startChatById:', err);
            setIdError('Une erreur est survenue lors du démarrage de la discussion.');
        } finally {
            setIsSubmittingId(false);
        }
    };

    const adminCreateGroup = async () => {
        if (!gName.trim() || !currentUser) return;
        setIsSubmittingId(true);

        try {
            const { data: room, error: roomError } = await supabase
                .from('chat_rooms')
                .insert({
                    name: gName,
                    description: gDesc,
                    type: 'group',
                    is_public: gPublic,
                    created_by: currentUser.id
                })
                .select()
                .single();

            if (roomError) throw roomError;

            // Participants
            const participantIds = [currentUser.id, ...selectedUsers.map(u => u.id)];

            const entries = participantIds.map(uid => ({
                room_id: room.id,
                user_id: uid
            }));

            await supabase.from('chat_participants').insert(entries);

            await fetchUserAndRooms(); // Refresh list
            setIsGroupModalOpen(false);
            setGName('');
            setGDesc('');
            setSelectedUsers([]);
            setUserSearchQuery('');
            setGPublic(false);

            // Set active
            setActiveRoom(room);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSubmittingId(false);
        }
    };

    const updateGroup = async () => {
        if (!activeRoom || !gName.trim()) return;
        setIsSubmittingId(true);
        try {
            const { error } = await supabase
                .from('chat_rooms')
                .update({
                    name: gName,
                    description: gDesc,
                    is_public: gPublic
                })
                .eq('id', activeRoom.id);

            if (error) throw error;

            await fetchUserAndRooms();
            setActiveRoom(prev => prev ? { ...prev, name: gName, is_public: gPublic } : null);
            setIsEditModalOpen(false);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSubmittingId(false);
        }
    };

    const deleteGroup = async () => {
        if (!activeRoom || !currentUser || currentUser.role !== 'admin') return;
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce groupe ? Tous les messages seront perdus.')) return;

        setIsSubmittingId(true);
        try {
            await supabase.from('chat_messages').delete().eq('room_id', activeRoom.id);
            await supabase.from('chat_participants').delete().eq('room_id', activeRoom.id);
            const { error } = await supabase.from('chat_rooms').delete().eq('id', activeRoom.id);
            if (error) throw error;

            await fetchUserAndRooms();
            setActiveRoom(null);
            setIsEditModalOpen(false);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSubmittingId(false);
        }
    };

    const addMemberToGroup = async () => {
        if (!activeRoom || !newMemberId.trim()) return;
        setIsSubmittingId(true);
        try {
            // Check if user exists
            const { data: userProfile } = await supabase.from('profiles').select('id').eq('id', newMemberId.trim()).single();
            if (!userProfile) throw new Error('Utilisateur introuvable');

            const { error } = await supabase.from('chat_participants').insert({
                room_id: activeRoom.id,
                user_id: userProfile.id
            });

            if (error) {
                if (error.code === '23505') throw new Error('L\'utilisateur est déjà dans le groupe');
                throw error;
            }

            alert('Membre ajouté !');
            setNewMemberId('');
            fetchActiveRoomParticipants(activeRoom.id);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSubmittingId(false);
        }
    };

    const removeMemberFromGroup = async (userId: string) => {
        if (!activeRoom || !currentUser) return;
        if (!confirm('Retirer cet utilisateur du groupe ?')) return;

        try {
            const { error } = await supabase
                .from('chat_participants')
                .delete()
                .eq('room_id', activeRoom.id)
                .eq('user_id', userId);

            if (error) throw error;

            fetchActiveRoomParticipants(activeRoom.id);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const toggleMemberRole = async (userId: string, currentRole: string) => {
        if (!activeRoom || !currentUser) return;
        const newRole = currentRole === 'admin' ? 'member' : 'admin';
        try {
            const { error } = await supabase
                .from('chat_participants')
                .update({ role: newRole })
                .eq('room_id', activeRoom.id)
                .eq('user_id', userId);

            if (error) throw error;
            fetchActiveRoomParticipants(activeRoom.id);
        } catch (err: any) {
            alert(err.message || 'Erreur lors du changement de rôle. Le champ "role" n\'existe peut-être pas dans la table.');
        }
    };

    const leaveGroup = async () => {
        if (!activeRoom || !currentUser) return;
        if (!confirm('Êtes-vous sûr de vouloir quitter ce groupe ?')) return;

        try {
            const { error } = await supabase
                .from('chat_participants')
                .delete()
                .eq('room_id', activeRoom.id)
                .eq('user_id', currentUser.id);

            if (error) throw error;

            await fetchUserAndRooms();
            setActiveRoom(null);
            setIsRoomInfoOpen(false);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const togglePermission = async (field: string, value: boolean) => {
        if (!activeRoom || !currentUser || (currentUser.role !== 'admin' && activeRoom.created_by !== currentUser.id)) return;

        try {
            const { error } = await supabase
                .from('chat_rooms')
                .update({ [field]: value })
                .eq('id', activeRoom.id);

            if (error) throw error;
            setActiveRoom({ ...activeRoom, [field]: value });
        } catch (err: any) {
            alert(err.message);
        }
    };

    const startPrivateChat = async (targetUser: Profile) => {
        if (!currentUser) return false;
        if (targetUser.id === currentUser.id) return false;

        try {
            // Check if room exists without using RPC (more robust)
            // First get all private rooms the current user is in
            const { data: myParticipants } = await supabase
                .from('chat_participants')
                .select('room_id')
                .eq('user_id', currentUser.id);

            const myRoomIds = myParticipants?.map(p => p.room_id) || [];

            if (myRoomIds.length > 0) {
                // Find if any of these rooms also has the target user
                const { data: sharedParticipants } = await supabase
                    .from('chat_participants')
                    .select('room_id')
                    .in('room_id', myRoomIds)
                    .eq('user_id', targetUser.id);

                if (sharedParticipants && sharedParticipants.length > 0) {
                    // Check which of these are actually private rooms
                    const { data: existingRooms } = await supabase
                        .from('chat_rooms')
                        .select('*')
                        .eq('type', 'private')
                        .in('id', sharedParticipants.map(sp => sp.room_id));

                    if (existingRooms && existingRooms.length > 0) {
                        const roomId = existingRooms[0].id;
                        const existingInState = rooms.find(r => r.id === roomId);

                        if (existingInState) {
                            setActiveRoom(existingInState);
                            fetchMessages(roomId);
                        } else {
                            await fetchUserAndRooms();
                            const { data: refreshedData } = await supabase
                                .from('chat_rooms')
                                .select('*')
                                .eq('id', roomId)
                                .single();

                            if (refreshedData) {
                                const roomObj = {
                                    ...refreshedData,
                                    participant_name: targetUser.display_name || targetUser.username,
                                    participant_avatar: targetUser.avatar_url
                                };
                                setActiveRoom(roomObj as Room);
                                fetchMessages(roomId);
                            }
                        }
                        setIsMobileSidebarOpen(false);
                        setShowProfile(null);
                        return true;
                    }
                }
            }

            // Create new private room if none found
            const { data: newRoom, error: roomError } = await supabase
                .from('chat_rooms')
                .insert({
                    type: 'private',
                    name: `Chat between ${currentUser.display_name || currentUser.username} and ${targetUser.display_name || targetUser.username}`
                })
                .select()
                .single();

            if (roomError) throw roomError;

            if (newRoom) {
                const { error: partError } = await supabase.from('chat_participants').insert([
                    { room_id: newRoom.id, user_id: currentUser.id },
                    { room_id: newRoom.id, user_id: targetUser.id }
                ]);

                if (partError) throw partError;

                const roomObj: Room = {
                    ...newRoom,
                    participant_name: targetUser.display_name || targetUser.username,
                    participant_avatar: targetUser.avatar_url
                };

                setRooms(prev => [roomObj, ...prev]);
                setActiveRoom(roomObj);
                setMessages([]);
                setIsMobileSidebarOpen(false);
                setShowProfile(null);
                return true;
            }
            return false;
        } catch (err: any) {
            console.error('Error starting private chat:', err);
            setIdError(err.message || 'Erreur lors de la création de la discussion');
            return false;
        }
    };

    const filteredRooms = rooms.filter(r => {
        const name = r.type === 'general' ? 'Général' : (r.type === 'private' ? r.participant_name : r.name) || '';
        return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-luxury-dark">
            <div className="w-12 h-12 border-4 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="h-screen pt-24 pb-8 px-4 md:px-8 bg-luxury-dark overflow-hidden">
            <div className="max-w-7xl mx-auto h-full flex glass rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl relative">

                {/* Sidebar */}
                <div className={`
          ${isMobileSidebarOpen ? 'flex' : 'hidden'} md:flex
          flex-col w-full md:w-80 lg:w-96 border-r border-white/5 bg-black/20 backdrop-blur-md
          absolute md:relative inset-0 z-30 md:z-auto
        `}>
                    <div className="p-6 border-b border-white/5">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-cinzel font-black text-white">Discussions</h2>
                            <div className="flex items-center gap-3 relative">
                                <button
                                    onClick={() => setIsIdModalOpen(true)}
                                    className="text-gray-400 hover:text-luxury-gold transition-colors p-1"
                                    title="Nouveau Chat par ID"
                                >
                                    <PlusCircle size={22} />
                                </button>
                                <button
                                    onClick={() => setIsSidebarMenuOpen(!isSidebarMenuOpen)}
                                    className="text-gray-400 hover:text-white transition-colors p-1"
                                >
                                    <MoreVertical size={22} />
                                </button>

                                {/* Dropdown Menu */}
                                <AnimatePresence>
                                    {isSidebarMenuOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsSidebarMenuOpen(false)} />
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                className="absolute top-10 right-0 w-64 glass border border-white/10 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden"
                                            >
                                                <button
                                                    onClick={() => {
                                                        setIsGroupModalOpen(true);
                                                        setIsSidebarMenuOpen(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-5 py-3 text-sm text-white hover:bg-luxury-gold/20 transition-all text-left"
                                                >
                                                    <UserPlus size={18} className="text-luxury-gold" />
                                                    Nouveau groupe
                                                </button>
                                                <button className="w-full flex items-center gap-3 px-5 py-3 text-sm text-white hover:bg-white/5 transition-all text-left">
                                                    <Star size={18} className="text-gray-400" />
                                                    Messages importants
                                                </button>
                                                <button className="w-full flex items-center gap-3 px-5 py-3 text-sm text-white hover:bg-white/5 transition-all text-left">
                                                    <CheckCircle size={18} className="text-gray-400" />
                                                    Sélectionner les discussions
                                                </button>
                                                <button className="w-full flex items-center gap-3 px-5 py-3 text-sm text-white hover:bg-white/5 transition-all text-left">
                                                    <Check size={18} className="text-gray-400" />
                                                    Tout marquer comme lu
                                                </button>
                                                <div className="h-px bg-white/5 my-1" />
                                                <button className="w-full flex items-center gap-3 px-5 py-3 text-sm text-white hover:bg-white/5 transition-all text-left">
                                                    <Lock size={18} className="text-gray-400" />
                                                    Verrouillage de l'application
                                                </button>
                                                <button
                                                    onClick={() => supabase.auth.signOut()}
                                                    className="w-full flex items-center gap-3 px-5 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-all text-left"
                                                >
                                                    <X size={18} />
                                                    Déconnexion
                                                </button>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-luxury-gold/50 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto custom-scrollbar">
                        {filteredRooms.map((room) => (
                            <button
                                key={room.id}
                                onClick={() => {
                                    setActiveRoom(room);
                                    fetchMessages(room.id);
                                    setIsMobileSidebarOpen(false);
                                }}
                                className={`
                  w-full p-4 flex items-center gap-4 transition-all border-b border-white/5
                  ${activeRoom?.id === room.id ? 'bg-luxury-gold/10' : 'hover:bg-white/5'}
                `}
                            >
                                <div className="relative">
                                    {room.type === 'general' ? (
                                        <img
                                            src="https://i.postimg.cc/L4wgGYg6/ATC.png"
                                            className="w-14 h-14 rounded-2xl object-cover border border-luxury-gold/30 shadow-lg shadow-luxury-gold/5"
                                            alt="ATC"
                                        />
                                    ) : room.type === 'group' ? (
                                        <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30">
                                            <MessageSquare size={24} />
                                        </div>
                                    ) : (
                                        <img
                                            src={room.participant_avatar || 'https://i.postimg.cc/L4wgGYg6/ATC.png'}
                                            alt={room.participant_name}
                                            className="w-14 h-14 rounded-2xl object-cover border border-white/10"
                                        />
                                    )}
                                    {(room.id === GENERAL_ROOM_ID || (room as any).is_public) && (
                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-black rounded-full shadow-lg"></div>
                                    )}
                                </div>
                                <div className="flex-grow text-left">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-white truncate max-w-[150px]">
                                            {room.type === 'general' ? 'Chat Général' : (room.type === 'private' ? room.participant_name : room.name)}
                                        </span>
                                        <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                                            {(room.id === GENERAL_ROOM_ID || (room as any).is_public) ? 'Public' : 'Privé'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 truncate">
                                        {room.is_locked ? 'Chat verrouillé par admin' : (room.last_message || 'Dites bonjour !')}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-grow flex flex-col min-w-0 bg-black/10">
                    {activeRoom ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between backdrop-blur-sm z-20">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setIsMobileSidebarOpen(true)}
                                        className="md:hidden text-gray-400 hover:text-white"
                                    >
                                        <ChevronLeft size={24} />
                                    </button>
                                    <div
                                        className="flex items-center gap-4 cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-all"
                                        onClick={() => {
                                            if (activeRoom.type !== 'private') {
                                                setIsRoomInfoOpen(true);
                                                fetchActiveRoomParticipants(activeRoom.id);
                                            } else {
                                                const targetParticipant = activeRoomParticipants.find(p => p.user_id !== currentUser?.id);
                                                if (targetParticipant) setShowProfile(targetParticipant.profiles);
                                            }
                                        }}
                                    >
                                        {activeRoom.type === 'general' ? (
                                            <img
                                                src="https://i.postimg.cc/L4wgGYg6/ATC.png"
                                                className="w-12 h-12 rounded-xl object-cover border border-luxury-gold/30"
                                                alt="ATC"
                                            />
                                        ) : activeRoom.type === 'group' ? (
                                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30">
                                                <MessageSquare size={20} />
                                            </div>
                                        ) : (
                                            <img
                                                src={activeRoom.participant_avatar || 'https://i.postimg.cc/L4wgGYg6/ATC.png'}
                                                alt={activeRoom.participant_name}
                                                className="w-12 h-12 rounded-xl object-cover border border-white/10"
                                            />
                                        )}
                                        <div>
                                            <h3 className="font-bold text-white">
                                                {activeRoom.type === 'general' ? 'Général' : (activeRoom.type === 'private' ? activeRoom.participant_name : activeRoom.name)}
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${activeRoom.is_locked ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                                <span className="text-[10px] text-gray-400 uppercase tracking-[0.2em]">
                                                    {activeRoom.is_locked ? 'Verrouillé' : 'En direct'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button className="text-gray-400 hover:text-white transition-colors">
                                        <Search size={20} />
                                    </button>
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsChatMenuOpen(!isChatMenuOpen)}
                                            className="text-gray-400 hover:text-white transition-colors p-1"
                                        >
                                            <MoreVertical size={20} />
                                        </button>
                                        <AnimatePresence>
                                            {isChatMenuOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setIsChatMenuOpen(false)} />
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                        className="absolute top-10 right-0 w-48 glass border border-white/10 rounded-xl shadow-2xl py-2 z-50 overflow-hidden"
                                                    >
                                                        {currentUser?.role === 'admin' && activeRoom.type === 'group' && (
                                                            <button
                                                                onClick={() => {
                                                                    setGName(activeRoom.name || '');
                                                                    setGDesc(activeRoom.description || '');
                                                                    setGPublic((activeRoom as any).is_public || false);
                                                                    setIsEditModalOpen(true);
                                                                    setIsChatMenuOpen(false);
                                                                }}
                                                                className="w-full flex items-center gap-3 px-5 py-3 text-sm text-white hover:bg-luxury-gold/20 transition-all text-left"
                                                            >
                                                                <Users size={16} className="text-luxury-gold" />
                                                                Modifier le groupe
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                setIsRoomInfoOpen(true);
                                                                setIsChatMenuOpen(false);
                                                                fetchActiveRoomParticipants(activeRoom.id);
                                                            }}
                                                            className="w-full flex items-center gap-3 px-5 py-3 text-sm text-white hover:bg-white/5 transition-all text-left"
                                                        >
                                                            <Lock size={16} className="text-gray-400" />
                                                            Infos du chat
                                                        </button>
                                                        <button className="w-full flex items-center gap-3 px-5 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-all text-left">
                                                            <X size={16} />
                                                            Quitter le chat
                                                        </button>
                                                    </motion.div>
                                                </>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>

                            {/* Main Chat Layout (Messages + Info Panel) */}
                            <div className="flex-grow flex min-h-0 relative">
                                {/* Messages Area */}
                                <div className="flex-grow flex flex-col min-w-0">

                                    {/* Messages Area */}
                                    <div
                                        ref={scrollRef}
                                        className="flex-grow overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar"
                                        style={{ scrollBehavior: 'smooth' }}
                                    >
                                        {messages.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                                                <MessageSquare size={64} className="text-luxury-gold mb-4" />
                                                <p className="font-cinzel text-xl uppercase tracking-widest">Aucun message</p>
                                                <p className="text-sm">Commencez la conversation !</p>
                                            </div>
                                        ) : (
                                            messages.map((msg, idx) => {
                                                const isOwn = msg.user_id === currentUser?.id;
                                                const showAvatar = idx === 0 || messages[idx - 1].user_id !== msg.user_id;

                                                return (
                                                    <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-3`}>
                                                        {!isOwn && (
                                                            <div className="flex-shrink-0 mb-1">
                                                                {showAvatar ? (
                                                                    <button onClick={() => setShowProfile(msg.profiles || null)}>
                                                                        <img
                                                                            src={msg.profiles?.avatar_url || 'https://i.postimg.cc/L4wgGYg6/ATC.png'}
                                                                            alt={msg.profiles?.username}
                                                                            className="w-8 h-8 rounded-lg object-cover border border-white/10 hover:border-luxury-gold/50 transition-all"
                                                                        />
                                                                    </button>
                                                                ) : <div className="w-8" />}
                                                            </div>
                                                        )}
                                                        <div className={`max-w-[75%] md:max-w-[60%] ${isOwn ? 'order-1' : 'order-2'}`}>
                                                            {showAvatar && !isOwn && (
                                                                <span className="text-[10px] text-luxury-gold font-bold uppercase tracking-widest ml-1 mb-1 block">
                                                                    {msg.profiles?.display_name || msg.profiles?.username}
                                                                </span>
                                                            )}
                                                            <div className={`
                            p-4 rounded-2xl text-sm leading-relaxed
                            ${isOwn
                                                                    ? 'bg-luxury-gold text-black font-medium rounded-br-none shadow-[0_0_20px_rgba(212,175,55,0.2)]'
                                                                    : 'glass text-white rounded-bl-none'}
                          `}>
                                                                {msg.content}
                                                                <div className={`text-[9px] mt-2 text-right ${isOwn ? 'text-black/50' : 'text-gray-500'}`}>
                                                                    {format(new Date(msg.created_at), 'HH:mm')}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {isOwn && (
                                                            <div className="flex-shrink-0 mb-1 order-2">
                                                                {showAvatar ? (
                                                                    <img
                                                                        src={currentUser?.avatar_url || 'https://i.postimg.cc/L4wgGYg6/ATC.png'}
                                                                        className="w-8 h-8 rounded-lg object-cover border border-luxury-gold/30"
                                                                        alt="Me"
                                                                    />
                                                                ) : <div className="w-8" />}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Input Area */}
                                    <div className="p-4 md:p-6 border-t border-white/5 backdrop-blur-sm">
                                        {activeRoom.is_locked && currentUser?.role !== 'admin' ? (
                                            <div className="glass p-4 rounded-xl flex items-center justify-center gap-3 text-red-400">
                                                <Lock size={20} />
                                                <span className="font-bold uppercase tracking-widest text-xs">Le chat est actuellement verrouillé par un administrateur</span>
                                            </div>
                                        ) : (
                                            <form onSubmit={sendMessage} className="flex items-center gap-4">
                                                <div className="flex gap-2">
                                                    <button type="button" className="text-gray-400 hover:text-luxury-gold transition-colors">
                                                        <Smile size={24} />
                                                    </button>
                                                    <button type="button" className="text-gray-400 hover:text-luxury-gold transition-colors">
                                                        <ImageIcon size={24} />
                                                    </button>
                                                </div>
                                                <div className="flex-grow relative">
                                                    <input
                                                        type="text"
                                                        placeholder="Écrivez votre message..."
                                                        value={newMessage}
                                                        onChange={(e) => setNewMessage(e.target.value)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-6 text-white placeholder:text-gray-500 focus:outline-none focus:border-luxury-gold/50 transition-all font-light"
                                                    />
                                                </div>
                                                <button
                                                    type="submit"
                                                    disabled={!newMessage.trim()}
                                                    className={`
                        w-12 h-12 rounded-xl flex items-center justify-center transition-all
                        ${newMessage.trim()
                                                            ? 'bg-luxury-gold text-black shadow-[0_0_15px_rgba(212,175,55,0.4)] hover:scale-105'
                                                            : 'bg-white/5 text-gray-600'}
                      `}
                                                >
                                                    <Send size={20} />
                                                </button>
                                            </form>
                                        )}
                                    </div>
                                </div>

                                {/* Room Info Side Panel (WhatsApp Style) */}
                                <AnimatePresence>
                                    {isRoomInfoOpen && (
                                        <motion.div
                                            initial={{ x: '100%' }}
                                            animate={{ x: 0 }}
                                            exit={{ x: '100%' }}
                                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                            className="absolute md:relative right-0 top-0 bottom-0 w-full md:w-80 lg:w-96 bg-black/40 backdrop-blur-xl border-l border-white/5 z-40 flex flex-col"
                                        >
                                            {/* Header */}
                                            <div className="p-6 flex items-center gap-4 border-b border-white/5 bg-black/20">
                                                <button
                                                    onClick={() => setIsRoomInfoOpen(false)}
                                                    className="text-gray-400 hover:text-white transition-colors"
                                                >
                                                    <ChevronLeft size={24} />
                                                </button>
                                                <h3 className="font-bold text-white uppercase tracking-widest text-sm">Infos du {activeRoom.type === 'group' ? 'groupe' : 'chat'}</h3>
                                            </div>

                                            <div className="flex-grow overflow-y-auto custom-scrollbar">
                                                {/* Profile Section */}
                                                <div className="p-8 flex flex-col items-center border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                                                    <div className="relative group mb-6">
                                                        {activeRoom.type === 'general' ? (
                                                            <img
                                                                src="https://i.postimg.cc/L4wgGYg6/ATC.png"
                                                                className="w-40 h-40 rounded-[3rem] object-cover border-2 border-luxury-gold/30 shadow-2xl"
                                                                alt="ATC"
                                                            />
                                                        ) : activeRoom.type === 'group' ? (
                                                            <div className="w-40 h-40 rounded-[3rem] bg-blue-500/20 flex items-center justify-center text-blue-400 border-2 border-blue-500/30 shadow-2xl">
                                                                <MessageSquare size={64} />
                                                            </div>
                                                        ) : (
                                                            <img
                                                                src={activeRoom.participant_avatar || 'https://i.postimg.cc/L4wgGYg6/ATC.png'}
                                                                className="w-40 h-40 rounded-[3rem] object-cover border-2 border-white/10 shadow-2xl"
                                                                alt="Avatar"
                                                            />
                                                        )}
                                                        {currentUser?.role === 'admin' && activeRoom.type !== 'general' && (
                                                            <button
                                                                onClick={() => setIsEditModalOpen(true)}
                                                                className="absolute bottom-2 right-2 w-10 h-10 bg-luxury-gold text-black rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
                                                            >
                                                                <ImageIcon size={20} />
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="text-center group w-full">
                                                        <div className="flex items-center justify-center gap-2 mb-2">
                                                            <h2 className="text-2xl font-black text-white uppercase tracking-wider">
                                                                {activeRoom.type === 'general' ? 'Chat Général' : activeRoom.name || activeRoom.participant_name}
                                                            </h2>
                                                            {(currentUser?.role === 'admin' || activeRoom.created_by === currentUser?.id) && activeRoom.type === 'group' && (
                                                                <button onClick={() => setIsEditModalOpen(true)} className="text-gray-500 hover:text-luxury-gold"><ImageIcon size={16} /></button>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-4">
                                                            {activeRoom.type === 'group' ? `Groupe • ${activeRoomParticipants.length} membres` : 'Discussion Privée'}
                                                        </p>

                                                        <div className="flex gap-4 justify-center">
                                                            <button
                                                                onClick={() => {
                                                                    if (activeRoom.type === 'group') {
                                                                        // Add member logic
                                                                        setIsEditModalOpen(true);
                                                                    }
                                                                }}
                                                                className="flex flex-col items-center gap-2 p-4 glass rounded-2xl hover:bg-white/10 transition-all min-w-[100px]"
                                                            >
                                                                <div className="w-10 h-10 bg-luxury-gold/20 rounded-xl flex items-center justify-center text-luxury-gold">
                                                                    <UserPlus size={20} />
                                                                </div>
                                                                <span className="text-[10px] font-black uppercase tracking-tighter">Ajouter</span>
                                                            </button>
                                                            <button className="flex flex-col items-center gap-2 p-4 glass rounded-2xl hover:bg-white/10 transition-all min-w-[100px]">
                                                                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-400">
                                                                    <Search size={20} />
                                                                </div>
                                                                <span className="text-[10px] font-black uppercase tracking-tighter">Rechercher</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Description & ID Section */}
                                                {(activeRoom.description || activeRoom.type !== 'general') && (
                                                    <div className="p-6 border-b border-white/5 space-y-4">
                                                        <div>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <p className="text-[10px] font-black text-luxury-gold uppercase tracking-widest">Description</p>
                                                                {(currentUser?.role === 'admin' || activeRoom.created_by === currentUser?.id) && (activeRoom.type === 'group') && (
                                                                    <button onClick={() => setIsEditModalOpen(true)} className="text-gray-500 hover:text-white"><ImageIcon size={14} /></button>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-gray-300 leading-relaxed italic">
                                                                {activeRoom.description || "Aucune description fournie."}
                                                            </p>
                                                        </div>

                                                        <div className="pt-4 border-t border-white/5">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Identifiant du {activeRoom.type === 'group' ? 'groupe' : 'chat'}</p>
                                                                <button
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(activeRoom.id);
                                                                        setCopiedId(true);
                                                                        setTimeout(() => setCopiedId(false), 2000);
                                                                    }}
                                                                    className="text-luxury-gold hover:text-white flex items-center gap-1 transition-all"
                                                                >
                                                                    {copiedId ? <Check size={12} /> : <Copy size={12} />}
                                                                    <span className="text-[10px] font-bold uppercase tracking-widest">{copiedId ? 'Copié' : 'Copier'}</span>
                                                                </button>
                                                            </div>
                                                            <p className="text-[9px] font-mono text-gray-400 truncate opacity-50">{activeRoom.id}</p>
                                                        </div>

                                                        {activeRoom.type === 'group' && (
                                                            <p className="text-[10px] text-gray-600 mt-2 uppercase tracking-tighter font-bold">
                                                                Créé par {activeRoom.created_by === currentUser?.id ? 'vous' : 'un administrateur'}, le {format(new Date(activeRoom.created_at || Date.now()), 'dd/MM/yyyy', { locale: fr })}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Permissions Switchers (WhatsApp Style) */}
                                                {(currentUser?.role === 'admin' || activeRoom.created_by === currentUser?.id) && activeRoom.type === 'group' && (
                                                    <div className="p-6 border-b border-white/5 space-y-4">
                                                        <p className="text-[10px] font-black text-luxury-gold uppercase tracking-widest mb-4">Autorisations du groupe</p>

                                                        <div className="flex items-center justify-between">
                                                            <div className="flex gap-3 items-center">
                                                                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400"><Lock size={16} /></div>
                                                                <div>
                                                                    <p className="text-xs font-bold text-white">Verrouiller le chat</p>
                                                                    <p className="text-[10px] text-gray-500">Seuls les admins peuvent parler.</p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => togglePermission('is_locked', !activeRoom.is_locked)}
                                                                className={`w-10 h-5 rounded-full relative transition-all ${activeRoom.is_locked ? 'bg-luxury-gold' : 'bg-white/10'}`}
                                                            >
                                                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${activeRoom.is_locked ? 'left-6' : 'left-1'}`} />
                                                            </button>
                                                        </div>

                                                        <div className="flex items-center justify-between">
                                                            <div className="flex gap-3 items-center">
                                                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400"><Users size={16} /></div>
                                                                <div>
                                                                    <p className="text-xs font-bold text-white">Groupe Public</p>
                                                                    <p className="text-[10px] text-gray-500">Visible par tout le monde.</p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => togglePermission('is_public', !activeRoom.is_public)}
                                                                className={`w-10 h-5 rounded-full relative transition-all ${activeRoom.is_public ? 'bg-luxury-gold' : 'bg-white/10'}`}
                                                            >
                                                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${activeRoom.is_public ? 'left-6' : 'left-1'}`} />
                                                            </button>
                                                        </div>

                                                        <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
                                                            <div className="flex gap-3 items-center">
                                                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400"><Shield size={16} /></div>
                                                                <div>
                                                                    <p className="text-xs font-bold text-white">Chiffrement E2E</p>
                                                                    <p className="text-[10px] text-gray-500">Activé par défaut</p>
                                                                </div>
                                                            </div>
                                                            <button className="w-10 h-5 rounded-full bg-luxury-gold/20 relative"><div className="absolute top-1 left-6 w-3 h-3 rounded-full bg-luxury-gold" /></button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Participants List */}
                                                <div className="p-6">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <p className="text-[10px] font-black text-luxury-gold uppercase tracking-widest">{activeRoomParticipants.length} membres</p>
                                                        <button className="text-gray-500 hover:text-white"><Search size={16} /></button>
                                                    </div>

                                                    <div className="space-y-4">
                                                        {activeRoom.type === 'group' && (
                                                            <button
                                                                onClick={() => setIsEditModalOpen(true)}
                                                                className="w-full flex items-center gap-4 p-2 hover:bg-white/5 rounded-2xl transition-all group"
                                                            >
                                                                <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center text-green-400 group-hover:scale-110 transition-transform">
                                                                    <UserPlus size={20} />
                                                                </div>
                                                                <span className="text-sm font-bold text-white transition-colors group-hover:text-green-400">Ajouter un membre</span>
                                                            </button>
                                                        )}

                                                        {activeRoomParticipants.map((part) => (
                                                            <div
                                                                key={part.id}
                                                                className="flex items-center justify-between group cursor-pointer hover:bg-white/5 p-2 rounded-2xl transition-all"
                                                                onClick={() => setShowProfile(part.profiles)}
                                                            >
                                                                <div className="flex items-center gap-4 flex-grow">
                                                                    <div className="relative">
                                                                        <img
                                                                            src={part.profiles?.avatar_url || 'https://i.postimg.cc/L4wgGYg6/ATC.png'}
                                                                            className="w-12 h-12 rounded-2xl object-cover border border-white/10"
                                                                            alt="Avatar"
                                                                        />
                                                                        {part.profiles?.is_online && (
                                                                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-black rounded-full shadow-lg"></div>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-bold text-white group-hover:text-luxury-gold transition-colors">
                                                                            {part.user_id === currentUser?.id ? 'Vous' : part.profiles?.display_name || part.profiles?.username}
                                                                        </p>
                                                                        <p className="text-[10px] text-gray-500 tracking-wider">
                                                                            {part.profiles?.is_online ? 'En ligne' : 'Déconnecté'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {(activeRoom.created_by === part.user_id || part.profiles?.role === 'admin' || part.role === 'admin') && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if ((currentUser?.role === 'admin' || activeRoom.created_by === currentUser?.id) && part.user_id !== activeRoom.created_by) {
                                                                                    toggleMemberRole(part.user_id, part.role);
                                                                                }
                                                                            }}
                                                                            className={`text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-widest border transition-all ${part.role === 'admin' || activeRoom.created_by === part.user_id ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-white/5 text-gray-500 border-white/10'}`}
                                                                        >
                                                                            Admin
                                                                        </button>
                                                                    )}
                                                                    {(currentUser?.role === 'admin' || activeRoom.created_by === currentUser?.id) && part.user_id !== currentUser?.id && part.user_id !== activeRoom.created_by && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                removeMemberFromGroup(part.user_id);
                                                                            }}
                                                                            className="p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                                                            title="Retirer du groupe"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Danger Zone */}
                                                <div className="p-6 mt-4 pb-12">
                                                    <button
                                                        onClick={leaveGroup}
                                                        className="w-full flex items-center gap-4 p-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-[1.5rem] transition-all font-bold uppercase tracking-widest text-[10px] border border-red-500/20"
                                                    >
                                                        <Trash2 size={16} /> Quitter le groupe
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-30 select-none">
                            <MessageSquare size={80} className="text-luxury-gold mb-6 animate-pulse" />
                            <h2 className="font-cinzel text-3xl font-black text-white uppercase tracking-[0.3em] mb-4">Chat NUPSIA</h2>
                            <p className="max-w-md text-sm leading-relaxed">
                                Connectez-vous avec les autres citoyens de NUPSIA en temps réel.
                                Sélectionnez une discussion pour commencer.
                            </p>
                        </div>
                    )}
                </div>

                {/* Profile Modal */}
                <AnimatePresence>
                    {showProfile && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-xl bg-black/60"
                            onClick={() => setShowProfile(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                className="w-full max-w-sm glass rounded-[2.5rem] overflow-hidden border border-white/10 p-1"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="relative h-40 rounded-[2.2rem] overflow-hidden mb-[-4rem]">
                                    <img
                                        src={showProfile.avatar_url || 'https://i.postimg.cc/L4wgGYg6/ATC.png'}
                                        className="w-full h-full object-cover blur-lg opacity-40"
                                        alt="Cover"
                                    />
                                    <button
                                        onClick={() => setShowProfile(null)}
                                        className="absolute top-6 right-6 w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-all z-10"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="px-8 pb-10 pt-4 text-center">
                                    <div className="relative inline-block mb-6">
                                        <img
                                            src={showProfile.avatar_url || 'https://i.postimg.cc/L4wgGYg6/ATC.png'}
                                            alt={showProfile.username}
                                            className="w-32 h-32 rounded-[2rem] object-cover border-4 border-luxury-dark shadow-2xl"
                                        />
                                        <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-luxury-dark ${showProfile.is_online ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                                    </div>

                                    <h3 className="text-2xl font-cinzel font-black text-white mb-1 uppercase tracking-wider">
                                        {showProfile.display_name || showProfile.username}
                                    </h3>
                                    <p className="text-luxury-gold text-xs font-bold uppercase tracking-widest mb-6">
                                        {showProfile.role === 'admin' ? 'Administrateur' : 'Citoyen'}
                                    </p>

                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <div className="glass p-4 rounded-2xl">
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Status</p>
                                            <p className="text-xs font-bold text-white">{showProfile.is_online ? 'En ligne' : 'Déconnecté'}</p>
                                        </div>
                                        <div className="glass p-4 rounded-2xl overflow-hidden">
                                            <div className="flex justify-between items-center mb-1">
                                                <p className="text-[10px] text-gray-500 uppercase tracking-widest">ID</p>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(showProfile.id);
                                                        setCopiedId(true);
                                                        setTimeout(() => setCopiedId(false), 2000);
                                                    }}
                                                    className="text-luxury-gold hover:text-white"
                                                >
                                                    {copiedId ? <Check size={10} /> : <Copy size={10} />}
                                                </button>
                                            </div>
                                            <p className="text-[9px] font-mono text-white truncate">{showProfile.id}</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => startPrivateChat(showProfile)}
                                        className="w-full py-4 bg-luxury-gold text-black font-black rounded-2xl uppercase tracking-widest shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.02] active:scale-95 transition-all text-sm"
                                    >
                                        Envoyer un message privé
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Modal: New Chat by ID */}
                <AnimatePresence>
                    {isIdModalOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-xl bg-black/60"
                            onClick={() => setIsIdModalOpen(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                className="w-full max-w-md glass rounded-[2.5rem] border border-white/10 p-8"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-2xl font-cinzel font-black text-white uppercase tracking-wider">Nouveau Chat</h3>
                                    <button onClick={() => setIsIdModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
                                </div>

                                <p className="text-sm text-gray-400 mb-6">Entrez l'identifiant (ID) du citoyen pour démarrer une conversation privée.</p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Identifiant (UUID)</label>
                                        <input
                                            type="text"
                                            value={targetId}
                                            onChange={(e) => {
                                                setTargetId(e.target.value);
                                                setIdError('');
                                            }}
                                            placeholder="00000000-0000-0000-0000-000000000000"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:border-luxury-gold outline-none transition-all"
                                        />
                                        {idError && <p className="text-red-400 text-[10px] mt-2 font-bold uppercase tracking-wider">{idError}</p>}
                                    </div>

                                    <button
                                        onClick={startChatById}
                                        disabled={isSubmittingId || !targetId.trim()}
                                        className="w-full py-4 bg-luxury-gold text-black font-black rounded-xl uppercase tracking-widest shadow-lg disabled:opacity-50 hover:bg-luxury-goldLight transition-all"
                                    >
                                        {isSubmittingId ? 'Recherche...' : 'Démarrer la discussion'}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Modal: Admin New Group */}
                <AnimatePresence>
                    {isGroupModalOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-xl bg-black/60"
                            onClick={() => setIsGroupModalOpen(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                className="w-full max-w-md glass rounded-[2.5rem] border border-white/10 p-8"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-2xl font-cinzel font-black text-white uppercase tracking-wider text-luxury-gold">Créer un Groupe</h3>
                                    <button onClick={() => setIsGroupModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Nom du Groupe</label>
                                        <input
                                            type="text"
                                            value={gName}
                                            onChange={(e) => setGName(e.target.value)}
                                            placeholder="Ex: Staff Atlantic"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-luxury-gold outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Description</label>
                                        <textarea
                                            value={gDesc}
                                            onChange={(e) => setGDesc(e.target.value)}
                                            placeholder="Objectif du groupe..."
                                            className="w-full h-24 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-luxury-gold outline-none transition-all resize-none"
                                        />
                                    </div>

                                    <div className="relative">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Ajouter des Participants</label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                            <input
                                                type="text"
                                                value={userSearchQuery}
                                                onChange={(e) => searchUsers(e.target.value)}
                                                placeholder="Rechercher par pseudo..."
                                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-luxury-gold outline-none transition-all"
                                            />
                                        </div>

                                        {/* Search Results */}
                                        <AnimatePresence>
                                            {userSearchResults.length > 0 && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="absolute z-10 w-full mt-2 glass border border-white/10 rounded-xl overflow-hidden shadow-2xl"
                                                >
                                                    {userSearchResults.map(user => (
                                                        <button
                                                            key={user.id}
                                                            onClick={() => {
                                                                toggleSelectUser(user);
                                                                setUserSearchQuery('');
                                                                setUserSearchResults([]);
                                                            }}
                                                            className="w-full flex items-center gap-3 p-3 hover:bg-white/5 text-left transition-all"
                                                        >
                                                            <img src={user.avatar_url || 'https://i.postimg.cc/L4wgGYg6/ATC.png'} className="w-8 h-8 rounded-lg object-cover" alt="" />
                                                            <div className="flex-grow">
                                                                <p className="text-sm font-bold text-white">{user.display_name || user.username}</p>
                                                                <p className="text-[10px] text-gray-500">@{user.username}</p>
                                                            </div>
                                                            {selectedUsers.some(u => u.id === user.id) ? (
                                                                <CheckCircle className="text-luxury-gold" size={18} />
                                                            ) : (
                                                                <PlusCircle className="text-gray-600" size={18} />
                                                            )}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Selected Users Chips */}
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {selectedUsers.map(user => (
                                                <div key={user.id} className="flex items-center gap-2 bg-luxury-gold/20 text-luxury-gold px-3 py-1.5 rounded-full text-xs font-bold border border-luxury-gold/30">
                                                    <span>{user.username}</span>
                                                    <button onClick={() => toggleSelectUser(user)} className="hover:text-white"><X size={14} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 glass rounded-xl border border-white/5">
                                        <div>
                                            <p className="text-xs font-bold text-white mb-1">Visibilité Publique</p>
                                            <p className="text-[10px] text-gray-400">Tout le monde pourra voir et rejoindre.</p>
                                        </div>
                                        <button
                                            onClick={() => setGPublic(!gPublic)}
                                            className={`w-12 h-6 rounded-full relative transition-all ${gPublic ? 'bg-luxury-gold' : 'bg-white/10'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${gPublic ? 'left-7' : 'left-1'}`} />
                                        </button>
                                    </div>

                                    <button
                                        onClick={adminCreateGroup}
                                        disabled={isSubmittingId || !gName.trim()}
                                        className="w-full py-4 bg-luxury-gold text-black font-black rounded-xl uppercase tracking-widest shadow-lg disabled:opacity-50 hover:bg-luxury-goldLight transition-all"
                                    >
                                        {isSubmittingId ? 'Création...' : 'Créer le Groupe'}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Modal: Admin Edit Group */}
                <AnimatePresence>
                    {isEditModalOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-xl bg-black/60"
                            onClick={() => setIsEditModalOpen(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                className="w-full max-w-md glass rounded-[2.5rem] border border-white/10 p-8"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-2xl font-cinzel font-black text-white uppercase tracking-wider text-luxury-gold">Modifier le Groupe</h3>
                                    <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Nom du Groupe</label>
                                        <input
                                            type="text"
                                            value={gName}
                                            onChange={(e) => setGName(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-luxury-gold outline-none transition-all"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-4 glass rounded-[1.25rem] border border-white/5 bg-white/5">
                                        <div>
                                            <p className="text-xs font-bold text-white mb-1">Visibilité Publique</p>
                                            <p className="text-[10px] text-gray-400 font-medium">Tout le monde pourra voir et rejoindre.</p>
                                        </div>
                                        <button
                                            onClick={() => setGPublic(!gPublic)}
                                            className={`w-12 h-6 rounded-full relative transition-all duration-300 ${gPublic ? 'bg-luxury-gold shadow-[0_0_10px_rgba(212,175,55,0.4)]' : 'bg-white/10'}`}
                                        >
                                            <motion.div
                                                animate={{ x: gPublic ? 24 : 0 }}
                                                className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm"
                                            />
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-white/5">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Ajouter un membre</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                        <input
                                            type="text"
                                            value={userSearchQuery}
                                            onChange={(e) => searchUsers(e.target.value)}
                                            placeholder="Rechercher par pseudo..."
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white text-xs focus:border-luxury-gold outline-none transition-all"
                                        />

                                        <AnimatePresence>
                                            {userSearchResults.length > 0 && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className="absolute z-20 w-full mt-2 glass border border-white/10 rounded-xl overflow-hidden shadow-2xl"
                                                >
                                                    {userSearchResults.map(user => (
                                                        <button
                                                            key={user.id}
                                                            onClick={async () => {
                                                                setNewMemberId(user.id);
                                                                setUserSearchQuery('');
                                                                setUserSearchResults([]);
                                                                // Fast add
                                                                if (activeRoom) {
                                                                    const { error } = await supabase.from('chat_participants').insert({
                                                                        room_id: activeRoom.id,
                                                                        user_id: user.id
                                                                    });
                                                                    if (error) {
                                                                        if (error.code === '23505') alert('Déjà dans le groupe');
                                                                        else alert(error.message);
                                                                    } else {
                                                                        fetchActiveRoomParticipants(activeRoom.id);
                                                                    }
                                                                }
                                                            }}
                                                            className="w-full flex items-center gap-3 p-3 hover:bg-white/5 text-left transition-all"
                                                        >
                                                            <img src={user.avatar_url || 'https://i.postimg.cc/L4wgGYg6/ATC.png'} className="w-8 h-8 rounded-lg object-cover" alt="" />
                                                            <p className="text-xs font-bold text-white">{user.display_name || user.username}</p>
                                                            <PlusCircle className="ml-auto text-luxury-gold" size={16} />
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-8">
                                    <button
                                        onClick={deleteGroup}
                                        className="px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all flex items-center justify-center border border-red-500/20"
                                        title="Supprimer le groupe"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                    <button
                                        onClick={updateGroup}
                                        disabled={isSubmittingId || !gName.trim()}
                                        className="flex-1 py-4 bg-luxury-gold text-black font-black rounded-xl uppercase tracking-widest shadow-lg disabled:opacity-50 hover:bg-luxury-goldLight transition-all"
                                    >
                                        {isSubmittingId ? 'Mise à jour...' : 'Sauvegarder'}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Chat;
