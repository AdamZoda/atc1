import React from 'react';
import { User, Language } from '../types';

interface UserListProps {
  title: string;
  users: User[];
  emptyText: string;
  lang: Language;
  variant?: 'normal' | 'tall';
}

const UserList: React.FC<UserListProps> = ({ title, users, emptyText, variant = 'normal' }) => {
  const scrollHeight = variant === 'tall' ? 'max-h-[600px]' : 'max-h-[300px]';

  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5 overflow-hidden flex flex-col h-full">
      <h3 className="font-bold text-zinc-100 mb-4 flex items-center justify-between flex-shrink-0">
        <span className="text-xs tracking-widest uppercase">{title}</span>
        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{users.length}</span>
      </h3>
      
      <div className={`space-y-3 overflow-y-auto pr-2 custom-scrollbar ${scrollHeight} flex-1`}>
        {users.length === 0 ? (
          <div className="text-center py-8 text-zinc-600 italic text-sm border-2 border-dashed border-zinc-800/50 rounded-xl">
            {emptyText}
          </div>
        ) : (
          users.map((user, idx) => (
            <div 
              key={user.id} 
              className="flex items-center space-x-3 p-2 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-zinc-800 animate-in fade-in slide-in-from-left duration-300"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="relative">
                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border border-zinc-700" />
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-amber-500 border-2 border-zinc-900 rounded-full animate-pulse"></div>
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="text-xs font-semibold truncate text-zinc-200">{user.name}</div>
                <div className="text-[9px] text-zinc-500 font-mono">{new Date(user.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UserList;