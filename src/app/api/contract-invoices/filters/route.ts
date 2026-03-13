import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Parse filter params for cascading
    const { searchParams } = new URL(request.url);
    const toList = (val: string) => val.split(",").map((s) => s.trim()).filter(Boolean);

    const customerName = searchParams.get("customer_name") || "";

    // Build query with current filters applied (cascading)
    let query = supabase
      .from("contract_invoices")
      .select("customer_name")
      .eq("is_active", true);

    if (customerName) {
      const list = toList(customerName);
      if (list.length === 1) query = query.eq("customer_name", list[0]);
      else if (list.length > 1) query = query.in("customer_name", list);
    }

    const { data: invoices, error } = await query;

    if (error) {
      console.error("Error fetching filter options:", error);
      return NextResponse.json(
        { error: "Error al obtener opciones de filtro" },
        { status: 500 }
      );
    }

    // Extract unique values
    const unique = (arr: (string | null | undefined)[]) =>
      [...new Set(arr.filter((v): v is string => !!v && v.trim() !== ""))].sort();

    return NextResponse.json({
      customer_names: unique(invoices?.map((c) => c.customer_name)),
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/contract-invoices/filters:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
