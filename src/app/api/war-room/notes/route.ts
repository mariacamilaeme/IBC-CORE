import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// =====================================================
// GET /api/war-room/notes
// =====================================================
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: profile, error: profileError } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
    if (profileError || !profile) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 403 });

    let query = supabase
      .from("war_room_notes")
      .select("*")
      .eq("is_active", true)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });

    // Non-admin users only see their own notes
    if (profile.role === "comercial" || profile.role === "analista") {
      query = query.eq("created_by", user.id);
    }

    const { data: notes, error: queryError } = await query.limit(200);
    if (queryError) {
      console.error("Error fetching notes:", queryError);
      return NextResponse.json({ error: "Error al obtener las notas" }, { status: 500 });
    }

    return NextResponse.json({ data: notes });
  } catch (error) {
    console.error("Unexpected error in GET /api/war-room/notes:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// =====================================================
// POST /api/war-room/notes
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();

    if (!body.content || body.content.trim() === "") {
      return NextResponse.json({ error: "El contenido es obligatorio" }, { status: 400 });
    }

    const noteData = {
      content: body.content.trim(),
      color: body.color || "default",
      pinned: body.pinned ?? false,
      linked_date: body.linked_date || null,
      is_active: true,
      created_by: user.id,
      updated_by: user.id,
    };

    const { data: newNote, error: insertError } = await supabase
      .from("war_room_notes")
      .insert(noteData)
      .select("*")
      .single();

    if (insertError) {
      console.error("Error inserting note:", insertError);
      return NextResponse.json({ error: "Error al crear la nota" }, { status: 500 });
    }

    return NextResponse.json({ data: newNote }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/war-room/notes:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// =====================================================
// PATCH /api/war-room/notes
// =====================================================
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: "El ID es obligatorio" }, { status: 400 });

    // Ownership check: non-admin users can only update their own notes
    if (profile?.role !== "admin" && profile?.role !== "directora") {
      const { data: existingNote } = await supabase
        .from("war_room_notes")
        .select("created_by")
        .eq("id", body.id)
        .single();

      if (existingNote?.created_by !== user.id) {
        return NextResponse.json({ error: "No tiene permisos para editar esta nota" }, { status: 403 });
      }
    }

    const updateData: Record<string, unknown> = { updated_by: user.id };
    const allowedFields = ["content", "color", "pinned", "linked_date", "is_active"];

    for (const field of allowedFields) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    const { data: updated, error: updateError } = await supabase
      .from("war_room_notes")
      .update(updateData)
      .eq("id", body.id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Error updating note:", updateError);
      return NextResponse.json({ error: "Error al actualizar la nota" }, { status: 500 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Unexpected error in PATCH /api/war-room/notes:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
