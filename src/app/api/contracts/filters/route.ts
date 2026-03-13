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

    const commercialName = searchParams.get("commercial_name") || "";
    const clientName = searchParams.get("client_name") || "";
    const status = searchParams.get("status") || "";
    const incoterm = searchParams.get("incoterm") || "";
    const balancePaid = searchParams.get("balance_paid") || "";
    const vesselName = searchParams.get("vessel_name") || "";
    const arrivalPort = searchParams.get("arrival_port") || "";
    const blReleased = searchParams.get("bl_released") || "";
    const productType = searchParams.get("product_type") || "";
    const productTypeUndefined = searchParams.get("product_type_undefined") || "";
    const etaFinal = searchParams.get("eta_final") || "";

    // Build query with current filters applied (cascading)
    let query = supabase
      .from("contracts")
      .select("commercial_name, client_name, vessel_name, arrival_port, bl_released, incoterm, product_type, status, balance_paid, eta_final")
      .eq("is_active", true);

    // Apply each active filter to narrow down options for other filters
    if (commercialName) {
      const list = toList(commercialName);
      if (list.length === 1) query = query.eq("commercial_name", list[0]);
      else if (list.length > 1) query = query.in("commercial_name", list);
    }
    if (clientName) {
      const list = toList(clientName);
      if (list.length === 1) query = query.eq("client_name", list[0]);
      else if (list.length > 1) query = query.in("client_name", list);
    }
    if (status) {
      const list = toList(status);
      if (list.length === 1) query = query.eq("status", list[0]);
      else if (list.length > 1) query = query.in("status", list);
    }
    if (incoterm) {
      const list = toList(incoterm);
      if (list.length === 1) query = query.eq("incoterm", list[0]);
      else if (list.length > 1) query = query.in("incoterm", list);
    }
    if (balancePaid) {
      const list = toList(balancePaid);
      if (list.length === 1) query = query.eq("balance_paid", list[0]);
      else if (list.length > 1) query = query.in("balance_paid", list);
    }
    if (vesselName) {
      const list = toList(vesselName);
      if (list.length === 1) query = query.eq("vessel_name", list[0]);
      else if (list.length > 1) query = query.in("vessel_name", list);
    }
    if (arrivalPort) {
      const list = toList(arrivalPort);
      if (list.length === 1) query = query.eq("arrival_port", list[0]);
      else if (list.length > 1) query = query.in("arrival_port", list);
    }
    if (blReleased) {
      const list = toList(blReleased);
      if (list.length === 1) query = query.eq("bl_released", list[0]);
      else if (list.length > 1) query = query.in("bl_released", list);
    }
    if (productType) {
      const list = toList(productType);
      if (list.length === 1) query = query.eq("product_type", list[0]);
      else if (list.length > 1) query = query.in("product_type", list);
    }
    if (productTypeUndefined === "true") {
      query = query.or("product_type.is.null,product_type.eq.");
    }
    if (etaFinal) {
      const list = toList(etaFinal);
      if (list.length === 1) query = query.eq("eta_final", list[0]);
      else if (list.length > 1) query = query.in("eta_final", list);
    }

    const { data: contracts, error } = await query;

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
      commercial_names: unique(contracts?.map((c) => c.commercial_name)),
      client_names: unique(contracts?.map((c) => c.client_name)),
      vessel_names: unique(contracts?.map((c) => c.vessel_name)),
      arrival_ports: unique(contracts?.map((c) => c.arrival_port)),
      incoterms: unique(contracts?.map((c) => c.incoterm)),
      product_types: unique(contracts?.map((c) => c.product_type)),
      eta_final_dates: unique(contracts?.map((c) => c.eta_final)),
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/contracts/filters:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
