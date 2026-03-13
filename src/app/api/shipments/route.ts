import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sanitizePostgrestValue } from "@/lib/utils";

// =====================================================
// GET /api/shipments
// Fetch active shipments with vessel, client, commercial joins.
// Comercial users only see their own shipments.
// Supports: search, status, vessel_id, client_id, date_from, date_to
// =====================================================
export async function GET(request: NextRequest) {
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

    // Get user profile to check role
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const vesselId = searchParams.get("vessel_id") || "";
    const clientId = searchParams.get("client_id") || "";
    const dateFrom = searchParams.get("date_from") || "";
    const dateTo = searchParams.get("date_to") || "";

    // Build query with joins
    let query = supabase
      .from("shipments")
      .select(
        `*,
        vessel:vessels!shipments_vessel_id_fkey(id, vessel_name, shipping_line, flag),
        client:clients!shipments_client_id_fkey(id, company_name, contact_name, email),
        commercial:profiles!shipments_commercial_id_fkey(id, full_name, email)`
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    // Role-based filtering: comercial users only see their own shipments
    if (profile.role === "comercial") {
      query = query.eq("commercial_id", user.id);
    }

    // Apply optional filters
    if (search) {
      const s = sanitizePostgrestValue(search);
      query = query.or(
        `shipment_number.ilike.%${s}%,bl_number.ilike.%${s}%,booking_number.ilike.%${s}%,port_of_loading.ilike.%${s}%,port_of_discharge.ilike.%${s}%,cargo_description.ilike.%${s}%`
      );
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (vesselId) {
      query = query.eq("vessel_id", vesselId);
    }

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    if (dateFrom) {
      query = query.gte("created_at", `${dateFrom}T00:00:00`);
    }

    if (dateTo) {
      query = query.lte("created_at", `${dateTo}T23:59:59`);
    }

    const { data: shipments, error: queryError } = await query.limit(500);

    if (queryError) {
      console.error("Error fetching shipments:", queryError);
      return NextResponse.json(
        { error: "Error al obtener los embarques" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: shipments });
  } catch (error) {
    console.error("Unexpected error in GET /api/shipments:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/shipments
// Create a new shipment.
// Auto-generates shipment_number from system_config.
// Sets initial status_history. Validates required fields.
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

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

    // Get user profile for audit log
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

    // Comercial users cannot create shipments
    if (profile.role === "comercial") {
      return NextResponse.json({ error: "No tiene permisos para crear embarques" }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      { key: "vessel_id", label: "Motonave" },
      { key: "client_id", label: "Cliente" },
      { key: "commercial_id", label: "Comercial" },
      { key: "port_of_loading", label: "Puerto de carga" },
      { key: "port_of_discharge", label: "Puerto de descarga" },
      { key: "etd", label: "ETD" },
      { key: "eta", label: "ETA" },
    ];

    for (const field of requiredFields) {
      if (!body[field.key] || (typeof body[field.key] === "string" && body[field.key].trim() === "")) {
        return NextResponse.json(
          { error: `El campo "${field.label}" es obligatorio` },
          { status: 400 }
        );
      }
    }

    // Auto-generate shipment_number from system_config
    const { data: config, error: configError } = await serviceClient
      .from("system_config")
      .select("id, shipment_prefix, shipment_next_number")
      .limit(1)
      .single();

    if (configError || !config) {
      console.error("Error fetching system config:", configError);
      return NextResponse.json(
        { error: "Error al obtener la configuración del sistema" },
        { status: 500 }
      );
    }

    const prefix = config.shipment_prefix || "EMB";
    const nextNumber = config.shipment_next_number || 1;
    const shipmentNumber = `${prefix}-${String(nextNumber).padStart(5, "0")}`;

    // Atomically increment: only succeeds if no one else changed it (optimistic lock)
    const { error: incrementError } = await serviceClient
      .from("system_config")
      .update({ shipment_next_number: nextNumber + 1 })
      .eq("id", config.id)
      .eq("shipment_next_number", nextNumber);

    if (incrementError) {
      return NextResponse.json(
        { error: "Error de concurrencia al generar número de embarque. Intente de nuevo." },
        { status: 409 }
      );
    }

    // Set initial status and status_history
    const initialStatus = body.status || "reservado";
    const now = new Date().toISOString();
    const initialStatusHistory = [
      {
        status: initialStatus,
        date: now,
        user_id: user.id,
        user_name: profile.full_name,
        notes: "Embarque creado",
      },
    ];

    // Prepare shipment data
    const shipmentData = {
      shipment_number: shipmentNumber,
      vessel_id: body.vessel_id,
      client_id: body.client_id,
      commercial_id: body.commercial_id,
      invoice_id: body.invoice_id || null,
      bl_number: body.bl_number?.trim() || null,
      booking_number: body.booking_number?.trim() || null,
      container_numbers: body.container_numbers || null,
      container_type: body.container_type?.trim() || null,
      container_quantity: body.container_quantity != null ? Number(body.container_quantity) : null,
      seal_numbers: body.seal_numbers || null,
      port_of_loading: body.port_of_loading.trim(),
      port_of_discharge: body.port_of_discharge.trim(),
      port_of_final_destination: body.port_of_final_destination?.trim() || null,
      etd: body.etd,
      atd: body.atd || null,
      eta: body.eta,
      ata: body.ata || null,
      eta_final_destination: body.eta_final_destination || null,
      customs_clearance_date: body.customs_clearance_date || null,
      delivery_date: body.delivery_date || null,
      cargo_description: body.cargo_description?.trim() || null,
      cargo_weight_tons: body.cargo_weight_tons != null ? Number(body.cargo_weight_tons) : null,
      cargo_volume_m3: body.cargo_volume_m3 != null ? Number(body.cargo_volume_m3) : null,
      incoterm: body.incoterm?.trim() || null,
      freight_cost: body.freight_cost != null ? Number(body.freight_cost) : null,
      freight_currency: body.freight_currency?.trim() || null,
      insurance_cost: body.insurance_cost != null ? Number(body.insurance_cost) : null,
      status: initialStatus,
      status_history: initialStatusHistory,
      current_location: body.current_location?.trim() || null,
      tracking_url: body.tracking_url?.trim() || null,
      documents: body.documents || null,
      incidents: body.incidents || null,
      is_active: true,
      notes: body.notes?.trim() || null,
      created_by: user.id,
      updated_by: user.id,
    };

    // Insert shipment
    const { data: newShipment, error: insertError } = await supabase
      .from("shipments")
      .insert(shipmentData)
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting shipment:", insertError);
      return NextResponse.json(
        { error: "Error al crear el embarque" },
        { status: 500 }
      );
    }

    // Number was already incremented atomically before insert

    // Insert audit log entry
    const auditEntry = {
      user_id: user.id,
      user_name: profile.full_name,
      user_role: profile.role,
      action: "create" as const,
      table_name: "shipments",
      record_id: newShipment.id,
      old_values: null,
      new_values: shipmentData as unknown as Record<string, unknown>,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
    };

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert(auditEntry);

    if (auditError) {
      console.error("Error inserting audit log:", auditError);
    }

    return NextResponse.json({ data: newShipment }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/shipments:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH /api/shipments
// Update a shipment. If status changed, append to status_history.
// Inserts an audit_log entry.
// =====================================================
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

    // Get user profile for audit log
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

    // Parse request body
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "El ID del embarque es obligatorio" },
        { status: 400 }
      );
    }

    // Fetch existing shipment for comparison
    const { data: existingShipment, error: fetchError } = await supabase
      .from("shipments")
      .select("*")
      .eq("id", body.id)
      .single();

    if (fetchError || !existingShipment) {
      return NextResponse.json(
        { error: "Embarque no encontrado" },
        { status: 404 }
      );
    }

    // Comercial can only edit their own shipments
    if (profile.role === "comercial" && existingShipment.commercial_id !== user.id) {
      return NextResponse.json({ error: "No tiene permisos para editar este embarque" }, { status: 403 });
    }

    // Build update data (only include provided fields)
    const updateData: Record<string, unknown> = {
      updated_by: user.id,
    };

    const allowedFields = [
      "vessel_id", "client_id", "commercial_id", "invoice_id",
      "bl_number", "booking_number", "container_numbers", "container_type",
      "container_quantity", "seal_numbers", "port_of_loading", "port_of_discharge",
      "port_of_final_destination", "etd", "atd", "eta", "ata",
      "eta_final_destination", "customs_clearance_date", "delivery_date",
      "cargo_description", "cargo_weight_tons", "cargo_volume_m3", "incoterm",
      "freight_cost", "freight_currency", "insurance_cost", "status",
      "current_location", "tracking_url", "documents", "incidents",
      "is_active", "notes",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // If status changed, append to status_history
    if (body.status && body.status !== existingShipment.status) {
      const currentHistory = existingShipment.status_history || [];
      const newEntry = {
        status: body.status,
        date: new Date().toISOString(),
        user_id: user.id,
        user_name: profile.full_name,
        notes: body.status_change_notes || "",
      };
      updateData.status_history = [...currentHistory, newEntry];
    }

    // Update shipment
    const { data: updatedShipment, error: updateError } = await supabase
      .from("shipments")
      .update(updateData)
      .eq("id", body.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating shipment:", updateError);
      return NextResponse.json(
        { error: "Error al actualizar el embarque" },
        { status: 500 }
      );
    }

    // Determine audit action
    const auditAction = body.status && body.status !== existingShipment.status
      ? "status_change"
      : "update";

    // Insert audit log entry
    const auditEntry = {
      user_id: user.id,
      user_name: profile.full_name,
      user_role: profile.role,
      action: auditAction as "update" | "status_change",
      table_name: "shipments",
      record_id: body.id,
      old_values: existingShipment as unknown as Record<string, unknown>,
      new_values: updateData as unknown as Record<string, unknown>,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
    };

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert(auditEntry);

    if (auditError) {
      console.error("Error inserting audit log:", auditError);
    }

    return NextResponse.json({ data: updatedShipment });
  } catch (error) {
    console.error("Unexpected error in PATCH /api/shipments:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
