"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn, formatDate, formatRelativeDate, ROLE_LABELS } from "@/lib/utils";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import {
  User, KeyRound, Building2, FileText, Save, Shield, Users,
  Mail, Search, MoreHorizontal, Ban, Unlock, UserCog, RotateCcw,
  Trash2, Plus, Pencil, Check, X, Upload, Camera, Eye, EyeOff,
  Home, ChevronRight, Clock, CheckCircle2, XCircle, AlertTriangle,
  Send, RefreshCw,
} from "lucide-react";

import type {
  SystemConfig, Role, Permission, ModuleName,
  ProfileWithRole, InvitationWithRelations, InvitationStatus,
} from "@/types";

// ─── DESIGN TOKENS ───────────────────────────────────────────
import { T } from "@/lib/design-tokens";

// ─── MODULE LABELS ───────────────────────────────────────────
const MODULE_LABELS: Record<ModuleName, string> = {
  dashboard: "Dashboard",
  contracts: "Contratos",
  clients: "Clientes",
  quotations: "Cotizaciones",
  invoices: "Facturas",
  packing_lists: "Packing Lists",
  packing_list_converter: "Conversor PL",
  shipments: "Embarques",
  payments: "Pagos",
  reports: "Reportes",
  calendar: "Calendario",
  settings: "Configuraci\u00f3n",
  wiki: "Wiki",
};

const ALL_MODULES: ModuleName[] = [
  "dashboard", "contracts", "clients", "quotations", "invoices",
  "packing_lists", "packing_list_converter", "shipments", "payments",
  "reports", "calendar", "settings", "wiki",
];

// ─── INVITATION STATUS CONFIG ────────────────────────────────
const INVITATION_STATUS_CONFIG: Record<InvitationStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pendiente", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  accepted: { label: "Aceptada", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  expired: { label: "Expirada", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  cancelled: { label: "Cancelada", color: "text-gray-600", bg: "bg-gray-50 border-gray-200" },
};

// ─── HELPER: initials from name ──────────────────────────────
function getInitials(name: string | null | undefined): string {
  if (!name) return "??";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// ─── MAIN COMPONENT ─────────────────────────────────────────
export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Global state ──
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  // ── Profile tab ──
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // ── Security tab ──
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ── Users tab (admin) ──
  const [users, setUsers] = useState<ProfileWithRole[]>([]);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersRoleFilter, setUsersRoleFilter] = useState("all");
  const [usersStatusFilter, setUsersStatusFilter] = useState("all");
  const [usersLoading, setUsersLoading] = useState(false);
  const [changeRoleDialog, setChangeRoleDialog] = useState<{ open: boolean; userId: string; currentRole: string; currentRoleId: string | null }>({ open: false, userId: "", currentRole: "", currentRoleId: null });
  const [selectedNewRole, setSelectedNewRole] = useState("");
  const [deactivateDialog, setDeactivateDialog] = useState<{ open: boolean; userId: string; userName: string }>({ open: false, userId: "", userName: "" });

  // ── Roles & Permissions tab (admin) ──
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsSaving, setPermissionsSaving] = useState(false);
  const [roleDialog, setRoleDialog] = useState<{ open: boolean; mode: "create" | "edit"; role?: Role }>({ open: false, mode: "create" });
  const [roleForm, setRoleForm] = useState({ name: "", display_name: "", description: "" });
  const [deleteRoleDialog, setDeleteRoleDialog] = useState<{ open: boolean; role?: Role }>({ open: false });

  // ── Invitations tab (admin) ──
  const [invitations, setInvitations] = useState<InvitationWithRelations[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", name: "", role_id: "" });
  const [inviteSending, setInviteSending] = useState(false);

  const isAdmin = profile?.role === "admin";
  const isAdminOrDirectora = profile?.role === "admin" || profile?.role === "directora";

  // ── Load initial data ──
  useEffect(() => {
    if (!profile) return;
    loadData();
  }, [profile]);

  const loadData = async () => {
    try {
      const { data: configData } = await supabase
        .from("system_config")
        .select("*")
        .single();
      setConfig(configData);

      if (profile) {
        setFullName(profile.full_name || "");
        setPhone(profile.phone || "");
        setPosition(profile.position || "");
        setAvatarUrl(profile.avatar_url || null);
      }
    } catch {
      toast.error("Error al cargar configuraci\u00f3n");
    } finally {
      setLoading(false);
    }
  };

  // ── Load admin data on tab change ──
  useEffect(() => {
    if (activeTab === "users" && isAdmin && users.length === 0) {
      loadUsers();
    }
    if (activeTab === "roles" && isAdmin && roles.length === 0) {
      loadRoles();
    }
    if (activeTab === "invitations" && isAdmin && invitations.length === 0) {
      loadInvitations();
    }
  }, [activeTab, isAdmin]);

  // ── Guard admin tabs ──
  useEffect(() => {
    if (!profile) return;
    if ((activeTab === "users" || activeTab === "roles" || activeTab === "invitations") && !isAdmin) {
      toast.error("No tienes permisos para acceder a esta secci\u00f3n");
      router.push("/");
    }
    if ((activeTab === "company" || activeTab === "documents") && !isAdminOrDirectora) {
      toast.error("No tienes permisos para acceder a esta secci\u00f3n");
      router.push("/");
    }
  }, [activeTab, profile]);

  // ═══════════════════════════════════════════════════════════
  // PROFILE HANDLERS
  // ═══════════════════════════════════════════════════════════

  const uploadAvatar = async (file: File) => {
    if (!user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten archivos de imagen");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("El archivo no puede superar los 2 MB");
      return;
    }

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/avatar", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Error al subir la imagen");
      }

      setAvatarUrl(result.url);
      await refreshProfile();
      toast.success("Foto de perfil actualizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir la imagen");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAvatar(file);
  };

  const handleAvatarDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadAvatar(file);
  };

  const handleSaveProfile = async () => {
    if (!profile?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, phone, position })
        .eq("id", profile.id);

      if (error) throw error;
      await refreshProfile();
      toast.success("Perfil actualizado correctamente");
    } catch {
      toast.error("Error al actualizar perfil");
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // SECURITY HANDLERS
  // ═══════════════════════════════════════════════════════════

  const passwordChecks = useMemo(() => ({
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
  }), [newPassword]);

  const allPasswordChecksPassed = passwordChecks.length && passwordChecks.uppercase && passwordChecks.number && passwordChecks.special;

  const handleChangePassword = async () => {
    if (!allPasswordChecksPassed) {
      toast.error("La contrase\u00f1a no cumple todos los requisitos");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Las contrase\u00f1as no coinciden");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Contrase\u00f1a actualizada correctamente");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Error al cambiar contrase\u00f1a");
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // COMPANY / DOCUMENTS HANDLERS
  // ═══════════════════════════════════════════════════════════

  const handleSaveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("system_config")
        .update({
          company_name: config.company_name,
          company_tax_id: config.company_tax_id,
          company_address: config.company_address,
          company_city: config.company_city,
          company_country: config.company_country,
          company_phone: config.company_phone,
          company_email: config.company_email,
          default_currency: config.default_currency,
          exchange_rate_usd_cop: config.exchange_rate_usd_cop,
          invoice_prefix: config.invoice_prefix,
          quotation_prefix: config.quotation_prefix,
          packing_list_prefix: config.packing_list_prefix,
          shipment_prefix: config.shipment_prefix,
        })
        .eq("id", config.id);

      if (error) throw error;
      toast.success("Configuraci\u00f3n guardada correctamente");
    } catch {
      toast.error("Error al guardar configuraci\u00f3n");
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // USERS HANDLERS (admin)
  // ═══════════════════════════════════════════════════════════

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setUsers(json.data || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al cargar usuarios");
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUserAction = async (id: string, action: string, extraData?: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, ...extraData }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(json.message);
      await loadUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al realizar la acci\u00f3n");
    }
  };

  const handleChangeRole = async () => {
    if (!selectedNewRole || !changeRoleDialog.userId) return;
    const role = roles.find((r) => r.id === selectedNewRole);
    if (!role) return;
    await handleUserAction(changeRoleDialog.userId, "change_role", {
      role: role.name,
      role_id: role.id,
    });
    setChangeRoleDialog({ open: false, userId: "", currentRole: "", currentRoleId: null });
    setSelectedNewRole("");
  };

  const handleDeactivateUser = async () => {
    if (!deactivateDialog.userId) return;
    await handleUserAction(deactivateDialog.userId, "soft_delete");
    setDeactivateDialog({ open: false, userId: "", userName: "" });
  };

  const filteredUsers = useMemo(() => {
    let result = users;
    if (usersSearch) {
      const q = usersSearch.toLowerCase();
      result = result.filter(
        (u) =>
          (u.full_name || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q)
      );
    }
    if (usersRoleFilter !== "all") {
      result = result.filter((u) => u.role === usersRoleFilter);
    }
    if (usersStatusFilter !== "all") {
      result = result.filter((u) =>
        usersStatusFilter === "active" ? u.is_active !== false : u.is_active === false
      );
    }
    return result;
  }, [users, usersSearch, usersRoleFilter, usersStatusFilter]);

  // ═══════════════════════════════════════════════════════════
  // ROLES & PERMISSIONS HANDLERS (admin)
  // ═══════════════════════════════════════════════════════════

  const loadRoles = async () => {
    setRolesLoading(true);
    try {
      const res = await fetch("/api/admin/roles");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setRoles(json.data || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al cargar roles");
    } finally {
      setRolesLoading(false);
    }
  };

  const loadPermissions = useCallback(async (roleId: string) => {
    setPermissionsLoading(true);
    try {
      const res = await fetch(`/api/admin/permissions?role_id=${roleId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const existing: Permission[] = json.data || [];
      // Fill in missing modules with defaults
      const permsMap = new Map(existing.map((p) => [p.module, p]));
      const full = ALL_MODULES.map((mod) =>
        permsMap.get(mod) || {
          role_id: roleId,
          module: mod,
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
        }
      );
      setPermissions(full);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al cargar permisos");
    } finally {
      setPermissionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRoleId) {
      loadPermissions(selectedRoleId);
    }
  }, [selectedRoleId, loadPermissions]);

  const handleSavePermissions = async () => {
    if (!selectedRoleId) return;
    setPermissionsSaving(true);
    try {
      const res = await fetch("/api/admin/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role_id: selectedRoleId,
          permissions: permissions.map((p) => ({
            module: p.module,
            can_view: p.can_view,
            can_create: p.can_create,
            can_edit: p.can_edit,
            can_delete: p.can_delete,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Permisos actualizados correctamente");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al guardar permisos");
    } finally {
      setPermissionsSaving(false);
    }
  };

  const togglePermission = (module: ModuleName, field: "can_view" | "can_create" | "can_edit" | "can_delete") => {
    setPermissions((prev) =>
      prev.map((p) =>
        p.module === module ? { ...p, [field]: !p[field] } : p
      )
    );
  };

  const handleCreateRole = async () => {
    if (!roleForm.name || !roleForm.display_name) {
      toast.error("Nombre y nombre de visualizaci\u00f3n son requeridos");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roleForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Rol creado correctamente");
      setRoleDialog({ open: false, mode: "create" });
      setRoleForm({ name: "", display_name: "", description: "" });
      await loadRoles();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al crear rol");
    } finally {
      setSaving(false);
    }
  };

  const handleEditRole = async () => {
    if (!roleDialog.role?.id) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: roleDialog.role.id,
          display_name: roleForm.display_name,
          description: roleForm.description,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Rol actualizado correctamente");
      setRoleDialog({ open: false, mode: "create" });
      setRoleForm({ name: "", display_name: "", description: "" });
      await loadRoles();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar rol");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteRoleDialog.role?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/roles?id=${deleteRoleDialog.role.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Rol eliminado correctamente");
      setDeleteRoleDialog({ open: false });
      if (selectedRoleId === deleteRoleDialog.role.id) {
        setSelectedRoleId(null);
        setPermissions([]);
      }
      await loadRoles();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar rol");
    } finally {
      setSaving(false);
    }
  };

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const isSelectedRoleAdmin = selectedRole?.name === "admin";

  // ═══════════════════════════════════════════════════════════
  // INVITATIONS HANDLERS (admin)
  // ═══════════════════════════════════════════════════════════

  const loadInvitations = async () => {
    setInvitationsLoading(true);
    try {
      const res = await fetch("/api/admin/invitations");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setInvitations(json.data || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al cargar invitaciones");
    } finally {
      setInvitationsLoading(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!inviteForm.email || !inviteForm.role_id) {
      toast.error("Email y rol son requeridos");
      return;
    }
    setInviteSending(true);
    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (json.warning) {
        toast.warning(json.warning);
      } else {
        toast.success("Invitaci\u00f3n enviada correctamente");
      }
      setInviteForm({ email: "", name: "", role_id: "" });
      await loadInvitations();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al enviar invitaci\u00f3n");
    } finally {
      setInviteSending(false);
    }
  };

  const handleInvitationAction = async (id: string, action: "resend" | "cancel") => {
    try {
      const res = await fetch("/api/admin/invitations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(json.message);
      await loadInvitations();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al procesar invitaci\u00f3n");
    }
  };

  // ═══════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1E3A5F] border-t-transparent" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="space-y-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* ── Breadcrumb ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 12.5, color: T.inkLight }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 4, color: T.accent, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>
          <Home size={14} />
          Inicio
        </Link>
        <span style={{ color: T.inkGhost }}>/</span>
        <span style={{ fontWeight: 600, color: T.inkMuted }}>Configuraci&oacute;n</span>
      </div>

      {/* ── Page title ── */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: T.ink }}>Configuraci&oacute;n</h1>
        <p className="text-sm mt-1" style={{ color: T.inkMuted }}>
          Administra tu perfil y la configuraci&oacute;n del sistema
        </p>
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white/80 border border-[#E8E6E1] flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="profile" className="gap-2 data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-white">
            <User className="h-4 w-4" />
            Mi Perfil
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-white">
            <KeyRound className="h-4 w-4" />
            Seguridad
          </TabsTrigger>
          {isAdminOrDirectora && (
            <>
              <TabsTrigger value="company" className="gap-2 data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-white">
                <Building2 className="h-4 w-4" />
                Empresa
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-2 data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-white">
                <FileText className="h-4 w-4" />
                Documentos
              </TabsTrigger>
            </>
          )}
          {isAdmin && (
            <>
              <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-white">
                <Users className="h-4 w-4" />
                Usuarios
              </TabsTrigger>
              <TabsTrigger value="roles" className="gap-2 data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-white">
                <Shield className="h-4 w-4" />
                Roles y Permisos
              </TabsTrigger>
              <TabsTrigger value="invitations" className="gap-2 data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-white">
                <Mail className="h-4 w-4" />
                Invitaciones
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* ═══════════════════════════════════════════════════
            TAB 1: MI PERFIL
        ═══════════════════════════════════════════════════ */}
        <TabsContent value="profile">
          <Card className="rounded-xl border-[#E8E6E1]" style={{ boxShadow: T.shadow }}>
            <CardHeader>
              <CardTitle style={{ color: T.ink }}>Informaci&oacute;n Personal</CardTitle>
              <CardDescription>Actualiza tu informaci&oacute;n de perfil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div
                className={cn(
                  "flex items-center gap-6 p-4 rounded-xl border-2 border-dashed transition-all",
                  dragOver
                    ? "border-blue-400 bg-blue-50/50"
                    : "border-[#E8E6E1] bg-transparent"
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleAvatarDrop}
              >
                <div className="relative group">
                  <div
                    className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center text-white text-2xl font-bold cursor-pointer border-2 border-[#E8E6E1] transition-all"
                    style={{ backgroundColor: avatarUrl ? "transparent" : T.accent }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getInitials(fullName || profile?.full_name)
                    )}
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {avatarUploading ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                      ) : (
                        <Camera className="h-6 w-6 text-white" />
                      )}
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={avatarUploading}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: T.ink }}>Foto de perfil</p>
                  <p className="text-xs mt-1" style={{ color: T.inkMuted }}>
                    {dragOver ? "Suelta la imagen aquí" : "Haz clic o arrastra una imagen. Máx 2 MB. JPG, PNG, GIF o WebP."}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    {avatarUploading ? "Subiendo..." : "Subir imagen"}
                  </Button>
                </div>
              </div>

              <Separator className="bg-[#E8E6E1]" />

              {/* Form fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre completo</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tu nombre completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Correo electr&oacute;nico</Label>
                  <Input value={profile?.email || ""} disabled className="bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label>Tel&eacute;fono</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+57 300 000 0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="Tu cargo en la empresa"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <div className="flex items-center h-10">
                    <Badge
                      className="text-sm border"
                      style={{
                        backgroundColor: T.accentLight,
                        color: T.accent,
                        borderColor: `${T.accent}30`,
                      }}
                    >
                      {ROLE_LABELS[profile?.role || ""] || profile?.role}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator className="bg-[#E8E6E1]" />

              <Button onClick={handleSaveProfile} disabled={saving} className="bg-[#1E3A5F] hover:bg-[#2a4a73]">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════
            TAB 2: SEGURIDAD
        ═══════════════════════════════════════════════════ */}
        <TabsContent value="security">
          <Card className="rounded-xl border-[#E8E6E1]" style={{ boxShadow: T.shadow }}>
            <CardHeader>
              <CardTitle style={{ color: T.ink }}>Cambiar Contrase&ntilde;a</CardTitle>
              <CardDescription>Actualiza tu contrase&ntilde;a de acceso</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="max-w-lg space-y-4">
                <div className="space-y-2">
                  <Label>Nueva contrase&ntilde;a</Label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Ingresa tu nueva contrase\u00f1a"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Confirmar contrase&ntilde;a</Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite la contrase\u00f1a"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Password requirements checklist */}
                <div className="rounded-lg border p-4 space-y-2" style={{ borderColor: T.border, backgroundColor: T.surfaceAlt }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: T.inkSoft }}>
                    Requisitos de la contrase&ntilde;a:
                  </p>
                  {[
                    { key: "length" as const, label: "M\u00ednimo 8 caracteres" },
                    { key: "uppercase" as const, label: "Al menos 1 letra may\u00fascula" },
                    { key: "number" as const, label: "Al menos 1 n\u00famero" },
                    { key: "special" as const, label: "Al menos 1 car\u00e1cter especial (!@#$...)" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      {passwordChecks[key] ? (
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: T.success }} />
                      ) : (
                        <XCircle className="h-4 w-4 flex-shrink-0" style={{ color: newPassword.length > 0 ? T.danger : T.inkGhost }} />
                      )}
                      <span style={{ color: passwordChecks[key] ? T.success : T.inkMuted }}>{label}</span>
                    </div>
                  ))}
                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <div className="flex items-center gap-2 text-sm mt-2 pt-2 border-t" style={{ borderColor: T.border }}>
                      <XCircle className="h-4 w-4 flex-shrink-0" style={{ color: T.danger }} />
                      <span style={{ color: T.danger }}>Las contrase&ntilde;as no coinciden</span>
                    </div>
                  )}
                  {newPassword && confirmPassword && newPassword === confirmPassword && (
                    <div className="flex items-center gap-2 text-sm mt-2 pt-2 border-t" style={{ borderColor: T.border }}>
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: T.success }} />
                      <span style={{ color: T.success }}>Las contrase&ntilde;as coinciden</span>
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={saving || !allPasswordChecksPassed || newPassword !== confirmPassword}
                className="bg-[#1E3A5F] hover:bg-[#2a4a73]"
              >
                <KeyRound className="h-4 w-4 mr-2" />
                {saving ? "Actualizando..." : "Cambiar Contrase\u00f1a"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════
            TAB 3: EMPRESA
        ═══════════════════════════════════════════════════ */}
        {isAdminOrDirectora && (
          <TabsContent value="company">
            <Card className="rounded-xl border-[#E8E6E1]" style={{ boxShadow: T.shadow }}>
              <CardHeader>
                <CardTitle style={{ color: T.ink }}>Informaci&oacute;n de la Empresa</CardTitle>
                <CardDescription>Datos fiscales y de contacto de IBC Steel Group</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre de la empresa</Label>
                    <Input
                      value={config?.company_name || ""}
                      onChange={(e) => setConfig((prev) => prev ? { ...prev, company_name: e.target.value } : prev)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>NIT / Tax ID</Label>
                    <Input
                      value={config?.company_tax_id || ""}
                      onChange={(e) => setConfig((prev) => prev ? { ...prev, company_tax_id: e.target.value } : prev)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Direcci&oacute;n</Label>
                    <Input
                      value={config?.company_address || ""}
                      onChange={(e) => setConfig((prev) => prev ? { ...prev, company_address: e.target.value } : prev)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ciudad</Label>
                    <Input
                      value={config?.company_city || ""}
                      onChange={(e) => setConfig((prev) => prev ? { ...prev, company_city: e.target.value } : prev)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pa&iacute;s</Label>
                    <Input
                      value={config?.company_country || ""}
                      onChange={(e) => setConfig((prev) => prev ? { ...prev, company_country: e.target.value } : prev)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tel&eacute;fono</Label>
                    <Input
                      value={config?.company_phone || ""}
                      onChange={(e) => setConfig((prev) => prev ? { ...prev, company_phone: e.target.value } : prev)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Correo</Label>
                    <Input
                      value={config?.company_email || ""}
                      onChange={(e) => setConfig((prev) => prev ? { ...prev, company_email: e.target.value } : prev)}
                    />
                  </div>
                  <Separator className="md:col-span-2 bg-[#E8E6E1]" />
                  <div className="space-y-2">
                    <Label>Moneda predeterminada</Label>
                    <Input
                      value={config?.default_currency || "USD"}
                      onChange={(e) => setConfig((prev) => prev ? { ...prev, default_currency: e.target.value } : prev)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tasa de cambio USD/COP</Label>
                    <Input
                      type="number"
                      value={config?.exchange_rate_usd_cop || ""}
                      onChange={(e) => setConfig((prev) => prev ? { ...prev, exchange_rate_usd_cop: parseFloat(e.target.value) || 0 } : prev)}
                    />
                  </div>
                </div>
                <Separator className="bg-[#E8E6E1]" />
                <Button onClick={handleSaveConfig} disabled={saving} className="bg-[#1E3A5F] hover:bg-[#2a4a73]">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Guardando..." : "Guardar Configuraci\u00f3n"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ═══════════════════════════════════════════════════
            TAB 4: DOCUMENTOS
        ═══════════════════════════════════════════════════ */}
        {isAdminOrDirectora && (
          <TabsContent value="documents">
            <Card className="rounded-xl border-[#E8E6E1]" style={{ boxShadow: T.shadow }}>
              <CardHeader>
                <CardTitle style={{ color: T.ink }}>Prefijos y Consecutivos</CardTitle>
                <CardDescription>Configuraci&oacute;n de numeraci&oacute;n autom&aacute;tica de documentos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Prefijo Cotizaciones</Label>
                    <Input
                      value={config?.quotation_prefix || "COT-"}
                      onChange={(e) => setConfig((prev) => prev ? { ...prev, quotation_prefix: e.target.value } : prev)}
                    />
                    <p className="text-xs" style={{ color: T.inkMuted }}>Siguiente: {config?.quotation_next_number}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Prefijo Facturas</Label>
                    <Input
                      value={config?.invoice_prefix || "FAC-"}
                      onChange={(e) => setConfig((prev) => prev ? { ...prev, invoice_prefix: e.target.value } : prev)}
                    />
                    <p className="text-xs" style={{ color: T.inkMuted }}>Siguiente: {config?.invoice_next_number}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Prefijo Packing Lists</Label>
                    <Input
                      value={config?.packing_list_prefix || "PL-"}
                      onChange={(e) => setConfig((prev) => prev ? { ...prev, packing_list_prefix: e.target.value } : prev)}
                    />
                    <p className="text-xs" style={{ color: T.inkMuted }}>Siguiente: {config?.packing_list_next_number}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Prefijo Embarques</Label>
                    <Input
                      value={config?.shipment_prefix || "EMB-"}
                      onChange={(e) => setConfig((prev) => prev ? { ...prev, shipment_prefix: e.target.value } : prev)}
                    />
                    <p className="text-xs" style={{ color: T.inkMuted }}>Siguiente: {config?.shipment_next_number}</p>
                  </div>
                </div>
                <Separator className="bg-[#E8E6E1]" />
                <Button onClick={handleSaveConfig} disabled={saving} className="bg-[#1E3A5F] hover:bg-[#2a4a73]">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Guardando..." : "Guardar Configuraci\u00f3n"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ═══════════════════════════════════════════════════
            TAB 5: USUARIOS (admin only)
        ═══════════════════════════════════════════════════ */}
        {isAdmin && (
          <TabsContent value="users">
            <Card className="rounded-xl border-[#E8E6E1]" style={{ boxShadow: T.shadow }}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle style={{ color: T.ink }}>Gesti&oacute;n de Usuarios</CardTitle>
                    <CardDescription>Administra los usuarios del sistema</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadUsers}
                    disabled={usersLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${usersLoading ? "animate-spin" : ""}`} />
                    Actualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: T.inkLight }} />
                    <Input
                      placeholder="Buscar por nombre o email..."
                      value={usersSearch}
                      onChange={(e) => setUsersSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={usersRoleFilter} onValueChange={setUsersRoleFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los roles</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="directora">Directora</SelectItem>
                      <SelectItem value="analista">Analista</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={usersStatusFilter} onValueChange={setUsersStatusFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Activos</SelectItem>
                      <SelectItem value="blocked">Bloqueados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Users Table */}
                {usersLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#1E3A5F] border-t-transparent" />
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-hidden" style={{ borderColor: T.border }}>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#FAF9F7]">
                          <TableHead className="font-semibold" style={{ color: T.inkSoft }}>Usuario</TableHead>
                          <TableHead className="font-semibold" style={{ color: T.inkSoft }}>Email</TableHead>
                          <TableHead className="font-semibold" style={{ color: T.inkSoft }}>Rol</TableHead>
                          <TableHead className="font-semibold" style={{ color: T.inkSoft }}>Estado</TableHead>
                          <TableHead className="font-semibold" style={{ color: T.inkSoft }}>Registro</TableHead>
                          <TableHead className="font-semibold" style={{ color: T.inkSoft }}>&Uacute;ltimo acceso</TableHead>
                          <TableHead className="font-semibold text-right" style={{ color: T.inkSoft }}>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8" style={{ color: T.inkMuted }}>
                              No se encontraron usuarios
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers.map((u) => (
                            <TableRow key={u.id} className="hover:bg-[#FCFBF9]">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 overflow-hidden"
                                    style={{ backgroundColor: u.avatar_url ? "transparent" : T.accent }}
                                  >
                                    {u.avatar_url ? (
                                      <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      getInitials(u.full_name)
                                    )}
                                  </div>
                                  <span className="font-medium text-sm" style={{ color: T.ink }}>
                                    {u.full_name || "Sin nombre"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm" style={{ color: T.inkMuted }}>{u.email}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className="text-xs border"
                                  style={{
                                    backgroundColor: T.accentLight,
                                    color: T.accent,
                                    borderColor: `${T.accent}30`,
                                  }}
                                >
                                  {ROLE_LABELS[u.role] || u.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className="text-xs border"
                                  style={{
                                    backgroundColor: u.is_active !== false ? T.successBg : T.dangerBg,
                                    color: u.is_active !== false ? T.success : T.danger,
                                    borderColor: u.is_active !== false ? `${T.success}30` : `${T.danger}30`,
                                  }}
                                >
                                  {u.is_active !== false ? "Activo" : "Bloqueado"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm" style={{ color: T.inkMuted }}>
                                {formatDate(u.created_at)}
                              </TableCell>
                              <TableCell className="text-sm" style={{ color: T.inkMuted }}>
                                {u.last_login_at ? formatRelativeDate(u.last_login_at) : "Nunca"}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {u.is_active !== false ? (
                                      <DropdownMenuItem
                                        onClick={() => handleUserAction(u.id!, "block")}
                                        className="text-amber-600"
                                      >
                                        <Ban className="h-4 w-4 mr-2" />
                                        Bloquear
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem
                                        onClick={() => handleUserAction(u.id!, "unblock")}
                                        className="text-green-600"
                                      >
                                        <Unlock className="h-4 w-4 mr-2" />
                                        Desbloquear
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      onClick={() => {
                                        // Ensure roles are loaded for the dialog
                                        if (roles.length === 0) loadRoles();
                                        setChangeRoleDialog({
                                          open: true,
                                          userId: u.id!,
                                          currentRole: u.role,
                                          currentRoleId: u.role_id,
                                        });
                                        setSelectedNewRole(u.role_id || "");
                                      }}
                                    >
                                      <UserCog className="h-4 w-4 mr-2" />
                                      Cambiar rol
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleUserAction(u.id!, "reset_password")}
                                    >
                                      <RotateCcw className="h-4 w-4 mr-2" />
                                      Restablecer contrase&ntilde;a
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setDeactivateDialog({
                                          open: true,
                                          userId: u.id!,
                                          userName: u.full_name || u.email,
                                        })
                                      }
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Desactivar cuenta
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Change Role Dialog */}
            <Dialog
              open={changeRoleDialog.open}
              onOpenChange={(open) => {
                if (!open) setChangeRoleDialog({ open: false, userId: "", currentRole: "", currentRoleId: null });
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cambiar Rol</DialogTitle>
                  <DialogDescription>
                    Selecciona el nuevo rol para este usuario.
                    Rol actual: <strong>{ROLE_LABELS[changeRoleDialog.currentRole] || changeRoleDialog.currentRole}</strong>
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nuevo rol</Label>
                    <Select value={selectedNewRole} onValueChange={setSelectedNewRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r.id} value={r.id!}>
                            {r.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setChangeRoleDialog({ open: false, userId: "", currentRole: "", currentRoleId: null })}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleChangeRole}
                    className="bg-[#1E3A5F] hover:bg-[#2a4a73]"
                    disabled={!selectedNewRole}
                  >
                    Guardar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Deactivate User Dialog */}
            <Dialog
              open={deactivateDialog.open}
              onOpenChange={(open) => {
                if (!open) setDeactivateDialog({ open: false, userId: "", userName: "" });
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-red-600">Desactivar Cuenta</DialogTitle>
                  <DialogDescription>
                    &iquest;Est&aacute;s seguro de que deseas desactivar la cuenta de{" "}
                    <strong>{deactivateDialog.userName}</strong>? El usuario no podr&aacute; acceder al sistema.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDeactivateDialog({ open: false, userId: "", userName: "" })}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeactivateUser}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Desactivar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}

        {/* ═══════════════════════════════════════════════════
            TAB 6: ROLES Y PERMISOS (admin only)
        ═══════════════════════════════════════════════════ */}
        {isAdmin && (
          <TabsContent value="roles">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Roles list */}
              <Card className="rounded-xl border-[#E8E6E1] lg:col-span-1" style={{ boxShadow: T.shadow }}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base" style={{ color: T.ink }}>Roles</CardTitle>
                    <Button
                      size="sm"
                      className="bg-[#1E3A5F] hover:bg-[#2a4a73]"
                      onClick={() => {
                        setRoleForm({ name: "", display_name: "", description: "" });
                        setRoleDialog({ open: true, mode: "create" });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Nuevo
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {rolesLoading ? (
                    <div className="flex items-center justify-center h-20">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#1E3A5F] border-t-transparent" />
                    </div>
                  ) : roles.length === 0 ? (
                    <p className="text-sm text-center py-4" style={{ color: T.inkMuted }}>No hay roles configurados</p>
                  ) : (
                    roles.map((role) => (
                      <div
                        key={role.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedRoleId === role.id
                            ? "border-[#0B5394] bg-[#E8F0FE]"
                            : "border-[#E8E6E1] hover:bg-[#FCFBF9]"
                        }`}
                        onClick={() => setSelectedRoleId(role.id!)}
                      >
                        <div>
                          <p className="text-sm font-medium" style={{ color: T.ink }}>{role.display_name}</p>
                          {role.description && (
                            <p className="text-xs mt-0.5" style={{ color: T.inkMuted }}>{role.description}</p>
                          )}
                          {role.is_system && (
                            <Badge variant="secondary" className="text-[10px] mt-1 px-1.5 py-0">Sistema</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {!role.is_system && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRoleForm({
                                    name: role.name,
                                    display_name: role.display_name,
                                    description: role.description || "",
                                  });
                                  setRoleDialog({ open: true, mode: "edit", role });
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" style={{ color: T.inkMuted }} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteRoleDialog({ open: true, role });
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" style={{ color: T.danger }} />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Permissions matrix */}
              <Card className="rounded-xl border-[#E8E6E1] lg:col-span-2" style={{ boxShadow: T.shadow }}>
                <CardHeader>
                  <CardTitle className="text-base" style={{ color: T.ink }}>
                    {selectedRole
                      ? `Permisos: ${selectedRole.display_name}`
                      : "Selecciona un rol para ver sus permisos"}
                  </CardTitle>
                  {selectedRole && (
                    <CardDescription>
                      {isSelectedRoleAdmin
                        ? "El rol Administrador tiene todos los permisos y no puede ser modificado."
                        : "Configura los permisos para cada m\u00f3dulo del sistema."}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {!selectedRoleId ? (
                    <div className="flex flex-col items-center justify-center py-12" style={{ color: T.inkMuted }}>
                      <Shield className="h-12 w-12 mb-3" style={{ color: T.inkGhost }} />
                      <p className="text-sm">Selecciona un rol de la lista para configurar sus permisos</p>
                    </div>
                  ) : permissionsLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#1E3A5F] border-t-transparent" />
                    </div>
                  ) : (
                    <>
                      <div className="rounded-lg border overflow-hidden" style={{ borderColor: T.border }}>
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-[#FAF9F7]">
                              <TableHead className="font-semibold" style={{ color: T.inkSoft }}>M&oacute;dulo</TableHead>
                              <TableHead className="font-semibold text-center" style={{ color: T.inkSoft }}>Ver</TableHead>
                              <TableHead className="font-semibold text-center" style={{ color: T.inkSoft }}>Crear</TableHead>
                              <TableHead className="font-semibold text-center" style={{ color: T.inkSoft }}>Editar</TableHead>
                              <TableHead className="font-semibold text-center" style={{ color: T.inkSoft }}>Eliminar</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {permissions.map((perm) => (
                              <TableRow key={perm.module} className="hover:bg-[#FCFBF9]">
                                <TableCell className="font-medium text-sm" style={{ color: T.ink }}>
                                  {MODULE_LABELS[perm.module as ModuleName] || perm.module}
                                </TableCell>
                                {(["can_view", "can_create", "can_edit", "can_delete"] as const).map((field) => (
                                  <TableCell key={field} className="text-center">
                                    <div className="flex justify-center">
                                      <Switch
                                        checked={isSelectedRoleAdmin ? true : perm[field]}
                                        onCheckedChange={() => togglePermission(perm.module as ModuleName, field)}
                                        disabled={isSelectedRoleAdmin}
                                      />
                                    </div>
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {!isSelectedRoleAdmin && (
                        <div className="mt-4 flex justify-end">
                          <Button
                            onClick={handleSavePermissions}
                            disabled={permissionsSaving}
                            className="bg-[#1E3A5F] hover:bg-[#2a4a73]"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {permissionsSaving ? "Guardando..." : "Guardar Permisos"}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Create/Edit Role Dialog */}
            <Dialog
              open={roleDialog.open}
              onOpenChange={(open) => {
                if (!open) {
                  setRoleDialog({ open: false, mode: "create" });
                  setRoleForm({ name: "", display_name: "", description: "" });
                }
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {roleDialog.mode === "create" ? "Crear Nuevo Rol" : "Editar Rol"}
                  </DialogTitle>
                  <DialogDescription>
                    {roleDialog.mode === "create"
                      ? "Define un nuevo rol para el sistema."
                      : "Modifica la informaci\u00f3n del rol."}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {roleDialog.mode === "create" && (
                    <div className="space-y-2">
                      <Label>Nombre interno</Label>
                      <Input
                        value={roleForm.name}
                        onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="ej: supervisor"
                      />
                      <p className="text-xs" style={{ color: T.inkMuted }}>Identificador &uacute;nico, sin espacios</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Nombre de visualizaci&oacute;n</Label>
                    <Input
                      value={roleForm.display_name}
                      onChange={(e) => setRoleForm((prev) => ({ ...prev, display_name: e.target.value }))}
                      placeholder="ej: Supervisor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descripci&oacute;n</Label>
                    <Input
                      value={roleForm.description}
                      onChange={(e) => setRoleForm((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Descripci\u00f3n del rol (opcional)"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRoleDialog({ open: false, mode: "create" });
                      setRoleForm({ name: "", display_name: "", description: "" });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={roleDialog.mode === "create" ? handleCreateRole : handleEditRole}
                    className="bg-[#1E3A5F] hover:bg-[#2a4a73]"
                    disabled={saving}
                  >
                    {saving ? "Guardando..." : roleDialog.mode === "create" ? "Crear Rol" : "Guardar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Delete Role Confirmation Dialog */}
            <Dialog
              open={deleteRoleDialog.open}
              onOpenChange={(open) => {
                if (!open) setDeleteRoleDialog({ open: false });
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-red-600">Eliminar Rol</DialogTitle>
                  <DialogDescription>
                    &iquest;Est&aacute;s seguro de que deseas eliminar el rol{" "}
                    <strong>{deleteRoleDialog.role?.display_name}</strong>?
                    Esta acci&oacute;n no se puede deshacer.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteRoleDialog({ open: false })}>
                    Cancelar
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteRole} disabled={saving}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {saving ? "Eliminando..." : "Eliminar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}

        {/* ═══════════════════════════════════════════════════
            TAB 7: INVITACIONES (admin only)
        ═══════════════════════════════════════════════════ */}
        {isAdmin && (
          <TabsContent value="invitations">
            <div className="space-y-6">
              {/* Send invitation form */}
              <Card className="rounded-xl border-[#E8E6E1]" style={{ boxShadow: T.shadow }}>
                <CardHeader>
                  <CardTitle style={{ color: T.ink }}>Enviar Invitaci&oacute;n</CardTitle>
                  <CardDescription>Invita a nuevos usuarios a unirse al sistema</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <Input
                        type="email"
                        placeholder="Correo electr\u00f3nico *"
                        value={inviteForm.email}
                        onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="sm:w-48">
                      <Input
                        placeholder="Nombre (opcional)"
                        value={inviteForm.name}
                        onChange={(e) => setInviteForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="sm:w-48">
                      <Select
                        value={inviteForm.role_id}
                        onValueChange={(val) => setInviteForm((prev) => ({ ...prev, role_id: val }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Rol *" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((r) => (
                            <SelectItem key={r.id} value={r.id!}>{r.display_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleSendInvitation}
                      disabled={inviteSending || !inviteForm.email || !inviteForm.role_id}
                      className="bg-[#1E3A5F] hover:bg-[#2a4a73]"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {inviteSending ? "Enviando..." : "Enviar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Invitations table */}
              <Card className="rounded-xl border-[#E8E6E1]" style={{ boxShadow: T.shadow }}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle style={{ color: T.ink }}>Invitaciones Enviadas</CardTitle>
                      <CardDescription>Historial de invitaciones del sistema</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={loadInvitations} disabled={invitationsLoading}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${invitationsLoading ? "animate-spin" : ""}`} />
                      Actualizar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {invitationsLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#1E3A5F] border-t-transparent" />
                    </div>
                  ) : (
                    <div className="rounded-lg border overflow-hidden" style={{ borderColor: T.border }}>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#FAF9F7]">
                            <TableHead className="font-semibold" style={{ color: T.inkSoft }}>Email</TableHead>
                            <TableHead className="font-semibold" style={{ color: T.inkSoft }}>Nombre</TableHead>
                            <TableHead className="font-semibold" style={{ color: T.inkSoft }}>Rol</TableHead>
                            <TableHead className="font-semibold" style={{ color: T.inkSoft }}>Estado</TableHead>
                            <TableHead className="font-semibold" style={{ color: T.inkSoft }}>Enviada</TableHead>
                            <TableHead className="font-semibold" style={{ color: T.inkSoft }}>Expira</TableHead>
                            <TableHead className="font-semibold text-right" style={{ color: T.inkSoft }}>Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invitations.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8" style={{ color: T.inkMuted }}>
                                No hay invitaciones
                              </TableCell>
                            </TableRow>
                          ) : (
                            invitations.map((inv) => {
                              const statusCfg = INVITATION_STATUS_CONFIG[inv.status];
                              return (
                                <TableRow key={inv.id} className="hover:bg-[#FCFBF9]">
                                  <TableCell className="text-sm font-medium" style={{ color: T.ink }}>
                                    {inv.email}
                                  </TableCell>
                                  <TableCell className="text-sm" style={{ color: T.inkMuted }}>
                                    {inv.name || "\u2014"}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="secondary"
                                      className="text-xs border"
                                      style={{
                                        backgroundColor: T.accentLight,
                                        color: T.accent,
                                        borderColor: `${T.accent}30`,
                                      }}
                                    >
                                      {(inv.role as unknown as { display_name?: string })?.display_name ||
                                       ROLE_LABELS[(inv.role as unknown as { name?: string })?.name || ""] ||
                                       "\u2014"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="secondary"
                                      className={`text-xs border ${statusCfg.bg} ${statusCfg.color}`}
                                    >
                                      {statusCfg.label}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm" style={{ color: T.inkMuted }}>
                                    {formatDate(inv.created_at)}
                                  </TableCell>
                                  <TableCell className="text-sm" style={{ color: T.inkMuted }}>
                                    {formatDate(inv.expires_at)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {(inv.status === "pending" || inv.status === "expired") && (
                                      <div className="flex items-center justify-end gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 text-xs"
                                          onClick={() => handleInvitationAction(inv.id!, "resend")}
                                          title="Reenviar"
                                        >
                                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                                          Reenviar
                                        </Button>
                                        {inv.status === "pending" && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 text-xs text-red-600 hover:text-red-700"
                                            onClick={() => handleInvitationAction(inv.id!, "cancel")}
                                            title="Cancelar"
                                          >
                                            <X className="h-3.5 w-3.5 mr-1" />
                                            Cancelar
                                          </Button>
                                        )}
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
