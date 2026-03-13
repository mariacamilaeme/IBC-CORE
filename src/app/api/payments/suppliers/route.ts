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

    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Error al obtener proveedores" }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
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
