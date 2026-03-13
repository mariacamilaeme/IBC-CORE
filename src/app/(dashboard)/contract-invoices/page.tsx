"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Receipt,
  DollarSign,
  Users,
  FilterX,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatDate, formatCurrency } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";

// =====================================================
// Types
// =====================================================

interface ContractInvoice {
  id: string;
  invoice_date: string | null;
  customer_name: string | null;
  china_invoice_number: string | null;
  china_invoice_value: number | null;
  customer_contract: string | null;
  customer_invoice_value: number | null;
  approved: boolean;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FetchResponse {
  data: ContractInvoice[];
  total: number;
  page: number;
  pageSize: number;
}

interface ContractInvoiceFormData {
  invoice_date: string;
  customer_name: string;
  china_invoice_number: string;
  china_invoice_value: number | string;
  customer_contract: string;
  customer_invoice_value: number | string;
  approved: boolean;
  notes: string;
}

// =====================================================
// Constants
// =====================================================

const ITEMS_PER_PAGE = 15;

const EMPTY_FORM: ContractInvoiceFormData = {
  invoice_date: new Date().toISOString().split("T")[0],
  customer_name: "",
  china_invoice_number: "",
  china_invoice_value: "",
  customer_contract: "",
  customer_invoice_value: "",
  approved: false,
  notes: "",
};

// =====================================================
// Skeleton Loader
// =====================================================

function TableSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-28" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-28" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
          <div className="h-4 bg-gray-200 rounded animate-pulse flex-1" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-8" />
        </div>
      ))}
    </div>
  );
}

// =====================================================
// Main Page Component
// =====================================================

export default function ContractInvoicesPage() {
  // Data state
  const [invoices, setInvoices] = useState<ContractInvoice[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [approvedFilter, setApprovedFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<ContractInvoice | null>(null);
  const [formData, setFormData] = useState<ContractInvoiceFormData>({ ...EMPTY_FORM });

  // =====================================================
  // Debounced search
  // =====================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // =====================================================
  // Data Fetching
  // =====================================================

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (debouncedSearch) params.set("search", debouncedSearch);
      if (approvedFilter !== "all") params.set("approved", approvedFilter === "approved" ? "true" : "false");
      params.set("page", String(currentPage));
      params.set("pageSize", String(ITEMS_PER_PAGE));

      const res = await fetch(`/api/contract-invoices?${params.toString()}`);
      const json: FetchResponse = await res.json();

      if (!res.ok) {
        toast.error((json as unknown as { error: string }).error || "Error al cargar facturas de China");
        return;
      }

      setInvoices(json.data || []);
      setTotalCount(json.total || 0);
    } catch {
      toast.error("Error de conexion al cargar facturas de China");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, approvedFilter, currentPage]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [approvedFilter]);

  // =====================================================
  // Summary calculations
  // =====================================================

  const summary = useMemo(() => {
    const total = invoices.length;
    const chinaTotal = invoices.reduce((sum, inv) => sum + (inv.china_invoice_value || 0), 0);
    const customerTotal = invoices.reduce((sum, inv) => sum + (inv.customer_invoice_value || 0), 0);
    const approvedCount = invoices.filter((inv) => inv.approved).length;

    return { total, chinaTotal, customerTotal, approvedCount };
  }, [invoices]);

  // =====================================================
  // Pagination
  // =====================================================

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const showingFrom = totalCount === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const showingTo = Math.min(currentPage * ITEMS_PER_PAGE, totalCount);

  // =====================================================
  // Form handlers
  // =====================================================

  const resetForm = useCallback(() => {
    setFormData({ ...EMPTY_FORM });
    setEditingInvoice(null);
  }, []);

  const openCreateForm = () => {
    resetForm();
    setSheetOpen(true);
  };

  const openEditForm = (invoice: ContractInvoice) => {
    setEditingInvoice(invoice);
    setFormData({
      invoice_date: invoice.invoice_date || new Date().toISOString().split("T")[0],
      customer_name: invoice.customer_name || "",
      china_invoice_number: invoice.china_invoice_number || "",
      china_invoice_value: invoice.china_invoice_value ?? "",
      customer_contract: invoice.customer_contract || "",
      customer_invoice_value: invoice.customer_invoice_value ?? "",
      approved: invoice.approved || false,
      notes: invoice.notes || "",
    });
    setSheetOpen(true);
  };

  const handleFieldChange = (field: keyof ContractInvoiceFormData, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_name.trim()) {
      toast.error("El nombre del cliente es requerido");
      return;
    }

    try {
      setSaving(true);

      const payload: Record<string, unknown> = {
        invoice_date: formData.invoice_date || null,
        customer_name: formData.customer_name.trim(),
        china_invoice_number: formData.china_invoice_number.trim() || null,
        china_invoice_value: formData.china_invoice_value !== "" ? Number(formData.china_invoice_value) : null,
        customer_contract: formData.customer_contract.trim() || null,
        customer_invoice_value: formData.customer_invoice_value !== "" ? Number(formData.customer_invoice_value) : null,
        approved: formData.approved,
        notes: formData.notes.trim() || null,
      };

      let res: Response;

      if (editingInvoice) {
        payload.id = editingInvoice.id;
        res = await fetch("/api/contract-invoices", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/contract-invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Error al guardar la factura");
        return;
      }

      toast.success(
        editingInvoice
          ? "Factura actualizada exitosamente"
          : "Factura creada exitosamente"
      );
      fetchInvoices();
      if (!editingInvoice) {
        setSheetOpen(false);
        resetForm();
      }
    } catch {
      toast.error("Error de conexion al guardar");
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // Approve / Disapprove
  // =====================================================

  const handleToggleApproved = async (invoice: ContractInvoice) => {
    try {
      setSaving(true);
      const res = await fetch("/api/contract-invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: invoice.id,
          approved: !invoice.approved,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Error al cambiar estado de aprobacion");
        return;
      }

      toast.success(
        invoice.approved
          ? "Factura marcada como pendiente"
          : "Factura aprobada exitosamente"
      );
      fetchInvoices();
    } catch {
      toast.error("Error de conexion");
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // Anular (soft delete)
  // =====================================================

  const handleAnular = async (invoice: ContractInvoice) => {
    if (!confirm("¿Esta seguro que desea anular esta factura? Esta accion no se puede deshacer.")) return;

    try {
      setSaving(true);
      const res = await fetch("/api/contract-invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: invoice.id,
          is_active: false,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Error al anular la factura");
        return;
      }

      toast.success("Factura anulada exitosamente");
      fetchInvoices();
    } catch {
      toast.error("Error de conexion");
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // Clear filters
  // =====================================================

  const hasActiveFilters = searchTerm !== "" || approvedFilter !== "all";

  const clearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setApprovedFilter("all");
    setCurrentPage(1);
  };

  // =====================================================
  // Render
  // =====================================================

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 12.5, color: "#9CA3B4" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 4, color: "#0B5394", fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          Inicio
        </Link>
        <span style={{ color: "#C5CAD5" }}>/</span>
        <span style={{ fontWeight: 600, color: "#6B7080" }}>Facturas China</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Facturas China</h1>
          <p className="text-sm text-gray-500 mt-1">
            Control de facturas de proveedores chinos y valores asociados
          </p>
        </div>
        <Button
          onClick={openCreateForm}
          className="bg-[#1E3A5F] hover:bg-[#2d5a8e] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Factura
        </Button>
      </div>

      {/* Filters Row */}
      <Card className="border border-gray-200">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Search */}
            <div className="flex-1 min-w-[250px]">
              <Label className="text-sm text-gray-600 mb-1 block">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cliente, # factura china, contrato..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Approved Filter */}
            <div className="min-w-[180px]">
              <Label className="text-sm text-gray-600 mb-1 block">Estado</Label>
              <Select value={approvedFilter} onValueChange={setApprovedFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="approved">Aprobadas</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-500 hover:text-gray-700"
              >
                <FilterX className="h-4 w-4 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Facturas */}
        <Card className="border border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Facturas</p>
                <p className="text-2xl font-bold text-[#1E3A5F] mt-1">{totalCount}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-[#1E3A5F]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Valor Total China */}
        <Card className="border border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Valor Total China</p>
                <p className="text-2xl font-bold text-[#1E3A5F] mt-1">
                  {formatCurrency(summary.chinaTotal)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-emerald-50 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Valor Total Cliente */}
        <Card className="border border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Valor Total Cliente</p>
                <p className="text-2xl font-bold text-[#1E3A5F] mt-1">
                  {formatCurrency(summary.customerTotal)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-violet-50 flex items-center justify-center">
                <Users className="h-6 w-6 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Aprobadas */}
        <Card className="border border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Aprobadas</p>
                <p className="text-2xl font-bold text-[#1E3A5F] mt-1">
                  {summary.approvedCount} de {summary.total}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton />
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <FileText className="h-12 w-12 text-gray-300" />
              <p className="text-gray-500 font-medium">No se encontraron facturas</p>
              <p className="text-sm text-gray-400">
                {hasActiveFilters
                  ? "Intente ajustar los filtros de busqueda"
                  : "Cree una nueva factura para comenzar"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80">
                      <TableHead className="font-semibold text-[#1E3A5F]">Fecha</TableHead>
                      <TableHead className="font-semibold text-[#1E3A5F]">Cliente</TableHead>
                      <TableHead className="font-semibold text-[#1E3A5F]"># Factura China</TableHead>
                      <TableHead className="font-semibold text-[#1E3A5F] text-right">Valor China</TableHead>
                      <TableHead className="font-semibold text-[#1E3A5F]">Contrato Cliente</TableHead>
                      <TableHead className="font-semibold text-[#1E3A5F] text-right">Valor Cliente</TableHead>
                      <TableHead className="font-semibold text-[#1E3A5F]">Estado</TableHead>
                      <TableHead className="font-semibold text-[#1E3A5F]">Notas</TableHead>
                      <TableHead className="font-semibold text-[#1E3A5F] w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow
                        key={invoice.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <TableCell className="text-sm text-gray-700">
                          {formatDate(invoice.invoice_date)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">
                          {invoice.customer_name || "\u2014"}
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-[#1E3A5F]">
                          {invoice.china_invoice_number || "\u2014"}
                        </TableCell>
                        <TableCell className="text-sm text-right font-medium text-gray-800">
                          {formatCurrency(invoice.china_invoice_value)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">
                          {invoice.customer_contract || "\u2014"}
                        </TableCell>
                        <TableCell className="text-sm text-right font-medium text-gray-800">
                          {formatCurrency(invoice.customer_invoice_value)}
                        </TableCell>
                        <TableCell>
                          {invoice.approved ? (
                            <Badge className="bg-green-100 text-green-800 border border-green-200 text-xs">
                              Aprobada
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-xs">
                              Pendiente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 max-w-[200px] truncate" title={invoice.notes || ""}>
                          {invoice.notes || "\u2014"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openEditForm(invoice)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleApproved(invoice)}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                {invoice.approved ? "Desaprobar" : "Aprobar"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleAnular(invoice)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Anular
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <p className="text-sm text-gray-500">
                  Mostrando {showingFrom}-{showingTo} de {totalCount}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-600 min-w-[100px] text-center">
                    Pagina {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* =====================================================
          Create / Edit Sheet
          ===================================================== */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) resetForm();
          setSheetOpen(open);
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg overflow-y-auto"
          showCloseButton
        >
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="text-[#1E3A5F]">
              {editingInvoice ? "Editar Factura China" : "Nueva Factura China"}
            </SheetTitle>
            <SheetDescription>
              {editingInvoice
                ? `Editando factura ${editingInvoice.china_invoice_number || editingInvoice.id.slice(0, 8)}`
                : "Complete los campos para registrar una nueva factura de proveedor chino"}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-5 py-4 px-1">
            {/* Fecha */}
            <div>
              <Label htmlFor="invoice_date" className="text-sm font-medium text-gray-700">
                Fecha de Factura
              </Label>
              <Input
                id="invoice_date"
                type="date"
                value={formData.invoice_date}
                onChange={(e) => handleFieldChange("invoice_date", e.target.value)}
                className="mt-1.5"
              />
            </div>

            {/* Cliente */}
            <div>
              <Label htmlFor="customer_name" className="text-sm font-medium text-gray-700">
                Cliente *
              </Label>
              <Input
                id="customer_name"
                placeholder="Nombre del cliente"
                value={formData.customer_name}
                onChange={(e) => handleFieldChange("customer_name", e.target.value)}
                className="mt-1.5"
              />
            </div>

            <Separator />

            {/* Factura China section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#1E3A5F] uppercase tracking-wide">
                Factura Proveedor China
              </h3>

              <div>
                <Label htmlFor="china_invoice_number" className="text-sm font-medium text-gray-700">
                  # Factura China
                </Label>
                <Input
                  id="china_invoice_number"
                  placeholder="Numero de factura del proveedor"
                  value={formData.china_invoice_number}
                  onChange={(e) => handleFieldChange("china_invoice_number", e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="china_invoice_value" className="text-sm font-medium text-gray-700">
                  Valor Factura China (USD)
                </Label>
                <Input
                  id="china_invoice_value"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.china_invoice_value}
                  onChange={(e) => handleFieldChange("china_invoice_value", e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>

            <Separator />

            {/* Contrato Cliente section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#1E3A5F] uppercase tracking-wide">
                Contrato / Factura Cliente
              </h3>

              <div>
                <Label htmlFor="customer_contract" className="text-sm font-medium text-gray-700">
                  Contrato Cliente
                </Label>
                <Input
                  id="customer_contract"
                  placeholder="Numero o referencia del contrato"
                  value={formData.customer_contract}
                  onChange={(e) => handleFieldChange("customer_contract", e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="customer_invoice_value" className="text-sm font-medium text-gray-700">
                  Valor Factura Cliente (USD)
                </Label>
                <Input
                  id="customer_invoice_value"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.customer_invoice_value}
                  onChange={(e) => handleFieldChange("customer_invoice_value", e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>

            <Separator />

            {/* Aprobacion */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="approved"
                checked={formData.approved}
                onCheckedChange={(checked) => handleFieldChange("approved", checked === true)}
              />
              <Label htmlFor="approved" className="text-sm font-medium text-gray-700 cursor-pointer">
                Factura aprobada
              </Label>
            </div>

            {/* Notas */}
            <div>
              <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
                Notas
              </Label>
              <Textarea
                id="notes"
                placeholder="Observaciones o notas adicionales..."
                rows={3}
                value={formData.notes}
                onChange={(e) => handleFieldChange("notes", e.target.value)}
                className="mt-1.5"
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setSheetOpen(false);
                }}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#1E3A5F] hover:bg-[#2d5a8e] text-white"
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingInvoice ? "Actualizar Factura" : "Crear Factura"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
