import React, { useState, useMemo, useRef } from 'react';
import { Prize, SpinLog, SystemSettings, CompetitionEntry, QuizQuestion } from '../types';
import { resolvePrizeImage } from '../utils/storage';
import LZString from 'lz-string';
import {
  Plus,
  Trash2,
  Edit2,
  Key,
  Volume2,
  VolumeX,
  RotateCcw,
  Check,
  X,
  ListFilter,
  History,
  Settings as SettingsIcon,
  Eye,
  EyeOff,
  Trophy,
  Download,
  Mail,
  Search,
  Lock,
  HelpCircle,
  Users,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Package,
  Infinity,
  AlertCircle,
  Cloud,
  CloudUpload,
  CloudOff,
  RefreshCw,
  CheckCircle,
  HardDrive,
  ShieldCheck,
  Smartphone,
  BarChart3,
} from 'lucide-react';
import { QuestionEditModal } from './QuestionEditModal';
import { PWAInstallButton } from './PWAInstallButton';
import { GoogleSheetsSyncStatus, subscribeGoogleSheetsStatus, triggerSheetsSync } from '../services/googleSheets';

interface AdminPanelProps {
  prizes: Prize[];
  spins: SpinLog[];
  settings: SystemSettings;
  competitionEntries: CompetitionEntry[];
  questions: QuizQuestion[];
  onUpdatePrizes: (prizes: Prize[]) => void;
  onUpdateSettings: (settings: SystemSettings) => void;
  onClearSpins: () => void;
  onResetPrizes: () => void;
  onDeleteEntry: (id: string) => void;
  onClearEntries: () => void;
  onUpdateQuestions: (questions: QuizQuestion[]) => void;
  onResetQuestions: () => void;
  onLockDevice?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  prizes,
  spins,
  settings,
  competitionEntries,
  questions,
  onUpdatePrizes,
  onUpdateSettings,
  onClearSpins,
  onResetPrizes,
  onDeleteEntry,
  onClearEntries,
  onUpdateQuestions,
  onResetQuestions,
  onLockDevice,
}) => {
  const [activeTab, setActiveTab] = useState<
    'prizes' | 'spins' | 'contestants' | 'questions' | 'settings'
  >('prizes');

  // Prize Edit Modal state
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form State for Prize
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState('#fff7f4');
  const [formWeight, setFormWeight] = useState<number>(5);
  const [formActive, setFormActive] = useState<boolean>(true);
  const [formHasStockLimit, setFormHasStockLimit] = useState<boolean>(false);
  const [formStock, setFormStock] = useState<number | ''>(10);
  const [formImage, setFormImage] = useState<string | undefined>(undefined);

  // PIN change state
  const [newPin, setNewPin] = useState('');
  const [showPinSuccess, setShowPinSuccess] = useState(false);
  const [savedPinDisplay, setSavedPinDisplay] = useState('');
  const [pinError, setPinError] = useState('');
  const [showCurrentPin, setShowCurrentPin] = useState(true);
  const [showNewPin, setShowNewPin] = useState(true);

  // Search in contestants
  const [searchQuery, setSearchQuery] = useState('');

  // Search in spins history
  const [spinsSearch, setSpinsSearch] = useState('');

  const [sheetsStatus, setSheetsStatus] = useState<GoogleSheetsSyncStatus | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const exportData = {
        prizes,
        settings,
        questions
      };
      // For file export, we don't need compression, raw JSON is perfectly fine and safe
      const jsonStr = JSON.stringify(exportData, null, 2);
      
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kolo_stesti_nastaveni.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Chyba při exportu: ' + String(err));
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const fileContent = event.target?.result as string;
        let jsonStr = fileContent.trim();
        let importData;

        // Try parsing directly (new raw JSON format)
        try {
          importData = JSON.parse(jsonStr);
        } catch {
          // If it fails, try the old compression formats just in case they uploaded a .txt with the old code
          try {
            if (jsonStr.startsWith('%7B') || jsonStr.startsWith('ey')) {
              try {
                 jsonStr = decodeURIComponent(escape(atob(jsonStr)));
              } catch {
                 jsonStr = LZString.decompressFromBase64(jsonStr) || '';
              }
            } else {
              jsonStr = LZString.decompressFromBase64(jsonStr) || '';
            }
            importData = JSON.parse(jsonStr);
          } catch {
             throw new Error('Nelze přečíst formát souboru.');
          }
        }
        
        if (importData && importData.prizes && importData.settings && importData.questions) {
          if (confirm('Opravdu chcete přepsat aktuální nastavení, výhry a otázky kvízu? Tato akce je nevratná.')) {
            onUpdatePrizes(importData.prizes);
            onUpdateSettings(importData.settings);
            onUpdateQuestions(importData.questions);
            alert('✅ Import ze souboru proběhl úspěšně!');
          }
        } else {
          alert('❌ Neplatný nebo poškozený soubor s nastavením.');
        }
      } catch (err) {
        alert('❌ Chyba při čtení souboru. Zkontrolujte, zda jste vybrali správný .json soubor.');
      }
      
      // Reset the file input so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  React.useEffect(() => {
    return subscribeGoogleSheetsStatus((status) => {
      setSheetsStatus(status);
    });
  }, []);



  // Metrics calculations
  const totalSpins = spins.length;
  const activePrizesCount = prizes.filter(
    (p) => p.active && (p.stock === undefined || p.stock === null || p.stock > 0)
  ).length;
  const outOfStockCount = prizes.filter(
    (p) => p.stock !== undefined && p.stock !== null && p.stock <= 0
  ).length;
  const totalContestants = competitionEntries.length;

  // Filtered competition entries
  const filteredEntries = competitionEntries.filter((e) =>
    e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.timestamp.includes(searchQuery)
  );

  // Prize distribution statistics from spins (how many of each item won / given out)
  const prizeStats = useMemo(() => {
    const counts: Record<string, number> = {};
    spins.forEach((s) => {
      const key = s.prizeId || s.prizeName || 'Neznámá výhra';
      counts[key] = (counts[key] || 0) + 1;
    });

    const statsList: Array<{
      id: string;
      name: string;
      color: string;
      count: number;
      percentage: number;
      stock?: number | null;
      active: boolean;
    }> = [];

    const processedKeys = new Set<string>();

    prizes.forEach((p) => {
      const countById = counts[p.id] || 0;
      const countByName = counts[p.name] || 0;
      const count = countById || countByName;
      processedKeys.add(p.id);
      processedKeys.add(p.name);

      statsList.push({
        id: p.id,
        name: p.name,
        color: p.color,
        count,
        percentage: spins.length > 0 ? (count / spins.length) * 100 : 0,
        stock: p.stock,
        active: p.active,
      });
    });

    // In case there are historical spins of deleted prizes
    Object.keys(counts).forEach((key) => {
      if (!processedKeys.has(key)) {
        const count = counts[key];
        statsList.push({
          id: key,
          name: key,
          color: '#e5a995',
          count,
          percentage: spins.length > 0 ? (count / spins.length) * 100 : 0,
          stock: null,
          active: false,
        });
      }
    });

    return statsList.sort((a, b) => b.count - a.count);
  }, [spins, prizes]);

  // Filtered spins list
  const filteredSpins = useMemo(() => {
    if (!spinsSearch.trim()) return spins;
    const q = spinsSearch.toLowerCase();
    return spins.filter(
      (s) =>
        s.prizeName.toLowerCase().includes(q) ||
        s.timestamp.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
    );
  }, [spins, spinsSearch]);

  // Open Edit Modal
  const handleOpenEdit = (prize: Prize) => {
    setEditingPrize(prize);
    setIsAddingNew(false);
    setFormName(prize.name);
    setFormColor(prize.color);
    setFormWeight(prize.weight || 5);
    setFormActive(prize.active);
    setFormImage(prize.image);
    if (prize.stock !== undefined && prize.stock !== null) {
      setFormHasStockLimit(true);
      setFormStock(prize.stock);
    } else {
      setFormHasStockLimit(false);
      setFormStock(10);
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingPrize(null);
    setIsAddingNew(true);
    setFormName('');
    setFormColor('#fff7f4');
    setFormWeight(5);
    setFormActive(true);
    setFormHasStockLimit(false);
    setFormStock(10);
    setFormImage(undefined);
  };

  // Save Prize
  const handleSavePrize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const stockValue = formHasStockLimit
      ? (typeof formStock === 'number' && !isNaN(formStock) ? Math.max(0, formStock) : 0)
      : null;

    if (isAddingNew) {
      const newPrize: Prize = {
        id: 'p_' + Date.now(),
        name: formName.trim(),
        color: formColor,
        textColor: '#231510',
        weight: formWeight,
        active: formActive,
        stock: stockValue,
        initialStock: stockValue,
        image: formImage,
      };
      onUpdatePrizes([...prizes, newPrize]);
    } else if (editingPrize) {
      const updated = prizes.map((p) =>
        p.id === editingPrize.id
          ? {
              ...p,
              name: formName.trim(),
              color: formColor,
              weight: formWeight,
              active: formActive,
              stock: stockValue,
              initialStock: formHasStockLimit ? (editingPrize.initialStock ?? stockValue) : null,
              image: formImage,
            }
          : p
      );
      onUpdatePrizes(updated);
    }
    setIsAddingNew(false);
    setEditingPrize(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 200;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > MAX_DIM) {
            h = Math.round(h * (MAX_DIM / w));
            w = MAX_DIM;
          }
        } else {
          if (h > MAX_DIM) {
            w = Math.round(w * (MAX_DIM / h));
            h = MAX_DIM;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/webp', 0.8);
          setFormImage(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Quick add stock helper
  const handleQuickAddStock = (id: string, count: number) => {
    const updated = prizes.map((p) => {
      if (p.id === id) {
        const current = typeof p.stock === 'number' ? p.stock : 0;
        const next = Math.max(0, current + count);
        return {
          ...p,
          stock: next,
          initialStock: Math.max(p.initialStock ?? next, next),
          active: true,
        };
      }
      return p;
    });
    onUpdatePrizes(updated);
  };

  // Delete Prize
  const handleDeletePrize = (id: string) => {
    if (prizes.length <= 2) {
      alert('Kolo musí mít alespoň 2 položky.');
      return;
    }
    if (window.confirm('Opravdu chcete tuto výhru odstranit?')) {
      onUpdatePrizes(prizes.filter((p) => p.id !== id));
    }
  };

  // Toggle active
  const handleToggleActive = (id: string) => {
    const updated = prizes.map((p) =>
      p.id === id ? { ...p, active: !p.active } : p
    );
    onUpdatePrizes(updated);
  };

  // Change Admin PIN (applies to both Admin Panel and Kiosk Lock)
  const handleChangePin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPinError('');
    setShowPinSuccess(false);

    const clean = newPin.replace(/\D/g, '');

    if (clean.length !== 4) {
      setPinError('PIN musí mít přesně 4 číslice (např. 1234, 2026).');
      return;
    }

    onUpdateSettings({ ...settings, pin: clean, updatedAt: Date.now() });
    setSavedPinDisplay(clean);
    setShowPinSuccess(true);
    setNewPin('');
    setTimeout(() => setShowPinSuccess(false), 8000);
  };

  // Question Edit Modal state
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);

  const handleOpenEditQuestion = (q: QuizQuestion) => {
    setEditingQuestion(q);
    setIsQuestionModalOpen(true);
  };

  const handleOpenAddQuestion = () => {
    setEditingQuestion(null);
    setIsQuestionModalOpen(true);
  };

  const handleSaveQuestion = (saved: QuizQuestion) => {
    if (editingQuestion) {
      const updated = questions.map((q) => (q.id === saved.id ? saved : q));
      onUpdateQuestions(updated);
    } else {
      onUpdateQuestions([...questions, saved]);
    }
  };

  const handleDeleteQuestion = (id: string) => {
    if (questions.length <= 1) {
      alert('Kvíz musí obsahovat alespoň jednu otázku.');
      return;
    }
    if (window.confirm('Opravdu chcete tuto otázku smazat?')) {
      const updated = questions.filter((q) => q.id !== id);
      onUpdateQuestions(updated);
    }
  };

  const handleMoveQuestion = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    const reordered = [...questions];
    const temp = reordered[idx];
    reordered[idx] = reordered[targetIdx];
    reordered[targetIdx] = temp;
    onUpdateQuestions(reordered);
  };

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-4">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-light text-white tracking-wide">
            Ovládací panel obsluhy
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Správa cen kola štěstí, otázek kvízu a slosování soutěžních e-mailů.
          </p>
        </div>

        {onLockDevice && (
          <button
            onClick={onLockDevice}
            className="self-start sm:self-auto flex items-center gap-2 border border-rose-500/30 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 hover:text-white px-4 py-2 rounded-full text-xs font-medium transition cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span>Uzamknout tablet pro návštěvníky</span>
          </button>
        )}
      </div>

      {/* Google Sheets Sync Banner */}
      {sheetsStatus && sheetsStatus.pendingCount > 0 ? (
        <div className="mb-5 p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 backdrop-blur-md text-sky-200 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CloudUpload className="w-5 h-5 text-sky-400 shrink-0" />
            <div>
              <p className="font-medium text-sky-300">
                Ve frontě čeká {sheetsStatus.pendingCount} {sheetsStatus.pendingCount === 1 ? 'záznam' : 'záznamů'} na odeslání do Google Tabulky
              </p>
              <p className="text-slate-400 text-[11px]">
                Zařízení je možná offline. Data jsou bezpečně zapsána lokálně v paměti a odešlou se po připojení k internetu.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => triggerSheetsSync()}
              disabled={sheetsStatus.isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-100 rounded-xl text-xs font-medium transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sheetsStatus.isSyncing ? 'animate-spin' : ''}`} />
              <span>Odeslat nyní</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* Top Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 mb-5 sm:mb-6">
        {/* Metric 1 */}
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-md flex flex-col justify-between">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            CELKEM ROZTOČENÍ
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-light text-white font-mono">
              {totalSpins}
            </span>
            <span className="text-xs text-slate-400">provedených her</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-md flex flex-col justify-between">
          <p className="text-[11px] font-bold text-[#e5a995] uppercase tracking-wider mb-1">
            SOUTĚŽNÍ E-MAILY (8/8)
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-light text-[#f5d5c8] font-mono">
              {totalContestants}
            </span>
            <span className="text-xs text-slate-400">do hlavního slosování</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-md flex flex-col justify-between">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            AKTIVNÍ VÝHRY
          </p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-3xl sm:text-4xl font-light text-white font-mono">
              {activePrizesCount}
            </span>
            <span className="text-xs text-slate-400">
              z {prizes.length} na kole
              {outOfStockCount > 0 && (
                <span className="ml-1 text-rose-400 font-medium">
                  ({outOfStockCount} vyčerpáno)
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="border-b border-white/10 mb-5 sm:mb-6 flex gap-4 sm:gap-6 text-xs sm:text-sm font-medium overflow-x-auto">
        <button
          onClick={() => setActiveTab('prizes')}
          className={`pb-3 flex items-center gap-1.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'prizes'
              ? 'border-[#e5a995] text-[#f5d5c8]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ListFilter className="w-4 h-4 text-[#e5a995]" />
          <span>Správa výher</span>
        </button>

        <button
          onClick={() => setActiveTab('contestants')}
          className={`pb-3 flex items-center gap-1.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'contestants'
              ? 'border-[#e5a995] text-[#f5d5c8]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-4 h-4 text-[#e5a995]" />
          <span>Soutěžící & E-maily ({totalContestants})</span>
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`pb-3 flex items-center gap-1.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'questions'
              ? 'border-[#e5a995] text-[#f5d5c8]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <HelpCircle className="w-4 h-4 text-[#e5a995]" />
          <span>Otázky kvízu ({questions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('spins')}
          className={`pb-3 flex items-center gap-1.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'spins'
              ? 'border-[#e5a995] text-[#f5d5c8]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4 text-[#e5a995]" />
          <span>Historie roztočení</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 flex items-center gap-1.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'settings'
              ? 'border-[#e5a995] text-[#f5d5c8]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <SettingsIcon className="w-4 h-4 text-[#e5a995]" />
          <span>Nastavení systému</span>
        </button>
      </div>

      {/* TAB 1: SPRÁVA VÝHER */}
      {activeTab === 'prizes' && (
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-medium text-white">
                Seznam položek kola
              </h2>
              <p className="text-xs text-slate-400">
                Upravte položky, barvy a váhu pravděpodobnosti (1-10).
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={onResetPrizes}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#e5a995]" />
                <span>Obnovit výchozí</span>
              </button>

              <button
                onClick={handleOpenAdd}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-[#f5d5c8] to-[#e5a995] text-[#1c120e] font-semibold px-4 py-2 rounded-xl text-xs shadow-[0_0_20px_rgba(229,169,149,0.3)] hover:shadow-[0_0_25px_rgba(229,169,149,0.5)] transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Přidat výhru</span>
              </button>
            </div>
          </div>

          {/* Out of stock alert banner if any items are exhausted */}
          {outOfStockCount > 0 && (
            <div className="mb-4 px-4 py-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <strong>{outOfStockCount} {outOfStockCount === 1 ? 'položka je vyčerpána' : outOfStockCount < 5 ? 'položky jsou vyčerpány' : 'položek je vyčerpáno'}</strong> (0 ks) a byly automaticky odstraněny z kola štěstí. V administraci zůstávají evidovány.
                </span>
              </div>
              <span className="text-[11px] text-rose-300/80">
                Pro návrat na kolo doplňte počet kusů (kliknutím na +5 ks nebo Upravit)
              </span>
            </div>
          )}

          {/* Table */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-white/[0.06] text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="px-5 py-3">Název výhry</th>
                    <th className="px-5 py-3">Barva</th>
                    <th className="px-5 py-3">Váha (1-10)</th>
                    <th className="px-5 py-3">Kusy / Sklad</th>
                    <th className="px-5 py-3">Stav na kole</th>
                    <th className="px-5 py-3 text-right">Akce</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {prizes.map((prize) => {
                    const hasLimit = prize.stock !== undefined && prize.stock !== null;
                    const isOutOfStock = hasLimit && (prize.stock ?? 0) <= 0;

                    return (
                      <tr
                        key={prize.id}
                        className={`transition ${
                          isOutOfStock
                            ? 'bg-rose-950/15 hover:bg-rose-950/25'
                            : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        <td className="px-5 py-3.5 font-medium text-white flex items-center gap-3">
                          {resolvePrizeImage(prize) ? (
                            <img
                              src={resolvePrizeImage(prize)}
                              alt={prize.name}
                              className="w-8 h-8 rounded-lg object-contain bg-white/5 border border-white/10 p-0.5 shrink-0"
                            />
                          ) : (
                            <div
                              className="w-4 h-4 rounded-full border border-white/30 shrink-0"
                              style={{ backgroundColor: prize.color }}
                            />
                          )}
                          <span className={isOutOfStock ? 'text-slate-300 line-through decoration-rose-500/50' : ''}>
                            {prize.name}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 font-mono text-xs text-slate-400">
                          {prize.color}
                        </td>

                        <td className="px-5 py-3.5 font-mono font-medium text-slate-200">
                          {prize.weight}
                        </td>

                        {/* Stock limit column */}
                        <td className="px-5 py-3.5">
                          {!hasLimit ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                              <Infinity className="w-3.5 h-3.5 text-slate-400" />
                              <span>Neomezeno</span>
                            </span>
                          ) : isOutOfStock ? (
                            <div className="inline-flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-300 font-mono bg-rose-500/15 border border-rose-500/35 px-2.5 py-1 rounded-full">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                                <span>Vyčerpáno (0 ks)</span>
                              </span>
                              <button
                                onClick={() => handleQuickAddStock(prize.id, 5)}
                                className="px-2 py-0.5 text-[11px] font-medium text-[#f5d5c8] bg-white/5 hover:bg-white/10 border border-white/15 rounded-lg transition cursor-pointer"
                                title="Rychle doplnit 5 ks"
                              >
                                +5 ks
                              </button>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-[#f5d5c8] font-mono font-medium bg-[#e5a995]/10 border border-[#e5a995]/30 px-2.5 py-1 rounded-full">
                              <Package className="w-3.5 h-3.5 text-[#e5a995]" />
                              <span>{prize.stock} ks zbývá</span>
                            </span>
                          )}
                        </td>

                        {/* Status on wheel */}
                        <td className="px-5 py-3.5">
                          {isOutOfStock ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/25 cursor-default"
                              title="Vyčerpáno: Položka je automaticky odstraněna z kola štěstí. Pro vrácení doplňte počet kusů."
                            >
                              Vyřazeno (0 ks)
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleActive(prize.id)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition ${
                                prize.active
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
                              }`}
                            >
                              {prize.active ? 'Aktivní na kole' : 'Vypnuto'}
                            </button>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEdit(prize)}
                            className="p-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                            title="Upravit položku a zásobu"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeletePrize(prize.id)}
                            className="p-1.5 rounded-lg border border-rose-500/20 hover:border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition cursor-pointer"
                            title="Smazat položku"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SOUTĚŽÍCÍ & E-MAILY (SLOSOVÁNÍ O HLAVNÍ CENU) */}
      {activeTab === 'contestants' && (
        <div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-medium text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#e5a995]" />
                  <span>Soutěžící pro slosování o hlavní cenu</span>
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Seznam účastníků z tohoto zařízení. Všichni, kteří správně zodpověděli všech 8 otázek kvízu a zadali e-mail.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Odeslat frontu button */}
              <button
                onClick={() => triggerSheetsSync()}
                disabled={sheetsStatus?.isSyncing}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer disabled:opacity-50"
                title="Odeslat čekající frontu záznamů do Tabulky"
              >
                <CloudUpload className={`w-3.5 h-3.5 text-emerald-400 ${sheetsStatus?.isSyncing ? 'animate-spin' : ''}`} />
                <span>Odeslat do Tabulky ({sheetsStatus?.pendingCount ?? 0})</span>
              </button>
            </div>
          </div>

          {/* Sync & Persistence Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <HardDrive className="w-4 h-4 text-[#e5a995]" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Trvalé úložiště</p>
                <p className="text-slate-200 font-medium">IndexedDB + LocalStorage</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <CloudUpload className="w-4 h-4 text-sky-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Čekající fronta (Google Sheets)</p>
                <p className="text-slate-200 font-medium">
                  {sheetsStatus?.pendingCount === 0
                    ? '0 položek (Vše odesláno)'
                    : `${sheetsStatus?.pendingCount} položek k odeslání`}
                </p>
              </div>
            </div>
          </div>

          {/* Search bar & count */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Hledat e-mail nebo datum..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/10 focus:border-[#e5a995] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition"
              />
            </div>

            {competitionEntries.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Opravdu chcete smazat všechny zaznamenané soutěžní e-maily? Tuto akci nelze vrátit.')) {
                    onClearEntries();
                  }
                }}
                className="text-xs text-rose-400 hover:text-rose-300 transition cursor-pointer flex items-center gap-1.5 self-end sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vymazat všechny e-maily</span>
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
            {filteredEntries.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <Mail className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                <p className="text-base font-light text-slate-300 mb-1">
                  Zatím žádné soutěžní e-maily
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Jakmile návštěvník zodpoví všech 8 otázek správně a zadá svůj e-mail, objeví se zde pro závěrečné slosování.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-white/[0.06] text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-white/10">
                    <tr>
                      <th className="px-5 py-3">#</th>
                      <th className="px-5 py-3">E-mail soutěžícího</th>
                      <th className="px-5 py-3">Datum a čas registrace</th>
                      <th className="px-5 py-3">Výsledek kvízu</th>
                      <th className="px-5 py-3 text-right">Akce</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredEntries.map((entry, index) => (
                      <tr key={entry.id} className="hover:bg-white/[0.03] transition">
                        <td className="px-5 py-3 font-mono text-xs text-slate-500">
                          {index + 1}
                        </td>
                        <td className="px-5 py-3 font-medium text-white flex items-center gap-2">
                          <Mail className="w-4 h-4 text-[#e5a995] shrink-0" />
                          <span className="font-mono text-xs sm:text-sm">{entry.email}</span>
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-400 font-mono">
                          {entry.timestamp}
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            {entry.score} / {entry.totalQuestions} (100 %)
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => onDeleteEntry(entry.id)}
                            className="p-1.5 rounded-lg border border-rose-500/20 hover:border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition cursor-pointer"
                            title="Odstranit soutěžícího"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: OTÁZKY KVÍZU */}
      {activeTab === 'questions' && (
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-medium text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#e5a995]" />
                <span>Otázky kvízu ({questions.length} {questions.length === 1 ? 'otázka' : questions.length < 5 ? 'otázky' : 'otázek'})</span>
              </h2>
              <p className="text-xs text-slate-400">
                Kliknutím na „Upravit“ můžete změnit znění otázky, varianty odpovědí, správnou volbu i doplňující vysvětlení.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleOpenAddQuestion}
                className="flex items-center gap-2 bg-gradient-to-r from-[#fcefe9] via-[#f5d5c8] to-[#e5a995] text-[#1c120e] font-semibold px-4 py-2 rounded-xl text-xs transition cursor-pointer shadow-sm hover:shadow-[0_0_20px_rgba(229,169,149,0.3)] active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Přidat novou otázku</span>
              </button>

              <button
                onClick={() => {
                  if (window.confirm('Opravdu chcete obnovit výchozí sadu 8 otázek o Google Pixel 11? Vaše případné úpravy budou nahrazeny.')) {
                    onResetQuestions();
                  }
                }}
                className="flex items-center gap-2 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer"
                title="Obnovit výchozích 8 otázek"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#e5a995]" />
                <span>Obnovit výchozí</span>
              </button>
            </div>
          </div>

          {/* Question cards list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="bg-white/[0.04] border border-white/10 hover:border-white/20 rounded-2xl p-5 backdrop-blur-md flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#e5a995]/15 text-[#e5a995] text-[11px] font-semibold">
                      Otázka {idx + 1} z {questions.length}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Move Up */}
                      {idx > 0 && (
                        <button
                          onClick={() => handleMoveQuestion(idx, 'up')}
                          className="p-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                          title="Posunout nahoru"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Move Down */}
                      {idx < questions.length - 1 && (
                        <button
                          onClick={() => handleMoveQuestion(idx, 'down')}
                          className="p-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                          title="Posunout dolů"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Edit Button */}
                      <button
                        onClick={() => handleOpenEditQuestion(q)}
                        className="px-2.5 py-1.5 rounded-lg border border-[#e5a995]/30 hover:border-[#e5a995] bg-[#e5a995]/10 hover:bg-[#e5a995]/20 text-[#f5d5c8] hover:text-white transition cursor-pointer flex items-center gap-1 text-xs font-medium"
                        title="Upravit otázku a možnosti"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Upravit</span>
                      </button>

                      {/* Delete Button */}
                      {questions.length > 1 && (
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1.5 rounded-lg border border-rose-500/20 hover:border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 transition cursor-pointer"
                          title="Smazat otázku"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm sm:text-base font-normal text-white mb-3 leading-snug">
                    {q.question}
                  </h3>

                  <div className="space-y-1.5 mb-3">
                    {q.options.map((opt, optIdx) => (
                      <div
                        key={opt.id || optIdx}
                        className={`p-2.5 rounded-xl text-xs flex items-center justify-between border ${
                          opt.isCorrect
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-medium'
                            : 'bg-white/[0.02] border-white/5 text-slate-400'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[11px]">
                            {['A', 'B', 'C', 'D'][optIdx] || optIdx + 1})
                          </span>
                          <span>{opt.text}</span>
                        </span>
                        {opt.isCorrect && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-semibold uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Správná
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {q.explanation && (
                  <div className="pt-2 border-t border-white/5 text-[11px] text-slate-400 italic">
                    {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: HISTORIE ROZTOČENÍ & STATISTIKA ROZDANÝCH CEN */}
      {activeTab === 'spins' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-medium text-white flex items-center gap-2">
                <History className="w-5 h-5 text-[#e5a995]" />
                <span>Historie roztočení & statistika rozdaných cen</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Přehled všech proběhlých zatočení kola a souhrnná statistika kolik jakých cen bylo rozdáno.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {spins.length > 0 && (
                <>
                  <button
                    onClick={() => {
                      if (window.confirm('Opravdu chcete vymazat celou historii točení? Tato akce smaže záznamy roztočení.')) {
                        onClearSpins();
                      }
                    }}
                    className="flex items-center gap-2 border border-rose-500/20 hover:border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 px-3.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer"
                    title="Vymazat záznamy točení"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Vymazat historii</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 backdrop-blur-md">
              <span className="text-xs text-slate-400 block mb-1">Celkem rozdáno cen</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-light text-white font-mono">{totalSpins}</span>
                <span className="text-xs text-[#e5a995]">vytočených cen</span>
              </div>
            </div>

            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 backdrop-blur-md">
              <span className="text-xs text-slate-400 block mb-1">Druhů rozdaných cen</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-light text-white font-mono">
                  {prizeStats.filter((p) => p.count > 0).length}
                </span>
                <span className="text-xs text-slate-400">z {prizes.length} položek na kole</span>
              </div>
            </div>

            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 backdrop-blur-md">
              <span className="text-xs text-slate-400 block mb-1">Nejčastější výhra</span>
              <div className="truncate">
                {prizeStats.length > 0 && prizeStats[0].count > 0 ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-medium text-white truncate">
                      {prizeStats[0].name}
                    </span>
                    <span className="text-xs text-emerald-400 font-mono shrink-0">
                      {prizeStats[0].count}× ({prizeStats[0].percentage.toFixed(0)}%)
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 italic">Zatím bez točení</span>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 1: STATISTIKA ROZDANÝCH VĚCÍ (KOLIK ČEHO BYLO VYTOČENO) */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 sm:p-6 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-medium text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#e5a995]" />
                  <span>Statistika rozdaných výher</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Přehled kolik kusů jednotlivých dárků / cen již hráči vytočili a kolik zbývá na skladě.
                </p>
              </div>
            </div>

            {spins.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm border border-white/5 rounded-xl bg-black/20">
                Zatím neproběhlo žádné roztočení kola. Po prvním zatočení se zde automaticky zobrazí počty rozdaných položek.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {prizeStats.map((item) => {
                  const hasStock = item.stock !== undefined && item.stock !== null;
                  const isOutOfStock = hasStock && item.stock! <= 0;

                  return (
                    <div
                      key={item.id}
                      className="bg-black/25 border border-white/10 hover:border-white/20 rounded-xl p-4 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {resolvePrizeImage(item) ? (
                              <img
                                src={resolvePrizeImage(item)}
                                alt={item.name}
                                className="w-8 h-8 rounded-lg object-contain bg-white/5 border border-white/10 p-0.5 shrink-0"
                              />
                            ) : (
                              <span
                                className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/20 shadow-sm"
                                style={{ backgroundColor: item.color }}
                              />
                            )}
                            <h4 className="text-sm font-medium text-white truncate" title={item.name}>
                              {item.name}
                            </h4>
                          </div>

                          {/* Rozdáno badge */}
                          <div className="shrink-0 flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-[#e5a995]/20 text-[#f5d5c8] border border-[#e5a995]/40 shadow-sm">
                              Rozdáno: {item.count} ks
                            </span>
                          </div>
                        </div>

                        {/* Progress distribution bar */}
                        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden mb-2.5">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(item.percentage, item.count > 0 ? 3 : 0)}%`,
                              backgroundColor: item.color || '#e5a995',
                            }}
                          />
                        </div>
                      </div>

                      {/* Stock and percentage stats footer */}
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-white/5">
                        <span className="font-mono">
                          {item.percentage.toFixed(1)} % ze všech točení
                        </span>

                        <div>
                          {!hasStock ? (
                            <span className="text-slate-400 text-[11px] inline-flex items-center gap-1">
                              <Infinity className="w-3 h-3 text-slate-500" />
                              <span>Sklad neomezen</span>
                            </span>
                          ) : isOutOfStock ? (
                            <span className="text-rose-400 font-medium text-[11px] inline-flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              <span>Sklad vyčerpán (0 ks)</span>
                            </span>
                          ) : (
                            <span className="text-[#f5d5c8] text-[11px] inline-flex items-center gap-1">
                              <Package className="w-3 h-3 text-[#e5a995]" />
                              <span>Zbývá na skladě: {item.stock} ks</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: PODROBNÝ ZÁZNAM JEDNOTLIVÝCH ROZTOČENÍ */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-base font-medium text-white">
                  Jednotlivá zatočení kola ({filteredSpins.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Časově řazený seznam proběhlých her.
                </p>
              </div>

              {spins.length > 0 && (
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={spinsSearch}
                    onChange={(e) => setSpinsSearch(e.target.value)}
                    placeholder="Filtrovat podle výhry..."
                    className="w-full bg-black/30 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#e5a995] transition"
                  />
                  {spinsSearch && (
                    <button
                      onClick={() => setSpinsSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </div>

            {spins.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Zatím neproběhlo žádné roztočení kola.
              </div>
            ) : filteredSpins.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Zadanému filtru neodpovídá žádné roztočení.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-white/[0.06] text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-white/10 sticky top-0 backdrop-blur-md">
                    <tr>
                      <th className="px-5 py-3">Čas točení</th>
                      <th className="px-5 py-3">Vytočená výhra</th>
                      <th className="px-5 py-3 text-right">Identifikátor točení</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredSpins.map((spin) => (
                      <tr key={spin.id} className="hover:bg-white/[0.03] transition">
                        <td className="px-5 py-3 font-mono text-xs text-slate-400">
                          {spin.timestamp}
                        </td>
                        <td className="px-5 py-3 font-medium text-white flex items-center gap-2">
                          <Trophy className="w-3.5 h-3.5 text-[#e5a995]" />
                          <span>{spin.prizeName}</span>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-500 text-right">
                          {spin.id}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: NASTAVENÍ SYSTÉMU */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Webhook Configuration for Google Sheets */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-6 md:col-span-2">
            <div>
              <h3 className="text-lg font-medium text-white mb-1 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-sky-400" />
                <span>Google Tabulky – Automatické propojení (Webhook)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Data z kvízů (e-maily, skóre) a točení kolem štěstí (výhry) se mohou automaticky ukládat přímo do vaší Google Tabulky přes Google Apps Script webhook.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Název tabletu (Stanoviště)
                </label>
                <input
                  type="text"
                  value={settings.stationName || 'Tablet 1'}
                  onChange={(e) => onUpdateSettings({ ...settings, stationName: e.target.value })}
                  placeholder="Např. Promo Tablet Vlevo"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/50 transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  URL adresa Webhooku (Google Apps Script)
                </label>
                <input
                  type="url"
                  value={settings.googleSheetWebhookUrl || ''}
                  onChange={(e) => onUpdateSettings({ ...settings, googleSheetWebhookUrl: e.target.value })}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/50 transition"
                />
              </div>
            </div>

            <div className="p-4 bg-sky-950/20 border border-sky-900/30 rounded-xl">
              <h4 className="text-sm font-semibold text-sky-300 mb-2">Jak Webhook nastavit?</h4>
              <ol className="list-decimal pl-4 text-xs text-sky-100/70 space-y-1.5">
                <li>Otevřete si prázdnou Google Tabulku.</li>
                <li>V menu klikněte na <strong>Rozšíření</strong> &rarr; <strong>Apps Script</strong>.</li>
                <li>Nahraďte veškerý kód <a href="/google-apps-script.js" target="_blank" rel="noopener noreferrer" className="text-sky-400 underline">tímto skriptem</a> (otevře se v novém okně).</li>
                <li>Klikněte na <strong>Nasadit (Deploy)</strong> &rarr; <strong>Nové nasazení (New deployment)</strong>.</li>
                <li>Typ vyberte <strong>Webová aplikace</strong>, Přístup nastavte na <strong>Kdokoli (Anyone)</strong> a klikněte nasadit.</li>
                <li>Zkopírujte vygenerovanou webovou URL adresu a vložte ji do pole výše.</li>
              </ol>
            </div>
          </div>

          {/* Security & Access Box */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-1 flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#e5a995]" />
                <span>Bezpečnostní PIN stanoviště</span>
              </h3>
              <p className="text-xs text-slate-400">
                Jediný 4místný číselný PIN kód, který platí jak pro odemčení tabletu (kiosku), tak pro vstup do tohoto ovládacího panelu.
              </p>
            </div>

            {/* Currently Active PIN Display */}
            <div className="p-4 bg-black/40 rounded-2xl border border-white/15 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-medium">
                  Aktuálně aktivní PIN:
                </span>
                <span className="font-mono text-white text-xl font-bold tracking-widest mt-1 block">
                  {showCurrentPin ? (settings.pin || '1234') : '••••'}
                </span>
                <span className="text-[11px] text-emerald-400 mt-0.5 block">
                  ● Platí pro odemčení obrazovky i administraci
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowCurrentPin(!showCurrentPin)}
                className="p-2.5 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer"
                title={showCurrentPin ? 'Skrýt PIN' : 'Zobrazit aktuální PIN'}
              >
                {showCurrentPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Change PIN Form */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#e5a995]" />
                  <span>Zadat nový 4místný PIN</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Zadejte 4 číslice pomocí klávesnice nebo tlačítek níže a potvrďte uložení.
                </p>
              </div>

              {/* 4 Digit Visual Display & Direct Input */}
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 sm:gap-3 py-2">
                  {[0, 1, 2, 3].map((idx) => {
                    const digit = newPin[idx];
                    return (
                      <div
                        key={idx}
                        className={`w-12 h-14 sm:w-14 sm:h-16 rounded-2xl border flex items-center justify-center text-xl font-bold font-mono transition ${
                          digit
                            ? 'border-[#e5a995] bg-[#e5a995]/15 text-[#f5d5c8] shadow-[0_0_15px_rgba(229,169,149,0.3)]'
                            : idx === newPin.length
                            ? 'border-white/40 bg-white/5 text-white/40 animate-pulse'
                            : 'border-white/10 bg-black/20 text-slate-600'
                        }`}
                      >
                        {digit ? (showNewPin ? digit : '•') : ''}
                      </div>
                    );
                  })}
                </div>

                {/* Direct hidden/accessible input */}
                <div className="flex items-center gap-2">
                  <input
                    type={showNewPin ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setNewPin(clean);
                      setPinError('');
                    }}
                    placeholder="Nebo zadejte čísla klávesnicí..."
                    className="flex-1 bg-black/30 border border-white/15 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#e5a995] transition font-mono text-center tracking-widest text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="p-2.5 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer"
                    title={showNewPin ? 'Skrýt číslice' : 'Zobrazit číslice'}
                  >
                    {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Touch Keypad for tablet convenience */}
                <div className="grid grid-cols-3 gap-2 pt-1 max-w-[280px] mx-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => {
                        if (newPin.length < 4) {
                          setNewPin((prev) => prev + digit);
                          setPinError('');
                        }
                      }}
                      className="h-11 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 transition border border-white/10 text-lg font-semibold text-white flex items-center justify-center cursor-pointer select-none"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setNewPin('');
                      setPinError('');
                    }}
                    className="h-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] active:scale-95 transition border border-white/10 text-xs font-semibold text-red-400 flex items-center justify-center cursor-pointer select-none uppercase"
                  >
                    Smazat
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (newPin.length < 4) {
                        setNewPin((prev) => prev + '0');
                        setPinError('');
                      }
                    }}
                    className="h-11 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 transition border border-white/10 text-lg font-semibold text-white flex items-center justify-center cursor-pointer select-none"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewPin((prev) => prev.slice(0, -1));
                      setPinError('');
                    }}
                    className="h-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] active:scale-95 transition border border-white/10 text-xs font-semibold text-slate-300 flex items-center justify-center cursor-pointer select-none uppercase"
                  >
                    Zpět
                  </button>
                </div>

                {pinError && (
                  <p className="text-rose-400 text-xs font-medium text-center">{pinError}</p>
                )}

                {showPinSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      PIN byl úspěšně změněn na: <strong>{savedPinDisplay}</strong>! Platí ihned pro celou aplikaci.
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleChangePin()}
                  disabled={newPin.length !== 4}
                  className={`w-full py-3 rounded-xl font-semibold transition cursor-pointer text-xs shadow-md flex items-center justify-center gap-2 ${
                    newPin.length === 4
                      ? 'bg-gradient-to-r from-[#f5d5c8] to-[#e5a995] text-[#1c120e] hover:opacity-95 shadow-[0_0_15px_rgba(229,169,149,0.3)]'
                      : 'bg-white/10 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>
                    {newPin.length === 4 ? `Uložit nový PIN (${newPin})` : 'Zadejte 4 číslice pro uložení'}
                  </span>
                </button>
              </div>
            </div>

            {onLockDevice && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onLockDevice}
                  className="w-full flex items-center justify-center gap-2 border border-rose-500/30 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 hover:text-white font-medium py-2.5 rounded-xl transition cursor-pointer text-xs"
                >
                  <Lock className="w-4 h-4 text-rose-400" />
                  <span>Uzamknout obrazovku stanoviště (otestovat PIN)</span>
                </button>
              </div>
            )}
          </div>

          {/* Audio & Efekty */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-medium text-white mb-1 flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-[#e5a995]" />
                <span>Zvukové efekty a pravidla</span>
              </h3>
              <p className="text-xs text-slate-400">
                Nastavení zvuku a podmínky pro roztočení kola štěstí.
              </p>
            </div>

            {/* Min passing score rule */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white">Min. počet správných odpovědí pro postup ke kolu</p>
                <p className="text-xs text-slate-400">
                  Pokud hráč nezíská alespoň tolik bodů, zobrazí se hláška s možností zkusit to znovu.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min={1}
                  max={questions.length || 8}
                  value={settings.minPassingScore ?? 5}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    const val = isNaN(parsed) ? 1 : Math.max(1, Math.min(questions.length || 8, parsed));
                    onUpdateSettings({
                      ...settings,
                      minPassingScore: val,
                    });
                  }}
                  className="w-16 text-center font-mono font-semibold text-white bg-black/40 border border-white/20 rounded-xl py-2 text-sm focus:outline-none focus:border-[#e5a995]"
                />
                <span className="text-xs text-slate-400 font-mono">z {questions.length || 8}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Zvuky kola a fanfáry</p>
                <p className="text-xs text-slate-400">
                  {settings.soundEnabled ? 'Zvuky jsou zapnuté' : 'Zvuky jsou ztlumené'}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    ...settings,
                    soundEnabled: !settings.soundEnabled,
                  })
                }
                className={`p-3 rounded-full border transition cursor-pointer ${
                  settings.soundEnabled
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-white/5 border-white/10 text-slate-500'
                }`}
                title={settings.soundEnabled ? 'Ztlumit zvuky' : 'Zapnout zvuky'}
              >
                {settings.soundEnabled ? (
                  <Volume2 className="w-5 h-5" />
                ) : (
                  <VolumeX className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Kiosk / PWA Instalace na tablety */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4 sm:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-medium text-white mb-1 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-[#e5a995]" />
                  <span>Kiosk mód a instalace na tablety (PWA)</span>
                </h3>
                <p className="text-xs text-slate-400 max-w-2xl">
                  Aplikaci lze nainstalovat přímo na plochu Android tabletu i iPadu. Po spuštění z plochy běží v celoobrazovkovém kiosk režimu bez adresního řádku prohlížeče a záložek.
                </p>
              </div>

              <div className="shrink-0">
                <PWAInstallButton className="px-5 py-2.5 text-xs font-semibold" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs text-slate-300">
              <div className="bg-black/30 border border-white/10 rounded-xl p-3.5">
                <p className="font-medium text-white mb-1">Jak nainstalovat na Android tablet:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400">
                  <li>Otevřete odkaz v Google Chrome.</li>
                  <li>Klepněte na tlačítko <strong>„Nainstalovat na plochu“</strong> nahoře nebo v menu Chrome zvolte <em>„Přidat na plochu“</em>.</li>
                  <li>Otevřete novou ikonu z plochy tabletu.</li>
                </ol>
              </div>

              <div className="bg-black/30 border border-white/10 rounded-xl p-3.5">
                <p className="font-medium text-white mb-1">Jak nainstalovat na iPad (Safari):</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400">
                  <li>Otevřete odkaz v Safari.</li>
                  <li>Klepněte na ikonu <strong>Sdílet</strong> (čtvereček se šipkou).</li>
                  <li>Zvolte <strong>„Přidat na plochu“</strong>.</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Export / Import Settings */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4 sm:col-span-2">
            <div>
              <h3 className="text-lg font-medium text-white mb-1 flex items-center gap-2">
                <Download className="w-5 h-5 text-[#e5a995]" />
                <span>Export a Import nastavení (Soubor)</span>
              </h3>
              <p className="text-xs text-slate-400 max-w-2xl">
                Tato funkce vám umožní snadno stáhnout veškeré nastavení (výhry, pravděpodobnosti, otázky kvízu, PIN a ikony) jako malý soubor a nahrát jej do jakéhokoliv jiného zařízení.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <input 
                type="file"
                accept=".json,.txt"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={handleExport}
                className="w-full flex items-center justify-center gap-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-white font-medium py-4 rounded-xl transition cursor-pointer text-sm"
              >
                <Download className="w-5 h-5 text-sky-400" />
                <div className="text-left leading-tight">
                  <div className="font-semibold">Uložit do souboru</div>
                  <div className="text-[10px] text-slate-400">Stáhne se soubor .json</div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleImport}
                className="w-full flex items-center justify-center gap-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#e5a995]/50 text-white font-medium py-4 rounded-xl transition cursor-pointer text-sm"
              >
                <CloudUpload className="w-5 h-5 text-[#e5a995]" />
                <div className="text-left leading-tight">
                  <div className="font-semibold">Nahrát ze souboru</div>
                  <div className="text-[10px] text-slate-400">Vyberte .json soubor ze zařízení</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRIZE ADD / EDIT MODAL */}
      {(isAddingNew || editingPrize) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0f172a] border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => {
                setIsAddingNew(false);
                setEditingPrize(null);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-6">
              {isAddingNew ? 'Přidat novou výhru' : 'Upravit výhru'}
            </h3>

            <form onSubmit={handleSavePrize} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Název výhry
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="např. Qi2 Wireless Charger"
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Barva výseče
                </label>
                <div className="flex items-center gap-3 mb-2">
                  <input
                    type="color"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="w-10 h-10 rounded-xl border border-white/20 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white text-xs font-mono"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Předvolby:</span>
                  {[
                    { label: 'Porcelán', hex: '#fff7f4' },
                    { label: 'Růžová', hex: '#f5ded6' },
                    { label: 'Meruňka', hex: '#faebe4' },
                    { label: 'Pudr', hex: '#f1d7cc' },
                    { label: 'Zlato', hex: '#f6d2c4' },
                  ].map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setFormColor(preset.hex)}
                      className={`w-6 h-6 rounded-full border transition cursor-pointer ${
                        formColor.toLowerCase() === preset.hex.toLowerCase()
                          ? 'border-[#e5a995] ring-2 ring-[#e5a995]/50 scale-110'
                          : 'border-white/20 hover:scale-105'
                      }`}
                      style={{ backgroundColor: preset.hex }}
                      title={preset.label}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Váha pravděpodobnosti (1 - 10)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formWeight}
                    onChange={(e) => setFormWeight(parseInt(e.target.value))}
                    className="w-full accent-white cursor-pointer"
                  />
                  <span className="text-white font-mono font-bold w-6 text-center">
                    {formWeight}
                  </span>
                </div>
              </div>

              {/* Vlastní ikona (Obrázek) */}
              <div className="pt-3 border-t border-white/10 space-y-3">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Ikona (Obrázek)
                </label>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl border-2 border-dashed border-white/20 bg-black/40 flex items-center justify-center shrink-0 overflow-hidden relative">
                      {formImage || resolvePrizeImage({ name: formName }) ? (
                        <img 
                          src={formImage || resolvePrizeImage({ name: formName })} 
                          alt="Ikona výhry" 
                          className="max-w-full max-h-full object-contain p-2" 
                        />
                      ) : (
                        <Package className="w-6 h-6 text-slate-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 transition cursor-pointer"
                      />
                      <p className="text-[10px] text-slate-500 mt-1.5">
                        Volitelný obrázek (ideálně čtvercový). Bude automaticky zmenšen a uložen.
                      </p>
                    </div>
                  </div>
                  {formImage && (
                    <button 
                      type="button" 
                      onClick={() => setFormImage(undefined)}
                      className="text-xs text-rose-400 hover:text-rose-300 text-left font-medium w-fit flex items-center gap-1.5 px-2 py-1 bg-rose-500/10 rounded-lg"
                    >
                      <Trash2 className="w-3 h-3" />
                      Odstranit nahraný obrázek
                    </button>
                  )}
                </div>
              </div>

              {/* Omezený počet kusů (Skladová zásoba) */}
              <div className="pt-3 border-t border-white/10 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={formHasStockLimit}
                    onChange={(e) => {
                      setFormHasStockLimit(e.target.checked);
                      if (e.target.checked && (formStock === '' || formStock === null || formStock === undefined)) {
                        setFormStock(10);
                      }
                    }}
                    className="w-4 h-4 rounded accent-[#e5a995]"
                  />
                  <span className="font-medium text-white">Omezit počet kusů (skladová zásoba)</span>
                </label>

                {formHasStockLimit ? (
                  <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-medium text-slate-300">
                        Zbývající počet kusů k výhře:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={formStock}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : parseInt(e.target.value);
                            setFormStock(val === '' || isNaN(val) ? '' : Math.max(0, val));
                          }}
                          placeholder="např. 5"
                          className="w-24 bg-black/50 border border-white/20 rounded-xl px-3 py-1.5 text-white font-mono text-center text-sm focus:outline-none focus:border-[#e5a995]"
                        />
                        <span className="text-xs text-slate-400 font-mono">ks</span>
                      </div>
                    </div>

                    {formStock === 0 ? (
                      <div className="flex items-center gap-2 text-rose-300 text-xs bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>
                          Stav je 0 ks – položka je vyčerpaná a z kola štěstí bude odstraněna. Pro vrácení na kolo zadejte 1 a více kusů.
                        </span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Jakmile se všechny kusy vyhrají (stav dosáhne 0 ks), položka se <strong>automaticky vyřadí z kola štěstí</strong> a v administraci zůstane označena jako vyčerpaná.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 ml-7">
                    Bez limitu – výhra je <strong>neomezená</strong> a zůstane na kole trvale.
                  </p>
                )}
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="w-4 h-4 rounded accent-white"
                  />
                  <span>Zobrazovat na kole (Aktivní)</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingPrize(null);
                  }}
                  className="px-5 py-2.5 rounded-full border border-white/15 text-slate-300 hover:text-white transition text-sm cursor-pointer"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-white text-slate-900 font-semibold text-sm hover:scale-105 active:scale-95 transition cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                >
                  Uložit výhru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Question Edit / Add Modal */}
      <QuestionEditModal
        isOpen={isQuestionModalOpen}
        question={editingQuestion}
        onSave={handleSaveQuestion}
        onClose={() => {
          setIsQuestionModalOpen(false);
          setEditingQuestion(null);
        }}
      />
    </div>
  );
};
