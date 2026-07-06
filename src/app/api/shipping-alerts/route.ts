import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// =====================================================
// GET /api/shipping-alerts
// Auto-generates shipping reminders (ETD/ETA) grouped
// by VESSEL (motonave), not per contract.
// Contract numbers are listed in the description/notes.
// =====================================================
export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Fetch all "EN TRÁNSITO" contracts with ETD or ETA
    const { data: contracts, error: contractsError } = await supabase
      .from("contracts")
      .select("id, client_contract, vessel_name, etd, eta_final, arrival_port, shipping_company")
      .eq("status", "EN TRÁNSITO")
      .eq("is_active", true);

    if (contractsError) {
      console.error("Error fetching contracts for alerts:", contractsError);
      return NextResponse.json(
        { error: "Error al obtener contratos" },
        { status: 500 }
      );
    }

    if (!contracts || contracts.length === 0) {
      return NextResponse.json({ created: 0, skipped: 0 });
    }

    // Only contracts with at least one date AND a vessel name
    const contractsWithDates = contracts.filter(
      (c) => (c.etd || c.eta_final) && c.vessel_name && c.vessel_name.trim() !== ""
    );

    if (contractsWithDates.length === 0) {
      return NextResponse.json({ created: 0, skipped: 0 });
    }

    // 2. Group contracts by vessel_name
    const vesselGroups = new Map<string, typeof contractsWithDates>();
    for (const c of contractsWithDates) {
      const key = c.vessel_name!.trim();
      if (!vesselGroups.has(key)) vesselGroups.set(key, []);
      vesselGroups.get(key)!.push(c);
    }

    // 3. Fetch existing motonave reminders to avoid duplicates
    //    Now we check by title prefix (vessel name) instead of per-contract
    const { data: existingReminders, error: remindersError } = await supabase
      .from("reminders")
      .select("id, title")
      .eq("type", "motonave")
      .eq("is_active", true)
      .eq("is_completed", false);

    if (remindersError) {
      console.error("Error fetching existing reminders:", remindersError);
      return NextResponse.json(
        { error: "Error al verificar recordatorios existentes" },
        { status: 500 }
      );
    }

    // Build set of vessel names that already have active reminders
    const existingVesselTitles = new Set(
      (existingReminders || []).map((r) => r.title)
    );

    // 4. Fetch admin/directora profiles for assignment
    const { data: adminProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["admin", "directora"])
      .eq("is_active", true);

    if (profilesError) {
      console.error("Error fetching admin profiles:", profilesError);
      return NextResponse.json(
        { error: "Error al obtener perfiles admin" },
        { status: 500 }
      );
    }

    const adminIds = (adminProfiles || []).map((p) => p.id);
    if (adminIds.length === 0) {
      return NextResponse.json({ created: 0, skipped: 0 });
    }

    // 5. Determine 30-day window
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    let created = 0;
    let skipped = 0;

    for (const [vesselName, vesselContracts] of vesselGroups) {
      // Use the earliest ETA and ETD from the group
      const etaDates = vesselContracts
        .filter((c) => c.eta_final)
        .map((c) => new Date(c.eta_final + "T00:00:00"));
      const etdDates = vesselContracts
        .filter((c) => c.etd)
        .map((c) => new Date(c.etd + "T00:00:00"));

      const earliestEta = etaDates.length > 0 ? new Date(Math.min(...etaDates.map((d) => d.getTime()))) : null;
      const earliestEtd = etdDates.length > 0 ? new Date(Math.min(...etdDates.map((d) => d.getTime()))) : null;

      const etdInRange = earliestEtd && earliestEtd >= now && earliestEtd <= thirtyDaysFromNow;
      const etaInRange = earliestEta && earliestEta >= now && earliestEta <= thirtyDaysFromNow;

      if (!etdInRange && !etaInRange) {
        skipped++;
        continue;
      }

      // Build contract list for notes
      const contractLabels = vesselContracts
        .map((c) => c.client_contract || "S/C")
        .join(", ");
      const contractCount = vesselContracts.length;
      const portLabel = vesselContracts.find((c) => c.arrival_port)?.arrival_port || "Puerto s/d";

      const remindersToInsert: Record<string, unknown>[] = [];

      for (const adminId of adminIds) {
        // ETD Reminder (Zarpe) — one per vessel
        if (etdInRange && earliestEtd) {
          const etdTitle = `Zarpe: ${vesselName}`;

          // Skip if already exists
          if (!existingVesselTitles.has(etdTitle)) {
            const remindAt = new Date(earliestEtd);
            remindAt.setDate(remindAt.getDate() - 15);

            remindersToInsert.push({
              title: etdTitle,
              description: `Zarpe de ${vesselName} — ${contractCount} contrato${contractCount !== 1 ? "s" : ""}: ${contractLabels}`,
              type: "motonave",
              priority: "alta",
              due_date: earliestEtd.toISOString().split("T")[0],
              remind_at: remindAt.toISOString().split("T")[0],
              frequency: "once",
              is_completed: false,
              send_email: false,
              assigned_to: adminId,
              related_entity_type: "contract",
              related_entity_id: vesselContracts[0].id,
              is_active: true,
              created_by: adminId,
              updated_by: adminId,
            });
          }
        }

        // ETA Reminder (Arribo) — one per vessel
        if (etaInRange && earliestEta) {
          const etaTitle = `Arribo: ${vesselName} \u2192 ${portLabel}`;

          // Skip if already exists
          if (!existingVesselTitles.has(etaTitle)) {
            const remindAt = new Date(earliestEta);
            remindAt.setDate(remindAt.getDate() - 15);

            remindersToInsert.push({
              title: etaTitle,
              description: `Arribo de ${vesselName} al puerto ${portLabel} — ${contractCount} contrato${contractCount !== 1 ? "s" : ""}: ${contractLabels}`,
              type: "motonave",
              priority: "urgente",
              due_date: earliestEta.toISOString().split("T")[0],
              remind_at: remindAt.toISOString().split("T")[0],
              frequency: "once",
              is_completed: false,
              send_email: false,
              assigned_to: adminId,
              related_entity_type: "contract",
              related_entity_id: vesselContracts[0].id,
              is_active: true,
              created_by: adminId,
              updated_by: adminId,
            });
          }
        }
      }

      if (remindersToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("reminders")
          .insert(remindersToInsert);

        if (insertError) {
          console.error(`Error inserting reminders for vessel ${vesselName}:`, insertError);
        } else {
          created += remindersToInsert.length;
          // Add to existing set so we don't create duplicates within the same run
          for (const r of remindersToInsert) {
            existingVesselTitles.add(r.title as string);
          }
        }
      } else {
        skipped++;
      }
    }

    return NextResponse.json({ created, skipped });
  } catch (error) {
    console.error("Unexpected error in GET /api/shipping-alerts:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
