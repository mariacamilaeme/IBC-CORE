import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
    }

    // =======================================================
    // ALL QUERIES IN PARALLEL - consolidated for performance
    // =======================================================

    // Build reminders query based on role
    const remindersQuery = supabase
      .from("reminders")
      .select("id, title, description, type, priority, due_date, is_completed, related_entity_type")
      .eq("is_completed", false)
      .eq("is_active", true)
      .order("due_date", { ascending: true })
      .limit(10);

    if (profile.role === "comercial") {
      remindersQuery.eq("assigned_to", user.id);
    }

    const [
      // 1. Single query for ALL active contracts with status, tons, commercial, country
      contractsResult,
      // 2. Contract invoices summary
      chinaInvoicesResult,
      // 3. Upcoming ETAs
      upcomingEtasResult,
      // 4. Pending China invoices
      pendingChinaInvoicesResult,
      // 5. Pending Reminders
      remindersResult,
      // 6. Recent Activity
      recentActivityResult,
    ] = await Promise.all([
      // ONE query instead of 5 separate count queries + 2 data queries
      supabase
        .from("contracts")
        .select("status, tons_agreed, tons_shipped, commercial_name, country")
        .eq("is_active", true),
      supabase
        .from("contract_invoices")
        .select("china_invoice_value, customer_invoice_value, approved")
        .eq("is_active", true),
      supabase
        .from("contracts")
        .select("id, client_name, client_contract, commercial_name, vessel_name, eta_final, bl_number, country, status")
        .eq("is_active", true)
        .eq("status", "EN TRÁNSITO")
        .not("eta_final", "is", null)
        .order("eta_final", { ascending: true })
        .limit(8),
      supabase
        .from("contract_invoices")
        .select("id, invoice_date, customer_name, customer_contract, china_invoice_number, china_invoice_value, customer_invoice_value, approved")
        .eq("is_active", true)
        .eq("approved", false)
        .gt("customer_invoice_value", 0)
        .order("invoice_date", { ascending: false })
        .limit(10),
      remindersQuery,
      supabase
        .from("audit_logs")
        .select("id, user_name, action, table_name, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    // =======================================================
    // Process contracts data in memory (replaces 7 separate queries)
    // =======================================================
    const contracts = contractsResult.data ?? [];

    let enProduccion = 0;
    let enTransito = 0;
    let pendienteAnticipo = 0;
    let entregados = 0;
    let anulados = 0;
    let totalTonsAgreed = 0;
    let totalTonsShipped = 0;

    const commercialMap: Record<
      string,
      { total: number; enProduccion: number; enTransito: number; pendiente: number; entregados: number; tonsAgreed: number; tonsShipped: number }
    > = {};
    const countryMap: Record<string, { count: number; tons: number }> = {};

    for (const c of contracts) {
      // Count by status
      switch (c.status) {
        case "EN PRODUCCIÓN": enProduccion++; break;
        case "EN TRÁNSITO": enTransito++; break;
        case "PENDIENTE ANTICIPO": pendienteAnticipo++; break;
        case "ENTREGADO AL CLIENTE": entregados++; break;
        case "ANULADO": anulados++; break;
      }

      // Tons (exclude ANULADO)
      if (c.status !== "ANULADO") {
        totalTonsAgreed += c.tons_agreed ?? 0;
        totalTonsShipped += c.tons_shipped ?? 0;

        // Commercial ranking (exclude ANULADO)
        const commName = c.commercial_name || "SIN ASIGNAR";
        if (!commercialMap[commName]) {
          commercialMap[commName] = { total: 0, enProduccion: 0, enTransito: 0, pendiente: 0, entregados: 0, tonsAgreed: 0, tonsShipped: 0 };
        }
        const comm = commercialMap[commName];
        comm.total++;
        comm.tonsAgreed += c.tons_agreed ?? 0;
        comm.tonsShipped += c.tons_shipped ?? 0;
        if (c.status === "EN PRODUCCIÓN") comm.enProduccion++;
        else if (c.status === "EN TRÁNSITO") comm.enTransito++;
        else if (c.status === "PENDIENTE ANTICIPO") comm.pendiente++;
        else if (c.status === "ENTREGADO AL CLIENTE") comm.entregados++;

        // Country distribution (exclude ANULADO)
        const country = c.country || "SIN PAÍS";
        if (!countryMap[country]) countryMap[country] = { count: 0, tons: 0 };
        countryMap[country].count++;
        countryMap[country].tons += c.tons_agreed ?? 0;
      }
    }

    const contractsActivos = enProduccion + enTransito + pendienteAnticipo;

    // Commercial ranking sorted
    const commercialRanking = Object.entries(commercialMap)
      .map(([name, data]) => ({
        name,
        total: data.total,
        en_produccion: data.enProduccion,
        en_transito: data.enTransito,
        pendiente: data.pendiente,
        entregados: data.entregados,
        tons_agreed: Math.round(data.tonsAgreed * 100) / 100,
        tons_shipped: Math.round(data.tonsShipped * 100) / 100,
      }))
      .sort((a, b) => b.total - a.total);

    // Country distribution sorted
    const contractsByCountry = Object.entries(countryMap)
      .map(([country, data]) => ({
        country,
        count: data.count,
        tons: Math.round(data.tons * 100) / 100,
      }))
      .sort((a, b) => b.count - a.count);

    // Invoice aggregation
    const safeInvoices = chinaInvoicesResult.data ?? [];
    let totalChinaValue = 0;
    let totalCustomerValue = 0;
    let approvedInvoices = 0;
    let pendingInvoices = 0;

    for (const inv of safeInvoices) {
      totalChinaValue += inv.china_invoice_value ?? 0;
      totalCustomerValue += inv.customer_invoice_value ?? 0;
      if (inv.approved) approvedInvoices++;
      else pendingInvoices++;
    }

    // =======================================================
    // Build Response with Cache-Control headers
    // =======================================================
    const response = NextResponse.json({
      kpis: {
        contracts_activos: contractsActivos,
        en_produccion: enProduccion,
        en_transito: enTransito,
        pendiente_anticipo: pendienteAnticipo,
        entregados: entregados,
        anulados: anulados,
        total_tons_agreed: Math.round(totalTonsAgreed * 100) / 100,
        total_tons_shipped: Math.round(totalTonsShipped * 100) / 100,
        total_china_value: Math.round(totalChinaValue * 100) / 100,
        total_customer_value: Math.round(totalCustomerValue * 100) / 100,
        approved_invoices: approvedInvoices,
        pending_invoices: pendingInvoices,
      },
      commercial_ranking: commercialRanking,
      contracts_by_country: contractsByCountry,
      upcoming_etas: upcomingEtasResult.data ?? [],
      pending_china_invoices: pendingChinaInvoicesResult.data ?? [],
      pending_reminders: remindersResult.data ?? [],
      recent_activity: recentActivityResult.data ?? [],
      filters: {
        role: profile.role,
      },
    });

    // Cache for 30 seconds, allow stale-while-revalidate for 60s
    response.headers.set(
      "Cache-Control",
      "private, max-age=30, stale-while-revalidate=60"
    );

    return response;
  } catch (error) {
    console.error("Error en /api/metrics:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
