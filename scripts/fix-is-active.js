/**
 * Fix: Set is_active = true for all contracts that have NULL is_active.
 * This fixes contracts imported by migrate-auto.js which missed this field.
 *
 * Usage: node scripts/fix-is-active.js
 */

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log("Fixing is_active for contracts...");

  // First, count how many contracts have is_active != true
  const { data: nullContracts, error: countErr } = await supabase
    .from("contracts")
    .select("id, china_contract, contract_date, is_active")
    .is("is_active", null);

  if (countErr) {
    console.error("Error fetching NULL contracts:", countErr);
    return;
  }

  console.log(`Found ${nullContracts?.length || 0} contracts with is_active = NULL`);

  if (!nullContracts || nullContracts.length === 0) {
    // Also check for is_active = false
    const { data: falseContracts, error: falseErr } = await supabase
      .from("contracts")
      .select("id, china_contract, contract_date, is_active")
      .eq("is_active", false);

    if (falseErr) {
      console.error("Error fetching FALSE contracts:", falseErr);
      return;
    }

    console.log(`Found ${falseContracts?.length || 0} contracts with is_active = false`);

    if (!falseContracts || falseContracts.length === 0) {
      console.log("No contracts need fixing!");
      return;
    }

    // Fix false contracts
    const { error: updateErr } = await supabase
      .from("contracts")
      .update({ is_active: true })
      .eq("is_active", false);

    if (updateErr) {
      console.error("Error updating false contracts:", updateErr);
    } else {
      console.log(`Updated ${falseContracts.length} contracts to is_active = true`);
    }
    return;
  }

  // Fix NULL contracts
  const ids = nullContracts.map((c) => c.id);
  console.log("Sample contracts being fixed:");
  nullContracts.slice(0, 5).forEach((c) => {
    console.log(`  - ${c.china_contract} (date: ${c.contract_date})`);
  });

  // Update in batches
  const BATCH = 100;
  let fixed = 0;
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const { error } = await supabase
      .from("contracts")
      .update({ is_active: true })
      .in("id", batch);

    if (error) {
      console.error(`Error updating batch ${i}:`, error);
    } else {
      fixed += batch.length;
    }
  }

  console.log(`Fixed ${fixed} contracts. is_active set to true.`);

  // Verify
  const { count } = await supabase
    .from("contracts")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  console.log(`Total active contracts now: ${count}`);

  // Also fix contract_invoices
  const { data: nullInvoices } = await supabase
    .from("contract_invoices")
    .select("id")
    .is("is_active", null);

  if (nullInvoices && nullInvoices.length > 0) {
    console.log(`\nFound ${nullInvoices.length} contract_invoices with is_active = NULL`);
    const invoiceIds = nullInvoices.map((i) => i.id);
    for (let i = 0; i < invoiceIds.length; i += BATCH) {
      const batch = invoiceIds.slice(i, i + BATCH);
      await supabase
        .from("contract_invoices")
        .update({ is_active: true })
        .in("id", batch);
    }
    console.log(`Fixed ${nullInvoices.length} contract_invoices.`);
  }
}

main().catch(console.error);
