"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Download, Loader2, Users, RefreshCw, FileDown, Search, X, ChevronDown, Check, Filter } from "lucide-react";
import { addLogoToWorkbook, addLogoToHeader } from "@/lib/excel-logo";
import { generatePDFReport, type PDFColumn } from "@/lib/pdf-report";
import { T } from "@/lib/design-tokens";
import { Button } from "@/components/ui/button";
import ColumnSelector from "@/components/documents/ColumnSelector";
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
  return n.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

// ---------------------------------------------------------------------------
// Filter Popover Component
// ---------------------------------------------------------------------------

function FilterPopover({
  label, options, selected, onChange, accentColor = T.accent,
}: {
  label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void; accentColor?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));
  const isActive = selected.length > 0;

  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter((s) => s !== val) : [...selected, val]);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 8,
          border: `1px solid ${isActive ? accentColor + "40" : T.borderLight}`,
          background: isActive ? accentColor + "08" : T.surface,
          color: isActive ? accentColor : T.inkMuted,
          fontSize: 12, fontWeight: 600, cursor: "pointer",
          transition: "all 0.15s ease",
        }}
      >
        {label}
        {isActive && (
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 18, height: 18, borderRadius: 5,
            background: accentColor, color: "#fff", fontSize: 10, fontWeight: 700,
          }}>{selected.length}</span>
        )}
        <ChevronDown className="w-3 h-3" style={{ opacity: 0.5 }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50,
          width: 260, maxHeight: 320, borderRadius: 12,
          background: "rgba(255,255,255,0.97)", backdropFilter: "blur(16px)",
          border: `1px solid ${T.borderLight}`, boxShadow: T.shadowLg,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{ padding: "8px 10px", borderBottom: `1px solid ${T.borderLight}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 6, background: T.surfaceAlt, border: `1px solid ${T.borderLight}` }}>
              <Search className="w-3 h-3" style={{ color: T.inkLight, flexShrink: 0 }} />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..." autoFocus
                style={{ border: "none", background: "transparent", outline: "none", fontSize: 12, color: T.ink, width: "100%", fontFamily: "inherit" }}
              />
              {search && <X className="w-3 h-3 cursor-pointer" style={{ color: T.inkLight }} onClick={() => setSearch("")} />}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 6px" }}>
            {filtered.length === 0 && (
              <div style={{ padding: 12, fontSize: 12, color: T.inkLight, textAlign: "center" }}>Sin resultados</div>
            )}
            {filtered.map((opt) => {
              const isSelected = selected.includes(opt);
              return (
                <div
                  key={opt} onClick={() => toggle(opt)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                    borderRadius: 6, cursor: "pointer", marginBottom: 1,
                    background: isSelected ? accentColor + "0A" : "transparent",
                    transition: "background 0.1s",
                  }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: isSelected ? accentColor : T.surfaceAlt,
                    border: `1.5px solid ${isSelected ? accentColor : T.border}`,
                  }}>
                    {isSelected && <Check className="w-2.5 h-2.5" style={{ color: "#fff" }} />}
                  </div>
                  <span style={{ fontSize: 12, color: isSelected ? T.ink : T.inkSoft, fontWeight: isSelected ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {opt}
                  </span>
                </div>
              );
            })}
          </div>
          {selected.length > 0 && (
            <div style={{ padding: "6px 10px", borderTop: `1px solid ${T.borderLight}` }}>
              <button onClick={() => { onChange([]); setOpen(false); }} style={{
                width: "100%", padding: "5px 0", borderRadius: 6, border: "none",
                background: T.surfaceAlt, color: T.inkMuted, fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}>Limpiar filtro</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ClientsReportPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCommercial, setFilterCommercial] = useState<string[]>([]);
  const [filterClient, setFilterClient] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterIncoterm, setFilterIncoterm] = useState<string[]>([]);
  const [filterPort, setFilterPort] = useState<string[]>([]);
  const [filterProductType, setFilterProductType] = useState<string[]>([]);

  // Filter options from API
  const [filterOptions, setFilterOptions] = useState<{
    commercial_names: string[]; client_names: string[]; arrival_ports: string[]; incoterms: string[]; product_types: string[];
  }>({ commercial_names: [], client_names: [], arrival_ports: [], incoterms: [], product_types: [] });

  // Column selector
  const [excelSelectorOpen, setExcelSelectorOpen] = useState(false);
  const [pdfSelectorOpen, setPdfSelectorOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Build API params from filters
  const buildParams = useCallback((overrides?: { pageSize?: number }) => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filterCommercial.length) params.set("commercial_name", filterCommercial.join(","));
    if (filterClient.length) params.set("client_name", filterClient.join(","));
    if (filterStatus.length) params.set("status", filterStatus.join(","));
    if (filterIncoterm.length) params.set("incoterm", filterIncoterm.join(","));
    if (filterPort.length) params.set("arrival_port", filterPort.join(","));
    if (filterProductType.length) {
      const defined = filterProductType.filter((v) => v !== "SIN_DEFINIR");
      const hasUndefined = filterProductType.includes("SIN_DEFINIR");
      if (defined.length) params.set("product_type", defined.join(","));
      if (hasUndefined) params.set("product_type_undefined", "true");
    }
    params.set("sort_field", "client_name");
    params.set("sort_direction", "asc");
    params.set("page", "1");
    params.set("pageSize", String(overrides?.pageSize ?? 5000));
    return params;
  }, [debouncedSearch, filterCommercial, filterClient, filterStatus, filterIncoterm, filterPort, filterProductType]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildParams();
      const res = await fetch(`/api/contracts?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setContracts(json.data || []);
      }
    } catch {
      toast.error("Error al cargar contratos");
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch filter options
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await fetch("/api/contracts/filters");
        if (res.ok) {
          const data = await res.json();
          setFilterOptions({
            commercial_names: data.commercial_names || [],
            client_names: data.client_names || [],
            arrival_ports: data.arrival_ports || [],
            incoterms: data.incoterms || [],
            product_types: data.product_types || [],
          });
        }
      } catch { /* ignore */ }
    };
    fetchFilters();
  }, []);

  // Active filter count
  const activeFilterCount = [filterCommercial, filterClient, filterStatus, filterIncoterm, filterPort, filterProductType].filter((f) => f.length > 0).length;

  const clearAllFilters = () => {
    setSearchQuery(""); setFilterCommercial([]); setFilterClient([]);
    setFilterStatus([]); setFilterIncoterm([]); setFilterPort([]);
    setFilterProductType([]);
  };

  // Group contracts by client
  const clientGroups = contracts.reduce((acc, c) => {
    const key = c.client_name || "Sin cliente";
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {} as Record<string, Contract[]>);

  const sortedClients = Object.keys(clientGroups).sort((a, b) => a.localeCompare(b));

  // ---------------------------------------------------------------------------
  // All PDF Columns (same as contracts module)
  // ---------------------------------------------------------------------------
  const allPDFColumns: PDFColumn[] = [
    { header: "FECHA", dataKey: "contract_date", width: 0.8, halign: "center" },
    { header: "CONTRATO CHINA", dataKey: "china_contract", width: 1.2, bold: true, color: "#1E3A5F" },
    { header: "CONTRATO CLIENTE", dataKey: "client_contract", width: 1.1, bold: true, color: "#1E3A5F" },
    { header: "COMERCIAL", dataKey: "commercial_name", width: 1.1, bold: true },
    { header: "CLIENTE", dataKey: "client_name", width: 1.4 },
    { header: "PAIS", dataKey: "country", width: 0.7, halign: "center" },
    { header: "DETALLE", dataKey: "detail", width: 2 },
    { header: "TONS ACORDADAS", dataKey: "tons_agreed", width: 0.9, halign: "right" },
    { header: "TONS EMBARCADAS", dataKey: "tons_shipped", width: 0.9, halign: "right" },
    { header: "INCOTERM", dataKey: "incoterm", width: 0.7, halign: "center" },
    { header: "FECHA EXW", dataKey: "exw_date", width: 0.8, halign: "center" },
    { header: "ESTADO", dataKey: "status", width: 1.2, halign: "center", bold: true },
    { header: "ETA FINAL", dataKey: "eta_final", width: 0.8, halign: "center" },
    { header: "MOTONAVE", dataKey: "vessel_name", width: 1 },
    { header: "No BL", dataKey: "bl_number", width: 1 },
    { header: "PUERTO", dataKey: "arrival_port", width: 0.9 },
    { header: "ANTICIPO", dataKey: "advance_paid", width: 0.7, halign: "center" },
    { header: "SALDO", dataKey: "balance_paid", width: 0.7, halign: "center" },
    { header: "PDTE. (USD)", dataKey: "pending_amount", width: 1, halign: "right", bold: true, color: "#B45309" },
    { header: "NOTAS", dataKey: "notes", width: 1.5 },
  ];

  // Columnas marcadas por defecto al abrir el selector (Excel y PDF):
  // contrato cliente, cliente, detalle, tons acordadas/embarcadas, estado,
  // ETA final, motonave, BL, puerto llegada y valor pendiente.
  const defaultSelectedColumns = [
    "client_contract",
    "client_name",
    "detail",
    "tons_agreed",
    "tons_shipped",
    "status",
    "eta_final",
    "vessel_name",
    "bl_number",
    "arrival_port",
    "pending_amount",
  ];

  // ---------------------------------------------------------------------------
  // Excel Export
  // ---------------------------------------------------------------------------

  const handleDownloadExcel = async (selectedColumns?: PDFColumn[]) => {
    try {
      toast.info("Generando reporte Excel...");

      const params = buildParams({ pageSize: 5000 });
      const res = await fetch(`/api/contracts?${params.toString()}`);
      if (!res.ok) throw new Error("Error al obtener los contratos");
      const { data: allContracts } = await res.json();
      const exportData: Contract[] = allContracts || [];

      const excelMod = await import("exceljs");
      const ExcelJS = excelMod.default || excelMod;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "IBC Steel Group - IBC Core";
      workbook.created = new Date();

      const ws = workbook.addWorksheet("Reporte Clientes", {
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
        "EN TRÁNSITO":         { bg: "E8F0FE", text: "0B5394" },
        "EN PRODUCCIÓN":       { bg: "FFF8EB", text: "DC8B0B" },
        "ANULADO":             { bg: "FFF1F2", text: "E63946" },
        "PENDIENTE ANTICIPO":  { bg: "F1F5F9", text: "64748B" },
      };

      const balanceStyles: Record<string, { bg: string; text: string }> = {
        "PENDIENTE": { bg: "FFF8EB", text: "DC8B0B" },
        "OK":        { bg: "ECFDF3", text: "0D9F6E" },
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

      // Column config filtered by selection
      const selectedKeys = selectedColumns ? new Set(selectedColumns.map(c => c.dataKey)) : null;
      const allExcelCols = [
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
      const keyMap: Record<string, string> = { pending_amount: "pending_client_amount" };
      const filteredExcelCols = selectedKeys
        ? allExcelCols.filter(c => selectedKeys.has(c.key) || selectedKeys.has(Object.entries(keyMap).find(([, v]) => v === c.key)?.[0] || ""))
        : allExcelCols;
      ws.columns = filteredExcelCols;

      const totalCols = ws.columns.length;
      const now = new Date();
      const dateStr = now.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });

      const totalTonsAgreed = exportData.reduce((s: number, c: Contract) => s + (c.tons_agreed ?? 0), 0);
      const totalTonsShipped = exportData.reduce((s: number, c: Contract) => s + (c.tons_shipped ?? 0), 0);
      const totalPendingAmount = exportData.reduce((s: number, c: Contract) => s + (c.pending_client_amount ?? 0), 0);

      // Filter description
      const filterDesc: string[] = [];
      if (filterCommercial.length) filterDesc.push(`Comercial: ${filterCommercial.join(", ")}`);
      if (filterClient.length) filterDesc.push(`Cliente: ${filterClient.join(", ")}`);
      if (filterStatus.length) filterDesc.push(`Estado: ${filterStatus.join(", ")}`);
      if (filterIncoterm.length) filterDesc.push(`Incoterm: ${filterIncoterm.join(", ")}`);
      if (filterPort.length) filterDesc.push(`Puerto: ${filterPort.join(", ")}`);
      if (filterProductType.length) filterDesc.push(`Tipo: ${filterProductType.join(", ")}`);
      if (debouncedSearch) filterDesc.push(`Busqueda: "${debouncedSearch}"`);

      // ROW 1: Header
      const r1 = ws.addRow([""]);

      const c1 = ws.getCell("A1");
      c1.value = { richText: [
        { text: "                              ", font: { name: FONT, size: 16, color: { argb: NAVY } } },
        { text: "REPORTE DE CLIENTES", font: { name: FONT, size: 12, bold: true, color: { argb: WHITE } } },
        { text: `     ${dateStr}  ·  ${exportData.length} registros  ·  ${new Set(exportData.map(c => c.client_name)).size} clientes`, font: { name: FONT, size: 9, color: { argb: "D0DCE8" } } },
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

      r2.height = 5;
      for (let col = 1; col <= totalCols; col++) {
        r2.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
      }

      // ROW 3: Column headers
      const allColHeaders: Record<string, string> = {
        contract_date: "FECHA", china_contract: "CONTRATO CHINA", client_contract: "CONTRATO CLIENTE",
        commercial_name: "COMERCIAL", client_name: "CLIENTE", country: "PAIS",
        detail: "DETALLE DE PRODUCTO", tons_agreed: "TONS ACORDADAS", tons_shipped: "TONS EMBARCADAS",
        incoterm: "INCOTERM", exw_date: "FECHA EXW", status: "ESTADO", eta_final: "ETA FINAL",
        vessel_name: "MOTONAVE", bl_number: "NUMERO BL", arrival_port: "PUERTO LLEGADA",
        advance_paid: "ANTICIPO", balance_paid: "SALDO", pending_client_amount: "VALOR PDTE. (USD)", notes: "NOTAS",
      };
      const colHeaders = filteredExcelCols.map(c => allColHeaders[c.key] || c.key);
      const headerDataRow = ws.addRow(colHeaders);
      headerDataRow.height = 32;
      headerDataRow.eachCell((cell, colNumber) => {
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

      // DATA ROWS — grouped by client
      const STRIPE_A = WHITE;
      const STRIPE_B = "F8F7F5";

      // Sort by client_name then by contract_date desc
      const sortedData = [...exportData].sort((a, b) => {
        const nameCompare = (a.client_name || "").localeCompare(b.client_name || "");
        if (nameCompare !== 0) return nameCompare;
        return (b.contract_date || "").localeCompare(a.contract_date || "");
      });

      sortedData.forEach((c: Contract, idx: number) => {
        const allValues: Record<string, unknown> = {
          contract_date: toDate(c.contract_date),
          china_contract: c.china_contract || "",
          client_contract: c.client_contract || "",
          commercial_name: c.commercial_name || "",
          client_name: c.client_name || "",
          country: c.country || "",
          detail: c.detail || "",
          tons_agreed: c.tons_agreed ?? "",
          tons_shipped: c.tons_shipped ?? "",
          incoterm: c.incoterm || "",
          exw_date: toDate(c.exw_date),
          status: c.status || "",
          eta_final: toDate(c.eta_final),
          vessel_name: c.vessel_name || "",
          bl_number: c.bl_number || "",
          arrival_port: c.arrival_port || "",
          advance_paid: c.advance_paid || "",
          balance_paid: c.balance_paid || "",
          pending_client_amount: c.pending_client_amount ?? "",
          notes: c.notes || "",
        };
        const rowValues = filteredExcelCols.map(col => allValues[col.key] ?? "");
        const row = ws.addRow(rowValues);

        const isEven = idx % 2 === 0;
        const rowBg = isEven ? STRIPE_A : STRIPE_B;

        row.eachCell((cell, colNumber) => {
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

          const colKey = filteredExcelCols[colNumber - 1]?.key;
          const dateKeys = ["contract_date", "exw_date", "eta_final"];
          const centerKeys = ["country", "incoterm", "advance_paid", "balance_paid"];
          const tonsKeys = ["tons_agreed", "tons_shipped"];

          if (dateKeys.includes(colKey) && cell.value instanceof Date) {
            cell.numFmt = "DD/MM/YYYY";
            cell.alignment = { horizontal: "center", vertical: "middle" };
          } else if (dateKeys.includes(colKey)) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }

          if (colKey === "status" && c.status) {
            const st = statusStyles[c.status] || { bg: "F1F5F9", text: "64748B" };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: st.bg } };
            cell.font = { name: FONT, size: 8.5, bold: true, color: { argb: st.text } };
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }

          if (colKey === "balance_paid" && c.balance_paid) {
            const bs = balanceStyles[c.balance_paid] || null;
            if (bs) {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bs.bg } };
              cell.font = { name: FONT, size: 8.5, bold: true, color: { argb: bs.text } };
              cell.alignment = { horizontal: "center", vertical: "middle" };
            }
          }

          if (colKey === "pending_client_amount") {
            if (typeof cell.value === "number") {
              cell.numFmt = '"USD "#,##0.00';
              cell.alignment = { horizontal: "right", vertical: "middle" };
              if (cell.value > 0) cell.font = { name: FONT, size: 9.5, bold: true, color: { argb: "B45309" } };
            } else {
              cell.alignment = { horizontal: "right", vertical: "middle" };
            }
          }

          if (tonsKeys.includes(colKey) && typeof cell.value === "number") {
            cell.numFmt = "#,##0.00";
            cell.alignment = { horizontal: "right", vertical: "middle" };
            cell.font = { name: FONT, size: 9.5, color: { argb: INK } };
          }

          if (centerKeys.includes(colKey)) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }

          if (colKey === "detail" || colKey === "notes") {
            cell.alignment = { ...cell.alignment, wrapText: true };
          }

          if (colKey === "client_name" && cell.value) {
            cell.font = { name: FONT, size: 9.5, bold: true, color: { argb: INK } };
          }
          if ((colKey === "china_contract" || colKey === "client_contract") && cell.value) {
            cell.font = { name: FONT, size: 9.5, bold: true, color: { argb: NAVY } };
          }
          if (colKey === "commercial_name" && cell.value) {
            cell.font = { name: FONT, size: 9.5, bold: true, color: { argb: INK } };
          }
        });

        row.height = 26;
      });

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
      // Place totals in the correct filtered columns
      const tonsAgreedIdx = filteredExcelCols.findIndex(c => c.key === "tons_agreed");
      const tonsShippedIdx = filteredExcelCols.findIndex(c => c.key === "tons_shipped");
      const pendingIdx = filteredExcelCols.findIndex(c => c.key === "pending_client_amount");
      const detailIdx = filteredExcelCols.findIndex(c => c.key === "detail");

      if (detailIdx >= 0) {
        totalsRow.getCell(detailIdx + 1).value = "TOTALES";
        totalsRow.getCell(detailIdx + 1).alignment = { horizontal: "right", vertical: "middle" };
      } else {
        totalsRow.getCell(1).value = "TOTALES";
        totalsRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
      }
      if (tonsAgreedIdx >= 0) {
        totalsRow.getCell(tonsAgreedIdx + 1).value = totalTonsAgreed;
        totalsRow.getCell(tonsAgreedIdx + 1).numFmt = "#,##0.00";
        totalsRow.getCell(tonsAgreedIdx + 1).alignment = { horizontal: "right", vertical: "middle" };
      }
      if (tonsShippedIdx >= 0) {
        totalsRow.getCell(tonsShippedIdx + 1).value = totalTonsShipped;
        totalsRow.getCell(tonsShippedIdx + 1).numFmt = "#,##0.00";
        totalsRow.getCell(tonsShippedIdx + 1).alignment = { horizontal: "right", vertical: "middle" };
      }
      if (pendingIdx >= 0) {
        totalsRow.getCell(pendingIdx + 1).value = totalPendingAmount;
        totalsRow.getCell(pendingIdx + 1).numFmt = '"USD "#,##0.00';
        totalsRow.getCell(pendingIdx + 1).alignment = { horizontal: "right", vertical: "middle" };
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
        { text: "IBC Core", font: { name: FONT, size: 8.5, bold: true, color: { argb: NAVY } } },
        { text: `  ·  Generado: ${now.toLocaleString("es-CO")}  ·  © ${now.getFullYear()} IBC STEEL GROUP`, font: { name: FONT, size: 8, italic: true, color: { argb: INK_LIGHT } } },
      ] };
      footerCell.alignment = { horizontal: "center", vertical: "middle" };
      footerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WARM_BG } };
      footerCell.border = { top: { style: "thin" as const, color: { argb: BORDER } } };
      footerRow.height = 24;

      ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: totalCols } };
      ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Reporte_Clientes_IBC_${now.toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Reporte Excel descargado exitosamente");
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.error("Error al generar el reporte Excel");
    }
  };

  // ---------------------------------------------------------------------------
  // PDF Export
  // ---------------------------------------------------------------------------

  const handleDownloadPDF = async (selectedColumns?: PDFColumn[]) => {
    try {
      toast.info("Generando reporte PDF...");

      const params = buildParams({ pageSize: 5000 });
      const res = await fetch(`/api/contracts?${params.toString()}`);
      if (!res.ok) throw new Error("Error al obtener los contratos");
      const { data: allContracts } = await res.json();
      const exportData: Contract[] = allContracts || [];

      const cols = selectedColumns || allPDFColumns;

      await generatePDFReport({
        title: "REPORTE DE CLIENTES",
        subtitle: `${exportData.length} registros · ${new Set(exportData.map(c => c.client_name)).size} clientes`,
        filename: "Reporte_Clientes_IBC",
        recordLabel: "registros",
        orientation: "landscape",
        columns: cols,
        data: exportData.map((c) => ({
          contract_date: fmtDate(c.contract_date),
          china_contract: c.china_contract || "",
          client_contract: c.client_contract || "",
          commercial_name: c.commercial_name || "",
          client_name: c.client_name || "",
          country: c.country || "",
          detail: c.detail || "",
          tons_agreed: fmtNum(c.tons_agreed),
          tons_shipped: fmtNum(c.tons_shipped),
          incoterm: c.incoterm || "",
          exw_date: fmtDate(c.exw_date),
          status: c.status || "",
          eta_final: fmtDate(c.eta_final),
          vessel_name: c.vessel_name || "",
          bl_number: c.bl_number || "",
          arrival_port: c.arrival_port || "",
          advance_paid: c.advance_paid || "",
          balance_paid: c.balance_paid || "",
          pending_amount: fmtNum(c.pending_client_amount),
          notes: c.notes || "",
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

  const STATUS_OPTIONS = ["EN PRODUCCIÓN", "EN TRÁNSITO", "ENTREGADO AL CLIENTE", "ANULADO", "PENDIENTE ANTICIPO"];

  return (
    <div style={{ background: T.glassBg, backdropFilter: T.glassBlur, border: "1px solid " + T.glassBorder, borderRadius: T.radius, boxShadow: T.shadowGlass, padding: "24px 28px" }}>
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink }}>Reporte de Clientes</h1>
          <p style={{ fontSize: 13, color: T.inkMuted, marginTop: 4 }}>
            Contratos agrupados por cliente — <span style={{ fontWeight: 600, color: T.inkSoft }}>{sortedClients.length} clientes</span> · <span style={{ fontWeight: 600, color: T.inkSoft }}>{contracts.length} contratos</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">{sortedClients.length}</span>
            <span className="text-xs text-blue-600">clientes</span>
          </div>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl border-slate-200" onClick={fetchData}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button size="sm" className="h-9 gap-1.5 rounded-xl" variant="outline" onClick={() => setPdfSelectorOpen(true)} style={{ background: T.gradientPrimary, border: "none", boxShadow: T.shadowMd, color: "white" }}>
            <FileDown className="w-3.5 h-3.5" /> Export PDF
          </Button>
          <Button size="sm" className="h-9 gap-1.5 rounded-xl" onClick={() => setExcelSelectorOpen(true)} style={{ background: T.gradientPrimary, border: "none", boxShadow: T.shadowMd, color: "white" }}>
            <Download className="w-3.5 h-3.5" /> Export Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
          borderRadius: 8, background: T.surface, border: `1px solid ${T.borderLight}`, minWidth: 200,
        }}>
          <Search className="w-3.5 h-3.5" style={{ color: T.inkLight, flexShrink: 0 }} />
          <input
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar cliente, contrato..."
            style={{ border: "none", background: "transparent", outline: "none", fontSize: 12, color: T.ink, width: "100%", fontFamily: "inherit" }}
          />
          {searchQuery && <X className="w-3.5 h-3.5 cursor-pointer" style={{ color: T.inkLight }} onClick={() => setSearchQuery("")} />}
        </div>

        <FilterPopover label="Comercial" options={filterOptions.commercial_names} selected={filterCommercial} onChange={setFilterCommercial} />
        <FilterPopover label="Cliente" options={filterOptions.client_names} selected={filterClient} onChange={setFilterClient} />
        <FilterPopover label="Estado" options={STATUS_OPTIONS} selected={filterStatus} onChange={setFilterStatus} />
        <FilterPopover label="Incoterm" options={filterOptions.incoterms} selected={filterIncoterm} onChange={setFilterIncoterm} />
        <FilterPopover label="Puerto" options={filterOptions.arrival_ports} selected={filterPort} onChange={setFilterPort} />
        <FilterPopover label="Tipo" options={[...filterOptions.product_types, "SIN_DEFINIR"]} selected={filterProductType} onChange={setFilterProductType} />

        {activeFilterCount > 0 && (
          <button onClick={clearAllFilters} style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "6px 12px", borderRadius: 8,
            border: `1px solid ${T.dangerSoft}`, background: T.dangerBg + "40",
            color: T.danger, fontSize: 11, fontWeight: 600, cursor: "pointer",
          }}>
            <X className="w-3 h-3" />
            Limpiar ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ borderRadius: T.radiusMd, border: "1px solid " + T.borderLight, overflow: "hidden", boxShadow: T.shadowMd }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: T.accent }} />
            <span style={{ marginLeft: 8, fontSize: 13, color: T.inkMuted }}>Cargando datos...</span>
          </div>
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20" style={{ color: T.inkLight }}>
            <Users className="w-10 h-10 mb-3" />
            <p className="text-sm font-medium">No hay contratos con los filtros seleccionados</p>
          </div>
        ) : (
          <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: "15%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "7%" }} />
              </colgroup>
              <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                <tr style={{ background: "rgba(11,83,148,0.03)" }}>
                  {["CLIENTE", "CONTRATO", "DETALLE", "TONS", "EMBAR.", "ESTADO", "ETA", "MOTONAVE", "PUERTO", "ANTIC.", "PDTE USD"].map((h) => (
                    <th key={h} className="px-2 py-2.5 text-left" style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em", background: T.surface }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedClients.map((clientName) => {
                  const group = clientGroups[clientName];
                  const clientTons = group.reduce((s, c) => s + (c.tons_agreed ?? 0), 0);
                  return group.map((c, idx) => (
                    <tr key={c.id || `${clientName}-${idx}`} className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-blue-50/40 transition-colors`}
                      style={idx === 0 ? { borderTop: `2px solid ${T.borderLight}` } : undefined}>
                      {idx === 0 ? (
                        <td className="px-2 py-1.5 text-[11px] font-bold text-slate-800 align-top" rowSpan={group.length} style={{ borderRight: `2px solid ${T.borderLight}`, background: "rgba(11,83,148,0.02)" }}>
                          <div>{clientName}</div>
                          <div style={{ fontSize: 10, color: T.inkLight, fontWeight: 500, marginTop: 2 }}>{group.length} contrato{group.length > 1 ? "s" : ""} · {fmtNum(clientTons)} tons</div>
                        </td>
                      ) : null}
                      <td className="px-2 py-1.5 text-[11px] font-semibold text-[#1E3A5F] truncate" title={c.china_contract || ""}>{c.china_contract || ""}</td>
                      <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate" title={c.detail || ""}>{c.detail || ""}</td>
                      <td className="px-2 py-1.5 text-[11px] text-slate-600 text-right tabular-nums">{fmtNum(c.tons_agreed)}</td>
                      <td className="px-2 py-1.5 text-[11px] text-slate-600 text-right tabular-nums">{fmtNum(c.tons_shipped)}</td>
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
                  ));
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p style={{ fontSize: 11, color: T.inkLight, textAlign: "center" }}>Vista previa agrupada por cliente · El archivo Excel/PDF contiene todas las columnas seleccionadas</p>
    </div>

    {/* Column Selectors */}
    <ColumnSelector
      open={excelSelectorOpen}
      onClose={() => setExcelSelectorOpen(false)}
      allColumns={allPDFColumns}
      defaultSelected={defaultSelectedColumns}
      onGenerate={(cols) => { setExcelSelectorOpen(false); handleDownloadExcel(cols); }}
      title="Seleccionar columnas (Excel)"
    />
    <ColumnSelector
      open={pdfSelectorOpen}
      onClose={() => setPdfSelectorOpen(false)}
      allColumns={allPDFColumns}
      defaultSelected={defaultSelectedColumns}
      onGenerate={(cols) => { setPdfSelectorOpen(false); handleDownloadPDF(cols); }}
      title="Seleccionar columnas (PDF)"
    />
    </div>
  );
}
