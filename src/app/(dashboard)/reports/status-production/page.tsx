"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Download, Loader2, Factory, RefreshCw } from "lucide-react";
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

  // Get manual field value, with pre-populate fallback from contract.vessel_name
  const getManualField = (
    contract: Contract,
    field: keyof ManualReportData
  ): string => {
    const entry = manualData[contract.id!];
    if (entry && entry[field] !== undefined && entry[field] !== "") {
      return entry[field];
    }
    // Pre-populate vessel_name from contract if no manual entry
    if (field === "vessel_name" && contract.vessel_name) {
      return contract.vessel_name;
    }
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
      ws.mergeCells(1, 1, 1, totalCols);
      const c1 = ws.getCell("A1");
      c1.value = { richText: [
        { text: "IBC", font: { name: "Aptos", size: 16, bold: true, color: { argb: WHITE } } },
        { text: "  STEEL GROUP", font: { name: "Aptos", size: 12, color: { argb: "FFFFFF" } } },
        { text: `          STATUS PRODUCTION`, font: { name: "Aptos", size: 10, bold: true, color: { argb: "FFFFFF" } } },
        { text: `     ${dateStr}  ·  ${contracts.length} contracts`, font: { name: "Aptos", size: 9, color: { argb: "D0DCE8" } } },
      ] };
      c1.alignment = { horizontal: "left", vertical: "middle", indent: 2 };
      c1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      r1.height = 40;
      for (let col = 1; col <= totalCols; col++) {
        const cell = r1.getCell(col);
        if (col > 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        cell.border = { bottom: { style: "medium" as const, color: { argb: "FFFFFF" } } };
      }

      // ROW 2: Spacer
      const r2 = ws.addRow([""]);
      ws.mergeCells(2, 1, 2, totalCols);
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
        const departureVal = manual.estimated_departure
          ? fmtDate(manual.estimated_departure)
          : "";

        const row = ws.addRow([
          c.client_name || "",
          c.client_contract || "",
          c.china_contract || "",
          c.incoterm || "",
          c.detail || "",
          fmtDate(c.exw_date),
          vesselVal,
          departureVal,
          manual.additional_notes || "",
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
      link.download = `STATUS_PRODUCTION_${now.toISOString().slice(0, 10)}.xlsx`;
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
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">
            Status Production
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Contracts in production —{" "}
            <span className="font-medium text-slate-700">
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

          <Button
            size="sm"
            className="h-9 gap-1.5 rounded-xl bg-gradient-to-r from-[#1E3A5F] to-blue-600 hover:from-[#162d4a] hover:to-blue-700 text-white shadow-lg shadow-blue-500/25"
            onClick={handleExport}
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E3A5F]" />
            <span className="ml-2 text-sm text-slate-500">
              Loading contracts...
            </span>
          </div>
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Factory className="w-10 h-10 mb-3" />
            <p className="text-sm font-medium">
              No contracts in production
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#1E3A5F] hover:bg-[#1E3A5F]">
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap">
                    CUSTOMER
                  </TableHead>
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap">
                    CUSTOMER CONTRACT
                  </TableHead>
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap">
                    CHINA CONTRACT
                  </TableHead>
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap text-center">
                    INCOTERM
                  </TableHead>
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap">
                    DETAIL
                  </TableHead>
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap text-center">
                    EXW
                  </TableHead>
                  {/* Editable columns - highlighted header */}
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap bg-blue-700/50">
                    VESSEL NAME
                  </TableHead>
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap bg-blue-700/50 text-center">
                    ESTIMATED DEPARTURE DATE
                  </TableHead>
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap bg-blue-700/50">
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
    </div>
  );
}
