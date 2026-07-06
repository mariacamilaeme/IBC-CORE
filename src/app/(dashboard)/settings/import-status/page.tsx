"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, X, Database, ArrowLeft } from "lucide-react";
import { T } from "@/lib/design-tokens";
import { Button } from "@/components/ui/button";

type ImportResult = {
  success: boolean;
  file: string;
  sheets_found: string[];
  sheets_processed: string[];
  sheets_ignored: string[];
  contracts: {
    total: number;
    inserted: number;
    updated: number;
    renamed: number;
    errors: number;
    error_samples: string[];
    skipped: number;
    skipped_details: string[];
  };
  invoices: {
    total: number;
    inserted: number;
    updated: number;
    auto_approved_legacy: number;
    auto_approve_cutoff: string;
    errors: number;
    error_samples: string[];
  };
  processed_at: string;
  processed_by: string;
};

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export default function ImportStatusPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = (f: File | null) => {
    if (!f) return;
    if (!/\.(xlsx|xlsm|xls)$/i.test(f.name)) {
      toast.error("El archivo debe ser .xlsx, .xlsm o .xls");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      toast.error("Archivo demasiado grande (máx 50 MB)");
      return;
    }
    setFile(f);
    setResult(null);
    setErrorMsg(null);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onPick(f);
  }, []);

  const onSubmit = async () => {
    if (!file) {
      toast.error("Selecciona un archivo primero");
      return;
    }
    setUploading(true);
    setResult(null);
    setErrorMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/import-status", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || "Error desconocido");
        toast.error(json.error || "Error al procesar el archivo");
        return;
      }
      setResult(json);
      const totals = json.contracts.inserted + json.contracts.updated + json.invoices.inserted + json.invoices.updated;
      toast.success(`Importación completa: ${totals} registros procesados`);
    } catch (err) {
      console.error(err);
      setErrorMsg((err as Error).message || "Error de red");
      toast.error("Error al subir el archivo");
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setResult(null);
    setErrorMsg(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div style={{
      background: T.glassBg, backdropFilter: T.glassBlur,
      border: "1px solid " + T.glassBorder, borderRadius: T.radius,
      boxShadow: T.shadowGlass, padding: "24px 28px", maxWidth: 980, margin: "0 auto",
    }}>
      <div className="space-y-5">
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: T.inkLight }}>
          <Link href="/" style={{ color: T.accent, fontWeight: 600, textDecoration: "none" }}>Inicio</Link>
          <span style={{ color: T.inkGhost }}>/</span>
          <Link href="/settings" style={{ color: T.accent, fontWeight: 600, textDecoration: "none" }}>Configuración</Link>
          <span style={{ color: T.inkGhost }}>/</span>
          <span style={{ fontWeight: 600, color: T.inkMuted }}>Importar STATUS</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, display: "flex", alignItems: "center", gap: 10 }}>
              <Database className="w-5 h-5" style={{ color: T.accent }} />
              Actualizar STATUS desde Excel
            </h1>
            <p style={{ fontSize: 13, color: T.inkMuted, marginTop: 4 }}>
              Sube el archivo <strong>STATUS ACTUAL.xlsx</strong> (con hojas <code>STATUS</code> y <code>FACTURAS</code>) para actualizar todos los contratos y facturas automáticamente.
            </p>
          </div>
          <Link href="/settings">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl">
              <ArrowLeft className="w-3.5 h-3.5" /> Volver
            </Button>
          </Link>
        </div>

        {/* Info card */}
        <div style={{
          padding: "12px 16px", borderRadius: T.radiusMd,
          background: T.accentLight, border: `1px solid ${T.accent}25`,
          display: "flex", alignItems: "flex-start", gap: 10,
        }}>
          <div style={{ flexShrink: 0, color: T.accent, marginTop: 1 }}>
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.5 }}>
            <strong style={{ color: T.accent }}>Cómo funciona:</strong> el archivo se procesa hoja por hoja.
            La hoja <code>STATUS</code> actualiza/inserta contratos (key: contrato cliente + contrato china).
            La hoja <code>FACTURAS</code> actualiza/inserta facturas (key: china invoice + sc customer).
            Los registros que ya existen se <strong>actualizan</strong>, los nuevos se <strong>insertan</strong>. Nunca se borra nada.
          </div>
        </div>

        {/* Dropzone */}
        {!file && (
          <div
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              borderRadius: T.radiusMd,
              border: `2px dashed ${dragActive ? T.accent : T.border}`,
              background: dragActive ? T.accentLight : T.surfaceAlt,
              padding: "60px 24px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <div style={{
              width: 56, height: 56, margin: "0 auto 14px",
              borderRadius: 14, background: T.surface,
              border: `1px solid ${T.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: T.accent,
            }}>
              <Upload className="w-6 h-6" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
              Arrastra el archivo aquí o haz clic para seleccionar
            </p>
            <p style={{ fontSize: 12, color: T.inkLight }}>
              .xlsx, .xlsm o .xls · máx 50 MB
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xlsm,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={(e) => onPick(e.target.files?.[0] || null)}
              style={{ display: "none" }}
            />
          </div>
        )}

        {/* Selected file */}
        {file && (
          <div style={{
            padding: "16px 18px", borderRadius: T.radiusMd,
            background: T.surface, border: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: T.accentLight, color: T.accent,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
              <div style={{ fontSize: 12, color: T.inkLight, marginTop: 2 }}>{fmtBytes(file.size)} · listo para procesar</div>
            </div>
            {!uploading && (
              <button
                onClick={clearFile}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: T.surfaceAlt, border: `1px solid ${T.borderLight}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: T.inkMuted, cursor: "pointer",
                }}
                title="Quitar archivo"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <Button
              size="sm"
              className="h-10 gap-1.5 rounded-xl px-5"
              onClick={onSubmit}
              disabled={uploading}
              style={{ background: T.gradientPrimary, border: "none", boxShadow: T.shadowMd, color: "white" }}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Procesando..." : "Importar"}
            </Button>
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div style={{
            padding: "14px 16px", borderRadius: T.radiusMd,
            background: T.dangerBg, border: `1px solid ${T.dangerSoft}`,
            display: "flex", alignItems: "flex-start", gap: 10,
          }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: T.danger }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.danger }}>Error en la importación</div>
              <div style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 4 }}>{errorMsg}</div>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{
            padding: "20px 22px", borderRadius: T.radiusMd,
            background: T.surface, border: `1px solid ${T.successSoft}`,
            boxShadow: T.shadowMd,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: T.successBg, color: T.success,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Importación completada</div>
                <div style={{ fontSize: 12, color: T.inkLight }}>
                  {new Date(result.processed_at).toLocaleString("es-CO")} · por {result.processed_by}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {/* Contracts */}
              <div style={{ padding: "14px 16px", borderRadius: 10, background: T.surfaceAlt, border: `1px solid ${T.borderLight}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.inkLight, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Contratos</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Stat label="Procesados" value={result.contracts.total} />
                  <Stat label="Insertados" value={result.contracts.inserted} color={T.success} />
                  <Stat label="Actualizados" value={result.contracts.updated} color={T.accent} />
                  <Stat label="Renombrados" value={result.contracts.renamed} color={T.inkMuted} />
                  {result.contracts.skipped > 0 && (
                    <Stat label="Saltados (datos faltantes)" value={result.contracts.skipped} color={T.warning} />
                  )}
                  {result.contracts.errors > 0 && (
                    <Stat label="Errores" value={result.contracts.errors} color={T.danger} />
                  )}
                </div>
                {result.contracts.skipped_details.length > 0 && (
                  <details style={{ marginTop: 10, fontSize: 11, color: T.warning }} open>
                    <summary style={{ cursor: "pointer", fontWeight: 600 }}>Ver filas saltadas ({result.contracts.skipped_details.length})</summary>
                    <ul style={{ marginTop: 6, paddingLeft: 16, lineHeight: 1.5 }}>
                      {result.contracts.skipped_details.map((e, i) => <li key={i} style={{ wordBreak: "break-word" }}>{e}</li>)}
                    </ul>
                  </details>
                )}
                {result.contracts.error_samples.length > 0 && (
                  <details style={{ marginTop: 10, fontSize: 11, color: T.danger }}>
                    <summary style={{ cursor: "pointer", fontWeight: 600 }}>Ver errores ({result.contracts.error_samples.length})</summary>
                    <ul style={{ marginTop: 6, paddingLeft: 16, lineHeight: 1.5 }}>
                      {result.contracts.error_samples.map((e, i) => <li key={i} style={{ wordBreak: "break-all" }}>{e}</li>)}
                    </ul>
                  </details>
                )}
              </div>

              {/* Invoices */}
              <div style={{ padding: "14px 16px", borderRadius: 10, background: T.surfaceAlt, border: `1px solid ${T.borderLight}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.inkLight, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Facturas</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Stat label="Procesadas" value={result.invoices.total} />
                  <Stat label="Insertadas" value={result.invoices.inserted} color={T.success} />
                  <Stat label="Actualizadas" value={result.invoices.updated} color={T.accent} />
                  {result.invoices.auto_approved_legacy > 0 && (
                    <Stat label={`Aprobadas auto (≤${result.invoices.auto_approve_cutoff})`} value={result.invoices.auto_approved_legacy} color={T.success} />
                  )}
                  {result.invoices.errors > 0 && (
                    <Stat label="Errores" value={result.invoices.errors} color={T.danger} />
                  )}
                </div>
                {result.invoices.error_samples.length > 0 && (
                  <details style={{ marginTop: 10, fontSize: 11, color: T.danger }}>
                    <summary style={{ cursor: "pointer", fontWeight: 600 }}>Ver errores ({result.invoices.error_samples.length})</summary>
                    <ul style={{ marginTop: 6, paddingLeft: 16, lineHeight: 1.5 }}>
                      {result.invoices.error_samples.map((e, i) => <li key={i} style={{ wordBreak: "break-all" }}>{e}</li>)}
                    </ul>
                  </details>
                )}
              </div>
            </div>

            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.borderLight}`, fontSize: 11, color: T.inkLight, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <span>Archivo: <strong style={{ color: T.inkSoft }}>{result.file}</strong></span>
                <span>Procesadas: <strong style={{ color: T.success }}>{result.sheets_processed.join(", ")}</strong></span>
              </div>
              {result.sheets_ignored.length > 0 && (
                <div>Ignoradas (solo se leen STATUS y FACTURAS): <strong style={{ color: T.inkSoft }}>{result.sheets_ignored.join(", ")}</strong></div>
              )}
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl flex-1" onClick={clearFile}>
                Importar otro archivo
              </Button>
              <Link href="/reports/status-commercial" className="flex-1">
                <Button size="sm" className="h-9 gap-1.5 rounded-xl w-full" style={{ background: T.gradientPrimary, border: "none", color: "white" }}>
                  Ver reportes
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: T.inkLight, fontWeight: 500 }}>{label}</div>
      <div style={{
        fontSize: 20, fontWeight: 800, marginTop: 2,
        color: color || T.ink,
        fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
        letterSpacing: "-0.02em",
      }}>{value.toLocaleString("es-CO")}</div>
    </div>
  );
}
