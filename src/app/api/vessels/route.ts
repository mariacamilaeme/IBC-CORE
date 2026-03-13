import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizePostgrestValue } from "@/lib/utils";

// =====================================================
// GET /api/vessels
// Fetch all active vessels. Support search by name.
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    // Build query
    let query = supabase
      .from("vessels")
      .select("*")
      .eq("is_active", true)
      .order("vessel_name", { ascending: true });

    // Apply search filter
    if (search) {
      const s = sanitizePostgrestValue(search);
      query = query.or(
        `vessel_name.ilike.%${s}%,shipping_line.ilike.%${s}%,imo_number.ilike.%${s}%`
      );
    }

    const { data: vessels, error: queryError } = await query.limit(500);

    if (queryError) {
      console.error("Error fetching vessels:", queryError);
      return NextResponse.json(
        { error: "Error al obtener las motonaves" },
        { status: 500 }
      );
    }

    const res = NextResponse.json({ data: vessels });
    res.headers.set("Cache-Control", "private, max-age=60");
    return res;
  } catch (error) {
    console.error("Unexpected error in GET /api/vessels:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/vessels
// Create a new vessel. Validate vessel_name required.
// Insert audit_log entry.
// =====================================================
export async function POST(request: NextRequest) {
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

    // Role check: comercial users cannot create vessels
    if (profile.role === "comercial") {
      return NextResponse.json(
        { error: "No tiene permisos para realizar esta acción" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.vessel_name || body.vessel_name.trim() === "") {
      return NextResponse.json(
        { error: "El nombre de la motonave es obligatorio" },
        { status: 400 }
      );
    }

    // Prepare vessel data
    const vesselData = {
      vessel_name: body.vessel_name.trim(),
      imo_number: body.imo_number?.trim() || null,
      flag: body.flag?.trim() || null,
      shipping_line: body.shipping_line?.trim() || null,
      vessel_type: body.vessel_type?.trim() || null,
      capacity_tons: body.capacity_tons != null ? Number(body.capacity_tons) : null,
      is_active: true,
      notes: body.notes?.trim() || null,
    };

    // Insert vessel
    const { data: newVessel, error: insertError } = await supabase
      .from("vessels")
      .insert(vesselData)
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting vessel:", insertError);
      return NextResponse.json(
        { error: "Error al crear la motonave" },
        { status: 500 }
      );
    }

    // Insert audit log entry
    const auditEntry = {
      user_id: user.id,
      user_name: profile.full_name,
      user_role: profile.role,
      action: "create" as const,
      table_name: "vessels",
      record_id: newVessel.id,
      old_values: null,
      new_values: vesselData as unknown as Record<string, unknown>,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
    };

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert(auditEntry);

    if (auditError) {
      console.error("Error inserting audit log:", auditError);
    }

    return NextResponse.json({ data: newVessel }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/vessels:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH /api/vessels
// Update a vessel. Insert audit_log entry.
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

    // Role check: comercial users cannot update vessels
    if (profile.role === "comercial") {
      return NextResponse.json(
        { error: "No tiene permisos para realizar esta acción" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "El ID de la motonave es obligatorio" },
        { status: 400 }
      );
    }

    // Fetch existing vessel for audit
    const { data: existingVessel, error: fetchError } = await supabase
      .from("vessels")
      .select("*")
      .eq("id", body.id)
      .single();

    if (fetchError || !existingVessel) {
      return NextResponse.json(
        { error: "Motonave no encontrada" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    const allowedFields = [
      "vessel_name", "imo_number", "flag", "shipping_line",
      "vessel_type", "capacity_tons", "is_active", "notes",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Update vessel
    const { data: updatedVessel, error: updateError } = await supabase
      .from("vessels")
      .update(updateData)
      .eq("id", body.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating vessel:", updateError);
      return NextResponse.json(
        { error: "Error al actualizar la motonave" },
        { status: 500 }
      );
    }

    // Insert audit log entry
    const auditEntry = {
      user_id: user.id,
      user_name: profile.full_name,
      user_role: profile.role,
      action: "update" as const,
      table_name: "vessels",
      record_id: body.id,
      old_values: existingVessel as unknown as Record<string, unknown>,
      new_values: updateData as unknown as Record<string, unknown>,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
    };

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert(auditEntry);

    if (auditError) {
      console.error("Error inserting audit log:", auditError);
    }

    return NextResponse.json({ data: updatedVessel });
  } catch (error) {
    console.error("Unexpected error in PATCH /api/vessels:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
