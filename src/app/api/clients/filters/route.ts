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

    const clientType = searchParams.get("client_type") || "";
    const country = searchParams.get("country") || "";
    const commercialId = searchParams.get("commercial_id") || "";
    const industrySector = searchParams.get("industry_sector") || "";

    // Build query with current filters applied (cascading)
    let query = supabase
      .from("clients")
      .select("client_type, country, assigned_commercial_id, industry_sector")
      .eq("is_active", true);

    // Apply each active filter to narrow down options for other filters
    if (clientType) {
      const list = toList(clientType);
      if (list.length === 1) query = query.eq("client_type", list[0]);
      else if (list.length > 1) query = query.in("client_type", list);
    }
    if (country) {
      const list = toList(country);
      if (list.length === 1) query = query.eq("country", list[0]);
      else if (list.length > 1) query = query.in("country", list);
    }
    if (commercialId) {
      const list = toList(commercialId);
      if (list.length === 1) query = query.eq("assigned_commercial_id", list[0]);
      else if (list.length > 1) query = query.in("assigned_commercial_id", list);
    }
    if (industrySector) {
      const list = toList(industrySector);
      if (list.length === 1) query = query.eq("industry_sector", list[0]);
      else if (list.length > 1) query = query.in("industry_sector", list);
    }

    const { data: clients, error } = await query;

    if (error) {
      console.error("Error fetching client filter options:", error);
      return NextResponse.json(
        { error: "Error al obtener opciones de filtro" },
        { status: 500 }
      );
    }

    // Extract unique values
    const unique = (arr: (string | null | undefined)[]) =>
      [...new Set(arr.filter((v): v is string => !!v && v.trim() !== ""))].sort();

    // Get unique commercial IDs and fetch their names
    const commercialIds = [
      ...new Set(
        (clients || [])
          .map((c) => c.assigned_commercial_id)
          .filter((id): id is string => !!id)
      ),
    ];

    let commercials: { id: string; full_name: string }[] = [];
    if (commercialIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", commercialIds)
        .order("full_name");
      commercials = profiles || [];
    }

    return NextResponse.json({
      client_types: unique(clients?.map((c) => c.client_type)),
      countries: unique(clients?.map((c) => c.country)),
      commercials,
      industry_sectors: unique(clients?.map((c) => c.industry_sector)),
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/clients/filters:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
