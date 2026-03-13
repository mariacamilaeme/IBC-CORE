"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

// ---------------------------------------------------------------------------
// Shared commercial names management across modules (quotations, contracts).
// Uses localStorage as persistent store and a custom DOM event to keep every
// mounted consumer in sync — even across different pages in the same tab.
//
// ALL commercials (base + custom + from data) can be renamed or deleted.
// Renames are stored as an overrides map; deletions as a hidden list.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "ibc-commercials";
const OVERRIDES_KEY = "ibc-commercials-overrides";
const HIDDEN_KEY = "ibc-commercials-hidden";
const SYNC_EVENT = "ibc-commercials-updated";

/** Seed commercial names – used to initialise the list. */
const BASE_COMMERCIALS = [
  "PABLO VARGAS",
  "HEIDY",
  "CARLOS BACCA",
  "MARIA FERNANDA BACCA",
  "EVER HINCAPIE",
];

// --- Helpers ----------------------------------------------------------------

function readCustom(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCustom(list: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function readOverrides(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeOverrides(map: Record<string, string>) {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(map));
}

function readHidden(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeHidden(list: string[]) {
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(list));
}

function notifySync() {
  window.dispatchEvent(new CustomEvent(SYNC_EVENT));
}

// --- Migrate old key (one-time) --------------------------------------------

function migrateOldKey() {
  if (typeof window === "undefined") return;
  const OLD_KEY = "ibc-quotations-commercials";
  const old = localStorage.getItem(OLD_KEY);
  if (!old) return;
  try {
    const oldList: string[] = JSON.parse(old);
    const current = readCustom();
    const merged = Array.from(new Set([...current, ...oldList]));
    writeCustom(merged);
    localStorage.removeItem(OLD_KEY);
  } catch {
    // ignore corrupt data
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCommercials(extraNames?: string[]) {
  // One-time migration from old quotations key
  useEffect(() => { migrateOldKey(); }, []);

  const [customCommercials, setCustomCommercials] = useState<string[]>(readCustom);
  const [overrides, setOverrides] = useState<Record<string, string>>(readOverrides);
  const [hidden, setHidden] = useState<string[]>(readHidden);

  // Keep in sync with other hook instances & other tabs
  useEffect(() => {
    const onSync = () => {
      setCustomCommercials(readCustom());
      setOverrides(readOverrides());
      setHidden(readHidden());
    };

    window.addEventListener(SYNC_EVENT, onSync);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === OVERRIDES_KEY || e.key === HIDDEN_KEY) {
        onSync();
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(SYNC_EVENT, onSync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  /**
   * Resolve a commercial name through the overrides chain.
   * e.g. if overrides = { "CARLOS BACCA": "Carlos Bacca" }
   * then resolveName("CARLOS BACCA") → "Carlos Bacca"
   */
  const resolveName = useCallback(
    (name: string): string => overrides[name] || name,
    [overrides],
  );

  // Merged & sorted list with overrides applied and hidden filtered out
  const commercials = useMemo(() => {
    const hiddenSet = new Set(hidden);
    const raw = new Set<string>();

    // Collect all raw names
    BASE_COMMERCIALS.forEach((c) => raw.add(c));
    customCommercials.forEach((c) => raw.add(c));
    extraNames?.forEach((n) => raw.add(n));

    // Apply overrides and filter hidden, then deduplicate
    const resolved = new Set<string>();
    raw.forEach((name) => {
      const final = overrides[name] || name;
      if (!hiddenSet.has(final) && !hiddenSet.has(name)) {
        resolved.add(final);
      }
    });

    return Array.from(resolved).sort();
  }, [customCommercials, extraNames, overrides, hidden]);

  // CRUD -------------------------------------------------------------------

  const addCommercial = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const current = readCustom();
    const all = new Set([...BASE_COMMERCIALS, ...current]);
    if (all.has(trimmed)) return false;
    const updated = [...current, trimmed];
    writeCustom(updated);
    setCustomCommercials(updated);
    notifySync();
    return true;
  }, []);

  /**
   * Delete ANY commercial. Adds it to the hidden list so it no longer
   * appears in the dropdown, even if it comes from base or data sources.
   */
  const deleteCommercial = useCallback((name: string) => {
    // Remove from custom list if present
    const currentCustom = readCustom();
    if (currentCustom.includes(name)) {
      const updated = currentCustom.filter((c) => c !== name);
      writeCustom(updated);
      setCustomCommercials(updated);
    }

    // Add to hidden list
    const currentHidden = readHidden();
    if (!currentHidden.includes(name)) {
      const updatedHidden = [...currentHidden, name];
      writeHidden(updatedHidden);
      setHidden(updatedHidden);
    }

    // Also remove any override pointing TO this name
    const currentOverrides = readOverrides();
    let overridesChanged = false;
    const updatedOverrides = { ...currentOverrides };
    for (const [key, val] of Object.entries(updatedOverrides)) {
      if (val === name) {
        // The source was renamed to this name; hide the source too
        if (!currentHidden.includes(key)) {
          const h = readHidden();
          h.push(key);
          writeHidden(h);
          setHidden(h);
        }
        delete updatedOverrides[key];
        overridesChanged = true;
      }
    }
    // Also remove override FROM this name
    if (updatedOverrides[name]) {
      delete updatedOverrides[name];
      overridesChanged = true;
    }
    if (overridesChanged) {
      writeOverrides(updatedOverrides);
      setOverrides(updatedOverrides);
    }

    notifySync();
  }, []);

  /**
   * Rename ANY commercial (base, custom, or from data).
   * Stores an override mapping so the old name resolves to the new one.
   * If there are existing overrides pointing to oldName, they get
   * updated to point to newName (chain resolution).
   */
  const renameCommercial = useCallback((oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return false;

    const currentOverrides = readOverrides();

    // Update any existing override that points to oldName → now points to newName
    const updated = { ...currentOverrides };
    for (const [key, val] of Object.entries(updated)) {
      if (val === oldName) {
        updated[key] = trimmed;
      }
    }

    // Add the direct override
    updated[oldName] = trimmed;

    writeOverrides(updated);
    setOverrides(updated);

    // If oldName was in custom list, rename it there too
    const currentCustom = readCustom();
    if (currentCustom.includes(oldName)) {
      const updatedCustom = currentCustom.map((c) => (c === oldName ? trimmed : c));
      writeCustom(updatedCustom);
      setCustomCommercials(updatedCustom);
    }

    // If newName was hidden (e.g. merging into an existing name), un-hide it
    const currentHidden = readHidden();
    if (currentHidden.includes(trimmed)) {
      const updatedHidden = currentHidden.filter((h) => h !== trimmed);
      writeHidden(updatedHidden);
      setHidden(updatedHidden);
    }

    notifySync();
    return true;
  }, []);

  return {
    commercials,
    customCommercials,
    overrides,
    addCommercial,
    deleteCommercial,
    renameCommercial,
    resolveName,
  };
}
