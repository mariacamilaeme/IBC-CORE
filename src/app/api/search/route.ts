import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// =====================================================
// GET /api/search
// Global search across all entities.
// Supports: q (search query), limit (per category)
// Returns grouped results by entity type.
// Respects role-based access control.
// =====================================================
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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Perfil de usuario no encontrado" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "5", 10), 10);

    if (!query || query.length < 2) {
      return NextResponse.json({
        contracts: [],
        clients: [],
        quotations: [],
        invoices: [],
        shipments: [],
      });
    }

    const pattern = `%${query}%`;
    const isComercial = profile.role === "comercial";

    // Build all queries in parallel
    const contractsPromise = supabase
      .from("contracts")
      .select("id, commercial_name, client_name, china_contract, client_contract, status, vessel_name, detail, product_type")
      .eq("is_active", true)
      .or(
        `commercial_name.ilike.${pattern},client_name.ilike.${pattern},china_contract.ilike.${pattern},client_contract.ilike.${pattern},vessel_name.ilike.${pattern},detail.ilike.${pattern}`
      )
      .order("contract_date", { ascending: false, nullsFirst: false })
      .limit(limit);

    // Clients: comercial only sees assigned clients
    let clientsQuery = supabase
      .from("clients")
      .select("id, company_name, trade_name, contact_name, email, country, client_type")
      .eq("is_active", true)
      .or(
        `company_name.ilike.${pattern},trade_name.ilike.${pattern},contact_name.ilike.${pattern},email.ilike.${pattern}`
      )
      .order("company_name", { ascending: true })
      .limit(limit);

    if (isComercial) {
      clientsQuery = clientsQuery.eq("assigned_commercial_id", user.id);
    }
    const clientsPromise = clientsQuery;

    // Quotations: comercial only sees their own
    let quotationsQuery = supabase
      .from("quotations")
      .select("id, quotation_number, material, status, product_line, total_value_usd, client:clients(company_name)")
      .eq("is_active", true)
      .or(
        `quotation_number.ilike.${pattern},material.ilike.${pattern}`
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (isComercial) {
      quotationsQuery = quotationsQuery.eq("commercial_id", user.id);
    }
    const quotationsPromise = quotationsQuery;

    // Invoices: comercial cannot access at all
    const invoicesPromise = isComercial
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from("invoices")
          .select("id, invoice_number, issue_date, total_amount, currency, payment_status, client:clients(company_name)")
          .eq("is_active", true)
          .or(
            `invoice_number.ilike.${pattern}`
          )
          .order("issue_date", { ascending: false })
          .limit(limit);

    // Shipments: comercial only sees their own
    let shipmentsQuery = supabase
      .from("shipments")
      .select("id, shipment_number, bl_number, booking_number, status, port_of_loading, port_of_discharge, etd, eta, vessel:vessels(vessel_name), client:clients(company_name)")
      .eq("is_active", true)
      .or(
        `shipment_number.ilike.${pattern},bl_number.ilike.${pattern},booking_number.ilike.${pattern},cargo_description.ilike.${pattern}`
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (isComercial) {
      shipmentsQuery = shipmentsQuery.eq("commercial_id", user.id);
    }
    const shipmentsPromise = shipmentsQuery;

    // Execute all queries in parallel
    const [contracts, clients, quotations, invoices, shipments] =
      await Promise.all([
        contractsPromise,
        clientsPromise,
        quotationsPromise,
        invoicesPromise,
        shipmentsPromise,
      ]);

    return NextResponse.json({
      contracts: contracts.data || [],
      clients: clients.data || [],
      quotations: quotations.data || [],
      invoices: invoices.data || [],
      shipments: shipments.data || [],
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
