import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { GridBoard, Coordinate } from '../types/game';
import { sounds, triggerHaptic } from '../utils/sound';
import { ZoomIn, ZoomOut, RotateCcw, EyeOff, Play, Pause, Sparkles, Zap } from 'lucide-react';

interface WordGridProps {
  board: GridBoard;
  onWordFound: (foundWord: string) => void;
  disabled?: boolean;
  isCovered?: boolean;
  isPaused?: boolean;
  onStartTurn?: () => void;
  onResumeTurn?: () => void;
  activeCloakedLetter?: string | null;
  activeMistQuadrant?: number | null;
}

export const WordGrid: React.FC<WordGridProps> = ({
  board,
  onWordFound,
  disabled = false,
  isCovered = false,
  isPaused = false,
  onStartTurn,
  onResumeTurn,
  activeCloakedLetter = null,
  activeMistQuadrant = null
}) => {
  const { size, matrix, words } = board;

  const [selectionStart, setSelectionStart] = useState<Coordinate | null>(null);
  const [selectionCurrent, setSelectionCurrent] = useState<Coordinate | null>(null);
  const [selectedCells, setSelectedCells] = useState<Coordinate[]>([]);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [invalidSelection, setInvalidSelection] = useState<{ start: Coordinate; end: Coordinate } | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [focusedCell, setFocusedCell] = useState<Coordinate>({ row: 0, col: 0 });
  const [isGridFocused, setIsGridFocused] = useState<boolean>(false);
  const [isKeyboardSelecting, setIsKeyboardSelecting] = useState<boolean>(false);

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const lastCellRef = useRef<string>('');
  const shakeTimerRef = useRef<number | null>(null);

  // Reset zoom and keyboard cursor if board size changes
  useEffect(() => {
    setZoomLevel(1);
    setFocusedCell({ row: 0, col: 0 });
    setIsKeyboardSelecting(false);
  }, [size]);

  useEffect(() => {
    return () => {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    };
  }, []);

  // Determine snapped 8-directional cells between two coordinates with generous diagonal tolerance
  const calculateSnappedCells = useCallback((start: Coordinate, current: Coordinate): Coordinate[] => {
    const dr = current.row - start.row;
    const dc = current.col - start.col;

    if (dr === 0 && dc === 0) return [start];

    const absDr = Math.abs(dr);
    const absDc = Math.abs(dc);

    let stepR = 0;
    let stepC = 0;

    // Angle snapping to 8 directions (Horizontal, Vertical, 45-degree Diagonals)
    // Ratio > 2.0 = locked straight; between 0.5 and 2.0 = smooth diagonal
    if (absDr === 0) {
      stepC = Math.sign(dc);
    } else if (absDc === 0) {
      stepR = Math.sign(dr);
    } else if (absDr > absDc * 2.0) {
      // Strictly vertical
      stepR = Math.sign(dr);
    } else if (absDc > absDr * 2.0) {
      // Strictly horizontal
      stepC = Math.sign(dc);
    } else {
      // Clean diagonal (45-degree ray)
      stepR = Math.sign(dr);
      stepC = Math.sign(dc);
    }

    const isDiagonal = stepR !== 0 && stepC !== 0;
    const steps = isDiagonal ? Math.min(absDr, absDc) : Math.max(absDr, absDc);

    const cells: Coordinate[] = [];
    for (let i = 0; i <= steps; i++) {
      const r = start.row + i * stepR;
      const c = start.col + i * stepC;
      if (r >= 0 && r < size && c >= 0 && c < size) {
        cells.push({ row: r, col: c });
      }
    }
    return cells;
  }, [size]);

  // Convert client pointer coordinates to grid row and col with clamp protection
  const getCellFromCoordinates = (clientX: number, clientY: number): Coordinate | null => {
    if (!gridContainerRef.current) return null;
    const rect = gridContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (x < 0 || x > rect.width || y < 0 || y > rect.height) return null;

    const cellWidth = rect.width / size;
    const cellHeight = rect.height / size;

    const col = Math.min(size - 1, Math.max(0, Math.floor(x / cellWidth)));
    const row = Math.min(size - 1, Math.max(0, Math.floor(y / cellHeight)));

    return { row, col };
  };

  // Pointer Down (Start selection)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    const cell = getCellFromCoordinates(e.clientX, e.clientY);
    if (!cell) return;

    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    setSelectionStart(cell);
    setSelectionCurrent(cell);
    setSelectedCells([cell]);
    lastCellRef.current = `${cell.row},${cell.col}`;

    sounds.playTileTick();
    triggerHaptic('light');
  };

  // Pointer Move (Extend selection along snapped ray)
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !selectionStart || disabled) return;

    const cell = getCellFromCoordinates(e.clientX, e.clientY);
    if (!cell) return;

    const cellKey = `${cell.row},${cell.col}`;
    if (cellKey !== lastCellRef.current) {
      lastCellRef.current = cellKey;
      sounds.playTileTick();
      triggerHaptic('light');
    }

    setSelectionCurrent(cell);
    const snapped = calculateSnappedCells(selectionStart, cell);
    setSelectedCells(snapped);
  };

  // Check if selected cells match any unfound target word
  const checkSelection = (cells: Coordinate[]) => {
    if (cells.length < 3) return;

    const forwardString = cells.map(c => matrix[c.row][c.col]).join('');
    const backwardString = forwardString.split('').reverse().join('');

    const targetWord = words.find(
      w => !w.found && (w.word === forwardString || w.word === backwardString)
    );

    if (targetWord) {
      onWordFound(targetWord.word);
    } else {
      // Wrong selection of 3+ letters: trigger shake, dull tick, and brief red tint
      sounds.playWrongTick();
      triggerHaptic('medium');
      setInvalidSelection({
        start: cells[0],
        end: cells[cells.length - 1]
      });
      setIsShaking(true);

      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = window.setTimeout(() => {
        setInvalidSelection(null);
        setIsShaking(false);
      }, 400);
    }
  };

  // Pointer Up (Finalize selection)
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    if (selectedCells.length >= 3) {
      checkSelection(selectedCells);
    }

    setSelectionStart(null);
    setSelectionCurrent(null);
    setSelectedCells([]);
    lastCellRef.current = '';

    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // Safeguard
    }
  };

  const handlePointerCancel = () => {
    isDraggingRef.current = false;
    setSelectionStart(null);
    setSelectionCurrent(null);
    setSelectedCells([]);
  };

  // Keyboard navigation & selection (Arrow keys move, Enter/Space starts & completes selection, Escape cancels)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || isCovered) return;

    const { row, col } = focusedCell;
    let nextRow = row;
    let nextCol = col;
    let moved = false;

    if (e.key === 'ArrowUp') {
      nextRow = Math.max(0, row - 1);
      moved = true;
    } else if (e.key === 'ArrowDown') {
      nextRow = Math.min(size - 1, row + 1);
      moved = true;
    } else if (e.key === 'ArrowLeft') {
      nextCol = Math.max(0, col - 1);
      moved = true;
    } else if (e.key === 'ArrowRight') {
      nextCol = Math.min(size - 1, col + 1);
      moved = true;
    } else if (e.key === 'Escape') {
      if (isKeyboardSelecting) {
        e.preventDefault();
        setIsKeyboardSelecting(false);
        setSelectionStart(null);
        setSelectionCurrent(null);
        setSelectedCells([]);
      }
      return;
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isKeyboardSelecting) {
        setIsKeyboardSelecting(true);
        setSelectionStart(focusedCell);
        setSelectionCurrent(focusedCell);
        setSelectedCells([focusedCell]);
        sounds.playTileTick();
      } else {
        if (selectedCells.length >= 3) {
          checkSelection(selectedCells);
        }
        setIsKeyboardSelecting(false);
        setSelectionStart(null);
        setSelectionCurrent(null);
        setSelectedCells([]);
      }
      return;
    }

    if (moved) {
      e.preventDefault();
      const nextCoord = { row: nextRow, col: nextCol };
      setFocusedCell(nextCoord);
      if (isKeyboardSelecting && selectionStart) {
        setSelectionCurrent(nextCoord);
        const snapped = calculateSnappedCells(selectionStart, nextCoord);
        setSelectedCells(snapped);
        sounds.playTileTick();
      }
    }
  };

  // Cell styles lookup for found words
  const isCellSelected = (r: number, c: number) => {
    return selectedCells.some(cell => cell.row === r && cell.col === c);
  };

  // Get color for already found word letter
  const getCellFoundMeta = (r: number, c: number): { isFound: boolean; color?: string } => {
    for (const w of words) {
      if (!w.found) continue;
      const [startR, startC] = w.start;
      const [dRow, dCol] = w.direction;
      const len = w.word.length;

      for (let i = 0; i < len; i++) {
        if (startR + i * dRow === r && startC + i * dCol === c) {
          return { isFound: true, color: w.color };
        }
      }
    }
    return { isFound: false };
  };

  return (
    <div className="flex flex-col items-center w-full select-none">
      {/* Zoom and Pan Controls */}
      <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-2 px-1 sm:px-2">
        <div className="flex items-center gap-2">
          <span className="font-mono uppercase tracking-wider text-xs bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
            {size} × {size} Grid
          </span>
          <span className={`text-xs font-mono px-2 py-0.5 rounded font-bold border inline-flex items-center gap-1 ${
            board.difficulty === 'standard'
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : board.difficulty === 'pro'
              ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
              : 'bg-violet-500/15 text-violet-300 border-violet-500/30'
          }`}>
            {board.difficulty === 'standard' ? (
              <span>Standard (H &amp; V)</span>
            ) : board.difficulty === 'pro' ? (
              <>
                <span>Pro (Diagonals)</span>
                <Sparkles className="w-3 h-3 shrink-0" />
              </>
            ) : (
              <>
                <span>Expert (8-Way)</span>
                <Zap className="w-3 h-3 shrink-0" />
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1 bg-dark-900 border border-slate-800 rounded-xl p-0.5">
          <button
            onClick={() => setZoomLevel(prev => Math.max(0.7, prev - 0.1))}
            className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-400"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs px-1.5 min-w-[40px] text-center select-none">{Math.round(zoomLevel * 100)}%</span>
          <button
            onClick={() => setZoomLevel(prev => Math.min(1.4, prev + 0.1))}
            className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-400"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-400"
            title="Reset Zoom"
            aria-label="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid Canvas Wrapper with Zoom Scaling */}
      <div className="w-full overflow-auto flex justify-center p-1 sm:p-2">
        <div
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
          className="transition-transform duration-150 ease-out"
        >
          <div
            ref={gridContainerRef}
            role="grid"
            aria-label={`Word search grid, ${size} by ${size}, ${board.theme} theme. Use arrow keys to move and Enter or Space to select words.`}
            tabIndex={disabled || isCovered ? -1 : 0}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsGridFocused(true)}
            onBlur={() => setIsGridFocused(false)}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            className={`wordrush-grid-board relative touch-no-select grid p-1.5 sm:p-2.5 rounded-2xl bg-dark-900 border border-slate-800/90 shadow-2xl overflow-hidden aspect-square focus-visible:outline-2 focus-visible:outline-emerald-400 focus-visible:outline-offset-2 ${
              isShaking ? 'animate-shake border-rose-500/50' : ''
            } ${
              disabled || isCovered ? 'opacity-85 pointer-events-none' : 'cursor-crosshair'
            }`}
            style={{
              gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`
            }}
          >
            {/* SVG Overlay for Found Word Highlight Capsules */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
              <defs>
                <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Render lines for found words */}
              {words.filter(w => w.found).map((w, idx) => {
                const cellW = 100 / size;
                const cellH = 100 / size;
                const x1 = `${(w.start[1] + 0.5) * cellW}%`;
                const y1 = `${(w.start[0] + 0.5) * cellH}%`;
                const x2 = `${(w.end[1] + 0.5) * cellW}%`;
                const y2 = `${(w.end[0] + 0.5) * cellH}%`;

                return (
                  <g key={`found-line-${idx}`}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={w.color}
                      strokeWidth={size >= 20 ? "20" : size >= 18 ? "22" : "24"}
                      strokeLinecap="round"
                      strokeOpacity="0.32"
                      filter="url(#neon-glow)"
                    />
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={w.color}
                      strokeWidth={size >= 20 ? "4" : "5"}
                      strokeLinecap="round"
                      strokeOpacity="0.8"
                    />
                  </g>
                );
              })}

              {/* Render active dragging selection tracer */}
              {selectionStart && selectionCurrent && selectedCells.length > 0 && (
                <line
                  x1={`${(selectionStart.col + 0.5) * (100 / size)}%`}
                  y1={`${(selectionStart.row + 0.5) * (100 / size)}%`}
                  x2={`${(selectedCells[selectedCells.length - 1].col + 0.5) * (100 / size)}%`}
                  y2={`${(selectedCells[selectedCells.length - 1].row + 0.5) * (100 / size)}%`}
                  stroke="#06b6d4"
                  strokeWidth={size >= 20 ? "22" : "26"}
                  strokeLinecap="round"
                  strokeOpacity="0.35"
                  className="animate-pulse"
                />
              )}

              {/* Render invalid wrong-selection tracer with red tint */}
              {invalidSelection && (
                <line
                  x1={`${(invalidSelection.start.col + 0.5) * (100 / size)}%`}
                  y1={`${(invalidSelection.start.row + 0.5) * (100 / size)}%`}
                  x2={`${(invalidSelection.end.col + 0.5) * (100 / size)}%`}
                  y2={`${(invalidSelection.end.row + 0.5) * (100 / size)}%`}
                  stroke="#ef4444"
                  strokeWidth={size >= 20 ? "22" : "26"}
                  strokeLinecap="round"
                  strokeOpacity="0.65"
                  className="transition-opacity duration-300"
                />
              )}
            </svg>

            {/* Letter Grid Cells */}
            {matrix.map((rowArr, r) =>
              rowArr.map((letter, c) => {
                const selected = !isCovered && isCellSelected(r, c);
                const foundMeta = !isCovered ? getCellFoundMeta(r, c) : { isFound: false, color: '' };
                const isCloaked = Boolean(!isCovered && !foundMeta.isFound && activeCloakedLetter && letter.toUpperCase() === activeCloakedLetter.toUpperCase());

                const halfSize = Math.floor(size / 2);
                const isInMist = Boolean(
                  !isCovered &&
                  !foundMeta.isFound &&
                  activeMistQuadrant !== null &&
                  activeMistQuadrant !== undefined &&
                  (activeMistQuadrant === 0 ? r < halfSize && c < halfSize :
                   activeMistQuadrant === 1 ? r < halfSize && c >= halfSize :
                   activeMistQuadrant === 2 ? r >= halfSize && c < halfSize :
                   r >= halfSize && c >= halfSize)
                );

                const isFocused = !isCovered && isGridFocused && focusedCell.row === r && focusedCell.col === c;

                return (
                  <div
                    key={`cell-${r}-${c}`}
                    role="gridcell"
                    aria-selected={selected}
                    aria-label={isCovered ? `Row ${r + 1} column ${c + 1}, hidden` : `Row ${r + 1} column ${c + 1}, letter ${letter}${foundMeta.isFound ? ', found' : ''}`}
                    className={`relative z-20 flex items-center justify-center font-mono font-bold select-none rounded-sm transition-transform duration-75 w-full h-full overflow-hidden ${
                      size === 20
                        ? 'text-xs sm:text-sm md:text-base leading-none'
                        : size === 18
                        ? 'text-xs sm:text-base md:text-lg leading-none'
                        : 'text-sm sm:text-lg md:text-xl leading-none'
                    } ${
                      isFocused ? 'ring-2 ring-amber-400 ring-inset bg-amber-400/20 text-white z-30' : ''
                    } ${
                      isCovered
                        ? 'text-slate-700/60 font-medium scale-95'
                        : selected
                        ? 'bg-cyan-500/40 text-cyan-200 scale-105 shadow-sm shadow-cyan-500/30'
                        : foundMeta.isFound
                        ? 'text-white font-extrabold'
                        : isCloaked
                        ? 'text-slate-800/40 font-black'
                        : isInMist
                        ? 'text-slate-600/40 blur-[2px] bg-slate-900/40'
                        : 'text-slate-300 hover:text-white'
                    }`}
                    style={{
                      textShadow: !isCovered && foundMeta.isFound
                        ? `0 0 10px ${foundMeta.color}, 0 0 20px ${foundMeta.color}`
                        : !isCovered && selected
                        ? '0 0 8px rgba(6, 182, 212, 0.9)'
                        : 'none'
                    }}
                  >
                    {isCovered ? '•' : isCloaked ? '•' : letter}
                  </div>
                );
              })
            )}

            {/* Frosted Anti-Peek Shield when board is covered or paused */}
            {(isCovered || isPaused) && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-dark-950/85 backdrop-blur-md rounded-2xl p-6 text-center animate-fade-in">
                <div className={`w-14 h-14 rounded-2xl bg-dark-900/90 border border-slate-700/80 shadow-2xl flex items-center justify-center mb-4 ${
                  isPaused ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {isPaused ? (
                    <Pause className="w-7 h-7 text-amber-400 stroke-[2.2]" />
                  ) : (
                    <EyeOff className="w-7 h-7 text-emerald-400 stroke-[2.2]" />
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mb-1">
                  {isPaused ? 'Game Paused' : 'Board Hidden for Fair Play'}
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mb-5 leading-relaxed">
                  {isPaused
                    ? 'Timer is paused. Board and word list are hidden to prevent exploit.'
                    : 'Letters and words are concealed so all contenders start with the exact same zero-second baseline.'}
                </p>
                {isPaused && onResumeTurn ? (
                  <button
                    onClick={onResumeTurn}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-dark-950 font-black text-xs sm:text-sm inline-flex items-center gap-2 shadow-xl shadow-emerald-500/25 hover:scale-105 active:scale-95 transition-all cursor-pointer pointer-events-auto"
                  >
                    <Play className="w-4 h-4 fill-dark-950" />
                    <span>Resume Game</span>
                  </button>
                ) : onStartTurn ? (
                  <button
                    onClick={onStartTurn}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-dark-950 font-black text-xs sm:text-sm inline-flex items-center gap-2 shadow-xl shadow-emerald-500/25 hover:scale-105 active:scale-95 transition-all cursor-pointer pointer-events-auto"
                  >
                    <Play className="w-4 h-4 fill-dark-950" />
                    <span>Start Turn (3.. 2.. 1..)</span>
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
