"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Download, Loader2, Factory, RefreshCw, FileDown, Presentation, Ship, Upload, X } from "lucide-react";
import { addLogoToWorkbook, addLogoToHeader } from "@/lib/excel-logo";
import { generatePDFReport } from "@/lib/pdf-report";
import { generateStatusMeetingHTML } from "@/lib/html-status-meeting";
import { parseStatusProductionExcel } from "@/lib/status-production-import";
import { T } from "@/lib/design-tokens";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Contract } from "@/types";

// ---------------------------------------------------------------------------
// Manual data persistence (localStorage)
// ---------------------------------------------------------------------------

interface ManualReportData {
  vessel_name: string;
  estimated_departure: string;
  additional_notes: string;
}

type ManualDataMap = Record<string, ManualReportData>;

const STORAGE_KEY = "ibc-report-status-production";

function loadManualData(): ManualDataMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveManualData(data: ManualDataMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "";
  try {
    const parts = d.split("T")[0].split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  } catch {
    return d;
  }
};


// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StatusProductionPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualData, setManualData] = useState<ManualDataMap>(loadManualData);
  const [fileNumber, setFileNumber] = useState<string>(() =>
    String(new Date().getMonth() + 1).padStart(2, "0")
  );
  const [transforming, setTransforming] = useState(false);
  const [applying, setApplying] = useState(false);

  // Overrides de transformación: cambios del reporte anexado que la usuaria
  // decidió NO guardar en los contratos, pero que sí deben reflejarse en el
  // HTML de reunión. Viven solo en memoria (se pierden al recargar).
  type TransformOverride = { vessel_name?: string; etd?: string; notes?: string };
  const [transformOverrides, setTransformOverrides] = useState<Record<string, TransformOverride> | null>(null);

  // ── Cambios manuales pendientes de aplicar a los contratos ──
  // Motonave escrita distinta a la del contrato, o fecha de zarpe (etd) nueva.
  const pendingUpdates = contracts.reduce((acc, c) => {
    if (!c.id) return acc;
    const m = manualData[c.id];
    if (!m) return acc;
    const upd: { id: string; vessel_name?: string; etd?: string } = { id: c.id };
    const v = (m.vessel_name || "").trim();
    if (v && v.toUpperCase() !== (c.vessel_name || "").trim().toUpperCase()) upd.vessel_name = v;
    const d = (m.estimated_departure || "").trim();
    if (d && d !== (c.etd || "").split("T")[0]) upd.etd = d;
    if (upd.vessel_name || upd.etd) acc.push(upd);
    return acc;
  }, [] as { id: string; vessel_name?: string; etd?: string }[]);

  // ── Anexar reporte devuelto por China ──
  // China devuelve el mismo Excel exportado desde esta página, con
  // VESSEL NAME / ESTIMATED DEPARTURE DATE / ADDITIONAL NOTES diligenciados.
  // Se cruza por CUSTOMER CONTRACT (fallback CHINA CONTRACT) y se aplican
  // los cambios a los contratos previa vista previa.
  interface ImportChange {
    id: string;
    client: string;
    ref: string;
    vesselFrom: string;
    vesselTo?: string;
    etdFrom: string;
    etdTo?: string;
    note?: string;
  }
  const [importPreview, setImportPreview] = useState<{ changes: ImportChange[]; unmatched: string[]; notesOnly: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const normKey = (s: string | null | undefined) => (s || "").trim().toUpperCase();

  const handleAttachFile = async (file: File) => {
    setImporting(true);
    try {
      const rows = await parseStatusProductionExcel(await file.arrayBuffer());
      if (rows.length === 0) {
        toast.error("El archivo no contiene filas de datos");
        return;
      }

      // Índices de contratos cargados (EN PRODUCCIÓN, los mismos del export)
      const byRef = new Map<string, Contract>();
      const byCn = new Map<string, Contract>();
      for (const c of contracts) {
        if (c.client_contract) byRef.set(normKey(c.client_contract), c);
        if (c.china_contract) byCn.set(normKey(c.china_contract), c);
      }

      const changes: ImportChange[] = [];
      const unmatched: string[] = [];
      let notesOnly = 0;

      for (const r of rows) {
        const c = (r.ref && byRef.get(normKey(r.ref))) || (r.cn && byCn.get(normKey(r.cn))) || null;
        if (!c || !c.id) {
          unmatched.push(r.ref || r.cn || "(sin contrato)");
          continue;
        }

        const change: ImportChange = {
          id: c.id,
          client: c.client_name || "",
          ref: c.client_contract || c.china_contract || "",
          vesselFrom: c.vessel_name || "—",
          etdFrom: c.etd ? fmtDate(c.etd) : "—",
        };

        const vessel = (r.vessel || "").trim();
        if (vessel && normKey(vessel) !== normKey(c.vessel_name)) {
          change.vesselTo = vessel;
        }
        if (r.departureISO && r.departureISO !== (c.etd || "").split("T")[0]) {
          change.etdTo = r.departureISO;
        }
        // Nota: texto de zarpe no interpretable ("FIN JUL") se conserva como nota.
        // Si la nota devuelta es la misma que ya tiene el contrato (venía
        // pre-llenada en el export), no cuenta como novedad.
        const returnedNote = (r.notes || "").trim();
        const noteIsNew = returnedNote !== "" && returnedNote !== (c.notes || "").trim();
        const noteParts = [noteIsNew ? returnedNote : null, r.departureText ? `Zarpe: ${r.departureText}` : null].filter(Boolean);
        if (noteParts.length > 0) change.note = noteParts.join(" · ");

        if (change.vesselTo || change.etdTo) {
          changes.push(change);
        } else if (change.note) {
          notesOnly += 1;
          changes.push(change);
        }
      }

      if (changes.length === 0) {
        toast.info(`Sin cambios: el reporte anexado coincide con lo que ya está registrado${unmatched.length ? ` (${unmatched.length} filas sin cruce)` : ""}`);
        return;
      }
      setImportPreview({ changes, unmatched, notesOnly });
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || "No se pudo leer el archivo");
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setImporting(true);
    let ok = 0;
    let fail = 0;
    try {
      for (const ch of importPreview.changes) {
        if (!ch.vesselTo && !ch.etdTo && !ch.note) continue;
        // Las notas de China van al CONTRATO (las lee el reporte de reunión),
        // no al borrador local — así el próximo reporte inicial sale limpio.
        const body: { id: string; vessel_name?: string; etd?: string; notes?: string } = { id: ch.id };
        if (ch.vesselTo) body.vessel_name = ch.vesselTo;
        if (ch.etdTo) body.etd = ch.etdTo;
        if (ch.note) body.notes = ch.note;
        const res = await fetch("/api/contracts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) ok += 1;
        else {
          fail += 1;
          const j = await res.json().catch(() => ({}));
          console.error("Error actualizando contrato", ch.id, j.error);
        }
      }
      if (ok > 0) {
        fetchContracts();
        setTransformOverrides(null); // los datos ya viven en los contratos
        // Paso siguiente del flujo: transformar el reporte ya cruzado
        toast.success(`Reporte anexado: ${ok} embarque${ok !== 1 ? "s" : ""} actualizado${ok !== 1 ? "s" : ""}`, {
          description: "Los datos quedaron cruzados con el módulo de contratos.",
          action: {
            label: "Transformar reporte",
            onClick: () => handleTransform(),
          },
          duration: 12000,
        });
      }
      if (fail > 0) toast.error(`${fail} embarque${fail !== 1 ? "s" : ""} no se pudo actualizar`);
      if (ok === 0 && fail === 0) toast.info("No había cambios que aplicar");
    } finally {
      setImporting(false);
      setImportPreview(null);
    }
  };

  // ── Limpieza de notas de borrador (localStorage) ──
  // Notas guardadas localmente de sesiones anteriores; el reporte inicial
  // debe salir con ADDITIONAL NOTES vacío.
  const draftNotesCount = contracts.filter(
    (c) => c.id && (manualData[c.id]?.additional_notes || "").trim() !== ""
  ).length;

  const handleClearDraftNotes = () => {
    setManualData((prev) => {
      const updated: ManualDataMap = {};
      for (const [id, entry] of Object.entries(prev)) {
        updated[id] = { ...entry, additional_notes: "" };
      }
      saveManualData(updated);
      return updated;
    });
    toast.success("Notas de borrador limpiadas — el reporte saldrá con notas vacías");
  };

  // Aplica motonave + fecha de zarpe manuales directamente a los contratos
  const handleApplyToContracts = async () => {
    if (pendingUpdates.length === 0) return;
    setApplying(true);
    let ok = 0;
    let fail = 0;
    try {
      for (const upd of pendingUpdates) {
        const res = await fetch("/api/contracts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(upd),
        });
        if (res.ok) {
          ok += 1;
          // Limpiar los campos aplicados del borrador local (conservar notas)
          setManualData((prev) => {
            const entry = prev[upd.id];
            if (!entry) return prev;
            const updated = {
              ...prev,
              [upd.id]: {
                ...entry,
                vessel_name: upd.vessel_name ? "" : entry.vessel_name,
                estimated_departure: upd.etd ? "" : entry.estimated_departure,
              },
            };
            saveManualData(updated);
            return updated;
          });
        } else {
          fail += 1;
          const j = await res.json().catch(() => ({}));
          console.error("Error actualizando contrato", upd.id, j.error);
        }
      }
      if (ok > 0) {
        toast.success(`${ok} embarque${ok !== 1 ? "s" : ""} actualizado${ok !== 1 ? "s" : ""} (motonave / fecha de zarpe)`);
        fetchContracts();
      }
      if (fail > 0) {
        toast.error(`${fail} embarque${fail !== 1 ? "s" : ""} no se pudo actualizar`);
      }
    } finally {
      setApplying(false);
    }
  };

  // ── Transformar reporte: HTML ejecutivo para reunión ──
  // Incluye EN PRODUCCIÓN + EN TRÁNSITO para clasificar por etapa operativa
  // (en producción / nominado por zarpar / en tránsito / equipos).
  const handleTransform = async (overridesArg?: Record<string, TransformOverride>) => {
    // Overrides pasados directamente (Ignorar y transformar) o los que
    // quedaron en memoria de un anexo previo no aplicado.
    const overrides = overridesArg ?? transformOverrides;
    setTransforming(true);
    try {
      toast.info("Generando reporte de reunión...");
      const res = await fetch(
        "/api/contracts?status=EN PRODUCCIÓN,EN TRÁNSITO&pageSize=200&page=1&sort_field=client_name&sort_direction=asc"
      );
      if (!res.ok) throw new Error("Error al obtener contratos");
      const json = await res.json();
      let all: Contract[] = json.data || [];
      // Paginar si hay más de 200
      const total: number = json.count ?? all.length;
      let page = 2;
      while (all.length < total && page <= 10) {
        const r = await fetch(
          `/api/contracts?status=EN PRODUCCIÓN,EN TRÁNSITO&pageSize=200&page=${page}&sort_field=client_name&sort_direction=asc`
        );
        if (!r.ok) break;
        const j = await r.json();
        const batch: Contract[] = j.data || [];
        if (batch.length === 0) break;
        all = all.concat(batch);
        page += 1;
      }

      // Superponer los cambios ignorados (solo para esta transformación)
      if (overrides) {
        all = all.map((c) => {
          const o = c.id ? overrides[c.id] : undefined;
          if (!o) return c;
          return {
            ...c,
            vessel_name: o.vessel_name ?? c.vessel_name,
            etd: o.etd ?? c.etd,
            notes: o.notes ?? c.notes,
          };
        });
      }

      const html = generateStatusMeetingHTML(all);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      // Descargar archivo
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, "0");
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const link = document.createElement("a");
      link.href = url;
      link.download = `IBC_Status_Produccion_Resumen_${dd}-${mm}-${today.getFullYear()}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Abrir en pestaña nueva para presentar de una vez
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);

      toast.success("Reporte de reunión generado");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar el reporte de reunión");
    } finally {
      setTransforming(false);
    }
  };

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "/api/contracts?status=EN PRODUCCIÓN&pageSize=500&sort_field=created_at&sort_direction=desc"
      );
      if (res.ok) {
        const json = await res.json();
        setContracts(json.data || []);
      }
    } catch {
      toast.error("Error loading contracts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Get manual field value, con pre-llenado desde el contrato si no hay entrada
  // manual: motonave, fecha de zarpe (ETD) y notas ya registradas se muestran
  // para que China las confirme o las corrija.
  const getManualField = (
    contract: Contract,
    field: keyof ManualReportData
  ): string => {
    const entry = manualData[contract.id!];
    if (entry && entry[field] !== undefined && entry[field] !== "") {
      return entry[field];
    }
    if (field === "vessel_name" && contract.vessel_name) {
      return contract.vessel_name;
    }
    if (field === "estimated_departure" && contract.etd) {
      return contract.etd.split("T")[0];
    }
    // additional_notes NO se pre-llena: es el espacio de China para responder
    return "";
  };

  const handleManualChange = (
    contractId: string,
    field: keyof ManualReportData,
    value: string
  ) => {
    setManualData((prev) => {
      const existing = prev[contractId] || {
        vessel_name: "",
        estimated_departure: "",
        additional_notes: "",
      };
      const updated = {
        ...prev,
        [contractId]: {
          ...existing,
          [field]: value,
        },
      };
      saveManualData(updated);
      return updated;
    });
  };

  // ---------------------------------------------------------------------------
  // Excel Export
  // ---------------------------------------------------------------------------

  const handleExport = async () => {
    try {
      toast.info("Generating Excel report...");

      const excelMod = await import("exceljs");
      const ExcelJS = excelMod.default || excelMod;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "IBC Steel Group - IBC Core";
      workbook.created = new Date();

      const ws = workbook.addWorksheet("STATUS PRODUCTION", {
        properties: { defaultColWidth: 18 },
        views: [{ state: "frozen", ySplit: 3 }],
      });

      const NAVY = "1E3A5F";
      const ACCENT_GOLD = "C9A227";
      const WHITE = "FFFFFF";
      const TEXT_DARK = "1A202C";
      const logoId = await addLogoToWorkbook(workbook);

      ws.columns = [
        { key: "client_name", width: 28 },
        { key: "client_contract", width: 22 },
        { key: "china_contract", width: 22 },
        { key: "incoterm", width: 13 },
        { key: "detail", width: 40 },
        { key: "exw_date", width: 15 },
        { key: "vessel_name", width: 22 },
        { key: "estimated_departure", width: 26 },
        { key: "additional_notes", width: 35 },
      ];

      const totalCols = ws.columns.length;

      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // ROW 1: Unified header
      const r1 = ws.addRow([""]);

      const c1 = ws.getCell("A1");
      c1.value = { richText: [
        { text: "                              ", font: { name: "Aptos", size: 16, color: { argb: NAVY } } },
        { text: "STATUS PRODUCTION", font: { name: "Aptos", size: 12, bold: true, color: { argb: WHITE } } },
        { text: `     ${dateStr}  ·  ${contracts.length} contracts`, font: { name: "Aptos", size: 9, color: { argb: "D0DCE8" } } },
      ] };
      c1.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
      c1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      r1.height = 52;
      for (let col = 1; col <= totalCols; col++) {
        const cell = r1.getCell(col);
        if (col > 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        cell.border = { bottom: { style: "medium" as const, color: { argb: "FFFFFF" } } };
      }
      addLogoToHeader(ws, logoId, totalCols);

      // ROW 2: Spacer
      const r2 = ws.addRow([""]);

      r2.height = 5;
      for (let col = 1; col <= totalCols; col++) {
        r2.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
      }

      // ROW 3: Headers
      const colHeaders = [
        "CUSTOMER",
        "CUSTOMER CONTRACT",
        "CHINA CONTRACT",
        "INCOTERM",
        "DETAIL",
        "EXW",
        "VESSEL NAME",
        "ESTIMATED DEPARTURE DATE",
        "ADDITIONAL NOTES",
      ];
      const headerRow = ws.addRow(colHeaders);
      headerRow.height = 32;
      headerRow.eachCell((cell, colNumber) => {
        cell.font = { name: "Aptos", size: 9, bold: true, color: { argb: WHITE } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        cell.border = {
          bottom: { style: "thin" as const, color: { argb: "FFFFFF" } },
          left: { style: "thin" as const, color: { argb: "2D5A8A" } },
          right: { style: "thin" as const, color: { argb: "2D5A8A" } },
          top: { style: "thin" as const, color: { argb: "2D5A8A" } },
        };
      });

      // DATA ROWS
      contracts.forEach((c, idx) => {
        const manual = manualData[c.id!] || {
          vessel_name: "",
          estimated_departure: "",
          additional_notes: "",
        };
        const vesselVal =
          manual.vessel_name || c.vessel_name || "";
        // Pre-llenar con el ETD del contrato: China confirma o corrige.
        // Las notas van vacías: son el espacio de respuesta de China.
        const departureVal = manual.estimated_departure
          ? fmtDate(manual.estimated_departure)
          : fmtDate(c.etd);
        const notesVal = manual.additional_notes || "";

        const row = ws.addRow([
          c.client_name || "",
          c.client_contract || "",
          c.china_contract || "",
          c.incoterm || "",
          c.detail || "",
          fmtDate(c.exw_date),
          vesselVal,
          departureVal,
          notesVal,
        ]);

        const isEven = idx % 2 === 0;
        const rowBg = isEven ? WHITE : "F8F7F5";

        row.eachCell((cell, colNumber) => {
          cell.font = {
            name: "Aptos",
            size: 9.5,
            color: { argb: TEXT_DARK },
          };
          cell.alignment = {
            vertical: "middle",
            wrapText: colNumber === 5 || colNumber === 9,
          };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: rowBg },
          };
          cell.border = {
            bottom: { style: "thin" as const, color: { argb: "EDECEA" } },
            left: { style: "hair" as const, color: { argb: "E8E6E1" } },
            right: { style: "hair" as const, color: { argb: "E8E6E1" } },
          };

          // Solid outer borders on first/last columns
          if (colNumber === 1) {
            cell.border = {
              ...cell.border,
              bottom: { style: "thin" as const, color: { argb: "EDECEA" } },
              left: { style: "thin" as const, color: { argb: "D4D2CD" } },
              right: { style: "hair" as const, color: { argb: "E8E6E1" } },
            };
          }
          if (colNumber === totalCols) {
            cell.border = {
              ...cell.border,
              bottom: { style: "thin" as const, color: { argb: "EDECEA" } },
              left: { style: "hair" as const, color: { argb: "E8E6E1" } },
              right: { style: "thin" as const, color: { argb: "D4D2CD" } },
            };
          }

          // Center small columns
          if ([4, 6].includes(colNumber)) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }

          // Bold client name
          if (colNumber === 1 && cell.value) {
            cell.font = {
              name: "Aptos",
              size: 9.5,
              bold: true,
              color: { argb: TEXT_DARK },
            };
          }

          // Navy bold for contract numbers
          if ((colNumber === 2 || colNumber === 3) && cell.value) {
            cell.font = {
              name: "Aptos",
              size: 9.5,
              bold: true,
              color: { argb: NAVY },
            };
          }

          // Manual columns with light blue background
          if (colNumber >= 7) {
            const EDITABLE_BG = "EFF6FF";
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: isEven ? EDITABLE_BG : "DBEAFE" },
            };
          }
        });

        row.height = 26;
      });

      // Footer
      const footerGap = ws.addRow([""]);
      footerGap.height = 6;
      const footerRowIdx = ws.rowCount + 1;
      const footerRow = ws.addRow([""]);

      const footerCell = ws.getCell(`A${footerRowIdx}`);
      footerCell.value = { richText: [
        { text: "IBC Core", font: { name: "Aptos", size: 8.5, bold: true, color: { argb: "1E3A5F" } } },
        { text: `  ·  Generated: ${now.toLocaleString("en-US")}  ·  © ${now.getFullYear()} IBC STEEL GROUP`, font: { name: "Aptos", size: 8, italic: true, color: { argb: "9CA3B4" } } },
      ] };
      footerCell.alignment = { horizontal: "center", vertical: "middle" };
      footerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FAF9F7" } };
      footerCell.border = { top: { style: "thin" as const, color: { argb: "E8E6E1" } } };
      footerRow.height = 20;

      // Auto-filter
      ws.autoFilter = {
        from: { row: 3, column: 1 },
        to: { row: 3, column: totalCols },
      };

      // Print setup
      ws.pageSetup = {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9,
      };

      // Generate & download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const prefix = (fileNumber.trim() || mm).padStart(2, "0");
      link.download = `${prefix}. STATUS PRODUCTION ${dd}-${mm}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Excel report downloaded successfully");
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.error("Error generating Excel report");
    }
  };

  // ---------------------------------------------------------------------------
  // Counts
  // ---------------------------------------------------------------------------

  const productionCount = contracts.length;

  // ---------------------------------------------------------------------------
  // PDF Export
  // ---------------------------------------------------------------------------

  const handlePDF = async () => {
    try {
      toast.info("Generando PDF...");
      const pdfNow = new Date();
      const pdfDd = String(pdfNow.getDate()).padStart(2, "0");
      const pdfMm = String(pdfNow.getMonth() + 1).padStart(2, "0");
      const pdfPrefix = (fileNumber.trim() || pdfMm).padStart(2, "0");
      await generatePDFReport({
        title: "STATUS PRODUCTION",
        subtitle: "Contracts in production",
        filename: `${pdfPrefix}. STATUS PRODUCTION ${pdfDd}-${pdfMm}`,
        appendDate: false,
        recordLabel: "contracts",
        orientation: "landscape",
        columns: [
          { header: "CUSTOMER", dataKey: "customer", width: 1.3, bold: true },
          { header: "CUSTOMER CONTRACT", dataKey: "customer_contract", width: 1.1, bold: true, color: "#1E3A5F" },
          { header: "CHINA CONTRACT", dataKey: "china_contract", width: 1.1, bold: true, color: "#1E3A5F" },
          { header: "INCOTERM", dataKey: "incoterm", width: 0.6, halign: "center" },
          { header: "DETAIL", dataKey: "detail", width: 2 },
          { header: "EXW", dataKey: "exw", width: 0.8, halign: "center" },
          { header: "VESSEL NAME", dataKey: "vessel", width: 1.1 },
          { header: "EST. DEPARTURE", dataKey: "departure", width: 0.9, halign: "center" },
          { header: "ADDITIONAL NOTES", dataKey: "notes", width: 1.5 },
        ],
        data: contracts.map((c) => {
          const manual = manualData[c.id || ""] || { vessel_name: "", estimated_departure: "", additional_notes: "" };
          return {
            customer: c.client_name || "",
            customer_contract: c.client_contract || "",
            china_contract: c.china_contract || "",
            incoterm: c.incoterm || "",
            detail: c.detail || "",
            exw: fmtDate(c.exw_date),
            vessel: manual.vessel_name || c.vessel_name || "",
            departure: manual.estimated_departure ? fmtDate(manual.estimated_departure) : fmtDate(c.etd),
            notes: manual.additional_notes || "",
          };
        }),
      });
      toast.success("PDF descargado exitosamente");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF");
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={{ background: T.glassBg, backdropFilter: T.glassBlur, border: "1px solid " + T.glassBorder, borderRadius: T.radius, boxShadow: T.shadowGlass, padding: "24px 28px" }}>
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink }}>
            Status Production
          </h1>
          <p style={{ fontSize: 13, color: T.inkMuted, marginTop: 4 }}>
            Contracts in production —{" "}
            <span style={{ fontWeight: 600, color: T.inkSoft }}>
              {contracts.length} records
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Status badge */}
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
            <Factory className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-700">
              {productionCount}
            </span>
            <span className="text-xs text-amber-600">in production</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-xl border-slate-200"
            onClick={fetchContracts}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>

          {pendingUpdates.length > 0 && (
            <Button
              size="sm"
              className="h-9 gap-1.5 rounded-xl"
              onClick={handleApplyToContracts}
              disabled={applying}
              title="Guarda en los contratos las motonaves y fechas de zarpe escritas en la tabla"
              style={{ background: T.success, border: "none", boxShadow: T.shadowMd, color: "white" }}
            >
              {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ship className="w-3.5 h-3.5" />}
              Aplicar a embarques ({pendingUpdates.length})
            </Button>
          )}

          {draftNotesCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-xl border-slate-200"
              onClick={handleClearDraftNotes}
              title="Vacía las notas de borrador guardadas en este navegador para que el reporte salga limpio"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar notas ({draftNotesCount})
            </Button>
          )}

          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xlsm,.xls"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleAttachFile(f);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-xl border-slate-200"
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
            title="Anexa el Excel devuelto por el equipo de China para actualizar motonaves y fechas de zarpe"
          >
            {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Anexar reporte
          </Button>

          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl border border-slate-200 bg-white h-9">
            <label
              htmlFor="file-number"
              className="text-xs font-medium"
              style={{ color: T.inkSoft }}
              title="Número que aparecerá al inicio del nombre del archivo (ej. 04. STATUS PRODUCTION 23-04)"
            >
              N°
            </label>
            <input
              id="file-number"
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={fileNumber}
              onChange={(e) => setFileNumber(e.target.value.replace(/\D/g, "").slice(0, 2))}
              className="w-8 text-center text-sm font-semibold bg-transparent outline-none"
              style={{ color: T.ink }}
            />
          </div>

          <Button
            size="sm"
            className="h-9 gap-1.5 rounded-xl"
            onClick={() => handleTransform()}
            disabled={transforming}
            title="Genera el resumen ejecutivo HTML para leer en la reunión"
            style={{ background: "linear-gradient(135deg, #0B72B8, #00B8E0)", border: "none", boxShadow: T.shadowMd, color: "white" }}
          >
            {transforming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Presentation className="w-3.5 h-3.5" />}
            Transformar reporte
          </Button>

          <Button
            size="sm"
            className="h-9 gap-1.5 rounded-xl"
            variant="outline"
            onClick={handlePDF}
            style={{ background: T.gradientPrimary, border: "none", boxShadow: T.shadowMd, color: "white" }}
          >
            <FileDown className="w-3.5 h-3.5" />
            Export PDF
          </Button>

          <Button
            size="sm"
            className="h-9 gap-1.5 rounded-xl"
            onClick={handleExport}
            style={{ background: T.gradientPrimary, border: "none", boxShadow: T.shadowMd, color: "white" }}
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Table */}
      <div style={{ borderRadius: T.radiusMd, border: "1px solid " + T.borderLight, overflow: "hidden", boxShadow: T.shadowMd }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: T.accent }} />
            <span style={{ marginLeft: 8, fontSize: 13, color: T.inkMuted }}>
              Loading contracts...
            </span>
          </div>
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20" style={{ color: T.inkLight }}>
            <Factory className="w-10 h-10 mb-3" />
            <p className="text-sm font-medium">
              No contracts in production
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow style={{ background: "rgba(11,83,148,0.03)" }} className="hover:bg-transparent">
                  <TableHead style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em" }} className="whitespace-nowrap">
                    CUSTOMER
                  </TableHead>
                  <TableHead style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em" }} className="whitespace-nowrap">
                    CUSTOMER CONTRACT
                  </TableHead>
                  <TableHead style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em" }} className="whitespace-nowrap">
                    CHINA CONTRACT
                  </TableHead>
                  <TableHead style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em" }} className="whitespace-nowrap text-center">
                    INCOTERM
                  </TableHead>
                  <TableHead style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em" }} className="whitespace-nowrap">
                    DETAIL
                  </TableHead>
                  <TableHead style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em" }} className="whitespace-nowrap text-center">
                    EXW
                  </TableHead>
                  {/* Editable columns - highlighted header */}
                  <TableHead style={{ fontSize: 11, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.05em", background: "rgba(11,83,148,0.06)" }} className="whitespace-nowrap">
                    VESSEL NAME
                  </TableHead>
                  <TableHead style={{ fontSize: 11, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.05em", background: "rgba(11,83,148,0.06)" }} className="whitespace-nowrap text-center">
                    ESTIMATED DEPARTURE DATE
                  </TableHead>
                  <TableHead style={{ fontSize: 11, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.05em", background: "rgba(11,83,148,0.06)" }} className="whitespace-nowrap">
                    ADDITIONAL NOTES
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((c, idx) => (
                  <TableRow
                    key={c.id}
                    className={
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                    }
                  >
                    {/* A: CLIENTE */}
                    <TableCell className="text-xs font-semibold text-slate-800 whitespace-nowrap">
                      {c.client_name}
                    </TableCell>
                    {/* B: CONTRATO CLIENTE */}
                    <TableCell className="text-xs font-medium text-[#1E3A5F] whitespace-nowrap">
                      {c.client_contract || ""}
                    </TableCell>
                    {/* C: CONTRATO CHINA */}
                    <TableCell className="text-xs font-medium text-[#1E3A5F] whitespace-nowrap">
                      {c.china_contract || ""}
                    </TableCell>
                    {/* D: INCOTERM */}
                    <TableCell className="text-xs text-center text-slate-600">
                      {c.incoterm || ""}
                    </TableCell>
                    {/* E: DETALLE */}
                    <TableCell className="text-xs text-slate-600 max-w-[250px] truncate">
                      {c.detail || ""}
                    </TableCell>
                    {/* F: EXW */}
                    <TableCell className="text-xs text-center text-slate-600 whitespace-nowrap">
                      {fmtDate(c.exw_date)}
                    </TableCell>
                    {/* G: VESSEL NAME (editable) */}
                    <TableCell className="p-1 bg-blue-50/40">
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 text-xs border border-blue-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white placeholder:text-slate-400 transition-colors"
                        placeholder="Vessel name..."
                        value={getManualField(c, "vessel_name")}
                        onChange={(e) =>
                          handleManualChange(
                            c.id!,
                            "vessel_name",
                            e.target.value
                          )
                        }
                      />
                    </TableCell>
                    {/* H: ESTIMATED DEPARTURE DATE (editable) */}
                    <TableCell className="p-1 bg-blue-50/40">
                      <input
                        type="date"
                        className="w-full px-2 py-1.5 text-xs border border-blue-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white placeholder:text-slate-400 transition-colors"
                        value={getManualField(c, "estimated_departure")}
                        onChange={(e) =>
                          handleManualChange(
                            c.id!,
                            "estimated_departure",
                            e.target.value
                          )
                        }
                      />
                    </TableCell>
                    {/* I: ADDITIONAL NOTES (editable) */}
                    <TableCell className="p-1 bg-blue-50/40">
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 text-xs border border-blue-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white placeholder:text-slate-400 transition-colors"
                        placeholder="Notes..."
                        value={getManualField(c, "additional_notes")}
                        onChange={(e) =>
                          handleManualChange(
                            c.id!,
                            "additional_notes",
                            e.target.value
                          )
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ── Vista previa del reporte anexado ──
          Portal al body: los ancestros animados (transform) rompen position:fixed */}
      {importPreview && typeof document !== "undefined" && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(6,27,46,0.55)", backdropFilter: "blur(8px)" }}
            onClick={() => setImportPreview(null)}
          />
          <div style={{
            position: "relative", width: "100%", maxWidth: 780, maxHeight: "84vh",
            display: "flex", flexDirection: "column",
            background: T.surface, borderRadius: 18, border: `1px solid ${T.borderLight}`,
            boxShadow: "0 32px 64px -12px rgba(6,27,46,0.35)", overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{ padding: "16px 22px", background: T.gradientPrimary, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Cambios del reporte anexado</div>
                <div style={{ fontSize: 11.5, color: "rgba(207,224,240,0.85)", marginTop: 2 }}>
                  {importPreview.changes.length} embarque{importPreview.changes.length !== 1 ? "s" : ""} con novedades
                  {importPreview.unmatched.length > 0 && ` · ${importPreview.unmatched.length} fila${importPreview.unmatched.length !== 1 ? "s" : ""} sin cruce`}
                </div>
              </div>
              <button
                onClick={() => setImportPreview(null)}
                style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.16)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 22px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.2fr 1fr", gap: 10, padding: "0 0 8px", borderBottom: `1px solid ${T.border}` }}>
                {["Embarque", "Motonave", "Fecha de zarpe"].map((h) => (
                  <span key={h} style={{ fontSize: 9.5, fontWeight: 700, color: T.inkLight, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</span>
                ))}
              </div>
              {importPreview.changes.map((ch) => (
                <div key={ch.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1.2fr 1fr", gap: 10, alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${T.borderLight}` }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>{ch.client}</div>
                    <div style={{ fontSize: 10.5, color: T.accent, fontFamily: "var(--font-jetbrains-mono), monospace" }}>{ch.ref}</div>
                    {ch.note && <div style={{ fontSize: 10.5, color: T.inkMuted, marginTop: 2 }}>Nota: {ch.note}</div>}
                  </div>
                  <div style={{ fontSize: 12 }}>
                    {ch.vesselTo ? (
                      <>
                        <span style={{ color: T.inkLight, textDecoration: "line-through" }}>{ch.vesselFrom}</span>
                        <span style={{ margin: "0 6px", color: T.inkGhost }}>→</span>
                        <span style={{ fontWeight: 700, color: T.success }}>{ch.vesselTo.toUpperCase()}</span>
                      </>
                    ) : (
                      <span style={{ color: T.inkLight }}>{ch.vesselFrom}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                    {ch.etdTo ? (
                      <>
                        <span style={{ color: T.inkLight, textDecoration: "line-through" }}>{ch.etdFrom}</span>
                        <span style={{ margin: "0 6px", color: T.inkGhost }}>→</span>
                        <span style={{ fontWeight: 700, color: T.success }}>{fmtDate(ch.etdTo)}</span>
                      </>
                    ) : (
                      <span style={{ color: T.inkLight }}>{ch.etdFrom}</span>
                    )}
                  </div>
                </div>
              ))}

              {importPreview.unmatched.length > 0 && (
                <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: T.warningBg, border: `1px solid ${T.warning}30`, fontSize: 11.5, color: T.inkSoft }}>
                  <strong style={{ color: T.warning }}>Sin cruce:</strong> {importPreview.unmatched.slice(0, 8).join(", ")}{importPreview.unmatched.length > 8 ? "…" : ""}
                  <span style={{ color: T.inkMuted }}> — no coinciden con contratos EN PRODUCCIÓN cargados.</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 22px", borderTop: `1px solid ${T.borderLight}`, display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <Button variant="outline" size="sm" className="h-9 rounded-xl" onClick={() => setImportPreview(null)} disabled={importing}>
                Cancelar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-xl"
                disabled={importing || transforming}
                title="No guarda nada en los contratos, pero genera el reporte de reunión incluyendo estos cambios"
                onClick={() => {
                  const overrides: Record<string, TransformOverride> = {};
                  for (const ch of importPreview.changes) {
                    overrides[ch.id] = {
                      ...(ch.vesselTo ? { vessel_name: ch.vesselTo } : {}),
                      ...(ch.etdTo ? { etd: ch.etdTo } : {}),
                      ...(ch.note ? { notes: ch.note } : {}),
                    };
                  }
                  setTransformOverrides(overrides);
                  setImportPreview(null);
                  toast.info("Cambios NO guardados en contratos — solo se reflejarán en el reporte de reunión");
                  handleTransform(overrides);
                }}
                style={{ borderColor: "#00B8E0", color: "#0089A8" }}
              >
                {transforming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Presentation className="w-3.5 h-3.5" />}
                Ignorar y transformar
              </Button>
              <Button
                size="sm"
                className="h-9 gap-1.5 rounded-xl"
                onClick={handleConfirmImport}
                disabled={importing}
                style={{ background: T.success, border: "none", color: "white" }}
              >
                {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ship className="w-3.5 h-3.5" />}
                Aplicar cambios ({importPreview.changes.length})
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
    </div>
  );
}
