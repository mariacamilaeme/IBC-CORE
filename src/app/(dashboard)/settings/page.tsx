"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, User, KeyRound, FileText, Save } from "lucide-react";
import type { SystemConfig } from "@/types";

export default function SettingsPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // Password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isAdmin = profile?.role === "admin" || profile?.role === "directora";

  useEffect(() => {
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
      }
    } catch {
      toast.error("Error al cargar configuración");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, phone })
        .eq("id", profile.id);

      if (error) throw error;
      toast.success("Perfil actualizado correctamente");
    } catch {
      toast.error("Error al actualizar perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Contraseña actualizada correctamente");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Error al cambiar contraseña");
    } finally {
      setSaving(false);
    }
  };

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
      toast.success("Configuración guardada correctamente");
    } catch {
      toast.error("Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1E3A5F] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 12.5, color: "#9CA3B4" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 4, color: "#0B5394", fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          Inicio
        </Link>
        <span style={{ color: "#C5CAD5" }}>/</span>
        <span style={{ fontWeight: 600, color: "#6B7080" }}>Configuración</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configuración</h1>
        <p className="text-sm text-slate-500 mt-1">Administra tu perfil y la configuración del sistema</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Mi Perfil
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <KeyRound className="h-4 w-4" />
            Seguridad
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="company" className="gap-2">
                <Building2 className="h-4 w-4" />
                Empresa
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-2">
                <FileText className="h-4 w-4" />
                Documentos
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* PERFIL */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>Actualiza tu información de perfil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre completo</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tu nombre"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Correo electrónico</Label>
                  <Input value={profile?.email || ""} disabled className="bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+57 300 000 0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <div className="flex items-center h-10">
                    <Badge variant="secondary" className="text-sm">
                      {profile?.role === "admin" ? "Administrador" :
                       profile?.role === "directora" ? "Directora" :
                       profile?.role === "analista" ? "Analista" : "Comercial"}
                    </Badge>
                  </div>
                </div>
              </div>
              <Separator />
              <Button onClick={handleSaveProfile} disabled={saving} className="bg-[#1E3A5F] hover:bg-[#2a4a73]">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEGURIDAD */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Cambiar Contraseña</CardTitle>
              <CardDescription>Actualiza tu contraseña de acceso</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
                <div className="space-y-2 md:col-span-2">
                  <Label>Nueva contraseña</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Confirmar contraseña</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                  />
                </div>
              </div>
              <Button onClick={handleChangePassword} disabled={saving} className="bg-[#1E3A5F] hover:bg-[#2a4a73]">
                <KeyRound className="h-4 w-4 mr-2" />
                {saving ? "Actualizando..." : "Cambiar Contraseña"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EMPRESA */}
        {isAdmin && (
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>Información de la Empresa</CardTitle>
                <CardDescription>Datos fiscales y de contacto de IBC Steel Group</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre de la empresa</Label>
                    <Input
                      value={config?.company_name || ""}
                      onChange={(e) => setConfig(prev => prev ? { ...prev, company_name: e.target.value } : prev)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>NIT / Tax ID</Label>
                    <Input
                      value={config?.company_tax_id || ""}
                      onChange={(e) => setConfig(prev => prev ? { ...prev, company_tax_id: e.target.value } : prev)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Dirección</Label>
                    <Input
                      value={config?.company_address || ""}
                      onChange={(e) => setConfig(prev => prev ? { ...prev, company_address: e.target.value } : prev)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ciudad</Label>
                    <Input
                      value={config?.company_city || ""}
                      onChange={(e) => setConfig(prev => prev ? { ...prev, company_city: e.target.value } : prev)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>País</Label>
                    <Input
                      value={config?.company_country || ""}
                      onChange={(e) => setConfig(prev => prev ? { ...prev, company_country: e.target.value } : prev)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input
                      value={config?.company_phone || ""}
                      onChange={(e) => setConfig(prev => prev ? { ...prev, company_phone: e.target.value } : prev)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Correo</Label>
                    <Input
                      value={config?.company_email || ""}
                      onChange={(e) => setConfig(prev => prev ? { ...prev, company_email: e.target.value } : prev)}
                    />
                  </div>
                  <Separator className="md:col-span-2" />
                  <div className="space-y-2">
                    <Label>Moneda predeterminada</Label>
                    <Input
                      value={config?.default_currency || "USD"}
                      onChange={(e) => setConfig(prev => prev ? { ...prev, default_currency: e.target.value } : prev)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tasa de cambio USD/COP</Label>
                    <Input
                      type="number"
                      value={config?.exchange_rate_usd_cop || ""}
                      onChange={(e) => setConfig(prev => prev ? { ...prev, exchange_rate_usd_cop: parseFloat(e.target.value) || 0 } : prev)}
                    />
                  </div>
                </div>
                <Separator />
                <Button onClick={handleSaveConfig} disabled={saving} className="bg-[#1E3A5F] hover:bg-[#2a4a73]">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Guardando..." : "Guardar Configuración"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* DOCUMENTOS */}
        {isAdmin && (
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Prefijos y Consecutivos</CardTitle>
                <CardDescription>Configuración de numeración automática de documentos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Prefijo Cotizaciones</Label>
                    <Input
                      value={config?.quotation_prefix || "COT-"}
                      onChange={(e) => setConfig(prev => prev ? { ...prev, quotation_prefix: e.target.value } : prev)}
                    />
                    <p className="text-xs text-slate-500">Siguiente: {config?.quotation_next_number}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Prefijo Facturas</Label>
                    <Input
                      value={config?.invoice_prefix || "FAC-"}
                      onChange={(e) => setConfig(prev => prev ? { ...prev, invoice_prefix: e.target.value } : prev)}
                    />
                    <p className="text-xs text-slate-500">Siguiente: {config?.invoice_next_number}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Prefijo Packing Lists</Label>
                    <Input
                      value={config?.packing_list_prefix || "PL-"}
                      onChange={(e) => setConfig(prev => prev ? { ...prev, packing_list_prefix: e.target.value } : prev)}
                    />
                    <p className="text-xs text-slate-500">Siguiente: {config?.packing_list_next_number}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Prefijo Embarques</Label>
                    <Input
                      value={config?.shipment_prefix || "EMB-"}
                      onChange={(e) => setConfig(prev => prev ? { ...prev, shipment_prefix: e.target.value } : prev)}
                    />
                    <p className="text-xs text-slate-500">Siguiente: {config?.shipment_next_number}</p>
                  </div>
                </div>
                <Separator />
                <Button onClick={handleSaveConfig} disabled={saving} className="bg-[#1E3A5F] hover:bg-[#2a4a73]">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Guardando..." : "Guardar Configuración"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
