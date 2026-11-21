import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Download,
  Upload,
  Play,
  Check,
  AlertCircle,
  X,
  Search,
  Eye,
  Sliders,
  Layers,
  FileText
} from 'lucide-react';
import {
  loadCustomThemes,
  saveCustomTheme,
  deleteCustomTheme,
  exportCustomThemesAsJson,
  importCustomThemesFromJson,
  parseWordsFromInput,
  SAMPLE_PRESETS,
  type CustomTheme
} from '../utils/customThemes';
import { THEMES } from '../utils/wordList';
import { generateGridBoard } from '../utils/gridGenerator';
import type { GridSize, GridBoard } from '../types/game';

interface AdminTopicsDashboardProps {
  onPlayTopic: (themeId: string, gridSize: GridSize) => void;
  onClose?: () => void;
}

export const AdminTopicsDashboard: React.FC<AdminTopicsDashboardProps> = ({
  onPlayTopic,
  onClose
}) => {
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>(() => loadCustomThemes());
  const [activeTab, setActiveTab] = useState<'custom' | 'builtin'>('custom');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  // Word Lists per tier
  const [activeTier, setActiveTier] = useState<14 | 18 | 22>(14);
  const [words14, setWords14] = useState<string[]>([]);
  const [words18, setWords18] = useState<string[]>([]);
  const [words22, setWords22] = useState<string[]>([]);
  
  // Input helpers
  const [singleWordInput, setSingleWordInput] = useState('');
  const [bulkTextInput, setBulkTextInput] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Live Test Board Preview Modal
  const [previewBoard, setPreviewBoard] = useState<GridBoard | null>(null);
  const [previewGridSize, setPreviewGridSize] = useState<GridSize>(16);

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const reloadThemes = () => {
    setCustomThemes(loadCustomThemes());
  };

  // Open editor for new topic
  const handleOpenCreate = () => {
    setEditingThemeId(null);
    setName('');
    setDescription('');
    setWords14([]);
    setWords18([]);
    setWords22([]);
    setSingleWordInput('');
    setBulkTextInput('');
    setShowBulkInput(false);
    setActiveTier(14);
    setIsEditorOpen(true);
  };

  // Open editor for existing topic
  const handleOpenEdit = (theme: CustomTheme) => {
    setEditingThemeId(theme.id);
    setName(theme.name);
    setDescription(theme.description);
    setWords14(theme.words14 || []);
    setWords18(theme.words18 || []);
    setWords22(theme.words22 || []);
    setSingleWordInput('');
    setBulkTextInput('');
    setShowBulkInput(false);
    setActiveTier(14);
    setIsEditorOpen(true);
  };

  // Clone built-in theme into custom editor
  const handleCloneBuiltin = (builtinKey: string) => {
    const builtin = THEMES[builtinKey];
    if (!builtin) return;
    setEditingThemeId(null);
    setName(`${builtin.name} (Custom)`);
    setDescription(builtin.description);
    // Auto-slice words into 14, 18, 22
    const cleanWords = builtin.words.map(w => w.toUpperCase().replace(/[^A-Z]/g, ''));
    setWords14(cleanWords.slice(0, 14));
    setWords18(cleanWords.slice(0, 18));
    setWords22(cleanWords.slice(0, 22));
    setActiveTier(14);
    setIsEditorOpen(true);
    notify(`Loaded "${builtin.name}" into editor as template!`);
  };

  // Duplicate an existing custom topic
  const handleDuplicateCustom = (theme: CustomTheme) => {
    saveCustomTheme({
      name: `${theme.name} (Copy)`,
      description: theme.description,
      words14: [...theme.words14],
      words18: [...theme.words18],
      words22: [...theme.words22]
    });
    reloadThemes();
    notify(`Created duplicate of "${theme.name}"`);
  };

  // Delete custom topic
  const handleDeleteCustom = (id: string, themeName: string) => {
    if (window.confirm(`Are you sure you want to delete the topic "${themeName}"?`)) {
      deleteCustomTheme(id);
      reloadThemes();
      notify(`Deleted topic "${themeName}"`);
    }
  };

  // Load a starter sample preset
  const handleLoadSample = (sample: typeof SAMPLE_PRESETS[0]) => {
    setName(sample.name);
    setDescription(sample.description);
    setWords14([...sample.words14]);
    setWords18([...sample.words18]);
    setWords22([...sample.words22]);
    notify(`Loaded preset "${sample.name}"`);
  };

  // Add single word to active tier
  const handleAddSingleWord = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!singleWordInput.trim()) return;

    const maxLen = activeTier === 14 ? 16 : activeTier === 18 ? 18 : 20;
    const { words, invalid } = parseWordsFromInput(singleWordInput, maxLen);

    if (invalid.length > 0) {
      notify(`Invalid word. Must be 3-${maxLen} letters without numbers/symbols.`, 'error');
      return;
    }

    const currentList = activeTier === 14 ? words14 : activeTier === 18 ? words18 : words22;
    const targetSetter = activeTier === 14 ? setWords14 : activeTier === 18 ? setWords18 : setWords22;

    const newWords = words.filter(w => !currentList.includes(w));
    if (newWords.length === 0) {
      notify(`Word is already in this list!`, 'error');
      return;
    }

    targetSetter([...currentList, ...newWords]);
    setSingleWordInput('');
  };

  // Add words via bulk paste
  const handleApplyBulkWords = () => {
    if (!bulkTextInput.trim()) return;
    const maxLen = activeTier === 14 ? 16 : activeTier === 18 ? 18 : 20;
    const { words, invalid } = parseWordsFromInput(bulkTextInput, maxLen);

    const currentList = activeTier === 14 ? words14 : activeTier === 18 ? words18 : words22;
    const targetSetter = activeTier === 14 ? setWords14 : activeTier === 18 ? setWords18 : setWords22;

    const combinedSet = new Set([...currentList, ...words]);
    targetSetter(Array.from(combinedSet));
    setBulkTextInput('');
    setShowBulkInput(false);

    let msg = `Added ${words.length} words to the ${activeTier}-word list!`;
    if (invalid.length > 0) msg += ` (${invalid.length} skipped as too long or invalid)`;
    notify(msg);
  };

  // Remove word from active tier
  const handleRemoveWord = (wordToRemove: string) => {
    if (activeTier === 14) {
      setWords14(words14.filter(w => w !== wordToRemove));
    } else if (activeTier === 18) {
      setWords18(words18.filter(w => w !== wordToRemove));
    } else {
      setWords22(words22.filter(w => w !== wordToRemove));
    }
  };

  // Smart action: Cascade downwards from 22 words
  const handleCascadeFrom22 = () => {
    if (words22.length < 14) {
      notify('You need at least 14 words in the 22-word tier to cascade!', 'error');
      return;
    }
    setWords14(words22.slice(0, 14));
    setWords18(words22.slice(0, 18));
    notify('Auto-populated 14-word and 18-word lists from your 22-word list!');
  };

  // Smart action: Copy 14 words to 18 and 22
  const handleCopy14Upwards = () => {
    if (words14.length === 0) {
      notify('14-word tier is empty!', 'error');
      return;
    }
    const combined18 = Array.from(new Set([...words18, ...words14]));
    const combined22 = Array.from(new Set([...words22, ...words14]));
    setWords18(combined18);
    setWords22(combined22);
    notify('Copied 14-word list into 18 and 22 word tiers!');
  };

  // Save Topic
  const handleSave = () => {
    if (!name.trim()) {
      notify('Please enter a topic title.', 'error');
      return;
    }

    if (words14.length < 14) {
      notify(`14-word list needs at least 14 words (currently has ${words14.length}).`, 'error');
      setActiveTier(14);
      return;
    }
    if (words18.length < 18) {
      notify(`18-word list needs at least 18 words (currently has ${words18.length}).`, 'error');
      setActiveTier(18);
      return;
    }
    if (words22.length < 22) {
      notify(`22-word list needs at least 22 words (currently has ${words22.length}).`, 'error');
      setActiveTier(22);
      return;
    }

    const saved = saveCustomTheme({
      id: editingThemeId || undefined,
      name,
      description,
      words14,
      words18,
      words22
    });

    reloadThemes();
    setIsEditorOpen(false);
    notify(`Saved topic "${saved.name}" successfully!`);
    return saved;
  };

  // Save & Play Immediately
  const handleSaveAndPlay = (gridSize: GridSize) => {
    const saved = handleSave();
    if (saved) {
      onPlayTopic(saved.id, gridSize);
    }
  };

  // Preview live test board
  const handleTestPreview = (gridSize: GridSize) => {
    const list = gridSize === 16 ? words14 : gridSize === 18 ? words18 : words22;
    const req = gridSize === 16 ? 14 : gridSize === 18 ? 18 : 22;
    if (list.length < req) {
      notify(`The ${req}-word list needs at least ${req} words to preview!`, 'error');
      return;
    }

    const board = generateGridBoard(gridSize, Date.now(), false, 'pro', undefined, list);
    setPreviewBoard(board);
    setPreviewGridSize(gridSize);
  };

  // Export JSON
  const handleExportJson = () => {
    const jsonStr = exportCustomThemesAsJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wordrush_custom_topics_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Exported custom topics JSON file!');
  };

  // Import JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      const res = importCustomThemesFromJson(content);
      if (res.success) {
        reloadThemes();
        notify(`Successfully imported ${res.importedCount} custom topics!`);
      } else {
        notify(`Import failed: ${res.error}`, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Filtered topics
  const filteredCustomThemes = useMemo(() => {
    if (!searchQuery.trim()) return customThemes;
    const q = searchQuery.toLowerCase();
    return customThemes.filter(
      t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.words.some(w => w.toLowerCase().includes(q))
    );
  }, [customThemes, searchQuery]);

  const activeWordList = activeTier === 14 ? words14 : activeTier === 18 ? words18 : words22;
  const targetCount = activeTier;
  const isTierComplete = activeWordList.length >= targetCount;

  return (
    <div className="w-full max-w-6xl mx-auto pb-12 pt-2 px-2 sm:px-4 text-slate-100">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-semibold transition-all backdrop-blur-md border ${
            notification.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-500/50'
              : 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50'
          }`}
        >
          {notification.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800/80 mb-6 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Admin Topic & Word Studio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Topic Management
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold font-mono">
                {customThemes.length} Custom Topics
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Create your own fresh topics and tailor specific 14, 18, and 22 word lists for each grid size (16x16, 18x18, and 20x20). Play them solo, duel friends, or host in Live Cloud Rooms!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleOpenCreate}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-950/50 cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Topic</span>
            </button>

            <label className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-dark-900 border border-slate-700/80 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-medium cursor-pointer transition-all">
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Import</span>
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>

            <button
              onClick={handleExportJson}
              disabled={customThemes.length === 0}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-dark-900 border border-slate-700/80 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-medium cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Download backup of custom topics"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl bg-dark-900 border border-slate-700/80 hover:border-slate-500 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition-all"
                title="Back to Game"
              >
                <X className="w-3.5 h-3.5" />
                <span>Close</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Tabs */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-dark-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'custom'
                  ? 'bg-slate-800 text-cyan-300 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Custom Topics ({customThemes.length})
            </button>
            <button
              onClick={() => setActiveTab('builtin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'builtin'
                  ? 'bg-slate-800 text-amber-300 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Built-in Themes ({Object.keys(THEMES).length})
            </button>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search topics or word keywords..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-dark-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Main Content: Custom Topics */}
      {activeTab === 'custom' && (
        <div>
          {filteredCustomThemes.length === 0 ? (
            <div className="glass-panel p-10 rounded-3xl border border-slate-800/80 text-center max-w-lg mx-auto my-8">
              <div className="w-14 h-14 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center mx-auto mb-3 text-cyan-400">
                <Sliders className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-200">No Custom Topics Yet</h3>
              <p className="text-xs text-slate-400 mt-1 mb-5">
                Create a customized topic with 14, 18, and 22 word sets, or start with one of our ready-to-play sample presets!
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={handleOpenCreate}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Topic from Scratch</span>
                </button>
                <button
                  onClick={() => {
                    handleOpenCreate();
                    handleLoadSample(SAMPLE_PRESETS[0]);
                  }}
                  className="px-4 py-2 rounded-xl bg-dark-900 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Load Aussie Preset</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomThemes.map(theme => (
                <div
                  key={theme.id}
                  className="glass-panel rounded-2xl border border-slate-800/80 p-4 hover:border-cyan-500/40 transition-all flex flex-col justify-between group shadow-lg bg-dark-900/60"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-400 border border-cyan-500/30 font-bold uppercase">
                          Custom Topic
                        </span>
                        <h3 className="text-base font-extrabold text-white mt-1 group-hover:text-cyan-300 transition-colors">
                          {theme.name}
                        </h3>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                      {theme.description || 'No description provided.'}
                    </p>

                    {/* Word Counts Badges for 14, 18, 22 */}
                    <div className="grid grid-cols-3 gap-1.5 mb-4 p-2 rounded-xl bg-dark-950 border border-slate-800/80 text-center">
                      <div className="p-1.5 rounded-lg bg-slate-900/60">
                        <div className="text-xs text-slate-400 font-mono">16x16</div>
                        <div className={`text-xs font-black ${theme.words14?.length >= 14 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {theme.words14?.length || 0} / 14
                        </div>
                        <div className="text-xs text-slate-400">words</div>
                      </div>

                      <div className="p-1.5 rounded-lg bg-slate-900/60">
                        <div className="text-xs text-slate-400 font-mono">18x18</div>
                        <div className={`text-xs font-black ${theme.words18?.length >= 18 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {theme.words18?.length || 0} / 18
                        </div>
                        <div className="text-xs text-slate-400">words</div>
                      </div>

                      <div className="p-1.5 rounded-lg bg-slate-900/60">
                        <div className="text-xs text-slate-400 font-mono">20x20</div>
                        <div className={`text-xs font-black ${theme.words22?.length >= 22 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {theme.words22?.length || 0} / 22
                        </div>
                        <div className="text-xs text-slate-400">words</div>
                      </div>
                    </div>

                    {/* Sample preview words */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {(theme.words14?.slice(0, 4) || theme.words.slice(0, 4)).map(w => (
                        <span
                          key={w}
                          className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800/60 text-slate-300 border border-slate-700/60"
                        >
                          {w}
                        </span>
                      ))}
                      {(theme.words.length > 4) && (
                        <span className="text-xs font-mono px-1.5 py-0.5 text-slate-400">
                          +{theme.words.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                    {/* Play buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onPlayTopic(theme.id, 16)}
                        className="px-2 py-1 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Play 16x16 (14 words)"
                      >
                        <Play className="w-3 h-3 fill-emerald-300" />
                        <span>16x16</span>
                      </button>
                      <button
                        onClick={() => onPlayTopic(theme.id, 18)}
                        className="px-2 py-1 rounded-lg bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Play 18x18 (18 words)"
                      >
                        <Play className="w-3 h-3 fill-cyan-300" />
                        <span>18x18</span>
                      </button>
                      <button
                        onClick={() => onPlayTopic(theme.id, 20)}
                        className="px-2 py-1 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Play 20x20 (22 words)"
                      >
                        <Play className="w-3 h-3 fill-indigo-300" />
                        <span>20x20</span>
                      </button>
                    </div>

                    {/* Manage buttons */}
                    <div className="flex items-center gap-1 text-slate-400">
                      <button
                        onClick={() => handleOpenEdit(theme)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                        title="Edit Topic"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDuplicateCustom(theme)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                        title="Duplicate Topic"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCustom(theme.id, theme.name)}
                        className="p-1.5 rounded-lg hover:bg-rose-950/50 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete Topic"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Content: Built-in Themes Explorer */}
      {activeTab === 'builtin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(THEMES).map(([key, theme]) => (
            <div
              key={key}
              className="glass-panel rounded-2xl border border-slate-800/80 p-4 hover:border-amber-500/40 transition-all flex flex-col justify-between group shadow-lg bg-dark-900/40"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-500/30 font-bold uppercase">
                      Built-in Theme
                    </span>
                    <h3 className="text-base font-extrabold text-white mt-1 group-hover:text-amber-300 transition-colors">
                      {theme.name}
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mb-3">{theme.description}</p>
                <div className="text-xs text-amber-300/80 font-mono mb-3">
                  Pool: {theme.words.length} master words
                </div>

                {/* Sample words */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {theme.words.slice(0, 5).map(w => (
                    <span
                      key={w}
                      className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800/60 text-slate-300 border border-slate-700/60"
                    >
                      {w}
                    </span>
                  ))}
                  <span className="text-xs font-mono px-1.5 py-0.5 text-slate-400">
                    +{theme.words.length - 5} more
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <button
                  onClick={() => handleCloneBuiltin(key)}
                  className="w-full px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Customize / Clone to 14, 18 & 22 Tiers</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TOPIC CREATOR / EDITOR MODAL */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-3xl glass-panel-glow rounded-3xl p-5 sm:p-7 my-auto text-slate-100 border-slate-700/80 relative shadow-2xl max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">
                    {editingThemeId ? 'Edit Topic & Word Lists' : 'Create New Topic'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Set up your topic details and tailored 14, 18, and 22 word sets
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-4">
              {/* Presets Quick Picker (only on new) */}
              {!editingThemeId && (
                <div className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Quick Inspiration Starter Presets:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SAMPLE_PRESETS.map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleLoadSample(sample)}
                        className="px-2.5 py-1 rounded-lg bg-dark-900 border border-slate-700/80 hover:border-cyan-400 text-slate-300 hover:text-white text-xs font-medium cursor-pointer transition-colors"
                      >
                        {sample.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Title & Description Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Topic Title *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Australian Animals, 90s Pop Culture..."
                    className="w-full px-3 py-2 rounded-xl bg-dark-950 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Description / Hint
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="e.g. Marvelous savanna runners and native critters..."
                    className="w-full px-3 py-2 rounded-xl bg-dark-950 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Word List Tiers (14, 18, 22) */}
              <div className="pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="text-xs font-bold text-slate-200">
                    Word Lists per Grid Difficulty:
                  </div>

                  {/* Smart Cascade / Copy Tools */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCascadeFrom22}
                      className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer flex items-center gap-1"
                      title="If you entered 22 words in Large, this fills 14 and 18 words automatically!"
                    >
                      <Layers className="w-3 h-3" />
                      <span>Cascade 22 &rarr; 18 & 14</span>
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={handleCopy14Upwards}
                      className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer flex items-center gap-1"
                      title="Copy 14 words into the 18 and 22 word tiers"
                    >
                      <span>Copy 14 &uarr; Upwards</span>
                    </button>
                  </div>
                </div>

                {/* Tier Selection Tabs */}
                <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-dark-950 border border-slate-800/80 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTier(14);
                      setShowBulkInput(false);
                    }}
                    className={`p-2 rounded-xl text-left transition-all ${
                      activeTier === 14
                        ? 'bg-emerald-950/80 border border-emerald-500/50 text-white shadow-lg'
                        : 'hover:bg-slate-900 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black">Small (16x16)</span>
                      <span
                        className={`text-xs font-mono px-1.5 py-0.5 rounded-md font-bold ${
                          words14.length >= 14 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {words14.length} / 14
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">Max 16 letters</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTier(18);
                      setShowBulkInput(false);
                    }}
                    className={`p-2 rounded-xl text-left transition-all ${
                      activeTier === 18
                        ? 'bg-cyan-950/80 border border-cyan-500/50 text-white shadow-lg'
                        : 'hover:bg-slate-900 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black">Medium (18x18)</span>
                      <span
                        className={`text-xs font-mono px-1.5 py-0.5 rounded-md font-bold ${
                          words18.length >= 18 ? 'bg-cyan-500/20 text-cyan-300' : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {words18.length} / 18
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">Max 18 letters</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTier(22);
                      setShowBulkInput(false);
                    }}
                    className={`p-2 rounded-xl text-left transition-all ${
                      activeTier === 22
                        ? 'bg-indigo-950/80 border border-indigo-500/50 text-white shadow-lg'
                        : 'hover:bg-slate-900 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black">Large (20x20)</span>
                      <span
                        className={`text-xs font-mono px-1.5 py-0.5 rounded-md font-bold ${
                          words22.length >= 22 ? 'bg-indigo-500/20 text-indigo-300' : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {words22.length} / 22
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">Max 20 letters</div>
                  </button>
                </div>

                {/* Word Entry Area */}
                <div className="p-3 rounded-2xl bg-dark-900/80 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-200">
                      Add words to {activeTier}-word list:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowBulkInput(!showBulkInput)}
                      className="text-xs text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3 h-3" />
                      <span>{showBulkInput ? 'Single Word Mode' : 'Bulk Paste Mode'}</span>
                    </button>
                  </div>

                  {showBulkInput ? (
                    <div>
                      <textarea
                        rows={3}
                        value={bulkTextInput}
                        onChange={e => setBulkTextInput(e.target.value)}
                        placeholder={`Paste words separated by commas, spaces, or newlines for the ${activeTier}-word list...`}
                        className="w-full p-2.5 rounded-xl bg-dark-950 border border-slate-700 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                      <div className="flex items-center justify-end gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setShowBulkInput(false)}
                          className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleApplyBulkWords}
                          className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow"
                        >
                          Apply Words
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleAddSingleWord} className="flex gap-2">
                      <input
                        type="text"
                        value={singleWordInput}
                        onChange={e => setSingleWordInput(e.target.value)}
                        placeholder={`Enter a word (max ${activeTier === 14 ? 16 : activeTier === 18 ? 18 : 20} letters)...`}
                        className="flex-1 px-3 py-2 rounded-xl bg-dark-950 border border-slate-700 text-xs font-mono uppercase text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </form>
                  )}

                  {/* Words Badges / Chips */}
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span>
                        Words in this tier: <strong className="text-white">{activeWordList.length}</strong> / {targetCount} required
                      </span>
                      {activeWordList.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (activeTier === 14) setWords14([]);
                            else if (activeTier === 18) setWords18([]);
                            else setWords22([]);
                          }}
                          className="text-rose-400 hover:underline text-xs cursor-pointer"
                        >
                          Clear tier
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1">
                      {activeWordList.length === 0 ? (
                        <div className="text-xs text-slate-400 italic py-2">
                          No words added yet for the {activeTier}-word tier. Add words above or use Bulk Paste.
                        </div>
                      ) : (
                        activeWordList.map((w, idx) => (
                          <span
                            key={w}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-950 border border-slate-700/80 text-xs font-mono text-cyan-200 group"
                          >
                            <span className="text-xs text-slate-400">{idx + 1}.</span>
                            <span>{w}</span>
                            <span className="text-xs text-slate-400">({w.length})</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveWord(w)}
                              className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Remove word"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-800 mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Test preview board button */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleTestPreview(activeTier === 14 ? 16 : activeTier === 18 ? 18 : 20)}
                  disabled={!isTierComplete}
                  className="w-full sm:w-auto px-3 py-2 rounded-xl bg-dark-900 border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Preview {activeTier}-Word Board</span>
                </button>
              </div>

              {/* Save & Save + Play */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all cursor-pointer shadow"
                >
                  Save Topic
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveAndPlay(activeTier === 14 ? 16 : activeTier === 18 ? 18 : 20)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-black text-xs shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Save & Play Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIVE TEST BOARD PREVIEW MODAL */}
      {previewBoard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl glass-panel-glow rounded-3xl p-5 my-auto text-slate-100 border-slate-700/80 relative shadow-2xl">
            <button
              onClick={() => setPreviewBoard(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-4">
              <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-mono font-bold uppercase">
                <Eye className="w-3.5 h-3.5" />
                <span>Board Test Preview</span>
              </div>
              <h3 className="text-xl font-black text-white">{name || 'Custom Topic'}</h3>
              <p className="text-xs text-slate-400">
                Grid Size: {previewGridSize}x{previewGridSize} &bull; Placed words: {previewBoard.words.length}
              </p>
            </div>

            {/* Matrix Display */}
            <div className="overflow-x-auto flex justify-center py-2">
              <div
                className="grid gap-[2px] bg-dark-950 p-2 rounded-2xl border border-slate-800 shadow-inner"
                style={{
                  gridTemplateColumns: `repeat(${previewGridSize}, minmax(0, 1fr))`
                }}
              >
                {previewBoard.matrix.map((row, r) =>
                  row.map((letter, c) => (
                    <div
                      key={`${r}-${c}`}
                      className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs font-mono font-black rounded text-slate-300 bg-slate-900/80"
                    >
                      {letter}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Placed Words List */}
            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="text-xs font-bold text-slate-300 mb-2">
                Placed Words ({previewBoard.words.length}):
              </div>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {previewBoard.words.map(w => (
                  <span
                    key={w.word}
                    className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-semibold"
                  >
                    {w.word}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setPreviewBoard(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
