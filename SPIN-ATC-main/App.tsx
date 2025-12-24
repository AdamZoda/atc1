import React, { useState, useEffect, useCallback } from 'react';
import { User, UserStatus, GameState, Language, Winner, ChatMessage } from './types';
import { TRANSLATIONS } from './constants';
import SpinnerWheel from './components/SpinnerWheel';
import AdminPanel from './components/AdminPanel';
import UserList from './components/UserList';
import HistoryList from './components/HistoryList';
import ChatBox from './components/ChatBox';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('fr');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [isAdmin, setIsAdmin] = useState(false);
  const [history, setHistory] = useState<Winner[]>([]);
  const [lastWinner, setLastWinner] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'communities' | 'game' | 'shop'>('game');

  const [isChatEnabled, setIsChatEnabled] = useState(true);
  const [isGamePageVisible, setIsGamePageVisible] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const mockUsers: User[] = [
      { id: '1', name: 'Alex_Pro', avatar: 'https://picsum.photos/seed/1/100', status: UserStatus.ACCEPTED, joinedAt: Date.now() - 100000 },
      { id: '2', name: 'ZenGamer', avatar: 'https://picsum.photos/seed/2/100', status: UserStatus.ACCEPTED, joinedAt: Date.now() - 80000 },
      { id: '3', name: 'Lunar_W', avatar: 'https://picsum.photos/seed/3/100', status: UserStatus.WAITING, joinedAt: Date.now() - 50000 },
      { id: '4', name: 'Swift_Dev', avatar: 'https://picsum.photos/seed/4/100', status: UserStatus.WAITING, joinedAt: Date.now() - 30000 },
      { id: '5', name: 'Ghost_99', avatar: 'https://picsum.photos/seed/5/100', status: UserStatus.ACCEPTED, joinedAt: Date.now() - 20000 },
    ];
    setUsers(mockUsers);

    setChatMessages([
      { id: 'm1', userId: '1', userName: 'Alex_Pro', text: 'Bonne chance à tous !', timestamp: Date.now() - 500000 },
      { id: 'm2', userId: 'admin', userName: 'ATC_Staff', text: 'Le prochain spin commence bientôt.', timestamp: Date.now() - 400000, isAdmin: true },
    ]);
  }, []);

  const handleRegister = () => {
    if (currentUser) return;
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'Vous (Joueur)',
      avatar: 'https://picsum.photos/seed/you/100',
      status: UserStatus.WAITING,
      joinedAt: Date.now()
    };
    setCurrentUser(newUser);
    setUsers(prev => [...prev, newUser]);
  };

  const handleCancelRegistration = () => {
    if (!currentUser || currentUser.status !== UserStatus.WAITING) return;
    setUsers(prev => prev.filter(u => u.id !== currentUser.id));
    setCurrentUser(null);
  };

  const handleAcceptUser = (userId: string) => {
    if (gameState !== 'IDLE') return;
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: UserStatus.ACCEPTED } : u));
    if (currentUser?.id === userId) {
        setCurrentUser(prev => prev ? { ...prev, status: UserStatus.ACCEPTED } : null);
    }
  };

  const handleAcceptAll = () => {
    if (gameState !== 'IDLE') return;
    setUsers(prev => prev.map(u => ({ ...u, status: UserStatus.ACCEPTED })));
    if (currentUser) {
        setCurrentUser(prev => prev ? { ...prev, status: UserStatus.ACCEPTED } : null);
    }
  };

  const handleDemoteUser = (userId: string) => {
    if (gameState !== 'IDLE') return;
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: UserStatus.WAITING } : u));
    if (currentUser?.id === userId) {
        setCurrentUser(prev => prev ? { ...prev, status: UserStatus.WAITING } : null);
    }
  };

  const handleDemoteAll = () => {
    if (gameState !== 'IDLE') return;
    setUsers(prev => prev.map(u => ({ ...u, status: UserStatus.WAITING })));
    if (currentUser) {
        setCurrentUser(prev => prev ? { ...prev, status: UserStatus.WAITING } : null);
    }
  };

  const handleStartSpin = () => {
    const accepted = users.filter(u => u.status === UserStatus.ACCEPTED);
    if (accepted.length === 0) return;
    setGameState('SPINNING');
    setLastWinner(null);
  };

  const handleSpinEnd = (winnerId: string) => {
    const winner = users.find(u => u.id === winnerId);
    if (winner) {
      setLastWinner(winner);
      setGameState('FINISHED');
      const newHistory: Winner = {
        userId: winner.id,
        userName: winner.name,
        date: Date.now()
      };
      setHistory(prev => [newHistory, ...prev]);
      
      setTimeout(() => {
        setGameState('IDLE');
        setLastWinner(null);
      }, 7000);
    }
  };

  const handleSendMessage = (text: string) => {
    if (!currentUser) return;
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      text: text,
      timestamp: Date.now(),
      isAdmin: isAdmin
    };
    setChatMessages(prev => [...prev, newMessage]);
  };

  const showGamePage = isAdmin || isGamePageVisible;

  return (
    <div className="min-h-screen flex flex-col pb-12">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-[110] bg-[#0d0d0f]/90 backdrop-blur-md border-b border-white/5 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center font-bold text-black shadow-lg shadow-amber-500/20">ATC</div>
          <span className="font-orbitron tracking-widest font-bold hidden sm:inline text-amber-500/80">PREMIUM</span>
        </div>
        
        <div className="flex items-center space-x-1 sm:space-x-8">
          <button 
            onClick={() => setActiveTab('communities')}
            className={`text-sm font-semibold transition-colors ${activeTab === 'communities' ? 'text-amber-500' : 'text-zinc-400 hover:text-white'}`}
          >
            {t.nav_communities}
          </button>
          
          {(isAdmin || isGamePageVisible) && (
            <button 
                onClick={() => setActiveTab('game')}
                className={`text-sm font-semibold transition-colors ${activeTab === 'game' ? 'text-amber-500 underline underline-offset-8 decoration-2' : 'text-zinc-400 hover:text-white'}`}
            >
                {t.nav_game}
            </button>
          )}

          <button 
            onClick={() => setActiveTab('shop')}
            className={`text-sm font-semibold transition-colors ${activeTab === 'shop' ? 'text-amber-500' : 'text-zinc-400 hover:text-white'}`}
          >
            {t.nav_shop}
          </button>
        </div>

        <div className="flex items-center space-x-4">
           <button 
            onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
            className="text-[10px] font-bold border border-zinc-700 px-2 py-1 rounded hover:bg-white/5 transition-colors uppercase tracking-widest"
          >
            {lang}
          </button>
          <div className="h-4 w-px bg-zinc-800" />
          <button 
            onClick={() => setIsAdmin(!isAdmin)}
            className={`text-[10px] px-3 py-1 rounded-full border transition-all font-bold uppercase tracking-wider ${isAdmin ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}
          >
            {isAdmin ? 'Admin' : 'User'}
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      {activeTab === 'game' ? (
        showGamePage ? (
          <main className="flex-1 w-full max-w-[1800px] mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full items-start">
              
              {/* Column 1: Waiting & History (2/12) */}
              <aside className="lg:col-span-2 space-y-5">
                <UserList 
                  title={t.waitlist_title} 
                  users={users.filter(u => u.status === UserStatus.WAITING)} 
                  emptyText="Vide"
                  lang={lang}
                />
                <HistoryList 
                  title={t.history_title}
                  history={history}
                  lang={lang}
                />
              </aside>

              {/* Column 2: Chat Box (3/12) */}
              <aside className="lg:col-span-3">
                <ChatBox 
                  messages={chatMessages}
                  onSendMessage={handleSendMessage}
                  isEnabled={isChatEnabled || isAdmin}
                  isPublic={isChatEnabled}
                  isAdmin={isAdmin}
                  currentUser={currentUser}
                  lang={lang}
                />
              </aside>

              {/* Column 3: Game Wheel Area (Center Focus - 3/12) */}
              <section className="lg:col-span-3 flex flex-col items-center space-y-6">
                <div className="relative w-full aspect-square max-w-sm flex items-center justify-center">
                  <div className={`absolute inset-0 rounded-full blur-[60px] opacity-20 transition-all duration-1000 ${gameState === 'SPINNING' ? 'bg-amber-400 scale-125' : 'bg-amber-700'}`}></div>
                  
                  <SpinnerWheel 
                    participants={users.filter(u => u.status === UserStatus.ACCEPTED)} 
                    gameState={gameState} 
                    onSpinEnd={handleSpinEnd}
                  />

                  {/* JACKPOT CELEBRATION OVERLAY */}
                  {gameState === 'FINISHED' && lastWinner && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-xl rounded-full z-[100] animate-in fade-in zoom-in duration-500 border-4 border-amber-500/50 shadow-[0_0_100px_rgba(245,158,11,0.4)]">
                      <div className="absolute inset-0 pointer-events-none">
                         {Array.from({ length: 40 }).map((_, i) => (
                           <div 
                             key={i}
                             className="confetti"
                             style={{
                               left: `${Math.random() * 100}%`,
                               animationDelay: `${Math.random() * 2}s`,
                               animationDuration: `${2 + Math.random() * 2}s`,
                               backgroundColor: ['#fbbf24', '#f59e0b', '#ffffff'][Math.floor(Math.random() * 3)],
                               width: '6px',
                               height: '6px',
                               borderRadius: '50%'
                             }}
                           />
                         ))}
                      </div>

                      <div className="text-amber-400 font-orbitron text-3xl font-black gold-text tracking-tighter animate-pulse uppercase mb-2">
                        WINNER!
                      </div>
                      
                      <div className="relative">
                          <div className="absolute -inset-4 bg-amber-500/20 rounded-full blur-xl animate-pulse"></div>
                          <img src={lastWinner.avatar} alt={lastWinner.name} className="relative w-24 h-24 rounded-full border-4 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)] z-10" />
                      </div>

                      <div className="mt-4 text-2xl font-bold text-white tracking-widest z-10">{lastWinner.name}</div>
                      <div className="mt-1 text-amber-500/60 font-orbitron text-[8px] tracking-[0.3em] uppercase z-10">{t.winner_announcement}</div>
                    </div>
                  )}
                </div>

                <div className="w-full flex flex-col items-center space-y-4">
                  {!currentUser ? (
                    <button 
                      onClick={handleRegister}
                      disabled={gameState !== 'IDLE'}
                      className="w-full py-4 rounded-xl font-bold text-base tracking-widest transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-xl shadow-amber-500/20 uppercase"
                    >
                      {t.register_btn}
                    </button>
                  ) : (
                    <div className="flex flex-col items-center w-full space-y-2">
                      <div className="bg-zinc-900/50 border border-zinc-800 px-4 py-3 rounded-xl flex items-center space-x-3 w-full">
                          <img src={currentUser.avatar} alt="Me" className="w-8 h-8 rounded-full border border-amber-500/30" />
                          <div className="flex-1 overflow-hidden">
                            <div className="text-xs font-bold truncate">{t.already_registered}</div>
                            <div className="text-[9px] text-amber-500 uppercase font-bold">{currentUser.status === UserStatus.ACCEPTED ? t.status_accepted : t.status_waiting}</div>
                          </div>
                      </div>
                      {currentUser.status === UserStatus.WAITING && gameState === 'IDLE' && (
                          <button 
                              onClick={handleCancelRegistration}
                              className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors uppercase font-bold tracking-widest py-1"
                          >
                              {t.cancel_btn}
                          </button>
                      )}
                    </div>
                  )}
                  
                  {gameState === 'SPINNING' && (
                    <div className="flex items-center space-x-2 text-amber-500 font-orbitron text-[10px] animate-pulse tracking-widest uppercase font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      <span>{t.spin_started}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Column 4: Accepted Participants (2/12) */}
              <aside className="lg:col-span-2">
                <UserList 
                  title={t.accepted_title} 
                  users={users.filter(u => u.status === UserStatus.ACCEPTED)}
                  emptyText={t.no_participants}
                  lang={lang}
                  variant="tall"
                />
              </aside>

              {/* Column 5: Admin Zone (2/12) */}
              <aside className="lg:col-span-2 h-full">
                {isAdmin && (
                  <AdminPanel 
                    title={t.admin_title}
                    onAcceptAll={handleAcceptAll}
                    onStartSpin={handleStartSpin}
                    usersToAccept={users.filter(u => u.status === UserStatus.WAITING)}
                    acceptedUsers={users.filter(u => u.status === UserStatus.ACCEPTED)}
                    onAcceptUser={handleAcceptUser}
                    onRemoveFromSpin={handleDemoteUser}
                    onClearSpin={handleDemoteAll}
                    gameState={gameState}
                    lang={lang}
                    isChatEnabled={isChatEnabled}
                    onToggleChat={() => setIsChatEnabled(!isChatEnabled)}
                    isGamePageVisible={isGamePageVisible}
                    onTogglePage={() => setIsGamePageVisible(!isGamePageVisible)}
                  />
                )}
              </aside>

            </div>
          </main>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md text-center space-y-4 animate-in fade-in zoom-in duration-500">
               <div className="text-6xl text-amber-500 opacity-20 mx-auto">
                 <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
               </div>
               <h2 className="text-xl font-orbitron font-bold text-white uppercase tracking-widest">{t.game_disabled_msg}</h2>
               <p className="text-zinc-500 text-sm">{t.game_disabled_desc || "L'administration a restreint l'accès au jeu pour le moment."}</p>
            </div>
          </div>
        )
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-4">
          <div className="w-16 h-16 border border-zinc-800 rounded-full flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <span className="italic text-sm tracking-widest uppercase">Page {activeTab} en construction</span>
        </div>
      )}

      <footer className="mt-auto text-center py-6 border-t border-white/5 text-zinc-700 text-[10px] tracking-[0.2em] uppercase">
        &copy; {new Date().getFullYear()} ATC PLATFORM. ALL RIGHTS RESERVED.
      </footer>
    </div>
  );
};

export default App;