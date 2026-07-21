"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Download, Loader2, RefreshCw, Search, X, Users, FileSpreadsheet, Briefcase } from "lucide-react";
import { addLogoToWorkbook, addLogoToHeader } from "@/lib/excel-logo";
import { T } from "@/lib/design-tokens";
import { Button } from "@/components/ui/button";
import type { Contract } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtNum = (n: number | null | undefined) => {
  if (n == null) return "";
  return n.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const toDate = (d: string | null | undefined): Date | string => {
  if (!d) return "";
  try {
    const iso = d.split("T")[0];
    const [y, m, day] = iso.split("-").map(Number);
    if (y && m && day) return new Date(y, m - 1, day);
    return "";
  } catch { return ""; }
};

// ---------------------------------------------------------------------------
// Excel column schema (in display order)
// ---------------------------------------------------------------------------

type ColumnDef = {
  key: keyof Contract | "product_type_label";
  label: string;
  width: number;
  type?: "date" | "number" | "money" | "text";
  bold?: boolean;
  center?: boolean;
};

const COLUMNS: ColumnDef[] = [
  { key: "commercial_name",        label: "COMERCIAL",            width: 18, bold: true },
  { key: "client_name",            label: "CLIENTE",              width: 26, bold: true },
  { key: "client_contract",        label: "CONTRATO CLIENTE",     width: 20, bold: true },
  { key: "contract_date",          label: "FECHA CONTRATO",       width: 14, type: "date", center: true },
  { key: "country",                label: "PAÍS",                 width: 14, center: true },
  { key: "incoterm",               label: "INCOTERM",             width: 11, center: true },
  { key: "detail",                 label: "DETALLE",              width: 36 },
  { key: "tons_agreed",            label: "TONELADAS",            width: 13, type: "number" },
  { key: "advance_paid",           label: "PAGO ANTICIPO",        width: 14, center: true },
  { key: "balance_paid",           label: "PAGO SALDO",           width: 14, center: true },
  { key: "status",                 label: "STATUS",               width: 22, center: true, bold: true },
  { key: "production_time_days",   label: "T. PRODUCCIÓN (DÍAS)", width: 14, type: "number" },
  { key: "advance_payment_date",   label: "FECHA PAGO ANTICIPO",  width: 16, type: "date", center: true },
  { key: "exw_date",               label: "FECHA EXW",            width: 14, type: "date", center: true },
  { key: "etd",                    label: "ETD",                  width: 13, type: "date", center: true },
  { key: "eta_final",              label: "ETA FINAL",            width: 14, type: "date", center: true },
  { key: "vessel_name",            label: "VESSEL NAME",          width: 20 },
  { key: "shipping_company",       label: "SHIPPING COMPANY",     width: 22 },
  { key: "bl_number",              label: "BL",                   width: 19 },
  { key: "arrival_port",           label: "PUERTO DE ARRIBO",     width: 18 },
  { key: "tons_shipped",           label: "MT SHIPPED",           width: 13, type: "number" },
  { key: "bl_released",            label: "LIBERACIÓN",           width: 14, center: true },
  { key: "documents_sent",         label: "DOCUMENTOS ENVIADOS",  width: 30 },
  { key: "documents_pending",      label: "DOCS PENDIENTES",      width: 28 },
  { key: "physical_docs_sent",     label: "DOCUMENTOS FÍSICOS",   width: 24 },
  { key: "pending_client_amount",  label: "VALOR A PAGAR CLIENTE (USD)", width: 22, type: "money" },
  { key: "product_type_label",     label: "TIPO (MP/MÁQUINA)",    width: 14, center: true },
];

// ---------------------------------------------------------------------------
// Excel generation (per commercial)
// ---------------------------------------------------------------------------

async function buildWorkbook(commercialName: string, rowsRaw: Contract[]) {
  // Excluir contratos ANULADO del reporte
  const rows = rowsRaw.filter(c => c.status !== "ANULADO");

  const excelMod = await import("exceljs");
  const ExcelJS = excelMod.default || excelMod;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "IBC Steel Group";
  workbook.created = new Date();

  const sheetName = commercialName.slice(0, 28).replace(/[\\/?*[\]:]/g, "_") || "Reporte";
  const ws = workbook.addWorksheet(sheetName, {
    properties: { defaultColWidth: 16 },
    views: [{ state: "frozen", ySplit: 3 }],
  });

  const NAVY = "1E3A5F";
  const WHITE = "FFFFFF";
  const INK_SOFT = "3D4049";
  const INK = "18191D";
  const INK_LIGHT = "9CA3B4";
  const BORDER = "E8E6E1";
  const WARM_BG = "FAF9F7";
  const FONT = "Aptos";
  const logoId = await addLogoToWorkbook(workbook);

  const statusStyles: Record<string, { bg: string; text: string }> = {
    "ENTREGADO AL CLIENTE": { bg: "ECFDF3", text: "0D9F6E" },
    "EN TRÁNSITO":          { bg: "E8F0FE", text: "0B5394" },
    "EN PRODUCCIÓN":        { bg: "FFF8EB", text: "DC8B0B" },
    "ANULADO":              { bg: "FFF1F2", text: "E63946" },
    "PENDIENTE ANTICIPO":   { bg: "F1F5F9", text: "64748B" },
  };
  const balanceStyles: Record<string, { bg: string; text: string }> = {
    "PENDIENTE": { bg: "FFF8EB", text: "DC8B0B" },
    "OK":        { bg: "ECFDF3", text: "0D9F6E" },
  };

  ws.columns = COLUMNS.map(c => ({ key: c.key as string, width: c.width }));
  const totalCols = ws.columns.length;

  const now = new Date();
  const dateStr = now.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
  const totalTonsAgreed = rows.reduce((s, c) => s + (c.tons_agreed ?? 0), 0);
  const totalTonsShipped = rows.reduce((s, c) => s + (c.tons_shipped ?? 0), 0);
  const totalPending = rows.reduce((s, c) => s + (c.pending_client_amount ?? 0), 0);

  // ROW 1: Header bar
  const r1 = ws.addRow([""]);
  const c1 = ws.getCell("A1");
  c1.value = { richText: [
    { text: "                              ", font: { name: FONT, size: 16, color: { argb: NAVY } } },
    { text: `STATUS DE PRODUCCIÓN — ${commercialName.toUpperCase()}`, font: { name: FONT, size: 12, bold: true, color: { argb: WHITE } } },
    { text: `     ${dateStr}  ·  ${rows.length} contratos`, font: { name: FONT, size: 9, color: { argb: "D0DCE8" } } },
  ] };
  c1.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  c1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  r1.height = 52;
  for (let col = 1; col <= totalCols; col++) {
    const cell = r1.getCell(col);
    if (col > 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.border = { bottom: { style: "medium" as const, color: { argb: WHITE } } };
  }
  addLogoToHeader(ws, logoId, totalCols);

  // ROW 2: spacer
  const r2 = ws.addRow([""]);
  r2.height = 5;
  for (let col = 1; col <= totalCols; col++) {
    r2.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
  }

  // ROW 3: column headers
  const headerRow = ws.addRow(COLUMNS.map(c => c.label));
  headerRow.height = 34;
  headerRow.eachCell((cell, colNumber) => {
    cell.font = { name: FONT, size: 9, bold: true, color: { argb: WHITE } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.border = {
      bottom: { style: "thin" as const, color: { argb: WHITE } },
      left: { style: "thin" as const, color: { argb: "2D5A8A" } },
      right: { style: "thin" as const, color: { argb: "2D5A8A" } },
      top: { style: "thin" as const, color: { argb: "2D5A8A" } },
    };
    if (colNumber === 1) cell.border = { ...cell.border, left: { style: "medium" as const, color: { argb: NAVY } } };
    if (colNumber === totalCols) cell.border = { ...cell.border, right: { style: "medium" as const, color: { argb: NAVY } } };
  });

  // DATA ROWS — agrupadas por estado
  const STRIPE_A = WHITE;
  const STRIPE_B = "F8F7F5";

  const productTypeLabel = (pt: string | null | undefined) => {
    if (!pt) return "";
    const t = pt.toUpperCase();
    if (t.includes("MP") || t.includes("MATERIA")) return "MP";
    if (t.includes("MAQ")) return "MÁQUINA";
    return pt;
  };

  // Orden lógico: lo más urgente primero
  const STATUS_ORDER: string[] = [
    "PENDIENTE ANTICIPO",
    "EN PRODUCCIÓN",
    "EN TRÁNSITO",
    "ENTREGADO AL CLIENTE",
    "ANULADO",
  ];
  const statusBucket = (s: string | null | undefined) => s || "SIN STATUS";

  // Agrupar
  const groupsByStatus = new Map<string, Contract[]>();
  for (const c of rows) {
    const key = statusBucket(c.status);
    if (!groupsByStatus.has(key)) groupsByStatus.set(key, []);
    groupsByStatus.get(key)!.push(c);
  }
  // Orden de las secciones
  const orderedStatuses = [
    ...STATUS_ORDER.filter(s => groupsByStatus.has(s)),
    ...Array.from(groupsByStatus.keys()).filter(s => !STATUS_ORDER.includes(s)).sort(),
  ];

  let dataIdx = 0;
  for (const statusKey of orderedStatuses) {
    const group = groupsByStatus.get(statusKey)!;
    // Ordenar dentro del grupo por cliente y luego fecha desc
    group.sort((a, b) => {
      const cn = (a.client_name || "").localeCompare(b.client_name || "");
      if (cn !== 0) return cn;
      return (b.contract_date || "").localeCompare(a.contract_date || "");
    });

    const st = statusStyles[statusKey] || { bg: "F1F5F9", text: "64748B" };
    const groupTons = group.reduce((s, c) => s + (c.tons_agreed ?? 0), 0);
    const groupShipped = group.reduce((s, c) => s + (c.tons_shipped ?? 0), 0);
    const groupPending = group.reduce((s, c) => s + (c.pending_client_amount ?? 0), 0);

    // Los ENTREGADOS van ocultos: siguen en el archivo (se pueden mostrar
    // desde Excel con "Mostrar filas") pero no estorban en la lectura.
    const isHiddenGroup = statusKey === "ENTREGADO AL CLIENTE";

    // SECTION HEADER ROW — banda con color del status
    const sectionRow = ws.addRow([""]);
    sectionRow.height = 28;
    sectionRow.hidden = isHiddenGroup;
    const sectionCell = ws.getCell(`A${sectionRow.number}`);
    sectionCell.value = {
      richText: [
        { text: `  ${statusKey}`, font: { name: FONT, size: 11, bold: true, color: { argb: st.text } } },
        { text: `      ${group.length} contrato${group.length !== 1 ? "s" : ""}  ·  ${groupTons.toLocaleString("es-CO", { maximumFractionDigits: 2 })} tons`, font: { name: FONT, size: 9, color: { argb: st.text } } },
      ],
    };
    sectionCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    for (let col = 1; col <= totalCols; col++) {
      const cell = sectionRow.getCell(col);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: st.bg } };
      cell.border = {
        top: { style: "medium" as const, color: { argb: st.text } },
        bottom: { style: "thin" as const, color: { argb: st.text } },
      };
    }
    ws.mergeCells(sectionRow.number, 1, sectionRow.number, totalCols);

    // Filas del grupo
    group.forEach((c) => {
    const values: Record<string, unknown> = {
      commercial_name: c.commercial_name || "",
      client_name: c.client_name || "",
      client_contract: c.client_contract || "",
      contract_date: toDate(c.contract_date),
      country: c.country || "",
      incoterm: c.incoterm || "",
      detail: c.detail || "",
      tons_agreed: c.tons_agreed ?? "",
      advance_paid: c.advance_paid || "",
      balance_paid: c.balance_paid || "",
      status: c.status || "",
      production_time_days: c.production_time_days ?? "",
      advance_payment_date: toDate(c.advance_payment_date),
      exw_date: toDate(c.exw_date),
      etd: toDate(c.etd),
      eta_final: toDate(c.eta_final),
      vessel_name: c.vessel_name || "",
      shipping_company: c.shipping_company || "",
      bl_number: c.bl_number || "",
      arrival_port: c.arrival_port || "",
      tons_shipped: c.tons_shipped ?? "",
      bl_released: c.bl_released || "",
      documents_sent: c.documents_sent || "",
      documents_pending: c.documents_pending || "",
      physical_docs_sent: c.physical_docs_sent || "",
      pending_client_amount: c.pending_client_amount ?? "",
      product_type_label: productTypeLabel(c.product_type),
    };
    const rowArr = COLUMNS.map(col => values[col.key as string] ?? "");
    const row = ws.addRow(rowArr);

    const rowBg = dataIdx % 2 === 0 ? STRIPE_A : STRIPE_B;
    dataIdx += 1;
    row.eachCell((cell, colNumber) => {
      const col = COLUMNS[colNumber - 1];
      cell.font = { name: FONT, size: 9.5, color: { argb: INK_SOFT } };
      cell.alignment = { vertical: "middle" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
      cell.border = {
        bottom: { style: "thin" as const, color: { argb: "EDECEA" } },
        left: { style: "hair" as const, color: { argb: "E8E6E1" } },
        right: { style: "hair" as const, color: { argb: "E8E6E1" } },
      };
      if (colNumber === 1) cell.border = { ...cell.border, left: { style: "thin" as const, color: { argb: "D4D2CD" } } };
      if (colNumber === totalCols) cell.border = { ...cell.border, right: { style: "thin" as const, color: { argb: "D4D2CD" } } };

      if (col.type === "date" && cell.value instanceof Date) {
        cell.numFmt = "DD/MM/YYYY";
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (col.type === "date") {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
      if (col.type === "number" && typeof cell.value === "number") {
        cell.numFmt = "#,##0.00";
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.font = { name: FONT, size: 9.5, color: { argb: INK } };
      } else if (col.type === "number") {
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
      if (col.type === "money") {
        if (typeof cell.value === "number") {
          cell.numFmt = '"USD "#,##0.00';
          cell.alignment = { horizontal: "right", vertical: "middle" };
          if (cell.value > 0) cell.font = { name: FONT, size: 9.5, bold: true, color: { argb: "B45309" } };
        } else {
          cell.alignment = { horizontal: "right", vertical: "middle" };
        }
      }
      if (col.center && !col.type) cell.alignment = { horizontal: "center", vertical: "middle" };

      if (col.key === "status" && c.status) {
        const st = statusStyles[c.status] || { bg: "F1F5F9", text: "64748B" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: st.bg } };
        cell.font = { name: FONT, size: 8.5, bold: true, color: { argb: st.text } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
      if (col.key === "balance_paid" && c.balance_paid) {
        const bs = balanceStyles[c.balance_paid];
        if (bs) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bs.bg } };
          cell.font = { name: FONT, size: 8.5, bold: true, color: { argb: bs.text } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
        }
      }
      if (col.key === "detail" || col.key === "documents_sent" || col.key === "documents_pending" || col.key === "physical_docs_sent") {
        cell.alignment = { ...cell.alignment, wrapText: true };
      }
      if (col.bold && cell.value) {
        const color = col.key === "client_contract" ? NAVY : INK;
        cell.font = { name: FONT, size: 9.5, bold: true, color: { argb: color } };
      }
    });
    row.height = 26;
    row.hidden = isHiddenGroup;
    }); // end group.forEach

    // SUBTOTAL del grupo
    const subRow = ws.addRow([]);
    subRow.height = 22;
    subRow.hidden = isHiddenGroup;
    for (let col = 1; col <= totalCols; col++) {
      const cell = subRow.getCell(col);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: st.bg } };
      cell.font = { name: FONT, size: 9, bold: true, color: { argb: st.text } };
      cell.border = {
        top: { style: "thin" as const, color: { argb: st.text } },
        bottom: { style: "medium" as const, color: { argb: st.text } },
      };
      cell.alignment = { vertical: "middle" };
    }
    const subIdxDetail = COLUMNS.findIndex(c => c.key === "detail");
    const subIdxTons = COLUMNS.findIndex(c => c.key === "tons_agreed");
    const subIdxShipped = COLUMNS.findIndex(c => c.key === "tons_shipped");
    const subIdxPending = COLUMNS.findIndex(c => c.key === "pending_client_amount");
    if (subIdxDetail >= 0) {
      subRow.getCell(subIdxDetail + 1).value = `Subtotal ${statusKey}`;
      subRow.getCell(subIdxDetail + 1).alignment = { horizontal: "right", vertical: "middle" };
    }
    if (subIdxTons >= 0) {
      subRow.getCell(subIdxTons + 1).value = groupTons;
      subRow.getCell(subIdxTons + 1).numFmt = "#,##0.00";
      subRow.getCell(subIdxTons + 1).alignment = { horizontal: "right", vertical: "middle" };
    }
    if (subIdxShipped >= 0) {
      subRow.getCell(subIdxShipped + 1).value = groupShipped;
      subRow.getCell(subIdxShipped + 1).numFmt = "#,##0.00";
      subRow.getCell(subIdxShipped + 1).alignment = { horizontal: "right", vertical: "middle" };
    }
    if (subIdxPending >= 0) {
      subRow.getCell(subIdxPending + 1).value = groupPending;
      subRow.getCell(subIdxPending + 1).numFmt = '"USD "#,##0.00';
      subRow.getCell(subIdxPending + 1).alignment = { horizontal: "right", vertical: "middle" };
    }

    // Pequeño espacio entre secciones
    const gap = ws.addRow([""]);
    gap.height = 6;
    gap.hidden = isHiddenGroup;
    for (let col = 1; col <= totalCols; col++) {
      gap.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
    }
  } // end orderedStatuses

  // TOTALS ROW
  const totalsRow = ws.addRow([]);
  for (let col = 1; col <= totalCols; col++) {
    const cell = totalsRow.getCell(col);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: WHITE } };
    cell.border = {
      top: { style: "medium" as const, color: { argb: WHITE } },
      bottom: { style: "medium" as const, color: { argb: NAVY } },
    };
  }
  const idxTonsAgreed = COLUMNS.findIndex(c => c.key === "tons_agreed");
  const idxTonsShipped = COLUMNS.findIndex(c => c.key === "tons_shipped");
  const idxPending = COLUMNS.findIndex(c => c.key === "pending_client_amount");
  const idxDetail = COLUMNS.findIndex(c => c.key === "detail");
  if (idxDetail >= 0) {
    totalsRow.getCell(idxDetail + 1).value = "TOTAL GENERAL";
    totalsRow.getCell(idxDetail + 1).alignment = { horizontal: "right", vertical: "middle" };
  }
  if (idxTonsAgreed >= 0) {
    totalsRow.getCell(idxTonsAgreed + 1).value = totalTonsAgreed;
    totalsRow.getCell(idxTonsAgreed + 1).numFmt = "#,##0.00";
    totalsRow.getCell(idxTonsAgreed + 1).alignment = { horizontal: "right", vertical: "middle" };
  }
  if (idxTonsShipped >= 0) {
    totalsRow.getCell(idxTonsShipped + 1).value = totalTonsShipped;
    totalsRow.getCell(idxTonsShipped + 1).numFmt = "#,##0.00";
    totalsRow.getCell(idxTonsShipped + 1).alignment = { horizontal: "right", vertical: "middle" };
  }
  if (idxPending >= 0) {
    totalsRow.getCell(idxPending + 1).value = totalPending;
    totalsRow.getCell(idxPending + 1).numFmt = '"USD "#,##0.00';
    totalsRow.getCell(idxPending + 1).alignment = { horizontal: "right", vertical: "middle" };
  }
  totalsRow.height = 28;

  // Footer
  const emptyRow = ws.addRow([""]);
  emptyRow.height = 4;
  for (let col = 1; col <= totalCols; col++) {
    emptyRow.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
  }
  const footerRowIdx = ws.rowCount + 1;
  const footerRow = ws.addRow([""]);
  const footerCell = ws.getCell(`A${footerRowIdx}`);
  footerCell.value = { richText: [
    { text: `Generado: ${now.toLocaleString("es-CO")}  ·  © ${now.getFullYear()} IBC STEEL GROUP`, font: { name: FONT, size: 8, italic: true, color: { argb: INK_LIGHT } } },
  ] };
  footerCell.alignment = { horizontal: "center", vertical: "middle" };
  footerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WARM_BG } };
  footerCell.border = { top: { style: "thin" as const, color: { argb: BORDER } } };
  footerRow.height = 24;
  // merge footer across all columns
  ws.mergeCells(footerRowIdx, 1, footerRowIdx, totalCols);

  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: totalCols } };
  ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };

  return workbook;
}

async function downloadFile(workbook: Awaited<ReturnType<typeof buildWorkbook>>, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

type CommercialGroup = {
  name: string;
  total: number;
  enProduccion: number;
  enTransito: number;
  entregados: number;
  tons: number;
  pending: number;
  contracts: Contract[];
};

export default function StatusCommercialReportPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingOne, setDownloadingOne] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // API cappea pageSize a 200 — paginamos hasta agotar
      const PAGE_SIZE = 200;
      const all: Contract[] = [];
      let page = 1;
      let totalCount = Infinity;
      while (all.length < totalCount) {
        const params = new URLSearchParams();
        params.set("pageSize", String(PAGE_SIZE));
        params.set("page", String(page));
        params.set("sort_field", "commercial_name");
        params.set("sort_direction", "asc");
        const res = await fetch(`/api/contracts?${params.toString()}`);
        if (!res.ok) throw new Error("API error");
        const json = await res.json();
        const batch: Contract[] = json.data || [];
        totalCount = json.count ?? batch.length;
        all.push(...batch);
        if (batch.length < PAGE_SIZE) break;
        page += 1;
        if (page > 100) break; // safety
      }
      setContracts(all);
    } catch {
      toast.error("Error al cargar contratos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Group by commercial
  const groups: CommercialGroup[] = (() => {
    const map = new Map<string, CommercialGroup>();
    for (const c of contracts) {
      const name = (c.commercial_name || "Sin comercial").trim();
      if (!map.has(name)) {
        map.set(name, { name, total: 0, enProduccion: 0, enTransito: 0, entregados: 0, tons: 0, pending: 0, contracts: [] });
      }
      const g = map.get(name)!;
      g.total += 1;
      g.tons += c.tons_agreed ?? 0;
      g.pending += c.pending_client_amount ?? 0;
      if (c.status === "EN PRODUCCIÓN") g.enProduccion += 1;
      else if (c.status === "EN TRÁNSITO") g.enTransito += 1;
      else if (c.status === "ENTREGADO AL CLIENTE") g.entregados += 1;
      g.contracts.push(c);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  })();

  const filteredGroups = searchQuery
    ? groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : groups;

  // Download one commercial
  const handleDownloadOne = async (group: CommercialGroup) => {
    setDownloadingOne(group.name);
    try {
      toast.info(`Generando reporte de ${group.name}...`);
      const wb = await buildWorkbook(group.name, group.contracts);
      const safe = group.name.replace(/[\\/?*[\]:]/g, "_");
      const today = new Date().toISOString().slice(0, 10);
      await downloadFile(wb, `REPORTE PEDIDOS ${safe} ${today}.xlsx`);
      toast.success(`Reporte de ${group.name} descargado`);
    } catch (err) {
      console.error(err);
      toast.error("Error al generar el reporte");
    } finally {
      setDownloadingOne(null);
    }
  };

  // Download all in one workbook (one sheet per commercial)
  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    try {
      toast.info("Generando reporte consolidado...");
      const excelMod = await import("exceljs");
      const ExcelJS = excelMod.default || excelMod;
      const masterWb = new ExcelJS.Workbook();
      masterWb.creator = "IBC Steel Group";
      masterWb.created = new Date();

      for (const g of groups) {
        const wb = await buildWorkbook(g.name, g.contracts);
        const src = wb.worksheets[0];
        const safeName = g.name.slice(0, 28).replace(/[\\/?*[\]:]/g, "_") || "Reporte";
        const dst = masterWb.addWorksheet(safeName, { properties: { defaultColWidth: 16 }, views: src.views });
        dst.columns = src.columns.map(c => ({ key: c.key, width: c.width }));
        src.eachRow({ includeEmpty: true }, (row, rowNumber) => {
          const newRow = dst.getRow(rowNumber);
          newRow.height = row.height;
          newRow.hidden = row.hidden;
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const nc = newRow.getCell(colNumber);
            nc.value = cell.value;
            nc.font = cell.font;
            nc.alignment = cell.alignment;
            nc.fill = cell.fill;
            nc.border = cell.border;
            nc.numFmt = cell.numFmt;
          });
        });
        if (src.autoFilter) dst.autoFilter = src.autoFilter;
        dst.pageSetup = src.pageSetup;
      }

      const buffer = await masterWb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const today = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `REPORTE PEDIDOS TODOS ${today}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Reporte consolidado descargado");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar el reporte consolidado");
    } finally {
      setDownloadingAll(false);
    }
  };

  return (
    <div style={{ background: T.glassBg, backdropFilter: T.glassBlur, border: "1px solid " + T.glassBorder, borderRadius: T.radius, boxShadow: T.shadowGlass, padding: "24px 28px" }}>
      <div className="space-y-5">
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: T.inkLight }}>
          <Link href="/" style={{ color: T.accent, fontWeight: 600, textDecoration: "none" }}>Inicio</Link>
          <span style={{ color: T.inkGhost }}>/</span>
          <Link href="/reports" style={{ color: T.accent, fontWeight: 600, textDecoration: "none" }}>Reportes</Link>
          <span style={{ color: T.inkGhost }}>/</span>
          <span style={{ fontWeight: 600, color: T.inkMuted }}>Status por Comercial</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink }}>Status de Producción por Comercial</h1>
            <p style={{ fontSize: 13, color: T.inkMuted, marginTop: 4 }}>
              Descarga rápida por comercial — <span style={{ fontWeight: 600, color: T.inkSoft }}>{groups.length} comerciales</span> · <span style={{ fontWeight: 600, color: T.inkSoft }}>{contracts.length} contratos</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
              <Briefcase className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-700">{groups.length}</span>
              <span className="text-xs text-blue-600">comerciales</span>
            </div>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl border-slate-200" onClick={fetchData}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
            <Button
              size="sm"
              className="h-9 gap-1.5 rounded-xl"
              onClick={handleDownloadAll}
              disabled={downloadingAll || loading || groups.length === 0}
              style={{ background: T.gradientPrimary, border: "none", boxShadow: T.shadowMd, color: "white" }}
            >
              {downloadingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Descargar Todos
            </Button>
          </div>
        </div>

        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
            borderRadius: 8, background: T.surface, border: `1px solid ${T.borderLight}`, minWidth: 240,
          }}>
            <Search className="w-3.5 h-3.5" style={{ color: T.inkLight, flexShrink: 0 }} />
            <input
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar comercial..."
              style={{ border: "none", background: "transparent", outline: "none", fontSize: 12, color: T.ink, width: "100%", fontFamily: "inherit" }}
            />
            {searchQuery && <X className="w-3.5 h-3.5 cursor-pointer" style={{ color: T.inkLight }} onClick={() => setSearchQuery("")} />}
          </div>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: T.accent }} />
            <span style={{ marginLeft: 8, fontSize: 13, color: T.inkMuted }}>Cargando comerciales...</span>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20" style={{ color: T.inkLight }}>
            <Users className="w-10 h-10 mb-3" />
            <p className="text-sm font-medium">No se encontraron comerciales</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {filteredGroups.map((g) => {
              const isBusy = downloadingOne === g.name;
              return (
                <div
                  key={g.name}
                  style={{
                    borderRadius: T.radiusMd,
                    background: T.surface,
                    border: `1px solid ${T.borderLight}`,
                    boxShadow: T.shadowMd,
                    padding: "16px 18px",
                    display: "flex", flexDirection: "column", gap: 12,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.accent + "40"; e.currentTarget.style.boxShadow = T.shadowAccent; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.borderLight; e.currentTarget.style.boxShadow = T.shadowMd; }}
                >
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: T.accent + "0E",
                      border: `1px solid ${T.accent}20`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: T.accent, fontWeight: 700, fontSize: 15,
                      fontFamily: "var(--font-jetbrains-mono), monospace",
                    }}>
                      {g.name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</div>
                      <div style={{ fontSize: 11, color: T.inkLight, marginTop: 2 }}>{g.total} contrato{g.total !== 1 ? "s" : ""} · {fmtNum(g.tons)} tons</div>
                    </div>
                  </div>

                  {/* Status counts */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {g.enProduccion > 0 && (
                      <span style={{ padding: "2px 8px", borderRadius: 6, background: "#FFF8EB", color: "#DC8B0B", fontSize: 11, fontWeight: 600 }}>
                        {g.enProduccion} producción
                      </span>
                    )}
                    {g.enTransito > 0 && (
                      <span style={{ padding: "2px 8px", borderRadius: 6, background: "#E8F0FE", color: "#0B5394", fontSize: 11, fontWeight: 600 }}>
                        {g.enTransito} tránsito
                      </span>
                    )}
                    {g.entregados > 0 && (
                      <span style={{ padding: "2px 8px", borderRadius: 6, background: "#ECFDF3", color: "#0D9F6E", fontSize: 11, fontWeight: 600 }}>
                        {g.entregados} entregados
                      </span>
                    )}
                  </div>

                  {/* Pending amount */}
                  {g.pending > 0 && (
                    <div style={{
                      padding: "8px 10px", borderRadius: 8,
                      background: "#FFF8EB", border: "1px solid #FDE8B5",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <span style={{ fontSize: 11, color: "#92400E", fontWeight: 600 }}>Pendiente por cobrar</span>
                      <span style={{ fontSize: 13, color: "#B45309", fontWeight: 700, fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                        USD {fmtNum(g.pending)}
                      </span>
                    </div>
                  )}

                  {/* Download */}
                  <Button
                    size="sm"
                    className="h-9 gap-1.5 rounded-lg w-full"
                    onClick={() => handleDownloadOne(g)}
                    disabled={isBusy}
                    style={{ background: T.gradientPrimary, border: "none", boxShadow: T.shadowMd, color: "white" }}
                  >
                    {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                    Descargar Excel
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <p style={{ fontSize: 11, color: T.inkLight, textAlign: "center", marginTop: 8 }}>
          Cada Excel incluye: Comercial · Cliente · Contrato · Fecha · País · Incoterm · Detalle · Toneladas · Anticipo/Saldo · Status · Tiempo de producción · Fechas (Anticipo, EXW, ETD, ETA) · Motonave · Naviera · BL · Puerto · MT Shipped · Liberación · Documentos · Valor a pagar · Tipo (MP/Máquina)
        </p>
      </div>
    </div>
  );
}
