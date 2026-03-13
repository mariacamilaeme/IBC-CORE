/**
 * Migration script: Reads STATUS.xlsx and generates SQL INSERT statements
 * for contracts and contract_invoices tables.
 *
 * Usage: node scripts/migrate-excel.js
 * Output: scripts/output_contracts.sql and scripts/output_invoices.sql
 */

const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

const EXCEL_PATH = path.resolve(__dirname, "../../STATUS.xlsx");
const OUT_CONTRACTS = path.resolve(__dirname, "output_contracts.sql");
const OUT_INVOICES = path.resolve(__dirname, "output_invoices.sql");

// ─── Helpers ────────────────────────────────────────────────────────

function excelSerialToDate(serial) {
  if (!serial || typeof serial !== "number") return null;
  if (serial < 100) return null; // small numbers are not dates
  // Excel epoch: Jan 0, 1900 = serial 0. JS: Dec 30, 1899
  const epoch = new Date(Date.UTC(1899, 11, 30));
  const d = new Date(epoch.getTime() + serial * 86400000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function esc(val) {
  if (val === null || val === undefined || val === "") return "NULL";
  const s = String(val).replace(/'/g, "''").trim();
  if (s === "" || s === "N/A" || s === "n/a") return "NULL";
  return `'${s}'`;
}

function escNum(val) {
  if (val === null || val === undefined || val === "") return "NULL";
  const n = Number(val);
  return isNaN(n) ? "NULL" : String(n);
}

function escBool(val) {
  if (val === true || val === "true") return "true";
  if (val === false || val === "false") return "false";
  return "false";
}

function escDate(val) {
  if (!val) return "NULL";
  if (typeof val === "number") {
    // Valid Excel serial dates are roughly 100–55000 (1900–2050)
    if (val > 55000 || val < 100) return "NULL";
    const d = excelSerialToDate(val);
    return d ? `'${d}'` : "NULL";
  }
  return "NULL";
}

function escDays(val) {
  if (val === null || val === undefined || val === "") return "NULL";
  const n = Number(val);
  if (isNaN(n)) return "NULL";
  // days_difference should be reasonable (< 730 = 2 years max)
  // Values above that are Excel serial numbers, not day counts
  if (n > 730 || n < -730) return "NULL";
  return String(Math.round(n));
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

// Helper: convert ExcelJS worksheet to array-of-arrays
function sheetToRows(ws) {
  const rows = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    rows.push(row.values.slice(1));
  });
  return rows;
}

async function runMigration() {
console.log("Reading Excel file:", EXCEL_PATH);
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(EXCEL_PATH);

// ─── STATUS → contracts ─────────────────────────────────────────────

const wsStatus = wb.getWorksheet("STATUS");
const statusData = sheetToRows(wsStatus);

let contractsSql = "-- Migration: contracts from STATUS sheet\n";
contractsSql += "-- Generated: " + new Date().toISOString() + "\n\n";

let contractCount = 0;
const BATCH = 30;
let batch = [];

function flushBatch() {
  if (batch.length === 0) return;
  contractsSql += "INSERT INTO public.contracts (\n";
  contractsSql +=
    "  commercial_name, client_name, client_contract, china_contract,\n";
  contractsSql += "  contract_date, issue_month, country, incoterm, detail,\n";
  contractsSql += "  tons_agreed, advance_paid, balance_paid, status, notes,\n";
  contractsSql +=
    "  production_time_days, advance_payment_date, delivery_date_pcc,\n";
  contractsSql += "  exw_date, etd, eta_initial, eta_final,\n";
  contractsSql +=
    "  days_difference, delivery_month, delivery_year, exw_compliance,\n";
  contractsSql += "  vessel_name, shipping_company, bl_number, arrival_port,\n";
  contractsSql += "  shipment_type, tons_shipped, tons_difference,\n";
  contractsSql +=
    "  tons_compliance, bl_released, documents_sent, documents_pending,\n";
  contractsSql +=
    "  physical_docs_sent, pending_client_amount, product_type\n";
  contractsSql += ") VALUES\n";
  contractsSql += batch.join(",\n");
  contractsSql += ";\n\n";
  batch = [];
}

for (let i = 1; i < statusData.length; i++) {
  const r = statusData[i];
  // Skip empty rows
  if (!r[0] && !r[3]) continue;

  const commercial = r[0] || "";
  const client = r[1] || "";
  const clientContract = r[2] || "";
  const chinaContract = r[3] || "";
  const contractDate = r[4];
  const issueMonth = r[5] || "";
  const country = r[6] || "";
  const incoterm = r[7] || "";
  const detail = r[8] || "";
  const tonsAgreed = r[9];
  const advancePaid = r[10] || "NO";
  const balancePaid = r[11] || "PENDIENTE";
  const status = normalizeStatus(r[12]);
  const notes = r[13] || "";
  const productionTime = r[14];
  const advancePaymentDate = r[15];
  const deliveryDatePcc = r[16];
  const exwDate = r[17];
  const etd = r[18];
  const etaInitial = r[19];
  const etaFinal = r[20];
  const daysDiff = r[21];
  const deliveryMonth = r[22] || "";
  const deliveryYear = r[23] || "";
  const exwCompliance = r[24] || "";
  const vesselName = r[25] || "";
  const shippingCompany = r[26] || "";
  const blNumber = r[27] || "";
  const arrivalPort = r[28] || "";
  const shipmentType = r[29] || "";
  const tonsShipped = r[30];
  const tonsDiff = r[31];
  const tonsCompliance = r[32] || "";
  // r[33] = PAGO (skip)
  const blReleased = r[34] || "";
  const docsSent = r[35] || "";
  const docsPending = r[36] || "";
  const physicalDocs = r[37] || "";
  const pendingAmount = r[38];
  // r[39] = JPB (skip)
  const productType = normalizeProductType(r[40]);

  const row = `(${esc(commercial)}, ${esc(client)}, ${esc(clientContract)}, ${esc(chinaContract)},
  ${escDate(contractDate)}, ${esc(issueMonth)}, ${esc(country)}, ${esc(incoterm)}, ${esc(detail)},
  ${escNum(tonsAgreed)}, ${esc(advancePaid)}, ${esc(balancePaid)}, ${esc(status)}, ${esc(notes)},
  ${escNum(productionTime)}, ${escDate(advancePaymentDate)}, ${escDate(deliveryDatePcc)},
  ${escDate(exwDate)}, ${escDate(etd)}, ${escDate(etaInitial)}, ${escDate(etaFinal)},
  ${escDays(daysDiff)}, ${esc(deliveryMonth)}, ${esc(deliveryYear)}, ${esc(exwCompliance)},
  ${esc(vesselName)}, ${esc(shippingCompany)}, ${esc(blNumber)}, ${esc(arrivalPort)},
  ${esc(shipmentType)}, ${escNum(tonsShipped)}, ${escNum(tonsDiff)},
  ${esc(tonsCompliance)}, ${esc(blReleased)}, ${esc(docsSent)}, ${esc(docsPending)},
  ${esc(physicalDocs)}, ${escNum(pendingAmount)}, ${esc(productType)})`;

  batch.push(row);
  contractCount++;

  if (batch.length >= BATCH) {
    flushBatch();
  }
}

flushBatch();

fs.writeFileSync(OUT_CONTRACTS, contractsSql, "utf-8");
console.log(`Contracts: ${contractCount} rows → ${OUT_CONTRACTS}`);

// ─── FACTURAS → contract_invoices ───────────────────────────────────

const wsFact = wb.getWorksheet("FACTURAS");
const factData = sheetToRows(wsFact);

let invoicesSql = "-- Migration: contract_invoices from FACTURAS sheet\n";
invoicesSql += "-- Generated: " + new Date().toISOString() + "\n\n";

let invoiceCount = 0;
let ibatch = [];

function flushIBatch() {
  if (ibatch.length === 0) return;
  invoicesSql += "INSERT INTO public.contract_invoices (\n";
  invoicesSql +=
    "  invoice_date, customer_name, china_invoice_number, china_invoice_value,\n";
  invoicesSql +=
    "  customer_contract, customer_invoice_value, approved, notes\n";
  invoicesSql += ") VALUES\n";
  invoicesSql += ibatch.join(",\n");
  invoicesSql += ";\n\n";
  ibatch = [];
}

for (let i = 1; i < factData.length; i++) {
  const r = factData[i];
  if (!r[0] && !r[2]) continue;

  const invoiceDate = r[0];
  const customer = r[1] || "";
  const chinaInvoice = r[2] || "";
  const chinaValue = r[3];
  const customerContract = r[4] || "";
  const customerValue = r[5];
  const approved = r[6];
  const notes = r[7] || "";

  const row = `(${escDate(invoiceDate)}, ${esc(customer)}, ${esc(chinaInvoice)}, ${escNum(chinaValue)},
  ${esc(customerContract)}, ${escNum(customerValue)}, ${escBool(approved)}, ${esc(notes)})`;

  ibatch.push(row);
  invoiceCount++;

  if (ibatch.length >= BATCH) {
    flushIBatch();
  }
}

flushIBatch();

fs.writeFileSync(OUT_INVOICES, invoicesSql, "utf-8");
console.log(`Invoices: ${invoiceCount} rows → ${OUT_INVOICES}`);
console.log("\nDone! Now paste the contents of each file into the Supabase SQL Editor.");
}

runMigration().catch(console.error);
