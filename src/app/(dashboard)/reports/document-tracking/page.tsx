"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Download, Loader2, FileCheck2, RefreshCw, FileDown, Search } from "lucide-react";
import { addLogoToWorkbook, addLogoToHeader } from "@/lib/excel-logo";
import { generatePDFReport } from "@/lib/pdf-report";
import { T } from "@/lib/design-tokens";
import { Button } from "@/components/ui/button";
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
  } catch {
    return d;
  }
};

const fmtEtaShort = (d: string | null | undefined) => {
  if (!d) return "";
  try {
    const date = new Date(d.split("T")[0]);
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    const day = date.getUTCDate();
    const month = months[date.getUTCMonth()];
    const year = String(date.getUTCFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  } catch {
    return d || "";
  }
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type FilterMode = "strict" | "with_motonave";

const hasText = (v: string | null | undefined) =>
  !!v && v.trim() !== "" && v !== "Todos enviados";

function passesStrict(c: Contract) {
  const isTransit = c.status === "EN TRÁNSITO";
  const isProduction = c.status === "EN PRODUCCIÓN";
  if (!isTransit && !isProduction) return false;
  if (!hasText(c.documents_pending)) return false;
  if (isProduction && !c.documents_sent) return false;
  return true;
}

function passesWithMotonave(c: Contract) {
  if (passesStrict(c)) return true;
  // Caso extra: motonave asignada pero ningún documento enviado todavía
  const isTransit = c.status === "EN TRÁNSITO";
  if (!isTransit) return false;
  const hasSentDocs = !!c.documents_sent && c.documents_sent.trim() !== "";
  return !!c.vessel_name && c.vessel_name.trim() !== "" && !hasSentDocs;
}

export default function DocumentTrackingPage() {
  const [rawContracts, setRawContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<FilterMode>("strict");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "/api/contracts?pageSize=5000&sort_field=created_at&sort_direction=desc"
      );
      if (res.ok) {
        const json = await res.json();
        const all: Contract[] = json.data || [];
        // Pre-filtramos a EN TRÁNSITO + EN PRODUCCIÓN para no cargar 5000 en memoria innecesariamente
        const trackable = all.filter(
          (c) => c.status === "EN TRÁNSITO" || c.status === "EN PRODUCCIÓN"
        );
        setRawContracts(trackable);
      }
    } catch {
      toast.error("Error al cargar contratos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Aplicar el modo seleccionado
  const contracts = rawContracts.filter(
    mode === "strict" ? passesStrict : passesWithMotonave
  );

  // Contadores por modo (para mostrar en los tabs)
  const strictCount = rawContracts.filter(passesStrict).length;
  const expandedCount = rawContracts.filter(passesWithMotonave).length;
  const extraCount = expandedCount - strictCount;

  // Filter by search
  const filtered = contracts.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.client_name || "").toLowerCase().includes(q) ||
      (c.client_contract || "").toLowerCase().includes(q) ||
      (c.china_contract || "").toLowerCase().includes(q) ||
      (c.vessel_name || "").toLowerCase().includes(q) ||
      (c.detail || "").toLowerCase().includes(q)
    );
  });

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

      const ws = workbook.addWorksheet("DOCUMENT TRACKING", {
        properties: { defaultColWidth: 18 },
        views: [{ state: "frozen" as const, ySplit: 3 }],
      });

      const NAVY = "1E3A5F";
      const WHITE = "FFFFFF";
      const TEXT_DARK = "1A202C";
      const logoId = await addLogoToWorkbook(workbook);

      ws.columns = [
        { key: "client_name", width: 26 },
        { key: "client_contract", width: 22 },
        { key: "china_contract", width: 22 },
        { key: "detail", width: 38 },
        { key: "eta_final", width: 16 },
        { key: "vessel_name", width: 24 },
        { key: "documents_sent", width: 40 },
        { key: "documents_pending", width: 40 },
      ];

      const totalCols = ws.columns.length;
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // ROW 1: Header
      const r1 = ws.addRow([""]);

      const c1 = ws.getCell("A1");
      c1.value = {
        richText: [
          {
            text: "                              ",
            font: { name: "Aptos", size: 16, color: { argb: NAVY } },
          },
          {
            text: "DOCUMENT TRACKING",
            font: {
              name: "Aptos",
              size: 12,
              bold: true,
              color: { argb: WHITE },
            },
          },
          {
            text: `     ${dateStr}  ·  ${filtered.length} contracts`,
            font: {
              name: "Aptos",
              size: 9,
              color: { argb: "D0DCE8" },
            },
          },
        ],
      };
      c1.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
      c1.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: NAVY },
      };
      r1.height = 52;
      for (let col = 1; col <= totalCols; col++) {
        const cell = r1.getCell(col);
        if (col > 1)
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: NAVY },
          };
        cell.border = {
          bottom: { style: "medium" as const, color: { argb: WHITE } },
        };
      }
      addLogoToHeader(ws, logoId, totalCols);

      // ROW 2: Spacer
      const r2 = ws.addRow([""]);

      r2.height = 5;
      for (let col = 1; col <= totalCols; col++) {
        r2.getCell(col).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: WHITE },
        };
      }

      // ROW 3: Column headers
      const colHeaders = [
        "CUSTOMER",
        "CUST CONTRACT",
        "CN CONTRACT",
        "DETAIL / PRODUCT",
        "CURRENT ETA",
        "VESSEL NAME",
        "DOCUMENTS SENT",
        "PENDING DOCUMENTS",
      ];
      const headerRow = ws.addRow(colHeaders);
      headerRow.height = 32;
      headerRow.eachCell((cell) => {
        cell.font = {
          name: "Aptos",
          size: 9,
          bold: true,
          color: { argb: WHITE },
        };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: NAVY },
        };
        cell.border = {
          bottom: { style: "thin" as const, color: { argb: WHITE } },
          left: { style: "thin" as const, color: { argb: "2D5A8A" } },
          right: { style: "thin" as const, color: { argb: "2D5A8A" } },
          top: { style: "thin" as const, color: { argb: "2D5A8A" } },
        };
      });

      // DATA ROWS
      filtered.forEach((c, idx) => {
        const row = ws.addRow([
          c.client_name || "",
          c.client_contract || "",
          c.china_contract || "",
          c.detail || "",
          fmtEtaShort(c.eta_final),
          c.vessel_name || "",
          c.documents_sent || "",
          c.documents_pending || "",
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
            wrapText: [4, 7, 8].includes(colNumber),
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
          if (colNumber === 1) {
            cell.border = {
              ...cell.border,
              left: { style: "thin" as const, color: { argb: "D4D2CD" } },
            };
          }
          if (colNumber === totalCols) {
            cell.border = {
              ...cell.border,
              right: { style: "thin" as const, color: { argb: "D4D2CD" } },
            };
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
          // Center ETA
          if (colNumber === 5) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }
          // Pending documents with soft red background
          if (colNumber === 8 && cell.value) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: isEven ? "FEF2F2" : "FEE2E2" },
            };
            cell.font = {
              name: "Aptos",
              size: 9.5,
              color: { argb: "991B1B" },
            };
          }
          // Sent documents with soft green background
          if (colNumber === 7 && cell.value) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: isEven ? "F0FDF4" : "DCFCE7" },
            };
            cell.font = {
              name: "Aptos",
              size: 9.5,
              color: { argb: "166534" },
            };
          }
        });
        row.height = 30;
      });

      // Footer
      const footerGap = ws.addRow([""]);
      footerGap.height = 6;
      const footerRowIdx = ws.rowCount + 1;
      const footerRow = ws.addRow([""]);

      const footerCell = ws.getCell(`A${footerRowIdx}`);
      footerCell.value = {
        richText: [
          {
            text: "IBC Core",
            font: {
              name: "Aptos",
              size: 8.5,
              bold: true,
              color: { argb: "1E3A5F" },
            },
          },
          {
            text: `  ·  Generated: ${now.toLocaleString("en-US")}  ·  © ${now.getFullYear()} IBC STEEL GROUP`,
            font: {
              name: "Aptos",
              size: 8,
              italic: true,
              color: { argb: "9CA3B4" },
            },
          },
        ],
      };
      footerCell.alignment = { horizontal: "center", vertical: "middle" };
      footerCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FAF9F7" },
      };
      footerCell.border = {
        top: { style: "thin" as const, color: { argb: "E8E6E1" } },
      };
      footerRow.height = 20;

      ws.autoFilter = {
        from: { row: 3, column: 1 },
        to: { row: 3, column: totalCols },
      };
      ws.pageSetup = {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9,
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Document_Tracking_IBC_${now.toISOString().slice(0, 10)}.xlsx`;
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
      toast.info("Generando PDF...");
      await generatePDFReport({
        title: "DOCUMENT TRACKING",
        subtitle: "Seguimiento de documentos por embarque",
        filename: "Document_Tracking_IBC",
        recordLabel: "contratos",
        orientation: "landscape",
        columns: [
          { header: "CUSTOMER", dataKey: "customer", width: 1.2, bold: true },
          {
            header: "CUST CONTRACT",
            dataKey: "cust_contract",
            width: 1,
            bold: true,
            color: "#1E3A5F",
          },
          {
            header: "CN CONTRACT",
            dataKey: "cn_contract",
            width: 1,
            bold: true,
            color: "#1E3A5F",
          },
          { header: "DETAIL / PRODUCT", dataKey: "detail", width: 1.8 },
          {
            header: "CURRENT ETA",
            dataKey: "eta",
            width: 0.8,
            halign: "center",
          },
          { header: "VESSEL NAME", dataKey: "vessel", width: 1.1 },
          { header: "DOCUMENTS SENT", dataKey: "docs_sent", width: 1.8 },
          { header: "PENDING DOCS", dataKey: "docs_pending", width: 1.8 },
        ],
        data: filtered.map((c) => ({
          customer: c.client_name || "",
          cust_contract: c.client_contract || "",
          cn_contract: c.china_contract || "",
          detail: c.detail || "",
          eta: fmtEtaShort(c.eta_final),
          vessel: c.vessel_name || "",
          docs_sent: c.documents_sent || "",
          docs_pending: c.documents_pending || "",
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
    <div
      style={{
        background: T.glassBg,
        backdropFilter: T.glassBlur,
        border: "1px solid " + T.glassBorder,
        borderRadius: T.radius,
        boxShadow: T.shadowGlass,
        padding: "24px 28px",
      }}
    >
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink }}>
              Document Tracking
            </h1>
            <p style={{ fontSize: 13, color: T.inkMuted, marginTop: 4 }}>
              Seguimiento de documentos por embarque &mdash;{" "}
              <span style={{ fontWeight: 600, color: T.inkSoft }}>
                {filtered.length} registros
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Status badge */}
            <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-xl">
              <FileCheck2 className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-semibold text-teal-700">
                {filtered.length}
              </span>
              <span className="text-xs text-teal-600">embarques</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-xl border-slate-200"
              onClick={fetchData}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>

            <Button
              size="sm"
              className="h-9 gap-1.5 rounded-xl"
              variant="outline"
              onClick={handlePDF}
              style={{
                background: T.gradientPrimary,
                border: "none",
                boxShadow: T.shadowMd,
                color: "white",
              }}
            >
              <FileDown className="w-3.5 h-3.5" />
              Export PDF
            </Button>

            <Button
              size="sm"
              className="h-9 gap-1.5 rounded-xl"
              onClick={handleExport}
              style={{
                background: T.gradientPrimary,
                border: "none",
                boxShadow: T.shadowMd,
                color: "white",
              }}
            >
              <Download className="w-3.5 h-3.5" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* Mode toggle + Search */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
          <div
            role="tablist"
            style={{
              display: "inline-flex",
              padding: 4,
              borderRadius: 12,
              background: T.surfaceAlt,
              border: `1px solid ${T.borderLight}`,
              gap: 4,
            }}
          >
            {([
              { id: "strict", label: "Solo con documentos pendientes", count: strictCount, hint: "Lista clásica: contratos con pendientes reportados." },
              { id: "with_motonave", label: "Incluir motonave sin docs", count: expandedCount, hint: `Suma ${extraCount} con motonave asignada pero sin documentos enviados.` },
            ] as const).map((opt) => {
              const active = mode === opt.id;
              return (
                <button
                  key={opt.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setMode(opt.id)}
                  title={opt.hint}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 14px",
                    borderRadius: 9,
                    border: "none",
                    cursor: "pointer",
                    background: active ? T.surface : "transparent",
                    color: active ? T.accent : T.inkMuted,
                    fontWeight: active ? 700 : 600,
                    fontSize: 12.5,
                    boxShadow: active ? T.shadow : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  {opt.label}
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 22,
                      height: 18,
                      padding: "0 7px",
                      borderRadius: 99,
                      fontSize: 10.5,
                      fontWeight: 700,
                      background: active ? T.accent : T.surface,
                      color: active ? "#fff" : T.inkMuted,
                      border: active ? "none" : `1px solid ${T.borderLight}`,
                      fontFamily: "var(--font-jetbrains-mono), monospace",
                    }}
                  >
                    {opt.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative" style={{ flex: 1, maxWidth: 360, minWidth: 240 }}>
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: T.inkLight }}
            />
            <input
              type="text"
              placeholder="Buscar por cliente, contrato, motonave..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 transition-colors"
              style={{
                borderColor: T.borderLight,
                color: T.ink,
                background: T.surface,
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div
          style={{
            borderRadius: T.radiusMd,
            border: "1px solid " + T.borderLight,
            overflow: "hidden",
            boxShadow: T.shadowMd,
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2
                className="w-6 h-6 animate-spin"
                style={{ color: T.accent }}
              />
              <span
                style={{ marginLeft: 8, fontSize: 13, color: T.inkMuted }}
              >
                Cargando datos...
              </span>
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-20"
              style={{ color: T.inkLight }}
            >
              <FileCheck2 className="w-10 h-10 mb-3" />
              <p className="text-sm font-medium">
                No se encontraron registros
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <colgroup>
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "17%" }} />
                  <col style={{ width: "16%" }} />
                </colgroup>
                <thead>
                  <tr style={{ background: "rgba(11,83,148,0.03)" }}>
                    {[
                      "CUSTOMER",
                      "CUST CONTRACT",
                      "CN CONTRACT",
                      "DETAIL / PRODUCT",
                      "CURRENT ETA",
                      "VESSEL NAME",
                      "DOCUMENTS SENT",
                      "PENDING DOCUMENTS",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-2 py-2.5 text-left"
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: T.inkMuted,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, idx) => (
                    <tr
                      key={c.id}
                      className={`${
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                      } hover:bg-blue-50/40 transition-colors`}
                    >
                      {/* CUSTOMER */}
                      <td
                        className="px-2 py-2 text-[11px] font-semibold text-slate-800 truncate"
                        title={c.client_name}
                      >
                        {c.client_name}
                      </td>
                      {/* CUST CONTRACT */}
                      <td
                        className="px-2 py-2 text-[11px] font-semibold text-[#1E3A5F] truncate"
                        title={c.client_contract || ""}
                      >
                        {c.client_contract || "N/A"}
                      </td>
                      {/* CN CONTRACT */}
                      <td
                        className="px-2 py-2 text-[11px] font-semibold text-[#1E3A5F] truncate"
                        title={c.china_contract || ""}
                      >
                        {c.china_contract || ""}
                      </td>
                      {/* DETAIL / PRODUCT */}
                      <td
                        className="px-2 py-2 text-[11px] text-slate-600"
                        title={c.detail || ""}
                        style={{
                          maxWidth: 220,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.detail || ""}
                      </td>
                      {/* CURRENT ETA */}
                      <td className="px-2 py-2 text-[11px] text-center text-slate-600 whitespace-nowrap tabular-nums">
                        {fmtEtaShort(c.eta_final)}
                      </td>
                      {/* VESSEL NAME */}
                      <td
                        className="px-2 py-2 text-[11px] text-slate-700 font-medium truncate"
                        title={c.vessel_name || ""}
                      >
                        {c.vessel_name || ""}
                      </td>
                      {/* DOCUMENTS SENT */}
                      <td className="px-2 py-1.5">
                        {c.documents_sent ? (
                          <div className="flex flex-wrap gap-1">
                            {c.documents_sent.split(",").map((doc, i) => (
                              <span
                                key={i}
                                className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              >
                                {doc.trim()}
                              </span>
                            ))}
                          </div>
                        ) : c.vessel_name ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300"
                            title="Tiene motonave asignada pero el equipo aún no comparte documentos"
                          >
                            <span style={{ width: 5, height: 5, borderRadius: 99, background: "#D97706", display: "inline-block" }} />
                            PEDIR DOCS
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            Sin documentos
                          </span>
                        )}
                      </td>
                      {/* PENDING DOCUMENTS */}
                      <td className="px-2 py-1.5">
                        {c.documents_pending ? (
                          <div className="flex flex-wrap gap-1">
                            {c.documents_pending.split(",").map((doc, i) => (
                              <span
                                key={i}
                                className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-red-50 text-red-700 border border-red-200/60"
                              >
                                {doc.trim()}
                              </span>
                            ))}
                          </div>
                        ) : c.vessel_name && !c.documents_sent ? (
                          <span className="text-[10px] text-amber-700 italic font-medium">
                            Sin reportar
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-medium">
                            Completo
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p
          style={{
            fontSize: 11,
            color: T.inkLight,
            textAlign: "center",
          }}
        >
          Documentos enviados y pendientes por embarque · Exporta a Excel o
          PDF para el reporte completo
        </p>
      </div>
    </div>
  );
}
