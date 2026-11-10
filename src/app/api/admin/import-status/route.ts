import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { cleanPaymentTerms } from "@/lib/payment-terms";
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
      // El Excel renombró "CALIFICACION" → "CALIFICACION TIEMPO" (oct 2026); se aceptan ambas
      exw_compliance: cleanStringKeepZero(row["CALIFICACION TIEMPO"] ?? row["CALIFICACION"]),
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
      safety_incident: cleanStringKeepZero(row["INCIDENTE DE SEGURIDAD"]),
      pending_client_amount: cleanNumber(row["VALOR POR PAGAR CLIENTE"]),
      payment_terms: cleanPaymentTerms(row["JPB"]),
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

async function fetchAll(supabase: AnyClient, table: string, columns = "*") {
  const PAGE_SIZE = 1000;
  let all: Record<string, unknown>[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Error leyendo ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    all = all.concat(data as unknown as Record<string, unknown>[]);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

// Escritura por lotes: una petición por cada 500 filas en lugar de una por fila.
// Si un lote falla, se reintenta fila a fila solo ese lote para reportar los registros con problema.
const BATCH_SIZE = 500;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

type WriteCounters = { ok: number; errors: number; errorSamples: string[] };

async function bulkWrite(
  supabase: AnyClient,
  table: string,
  rows: Record<string, unknown>[],
  mode: "insert" | "upsert",
  counters: WriteCounters,
  keyOf: (r: Record<string, unknown>) => string,
) {
  for (const part of chunk(rows, BATCH_SIZE)) {
    const { error } = mode === "insert"
      ? await supabase.from(table).insert(part)
      : await supabase.from(table).upsert(part, { onConflict: "id" });
    if (!error) {
      counters.ok += part.length;
      continue;
    }
    for (const row of part) {
      const single = mode === "insert"
        ? await supabase.from(table).insert(row)
        : await supabase.from(table).upsert(row, { onConflict: "id" });
      if (single.error) {
        counters.errors++;
        if (counters.errorSamples.length < 5) counters.errorSamples.push(`${mode.toUpperCase()} ${keyOf(row)}: ${single.error.message}`);
      } else counters.ok++;
    }
  }
}

type ContractRow = ReturnType<typeof readStatusSheet>["contracts"][number];
type SkippedRow = ReturnType<typeof readStatusSheet>["skipped"][number];
type InvoiceRow = ReturnType<typeof readFacturasSheet>["invoices"][number];

// Clave natural normalizada: mayúsculas y sin espacios, para que
// "PT-260250 - 028" y "PT-260250-028" se reconozcan como el mismo contrato.
const normPart = (v: unknown) => String(v ?? "").replace(/\s+/g, "").toUpperCase();
const contractKey = (cc: unknown, ch: unknown) => `${normPart(cc)}|${normPart(ch)}`;

async function upsertContracts(supabase: AnyClient, contracts: ContractRow[]) {
  const existing = await fetchAll(supabase, "contracts", "id, client_contract, china_contract, client_name, is_active, updated_at");

  const batchClientContracts = new Set(contracts.map(c => normPart(c.client_contract)));

  // PARCIALES rename: si el Excel trae "X-1" y la BD todavía tiene "X", renombramos.
  // Guardas: solo si el Excel YA NO usa "X" (si lo usa, es otro contrato — p. ej. dos
  // clientes comparten número) y solo si la fila de la BD es del MISMO cliente.
  let renamed = 0;
  const parcialRows = new Map<string, ContractRow[]>();
  for (const pc of contracts) {
    const cc = (pc.client_contract || "").trim();
    const m = cc.match(/^(.+)-(\d)$/);
    if (m) {
      const base = m[1];
      if (!parcialRows.has(base)) parcialRows.set(base, []);
      parcialRows.get(base)!.push(pc);
    }
  }
  for (const [base, parciales] of parcialRows.entries()) {
    const parcialUno = parciales.find(p => normPart(p.client_contract) === normPart(`${base}-1`));
    if (!parcialUno) continue;
    if (batchClientContracts.has(normPart(base))) continue; // el Excel aún usa el nombre base → no tocar
    const existingBase = existing.find(e =>
      e.is_active === true &&
      normPart(e.client_contract) === normPart(base) &&
      normPart(e.client_name) === normPart(parcialUno.client_name)
    );
    if (existingBase) {
      const newName = `${base}-1`;
      const { error } = await supabase.from("contracts").update({ client_contract: newName }).eq("id", existingBase.id as string);
      if (!error) {
        existingBase.client_contract = newName;
        renamed++;
      }
    }
  }

  // Mapa de existentes por clave. Si hay filas duplicadas con la misma clave
  // (herencia de imports anteriores), gana la activa actualizada más reciente;
  // las demás quedarán sin match y se desactivan abajo.
  const existingMap = new Map<string, Record<string, unknown>>();
  for (const c of existing) {
    const key = contractKey(c.client_contract, c.china_contract);
    const prev = existingMap.get(key);
    if (!prev) { existingMap.set(key, c); continue; }
    const cActive = c.is_active === true, pActive = prev.is_active === true;
    if (cActive !== pActive) { if (cActive) existingMap.set(key, c); continue; }
    if (String(c.updated_at || "") > String(prev.updated_at || "")) existingMap.set(key, c);
  }

  // Dedupe por clave natural — la última fila del Excel gana (mismo resultado
  // neto que el proceso secuencial anterior, donde la última escritura pisaba a la primera)
  const byKey = new Map<string, ContractRow>();
  for (const contract of contracts) {
    byKey.set(contractKey(contract.client_contract, contract.china_contract), contract);
  }

  const matchedIds = new Set<string>();
  const toInsert: Record<string, unknown>[] = [];
  const toUpdate: Record<string, unknown>[] = [];
  for (const [key, contract] of byKey) {
    const match = existingMap.get(key);
    if (match) {
      matchedIds.add(match.id as string);
      toUpdate.push({ id: match.id, ...contract });
    } else toInsert.push({ ...contract });
  }

  const ins: WriteCounters = { ok: 0, errors: 0, errorSamples: [] };
  const upd: WriteCounters = { ok: 0, errors: 0, errorSamples: [] };
  const keyOf = (r: Record<string, unknown>) => `${r.client_contract || ""}|${r.china_contract || ""}`;
  await bulkWrite(supabase, "contracts", toInsert, "insert", ins, keyOf);
  await bulkWrite(supabase, "contracts", toUpdate, "upsert", upd, keyOf);

  // El Excel es la fuente de verdad del portafolio completo: cualquier fila
  // activa que no vino en este archivo (contrato renombrado, duplicado viejo,
  // fila eliminada) se desactiva para que ningún módulo muestre fantasmas.
  // Salvaguarda: si el archivo trae menos de la mitad de los contratos activos,
  // probablemente está incompleto o es el archivo equivocado — no desactivamos nada.
  const activeCount = existing.filter(e => e.is_active === true).length;
  const safeToDeactivate = byKey.size >= activeCount * 0.5;
  const stale = safeToDeactivate
    ? existing.filter(e => e.is_active === true && !matchedIds.has(e.id as string))
    : [];
  let deactivated = 0;
  const deactivatedSamples: string[] = [];
  for (const part of chunk(stale, 100)) {
    const ids = part.map(e => e.id as string);
    const { error } = await supabase.from("contracts").update({ is_active: false }).in("id", ids);
    if (!error) {
      deactivated += ids.length;
      for (const e of part) {
        if (deactivatedSamples.length < 15) {
          deactivatedSamples.push(`${(e.client_contract as string) || "(sin contrato)"} · ${(e.client_name as string) || "?"}`);
        }
      }
    }
  }

  return {
    inserted: ins.ok,
    updated: upd.ok,
    renamed,
    deactivated,
    deactivatedSamples,
    duplicates_in_file: contracts.length - byKey.size,
    errors: ins.errors + upd.errors,
    errorSamples: [...ins.errorSamples, ...upd.errorSamples].slice(0, 5),
  };
}

async function upsertInvoices(supabase: AnyClient, invoices: InvoiceRow[]) {
  const existing = await fetchAll(supabase, "contract_invoices", "id, china_invoice_number, customer_contract");
  const existingMap = new Map<string, Record<string, unknown>>();
  for (const inv of existing) {
    const key = `${((inv.china_invoice_number as string) || "").trim()}|${((inv.customer_contract as string) || "").trim()}`;
    existingMap.set(key, inv);
  }

  const byKey = new Map<string, InvoiceRow>();
  for (const invoice of invoices) {
    const key = `${(invoice.china_invoice_number || "").trim()}|${(invoice.customer_contract || "").trim()}`;
    byKey.set(key, invoice);
  }

  const toInsert: Record<string, unknown>[] = [];
  const toUpdate: Record<string, unknown>[] = [];
  for (const [key, invoice] of byKey) {
    const match = existingMap.get(key);
    if (match) toUpdate.push({ id: match.id, ...invoice });
    else toInsert.push({ ...invoice });
  }

  const ins: WriteCounters = { ok: 0, errors: 0, errorSamples: [] };
  const upd: WriteCounters = { ok: 0, errors: 0, errorSamples: [] };
  const keyOf = (r: Record<string, unknown>) => `${r.china_invoice_number || ""}|${r.customer_contract || ""}`;
  await bulkWrite(supabase, "contract_invoices", toInsert, "insert", ins, keyOf);
  await bulkWrite(supabase, "contract_invoices", toUpdate, "upsert", upd, keyOf);

  return {
    inserted: ins.ok,
    updated: upd.ok,
    duplicates_in_file: invoices.length - byKey.size,
    errors: ins.errors + upd.errors,
    errorSamples: [...ins.errorSamples, ...upd.errorSamples].slice(0, 5),
  };
}

// ----- handler ---------------------------------------------------------

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
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

  // Salvaguarda: si la columna safety_incident aún no existe en la BD
  // (falta correr la migración), se descarta ese campo para no romper el import.
  const warnings: string[] = [];
  const { error: colProbe } = await serviceClient.from("contracts").select("safety_incident").limit(1);
  if (colProbe) {
    for (const c of contracts) delete (c as Record<string, unknown>).safety_incident;
    warnings.push('La columna "INCIDENTE DE SEGURIDAD" no se guardó: falta ejecutar la migración 004 en Supabase (supabase/migrations/004_safety_incident.sql).');
  }
  const { error: termsProbe } = await serviceClient.from("contracts").select("payment_terms").limit(1);
  if (termsProbe) {
    for (const c of contracts) delete (c as Record<string, unknown>).payment_terms;
    warnings.push('La columna "JPB" (vencimiento de pago) no se guardó: falta ejecutar la migración 005 en Supabase (supabase/migrations/005_payment_terms.sql).');
  }

  let contractResult, invoiceResult;
  try {
    // Tablas independientes — se migran en paralelo
    [contractResult, invoiceResult] = await Promise.all([
      upsertContracts(serviceClient, contracts),
      upsertInvoices(serviceClient, invoices),
    ]);
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
    warnings,
    contracts: {
      total: contracts.length,
      inserted: contractResult.inserted,
      updated: contractResult.updated,
      renamed: contractResult.renamed,
      deactivated: contractResult.deactivated,
      deactivated_samples: contractResult.deactivatedSamples,
      duplicates_in_file: contractResult.duplicates_in_file,
      errors: contractResult.errors,
      error_samples: contractResult.errorSamples,
      skipped: skippedContracts.length,
      skipped_details: skippedContracts.map(s => `Fila ${s.excel_row} (${s.commercial || "sin comercial"}): ${s.reason}`),
    },
    invoices: {
      total: invoices.length,
      inserted: invoiceResult.inserted,
      updated: invoiceResult.updated,
      duplicates_in_file: invoiceResult.duplicates_in_file,
      auto_approved_legacy: autoApproved,
      auto_approve_cutoff: AUTO_APPROVE_CUTOFF,
      errors: invoiceResult.errors,
      error_samples: invoiceResult.errorSamples,
    },
    duration_ms: Date.now() - startedAt,
    processed_at: new Date().toISOString(),
    processed_by: profile.full_name,
  });
}
