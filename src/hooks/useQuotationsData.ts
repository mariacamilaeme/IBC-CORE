"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { ReportQuotation } from "@/app/(dashboard)/quotations/constants";
import REPORT_DATA from "@/data/quotations-report.json";

// ---------------------------------------------------------------------------
// Shared quotation data management across sub-modules (tracking, reports, create).
// Uses localStorage as persistent store and a custom DOM event to keep every
// mounted consumer in sync — even across different pages in the same tab.
//
// Also reads commercial name overrides from localStorage (managed by
// useCommercials) to resolve renamed commercial names in the data.
// ---------------------------------------------------------------------------

const BASE_DATA: ReportQuotation[] = REPORT_DATA as ReportQuotation[];

const CUSTOM_KEY = "ibc-quotations-custom";
const EDITS_KEY = "ibc-quotations-edits";
const SYNC_EVENT = "ibc-quotations-updated";

// Commercial overrides keys (written by useCommercials)
const COMMERCIAL_OVERRIDES_KEY = "ibc-commercials-overrides";
const COMMERCIAL_SYNC_EVENT = "ibc-commercials-updated";

// --- Helpers ----------------------------------------------------------------

function readCustom(): ReportQuotation[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY) || "[]");
  } catch {
    return [];
  }
}

function readEdits(): Record<string, ReportQuotation> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(EDITS_KEY) || "{}");
  } catch {
    return {};
  }
}

function readCommercialOverrides(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(COMMERCIAL_OVERRIDES_KEY) || "{}");
  } catch {
    return {};
  }
}

function persist(custom: ReportQuotation[], edits: Record<string, ReportQuotation>) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom));
  localStorage.setItem(EDITS_KEY, JSON.stringify(edits));
  window.dispatchEvent(new CustomEvent(SYNC_EVENT));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useQuotationsData() {
  const [customQuotations, setCustomQuotations] = useState<ReportQuotation[]>(readCustom);
  const [editOverrides, setEditOverrides] = useState<Record<string, ReportQuotation>>(readEdits);
  const [commercialOverrides, setCommercialOverrides] = useState<Record<string, string>>(readCommercialOverrides);

  // Keep in sync with other hook instances & other pages in same tab
  useEffect(() => {
    const onSync = () => {
      setCustomQuotations(readCustom());
      setEditOverrides(readEdits());
    };

    const onCommercialSync = () => {
      setCommercialOverrides(readCommercialOverrides());
    };

    window.addEventListener(SYNC_EVENT, onSync);
    window.addEventListener(COMMERCIAL_SYNC_EVENT, onCommercialSync);
    const onStorage = (e: StorageEvent) => {
      if (e.key === CUSTOM_KEY || e.key === EDITS_KEY) onSync();
      if (e.key === COMMERCIAL_OVERRIDES_KEY) onCommercialSync();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(SYNC_EVENT, onSync);
      window.removeEventListener(COMMERCIAL_SYNC_EVENT, onCommercialSync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Merged data: base + edit overrides + custom quotations
  // Applies commercial name overrides (renames) to requestedBy field
  const data = useMemo(() => {
    const edited = BASE_DATA.map((q) => {
      const key = q.id ?? "";
      return editOverrides[key] ? { ...q, ...editOverrides[key] } : q;
    });
    let merged = [...edited, ...customQuotations];

    // Apply commercial name overrides if any exist
    if (Object.keys(commercialOverrides).length > 0) {
      merged = merged.map((q) => {
        const resolved = commercialOverrides[q.requestedBy];
        return resolved ? { ...q, requestedBy: resolved } : q;
      });
    }

    return merged;
  }, [customQuotations, editOverrides, commercialOverrides]);

  // Add a new quotation (auto-generates COT-NNN id)
  const addQuotation = useCallback((q: ReportQuotation) => {
    setCustomQuotations((prev) => {
      const allData = [...BASE_DATA, ...prev];
      const maxNum = allData.reduce((max, d) => {
        const m = d.id?.match(/COT-(\d+)/);
        return m ? Math.max(max, parseInt(m[1], 10)) : max;
      }, 0);
      const newQ = { ...q, id: `COT-${String(maxNum + 1).padStart(3, "0")}` };
      const updated = [...prev, newQ];
      persist(updated, readEdits());
      return updated;
    });
  }, []);

  // Update an existing quotation (custom or base)
  const updateQuotation = useCallback((q: ReportQuotation) => {
    setCustomQuotations((prevCustom) => {
      const isCustomRecord = prevCustom.some((c) => c.id === q.id);
      if (isCustomRecord) {
        const updated = prevCustom.map((c) => (c.id === q.id ? q : c));
        persist(updated, readEdits());
        return updated;
      }
      // Base record — use edit overrides
      setEditOverrides((prevEdits) => {
        const updated = { ...prevEdits, [q.id || ""]: q };
        persist(prevCustom, updated);
        return updated;
      });
      return prevCustom;
    });
  }, []);

  return {
    data,
    customQuotations,
    addQuotation,
    updateQuotation,
  };
}
