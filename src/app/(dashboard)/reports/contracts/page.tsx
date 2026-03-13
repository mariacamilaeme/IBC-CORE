"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Download, Loader2, ClipboardList, RefreshCw, FileDown } from "lucide-react";
import { addLogoToWorkbook, addLogoToHeader } from "@/lib/excel-logo";
import { generatePDFReport } from "@/lib/pdf-report";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { Contract } from "@/types";

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
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ContractsReportPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contracts?pageSize=5000&sort_field=created_at&sort_direction=desc");
      if (res.ok) {
        const json = await res.json();
        setContracts(json.data || []);
      }
    } catch {
      toast.error("Error al cargar contratos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ---------------------------------------------------------------------------
  // Excel Export
  // ---------------------------------------------------------------------------

  const handleExport = async () => {
    try {
      toast.info("Generando reporte Excel...");
      const excelMod = await import("exceljs");
      const ExcelJS = excelMod.default || excelMod;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "IBC Steel Group - IBC Core";
      workbook.created = new Date();

      const ws = workbook.addWorksheet("CONTRATOS", {
        properties: { defaultColWidth: 18 },
        views: [{ state: "frozen" as const, ySplit: 3 }],
      });

      const NAVY = "1E3A5F";
      const WHITE = "FFFFFF";
      const TEXT_DARK = "1A202C";
      const logoId = await addLogoToWorkbook(workbook);

      ws.columns = [
        { key: "contract_date", width: 14 },
        { key: "china_contract", width: 22 },
        { key: "client_contract", width: 20 },
        { key: "commercial_name", width: 20 },
        { key: "client_name", width: 26 },
        { key: "country", width: 14 },
        { key: "detail", width: 36 },
        { key: "tons_agreed", width: 16 },
        { key: "tons_shipped", width: 16 },
        { key: "incoterm", width: 12 },
        { key: "exw_date", width: 14 },
        { key: "status", width: 24 },
        { key: "eta_final", width: 14 },
        { key: "vessel_name", width: 20 },
        { key: "bl_number", width: 19 },
        { key: "arrival_port", width: 17 },
        { key: "advance_paid", width: 14 },
        { key: "balance_paid", width: 14 },
        { key: "pending_client_amount", width: 20 },
        { key: "notes", width: 32 },
      ];

      const totalCols = ws.columns.length;
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

      // ROW 1: Header
      const r1 = ws.addRow([""]);
      ws.mergeCells(1, 1, 1, totalCols);
      const c1 = ws.getCell("A1");
      c1.value = { richText: [
        { text: "                              ", font: { name: "Aptos", size: 16, color: { argb: NAVY } } },
        { text: "CONTRATOS", font: { name: "Aptos", size: 12, bold: true, color: { argb: WHITE } } },
        { text: `     ${dateStr}  ·  ${contracts.length} contratos`, font: { name: "Aptos", size: 9, color: { argb: "D0DCE8" } } },
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

      // ROW 2: Spacer
      const r2 = ws.addRow([""]);
      ws.mergeCells(2, 1, 2, totalCols);
      r2.height = 5;
      for (let col = 1; col <= totalCols; col++) {
        r2.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
      }

      // ROW 3: Column headers
      const colHeaders = [
        "FECHA", "CONTRATO CHINA", "CONTRATO CLIENTE", "COMERCIAL", "CLIENTE",
        "PAÍS", "DETALLE DE PRODUCTO", "TONS ACORDADAS", "TONS EMBARCADAS", "INCOTERM",
        "FECHA EXW", "ESTADO", "ETA FINAL", "MOTONAVE", "NÚMERO BL", "PUERTO LLEGADA",
        "ANTICIPO", "SALDO", "VALOR PDTE. (USD)", "NOTAS",
      ];
      const headerRow = ws.addRow(colHeaders);
      headerRow.height = 32;
      headerRow.eachCell((cell) => {
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
      contracts.forEach((c, idx) => {
        const row = ws.addRow([
          fmtDate(c.contract_date), c.china_contract || "", c.client_contract || "",
          c.commercial_name || "", c.client_name || "", c.country || "",
          c.detail || "", c.tons_agreed ?? "", c.tons_shipped ?? "",
          c.incoterm || "", fmtDate(c.exw_date), c.status || "",
          fmtDate(c.eta_final), c.vessel_name || "", c.bl_number || "",
          c.arrival_port || "", c.advance_paid || "", c.balance_paid || "",
          c.pending_client_amount ?? "", c.notes || "",
        ]);
        const isEven = idx % 2 === 0;
        const rowBg = isEven ? WHITE : "F8F7F5";
        row.eachCell((cell, colNumber) => {
          cell.font = { name: "Aptos", size: 9.5, color: { argb: TEXT_DARK } };
          cell.alignment = { vertical: "middle", wrapText: colNumber === 7 || colNumber === 20 };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
          cell.border = {
            bottom: { style: "thin" as const, color: { argb: "EDECEA" } },
            left: { style: "hair" as const, color: { argb: "E8E6E1" } },
            right: { style: "hair" as const, color: { argb: "E8E6E1" } },
          };
          if (colNumber === 1) cell.border = { ...cell.border, left: { style: "thin" as const, color: { argb: "D4D2CD" } } };
          if (colNumber === totalCols) cell.border = { ...cell.border, right: { style: "thin" as const, color: { argb: "D4D2CD" } } };
          if ([10].includes(colNumber)) cell.alignment = { horizontal: "center", vertical: "middle" };
          if (colNumber === 5 && cell.value) cell.font = { name: "Aptos", size: 9.5, bold: true, color: { argb: TEXT_DARK } };
          if ((colNumber === 2 || colNumber === 3) && cell.value) cell.font = { name: "Aptos", size: 9.5, bold: true, color: { argb: NAVY } };
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
      link.download = `Contratos_IBC_${now.toISOString().slice(0, 10)}.xlsx`;
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
  // PDF Export
  // ---------------------------------------------------------------------------

  const handlePDF = async () => {
    try {
      toast.info("Generando reporte PDF...");
      await generatePDFReport({
        title: "CONTRATOS",
        subtitle: "Reporte completo de contratos",
        filename: "Contratos_IBC",
        recordLabel: "contratos",
        orientation: "landscape",
        columns: [
          { header: "FECHA", dataKey: "fecha", width: 0.8, halign: "center" },
          { header: "CONTRATO CHINA", dataKey: "china", width: 1.2, bold: true, color: "#1E3A5F" },
          { header: "CONTRATO CLIENTE", dataKey: "cliente_c", width: 1.1, bold: true, color: "#1E3A5F" },
          { header: "COMERCIAL", dataKey: "comercial", width: 1 },
          { header: "CLIENTE", dataKey: "cliente", width: 1.3, bold: true },
          { header: "PAÍS", dataKey: "pais", width: 0.7, halign: "center" },
          { header: "DETALLE", dataKey: "detalle", width: 2 },
          { header: "TONS", dataKey: "tons", width: 0.7, halign: "right" },
          { header: "INCOTERM", dataKey: "incoterm", width: 0.6, halign: "center" },
          { header: "ESTADO", dataKey: "estado", width: 1.1, halign: "center" },
          { header: "ETA", dataKey: "eta", width: 0.8, halign: "center" },
          { header: "MOTONAVE", dataKey: "motonave", width: 1 },
          { header: "PUERTO", dataKey: "puerto", width: 0.9 },
          { header: "ANTICIPO", dataKey: "anticipo", width: 0.7 },
          { header: "PDTE USD", dataKey: "pdte", width: 0.9, halign: "right", bold: true },
        ],
        data: contracts.map((c) => ({
          fecha: fmtDate(c.contract_date),
          china: c.china_contract || "",
          cliente_c: c.client_contract || "",
          comercial: c.commercial_name || "",
          cliente: c.client_name || "",
          pais: c.country || "",
          detalle: c.detail || "",
          tons: fmtNum(c.tons_agreed),
          incoterm: c.incoterm || "",
          estado: c.status || "",
          eta: fmtDate(c.eta_final),
          motonave: c.vessel_name || "",
          puerto: c.arrival_port || "",
          anticipo: c.advance_paid || "",
          pdte: fmtNum(c.pending_client_amount),
        })),
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Reporte de Contratos</h1>
          <p className="text-sm text-slate-500 mt-1">
            Todos los contratos — <span className="font-medium text-slate-700">{contracts.length} registros</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
            <ClipboardList className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">{contracts.length}</span>
            <span className="text-xs text-blue-600">contratos</span>
          </div>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl border-slate-200" onClick={fetchData}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button size="sm" className="h-9 gap-1.5 rounded-xl border-red-200 text-red-700 hover:bg-red-50" variant="outline" onClick={handlePDF}>
            <FileDown className="w-3.5 h-3.5" /> Export PDF
          </Button>
          <Button size="sm" className="h-9 gap-1.5 rounded-xl bg-gradient-to-r from-[#1E3A5F] to-blue-600 hover:from-[#162d4a] hover:to-blue-700 text-white shadow-lg shadow-blue-500/25" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" /> Export Excel
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E3A5F]" />
            <span className="ml-2 text-sm text-slate-500">Cargando contratos...</span>
          </div>
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <ClipboardList className="w-10 h-10 mb-3" />
            <p className="text-sm font-medium">No hay contratos registrados</p>
          </div>
        ) : (
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: "11%" }} />{/* Contrato China */}
              <col style={{ width: "13%" }} />{/* Cliente */}
              <col style={{ width: "14%" }} />{/* Detalle */}
              <col style={{ width: "6%" }} />{/* Tons */}
              <col style={{ width: "6%" }} />{/* Incoterm */}
              <col style={{ width: "11%" }} />{/* Estado */}
              <col style={{ width: "7%" }} />{/* ETA */}
              <col style={{ width: "9%" }} />{/* Motonave */}
              <col style={{ width: "8%" }} />{/* Puerto */}
              <col style={{ width: "7%" }} />{/* Anticipo */}
              <col style={{ width: "8%" }} />{/* Pdte USD */}
            </colgroup>
            <thead>
              <tr className="bg-[#1E3A5F]">
                {["CONTRATO","CLIENTE","DETALLE","TONS","INCOT.","ESTADO","ETA","MOTONAVE","PUERTO","ANTICIPO","PDTE USD"].map((h) => (
                  <th key={h} className="px-2 py-2.5 text-[10px] font-bold text-white text-left tracking-wide uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contracts.map((c, idx) => (
                <tr key={c.id} className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-blue-50/40 transition-colors`}>
                  <td className="px-2 py-1.5 text-[11px] font-semibold text-[#1E3A5F] truncate" title={c.china_contract || ""}>{c.china_contract || ""}</td>
                  <td className="px-2 py-1.5 text-[11px] font-semibold text-slate-800 truncate" title={c.client_name}>{c.client_name}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate" title={c.detail || ""}>{c.detail || ""}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 text-right tabular-nums">{fmtNum(c.tons_agreed)}</td>
                  <td className="px-2 py-1.5 text-[11px] text-center text-slate-500">{c.incoterm || ""}</td>
                  <td className="px-2 py-1.5">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold truncate max-w-full ${
                      c.status === "EN PRODUCCIÓN" ? "bg-amber-50 text-amber-700" :
                      c.status === "EN TRÁNSITO" ? "bg-blue-50 text-blue-700" :
                      c.status === "ENTREGADO AL CLIENTE" ? "bg-green-50 text-green-700" :
                      c.status === "ANULADO" ? "bg-red-50 text-red-700" :
                      "bg-slate-50 text-slate-600"
                    }`}>{c.status || ""}</span>
                  </td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 tabular-nums">{fmtDate(c.eta_final)}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate" title={c.vessel_name || ""}>{c.vessel_name || ""}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate" title={c.arrival_port || ""}>{c.arrival_port || ""}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-500 truncate">{c.advance_paid || ""}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-700 text-right font-medium tabular-nums">{fmtNum(c.pending_client_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-[11px] text-slate-400 text-center">Vista previa con columnas clave · El archivo Excel contiene las 20 columnas completas</p>
    </div>
  );
}
