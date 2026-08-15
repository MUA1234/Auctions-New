'use client';
import { useEffect, useState } from 'react';

/**
 * Display-currency store (E5). The chosen currency is a PRESENTATION preference only — it never
 * changes the binding transaction currency (D5). Persisted to localStorage; a tiny subscribe store
 * so every `<Price>` on the page updates when the selector changes. `null` = show native currency.
 */
const KEY = 'singha_display_currency';
type Listener = () => void;
const listeners = new Set<Listener>();
let current: string | null = null;
let loaded = false;

function load(): void {
  if (loaded) return;
  loaded = true;
  try {
    current = localStorage.getItem(KEY);
  } catch {
    current = null;
  }
}

export function getDisplayCurrency(): string | null {
  load();
  return current;
}

export function setDisplayCurrency(code: string | null): void {
  current = code || null;
  try {
    if (current) localStorage.setItem(KEY, current);
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore storage failures */
  }
  listeners.forEach((l) => l());
}

/** React binding: `[displayCurrency, setDisplayCurrency]`. */
export function useDisplayCurrency(): [string | null, (c: string | null) => void] {
  const [value, setValue] = useState<string | null>(() => getDisplayCurrency());
  useEffect(() => {
    const l = () => setValue(getDisplayCurrency());
    listeners.add(l);
    l();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return [value, setDisplayCurrency];
}
