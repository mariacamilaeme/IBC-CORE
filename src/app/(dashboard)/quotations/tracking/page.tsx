"use client";

import React, { useState, useMemo } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { toast } from "sonner";
import { addLogoToWorkbook, addLogoToHeader } from "@/lib/excel-logo";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  BarChart3,
  TrendingUp,
  Clock,
  LayoutGrid,
  List,
  Download,
  ChevronDown,
  AlertTriangle,
  Users,
  Pencil,
  Check,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { useCommercials } from "@/hooks/useCommercials";
import { useQuotationsData } from "@/hooks/useQuotationsData";
import QuotationDialog from "../quotation-dialog";
import type { DialogMode } from "../quotation-dialog";
import type { ReportQuotation } from "../constants";
import {
  STATUS_CONFIG,
  CATEGORY_CONFIG,
  getCountryFlag,
  fmtDate,
  avatarColor,
  initials,
} from "../constants";

const PAGE_SIZE = 15;

const STATUS_TABS = [
  { key: "all", label: "Todas" },
  { key: "Pendiente cotización", label: "Pendientes" },
  { key: "En negociación", label: "En Negociación" },
  { key: "Aprobado", label: "Aprobadas" },
] as const;

type SortField =
  | "id"
  | "customer"
  | "status"
  | "category"
  | "requestedBy"
  | "country"
  | "requestDate"
  | "responseTime"
  | "chinaTime";

// ---------------------------------------------------------------------------
// MiniSparkline SVG component
// ---------------------------------------------------------------------------

function MiniSparkline({
  values,
  color,
  width = 80,
  height = 32,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);

  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `0,${height} ${points} ${width},${height}`;
  const gradId = `spark-${color.replace("#", "")}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// DonutChart SVG component
// ---------------------------------------------------------------------------

function DonutChart({
  segments,
  size = 72,
  strokeWidth = 10,
}: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
  strokeWidth?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width={size} height={size} className="shrink-0">
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dash = pct * circumference;
        const gap = circumference - dash;
        const rotation = offset * 360 - 90;
        offset += pct;
        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${gap}`}
            transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
            strokeLinecap="round"
          />
        );
      })}
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="text-[11px] font-bold fill-slate-700"
      >
        {total}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function TrackingPage() {
  // -- Data from shared hook
  const { data, addQuotation, updateQuotation } = useQuotationsData();

  // -- View state (table / kanban only — no charts)
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  // -- Tab state
  const [activeTab, setActiveTab] = useState<string>("all");

  // -- Search & filters
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterCommercial, setFilterCommercial] = useState<string>("all");

  // -- Sorting
  const [sortField, setSortField] = useState<SortField>("requestDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // -- Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // -- Row expand / select
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // -- Quotation dialog (view / edit / create)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("view");
  const [dialogQuotation, setDialogQuotation] = useState<ReportQuotation | null>(null);

  const openViewDialog = (q: ReportQuotation) => {
    setDialogQuotation(q);
    setDialogMode("view");
    setDialogOpen(true);
  };
  const openEditDialog = (q: ReportQuotation) => {
    setDialogQuotation(q);
    setDialogMode("edit");
    setDialogOpen(true);
  };
  const openCreateDialog = () => {
    setDialogQuotation(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const handleSaveQuotation = (q: ReportQuotation, isNew: boolean) => {
    if (isNew) {
      addQuotation(q);
    } else {
      updateQuotation(q);
    }
  };

  // -- Commercials management (shared hook)
  const [commercialsOpen, setCommercialsOpen] = useState(false);
  const [editingCommercial, setEditingCommercial] = useState<{ old: string; new: string } | null>(null);
  const [newCommercialName, setNewCommercialName] = useState("");

  const dataCommercialNames = useMemo(() => data.map((d) => d.requestedBy), [data]);
  const {
    commercials,
    addCommercial,
    deleteCommercial: removeCommercial,
    renameCommercial,
  } = useCommercials(dataCommercialNames);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((d) => {
      counts[d.status] = (counts[d.status] || 0) + 1;
    });
    return counts;
  }, [data]);

  // Filtered data (combining tab + filters)
  const filtered = useMemo(() => {
    let result = [...data];

    if (activeTab !== "all") {
      result = result.filter((r) => r.status === activeTab);
    }
    if (filterStatus !== "all") {
      result = result.filter((r) => r.status === filterStatus);
    }
    if (filterCategory !== "all") {
      result = result.filter((r) => r.category === filterCategory);
    }
    if (filterCommercial !== "all") {
      result = result.filter((r) => r.requestedBy === filterCommercial);
    }
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (r) =>
          r.customer.toLowerCase().includes(q) ||
          r.materials.toLowerCase().includes(q) ||
          (r.id && r.id.toLowerCase().includes(q)) ||
          r.requestedBy.toLowerCase().includes(q) ||
          r.country.toLowerCase().includes(q)
      );
    }

    return result;
  }, [data, activeTab, filterStatus, filterCategory, filterCommercial, debouncedSearch]);

  // Sorted data
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let valA: string | number | null = null;
      let valB: string | number | null = null;
      switch (sortField) {
        case "id":
          valA = a.id || "";
          valB = b.id || "";
          break;
        case "customer":
          valA = a.customer;
          valB = b.customer;
          break;
        case "status":
          valA = a.status;
          valB = b.status;
          break;
        case "category":
          valA = a.category;
          valB = b.category;
          break;
        case "requestedBy":
          valA = a.requestedBy;
          valB = b.requestedBy;
          break;
        case "country":
          valA = a.country;
          valB = b.country;
          break;
        case "requestDate":
          valA = a.requestDate || "";
          valB = b.requestDate || "";
          break;
        case "responseTime":
          valA = a.responseTime ?? 9999;
          valB = b.responseTime ?? 9999;
          break;
        case "chinaTime":
          valA = a.chinaTime ?? 9999;
          valB = b.chinaTime ?? 9999;
          break;
      }
      if (valA === null && valB === null) return 0;
      if (valA === null) return 1;
      if (valB === null) return -1;
      if (typeof valA === "number" && typeof valB === "number") {
        return sortDir === "asc" ? valA - valB : valB - valA;
      }
      const cmp = String(valA).localeCompare(String(valB));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortField, sortDir]);

  // Paginated data
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, currentPage]);

  // Export filtered data as styled Excel
  const handleExport = async () => {
    const rows = sorted;
    if (rows.length === 0) {
      toast.warning("No hay datos para exportar");
      return;
    }
    toast.info("Generando reporte Excel…");

    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "IBC Core";
    wb.created = new Date();

    const ws = wb.addWorksheet("Cotizaciones", {
      properties: { defaultColWidth: 16 },
      views: [{ state: "frozen", ySplit: 3 }],
    });

    // ── Brand colors ──
    const NAVY = "1E3A5F";
    const WHITE = "FFFFFF";
    const INK = "1E293B";
    const INK_MUTED = "64748B";
    const logoId = await addLogoToWorkbook(wb);

    // Status color map for Excel (ARGB without #)
    const statusColors: Record<string, { font: string; fill: string }> = {
      Aprobado: { font: "059669", fill: "ECFDF5" },
      Finalizado: { font: "6366F1", fill: "EEF2FF" },
      "En negociación": { font: "0891B2", fill: "ECFEFF" },
      "Pendiente cotización": { font: "D97706", fill: "FFFBEB" },
    };

    // ── Column definitions ──
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

    // ── Row 1: Unified header ──
    ws.mergeCells(1, 1, 1, columns.length);
    const bannerCell = ws.getCell("A1");
    const dateStr = new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
    bannerCell.value = { richText: [
      { text: "                              ", font: { name: "Aptos", size: 16, color: { argb: NAVY } } },
      { text: "REPORTE DE COTIZACIONES", font: { name: "Aptos", size: 12, bold: true, color: { argb: WHITE } } },
      { text: `     ${dateStr}  ·  ${rows.length} registros`, font: { name: "Aptos", size: 9, color: { argb: "D0DCE8" } } },
    ] };
    bannerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    bannerCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    ws.getRow(1).height = 52;
    for (let col = 1; col <= columns.length; col++) {
      const cell = ws.getRow(1).getCell(col);
      if (col > 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      cell.border = { bottom: { style: "medium", color: { argb: "FFFFFF" } } };
    }
    addLogoToHeader(ws, logoId, columns.length);

    // ── Row 2: Spacer ──
    ws.mergeCells(2, 1, 2, columns.length);
    ws.getRow(2).height = 5;
    for (let col = 1; col <= columns.length; col++) {
      ws.getRow(2).getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
    }

    // ── Row 3: Headers ──
    const headerRow = ws.getRow(3);
    columns.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = col.header;
      cell.font = { name: "Aptos", size: 9, bold: true, color: { argb: WHITE } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFFFFF" } },
        left: { style: "thin", color: { argb: "2D5A8A" } },
        right: { style: "thin", color: { argb: "2D5A8A" } },
        top: { style: "thin", color: { argb: "2D5A8A" } },
      };
    });
    headerRow.height = 32;

    // Set column widths
    columns.forEach((col, i) => { ws.getColumn(i + 1).width = col.width; });

    // ── Data rows ──
    rows.forEach((r, idx) => {
      const rowNum = idx + 4;
      const row = ws.getRow(rowNum);
      const values = [
        r.id ?? "", r.customer, r.materials, r.status, r.category,
        r.requestedBy, r.country, r.continent, r.requestDate ?? "", r.issueDate ?? "",
        r.responseTime ?? "", r.chinaTime ?? "", r.chinaStatus ?? "",
        r.contractDate ?? "", r.contractNo ?? "",
      ];

      values.forEach((val, i) => {
        const cell = row.getCell(i + 1);
        cell.value = val;
        cell.font = { name: "Aptos", size: 10, color: { argb: INK } };
        cell.alignment = { vertical: "middle", wrapText: i === 2 };
        cell.fill = {
          type: "pattern", pattern: "solid",
          fgColor: { argb: idx % 2 === 0 ? WHITE : "F8F7F5" },
        };
        cell.border = {
          bottom: { style: "thin", color: { argb: "EDECEA" } },
          left: i === 0 ? { style: "thin", color: { argb: "D4D2CD" } } : { style: "hair", color: { argb: "E8E6E1" } },
          right: i === columns.length - 1 ? { style: "thin", color: { argb: "D4D2CD" } } : { style: "hair", color: { argb: "E8E6E1" } },
        };
      });

      // Status cell styling
      const statusCell = row.getCell(4);
      const sc = statusColors[r.status];
      if (sc) {
        statusCell.font = { name: "Aptos", size: 10, bold: true, color: { argb: sc.font } };
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: sc.fill } };
        statusCell.alignment = { vertical: "middle", horizontal: "center" };
      }

      // Muted columns: continente, fechas
      [8, 9, 10, 14].forEach((ci) => {
        const c = row.getCell(ci);
        c.font = { name: "Aptos", size: 10, color: { argb: INK_MUTED } };
      });

      // Numeric columns center
      [11, 12].forEach((ci) => {
        const c = row.getCell(ci);
        c.alignment = { vertical: "middle", horizontal: "center" };
      });

      row.height = 26;
    });

    // ── Footer row ──
    const footerRowNum = rows.length + 4;
    ws.mergeCells(footerRowNum, 1, footerRowNum, columns.length);
    const footerCell = ws.getCell(`A${footerRowNum}`);
    footerCell.value = { richText: [
      { text: "IBC Core", font: { name: "Aptos", size: 8.5, bold: true, color: { argb: "1E3A5F" } } },
      { text: `  ·  Generado: ${new Date().toLocaleString("es-CO")}  ·  © ${new Date().getFullYear()} IBC STEEL GROUP`, font: { name: "Aptos", size: 8, italic: true, color: { argb: "9CA3B4" } } },
    ] };
    footerCell.alignment = { vertical: "middle", horizontal: "center" };
    footerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FAF9F7" } };
    footerCell.border = { top: { style: "thin", color: { argb: "E8E6E1" } } };
    ws.getRow(footerRowNum).height = 24;

    // ── Generate & download ──
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `IBC-Cotizaciones-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} cotizaciones exportadas`);
  };

  // KPIs
  const totalCount = data.length;
  const approvedCount =
    (statusCounts["Aprobado"] || 0) + (statusCounts["Finalizado"] || 0);
  const conversionRate =
    totalCount > 0 ? ((approvedCount / totalCount) * 100).toFixed(1) : "0";
  const avgResponseTime = useMemo(() => {
    const times = data
      .map((d) => d.responseTime)
      .filter((t): t is number => t !== null && t >= 0);
    if (times.length === 0) return 0;
    return Math.round(times.reduce((s, v) => s + v, 0) / times.length);
  }, [data]);

  // Sparkline data
  const sparkBlue = [8, 12, 10, 15, 14, 20, 18, 22, 25, 20, 28, 30];
  const sparkGreen = [2, 3, 4, 3, 5, 6, 5, 7, 8, 6, 9, 10];
  const sparkAmber = [12, 10, 8, 9, 7, 6, 8, 5, 4, 6, 3, 5];

  // Donut segments
  const donutSegments = useMemo(() => {
    return [
      {
        value: statusCounts["Aprobado"] || 0,
        color: STATUS_CONFIG["Aprobado"].color,
        label: "Aprobado",
      },
      {
        value: statusCounts["En negociación"] || 0,
        color: STATUS_CONFIG["En negociación"].color,
        label: "En negociación",
      },
      {
        value: statusCounts["Pendiente cotización"] || 0,
        color: STATUS_CONFIG["Pendiente cotización"].color,
        label: "Pendiente",
      },
      {
        value: statusCounts["Finalizado"] || 0,
        color: STATUS_CONFIG["Finalizado"].color,
        label: "Finalizado",
      },
    ];
  }, [statusCounts]);

  // ---------- Handlers ----------

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const toggleRowSelection = (idx: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === paginated.length) {
      setSelectedRows(new Set());
    } else {
      const start = (currentPage - 1) * PAGE_SIZE;
      const indices = paginated.map((_, i) => start + i);
      setSelectedRows(new Set(indices));
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setFilterCategory("all");
    setFilterCommercial("all");
    setActiveTab("all");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    filterStatus !== "all" ||
    filterCategory !== "all" ||
    filterCommercial !== "all";

  // ---------- Commercials management ----------

  const handleAddCommercial = () => {
    const name = newCommercialName.trim();
    if (!name) return;
    addCommercial(name);
    setNewCommercialName("");
  };

  const handleDeleteCommercial = (name: string) => {
    removeCommercial(name);
  };

  const handleRenameCommercial = async () => {
    if (!editingCommercial || !editingCommercial.new.trim()) return;
    const oldN = editingCommercial.old;
    const newN = editingCommercial.new.trim();
    renameCommercial(oldN, newN);
    setEditingCommercial(null);
    // Bulk rename in contracts (Supabase)
    try {
      const res = await fetch("/api/contracts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename_commercial", oldName: oldN, newName: newN }),
      });
      if (res.ok) {
        const r = await res.json();
        if (r.updated > 0) {
          toast.info(`Comercial renombrado en ${r.updated} contrato${r.updated > 1 ? "s" : ""}`);
        }
      }
    } catch { /* ignore */ }
  };

  // ---------- Sort arrow helper ----------

  const SortArrow = ({ field }: { field: SortField }) => (
    <span className="inline-flex flex-col ml-1 -space-y-1 text-[9px] leading-none">
      <span
        className={cn(
          sortField === field && sortDir === "asc"
            ? "text-[#1E3A5F]"
            : "text-slate-300"
        )}
      >
        ▲
      </span>
      <span
        className={cn(
          sortField === field && sortDir === "desc"
            ? "text-[#1E3A5F]"
            : "text-slate-300"
        )}
      >
        ▼
      </span>
    </span>
  );

  // ---------- Render ----------

  return (
    <>
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Trazabilidad Cotizaciones</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona el pipeline comercial y seguimiento de cotizaciones
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-slate-200 text-slate-600 hover:text-[#1E3A5F] hover:border-[#1E3A5F]/30" onClick={() => setCommercialsOpen(true)}>
            <Users className="w-4 h-4" />
            Comerciales
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="w-4 h-4" />
            Exportar
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-[#1E3A5F] hover:bg-[#2A4D7A] text-white rounded-xl shadow-lg shadow-[#1E3A5F]/20 font-semibold transition-all duration-200 hover:scale-[1.02]"
            onClick={openCreateDialog}
          >
            <Plus className="w-4 h-4" />
            Nueva Cotización
          </Button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-5 gap-3.5">
        {/* Total Cotizaciones */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Total Cotizaciones
              </span>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold text-slate-900">{totalCount}</div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                  +12%
                </span>
                <span className="text-[10px] text-slate-400">vs mes ant.</span>
              </div>
            </div>
            <MiniSparkline values={sparkBlue} color="#2563EB" />
          </div>
        </div>

        {/* Valor Pipeline */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Valor Pipeline
              </span>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold text-slate-900">N/A</div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-slate-400">Sin datos de valor</span>
              </div>
            </div>
            <MiniSparkline values={sparkGreen} color="#059669" />
          </div>
        </div>

        {/* Tasa de Conversion */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-violet-600" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Tasa Conversión
              </span>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="flex-1">
              <div className="text-2xl font-bold text-slate-900">{conversionRate}%</div>
              <div className="w-full mt-2">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all"
                    style={{ width: `${conversionRate}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {approvedCount} aprobados de {totalCount}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tiempo Respuesta */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Tiempo Respuesta
              </span>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {avgResponseTime}
                <span className="text-sm font-normal text-slate-400 ml-1">días</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                  Promedio
                </span>
              </div>
            </div>
            <MiniSparkline values={sparkAmber} color="#D97706" />
          </div>
        </div>

        {/* Por Estado - Donut */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-slate-600" />
            </div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Por Estado
            </span>
          </div>
          <div className="flex items-center gap-3">
            <DonutChart segments={donutSegments} size={68} strokeWidth={9} />
            <div className="flex flex-col gap-1 min-w-0">
              {donutSegments.map((seg) => (
                <div key={seg.label} className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="text-[10px] text-slate-600 truncate">{seg.label}</span>
                  <span className="text-[10px] font-semibold text-slate-800 ml-auto">{seg.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN TABLE CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Status Tabs + View Switcher */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5">
          <div className="flex items-center gap-0">
            {STATUS_TABS.map((tab) => {
              const count = tab.key === "all" ? totalCount : statusCounts[tab.key] || 0;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "relative px-4 py-3.5 text-sm font-medium transition-colors",
                    isActive ? "text-[#1E3A5F]" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {tab.label}
                  <span
                    className={cn(
                      "ml-1.5 text-xs px-1.5 py-0.5 rounded-full",
                      isActive ? "bg-[#1E3A5F]/10 text-[#1E3A5F]" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {count}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB] rounded-t-full" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                viewMode === "table"
                  ? "bg-white shadow-sm text-[#1E3A5F]"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <List className="w-3.5 h-3.5" />
              Tabla
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                viewMode === "kanban"
                  ? "bg-white shadow-sm text-[#1E3A5F]"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Kanban
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por cliente, material, comercial..."
              className="pl-9 h-9 text-sm bg-slate-50 border-slate-200"
            />
          </div>

          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[180px] h-9 text-sm bg-slate-50 border-slate-200">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {Object.keys(STATUS_CONFIG).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[160px] h-9 text-sm bg-slate-50 border-slate-200">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las líneas</SelectItem>
              {Object.keys(CATEGORY_CONFIG).map((c) => (
                <SelectItem key={c} value={c}>{CATEGORY_CONFIG[c].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterCommercial} onValueChange={(v) => { setFilterCommercial(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[170px] h-9 text-sm bg-slate-50 border-slate-200">
              <SelectValue placeholder="Comercial" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los comerciales</SelectItem>
              {commercials.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-slate-500 hover:text-slate-700 gap-1">
              <X className="w-3.5 h-3.5" />
              Limpiar
            </Button>
          )}

          <div className="ml-auto text-xs text-slate-500">{filtered.length} resultados</div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedRows.size > 0 && (
          <div className="flex items-center gap-3 px-5 py-2.5 bg-blue-50 border-b border-blue-100">
            <span className="text-xs font-medium text-blue-700">{selectedRows.size} seleccionadas</span>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-blue-200 text-blue-700 bg-white hover:bg-blue-50">
              <Eye className="w-3.5 h-3.5" />
              Ver
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-blue-200 text-blue-700 bg-white hover:bg-blue-50">
              <FileText className="w-3.5 h-3.5" />
              Copiar
            </Button>
            <button onClick={() => setSelectedRows(new Set())} className="ml-auto text-xs text-blue-600 hover:text-blue-800 font-medium">
              Deseleccionar todo
            </button>
          </div>
        )}

        {/* TABLE VIEW */}
        {viewMode === "table" && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={paginated.length > 0 && selectedRows.size === paginated.length}
                        onChange={toggleSelectAll}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("id")}>
                      No. Cotización <SortArrow field="id" />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("customer")}>
                      Cliente <SortArrow field="customer" />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("status")}>
                      Estado <SortArrow field="status" />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("category")}>
                      Línea <SortArrow field="category" />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("requestedBy")}>
                      Comercial <SortArrow field="requestedBy" />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("country")}>
                      País <SortArrow field="country" />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("requestDate")}>
                      Fecha Solicitud <SortArrow field="requestDate" />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("responseTime")}>
                      T. Respuesta <SortArrow field="responseTime" />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("chinaTime")}>
                      China <SortArrow field="chinaTime" />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      Contrato
                    </th>
                    <th className="w-10 px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((row, idx) => {
                    const globalIdx = (currentPage - 1) * PAGE_SIZE + idx;
                    const isSelected = selectedRows.has(globalIdx);
                    const isExpanded = expandedRow === globalIdx;
                    const sc = STATUS_CONFIG[row.status];
                    const cc = CATEGORY_CONFIG[row.category];

                    return (
                      <React.Fragment key={globalIdx}>
                        <tr
                          className={cn(
                            "border-b border-slate-100 transition-colors cursor-pointer",
                            isSelected ? "bg-blue-50/60" : "hover:bg-slate-50/80",
                            isExpanded && "bg-slate-50/50"
                          )}
                          onClick={() => setExpandedRow(isExpanded ? null : globalIdx)}
                        >
                          <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRowSelection(globalIdx)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className="text-xs font-mono font-medium text-slate-700">{row.id || "—"}</span>
                          </td>
                          <td className="px-3 py-3 max-w-[220px]">
                            <div className="font-medium text-slate-900 truncate">{row.customer}</div>
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">{row.materials}</div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {sc ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border"
                                style={{ color: sc.color, backgroundColor: sc.bg, borderColor: sc.border }}
                              >
                                <span className="text-[10px]">{sc.icon}</span>
                                {sc.label}
                              </span>
                            ) : (
                              <Badge variant="secondary">{row.status}</Badge>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {cc ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold" style={{ color: cc.color, backgroundColor: cc.bg }}>
                                {cc.short}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500">{row.category}</span>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: avatarColor(row.requestedBy) }}>
                                {initials(row.requestedBy)}
                              </div>
                              <span className="text-xs text-slate-700">{row.requestedBy}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className="text-xs text-slate-700">{getCountryFlag(row.country)} {row.country}</span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className="text-xs text-slate-600">{fmtDate(row.requestDate)}</span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {row.responseTime !== null ? (
                              <div className="flex items-center gap-2">
                                <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full rounded-full",
                                      row.responseTime <= 3 ? "bg-emerald-500" : row.responseTime <= 7 ? "bg-amber-500" : "bg-red-500"
                                    )}
                                    style={{ width: `${Math.min(100, (row.responseTime / 30) * 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-slate-600 font-medium">{row.responseTime}d</span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">&mdash;</span>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {row.chinaTime !== null ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-600">{row.chinaTime}d</span>
                                <span
                                  className={cn(
                                    "w-2 h-2 rounded-full shrink-0",
                                    row.chinaStatus === "A tiempo" ? "bg-emerald-500" : "bg-red-500"
                                  )}
                                  title={row.chinaStatus || ""}
                                />
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">&mdash;</span>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className="text-xs text-slate-600">{row.contractNo || "—"}</span>
                          </td>
                          <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  <MoreHorizontal className="w-4 h-4 text-slate-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openViewDialog(row)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver detalle
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditDialog(row)}>
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setExpandedRow(isExpanded ? null : globalIdx)}>
                                  <ChevronDown className="w-4 h-4 mr-2" />
                                  {isExpanded ? "Colapsar" : "Expandir"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>

                        {/* Expandable Row Detail */}
                        {isExpanded && (
                          <tr className="bg-slate-50/70">
                            <td colSpan={12} className="px-5 py-4">
                              <div className="grid grid-cols-3 gap-6">
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Materiales</h4>
                                  <p className="text-sm text-slate-700 leading-relaxed">{row.materials}</p>
                                  {row.contractNo && (
                                    <div className="mt-3">
                                      <span className="text-xs text-slate-500">Contrato: </span>
                                      <span className="text-xs font-medium text-slate-700">{row.contractNo}</span>
                                    </div>
                                  )}
                                  {row.contractDate && (
                                    <div className="mt-1">
                                      <span className="text-xs text-slate-500">Fecha contrato: </span>
                                      <span className="text-xs font-medium text-slate-700">{fmtDate(row.contractDate)}</span>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Seguimiento China</h4>
                                  {row.chinaTime !== null ? (
                                    <div>
                                      <div className="text-3xl font-bold text-slate-900">
                                        {row.chinaTime}<span className="text-sm font-normal text-slate-400 ml-1">días</span>
                                      </div>
                                      <div className="mt-2 flex items-center gap-2">
                                        {row.chinaStatus && (
                                          <span className={cn(
                                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                                            row.chinaStatus === "A tiempo"
                                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                              : "bg-red-50 text-red-700 border border-red-200"
                                          )}>
                                            {row.chinaStatus === "A tiempo" ? "✓" : "⚠"} {row.chinaStatus}
                                          </span>
                                        )}
                                      </div>
                                      <div className="mt-2 w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                          className={cn("h-full rounded-full", row.chinaStatus === "A tiempo" ? "bg-emerald-500" : "bg-red-500")}
                                          style={{ width: `${Math.min(100, (row.chinaTime / 90) * 100)}%` }}
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-slate-400">Sin datos</p>
                                  )}
                                </div>
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Info adicional</h4>
                                  <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-500">Fecha solicitud</span>
                                      <span className="text-slate-700 font-medium">{fmtDate(row.requestDate)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-500">Fecha emisión</span>
                                      <span className="text-slate-700 font-medium">{fmtDate(row.issueDate)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-500">Tiempo respuesta</span>
                                      <span className="text-slate-700 font-medium">
                                        {row.responseTime !== null ? `${row.responseTime} días` : "—"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-500">Días transcurridos</span>
                                      <span className="text-slate-700 font-medium">
                                        {row.daysElapsed !== null ? `${row.daysElapsed} días` : "—"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-500">País / Continente</span>
                                      <span className="text-slate-700 font-medium">
                                        {getCountryFlag(row.country)} {row.country} / {row.continent}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={12} className="py-16 text-center text-sm text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <AlertTriangle className="w-8 h-8 text-slate-300" />
                          <span>No se encontraron cotizaciones con los filtros aplicados</span>
                          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs mt-1">
                            Limpiar filtros
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {sorted.length > 0 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200">
                <span className="text-xs text-slate-500">
                  Mostrando {Math.min((currentPage - 1) * PAGE_SIZE + 1, sorted.length)}
                  {" - "}
                  {Math.min(currentPage * PAGE_SIZE, sorted.length)} de {sorted.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      if (totalPages <= 7) return true;
                      if (p === 1 || p === totalPages) return true;
                      if (Math.abs(p - currentPage) <= 1) return true;
                      return false;
                    })
                    .reduce<(number | "ellipsis")[]>((acc, p, i, arr) => {
                      if (i > 0) {
                        const prev = arr[i - 1];
                        if (p - prev > 1) acc.push("ellipsis");
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, i) =>
                      item === "ellipsis" ? (
                        <span key={`e${i}`} className="px-1 text-xs text-slate-400">...</span>
                      ) : (
                        <Button
                          key={item}
                          variant={currentPage === item ? "default" : "outline"}
                          size="sm"
                          className={cn("h-8 w-8 p-0 text-xs", currentPage === item && "bg-[#2563EB] text-white hover:bg-[#1D4ED8]")}
                          onClick={() => setCurrentPage(item)}
                        >
                          {item}
                        </Button>
                      )
                    )}
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* KANBAN VIEW */}
        {viewMode === "kanban" && (
          <div className="grid grid-cols-4 gap-4 p-5">
            {(["Pendiente cotización", "En negociación", "Aprobado", "Finalizado"] as const).map((status) => {
              const sc = STATUS_CONFIG[status];
              const items = filtered.filter((r) => r.status === status);
              return (
                <div key={status} className="flex flex-col">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sc.color }} />
                      <span className="text-sm font-semibold text-slate-700">{sc.label}</span>
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: sc.color, backgroundColor: sc.bg }}>
                      {items.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 min-h-[120px] bg-slate-50/60 rounded-xl p-2">
                    {items.length === 0 && (
                      <div className="flex items-center justify-center h-24 text-xs text-slate-400">Sin cotizaciones</div>
                    )}
                    {items.map((item, idx) => {
                      const catCfg = CATEGORY_CONFIG[item.category];
                      return (
                        <div
                          key={`${status}-${idx}`}
                          className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md transition-all cursor-pointer"
                          onClick={() => openViewDialog(item)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {item.id || "S/N"}
                            </span>
                            {catCfg && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ color: catCfg.color, backgroundColor: catCfg.bg }}>
                                {catCfg.short}
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-medium text-slate-900 truncate">{item.customer}</div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">{item.materials}</div>
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: avatarColor(item.requestedBy) }}>
                                {initials(item.requestedBy)}
                              </div>
                              <span className="text-[10px] text-slate-500">{item.requestedBy}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.responseTime !== null && (
                                <span className="text-[10px] text-slate-500">{item.responseTime}d</span>
                              )}
                              {item.chinaStatus && (
                                <span className={cn("w-2 h-2 rounded-full", item.chinaStatus === "A tiempo" ? "bg-emerald-500" : "bg-red-500")} title={item.chinaStatus} />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MANAGE COMMERCIALS DIALOG */}
      <Dialog open={commercialsOpen} onOpenChange={setCommercialsOpen}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2A4D7A] px-6 py-4">
            <DialogHeader>
              <DialogTitle className="text-white text-base font-bold">Gestionar Comerciales</DialogTitle>
              <DialogDescription className="text-blue-200 text-xs">
                Añade, edita o elimina comerciales del sistema
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Nombre del comercial..."
                value={newCommercialName}
                onChange={(e) => setNewCommercialName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCommercial()}
                className="flex-1 rounded-xl"
              />
              <Button onClick={handleAddCommercial} size="sm" className="rounded-xl bg-[#1E3A5F] hover:bg-[#2A4D7A] gap-1">
                <Plus className="w-3.5 h-3.5" />
                Añadir
              </Button>
            </div>
            <div className="max-h-[320px] overflow-y-auto space-y-1">
              {commercials.map((name) => {
                const isEditing = editingCommercial?.old === name;
                const count = data.filter(d => d.requestedBy === name).length;
                return (
                  <div key={name} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 group transition-colors">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: avatarColor(name) }}>
                      {initials(name)}
                    </div>
                    {isEditing ? (
                      <Input
                        value={editingCommercial.new}
                        onChange={(e) => setEditingCommercial({ ...editingCommercial, new: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") handleRenameCommercial(); if (e.key === "Escape") setEditingCommercial(null); }}
                        className="flex-1 h-7 text-xs rounded-lg"
                        autoFocus
                      />
                    ) : (
                      <span className="flex-1 text-xs font-medium text-slate-700">{name}</span>
                    )}
                    <span className="text-[10px] text-slate-400 tabular-nums">{count} cot.</span>
                    {!isEditing && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingCommercial({ old: name, new: name })} className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleDeleteCommercial(name)} className="p-1 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {isEditing && (
                      <div className="flex items-center gap-0.5">
                        <button onClick={handleRenameCommercial} className="p-1 rounded-md hover:bg-emerald-50 text-emerald-500">
                          <Check className="w-3 h-3" />
                        </button>
                        <button onClick={() => setEditingCommercial(null)} className="p-1 rounded-md hover:bg-slate-200 text-slate-400">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 text-center">
              Los cambios se reflejan en todos los módulos
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* QUOTATION DIALOG (view / edit / create) */}
      <QuotationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        mode={dialogMode}
        quotation={dialogQuotation}
        commercials={commercials}
        onSave={handleSaveQuotation}
        onModeChange={setDialogMode}
      />
    </>
  );
}
