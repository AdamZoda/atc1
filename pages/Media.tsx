
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { Post } from '../types';
import { Play, Image as ImageIcon, FileText, Calendar } from 'lucide-react';

const Media: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setPosts(data);
    setLoading(false);
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
              <h2 className="font-cinzel text-4xl md:text-5xl font-black mb-4">GALLERIE <span className="text-luxury-gold">MEDIA</span></h2>
              <p className="text-gray-400 font-light">Les meilleurs moments capturés par notre communauté.</p>
            </div>
            <div className="flex gap-4">
              <button className="px-6 py-3 glass rounded-xl text-sm font-bold uppercase tracking-widest hover:text-luxury-gold transition-colors">Images</button>
              <button className="px-6 py-3 glass rounded-xl text-sm font-bold uppercase tracking-widest hover:text-luxury-gold transition-colors">Vidéos</button>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="glass aspect-video rounded-3xl animate-pulse"></div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="glass rounded-[3rem] p-20 text-center">
            <p className="text-gray-500 font-cinzel text-xl uppercase tracking-widest">Aucun post disponible pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-3xl overflow-hidden group border border-white/5 hover:border-luxury-gold/30 transition-all duration-500"
              >
                <div className="relative aspect-video bg-black/50 overflow-hidden">
                  {post.media_type === 'image' ? (
                    <img 
                      src={post.media_url} 
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  ) : post.media_type === 'video' ? (
                    <div className="relative w-full h-full">
                      <video src={post.media_url} className="w-full h-full object-cover" muted loop />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-all">
                        <Play size={40} className="text-white fill-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5">
                      <FileText size={48} className="text-luxury-gold" />
                    </div>
                  )}
                  
                  <div className="absolute top-4 right-4 p-2 glass rounded-lg text-white">
                    {post.media_type === 'image' && <ImageIcon size={18} />}
                    {post.media_type === 'video' && <Play size={18} />}
                    {post.media_type === 'file' && <FileText size={18} />}
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-2 text-[10px] text-luxury-gold uppercase font-black tracking-widest mb-3">
                    <Calendar size={12} />
                    {new Date(post.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <h3 className="text-xl font-cinzel font-bold text-white mb-2">{post.title}</h3>
                  <p className="text-gray-400 text-sm font-light line-clamp-2 leading-relaxed">
                    {post.content}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Media;
