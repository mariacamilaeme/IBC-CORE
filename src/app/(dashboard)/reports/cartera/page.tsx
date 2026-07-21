"use client";

import { Download, RefreshCw, FileDown, Search, X, FolderDown } from "lucide-react";
import { T } from "@/lib/design-tokens";
import { Button } from "@/components/ui/button";
import { useCarteraData, FilterPopover, STATUS_OPTIONS, labelFor } from "./_core";
import VariantAurora from "./_variant-aurora";

export default function CarteraReportPage() {
  const d = useCarteraData();

  return (
    <div style={{ background: T.glassBg, backdropFilter: T.glassBlur, border: "1px solid " + T.glassBorder, borderRadius: T.radius, boxShadow: T.shadowGlass, padding: "22px 26px" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: T.surface, border: `1px solid ${T.borderLight}`, minWidth: 210 }}>
          <Search className="w-3.5 h-3.5" style={{ color: T.inkLight, flexShrink: 0 }} />
          <input value={d.searchQuery} onChange={(e) => d.setSearchQuery(e.target.value)} placeholder="Buscar cliente, contrato, material..."
            style={{ border: "none", background: "transparent", outline: "none", fontSize: 12, color: T.ink, width: "100%", fontFamily: "inherit" }} />
          {d.searchQuery && <X className="w-3.5 h-3.5 cursor-pointer" style={{ color: T.inkLight }} onClick={() => d.setSearchQuery("")} />}
        </div>
        <FilterPopover label="Cliente" options={d.filterOptions.client_names} selected={d.filterClient} onChange={d.setFilterClient} />
        <FilterPopover label="Embarque" options={STATUS_OPTIONS} selected={d.filterStatus} onChange={d.setFilterStatus} />
        <FilterPopover label="Estado cartera" options={["ATRASADO", "A_TIEMPO", "ADELANTADO", "SIN_FECHA"]} selected={d.filterEstado} onChange={d.setFilterEstado} accentColor={T.danger} />
        {d.activeFilterCount > 0 && (
          <button onClick={d.clearAllFilters} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: `1px solid ${T.dangerSoft}`, background: T.dangerBg + "40", color: T.danger, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            <X className="w-3 h-3" /> Limpiar
          </button>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl border-slate-200" onClick={d.fetchData}><RefreshCw className="w-3.5 h-3.5" /> Actualizar</Button>
          <Button size="sm" className="h-9 gap-1.5 rounded-xl" variant="outline" onClick={d.handleDownloadPDF} style={{ background: T.gradientPrimary, border: "none", boxShadow: T.shadowMd, color: "white" }}><FileDown className="w-3.5 h-3.5" /> PDF</Button>
          <Button size="sm" className="h-9 gap-1.5 rounded-xl" onClick={d.handleDownloadExcel} style={{ background: T.gradientPrimary, border: "none", boxShadow: T.shadowMd, color: "white" }}><Download className="w-3.5 h-3.5" /> Excel</Button>
          <Button size="sm" className="h-9 gap-1.5 rounded-xl" onClick={d.handleDownloadExcelPorCliente}
            title="Descarga un archivo de Excel independiente por cada cliente de la vista actual (respeta los filtros aplicados)"
            style={{ background: "linear-gradient(135deg, #0B72B8, #00B8E0)", border: "none", boxShadow: T.shadowMd, color: "white" }}>
            <FolderDown className="w-3.5 h-3.5" /> Excel × cliente ({d.groups.length})
          </Button>
        </div>
      </div>

      {d.filterEstado.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {d.filterEstado.map((e) => (
            <span key={e} style={{ fontSize: 11, fontWeight: 600, color: T.inkMuted, background: T.surfaceAlt, border: `1px solid ${T.borderLight}`, padding: "3px 9px", borderRadius: 6 }}>{labelFor(e)}</span>
          ))}
        </div>
      )}

      <VariantAurora d={d} />
    </div>
  );
}
