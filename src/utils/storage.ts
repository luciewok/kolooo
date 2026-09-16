import { Prize, SpinLog, SystemSettings, QuizQuestion, CompetitionEntry } from '../types';
import {
  saveEntryToIDB,
  getAllEntriesFromIDB,
  deleteEntryFromIDB,
  clearEntriesFromIDB,
  saveSpinToIDB,
  getAllSpinsFromIDB,
  clearSpinsFromIDB,
} from './offlineDb';

export const INITIAL_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'Jaký operační systém používají telefony Google Pixel?',
    options: [
      { id: 'q1_o1', text: 'iOS', isCorrect: false },
      { id: 'q1_o2', text: 'Harmony OS', isCorrect: false },
      { id: 'q1_o3', text: 'Android', isCorrect: true },
    ],
    explanation: 'Telefony Pixel běží na čistém operačním systému Android přímo od Googlu s prioritními aktualizacemi.',
  },
  {
    id: 'q2',
    question: 'Jak se jmenuje funkce u telefonů Pixel 11 Pro a Pixel 11 Pro XL, která umožňuje nastavit barevné světelné oznámení pro oblíbené kontakty?',
    options: [
      { id: 'q2_o1', text: 'HiLight', isCorrect: true },
      { id: 'q2_o2', text: 'Nejlepší kontakt', isCorrect: false },
      { id: 'q2_o3', text: 'Kdo to volá', isCorrect: false },
    ],
    explanation: 'Funkce HiLight nabízí barevná světelná oznámení pro vaše oblíbené kontakty.',
  },
  {
    id: 'q3',
    question: 'Jak dlouho systémovou podporu mají telefony řady Google Pixel 11?',
    options: [
      { id: 'q3_o1', text: '5 let', isCorrect: false },
      { id: 'q3_o2', text: '6 let', isCorrect: false },
      { id: 'q3_o3', text: '7 let', isCorrect: true },
    ],
    explanation: 'Google přináší špičkovou garanci 7 let plných systémových i bezpečnostních aktualizací.',
  },
  {
    id: 'q4',
    question: 'Jak se jmenuje AI funkce, která umožňuje vyhledat cokoliv na obrazovce pouhým zakroužkováním obrázku nebo textu?',
    options: [
      { id: 'q4_o1', text: 'Zakroužkuj a hledej (Circle to Search)', isCorrect: true },
      { id: 'q4_o2', text: 'Chytrý výběr (Smart Select)', isCorrect: false },
      { id: 'q4_o3', text: 'Lupa Google (Google Magnifier)', isCorrect: false },
    ],
    explanation: 'Sestava fotoaparátů zahrnuje hlavní snímač, teleobjektiv i ultra širokoúhlý objektiv.',
  },
  {
    id: 'q5',
    question: 'Co dělá nová funkce Kouzelná momentka?',
    options: [
      { id: 'q5_o1', text: 'Vytváří písničky pro aktuální náladu', isCorrect: false },
      { id: 'q5_o2', text: 'Nový režim ve fotoaparátu, který natáčí video a zároveň dělá automaticky fotky v plné kvalitě', isCorrect: true },
      { id: 'q5_o3', text: 'Vypne všechna upozornění abyste měli klid', isCorrect: false },
    ],
    explanation: 'Kouzelná momentka zachytí plynulé video a současně automaticky pořizuje fotografie v plné kvalitě.',
  },
  {
    id: 'q6',
    question: 'Mají telefony řady Pixel 11 vestavěné magnety pro magnetické příslušenství?',
    options: [
      { id: 'q6_o1', text: 'Ano', isCorrect: true },
      { id: 'q6_o2', text: 'Ne', isCorrect: false },
    ],
    explanation: 'Telefony Pixel 11 mají vestavěné magnety pro snadné přichycení magnetických držáků a bezdrátového příslušenství.',
  },
  {
    id: 'q7',
    question: 'Jaký maximální zoom ve fotoaparátu mohu udělat na telefonech Pixel 11 Pro a Pixel 11 Pro XL?',
    options: [
      { id: 'q7_o1', text: '30x', isCorrect: false },
      { id: 'q7_o2', text: '100x', isCorrect: false },
      { id: 'q7_o3', text: '120x', isCorrect: true },
    ],
    explanation: 'Pixel 11 Pro a Pixel 11 Pro XL umožňují až 120násobné přiblížení díky pokročilému Super Res Zoomu.',
  },
  {
    id: 'q8',
    question: 'Který AI asistent je integrován do Google Pixel telefonů?',
    options: [
      { id: 'q8_o1', text: 'Gemini', isCorrect: true },
      { id: 'q8_o2', text: 'Siri', isCorrect: false },
      { id: 'q8_o3', text: 'ChatGPT', isCorrect: false },
    ],
    explanation: 'Asistent Gemini od Googlu je hluboce integrován do celého systému telefonů Pixel.',
  },
];

export const DEFAULT_PRIZE_IMAGE_BY_ID: Record<string, string> = {
  p1: '/charger.png',
  p2: '/chargingstand.png',
  p3: '/kickstand.png',
  p4: '/adapter.png',
  p5: '/pixelbuds.png',
  p6: '/bryle.png',
  p7: '/lanyard.png',
  p8: '/termohrnek.png',
  p9: '/ponozky.png',
};

export function resolvePrizeImage(prize: Partial<Prize>): string | undefined {
  if (prize.image) return prize.image;
  if (prize.id && DEFAULT_PRIZE_IMAGE_BY_ID[prize.id]) {
    return DEFAULT_PRIZE_IMAGE_BY_ID[prize.id];
  }
  const lower = (prize.name || '').toLowerCase();
  if (lower.includes('kickstand')) return '/kickstand.png';
  if (lower.includes('stand') || lower.includes('stojánek') || lower.includes('stojan')) {
    if (lower.includes('magnetic') || lower.includes('magnetick')) {
      return '/kickstand.png';
    }
    return '/chargingstand.png';
  }
  if (lower.includes('charger') || lower.includes('nabíječ')) return '/charger.png';
  if (lower.includes('adapt') || lower.includes('67w')) return '/adapter.png';
  if (lower.includes('buds') || lower.includes('sluchátka')) return '/pixelbuds.png';
  if (lower.includes('brýle') || lower.includes('bryle') || lower.includes('sluneč')) return '/bryle.png';
  if (lower.includes('lanyard') || lower.includes('šňůrk') || lower.includes('snurk')) return '/lanyard.png';
  if (lower.includes('termohrnek') || lower.includes('hrnek') || lower.includes('mug')) return '/termohrnek.png';
  if (lower.includes('ponožk') || lower.includes('ponozk') || lower.includes('socks')) return '/ponozky.png';
  return undefined;
}

const INITIAL_PRIZES: Prize[] = [
  {
    id: 'p1',
    name: 'Qi2 Nabíječka',
    color: '#fff7f4', // porcelain pearl
    textColor: '#231510',
    weight: 5,
    active: true,
    image: '/charger.png',
  },
  {
    id: 'p2',
    name: 'Qi2 Stojánek',
    color: '#f5ded6', // soft blush porcelain
    textColor: '#231510',
    weight: 4,
    active: true,
    image: '/chargingstand.png',
  },
  {
    id: 'p3',
    name: 'Kickstand',
    color: '#faebe4', // delicate rose cream
    textColor: '#231510',
    weight: 6,
    active: true,
    image: '/kickstand.png',
  },
  {
    id: 'p4',
    name: '67W Adaptér',
    color: '#f1d7cc', // blush apricot
    textColor: '#231510',
    weight: 5,
    active: true,
    image: '/adapter.png',
  },
  {
    id: 'p5',
    name: 'Pixel Buds',
    color: '#f6d2c4', // rose gold champagne accent
    textColor: '#231510',
    weight: 3,
    active: true,
    image: '/pixelbuds.png',
  },
  {
    id: 'p6',
    name: 'Sluneční brýle',
    color: '#fff5f0', // silky porcelain white
    textColor: '#231510',
    weight: 7,
    active: true,
    image: '/bryle.png',
  },
  {
    id: 'p7',
    name: 'Lanyard',
    color: '#f8e2d9', // rose peach
    textColor: '#231510',
    weight: 8,
    active: true,
    image: '/lanyard.png',
  },
  {
    id: 'p8',
    name: 'Termohrnek',
    color: '#faede7', // warm porcelain
    textColor: '#231510',
    weight: 6,
    active: true,
    image: '/termohrnek.png',
  },
  {
    id: 'p9',
    name: 'Ponožky',
    color: '#fdf1ec', // warm delicate ivory
    textColor: '#231510',
    weight: 7,
    active: true,
    image: '/ponozky.png',
  },
];

const DEFAULT_SETTINGS: SystemSettings = {
  pin: '1234',
  eventTitle: 'Pixel 11',
  eventSubTitle: '',
  soundEnabled: true,
  minSpinsDuration: 5,
  minPassingScore: 5,
};

const STORAGE_KEYS = {
  PRIZES: 'kolo_stesti_prizes_v4',
  SETTINGS: 'kolo_stesti_settings',
  SPINS: 'kolo_stesti_spins',
  QUESTIONS: 'kolo_stesti_questions_v2',
  EMAILS: 'kolo_stesti_emails',
  DEVICE_UNLOCKED: 'kolo_stesti_device_unlocked',
};

// Safe storage wrapper with in-memory fallback for mobile / private browsing
const memoryStore: Record<string, string> = {};

const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {
      // Ignored - fallback to memory
    }
    return memoryStore[key] ?? null;
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Ignored - fallback to memory
    }
    memoryStore[key] = value;
  },
  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignored - fallback to memory
    }
    delete memoryStore[key];
  },
};

export function getStoredPrizes(): Prize[] {
  try {
    const data = safeStorage.getItem(STORAGE_KEYS.PRIZES);
    if (data) {
      const parsed: Prize[] = JSON.parse(data);
      // Migrate legacy saturated default colors if found
      const legacyColorMap: Record<string, { color: string; textColor: string }> = {
        '#174EA6': { color: '#fff7f4', textColor: '#231510' },
        '#A50E0E': { color: '#f5ded6', textColor: '#231510' },
        '#E37400': { color: '#faebe4', textColor: '#231510' },
        '#4285F4': { color: '#f1d7cc', textColor: '#231510' },
        '#EA4335': { color: '#fff5f0', textColor: '#231510' },
        '#FBBC04': { color: '#f8e2d9', textColor: '#231510' },
        '#34A853': { color: '#faede7', textColor: '#231510' },
        '#eab308': { color: '#f6d2c4', textColor: '#8e3a18' },
        '#3b82f6': { color: '#fff7f4', textColor: '#231510' },
      };

      const legacyNameMap: Record<string, string> = {
        'Qi2 Wireless Charger': 'Qi2 Nabíječka',
        'Qi2 Wireless Charger + Stand': 'Qi2 Stojánek',
        'Magnetic Kickstand': 'Kickstand',
        '67W Dual Port Power Adapter': '67W Adaptér',
        'Buds 2a': 'Pixel Buds',
      };

      const updated = parsed.map((p) => {
        let name = p.name;
        // Migrate legacy long English names to clean balanced names
        if (name && legacyNameMap[name]) {
          name = legacyNameMap[name];
        } else if (name && name.length > 0 && name[0] === name[0].toLowerCase() && name[0] !== name[0].toUpperCase()) {
          name = name.charAt(0).toUpperCase() + name.slice(1);
        }

        const image = p.image || resolvePrizeImage({ ...p, name });

        if (p.color && legacyColorMap[p.color]) {
          return {
            ...p,
            name,
            image,
            color: legacyColorMap[p.color].color,
            textColor: legacyColorMap[p.color].textColor,
          };
        }
        return { ...p, name, image };
      });

      return updated;
    }
  } catch (e) {
    console.error('Error loading stored prizes', e);
  }
  return INITIAL_PRIZES;
}

export function saveStoredPrizes(prizes: Prize[]) {
  try {
    safeStorage.setItem(STORAGE_KEYS.PRIZES, JSON.stringify(prizes));
  } catch (e) {
    console.error('Error saving prizes', e);
  }
}

export function getStoredSettings(): SystemSettings {
  try {
    const data = safeStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (data) {
      const parsed = JSON.parse(data);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        pin: parsed.pin ? String(parsed.pin).trim() : DEFAULT_SETTINGS.pin,
      };
    }
  } catch (e) {
    console.error('Error loading settings', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveStoredSettings(settings: SystemSettings) {
  try {
    const normalized: SystemSettings = {
      ...settings,
      pin: settings.pin ? String(settings.pin).trim() : '1234',
      updatedAt: settings.updatedAt || Date.now(),
    };
    safeStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(normalized));
  } catch (e) {
    console.error('Error saving settings', e);
  }
}

export function getStoredSpins(): SpinLog[] {
  try {
    const data = safeStorage.getItem(STORAGE_KEYS.SPINS);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error loading spins', e);
  }
  return [];
}

export function addSpinLog(prize: Prize): SpinLog {
  const spins = getStoredSpins();
  const newLog: SpinLog = {
    id: 'spin_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    prizeId: prize.id,
    prizeName: prize.name,
  };
  const updated = [newLog, ...spins];
  try {
    safeStorage.setItem(STORAGE_KEYS.SPINS, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving spin log', e);
  }
  // Also mirror to IndexedDB for persistent storage across demo mode wipes
  saveSpinToIDB(newLog).catch(() => {});
  return newLog;
}

export function clearSpinLogs() {
  try {
    safeStorage.removeItem(STORAGE_KEYS.SPINS);
  } catch (e) {
    console.error('Error clearing spin logs', e);
  }
  clearSpinsFromIDB().catch(() => {});
}

export function resetPrizesToDefault(): Prize[] {
  saveStoredPrizes(INITIAL_PRIZES);
  return INITIAL_PRIZES;
}

// --- Quiz Questions Storage ---
export function getStoredQuestions(): QuizQuestion[] {
  try {
    const data = safeStorage.getItem(STORAGE_KEYS.QUESTIONS);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error loading questions', e);
  }
  return INITIAL_QUIZ_QUESTIONS;
}

export function saveStoredQuestions(questions: QuizQuestion[]) {
  try {
    safeStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
  } catch (e) {
    console.error('Error saving questions', e);
  }
}

export function resetQuestionsToDefault(): QuizQuestion[] {
  saveStoredQuestions(INITIAL_QUIZ_QUESTIONS);
  return INITIAL_QUIZ_QUESTIONS;
}

// --- Competition Entries (Emails for Grand Prize) ---
export function getStoredCompetitionEntries(): CompetitionEntry[] {
  try {
    const data = safeStorage.getItem(STORAGE_KEYS.EMAILS);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error loading competition entries', e);
  }
  return [];
}

export function addCompetitionEntry(email: string, score: number, totalQuestions: number): CompetitionEntry {
  const entries = getStoredCompetitionEntries();
  const newEntry: CompetitionEntry = {
    id: 'entry_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    email: email.trim().toLowerCase(),
    timestamp: new Date().toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    score,
    totalQuestions,
  };
  const updated = [newEntry, ...entries];
  try {
    safeStorage.setItem(STORAGE_KEYS.EMAILS, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving competition entry', e);
  }
  // Also mirror to IndexedDB for persistent storage across demo mode wipes
  saveEntryToIDB(newEntry).catch(() => {});
  return newEntry;
}

export function deleteCompetitionEntry(id: string): CompetitionEntry[] {
  const entries = getStoredCompetitionEntries();
  const updated = entries.filter((e) => e.id !== id);
  try {
    safeStorage.setItem(STORAGE_KEYS.EMAILS, JSON.stringify(updated));
  } catch (e) {
    console.error('Error deleting entry', e);
  }
  deleteEntryFromIDB(id).catch(() => {});
  return updated;
}

export function clearCompetitionEntries() {
  try {
    safeStorage.removeItem(STORAGE_KEYS.EMAILS);
  } catch (e) {
    console.error('Error clearing competition entries', e);
  }
  clearEntriesFromIDB().catch(() => {});
}

// Safety check on startup: if demo mode wiped localStorage, recover from IndexedDB
export async function restoreStorageFromIndexedDB(): Promise<{
  restoredEntries: CompetitionEntry[];
  restoredSpins: SpinLog[];
}> {
  try {
    const localEntries = getStoredCompetitionEntries();
    const idbEntries = await getAllEntriesFromIDB();

    // Merge entries by id
    const entryMap = new Map<string, CompetitionEntry>();
    localEntries.forEach((e) => entryMap.set(e.id, e));
    idbEntries.forEach((e) => entryMap.set(e.id, e));
    const mergedEntries = Array.from(entryMap.values());

    if (mergedEntries.length > localEntries.length) {
      safeStorage.setItem(STORAGE_KEYS.EMAILS, JSON.stringify(mergedEntries));
    }

    // Merge spins by id
    const localSpins = getStoredSpins();
    const idbSpins = await getAllSpinsFromIDB();
    const spinMap = new Map<string, SpinLog>();
    localSpins.forEach((s) => spinMap.set(s.id, s));
    idbSpins.forEach((s) => spinMap.set(s.id, s));
    const mergedSpins = Array.from(spinMap.values());

    if (mergedSpins.length > localSpins.length) {
      safeStorage.setItem(STORAGE_KEYS.SPINS, JSON.stringify(mergedSpins));
    }

    return {
      restoredEntries: mergedEntries,
      restoredSpins: mergedSpins,
    };
  } catch (err) {
    console.warn('Could not restore from IndexedDB:', err);
    return {
      restoredEntries: getStoredCompetitionEntries(),
      restoredSpins: getStoredSpins(),
    };
  }
}

// --- Device Lock / Promoter Station Unlock ---
export function isDeviceUnlocked(): boolean {
  try {
    return safeStorage.getItem(STORAGE_KEYS.DEVICE_UNLOCKED) === 'true';
  } catch (e) {
    console.error('Error checking device lock', e);
  }
  return false;
}

export function setDeviceUnlocked(unlocked: boolean) {
  try {
    if (unlocked) {
      safeStorage.setItem(STORAGE_KEYS.DEVICE_UNLOCKED, 'true');
    } else {
      safeStorage.removeItem(STORAGE_KEYS.DEVICE_UNLOCKED);
    }
  } catch (e) {
    console.error('Error setting device lock', e);
  }
}
