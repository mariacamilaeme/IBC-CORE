"use client";

import { useState, useEffect } from "react";
import { X, Check, ChevronUp, ChevronDown, Download } from "lucide-react";
import { T } from "@/lib/design-tokens";
import type { PDFColumn } from "@/lib/pdf-report";

export type PDFStyle = "default";

interface ColumnSelectorProps {
  open: boolean;
  onClose: () => void;
  allColumns: PDFColumn[];
  onGenerate: (selectedColumns: PDFColumn[]) => void;
  title?: string;
  generating?: boolean;
  buttonLabel?: string;
  /** dataKeys pre-seleccionados al abrir; si se omite, se seleccionan todas */
  defaultSelected?: string[];
}

export default function ColumnSelector({ open, onClose, allColumns, onGenerate, title = "Seleccionar columnas", generating, buttonLabel = "PDF", defaultSelected }: ColumnSelectorProps) {
  const initialSelection = () =>
    new Set(defaultSelected ?? allColumns.map((c) => c.dataKey));
  const [selected, setSelected] = useState<Set<string>>(initialSelection);

  // Reset selection when modal opens
  useEffect(() => {
    if (open) setSelected(new Set(defaultSelected ?? allColumns.map((c) => c.dataKey)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, allColumns]);

  if (!open) return null;

  const toggleColumn = (dataKey: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(dataKey)) next.delete(dataKey);
      else next.add(dataKey);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(allColumns.map((c) => c.dataKey)));
  const selectNone = () => setSelected(new Set());

  const selectedColumns = allColumns.filter((c) => selected.has(c.dataKey));

  const moveColumn = (dataKey: string, direction: "up" | "down") => {
    const idx = allColumns.findIndex((c) => c.dataKey === dataKey);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= allColumns.length) return;
    const copy = [...allColumns];
    [copy[idx], copy[targetIdx]] = [copy[targetIdx], copy[idx]];
    // Note: reordering is visual only, the parent still controls the array
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      {/* Backdrop */}
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div style={{
        position: "relative", width: "100%", maxWidth: 520, maxHeight: "80vh",
        display: "flex", flexDirection: "column", borderRadius: 18,
        border: `1px solid ${T.borderLight}`, background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(24px)", boxShadow: "0 32px 64px -12px rgba(11,83,148,0.2)",
        overflow: "hidden",
      }}>
        {/* Accent bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: T.accent }} />

        {/* Header */}
        <div style={{ padding: "20px 24px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: T.ink }}>{title}</h3>
            <p style={{ fontSize: 12, color: T.inkLight, marginTop: 2 }}>
              {selected.size} de {allColumns.length} columnas seleccionadas
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 10, border: "none", background: T.surfaceAlt,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.inkLight,
          }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick actions */}
        <div style={{ padding: "0 24px 8px", display: "flex", gap: 8 }}>
          <button onClick={selectAll} style={{
            padding: "4px 12px", borderRadius: 6, border: `1px solid ${T.border}`,
            background: T.surface, fontSize: 11, fontWeight: 600, color: T.accent, cursor: "pointer",
          }}>
            Seleccionar todas
          </button>
          <button onClick={selectNone} style={{
            padding: "4px 12px", borderRadius: 6, border: `1px solid ${T.border}`,
            background: T.surface, fontSize: 11, fontWeight: 600, color: T.inkMuted, cursor: "pointer",
          }}>
            Deseleccionar todas
          </button>
        </div>

        {/* Column list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 16px" }}>
          {allColumns.map((col) => {
            const isSelected = selected.has(col.dataKey);
            return (
              <div
                key={col.dataKey}
                onClick={() => toggleColumn(col.dataKey)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                  borderRadius: 8, cursor: "pointer", marginBottom: 2,
                  background: isSelected ? T.accentLight : "transparent",
                  border: `1px solid ${isSelected ? "rgba(11,83,148,0.15)" : "transparent"}`,
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center",
                  background: isSelected ? T.accent : T.surfaceAlt,
                  border: `1.5px solid ${isSelected ? T.accent : T.border}`,
                  transition: "all 0.15s ease",
                }}>
                  {isSelected && <Check className="h-3 w-3" style={{ color: "#fff" }} />}
                </div>
                <span style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400, color: isSelected ? T.accent : T.ink }}>
                  {col.header}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 24px", borderTop: `1px solid ${T.borderLight}`,
          display: "flex", gap: 10, justifyContent: "flex-end",
        }}>
          <button onClick={onClose} style={{
            padding: "10px 20px", borderRadius: 10, border: `1px solid ${T.border}`,
            background: T.surface, color: T.inkMuted, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
            Cancelar
          </button>
          <button
            onClick={() => onGenerate(selectedColumns)}
            disabled={selected.size === 0 || generating}
            style={{
              padding: "10px 24px", borderRadius: 10, border: "none",
              background: selected.size === 0 ? T.borderLight : "linear-gradient(135deg, #0B5394, #0D71B9)",
              color: "#fff", fontSize: 13, fontWeight: 700, cursor: selected.size === 0 ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 8, opacity: generating ? 0.7 : 1,
            }}
          >
            <Download className="h-4 w-4" />
            {generating ? "Generando..." : `Generar ${buttonLabel} (${selected.size} cols)`}
          </button>
        </div>
      </div>
    </div>
  );
}
