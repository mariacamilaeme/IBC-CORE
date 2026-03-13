import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// =====================================================
// GET /api/war-room/tasks
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (profileError || !profile) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const priority = searchParams.get("priority") || "";
    const category = searchParams.get("category") || "";
    const completed = searchParams.get("completed");
    const dateFrom = searchParams.get("date_from") || "";
    const dateTo = searchParams.get("date_to") || "";

    let query = supabase
      .from("war_room_tasks")
      .select("*, assigned_to_profile:profiles!war_room_tasks_assigned_to_fkey(id, full_name, email, role)")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false });

    if (profile.role === "comercial") {
      query = query.eq("assigned_to", user.id);
    }

    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,related_client_name.ilike.%${search}%`);
    if (priority) query = query.eq("priority", priority);
    if (category) query = query.eq("category", category);
    if (completed === "true") query = query.eq("is_completed", true);
    else if (completed === "false") query = query.eq("is_completed", false);
    if (dateFrom) query = query.gte("due_date", `${dateFrom}T00:00:00`);
    if (dateTo) query = query.lte("due_date", `${dateTo}T23:59:59`);

    const { data: tasks, error: queryError } = await query;
    if (queryError) {
      console.error("Error fetching tasks:", queryError);
      return NextResponse.json({ error: "Error al obtener las tareas" }, { status: 500 });
    }

    return NextResponse.json({ data: tasks });
  } catch (error) {
    console.error("Unexpected error in GET /api/war-room/tasks:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// =====================================================
// POST /api/war-room/tasks
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (profileError || !profile) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 403 });

    const body = await request.json();

    if (!body.title || body.title.trim() === "") {
      return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
    }

    const taskData = {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      priority: body.priority || "media",
      category: body.category || "general",
      due_date: body.due_date || null,
      is_completed: false,
      completed_at: null,
      completed_by: null,
      assigned_to: body.assigned_to || user.id,
      related_contract_id: body.related_contract_id || null,
      related_client_name: body.related_client_name?.trim() || null,
      recurrence: body.recurrence || "none",
      sort_order: body.sort_order ?? 0,
      is_active: true,
      created_by: user.id,
      updated_by: user.id,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("war_room_tasks")
      .insert(taskData)
      .select("*")
      .single();

    if (insertError) {
      console.error("Error inserting task:", insertError);
      return NextResponse.json({ error: insertError.message || "Error al crear la tarea" }, { status: 500 });
    }

    // Fetch with profile join
    const { data: newTask } = await supabase
      .from("war_room_tasks")
      .select("*, assigned_to_profile:profiles!war_room_tasks_assigned_to_fkey(id, full_name, email, role)")
      .eq("id", inserted.id)
      .single();


    await supabase.from("audit_logs").insert({
      user_id: user.id,
      user_name: profile.full_name,
      user_role: profile.role,
      action: "create",
      table_name: "war_room_tasks",
      record_id: inserted.id,
      old_values: null,
      new_values: taskData as unknown as Record<string, unknown>,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
    });

    return NextResponse.json({ data: newTask || inserted }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/war-room/tasks:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// =====================================================
// PATCH /api/war-room/tasks
// =====================================================
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (profileError || !profile) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 403 });

    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: "El ID es obligatorio" }, { status: 400 });

    const { data: existing, error: fetchError } = await supabase.from("war_room_tasks").select("*").eq("id", body.id).single();
    if (fetchError || !existing) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });

    const updateData: Record<string, unknown> = { updated_by: user.id };
    const allowedFields = ["title", "description", "priority", "category", "due_date", "is_completed", "assigned_to", "related_contract_id", "related_client_name", "recurrence", "sort_order", "is_active"];

    for (const field of allowedFields) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    if (body.is_completed === true && !existing.is_completed) {
      updateData.completed_at = new Date().toISOString();
      updateData.completed_by = user.id;
    } else if (body.is_completed === false && existing.is_completed) {
      updateData.completed_at = null;
      updateData.completed_by = null;
    }

    const { data: updatedRaw, error: updateError } = await supabase
      .from("war_room_tasks")
      .update(updateData)
      .eq("id", body.id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Error updating task:", updateError);
      return NextResponse.json({ error: updateError.message || "Error al actualizar la tarea" }, { status: 500 });
    }

    // Fetch with profile join
    const { data: updated } = await supabase
      .from("war_room_tasks")
      .select("*, assigned_to_profile:profiles!war_room_tasks_assigned_to_fkey(id, full_name, email, role)")
      .eq("id", body.id)
      .single();

    let auditAction: "update" | "delete" | "status_change" = "update";
    if (body.is_active === false) auditAction = "delete";
    else if (body.is_completed !== undefined) auditAction = "status_change";

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      user_name: profile.full_name,
      user_role: profile.role,
      action: auditAction,
      table_name: "war_room_tasks",
      record_id: body.id,
      old_values: existing as unknown as Record<string, unknown>,
      new_values: updateData as unknown as Record<string, unknown>,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
    });

    return NextResponse.json({ data: updated || updatedRaw });
  } catch (error) {
    console.error("Unexpected error in PATCH /api/war-room/tasks:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
