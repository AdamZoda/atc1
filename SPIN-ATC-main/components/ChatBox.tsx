import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, User, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isEnabled: boolean;
  isPublic: boolean;
  currentUser: User | null;
  isAdmin: boolean;
  lang: Language;
}

const ChatBox: React.FC<ChatBoxProps> = ({ messages, onSendMessage, isEnabled, isPublic, currentUser, isAdmin, lang }) => {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !isEnabled || !currentUser) return;
    onSendMessage(inputText);
    setInputText('');
  };

  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl flex flex-col h-[700px] overflow-hidden shadow-xl">
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center flex-shrink-0">
        <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isPublic ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></span>
            {t.chat_title}
        </h3>
        {!isPublic && (
            <span className="text-[8px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20 font-bold uppercase tracking-widest">
                Admin only
            </span>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-zinc-700 italic text-[10px] uppercase tracking-widest">
            Aucun message
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.userId === currentUser?.id ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-1 duration-300`}>
            <div className="flex items-center space-x-1.5 mb-1 opacity-70">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${msg.isAdmin ? 'text-amber-500' : 'text-zinc-500'}`}>
                {msg.userName} {msg.isAdmin && '★'}
              </span>
              <span className="text-[8px] text-zinc-700">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className={`max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
              msg.userId === currentUser?.id 
                ? 'bg-amber-500/90 text-black rounded-tr-none font-medium' 
                : 'bg-zinc-800/80 text-zinc-200 rounded-tl-none border border-zinc-700/30'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        
        {/* Visibility of status for regular users */}
        {!isPublic && !isAdmin && currentUser && (
          <div className="sticky bottom-0 bg-zinc-900/90 backdrop-blur p-3 text-center rounded-xl border border-red-500/20 mt-2 shadow-2xl">
            <div className="text-red-400 text-[9px] font-bold uppercase tracking-widest">
              {t.chat_disabled_users}
            </div>
          </div>
        )}

        {/* Visibility of status for admins when locked */}
        {!isPublic && isAdmin && (
          <div className="sticky bottom-0 bg-amber-500/10 backdrop-blur p-2 text-center rounded-xl border border-amber-500/20 mt-2">
            <div className="text-amber-500 text-[9px] font-bold uppercase tracking-widest">
              {t.chat_staff_mode}
            </div>
          </div>
        )}
      </div>

      {currentUser && (
        <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex-shrink-0">
          <div className="relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={!isEnabled}
              placeholder={isEnabled ? t.chat_placeholder : '---'}
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed placeholder:opacity-30"
            />
            {isEnabled && inputText.trim() && (
              <button 
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-amber-500 hover:text-amber-400 transition-colors bg-amber-500/10 rounded-lg border border-amber-500/20"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

export default ChatBox;