import { CompetitionEntry, SpinLog } from '../types';
import {
  saveOutboxItemToIDB,
  removeOutboxItemFromIDB,
  getAllOutboxItemsFromIDB,
  OutboxItem,
} from '../utils/offlineDb';

export interface GoogleSheetsSyncStatus {
  isConfigured: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSuccessTime: number | null;
  lastError: string | null;
}

const SHEETS_OUTBOX_STORAGE_KEY = 'kolo_stesti_sheets_outbox';

let outbox: OutboxItem[] = [];
let isProcessing = false;
let lastSuccessTime: number | null = null;
let lastError: string | null = null;

const listeners = new Set<(status: GoogleSheetsSyncStatus) => void>();

function notify() {
  const webhookUrl = getWebhookUrl();
  const status: GoogleSheetsSyncStatus = {
    isConfigured: Boolean(webhookUrl && webhookUrl.trim().length > 10),
    isSyncing: isProcessing,
    pendingCount: outbox.length,
    lastSuccessTime,
    lastError,
  };
  listeners.forEach((cb) => cb(status));
}

export function getWebhookUrl(): string {
  try {
    const raw = localStorage.getItem('kolo_stesti_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.googleSheetWebhookUrl || '';
    }
  } catch {
    // ignore
  }
  return '';
}

function getStationName(): string {
  try {
    const raw = localStorage.getItem('kolo_stesti_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.stationName || 'Tablet 1';
    }
  } catch {
    // ignore
  }
  return 'Tablet 1';
}

function persistOutbox() {
  try {
    localStorage.setItem(SHEETS_OUTBOX_STORAGE_KEY, JSON.stringify(outbox));
  } catch {
    // ignore
  }
}

export function subscribeGoogleSheetsStatus(
  callback: (status: GoogleSheetsSyncStatus) => void
): () => void {
  listeners.add(callback);
  notify();
  return () => {
    listeners.delete(callback);
  };
}

export async function initializeGoogleSheetsSync(): Promise<void> {
  try {
    const local = localStorage.getItem(SHEETS_OUTBOX_STORAGE_KEY);
    const localItems: OutboxItem[] = local ? JSON.parse(local) : [];
    const idbItems = await getAllOutboxItemsFromIDB();

    const map = new Map<string, OutboxItem>();
    [...localItems, ...idbItems].forEach((i) => {
      if (i && i.id) map.set(i.id, i);
    });

    outbox = Array.from(map.values());
    persistOutbox();
    notify();

    if (outbox.length > 0) {
      triggerSheetsSync();
    }
  } catch (err) {
    console.warn('Failed to init sheets outbox', err);
  }
}

export async function queueEntryForGoogleSheets(entry: CompetitionEntry): Promise<void> {
  const item: OutboxItem = {
    id: entry.id,
    type: 'entry',
    data: entry,
    createdAt: Date.now(),
    attempts: 0,
  };

  const existingIdx = outbox.findIndex((i) => i.id === item.id);
  if (existingIdx >= 0) {
    outbox[existingIdx] = item;
  } else {
    outbox.push(item);
  }

  persistOutbox();
  saveOutboxItemToIDB(item).catch(() => {});
  notify();

  // Try immediate sending
  triggerSheetsSync();
}

export async function queueSpinForGoogleSheets(spin: SpinLog): Promise<void> {
  const item: OutboxItem = {
    id: spin.id,
    type: 'spin',
    data: spin,
    createdAt: Date.now(),
    attempts: 0,
  };

  const existingIdx = outbox.findIndex((i) => i.id === item.id);
  if (existingIdx >= 0) {
    outbox[existingIdx] = item;
  } else {
    outbox.push(item);
  }

  persistOutbox();
  saveOutboxItemToIDB(item).catch(() => {});
  notify();

  triggerSheetsSync();
}

export async function triggerSheetsSync(): Promise<{ success: boolean; message: string }> {
  const webhookUrl = getWebhookUrl();

  if (!webhookUrl || webhookUrl.trim().length < 10) {
    notify();
    return {
      success: false,
      message: 'Není nastavena URL adresa Google Tabulky (Webhook).',
    };
  }

  if (isProcessing) {
    return { success: true, message: 'Synchronizace již probíhá...' };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    lastError = 'Zařízení je offline. Data budou odeslána po připojení k internetu.';
    notify();
    return { success: false, message: lastError };
  }

  if (outbox.length === 0) {
    notify();
    return { success: true, message: 'Všechna data jsou v Google Tabulce aktuální.' };
  }

  isProcessing = true;
  lastError = null;
  notify();

  const station = getStationName();
  const items = [...outbox];
  let sentCount = 0;

  for (const item of items) {
    try {
      let payload: Record<string, unknown>;
      if (item.type === 'spin') {
        const spin = item.data as SpinLog;
        payload = {
          type: 'spin',
          id: spin.id,
          prizeName: spin.prizeName,
          prizeId: spin.prizeId,
          timestamp: new Date(spin.timestamp).toLocaleString('cs-CZ', {
            timeZone: 'Europe/Prague',
          }),
          station,
        };
      } else {
        const entry = item.data as CompetitionEntry;
        payload = {
          type: 'entry',
          id: entry.id,
          email: entry.email,
          score: `${entry.score}/${entry.totalQuestions}`,
          timestamp: new Date(entry.timestamp).toLocaleString('cs-CZ', {
            timeZone: 'Europe/Prague',
          }),
          station,
        };
      }

      // Use text/plain to avoid CORS preflight options issues with Google Apps Script
      const res = await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors', // Google Apps Script redirects require no-cors for simple tracking
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(payload),
      });

      // Since mode is no-cors, we assume success if fetch didn't throw
      outbox = outbox.filter((i) => i.id !== item.id);
      persistOutbox();
      removeOutboxItemFromIDB(item.id).catch(() => {});
      sentCount++;
      lastSuccessTime = Date.now();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      item.attempts += 1;
      item.lastError = msg;
      lastError = `Chyba při odesílání: ${msg}`;
      break;
    }
  }

  isProcessing = false;
  persistOutbox();
  notify();

  if (lastError) {
    return { success: false, message: lastError };
  }

  return {
    success: true,
    message: `Úspěšně odesláno ${sentCount} záznamů do Google Tabulky.`,
  };
}

// Auto-sync listener on internet connection
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    triggerSheetsSync();
  });

  initializeGoogleSheetsSync();
}
