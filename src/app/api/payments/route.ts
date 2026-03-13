import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizePostgrestValue } from "@/lib/utils";

// =====================================================
// GET /api/payments
// Fetch payments with optional filters.
// Supports: category, supplier_id, status, search, page, pageSize
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
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Perfil de usuario no encontrado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "";
    const supplierId = searchParams.get("supplier_id") || "";
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "100", 10), 200);
    const sortField = searchParams.get("sort_field") || "created_at";
    const sortDirection = searchParams.get("sort_direction") || "desc";

    const allowedSortFields: Record<string, string> = {
      created_at: "created_at",
      client: "client",
      usd_invoice: "usd_invoice",
      deposit: "deposit",
      balance_to_pay: "balance_to_pay",
      client_payment: "client_payment",
      status: "status",
    };

    const resolvedSort = allowedSortFields[sortField] || "created_at";
    const ascending = sortDirection === "asc";

    let query = supabase
      .from("payments")
      .select("*, suppliers(id, name, bank_name, account_details)", { count: "exact" })
      .order(resolvedSort, { ascending, nullsFirst: false });

    if (category) {
      query = query.eq("category", category);
    }

    if (supplierId) {
      query = query.eq("supplier_id", supplierId);
    }

    if (status) {
      const statusList = status.split(",").map((s) => s.trim()).filter(Boolean);
      if (statusList.length === 1) {
        query = query.eq("status", statusList[0]);
      } else if (statusList.length > 1) {
        query = query.in("status", statusList);
      }
    }

    if (search) {
      const s = sanitizePostgrestValue(search);
      query = query.or(
        `client.ilike.%${s}%,description.ilike.%${s}%,china_sales_contract.ilike.%${s}%,remarks.ilike.%${s}%`
      );
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching payments:", error);
      return NextResponse.json({ error: "Error al obtener los pagos" }, { status: 500 });
    }

    return NextResponse.json({
      data: data || [],
      count: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/payments:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// =====================================================
// POST /api/payments
// Create a new payment record.
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
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Perfil de usuario no encontrado" }, { status: 403 });
    }

    // Role check: comercial users cannot create payments
    if (profile.role === "comercial") {
      return NextResponse.json(
        { error: "No tiene permisos para realizar esta acción" },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!body.category) {
      return NextResponse.json({ error: "La categoría es obligatoria" }, { status: 400 });
    }

    const paymentData = {
      category: body.category,
      supplier_id: body.supplier_id || null,
      client: body.client?.trim() || null,
      description: body.description?.trim() || null,
      china_sales_contract: body.china_sales_contract?.trim() || null,
      usd_invoice: body.usd_invoice != null ? Number(body.usd_invoice) : null,
      deposit: body.deposit != null ? Number(body.deposit) : null,
      deposit_percentage: body.deposit_percentage != null ? Number(body.deposit_percentage) : null,
      balance_to_pay: body.balance_to_pay != null ? Number(body.balance_to_pay) : null,
      payment_colombia: body.payment_colombia?.trim() || null,
      account_info: body.account_info?.trim() || null,
      client_payment: body.client_payment != null ? Number(body.client_payment) : null,
      remarks: body.remarks?.trim() || null,
      numeral_cambiario: body.numeral_cambiario?.trim() || null,
      status: body.status || "pending",
      created_by: user.id,
    };

    const { data: newPayment, error: insertError } = await supabase
      .from("payments")
      .insert(paymentData)
      .select("*, suppliers(id, name, bank_name, account_details)")
      .single();

    if (insertError) {
      console.error("Error inserting payment:", insertError);
      return NextResponse.json({ error: "Error al crear el pago" }, { status: 500 });
    }

    // Audit log
    const { error: auditError } = await supabase.from("audit_logs").insert({
      user_id: user.id,
      user_name: profile.full_name,
      user_role: profile.role,
      action: "create",
      table_name: "payments",
      record_id: newPayment.id,
      old_values: null,
      new_values: paymentData as unknown as Record<string, unknown>,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
    });

    if (auditError) console.error("Error inserting audit log:", auditError);

    return NextResponse.json({ data: newPayment }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/payments:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// =====================================================
// PATCH /api/payments
// Update a payment record.
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
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Perfil de usuario no encontrado" }, { status: 403 });
    }

    // Role check: comercial users cannot update payments
    if (profile.role === "comercial") {
      return NextResponse.json(
        { error: "No tiene permisos para realizar esta acción" },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "El ID del pago es obligatorio" }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabase
      .from("payments")
      .select("*")
      .eq("id", body.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "category", "supplier_id", "client", "description", "china_sales_contract",
      "usd_invoice", "deposit", "deposit_percentage", "balance_to_pay",
      "payment_colombia", "account_info", "client_payment", "remarks",
      "numeral_cambiario", "status",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    updateData.updated_at = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from("payments")
      .update(updateData)
      .eq("id", body.id)
      .select("*, suppliers(id, name, bank_name, account_details)")
      .single();

    if (updateError) {
      console.error("Error updating payment:", updateError);
      return NextResponse.json({ error: "Error al actualizar el pago" }, { status: 500 });
    }

    // Audit log
    const { error: auditError } = await supabase.from("audit_logs").insert({
      user_id: user.id,
      user_name: profile.full_name,
      user_role: profile.role,
      action: "update",
      table_name: "payments",
      record_id: body.id,
      old_values: existing as unknown as Record<string, unknown>,
      new_values: updateData as unknown as Record<string, unknown>,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
    });

    if (auditError) console.error("Error inserting audit log:", auditError);

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Unexpected error in PATCH /api/payments:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// =====================================================
// DELETE /api/payments
// Delete a payment record.
// =====================================================
export async function DELETE(request: NextRequest) {
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
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Perfil de usuario no encontrado" }, { status: 403 });
    }

    // Role check: only admin and directora can delete payments
    if (profile.role !== "admin" && profile.role !== "directora") {
      return NextResponse.json(
        { error: "No tiene permisos para eliminar pagos" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "El ID del pago es obligatorio" }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabase
      .from("payments")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from("payments")
      .update({ is_active: false, updated_by: user.id })
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting payment:", deleteError);
      return NextResponse.json({ error: "Error al eliminar el pago" }, { status: 500 });
    }

    // Audit log
    const { error: auditError } = await supabase.from("audit_logs").insert({
      user_id: user.id,
      user_name: profile.full_name,
      user_role: profile.role,
      action: "delete",
      table_name: "payments",
      record_id: id,
      old_values: existing as unknown as Record<string, unknown>,
      new_values: null,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
    });

    if (auditError) console.error("Error inserting audit log:", auditError);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error in DELETE /api/payments:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
