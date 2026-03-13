import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizePostgrestValue } from "@/lib/utils";

// =====================================================
// GET /api/contract-invoices
// Fetch active contract invoices with pagination.
// Supports: search, approved, customer_name, page, pageSize
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate
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

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Perfil no encontrado" },
        { status: 404 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const approved = searchParams.get("approved") || "";
    const customerName = searchParams.get("customer_name") || "";
    const dateFrom = searchParams.get("date_from") || "";
    const dateTo = searchParams.get("date_to") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20", 10), 200);

    const toList = (val: string) => val.split(",").map((s) => s.trim()).filter(Boolean);

    // Build query
    let query = supabase
      .from("contract_invoices")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .order("invoice_date", { ascending: false });

    // Search filter across multiple columns
    if (search) {
      const s = sanitizePostgrestValue(search);
      query = query.or(
        `customer_name.ilike.%${s}%,china_invoice_number.ilike.%${s}%,customer_contract.ilike.%${s}%,notes.ilike.%${s}%`
      );
    }

    // Approved filter
    if (approved === "true") {
      query = query.eq("approved", true);
    } else if (approved === "false") {
      query = query.eq("approved", false);
    }

    // Customer name filter (supports comma-separated multi-value)
    if (customerName) {
      const list = toList(customerName);
      if (list.length === 1) query = query.eq("customer_name", list[0]);
      else if (list.length > 1) query = query.in("customer_name", list);
    }

    // Date range filters on invoice_date
    if (dateFrom) {
      query = query.gte("invoice_date", dateFrom);
    }
    if (dateTo) {
      query = query.lte("invoice_date", dateTo);
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching contract invoices:", error);
      return NextResponse.json(
        { error: "Error al obtener las facturas de contrato" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      count: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/contract-invoices:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/contract-invoices
// Create a new contract invoice.
// Required: invoice_date, china_invoice_number
// Inserts audit_log entry.
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate
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

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Perfil no encontrado" },
        { status: 404 }
      );
    }

    // Role check: comercial users cannot create contract invoices
    if (profile.role === "comercial") {
      return NextResponse.json(
        { error: "No tiene permisos para realizar esta acción" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.invoice_date) {
      return NextResponse.json(
        { error: "El campo invoice_date es requerido" },
        { status: 400 }
      );
    }

    if (!body.china_invoice_number) {
      return NextResponse.json(
        { error: "El campo china_invoice_number es requerido" },
        { status: 400 }
      );
    }

    // Build insert data
    const insertData = {
      invoice_date: body.invoice_date,
      customer_name: body.customer_name || null,
      china_invoice_number: body.china_invoice_number,
      china_invoice_value: body.china_invoice_value ?? null,
      customer_contract: body.customer_contract || null,
      customer_invoice_value: body.customer_invoice_value ?? null,
      approved: body.approved ?? false,
      notes: body.notes || null,
      is_active: true,
    };

    // Insert contract invoice
    const { data: newInvoice, error: insertError } = await supabase
      .from("contract_invoices")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting contract invoice:", insertError);
      return NextResponse.json(
        { error: "Error al crear la factura de contrato" },
        { status: 500 }
      );
    }

    // Insert audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      user_name: profile.full_name,
      user_role: profile.role,
      action: "create",
      table_name: "contract_invoices",
      record_id: newInvoice.id,
      old_values: null,
      new_values: newInvoice as unknown as Record<string, unknown>,
      ip_address: request.headers.get("x-forwarded-for") || null,
    });

    return NextResponse.json({ data: newInvoice }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/contract-invoices:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH /api/contract-invoices
// Update an existing contract invoice.
// Required: id in body
// Inserts audit_log entry with old and new values.
// =====================================================
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate
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

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Perfil no encontrado" },
        { status: 404 }
      );
    }

    // Role check: comercial users cannot update contract invoices
    if (profile.role === "comercial") {
      return NextResponse.json(
        { error: "No tiene permisos para realizar esta acción" },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "El ID de la factura de contrato es requerido" },
        { status: 400 }
      );
    }

    // Fetch current record for old_values
    const { data: currentInvoice, error: fetchError } = await supabase
      .from("contract_invoices")
      .select("*")
      .eq("id", body.id)
      .single();

    if (fetchError || !currentInvoice) {
      return NextResponse.json(
        { error: "Factura de contrato no encontrada" },
        { status: 404 }
      );
    }

    // Build update data with only provided fields
    const updateData: Record<string, unknown> = {};

    const allowedFields = [
      "invoice_date",
      "customer_name",
      "china_invoice_number",
      "china_invoice_value",
      "customer_contract",
      "customer_invoice_value",
      "approved",
      "notes",
      "is_active",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Update contract invoice
    const { data: updatedInvoice, error: updateError } = await supabase
      .from("contract_invoices")
      .update(updateData)
      .eq("id", body.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating contract invoice:", updateError);
      return NextResponse.json(
        { error: "Error al actualizar la factura de contrato" },
        { status: 500 }
      );
    }

    // Insert audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      user_name: profile.full_name,
      user_role: profile.role,
      action: "update",
      table_name: "contract_invoices",
      record_id: body.id,
      old_values: currentInvoice as unknown as Record<string, unknown>,
      new_values: updatedInvoice as unknown as Record<string, unknown>,
      ip_address: request.headers.get("x-forwarded-for") || null,
    });

    return NextResponse.json({ data: updatedInvoice });
  } catch (error) {
    console.error("Unexpected error in PATCH /api/contract-invoices:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
