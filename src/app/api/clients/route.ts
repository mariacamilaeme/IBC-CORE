import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// =====================================================
// GET /api/clients
// Fetch active clients with optional filters.
// Supports: search, client_type, country, commercial_id,
//   industry_sector, page, pageSize, sort_field, sort_direction
// Ordered with server-side pagination.
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
      return NextResponse.json({ error: "Perfil de usuario no encontrado" }, { status: 403 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const sortField = searchParams.get("sort_field") || "company_name";
    const sortDirection = searchParams.get("sort_direction") || "asc";

    // Allowed sort fields
    const allowedSortFields: Record<string, string> = {
      company_name: "company_name",
      trade_name: "trade_name",
      contact_name: "contact_name",
      email: "email",
      phone: "phone",
      country: "country",
      client_type: "client_type",
      industry_sector: "industry_sector",
      created_at: "created_at",
    };

    const resolvedSort = allowedSortFields[sortField] || "company_name";
    const ascending = sortDirection === "asc";

    // Helper to split comma-separated param
    const toList = (val: string) => val.split(",").map((s) => s.trim()).filter(Boolean);

    // Build query
    let query = supabase
      .from("clients")
      .select("*, assigned_commercial:profiles!clients_assigned_commercial_id_fkey(id, full_name, email)", { count: "exact" })
      .eq("is_active", true)
      .order(resolvedSort, { ascending, nullsFirst: false });

    // Role-based filtering
    if (profile.role === "comercial") {
      query = query.eq("assigned_commercial_id", user.id);
    }

    // Search
    if (search) {
      query = query.or(
        `company_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%,trade_name.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    // Multi-value filters
    const clientType = searchParams.get("client_type") || "";
    if (clientType) {
      const list = toList(clientType);
      if (list.length === 1) query = query.eq("client_type", list[0]);
      else if (list.length > 1) query = query.in("client_type", list);
    }

    const country = searchParams.get("country") || "";
    if (country) {
      const list = toList(country);
      if (list.length === 1) query = query.eq("country", list[0]);
      else if (list.length > 1) query = query.in("country", list);
    }

    const commercialId = searchParams.get("commercial_id") || "";
    if (commercialId) {
      const list = toList(commercialId);
      if (list.length === 1) query = query.eq("assigned_commercial_id", list[0]);
      else if (list.length > 1) query = query.in("assigned_commercial_id", list);
    }

    const industrySector = searchParams.get("industry_sector") || "";
    if (industrySector) {
      const list = toList(industrySector);
      if (list.length === 1) query = query.eq("industry_sector", list[0]);
      else if (list.length > 1) query = query.in("industry_sector", list);
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: clients, error: queryError, count } = await query;

    if (queryError) {
      console.error("Error fetching clients:", queryError);
      return NextResponse.json({ error: "Error al obtener los clientes" }, { status: 500 });
    }

    return NextResponse.json({
      data: clients,
      count: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/clients:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// =====================================================
// POST /api/clients
// Create a new client
// =====================================================
export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: "Perfil de usuario no encontrado" }, { status: 403 });
    }

    const body = await request.json();

    if (!body.company_name || body.company_name.trim() === "") {
      return NextResponse.json({ error: "El nombre de la empresa es obligatorio" }, { status: 400 });
    }

    const clientData = {
      company_name: body.company_name.trim(),
      trade_name: body.trade_name?.trim() || null,
      contact_name: body.contact_name?.trim() || null,
      contact_position: body.contact_position?.trim() || null,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      mobile: body.mobile?.trim() || null,
      address: body.address?.trim() || null,
      city: body.city?.trim() || null,
      state_province: body.state_province?.trim() || null,
      country: body.country?.trim() || null,
      postal_code: body.postal_code?.trim() || null,
      tax_id: body.tax_id?.trim() || null,
      tax_regime: body.tax_regime?.trim() || null,
      assigned_commercial_id: body.assigned_commercial_id || null,
      client_type: body.client_type || null,
      industry_sector: body.industry_sector?.trim() || null,
      payment_terms: body.payment_terms?.trim() || null,
      credit_limit: body.credit_limit != null ? Number(body.credit_limit) : null,
      preferred_currency: body.preferred_currency?.trim() || null,
      shipping_addresses: body.shipping_addresses || null,
      additional_contacts: body.additional_contacts || null,
      tags: body.tags || null,
      source: body.source?.trim() || null,
      is_active: true,
      notes: body.notes?.trim() || null,
      created_by: user.id,
      updated_by: user.id,
    };

    const { data: newClient, error: insertError } = await supabase
      .from("clients")
      .insert(clientData)
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting client:", insertError);
      return NextResponse.json({ error: "Error al crear el cliente" }, { status: 500 });
    }

    const auditEntry = {
      user_id: user.id,
      user_name: profile.full_name,
      user_role: profile.role,
      action: "create" as const,
      table_name: "clients",
      record_id: newClient.id,
      old_values: null,
      new_values: clientData as unknown as Record<string, unknown>,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
    };

    const { error: auditError } = await supabase.from("audit_logs").insert(auditEntry);
    if (auditError) console.error("Error inserting audit log:", auditError);

    return NextResponse.json({ data: newClient }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/clients:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// =====================================================
// PATCH /api/clients
// Update an existing client with audit logging
// =====================================================
export async function PATCH(request: NextRequest) {
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
      return NextResponse.json({ error: "Perfil de usuario no encontrado" }, { status: 403 });
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "El ID del cliente es obligatorio" }, { status: 400 });
    }

    // Fetch existing for audit comparison
    const { data: existingClient, error: fetchError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", body.id)
      .single();

    if (fetchError || !existingClient) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const allowedFields = [
      "company_name", "trade_name", "contact_name", "contact_position",
      "email", "phone", "mobile", "address", "city", "state_province",
      "country", "postal_code", "tax_id", "tax_regime",
      "assigned_commercial_id", "client_type", "industry_sector",
      "payment_terms", "credit_limit", "preferred_currency",
      "shipping_addresses", "additional_contacts", "tags", "source",
      "is_active", "notes",
    ];

    const updateData: Record<string, unknown> = { updated_by: user.id };
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const { data: updatedClient, error: updateError } = await supabase
      .from("clients")
      .update(updateData)
      .eq("id", body.id)
      .select("*, assigned_commercial:profiles!clients_assigned_commercial_id_fkey(id, full_name, email)")
      .single();

    if (updateError) {
      console.error("Error updating client:", updateError);
      return NextResponse.json({ error: "Error al actualizar el cliente" }, { status: 500 });
    }

    const auditEntry = {
      user_id: user.id,
      user_name: profile.full_name,
      user_role: profile.role,
      action: "update" as const,
      table_name: "clients",
      record_id: body.id,
      old_values: existingClient as unknown as Record<string, unknown>,
      new_values: updateData as unknown as Record<string, unknown>,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
    };

    const { error: auditError } = await supabase.from("audit_logs").insert(auditEntry);
    if (auditError) console.error("Error inserting audit log:", auditError);

    return NextResponse.json({ data: updatedClient });
  } catch (error) {
    console.error("Unexpected error in PATCH /api/clients:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
