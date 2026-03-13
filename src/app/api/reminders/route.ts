import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizePostgrestValue } from "@/lib/utils";

// =====================================================
// GET /api/reminders
// Fetch reminders with filters.
// Comercial users only see reminders assigned to them.
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // ---- Auth check ----
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

    // ---- Get user profile / role ----
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

    // ---- Parse query params ----
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";
    const priority = searchParams.get("priority") || "";
    const completed = searchParams.get("completed"); // "true" | "false" | null
    const dateFrom = searchParams.get("date_from") || "";
    const dateTo = searchParams.get("date_to") || "";

    // ---- Build query ----
    let query = supabase
      .from("reminders")
      .select(
        "*, assigned_to_profile:profiles!reminders_assigned_to_fkey(id, full_name, email, role), created_by_profile:profiles!reminders_created_by_fkey(id, full_name, email, role)"
      )
      .eq("is_active", true)
      .order("due_date", { ascending: true });

    // Role-based filtering: comercial users only see their own reminders
    if (profile.role === "comercial") {
      query = query.eq("assigned_to", user.id);
    }

    // ---- Apply optional filters ----
    if (search) {
      const s = sanitizePostgrestValue(search);
      query = query.or(
        `title.ilike.%${s}%,description.ilike.%${s}%`
      );
    }

    if (type) {
      query = query.eq("type", type);
    }

    if (priority) {
      query = query.eq("priority", priority);
    }

    if (completed === "true") {
      query = query.eq("is_completed", true);
    } else if (completed === "false") {
      query = query.eq("is_completed", false);
    }

    if (dateFrom) {
      query = query.gte("due_date", `${dateFrom}T00:00:00`);
    }

    if (dateTo) {
      query = query.lte("due_date", `${dateTo}T23:59:59`);
    }

    const { data: reminders, error: queryError } = await query.limit(500);

    if (queryError) {
      console.error("Error fetching reminders:", queryError);
      return NextResponse.json(
        { error: "Error al obtener los recordatorios" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: reminders });
  } catch (error) {
    console.error("Unexpected error in GET /api/reminders:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/reminders
// Create a new reminder.
// Validates required fields, auto-sets created_by,
// and inserts an audit_log entry.
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // ---- Auth check ----
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

    // ---- Get user profile for audit log ----
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

    // ---- Parse request body ----
    const body = await request.json();

    // ---- Validate required fields ----
    if (!body.title || body.title.trim() === "") {
      return NextResponse.json(
        { error: "El titulo es obligatorio" },
        { status: 400 }
      );
    }

    if (!body.due_date) {
      return NextResponse.json(
        { error: "La fecha de vencimiento es obligatoria" },
        { status: 400 }
      );
    }

    if (!body.remind_at) {
      return NextResponse.json(
        { error: "La fecha de recordatorio es obligatoria" },
        { status: 400 }
      );
    }

    // Comercial can only assign reminders to themselves
    if (profile.role === "comercial" && body.assigned_to && body.assigned_to !== user.id) {
      return NextResponse.json({ error: "No tiene permisos para asignar recordatorios a otros usuarios" }, { status: 403 });
    }

    // ---- Prepare reminder data ----
    const reminderData = {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      type: body.type || null,
      priority: body.priority || "media",
      due_date: body.due_date,
      remind_at: body.remind_at,
      frequency: body.frequency || "once",
      is_completed: false,
      completed_at: null,
      completed_by: null,
      send_email: body.send_email ?? false,
      email_recipient: body.email_recipient?.trim() || null,
      email_sent: false,
      email_sent_at: null,
      assigned_to: body.assigned_to || user.id,
      related_entity_type: body.related_entity_type?.trim() || null,
      related_entity_id: body.related_entity_id?.trim() || null,
      is_active: true,
      notes: body.notes?.trim() || null,
      created_by: user.id,
      updated_by: user.id,
    };

    // ---- Insert reminder ----
    const { data: newReminder, error: insertError } = await supabase
      .from("reminders")
      .insert(reminderData)
      .select(
        "*, assigned_to_profile:profiles!reminders_assigned_to_fkey(id, full_name, email, role), created_by_profile:profiles!reminders_created_by_fkey(id, full_name, email, role)"
      )
      .single();

    if (insertError) {
      console.error("Error inserting reminder:", insertError);
      return NextResponse.json(
        { error: "Error al crear el recordatorio" },
        { status: 500 }
      );
    }

    // ---- Insert audit log entry ----
    const auditEntry = {
      user_id: user.id,
      user_name: profile.full_name,
      user_role: profile.role,
      action: "create" as const,
      table_name: "reminders",
      record_id: newReminder.id,
      old_values: null,
      new_values: reminderData as unknown as Record<string, unknown>,
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

    return NextResponse.json({ data: newReminder }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/reminders:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH /api/reminders
// Update an existing reminder.
// Handles completion (sets completed_at, completed_by).
// Inserts an audit_log entry.
// =====================================================
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // ---- Auth check ----
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

    // ---- Get user profile for audit log ----
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

    // ---- Parse request body ----
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "El ID del recordatorio es obligatorio" },
        { status: 400 }
      );
    }

    // ---- Fetch the existing reminder for audit old_values ----
    const { data: existingReminder, error: fetchError } = await supabase
      .from("reminders")
      .select("*")
      .eq("id", body.id)
      .single();

    if (fetchError || !existingReminder) {
      return NextResponse.json(
        { error: "Recordatorio no encontrado" },
        { status: 404 }
      );
    }

    // Ownership check: non-admin users can only update their own reminders
    if (profile.role !== "admin" && profile.role !== "directora") {
      if (existingReminder.assigned_to !== user.id && existingReminder.created_by !== user.id) {
        return NextResponse.json(
          { error: "No tiene permisos para editar este recordatorio" },
          { status: 403 }
        );
      }
    }

    // ---- Build update data ----
    const updateData: Record<string, unknown> = {
      updated_by: user.id,
    };

    // Allowed fields for update
    const allowedFields = [
      "title",
      "description",
      "type",
      "priority",
      "due_date",
      "remind_at",
      "frequency",
      "is_completed",
      "send_email",
      "email_recipient",
      "assigned_to",
      "related_entity_type",
      "related_entity_id",
      "is_active",
      "notes",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // ---- Handle completion ----
    if (body.is_completed === true && !existingReminder.is_completed) {
      updateData.completed_at = new Date().toISOString();
      updateData.completed_by = user.id;
    } else if (body.is_completed === false && existingReminder.is_completed) {
      // Reopen: clear completion fields
      updateData.completed_at = null;
      updateData.completed_by = null;
    }

    // ---- Handle soft delete ----
    if (body.is_active === false) {
      updateData.is_active = false;
    }

    // ---- Update reminder ----
    const { data: updatedReminder, error: updateError } = await supabase
      .from("reminders")
      .update(updateData)
      .eq("id", body.id)
      .select(
        "*, assigned_to_profile:profiles!reminders_assigned_to_fkey(id, full_name, email, role), created_by_profile:profiles!reminders_created_by_fkey(id, full_name, email, role)"
      )
      .single();

    if (updateError) {
      console.error("Error updating reminder:", updateError);
      return NextResponse.json(
        { error: "Error al actualizar el recordatorio" },
        { status: 500 }
      );
    }

    // ---- Determine audit action ----
    let auditAction: "update" | "delete" | "status_change" = "update";
    if (body.is_active === false) {
      auditAction = "delete";
    } else if (body.is_completed !== undefined) {
      auditAction = "status_change";
    }

    // ---- Insert audit log entry ----
    const auditEntry = {
      user_id: user.id,
      user_name: profile.full_name,
      user_role: profile.role,
      action: auditAction,
      table_name: "reminders",
      record_id: body.id,
      old_values: existingReminder as unknown as Record<string, unknown>,
      new_values: updateData as unknown as Record<string, unknown>,
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

    return NextResponse.json({ data: updatedReminder });
  } catch (error) {
    console.error("Unexpected error in PATCH /api/reminders:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
