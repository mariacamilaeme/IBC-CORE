import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sanitizePostgrestValue } from "@/lib/utils";

// =====================================================
// GET /api/quotations
// Fetch active quotations with client and commercial info.
// Role-based: comercial sees only their own.
// Supports filters: search, status, commercial_id, client_id,
//   product_line, date_from, date_to
// Ordered by created_at DESC
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Get user profile to determine role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Perfil de usuario no encontrado" },
        { status: 404 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const commercialId = searchParams.get("commercial_id") || "";
    const clientId = searchParams.get("client_id") || "";
    const productLine = searchParams.get("product_line") || "";
    const dateFrom = searchParams.get("date_from") || "";
    const dateTo = searchParams.get("date_to") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = Math.min(parseInt(searchParams.get("page_size") || "100", 10), 200);

    // Build query with joins
    let query = supabase
      .from("quotations")
      .select(
        `
        *,
        client:clients!client_id (
          id,
          company_name,
          trade_name,
          contact_name,
          email,
          phone,
          city,
          country,
          client_type
        ),
        commercial:profiles!commercial_id (
          id,
          full_name,
          email,
          role
        )
      `,
        { count: "exact" }
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    // Role-based filtering: comercial only sees their own quotations
    if (profile.role === "comercial") {
      query = query.eq("commercial_id", user.id);
    }

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (commercialId) {
      query = query.eq("commercial_id", commercialId);
    }

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    if (productLine) {
      query = query.eq("product_line", productLine);
    }

    if (dateFrom) {
      query = query.gte("created_at", `${dateFrom}T00:00:00`);
    }

    if (dateTo) {
      query = query.lte("created_at", `${dateTo}T23:59:59`);
    }

    // Text search across quotation_number, material, and client company_name
    if (search) {
      const s = sanitizePostgrestValue(search);
      query = query.or(
        `quotation_number.ilike.%${s}%,material.ilike.%${s}%`
      );
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching quotations:", error);
      return NextResponse.json(
        { error: "Error al obtener cotizaciones" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    });
  } catch (err) {
    console.error("Unexpected error in GET /api/quotations:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/quotations
// Create a new quotation.
// Auto-generates quotation_number from system_config.
// Sets initial status_history entry.
// Inserts audit_log.
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    // Verify authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Perfil de usuario no encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.client_id) {
      return NextResponse.json(
        { error: "El campo cliente es obligatorio" },
        { status: 400 }
      );
    }

    if (!body.commercial_id) {
      return NextResponse.json(
        { error: "El campo comercial es obligatorio" },
        { status: 400 }
      );
    }

    // Generate quotation number from system_config
    // Use service client for system_config to bypass RLS
    const { data: config, error: configError } = await serviceClient
      .from("system_config")
      .select("id, quotation_prefix, quotation_next_number")
      .limit(1)
      .single();

    if (configError || !config) {
      console.error("Error reading system_config:", configError);
      return NextResponse.json(
        { error: "Error al generar el numero de cotizacion" },
        { status: 500 }
      );
    }

    const prefix = config.quotation_prefix || "COT";
    const nextNumber = config.quotation_next_number || 1;
    const quotationNumber = `${prefix}-${String(nextNumber).padStart(5, "0")}`;

    // Atomically increment: only succeeds if no one else changed it (optimistic lock)
    const { error: incrementError } = await serviceClient
      .from("system_config")
      .update({ quotation_next_number: nextNumber + 1 })
      .eq("id", config.id)
      .eq("quotation_next_number", nextNumber);

    if (incrementError) {
      return NextResponse.json(
        { error: "Error de concurrencia al generar número de cotización. Intente de nuevo." },
        { status: 409 }
      );
    }

    // Calculate expiration date if validity_days is provided
    let expirationDate: string | null = null;
    if (body.validity_days) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + body.validity_days);
      expirationDate = expDate.toISOString().split("T")[0];
    }

    // Calculate total_value_usd if quantity and unit_price are provided
    let totalValueUsd = body.total_value_usd || null;
    if (body.quantity && body.unit_price && !totalValueUsd) {
      totalValueUsd = body.quantity * body.unit_price;
    }

    // Calculate total_value_cop if exchange rate is provided
    let totalValueCop = body.total_value_cop || null;
    if (totalValueUsd && body.exchange_rate_at_quotation && !totalValueCop) {
      totalValueCop = totalValueUsd * body.exchange_rate_at_quotation;
    }

    // Initial status history entry
    const initialStatus = body.status || "pendiente";
    const statusHistory = [
      {
        status: initialStatus,
        date: new Date().toISOString(),
        user_id: user.id,
        user_name: profile.full_name,
        notes: "Cotizacion creada",
      },
    ];

    // Prepare quotation data
    const quotationData = {
      quotation_number: quotationNumber,
      client_id: body.client_id,
      commercial_id: body.commercial_id,
      product_line: body.product_line || null,
      material: body.material || null,
      material_specs: body.material_specs || null,
      quantity: body.quantity || null,
      unit: body.unit || null,
      unit_price: body.unit_price || null,
      total_value_usd: totalValueUsd,
      total_value_cop: totalValueCop,
      exchange_rate_at_quotation: body.exchange_rate_at_quotation || null,
      status: initialStatus,
      status_history: statusHistory,
      china_request_date: body.china_request_date || null,
      china_response_date: body.china_response_date || null,
      validity_days: body.validity_days || null,
      expiration_date: expirationDate,
      incoterm: body.incoterm || null,
      port_of_origin: body.port_of_origin || null,
      port_of_destination: body.port_of_destination || null,
      payment_conditions: body.payment_conditions || null,
      delivery_time_days: body.delivery_time_days || null,
      rejection_reason: body.rejection_reason || null,
      items: body.items || null,
      notes: body.notes || null,
      is_active: true,
      created_by: user.id,
      updated_by: user.id,
    };

    // Insert quotation
    const { data: newQuotation, error: insertError } = await supabase
      .from("quotations")
      .insert(quotationData)
      .select(
        `
        *,
        client:clients!client_id (
          id,
          company_name,
          trade_name,
          contact_name,
          email,
          phone,
          city,
          country,
          client_type
        ),
        commercial:profiles!commercial_id (
          id,
          full_name,
          email,
          role
        )
      `
      )
      .single();

    if (insertError) {
      console.error("Error inserting quotation:", insertError);
      return NextResponse.json(
        { error: "Error al crear la cotizacion" },
        { status: 500 }
      );
    }

    // Insert audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      user_name: profile.full_name,
      user_role: profile.role,
      action: "create",
      table_name: "quotations",
      record_id: newQuotation.id,
      old_values: null,
      new_values: quotationData,
    });

    return NextResponse.json({ data: newQuotation }, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in POST /api/quotations:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH /api/quotations
// Update a quotation.
// If status changed, append to status_history.
// Inserts audit_log.
// =====================================================
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Perfil de usuario no encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "El campo id es obligatorio para actualizar" },
        { status: 400 }
      );
    }

    // Get current quotation for comparison
    const { data: currentQuotation, error: fetchError } = await supabase
      .from("quotations")
      .select("*")
      .eq("id", body.id)
      .single();

    if (fetchError || !currentQuotation) {
      return NextResponse.json(
        { error: "Cotizacion no encontrada" },
        { status: 404 }
      );
    }

    // Comercial can only edit their own quotations
    if (profile.role === "comercial" && currentQuotation.commercial_id !== user.id) {
      return NextResponse.json({ error: "No tiene permisos para editar esta cotización" }, { status: 403 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updated_by: user.id,
    };

    // Allowed fields to update
    const allowedFields = [
      "client_id",
      "commercial_id",
      "product_line",
      "material",
      "material_specs",
      "quantity",
      "unit",
      "unit_price",
      "total_value_usd",
      "total_value_cop",
      "exchange_rate_at_quotation",
      "status",
      "china_request_date",
      "china_response_date",
      "client_sent_date",
      "client_response_date",
      "validity_days",
      "expiration_date",
      "incoterm",
      "port_of_origin",
      "port_of_destination",
      "payment_conditions",
      "delivery_time_days",
      "rejection_reason",
      "items",
      "notes",
      "is_active",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Recalculate total_value_usd if quantity/unit_price changed
    const qty = body.quantity ?? currentQuotation.quantity;
    const price = body.unit_price ?? currentQuotation.unit_price;
    if (qty && price && (body.quantity !== undefined || body.unit_price !== undefined)) {
      updateData.total_value_usd = qty * price;
    }

    // Recalculate total_value_cop if exchange rate or USD total changed
    const usdTotal =
      (updateData.total_value_usd as number) ?? currentQuotation.total_value_usd;
    const exchangeRate =
      body.exchange_rate_at_quotation ?? currentQuotation.exchange_rate_at_quotation;
    if (
      usdTotal &&
      exchangeRate &&
      (body.exchange_rate_at_quotation !== undefined ||
        updateData.total_value_usd !== undefined)
    ) {
      updateData.total_value_cop = usdTotal * exchangeRate;
    }

    // Recalculate expiration date if validity_days changed
    if (body.validity_days !== undefined) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + body.validity_days);
      updateData.expiration_date = expDate.toISOString().split("T")[0];
    }

    // If status changed, append to status_history
    if (body.status && body.status !== currentQuotation.status) {
      const currentHistory: Array<{
        status: string;
        date: string;
        user_id: string;
        user_name: string;
        notes: string;
      }> = currentQuotation.status_history || [];

      const newEntry = {
        status: body.status,
        date: new Date().toISOString(),
        user_id: user.id,
        user_name: profile.full_name,
        notes: body.status_change_notes || `Estado cambiado a ${body.status}`,
      };

      updateData.status_history = [...currentHistory, newEntry];

      // If status is "enviada_cliente", set client_sent_date
      if (body.status === "enviada_cliente" && !currentQuotation.client_sent_date) {
        updateData.client_sent_date = new Date().toISOString().split("T")[0];
      }

      // If status is "aprobada" or "rechazada", set client_response_date
      if (
        (body.status === "aprobada" || body.status === "rechazada") &&
        !currentQuotation.client_response_date
      ) {
        updateData.client_response_date = new Date().toISOString().split("T")[0];
      }
    }

    // Calculate china_response_time_days if both dates are set
    const chinaReqDate =
      body.china_request_date ?? currentQuotation.china_request_date;
    const chinaResDate =
      body.china_response_date ?? currentQuotation.china_response_date;
    if (chinaReqDate && chinaResDate) {
      const diff = Math.ceil(
        (new Date(chinaResDate).getTime() - new Date(chinaReqDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      updateData.china_response_time_days = diff;
    }

    // Perform update
    const { data: updatedQuotation, error: updateError } = await supabase
      .from("quotations")
      .update(updateData)
      .eq("id", body.id)
      .select(
        `
        *,
        client:clients!client_id (
          id,
          company_name,
          trade_name,
          contact_name,
          email,
          phone,
          city,
          country,
          client_type
        ),
        commercial:profiles!commercial_id (
          id,
          full_name,
          email,
          role
        )
      `
      )
      .single();

    if (updateError) {
      console.error("Error updating quotation:", updateError);
      return NextResponse.json(
        { error: "Error al actualizar la cotizacion" },
        { status: 500 }
      );
    }

    // Insert audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      user_name: profile.full_name,
      user_role: profile.role,
      action: body.status !== currentQuotation.status ? "status_change" : "update",
      table_name: "quotations",
      record_id: body.id,
      old_values: currentQuotation,
      new_values: updateData,
    });

    return NextResponse.json({ data: updatedQuotation });
  } catch (err) {
    console.error("Unexpected error in PATCH /api/quotations:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
