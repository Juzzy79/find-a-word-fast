import React, { useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { User, Check, X, UserPlus, LogIn, Award, LogOut, Sparkles, Bell, BellRing } from 'lucide-react';
import { getPlayerColor, formatMs } from '../utils/formatters';
import { getSavedProfilesList, getCareerStats } from '../utils/statsStorage';
import {
  getNotificationPermission,
  requestNotificationPermission,
  showTestPushNotification,
  type PushPermissionStatus
} from '../services/pushNotificationService';

interface PlayerProfileModalProps {
  isOpen: boolean;
  currentPlayer: string;
  currentUser: FirebaseUser | null;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
  onSaveProfile: (name: string) => void;
  onClose: () => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  isOpen,
  currentPlayer,
  currentUser,
  onGoogleLogin,
  onGoogleLogout,
  onSaveProfile,
  onClose
}) => {
  const [name, setName] = useState(currentPlayer);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [notifPermission, setNotifPermission] = useState<PushPermissionStatus>(() => getNotificationPermission());
  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleToggleNotifications = async () => {
    const res = await requestNotificationPermission();
    setNotifPermission(res);
  };

  const handleTestAlert = async () => {
    setIsSendingTest(true);
    await showTestPushNotification(currentPlayer || 'Opponent');
    setTimeout(() => setIsSendingTest(false), 1200);
  };

  if (!isOpen) return null;

  const avatar = getPlayerColor(name);
  const savedProfiles = getSavedProfilesList();

  const handleSelectProfile = (profileName: string) => {
    onSaveProfile(profileName);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (clean) {
      onSaveProfile(clean);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md glass-panel-glow rounded-3xl p-5 sm:p-6 text-slate-100 border-slate-700/80 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-4">
          {currentUser?.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt={currentUser.displayName || ''}
              className="w-16 h-16 rounded-2xl mx-auto mb-2 border-2 border-emerald-500 shadow-lg object-cover"
            />
          ) : (
            <div
              className={`w-16 h-16 rounded-2xl mx-auto mb-2 flex items-center justify-center text-2xl font-bold font-mono border-2 shadow-lg ${avatar.bg}`}
            >
              {name.trim() ? name.trim()[0].toUpperCase() : <User className="w-8 h-8" />}
            </div>
          )}
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Player Profile & Cloud Sync</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Log in to link your personal stats, career records, and live matches to your Google account
          </p>
        </div>

        {/* Google Authentication Box */}
        <div className="bg-dark-900/90 border border-slate-800 rounded-2xl p-3.5 mb-4">
          {currentUser ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-400 mb-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Google Account Linked</span>
                </div>
                <div className="font-bold text-sm text-slate-100">{currentUser.displayName}</div>
                <div className="text-[11px] text-slate-400">{currentUser.email}</div>
              </div>
              <button
                onClick={onGoogleLogout}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="text-center">
              <button
                onClick={onGoogleLogin}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-dark-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.28-2.1 3.66-5.2 3.66-9.12z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.24C.45 8.14 0 9.97 0 12s.45 3.86 1.24 5.43l4.04-3.14z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.57l4.04 3.14c.95-2.83 3.6-4.96 6.72-4.96z"
                  />
                </svg>
                <span>Sign In with Google</span>
              </button>
            </div>
          )}
        </div>

        {/* Turn Alerts & Web Push Notifications Card */}
        <div className="bg-dark-900/90 border border-slate-800 rounded-2xl p-3.5 mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                notifPermission === 'granted'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                {notifPermission === 'granted' ? <BellRing className="w-4 h-4 text-emerald-400" /> : <Bell className="w-4 h-4" />}
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-100">
                  <span>Turn & Round Push Alerts</span>
                  {notifPermission === 'granted' && (
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                      ACTIVE
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  {notifPermission === 'granted'
                    ? 'Get instant alerts when your opponent finishes a round'
                    : notifPermission === 'denied'
                    ? 'Blocked by browser permissions'
                    : 'Get notified as soon as your opponent finishes'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {notifPermission === 'granted' ? (
                <button
                  type="button"
                  onClick={handleTestAlert}
                  disabled={isSendingTest}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-cyan-300 transition-all cursor-pointer"
                  title="Sends a test push notification to verify"
                >
                  {isSendingTest ? 'Sending...' : 'Test Alert'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleToggleNotifications}
                  disabled={notifPermission === 'denied' || notifPermission === 'unsupported'}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-40"
                >
                  Enable
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Saved Profiles Quick Switcher */}
        {savedProfiles.length > 0 && !isCreatingNew && (
          <div className="mb-4">
            <div className="text-xs font-mono uppercase text-slate-400 mb-2 font-semibold flex items-center justify-between">
              <span>Switch Active Player:</span>
              <span className="text-[10px] text-slate-500">{savedProfiles.length} on this device</span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {savedProfiles.map(p => {
                const isSelected = p.toLowerCase() === currentPlayer.toLowerCase();
                const pColor = getPlayerColor(p);
                const pStats = getCareerStats(p);

                return (
                  <div
                    key={`saved-p-${p}`}
                    onClick={() => handleSelectProfile(p)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/50 shadow-sm'
                        : 'bg-dark-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs border ${pColor.bg}`}>
                        {p[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-1.5">
                          <span>{p}</span>
                          {isSelected && (
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{pStats.puzzlesCompleted} solved</span>
                          {pStats.bestTimeMs && (
                            <span className="text-emerald-400 flex items-center gap-0.5">
                              <Award className="w-2.5 h-2.5" />
                              {formatMs(pStats.bestTimeMs)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-lg bg-dark-950 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1 font-mono font-medium"
                    >
                      <LogIn className="w-3 h-3 text-cyan-400" />
                      <span>{isSelected ? 'Stay' : 'Select'}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-center">
              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 font-bold cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign in as another player or create new profile</span>
              </button>
            </div>
          </div>
        )}

        {/* Form: Enter custom handle / Switch name */}
        {(isCreatingNew || savedProfiles.length === 0) && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5 font-semibold">
                Player Handle / Username
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Juzzy, SpeedHunter, WordMaster"
                maxLength={20}
                autoFocus
                className="w-full bg-dark-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-semibold focus:outline-none transition-colors"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Entering an existing handle restores your personal stats and rivalries.
              </p>
            </div>

            <div className="flex gap-2">
              {savedProfiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-dark-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs transition-all"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={!name.trim()}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-dark-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 hover:opacity-95 active:scale-98 transition-all disabled:opacity-40 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Sign In / Activate</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
