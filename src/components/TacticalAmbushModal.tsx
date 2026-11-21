import React, { useState } from 'react';
import type { TacticalTrap, TacticalTrapType } from '../types/game';
import { sounds, triggerHaptic } from '../utils/sound';
import {
  Bomb,
  Ghost,
  EyeOff,
  CloudFog,
  Crosshair,
  Clock,
  Sparkles,
  X
} from 'lucide-react';

interface TacticalAmbushModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeployTrap: (trap: TacticalTrap) => void;
  availableLetters: string[];
  opponents: string[];
  roundNumber: number;
  earnedTrapsCount: number;
  currentPlayer: string;
}

export const TacticalAmbushModal: React.FC<TacticalAmbushModalProps> = ({
  isOpen,
  onClose,
  onDeployTrap,
  availableLetters,
  opponents,
  roundNumber,
  earnedTrapsCount,
  currentPlayer
}) => {
  const [selectedType, setSelectedType] = useState<TacticalTrapType>('wordlist_glitch');
  const [selectedTarget, setSelectedTarget] = useState<string>(() => opponents[0] || 'all');
  const [selectedLetter, setSelectedLetter] = useState<string>(() => {
    // Default to 'E' if available, otherwise first letter
    return availableLetters.includes('E') ? 'E' : (availableLetters[0] || 'A');
  });
  const [triggerSec, setTriggerSec] = useState<number>(25);
  const [selectedQuadrant, setSelectedQuadrant] = useState<number>(0);

  if (!isOpen || earnedTrapsCount <= 0) return null;

  // Filter unique sorted letters
  const sortedLetters = Array.from(new Set(availableLetters)).sort();

  const handleDeploy = () => {
    const triggerAtMs = selectedType === 'wordlist_glitch' ? 0 : triggerSec * 1000;
    const durationMs = selectedType === 'wordlist_glitch' ? 60000 : 30000;

    const trap: TacticalTrap = {
      id: `trap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdBy: currentPlayer,
      targetPlayer: selectedTarget,
      type: selectedType,
      triggerAtMs,
      durationMs,
      letter: selectedType === 'phantom_letter' ? selectedLetter : undefined,
      quadrant: selectedType === 'dense_mist' ? selectedQuadrant : undefined,
      createdAt: Date.now()
    };

    sounds.playVictory();
    triggerHaptic('success');
    onDeployTrap(trap);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg my-auto rounded-3xl bg-gradient-to-b from-dark-900 via-dark-950 to-dark-900 border-2 border-amber-500/60 shadow-2xl shadow-amber-500/20 overflow-hidden text-slate-100">
        {/* Glow ambient background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/30 text-dark-950">
              <Bomb className="w-5 h-5 fill-dark-950 text-dark-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                  Tactical Warfare
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  {earnedTrapsCount} Token{earnedTrapsCount > 1 ? 's' : ''} Earned
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-100">
                Arm Ambush Trap for Round {roundNumber}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-dark-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Target Opponent Selector */}
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
              <span>Select Target Opponent:</span>
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {opponents.length > 0 ? (
                opponents.map((opp, idx) => (
                  <button
                    key={`target-${idx}`}
                    type="button"
                    onClick={() => setSelectedTarget(opp)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer inline-flex items-center gap-1 ${
                      selectedTarget.toLowerCase() === opp.toLowerCase()
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                        : 'bg-dark-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Crosshair className="w-3.5 h-3.5 shrink-0" />
                    <span>{opp}</span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-1.5 rounded-xl bg-dark-950 border border-slate-800 text-xs text-slate-400 font-semibold">
                  Next Contender to Join
                </div>
              )}
            </div>
          </div>

          {/* Curse Type Selector Tabs */}
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 font-semibold mb-1.5">
              Choose Tactical Curse:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Curse 1: Blindfold Wordlist */}
              <button
                type="button"
                onClick={() => setSelectedType('wordlist_glitch')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedType === 'wordlist_glitch'
                    ? 'bg-amber-500/20 border-amber-500 shadow-lg shadow-amber-500/15 ring-1 ring-amber-500/40 text-slate-100'
                    : 'bg-dark-950/70 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <EyeOff className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold">Blindfold List</span>
                </div>
                <div className="text-xs text-slate-400 leading-tight">
                  Scrambles word bank into ??? for 60s. Forces blind grid hunt!
                </div>
              </button>

              {/* Curse 2: Phantom Letter */}
              <button
                type="button"
                onClick={() => setSelectedType('phantom_letter')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedType === 'phantom_letter'
                    ? 'bg-amber-500/20 border-amber-500 shadow-lg shadow-amber-500/15 ring-1 ring-amber-500/40 text-slate-100'
                    : 'bg-dark-950/70 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Ghost className="w-4 h-4 text-violet-400" />
                  <span className="text-xs font-bold">Phantom Letter</span>
                </div>
                <div className="text-xs text-slate-400 leading-tight">
                  Cloaks any letter invisible for 30s at your chosen ambush second!
                </div>
              </button>

              {/* Curse 3: Dense Mist */}
              <button
                type="button"
                onClick={() => setSelectedType('dense_mist')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedType === 'dense_mist'
                    ? 'bg-amber-500/20 border-amber-500 shadow-lg shadow-amber-500/15 ring-1 ring-amber-500/40 text-slate-100'
                    : 'bg-dark-950/70 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <CloudFog className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold">Dense Mist</span>
                </div>
                <div className="text-xs text-slate-400 leading-tight">
                  Obscures a quadrant of the board with smoke for 20 seconds.
                </div>
              </button>
            </div>
          </div>

          {/* Conditional Options: Phantom Letter Picker */}
          {selectedType === 'phantom_letter' && (
            <div className="p-3.5 rounded-2xl bg-dark-950/80 border border-slate-800 space-y-3 animate-fade-in">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 font-semibold mb-1">
                  Letter to Make Invisible:
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
                  {sortedLetters.map(letter => (
                    <button
                      key={`letter-${letter}`}
                      type="button"
                      onClick={() => setSelectedLetter(letter)}
                      className={`w-7 h-7 rounded-lg text-xs font-mono font-black border transition-all cursor-pointer ${
                        selectedLetter === letter
                          ? 'bg-violet-600 border-violet-400 text-white shadow-md shadow-violet-500/30 scale-110'
                          : 'bg-dark-900 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ambush Detonation Timing */}
              <div>
                <div className="flex items-center justify-between text-xs font-mono uppercase text-slate-400 font-semibold mb-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ambush Detonation Time:</span>
                  </span>
                  <span className="text-amber-300 font-bold font-mono">
                    At {triggerSec} seconds
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[15, 25, 35, 45].map(sec => (
                    <button
                      key={`trigger-${sec}`}
                      type="button"
                      onClick={() => setTriggerSec(sec)}
                      className={`py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        triggerSec === sec
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-dark-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {sec}s {sec === 15 ? '(Early)' : sec === 45 ? '(Late)' : ''}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-slate-400 mt-1.5 italic">
                  Risk/Reward: If opponent solves the board in under {triggerSec}s, they DODGE it completely!
                </div>
              </div>
            </div>
          )}

          {/* Conditional Options: Blindfold Wordlist */}
          {selectedType === 'wordlist_glitch' && (
            <div className="p-3.5 rounded-2xl bg-dark-950/80 border border-slate-800 space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>1-Minute Blind Word Search (00:00 - 01:00)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Right from the start of the round, the word bank sidebar is scrambled into glitching static. The opponent will have to search the grid blindly using only their thematic intuition!
              </p>
              <div className="text-xs text-slate-400 italic">
                Active immediately at 0s &bull; Lasts for 60 seconds
              </div>
            </div>
          )}

          {/* Conditional Options: Dense Mist Quadrant Picker */}
          {selectedType === 'dense_mist' && (
            <div className="p-3.5 rounded-2xl bg-dark-950/80 border border-slate-800 space-y-3 animate-fade-in">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 font-semibold mb-1">
                  Quadrant to Obscure with Mist:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Top-Left', 'Top-Right', 'Bottom-Left', 'Bottom-Right'].map((label, qIdx) => (
                    <button
                      key={`quad-${qIdx}`}
                      type="button"
                      onClick={() => setSelectedQuadrant(qIdx)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        selectedQuadrant === qIdx
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                          : 'bg-dark-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-5 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-dark-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            Skip & Save Trap
          </button>

          <button
            onClick={handleDeploy}
            className="w-full sm:flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 text-dark-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 hover:opacity-95 hover:scale-[1.02] active:scale-98 transition-all cursor-pointer"
          >
            <Bomb className="w-4 h-4 fill-dark-950" />
            <span>Arm Ambush Trap</span>
          </button>
        </div>
      </div>
    </div>
  );
};
