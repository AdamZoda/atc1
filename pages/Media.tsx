
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { Post, Comment } from '../types';
import { Play, Image as ImageIcon, FileText, Calendar, AlertCircle, Send, Trash2, ChevronLeft, ChevronRight, Layers, Heart } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { toast } from 'sonner';
import AccessControl from '../components/AccessControl';

const Media: React.FC = () => {
  return (
    <AccessControl pageName="Gallery">
      <MediaContent />
    </AccessControl>
  );
};

const MediaContent: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoErrors, setVideoErrors] = useState<Record<number, boolean>>({});
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { t } = useLanguage();

  const DEFAULT_AVATAR = 'https://i.postimg.cc/rF1jc0R2/depositphotos-51405259-stock-illustration-male-avatar-profile-picture-use.jpg';

  const navigate = useNavigate();
  useEffect(() => {
    fetchPosts();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
        return;
      }
      setSession(session);
      fetchProfile(session.user.id);
    });
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data) setProfile(data);
  };

  useEffect(() => {
    if (selectedPost) {
      fetchComments(selectedPost.id);
    }
  }, [selectedPost]);

  const fetchPosts = async () => {
    try {
      const { data: postsData, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (postsData) {
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        // Fetch user's likes
        let likedPostIds = new Set();
        if (currentSession) {
          const { data: likesData, error: likesError } = await supabase
            .from('post_likes')
            .select('post_id')
            .eq('user_id', currentSession.user.id);

          if (!likesError) {
            likedPostIds = new Set(likesData?.map(l => l.post_id) || []);
          }
        }

        // Fetch global like counts
        const { data: allLikes, error: allLikesError } = await supabase
          .from('post_likes')
          .select('post_id');

        const countsMap: Record<number, number> = {};
        if (!allLikesError && allLikes) {
          allLikes.forEach(l => {
            countsMap[l.post_id] = (countsMap[l.post_id] || 0) + 1;
          });
        }

        setPosts(postsData.map(post => ({
          ...post,
          likes_count: countsMap[post.id] || 0,
          is_liked_by_me: likedPostIds.has(post.id)
        })));
      }
    } catch (err) {
      console.error("Error fetching gallery posts:", err);
      toast.error("Impossible de charger la galerie");
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (postId: number) => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) {
      toast.error("Veuillez vous connecter pour aimer cet article");
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (post.is_liked_by_me) {
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .match({ user_id: currentSession.user.id, post_id: postId });

      if (!error) {
        const update = (p: Post) => p.id === postId
          ? { ...p, is_liked_by_me: false, likes_count: Math.max(0, (p.likes_count || 1) - 1) }
          : p;

        setPosts(prev => prev.map(update));
        if (selectedPost?.id === postId) {
          setSelectedPost(prev => prev ? update(prev) : null);
        }
      } else {
        console.error("Error unliking:", error);
        toast.error("Échec de la suppression du like");
      }
    } else {
      const { error } = await supabase
        .from('post_likes')
        .insert({ user_id: currentSession.user.id, post_id: postId });

      if (!error) {
        const update = (p: Post) => p.id === postId
          ? { ...p, is_liked_by_me: true, likes_count: (p.likes_count || 0) + 1 }
          : p;

        setPosts(prev => prev.map(update));
        if (selectedPost?.id === postId) {
          setSelectedPost(prev => prev ? update(prev) : null);
        }
        toast.success("Aimé ! ❤️");
      } else {
        console.error("Error liking:", error);
        toast.error("Échec du like (vérifiez votre connexion)");
      }
    }
  };

  const handleVideoError = (postId: number) => {
    console.error(`Erreur chargement vidéo pour post ${postId}`);
    setVideoErrors(prev => ({ ...prev, [postId]: true }));
  };

  const fetchComments = async (postId: number) => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (data) {
      const userIds = Array.from(new Set(data.map((c: any) => c.user_id).filter(id => !!id)));

      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', userIds);

        profiles?.forEach(p => {
          profilesMap[p.id] = p;
        });
      }

      const commentsWithProfiles = data.map((comment: any) => {
        const uProfile = profilesMap[comment.user_id];
        return {
          ...comment,
          username: uProfile?.display_name || uProfile?.username || 'Anonymous',
          avatar_url: uProfile?.avatar_url || DEFAULT_AVATAR
        };
      });
      setComments(commentsWithProfiles);
    }
  };

  const addComment = async () => {
    if (!session || !selectedPost || !commentText.trim()) return;

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: selectedPost.id,
        user_id: session.user.id,
        content: commentText,
      })
      .select();

    if (data) {
      setCommentText('');
      fetchComments(selectedPost.id);
    }
  };

  const deleteComment = async (commentId: number) => {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (!error) {
      fetchComments(selectedPost!.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pt-28 md:pt-32 lg:pt-36 pb-24 bg-luxury-dark min-h-screen"
    >
      <div className="max-w-7xl mx-auto px-6">
        <header className="mb-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="font-cinzel text-4xl md:text-5xl font-black mb-4">{t('media.title')} <span className="text-luxury-gold">MEDIA</span></h2>
              <p className="text-gray-400 font-light">{t('media.subtitle')}</p>
            </div>
            <div className="flex gap-4">
              <button className="px-6 py-3 glass rounded-xl text-sm font-bold uppercase tracking-widest hover:text-luxury-gold transition-colors">{t('common.image')}</button>
              <button className="px-6 py-3 glass rounded-xl text-sm font-bold uppercase tracking-widest hover:text-luxury-gold transition-colors">{t('common.video')}</button>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="glass aspect-video rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="glass rounded-[3rem] p-20 text-center">
            <p className="text-gray-500 font-cinzel text-xl uppercase tracking-widest">{t('media.noMedia')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setSelectedPost(post)}
                  className="glass rounded-2xl overflow-hidden group border border-white/5 hover:border-luxury-gold/50 transition-all duration-500 cursor-pointer hover:scale-105"
                >
                  <div className="relative aspect-video bg-black/50 overflow-hidden">
                    {post.media_type === 'image' ? (
                      <div className="w-full h-full relative">
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
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/300?text=Image';
                          }}
                        />
                        {post.media_url.startsWith('[') && (
                          <div className="absolute top-3 right-3 p-1.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-luxury-gold">
                            <Layers size={14} />
                          </div>
                        )}
                      </div>
                    ) : post.media_type === 'video' ? (
                      <div className="relative w-full h-full bg-black flex items-center justify-center">
                        {videoErrors[post.id] ? (
                          <AlertCircle size={32} className="text-red-400" />
                        ) : (
                          <>
                            <video
                              key={post.id}
                              src={post.media_url}
                              className="w-full h-full object-cover"
                              muted
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-all">
                              <div className="w-12 h-12 rounded-full bg-luxury-gold/80 flex items-center justify-center">
                                <Play size={20} className="text-black fill-black ml-0.5" />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/5">
                        <FileText size={32} className="text-luxury-gold" />
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-cinzel font-bold text-white truncate">{post.title}</h3>
                      <p className="text-gray-500 text-[10px] mt-0.5 line-clamp-1">{post.content}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(post.id);
                        }}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors group/heart-btn"
                      >
                        <Heart
                          size={16}
                          className={`${post.is_liked_by_me ? 'fill-red-500 text-red-500' : 'group-hover/heart-btn:text-red-400/70'} transition-all`}
                        />
                      </button>
                      <span className="text-[10px] font-bold">{post.likes_count || 0}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Modal au clic */}
            {selectedPost && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedPost(null)}
                className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-[95vw] h-[92vh] glass rounded-[2rem] overflow-hidden border border-white/10 flex flex-col lg:flex-row shadow-2xl relative"
                >
                  {/* Media Section - 75% of width for ultra immersion */}
                  <div className="relative w-full lg:w-[75%] bg-[#020202] flex items-center justify-center flex-shrink-0 min-h-[50vh] lg:min-h-0 border-b lg:border-b-0 lg:border-r border-white/5">
                    {selectedPost.media_type === 'image' ? (
                      <div className="relative w-full h-full flex items-center justify-center group/carousel">
                        {(() => {
                          let images: string[] = [];
                          try {
                            if (selectedPost.media_url.startsWith('[')) {
                              images = JSON.parse(selectedPost.media_url);
                            } else {
                              images = [selectedPost.media_url];
                            }
                          } catch {
                            images = [selectedPost.media_url];
                          }

                          const currentImg = images[currentImageIndex] || images[0];

                          return (
                            <>
                              <motion.img
                                key={currentImageIndex}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="w-full h-full object-contain select-none p-2 lg:p-4"
                                src={currentImg}
                                alt={selectedPost.title}
                              />

                              {images.length > 1 && (
                                <>
                                  <button
                                    onClick={() => setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                                    className="absolute left-6 w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-luxury-gold hover:text-black transition-all opacity-0 group-hover/carousel:opacity-100 shadow-xl"
                                  >
                                    <ChevronLeft size={32} />
                                  </button>
                                  <button
                                    onClick={() => setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                                    className="absolute right-6 w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-luxury-gold hover:text-black transition-all opacity-0 group-hover/carousel:opacity-100 shadow-xl"
                                  >
                                    <ChevronRight size={32} />
                                  </button>

                                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                                    {images.map((_, idx) => (
                                      <div
                                        key={idx}
                                        className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentImageIndex ? 'bg-luxury-gold w-8' : 'bg-white/20'}`}
                                      />
                                    ))}
                                  </div>
                                </>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    ) : selectedPost.media_type === 'video' ? (
                      <div className="w-full h-full bg-black">
                        <video
                          src={selectedPost.media_url}
                          className="w-full h-full object-contain"
                          controls
                          autoPlay
                        />
                      </div>
                    ) : (
                      <div className="w-full h-[50vh] lg:h-full flex items-center justify-center">
                        <FileText size={80} className="text-luxury-gold" />
                      </div>
                    )}

                    {/* Bouton fermer sur Media (Mobile) */}
                    <button
                      onClick={() => {
                        setSelectedPost(null);
                        setCurrentImageIndex(0);
                      }}
                      className="absolute top-6 right-6 lg:hidden w-12 h-12 bg-black/60 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white hover:text-luxury-gold transition-all z-10"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Info et Comments Section - 25% for ultra-wide focus */}
                  <div className="w-full lg:w-[25%] bg-[#080808] flex flex-col h-full overflow-hidden">
                    {/* Header info fixe */}
                    <div className="p-6 border-b border-white/5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-[9px] text-luxury-gold uppercase font-black tracking-[0.2em] opacity-70">
                          <Calendar size={10} />
                          {new Date(selectedPost.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedPost(null);
                            setCurrentImageIndex(0);
                          }}
                          className="hidden lg:flex w-8 h-8 items-center justify-center rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-all"
                        >
                          ✕
                        </button>
                      </div>
                      <h2 className="text-xl font-cinzel font-bold text-white mb-2 leading-tight">{selectedPost.title}</h2>
                      <p className="text-gray-400 text-xs leading-relaxed line-clamp-3 hover:line-clamp-none transition-all duration-500 mb-6">{selectedPost.content}</p>

                      {/* Like Action in Modal */}
                      <button
                        onClick={() => toggleLike(selectedPost.id)}
                        className={`flex items-center gap-3 px-6 py-3 rounded-xl border transition-all w-full justify-center ${selectedPost.is_liked_by_me
                          ? 'bg-red-500/10 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'}`}
                      >
                        <Heart size={20} className={selectedPost.is_liked_by_me ? 'fill-red-500' : ''} />
                        <span className="font-bold uppercase tracking-widest text-sm">
                          {selectedPost.likes_count || 0} Likes
                        </span>
                      </button>
                    </div>

                    {/* Comments Section */}
                    <div className="flex-grow flex flex-col overflow-hidden">
                      <div className="p-6 pb-2">
                        <h3 className="text-sm font-cinzel font-bold text-white uppercase tracking-widest">{t('comments.title')} ({comments.length})</h3>
                      </div>

                      {/* Comments List - Scrollable */}
                      <div className="flex-grow overflow-y-auto px-6 py-2 custom-scrollbar">
                        {comments.length === 0 ? (
                          <p className="text-gray-500 text-xs italic py-2">{t('comments.noComments')}</p>
                        ) : (
                          <div className="space-y-5">
                            {comments.map((comment) => (
                              <div key={comment.id} className="flex gap-3 group/comment">
                                <img src={comment.avatar_url || DEFAULT_AVATAR} alt="avatar" className="w-8 h-8 rounded-full object-cover border border-white/10 flex-shrink-0" />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold text-luxury-gold uppercase tracking-wider">{comment.username}</span>
                                    <span className="text-[9px] text-gray-600">
                                      {new Date(comment.created_at).toLocaleDateString('fr-FR')}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-300 leading-relaxed">{comment.content}</p>
                                  {(session?.user.id === comment.user_id || profile?.role === 'admin') && (
                                    <button
                                      onClick={() => deleteComment(comment.id)}
                                      className="mt-1 text-[9px] text-red-500/50 hover:text-red-500 uppercase font-bold tracking-widest transition-colors opacity-0 group-hover/comment:opacity-100"
                                    >
                                      {t('comments.delete')}
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Add Comment Form - Sticky at bottom */}
                      <div className="p-6 border-t border-white/5 bg-black/40">
                        {session ? (
                          <div className="relative">
                            <textarea
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              placeholder={t('comments.placeholder')}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm resize-none focus:border-luxury-gold outline-none transition-all pr-14"
                              rows={2}
                            />
                            <button
                              onClick={addComment}
                              disabled={!commentText.trim()}
                              className="absolute right-3 bottom-3 w-10 h-10 bg-luxury-gold text-black rounded-xl hover:scale-105 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center"
                            >
                              <Send size={18} />
                            </button>
                          </div>
                        ) : (
                          <div className="py-3 px-4 glass rounded-xl border border-white/10 text-center">
                            <p className="text-gray-400 text-xs italic">{t('comments.loginToComment')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default Media;
