export interface CustomTheme {
  id: string;
  name: string;
  description: string;
  words14: string[]; // 14 words for 16x16 grid
  words18: string[]; // 18 words for 18x18 grid
  words22: string[]; // 22 words for 20x20 grid
  words: string[];   // Combined / fallback list
  createdAt: number;
  updatedAt: number;
  isCustom: true;
}

const STORAGE_KEY = 'wordrush_custom_themes_v1';

export const SAMPLE_PRESETS: Array<Omit<CustomTheme, 'id' | 'createdAt' | 'updatedAt' | 'isCustom'>> = [
  {
    name: 'Aussie Bush & Outback',
    description: 'Iconic Australian wildlife, red dust tracks, and native bushcraft',
    words14: [
      'KANGAROO', 'KOALA', 'PLATYPUS', 'DINGO', 'WALLABY',
      'ECHIDNA', 'WOMAT', 'KOOKABURRA', 'BOOMERANG', 'BILLABONG',
      'DIDGERIDOO', 'OUTBACK', 'WARATAH', 'EUCALYPT'
    ],
    words18: [
      'KANGAROO', 'KOALA', 'PLATYPUS', 'DINGO', 'WALLABY',
      'ECHIDNA', 'WOMAT', 'KOOKABURRA', 'BOOMERANG', 'BILLABONG',
      'DIDGERIDOO', 'OUTBACK', 'WARATAH', 'EUCALYPT', 'CORROBOREE',
      'SWAGMAN', 'JACKAROO', 'BUSHWALKER'
    ],
    words22: [
      'KANGAROO', 'KOALA', 'PLATYPUS', 'DINGO', 'WALLABY',
      'ECHIDNA', 'WOMAT', 'KOOKABURRA', 'BOOMERANG', 'BILLABONG',
      'DIDGERIDOO', 'OUTBACK', 'WARATAH', 'EUCALYPT', 'CORROBOREE',
      'SWAGMAN', 'JACKAROO', 'BUSHWALKER', 'COCKATOO', 'FAIRDINKUM',
      'SHEEPDOG', 'BUSHFIRE'
    ],
    words: []
  },
  {
    name: '80s & 90s Retro Nostalgia',
    description: 'Quarter munchers, cassette tapes, pixel neon, and vintage pop culture',
    words14: [
      'CASSETTE', 'WALKMAN', 'JOYSTICK', 'CARTRIDGE', 'PIXELART',
      'SYNTHWAVE', 'HIGHSCORE', 'ROLLERBLADE', 'DISCMAN', 'POLAROID',
      'NEONGLOW', 'FLOPPYDISK', 'BOOMBOX', 'ARCADE'
    ],
    words18: [
      'CASSETTE', 'WALKMAN', 'JOYSTICK', 'CARTRIDGE', 'PIXELART',
      'SYNTHWAVE', 'HIGHSCORE', 'ROLLERBLADE', 'DISCMAN', 'POLAROID',
      'NEONGLOW', 'FLOPPYDISK', 'BOOMBOX', 'ARCADE', 'VIDEOTAPE',
      'GAMEBOY', 'EXTRALIFE', 'CHIPTUNE'
    ],
    words22: [
      'CASSETTE', 'WALKMAN', 'JOYSTICK', 'CARTRIDGE', 'PIXELART',
      'SYNTHWAVE', 'HIGHSCORE', 'ROLLERBLADE', 'DISCMAN', 'POLAROID',
      'NEONGLOW', 'FLOPPYDISK', 'BOOMBOX', 'ARCADE', 'VIDEOTAPE',
      'GAMEBOY', 'EXTRALIFE', 'CHIPTUNE', 'POWERGLOVE', 'TRACKBALL',
      'LASERDISC', 'SPEEDRUN'
    ],
    words: []
  },
  {
    name: 'Epic Myth & Legends',
    description: 'Mythical beasts, legendary artifacts, Olympian gods, and ancient lore',
    words14: [
      'MINOTAUR', 'PEGASUS', 'CENTAUR', 'VALKYRIE', 'MJOLNIR',
      'EXCALIBUR', 'LEVIATHAN', 'CHIMERA', 'MEDUSA', 'CERBERUS',
      'HYDRA', 'OLYMPUS', 'ATLANTIS', 'RAGNAROK'
    ],
    words18: [
      'MINOTAUR', 'PEGASUS', 'CENTAUR', 'VALKYRIE', 'MJOLNIR',
      'EXCALIBUR', 'LEVIATHAN', 'CHIMERA', 'MEDUSA', 'CERBERUS',
      'HYDRA', 'OLYMPUS', 'ATLANTIS', 'RAGNAROK', 'GRIFFIN',
      'BASILISK', 'KRAKEN', 'LABYRINTH'
    ],
    words22: [
      'MINOTAUR', 'PEGASUS', 'CENTAUR', 'VALKYRIE', 'MJOLNIR',
      'EXCALIBUR', 'LEVIATHAN', 'CHIMERA', 'MEDUSA', 'CERBERUS',
      'HYDRA', 'OLYMPUS', 'ATLANTIS', 'RAGNAROK', 'GRIFFIN',
      'BASILISK', 'KRAKEN', 'LABYRINTH', 'OUROBOROS', 'PANDORA',
      'PROMETHEUS', 'COLOSSUS'
    ],
    words: []
  }
];

export function cleanAndNormalizeWord(raw: string, maxLen: number = 20): string | null {
  const cleaned = raw.replace(/[^A-Za-z]/g, '').toUpperCase().trim();
  if (cleaned.length < 3 || cleaned.length > maxLen) {
    return null;
  }
  return cleaned;
}

export function parseWordsFromInput(
  input: string | string[],
  maxLen: number = 20
): { words: string[]; duplicates: string[]; invalid: string[] } {
  const rawList: string[] = Array.isArray(input)
    ? input
    : input
        .split(/[\n,;|\t]+/)
        .map(s => s.trim())
        .filter(Boolean);

  const seen = new Set<string>();
  const words: string[] = [];
  const duplicates: string[] = [];
  const invalid: string[] = [];

  for (const item of rawList) {
    const cleaned = cleanAndNormalizeWord(item, maxLen);
    if (!cleaned) {
      if (item.trim()) invalid.push(item.trim());
      continue;
    }
    if (seen.has(cleaned)) {
      duplicates.push(cleaned);
    } else {
      seen.add(cleaned);
      words.push(cleaned);
    }
  }

  return { words, duplicates, invalid };
}

export function loadCustomThemes(): CustomTheme[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(t => t && typeof t.id === 'string' && typeof t.name === 'string');
  } catch (err) {
    console.error('Failed to load custom themes:', err);
    return [];
  }
}

export function getCustomThemeById(id: string): CustomTheme | undefined {
  const themes = loadCustomThemes();
  return themes.find(t => t.id === id);
}

export function saveCustomTheme(
  themeInput: {
    id?: string;
    name: string;
    description: string;
    words14: string[];
    words18: string[];
    words22: string[];
    words?: string[];
  }
): CustomTheme {
  const themes = loadCustomThemes();
  const id = themeInput.id || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  const words14 = parseWordsFromInput(themeInput.words14, 16).words;
  const words18 = parseWordsFromInput(themeInput.words18, 18).words;
  const words22 = parseWordsFromInput(themeInput.words22, 20).words;

  // Union of words for fallback pool
  const unionSet = new Set<string>([
    ...words22,
    ...words18,
    ...words14,
    ...(themeInput.words || [])
  ]);
  const combinedWords = Array.from(unionSet);

  const existingIdx = themes.findIndex(t => t.id === id);
  const createdAt = existingIdx >= 0 ? themes[existingIdx].createdAt : now;

  const fullTheme: CustomTheme = {
    id,
    name: themeInput.name.trim() || 'Untitled Topic',
    description: themeInput.description.trim() || 'Custom Find-A-Word topic',
    words14,
    words18,
    words22,
    words: combinedWords,
    createdAt,
    updatedAt: now,
    isCustom: true
  };

  if (existingIdx >= 0) {
    themes[existingIdx] = fullTheme;
  } else {
    themes.unshift(fullTheme);
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
  }

  return fullTheme;
}

export function deleteCustomTheme(id: string): boolean {
  const themes = loadCustomThemes();
  const filtered = themes.filter(t => t.id !== id);
  if (filtered.length !== themes.length) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
    return true;
  }
  return false;
}

export function exportCustomThemesAsJson(): string {
  const themes = loadCustomThemes();
  return JSON.stringify(themes, null, 2);
}

export function importCustomThemesFromJson(jsonStr: string): {
  success: boolean;
  importedCount: number;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      return { success: false, importedCount: 0, error: 'JSON content must be an array of themes' };
    }

    let count = 0;
    for (const item of parsed) {
      if (!item || typeof item.name !== 'string') continue;
      saveCustomTheme({
        id: item.id,
        name: item.name,
        description: item.description || '',
        words14: item.words14 || [],
        words18: item.words18 || [],
        words22: item.words22 || [],
        words: item.words || []
      });
      count++;
    }

    return { success: true, importedCount: count };
  } catch (err: any) {
    return { success: false, importedCount: 0, error: err.message || 'Invalid JSON format' };
  }
}
