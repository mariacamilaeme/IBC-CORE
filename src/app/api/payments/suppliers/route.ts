import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/payments/suppliers — list all suppliers
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Check role — comercial should not see bank details
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const isComercial = profile?.role === "comercial";

    const selectFields = isComercial ? "id, name" : "*";

    const { data, error } = await supabase
      .from("suppliers")
      .select(selectFields)
      .order("name", { ascending: true })
      .limit(500);

    if (error) {
      return NextResponse.json({ error: "Error al obtener proveedores" }, { status: 500 });
    }

    const res = NextResponse.json({ data: data || [] });
    res.headers.set("Cache-Control", "private, max-age=300");
    return res;
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// POST /api/payments/suppliers — create a new supplier
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Perfil de usuario no encontrado" }, { status: 403 });
    }

    // Role check: comercial users cannot create suppliers
    if (profile.role === "comercial") {
      return NextResponse.json(
        { error: "No tiene permisos para realizar esta acción" },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: "El nombre del proveedor es obligatorio" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        name: body.name.trim(),
        bank_name: body.bank_name || null,
        account_details: body.account_details || null,
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Ya existe un proveedor con ese nombre" }, { status: 409 });
      }
      return NextResponse.json({ error: "Error al crear el proveedor" }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
