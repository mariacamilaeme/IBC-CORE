import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import crypto from "crypto";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado", status: 401 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Acceso denegado", status: 403 };
  }

  return { user, profile, supabase };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const serviceClient = await createServiceClient();

  const { data, error } = await serviceClient
    .from("invitations")
    .select(`
      *,
      role:roles!role_id (name, display_name),
      invited_by_profile:profiles!invited_by (full_name, email)
    `)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) { console.error("Admin invitations error:", error); return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 }); }
  const res = NextResponse.json({ data });
  res.headers.set("Cache-Control", "private, max-age=30");
  return res;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const serviceClient = await createServiceClient();
  const body = await request.json();
  const { email, name, role_id } = body;

  if (!email || !role_id) {
    return NextResponse.json({ error: "Email y rol son requeridos" }, { status: 400 });
  }

  // Check if user already exists
  const { data: existingProfile } = await serviceClient
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (existingProfile) {
    return NextResponse.json({ error: "Ya existe un usuario con este email" }, { status: 400 });
  }

  // Check if there's a pending invitation for this email
  const { data: existingInvite } = await serviceClient
    .from("invitations")
    .select("id")
    .eq("email", email)
    .eq("status", "pending")
    .single();

  if (existingInvite) {
    return NextResponse.json({ error: "Ya existe una invitación pendiente para este email" }, { status: 400 });
  }

  // Get role name for metadata
  const { data: role } = await serviceClient
    .from("roles")
    .select("name")
    .eq("id", role_id)
    .single();

  if (!role) {
    return NextResponse.json({ error: "Rol no encontrado" }, { status: 404 });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours

  // Create invitation record
  const { data: invitation, error: invError } = await serviceClient
    .from("invitations")
    .insert({
      email,
      name: name || null,
      role_id,
      token,
      status: "pending",
      expires_at: expiresAt,
      invited_by: auth.user.id,
    })
    .select()
    .single();

  if (invError) { console.error("Admin invitations error:", invError); return NextResponse.json({ error: "Error al crear invitación" }, { status: 500 }); }

  // Use Supabase Auth to invite the user
  const { error: authError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: name || email,
      role: role.name,
      invitation_token: token,
    },
  });

  if (authError) {
    // If auth invite fails, still keep the invitation record but mark the error
    return NextResponse.json({
      data: invitation,
      warning: `Invitación creada pero hubo un error al enviar el email: ${authError.message}. El usuario puede usar el token directamente.`,
    }, { status: 201 });
  }

  return NextResponse.json({ data: invitation }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const serviceClient = await createServiceClient();
  const body = await request.json();
  const { id, action } = body;

  if (!id) return NextResponse.json({ error: "ID de invitación requerido" }, { status: 400 });

  if (action === "resend") {
    const { data: invitation } = await serviceClient
      .from("invitations")
      .select("*, role:roles!role_id (name)")
      .eq("id", id)
      .single();

    if (!invitation) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    // Generate new token and extend expiration
    const newToken = crypto.randomBytes(32).toString("hex");
    const newExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    await serviceClient
      .from("invitations")
      .update({ token: newToken, expires_at: newExpiry, status: "pending" })
      .eq("id", id);

    // Resend via Supabase Auth
    await serviceClient.auth.admin.inviteUserByEmail(invitation.email, {
      data: {
        full_name: invitation.name || invitation.email,
        role: invitation.role?.name || "comercial",
        invitation_token: newToken,
      },
    });

    return NextResponse.json({ message: "Invitación reenviada" });
  }

  if (action === "cancel") {
    const { error } = await serviceClient
      .from("invitations")
      .update({ status: "cancelled" })
      .eq("id", id);

    if (error) { console.error("Admin invitations error:", error); return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 }); }
    return NextResponse.json({ message: "Invitación cancelada" });
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}
