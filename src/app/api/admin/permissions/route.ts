import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado", status: 401 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Acceso denegado", status: 403 };
  }

  return { user, supabase };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase } = auth;
  const { searchParams } = new URL(request.url);
  const roleId = searchParams.get("role_id");

  let query = supabase.from("permissions").select("*").order("module");

  if (roleId) {
    query = query.eq("role_id", roleId);
  }

  const { data, error } = await query.limit(500);

  if (error) { console.error("Admin permissions error:", error); return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 }); }
  const res = NextResponse.json({ data });
  res.headers.set("Cache-Control", "private, max-age=120");
  return res;
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase } = auth;
  const body = await request.json();
  const { role_id, permissions } = body;

  if (!role_id || !permissions) {
    return NextResponse.json({ error: "role_id y permissions son requeridos" }, { status: 400 });
  }

  // Check if admin role - don't allow modification
  const { data: role } = await supabase
    .from("roles")
    .select("name")
    .eq("id", role_id)
    .single();

  if (role?.name === "admin") {
    return NextResponse.json({ error: "Los permisos del Administrador no pueden ser modificados" }, { status: 400 });
  }

  // Upsert all permissions for this role
  const upsertData = permissions.map((p: { module: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }) => ({
    role_id,
    module: p.module,
    can_view: p.can_view,
    can_create: p.can_create,
    can_edit: p.can_edit,
    can_delete: p.can_delete,
  }));

  const { error } = await supabase
    .from("permissions")
    .upsert(upsertData, { onConflict: "role_id,module" });

  if (error) { console.error("Admin permissions error:", error); return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 }); }
  return NextResponse.json({ message: "Permisos actualizados" });
}
