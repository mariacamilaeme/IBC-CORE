"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  Save,
  RotateCcw,
  Eye,
  Pencil,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useQuotationsData } from "@/hooks/useQuotationsData";
import { useCommercials } from "@/hooks/useCommercials";
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

const COUNTRIES = [
  { value: "Colombia", continent: "América del Sur" },
  { value: "Chile", continent: "América del Sur" },
  { value: "Venezuela", continent: "América del Sur" },
  { value: "Emiratos Árabes Unidos", continent: "Asia" },
];

const STATUSES = Object.keys(STATUS_CONFIG);
const CATEGORIES = Object.keys(CATEGORY_CONFIG);

function emptyForm(): Partial<ReportQuotation> {
  return {
    customer: "",
    materials: "",
    requestDate: new Date().toISOString().split("T")[0],
    issueDate: null,
    status: "Pendiente cotización",
    requestedBy: "",
    country: "",
    continent: "",
    category: "MP",
    responseTime: null,
    contractDate: null,
    contractNo: null,
    daysElapsed: null,
    chinaTime: null,
    chinaStatus: null,
  };
}

export default function CreatePage() {
  const { data, customQuotations, addQuotation, updateQuotation } = useQuotationsData();
  const dataCommercialNames = useMemo(() => data.map((d) => d.requestedBy), [data]);
  const { commercials } = useCommercials(dataCommercialNames);

  // Form state
  const [form, setForm] = useState<Partial<ReportQuotation>>(emptyForm);
  const [saved, setSaved] = useState(false);

  // Dialog state for viewing/editing existing quotations
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("view");
  const [dialogQuotation, setDialogQuotation] = useState<ReportQuotation | null>(null);

  const updateField = (field: keyof ReportQuotation, value: string | number | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleCountryChange = (country: string) => {
    const found = COUNTRIES.find((c) => c.value === country);
    setForm((prev) => ({
      ...prev,
      country,
      continent: found?.continent || "",
    }));
    setSaved(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer?.trim() || !form.materials?.trim() || !form.requestedBy) return;

    addQuotation(form as ReportQuotation);
    setSaved(true);
    // Reset form after a brief delay so user sees success
    setTimeout(() => {
      setForm(emptyForm());
      setSaved(false);
    }, 2000);
  };

  const handleReset = () => {
    setForm(emptyForm());
    setSaved(false);
  };

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

  const handleSaveDialog = (q: ReportQuotation, isNew: boolean) => {
    if (isNew) {
      addQuotation(q);
    } else {
      updateQuotation(q);
    }
  };

  const isValid = !!(form.customer?.trim() && form.materials?.trim() && form.requestedBy);

  return (
    <>
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Generar Cotización</h1>
          <p className="text-sm text-slate-500 mt-1">
            Crea nuevas cotizaciones que alimentarán la trazabilidad y los reportes
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl border border-blue-100">
          <FileText className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-700">{customQuotations.length}</span>
          <span className="text-xs text-blue-500">cotizaciones creadas</span>
        </div>
      </div>

      {/* CREATION FORM */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Gradient header */}
        <div className="bg-gradient-to-r from-[#1E3A5F] via-[#2A4D7A] to-[#1E3A5F] px-6 py-4">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-white" />
            <h2 className="text-base font-bold text-white">Nueva Cotización</h2>
          </div>
          <p className="text-xs text-blue-200 mt-1">
            Completa los campos para registrar una nueva cotización
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Row 1: Cliente + Materiales */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Cliente *</Label>
              <Input
                value={form.customer || ""}
                onChange={(e) => updateField("customer", e.target.value)}
                placeholder="Nombre del cliente"
                className="h-9 text-sm border-slate-200"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Materiales *</Label>
              <Input
                value={form.materials || ""}
                onChange={(e) => updateField("materials", e.target.value)}
                placeholder="Descripción de materiales"
                className="h-9 text-sm border-slate-200"
                required
              />
            </div>
          </div>

          {/* Row 2: Comercial + Estado + Línea */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Comercial *</Label>
              <Select value={form.requestedBy || ""} onValueChange={(v) => updateField("requestedBy", v)}>
                <SelectTrigger className="h-9 text-sm border-slate-200">
                  <SelectValue placeholder="Seleccionar comercial" />
                </SelectTrigger>
                <SelectContent>
                  {commercials.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Estado</Label>
              <Select value={form.status || "Pendiente cotización"} onValueChange={(v) => updateField("status", v)}>
                <SelectTrigger className="h-9 text-sm border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Línea de Producto</Label>
              <Select value={form.category || "MP"} onValueChange={(v) => updateField("category", v)}>
                <SelectTrigger className="h-9 text-sm border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORY_CONFIG[c].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: País + Fecha Solicitud + Fecha Emisión */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">País</Label>
              <Select value={form.country || ""} onValueChange={handleCountryChange}>
                <SelectTrigger className="h-9 text-sm border-slate-200">
                  <SelectValue placeholder="Seleccionar país" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {getCountryFlag(c.value)} {c.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Fecha Solicitud</Label>
              <Input
                type="date"
                value={form.requestDate || ""}
                onChange={(e) => updateField("requestDate", e.target.value || null)}
                className="h-9 text-sm border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Fecha Emisión</Label>
              <Input
                type="date"
                value={form.issueDate || ""}
                onChange={(e) => updateField("issueDate", e.target.value || null)}
                className="h-9 text-sm border-slate-200"
              />
            </div>
          </div>

          {/* Row 4: Contrato No. + Fecha Contrato */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">No. Contrato</Label>
              <Input
                value={form.contractNo || ""}
                onChange={(e) => updateField("contractNo", e.target.value || null)}
                placeholder="Opcional"
                className="h-9 text-sm border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Fecha Contrato</Label>
              <Input
                type="date"
                value={form.contractDate || ""}
                onChange={(e) => updateField("contractDate", e.target.value || null)}
                className="h-9 text-sm border-slate-200"
              />
            </div>
            <div />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            <Button
              type="submit"
              disabled={!isValid || saved}
              className={cn(
                "gap-2 rounded-xl font-semibold transition-all duration-200",
                saved
                  ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                  : "bg-[#1E3A5F] hover:bg-[#2A4D7A] text-white shadow-lg shadow-[#1E3A5F]/20 hover:scale-[1.02]"
              )}
            >
              {saved ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Cotización Creada
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Crear Cotización
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={handleReset} className="gap-1.5 rounded-xl">
              <RotateCcw className="w-3.5 h-3.5" />
              Limpiar
            </Button>
          </div>
        </form>
      </div>

      {/* CREATED QUOTATIONS TABLE */}
      {customQuotations.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-[#1E3A5F]">Cotizaciones Creadas</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cotizaciones registradas por ti — también visibles en Trazabilidad y Reportes
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">No.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Línea</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Comercial</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">País</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {[...customQuotations].reverse().map((row, idx) => {
                  const sc = STATUS_CONFIG[row.status];
                  const cc = CATEGORY_CONFIG[row.category];
                  return (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono font-medium text-slate-700">{row.id || "—"}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <div className="font-medium text-slate-900 truncate">{row.customer}</div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">{row.materials}</div>
                      </td>
                      <td className="px-4 py-3">
                        {sc ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border"
                            style={{ color: sc.color, backgroundColor: sc.bg, borderColor: sc.border }}
                          >
                            <span className="text-[10px]">{sc.icon}</span>
                            {sc.label}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">{row.status}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {cc ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold" style={{ color: cc.color, backgroundColor: cc.bg }}>
                            {cc.short}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">{row.category}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: avatarColor(row.requestedBy) }}>
                            {initials(row.requestedBy)}
                          </div>
                          <span className="text-xs text-slate-700">{row.requestedBy}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-700">{getCountryFlag(row.country)} {row.country}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-600">{fmtDate(row.requestDate)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openViewDialog(row)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#1E3A5F] transition-colors" title="Ver detalle">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openEditDialog(row)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#1E3A5F] transition-colors" title="Editar">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUOTATION DIALOG (view / edit from table) */}
      <QuotationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        mode={dialogMode}
        quotation={dialogQuotation}
        commercials={commercials}
        onSave={handleSaveDialog}
        onModeChange={setDialogMode}
      />
    </>
  );
}
