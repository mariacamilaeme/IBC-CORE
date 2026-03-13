"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Download, Loader2, Receipt, RefreshCw, FileDown } from "lucide-react";
import { addLogoToWorkbook, addLogoToHeader } from "@/lib/excel-logo";
import { generatePDFReport } from "@/lib/pdf-report";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { ContractInvoice, InvoiceWithRelations } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "";
  try {
    const parts = d.split("T")[0].split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  } catch { return d; }
};

const fmtNum = (n: number | null | undefined) => {
  if (n == null) return "";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente", parcial: "Parcial", pagada: "Pagada", vencida: "Vencida", anulada: "Anulada",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InvoicesReportPage() {
  const [chinaInvoices, setChinaInvoices] = useState<ContractInvoice[]>([]);
  const [commInvoices, setCommInvoices] = useState<InvoiceWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"china" | "commercial">("china");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [chinaRes, commRes] = await Promise.all([
        fetch("/api/contract-invoices?pageSize=5000"),
        fetch("/api/invoices?pageSize=5000"),
      ]);
      if (chinaRes.ok) {
        const json = await chinaRes.json();
        setChinaInvoices(json.data || []);
      }
      if (commRes.ok) {
        const json = await commRes.json();
        setCommInvoices(json.data || []);
      }
    } catch {
      toast.error("Error al cargar facturas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ---------------------------------------------------------------------------
  // Excel Export - China Invoices
  // ---------------------------------------------------------------------------

  const handleChinaExport = async () => {
    try {
      toast.info("Generando reporte Excel...");
      const excelMod = await import("exceljs");
      const ExcelJS = excelMod.default || excelMod;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "IBC Steel Group - IBC Core";

      const ws = workbook.addWorksheet("FACTURAS CHINA", {
        properties: { defaultColWidth: 18 },
        views: [{ state: "frozen" as const, ySplit: 3 }],
      });

      const NAVY = "1E3A5F"; const WHITE = "FFFFFF"; const TEXT_DARK = "1A202C";
      const logoId = await addLogoToWorkbook(workbook);

      ws.columns = [
        { key: "invoice_date", width: 13 }, { key: "customer_name", width: 28 },
        { key: "china_invoice_number", width: 22 }, { key: "china_invoice_value", width: 18 },
        { key: "customer_contract", width: 22 }, { key: "customer_invoice_value", width: 18 },
        { key: "status", width: 14 }, { key: "notes", width: 34 },
      ];
      const totalCols = ws.columns.length;
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

      // ROW 1
      const r1 = ws.addRow([""]);
      ws.mergeCells(1, 1, 1, totalCols);
      const c1 = ws.getCell("A1");
      c1.value = { richText: [
        { text: "                              ", font: { name: "Aptos", size: 16, color: { argb: NAVY } } },
        { text: "FACTURAS CHINA", font: { name: "Aptos", size: 12, bold: true, color: { argb: WHITE } } },
        { text: `     ${dateStr}  ·  ${chinaInvoices.length} facturas`, font: { name: "Aptos", size: 9, color: { argb: "D0DCE8" } } },
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

      // ROW 2
      const r2 = ws.addRow([""]); ws.mergeCells(2, 1, 2, totalCols); r2.height = 5;
      for (let col = 1; col <= totalCols; col++) r2.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };

      // ROW 3
      const colHeaders = ["FECHA", "CLIENTE", "# FACTURA CHINA", "VALOR CHINA", "FACTURA CLIENTE", "VALOR CLIENTE", "ESTADO", "NOTAS"];
      const hRow = ws.addRow(colHeaders); hRow.height = 32;
      hRow.eachCell((cell) => {
        cell.font = { name: "Aptos", size: 9, bold: true, color: { argb: WHITE } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        cell.border = { bottom: { style: "thin" as const, color: { argb: WHITE } }, left: { style: "thin" as const, color: { argb: "2D5A8A" } }, right: { style: "thin" as const, color: { argb: "2D5A8A" } }, top: { style: "thin" as const, color: { argb: "2D5A8A" } } };
      });

      chinaInvoices.forEach((c, idx) => {
        const row = ws.addRow([
          fmtDate(c.invoice_date), c.customer_name || "", c.china_invoice_number || "",
          c.china_invoice_value ?? "", c.customer_contract || "", c.customer_invoice_value ?? "",
          c.approved ? "Aprobada" : "Pendiente", c.notes || "",
        ]);
        const rowBg = idx % 2 === 0 ? WHITE : "F8F7F5";
        row.eachCell((cell, colNumber) => {
          cell.font = { name: "Aptos", size: 9.5, color: { argb: TEXT_DARK } };
          cell.alignment = { vertical: "middle", wrapText: colNumber === 8 };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
          cell.border = { bottom: { style: "thin" as const, color: { argb: "EDECEA" } }, left: { style: "hair" as const, color: { argb: "E8E6E1" } }, right: { style: "hair" as const, color: { argb: "E8E6E1" } } };
          if (colNumber === 2 && cell.value) cell.font = { name: "Aptos", size: 9.5, bold: true, color: { argb: TEXT_DARK } };
          if (colNumber === 3 && cell.value) cell.font = { name: "Aptos", size: 9.5, bold: true, color: { argb: NAVY } };
        });
        row.height = 26;
      });

      // Footer
      const footerGap = ws.addRow([""]); footerGap.height = 6;
      const footerRowIdx = ws.rowCount + 1;
      const footerRow = ws.addRow([""]); ws.mergeCells(footerRowIdx, 1, footerRowIdx, totalCols);
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
      const link = document.createElement("a"); link.href = url;
      link.download = `Facturas_China_IBC_${now.toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Reporte descargado exitosamente");
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.error("Error al generar el reporte");
    }
  };

  // ---------------------------------------------------------------------------
  // Excel Export - Commercial Invoices
  // ---------------------------------------------------------------------------

  const handleCommExport = async () => {
    try {
      toast.info("Generando reporte Excel...");
      const excelMod = await import("exceljs");
      const ExcelJS = excelMod.default || excelMod;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "IBC Steel Group - IBC Core";

      const ws = workbook.addWorksheet("FACTURACIÓN", {
        properties: { defaultColWidth: 18 },
        views: [{ state: "frozen" as const, ySplit: 3 }],
      });

      const NAVY = "1E3A5F"; const WHITE = "FFFFFF"; const TEXT_DARK = "1A202C";
      const logoId = await addLogoToWorkbook(workbook);

      ws.columns = [
        { key: "invoice_number", width: 18 }, { key: "client_name", width: 26 },
        { key: "commercial_name", width: 20 }, { key: "issue_date", width: 14 },
        { key: "due_date", width: 14 }, { key: "currency", width: 10 },
        { key: "subtotal", width: 16 }, { key: "tax_amount", width: 14 },
        { key: "total_amount", width: 16 }, { key: "payment_status", width: 16 },
        { key: "notes", width: 30 },
      ];
      const totalCols = ws.columns.length;
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

      // ROW 1
      const r1 = ws.addRow([""]);
      ws.mergeCells(1, 1, 1, totalCols);
      const c1 = ws.getCell("A1");
      c1.value = { richText: [
        { text: "                              ", font: { name: "Aptos", size: 16, color: { argb: NAVY } } },
        { text: "FACTURACIÓN COMERCIAL", font: { name: "Aptos", size: 12, bold: true, color: { argb: WHITE } } },
        { text: `     ${dateStr}  ·  ${commInvoices.length} facturas`, font: { name: "Aptos", size: 9, color: { argb: "D0DCE8" } } },
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

      // ROW 2
      const r2 = ws.addRow([""]); ws.mergeCells(2, 1, 2, totalCols); r2.height = 5;
      for (let col = 1; col <= totalCols; col++) r2.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };

      // ROW 3
      const colHeaders = ["Nº FACTURA", "CLIENTE", "COMERCIAL", "FECHA EMISIÓN", "FECHA VENCIMIENTO", "MONEDA", "SUBTOTAL", "IVA", "TOTAL", "ESTADO PAGO", "NOTAS"];
      const hRow = ws.addRow(colHeaders); hRow.height = 32;
      hRow.eachCell((cell) => {
        cell.font = { name: "Aptos", size: 9, bold: true, color: { argb: WHITE } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        cell.border = { bottom: { style: "thin" as const, color: { argb: WHITE } }, left: { style: "thin" as const, color: { argb: "2D5A8A" } }, right: { style: "thin" as const, color: { argb: "2D5A8A" } }, top: { style: "thin" as const, color: { argb: "2D5A8A" } } };
      });

      commInvoices.forEach((inv, idx) => {
        const row = ws.addRow([
          inv.invoice_number || "", inv.client?.company_name || "", inv.commercial?.full_name || "",
          fmtDate(inv.issue_date), fmtDate(inv.due_date), inv.currency || "USD",
          inv.subtotal ?? "", inv.tax_amount ?? "", inv.total_amount ?? "",
          PAYMENT_STATUS_LABELS[inv.payment_status || "pendiente"] || inv.payment_status || "", inv.notes || "",
        ]);
        const rowBg = idx % 2 === 0 ? WHITE : "F8F7F5";
        row.eachCell((cell, colNumber) => {
          cell.font = { name: "Aptos", size: 9.5, color: { argb: TEXT_DARK } };
          cell.alignment = { vertical: "middle", wrapText: colNumber === 11 };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
          cell.border = { bottom: { style: "thin" as const, color: { argb: "EDECEA" } }, left: { style: "hair" as const, color: { argb: "E8E6E1" } }, right: { style: "hair" as const, color: { argb: "E8E6E1" } } };
          if (colNumber === 1 && cell.value) cell.font = { name: "Aptos", size: 9.5, bold: true, color: { argb: NAVY } };
          if (colNumber === 2 && cell.value) cell.font = { name: "Aptos", size: 9.5, bold: true, color: { argb: TEXT_DARK } };
        });
        row.height = 26;
      });

      // Footer
      const footerGap = ws.addRow([""]); footerGap.height = 6;
      const footerRowIdx = ws.rowCount + 1;
      const footerRow = ws.addRow([""]); ws.mergeCells(footerRowIdx, 1, footerRowIdx, totalCols);
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
      const link = document.createElement("a"); link.href = url;
      link.download = `Facturacion_IBC_${now.toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Reporte descargado exitosamente");
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.error("Error al generar el reporte");
    }
  };

  // ---------------------------------------------------------------------------
  // PDF Export
  // ---------------------------------------------------------------------------

  const handlePDF = async () => {
    try {
      toast.info("Generando PDF...");
      if (activeTab === "china") {
        await generatePDFReport({
          title: "FACTURAS CHINA",
          subtitle: "Facturas de proveedores China",
          filename: "Facturas_China_IBC",
          recordLabel: "facturas",
          orientation: "landscape",
          columns: [
            { header: "FECHA", dataKey: "fecha", width: 0.8, halign: "center" },
            { header: "CLIENTE", dataKey: "cliente", width: 1.5, bold: true },
            { header: "# FACTURA CHINA", dataKey: "num_china", width: 1.2, bold: true, color: "#1E3A5F" },
            { header: "VALOR CHINA", dataKey: "valor_china", width: 1, halign: "right" },
            { header: "FACTURA CLIENTE", dataKey: "fact_cliente", width: 1.2 },
            { header: "VALOR CLIENTE", dataKey: "valor_cliente", width: 1, halign: "right" },
            { header: "ESTADO", dataKey: "estado", width: 0.8, halign: "center" },
            { header: "NOTAS", dataKey: "notas", width: 1.5 },
          ],
          data: chinaInvoices.map((c) => ({
            fecha: fmtDate(c.invoice_date),
            cliente: c.customer_name || "",
            num_china: c.china_invoice_number || "",
            valor_china: fmtNum(c.china_invoice_value),
            fact_cliente: c.customer_contract || "",
            valor_cliente: fmtNum(c.customer_invoice_value),
            estado: c.approved ? "Aprobada" : "Pendiente",
            notas: c.notes || "",
          })),
        });
      } else {
        await generatePDFReport({
          title: "FACTURACIÓN COMERCIAL",
          subtitle: "Facturas comerciales",
          filename: "Facturacion_IBC",
          recordLabel: "facturas",
          orientation: "landscape",
          columns: [
            { header: "Nº FACTURA", dataKey: "num", width: 1, bold: true, color: "#1E3A5F" },
            { header: "CLIENTE", dataKey: "cliente", width: 1.5, bold: true },
            { header: "COMERCIAL", dataKey: "comercial", width: 1 },
            { header: "EMISIÓN", dataKey: "emision", width: 0.8, halign: "center" },
            { header: "VENCIMIENTO", dataKey: "vencimiento", width: 0.8, halign: "center" },
            { header: "MONEDA", dataKey: "moneda", width: 0.5, halign: "center" },
            { header: "SUBTOTAL", dataKey: "subtotal", width: 0.9, halign: "right" },
            { header: "IVA", dataKey: "iva", width: 0.7, halign: "right" },
            { header: "TOTAL", dataKey: "total", width: 1, halign: "right", bold: true },
            { header: "ESTADO", dataKey: "estado", width: 0.8, halign: "center" },
          ],
          data: commInvoices.map((inv) => ({
            num: inv.invoice_number || "",
            cliente: inv.client?.company_name || "",
            comercial: inv.commercial?.full_name || "",
            emision: fmtDate(inv.issue_date),
            vencimiento: fmtDate(inv.due_date),
            moneda: inv.currency || "USD",
            subtotal: fmtNum(inv.subtotal),
            iva: fmtNum(inv.tax_amount),
            total: fmtNum(inv.total_amount),
            estado: PAYMENT_STATUS_LABELS[inv.payment_status || "pendiente"] || inv.payment_status || "",
          })),
        });
      }
      toast.success("PDF descargado exitosamente");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF");
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const currentData = activeTab === "china" ? chinaInvoices : commInvoices;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Reporte de Facturas</h1>
          <p className="text-sm text-slate-500 mt-1">
            {activeTab === "china" ? "Facturas China" : "Facturación Comercial"} — <span className="font-medium text-slate-700">{currentData.length} registros</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-200 rounded-xl">
            <Receipt className="w-4 h-4 text-violet-600" />
            <span className="text-sm font-semibold text-violet-700">{chinaInvoices.length + commInvoices.length}</span>
            <span className="text-xs text-violet-600">facturas total</span>
          </div>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl border-slate-200" onClick={fetchData}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button size="sm" className="h-9 gap-1.5 rounded-xl border-red-200 text-red-700 hover:bg-red-50" variant="outline" onClick={handlePDF}>
            <FileDown className="w-3.5 h-3.5" /> Export PDF
          </Button>
          <Button size="sm" className="h-9 gap-1.5 rounded-xl bg-gradient-to-r from-[#1E3A5F] to-blue-600 hover:from-[#162d4a] hover:to-blue-700 text-white shadow-lg shadow-blue-500/25" onClick={activeTab === "china" ? handleChinaExport : handleCommExport}>
            <Download className="w-3.5 h-3.5" /> Export Excel
          </Button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2">
        {([["china", "Facturas China"], ["commercial", "Facturación Comercial"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all ${
              activeTab === key
                ? "bg-[#0B5394] text-white border-[#0B5394] shadow-md shadow-blue-500/20"
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700"
            }`}
          >{label}</button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E3A5F]" />
            <span className="ml-2 text-sm text-slate-500">Cargando facturas...</span>
          </div>
        ) : currentData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Receipt className="w-10 h-10 mb-3" />
            <p className="text-sm font-medium">No hay facturas registradas</p>
          </div>
        ) : activeTab === "china" ? (
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: "10%" }} />{/* Fecha */}
              <col style={{ width: "18%" }} />{/* Cliente */}
              <col style={{ width: "14%" }} />{/* # Factura China */}
              <col style={{ width: "12%" }} />{/* Valor China */}
              <col style={{ width: "14%" }} />{/* Factura Cliente */}
              <col style={{ width: "12%" }} />{/* Valor Cliente */}
              <col style={{ width: "9%" }} />{/* Estado */}
              <col style={{ width: "11%" }} />{/* Notas */}
            </colgroup>
            <thead>
              <tr className="bg-[#1E3A5F]">
                {["FECHA","CLIENTE","# FACT. CHINA","VALOR CHINA","FACT. CLIENTE","VALOR CLI.","ESTADO","NOTAS"].map((h) => (
                  <th key={h} className="px-2 py-2.5 text-[10px] font-bold text-white text-left tracking-wide uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chinaInvoices.map((c, idx) => (
                <tr key={c.id} className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-blue-50/40 transition-colors`}>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 tabular-nums">{fmtDate(c.invoice_date)}</td>
                  <td className="px-2 py-1.5 text-[11px] font-semibold text-slate-800 truncate" title={c.customer_name || ""}>{c.customer_name || ""}</td>
                  <td className="px-2 py-1.5 text-[11px] font-semibold text-[#1E3A5F] truncate">{c.china_invoice_number || ""}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 text-right tabular-nums">{fmtNum(c.china_invoice_value)}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate">{c.customer_contract || ""}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 text-right tabular-nums">{fmtNum(c.customer_invoice_value)}</td>
                  <td className="px-2 py-1.5">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${c.approved ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                      {c.approved ? "Aprobada" : "Pendiente"}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-500 truncate" title={c.notes || ""}>{c.notes || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: "10%" }} />{/* Nº Factura */}
              <col style={{ width: "16%" }} />{/* Cliente */}
              <col style={{ width: "12%" }} />{/* Comercial */}
              <col style={{ width: "9%" }} />{/* Emisión */}
              <col style={{ width: "9%" }} />{/* Vencimiento */}
              <col style={{ width: "6%" }} />{/* Moneda */}
              <col style={{ width: "10%" }} />{/* Subtotal */}
              <col style={{ width: "8%" }} />{/* IVA */}
              <col style={{ width: "10%" }} />{/* Total */}
              <col style={{ width: "10%" }} />{/* Estado */}
            </colgroup>
            <thead>
              <tr className="bg-[#1E3A5F]">
                {["Nº FACT.","CLIENTE","COMERCIAL","EMISIÓN","VENCIM.","MON.","SUBTOTAL","IVA","TOTAL","ESTADO"].map((h) => (
                  <th key={h} className="px-2 py-2.5 text-[10px] font-bold text-white text-left tracking-wide uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {commInvoices.map((inv, idx) => (
                <tr key={inv.id} className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-blue-50/40 transition-colors`}>
                  <td className="px-2 py-1.5 text-[11px] font-semibold text-[#1E3A5F] truncate">{inv.invoice_number || ""}</td>
                  <td className="px-2 py-1.5 text-[11px] font-semibold text-slate-800 truncate" title={inv.client?.company_name || ""}>{inv.client?.company_name || ""}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate">{inv.commercial?.full_name || ""}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 tabular-nums">{fmtDate(inv.issue_date)}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 tabular-nums">{fmtDate(inv.due_date)}</td>
                  <td className="px-2 py-1.5 text-[11px] text-center text-slate-500">{inv.currency || "USD"}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 text-right tabular-nums">{fmtNum(inv.subtotal)}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 text-right tabular-nums">{fmtNum(inv.tax_amount)}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-800 text-right font-semibold tabular-nums">{fmtNum(inv.total_amount)}</td>
                  <td className="px-2 py-1.5">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold truncate max-w-full ${
                      inv.payment_status === "pagada" ? "bg-green-50 text-green-700" :
                      inv.payment_status === "vencida" ? "bg-red-50 text-red-700" :
                      inv.payment_status === "parcial" ? "bg-blue-50 text-blue-700" :
                      "bg-amber-50 text-amber-700"
                    }`}>
                      {PAYMENT_STATUS_LABELS[inv.payment_status || "pendiente"] || inv.payment_status || "Pendiente"}
                    </span>
                  </td>
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
