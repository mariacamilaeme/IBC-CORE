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

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase } = auth;

  const { data, error } = await supabase
    .from("roles")
    .select("*")
    .order("is_system", { ascending: false })
    .order("name")
    .limit(100);

  if (error) { console.error("Admin roles error:", error); return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 }); }
  const res = NextResponse.json({ data });
  res.headers.set("Cache-Control", "private, max-age=300");
  return res;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase } = auth;
  const body = await request.json();

  const { name, display_name, description } = body;
  if (!name || !display_name) {
    return NextResponse.json({ error: "Nombre y nombre de visualización son requeridos" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("roles")
    .insert({ name: name.toLowerCase().replace(/\s+/g, "_"), display_name, description, is_system: false })
    .select()
    .single();

  if (error) { console.error("Admin roles error:", error); return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 }); }
  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase } = auth;
  const body = await request.json();
  const { id, ...updateData } = body;

  if (!id) return NextResponse.json({ error: "ID de rol requerido" }, { status: 400 });

  // Check if system role
  const { data: role } = await supabase
    .from("roles")
    .select("is_system, name")
    .eq("id", id)
    .single();

  if (role?.name === "admin") {
    return NextResponse.json({ error: "El rol Administrador no puede ser modificado" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("roles")
    .update({ display_name: updateData.display_name, description: updateData.description })
    .eq("id", id)
    .select()
    .single();

  if (error) { console.error("Admin roles error:", error); return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 }); }
  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase } = auth;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "ID de rol requerido" }, { status: 400 });

  // Check if system role
  const { data: role } = await supabase
    .from("roles")
    .select("is_system")
    .eq("id", id)
    .single();

  if (role?.is_system) {
    return NextResponse.json({ error: "No se pueden eliminar roles del sistema" }, { status: 400 });
  }

  // Check if role has users
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role_id", id);

  if (count && count > 0) {
    return NextResponse.json({ error: "No se puede eliminar un rol que tiene usuarios asignados" }, { status: 400 });
  }

  const { error } = await supabase
    .from("roles")
    .delete()
    .eq("id", id);

  if (error) { console.error("Admin roles error:", error); return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 }); }
  return NextResponse.json({ message: "Rol eliminado" });
}
