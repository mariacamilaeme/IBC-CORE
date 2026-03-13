"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Download, Loader2, CreditCard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Supplier { id: string; name: string; bank_name: string | null; account_details: string | null; }
interface Payment {
  id: string; category: string; supplier_id: string | null; client: string | null;
  description: string | null; china_sales_contract: string | null; usd_invoice: number | null;
  deposit: number | null; deposit_percentage: number | null; balance_to_pay: number | null;
  payment_colombia: string | null; account_info: string | null; client_payment: number | null;
  remarks: string | null; numeral_cambiario: string | null; status: string;
  created_at: string; updated_at: string; suppliers: Supplier | null;
}

const CATEGORIES = [
  { key: "reporte_pagos", label: "Reporte de Pagos" },
  { key: "abonos", label: "Abonos" },
  { key: "pte_saldos", label: "Saldos Pendientes" },
  { key: "impo", label: "Importaciones" },
] as const;

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendiente", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  partial: { label: "Parcial", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  paid: { label: "Pagado", cls: "bg-green-50 text-green-700 border-green-200" },
};

const fmtNum = (n: number | null | undefined) => {
  if (n == null) return "";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PaymentsReportPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("reporte_pagos");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payments?pageSize=500");
      if (res.ok) {
        const json = await res.json();
        setPayments(json.data || []);
      }
    } catch {
      toast.error("Error al cargar pagos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => payments.filter((p) => p.category === activeCategory), [payments, activeCategory]);
  const isImpo = activeCategory === "impo";

  // ---------------------------------------------------------------------------
  // Excel Export
  // ---------------------------------------------------------------------------

  const handleExport = async () => {
    try {
      const catLabel = CATEGORIES.find((c) => c.key === activeCategory)?.label || activeCategory;
      toast.info("Generando reporte Excel...");
      const excelMod = await import("exceljs");
      const ExcelJS = excelMod.default || excelMod;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "IBC Steel Group - IBC Core";
      workbook.created = new Date();

      const ws = workbook.addWorksheet(catLabel.toUpperCase(), {
        properties: { defaultColWidth: 18 },
        views: [{ state: "frozen" as const, ySplit: 3 }],
      });

      const NAVY = "1E3A5F";
      const WHITE = "FFFFFF";
      const TEXT_DARK = "1A202C";

      const colHeaders = isImpo
        ? ["Contrato China", "USD Factura", "% Depósito", "Saldo a Pagar", "Pago Colombia", "Proveedor", "Cuenta", "Numeral Cambiario", "Estado"]
        : ["Cliente", "Descripción", "Contrato China", "USD Factura", "Depósito", "Saldo / %", "Pago Colombia", "Proveedor", "Cuenta", "Pago Cliente", "Observaciones"];

      const colWidths = isImpo
        ? [20, 14, 12, 14, 18, 24, 30, 16, 12]
        : [22, 20, 20, 14, 14, 16, 18, 24, 30, 14, 24];

      ws.columns = colHeaders.map((_, i) => ({ width: colWidths[i] }));
      const totalCols = colHeaders.length;
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

      // ROW 1: Header
      const r1 = ws.addRow([""]);
      ws.mergeCells(1, 1, 1, totalCols);
      const c1 = ws.getCell("A1");
      c1.value = { richText: [
        { text: "IBC", font: { name: "Aptos", size: 16, bold: true, color: { argb: WHITE } } },
        { text: "  STEEL GROUP", font: { name: "Aptos", size: 12, color: { argb: WHITE } } },
        { text: `          ${catLabel.toUpperCase()}`, font: { name: "Aptos", size: 10, bold: true, color: { argb: WHITE } } },
        { text: `     ${dateStr}  ·  ${filtered.length} registros`, font: { name: "Aptos", size: 9, color: { argb: "D0DCE8" } } },
      ] };
      c1.alignment = { horizontal: "left", vertical: "middle", indent: 2 };
      c1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      r1.height = 40;
      for (let col = 1; col <= totalCols; col++) {
        const cell = r1.getCell(col);
        if (col > 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        cell.border = { bottom: { style: "medium" as const, color: { argb: WHITE } } };
      }

      // ROW 2: Spacer
      const r2 = ws.addRow([""]);
      ws.mergeCells(2, 1, 2, totalCols);
      r2.height = 5;
      for (let col = 1; col <= totalCols; col++) {
        r2.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
      }

      // ROW 3: Column headers
      const hRow = ws.addRow(colHeaders);
      hRow.height = 32;
      hRow.eachCell((cell) => {
        cell.font = { name: "Aptos", size: 9, bold: true, color: { argb: WHITE } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        cell.border = {
          bottom: { style: "thin" as const, color: { argb: WHITE } },
          left: { style: "thin" as const, color: { argb: "2D5A8A" } },
          right: { style: "thin" as const, color: { argb: "2D5A8A" } },
          top: { style: "thin" as const, color: { argb: "2D5A8A" } },
        };
      });

      // DATA ROWS
      filtered.forEach((p, idx) => {
        const values = isImpo
          ? [p.china_sales_contract || "", fmtNum(p.usd_invoice), p.deposit_percentage != null ? `${(p.deposit_percentage * 100).toFixed(0)}%` : "", fmtNum(p.balance_to_pay), p.payment_colombia || "", p.suppliers?.name || "", p.account_info || "", p.numeral_cambiario || "", STATUS_CFG[p.status]?.label || p.status]
          : [p.client || "", p.description || "", p.china_sales_contract || "", fmtNum(p.usd_invoice), fmtNum(p.deposit), p.balance_to_pay != null ? fmtNum(p.balance_to_pay) : p.deposit_percentage != null ? `${(p.deposit_percentage * 100).toFixed(0)}%` : "", p.payment_colombia || "", p.suppliers?.name || "", p.account_info || "", fmtNum(p.client_payment), p.remarks || ""];

        const row = ws.addRow(values);
        const isEven = idx % 2 === 0;
        const rowBg = isEven ? WHITE : "F8F7F5";
        row.eachCell((cell, colNumber) => {
          cell.font = { name: "Aptos", size: 9.5, color: { argb: TEXT_DARK } };
          cell.alignment = { vertical: "middle", wrapText: colNumber === totalCols };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
          cell.border = {
            bottom: { style: "thin" as const, color: { argb: "EDECEA" } },
            left: { style: "hair" as const, color: { argb: "E8E6E1" } },
            right: { style: "hair" as const, color: { argb: "E8E6E1" } },
          };
          if (colNumber === 1 && cell.value) cell.font = { name: "Aptos", size: 9.5, bold: true, color: { argb: TEXT_DARK } };
        });
        row.height = 26;
      });

      // Footer
      const footerGap = ws.addRow([""]);
      footerGap.height = 6;
      const footerRowIdx = ws.rowCount + 1;
      const footerRow = ws.addRow([""]);
      ws.mergeCells(footerRowIdx, 1, footerRowIdx, totalCols);
      const footerCell = ws.getCell(`A${footerRowIdx}`);
      footerCell.value = { richText: [
        { text: "IBC Core", font: { name: "Aptos", size: 8.5, bold: true, color: { argb: "1E3A5F" } } },
        { text: `  ·  Generated: ${now.toLocaleString("en-US")}  ·  © ${now.getFullYear()} IBC STEEL GROUP`, font: { name: "Aptos", size: 8, italic: true, color: { argb: "9CA3B4" } } },
      ] };
      footerCell.alignment = { horizontal: "center", vertical: "middle" };
      footerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FAF9F7" } };
      footerCell.border = { top: { style: "thin" as const, color: { argb: "E8E6E1" } } };
      footerRow.height = 20;

      ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: totalCols } };
      ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `IBC_${catLabel.replace(/\s+/g, "_")}_${now.toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Reporte descargado exitosamente");
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.error("Error al generar el reporte");
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Reporte de Pagos</h1>
          <p className="text-sm text-slate-500 mt-1">
            {CATEGORIES.find((c) => c.key === activeCategory)?.label} — <span className="font-medium text-slate-700">{filtered.length} registros</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">{payments.length}</span>
            <span className="text-xs text-emerald-600">pagos total</span>
          </div>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl border-slate-200" onClick={fetchData}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button size="sm" className="h-9 gap-1.5 rounded-xl bg-gradient-to-r from-[#1E3A5F] to-blue-600 hover:from-[#162d4a] hover:to-blue-700 text-white shadow-lg shadow-blue-500/25" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" /> Export Excel
          </Button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all ${
              activeCategory === cat.key
                ? "bg-[#0B5394] text-white border-[#0B5394] shadow-md shadow-blue-500/20"
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E3A5F]" />
            <span className="ml-2 text-sm text-slate-500">Cargando pagos...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <CreditCard className="w-10 h-10 mb-3" />
            <p className="text-sm font-medium">No hay pagos en esta categoría</p>
          </div>
        ) : isImpo ? (
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: "14%" }} />{/* Contrato China */}
              <col style={{ width: "11%" }} />{/* USD Factura */}
              <col style={{ width: "8%" }} />{/* % Depósito */}
              <col style={{ width: "11%" }} />{/* Saldo */}
              <col style={{ width: "12%" }} />{/* Pago Col */}
              <col style={{ width: "18%" }} />{/* Proveedor */}
              <col style={{ width: "10%" }} />{/* Numeral */}
              <col style={{ width: "8%" }} />{/* Estado */}
            </colgroup>
            <thead>
              <tr className="bg-[#1E3A5F]">
                {["CONTRATO","USD FACTURA","% DEP.","SALDO","PAGO COL","PROVEEDOR","NUMERAL","ESTADO"].map((h) => (
                  <th key={h} className="px-2 py-2.5 text-[10px] font-bold text-white text-left tracking-wide uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => (
                <tr key={p.id} className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-blue-50/40 transition-colors`}>
                  <td className="px-2 py-1.5 text-[11px] font-semibold text-[#1E3A5F] truncate">{p.china_sales_contract || ""}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 text-right tabular-nums">{fmtNum(p.usd_invoice)}</td>
                  <td className="px-2 py-1.5 text-[11px] text-center text-slate-500">{p.deposit_percentage != null ? `${(p.deposit_percentage * 100).toFixed(0)}%` : ""}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-700 text-right font-medium tabular-nums">{fmtNum(p.balance_to_pay)}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate">{p.payment_colombia || ""}</td>
                  <td className="px-2 py-1.5 text-[11px] font-semibold text-slate-800 truncate" title={p.suppliers?.name || ""}>{p.suppliers?.name || ""}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-500 truncate">{p.numeral_cambiario || ""}</td>
                  <td className="px-2 py-1.5">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_CFG[p.status]?.cls || "bg-slate-50 text-slate-600"}`}>
                      {STATUS_CFG[p.status]?.label || p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: "13%" }} />{/* Cliente */}
              <col style={{ width: "13%" }} />{/* Descripción */}
              <col style={{ width: "11%" }} />{/* Contrato */}
              <col style={{ width: "9%" }} />{/* USD Factura */}
              <col style={{ width: "9%" }} />{/* Depósito */}
              <col style={{ width: "9%" }} />{/* Saldo */}
              <col style={{ width: "14%" }} />{/* Proveedor */}
              <col style={{ width: "9%" }} />{/* Pago Cliente */}
              <col style={{ width: "13%" }} />{/* Observaciones */}
            </colgroup>
            <thead>
              <tr className="bg-[#1E3A5F]">
                {["CLIENTE","DESCRIPCIÓN","CONTRATO","USD FACT.","DEPÓSITO","SALDO/%","PROVEEDOR","PAGO CLI.","OBSERVACIONES"].map((h) => (
                  <th key={h} className="px-2 py-2.5 text-[10px] font-bold text-white text-left tracking-wide uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => (
                <tr key={p.id} className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-blue-50/40 transition-colors`}>
                  <td className="px-2 py-1.5 text-[11px] font-semibold text-slate-800 truncate" title={p.client || ""}>{p.client || ""}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate" title={p.description || ""}>{p.description || ""}</td>
                  <td className="px-2 py-1.5 text-[11px] font-semibold text-[#1E3A5F] truncate">{p.china_sales_contract || ""}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 text-right tabular-nums">{fmtNum(p.usd_invoice)}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 text-right tabular-nums">{fmtNum(p.deposit)}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-700 text-right font-medium tabular-nums">{p.balance_to_pay != null ? fmtNum(p.balance_to_pay) : p.deposit_percentage != null ? `${(p.deposit_percentage * 100).toFixed(0)}%` : ""}</td>
                  <td className="px-2 py-1.5 text-[11px] font-semibold text-slate-800 truncate" title={p.suppliers?.name || ""}>{p.suppliers?.name || ""}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 text-right tabular-nums">{fmtNum(p.client_payment)}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate" title={p.remarks || ""}>{p.remarks || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-[11px] text-slate-400 text-center">Vista previa · El archivo Excel contiene todas las columnas completas</p>
    </div>
  );
}
