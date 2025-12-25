
import React from 'react';
import { Winner, Language } from '../types';

interface HistoryListProps {
  title: string;
  history: Winner[];
  lang: Language;
}

const HistoryList: React.FC<HistoryListProps> = ({ title, history }) => {
  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5">
      <h3 className="font-bold text-zinc-100 text-sm tracking-widest uppercase mb-4">{title}</h3>
      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
        {history.length === 0 ? (
          <div className="text-center py-6 text-zinc-600 italic text-xs">
            Aucun historique
          </div>
        ) : (
          history.map((win, idx) => (
            <div key={idx} className="flex items-center space-x-3 p-2 bg-amber-500/5 rounded-xl border border-amber-500/10">
               <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
               </div>
               <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate text-amber-500">{win.displayName || win.userName || 'Gagnant'}</div>
                  <div className="text-[10px] text-zinc-500">
                    {new Date(win.date).toLocaleDateString()} - {new Date(win.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryList;
