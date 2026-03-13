"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Package, Plus, Search, MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import { formatDate, formatNumber } from "@/lib/utils";
import type { PackingList } from "@/types";

export default function PackingListsPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [packingLists, setPackingLists] = useState<(PackingList & { client_name?: string; invoice_number?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const canAccess = profile?.role !== "comercial";

  useEffect(() => {
    if (canAccess) loadData();
  }, [canAccess]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("packing_lists")
        .select(`
          *,
          clients(company_name),
          invoices(invoice_number)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((pl: Record<string, unknown>) => ({
        ...pl,
        client_name: (pl.clients as Record<string, unknown>)?.company_name as string || "—",
        invoice_number: (pl.invoices as Record<string, unknown>)?.invoice_number as string || "—",
      })) as (PackingList & { client_name?: string; invoice_number?: string })[];

      setPackingLists(mapped);
    } catch {
      toast.error("Error al cargar packing lists");
    } finally {
      setLoading(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-700">Acceso Restringido</h2>
          <p className="text-sm text-slate-500 mt-2">No tiene permisos para acceder a esta sección</p>
        </Card>
      </div>
    );
  }

  const filtered = packingLists.filter(
    (pl) =>
      pl.pl_number?.toLowerCase().includes(search.toLowerCase()) ||
      pl.client_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 12.5, color: "#9CA3B4" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 4, color: "#0B5394", fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          Inicio
        </Link>
        <span style={{ color: "#C5CAD5" }}>/</span>
        <span style={{ fontWeight: 600, color: "#6B7080" }}>Packing Lists</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Packing Lists</h1>
          <p className="text-sm text-slate-500 mt-1">
            {filtered.length} packing list{filtered.length !== 1 ? "s" : ""} registrado{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button className="bg-[#1E3A5F] hover:bg-[#2a4a73]">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Packing List
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por número o cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1E3A5F] border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-700">No hay packing lists</h3>
              <p className="text-sm text-slate-500 mt-1">Crea el primer packing list desde una factura</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Factura</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Paquetes</TableHead>
                  <TableHead>Peso Bruto</TableHead>
                  <TableHead>Contenedor</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((pl) => (
                  <TableRow key={pl.id}>
                    <TableCell className="font-medium text-[#1E3A5F]">{pl.pl_number}</TableCell>
                    <TableCell>{pl.invoice_number}</TableCell>
                    <TableCell>{pl.client_name}</TableCell>
                    <TableCell>{formatDate(pl.issue_date)}</TableCell>
                    <TableCell>{formatNumber(pl.total_packages)}</TableCell>
                    <TableCell>
                      {pl.total_gross_weight ? `${formatNumber(pl.total_gross_weight)} ${pl.weight_unit || "KG"}` : "—"}
                    </TableCell>
                    <TableCell>
                      {pl.container_number ? (
                        <Badge variant="outline">{pl.container_number}</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2">
                            <Eye className="h-4 w-4" /> Ver detalle
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <Edit className="h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-red-600">
                            <Trash2 className="h-4 w-4" /> Desactivar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
