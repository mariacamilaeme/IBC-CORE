/**
 * Fix: Calculate days_difference = delivery_date_pcc - exw_date
 * for all active contracts that have both dates.
 *
 * Usage: node scripts/fix-days-difference.js
 */

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log("Fetching all active contracts...");

  const { data: contracts, error } = await supabase
    .from("contracts")
    .select("id, client_contract, china_contract, delivery_date_pcc, exw_date, days_difference")
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching contracts:", error);
    return;
  }

  console.log("Total contracts:", contracts.length);

  let updated = 0;
  let skipped = 0;
  let noDates = 0;

  for (const contract of contracts) {
    const pccDate = contract.delivery_date_pcc;
    const exwDate = contract.exw_date;

    if (!pccDate || !exwDate) {
      noDates++;
      continue;
    }

    const pccMs = new Date(pccDate + "T00:00:00").getTime();
    const exwMs = new Date(exwDate + "T00:00:00").getTime();
    const diffDays = Math.round((pccMs - exwMs) / 86400000);

    if (contract.days_difference === diffDays) {
      skipped++;
      continue;
    }

    const { error: updateError } = await supabase
      .from("contracts")
      .update({ days_difference: diffDays })
      .eq("id", contract.id);

    if (updateError) {
      console.error(
        "  Error updating " + (contract.client_contract || contract.china_contract) + ":",
        updateError.message
      );
    } else {
      updated++;
      if (updated <= 15) {
        console.log(
          "  Updated: " +
            (contract.client_contract || contract.china_contract) +
            " -> PCC: " + pccDate +
            " - EXW: " + exwDate +
            " = " + diffDays + " días"
        );
      }
    }
  }

  console.log("\n=== Results ===");
  console.log("Updated:", updated);
  console.log("Already correct:", skipped);
  console.log("Missing PCC or EXW date:", noDates);
  console.log("Total contracts:", contracts.length);
}

main().catch(console.error);
