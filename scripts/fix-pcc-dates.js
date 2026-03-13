/**
 * Fix: Set delivery_date_pcc from contract_invoices.invoice_date
 * for all contracts that have a matching invoice.
 *
 * Matches by: contract.client_contract = contract_invoice.customer_contract
 *
 * Usage: node scripts/fix-pcc-dates.js
 */

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log("Fetching all active contracts...");

  const { data: contracts, error: cErr } = await supabase
    .from("contracts")
    .select("id, client_contract, china_contract, delivery_date_pcc")
    .eq("is_active", true);

  if (cErr) {
    console.error("Error fetching contracts:", cErr);
    return;
  }

  console.log("Total contracts:", contracts.length);

  console.log("\nFetching all contract invoices...");

  const { data: invoices, error: iErr } = await supabase
    .from("contract_invoices")
    .select("customer_contract, china_invoice_number, invoice_date")
    .order("invoice_date", { ascending: true });

  if (iErr) {
    console.error("Error fetching invoices:", iErr);
    return;
  }

  console.log("Total invoices:", invoices.length);

  // Build lookup: customer_contract -> invoice_date (first match)
  const invoiceDateMap = {};
  for (const inv of invoices) {
    if (inv.customer_contract && !invoiceDateMap[inv.customer_contract]) {
      invoiceDateMap[inv.customer_contract] = inv.invoice_date;
    }
    // Also map by china_invoice_number
    if (inv.china_invoice_number && !invoiceDateMap[inv.china_invoice_number]) {
      invoiceDateMap[inv.china_invoice_number] = inv.invoice_date;
    }
  }

  console.log("Unique invoice mappings:", Object.keys(invoiceDateMap).length);

  // Match contracts to invoices
  let updated = 0;
  let skipped = 0;
  let noMatch = 0;

  for (const contract of contracts) {
    // Try to find matching invoice by client_contract first, then china_contract
    const invoiceDate =
      invoiceDateMap[contract.client_contract] ||
      invoiceDateMap[contract.china_contract] ||
      null;

    if (!invoiceDate) {
      noMatch++;
      continue;
    }

    if (contract.delivery_date_pcc === invoiceDate) {
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from("contracts")
      .update({ delivery_date_pcc: invoiceDate })
      .eq("id", contract.id);

    if (error) {
      console.error(
        "  Error updating " + (contract.client_contract || contract.china_contract) + ":",
        error.message
      );
    } else {
      updated++;
      if (updated <= 10) {
        console.log(
          "  Updated: " +
            (contract.client_contract || contract.china_contract) +
            " -> PCC: " +
            invoiceDate
        );
      }
    }
  }

  console.log("\n=== Results ===");
  console.log("Updated:", updated);
  console.log("Already correct:", skipped);
  console.log("No matching invoice:", noMatch);
  console.log("Total contracts:", contracts.length);
}

main().catch(console.error);
