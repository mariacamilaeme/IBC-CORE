import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado", status: 401 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Acceso denegado", status: 403 };
  }

  return { user, profile, supabase };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase } = auth;

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      *,
      role_data:roles!role_id (*)
    `)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("Admin users error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }

  const res = NextResponse.json({ data });
  res.headers.set("Cache-Control", "private, max-age=30");
  return res;
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase } = auth;
  const body = await request.json();
  const { id, action, ...updateData } = body;

  if (!id) {
    return NextResponse.json({ error: "ID de usuario requerido" }, { status: 400 });
  }

  // Prevent modifying own admin role
  if (id === auth.user.id && updateData.role && updateData.role !== "admin") {
    return NextResponse.json({ error: "No puedes cambiar tu propio rol de administrador" }, { status: 400 });
  }

  if (action === "block") {
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: false })
      .eq("id", id);

    if (error) { console.error("Admin users error:", error); return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 }); }
    return NextResponse.json({ message: "Usuario bloqueado" });
  }

  if (action === "unblock") {
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: true })
      .eq("id", id);

    if (error) { console.error("Admin users error:", error); return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 }); }
    return NextResponse.json({ message: "Usuario desbloqueado" });
  }

  if (action === "change_role") {
    const { role, role_id } = updateData;
    const update: Record<string, unknown> = {};
    if (role) update.role = role;
    if (role_id) update.role_id = role_id;

    const { error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", id);

    if (error) { console.error("Admin users error:", error); return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 }); }
    return NextResponse.json({ message: "Rol actualizado" });
  }

  if (action === "soft_delete") {
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: false })
      .eq("id", id);

    if (error) { console.error("Admin users error:", error); return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 }); }
    return NextResponse.json({ message: "Cuenta desactivada" });
  }

  if (action === "reset_password") {
    const serviceClient = await createServiceClient();

    // Get user email
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", id)
      .single();

    if (!targetProfile) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const { error } = await serviceClient.auth.resetPasswordForEmail(targetProfile.email);

    if (error) { console.error("Admin users error:", error); return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 }); }
    return NextResponse.json({ message: "Email de restablecimiento enviado" });
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}
