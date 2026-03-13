"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  DollarSign,
  XCircle,
  Trash2,
  CalendarIcon,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle2,
  Receipt,
  Users,
  FilterX,
  SlidersHorizontal,
  Building2,
  ClipboardCheck,
  Download,
  ArrowLeft,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  cn,
  formatDate,
  formatCurrency,
  PAYMENT_STATUS_LABELS,
} from "@/lib/utils";
import type {
  Invoice,
  InvoiceWithRelations,
  InvoiceItem,
  PartialPayment,
  PaymentStatus,
  Client,
  Profile,
  Quotation,
  Vessel,
} from "@/types";

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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Link from "next/link";

// ─── DESIGN TOKENS ───────────────────────────────────────────
const T = {
  bg: "#F5F3EF", surface: "#FFFFFF", surfaceHover: "#FCFBF9", surfaceAlt: "#FAF9F7",
  ink: "#18191D", inkSoft: "#3D4049", inkMuted: "#6B7080", inkLight: "#9CA3B4", inkGhost: "#C5CAD5",
  accent: "#0B5394", accentLight: "#E8F0FE", accentDark: "#083D6E",
  success: "#0D9F6E", successBg: "#ECFDF3", warning: "#DC8B0B", warningBg: "#FFF8EB",
  danger: "#E63946", dangerBg: "#FFF1F2",
  blue: "#3B82F6", blueBg: "#EFF6FF", violet: "#7C5CFC", violetBg: "#F3F0FF",
  teal: "#0EA5A5", tealBg: "#EDFCFC", orange: "#F97316", orangeBg: "#FFF7ED",
  border: "#E8E6E1", borderLight: "#F0EDE8",
  shadow: "0 1px 2px rgba(26,29,35,0.03), 0 2px 8px rgba(26,29,35,0.04)",
  shadowMd: "0 2px 4px rgba(26,29,35,0.04), 0 8px 20px rgba(26,29,35,0.05)",
  shadowLg: "0 4px 8px rgba(26,29,35,0.04), 0 16px 40px rgba(26,29,35,0.07)",
  radius: "18px", radiusMd: "14px", radiusSm: "10px",
};

// ─── SVG ICONS ───────────────────────────────────────────────
const Ic = {
  receipt: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg>,
  download: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
  plus: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M12 5v14"/></svg>,
  search: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  filter: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  home: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>,
  dollar: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  check: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>,
  users: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  file: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>,
  chevR: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>,
};

// ─── RING CHART ──────────────────────────────────────────────
function InvRing({ value, max, size = 52, sw = 5, color, bg }: { value: number; max: number; size?: number; sw?: number; color: string; bg?: string }) {
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bg || T.borderLight} strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(value, max) / (max || 1))}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)" }} />
    </svg>
  );
}

// ─── PREMIUM CARD WRAPPER ────────────────────────────────────
function InvCard({ children, style = {}, delay = 0 }: { children: React.ReactNode; style?: React.CSSProperties; delay?: number }) {
  return (
    <div style={{
      background: T.surface, borderRadius: T.radius, border: `1px solid ${T.borderLight}`,
      boxShadow: T.shadow, animation: `invFadeUp 0.55s cubic-bezier(0.4,0,0.2,1) ${delay}ms both`,
      overflow: "hidden", ...style,
    }}>{children}</div>
  );
}

// ─── PAYMENT STATUS INLINE STYLES ────────────────────────────
const PAY_STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  pendiente: { color: T.warning, bg: T.warningBg },
  parcial: { color: T.blue, bg: T.blueBg },
  pagada: { color: T.success, bg: T.successBg },
  vencida: { color: T.danger, bg: T.dangerBg },
  anulada: { color: T.inkLight, bg: T.surfaceAlt },
};

// =====================================================
// Zod Schemas (Comerciales)
// =====================================================

const invoiceItemSchema = z.object({
  description: z.string().min(1, "Descripcion requerida"),
  quantity: z.coerce.number().min(0.01, "Cantidad requerida"),
  unit: z.string().min(1, "Unidad requerida"),
  unit_price: z.coerce.number().min(0, "Precio requerido"),
  total: z.coerce.number().min(0),
});

const invoiceFormSchema = z.object({
  // Info General
  client_id: z.string().min(1, "Cliente requerido"),
  quotation_id: z.string().optional().nullable(),
  commercial_id: z.string().min(1, "Comercial requerido"),
  issue_date: z.string().min(1, "Fecha de emision requerida"),
  due_date: z.string().min(1, "Fecha de vencimiento requerida"),
  // Montos
  currency: z.string().default("USD"),
  exchange_rate: z.coerce.number().optional().nullable(),
  subtotal: z.coerce.number().min(0, "Subtotal requerido"),
  tax_percentage: z.coerce.number().min(0).default(0),
  tax_amount: z.coerce.number().min(0).default(0),
  total_amount: z.coerce.number().min(0.01, "Monto total requerido"),
  total_amount_cop: z.coerce.number().optional().nullable(),
  // Items
  items: z.array(invoiceItemSchema).optional(),
  // Envio
  incoterm: z.string().optional().nullable(),
  port_of_origin: z.string().optional().nullable(),
  port_of_destination: z.string().optional().nullable(),
  vessel_id: z.string().optional().nullable(),
  payment_conditions: z.string().optional().nullable(),
  // Bancaria
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  swift_code: z.string().optional(),
  iban: z.string().optional(),
  // Notas
  notes: z.string().optional().nullable(),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

const paymentFormSchema = z.object({
  amount: z.coerce.number().min(0.01, "Monto requerido"),
  date: z.string().min(1, "Fecha requerida"),
  reference: z.string().min(1, "Referencia requerida"),
  method: z.string().min(1, "Metodo de pago requerido"),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

// =====================================================
// Types (China)
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

interface ChinaFetchResponse {
  data: ContractInvoice[];
  count: number;
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

const ITEMS_PER_PAGE = 10;
const CHINA_ITEMS_PER_PAGE = 50;

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800 border-amber-200",
  parcial: "bg-blue-100 text-blue-800 border-blue-200",
  pagada: "bg-green-100 text-green-800 border-green-200",
  vencida: "bg-red-100 text-red-800 border-red-200",
  anulada: "bg-gray-100 text-gray-800 border-gray-200",
};

const PAYMENT_METHODS = [
  { value: "transferencia", label: "Transferencia" },
  { value: "cheque", label: "Cheque" },
  { value: "efectivo", label: "Efectivo" },
  { value: "otro", label: "Otro" },
];

const INCOTERMS = [
  "EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP",
  "DAP", "DPU", "DDP",
];

const CHINA_EMPTY_FORM: ContractInvoiceFormData = {
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
// China Table Skeleton
// =====================================================

function ChinaTableSkeleton() {
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

export default function InvoicesPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = createClient();
  const searchParams = useSearchParams();

  // Active tab state — read from URL ?tab=china
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get("tab");
    return tab === "china" ? "china" : "comerciales";
  });

  // =====================================================
  // === COMERCIALES STATE & LOGIC ===
  // =====================================================

  // Data states
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [commercials, setCommercials] = useState<Profile[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [commFilterClient, setCommFilterClient] = useState<string[]>([]);
  const [commFilterStatus, setCommFilterStatus] = useState<string[]>([]);
  const [commFilterDateFrom, setCommFilterDateFrom] = useState<string>("");
  const [commFilterDateTo, setCommFilterDateTo] = useState<string>("");
  const [commActiveFilterPanel, setCommActiveFilterPanel] = useState<string | null>(null);
  const [commFilterPanelSearch, setCommFilterPanelSearch] = useState("");
  const [commDownloading, setCommDownloading] = useState(false);

  // UI states
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceWithRelations | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceWithRelations | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceWithRelations | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Client search state
  const [clientSearch, setClientSearch] = useState("");

  // =====================================================
  // === CHINA STATE ===
  // =====================================================

  const [chinaInvoices, setChinaInvoices] = useState<ContractInvoice[]>([]);
  const [chinaTotalCount, setChinaTotalCount] = useState(0);
  const [chinaLoading, setChinaLoading] = useState(true);
  const [chinaSaving, setChinaSaving] = useState(false);

  // China filter state
  const [chinaSearchTerm, setChinaSearchTerm] = useState("");
  const [chinaDebouncedSearch, setChinaDebouncedSearch] = useState("");
  const [chinaFilterClient, setChinaFilterClient] = useState<string[]>([]);
  const [chinaFilterStatus, setChinaFilterStatus] = useState<string[]>(() => {
    const status = searchParams.get("status");
    return status === "pending" ? ["pending"] : [];
  });
  const [chinaFilterDateFrom, setChinaFilterDateFrom] = useState<string>("");
  const [chinaFilterDateTo, setChinaFilterDateTo] = useState<string>("");
  const [chinaActiveFilterPanel, setChinaActiveFilterPanel] = useState<string | null>(null);
  const [chinaFilterPanelSearch, setChinaFilterPanelSearch] = useState("");
  const [chinaFilterOptions, setChinaFilterOptions] = useState<{ customer_names: string[] }>({ customer_names: [] });
  const [chinaDownloading, setChinaDownloading] = useState(false);
  const [chinaCurrentPage, setChinaCurrentPage] = useState(1);

  // China sheet state
  const [chinaSheetOpen, setChinaSheetOpen] = useState(false);
  const [chinaEditingInvoice, setChinaEditingInvoice] = useState<ContractInvoice | null>(null);
  const [chinaFormData, setChinaFormData] = useState<ContractInvoiceFormData>({ ...CHINA_EMPTY_FORM });

  // =====================================================
  // COMERCIALES: Data Fetching
  // =====================================================

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      if (commFilterStatus.length === 1) params.set("payment_status", commFilterStatus[0]);
      else if (commFilterStatus.length > 1) params.set("payment_status", commFilterStatus.join(","));
      if (commFilterDateFrom) params.set("date_from", commFilterDateFrom);
      if (commFilterDateTo) params.set("date_to", commFilterDateTo);

      const res = await fetch(`/api/invoices?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Error al cargar facturas");
        return;
      }

      // Apply client-side client filter (API only supports single client_id)
      let data: InvoiceWithRelations[] = json.data || [];
      if (commFilterClient.length > 0) {
        data = data.filter((inv) =>
          inv.client?.company_name && commFilterClient.includes(inv.client.company_name)
        );
      }

      setInvoices(data);
    } catch {
      toast.error("Error de conexion al cargar facturas");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, commFilterStatus, commFilterDateFrom, commFilterDateTo, commFilterClient]);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [clientsRes, commercialsRes, quotationsRes, vesselsRes] = await Promise.all([
        supabase
          .from("clients")
          .select("id, company_name, trade_name, contact_name, email, country")
          .eq("is_active", true)
          .order("company_name"),
        supabase
          .from("profiles")
          .select("id, full_name, email, role")
          .eq("is_active", true)
          .order("full_name"),
        supabase
          .from("quotations")
          .select("id, quotation_number, client_id, status, total_value_usd")
          .eq("is_active", true)
          .in("status", ["aprobada", "contrato"])
          .order("created_at", { ascending: false }),
        supabase
          .from("vessels")
          .select("id, vessel_name, shipping_line")
          .eq("is_active", true)
          .order("vessel_name"),
      ]);

      if (clientsRes.data) setClients(clientsRes.data as Client[]);
      if (commercialsRes.data) setCommercials(commercialsRes.data as Profile[]);
      if (quotationsRes.data) setQuotations(quotationsRes.data as Quotation[]);
      if (vesselsRes.data) setVessels(vesselsRes.data as Vessel[]);
    } catch {
      console.error("Error fetching reference data");
    }
  }, []);

  useEffect(() => {
    if (profile && profile.role !== "comercial") {
      fetchInvoices();
      fetchReferenceData();
    }
  }, [profile, fetchInvoices, fetchReferenceData]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (profile && profile.role !== "comercial") {
        fetchInvoices();
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm, commFilterStatus, commFilterDateFrom, commFilterDateTo, commFilterClient]);

  // =====================================================
  // COMERCIALES: Invoice Form
  // =====================================================

  const form = useForm<InvoiceFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(invoiceFormSchema) as any,
    defaultValues: {
      client_id: "",
      quotation_id: null,
      commercial_id: "",
      issue_date: format(new Date(), "yyyy-MM-dd"),
      due_date: "",
      currency: "USD",
      exchange_rate: null,
      subtotal: 0,
      tax_percentage: 0,
      tax_amount: 0,
      total_amount: 0,
      total_amount_cop: null,
      items: [{ description: "", quantity: 1, unit: "und", unit_price: 0, total: 0 }],
      incoterm: null,
      port_of_origin: null,
      port_of_destination: null,
      vessel_id: null,
      payment_conditions: null,
      bank_name: "",
      account_number: "",
      swift_code: "",
      iban: "",
      notes: null,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Watch for auto-calculations
  const watchedSubtotal = form.watch("subtotal");
  const watchedTaxPercentage = form.watch("tax_percentage");
  const watchedItems = form.watch("items");
  const watchedCurrency = form.watch("currency");
  const watchedExchangeRate = form.watch("exchange_rate");
  const watchedTotalAmount = form.watch("total_amount");

  // Auto-calculate tax_amount and total_amount
  useEffect(() => {
    const taxAmount = (watchedSubtotal * (watchedTaxPercentage || 0)) / 100;
    form.setValue("tax_amount", Math.round(taxAmount * 100) / 100);
    const total = watchedSubtotal + taxAmount;
    form.setValue("total_amount", Math.round(total * 100) / 100);
  }, [watchedSubtotal, watchedTaxPercentage]);

  // Auto-calculate total_amount_cop
  useEffect(() => {
    if (watchedCurrency === "USD" && watchedExchangeRate && watchedExchangeRate > 0) {
      form.setValue(
        "total_amount_cop",
        Math.round(watchedTotalAmount * watchedExchangeRate * 100) / 100
      );
    }
  }, [watchedTotalAmount, watchedExchangeRate, watchedCurrency]);

  // Auto-calculate item totals and subtotal from items
  useEffect(() => {
    if (watchedItems && watchedItems.length > 0) {
      let newSubtotal = 0;
      watchedItems.forEach((item, index) => {
        const itemTotal = (item.quantity || 0) * (item.unit_price || 0);
        const rounded = Math.round(itemTotal * 100) / 100;
        if (item.total !== rounded) {
          form.setValue(`items.${index}.total`, rounded);
        }
        newSubtotal += rounded;
      });
      const roundedSubtotal = Math.round(newSubtotal * 100) / 100;
      if (roundedSubtotal !== watchedSubtotal) {
        form.setValue("subtotal", roundedSubtotal);
      }
    }
  }, [JSON.stringify(watchedItems?.map((i) => ({ q: i.quantity, p: i.unit_price })))]);

  const resetForm = () => {
    form.reset({
      client_id: "",
      quotation_id: null,
      commercial_id: user?.id || "",
      issue_date: format(new Date(), "yyyy-MM-dd"),
      due_date: "",
      currency: "USD",
      exchange_rate: null,
      subtotal: 0,
      tax_percentage: 0,
      tax_amount: 0,
      total_amount: 0,
      total_amount_cop: null,
      items: [{ description: "", quantity: 1, unit: "und", unit_price: 0, total: 0 }],
      incoterm: null,
      port_of_origin: null,
      port_of_destination: null,
      vessel_id: null,
      payment_conditions: null,
      bank_name: "",
      account_number: "",
      swift_code: "",
      iban: "",
      notes: null,
    });
    setEditingInvoice(null);
    setClientSearch("");
  };

  const openCreateForm = () => {
    resetForm();
    form.setValue("commercial_id", user?.id || "");
    setSheetOpen(true);
  };

  const openEditForm = (invoice: InvoiceWithRelations) => {
    setEditingInvoice(invoice);
    const bankDetails = (invoice.bank_details as Record<string, string>) || {};
    form.reset({
      client_id: invoice.client_id,
      quotation_id: invoice.quotation_id || null,
      commercial_id: invoice.commercial_id,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      currency: invoice.currency || "USD",
      exchange_rate: invoice.exchange_rate || null,
      subtotal: invoice.subtotal,
      tax_percentage: invoice.tax_percentage || 0,
      tax_amount: invoice.tax_amount || 0,
      total_amount: invoice.total_amount,
      total_amount_cop: invoice.total_amount_cop || null,
      items: (invoice.items as InvoiceItem[]) || [
        { description: "", quantity: 1, unit: "und", unit_price: 0, total: 0 },
      ],
      incoterm: invoice.incoterm || null,
      port_of_origin: invoice.port_of_origin || null,
      port_of_destination: invoice.port_of_destination || null,
      vessel_id: invoice.vessel_id || null,
      payment_conditions: invoice.payment_conditions || null,
      bank_name: bankDetails.bank_name || "",
      account_number: bankDetails.account_number || "",
      swift_code: bankDetails.swift_code || "",
      iban: bankDetails.iban || "",
      notes: invoice.notes || null,
    });
    setSheetOpen(true);
  };

  const onSubmit = async (values: InvoiceFormValues) => {
    try {
      setSaving(true);

      // Build bank_details JSON
      const bankDetails: Record<string, string> = {};
      if (values.bank_name) bankDetails.bank_name = values.bank_name;
      if (values.account_number) bankDetails.account_number = values.account_number;
      if (values.swift_code) bankDetails.swift_code = values.swift_code;
      if (values.iban) bankDetails.iban = values.iban;

      const payload: Record<string, unknown> = {
        client_id: values.client_id,
        quotation_id: values.quotation_id || null,
        commercial_id: values.commercial_id,
        issue_date: values.issue_date,
        due_date: values.due_date,
        currency: values.currency,
        exchange_rate: values.exchange_rate || null,
        subtotal: values.subtotal,
        tax_percentage: values.tax_percentage,
        tax_amount: values.tax_amount,
        total_amount: values.total_amount,
        total_amount_cop: values.total_amount_cop || null,
        items: values.items || [],
        incoterm: values.incoterm || null,
        port_of_origin: values.port_of_origin || null,
        port_of_destination: values.port_of_destination || null,
        vessel_id: values.vessel_id || null,
        payment_conditions: values.payment_conditions || null,
        bank_details: Object.keys(bankDetails).length > 0 ? bankDetails : null,
        notes: values.notes || null,
      };

      let res: Response;
      if (editingInvoice) {
        payload.id = editingInvoice.id;
        res = await fetch("/api/invoices", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/invoices", {
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
      toast.error("Error de conexion al guardar la factura");
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // COMERCIALES: Payment Form
  // =====================================================

  const paymentForm = useForm<PaymentFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(paymentFormSchema) as any,
    defaultValues: {
      amount: 0,
      date: format(new Date(), "yyyy-MM-dd"),
      reference: "",
      method: "transferencia",
      notes: "",
    },
  });

  const openPaymentDialog = (invoice: InvoiceWithRelations) => {
    setPaymentInvoice(invoice);
    const existingPayments = (invoice.partial_payments as PartialPayment[]) || [];
    const totalPaid = existingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const remaining = invoice.total_amount - totalPaid;
    paymentForm.reset({
      amount: Math.max(0, Math.round(remaining * 100) / 100),
      date: format(new Date(), "yyyy-MM-dd"),
      reference: "",
      method: "transferencia",
      notes: "",
    });
    setPaymentDialogOpen(true);
  };

  const onSubmitPayment = async (values: PaymentFormValues) => {
    if (!paymentInvoice) return;

    try {
      setSaving(true);

      const newPayment: PartialPayment = {
        amount: values.amount,
        date: values.date,
        reference: values.reference,
        method: values.method,
        notes: values.notes || "",
      };

      const res = await fetch("/api/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: paymentInvoice.id,
          new_partial_payment: newPayment,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Error al registrar el pago");
        return;
      }

      toast.success("Pago registrado exitosamente");
      setPaymentDialogOpen(false);
      setPaymentInvoice(null);
      fetchInvoices();
    } catch {
      toast.error("Error de conexion al registrar el pago");
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // COMERCIALES: Anular Invoice
  // =====================================================

  const handleAnular = async (invoice: InvoiceWithRelations) => {
    if (!confirm("Esta seguro que desea anular esta factura?")) return;

    try {
      setSaving(true);
      const res = await fetch("/api/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: invoice.id,
          payment_status: "anulada",
          status_change_notes: "Factura anulada",
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
  // COMERCIALES: Pagination
  // =====================================================

  const totalPages = Math.ceil(invoices.length / ITEMS_PER_PAGE);
  const paginatedInvoices = invoices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, commFilterStatus, commFilterDateFrom, commFilterDateTo, commFilterClient]);

  // =====================================================
  // COMERCIALES: Filtered clients for searchable dropdown
  // =====================================================

  const filteredClients = clientSearch
    ? clients.filter(
        (c) =>
          c.company_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
          (c.trade_name && c.trade_name.toLowerCase().includes(clientSearch.toLowerCase()))
      )
    : clients;

  // =====================================================
  // === CHINA: Data Fetching ===
  // =====================================================

  // China debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setChinaDebouncedSearch(chinaSearchTerm);
      setChinaCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [chinaSearchTerm]);

  const fetchChinaInvoices = useCallback(async () => {
    try {
      setChinaLoading(true);
      const params = new URLSearchParams();

      if (chinaDebouncedSearch) params.set("search", chinaDebouncedSearch);
      if (chinaFilterClient.length > 0) params.set("customer_name", chinaFilterClient.join(","));
      if (chinaFilterStatus.length === 1) {
        params.set("approved", chinaFilterStatus[0] === "approved" ? "true" : "false");
      }
      if (chinaFilterDateFrom) params.set("date_from", chinaFilterDateFrom);
      if (chinaFilterDateTo) params.set("date_to", chinaFilterDateTo);
      params.set("page", String(chinaCurrentPage));
      params.set("pageSize", String(CHINA_ITEMS_PER_PAGE));

      const res = await fetch(`/api/contract-invoices?${params.toString()}`);
      const json: ChinaFetchResponse = await res.json();

      if (!res.ok) {
        toast.error((json as unknown as { error: string }).error || "Error al cargar facturas de China");
        return;
      }

      setChinaInvoices(json.data || []);
      setChinaTotalCount(json.count || 0);
    } catch {
      toast.error("Error de conexion al cargar facturas de China");
    } finally {
      setChinaLoading(false);
    }
  }, [chinaDebouncedSearch, chinaFilterClient, chinaFilterStatus, chinaFilterDateFrom, chinaFilterDateTo, chinaCurrentPage]);

  const fetchChinaFilterOptions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (chinaFilterClient.length > 0) params.set("customer_name", chinaFilterClient.join(","));
      const res = await fetch(`/api/contract-invoices/filters?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setChinaFilterOptions(json);
      }
    } catch {
      console.error("Error fetching china filter options");
    }
  }, [chinaFilterClient]);

  useEffect(() => {
    if (profile && profile.role !== "comercial") {
      fetchChinaInvoices();
      fetchChinaFilterOptions();
    }
  }, [fetchChinaInvoices, fetchChinaFilterOptions, profile]);

  // Reset china page when filters change
  useEffect(() => {
    setChinaCurrentPage(1);
  }, [chinaFilterClient, chinaFilterStatus, chinaFilterDateFrom, chinaFilterDateTo]);

  // =====================================================
  // CHINA: Summary calculations
  // =====================================================

  const chinaSummary = useMemo(() => {
    const total = chinaInvoices.length;
    const chinaTotal = chinaInvoices.reduce((sum, inv) => sum + (inv.china_invoice_value || 0), 0);
    const customerTotal = chinaInvoices.reduce((sum, inv) => sum + (inv.customer_invoice_value || 0), 0);
    const approvedCount = chinaInvoices.filter((inv) => inv.approved).length;

    return { total, chinaTotal, customerTotal, approvedCount };
  }, [chinaInvoices]);

  // =====================================================
  // CHINA: Pagination
  // =====================================================

  const chinaTotalPages = Math.max(1, Math.ceil(chinaTotalCount / CHINA_ITEMS_PER_PAGE));
  const chinaShowingFrom = chinaTotalCount === 0 ? 0 : (chinaCurrentPage - 1) * CHINA_ITEMS_PER_PAGE + 1;
  const chinaShowingTo = Math.min(chinaCurrentPage * CHINA_ITEMS_PER_PAGE, chinaTotalCount);

  // =====================================================
  // CHINA: Form handlers
  // =====================================================

  const chinaResetForm = useCallback(() => {
    setChinaFormData({ ...CHINA_EMPTY_FORM });
    setChinaEditingInvoice(null);
  }, []);

  const openCreateChinaForm = () => {
    chinaResetForm();
    setChinaSheetOpen(true);
  };

  const openEditChinaForm = (invoice: ContractInvoice) => {
    setChinaEditingInvoice(invoice);
    setChinaFormData({
      invoice_date: invoice.invoice_date || new Date().toISOString().split("T")[0],
      customer_name: invoice.customer_name || "",
      china_invoice_number: invoice.china_invoice_number || "",
      china_invoice_value: invoice.china_invoice_value ?? "",
      customer_contract: invoice.customer_contract || "",
      customer_invoice_value: invoice.customer_invoice_value ?? "",
      approved: invoice.approved || false,
      notes: invoice.notes || "",
    });
    setChinaSheetOpen(true);
  };

  const handleChinaFieldChange = (field: keyof ContractInvoiceFormData, value: string | number | boolean) => {
    setChinaFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleChinaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!chinaFormData.customer_name.trim()) {
      toast.error("El nombre del cliente es requerido");
      return;
    }

    try {
      setChinaSaving(true);

      const payload: Record<string, unknown> = {
        invoice_date: chinaFormData.invoice_date || null,
        customer_name: chinaFormData.customer_name.trim(),
        china_invoice_number: chinaFormData.china_invoice_number.trim() || null,
        china_invoice_value: chinaFormData.china_invoice_value !== "" ? Number(chinaFormData.china_invoice_value) : null,
        customer_contract: chinaFormData.customer_contract.trim() || null,
        customer_invoice_value: chinaFormData.customer_invoice_value !== "" ? Number(chinaFormData.customer_invoice_value) : null,
        approved: chinaFormData.approved,
        notes: chinaFormData.notes.trim() || null,
      };

      let res: Response;

      if (chinaEditingInvoice) {
        payload.id = chinaEditingInvoice.id;
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
        chinaEditingInvoice
          ? "Factura actualizada exitosamente"
          : "Factura creada exitosamente"
      );
      setChinaSheetOpen(false);
      chinaResetForm();
      fetchChinaInvoices();
    } catch {
      toast.error("Error de conexion al guardar");
    } finally {
      setChinaSaving(false);
    }
  };

  // =====================================================
  // CHINA: Approve / Disapprove
  // =====================================================

  const handleChinaToggleApproved = async (invoice: ContractInvoice) => {
    try {
      setChinaSaving(true);
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
        toast.error(json.error || "Error al cambiar estado de aprobación");
        return;
      }

      toast.success(
        invoice.approved
          ? "Factura marcada como pendiente"
          : "Factura aprobada exitosamente"
      );
      fetchChinaInvoices();
    } catch {
      toast.error("Error de conexion");
    } finally {
      setChinaSaving(false);
    }
  };

  // =====================================================
  // CHINA: Anular (soft delete)
  // =====================================================

  const handleChinaAnular = async (invoice: ContractInvoice) => {
    if (!confirm("¿Esta seguro que desea anular esta factura? Esta accion no se puede deshacer.")) return;

    try {
      setChinaSaving(true);
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
      fetchChinaInvoices();
    } catch {
      toast.error("Error de conexion");
    } finally {
      setChinaSaving(false);
    }
  };

  // =====================================================
  // CHINA: Clear filters
  // =====================================================

  // =====================================================
  // Shared filter helpers
  // =====================================================

  const toggleFilterValue = (
    current: string[],
    setter: (v: string[]) => void,
    value: string
  ) => {
    if (current.includes(value)) {
      setter(current.filter((v) => v !== value));
    } else {
      setter([...current, value]);
    }
  };

  const filterDisplayText = (selected: string[], placeholder = "Todos") => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) return selected[0];
    return `${selected.length} seleccionados`;
  };

  // =====================================================
  // CHINA: Active filters & clear
  // =====================================================

  const chinaHasActiveFilters = chinaSearchTerm !== "" || chinaFilterClient.length > 0 || chinaFilterStatus.length > 0 || chinaFilterDateFrom !== "" || chinaFilterDateTo !== "";

  const chinaPopoverFilterCount = chinaFilterClient.length + chinaFilterStatus.length;

  const chinaClearFilters = () => {
    setChinaSearchTerm("");
    setChinaDebouncedSearch("");
    setChinaFilterClient([]);
    setChinaFilterStatus([]);
    setChinaFilterDateFrom("");
    setChinaFilterDateTo("");
    setChinaCurrentPage(1);
  };

  // =====================================================
  // COMERCIALES: Active filters & clear
  // =====================================================

  const commHasActiveFilters = searchTerm !== "" || commFilterClient.length > 0 || commFilterStatus.length > 0 || commFilterDateFrom !== "" || commFilterDateTo !== "";

  const commPopoverFilterCount = commFilterClient.length + commFilterStatus.length;

  const commClearFilters = () => {
    setSearchTerm("");
    setCommFilterClient([]);
    setCommFilterStatus([]);
    setCommFilterDateFrom("");
    setCommFilterDateTo("");
    setCurrentPage(1);
  };

  // Unique client names from loaded clients for commercial filter options
  const commClientNames = useMemo(() =>
    [...new Set(clients.map((c) => c.company_name).filter(Boolean))].sort(),
    [clients]
  );

  // =====================================================
  // CHINA: Excel Export
  // =====================================================

  const handleChinaDownloadExcel = async () => {
    try {
      setChinaDownloading(true);
      toast.info("Generando reporte Excel...");

      const params = new URLSearchParams();
      if (chinaDebouncedSearch) params.set("search", chinaDebouncedSearch);
      if (chinaFilterClient.length > 0) params.set("customer_name", chinaFilterClient.join(","));
      if (chinaFilterStatus.length === 1) {
        params.set("approved", chinaFilterStatus[0] === "approved" ? "true" : "false");
      }
      if (chinaFilterDateFrom) params.set("date_from", chinaFilterDateFrom);
      if (chinaFilterDateTo) params.set("date_to", chinaFilterDateTo);
      params.set("page", "1");
      params.set("pageSize", "5000");

      const res = await fetch(`/api/contract-invoices?${params.toString()}`);
      if (!res.ok) throw new Error("Error al obtener las facturas");
      const { data: allInvoices } = await res.json();
      const exportData: ContractInvoice[] = allInvoices || [];

      const excelMod = await import("exceljs");
      const ExcelJS = excelMod.default || excelMod;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "IBC Steel Group - IBC Core";
      workbook.created = new Date();

      const ws = workbook.addWorksheet("Facturas", {
        properties: { defaultColWidth: 16 },
        views: [{ state: "frozen" as const, ySplit: 3 }],
      });

      const NAVY = "1E3A5F";
      const ACCENT_GOLD = "C9A227";
      const WHITE = "FFFFFF";
      const TEXT_DARK = "1A202C";

      const statusStyles: Record<string, { bg: string; text: string }> = {
        approved: { bg: "DCFCE7", text: "166534" },
        pending: { bg: "FEF3C7", text: "92400E" },
      };

      ws.columns = [
        { key: "invoice_date", width: 13 },
        { key: "customer_name", width: 28 },
        { key: "china_invoice_number", width: 22 },
        { key: "china_invoice_value", width: 18 },
        { key: "customer_contract", width: 22 },
        { key: "customer_invoice_value", width: 18 },
        { key: "status", width: 14 },
        { key: "notes", width: 34 },
      ];

      const totalCols = ws.columns.length;

      const fmtDate = (d: string | null | undefined) => {
        if (!d) return "";
        try {
          const parts = d.split("T")[0].split("-");
          if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
          return d;
        } catch { return d; }
      };

      const now = new Date();
      const dateStr = now.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });

      // Build filter description
      const filterDesc: string[] = [];
      if (chinaFilterClient.length) filterDesc.push(`Cliente: ${chinaFilterClient.join(", ")}`);
      if (chinaFilterStatus.length) filterDesc.push(`Estado: ${chinaFilterStatus.map((s) => s === "approved" ? "Aprobada" : "Pendiente").join(", ")}`);
      if (chinaFilterDateFrom || chinaFilterDateTo) filterDesc.push(`Fecha: ${chinaFilterDateFrom || "..."} a ${chinaFilterDateTo || "..."}`);
      if (chinaDebouncedSearch) filterDesc.push(`Búsqueda: "${chinaDebouncedSearch}"`);

      // KPI values
      const totalChinaVal = exportData.reduce((s, c) => s + (c.china_invoice_value || 0), 0);
      const totalCustomerVal = exportData.reduce((s, c) => s + (c.customer_invoice_value || 0), 0);

      // ROW 1: Unified header
      const r1 = ws.addRow([""]);
      ws.mergeCells(1, 1, 1, totalCols);
      const c1 = ws.getCell("A1");
      c1.value = { richText: [
        { text: "IBC", font: { name: "Aptos", size: 16, bold: true, color: { argb: WHITE } } },
        { text: "  STEEL GROUP", font: { name: "Aptos", size: 12, color: { argb: "FFFFFF" } } },
        { text: `          REPORTE DE FACTURAS CHINA`, font: { name: "Aptos", size: 10, bold: true, color: { argb: "FFFFFF" } } },
        { text: `     ${dateStr}  ·  ${exportData.length} registros`, font: { name: "Aptos", size: 9, color: { argb: "D0DCE8" } } },
        ...(filterDesc.length > 0 ? [{ text: `     ${filterDesc.join(" · ")}`, font: { name: "Aptos", size: 8, italic: true, color: { argb: "A8BED4" } } }] : []),
      ] };
      c1.alignment = { horizontal: "left", vertical: "middle", indent: 2 };
      c1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      r1.height = 40;
      for (let col = 1; col <= totalCols; col++) {
        const cell = r1.getCell(col);
        if (col > 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        cell.border = { bottom: { style: "medium" as const, color: { argb: "FFFFFF" } } };
      }

      // ROW 2: Spacer
      const r2 = ws.addRow([""]);
      ws.mergeCells(2, 1, 2, totalCols);
      r2.height = 5;
      for (let col = 1; col <= totalCols; col++) {
        r2.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
      }

      // ROW 3: Column Headers
      const colHeaders = ["FECHA", "CLIENTE", "# FACTURA CHINA", "VALOR CHINA", "FACTURA CLIENTE", "VALOR CLIENTE", "ESTADO", "NOTAS"];
      const headerRow = ws.addRow(colHeaders);
      headerRow.height = 32;
      headerRow.eachCell((cell, colNumber) => {
        cell.font = { name: "Aptos", size: 9, bold: true, color: { argb: WHITE } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        cell.border = {
          bottom: { style: "thin" as const, color: { argb: "FFFFFF" } },
          left: { style: "thin" as const, color: { argb: "2D5A8A" } },
          right: { style: "thin" as const, color: { argb: "2D5A8A" } },
          top: { style: "thin" as const, color: { argb: "2D5A8A" } },
        };
      });

      // DATA ROWS
      exportData.forEach((c, idx) => {
        const row = ws.addRow([
          fmtDate(c.invoice_date),
          c.customer_name || "",
          c.china_invoice_number || "",
          c.china_invoice_value ?? "",
          c.customer_contract || "",
          c.customer_invoice_value ?? "",
          c.approved ? "Aprobada" : "Pendiente",
          c.notes || "",
        ]);

        const isEven = idx % 2 === 0;
        const rowBg = isEven ? WHITE : "F8F7F5";

        row.eachCell((cell, colNumber) => {
          cell.font = { name: "Aptos", size: 9.5, color: { argb: TEXT_DARK } };
          cell.alignment = { vertical: "middle", wrapText: colNumber === 8 };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
          cell.border = {
            bottom: { style: "thin" as const, color: { argb: "EDECEA" } },
            left: colNumber === 1
              ? { style: "thin" as const, color: { argb: "D4D2CD" } }
              : { style: "hair" as const, color: { argb: "E8E6E1" } },
            right: colNumber === totalCols
              ? { style: "thin" as const, color: { argb: "D4D2CD" } }
              : { style: "hair" as const, color: { argb: "E8E6E1" } },
          };

          // Status column (col 7)
          if (colNumber === 7) {
            const st = c.approved ? statusStyles.approved : statusStyles.pending;
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: st.bg } };
            cell.font = { name: "Aptos", size: 9, bold: true, color: { argb: st.text } };
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }

          // Value columns right-aligned (col 4, 6)
          if (colNumber === 4 || colNumber === 6) {
            cell.alignment = { horizontal: "right", vertical: "middle" };
            if (typeof cell.value === "number") cell.numFmt = '"$"#,##0.00';
          }

          // Center date (col 1)
          if (colNumber === 1) cell.alignment = { horizontal: "center", vertical: "middle" };

          // Bold invoice number (col 3)
          if (colNumber === 3 && cell.value) {
            cell.font = { name: "Aptos", size: 9.5, bold: true, color: { argb: NAVY } };
          }
        });

        row.height = 26;
      });

      // TOTALS ROW
      const totalsRow = ws.addRow([]);
      for (let col = 1; col <= totalCols; col++) {
        const cell = totalsRow.getCell(col);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: WHITE } };
        cell.border = {
          top: { style: "medium" as const, color: { argb: "FFFFFF" } },
          bottom: { style: "medium" as const, color: { argb: NAVY } },
        };
      }
      totalsRow.getCell(3).value = "TOTALES";
      totalsRow.getCell(3).font = { name: "Aptos", size: 10, bold: true, color: { argb: "FFFFFF" } };
      totalsRow.getCell(3).alignment = { horizontal: "right", vertical: "middle" };
      totalsRow.getCell(4).value = totalChinaVal;
      totalsRow.getCell(4).numFmt = '"$"#,##0.00';
      totalsRow.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
      totalsRow.getCell(6).value = totalCustomerVal;
      totalsRow.getCell(6).numFmt = '"$"#,##0.00';
      totalsRow.getCell(6).alignment = { horizontal: "right", vertical: "middle" };
      totalsRow.height = 26;

      // FOOTER
      const emptyRow = ws.addRow([""]);
      emptyRow.height = 6;
      const footerRow = ws.addRow([""]);
      ws.mergeCells(footerRow.number, 1, footerRow.number, totalCols);
      const footerCell = ws.getCell(`A${footerRow.number}`);
      footerCell.value = { richText: [
        { text: "IBC Core", font: { name: "Aptos", size: 8.5, bold: true, color: { argb: "1E3A5F" } } },
        { text: `  ·  Generado: ${now.toLocaleString("es-CO")}  ·  © ${now.getFullYear()} IBC STEEL GROUP`, font: { name: "Aptos", size: 8, italic: true, color: { argb: "9CA3B4" } } },
      ] };
      footerCell.alignment = { horizontal: "center", vertical: "middle" };
      footerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FAF9F7" } };
      footerCell.border = { top: { style: "thin" as const, color: { argb: "E8E6E1" } } };
      footerRow.height = 20;

      ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: totalCols } };
      ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Facturas_China_IBC_${now.toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Reporte Excel descargado exitosamente");
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.error("Error al generar el reporte Excel");
    } finally {
      setChinaDownloading(false);
    }
  };

  // =====================================================
  // COMERCIALES: Excel Export
  // =====================================================

  const handleCommDownloadExcel = async () => {
    try {
      setCommDownloading(true);
      toast.info("Generando reporte Excel...");

      // Fetch all with current filters
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      if (commFilterStatus.length === 1) params.set("payment_status", commFilterStatus[0]);
      else if (commFilterStatus.length > 1) params.set("payment_status", commFilterStatus.join(","));
      if (commFilterDateFrom) params.set("date_from", commFilterDateFrom);
      if (commFilterDateTo) params.set("date_to", commFilterDateTo);

      const res = await fetch(`/api/invoices?${params.toString()}`);
      if (!res.ok) throw new Error("Error al obtener las facturas");
      const { data: allInvoices } = await res.json();

      let exportData: InvoiceWithRelations[] = allInvoices || [];
      if (commFilterClient.length > 0) {
        exportData = exportData.filter((inv) =>
          inv.client?.company_name && commFilterClient.includes(inv.client.company_name)
        );
      }

      const excelMod = await import("exceljs");
      const ExcelJS = excelMod.default || excelMod;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "IBC Steel Group - IBC Core";
      workbook.created = new Date();

      const ws = workbook.addWorksheet("Facturación", {
        properties: { defaultColWidth: 16 },
        views: [{ state: "frozen" as const, ySplit: 3 }],
      });

      const NAVY = "1E3A5F";
      const ACCENT_GOLD = "C9A227";
      const WHITE = "FFFFFF";
      const TEXT_DARK = "1A202C";

      const paymentStatusStyles: Record<string, { bg: string; text: string }> = {
        pendiente: { bg: "FEF3C7", text: "92400E" },
        parcial: { bg: "DBEAFE", text: "1E40AF" },
        pagada: { bg: "DCFCE7", text: "166534" },
        vencida: { bg: "FEE2E2", text: "991B1B" },
        anulada: { bg: "E2E8F0", text: "475569" },
      };

      ws.columns = [
        { key: "invoice_number", width: 18 },
        { key: "client_name", width: 26 },
        { key: "commercial_name", width: 20 },
        { key: "issue_date", width: 14 },
        { key: "due_date", width: 14 },
        { key: "currency", width: 10 },
        { key: "subtotal", width: 16 },
        { key: "tax_amount", width: 14 },
        { key: "total_amount", width: 16 },
        { key: "payment_status", width: 16 },
        { key: "notes", width: 30 },
      ];

      const totalCols = ws.columns.length;

      const fmtDate = (d: string | null | undefined) => {
        if (!d) return "";
        try {
          const parts = d.split("T")[0].split("-");
          if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
          return d;
        } catch { return d; }
      };

      const now = new Date();
      const dateStr = now.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });

      // Build filter description
      const filterDesc: string[] = [];
      if (commFilterClient.length) filterDesc.push(`Cliente: ${commFilterClient.join(", ")}`);
      if (commFilterStatus.length) filterDesc.push(`Estado: ${commFilterStatus.join(", ")}`);
      if (commFilterDateFrom || commFilterDateTo) filterDesc.push(`Fecha: ${commFilterDateFrom || "..."} a ${commFilterDateTo || "..."}`);
      if (searchTerm) filterDesc.push(`Búsqueda: "${searchTerm}"`);

      // KPI values
      const totalSubtotal = exportData.reduce((s, inv) => s + (inv.subtotal || 0), 0);
      const totalTax = exportData.reduce((s, inv) => s + (inv.tax_amount || 0), 0);
      const totalAmount = exportData.reduce((s, inv) => s + (inv.total_amount || 0), 0);

      // ROW 1: Unified header
      const r1 = ws.addRow([""]);
      ws.mergeCells(1, 1, 1, totalCols);
      const c1 = ws.getCell("A1");
      c1.value = { richText: [
        { text: "IBC", font: { name: "Aptos", size: 16, bold: true, color: { argb: WHITE } } },
        { text: "  STEEL GROUP", font: { name: "Aptos", size: 12, color: { argb: "FFFFFF" } } },
        { text: `          REPORTE DE FACTURACIÓN`, font: { name: "Aptos", size: 10, bold: true, color: { argb: "FFFFFF" } } },
        { text: `     ${dateStr}  ·  ${exportData.length} registros`, font: { name: "Aptos", size: 9, color: { argb: "D0DCE8" } } },
        ...(filterDesc.length > 0 ? [{ text: `     ${filterDesc.join(" · ")}`, font: { name: "Aptos", size: 8, italic: true, color: { argb: "A8BED4" } } }] : []),
      ] };
      c1.alignment = { horizontal: "left", vertical: "middle", indent: 2 };
      c1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      r1.height = 40;
      for (let col = 1; col <= totalCols; col++) {
        const cell = r1.getCell(col);
        if (col > 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        cell.border = { bottom: { style: "medium" as const, color: { argb: "FFFFFF" } } };
      }

      // ROW 2: Spacer
      const r2 = ws.addRow([""]);
      ws.mergeCells(2, 1, 2, totalCols);
      r2.height = 5;
      for (let col = 1; col <= totalCols; col++) {
        r2.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
      }

      // ROW 3: Column Headers
      const colHeaders = ["Nº FACTURA", "CLIENTE", "COMERCIAL", "FECHA EMISIÓN", "FECHA VENCIMIENTO", "MONEDA", "SUBTOTAL", "IVA", "TOTAL", "ESTADO PAGO", "NOTAS"];
      const headerRow = ws.addRow(colHeaders);
      headerRow.height = 32;
      headerRow.eachCell((cell, colNumber) => {
        cell.font = { name: "Aptos", size: 9, bold: true, color: { argb: WHITE } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        cell.border = {
          bottom: { style: "thin" as const, color: { argb: "FFFFFF" } },
          left: { style: "thin" as const, color: { argb: "2D5A8A" } },
          right: { style: "thin" as const, color: { argb: "2D5A8A" } },
          top: { style: "thin" as const, color: { argb: "2D5A8A" } },
        };
      });

      // DATA ROWS
      exportData.forEach((inv, idx) => {
        const row = ws.addRow([
          inv.invoice_number || "",
          inv.client?.company_name || "",
          inv.commercial?.full_name || "",
          fmtDate(inv.issue_date),
          fmtDate(inv.due_date),
          inv.currency || "USD",
          inv.subtotal ?? "",
          inv.tax_amount ?? "",
          inv.total_amount ?? "",
          PAYMENT_STATUS_LABELS[inv.payment_status || "pendiente"] || inv.payment_status || "",
          inv.notes || "",
        ]);

        const isEven = idx % 2 === 0;
        const rowBg = isEven ? WHITE : "F8F7F5";

        row.eachCell((cell, colNumber) => {
          cell.font = { name: "Aptos", size: 9.5, color: { argb: TEXT_DARK } };
          cell.alignment = { vertical: "middle", wrapText: colNumber === 11 };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
          cell.border = {
            bottom: { style: "thin" as const, color: { argb: "EDECEA" } },
            left: colNumber === 1
              ? { style: "thin" as const, color: { argb: "D4D2CD" } }
              : { style: "hair" as const, color: { argb: "E8E6E1" } },
            right: colNumber === totalCols
              ? { style: "thin" as const, color: { argb: "D4D2CD" } }
              : { style: "hair" as const, color: { argb: "E8E6E1" } },
          };

          // Payment status column (col 10)
          if (colNumber === 10 && inv.payment_status) {
            const st = paymentStatusStyles[inv.payment_status] || { bg: "E2E8F0", text: "475569" };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: st.bg } };
            cell.font = { name: "Aptos", size: 9, bold: true, color: { argb: st.text } };
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }

          // Money columns right-aligned (col 7, 8, 9)
          if ([7, 8, 9].includes(colNumber)) {
            cell.alignment = { horizontal: "right", vertical: "middle" };
            if (typeof cell.value === "number") cell.numFmt = '"$"#,##0.00';
          }

          // Center dates and currency (col 4, 5, 6)
          if ([4, 5, 6].includes(colNumber)) cell.alignment = { horizontal: "center", vertical: "middle" };

          // Bold invoice number (col 1)
          if (colNumber === 1 && cell.value) {
            cell.font = { name: "Aptos", size: 9.5, bold: true, color: { argb: NAVY } };
          }
        });

        row.height = 26;
      });

      // TOTALS ROW
      const totalsRow = ws.addRow([]);
      for (let col = 1; col <= totalCols; col++) {
        const cell = totalsRow.getCell(col);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: WHITE } };
        cell.border = {
          top: { style: "medium" as const, color: { argb: "FFFFFF" } },
          bottom: { style: "medium" as const, color: { argb: NAVY } },
        };
      }
      totalsRow.getCell(6).value = "TOTALES";
      totalsRow.getCell(6).font = { name: "Aptos", size: 10, bold: true, color: { argb: "FFFFFF" } };
      totalsRow.getCell(6).alignment = { horizontal: "right", vertical: "middle" };
      totalsRow.getCell(7).value = totalSubtotal;
      totalsRow.getCell(7).numFmt = '"$"#,##0.00';
      totalsRow.getCell(7).alignment = { horizontal: "right", vertical: "middle" };
      totalsRow.getCell(8).value = totalTax;
      totalsRow.getCell(8).numFmt = '"$"#,##0.00';
      totalsRow.getCell(8).alignment = { horizontal: "right", vertical: "middle" };
      totalsRow.getCell(9).value = totalAmount;
      totalsRow.getCell(9).numFmt = '"$"#,##0.00';
      totalsRow.getCell(9).alignment = { horizontal: "right", vertical: "middle" };
      totalsRow.height = 26;

      // FOOTER
      const emptyRow = ws.addRow([""]);
      emptyRow.height = 6;
      const footerRow = ws.addRow([""]);
      ws.mergeCells(footerRow.number, 1, footerRow.number, totalCols);
      const footerCell = ws.getCell(`A${footerRow.number}`);
      footerCell.value = { richText: [
        { text: "IBC Core", font: { name: "Aptos", size: 8.5, bold: true, color: { argb: "1E3A5F" } } },
        { text: `  ·  Generado: ${now.toLocaleString("es-CO")}  ·  © ${now.getFullYear()} IBC STEEL GROUP`, font: { name: "Aptos", size: 8, italic: true, color: { argb: "9CA3B4" } } },
      ] };
      footerCell.alignment = { horizontal: "center", vertical: "middle" };
      footerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FAF9F7" } };
      footerCell.border = { top: { style: "thin" as const, color: { argb: "E8E6E1" } } };
      footerRow.height = 20;

      ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: totalCols } };
      ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Facturacion_IBC_${now.toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Reporte Excel descargado exitosamente");
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.error("Error al generar el reporte Excel");
    } finally {
      setCommDownloading(false);
    }
  };

  // =====================================================
  // Render
  // =====================================================

  if (authLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 384 }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: T.accent }} />
      </div>
    );
  }

  if (profile?.role === "comercial") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 384, gap: 16 }}>
        <XCircle style={{ width: 64, height: 64, color: T.danger }} />
        <h2 style={{ fontSize: 20, fontWeight: 600, color: T.inkSoft }}>No tiene permisos</h2>
        <p style={{ color: T.inkMuted }}>Su rol no tiene acceso al módulo de facturas.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ─── CSS KEYFRAMES ─── */}
      <style>{`
        @keyframes invFadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes invSlideRight{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
        @keyframes invPulse{0%,100%{opacity:1}50%{opacity:.6}}
      `}</style>

      {/* ─── BREADCRUMB ─── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, animation: "invFadeUp 0.3s ease both", fontSize: 12.5, color: T.inkLight }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 4, color: T.accent, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>{Ic.home} Inicio</Link>
        <span style={{ color: T.inkGhost }}>/</span>
        <span style={{ fontWeight: 600, color: T.inkMuted }}>Facturas</span>
      </div>

      {/* ─── HEADER BANNER ─── */}
      <div style={{
        position: "relative", overflow: "hidden", borderRadius: 14,
        background: "linear-gradient(135deg, #1E3A5F 0%, #2a4d7a 50%, #3B82F6 100%)",
        padding: "14px 24px", marginBottom: 16,
        boxShadow: "0 4px 24px rgba(30,58,95,0.18)",
        animation: "invFadeUp 0.4s ease both",
      }}>
        <div style={{
          position: "absolute", inset: 0, opacity: 0.07,
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "20px 20px",
        }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
            }}>{Ic.receipt}</div>
            <div>
              <h1 style={{
                fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                fontSize: 18, fontWeight: 800, color: "#fff",
                letterSpacing: "-0.02em", lineHeight: 1.2, margin: 0,
              }}>Facturas</h1>
              <p style={{ fontSize: 12, color: "rgba(191,219,254,0.7)", fontWeight: 500, margin: 0 }}>
                Gestión de facturas comerciales y de proveedores chinos
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={activeTab === "comerciales" ? handleCommDownloadExcel : handleChinaDownloadExcel}
              disabled={activeTab === "comerciales" ? commDownloading : chinaDownloading}
              style={{
                padding: "7px 14px", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)",
                color: "#fff", fontWeight: 600, fontSize: 12,
                cursor: "pointer", fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                display: "flex", alignItems: "center", gap: 5,
                transition: "all 0.2s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
            >
              {(activeTab === "comerciales" ? commDownloading : chinaDownloading) ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <span style={{ display: "flex" }}>{Ic.download}</span>
              )}
              Descargar Excel
            </button>
            <button
              onClick={activeTab === "comerciales" ? openCreateForm : openCreateChinaForm}
              style={{
                padding: "7px 16px", borderRadius: 8, border: "none",
                background: "#fff", color: "#1E3A5F", fontWeight: 700, fontSize: 12,
                cursor: "pointer", fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                display: "flex", alignItems: "center", gap: 5,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)"; }}
            >
              <span style={{ display: "flex" }}>{Ic.plus}</span> Nueva Factura
            </button>
          </div>
        </div>
      </div>

      {/* ─── TAB SYSTEM ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div style={{
          display: "inline-flex", gap: 4, padding: 4, borderRadius: 14,
          background: T.surfaceAlt, border: `1px solid ${T.borderLight}`, boxShadow: T.shadow,
          animation: "invFadeUp 0.5s ease 0.1s both",
        }}>
          {[
            { key: "comerciales", label: "FACTURACIÓN", icon: Ic.file },
            { key: "china", label: "FACTURAS", icon: Ic.receipt },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 24px",
                borderRadius: 10, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                letterSpacing: "0.5px", fontFamily: "'DM Sans',sans-serif", transition: "all 0.25s",
                background: activeTab === tab.key ? T.surface : "transparent",
                color: activeTab === tab.key ? T.accent : T.inkMuted,
                boxShadow: activeTab === tab.key ? T.shadowMd : "none",
              }}
            >
              <span style={{ display: "flex", opacity: activeTab === tab.key ? 1 : 0.5 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* =====================================================
            TAB: Facturas Comerciales
            ===================================================== */}
        <TabsContent value="comerciales" style={{ display: activeTab === "comerciales" ? "flex" : "none", flexDirection: "column", gap: 16, marginTop: 16 }}>
          {/* ─── FILTER BAR ─── */}
          <InvCard style={{ padding: "14px 18px" }} delay={120}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 320 }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", display: "flex", color: T.inkLight }}>{Ic.search}</span>
                <Input
                  placeholder="Nº factura o cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: 36, height: 40, fontSize: 13, borderRadius: T.radiusSm, borderColor: T.border, background: T.surfaceAlt, fontFamily: "'DM Sans',sans-serif" }}
                />
              </div>

              {/* Popover Filters */}
              <Popover onOpenChange={(open) => { if (!open) { setCommActiveFilterPanel(null); setCommFilterPanelSearch(""); } }}>
                <PopoverTrigger asChild>
                  <button style={{
                    display: "flex", alignItems: "center", gap: 6, height: 40, padding: "0 16px",
                    borderRadius: T.radiusSm, border: `1px solid ${T.border}`, background: T.surface,
                    color: T.inkSoft, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s",
                  }}>
                    <span style={{ display: "flex" }}>{Ic.filter}</span> Filtros
                    {commPopoverFilterCount > 0 && (
                      <span style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        minWidth: 20, height: 20, padding: "0 6px", borderRadius: 10,
                        background: T.accent, color: "#fff", fontSize: 10, fontWeight: 700,
                      }}>{commPopoverFilterCount}</span>
                    )}
                  </button>
                </PopoverTrigger>
              <PopoverContent className="w-[400px] max-h-[70vh] p-0 overflow-hidden rounded-2xl border-slate-200/80 shadow-xl shadow-slate-900/10 flex flex-col" align="start" sideOffset={8}>
                {commActiveFilterPanel === null ? (
                  <>
                    <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                      <h4 className="text-sm font-semibold text-slate-800">Filtros</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Seleccione una categoría</p>
                    </div>
                    <div className="p-2 space-y-0.5">
                      {[
                        { key: "client", label: "Cliente", selected: commFilterClient, icon: Building2 },
                        { key: "status", label: "Estado de Pago", selected: commFilterStatus, icon: ClipboardCheck },
                      ].map((cat) => (
                        <button
                          key={cat.key}
                          onClick={() => { setCommActiveFilterPanel(cat.key); setCommFilterPanelSearch(""); }}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-slate-50/50 transition-all duration-150 text-left group"
                        >
                          <div className="flex items-center gap-2.5">
                            <cat.icon className="h-4 w-4 text-slate-400 group-hover:text-[#1E3A5F] transition-colors" />
                            <span className="text-sm text-slate-700 group-hover:text-slate-900 font-medium">{cat.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {cat.selected.length > 0 && (
                              <Badge className="h-5 min-w-[20px] px-1.5 text-[10px] bg-gradient-to-r from-[#1E3A5F] to-blue-600 text-white border-0 shadow-sm">
                                {cat.selected.length}
                              </Badge>
                            )}
                            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </button>
                      ))}
                    </div>
                    {commPopoverFilterCount > 0 && (
                      <div className="px-3 py-2.5 border-t border-slate-100">
                        <Button variant="ghost" size="sm" onClick={commClearFilters} className="w-full h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg">
                          <X className="h-3 w-3 mr-1" /> Limpiar todos los filtros
                        </Button>
                      </div>
                    )}
                  </>
                ) : (() => {
                  const commPanelConfig: Record<string, { label: string; options: { value: string; label: string }[]; selected: string[]; setter: (v: string[]) => void }> = {
                    client: {
                      label: "Cliente",
                      options: commClientNames.map((n) => ({ value: n, label: n })),
                      selected: commFilterClient,
                      setter: setCommFilterClient,
                    },
                    status: {
                      label: "Estado de Pago",
                      options: [
                        { value: "pendiente", label: "Pendiente" },
                        { value: "parcial", label: "Parcial" },
                        { value: "pagada", label: "Pagada" },
                        { value: "vencida", label: "Vencida" },
                        { value: "anulada", label: "Anulada" },
                      ],
                      selected: commFilterStatus,
                      setter: setCommFilterStatus,
                    },
                  };
                  const config = commPanelConfig[commActiveFilterPanel];
                  if (!config) return null;
                  const searchLower = commFilterPanelSearch.toLowerCase();
                  const filteredOptions = commFilterPanelSearch
                    ? config.options.filter((o) => o.label.toLowerCase().includes(searchLower))
                    : config.options;

                  return (
                    <div className="flex flex-col max-h-[60vh]">
                      <div className="px-3 py-2.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center gap-2">
                        <button onClick={() => { setCommActiveFilterPanel(null); setCommFilterPanelSearch(""); }} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
                          <ArrowLeft className="h-4 w-4 text-slate-500" />
                        </button>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800">{config.label}</h4>
                          <p className="text-[11px] text-slate-400">{config.selected.length} seleccionados</p>
                        </div>
                      </div>
                      {config.options.length > 5 && (
                        <div className="px-3 py-2 border-b border-slate-50">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                              placeholder="Buscar..."
                              value={commFilterPanelSearch}
                              onChange={(e) => setCommFilterPanelSearch(e.target.value)}
                              className="pl-8 h-8 text-xs rounded-lg border-slate-200"
                            />
                          </div>
                        </div>
                      )}
                      <div className="px-2 py-1 border-b border-slate-50 flex items-center justify-between">
                        <button onClick={() => config.setter(config.options.map((o) => o.value))} className="text-[11px] text-blue-600 hover:text-blue-800 font-medium px-1">
                          Seleccionar todo
                        </button>
                        {config.selected.length > 0 && (
                          <button onClick={() => config.setter([])} className="text-[11px] text-red-500 hover:text-red-700 font-medium px-1">
                            Limpiar
                          </button>
                        )}
                      </div>
                      <div className="overflow-y-auto flex-1">
                        <div className="p-1.5">
                          {filteredOptions.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4">Sin resultados</p>
                          ) : (
                            filteredOptions.map((opt) => (
                              <label key={opt.value} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded hover:bg-slate-50 cursor-pointer transition-colors">
                                <Checkbox checked={config.selected.includes(opt.value)} onCheckedChange={() => toggleFilterValue(config.selected, config.setter, opt.value)} className="h-4 w-4" />
                                <span className="text-sm text-slate-700 truncate">{opt.label}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </PopoverContent>
            </Popover>

              {/* Date range filter */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                <CalendarIcon style={{ width: 16, height: 16, color: T.inkLight, flexShrink: 0 }} />
                <Input type="date" value={commFilterDateFrom} onChange={(e) => setCommFilterDateFrom(e.target.value)}
                  style={{ width: 140, height: 40, fontSize: 13, borderRadius: T.radiusSm, borderColor: T.border }} title="Fecha desde" />
                <span style={{ color: T.inkGhost, fontSize: 12, fontWeight: 600 }}>–</span>
                <Input type="date" value={commFilterDateTo} onChange={(e) => setCommFilterDateTo(e.target.value)}
                  style={{ width: 140, height: 40, fontSize: 13, borderRadius: T.radiusSm, borderColor: T.border }} title="Fecha hasta" />
              </div>

              {/* Clear All */}
              {commHasActiveFilters && (
                <button onClick={commClearFilters} style={{
                  display: "flex", alignItems: "center", gap: 4, height: 40, padding: "0 14px",
                  borderRadius: T.radiusSm, border: "none", background: T.dangerBg, color: T.danger,
                  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                }}>
                  <X style={{ width: 14, height: 14 }} /> Limpiar
                </button>
              )}
            </div>
          </InvCard>

          {/* ─── TABLE ─── */}
          <InvCard delay={180}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 260 }}>
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: T.accent }} />
              </div>
            ) : invoices.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 260, gap: 12 }}>
                <span style={{ color: T.inkGhost }}>{Ic.file}</span>
                <p style={{ color: T.inkMuted, fontWeight: 500, fontSize: 14 }}>No se encontraron facturas</p>
              </div>
            ) : (
              <>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>
                    <thead>
                      <tr style={{ background: T.surfaceAlt, borderBottom: `1px solid ${T.borderLight}` }}>
                        {["Numero", "Cliente", "Fecha Emisión", "Fecha Vencimiento", "Monto Total", "Moneda", "Estado Pago", "Comercial", ""].map((h, i) => (
                          <th key={i} style={{
                            padding: "10px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                            letterSpacing: "0.7px", color: T.inkLight, textAlign: i === 4 ? "right" : "left",
                            whiteSpace: "nowrap",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedInvoices.map((invoice, idx) => {
                        const ps = PAY_STATUS_STYLE[invoice.payment_status || "pendiente"] || PAY_STATUS_STYLE.pendiente;
                        return (
                          <tr
                            key={invoice.id}
                            onClick={() => { setViewingInvoice(invoice); setViewDialogOpen(true); }}
                            style={{
                              cursor: "pointer", transition: "background 0.15s",
                              background: idx % 2 === 1 ? T.surfaceAlt : T.surface,
                              borderBottom: `1px solid ${T.borderLight}`,
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = T.accentLight}
                            onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 1 ? T.surfaceAlt : T.surface}
                          >
                            <td style={{ padding: "10px 14px", fontWeight: 700, color: T.accent, fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>
                              {invoice.invoice_number}
                            </td>
                            <td style={{ padding: "10px 14px", color: T.inkSoft }}>{invoice.client?.company_name || "—"}</td>
                            <td style={{ padding: "10px 14px", color: T.inkMuted, fontSize: 12 }}>{formatDate(invoice.issue_date)}</td>
                            <td style={{ padding: "10px 14px", color: T.inkMuted, fontSize: 12 }}>{formatDate(invoice.due_date)}</td>
                            <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: T.ink, fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>
                              {formatCurrency(invoice.total_amount, invoice.currency || "USD")}
                            </td>
                            <td style={{ padding: "10px 14px" }}>
                              <span style={{
                                display: "inline-block", padding: "2px 8px", borderRadius: 6,
                                border: `1px solid ${T.border}`, fontSize: 10, fontWeight: 600, color: T.inkMuted,
                              }}>{invoice.currency || "USD"}</span>
                            </td>
                            <td style={{ padding: "10px 14px" }}>
                              <span style={{
                                display: "inline-block", padding: "3px 10px", borderRadius: 8,
                                background: ps.bg, color: ps.color, fontSize: 10, fontWeight: 700,
                                border: `1px solid ${ps.color}22`,
                              }}>{PAYMENT_STATUS_LABELS[invoice.payment_status || "pendiente"]}</span>
                            </td>
                            <td style={{ padding: "10px 14px", color: T.inkSoft, fontSize: 12 }}>
                              {invoice.commercial?.full_name || "—"}
                            </td>
                            <td style={{ padding: "6px 4px", width: 40 }}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <button style={{
                                    width: 28, height: 28, borderRadius: 8, border: "none",
                                    background: "transparent", cursor: "pointer", display: "flex",
                                    alignItems: "center", justifyContent: "center", color: T.inkLight,
                                  }}>
                                    <MoreHorizontal style={{ width: 16, height: 16 }} />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewingInvoice(invoice); setViewDialogOpen(true); }}>
                                    <Eye className="mr-2 h-4 w-4" /> Ver
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditForm(invoice); }} disabled={invoice.payment_status === "anulada"}>
                                    <Pencil className="mr-2 h-4 w-4" /> Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openPaymentDialog(invoice); }} disabled={invoice.payment_status === "pagada" || invoice.payment_status === "anulada"}>
                                    <DollarSign className="mr-2 h-4 w-4" /> Registrar Pago
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAnular(invoice); }} disabled={invoice.payment_status === "anulada"} className="text-red-600 focus:text-red-600">
                                    <XCircle className="mr-2 h-4 w-4" /> Anular
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ─── PAGINATION ─── */}
                {totalPages > 1 && (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px",
                    borderTop: `1px solid ${T.borderLight}`, flexWrap: "wrap", gap: 12,
                  }}>
                    <p style={{ fontSize: 13, color: T.inkMuted, fontFamily: "'DM Sans',sans-serif" }}>
                      Mostrando <span style={{ fontWeight: 600, color: T.inkSoft }}>{(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, invoices.length)}</span> de <span style={{ fontWeight: 600, color: T.inkSoft }}>{invoices.length}</span>
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={{
                          display: "flex", alignItems: "center", gap: 4, height: 32, padding: "0 12px",
                          borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.inkSoft,
                          fontSize: 12, fontWeight: 600, cursor: currentPage === 1 ? "default" : "pointer",
                          opacity: currentPage === 1 ? 0.4 : 1, fontFamily: "'DM Sans',sans-serif",
                        }}
                      >
                        <ChevronLeft style={{ width: 14, height: 14 }} /> Anterior
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((page) => {
                          if (totalPages <= 5) return true;
                          if (page === 1 || page === totalPages) return true;
                          if (Math.abs(page - currentPage) <= 1) return true;
                          return false;
                        })
                        .map((page, pidx, arr) => (
                          <span key={page} style={{ display: "flex", alignItems: "center" }}>
                            {pidx > 0 && arr[pidx - 1] !== page - 1 && (
                              <span style={{ padding: "0 4px", color: T.inkGhost }}>{"\u2026"}</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(page)}
                              style={{
                                width: 32, height: 32, padding: 0, borderRadius: 8, border: "none",
                                fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
                                fontFamily: "'JetBrains Mono',monospace",
                                background: currentPage === page ? T.accent : T.surface,
                                color: currentPage === page ? "#fff" : T.inkMuted,
                                boxShadow: currentPage === page ? "0 2px 8px rgba(11,83,148,0.25)" : "none",
                              }}
                            >{page}</button>
                          </span>
                        ))}
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        style={{
                          display: "flex", alignItems: "center", gap: 4, height: 32, padding: "0 12px",
                          borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.inkSoft,
                          fontSize: 12, fontWeight: 600, cursor: currentPage === totalPages ? "default" : "pointer",
                          opacity: currentPage === totalPages ? 0.4 : 1, fontFamily: "'DM Sans',sans-serif",
                        }}
                      >
                        Siguiente <ChevronRight style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </InvCard>
        </TabsContent>

        {/* =====================================================
            TAB: Facturas China
            ===================================================== */}
        <TabsContent value="china" style={{ display: activeTab === "china" ? "flex" : "none", flexDirection: "column", gap: 16, marginTop: 16 }}>
          {/* ─── FILTER BAR ─── */}
          <InvCard style={{ padding: "14px 18px" }} delay={120}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 320 }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", display: "flex", color: T.inkLight }}>{Ic.search}</span>
                <Input
                  placeholder="Cliente, # factura, contrato..."
                  value={chinaSearchTerm}
                  onChange={(e) => setChinaSearchTerm(e.target.value)}
                  style={{ paddingLeft: 36, height: 40, fontSize: 13, borderRadius: T.radiusSm, borderColor: T.border, background: T.surfaceAlt, fontFamily: "'DM Sans',sans-serif" }}
                />
              </div>

              {/* Popover Filters */}
              <Popover onOpenChange={(open) => { if (!open) { setChinaActiveFilterPanel(null); setChinaFilterPanelSearch(""); } }}>
                <PopoverTrigger asChild>
                  <button style={{
                    display: "flex", alignItems: "center", gap: 6, height: 40, padding: "0 16px",
                    borderRadius: T.radiusSm, border: `1px solid ${T.border}`, background: T.surface,
                    color: T.inkSoft, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s",
                  }}>
                    <span style={{ display: "flex" }}>{Ic.filter}</span> Filtros
                    {chinaPopoverFilterCount > 0 && (
                      <span style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        minWidth: 20, height: 20, padding: "0 6px", borderRadius: 10,
                        background: T.accent, color: "#fff", fontSize: 10, fontWeight: 700,
                      }}>{chinaPopoverFilterCount}</span>
                    )}
                  </button>
                </PopoverTrigger>
              <PopoverContent className="w-[400px] max-h-[70vh] p-0 overflow-hidden rounded-2xl border-slate-200/80 shadow-xl shadow-slate-900/10 flex flex-col" align="start" sideOffset={8}>
                {chinaActiveFilterPanel === null ? (
                  <>
                    <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                      <h4 className="text-sm font-semibold text-slate-800">Filtros</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Seleccione una categoría</p>
                    </div>
                    <div className="p-2 space-y-0.5">
                      {[
                        { key: "client", label: "Cliente", selected: chinaFilterClient, icon: Building2 },
                        { key: "status", label: "Estado", selected: chinaFilterStatus, icon: ClipboardCheck },
                      ].map((cat) => (
                        <button
                          key={cat.key}
                          onClick={() => { setChinaActiveFilterPanel(cat.key); setChinaFilterPanelSearch(""); }}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-slate-50/50 transition-all duration-150 text-left group"
                        >
                          <div className="flex items-center gap-2.5">
                            <cat.icon className="h-4 w-4 text-slate-400 group-hover:text-[#1E3A5F] transition-colors" />
                            <span className="text-sm text-slate-700 group-hover:text-slate-900 font-medium">{cat.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {cat.selected.length > 0 && (
                              <Badge className="h-5 min-w-[20px] px-1.5 text-[10px] bg-gradient-to-r from-[#1E3A5F] to-blue-600 text-white border-0 shadow-sm">
                                {cat.selected.length}
                              </Badge>
                            )}
                            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </button>
                      ))}
                    </div>
                    {chinaPopoverFilterCount > 0 && (
                      <div className="px-3 py-2.5 border-t border-slate-100">
                        <Button variant="ghost" size="sm" onClick={chinaClearFilters} className="w-full h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg">
                          <X className="h-3 w-3 mr-1" /> Limpiar todos los filtros
                        </Button>
                      </div>
                    )}
                  </>
                ) : (() => {
                  const chinaPanelConfig: Record<string, { label: string; options: { value: string; label: string }[]; selected: string[]; setter: (v: string[]) => void }> = {
                    client: {
                      label: "Cliente",
                      options: chinaFilterOptions.customer_names.map((n) => ({ value: n, label: n })),
                      selected: chinaFilterClient,
                      setter: setChinaFilterClient,
                    },
                    status: {
                      label: "Estado",
                      options: [
                        { value: "approved", label: "Aprobada" },
                        { value: "pending", label: "Pendiente" },
                      ],
                      selected: chinaFilterStatus,
                      setter: setChinaFilterStatus,
                    },
                  };
                  const config = chinaPanelConfig[chinaActiveFilterPanel];
                  if (!config) return null;
                  const searchLower = chinaFilterPanelSearch.toLowerCase();
                  const filteredOptions = chinaFilterPanelSearch
                    ? config.options.filter((o) => o.label.toLowerCase().includes(searchLower))
                    : config.options;

                  return (
                    <div className="flex flex-col max-h-[60vh]">
                      <div className="px-3 py-2.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center gap-2">
                        <button onClick={() => { setChinaActiveFilterPanel(null); setChinaFilterPanelSearch(""); }} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
                          <ArrowLeft className="h-4 w-4 text-slate-500" />
                        </button>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800">{config.label}</h4>
                          <p className="text-[11px] text-slate-400">{config.selected.length} seleccionados</p>
                        </div>
                      </div>
                      {config.options.length > 5 && (
                        <div className="px-3 py-2 border-b border-slate-50">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                              placeholder="Buscar..."
                              value={chinaFilterPanelSearch}
                              onChange={(e) => setChinaFilterPanelSearch(e.target.value)}
                              className="pl-8 h-8 text-xs rounded-lg border-slate-200"
                            />
                          </div>
                        </div>
                      )}
                      <div className="px-2 py-1 border-b border-slate-50 flex items-center justify-between">
                        <button onClick={() => config.setter(config.options.map((o) => o.value))} className="text-[11px] text-blue-600 hover:text-blue-800 font-medium px-1">
                          Seleccionar todo
                        </button>
                        {config.selected.length > 0 && (
                          <button onClick={() => config.setter([])} className="text-[11px] text-red-500 hover:text-red-700 font-medium px-1">
                            Limpiar
                          </button>
                        )}
                      </div>
                      <div className="overflow-y-auto flex-1">
                        <div className="p-1.5">
                          {filteredOptions.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4">Sin resultados</p>
                          ) : (
                            filteredOptions.map((opt) => (
                              <label key={opt.value} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded hover:bg-slate-50 cursor-pointer transition-colors">
                                <Checkbox checked={config.selected.includes(opt.value)} onCheckedChange={() => toggleFilterValue(config.selected, config.setter, opt.value)} className="h-4 w-4" />
                                <span className="text-sm text-slate-700 truncate">{opt.label}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </PopoverContent>
            </Popover>

              {/* Date range filter */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                <CalendarIcon style={{ width: 16, height: 16, color: T.inkLight, flexShrink: 0 }} />
                <Input type="date" value={chinaFilterDateFrom} onChange={(e) => setChinaFilterDateFrom(e.target.value)}
                  style={{ width: 140, height: 40, fontSize: 13, borderRadius: T.radiusSm, borderColor: T.border }} title="Fecha desde" />
                <span style={{ color: T.inkGhost, fontSize: 12, fontWeight: 600 }}>–</span>
                <Input type="date" value={chinaFilterDateTo} onChange={(e) => setChinaFilterDateTo(e.target.value)}
                  style={{ width: 140, height: 40, fontSize: 13, borderRadius: T.radiusSm, borderColor: T.border }} title="Fecha hasta" />
              </div>

              {/* Clear All */}
              {chinaHasActiveFilters && (
                <button onClick={chinaClearFilters} style={{
                  display: "flex", alignItems: "center", gap: 4, height: 40, padding: "0 14px",
                  borderRadius: T.radiusSm, border: "none", background: T.dangerBg, color: T.danger,
                  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                }}>
                  <X style={{ width: 14, height: 14 }} /> Limpiar
                </button>
              )}
            </div>
          </InvCard>

          {/* ─── KPI CARDS WITH RING CHARTS ─── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {[
              { label: "Total Facturas", value: String(chinaTotalCount), numVal: chinaTotalCount, maxVal: Math.max(chinaTotalCount, 1), color: T.blue, bg: T.blueBg, icon: Ic.receipt },
              { label: "Valor Total China", value: formatCurrency(chinaSummary.chinaTotal), numVal: chinaSummary.chinaTotal, maxVal: Math.max(chinaSummary.chinaTotal, chinaSummary.customerTotal, 1), color: T.success, bg: T.successBg, icon: Ic.dollar },
              { label: "Valor Total Cliente", value: formatCurrency(chinaSummary.customerTotal), numVal: chinaSummary.customerTotal, maxVal: Math.max(chinaSummary.chinaTotal, chinaSummary.customerTotal, 1), color: T.violet, bg: T.violetBg, icon: Ic.users },
              { label: "Aprobadas", value: `${chinaSummary.approvedCount} de ${chinaSummary.total}`, numVal: chinaSummary.approvedCount, maxVal: Math.max(chinaSummary.total, 1), color: T.teal, bg: T.tealBg, icon: Ic.check },
            ].map((kpi, ki) => (
              <InvCard key={kpi.label} delay={150 + ki * 60} style={{ padding: "18px 20px", cursor: "default" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", color: T.inkLight, marginBottom: 6 }}>{kpi.label}</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: kpi.color, fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{kpi.value}</p>
                  </div>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <InvRing value={kpi.numVal} max={kpi.maxVal} size={48} sw={4.5} color={kpi.color} bg={kpi.bg} />
                    <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: kpi.color }}>{kpi.icon}</span>
                  </div>
                </div>
              </InvCard>
            ))}
          </div>

          {/* ─── TABLE ─── */}
          <InvCard delay={300}>
            {chinaLoading ? (
              <ChinaTableSkeleton />
            ) : chinaInvoices.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 260, gap: 12 }}>
                <span style={{ color: T.inkGhost }}>{Ic.file}</span>
                <p style={{ color: T.inkMuted, fontWeight: 500, fontSize: 14 }}>No se encontraron facturas</p>
                <p style={{ color: T.inkLight, fontSize: 13 }}>{chinaHasActiveFilters ? "Intente ajustar los filtros" : "Cree una nueva factura para comenzar"}</p>
              </div>
            ) : (
              <>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>
                    <thead>
                      <tr style={{ background: T.surfaceAlt, borderBottom: `1px solid ${T.borderLight}` }}>
                        {["Fecha", "Cliente", "# Factura China", "Valor China", "Factura Cliente", "Valor Cliente", "Estado", "Notas", ""].map((h, i) => (
                          <th key={i} style={{
                            padding: "10px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                            letterSpacing: "0.7px", color: T.inkLight, textAlign: (i === 3 || i === 5) ? "right" : "left",
                            whiteSpace: "nowrap",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {chinaInvoices.map((invoice, idx) => (
                        <tr
                          key={invoice.id}
                          style={{
                            transition: "background 0.15s",
                            background: idx % 2 === 1 ? T.surfaceAlt : T.surface,
                            borderBottom: `1px solid ${T.borderLight}`,
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = T.accentLight}
                          onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 1 ? T.surfaceAlt : T.surface}
                        >
                          <td style={{ padding: "10px 14px", color: T.inkMuted, fontSize: 12 }}>{formatDate(invoice.invoice_date)}</td>
                          <td style={{ padding: "10px 14px", color: T.inkSoft }}>{invoice.customer_name || "\u2014"}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 700, color: T.accent, fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>
                            {invoice.china_invoice_number || "\u2014"}
                          </td>
                          <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: T.ink, fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>
                            {formatCurrency(invoice.china_invoice_value)}
                          </td>
                          <td style={{ padding: "10px 14px", color: T.inkSoft, fontSize: 12 }}>{invoice.customer_contract || "\u2014"}</td>
                          <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: T.ink, fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>
                            {formatCurrency(invoice.customer_invoice_value)}
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            {invoice.approved ? (
                              <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 8, background: T.successBg, color: T.success, fontSize: 10, fontWeight: 700, border: `1px solid ${T.success}22` }}>Aprobada</span>
                            ) : (
                              <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 8, background: T.warningBg, color: T.warning, fontSize: 10, fontWeight: 700, border: `1px solid ${T.warning}22` }}>Pendiente</span>
                            )}
                          </td>
                          <td style={{ padding: "10px 14px", color: T.inkLight, fontSize: 12, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={invoice.notes || ""}>
                            {invoice.notes || "\u2014"}
                          </td>
                          <td style={{ padding: "6px 4px", width: 40 }}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button style={{
                                  width: 28, height: 28, borderRadius: 8, border: "none",
                                  background: "transparent", cursor: "pointer", display: "flex",
                                  alignItems: "center", justifyContent: "center", color: T.inkLight,
                                }}>
                                  <MoreHorizontal style={{ width: 16, height: 16 }} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditChinaForm(invoice)}>
                                  <Pencil className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleChinaToggleApproved(invoice)}>
                                  <CheckCircle2 className="mr-2 h-4 w-4" /> {invoice.approved ? "Desaprobar" : "Aprobar"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleChinaAnular(invoice)} className="text-red-600 focus:text-red-600">
                                  <XCircle className="mr-2 h-4 w-4" /> Anular
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ─── PAGINATION ─── */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px",
                  borderTop: `1px solid ${T.borderLight}`, flexWrap: "wrap", gap: 12,
                }}>
                  <p style={{ fontSize: 13, color: T.inkMuted, fontFamily: "'DM Sans',sans-serif" }}>
                    Mostrando <span style={{ fontWeight: 600, color: T.inkSoft }}>{chinaShowingFrom}–{chinaShowingTo}</span> de <span style={{ fontWeight: 600, color: T.inkSoft }}>{chinaTotalCount}</span>
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      onClick={() => setChinaCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={chinaCurrentPage === 1}
                      style={{
                        display: "flex", alignItems: "center", gap: 4, height: 32, padding: "0 12px",
                        borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.inkSoft,
                        fontSize: 12, fontWeight: 600, cursor: chinaCurrentPage === 1 ? "default" : "pointer",
                        opacity: chinaCurrentPage === 1 ? 0.4 : 1, fontFamily: "'DM Sans',sans-serif",
                      }}
                    >
                      <ChevronLeft style={{ width: 14, height: 14 }} /> Anterior
                    </button>
                    {Array.from({ length: chinaTotalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        if (chinaTotalPages <= 5) return true;
                        if (page === 1 || page === chinaTotalPages) return true;
                        if (Math.abs(page - chinaCurrentPage) <= 1) return true;
                        return false;
                      })
                      .map((page, pidx, arr) => (
                        <span key={page} style={{ display: "flex", alignItems: "center" }}>
                          {pidx > 0 && arr[pidx - 1] !== page - 1 && (
                            <span style={{ padding: "0 4px", color: T.inkGhost }}>{"\u2026"}</span>
                          )}
                          <button
                            onClick={() => setChinaCurrentPage(page)}
                            style={{
                              width: 32, height: 32, padding: 0, borderRadius: 8, border: "none",
                              fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
                              fontFamily: "'JetBrains Mono',monospace",
                              background: chinaCurrentPage === page ? T.accent : T.surface,
                              color: chinaCurrentPage === page ? "#fff" : T.inkMuted,
                              boxShadow: chinaCurrentPage === page ? "0 2px 8px rgba(11,83,148,0.25)" : "none",
                            }}
                          >{page}</button>
                        </span>
                      ))}
                    <button
                      onClick={() => setChinaCurrentPage((p) => Math.min(chinaTotalPages, p + 1))}
                      disabled={chinaCurrentPage === chinaTotalPages}
                      style={{
                        display: "flex", alignItems: "center", gap: 4, height: 32, padding: "0 12px",
                        borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.inkSoft,
                        fontSize: 12, fontWeight: 600, cursor: chinaCurrentPage === chinaTotalPages ? "default" : "pointer",
                        opacity: chinaCurrentPage === chinaTotalPages ? 0.4 : 1, fontFamily: "'DM Sans',sans-serif",
                      }}
                    >
                      Siguiente <ChevronRight style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </InvCard>
        </TabsContent>
      </Tabs>

      {/* =====================================================
          COMERCIALES: Create/Edit Sheet
          ===================================================== */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) { resetForm(); } setSheetOpen(open); }}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto"
          showCloseButton
          style={{ fontFamily: "'DM Sans',sans-serif" }}
        >
          <SheetHeader style={{ paddingBottom: 16, borderBottom: `1px solid ${T.borderLight}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                background: editingInvoice ? `linear-gradient(135deg, ${T.warning}, ${T.orange})` : `linear-gradient(135deg, ${T.accent}, ${T.blue})`,
                color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}>
                {editingInvoice ? <Pencil style={{ width: 18, height: 18 }} /> : <Plus style={{ width: 18, height: 18 }} />}
              </div>
              <div>
                <SheetTitle style={{ color: T.accent, fontSize: 18, fontWeight: 700 }}>
                  {editingInvoice ? "Editar Factura" : "Nueva Factura"}
                </SheetTitle>
                <SheetDescription style={{ color: T.inkMuted, fontSize: 13 }}>
                  {editingInvoice ? `Editando factura ${editingInvoice.invoice_number}` : "Complete los campos para crear una nueva factura"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 px-1">
              {/* SECCION: Info General */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 4, height: 20, borderRadius: 4, background: `linear-gradient(180deg, ${T.accent}, ${T.blue})` }} />
                  <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", color: T.accent, margin: 0 }}>Informacion General</h3>
                </div>
                <div className="space-y-4">
                  {/* Cliente (searchable) */}
                  <FormField
                    control={form.control}
                    name="client_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente *</FormLabel>
                        <div className="space-y-2">
                          <Input
                            placeholder="Buscar cliente..."
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            className="mb-1"
                          />
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar cliente" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {filteredClients.map((client) => (
                                <SelectItem key={client.id} value={client.id!}>
                                  {client.company_name}
                                  {client.country ? ` (${client.country})` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Cotizacion (opcional) */}
                  <FormField
                    control={form.control}
                    name="quotation_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cotizacion (opcional)</FormLabel>
                        <Select
                          value={field.value || "none"}
                          onValueChange={(val) => field.onChange(val === "none" ? null : val)}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Sin cotizacion vinculada" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Sin cotizacion vinculada</SelectItem>
                            {quotations.map((q) => (
                              <SelectItem key={q.id} value={q.id!}>
                                {q.quotation_number}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Comercial */}
                  <FormField
                    control={form.control}
                    name="commercial_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comercial *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleccionar comercial" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {commercials.map((c) => (
                              <SelectItem key={c.id} value={c.id!}>
                                {c.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="issue_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha de Emision *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="due_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha de Vencimiento *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* SECCION: Items */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 4, height: 20, borderRadius: 4, background: `linear-gradient(180deg, ${T.success}, ${T.teal})` }} />
                    <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", color: T.accent, margin: 0 }}>Items</h3>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({ description: "", quantity: 1, unit: "und", unit_price: 0, total: 0 })
                    }
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Agregar Item
                  </Button>
                </div>
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-12 gap-2 items-start p-3 bg-gray-50 rounded-lg border"
                    >
                      <div className="col-span-12 sm:col-span-4">
                        <Label className="text-xs text-gray-500">Descripcion</Label>
                        <Input
                          {...form.register(`items.${index}.description`)}
                          placeholder="Descripcion del item"
                          className="mt-1"
                        />
                        {form.formState.errors.items?.[index]?.description && (
                          <p className="text-xs text-red-500 mt-1">
                            {form.formState.errors.items[index]?.description?.message}
                          </p>
                        )}
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <Label className="text-xs text-gray-500">Cantidad</Label>
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                          className="mt-1"
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-1">
                        <Label className="text-xs text-gray-500">Unidad</Label>
                        <Input
                          {...form.register(`items.${index}.unit`)}
                          placeholder="und"
                          className="mt-1"
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <Label className="text-xs text-gray-500">Precio Unit.</Label>
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register(`items.${index}.unit_price`, { valueAsNumber: true })}
                          className="mt-1"
                        />
                      </div>
                      <div className="col-span-10 sm:col-span-2">
                        <Label className="text-xs text-gray-500">Total</Label>
                        <Input
                          type="number"
                          value={form.watch(`items.${index}.total`)}
                          readOnly
                          className="mt-1 bg-gray-100"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1 flex items-end justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                          className="text-red-500 hover:text-red-700 mt-5"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* SECCION: Montos */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 4, height: 20, borderRadius: 4, background: `linear-gradient(180deg, ${T.violet}, ${T.blue})` }} />
                  <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", color: T.accent, margin: 0 }}>Montos</h3>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Moneda</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="USD">USD - Dolar</SelectItem>
                              <SelectItem value="COP">COP - Peso Colombiano</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="exchange_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tasa de Cambio</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Ej: 4200"
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(e.target.value ? parseFloat(e.target.value) : null)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="subtotal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subtotal *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              readOnly
                              className="bg-gray-50"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tax_percentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IVA (%)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="tax_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monto IVA</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              readOnly
                              className="bg-gray-50"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="total_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monto Total *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              readOnly
                              className="bg-gray-50 font-semibold"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="total_amount_cop"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monto Total COP</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(e.target.value ? parseFloat(e.target.value) : null)
                            }
                            readOnly={watchedCurrency === "USD" && !!watchedExchangeRate}
                            className={
                              watchedCurrency === "USD" && !!watchedExchangeRate
                                ? "bg-gray-50"
                                : ""
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* SECCION: Envio */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 4, height: 20, borderRadius: 4, background: `linear-gradient(180deg, ${T.orange}, ${T.warning})` }} />
                  <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", color: T.accent, margin: 0 }}>Envio</h3>
                </div>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="incoterm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Incoterm</FormLabel>
                        <Select
                          value={field.value || "none"}
                          onValueChange={(val) => field.onChange(val === "none" ? null : val)}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleccionar incoterm" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Sin incoterm</SelectItem>
                            {INCOTERMS.map((inc) => (
                              <SelectItem key={inc} value={inc}>
                                {inc}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="port_of_origin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Puerto de Origen</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ej: Shanghai"
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value || null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="port_of_destination"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Puerto de Destino</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ej: Buenaventura"
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value || null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="vessel_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motonave</FormLabel>
                        <Select
                          value={field.value || "none"}
                          onValueChange={(val) => field.onChange(val === "none" ? null : val)}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleccionar motonave" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Sin motonave</SelectItem>
                            {vessels.map((v) => (
                              <SelectItem key={v.id} value={v.id!}>
                                {v.vessel_name}
                                {v.shipping_line ? ` (${v.shipping_line})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="payment_conditions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condiciones de Pago</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej: 30% anticipo, 70% contra embarque"
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* SECCION: Bancaria */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 4, height: 20, borderRadius: 4, background: `linear-gradient(180deg, ${T.teal}, ${T.success})` }} />
                  <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", color: T.accent, margin: 0 }}>Informacion Bancaria</h3>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bank_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre del Banco</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Bancolombia" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="account_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Numero de Cuenta</FormLabel>
                          <FormControl>
                            <Input placeholder="Numero de cuenta" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="swift_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Codigo SWIFT</FormLabel>
                          <FormControl>
                            <Input placeholder="Codigo SWIFT" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="iban"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IBAN</FormLabel>
                          <FormControl>
                            <Input placeholder="IBAN" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* SECCION: Notas */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 4, height: 20, borderRadius: 4, background: `linear-gradient(180deg, ${T.inkMuted}, ${T.inkLight})` }} />
                  <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", color: T.accent, margin: 0 }}>Notas</h3>
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Notas adicionales sobre la factura..."
                          rows={3}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Submit Button */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 16, borderTop: `1px solid ${T.borderLight}` }}>
                <button
                  type="button"
                  onClick={() => { resetForm(); setSheetOpen(false); }}
                  disabled={saving}
                  style={{
                    padding: "10px 22px", borderRadius: 12, border: `1px solid ${T.border}`,
                    background: T.surface, color: T.inkSoft, fontSize: 13, fontWeight: 600,
                    cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                  }}
                >Cancelar</button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "10px 24px",
                    borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${T.accent}, ${T.blue})`,
                    color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                    fontFamily: "'DM Sans',sans-serif", boxShadow: "0 4px 12px rgba(11,83,148,0.2)",
                  }}
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingInvoice ? "Actualizar Factura" : "Crear Factura"}
                </button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* =====================================================
          COMERCIALES: View Invoice Dialog
          ===================================================== */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto" style={{ fontFamily: "'DM Sans',sans-serif" }}>
          <DialogHeader>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                background: `linear-gradient(135deg, ${T.accent}, ${T.blue})`, color: "#fff",
              }}>{Ic.file}</div>
              <div>
                <DialogTitle style={{ color: T.accent, fontSize: 18, fontWeight: 700 }}>
                  Factura {viewingInvoice?.invoice_number}
                </DialogTitle>
                <DialogDescription style={{ color: T.inkMuted, fontSize: 13 }}>Detalle completo de la factura</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {viewingInvoice && (
            <div className="space-y-4">
              {/* General Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Cliente:</span>
                  <p className="font-medium">{viewingInvoice.client?.company_name || "—"}</p>
                </div>
                <div>
                  <span className="text-gray-500">Comercial:</span>
                  <p className="font-medium">{viewingInvoice.commercial?.full_name || "—"}</p>
                </div>
                <div>
                  <span className="text-gray-500">Fecha Emision:</span>
                  <p className="font-medium">{formatDate(viewingInvoice.issue_date)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Fecha Vencimiento:</span>
                  <p className="font-medium">{formatDate(viewingInvoice.due_date)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Estado:</span>
                  <div className="mt-1">
                    <Badge
                      className={cn(
                        "text-xs border",
                        PAYMENT_STATUS_COLORS[viewingInvoice.payment_status || "pendiente"]
                      )}
                    >
                      {PAYMENT_STATUS_LABELS[viewingInvoice.payment_status || "pendiente"]}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Moneda:</span>
                  <p className="font-medium">{viewingInvoice.currency || "USD"}</p>
                </div>
              </div>

              <Separator />

              {/* Amounts */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Subtotal:</span>
                  <p className="font-medium">
                    {formatCurrency(viewingInvoice.subtotal, viewingInvoice.currency || "USD")}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">IVA ({viewingInvoice.tax_percentage || 0}%):</span>
                  <p className="font-medium">
                    {formatCurrency(viewingInvoice.tax_amount, viewingInvoice.currency || "USD")}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Total:</span>
                  <p className="font-semibold text-lg text-[#1E3A5F]">
                    {formatCurrency(viewingInvoice.total_amount, viewingInvoice.currency || "USD")}
                  </p>
                </div>
                {viewingInvoice.total_amount_cop && (
                  <div>
                    <span className="text-gray-500">Total COP:</span>
                    <p className="font-medium">
                      {formatCurrency(viewingInvoice.total_amount_cop, "COP")}
                    </p>
                  </div>
                )}
              </div>

              {/* Items */}
              {viewingInvoice.items && (viewingInvoice.items as InvoiceItem[]).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 8 }}>Items</h4>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="text-xs">Descripcion</TableHead>
                          <TableHead className="text-xs text-right">Cant.</TableHead>
                          <TableHead className="text-xs">Unidad</TableHead>
                          <TableHead className="text-xs text-right">Precio Unit.</TableHead>
                          <TableHead className="text-xs text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(viewingInvoice.items as InvoiceItem[]).map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-sm">{item.description}</TableCell>
                            <TableCell className="text-sm text-right">{item.quantity}</TableCell>
                            <TableCell className="text-sm">{item.unit}</TableCell>
                            <TableCell className="text-sm text-right">
                              {formatCurrency(item.unit_price, viewingInvoice.currency || "USD")}
                            </TableCell>
                            <TableCell className="text-sm text-right font-medium">
                              {formatCurrency(item.total, viewingInvoice.currency || "USD")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              {/* Partial Payments */}
              {viewingInvoice.partial_payments &&
                (viewingInvoice.partial_payments as PartialPayment[]).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 8 }}>Pagos Registrados</h4>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="text-xs">Fecha</TableHead>
                            <TableHead className="text-xs text-right">Monto</TableHead>
                            <TableHead className="text-xs">Referencia</TableHead>
                            <TableHead className="text-xs">Metodo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(viewingInvoice.partial_payments as PartialPayment[]).map(
                            (payment, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="text-sm">
                                  {formatDate(payment.date)}
                                </TableCell>
                                <TableCell className="text-sm text-right font-medium">
                                  {formatCurrency(
                                    payment.amount,
                                    viewingInvoice.currency || "USD"
                                  )}
                                </TableCell>
                                <TableCell className="text-sm">{payment.reference}</TableCell>
                                <TableCell className="text-sm capitalize">
                                  {payment.method}
                                </TableCell>
                              </TableRow>
                            )
                          )}
                        </TableBody>
                      </Table>
                      <div className="mt-2 text-right text-sm">
                        <span className="text-gray-500">Total pagado: </span>
                        <span className="font-semibold text-green-700">
                          {formatCurrency(
                            (viewingInvoice.partial_payments as PartialPayment[]).reduce(
                              (sum, p) => sum + (p.amount || 0),
                              0
                            ),
                            viewingInvoice.currency || "USD"
                          )}
                        </span>
                        <span className="text-gray-400 mx-2">/</span>
                        <span className="text-gray-500">Pendiente: </span>
                        <span className="font-semibold text-amber-700">
                          {formatCurrency(
                            viewingInvoice.total_amount -
                              (viewingInvoice.partial_payments as PartialPayment[]).reduce(
                                (sum, p) => sum + (p.amount || 0),
                                0
                              ),
                            viewingInvoice.currency || "USD"
                          )}
                        </span>
                      </div>
                    </div>
                  </>
                )}

              {/* Shipping Info */}
              {(viewingInvoice.incoterm || viewingInvoice.port_of_origin || viewingInvoice.port_of_destination) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {viewingInvoice.incoterm && (
                      <div>
                        <span className="text-gray-500">Incoterm:</span>
                        <p className="font-medium">{viewingInvoice.incoterm}</p>
                      </div>
                    )}
                    {viewingInvoice.port_of_origin && (
                      <div>
                        <span className="text-gray-500">Puerto Origen:</span>
                        <p className="font-medium">{viewingInvoice.port_of_origin}</p>
                      </div>
                    )}
                    {viewingInvoice.port_of_destination && (
                      <div>
                        <span className="text-gray-500">Puerto Destino:</span>
                        <p className="font-medium">{viewingInvoice.port_of_destination}</p>
                      </div>
                    )}
                    {viewingInvoice.payment_conditions && (
                      <div>
                        <span className="text-gray-500">Condiciones de Pago:</span>
                        <p className="font-medium">{viewingInvoice.payment_conditions}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Notes */}
              {viewingInvoice.notes && (
                <>
                  <Separator />
                  <div>
                    <span className="text-gray-500 text-sm">Notas:</span>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{viewingInvoice.notes}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* =====================================================
          COMERCIALES: Register Payment Dialog
          ===================================================== */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md" style={{ fontFamily: "'DM Sans',sans-serif" }}>
          <DialogHeader>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                background: `linear-gradient(135deg, ${T.success}, ${T.teal})`, color: "#fff",
              }}>{Ic.dollar}</div>
              <div>
                <DialogTitle style={{ color: T.accent, fontSize: 18, fontWeight: 700 }}>Registrar Pago</DialogTitle>
                <DialogDescription style={{ color: T.inkMuted, fontSize: 12 }}>
                  {paymentInvoice && (
                    <>
                      Factura {paymentInvoice.invoice_number} - Total:{" "}
                      {formatCurrency(paymentInvoice.total_amount, paymentInvoice.currency || "USD")}
                      {paymentInvoice.partial_payments &&
                        (paymentInvoice.partial_payments as PartialPayment[]).length > 0 && (
                          <>
                            {" "}| Pagado:{" "}
                            {formatCurrency(
                              (paymentInvoice.partial_payments as PartialPayment[]).reduce(
                                (sum, p) => sum + (p.amount || 0), 0
                              ),
                              paymentInvoice.currency || "USD"
                            )}
                          </>
                        )}
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={paymentForm.handleSubmit(onSubmitPayment)} className="space-y-4">
            <div>
              <Label>Monto *</Label>
              <Input
                type="number"
                step="0.01"
                {...paymentForm.register("amount", { valueAsNumber: true })}
                className="mt-1"
              />
              {paymentForm.formState.errors.amount && (
                <p className="text-xs text-red-500 mt-1">
                  {paymentForm.formState.errors.amount.message}
                </p>
              )}
            </div>

            <div>
              <Label>Fecha *</Label>
              <Input type="date" {...paymentForm.register("date")} className="mt-1" />
              {paymentForm.formState.errors.date && (
                <p className="text-xs text-red-500 mt-1">
                  {paymentForm.formState.errors.date.message}
                </p>
              )}
            </div>

            <div>
              <Label>Referencia *</Label>
              <Input
                placeholder="Numero de referencia del pago"
                {...paymentForm.register("reference")}
                className="mt-1"
              />
              {paymentForm.formState.errors.reference && (
                <p className="text-xs text-red-500 mt-1">
                  {paymentForm.formState.errors.reference.message}
                </p>
              )}
            </div>

            <div>
              <Label>Metodo de Pago *</Label>
              <Controller
                control={paymentForm.control}
                name="method"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Seleccionar metodo" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((pm) => (
                        <SelectItem key={pm.value} value={pm.value}>
                          {pm.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {paymentForm.formState.errors.method && (
                <p className="text-xs text-red-500 mt-1">
                  {paymentForm.formState.errors.method.message}
                </p>
              )}
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea
                placeholder="Notas adicionales sobre el pago..."
                {...paymentForm.register("notes")}
                rows={2}
                className="mt-1"
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 8 }}>
              <button type="button" onClick={() => setPaymentDialogOpen(false)} disabled={saving}
                style={{ padding: "9px 20px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface, color: T.inkSoft, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 22px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${T.success}, ${T.teal})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", boxShadow: "0 4px 12px rgba(13,159,110,0.2)" }}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Registrar Pago
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* =====================================================
          CHINA: Create / Edit Glassmorphism Modal
          ===================================================== */}
      {chinaSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-md transition-opacity duration-300"
            onClick={() => { chinaResetForm(); setChinaSheetOpen(false); }}
          />
          <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl border border-white/30 bg-white/85 backdrop-blur-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] animate-in fade-in zoom-in-95 duration-300">
            {/* Gradient accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-gradient-to-r from-[#1E3A5F] via-blue-500 to-cyan-400" />

            {/* Header */}
            <div className="relative px-7 pt-6 pb-4">
              <button
                onClick={() => { chinaResetForm(); setChinaSheetOpen(false); }}
                className="absolute top-4 right-4 rounded-full p-2 bg-slate-100/80 hover:bg-red-50 hover:text-red-500 text-slate-400 transition-all duration-200 hover:scale-110 hover:rotate-90"
              >
                <XCircle className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3 pr-8">
                <div className={cn(
                  "flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center shadow-md",
                  chinaEditingInvoice
                    ? "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/20"
                    : "bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/20"
                )}>
                  {chinaEditingInvoice ? <Pencil className="h-5 w-5 text-white" /> : <Plus className="h-5 w-5 text-white" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    {chinaEditingInvoice ? "Editar Factura" : "Nueva Factura"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {chinaEditingInvoice
                      ? `Modificando ${chinaEditingInvoice.china_invoice_number || "factura"}`
                      : "Complete los campos para registrar una nueva factura"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mx-7 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <form onSubmit={handleChinaSubmit} className="px-7 py-5 space-y-5">
                {/* General */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Fecha de Factura</Label>
                    <Input
                      type="date"
                      value={chinaFormData.invoice_date}
                      onChange={(e) => handleChinaFieldChange("invoice_date", e.target.value)}
                      className="rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Cliente <span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="Nombre del cliente"
                      value={chinaFormData.customer_name}
                      onChange={(e) => handleChinaFieldChange("customer_name", e.target.value)}
                      className="rounded-lg"
                    />
                  </div>
                </div>

                {/* Factura China */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-5 w-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Factura Proveedor China</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600"># Factura China</Label>
                      <Input
                        placeholder="Número de factura"
                        value={chinaFormData.china_invoice_number}
                        onChange={(e) => handleChinaFieldChange("china_invoice_number", e.target.value)}
                        className="rounded-lg"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Valor Factura China (USD)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={chinaFormData.china_invoice_value}
                        onChange={(e) => handleChinaFieldChange("china_invoice_value", e.target.value)}
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Factura Cliente */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-5 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Factura Cliente</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Factura Cliente</Label>
                      <Input
                        placeholder="Número o referencia"
                        value={chinaFormData.customer_contract}
                        onChange={(e) => handleChinaFieldChange("customer_contract", e.target.value)}
                        className="rounded-lg"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Valor Factura Cliente (USD)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={chinaFormData.customer_invoice_value}
                        onChange={(e) => handleChinaFieldChange("customer_invoice_value", e.target.value)}
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Aprobación + Notas */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-5 w-1 rounded-full bg-gradient-to-b from-amber-500 to-amber-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Estado y Notas</h4>
                  </div>
                  <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                    <Checkbox
                      id="china_approved"
                      checked={chinaFormData.approved}
                      onCheckedChange={(checked) => handleChinaFieldChange("approved", checked === true)}
                    />
                    <Label htmlFor="china_approved" className="text-sm font-medium text-slate-700 cursor-pointer">
                      Factura aprobada
                    </Label>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Notas</Label>
                    <Textarea
                      placeholder="Observaciones o notas adicionales..."
                      rows={3}
                      value={chinaFormData.notes}
                      onChange={(e) => handleChinaFieldChange("notes", e.target.value)}
                      className="rounded-lg"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="mx-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                <div className="flex items-center justify-end gap-3 pt-1 pb-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { chinaResetForm(); setChinaSheetOpen(false); }}
                    disabled={chinaSaving}
                    className="rounded-xl"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={chinaSaving}
                    className="rounded-xl bg-gradient-to-r from-[#1E3A5F] to-blue-600 hover:from-[#162d4a] hover:to-blue-700 text-white shadow-md shadow-blue-500/20"
                  >
                    {chinaSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {chinaEditingInvoice ? "Guardar Cambios" : "Crear Factura"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── FOOTER ─── */}
      <div style={{
        marginTop: 16, padding: "24px 0", borderTop: `1px solid ${T.borderLight}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        animation: "invFadeUp 0.6s ease 0.4s both",
      }}>
        <p style={{ fontSize: 11, color: T.inkLight, fontFamily: "'DM Sans',sans-serif" }}>
          IBC Core · Módulo de Facturas
        </p>
        <div style={{ display: "flex", gap: 16 }}>
          {[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Cotizaciones", href: "/quotations" },
            { label: "Contratos", href: "/contracts" },
            { label: "Clientes", href: "/clients" },
          ].map((lnk) => (
            <Link key={lnk.href} href={lnk.href} style={{
              fontSize: 11, color: T.inkLight, textDecoration: "none",
              fontFamily: "'DM Sans',sans-serif", transition: "color 0.2s",
            }}
              onMouseEnter={e => (e.currentTarget.style.color = T.accent)}
              onMouseLeave={e => (e.currentTarget.style.color = T.inkLight)}
            >{lnk.label}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
