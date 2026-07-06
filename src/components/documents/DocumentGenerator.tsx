"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  FileOutput, Upload, Loader2, CheckCircle2, Download, Pencil,
  RefreshCw, ChevronRight, Search, Building2, X, ArrowLeft,
  FileSpreadsheet, AlertCircle, Eye,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { T } from "@/lib/design-tokens";
import { IBC_COMPANY, INCOTERMS, DOCUMENT_TYPES } from "@/lib/document-constants";
import {
  detectDataTable, extractDataTable, extractHeaderInfo,
  detectMoneyColumns, detectFormulaColumns, buildClientData,
  type DocumentTemplate, type DocumentType, type DocumentDataTable,
} from "@/lib/document-template";
import { renderDocumentExcel } from "@/lib/document-excel-renderer";
import { printDocumentPDF, downloadDocumentPDF } from "@/lib/document-print-renderer";
import type { Client } from "@/types";

// ─── TYPES ──────────────────────────────────────────────────
type Status = "idle" | "parsing" | "parsed" | "generating" | "done" | "error";

interface ParsedSheet {
  sheetNames: string[];
  activeSheet: string;
  rawData: (string | number | null)[][];
  detectedHeaderRow: number;
}

// ─── PROPS ──────────────────────────────────────────────────
export interface DocumentGeneratorProps {
  defaultType: DocumentType;
  title: string;
  subtitle: string;
  breadcrumbLabel: string;
}

// ─── MAIN COMPONENT ────────────────────────────────────────
export default function DocumentGenerator({ defaultType, title, subtitle, breadcrumbLabel }: DocumentGeneratorProps) {
  // State: file & parsing
  const [status, setStatus] = useState<Status>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [parsedSheet, setParsedSheet] = useState<ParsedSheet | null>(null);
  const [headerRowOverride, setHeaderRowOverride] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // State: document config
  const [docType, setDocType] = useState<DocumentType>(defaultType);
  const [docNumber, setDocNumber] = useState("");
  const [docDate, setDocDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [portOfLoading, setPortOfLoading] = useState("");
  const [portOfDischarge, setPortOfDischarge] = useState("");
  const [vesselName, setVesselName] = useState("");
  const [blNo, setBlNo] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [incoterm, setIncoterm] = useState("");
  const [descriptionOfGoods, setDescriptionOfGoods] = useState("");

  // State: client
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [clientMessrs, setClientMessrs] = useState("");
  const [clientNit, setClientNit] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientCountryCity, setClientCountryCity] = useState("");
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // State: editable data table + formula columns
  const [editableRows, setEditableRows] = useState<(string | number | null)[][]>([]);
  const [moneyColumnIndices, setMoneyColumnIndices] = useState<number[]>([]);
  const [formulaCols, setFormulaCols] = useState<{ qtyCol: number | null; priceCol: number | null; amountCol: number | null }>({ qtyCol: null, priceCol: null, amountCol: null });

  // State: output
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);

  // ─── Fetch clients on mount ──
  useEffect(() => {
    fetch("/api/clients?pageSize=200&sort_field=company_name&sort_direction=asc")
      .then((r) => r.json())
      .then((d) => setClients(d.data || []))
      .catch(() => toast.error("Error cargando clientes"));
  }, []);

  // Close client dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setClientDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── File handling ──
  const handleFile = useCallback(async (f: File) => {
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      toast.error("Solo se aceptan archivos .xlsx o .xls");
      return;
    }
    setFile(f);
    setStatus("parsing");
    setErrorMsg("");
    setConvertedBlob(null);
    setProgress(0);

    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 15 + 5;
      if (p >= 95) { p = 95; clearInterval(iv); }
      setProgress(Math.min(p, 95));
    }, 80);

    try {
      const XLSX = await import("xlsx");
      const buffer = await f.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const wsName = wb.SheetNames[0];
      const ws = wb.Sheets[wsName];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true }) as (string | number | null)[][];

      const { headerRow } = detectDataTable(data);
      const table = extractDataTable(data, headerRow);
      const headerInfo = extractHeaderInfo(data, headerRow);
      const fc = detectFormulaColumns(table);

      clearInterval(iv);
      setProgress(100);
      setTimeout(() => {
        setParsedSheet({ sheetNames: wb.SheetNames, activeSheet: wsName, rawData: data, detectedHeaderRow: headerRow });
        setHeaderRowOverride(headerRow);
        setEditableRows(table.rows.map((r) => [...r]));
        setMoneyColumnIndices(detectMoneyColumns(table));
        setFormulaCols(fc);

        // Auto-fill transport details from source Excel
        if (headerInfo.documentNumber) setDocNumber(headerInfo.documentNumber);
        if (headerInfo.documentDate) setDocDate(headerInfo.documentDate);
        if (headerInfo.portOfLoading) setPortOfLoading(headerInfo.portOfLoading);
        if (headerInfo.portOfDischarge) setPortOfDischarge(headerInfo.portOfDischarge);
        if (headerInfo.vesselName) setVesselName(headerInfo.vesselName);
        if (headerInfo.blNo) setBlNo(headerInfo.blNo);
        if (headerInfo.paymentTerms) setPaymentTerms(headerInfo.paymentTerms);
        if (headerInfo.descriptionOfGoods) setDescriptionOfGoods(headerInfo.descriptionOfGoods);

        setStatus("parsed");
        toast.success(`Archivo procesado: ${table.rows.length} filas, ${table.headers.length} columnas`);
      }, 300);
    } catch (err) {
      clearInterval(iv);
      const msg = err instanceof Error ? err.message : "Error al leer el archivo";
      setErrorMsg(msg);
      setStatus("error");
      toast.error(msg);
    }
  }, []);

  // When header row changes, re-extract table
  useEffect(() => {
    if (!parsedSheet || headerRowOverride === null) return;
    const table = extractDataTable(parsedSheet.rawData, headerRowOverride);
    setEditableRows(table.rows.map((r) => [...r]));
    setMoneyColumnIndices(detectMoneyColumns(table));
    setFormulaCols(detectFormulaColumns(table));
  }, [headerRowOverride, parsedSheet]);

  // ─── Client selection ──
  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setClientDropdownOpen(false);
    setClientSearch("");
    const data = buildClientData(client);
    setClientMessrs(data.messrs);
    setClientNit(data.nit);
    setClientAddress(data.address);
    setClientCountryCity(data.countryCity);
  };

  const filteredClients = clientSearch
    ? clients.filter((c) =>
        c.company_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        (c.tax_id || "").toLowerCase().includes(clientSearch.toLowerCase())
      )
    : clients;

  // ─── Build template ──
  const buildTemplate = (): DocumentTemplate | null => {
    if (!parsedSheet || headerRowOverride === null) return null;
    const table = extractDataTable(parsedSheet.rawData, headerRowOverride);

    return {
      type: docType,
      documentNumber: docNumber,
      documentDate: docDate,
      client: { messrs: clientMessrs, nit: clientNit, address: clientAddress, countryCity: clientCountryCity },
      company: { name: IBC_COMPANY.name, address: IBC_COMPANY.address, tel: IBC_COMPANY.tel, ein: IBC_COMPANY.ein, email: IBC_COMPANY.email },
      metadata: { portOfLoading, portOfDischarge, vesselName, blNo, paymentTerms, incoterm, descriptionOfGoods },
      dataTable: { headers: table.headers, rows: editableRows },
    };
  };

  const validate = (): string | null => {
    if (!parsedSheet) return "Debes cargar un archivo Excel";
    if (!docNumber.trim()) return "El número de documento es obligatorio";
    if (!docDate) return "La fecha es obligatoria";
    if (editableRows.length === 0) return "El archivo no contiene datos";
    return null;
  };

  // ─── Generate Excel ──
  const handleGenerateExcel = useCallback(async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    const tmpl = buildTemplate();
    if (!tmpl) return;

    setStatus("generating");
    try {
      const blob = await renderDocumentExcel(tmpl);
      setConvertedBlob(blob);
      setStatus("done");
      toast.success("Excel generado exitosamente");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al generar";
      setErrorMsg(msg);
      setStatus("error");
      toast.error(msg);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedSheet, headerRowOverride, docType, docNumber, docDate, clientMessrs, clientNit, clientAddress, clientCountryCity, portOfLoading, portOfDischarge, vesselName, blNo, paymentTerms, incoterm, descriptionOfGoods, editableRows]);

  // ─── PDF V1: Styled HTML → direct download ──
  const handlePDFv1 = useCallback(async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    const tmpl = buildTemplate();
    if (!tmpl) return;
    try {
      await printDocumentPDF(tmpl);
      toast.success("PDF V1 descargado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al generar PDF");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedSheet, headerRowOverride, docType, docNumber, docDate, clientMessrs, clientNit, clientAddress, clientCountryCity, portOfLoading, portOfDischarge, vesselName, blNo, paymentTerms, incoterm, descriptionOfGoods, editableRows]);

  // ─── PDF V2: Excel-style layout (jsPDF direct download) ──
  const handlePDFv2 = useCallback(async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    const tmpl = buildTemplate();
    if (!tmpl) return;
    try {
      await downloadDocumentPDF(tmpl);
      toast.success("PDF V2 descargado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al generar PDF");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedSheet, headerRowOverride, docType, docNumber, docDate, clientMessrs, clientNit, clientAddress, clientCountryCity, portOfLoading, portOfDischarge, vesselName, blNo, paymentTerms, incoterm, descriptionOfGoods, editableRows]);

  // ─── Download blob ──
  const handleDownloadExcel = useCallback(() => {
    if (!convertedBlob) return;
    const url = URL.createObjectURL(convertedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docNumber || "DOC"} ${docType === "commercial-invoice" ? "INVOICE" : "PACKING LIST"}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Excel descargado");
  }, [convertedBlob, docType, docNumber, docDate]);

  // ─── Go back to edit ──
  const handleBackToEdit = useCallback(() => {
    setStatus("parsed");
    setConvertedBlob(null);
  }, []);

  // ─── Reset ──
  const handleReset = useCallback(() => {
    setFile(null); setParsedSheet(null); setConvertedBlob(null);
    setStatus("idle"); setErrorMsg(""); setProgress(0);
    setHeaderRowOverride(null); setEditableRows([]);
    setDocNumber(""); setDocDate(new Date().toISOString().slice(0, 10));
    setPortOfLoading(""); setPortOfDischarge(""); setVesselName(""); setBlNo("");
    setPaymentTerms(""); setIncoterm(""); setDescriptionOfGoods("");
    setSelectedClient(null); setClientMessrs(""); setClientNit(""); setClientAddress(""); setClientCountryCity("");
    if (hiddenInputRef.current) hiddenInputRef.current.value = "";
  }, []);

  // ─── Drag & drop handlers ──
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  // ─── Recalculate entire table (Excel-like chain) ──
  const recalculate = (rows: (string | number | null)[][]): (string | number | null)[][] => {
    const copy = rows.map((r) => [...r]);
    const { qtyCol, priceCol, amountCol } = formulaCols;
    if (qtyCol === null || amountCol === null) return copy;

    // Identify special rows by keyword
    const rowText = (i: number) => copy[i].map((c) => String(c || "").toUpperCase()).join(" ");
    let totalCifIdx = -1, freightIdx = -1, insuranceIdx = -1, fobIdx = -1, depositIdx = -1, balanceIdx = -1;
    const itemIndices: number[] = [];

    copy.forEach((_, i) => {
      const txt = rowText(i);
      if (txt.includes("BALANCE")) balanceIdx = i;
      else if (txt.includes("DEPOSIT")) depositIdx = i;
      else if (txt.includes("FOB")) fobIdx = i;
      else if (txt.includes("INSURANCE")) insuranceIdx = i;
      else if (txt.includes("OCEAN FREIGHT") || txt.includes("FREIGHT")) freightIdx = i;
      else if (txt.includes("TOTAL") && (txt.includes("CIF") || txt.includes("SUBTOTAL"))) totalCifIdx = i;
      else {
        // Item rows: first cell is a number or row has qty+price
        const first = Number(copy[i][0]);
        if (!isNaN(first) && first > 0) itemIndices.push(i);
      }
    });

    // 1. Item rows: TOTAL AMOUNT = QTY * UNIT PRICE
    if (priceCol !== null) {
      itemIndices.forEach((i) => {
        const qty = Number(copy[i][qtyCol]) || 0;
        const price = Number(copy[i][priceCol]) || 0;
        if (qty > 0 && price > 0) {
          copy[i][amountCol] = Math.round(qty * price * 100) / 100;
        }
      });
    }

    // 2. TOTAL CIF = sum of item TOTAL AMOUNTs
    if (totalCifIdx >= 0) {
      const sum = itemIndices.reduce((s, i) => s + (Number(copy[i][amountCol]) || 0), 0);
      copy[totalCifIdx][amountCol] = Math.round(sum * 100) / 100;
      // Sum QTY and COILS too
      const qtySum = itemIndices.reduce((s, i) => s + (Number(copy[i][qtyCol]) || 0), 0);
      copy[totalCifIdx][qtyCol] = Math.round(qtySum * 100) / 100;
    }

    // 3. OCEAN FREIGHT: if has qty*price pattern
    if (freightIdx >= 0 && priceCol !== null) {
      const qty = Number(copy[freightIdx][qtyCol]) || 0;
      const price = Number(copy[freightIdx][priceCol]) || 0;
      if (qty > 0 && price > 0) {
        copy[freightIdx][amountCol] = Math.round(qty * price * 100) / 100;
      }
    }

    // 4. FOB = TOTAL CIF - OCEAN FREIGHT - INSURANCE
    if (fobIdx >= 0 && totalCifIdx >= 0) {
      const totalCif = Number(copy[totalCifIdx][amountCol]) || 0;
      const freight = freightIdx >= 0 ? (Number(copy[freightIdx][amountCol]) || 0) : 0;
      const insurance = insuranceIdx >= 0 ? (Number(copy[insuranceIdx][amountCol]) || 0) : 0;
      copy[fobIdx][amountCol] = Math.round((totalCif - freight - insurance) * 100) / 100;
    }

    // 5. BALANCE = TOTAL CIF - DEPOSIT
    if (balanceIdx >= 0 && totalCifIdx >= 0) {
      const totalCif = Number(copy[totalCifIdx][amountCol]) || 0;
      const deposit = depositIdx >= 0 ? (Number(copy[depositIdx][amountCol]) || 0) : 0;
      copy[balanceIdx][amountCol] = Math.round((totalCif - deposit) * 100) / 100;
    }

    return copy;
  };

  // ─── Edit cell with live recalculation ──
  const updateCell = (rowIdx: number, colIdx: number, value: string) => {
    setEditableRows((prev) => {
      const copy = prev.map((r) => [...r]);
      const num = Number(value);
      copy[rowIdx][colIdx] = value === "" ? null : isNaN(num) ? value : num;
      return recalculate(copy);
    });
  };

  // ─── Get current data table ──
  const getCurrentTable = (): DocumentDataTable | null => {
    if (!parsedSheet || headerRowOverride === null) return null;
    const table = extractDataTable(parsedSheet.rawData, headerRowOverride);
    return { headers: table.headers, rows: editableRows };
  };
  const currentTable = getCurrentTable();
  const headers = currentTable?.headers.filter((h) => h !== "") || [];

  // ─── Steps ──
  const currentStep = status === "idle" || status === "parsing" ? 0 : status === "parsed" || status === "generating" ? 1 : 2;
  const steps = [
    { name: "Subir Excel", desc: "Cargar archivo fuente" },
    { name: "Configurar", desc: "Cliente y datos" },
    { name: "Generar", desc: "Excel + PDF" },
  ];

  const C = { accent: T.accent, green: "#16A34A", blue: "#2563EB", gold: "#CA8A04", red: "#DC2626" };
  const fmtSize = (b: number) => b < 1048576 ? (b / 1024).toFixed(0) + " KB" : (b / 1048576).toFixed(1) + " MB";
  const fmtNum = (v: string | number | null) => {
    if (v == null) return "";
    const n = Number(v);
    if (isNaN(n)) return String(v);
    return n.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div style={{ fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif", width: "100%" }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -300% 0; } 100% { background-position: 300% 0; } }
        .glass-card { background: ${T.glassBg}; backdrop-filter: ${T.glassBlur}; border: 1px solid ${T.glassBorder}; box-shadow: ${T.shadowGlass}; }
        .btn-primary { transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1); position: relative; overflow: hidden; }
        .btn-primary:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 12px 36px rgba(10,37,64,0.25); }
      `}</style>

      <div className="relative z-10 px-6 py-5" style={{ width: "100%" }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 12.5, color: T.inkLight }}>
          <Link href="/" style={{ color: T.accent, fontWeight: 600, textDecoration: "none" }}>IBC Core</Link>
          <ChevronRight className="h-3 w-3" />
          <span style={{ color: T.inkMuted, fontWeight: 500 }}>{breadcrumbLabel}</span>
        </div>

        {/* Header banner */}
        <div style={{
          background: "linear-gradient(135deg, #0D1B2A 0%, #122640 40%, #0B3D6E 100%)",
          borderRadius: 20, padding: "28px 32px", marginBottom: 24, position: "relative", overflow: "hidden",
          animation: "fadeUp 0.6s ease both",
        }}>
          <div style={{ position: "absolute", top: -40, right: -20, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(93,129,175,0.15) 0%, transparent 70%)" }} />
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg, #5D81AF, #0B5394)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileOutput className="h-6 w-6" style={{ color: "#fff" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{title}</h1>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{subtitle}</p>
            </div>
          </div>

          {/* Stepper */}
          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            {steps.map((s, i) => (
              <div key={i} style={{
                flex: 1, padding: "10px 14px", borderRadius: 10,
                background: i <= currentStep ? "rgba(93,129,175,0.2)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${i <= currentStep ? "rgba(93,129,175,0.3)" : "rgba(255,255,255,0.08)"}`,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 8,
                  background: i < currentStep ? C.green : i === currentStep ? "#5D81AF" : "rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, color: "#fff",
                }}>
                  {i < currentStep ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: i <= currentStep ? "#fff" : "rgba(255,255,255,0.4)" }}>{s.name}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ STEP 1: Upload ═══ */}
        {(status === "idle" || status === "parsing") && (
          <div className="glass-card" style={{ borderRadius: 18, padding: 32, animation: "fadeUp 0.5s ease both" }}>
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => hiddenInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? T.accent : T.border}`,
                borderRadius: 14, padding: "48px 32px", textAlign: "center", cursor: "pointer",
                background: isDragging ? T.accentLight : T.surfaceAlt,
                transition: "all 0.3s ease",
              }}
            >
              {status === "parsing" ? (
                <>
                  <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin" style={{ color: T.accent }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Procesando archivo...</p>
                  <div style={{ width: "60%", margin: "12px auto 0", height: 6, borderRadius: 3, background: T.borderLight, overflow: "hidden" }}>
                    <div style={{ width: `${progress}%`, height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${T.accent}, #5D81AF)`, transition: "width 0.3s ease" }} />
                  </div>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto mb-3" style={{ color: T.inkLight }} />
                  <p style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Arrastra tu archivo Excel o haz clic para seleccionar</p>
                  <p style={{ fontSize: 12, color: T.inkLight, marginTop: 4 }}>Formatos: .xlsx, .xls</p>
                </>
              )}
            </div>
            <input ref={hiddenInputRef} type="file" accept=".xlsx,.xls" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} style={{ display: "none" }} />
          </div>
        )}

        {/* ═══ STEP 2: Configure ═══ */}
        {(status === "parsed" || status === "generating") && parsedSheet && (
          <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20, animation: "fadeUp 0.5s ease both" }}>

            {/* LEFT: Configuration panel */}
            <div className="glass-card" style={{ borderRadius: 18, padding: 24, overflowY: "auto", maxHeight: "80vh" }}>

              {/* File info */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, background: T.successBg, marginBottom: 16 }}>
                <CheckCircle2 className="h-5 w-5" style={{ color: C.green }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.ink }}>{file?.name}</div>
                  <div style={{ fontSize: 11, color: T.inkLight }}>{file ? fmtSize(file.size) : ""} · {editableRows.length} filas</div>
                </div>
                <button onClick={handleReset} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: T.inkLight, padding: 4 }}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Document type */}
              <div style={{ marginBottom: 16 }}>
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">Tipo de documento</Label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["commercial-invoice", "packing-list"] as DocumentType[]).map((t) => (
                    <button key={t} onClick={() => setDocType(t)} style={{
                      flex: 1, padding: "10px 12px", borderRadius: 10, border: `2px solid ${docType === t ? T.accent : T.border}`,
                      background: docType === t ? T.accentLight : T.surface, cursor: "pointer",
                      fontSize: 11, fontWeight: 600, color: docType === t ? T.accent : T.inkMuted,
                      transition: "all 0.2s ease",
                    }}>
                      {DOCUMENT_TYPES[t].titleEs}
                    </button>
                  ))}
                </div>
              </div>

              {/* Client selector */}
              <div style={{ marginBottom: 16 }} ref={clientDropdownRef}>
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">Cliente</Label>
                <div style={{ position: "relative" }}>
                  <div onClick={() => setClientDropdownOpen(!clientDropdownOpen)} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                    borderRadius: 10, border: `1px solid ${T.border}`, cursor: "pointer", background: T.surface,
                  }}>
                    <Search className="h-4 w-4" style={{ color: T.inkLight }} />
                    {selectedClient ? (
                      <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{selectedClient.company_name}</span>
                    ) : (
                      <span style={{ fontSize: 13, color: T.inkLight }}>Buscar cliente...</span>
                    )}
                    {selectedClient && (
                      <button onClick={(e) => { e.stopPropagation(); setSelectedClient(null); setClientMessrs(""); setClientNit(""); setClientAddress(""); setClientCountryCity(""); }} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                        <X className="h-3.5 w-3.5" style={{ color: T.inkLight }} />
                      </button>
                    )}
                  </div>
                  {clientDropdownOpen && (
                    <div style={{
                      position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                      background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`,
                      boxShadow: T.shadowLg, maxHeight: 240, overflowY: "auto", marginTop: 4,
                    }}>
                      <div style={{ padding: 8, borderBottom: `1px solid ${T.borderLight}` }}>
                        <Input placeholder="Buscar por nombre o NIT..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="rounded-lg text-sm" autoFocus />
                      </div>
                      {filteredClients.length === 0 ? (
                        <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: T.inkLight }}>No se encontraron clientes</div>
                      ) : filteredClients.map((c) => {
                        const hasDocInfo = c.document_info && ((c.document_info as any).messrs || (c.document_info as any).nit);
                        return (
                          <div key={c.id} onClick={() => handleSelectClient(c)} style={{
                            padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                            borderBottom: `1px solid ${T.borderLight}`,
                          }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = T.surfaceHover)}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <Building2 className="h-4 w-4" style={{ color: T.inkLight }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{c.company_name}</div>
                              <div style={{ fontSize: 11, color: T.inkLight }}>{c.tax_id || "Sin NIT"}</div>
                            </div>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: hasDocInfo ? C.green : C.gold }} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Client fields */}
              <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, border: `1px solid ${T.borderLight}`, background: T.surfaceAlt }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.inkLight, marginBottom: 8 }}>Datos del cliente</div>
                <div className="space-y-2">
                  <div className="space-y-1"><Label className="text-xs font-semibold text-slate-500">Messrs</Label><Input value={clientMessrs} onChange={(e) => setClientMessrs(e.target.value)} placeholder="Razón social" className="rounded-lg text-sm h-8" /></div>
                  <div className="space-y-1"><Label className="text-xs font-semibold text-slate-500">NIT</Label><Input value={clientNit} onChange={(e) => setClientNit(e.target.value)} placeholder="NIT o ID tributario" className="rounded-lg text-sm h-8" /></div>
                  <div className="space-y-1"><Label className="text-xs font-semibold text-slate-500">Address</Label><Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Dirección" className="rounded-lg text-sm h-8" /></div>
                  <div className="space-y-1"><Label className="text-xs font-semibold text-slate-500">Country - City</Label><Input value={clientCountryCity} onChange={(e) => setClientCountryCity(e.target.value)} placeholder="País - Ciudad" className="rounded-lg text-sm h-8" /></div>
                </div>
              </div>

              {/* Document details */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.inkLight, marginBottom: 8 }}>Datos del documento</div>
                <div className="space-y-2">
                  <div className="space-y-1"><Label className="text-xs font-semibold text-slate-500">Descripción del producto *</Label><Input value={descriptionOfGoods} onChange={(e) => setDescriptionOfGoods(e.target.value)} placeholder="WIRE ROD SAE 1008" className="rounded-lg text-sm h-8" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs font-semibold text-slate-500">N° Documento *</Label><Input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="IBC-2026-001" className="rounded-lg text-sm h-8" /></div>
                    <div className="space-y-1"><Label className="text-xs font-semibold text-slate-500">Fecha *</Label><Input value={docDate} onChange={(e) => setDocDate(e.target.value)} placeholder="MAR.24,2026" className="rounded-lg text-sm h-8" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs font-semibold text-slate-500">Puerto Origen</Label><Input value={portOfLoading} onChange={(e) => setPortOfLoading(e.target.value)} className="rounded-lg text-sm h-8" /></div>
                    <div className="space-y-1"><Label className="text-xs font-semibold text-slate-500">Puerto Destino</Label><Input value={portOfDischarge} onChange={(e) => setPortOfDischarge(e.target.value)} className="rounded-lg text-sm h-8" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs font-semibold text-slate-500">Buque</Label><Input value={vesselName} onChange={(e) => setVesselName(e.target.value)} className="rounded-lg text-sm h-8" /></div>
                    <div className="space-y-1"><Label className="text-xs font-semibold text-slate-500">BL No</Label><Input value={blNo} onChange={(e) => setBlNo(e.target.value)} className="rounded-lg text-sm h-8" /></div>
                  </div>
                </div>
              </div>

              {/* Generate buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={handleGenerateExcel} className="btn-primary" disabled={status === "generating"} style={{
                  padding: "12px 16px", borderRadius: 12, border: "none", cursor: status === "generating" ? "wait" : "pointer",
                  background: "linear-gradient(135deg, #0B5394, #0D71B9)", color: "#fff",
                  fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  opacity: status === "generating" ? 0.7 : 1,
                }}>
                  {status === "generating" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                  Generar Excel
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handlePDFv1} style={{
                    flex: 1, padding: "10px 12px", borderRadius: 12, border: `1px solid ${T.border}`, cursor: "pointer",
                    background: T.surface, color: T.ink,
                    fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}>
                    <Download className="h-4 w-4" />
                    PDF - V1
                  </button>
                  <button onClick={handlePDFv2} style={{
                    flex: 1, padding: "10px 12px", borderRadius: 12, border: `1px solid ${T.border}`, cursor: "pointer",
                    background: T.surface, color: T.ink,
                    fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}>
                    <Download className="h-4 w-4" />
                    PDF - V2
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: Data preview */}
            <div className="glass-card" style={{ borderRadius: 18, padding: 24, overflowX: "auto", maxHeight: "80vh", overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Eye className="h-4 w-4" style={{ color: T.accent }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>Vista previa de datos</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.inkLight }}>
                  <span>Fila de encabezados:</span>
                  <Input
                    type="number" min={0} max={parsedSheet ? parsedSheet.rawData.length - 1 : 0}
                    value={headerRowOverride ?? 0}
                    onChange={(e) => setHeaderRowOverride(Number(e.target.value))}
                    className="w-16 h-7 rounded text-xs text-center"
                  />
                </div>
              </div>

              {moneyColumnIndices.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, background: T.warningBg, marginBottom: 10, fontSize: 11, color: C.gold }}>
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Las columnas de precio (USD) son editables. Los totales se recalculan automáticamente.</span>
                </div>
              )}

              {headers.length > 0 && (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      {headers.map((h, i) => (
                        <th key={i} style={{
                          padding: "8px 10px", background: "#0B5394", color: "#fff",
                          fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                          textAlign: "center", whiteSpace: "nowrap",
                          borderRight: i < headers.length - 1 ? "1px solid rgba(255,255,255,0.15)" : undefined,
                        }}>
                          {h}
                          {moneyColumnIndices.includes(i) && <span style={{ marginLeft: 4, fontSize: 9, opacity: 0.7 }}>USD</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {editableRows.map((row, ri) => (
                      <tr key={ri} style={{ background: ri % 2 === 0 ? "#fff" : "#f8f9fb" }}>
                        {headers.map((_, ci) => {
                          const val = row[ci];
                          const isNum = typeof val === "number" || (val != null && !isNaN(Number(val)) && String(val).trim() !== "");
                          return (
                            <td key={ci} style={{
                              padding: "2px 4px", borderBottom: "1px solid #f0f0f4",
                              fontSize: 11, color: T.ink,
                            }}>
                              <input
                                type={isNum ? "number" : "text"}
                                step={isNum ? "0.01" : undefined}
                                value={val != null ? val : ""}
                                onChange={(e) => updateCell(ri, ci, e.target.value)}
                                style={{
                                  width: "100%", border: `1px solid transparent`, borderRadius: 3,
                                  padding: "3px 6px", fontSize: 11,
                                  textAlign: isNum ? "right" : "left",
                                  background: "transparent",
                                  transition: "border-color 0.15s, background 0.15s",
                                }}
                                onFocus={(e) => { e.target.style.borderColor = T.accent; e.target.style.background = "#fffef5"; }}
                                onBlur={(e) => { e.target.style.borderColor = "transparent"; e.target.style.background = "transparent"; }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Done ═══ */}
        {status === "done" && convertedBlob && (
          <div className="glass-card" style={{ borderRadius: 18, padding: 32, textAlign: "center", animation: "fadeUp 0.5s ease both" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: T.successBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <CheckCircle2 className="h-8 w-8" style={{ color: C.green }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: T.ink, marginBottom: 4 }}>Documento generado</h2>
            <p style={{ fontSize: 13, color: T.inkMuted, marginBottom: 24 }}>Tu {DOCUMENT_TYPES[docType].titleEs.toLowerCase()} está lista para descargar</p>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={handleDownloadExcel} className="btn-primary" style={{
                padding: "12px 28px", borderRadius: 12, border: "none", cursor: "pointer",
                background: `linear-gradient(135deg, ${C.green}, #15803d)`, color: "#fff",
                fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8,
              }}>
                <Download className="h-5 w-5" />
                Descargar Excel (.xlsx)
              </button>
              <button onClick={handlePDFv1} style={{
                padding: "12px 24px", borderRadius: 12, border: `2px solid ${T.accent}`,
                background: T.surface, color: T.accent, cursor: "pointer",
                fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8,
              }}>
                <Download className="h-5 w-5" />
                PDF - V1
              </button>
              <button onClick={handlePDFv2} style={{
                padding: "12px 24px", borderRadius: 12, border: `2px solid ${T.accent}`,
                background: T.surface, color: T.accent, cursor: "pointer",
                fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8,
              }}>
                <Download className="h-5 w-5" />
                PDF - V2
              </button>
              <button onClick={handleBackToEdit} style={{
                padding: "12px 28px", borderRadius: 12, border: `1px solid ${T.border}`,
                background: T.surface, color: T.inkMuted, cursor: "pointer",
                fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8,
              }}>
                <ArrowLeft className="h-4 w-4" />
                Volver a editar
              </button>
              <button onClick={handleReset} style={{
                padding: "12px 28px", borderRadius: 12, border: `1px solid ${T.border}`,
                background: T.surface, color: T.inkMuted, cursor: "pointer",
                fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8,
              }}>
                <RefreshCw className="h-4 w-4" />
                Nuevo documento
              </button>
            </div>
          </div>
        )}

        {/* ═══ ERROR ═══ */}
        {status === "error" && (
          <div className="glass-card" style={{ borderRadius: 18, padding: 32, animation: "fadeUp 0.5s ease both" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 16, borderRadius: 12, background: T.dangerBg, border: `1px solid ${T.dangerSoft}` }}>
              <AlertCircle className="h-5 w-5 mt-0.5" style={{ color: C.red }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.red, marginBottom: 4 }}>Error</div>
                <div style={{ fontSize: 13, color: T.inkMuted }}>{errorMsg}</div>
              </div>
            </div>
            <button onClick={handleReset} style={{
              marginTop: 16, padding: "10px 24px", borderRadius: 10, border: `1px solid ${T.border}`,
              background: T.surface, color: T.ink, cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}>
              Intentar de nuevo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
