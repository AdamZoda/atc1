import React from 'react';
import { User, GameState, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface AdminPanelProps {
  title: string;
  onAcceptAll: () => void;
  onStartSpin: () => void;
  usersToAccept: User[];
  acceptedUsers: User[];
  onAcceptUser: (id: string) => void;
  onRemoveFromSpin: (id: string) => void;
  onClearSpin: () => void;
  gameState: GameState;
  lang: Language;
  isChatEnabled: boolean;
  onToggleChat: () => void;
  isGamePageVisible: boolean;
  onTogglePage: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  title, 
  onAcceptAll, 
  onStartSpin, 
  usersToAccept, 
  acceptedUsers,
  onAcceptUser,
  onRemoveFromSpin,
  onClearSpin,
  gameState,
  lang,
  isChatEnabled,
  onToggleChat,
  isGamePageVisible,
  onTogglePage
}) => {
  const t = TRANSLATIONS[lang];
  const isLocked = gameState !== 'IDLE';

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full max-h-[800px]">
      <div className="bg-amber-500/10 border-b border-zinc-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <h3 className="font-bold text-amber-500 text-[10px] tracking-[0.2em] uppercase flex items-center space-x-2">
           <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.9L10 1.554 17.834 4.9c.453.194.746.64.746 1.135v7.625a1.5 1.5 0 01-.844 1.341L10 18.446l-7.736-3.445a1.5 1.5 0 01-.844-1.341V6.035c0-.495.293-.941.746-1.135zM10 3.19l-6.5 2.766v6.627l6.5 2.894 6.5-2.894V5.956L10 3.19zM10 7a1 1 0 100 2 1 1 0 000-2zm-3 4a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
           <span>{title}</span>
        </h3>
        {isLocked && <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30 font-bold uppercase">Locked</span>}
      </div>

      <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
        {/* Toggle Controls - Compact */}
        <div className="grid grid-cols-2 gap-2">
            <button 
                onClick={onToggleChat}
                className={`flex flex-col items-center p-2 rounded-lg border transition-all ${isChatEnabled ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-zinc-800/50 border-zinc-700 text-zinc-500'}`}
            >
                <div className="text-[8px] font-bold uppercase mb-0.5 opacity-60">Chat</div>
                <div className="text-[10px] font-bold truncate">{isChatEnabled ? 'Public' : 'Staff'}</div>
            </button>
            <button 
                onClick={onTogglePage}
                className={`flex flex-col items-center p-2 rounded-lg border transition-all ${isGamePageVisible ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}
            >
                <div className="text-[8px] font-bold uppercase mb-0.5 opacity-60">Page</div>
                <div className="text-[10px] font-bold truncate">{isGamePageVisible ? 'Visible' : 'Hidden'}</div>
            </button>
        </div>

        {/* Global Actions */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <button 
              onClick={onAcceptAll}
              disabled={isLocked || usersToAccept.length === 0}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 transition-colors py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider"
            >
              {t.admin_accept_all}
            </button>
            <button 
              onClick={onStartSpin}
              disabled={isLocked || acceptedUsers.length === 0}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-30 transition-all py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/10"
            >
              {t.admin_spin}
            </button>
          </div>
          
          <button 
            onClick={onClearSpin}
            disabled={isLocked || (acceptedUsers.length === 0 && usersToAccept.length === 0)}
            className="w-full bg-red-500/5 border border-red-500/20 text-red-500 hover:bg-red-500/10 disabled:opacity-20 py-2 rounded-lg text-[9px] font-bold uppercase transition-all tracking-wider"
          >
            {t.admin_clear_spin}
          </button>
        </div>

        {/* Waiting List - Mini */}
        {usersToAccept.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-zinc-800/50">
            <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">{t.waitlist_title} ({usersToAccept.length})</div>
            <div className="space-y-1.5">
              {usersToAccept.map(u => (
                <div key={u.id} className="flex items-center justify-between p-1.5 bg-zinc-950/40 rounded border border-zinc-800/40">
                  <div className="flex items-center space-x-1.5 overflow-hidden">
                    <img src={u.avatar} className="w-5 h-5 rounded-full" />
                    <span className="text-[10px] font-medium truncate opacity-80">{u.name}</span>
                  </div>
                  <button 
                    onClick={() => onAcceptUser(u.id)}
                    disabled={isLocked}
                    className="text-[8px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20 hover:bg-amber-500/20 font-bold uppercase"
                  >
                    OK
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accepted List - Mini Removal Controls */}
        {acceptedUsers.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-zinc-800/50">
            <div className="text-[8px] text-amber-500/70 font-bold uppercase tracking-widest">{t.accepted_title} ({acceptedUsers.length})</div>
            <div className="space-y-1.5">
              {acceptedUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between p-1.5 bg-amber-500/5 rounded border border-amber-500/10">
                  <div className="flex items-center space-x-1.5 overflow-hidden">
                    <img src={u.avatar} className="w-5 h-5 rounded-full border border-amber-500/20" />
                    <span className="text-[10px] font-medium truncate text-amber-100/70">{u.name}</span>
                  </div>
                  <button 
                    onClick={() => onRemoveFromSpin(u.id)}
                    disabled={isLocked}
                    className="text-[8px] text-red-500/70 hover:text-red-500 px-1 font-bold transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;