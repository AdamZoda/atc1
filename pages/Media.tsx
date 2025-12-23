
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { Post, Comment } from '../types';
import { Play, Image as ImageIcon, FileText, Calendar, AlertCircle, Send, Trash2 } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

const Media: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoErrors, setVideoErrors] = useState<Record<number, boolean>>({});
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
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
      .single();
    
    if (data) setProfile(data);
  };

  useEffect(() => {
    if (selectedPost) {
      fetchComments(selectedPost.id);
    }
  }, [selectedPost]);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setPosts(data);
    setLoading(false);
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
      // Join with profiles to get usernames
      const commentsWithUsernames = await Promise.all(
        data.map(async (comment: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', comment.user_id)
            .single();
          return { ...comment, username: profile?.username || 'Anonymous', avatar_url: profile?.avatar_url || DEFAULT_AVATAR };
        })
      );
      setComments(commentsWithUsernames);
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
      className="pt-32 pb-24 bg-luxury-dark min-h-screen"
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
                      <img 
                        src={post.media_url} 
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/300?text=Image';
                        }}
                      />
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

                  <div className="p-4">
                    <h3 className="text-sm font-cinzel font-bold text-white truncate">{post.title}</h3>
                    <p className="text-gray-500 text-xs mt-1 line-clamp-1">{post.content}</p>
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
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-6xl max-h-[90vh] glass rounded-3xl overflow-hidden border border-white/10 flex flex-col lg:flex-row"
                >
                  {/* Media Section */}
                  <div className="relative w-full lg:w-1/2 bg-black flex items-center justify-center flex-shrink-0">
                    {selectedPost.media_type === 'image' ? (
                      <img 
                        src={selectedPost.media_url} 
                        alt={selectedPost.title}
                        className="w-full h-auto max-h-[40vh] lg:max-h-[90vh] object-contain"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/800?text=Image';
                        }}
                      />
                    ) : selectedPost.media_type === 'video' ? (
                      <video 
                        src={selectedPost.media_url} 
                        className="w-full max-h-[40vh] lg:max-h-[90vh] object-contain" 
                        controls
                        autoPlay
                      />
                    ) : (
                      <div className="w-full h-96 flex items-center justify-center">
                        <FileText size={64} className="text-luxury-gold" />
                      </div>
                    )}

                    {/* Bouton fermer */}
                    <button
                      onClick={() => setSelectedPost(null)}
                      className="absolute top-4 right-4 w-10 h-10 bg-black/80 hover:bg-luxury-gold rounded-full flex items-center justify-center text-white hover:text-black transition-all font-bold text-lg"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Info et Comments Section */}
                  <div className="w-full lg:w-1/2 bg-black/50 border-t lg:border-t-0 lg:border-l border-white/10 overflow-y-auto max-h-[50vh] lg:max-h-[90vh] flex flex-col p-8">
                    <div className="flex-shrink-0 mb-6">
                      <div className="flex items-center gap-2 text-xs text-luxury-gold uppercase font-black tracking-widest mb-4">
                        <Calendar size={12} />
                        {new Date(selectedPost.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                      <h2 className="text-2xl lg:text-3xl font-cinzel font-bold text-white mb-4">{selectedPost.title}</h2>
                      <p className="text-gray-300 text-base leading-relaxed">{selectedPost.content}</p>
                    </div>

                    {/* Comments Section */}
                    <div className="border-t border-white/10 pt-6 flex-grow flex flex-col overflow-hidden">
                      <h3 className="text-lg font-cinzel font-bold text-white mb-4 uppercase tracking-widest">{t('comments.title')} ({comments.length})</h3>

                      {/* Add Comment Form */}
                      {session ? (
                        <div className="mb-6 p-4 glass rounded-xl border border-white/10">
                          <textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder={t('comments.placeholder')}
                            className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white text-sm resize-none focus:border-luxury-gold outline-none"
                            rows={3}
                          />
                          <button
                            onClick={addComment}
                            disabled={!commentText.trim()}
                            className="mt-3 w-full py-2 bg-luxury-gold text-black font-bold rounded-lg hover:bg-luxury-goldLight transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <Send size={16} />
                            {t('comments.post')}
                          </button>
                        </div>
                      ) : (
                        <div className="mb-6 p-4 glass rounded-xl border border-white/10 text-center">
                          <p className="text-gray-400 text-sm">{t('comments.loginToComment')}</p>
                        </div>
                      )}

                      {/* Comments List */}
                      <div className="flex-grow overflow-y-auto">
                        {comments.length === 0 ? (
                          <p className="text-gray-500 text-sm italic">{t('comments.noComments')}</p>
                        ) : (
                          <div className="space-y-4 pr-4">
                            {comments.map((comment) => (
                              <div key={comment.id} className="p-4 glass rounded-lg border border-white/5 flex gap-3">
                                <img src={comment.avatar_url || DEFAULT_AVATAR} alt="avatar" className="w-12 h-12 rounded-full object-cover border border-white/10 flex-shrink-0" />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-bold text-luxury-gold">{comment.username}</span>
                                    <span className="text-xs text-gray-500">
                                      {new Date(comment.created_at).toLocaleDateString('fr-FR')}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-300 mb-3">{comment.content}</p>
                                  {(session?.user.id === comment.user_id || profile?.role === 'admin') && (
                                    <button
                                      onClick={() => deleteComment(comment.id)}
                                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                                    >
                                      <Trash2 size={12} />
                                      {t('comments.delete')}
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
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
