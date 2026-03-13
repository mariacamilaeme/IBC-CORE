"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FileText,
  Calendar,
  Pencil,
  Save,
  Plus,
  User,
  Globe,
  Package,
  Clock,
  Hash,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ReportQuotation } from "./constants";
import {
  STATUS_CONFIG,
  CATEGORY_CONFIG,
  getCountryFlag,
  fmtDate,
  avatarColor,
  initials,
} from "./constants";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

export type DialogMode = "view" | "edit" | "create";

interface QuotationDialogProps {
  open: boolean;
  onClose: () => void;
  mode: DialogMode;
  quotation: ReportQuotation | null;
  commercials: string[];
  onSave: (data: ReportQuotation, isNew: boolean) => void;
  onModeChange: (mode: DialogMode) => void;
}

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

// ---------------------------------------------------------------------------
// ReadOnlyField
// ---------------------------------------------------------------------------

function ReadOnlyField({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <span className="text-[11px] text-slate-500 uppercase tracking-wide font-medium flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <p className="text-sm font-medium text-slate-800 mt-1">{value || "—"}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QuotationDialog({
  open,
  onClose,
  mode,
  quotation,
  commercials,
  onSave,
  onModeChange,
}: QuotationDialogProps) {
  const [form, setForm] = useState<Partial<ReportQuotation>>(emptyForm);

  useEffect(() => {
    if (!open) return;
    if (mode === "create") {
      setForm(emptyForm());
    } else if (quotation) {
      setForm({ ...quotation });
    }
  }, [open, quotation, mode]);

  // --- Helpers ---

  const updateField = (field: keyof ReportQuotation, value: unknown) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-calculate responseTime
      if (field === "requestDate" || field === "issueDate") {
        if (updated.requestDate && updated.issueDate) {
          const req = new Date(updated.requestDate + "T00:00:00");
          const iss = new Date(updated.issueDate + "T00:00:00");
          const diff = Math.round(
            (iss.getTime() - req.getTime()) / (1000 * 60 * 60 * 24),
          );
          updated.responseTime = diff >= 0 ? diff : null;
        } else {
          updated.responseTime = null;
        }
      }

      // Auto-fill continent from country
      if (field === "country") {
        const match = COUNTRIES.find((c) => c.value === value);
        if (match) updated.continent = match.continent;
      }

      return updated;
    });
  };

  const handleSave = () => {
    if (!form.customer?.trim() || !form.requestedBy) return;
    onSave(form as ReportQuotation, mode === "create");
    onClose();
  };

  if (!open) return null;

  const isView = mode === "view";
  const statusCfg = form.status ? STATUS_CONFIG[form.status] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border border-white/30 bg-white/85 backdrop-blur-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] animate-in fade-in zoom-in-95 duration-300">
        {/* Gradient accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-gradient-to-r from-[#1E3A5F] via-blue-500 to-cyan-400" />

        {/* ---- Header ---- */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg",
                mode === "create"
                  ? "bg-gradient-to-br from-[#1E3A5F] to-[#2A4D7A]"
                  : mode === "edit"
                    ? "bg-gradient-to-br from-amber-500 to-amber-600"
                    : "bg-gradient-to-br from-blue-500 to-blue-600",
              )}
            >
              {mode === "create" ? (
                <Plus className="w-5 h-5 text-white" />
              ) : mode === "edit" ? (
                <Pencil className="w-5 h-5 text-white" />
              ) : (
                <FileText className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1E3A5F]">
                {mode === "create"
                  ? "Nueva Cotización"
                  : mode === "edit"
                    ? "Editar Cotización"
                    : `Cotización ${form.id || "S/N"}`}
              </h2>
              <p className="text-xs text-slate-500">
                {mode === "create"
                  ? "Registra una nueva cotización en el sistema"
                  : mode === "edit"
                    ? `Editando ${form.id || "cotización"}`
                    : form.customer || "Detalle de la cotización"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isView && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl gap-1.5 text-xs font-semibold border-slate-200 hover:bg-slate-50"
                onClick={() => onModeChange("edit")}
              >
                <Pencil className="w-3.5 h-3.5" />
                Editar
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status badge */}
        {statusCfg && (
          <div className="px-6 pb-3">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
              style={{
                color: statusCfg.color,
                backgroundColor: statusCfg.bg,
                borderColor: statusCfg.border,
              }}
            >
              <span className="text-[10px]">{statusCfg.icon}</span>
              {statusCfg.label}
            </span>
          </div>
        )}

        {/* ---- Body (scrollable) ---- */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
          {/* ===== Section: Información General ===== */}
          <div className="rounded-2xl border border-slate-100/80 bg-gradient-to-br from-white/60 to-slate-50/40 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-5 w-1 rounded-full bg-gradient-to-b from-[#1E3A5F] to-blue-500" />
              <h3 className="text-sm font-bold text-slate-700">
                Información General
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {/* Cliente */}
              {isView ? (
                <ReadOnlyField
                  label="Cliente"
                  value={form.customer}
                  icon={<User className="w-3 h-3" />}
                />
              ) : (
                <div>
                  <Label className="text-xs text-slate-600">
                    Cliente <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={form.customer || ""}
                    onChange={(e) => updateField("customer", e.target.value)}
                    placeholder="Nombre del cliente"
                    className="mt-1 rounded-xl"
                  />
                </div>
              )}

              {/* Comercial */}
              {isView ? (
                <div>
                  <span className="text-[11px] text-slate-500 uppercase tracking-wide font-medium flex items-center gap-1.5">
                    <User className="w-3 h-3" />
                    Comercial
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    {form.requestedBy && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{
                          backgroundColor: avatarColor(form.requestedBy),
                        }}
                      >
                        {initials(form.requestedBy)}
                      </div>
                    )}
                    <span className="text-sm font-medium text-slate-800">
                      {form.requestedBy || "—"}
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <Label className="text-xs text-slate-600">
                    Comercial <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.requestedBy || ""}
                    onValueChange={(v) => updateField("requestedBy", v)}
                  >
                    <SelectTrigger className="mt-1 rounded-xl">
                      <SelectValue placeholder="Seleccionar comercial" />
                    </SelectTrigger>
                    <SelectContent>
                      {commercials.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Materiales (full width) */}
              <div className="col-span-2">
                {isView ? (
                  <ReadOnlyField
                    label="Materiales"
                    value={form.materials}
                    icon={<Package className="w-3 h-3" />}
                  />
                ) : (
                  <div>
                    <Label className="text-xs text-slate-600">Materiales</Label>
                    <Input
                      value={form.materials || ""}
                      onChange={(e) => updateField("materials", e.target.value)}
                      placeholder="Descripción de materiales solicitados"
                      className="mt-1 rounded-xl"
                    />
                  </div>
                )}
              </div>

              {/* Categoría */}
              {isView ? (
                <ReadOnlyField
                  label="Línea / Categoría"
                  value={
                    form.category ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded"
                          style={{
                            backgroundColor:
                              CATEGORY_CONFIG[form.category]?.color || "#94A3B8",
                          }}
                        />
                        {CATEGORY_CONFIG[form.category]?.label || form.category}
                      </span>
                    ) : (
                      "—"
                    )
                  }
                  icon={<Package className="w-3 h-3" />}
                />
              ) : (
                <div>
                  <Label className="text-xs text-slate-600">
                    Línea / Categoría
                  </Label>
                  <Select
                    value={form.category || ""}
                    onValueChange={(v) => updateField("category", v)}
                  >
                    <SelectTrigger className="mt-1 rounded-xl">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CATEGORY_CONFIG[c]?.label || c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Estado */}
              {isView ? (
                <ReadOnlyField
                  label="Estado"
                  value={
                    statusCfg ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: statusCfg.color }}
                        />
                        {statusCfg.label}
                      </span>
                    ) : (
                      form.status || "—"
                    )
                  }
                />
              ) : (
                <div>
                  <Label className="text-xs text-slate-600">Estado</Label>
                  <Select
                    value={form.status || ""}
                    onValueChange={(v) => updateField("status", v)}
                  >
                    <SelectTrigger className="mt-1 rounded-xl">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          <span className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: STATUS_CONFIG[s].color,
                              }}
                            />
                            {STATUS_CONFIG[s].label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* País */}
              {isView ? (
                <ReadOnlyField
                  label="País"
                  value={
                    form.country
                      ? `${getCountryFlag(form.country)} ${form.country}`
                      : "—"
                  }
                  icon={<Globe className="w-3 h-3" />}
                />
              ) : (
                <div>
                  <Label className="text-xs text-slate-600">País</Label>
                  <Select
                    value={form.country || ""}
                    onValueChange={(v) => updateField("country", v)}
                  >
                    <SelectTrigger className="mt-1 rounded-xl">
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
              )}

              {/* Continente */}
              {isView ? (
                <ReadOnlyField
                  label="Continente"
                  value={form.continent}
                  icon={<Globe className="w-3 h-3" />}
                />
              ) : (
                <div>
                  <Label className="text-xs text-slate-600">Continente</Label>
                  <Input
                    value={form.continent || ""}
                    readOnly
                    placeholder="Se auto-completa al elegir país"
                    className="mt-1 rounded-xl bg-slate-50 text-slate-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* ===== Section: Fechas y Seguimiento ===== */}
          <div className="rounded-2xl border border-slate-100/80 bg-gradient-to-br from-white/60 to-slate-50/40 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-5 w-1 rounded-full bg-gradient-to-b from-amber-500 to-amber-600" />
              <h3 className="text-sm font-bold text-slate-700">
                Fechas y Seguimiento
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {/* Fecha solicitud */}
              {isView ? (
                <ReadOnlyField
                  label="Fecha de Solicitud"
                  value={fmtDate(form.requestDate ?? null)}
                  icon={<Calendar className="w-3 h-3" />}
                />
              ) : (
                <div>
                  <Label className="text-xs text-slate-600">
                    Fecha de Solicitud
                  </Label>
                  <Input
                    type="date"
                    value={form.requestDate || ""}
                    onChange={(e) =>
                      updateField("requestDate", e.target.value || null)
                    }
                    className="mt-1 rounded-xl"
                  />
                </div>
              )}

              {/* Fecha emisión */}
              {isView ? (
                <ReadOnlyField
                  label="Fecha de Emisión"
                  value={fmtDate(form.issueDate ?? null)}
                  icon={<Calendar className="w-3 h-3" />}
                />
              ) : (
                <div>
                  <Label className="text-xs text-slate-600">
                    Fecha de Emisión
                  </Label>
                  <Input
                    type="date"
                    value={form.issueDate || ""}
                    onChange={(e) =>
                      updateField("issueDate", e.target.value || null)
                    }
                    className="mt-1 rounded-xl"
                  />
                </div>
              )}

              {/* Tiempo de respuesta (always read-only, auto-calc) */}
              <ReadOnlyField
                label="Tiempo de Respuesta"
                value={
                  form.responseTime != null
                    ? `${form.responseTime} días`
                    : "—"
                }
                icon={<Clock className="w-3 h-3" />}
              />

              {/* No. contrato */}
              {isView ? (
                <ReadOnlyField
                  label="No. Contrato"
                  value={form.contractNo}
                  icon={<Hash className="w-3 h-3" />}
                />
              ) : (
                <div>
                  <Label className="text-xs text-slate-600">
                    No. Contrato
                  </Label>
                  <Input
                    value={form.contractNo || ""}
                    onChange={(e) =>
                      updateField("contractNo", e.target.value || null)
                    }
                    placeholder="Ej: CTR-001"
                    className="mt-1 rounded-xl"
                  />
                </div>
              )}

              {/* Fecha contrato */}
              {isView ? (
                <ReadOnlyField
                  label="Fecha de Contrato"
                  value={fmtDate(form.contractDate ?? null)}
                  icon={<Calendar className="w-3 h-3" />}
                />
              ) : (
                <div>
                  <Label className="text-xs text-slate-600">
                    Fecha de Contrato
                  </Label>
                  <Input
                    type="date"
                    value={form.contractDate || ""}
                    onChange={(e) =>
                      updateField("contractDate", e.target.value || null)
                    }
                    className="mt-1 rounded-xl"
                  />
                </div>
              )}

              {/* Días transcurridos (read-only) */}
              <ReadOnlyField
                label="Días Transcurridos"
                value={
                  form.daysElapsed != null
                    ? `${form.daysElapsed} días`
                    : "—"
                }
                icon={<Clock className="w-3 h-3" />}
              />
            </div>
          </div>

          {/* ===== Section: Gestión China ===== */}
          <div className="rounded-2xl border border-slate-100/80 bg-gradient-to-br from-white/60 to-slate-50/40 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-5 w-1 rounded-full bg-gradient-to-b from-red-500 to-red-600" />
              <h3 className="text-sm font-bold text-slate-700">
                Gestión China
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {/* Tiempo China */}
              {isView ? (
                <ReadOnlyField
                  label="Tiempo China"
                  value={
                    form.chinaTime != null
                      ? `${form.chinaTime} días`
                      : "—"
                  }
                  icon={<Clock className="w-3 h-3" />}
                />
              ) : (
                <div>
                  <Label className="text-xs text-slate-600">
                    Tiempo China (días)
                  </Label>
                  <Input
                    type="number"
                    value={form.chinaTime ?? ""}
                    onChange={(e) =>
                      updateField(
                        "chinaTime",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    placeholder="Días de respuesta"
                    className="mt-1 rounded-xl"
                  />
                </div>
              )}

              {/* Estado China */}
              {isView ? (
                <ReadOnlyField
                  label="Estado China"
                  value={
                    form.chinaStatus ? (
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full",
                            form.chinaStatus === "A tiempo"
                              ? "bg-emerald-500"
                              : "bg-red-500",
                          )}
                        />
                        {form.chinaStatus}
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />
              ) : (
                <div>
                  <Label className="text-xs text-slate-600">
                    Estado China
                  </Label>
                  <Select
                    value={form.chinaStatus || "__none__"}
                    onValueChange={(v) =>
                      updateField("chinaStatus", v === "__none__" ? null : v)
                    }
                  >
                    <SelectTrigger className="mt-1 rounded-xl">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin estado</SelectItem>
                      <SelectItem value="A tiempo">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          A tiempo
                        </span>
                      </SelectItem>
                      <SelectItem value="Retrasado">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          Retrasado
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ---- Footer (edit/create only) ---- */}
        {!isView && (
          <div className="px-6 py-4 border-t border-slate-200/50 bg-white/50 rounded-b-3xl flex items-center justify-end gap-3">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="rounded-xl bg-[#1E3A5F] hover:bg-[#2A4D7A] gap-1.5 shadow-lg shadow-[#1E3A5F]/20"
              onClick={handleSave}
              disabled={!form.customer?.trim() || !form.requestedBy}
            >
              <Save className="w-3.5 h-3.5" />
              {mode === "create" ? "Crear Cotización" : "Guardar Cambios"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
