import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

// =====================================================
// POST /api/admin/import-status
// Recibe un xlsx (STATUS ACTUAL.xlsx) y replica
// scripts/migrate-status.mjs:
//   - Lee hojas "STATUS" y "FACTURAS"
//   - Upserta contracts y contract_invoices
// =====================================================

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min

// ----- helpers ----------------------------------------------------------

function excelSerialToDate(serial: unknown): string | null {
  if (serial == null || serial === "" || serial === 0) return null;
  const num = Number(serial);
  if (isNaN(num) || num <= 0) return null;
  const date = new Date((num - 25569) * 86400 * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function cleanStringKeepZero(val: unknown): string | null {
  if (val == null) return null;
  if (typeof val === "number") return String(val).trim();
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed === "" ? null : trimmed;
  }
  return null;
}

function cleanNumber(val: unknown): number | null {
  if (val == null || val === "") return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

function normalizeStatus(val: unknown): string | null {
  if (val == null) return null;
  const s = String(val).trim().toUpperCase();
  const mapping: Record<string, string> = {
    "EN TRANSITO": "EN TRÁNSITO",
    "EN TRÁNSITO": "EN TRÁNSITO",
    "EN PRODUCCION": "EN PRODUCCIÓN",
    "EN PRODUCCIÓN": "EN PRODUCCIÓN",
    "ENTREGADO AL CLIENTE": "ENTREGADO AL CLIENTE",
    "ANULADO": "ANULADO",
    "PENDIENTE ANTICIPO": "PENDIENTE ANTICIPO",
  };
  return mapping[s] || s;
}

type Row = Record<string, unknown>;

// ----- transformers ----------------------------------------------------

function readStatusSheet(workbook: XLSX.WorkBook) {
  const ws = workbook.Sheets["STATUS"];
  if (!ws) throw new Error('La hoja "STATUS" no se encontró en el archivo');
  const rawRows = XLSX.utils.sheet_to_json<Row>(ws, { defval: null });

  const contracts = [];
  const skipped: { excel_row: number; commercial: string | null; reason: string }[] = [];
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const excelRowNumber = i + 2; // +2: row 1 es el header, sheet_to_json arranca en data row
    if (!row["COMERCIAL"] && !row["CONTRATO CHINA"]) continue;

    // CLIENTE es obligatorio en la BD — saltar y reportar si está vacío
    if (!cleanStringKeepZero(row["CLIENTE"])) {
      skipped.push({
        excel_row: excelRowNumber,
        commercial: cleanStringKeepZero(row["COMERCIAL"]),
        reason: "CLIENTE vacío",
      });
      continue;
    }

    let vesselName: string | null | unknown = row["VESSEL NAME"];
    if (vesselName === 0 || vesselName === "0") vesselName = null;
    else if (typeof vesselName === "string") vesselName = vesselName.trim() || null;

    let shippingCompany: string | null | unknown = row["SHIPPING COMPANY"];
    if (shippingCompany === 0 || shippingCompany === "0") shippingCompany = null;
    else if (typeof shippingCompany === "string") shippingCompany = shippingCompany.trim() || null;

    contracts.push({
      commercial_name: cleanStringKeepZero(row["COMERCIAL"]),
      client_name: cleanStringKeepZero(row["CLIENTE"]),
      client_contract: cleanStringKeepZero(row["CONTRATO CLIENTE"]),
      china_contract: cleanStringKeepZero(row["CONTRATO CHINA"]),
      contract_date: excelSerialToDate(row["FECHA DE CONTRATO"]),
      issue_month: cleanStringKeepZero(row["FECHA EMISIÓN SC"]),
      country: cleanStringKeepZero(row["PAIS"]),
      incoterm: row["INCOTERM"] != null ? String(row["INCOTERM"]).trim() : null,
      detail: cleanStringKeepZero(row["DETALLE"]),
      tons_agreed: cleanNumber(row["TONELADAS (SC)"]),
      advance_paid: cleanStringKeepZero(row["PAGÓ ANTICIPO"]),
      balance_paid: cleanStringKeepZero(row["PAGÓ SALDO"]),
      status: normalizeStatus(row["STATUS"]),
      notes: cleanStringKeepZero(row["OBSERVACIÓN"]),
      production_time_days: cleanNumber(row["TIEMPO PRODUCCIÓN"]),
      advance_payment_date: excelSerialToDate(row["F. PAGO ANTICIPO"]),
      delivery_date_pcc: excelSerialToDate(row["FECHA DE ENTREGA PCC"]),
      exw_date: excelSerialToDate(row["EXW"]),
      etd: excelSerialToDate(row["ETD"]),
      eta_initial: excelSerialToDate(row["ETA INICIAL"]),
      eta_final: excelSerialToDate(row["ETA FINAL"]),
      days_difference: cleanNumber(row["DÍAS DE DIFERENCIA ENTREGA REAL VS ENTREGA ESTIMADA (EXW)"]),
      delivery_month: cleanStringKeepZero(row["MES ENTREGA"]),
      delivery_year: cleanStringKeepZero(row["AÑO ENTREGA"]),
      exw_compliance: cleanStringKeepZero(row["CALIFICACION"]),
      vessel_name: vesselName as string | null,
      shipping_company: shippingCompany as string | null,
      bl_number: cleanStringKeepZero(row["BL"]),
      arrival_port: cleanStringKeepZero(row["ARRIVAL PORT"]),
      shipment_type: cleanStringKeepZero(row["TIPO DE EMBARQUE"]),
      tons_shipped: cleanNumber(row["MT SHIPPED"]),
      tons_difference: cleanNumber(row["DIFERENCIA TONS"]),
      tons_compliance: cleanStringKeepZero(row["CALIFICACIÓN TONELADAS"]),
      bl_released: cleanStringKeepZero(row["LIBERACIÓN BL"]),
      documents_sent: cleanStringKeepZero(row["DOCUMENTOS ENVIADOS"]),
      documents_pending: cleanStringKeepZero(row["DOCUMENTOS PENDIENTES"]),
      physical_docs_sent: cleanStringKeepZero(row["DOCUMENTOS FISICOS ENVIADOS AL CLIENTE"]),
      pending_client_amount: cleanNumber(row["VALOR POR PAGAR CLIENTE"]),
      product_type: row["TIPO"] != null ? String(row["TIPO"]).trim() : null,
      is_active: true,
    });
  }
  return { contracts, skipped };
}

// Facturas con fecha <= AUTO_APPROVE_CUTOFF se aprueban automáticamente
const AUTO_APPROVE_CUTOFF = "2026-03-24";

function readFacturasSheet(workbook: XLSX.WorkBook) {
  const ws = workbook.Sheets["FACTURAS"];
  if (!ws) return { invoices: [], auto_approved: 0 };
  const rawRows = XLSX.utils.sheet_to_json<Row>(ws, { defval: null });

  const invoices = [];
  let autoApproved = 0;
  for (const row of rawRows) {
    if (!row["DATE"] && !row["CHINA INVOICE"]) continue;
    const invoiceDate = excelSerialToDate(row["DATE"]);
    const chinaInvoice = cleanStringKeepZero(row["CHINA INVOICE"]);
    if (!invoiceDate && !chinaInvoice) continue;

    let approved = false;
    const ap = row["APROBACIÓN"];
    if (ap === true || ap === "true") approved = true;
    else if (typeof ap === "string") approved = ap.trim().toUpperCase() === "OK";

    // Regla: facturas del 24-marzo-2026 hacia atrás → aprobadas automáticamente
    if (!approved && invoiceDate && invoiceDate <= AUTO_APPROVE_CUTOFF) {
      approved = true;
      autoApproved += 1;
    }

    invoices.push({
      invoice_date: invoiceDate,
      customer_name: cleanStringKeepZero(row["CUSTOMER"]),
      china_invoice_number: chinaInvoice,
      china_invoice_value: cleanNumber(row[" INVOICE"]),
      customer_contract: cleanStringKeepZero(row["SC CUSTOMER"]),
      customer_invoice_value: cleanNumber(row[" INVOICE2"]),
      approved,
      notes: cleanStringKeepZero(row["OBSERVACIONES"]),
      is_active: true,
    });
  }
  return { invoices, auto_approved: autoApproved };
}

// ----- DB ops ----------------------------------------------------------

type AnyClient = Awaited<ReturnType<typeof createServiceClient>>;

async function fetchAll(supabase: AnyClient, table: string) {
  const PAGE_SIZE = 1000;
  let all: Record<string, unknown>[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select("*").range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Error leyendo ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

type ContractRow = ReturnType<typeof readStatusSheet>["contracts"][number];
type SkippedRow = ReturnType<typeof readStatusSheet>["skipped"][number];
type InvoiceRow = ReturnType<typeof readFacturasSheet>["invoices"][number];

async function upsertContracts(supabase: AnyClient, contracts: ContractRow[]) {
  const existing = await fetchAll(supabase, "contracts");

  // PARCIALES rename
  let renamed = 0;
  const parcialBases = new Map<string, string[]>();
  for (const pc of contracts) {
    const cc = (pc.client_contract || "").trim();
    const m = cc.match(/^(.+)-(\d)$/);
    if (m) {
      const base = m[1];
      if (!parcialBases.has(base)) parcialBases.set(base, []);
      parcialBases.get(base)!.push(cc);
    }
  }
  for (const [base, parciales] of parcialBases.entries()) {
    if (!parciales.includes(`${base}-1`)) continue;
    const existingBase = existing.find(e => ((e.client_contract as string) || "").trim() === base);
    if (existingBase) {
      const newName = `${base}-1`;
      const { error } = await supabase.from("contracts").update({ client_contract: newName }).eq("id", existingBase.id as string);
      if (!error) {
        existingBase.client_contract = newName;
        renamed++;
      }
    }
  }

  const existingMap = new Map<string, Record<string, unknown>>();
  for (const c of existing) {
    const key = `${((c.client_contract as string) || "").trim()}|${((c.china_contract as string) || "").trim()}`;
    existingMap.set(key, c);
  }

  let inserted = 0;
  let updated = 0;
  let errors = 0;
  const errorSamples: string[] = [];

  for (const contract of contracts) {
    const key = `${(contract.client_contract || "").trim()}|${(contract.china_contract || "").trim()}`;
    const match = existingMap.get(key);
    if (match) {
      const { error } = await supabase.from("contracts").update(contract).eq("id", match.id as string);
      if (error) {
        errors++;
        if (errorSamples.length < 5) errorSamples.push(`UPDATE ${key}: ${error.message}`);
      } else updated++;
    } else {
      const { data, error } = await supabase.from("contracts").insert(contract).select("id, client_contract, china_contract").single();
      if (error) {
        errors++;
        if (errorSamples.length < 5) errorSamples.push(`INSERT ${key}: ${error.message}`);
      } else {
        inserted++;
        if (data) existingMap.set(key, data as Record<string, unknown>);
      }
    }
  }
  return { inserted, updated, renamed, errors, errorSamples };
}

async function upsertInvoices(supabase: AnyClient, invoices: InvoiceRow[]) {
  const existing = await fetchAll(supabase, "contract_invoices");
  const existingMap = new Map<string, Record<string, unknown>>();
  for (const inv of existing) {
    const key = `${((inv.china_invoice_number as string) || "").trim()}|${((inv.customer_contract as string) || "").trim()}`;
    existingMap.set(key, inv);
  }

  let inserted = 0;
  let updated = 0;
  let errors = 0;
  const errorSamples: string[] = [];

  for (const invoice of invoices) {
    const key = `${(invoice.china_invoice_number || "").trim()}|${(invoice.customer_contract || "").trim()}`;
    const match = existingMap.get(key);
    if (match) {
      const { error } = await supabase.from("contract_invoices").update(invoice).eq("id", match.id as string);
      if (error) {
        errors++;
        if (errorSamples.length < 5) errorSamples.push(`UPDATE ${key}: ${error.message}`);
      } else updated++;
    } else {
      const { data, error } = await supabase.from("contract_invoices").insert(invoice).select("id, china_invoice_number, customer_contract").single();
      if (error) {
        errors++;
        if (errorSamples.length < 5) errorSamples.push(`INSERT ${key}: ${error.message}`);
      } else {
        inserted++;
        if (data) existingMap.set(key, data as Record<string, unknown>);
      }
    }
  }
  return { inserted, updated, errors, errorSamples };
}

// ----- handler ---------------------------------------------------------

export async function POST(request: NextRequest) {
  // 1. Auth: solo admin / directora
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 403 });
  }
  if (!["admin", "directora"].includes(profile.role)) {
    return NextResponse.json({ error: "Permisos insuficientes (requiere admin o directora)" }, { status: 403 });
  }

  // 2. Recibir archivo
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Formato inválido (esperado multipart/form-data)" }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 });
  }
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "Archivo demasiado grande (máx 50 MB)" }, { status: 400 });
  }

  // 3. Parsear xlsx
  let workbook: XLSX.WorkBook;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  } catch (err) {
    return NextResponse.json({ error: `No se pudo leer el archivo: ${(err as Error).message}` }, { status: 400 });
  }

  if (!workbook.SheetNames.includes("STATUS")) {
    return NextResponse.json({
      error: 'La hoja "STATUS" no está en el archivo',
      detail: `Hojas encontradas: ${workbook.SheetNames.join(", ")}`,
    }, { status: 400 });
  }

  let contracts: ContractRow[];
  let skippedContracts: SkippedRow[] = [];
  let invoices: InvoiceRow[];
  let autoApproved = 0;
  try {
    const statusResult = readStatusSheet(workbook);
    contracts = statusResult.contracts;
    skippedContracts = statusResult.skipped;
    const facturasResult = readFacturasSheet(workbook);
    invoices = facturasResult.invoices;
    autoApproved = facturasResult.auto_approved;
  } catch (err) {
    return NextResponse.json({ error: `Error transformando los datos: ${(err as Error).message}` }, { status: 400 });
  }

  // Solo procesamos STATUS y FACTURAS — listamos las demás como ignoradas
  const PROCESSED_SHEETS = new Set(["STATUS", "FACTURAS"]);
  const ignoredSheets = workbook.SheetNames.filter(s => !PROCESSED_SHEETS.has(s));

  // 4. Upsert con service role (bypasses RLS)
  const serviceClient = await createServiceClient();

  let contractResult, invoiceResult;
  try {
    contractResult = await upsertContracts(serviceClient, contracts);
    invoiceResult = await upsertInvoices(serviceClient, invoices);
  } catch (err) {
    return NextResponse.json({ error: `Error durante la migración: ${(err as Error).message}` }, { status: 500 });
  }

  // 5. Respuesta resumen
  return NextResponse.json({
    success: true,
    file: file.name,
    sheets_found: workbook.SheetNames,
    sheets_processed: workbook.SheetNames.filter(s => PROCESSED_SHEETS.has(s)),
    sheets_ignored: ignoredSheets,
    contracts: {
      total: contracts.length,
      inserted: contractResult.inserted,
      updated: contractResult.updated,
      renamed: contractResult.renamed,
      errors: contractResult.errors,
      error_samples: contractResult.errorSamples,
      skipped: skippedContracts.length,
      skipped_details: skippedContracts.map(s => `Fila ${s.excel_row} (${s.commercial || "sin comercial"}): ${s.reason}`),
    },
    invoices: {
      total: invoices.length,
      inserted: invoiceResult.inserted,
      updated: invoiceResult.updated,
      auto_approved_legacy: autoApproved,
      auto_approve_cutoff: AUTO_APPROVE_CUTOFF,
      errors: invoiceResult.errors,
      error_samples: invoiceResult.errorSamples,
    },
    processed_at: new Date().toISOString(),
    processed_by: profile.full_name,
  });
}
