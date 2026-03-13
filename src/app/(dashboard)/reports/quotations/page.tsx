"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Download, Loader2, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useQuotationsData } from "@/hooks/useQuotationsData";
import type { ReportQuotation } from "@/app/(dashboard)/quotations/constants";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QuotationsReportPage() {
  const { data } = useQuotationsData();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((r) =>
      r.customer.toLowerCase().includes(q) ||
      r.materials.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q) ||
      r.requestedBy.toLowerCase().includes(q) ||
      r.country.toLowerCase().includes(q) ||
      (r.id && r.id.toLowerCase().includes(q))
    );
  }, [data, search]);

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

      const ws = workbook.addWorksheet("COTIZACIONES", {
        properties: { defaultColWidth: 18 },
        views: [{ state: "frozen" as const, ySplit: 3 }],
      });

      const NAVY = "1E3A5F"; const WHITE = "FFFFFF"; const TEXT_DARK = "1A202C";

      const columns = [
        { header: "No. Cotización", key: "id", width: 16 },
        { header: "Cliente", key: "customer", width: 24 },
        { header: "Materiales", key: "materials", width: 32 },
        { header: "Estado", key: "status", width: 18 },
        { header: "Línea", key: "category", width: 14 },
        { header: "Comercial", key: "requestedBy", width: 20 },
        { header: "País", key: "country", width: 14 },
        { header: "Continente", key: "continent", width: 14 },
        { header: "Fecha Solicitud", key: "requestDate", width: 16 },
        { header: "Fecha Emisión", key: "issueDate", width: 16 },
        { header: "T. Respuesta", key: "responseTime", width: 14 },
        { header: "China (días)", key: "chinaTime", width: 13 },
        { header: "Estado China", key: "chinaStatus", width: 16 },
        { header: "Fecha Contrato", key: "contractDate", width: 16 },
        { header: "No. Contrato", key: "contractNo", width: 16 },
      ];

      ws.columns = columns.map((c) => ({ key: c.key, width: c.width }));
      const totalCols = columns.length;
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

      // ROW 1
      const r1 = ws.addRow([""]);
      ws.mergeCells(1, 1, 1, totalCols);
      const c1 = ws.getCell("A1");
      c1.value = { richText: [
        { text: "IBC", font: { name: "Aptos", size: 16, bold: true, color: { argb: WHITE } } },
        { text: "  STEEL GROUP", font: { name: "Aptos", size: 12, color: { argb: WHITE } } },
        { text: `          COTIZACIONES`, font: { name: "Aptos", size: 10, bold: true, color: { argb: WHITE } } },
        { text: `     ${dateStr}  ·  ${filtered.length} cotizaciones`, font: { name: "Aptos", size: 9, color: { argb: "D0DCE8" } } },
      ] };
      c1.alignment = { horizontal: "left", vertical: "middle", indent: 2 };
      c1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      r1.height = 40;
      for (let col = 1; col <= totalCols; col++) {
        const cell = r1.getCell(col);
        if (col > 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        cell.border = { bottom: { style: "medium" as const, color: { argb: WHITE } } };
      }

      // ROW 2
      const r2 = ws.addRow([""]); ws.mergeCells(2, 1, 2, totalCols); r2.height = 5;
      for (let col = 1; col <= totalCols; col++) r2.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };

      // ROW 3
      const hRow = ws.addRow(columns.map((c) => c.header)); hRow.height = 32;
      hRow.eachCell((cell) => {
        cell.font = { name: "Aptos", size: 9, bold: true, color: { argb: WHITE } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        cell.border = { bottom: { style: "thin" as const, color: { argb: WHITE } }, left: { style: "thin" as const, color: { argb: "2D5A8A" } }, right: { style: "thin" as const, color: { argb: "2D5A8A" } }, top: { style: "thin" as const, color: { argb: "2D5A8A" } } };
      });

      filtered.forEach((r, idx) => {
        const row = ws.addRow([
          r.id ?? "", r.customer, r.materials, r.status, r.category,
          r.requestedBy, r.country, r.continent, r.requestDate ?? "",
          r.issueDate ?? "", r.responseTime ?? "", r.chinaTime ?? "",
          r.chinaStatus ?? "", r.contractDate ?? "", r.contractNo ?? "",
        ]);
        const rowBg = idx % 2 === 0 ? WHITE : "F8F7F5";
        row.eachCell((cell, colNumber) => {
          cell.font = { name: "Aptos", size: 9.5, color: { argb: TEXT_DARK } };
          cell.alignment = { vertical: "middle", wrapText: colNumber === 3 };
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
      link.download = `IBC-Cotizaciones-${now.toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
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
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Reporte de Cotizaciones</h1>
          <p className="text-sm text-slate-500 mt-1">
            Todas las cotizaciones — <span className="font-medium text-slate-700">{filtered.length} registros</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-xl">
            <FileText className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-semibold text-orange-700">{data.length}</span>
            <span className="text-xs text-orange-600">cotizaciones</span>
          </div>
          <Button size="sm" className="h-9 gap-1.5 rounded-xl bg-gradient-to-r from-[#1E3A5F] to-blue-600 hover:from-[#162d4a] hover:to-blue-700 text-white shadow-lg shadow-blue-500/25" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" /> Export Excel
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <input
          type="text"
          placeholder="Buscar cotización..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-slate-400"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {data.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E3A5F]" />
            <span className="ml-2 text-sm text-slate-500">Cargando cotizaciones...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <FileText className="w-10 h-10 mb-3" />
            <p className="text-sm font-medium">No se encontraron cotizaciones</p>
          </div>
        ) : (
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: "7%" }} />{/* COT. */}
              <col style={{ width: "13%" }} />{/* Cliente */}
              <col style={{ width: "14%" }} />{/* Materiales */}
              <col style={{ width: "9%" }} />{/* Estado */}
              <col style={{ width: "7%" }} />{/* Línea */}
              <col style={{ width: "10%" }} />{/* Comercial */}
              <col style={{ width: "7%" }} />{/* País */}
              <col style={{ width: "7%" }} />{/* F. Solicitud */}
              <col style={{ width: "7%" }} />{/* F. Emisión */}
              <col style={{ width: "5%" }} />{/* T. Resp */}
              <col style={{ width: "5%" }} />{/* China */}
              <col style={{ width: "9%" }} />{/* Contrato */}
            </colgroup>
            <thead>
              <tr className="bg-[#1E3A5F]">
                {["COT.","CLIENTE","MATERIALES","ESTADO","LÍNEA","COMERCIAL","PAÍS","SOLICITUD","EMISIÓN","RESP.","CHINA","CONTRATO"].map((h) => (
                  <th key={h} className="px-2 py-2.5 text-[10px] font-bold text-white text-left tracking-wide uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => (
                <tr key={r.id || idx} className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-blue-50/40 transition-colors`}>
                  <td className="px-2 py-1.5 text-[11px] font-semibold text-[#1E3A5F] truncate">{r.id ?? ""}</td>
                  <td className="px-2 py-1.5 text-[11px] font-semibold text-slate-800 truncate" title={r.customer}>{r.customer}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate" title={r.materials}>{r.materials}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate">{r.status}</td>
                  <td className="px-2 py-1.5 text-[10px] text-slate-500 truncate">{r.category}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate">{r.requestedBy}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-500 truncate">{r.country}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 tabular-nums">{r.requestDate ?? ""}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 tabular-nums">{r.issueDate ?? ""}</td>
                  <td className="px-2 py-1.5 text-[11px] text-center text-slate-500 tabular-nums">{r.responseTime ?? ""}</td>
                  <td className="px-2 py-1.5 text-[11px] text-center text-slate-500 tabular-nums">{r.chinaTime ?? ""}</td>
                  <td className="px-2 py-1.5 text-[11px] font-semibold text-[#1E3A5F] truncate">{r.contractNo ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-[11px] text-slate-400 text-center">Vista previa con columnas clave · El archivo Excel contiene las 15 columnas completas</p>
    </div>
  );
}
