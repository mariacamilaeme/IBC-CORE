import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizePostgrestValue } from "@/lib/utils";

// =====================================================
// GET /api/contracts
// Fetch active contracts with optional filters.
// Supports: search, status, country, product_type,
//   commercial_name, page, pageSize
// Ordered by created_at DESC with pagination.
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

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Perfil de usuario no encontrado" },
        { status: 403 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const country = searchParams.get("country") || "";
    const productType = searchParams.get("product_type") || "";
    const commercialName = searchParams.get("commercial_name") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20", 10), 200);
    const sortField = searchParams.get("sort_field") || "contract_date";
    const sortDirection = searchParams.get("sort_direction") || "desc";

    // Allowed sort fields to prevent injection
    const allowedSortFields: Record<string, string> = {
      contract_date: "contract_date",
      china_contract: "china_contract",
      client_contract: "client_contract",
      commercial_name: "commercial_name",
      client_name: "client_name",
      detail: "detail",
      tons_agreed: "tons_agreed",
      incoterm: "incoterm",
      status: "status",
      eta_final: "eta_final",
      pending_client_amount: "pending_client_amount",
      created_at: "created_at",
    };

    const resolvedSort = allowedSortFields[sortField] || "contract_date";
    const ascending = sortDirection === "asc";

    // Build query
    let query = supabase
      .from("contracts")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .order(resolvedSort, { ascending, nullsFirst: false });

    // Apply optional filters
    if (search) {
      const s = sanitizePostgrestValue(search);
      query = query.or(
        `commercial_name.ilike.%${s}%,client_name.ilike.%${s}%,china_contract.ilike.%${s}%,client_contract.ilike.%${s}%,detail.ilike.%${s}%,vessel_name.ilike.%${s}%,bl_number.ilike.%${s}%`
      );
    }

    // --- Multi-value aware filters (comma-separated) ---
    // Helper to split comma-separated param into array
    const toList = (val: string) => val.split(",").map((s) => s.trim()).filter(Boolean);

    // Status filter (supports comma-separated multi-values)
    if (status) {
      const statusList = toList(status);
      if (statusList.length === 1) {
        query = query.eq("status", statusList[0]);
      } else if (statusList.length > 1) {
        query = query.in("status", statusList);
      }
    }

    // Commercial name filter
    if (commercialName) {
      const list = toList(commercialName);
      if (list.length === 1) {
        query = query.ilike("commercial_name", `%${list[0]}%`);
      } else if (list.length > 1) {
        query = query.in("commercial_name", list);
      }
    }

    // Client name filter
    const clientName = searchParams.get("client_name") || "";
    if (clientName) {
      const list = toList(clientName);
      if (list.length === 1) {
        query = query.ilike("client_name", `%${list[0]}%`);
      } else if (list.length > 1) {
        query = query.in("client_name", list);
      }
    }

    // Incoterm filter
    const incoterm = searchParams.get("incoterm") || "";
    if (incoterm) {
      const list = toList(incoterm);
      if (list.length === 1) {
        query = query.eq("incoterm", list[0]);
      } else if (list.length > 1) {
        query = query.in("incoterm", list);
      }
    }

    // Balance paid filter
    const balancePaid = searchParams.get("balance_paid") || "";
    if (balancePaid) {
      const list = toList(balancePaid);
      if (list.length === 1) {
        query = query.ilike("balance_paid", `%${list[0]}%`);
      } else if (list.length > 1) {
        query = query.in("balance_paid", list);
      }
      // When filtering PENDIENTE, only include contracts that actually have
      // a pending_client_amount > 0 (exclude those not yet invoiced)
      if (list.includes("PENDIENTE")) {
        query = query.not("pending_client_amount", "is", null).gt("pending_client_amount", 0);
      }
    }

    // Vessel name (motonave) filter
    const vesselName = searchParams.get("vessel_name") || "";
    if (vesselName) {
      const list = toList(vesselName);
      if (list.length === 1) {
        query = query.ilike("vessel_name", `%${list[0]}%`);
      } else if (list.length > 1) {
        query = query.in("vessel_name", list);
      }
    }

    // Arrival port filter
    const arrivalPort = searchParams.get("arrival_port") || "";
    if (arrivalPort) {
      const list = toList(arrivalPort);
      if (list.length === 1) {
        query = query.ilike("arrival_port", `%${list[0]}%`);
      } else if (list.length > 1) {
        query = query.in("arrival_port", list);
      }
    }

    // BL released filter
    const blReleased = searchParams.get("bl_released") || "";
    if (blReleased) {
      const list = toList(blReleased);
      if (list.length === 1) {
        query = query.eq("bl_released", list[0]);
      } else if (list.length > 1) {
        query = query.in("bl_released", list);
      }
    }

    // Country filter (kept for backwards compat)
    if (country) {
      query = query.ilike("country", `%${country}%`);
    }

    // Product type filter (supports comma-separated)
    if (productType) {
      const list = toList(productType);
      if (list.length === 1) {
        query = query.eq("product_type", list[0]);
      } else if (list.length > 1) {
        query = query.in("product_type", list);
      }
    }

    // Product type "sin definir" - filter contracts with NULL/empty product_type
    const productTypeUndefined = searchParams.get("product_type_undefined") || "";
    if (productTypeUndefined === "true") {
      query = query.or("product_type.is.null,product_type.eq.");
    }

    // ETA Final filter (comma-separated dates)
    const etaFinal = searchParams.get("eta_final") || "";
    if (etaFinal) {
      const list = toList(etaFinal);
      if (list.length === 1) {
        query = query.eq("eta_final", list[0]);
      } else if (list.length > 1) {
        query = query.in("eta_final", list);
      }
    }

    // Date range filter on contract_date
    const dateFrom = searchParams.get("date_from") || "";
    const dateTo = searchParams.get("date_to") || "";

    if (dateFrom) {
      query = query.gte("contract_date", dateFrom);
    }
    if (dateTo) {
      query = query.lte("contract_date", dateTo);
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching contracts:", error);
      return NextResponse.json(
        { error: "Error al obtener los contratos" },
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
    console.error("Unexpected error in GET /api/contracts:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/contracts
// Create a new contract.
// Required: commercial_name, client_name.
// Inserts audit_log entry.
// =====================================================
export async function POST(request: NextRequest) {
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

    // Get user profile for audit log
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Perfil de usuario no encontrado" },
        { status: 403 }
      );
    }

    // Role check: comercial users cannot create contracts
    if (profile.role === "comercial") {
      return NextResponse.json(
        { error: "No tiene permisos para realizar esta acción" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.commercial_name || body.commercial_name.trim() === "") {
      return NextResponse.json(
        { error: "El nombre comercial es obligatorio" },
        { status: 400 }
      );
    }

    if (!body.client_name || body.client_name.trim() === "") {
      return NextResponse.json(
        { error: "El nombre del cliente es obligatorio" },
        { status: 400 }
      );
    }

    // Prepare contract data
    const contractData = {
      commercial_name: body.commercial_name.trim(),
      client_name: body.client_name.trim(),
      client_contract: body.client_contract?.trim() || null,
      china_contract: body.china_contract?.trim() || null,
      contract_date: body.contract_date || null,
      issue_month: body.issue_month?.trim() || null,
      country: body.country?.trim() || null,
      incoterm: body.incoterm?.trim() || null,
      detail: body.detail?.trim() || null,
      tons_agreed: body.tons_agreed != null ? Number(body.tons_agreed) : null,
      advance_paid: body.advance_paid?.trim() || null,
      balance_paid: body.balance_paid?.trim() || null,
      status: body.status?.trim() || null,
      notes: body.notes?.trim() || null,
      production_time_days: body.production_time_days != null ? Number(body.production_time_days) : null,
      advance_payment_date: body.advance_payment_date || null,
      delivery_date_pcc: body.delivery_date_pcc || null,
      exw_date: body.exw_date || null,
      etd: body.etd || null,
      eta_initial: body.eta_initial || null,
      eta_final: body.eta_final || null,
      days_difference: body.days_difference != null ? Number(body.days_difference) : null,
      delivery_month: body.delivery_month?.trim() || null,
      delivery_year: body.delivery_year?.trim() || null,
      exw_compliance: body.exw_compliance?.trim() || null,
      vessel_name: body.vessel_name?.trim() || null,
      shipping_company: body.shipping_company?.trim() || null,
      bl_number: body.bl_number?.trim() || null,
      arrival_port: body.arrival_port?.trim() || null,
      shipment_type: body.shipment_type?.trim() || null,
      tons_shipped: body.tons_shipped != null ? Number(body.tons_shipped) : null,
      tons_difference: body.tons_difference != null ? Number(body.tons_difference) : null,
      tons_compliance: body.tons_compliance?.trim() || null,
      bl_released: body.bl_released ?? null,
      documents_sent: body.documents_sent ?? null,
      documents_pending: body.documents_pending?.trim() || null,
      physical_docs_sent: body.physical_docs_sent ?? null,
      pending_client_amount: body.pending_client_amount != null ? Number(body.pending_client_amount) : null,
      product_type: body.product_type?.trim() || null,
      is_active: true,
    };

    // Insert contract
    const { data: newContract, error: insertError } = await supabase
      .from("contracts")
      .insert(contractData)
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting contract:", insertError);
      return NextResponse.json(
        { error: "Error al crear el contrato" },
        { status: 500 }
      );
    }

    // Insert audit log entry
    const auditEntry = {
      user_id: user.id,
      user_name: profile.full_name,
      user_role: profile.role,
      action: "create" as const,
      table_name: "contracts",
      record_id: newContract.id,
      old_values: null,
      new_values: contractData as unknown as Record<string, unknown>,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
    };

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert(auditEntry);

    if (auditError) {
      // Log but don't fail the request if audit logging fails
      console.error("Error inserting audit log:", auditError);
    }

    return NextResponse.json({ data: newContract }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/contracts:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH /api/contracts
// Update a contract. Only updates provided fields.
// Inserts audit_log entry.
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

    // Get user profile for audit log
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Perfil de usuario no encontrado" },
        { status: 403 }
      );
    }

    // Role check: comercial users cannot update contracts
    if (profile.role === "comercial") {
      return NextResponse.json(
        { error: "No tiene permisos para realizar esta acción" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "El ID del contrato es obligatorio" },
        { status: 400 }
      );
    }

    // Fetch existing contract for comparison
    const { data: existingContract, error: fetchError } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", body.id)
      .single();

    if (fetchError || !existingContract) {
      return NextResponse.json(
        { error: "Contrato no encontrado" },
        { status: 404 }
      );
    }

    // Build update data (only include provided fields)
    const updateData: Record<string, unknown> = {};

    const allowedFields = [
      "commercial_name",
      "client_name",
      "client_contract",
      "china_contract",
      "contract_date",
      "issue_month",
      "country",
      "incoterm",
      "detail",
      "tons_agreed",
      "advance_paid",
      "balance_paid",
      "status",
      "notes",
      "production_time_days",
      "advance_payment_date",
      "delivery_date_pcc",
      "exw_date",
      "etd",
      "eta_initial",
      "eta_final",
      "days_difference",
      "delivery_month",
      "delivery_year",
      "exw_compliance",
      "vessel_name",
      "shipping_company",
      "bl_number",
      "arrival_port",
      "shipment_type",
      "tons_shipped",
      "tons_difference",
      "tons_compliance",
      "bl_released",
      "documents_sent",
      "documents_pending",
      "physical_docs_sent",
      "pending_client_amount",
      "product_type",
      "is_active",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Convert empty date strings to null for Supabase date columns
    const dateFields = [
      "contract_date", "advance_payment_date", "delivery_date_pcc",
      "exw_date", "etd", "eta_initial", "eta_final",
    ];
    for (const df of dateFields) {
      if (df in updateData && (updateData[df] === "" || updateData[df] === undefined)) {
        updateData[df] = null;
      }
    }

    // Update contract
    const { data: updatedContract, error: updateError } = await supabase
      .from("contracts")
      .update(updateData)
      .eq("id", body.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating contract:", updateError);
      return NextResponse.json(
        { error: "Error al actualizar el contrato" },
        { status: 500 }
      );
    }

    // -------------------------------------------------------
    // ETA Propagation: when eta_final changes and the contract
    // has a vessel_name, propagate the new ETA to all other
    // contracts with the same vessel that are active
    // (status IN 'EN PRODUCCIÓN', 'EN TRÁNSITO').
    // -------------------------------------------------------
    let propagatedCount = 0;

    const etaChanged =
      body.eta_final !== undefined &&
      updatedContract.vessel_name &&
      updatedContract.vessel_name.trim() !== "" &&
      updatedContract.eta_final !== (existingContract as Record<string, unknown>).eta_final;

    if (etaChanged) {
      const MONTH_NAMES = [
        "Enero","Febrero","Marzo","Abril","Mayo","Junio",
        "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
      ];

      // Build the propagation payload
      const propagationData: Record<string, unknown> = {
        eta_final: updatedContract.eta_final,
      };

      // Also compute delivery_month / delivery_year from the new ETA
      if (updatedContract.eta_final) {
        const parts = (updatedContract.eta_final as string).split("-");
        if (parts.length >= 2) {
          const monthIdx = parseInt(parts[1], 10) - 1;
          propagationData.delivery_month = MONTH_NAMES[monthIdx] || "";
          propagationData.delivery_year = parts[0];
        }
      } else {
        propagationData.delivery_month = null;
        propagationData.delivery_year = null;
      }

      const { data: propagated, error: propError } = await supabase
        .from("contracts")
        .update(propagationData)
        .eq("vessel_name", updatedContract.vessel_name)
        .neq("id", body.id)
        .in("status", ["EN PRODUCCIÓN", "EN TRÁNSITO"])
        .select("id");

      if (propError) {
        console.error("Error propagating ETA to other contracts:", propError);
      } else {
        propagatedCount = propagated?.length || 0;
      }
    }

    // Insert audit log entry
    const auditEntry = {
      user_id: user.id,
      user_name: profile.full_name,
      user_role: profile.role,
      action: "update" as const,
      table_name: "contracts",
      record_id: body.id,
      old_values: existingContract as unknown as Record<string, unknown>,
      new_values: updateData as unknown as Record<string, unknown>,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
    };

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert(auditEntry);

    if (auditError) {
      // Log but don't fail the request if audit logging fails
      console.error("Error inserting audit log:", auditError);
    }

    return NextResponse.json({
      data: updatedContract,
      propagatedCount,
    });
  } catch (error) {
    console.error("Unexpected error in PATCH /api/contracts:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// =====================================================
// PUT /api/contracts
// Bulk operations: rename commercial across all contracts.
// Body: { action: "rename_commercial", oldName: string, newName: string }
// =====================================================
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Perfil de usuario no encontrado" },
        { status: 403 }
      );
    }

    // Role check: only admin and directora can perform bulk operations
    if (profile.role !== "admin" && profile.role !== "directora") {
      return NextResponse.json(
        { error: "No tiene permisos para realizar esta acción" },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (body.action === "rename_commercial") {
      const { oldName, newName } = body;
      if (!oldName || !newName || oldName === newName) {
        return NextResponse.json(
          { error: "Nombres inválidos" },
          { status: 400 }
        );
      }

      const { data: updated, error } = await supabase
        .from("contracts")
        .update({ commercial_name: newName })
        .eq("commercial_name", oldName)
        .select("id");

      if (error) {
        console.error("Error renaming commercial in contracts:", error);
        return NextResponse.json(
          { error: "Error al renombrar comercial" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        updated: updated?.length || 0,
      });
    }

    return NextResponse.json(
      { error: "Acción no reconocida" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Unexpected error in PUT /api/contracts:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
