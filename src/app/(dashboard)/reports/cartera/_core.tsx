"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { toast } from "sonner";
import { Search, X, ChevronDown, Check } from "lucide-react";
import { addLogoToWorkbook, addLogoToHeader } from "@/lib/excel-logo";
import { T } from "@/lib/design-tokens";
import type { Contract } from "@/types";

// ===========================================================================
// Business rules & types
// ===========================================================================

export const DEADLINE_DAYS = 15; // El cliente debe pagar ETA − 15 días

export type EstadoCartera = "ATRASADO" | "A_TIEMPO" | "ADELANTADO" | "SIN_FECHA";

export const ESTADO_META: Record<EstadoCartera, { label: string; color: string; bg: string }> = {
  ATRASADO:   { label: "Atrasado",   color: T.danger,   bg: T.dangerBg },
  A_TIEMPO:   { label: "A tiempo",   color: T.warning,  bg: T.warningBg },
  ADELANTADO: { label: "Adelantado", color: T.success,  bg: T.successBg },
  SIN_FECHA:  { label: "Sin fecha",  color: T.inkLight, bg: T.surfaceAlt },
};

export const AG = { porVencer: "#16A34A", d0_30: "#CA8A04", d31_60: "#F97316", d60: "#DC2626", sinFecha: "#C0C7D0" };

export const STATUS_OPTIONS = ["EN TRÁNSITO", "EN PRODUCCIÓN", "ENTREGADO AL CLIENTE", "PENDIENTE ANTICIPO"];

export type Row = { c: Contract; estado: EstadoCartera; days: number | null };
export type Group = { client: string; items: Row[]; total: number; atrasado: number };
export type Bucket = { amt: number; n: number };
export type Aging = { porVencer: Bucket; d0_30: Bucket; d31_60: Bucket; d60: Bucket; sinFecha: Bucket };
export type Kpis = {
  total: number; ops: number; clientes: number;
  atrasadas: number; aTiempo: number; adelantadas: number; sinFecha: number;
  montoAtrasado: number; montoATiempo: number; montoAdelantado: number; montoSinFecha: number; montoPorVencer: number;
};

// ===========================================================================
// Helpers (UTC-safe)
// ===========================================================================

export const onlyDate = (d: string) => d.split("T")[0];
export const parseUTC = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const [y, m, d] = onlyDate(iso).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
};
const addDaysUTC = (date: Date, days: number) => { const dt = new Date(date.getTime()); dt.setUTCDate(dt.getUTCDate() + days); return dt; };
export const todayUTC = () => { const n = new Date(); return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())); };
export const isoFromDate = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
export const deadlineISO = (eta: string | null | undefined) => { const e = parseUTC(eta); return e ? isoFromDate(addDaysUTC(e, -DEADLINE_DAYS)) : null; };

export const computeEstado = (eta: string | null | undefined, today: Date): EstadoCartera => {
  const dl = deadlineISO(eta);
  if (!dl) return "SIN_FECHA";
  const diff = Math.round((parseUTC(dl)!.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "ATRASADO";
  if (diff === 0) return "A_TIEMPO";
  return "ADELANTADO";
};
export const daysToDeadline = (eta: string | null | undefined, today: Date): number | null => {
  const dl = deadlineISO(eta);
  return dl ? Math.round((parseUTC(dl)!.getTime() - today.getTime()) / 86400000) : null;
};

export const fmtDate = (d: string | null | undefined) => { if (!d) return "—"; const p = onlyDate(d).split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; };
export const fmtNum = (n: number | null | undefined) => n == null ? "" : n.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const fmtUSD = (n: number) => "USD " + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtMoney = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtMoneyShort = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return "$" + (n / 1_000_000).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + "M";
  if (Math.abs(n) >= 1_000) return "$" + (n / 1_000).toLocaleString("en-US", { maximumFractionDigits: 0 }) + "K";
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
};

// ===========================================================================
// Data hook
// ===========================================================================

export interface CarteraData {
  loading: boolean; today: Date;
  searchQuery: string; setSearchQuery: (v: string) => void;
  filterClient: string[]; setFilterClient: (v: string[]) => void;
  filterStatus: string[]; setFilterStatus: (v: string[]) => void;
  filterEstado: string[]; setFilterEstado: (v: string[]) => void;
  filterOptions: { client_names: string[] };
  activeFilterCount: number; clearAllFilters: () => void;
  rows: Row[]; kpis: Kpis; aging: Aging; groups: Group[];
  fetchData: () => void; handleDownloadPDF: () => void; handleDownloadExcel: () => void;
}

export function useCarteraData(): CarteraData {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterClient, setFilterClient] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>(["EN TRÁNSITO"]);
  const [filterEstado, setFilterEstado] = useState<string[]>([]);
  const [filterOptions, setFilterOptions] = useState<{ client_names: string[] }>({ client_names: [] });

  const today = useMemo(() => todayUTC(), []);

  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(searchQuery), 300); return () => clearTimeout(t); }, [searchQuery]);

  const buildParams = useCallback((pageSize = 5000) => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filterClient.length) params.set("client_name", filterClient.join(","));
    if (filterStatus.length) params.set("status", filterStatus.join(","));
    params.set("sort_field", "client_name"); params.set("sort_direction", "asc");
    params.set("page", "1"); params.set("pageSize", String(pageSize));
    return params;
  }, [debouncedSearch, filterClient, filterStatus]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contracts?${buildParams().toString()}`);
      if (res.ok) {
        const json = await res.json();
        setContracts((json.data || []).filter((c: Contract) => (c.pending_client_amount ?? 0) > 0));
      }
    } catch { toast.error("Error al cargar la cartera"); }
    finally { setLoading(false); }
  }, [buildParams]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    (async () => {
      try { const res = await fetch("/api/contracts/filters"); if (res.ok) { const d = await res.json(); setFilterOptions({ client_names: d.client_names || [] }); } } catch { /* ignore */ }
    })();
  }, []);

  const rows: Row[] = useMemo(() =>
    contracts.map((c) => ({ c, estado: computeEstado(c.eta_final, today), days: daysToDeadline(c.eta_final, today) }))
      .filter((r) => (filterEstado.length ? filterEstado.includes(r.estado) : true)),
    [contracts, today, filterEstado]);

  const kpis: Kpis = useMemo(() => {
    let total = 0, montoAtrasado = 0, montoATiempo = 0, montoAdelantado = 0, montoSinFecha = 0;
    let atrasadas = 0, aTiempo = 0, adelantadas = 0, sinFecha = 0;
    for (const r of rows) {
      const a = r.c.pending_client_amount ?? 0; total += a;
      if (r.estado === "ATRASADO") { atrasadas++; montoAtrasado += a; }
      else if (r.estado === "A_TIEMPO") { aTiempo++; montoATiempo += a; }
      else if (r.estado === "ADELANTADO") { adelantadas++; montoAdelantado += a; }
      else { sinFecha++; montoSinFecha += a; }
    }
    return { total, ops: rows.length, clientes: new Set(rows.map((r) => r.c.client_name)).size, atrasadas, aTiempo, adelantadas, sinFecha, montoAtrasado, montoATiempo, montoAdelantado, montoSinFecha, montoPorVencer: montoATiempo + montoAdelantado };
  }, [rows]);

  const aging: Aging = useMemo(() => {
    const b: Aging = { porVencer: { amt: 0, n: 0 }, d0_30: { amt: 0, n: 0 }, d31_60: { amt: 0, n: 0 }, d60: { amt: 0, n: 0 }, sinFecha: { amt: 0, n: 0 } };
    for (const r of rows) {
      const a = r.c.pending_client_amount ?? 0;
      if (r.estado === "SIN_FECHA") { b.sinFecha.amt += a; b.sinFecha.n++; continue; }
      const days = r.days ?? 0;
      if (days >= 0) { b.porVencer.amt += a; b.porVencer.n++; }
      else { const od = -days; if (od <= 30) { b.d0_30.amt += a; b.d0_30.n++; } else if (od <= 60) { b.d31_60.amt += a; b.d31_60.n++; } else { b.d60.amt += a; b.d60.n++; } }
    }
    return b;
  }, [rows]);

  const groups: Group[] = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of rows) { const k = r.c.client_name || "Sin cliente"; if (!map.has(k)) map.set(k, []); map.get(k)!.push(r); }
    return Array.from(map.entries()).map(([client, items]) => {
      const total = items.reduce((s, r) => s + (r.c.pending_client_amount ?? 0), 0);
      const atrasado = items.filter((r) => r.estado === "ATRASADO").reduce((s, r) => s + (r.c.pending_client_amount ?? 0), 0);
      const order: Record<EstadoCartera, number> = { ATRASADO: 0, A_TIEMPO: 1, ADELANTADO: 2, SIN_FECHA: 3 };
      items.sort((a, b) => order[a.estado] - order[b.estado] || (a.c.eta_final || "").localeCompare(b.c.eta_final || ""));
      return { client, items, total, atrasado };
    }).sort((a, b) => b.total - a.total);
  }, [rows]);

  const activeFilterCount = [filterClient, filterStatus, filterEstado].filter((f) => f.length > 0).length
    - (filterStatus.length === 1 && filterStatus[0] === "EN TRÁNSITO" ? 1 : 0);

  const clearAllFilters = () => { setSearchQuery(""); setFilterClient([]); setFilterStatus(["EN TRÁNSITO"]); setFilterEstado([]); };

  // -------- PDF premium (HTML → imprimir / Guardar como PDF) --------
  const handleDownloadPDF = async () => {
    try {
      toast.info("Abriendo vista de impresión…");
      const { generateCarteraHTML } = await import("@/lib/html-cartera");
      const sc = groups.length === 1 ? groups[0].client : null;
      const now = new Date();
      const dateStr = now.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
      const dateTimeStr = now.toLocaleString("es-CO");
      await generateCarteraHTML({
        clientName: sc,
        generatedDate: dateStr,
        generatedDateTime: dateTimeStr,
        total: kpis.total,
        ops: kpis.ops, clientes: kpis.clientes,
        montoAtrasado: kpis.montoAtrasado, opsAtrasadas: kpis.atrasadas,
        montoPorVencer: kpis.montoPorVencer, opsPorVencer: kpis.aTiempo + kpis.adelantadas,
        montoSinFecha: kpis.montoSinFecha, opsSinFecha: kpis.sinFecha,
        pctAtrasado: kpis.total > 0 ? Math.round((kpis.montoAtrasado / kpis.total) * 100) : 0,
        aging: [
          { key: "porVencer", label: "Por vencer", amount: aging.porVencer.amt, n: aging.porVencer.n, color: AG.porVencer },
          { key: "d0_30", label: "Vencido 0–30 días", amount: aging.d0_30.amt, n: aging.d0_30.n, color: AG.d0_30 },
          { key: "d31_60", label: "Vencido 31–60 días", amount: aging.d31_60.amt, n: aging.d31_60.n, color: AG.d31_60 },
          { key: "d60", label: "Vencido +60 días", amount: aging.d60.amt, n: aging.d60.n, color: AG.d60 },
          { key: "sinFecha", label: "Sin fecha", amount: aging.sinFecha.amt, n: aging.sinFecha.n, color: AG.sinFecha },
        ],
        groups: groups.map((g) => ({
          client: g.client, total: g.total, atrasado: g.atrasado,
          items: g.items.map((r) => ({
            contract: r.c.client_contract || "—", material: r.c.detail || "—",
            saldo: r.c.pending_client_amount ?? 0,
            eta: fmtDate(r.c.eta_final), deadline: fmtDate(deadlineISO(r.c.eta_final)),
            estadoLabel: ESTADO_META[r.estado].label, estadoKey: r.estado,
            days: r.days, overdue: r.estado === "ATRASADO",
          })),
        })),
        deadlineDays: DEADLINE_DAYS,
        filename: `Reporte_Cartera_IBC_${now.toISOString().slice(0, 10)}`,
      });
      toast.success("Listo: usa “Guardar como PDF”");
    } catch (e) { console.error(e); toast.error("Error al generar el reporte"); }
  };

  // -------- Excel --------
  const handleDownloadExcel = async () => {
    try {
      toast.info("Generando Excel de cartera...");
      const excelMod = await import("exceljs");
      const ExcelJS = excelMod.default || excelMod;
      const wb = new ExcelJS.Workbook();
      wb.creator = "IBC Steel Group - IBC Core"; wb.created = new Date();
      const ws = wb.addWorksheet("Cartera", { views: [{ state: "frozen", ySplit: 6 }] });
      // Palette — clean, high-impact (color reserved for signal)
      const NAVY = "0B5394", NAVY_DEEP = "08355C", WHITE = "FFFFFF", INK = "18202B", INK_SOFT = "3D4757",
        INK_LIGHT = "9AA3B2", LINE = "E9E6DF", PAPER = "FBFAF7", GOLD = "C8A532",
        RED = "C0392B", GREEN = "1E874B", AMBER = "B7791F", GREY = "8B95A5", FONT = "Aptos";
      const estadoText: Record<EstadoCartera, string> = { ATRASADO: RED, A_TIEMPO: AMBER, ADELANTADO: GREEN, SIN_FECHA: GREY };
      const logoId = await addLogoToWorkbook(wb);
      ws.columns = [{ key: "contract", width: 24 }, { key: "material", width: 56 }, { key: "saldo", width: 20 }, { key: "eta", width: 15 }, { key: "deadline", width: 15 }, { key: "estado", width: 17 }];
      const totalCols = 6;
      const now = new Date();
      const dateStr = now.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
      const singleClient = groups.length === 1 ? groups[0].client : null;

      // ROW 1 — Hero band (deep navy, gold baseline). Cliente protagonista cuando es uno solo.
      const r1 = ws.addRow([""]); r1.height = 60;
      ws.getCell("A1").value = { richText: [
        { text: "                                  ", font: { name: FONT, size: 18, color: { argb: NAVY_DEEP } } },
        { text: "REPORTE DE CARTERA", font: { name: FONT, size: 16, bold: true, color: { argb: WHITE } } },
        ...(singleClient ? [{ text: `      ${singleClient}`, font: { name: FONT, size: 16, bold: true, color: { argb: GOLD } } }] : []),
        { text: `      ${dateStr}  ·  ${kpis.ops} operaciones${singleClient ? "" : `  ·  ${kpis.clientes} clientes`}`, font: { name: FONT, size: 9.5, color: { argb: "AFC6E0" } } },
      ] };
      ws.getCell("A1").alignment = { horizontal: "left", vertical: "middle", indent: 1 };
      for (let col = 1; col <= totalCols; col++) { const cell = r1.getCell(col); cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_DEEP } }; cell.border = { bottom: { style: "thick", color: { argb: GOLD } } }; }
      addLogoToHeader(ws, logoId, totalCols);

      // ROW 2 — Big total (the impact figure)
      const r2 = ws.addRow([""]); r2.height = 48;
      ws.mergeCells(2, 1, 2, totalCols);
      ws.getCell("A2").value = { richText: [
        { text: "CARTERA TOTAL POR COBRAR       ", font: { name: FONT, size: 10, bold: true, color: { argb: INK_LIGHT } } },
        { text: fmtMoney(kpis.total), font: { name: FONT, size: 26, bold: true, color: { argb: NAVY } } },
        { text: "   USD", font: { name: FONT, size: 11, color: { argb: INK_LIGHT } } },
      ] };
      ws.getCell("A2").alignment = { horizontal: "left", vertical: "middle", indent: 1 };
      for (let col = 1; col <= totalCols; col++) r2.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: PAPER } };

      // ROW 3 — KPI line (clean, colored values only)
      const r3 = ws.addRow([""]); r3.height = 24;
      ws.mergeCells(3, 1, 3, totalCols);
      ws.getCell("A3").value = { richText: [
        { text: "Atrasado  ", font: { name: FONT, size: 10, color: { argb: INK_LIGHT } } },
        { text: `${fmtMoney(kpis.montoAtrasado)} · ${kpis.atrasadas} ops`, font: { name: FONT, size: 10.5, bold: true, color: { argb: RED } } },
        { text: "          Por vencer  ", font: { name: FONT, size: 10, color: { argb: INK_LIGHT } } },
        { text: `${fmtMoney(kpis.montoPorVencer)} · ${kpis.aTiempo + kpis.adelantadas} ops`, font: { name: FONT, size: 10.5, bold: true, color: { argb: GREEN } } },
      ] };
      ws.getCell("A3").alignment = { horizontal: "left", vertical: "middle", indent: 1 };
      for (let col = 1; col <= totalCols; col++) r3.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: PAPER } };

      // ROW 4 — Aging line (muted)
      const r4 = ws.addRow([""]); r4.height = 20;
      ws.mergeCells(4, 1, 4, totalCols);
      ws.getCell("A4").value = { richText: [
        { text: "Antigüedad   ", font: { name: FONT, size: 9, bold: true, color: { argb: INK_LIGHT } } },
        { text: `Por vencer ${fmtMoneyShort(aging.porVencer.amt)}    ·    0–30 d ${fmtMoneyShort(aging.d0_30.amt)}    ·    31–60 d ${fmtMoneyShort(aging.d31_60.amt)}    ·    +60 d ${fmtMoneyShort(aging.d60.amt)}${aging.sinFecha.amt > 0 ? `    ·    Sin fecha ${fmtMoneyShort(aging.sinFecha.amt)}` : ""}`, font: { name: FONT, size: 9.5, color: { argb: INK_SOFT } } },
      ] };
      ws.getCell("A4").alignment = { horizontal: "left", vertical: "middle", indent: 1 };
      for (let col = 1; col <= totalCols; col++) { const cell = r4.getCell(col); cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PAPER } }; cell.border = { bottom: { style: "thin", color: { argb: LINE } } }; }

      // ROW 5 — spacer
      const r5 = ws.addRow([""]); r5.height = 8;
      for (let col = 1; col <= totalCols; col++) r5.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };

      // ROW 6 — column headers
      const hr = ws.addRow(["CONTRATO", "MATERIAL", "SALDO (USD)", "ETA", "DEADLINE", "ESTADO"]); hr.height = 26;
      hr.eachCell((cell, colNumber) => {
        cell.font = { name: FONT, size: 9.5, bold: true, color: { argb: WHITE } };
        cell.alignment = { horizontal: colNumber === 3 ? "right" : colNumber >= 4 ? "center" : "left", vertical: "middle", indent: colNumber <= 2 ? 1 : 0 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        cell.border = { bottom: { style: "medium", color: { argb: NAVY_DEEP } } };
      });

      let stripe = 0;
      for (const g of groups) {
        // Group header row per cliente — se omite cuando el reporte es de un solo cliente
        // (ya aparece destacado en el encabezado superior).
        if (!singleClient) {
          const gh = ws.addRow([g.client, "", "", "", "", ""]);
          ws.mergeCells(gh.number, 1, gh.number, 2);
          gh.getCell(3).value = g.total; gh.getCell(3).numFmt = '"$"#,##0.00';
          for (let col = 1; col <= totalCols; col++) {
            const cell = gh.getCell(col);
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F2F5F9" } };
            cell.font = { name: FONT, size: 11, bold: true, color: { argb: NAVY } };
            cell.alignment = { vertical: "middle", horizontal: col === 3 ? "right" : "left", indent: col === 1 ? 1 : 0 };
            cell.border = { top: { style: "thin", color: { argb: "D6DEE9" } }, bottom: { style: "thin", color: { argb: "D6DEE9" } } };
          }
          gh.height = 24;
        }
        for (const r of g.items) {
          const c = r.c;
          const row = ws.addRow([c.client_contract || "", c.detail || "", c.pending_client_amount ?? "",
            parseUTC(c.eta_final) ? new Date(onlyDate(c.eta_final!) + "T00:00:00") : "",
            deadlineISO(c.eta_final) ? new Date(deadlineISO(c.eta_final)! + "T00:00:00") : "",
            ESTADO_META[r.estado].label]);
          const bg = stripe % 2 === 0 ? WHITE : "FBFAF7"; stripe++;
          row.eachCell((cell, colNumber) => {
            cell.font = { name: FONT, size: 10, color: { argb: INK_SOFT } };
            cell.alignment = { vertical: "middle" };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
            cell.border = { bottom: { style: "hair", color: { argb: LINE } } };
            if (colNumber === 1) cell.font = { name: FONT, size: 10, bold: true, color: { argb: NAVY } };
            if (colNumber === 2) cell.alignment = { vertical: "middle", wrapText: true };
            if (colNumber === 3) { cell.numFmt = '"$"#,##0.00'; cell.alignment = { horizontal: "right", vertical: "middle" }; cell.font = { name: FONT, size: 10.5, bold: true, color: { argb: INK } }; }
            if (colNumber === 4 || colNumber === 5) { cell.numFmt = "DD/MM/YYYY"; cell.alignment = { horizontal: "center", vertical: "middle" }; if (colNumber === 5 && r.estado === "ATRASADO") cell.font = { name: FONT, size: 10, bold: true, color: { argb: RED } }; }
            if (colNumber === 6) { cell.font = { name: FONT, size: 9.5, bold: true, color: { argb: estadoText[r.estado] } }; cell.alignment = { horizontal: "center", vertical: "middle" }; }
          });
          row.height = 22;
        }
      }

      const tr = ws.addRow(["TOTAL CARTERA", "", kpis.total, "", "", ""]);
      ws.mergeCells(tr.number, 1, tr.number, 2);
      for (let col = 1; col <= totalCols; col++) {
        const cell = tr.getCell(col);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_DEEP } };
        cell.font = { name: FONT, size: 11.5, bold: true, color: { argb: WHITE } };
        cell.border = { top: { style: "medium", color: { argb: GOLD } } };
        cell.alignment = { vertical: "middle", horizontal: col === 3 ? "right" : "left", indent: col === 1 ? 1 : 0 };
        if (col === 3) cell.numFmt = '"$"#,##0.00';
      }
      tr.height = 30;

      const sp = ws.addRow([""]); sp.height = 8;
      for (let col = 1; col <= totalCols; col++) sp.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
      const fIdx = ws.rowCount + 1; const fr = ws.addRow([""]);
      ws.mergeCells(fIdx, 1, fIdx, totalCols);
      ws.getCell(`A${fIdx}`).value = { richText: [
        { text: "IBC STEEL GROUP S.A.S.", font: { name: FONT, size: 8.5, bold: true, color: { argb: NAVY } } },
        { text: `   ·   Deadline = ETA − ${DEADLINE_DAYS} días   ·   Documento interno de control de cartera · Confidencial   ·   ${now.toLocaleString("es-CO")}`, font: { name: FONT, size: 8, italic: true, color: { argb: INK_LIGHT } } },
      ] };
      ws.getCell(`A${fIdx}`).alignment = { horizontal: "center", vertical: "middle" };
      ws.getCell(`A${fIdx}`).border = { top: { style: "thin", color: { argb: LINE } } };
      fr.height = 22;

      ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `Reporte_Cartera_IBC_${now.toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
      toast.success("Excel descargado");
    } catch (e) { console.error(e); toast.error("Error al generar el Excel"); }
  };

  return {
    loading, today, searchQuery, setSearchQuery, filterClient, setFilterClient, filterStatus, setFilterStatus,
    filterEstado, setFilterEstado, filterOptions, activeFilterCount, clearAllFilters,
    rows, kpis, aging, groups, fetchData, handleDownloadPDF, handleDownloadExcel,
  };
}

// ===========================================================================
// Shared UI: Donut, EstadoBadge, FilterPopover
// ===========================================================================

export function Donut({ segments, size = 156, stroke = 22, center, centerSub, trackColor = "rgba(255,255,255,0.16)", centerColor = "#fff", subColor = "rgba(255,255,255,0.7)" }: {
  segments: { value: number; color: string }[]; size?: number; stroke?: number; center: string; centerSub?: string; trackColor?: string; centerColor?: string; subColor?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - stroke) / 2, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} style={{ display: "block" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        {total > 0 && segments.filter((s) => s.value > 0).map((seg, i) => {
          const dash = (seg.value / total) * circ;
          const el = <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={stroke} strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-acc} style={{ transition: "stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease" }} />;
          acc += dash; return el;
        })}
      </g>
      <text x={cx} y={cy - 2} textAnchor="middle" style={{ fontSize: 26, fontWeight: 800, fill: centerColor, fontFamily: "var(--font-jetbrains-mono), monospace" }}>{center}</text>
      {centerSub && <text x={cx} y={cy + 16} textAnchor="middle" style={{ fontSize: 10, fontWeight: 600, fill: subColor, letterSpacing: "0.08em" }}>{centerSub}</text>}
    </svg>
  );
}

export function EstadoBadge({ estado, days, small = false }: { estado: EstadoCartera; days: number | null; small?: boolean }) {
  const m = ESTADO_META[estado];
  const detail = estado === "ATRASADO" && days != null ? ` ·${Math.abs(days)}d` : estado === "ADELANTADO" && days != null ? ` ·${days}d` : "";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: small ? "1px 7px" : "2px 9px", borderRadius: 20, background: m.bg, color: m.color, fontSize: small ? 9.5 : 10.5, fontWeight: 700, whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: 99, background: m.color, display: "inline-block" }} />
      {m.label}{detail}
    </span>
  );
}

export function FilterPopover({ label, options, selected, onChange, accentColor = T.accent }: {
  label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void; accentColor?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));
  const isActive = selected.length > 0;
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: `1px solid ${isActive ? accentColor + "40" : T.borderLight}`, background: isActive ? accentColor + "08" : T.surface, color: isActive ? accentColor : T.inkMuted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
        {label}
        {isActive && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: 5, background: accentColor, color: "#fff", fontSize: 10, fontWeight: 700 }}>{selected.length}</span>}
        <ChevronDown className="w-3 h-3" style={{ opacity: 0.5 }} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50, width: 260, maxHeight: 320, borderRadius: 12, background: "rgba(255,255,255,0.97)", backdropFilter: "blur(16px)", border: `1px solid ${T.borderLight}`, boxShadow: T.shadowLg, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "8px 10px", borderBottom: `1px solid ${T.borderLight}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 6, background: T.surfaceAlt, border: `1px solid ${T.borderLight}` }}>
              <Search className="w-3 h-3" style={{ color: T.inkLight, flexShrink: 0 }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." autoFocus style={{ border: "none", background: "transparent", outline: "none", fontSize: 12, color: T.ink, width: "100%", fontFamily: "inherit" }} />
              {search && <X className="w-3 h-3 cursor-pointer" style={{ color: T.inkLight }} onClick={() => setSearch("")} />}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 6px" }}>
            {filtered.length === 0 && <div style={{ padding: 12, fontSize: 12, color: T.inkLight, textAlign: "center" }}>Sin resultados</div>}
            {filtered.map((opt) => {
              const sel = selected.includes(opt);
              return (
                <div key={opt} onClick={() => toggle(opt)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, cursor: "pointer", marginBottom: 1, background: sel ? accentColor + "0A" : "transparent" }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: sel ? accentColor : T.surfaceAlt, border: `1.5px solid ${sel ? accentColor : T.border}` }}>{sel && <Check className="w-2.5 h-2.5" style={{ color: "#fff" }} />}</div>
                  <span style={{ fontSize: 12, color: sel ? T.ink : T.inkSoft, fontWeight: sel ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opt}</span>
                </div>
              );
            })}
          </div>
          {selected.length > 0 && (
            <div style={{ padding: "6px 10px", borderTop: `1px solid ${T.borderLight}` }}>
              <button onClick={() => { onChange([]); setOpen(false); }} style={{ width: "100%", padding: "5px 0", borderRadius: 6, border: "none", background: T.surfaceAlt, color: T.inkMuted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Limpiar filtro</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const labelFor = (estado: string) => ({ ATRASADO: "Atrasado", A_TIEMPO: "A tiempo", ADELANTADO: "Adelantado", SIN_FECHA: "Sin fecha" }[estado] || estado);
