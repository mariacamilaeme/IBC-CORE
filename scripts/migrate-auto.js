/**
 * Automated migration: Reads STATUS.xlsx and inserts data
 * directly into Supabase (contracts + contract_invoices).
 *
 * Usage: node scripts/migrate-auto.js
 */

const ExcelJS = require("exceljs");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");

const EXCEL_PATH = path.resolve(__dirname, "../../STATUS.xlsx");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── Helpers ────────────────────────────────────────────────────────

function excelSerialToDate(serial) {
  if (!serial || typeof serial !== "number") return null;
  if (serial < 100 || serial > 55000) return null;
  const epoch = new Date(Date.UTC(1899, 11, 30));
  const d = new Date(epoch.getTime() + serial * 86400000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function cleanStr(val) {
  if (val === null || val === undefined || val === "") return null;
  const s = String(val).trim();
  if (s === "" || s === "N/A" || s === "n/a") return null;
  return s;
}

function cleanNum(val) {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function cleanDate(val) {
  if (!val) return null;
  if (typeof val === "number") return excelSerialToDate(val);
  return null;
}

function cleanDays(val) {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  if (isNaN(n)) return null;
  if (n > 730 || n < -730) return null;
  return Math.round(n);
}

function normalizeStatus(val) {
  if (!val) return "PENDIENTE ANTICIPO";
  const s = String(val).trim().toUpperCase();
  const map = {
    "ENTREGADO AL CLIENTE": "ENTREGADO AL CLIENTE",
    "EN TRÁNSITO": "EN TRÁNSITO",
    "EN TRANSITO": "EN TRÁNSITO",
    "EN PRODUCCIÓN": "EN PRODUCCIÓN",
    "EN PRODUCCION": "EN PRODUCCIÓN",
    ANULADO: "ANULADO",
    "PENDIENTE ANTICIPO": "PENDIENTE ANTICIPO",
    "PENDIENTE DE ANTICIPO": "PENDIENTE ANTICIPO",
  };
  return map[s] || "PENDIENTE ANTICIPO";
}

function normalizeProductType(val) {
  if (!val) return null;
  const s = String(val).trim().toUpperCase();
  if (s === "MP" || s === "MATERIA PRIMA") return "MP";
  if (s === "MAQUINA" || s === "MÁQUINA") return "MAQUINA";
  if (s === "MONTACARGAS") return "MONTACARGAS";
  return s;
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log("Reading Excel file:", EXCEL_PATH);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);

  // Helper: convert ExcelJS worksheet to array-of-arrays (like XLSX sheet_to_json with header:1)
  function sheetToRows(ws) {
    const rows = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      rows.push(row.values.slice(1)); // row.values is 1-indexed, slice to make 0-indexed
    });
    return rows;
  }

  // ─── 1. Migrate STATUS → contracts ──────────────────────────────
  console.log("\n=== Migrating CONTRACTS ===");

  const wsStatus = wb.getWorksheet("STATUS");
  const statusData = sheetToRows(wsStatus);

  const contractRows = [];

  for (let i = 1; i < statusData.length; i++) {
    const r = statusData[i];
    if (!r[0] && !r[3]) continue;

    contractRows.push({
      commercial_name: cleanStr(r[0]),
      client_name: cleanStr(r[1]),
      client_contract: cleanStr(r[2]),
      china_contract: cleanStr(r[3]),
      contract_date: cleanDate(r[4]),
      issue_month: cleanStr(r[5]),
      country: cleanStr(r[6]),
      incoterm: cleanStr(r[7]),
      detail: cleanStr(r[8]),
      tons_agreed: cleanNum(r[9]),
      advance_paid: cleanStr(r[10]) || "NO",
      balance_paid: cleanStr(r[11]) || "PENDIENTE",
      status: normalizeStatus(r[12]),
      notes: cleanStr(r[13]),
      production_time_days: cleanNum(r[14]),
      advance_payment_date: cleanDate(r[15]),
      delivery_date_pcc: cleanDate(r[16]),
      exw_date: cleanDate(r[17]),
      etd: cleanDate(r[18]),
      eta_initial: cleanDate(r[19]),
      eta_final: cleanDate(r[20]),
      days_difference: cleanDays(r[21]),
      delivery_month: cleanStr(r[22]),
      delivery_year: cleanStr(r[23]),
      exw_compliance: cleanStr(r[24]),
      vessel_name: cleanStr(r[25]),
      shipping_company: cleanStr(r[26]),
      bl_number: cleanStr(r[27]),
      arrival_port: cleanStr(r[28]),
      shipment_type: cleanStr(r[29]),
      tons_shipped: cleanNum(r[30]),
      tons_difference: cleanNum(r[31]),
      tons_compliance: cleanStr(r[32]),
      bl_released: cleanStr(r[34]),
      documents_sent: cleanStr(r[35]),
      documents_pending: cleanStr(r[36]),
      physical_docs_sent: cleanStr(r[37]),
      pending_client_amount: cleanNum(r[38]),
      product_type: normalizeProductType(r[40]),
      is_active: true,
    });
  }

  console.log(`Prepared ${contractRows.length} contract rows`);

  // Insert in batches of 50
  const BATCH_SIZE = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < contractRows.length; i += BATCH_SIZE) {
    const batch = contractRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("contracts").insert(batch);

    if (error) {
      console.error(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} ERROR:`, error.message);
      errors++;
      // Try one by one for failed batch
      for (const row of batch) {
        const { error: rowErr } = await supabase.from("contracts").insert(row);
        if (rowErr) {
          console.error(`    Row error (${row.china_contract}):`, rowErr.message);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
      console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} rows OK (total: ${inserted})`);
    }
  }

  console.log(`\nContracts: ${inserted} inserted, ${errors} batch errors`);

  // ─── 2. Migrate FACTURAS → contract_invoices ───────────────────
  console.log("\n=== Migrating CONTRACT INVOICES ===");

  const wsFact = wb.getWorksheet("FACTURAS");
  const factData = sheetToRows(wsFact);

  const invoiceRows = [];

  for (let i = 1; i < factData.length; i++) {
    const r = factData[i];
    if (!r[0] && !r[2]) continue;

    invoiceRows.push({
      invoice_date: cleanDate(r[0]),
      customer_name: cleanStr(r[1]),
      china_invoice_number: cleanStr(r[2]),
      china_invoice_value: cleanNum(r[3]),
      customer_contract: cleanStr(r[4]),
      customer_invoice_value: cleanNum(r[5]),
      approved: r[6] === true || r[6] === "true",
      notes: cleanStr(r[7]),
    });
  }

  console.log(`Prepared ${invoiceRows.length} invoice rows`);

  let insertedInv = 0;
  let errorsInv = 0;

  for (let i = 0; i < invoiceRows.length; i += BATCH_SIZE) {
    const batch = invoiceRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("contract_invoices").insert(batch);

    if (error) {
      console.error(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} ERROR:`, error.message);
      errorsInv++;
      for (const row of batch) {
        const { error: rowErr } = await supabase.from("contract_invoices").insert(row);
        if (rowErr) {
          console.error(`    Row error (${row.china_invoice_number}):`, rowErr.message);
        } else {
          insertedInv++;
        }
      }
    } else {
      insertedInv += batch.length;
      console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} rows OK (total: ${insertedInv})`);
    }
  }

  console.log(`\nInvoices: ${insertedInv} inserted, ${errorsInv} batch errors`);
  console.log("\n=== Migration Complete ===");
}

main().catch(console.error);
