// ─── Bulk Vessel Date Update ────────────────────────────────
// Updates ETD, ETA Inicial, and/or ETA Final for ALL contracts
// under a given vessel_name in a single operation.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Perfil de usuario no encontrado" },
        { status: 403 }
      );
    }

    if (profile.role === "comercial") {
      return NextResponse.json(
        { error: "No tiene permisos para realizar esta acción" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { vessel_name, etd, eta_initial, eta_final, status: newStatus } = body;

    if (!vessel_name || typeof vessel_name !== "string" || !vessel_name.trim()) {
      return NextResponse.json(
        { error: "vessel_name es obligatorio" },
        { status: 400 }
      );
    }

    const VALID_STATUSES = [
      "EN PRODUCCIÓN",
      "EN TRÁNSITO",
      "ENTREGADO AL CLIENTE",
      "PENDIENTE ANTICIPO",
      "ANULADO",
    ];

    // Build update payload — only include fields that were sent
    const updateData: Record<string, unknown> = {};
    let hasChanges = false;

    if (etd !== undefined) {
      updateData.etd = etd || null;
      hasChanges = true;
    }
    if (eta_initial !== undefined) {
      updateData.eta_initial = eta_initial || null;
      hasChanges = true;
    }
    if (eta_final !== undefined) {
      updateData.eta_final = eta_final || null;
      hasChanges = true;

      // Compute delivery_month / delivery_year from the new ETA
      const MONTH_NAMES = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
      ];

      if (eta_final) {
        const parts = (eta_final as string).split("-");
        if (parts.length >= 2) {
          const monthIdx = parseInt(parts[1], 10) - 1;
          updateData.delivery_month = MONTH_NAMES[monthIdx] || "";
          updateData.delivery_year = parts[0];
        }
      } else {
        updateData.delivery_month = null;
        updateData.delivery_year = null;
      }
    }
    if (newStatus !== undefined) {
      if (newStatus && !VALID_STATUSES.includes(newStatus)) {
        return NextResponse.json(
          { error: `Estado inválido. Valores permitidos: ${VALID_STATUSES.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.status = newStatus || null;
      hasChanges = true;
    }

    if (!hasChanges) {
      return NextResponse.json(
        { error: "Debe enviar al menos un campo para actualizar" },
        { status: 400 }
      );
    }

    // Fetch existing contracts for this vessel (for audit log)
    const { data: existingContracts, error: fetchError } = await supabase
      .from("contracts")
      .select("id, client_contract, etd, eta_initial, eta_final, delivery_month, delivery_year, status")
      .eq("vessel_name", vessel_name.trim());

    if (fetchError) {
      console.error("Error fetching vessel contracts:", fetchError);
      return NextResponse.json(
        { error: "Error al buscar contratos de la motonave" },
        { status: 500 }
      );
    }

    if (!existingContracts || existingContracts.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron contratos para esta motonave" },
        { status: 404 }
      );
    }

    // Update ALL contracts for this vessel
    const { data: updatedContracts, error: updateError } = await supabase
      .from("contracts")
      .update(updateData)
      .eq("vessel_name", vessel_name.trim())
      .select("id, client_contract");

    if (updateError) {
      console.error("Error updating vessel contracts:", updateError);
      return NextResponse.json(
        { error: "Error al actualizar los contratos" },
        { status: 500 }
      );
    }

    const updatedCount = updatedContracts?.length || 0;

    // Audit log
    const auditEntry = {
      user_id: user.id,
      user_name: profile.full_name,
      user_role: profile.role,
      action: "update" as const,
      table_name: "contracts",
      record_id: vessel_name.trim(),
      old_values: {
        vessel_name: vessel_name.trim(),
        contracts_affected: existingContracts.map((c) => ({
          id: c.id,
          client_contract: c.client_contract,
          etd: c.etd,
          eta_initial: c.eta_initial,
          eta_final: c.eta_final,
        })),
      },
      new_values: {
        ...updateData,
        contracts_updated: updatedCount,
      },
      ip_address:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        null,
    };

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert(auditEntry);

    if (auditError) {
      console.error("Error inserting audit log:", auditError);
    }

    // ─── Sync motonave reminders ──────────────────────────
    // When ETD/ETA change, keep the auto-generated "Zarpe:" / "Arribo:"
    // reminders in step. Skip completed ones (user already handled them)
    // and do not create new ones (that is /api/shipping-alerts' job).
    let remindersUpdated = 0;
    if (etd !== undefined || eta_final !== undefined) {
      try {
        const trimmedVessel = vessel_name.trim();

        const { data: vesselContracts } = await supabase
          .from("contracts")
          .select("id, client_contract, arrival_port, etd, eta_final")
          .eq("vessel_name", trimmedVessel)
          .eq("is_active", true);

        if (vesselContracts && vesselContracts.length > 0) {
          const contractLabels = vesselContracts
            .map((c) => c.client_contract || "S/C")
            .join(", ");
          const contractCount = vesselContracts.length;
          const portLabel =
            vesselContracts.find((c) => c.arrival_port)?.arrival_port ||
            "Puerto s/d";
          const fallbackContractId = vesselContracts[0].id;

          const earliestEtd =
            vesselContracts
              .map((c) => c.etd)
              .filter((d): d is string => !!d)
              .sort()[0] || null;
          const earliestEta =
            vesselContracts
              .map((c) => c.eta_final)
              .filter((d): d is string => !!d)
              .sort()[0] || null;

          const computeRemindAt = (dateStr: string) => {
            const d = new Date(dateStr + "T00:00:00");
            d.setDate(d.getDate() - 15);
            return d.toISOString().split("T")[0];
          };

          const [zarpeResp, arriboResp] = await Promise.all([
            supabase
              .from("reminders")
              .select("id, title, related_entity_id")
              .eq("type", "motonave")
              .eq("is_active", true)
              .eq("is_completed", false)
              .eq("title", `Zarpe: ${trimmedVessel}`),
            supabase
              .from("reminders")
              .select("id, title, related_entity_id")
              .eq("type", "motonave")
              .eq("is_active", true)
              .eq("is_completed", false)
              .ilike("title", `Arribo: ${trimmedVessel} → %`),
          ]);

          const zarpeReminders = zarpeResp.data || [];
          const arriboReminders = arriboResp.data || [];

          for (const r of zarpeReminders) {
            if (etd === undefined) continue;
            const update: Record<string, unknown> = {
              updated_by: user.id,
              title: `Zarpe: ${trimmedVessel}`,
              description: `Zarpe de ${trimmedVessel} — ${contractCount} contrato${contractCount !== 1 ? "s" : ""}: ${contractLabels}`,
            };
            if (earliestEtd) {
              update.due_date = earliestEtd;
              update.remind_at = computeRemindAt(earliestEtd);
            } else {
              update.is_active = false;
            }
            if (!vesselContracts.some((c) => c.id === r.related_entity_id)) {
              update.related_entity_id = fallbackContractId;
            }
            const { error: updErr } = await supabase
              .from("reminders")
              .update(update)
              .eq("id", r.id);
            if (updErr) {
              console.error(`Error syncing Zarpe reminder ${r.id}:`, updErr);
            } else {
              remindersUpdated++;
            }
          }

          for (const r of arriboReminders) {
            if (eta_final === undefined) continue;
            const update: Record<string, unknown> = {
              updated_by: user.id,
              title: `Arribo: ${trimmedVessel} → ${portLabel}`,
              description: `Arribo de ${trimmedVessel} al puerto ${portLabel} — ${contractCount} contrato${contractCount !== 1 ? "s" : ""}: ${contractLabels}`,
            };
            if (earliestEta) {
              update.due_date = earliestEta;
              update.remind_at = computeRemindAt(earliestEta);
            } else {
              update.is_active = false;
            }
            if (!vesselContracts.some((c) => c.id === r.related_entity_id)) {
              update.related_entity_id = fallbackContractId;
            }
            const { error: updErr } = await supabase
              .from("reminders")
              .update(update)
              .eq("id", r.id);
            if (updErr) {
              console.error(`Error syncing Arribo reminder ${r.id}:`, updErr);
            } else {
              remindersUpdated++;
            }
          }
        }
      } catch (syncErr) {
        console.error("Error syncing motonave reminders:", syncErr);
      }
    }

    return NextResponse.json({
      updatedCount,
      updatedContracts,
      remindersUpdated,
    });
  } catch (error) {
    console.error("Unexpected error in PATCH /api/contracts/vessel-dates:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
