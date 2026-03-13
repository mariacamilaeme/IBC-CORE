import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type {
  Invoice,
  InsertInvoice,
  StatusHistoryEntry,
  PartialPayment,
  InsertAuditLog,
} from "@/types";

// =====================================================
// GET /api/invoices
// Fetch active invoices with joins. Role-restricted.
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

    // Get profile to check role
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Perfil no encontrado" },
        { status: 404 }
      );
    }

    if (profile.role === "comercial") {
      return NextResponse.json(
        { error: "No tiene permisos para acceder a este recurso" },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const paymentStatus = searchParams.get("payment_status") || "";
    const clientId = searchParams.get("client_id") || "";
    const commercialId = searchParams.get("commercial_id") || "";
    const dateFrom = searchParams.get("date_from") || "";
    const dateTo = searchParams.get("date_to") || "";

    // Build query with joins
    let query = supabase
      .from("invoices")
      .select(
        `
        *,
        client:clients!client_id (id, company_name, trade_name, contact_name, email, country),
        commercial:profiles!commercial_id (id, full_name, email, role)
      `
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    // Search filter - search by invoice_number or client company_name
    if (search) {
      query = query.or(
        `invoice_number.ilike.%${search}%,client.company_name.ilike.%${search}%`
      );
    }

    // Payment status filter
    if (paymentStatus) {
      query = query.eq("payment_status", paymentStatus);
    }

    // Client filter
    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    // Commercial filter
    if (commercialId) {
      query = query.eq("commercial_id", commercialId);
    }

    // Date range filters
    if (dateFrom) {
      query = query.gte("issue_date", dateFrom);
    }
    if (dateTo) {
      query = query.lte("issue_date", dateTo);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching invoices:", error);
      return NextResponse.json(
        { error: "Error al obtener las facturas" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error("Unexpected error in GET /api/invoices:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/invoices
// Create a new invoice with auto-generated number.
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceSupabase = await createServiceClient();

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
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Perfil no encontrado" },
        { status: 404 }
      );
    }

    if (profile.role === "comercial") {
      return NextResponse.json(
        { error: "No tiene permisos para crear facturas" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields = ["client_id", "issue_date", "due_date", "subtotal", "total_amount"];
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return NextResponse.json(
          { error: `El campo ${field} es requerido` },
          { status: 400 }
        );
      }
    }

    // Auto-generate invoice number from system_config
    const { data: config, error: configError } = await serviceSupabase
      .from("system_config")
      .select("invoice_prefix, invoice_next_number")
      .limit(1)
      .single();

    if (configError || !config) {
      return NextResponse.json(
        { error: "Error al obtener la configuracion del sistema" },
        { status: 500 }
      );
    }

    const prefix = config.invoice_prefix || "FAC";
    const nextNumber = config.invoice_next_number || 1;
    const invoiceNumber = `${prefix}-${String(nextNumber).padStart(5, "0")}`;

    // Calculate tax_amount if not provided
    let taxAmount = body.tax_amount;
    if (taxAmount === undefined || taxAmount === null) {
      const taxPercentage = body.tax_percentage || 0;
      taxAmount = (body.subtotal * taxPercentage) / 100;
    }

    // Build status history
    const statusHistory: StatusHistoryEntry[] = [
      {
        status: body.payment_status || "pendiente",
        date: new Date().toISOString(),
        user_id: user.id,
        user_name: profile.full_name,
        notes: "Factura creada",
      },
    ];

    // Build invoice record
    const invoiceData: InsertInvoice = {
      invoice_number: invoiceNumber,
      quotation_id: body.quotation_id || null,
      client_id: body.client_id,
      commercial_id: body.commercial_id || user.id,
      issue_date: body.issue_date,
      due_date: body.due_date,
      currency: body.currency || "USD",
      exchange_rate: body.exchange_rate || null,
      subtotal: body.subtotal,
      tax_percentage: body.tax_percentage || 0,
      tax_amount: taxAmount,
      total_amount: body.total_amount,
      total_amount_cop: body.total_amount_cop || null,
      payment_status: body.payment_status || "pendiente",
      payment_method: body.payment_method || null,
      payment_date: body.payment_date || null,
      payment_reference: body.payment_reference || null,
      partial_payments: body.partial_payments || null,
      items: body.items || null,
      incoterm: body.incoterm || null,
      port_of_origin: body.port_of_origin || null,
      port_of_destination: body.port_of_destination || null,
      vessel_id: body.vessel_id || null,
      shipping_id: body.shipping_id || null,
      payment_conditions: body.payment_conditions || null,
      bank_details: body.bank_details || null,
      document_url: body.document_url || null,
      status_history: statusHistory,
      is_active: true,
      notes: body.notes || null,
      created_by: user.id,
      updated_by: user.id,
    };

    // Insert invoice
    const { data: newInvoice, error: insertError } = await supabase
      .from("invoices")
      .insert(invoiceData)
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting invoice:", insertError);
      return NextResponse.json(
        { error: "Error al crear la factura" },
        { status: 500 }
      );
    }

    // Increment the next number in system_config
    await serviceSupabase
      .from("system_config")
      .update({ invoice_next_number: nextNumber + 1 })
      .eq("id", config.invoice_prefix ? (config as Record<string, unknown>).id || undefined : undefined)
      .single();

    // Fallback: update using a broader match if the above doesn't work
    await serviceSupabase
      .from("system_config")
      .update({ invoice_next_number: nextNumber + 1 })
      .not("id", "is", null);

    // Insert audit log
    const auditLog: InsertAuditLog = {
      user_id: user.id,
      user_name: profile.full_name,
      user_role: profile.role,
      action: "create",
      table_name: "invoices",
      record_id: newInvoice.id,
      old_values: null,
      new_values: newInvoice as unknown as Record<string, unknown>,
      ip_address: request.headers.get("x-forwarded-for") || null,
    };

    await supabase.from("audit_logs").insert(auditLog);

    return NextResponse.json({ data: newInvoice }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/invoices:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH /api/invoices
// Update an existing invoice.
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
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Perfil no encontrado" },
        { status: 404 }
      );
    }

    if (profile.role === "comercial") {
      return NextResponse.json(
        { error: "No tiene permisos para actualizar facturas" },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "El ID de la factura es requerido" },
        { status: 400 }
      );
    }

    // Get current invoice
    const { data: currentInvoice, error: fetchError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", body.id)
      .single();

    if (fetchError || !currentInvoice) {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      ...body,
      updated_by: user.id,
    };

    // If payment_status changed, append to status_history
    if (
      body.payment_status &&
      body.payment_status !== currentInvoice.payment_status
    ) {
      const existingHistory: StatusHistoryEntry[] =
        (currentInvoice.status_history as StatusHistoryEntry[]) || [];
      const newEntry: StatusHistoryEntry = {
        status: body.payment_status,
        date: new Date().toISOString(),
        user_id: user.id,
        user_name: profile.full_name,
        notes: body.status_change_notes || `Estado cambiado a ${body.payment_status}`,
      };
      updateData.status_history = [...existingHistory, newEntry];
    }

    // Handle partial payments - append new payment to existing array
    if (body.new_partial_payment) {
      const existingPayments: PartialPayment[] =
        (currentInvoice.partial_payments as PartialPayment[]) || [];
      const newPayment: PartialPayment = body.new_partial_payment;
      updateData.partial_payments = [...existingPayments, newPayment];

      // Calculate total paid
      const totalPaid = [...existingPayments, newPayment].reduce(
        (sum, p) => sum + (p.amount || 0),
        0
      );

      // Determine new payment status
      if (totalPaid >= currentInvoice.total_amount) {
        updateData.payment_status = "pagada";
        updateData.payment_date = new Date().toISOString().split("T")[0];
      } else if (totalPaid > 0) {
        updateData.payment_status = "parcial";
      }

      // Also update status_history for the payment status change
      if (updateData.payment_status !== currentInvoice.payment_status) {
        const existingHistory: StatusHistoryEntry[] =
          (updateData.status_history as StatusHistoryEntry[]) ||
          (currentInvoice.status_history as StatusHistoryEntry[]) ||
          [];
        const paymentEntry: StatusHistoryEntry = {
          status: updateData.payment_status as string,
          date: new Date().toISOString(),
          user_id: user.id,
          user_name: profile.full_name,
          notes: `Pago registrado: ${newPayment.amount} - Ref: ${newPayment.reference || "N/A"}`,
        };
        updateData.status_history = [...existingHistory, paymentEntry];
      }

      // Remove the helper field before updating
      delete updateData.new_partial_payment;
    }

    // Remove fields that shouldn't be sent to the update
    delete updateData.status_change_notes;

    // Update invoice
    const { data: updatedInvoice, error: updateError } = await supabase
      .from("invoices")
      .update(updateData)
      .eq("id", body.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating invoice:", updateError);
      return NextResponse.json(
        { error: "Error al actualizar la factura" },
        { status: 500 }
      );
    }

    // Insert audit log
    const auditLog: InsertAuditLog = {
      user_id: user.id,
      user_name: profile.full_name,
      user_role: profile.role,
      action: body.payment_status !== currentInvoice.payment_status ? "status_change" : "update",
      table_name: "invoices",
      record_id: body.id,
      old_values: currentInvoice as unknown as Record<string, unknown>,
      new_values: updatedInvoice as unknown as Record<string, unknown>,
      ip_address: request.headers.get("x-forwarded-for") || null,
    };

    await supabase.from("audit_logs").insert(auditLog);

    return NextResponse.json({ data: updatedInvoice });
  } catch (error) {
    console.error("Unexpected error in PATCH /api/invoices:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
