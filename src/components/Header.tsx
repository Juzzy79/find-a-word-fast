import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { Trophy, BarChart3, Swords, History, Volume2, VolumeX, User as UserIcon, Users, Crown, Sparkles, Bell, BellRing } from 'lucide-react';
import { sounds } from '../utils/sound';
import { getPlayerColor } from '../utils/formatters';
import {
  getNotificationPermission,
  requestNotificationPermission,
  showTestPushNotification
} from '../services/pushNotificationService';

interface HeaderProps {
  activeTab: 'game' | 'stats' | 'competitions' | 'history' | 'champions' | 'admin';
  onSelectTab: (tab: 'game' | 'stats' | 'competitions' | 'history' | 'champions' | 'admin') => void;
  currentPlayer: string;
  currentUser: User | null;
  onOpenProfile: () => void;
  onOpenCompetition: () => void;
  onOpenLobby: () => void;
  isZenMode?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  currentPlayer,
  currentUser,
  onOpenProfile,
  onOpenCompetition,
  onOpenLobby,
  isZenMode = false
}) => {
  const [isMuted, setIsMuted] = useState(sounds.muted);
  const [notifPermission, setNotifPermission] = useState(() => getNotificationPermission());
  const avatar = getPlayerColor(currentPlayer);

  const toggleMute = () => {
    const next = sounds.toggleMute();
    setIsMuted(next);
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 px-3 sm:px-6 py-2.5">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Logo & Title */}
        <div 
          onClick={() => onSelectTab('game')} 
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform flex items-center justify-center">
            <div className="w-full h-full bg-dark-900 rounded-[10px] flex items-center justify-center">
              <span className="text-emerald-400 font-bold font-mono text-lg tracking-tight">W</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-100 tracking-tight text-lg">WordRush</span>
              {isZenMode ? (
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold">
                  Zen
                </span>
              ) : (
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Fast
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {isZenMode ? 'Relaxed Untimed Word Search' : 'Multiplayer Speed Find-A-Word'}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-dark-900/70 p-1 rounded-xl border border-slate-800/60">
          <button
            onClick={() => onSelectTab('game')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'game'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Play</span>
          </button>

          <button
            onClick={() => onSelectTab('stats')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'stats'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Stats</span>
          </button>

          <button
            onClick={onOpenCompetition}
            className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800/40"
            title="Competitions & Series"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Competitions</span>
          </button>

          <button
            onClick={onOpenLobby}
            className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 hover:bg-cyan-900/50 hover:border-cyan-400 shadow-sm shadow-cyan-950/40"
            title="Live Cloud Match Rooms with Family & Friends"
          >
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>Live Rooms</span>
          </button>

          <button
            onClick={() => onSelectTab('champions')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'champions'
                ? 'bg-slate-800 text-amber-300 shadow-sm border border-amber-500/30'
                : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/40'
            }`}
            title="Global Champions & Live Room Records"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Champions</span>
          </button>

          <button
            onClick={() => onSelectTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-slate-800 text-violet-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden md:inline">History</span>
          </button>

          <button
            onClick={() => onSelectTab('admin')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'admin'
                ? 'bg-slate-800 text-cyan-300 shadow-sm border border-cyan-500/30'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/40'
            }`}
            title="Admin Topic & Word Studio (14, 18, 22 Word Lists)"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Topics</span>
          </button>
        </nav>

        {/* Right Controls: Sound & Profile */}
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-dark-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all cursor-pointer"
            title={isMuted ? 'Unmute audio' : 'Mute audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Web Push Turn Alerts Toggle */}
          <button
            onClick={async () => {
              if (notifPermission === 'granted') {
                await showTestPushNotification(currentPlayer || 'Opponent');
              } else {
                const res = await requestNotificationPermission();
                setNotifPermission(res);
              }
            }}
            className={`p-2 rounded-xl bg-dark-900 border transition-all cursor-pointer relative ${
              notifPermission === 'granted'
                ? 'border-emerald-500/40 text-emerald-400 hover:border-emerald-400'
                : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
            title={
              notifPermission === 'granted'
                ? 'Turn alerts enabled (Click to test push alert)'
                : 'Enable browser push notifications for opponent turns'
            }
          >
            {notifPermission === 'granted' ? (
              <>
                <BellRing className="w-4 h-4 text-emerald-400" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </>
            ) : (
              <Bell className="w-4 h-4" />
            )}
          </button>

          {/* Player Profile / Google Button */}
          {currentUser ? (
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-dark-900 border border-emerald-500/40 hover:border-emerald-400 hover:bg-slate-800/40 transition-all text-xs text-slate-200 cursor-pointer"
              title="Google Account Connected - View Profile & Stats"
            >
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || ''}
                  className="w-6 h-6 rounded-full border border-emerald-500"
                />
              ) : (
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] border ${avatar.bg}`}>
                  {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                </div>
              )}
              <span className="font-semibold max-w-[80px] sm:max-w-[110px] truncate">
                {currentUser.displayName || currentPlayer}
              </span>
            </button>
          ) : (
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold shadow-md shadow-emerald-950/40 text-xs transition-all cursor-pointer"
              title="Click here to Sign In with Google or set your player name"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
