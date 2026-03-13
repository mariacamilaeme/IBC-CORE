"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Ban,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  Ship,
  X,
  CalendarIcon,
  CreditCard,
  Download,
  SlidersHorizontal,
  User,
  Building2,
  Globe,
  Package,
  Scale,
  ClipboardCheck,
  StickyNote,
  Clock,
  Anchor,
  MapPin,
  FileCheck,
  DollarSign,
  Truck,
  Hash,
  Weight,
  CheckCircle2,
  Info,
  Copy,
  ExternalLink,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import {
  cn,
  formatDate,
  formatNumber,
  formatCurrency,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_COLORS,
} from "@/lib/utils";
import type { Contract, ContractStatus } from "@/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
// Sheet imports removed – using custom glassmorphism modal instead
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useCommercials } from "@/hooks/useCommercials";

// =====================================================
// Constants
// =====================================================

const COUNTRY_FLAGS: Record<string, string> = {
  COLOMBIA: "\u{1F1E8}\u{1F1F4}",
  VENEZUELA: "\u{1F1FB}\u{1F1EA}",
  BOLIVIA: "\u{1F1E7}\u{1F1F4}",
  ECUADOR: "\u{1F1EA}\u{1F1E8}",
  PERU: "\u{1F1F5}\u{1F1EA}",
  PERÚ: "\u{1F1F5}\u{1F1EA}",
};

const COUNTRIES = ["COLOMBIA", "VENEZUELA", "BOLIVIA", "ECUADOR", "PERÚ"];

const PRODUCT_TYPES = [
  { value: "MP", label: "MP (Materia Prima)" },
  { value: "MAQUINA", label: "Máquina" },
  { value: "MONTACARGAS", label: "Montacargas" },
];

const INCOTERMS = ["FOB", "CIF", "CIF LO", "CFR", "CFR LO", "EXW", "DDP"];

const ALL_DOCUMENTS = [
  { key: "Factura", label: "Factura", conditional: null },
  { key: "Lista de empaque", label: "Lista de empaque", conditional: null },
  { key: "Borrador del BL", label: "Borrador del BL", conditional: null },
  { key: "MTC", label: "MTC", conditional: "MP" },
  { key: "COPIA BL", label: "Copia BL", conditional: null },
  { key: "Delivery report", label: "Delivery report", conditional: null },
  { key: "Freight Certificate", label: "Freight Certificate", conditional: null },
  { key: "BL FINAL", label: "BL Final", conditional: null },
  { key: "Certificado de Origen", label: "Certificado de Origen", conditional: null },
  { key: "Insurance copy", label: "Insurance copy", conditional: "CIF" },
];

const ALL_STATUSES: ContractStatus[] = [
  "ENTREGADO AL CLIENTE",
  "EN TRÁNSITO",
  "EN PRODUCCIÓN",
  "ANULADO",
  "PENDIENTE ANTICIPO",
];

// COMMERCIAL_NAMES now comes from the shared useCommercials() hook

type SortField =
  | "contract_date"
  | "china_contract"
  | "client_contract"
  | "commercial_name"
  | "client_name"
  | "detail"
  | "tons_agreed"
  | "incoterm"
  | "status"
  | "eta_final"
  | "pending_client_amount";

type SortDirection = "asc" | "desc";

// =====================================================
// Empty Contract Template
// =====================================================
function getEmptyContract(): Partial<Contract> {
  return {
    commercial_name: "",
    client_name: "",
    client_contract: "",
    china_contract: "",
    contract_date: "",
    issue_month: "",
    country: "",
    incoterm: "",
    detail: "",
    tons_agreed: null,
    advance_paid: "",
    balance_paid: "",
    status: null,
    notes: "",
    production_time_days: null,
    advance_payment_date: "",
    delivery_date_pcc: "",
    exw_date: "",
    etd: "",
    eta_initial: "",
    eta_final: "",
    days_difference: null,
    delivery_month: "",
    delivery_year: "",
    exw_compliance: "",
    vessel_name: "",
    shipping_company: "",
    bl_number: "",
    arrival_port: "",
    shipment_type: "",
    tons_shipped: null,
    tons_difference: null,
    tons_compliance: "",
    bl_released: "",
    documents_sent: "",
    documents_pending: "",
    physical_docs_sent: "",
    pending_client_amount: null,
    product_type: "",
  };
}

// =====================================================
// Status Badge Component
// =====================================================
const STATUS_DOT_COLORS: Record<string, string> = {
  "ENTREGADO AL CLIENTE": "bg-emerald-500 shadow-emerald-500/50",
  "EN TRÁNSITO": "bg-blue-500 shadow-blue-500/50",
  "EN PRODUCCIÓN": "bg-amber-500 shadow-amber-500/50",
  "ANULADO": "bg-red-500 shadow-red-500/50",
  "PENDIENTE ANTICIPO": "bg-slate-400 shadow-slate-400/50",
};

function StatusBadge({ status }: { status: ContractStatus | null | undefined }) {
  if (!status) return <span className="text-slate-400 text-[11px]">--</span>;
  const colorClass =
    CONTRACT_STATUS_COLORS[status] || "bg-gray-100 text-gray-800 border-gray-200";
  const dotClass = STATUS_DOT_COLORS[status] || "bg-gray-400";
  const label = CONTRACT_STATUS_LABELS[status] || status;
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-semibold text-[10px] leading-tight px-2.5 py-1 whitespace-nowrap gap-1.5 rounded-lg",
        colorClass
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shadow-sm inline-block", dotClass)} />
      {label}
    </Badge>
  );
}

// =====================================================
// Loading Skeleton
// =====================================================
function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2 px-2">
          <div className="h-3 w-[12%] bg-slate-200 rounded animate-pulse" />
          <div className="h-3 w-[10%] bg-slate-200 rounded animate-pulse" />
          <div className="h-3 w-[10%] bg-slate-200 rounded animate-pulse" />
          <div className="h-3 w-[12%] bg-slate-200 rounded animate-pulse" />
          <div className="h-3 w-[8%] bg-slate-200 rounded animate-pulse" />
          <div className="h-3 w-[16%] bg-slate-200 rounded animate-pulse" />
          <div className="h-3 w-[6%] bg-slate-200 rounded animate-pulse" />
          <div className="h-3 w-[6%] bg-slate-200 rounded animate-pulse" />
          <div className="h-3 w-[10%] bg-slate-200 rounded animate-pulse" />
          <div className="h-3 w-[7%] bg-slate-200 rounded animate-pulse" />
          <div className="h-3 w-[3%] bg-slate-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// =====================================================
// Summary Card Skeleton
// =====================================================
function SummaryCardSkeleton() {
  return (
    <Card className="py-4">
      <CardContent className="px-4 py-0">
        <div className="h-3 w-20 bg-slate-200 rounded animate-pulse mb-2" />
        <div className="h-7 w-12 bg-slate-200 rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

// =====================================================
// Sortable Column Header
// =====================================================
function SortableHeader({
  label,
  field,
  sortField,
  sortDirection,
  onSort,
  className,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  return (
    <button
      className={cn(
        "flex items-center gap-0.5 hover:text-[#1E3A5F] transition-colors font-medium text-[11px]",
        className
      )}
      onClick={() => onSort(field)}
    >
      {label}
      {sortField === field ? (
        sortDirection === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

// =====================================================
// Read-Only Field Display
// =====================================================
function ReadOnlyField({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number | null | undefined;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: "blue" | "emerald" | "amber" | "violet" | "rose" | "slate";
}) {
  const displayValue = value == null || value === "" ? "—" : String(value);
  const isEmpty = value == null || value === "";
  const accentColors = {
    blue: "from-blue-500/10 to-transparent border-blue-200/40",
    emerald: "from-emerald-500/10 to-transparent border-emerald-200/40",
    amber: "from-amber-500/10 to-transparent border-amber-200/40",
    violet: "from-violet-500/10 to-transparent border-violet-200/40",
    rose: "from-rose-500/10 to-transparent border-rose-200/40",
    slate: "from-slate-500/5 to-transparent border-slate-200/40",
  };
  const iconColors = {
    blue: "text-blue-500/70",
    emerald: "text-emerald-500/70",
    amber: "text-amber-500/70",
    violet: "text-violet-500/70",
    rose: "text-rose-500/70",
    slate: "text-slate-400",
  };
  const a = accent || "slate";
  return (
    <div className={cn(
      "group relative rounded-xl px-3.5 py-2.5 bg-gradient-to-br border transition-all duration-200",
      "hover:shadow-sm hover:scale-[1.01]",
      accentColors[a]
    )}>
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon className={cn("h-3 w-3", iconColors[a])} />}
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      </div>
      <p className={cn(
        "text-sm font-medium",
        isEmpty ? "text-slate-300 italic" : "text-slate-800"
      )}>{displayValue}</p>
    </div>
  );
}

// =====================================================
// Main Page Component
// =====================================================
export default function ContractsPage() {
  const { user } = useAuth();
  const {
    commercials: COMMERCIAL_NAMES,
    addCommercial,
    deleteCommercial,
    renameCommercial,
  } = useCommercials();

  // Data state
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filter state (arrays for multi-select)
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCommercial, setFilterCommercial] = useState<string[]>([]);
  const [filterClient, setFilterClient] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterProductType, setFilterProductType] = useState<string[]>([]);
  const [filterIncoterm, setFilterIncoterm] = useState<string[]>([]);
  const [filterBalancePaid, setFilterBalancePaid] = useState<string[]>([]);
  const [filterVessel, setFilterVessel] = useState<string[]>([]);
  const [filterPort, setFilterPort] = useState<string[]>([]);
  const [filterBlReleased, setFilterBlReleased] = useState<string[]>([]);
  const [filterEtaFinal, setFilterEtaFinal] = useState<string[]>([]);
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");

  // Filter drill-down state
  const [activeFilterPanel, setActiveFilterPanel] = useState<string | null>(null);
  const [filterPanelSearch, setFilterPanelSearch] = useState("");
  const [etaTreeExpanded, setEtaTreeExpanded] = useState<Set<string>>(new Set());

  // Dynamic filter options from API
  const [filterOptions, setFilterOptions] = useState<{
    commercial_names: string[];
    client_names: string[];
    vessel_names: string[];
    arrival_ports: string[];
    incoterms: string[];
    product_types: string[];
    eta_final_dates: string[];
  }>({
    commercial_names: [],
    client_names: [],
    vessel_names: [],
    arrival_ports: [],
    incoterms: [],
    product_types: [],
    eta_final_dates: [],
  });

  // Sort state
  const [sortField, setSortField] = useState<SortField>("contract_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [viewMode, setViewMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Contract>>(getEmptyContract());

  // Custom clients & incoterms (persisted in localStorage)
  const [customClients, setCustomClients] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("ibc-custom-clients") || "[]"); } catch { return []; }
  });
  const [customIncoterms, setCustomIncoterms] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("ibc-custom-incoterms") || "[]"); } catch { return []; }
  });

  // Merged lists: API clients + custom | base incoterms + custom
  const allClients = Array.from(new Set([...filterOptions.client_names, ...customClients])).sort();
  const allIncoterms = Array.from(new Set([...INCOTERMS, ...customIncoterms]));

  const addCustomClient = (name: string) => {
    const trimmed = name.trim().toUpperCase();
    if (!trimmed || allClients.includes(trimmed)) return;
    const updated = [...customClients, trimmed];
    setCustomClients(updated);
    localStorage.setItem("ibc-custom-clients", JSON.stringify(updated));
  };

  const addCustomIncoterm = (name: string) => {
    const trimmed = name.trim().toUpperCase();
    if (!trimmed || allIncoterms.includes(trimmed)) return;
    const updated = [...customIncoterms, trimmed];
    setCustomIncoterms(updated);
    localStorage.setItem("ibc-custom-incoterms", JSON.stringify(updated));
  };

  // Searchable select state for commercial, client & incoterm
  const [commercialSearch, setCommercialSearch] = useState("");
  const [commercialAdding, setCommercialAdding] = useState(false);
  const [commercialEditing, setCommercialEditing] = useState<{ old: string; newName: string } | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [clientAdding, setClientAdding] = useState(false);
  const [incotermSearch, setIncotermSearch] = useState("");
  const [incotermAdding, setIncotermAdding] = useState(false);

  // Annul dialog state
  const [annulDialogOpen, setAnnulDialogOpen] = useState(false);
  const [contractToAnnul, setContractToAnnul] = useState<Contract | null>(null);

  // Summary counts
  const [summaryCounts, setSummaryCounts] = useState({
    pendienteAnticipo: 0,
    enProduccion: 0,
    enTransito: 0,
    entregados: 0,
    saldosPendientes: 0,
  });

  // Debounce ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // URL persistence refs
  const [filtersReady, setFiltersReady] = useState(false);
  const urlSyncSkip = useRef(true);

  // =====================================================
  // Restore Filters from URL on Mount
  // =====================================================
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) { setSearchQuery(q); setDebouncedSearch(q); }
    const commercial = params.get("commercial");
    if (commercial) setFilterCommercial(commercial.split(",").filter(Boolean));
    const client = params.get("client");
    if (client) setFilterClient(client.split(",").filter(Boolean));
    const status = params.get("status");
    if (status) setFilterStatus(status.split(",").filter(Boolean));
    const productType = params.get("product_type");
    if (productType) setFilterProductType(productType.split(",").filter(Boolean));
    const incoterm = params.get("incoterm");
    if (incoterm) setFilterIncoterm(incoterm.split(",").filter(Boolean));
    const balancePaid = params.get("balance_paid");
    if (balancePaid) setFilterBalancePaid(balancePaid.split(",").filter(Boolean));
    const vessel = params.get("vessel");
    if (vessel) setFilterVessel(vessel.split(",").filter(Boolean));
    const port = params.get("port");
    if (port) setFilterPort(port.split(",").filter(Boolean));
    const blReleased = params.get("bl_released");
    if (blReleased) setFilterBlReleased(blReleased.split(",").filter(Boolean));
    const etaFinal = params.get("eta_final");
    if (etaFinal) setFilterEtaFinal(etaFinal.split(",").filter(Boolean));
    const dateFrom = params.get("date_from");
    if (dateFrom) setFilterDateFrom(dateFrom);
    const dateTo = params.get("date_to");
    if (dateTo) setFilterDateTo(dateTo);
    setFiltersReady(true);
  }, []);

  // =====================================================
  // Sync Filters to URL
  // =====================================================
  useEffect(() => {
    if (!filtersReady) return;
    if (urlSyncSkip.current) { urlSyncSkip.current = false; return; }
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (filterCommercial.length) params.set("commercial", filterCommercial.join(","));
    if (filterClient.length) params.set("client", filterClient.join(","));
    if (filterStatus.length) params.set("status", filterStatus.join(","));
    if (filterProductType.length) params.set("product_type", filterProductType.join(","));
    if (filterIncoterm.length) params.set("incoterm", filterIncoterm.join(","));
    if (filterBalancePaid.length) params.set("balance_paid", filterBalancePaid.join(","));
    if (filterVessel.length) params.set("vessel", filterVessel.join(","));
    if (filterPort.length) params.set("port", filterPort.join(","));
    if (filterBlReleased.length) params.set("bl_released", filterBlReleased.join(","));
    if (filterEtaFinal.length) params.set("eta_final", filterEtaFinal.join(","));
    if (filterDateFrom) params.set("date_from", filterDateFrom);
    if (filterDateTo) params.set("date_to", filterDateTo);
    const qs = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [filtersReady, debouncedSearch, filterCommercial, filterClient, filterStatus, filterIncoterm, filterProductType, filterVessel, filterPort, filterBlReleased, filterEtaFinal, filterBalancePaid, filterDateFrom, filterDateTo]);

  // =====================================================
  // Debounce Search
  // =====================================================
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // =====================================================
  // Fetch Filter Options (cascading – exclude active panel's own filter)
  // =====================================================
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const params = new URLSearchParams();
        // Send all filters EXCEPT the one for the currently active panel
        // so the user can see all available options for the open category
        if (filterCommercial.length && activeFilterPanel !== "commercial")
          params.set("commercial_name", filterCommercial.join(","));
        if (filterClient.length && activeFilterPanel !== "client")
          params.set("client_name", filterClient.join(","));
        if (filterStatus.length && activeFilterPanel !== "status")
          params.set("status", filterStatus.join(","));
        if (filterIncoterm.length && activeFilterPanel !== "incoterm")
          params.set("incoterm", filterIncoterm.join(","));
        if (filterBalancePaid.length && activeFilterPanel !== "balance_paid")
          params.set("balance_paid", filterBalancePaid.join(","));
        if (filterVessel.length && activeFilterPanel !== "vessel")
          params.set("vessel_name", filterVessel.join(","));
        if (filterPort.length && activeFilterPanel !== "port")
          params.set("arrival_port", filterPort.join(","));
        if (filterBlReleased.length && activeFilterPanel !== "bl_released")
          params.set("bl_released", filterBlReleased.join(","));
        if (filterProductType.length && activeFilterPanel !== "product_type") {
          const defined = filterProductType.filter((v) => v !== "SIN_DEFINIR");
          const hasUndefined = filterProductType.includes("SIN_DEFINIR");
          if (defined.length) params.set("product_type", defined.join(","));
          if (hasUndefined) params.set("product_type_undefined", "true");
        }
        if (filterEtaFinal.length && activeFilterPanel !== "eta_final")
          params.set("eta_final", filterEtaFinal.join(","));
        const qs = params.toString();
        const res = await fetch(`/api/contracts/filters${qs ? `?${qs}` : ""}`);
        if (res.ok) {
          const data = await res.json();
          setFilterOptions(data);
        }
      } catch (error) {
        console.error("Error loading filter options:", error);
      }
    };
    loadFilterOptions();
  }, [filterCommercial, filterClient, filterStatus, filterIncoterm, filterBalancePaid, filterVessel, filterPort, filterBlReleased, filterProductType, filterEtaFinal, activeFilterPanel]);

  // =====================================================
  // Fetch Contracts
  // =====================================================
  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (debouncedSearch) params.set("search", debouncedSearch);
      if (filterCommercial.length) params.set("commercial_name", filterCommercial.join(","));
      if (filterClient.length) params.set("client_name", filterClient.join(","));
      if (filterIncoterm.length) params.set("incoterm", filterIncoterm.join(","));
      if (filterVessel.length) params.set("vessel_name", filterVessel.join(","));
      if (filterPort.length) params.set("arrival_port", filterPort.join(","));
      if (filterBlReleased.length) params.set("bl_released", filterBlReleased.join(","));
      if (filterProductType.length) {
        const defined = filterProductType.filter((v) => v !== "SIN_DEFINIR");
        const hasUndefined = filterProductType.includes("SIN_DEFINIR");
        if (defined.length) params.set("product_type", defined.join(","));
        if (hasUndefined) params.set("product_type_undefined", "true");
      }
      if (filterEtaFinal.length) params.set("eta_final", filterEtaFinal.join(","));
      if (filterDateFrom) params.set("date_from", filterDateFrom);
      if (filterDateTo) params.set("date_to", filterDateTo);

      // Status + balance paid logic
      const effectiveStatuses = [...filterStatus];
      if (filterBalancePaid.length) {
        params.set("balance_paid", filterBalancePaid.join(","));
        if (filterBalancePaid.includes("PENDIENTE") && effectiveStatuses.length === 0) {
          effectiveStatuses.push("EN PRODUCCIÓN", "EN TRÁNSITO");
        }
      }
      if (effectiveStatuses.length) params.set("status", effectiveStatuses.join(","));

      params.set("sort_field", sortField);
      params.set("sort_direction", sortDirection);
      params.set("page", String(currentPage));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/contracts?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al cargar los contratos");
      }

      const { data, count } = await res.json();
      setContracts(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      toast.error("Error al cargar los contratos");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterCommercial, filterClient, filterStatus, filterIncoterm, filterProductType, filterVessel, filterPort, filterBlReleased, filterEtaFinal, filterBalancePaid, filterDateFrom, filterDateTo, sortField, sortDirection, currentPage, pageSize]);

  // =====================================================
  // Fetch Summary Counts (with active filters applied)
  // =====================================================
  const fetchSummaryCounts = useCallback(async () => {
    try {
      // Build shared filter params (all filters except status)
      const buildParams = (forStatus: string) => {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (filterCommercial.length) params.set("commercial_name", filterCommercial.join(","));
        if (filterClient.length) params.set("client_name", filterClient.join(","));
        if (filterIncoterm.length) params.set("incoterm", filterIncoterm.join(","));
        if (filterVessel.length) params.set("vessel_name", filterVessel.join(","));
        if (filterPort.length) params.set("arrival_port", filterPort.join(","));
        if (filterBlReleased.length) params.set("bl_released", filterBlReleased.join(","));
        if (filterProductType.length) {
          const defined = filterProductType.filter((v) => v !== "SIN_DEFINIR");
          const hasUndefined = filterProductType.includes("SIN_DEFINIR");
          if (defined.length) params.set("product_type", defined.join(","));
          if (hasUndefined) params.set("product_type_undefined", "true");
        }
        if (filterBalancePaid.length) params.set("balance_paid", filterBalancePaid.join(","));
        if (filterEtaFinal.length) params.set("eta_final", filterEtaFinal.join(","));
        if (filterDateFrom) params.set("date_from", filterDateFrom);
        if (filterDateTo) params.set("date_to", filterDateTo);
        params.set("status", forStatus);
        params.set("page", "1");
        params.set("pageSize", "1");
        return params.toString();
      };

      // Build params for saldos pendientes (uses balance_paid filter, no status override)
      const buildSaldosParams = () => {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (filterCommercial.length) params.set("commercial_name", filterCommercial.join(","));
        if (filterClient.length) params.set("client_name", filterClient.join(","));
        if (filterIncoterm.length) params.set("incoterm", filterIncoterm.join(","));
        if (filterVessel.length) params.set("vessel_name", filterVessel.join(","));
        if (filterPort.length) params.set("arrival_port", filterPort.join(","));
        if (filterBlReleased.length) params.set("bl_released", filterBlReleased.join(","));
        if (filterProductType.length) {
          const defined = filterProductType.filter((v) => v !== "SIN_DEFINIR");
          const hasUndefined = filterProductType.includes("SIN_DEFINIR");
          if (defined.length) params.set("product_type", defined.join(","));
          if (hasUndefined) params.set("product_type_undefined", "true");
        }
        if (filterStatus.length) params.set("status", filterStatus.join(","));
        if (filterEtaFinal.length) params.set("eta_final", filterEtaFinal.join(","));
        if (filterDateFrom) params.set("date_from", filterDateFrom);
        if (filterDateTo) params.set("date_to", filterDateTo);
        params.set("balance_paid", "PENDIENTE");
        params.set("page", "1");
        params.set("pageSize", "1");
        return params.toString();
      };

      const [resPendiente, resProd, resTrans, resEntregado, resSaldos] = await Promise.all([
        fetch(`/api/contracts?${buildParams("PENDIENTE ANTICIPO")}`),
        fetch(`/api/contracts?${buildParams("EN PRODUCCIÓN")}`),
        fetch(`/api/contracts?${buildParams("EN TRÁNSITO")}`),
        fetch(`/api/contracts?${buildParams("ENTREGADO AL CLIENTE")}`),
        fetch(`/api/contracts?${buildSaldosParams()}`),
      ]);

      const pendienteData = resPendiente.ok ? await resPendiente.json() : { count: 0 };
      const prodData = resProd.ok ? await resProd.json() : { count: 0 };
      const transData = resTrans.ok ? await resTrans.json() : { count: 0 };
      const entregadoData = resEntregado.ok ? await resEntregado.json() : { count: 0 };
      const saldosData = resSaldos.ok ? await resSaldos.json() : { count: 0 };

      setSummaryCounts({
        pendienteAnticipo: pendienteData.count || 0,
        enProduccion: prodData.count || 0,
        enTransito: transData.count || 0,
        entregados: entregadoData.count || 0,
        saldosPendientes: saldosData.count || 0,
      });
    } catch (error) {
      console.error("Error fetching summary counts:", error);
    }
  }, [debouncedSearch, filterCommercial, filterClient, filterStatus, filterIncoterm, filterProductType, filterVessel, filterPort, filterBlReleased, filterEtaFinal, filterBalancePaid, filterDateFrom, filterDateTo]);

  useEffect(() => {
    if (!filtersReady) return;
    fetchContracts();
  }, [filtersReady, fetchContracts]);

  useEffect(() => {
    if (!filtersReady) return;
    fetchSummaryCounts();
  }, [filtersReady, fetchSummaryCounts]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterCommercial, filterClient, filterStatus, filterIncoterm, filterProductType, filterVessel, filterPort, filterBlReleased, filterEtaFinal, filterBalancePaid, filterDateFrom, filterDateTo, sortField, sortDirection, pageSize]);

  // =====================================================
  // Pagination Helpers
  // =====================================================
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalCount);

  // =====================================================
  // Sort Handler
  // =====================================================
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      // Date fields default to newest first (desc), others to asc
      const dateFields: SortField[] = ["contract_date", "eta_final"];
      setSortDirection(dateFields.includes(field) ? "desc" : "asc");
    }
  };

  // =====================================================
  // Check if any filter is active
  // =====================================================
  // Detect when Saldos Pendientes filter is active (to show extra column)
  const isSaldosView = filterBalancePaid.includes("PENDIENTE");

  const popoverFilterCount = [
    filterCommercial, filterClient, filterStatus, filterIncoterm,
    filterProductType, filterVessel, filterPort, filterBlReleased, filterBalancePaid, filterEtaFinal,
  ].filter((arr) => arr.length > 0).length;

  const hasActiveFilters =
    searchQuery !== "" ||
    popoverFilterCount > 0 ||
    filterDateFrom !== "" ||
    filterDateTo !== "";

  const clearFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setFilterCommercial([]);
    setFilterClient([]);
    setFilterStatus([]);
    setFilterIncoterm([]);
    setFilterProductType([]);
    setFilterVessel([]);
    setFilterPort([]);
    setFilterBlReleased([]);
    setFilterEtaFinal([]);
    setFilterBalancePaid([]);
    setEtaTreeExpanded(new Set());
    setFilterDateFrom("");
    setFilterDateTo("");
    setActiveFilterPanel(null);
    setFilterPanelSearch("");
  };

  // Helper to toggle a value in a filter array
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

  // Helper: display text for a filter
  const filterDisplayText = (selected: string[], placeholder = "Todos") => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) return selected[0];
    return `${selected.length} seleccionados`;
  };

  // =====================================================
  // Auto-calculation helpers
  // =====================================================
  const addDaysToDate = (dateStr: string, days: number): string => {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const MONTH_NAMES_ES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  const computeAutoFields = (data: Partial<Contract>): Partial<Contract> => {
    const updates: Partial<Contract> = {};

    // 1. EXW date = advance_payment_date + production_time_days
    const advDate = data.advance_payment_date as string | null | undefined;
    const prodDays = data.production_time_days as number | null | undefined;
    if (advDate && prodDays && prodDays > 0) {
      updates.exw_date = addDaysToDate(advDate, prodDays);
      updates.advance_paid = "SI";
      // Auto-advance status from PENDIENTE ANTICIPO → EN PRODUCCIÓN
      if (data.status === "PENDIENTE ANTICIPO") {
        updates.status = "EN PRODUCCIÓN" as ContractStatus;
      }
    } else if (!advDate) {
      // Clear derived fields when source date is removed
      updates.exw_date = null as unknown as string;
      updates.advance_paid = "";
    }
    // NOTE: delivery_date_pcc comes from invoice date, not calculated here

    // 2. EXW compliance: compare EXW date vs PCC date (±10 days margin)
    const exwDate = updates.exw_date || (data.exw_date as string | undefined);
    const pccDate = data.delivery_date_pcc as string | null | undefined;
    if (exwDate && pccDate) {
      const exwMs = new Date(exwDate + "T00:00:00").getTime();
      const pccMs = new Date(pccDate + "T00:00:00").getTime();
      const diffDays = Math.abs(Math.round((exwMs - pccMs) / 86400000));
      updates.exw_compliance = diffDays <= 10 ? "CUMPLE" : "NO CUMPLE";
      // Days difference = PCC date - EXW date
      updates.days_difference = Math.round((pccMs - exwMs) / 86400000);
    } else if (!exwDate || !pccDate) {
      updates.exw_compliance = "";
      updates.days_difference = null;
    }

    // 3. Delivery month & year from ETA final
    const etaFinal = data.eta_final as string | null | undefined;
    if (etaFinal && etaFinal.length >= 7) {
      const parts = etaFinal.split("-");
      const monthIdx = parseInt(parts[1], 10) - 1;
      updates.delivery_month = MONTH_NAMES_ES[monthIdx] || "";
      updates.delivery_year = parts[0];
    } else if (!etaFinal) {
      updates.delivery_month = "";
      updates.delivery_year = "";
    }

    // 5. Tons compliance: compare tons_shipped vs tons_agreed
    const tonsAgreed = data.tons_agreed as number | null | undefined;
    const tonsShipped = data.tons_shipped as number | null | undefined;
    if (tonsAgreed != null && tonsAgreed > 0 && tonsShipped != null) {
      const diff = Number((tonsShipped - tonsAgreed).toFixed(2));
      updates.tons_difference = diff;
      const pct = (tonsShipped / tonsAgreed) * 100;
      updates.tons_compliance = pct >= 97 ? "CUMPLE" : "NO CUMPLE";
    }

    // 6. Issue month from contract_date
    const contractDate = data.contract_date as string | null | undefined;
    if (contractDate && contractDate.length >= 7) {
      const parts = contractDate.split("-");
      const monthIdx = parseInt(parts[1], 10) - 1;
      updates.issue_month = `${MONTH_NAMES_ES[monthIdx]} ${parts[0]}`;
    } else if (!contractDate) {
      updates.issue_month = "";
    }

    // 7. Documents pending = ALL_DOCUMENTS - documents_sent
    const sentStr = data.documents_sent as string | null | undefined;
    if (sentStr !== undefined) {
      const sentList = sentStr ? sentStr.split(", ").filter(Boolean) : [];
      // Determine applicable docs based on product type and incoterm
      const productType = (data.product_type as string) || "";
      const incoterm = (data.incoterm as string) || "";
      const applicable = ALL_DOCUMENTS.filter((d) => {
        if (d.conditional === "MP" && !productType.toUpperCase().includes("MP")) return false;
        if (d.conditional === "CIF" && !incoterm.toUpperCase().includes("CIF")) return false;
        return true;
      });
      const pending = applicable.filter((d) => !sentList.includes(d.key)).map((d) => d.label);
      updates.documents_pending = pending.length > 0 ? pending.join(", ") : "Todos enviados";
    }

    // 8. Balance paid: auto-fill based on pending_client_amount
    const pendingAmount = data.pending_client_amount;
    if (pendingAmount != null && pendingAmount !== ("" as unknown)) {
      const numAmount = Number(pendingAmount);
      if (numAmount === 0 || isNaN(numAmount)) {
        updates.balance_paid = "OK";
      } else if (numAmount > 0) {
        updates.balance_paid = "PENDIENTE";
      }
    }

    return updates;
  };

  // Fields that trigger auto-calculation when changed
  const AUTO_TRIGGER_FIELDS = new Set<string>([
    "advance_payment_date", "production_time_days", "delivery_date_pcc",
    "eta_final", "tons_shipped", "tons_agreed", "pending_client_amount",
    "contract_date", "documents_sent",
  ]);

  // =====================================================
  // Form Helpers
  // =====================================================
  const updateFormField = (field: keyof Contract, value: string | number | null) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Only auto-calculate when a source field changes, not when editing a derived field
      if (AUTO_TRIGGER_FIELDS.has(field)) {
        const auto = computeAutoFields(next);
        return { ...next, ...auto };
      }
      return next;
    });
  };

  // =====================================================
  // Open Sheet for New Contract
  // =====================================================
  const handleNewContract = () => {
    setEditingContract(null);
    setViewMode(false);
    setFormData(getEmptyContract());
    setSheetOpen(true);
  };

  const handleDuplicateContract = (contract: Contract) => {
    setEditingContract(null);
    setViewMode(false);
    // Copy all fields but clear identifiers so it's treated as a new contract
    const { id, created_at, updated_at, client_contract, china_contract, ...rest } = contract;
    setFormData({
      ...rest,
      client_contract: "",
      china_contract: "",
      contract_date: new Date().toISOString().split("T")[0],
      issue_month: "",
      status: "PENDIENTE ANTICIPO",
    });
    // Auto-fill issue_month from today's date
    const now = new Date();
    const monthIdx = now.getMonth();
    const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    setFormData((prev) => ({ ...prev, issue_month: `${MONTH_NAMES[monthIdx]} ${now.getFullYear()}` }));
    setSheetOpen(true);
    toast.info("Contrato duplicado — completa los datos faltantes");
  };

  // =====================================================
  // Fetch invoice date for a contract (PCC date)
  // =====================================================
  const fetchInvoiceDate = async (contract: Contract): Promise<string | null> => {
    try {
      const contractNum = contract.client_contract || contract.china_contract;
      if (!contractNum) return null;
      const res = await fetch(
        `/api/contract-invoices?search=${encodeURIComponent(contractNum)}&page=1&pageSize=1`
      );
      if (!res.ok) return null;
      const { data } = await res.json();
      if (data && data.length > 0 && data[0].invoice_date) {
        return data[0].invoice_date;
      }
      return null;
    } catch {
      return null;
    }
  };

  // =====================================================
  // Open Sheet to View Contract
  // =====================================================
  const handleViewContract = async (contract: Contract) => {
    setEditingContract(contract);
    setViewMode(true);
    const data = { ...contract };
    const auto = computeAutoFields(data);
    setFormData({ ...data, ...auto });
    setSheetOpen(true);

    // Fetch PCC date from invoices in background
    if (!data.delivery_date_pcc) {
      const invoiceDate = await fetchInvoiceDate(contract);
      if (invoiceDate) {
        setFormData((prev) => ({ ...prev, delivery_date_pcc: invoiceDate }));
      }
    }
  };

  // =====================================================
  // Open Sheet to Edit Contract
  // =====================================================
  const handleEditContract = async (contract: Contract) => {
    setEditingContract(contract);
    setViewMode(false);
    const data = { ...contract };
    const auto = computeAutoFields(data);
    setFormData({ ...data, ...auto });
    setSheetOpen(true);

    // Fetch PCC date from invoices in background
    if (!data.delivery_date_pcc) {
      const invoiceDate = await fetchInvoiceDate(contract);
      if (invoiceDate) {
        setFormData((prev) => ({ ...prev, delivery_date_pcc: invoiceDate }));
      }
    }
  };

  // =====================================================
  // Submit Handler (Create or Update)
  // =====================================================
  const handleSubmit = async () => {
    // Basic validation
    if (!formData.commercial_name || formData.commercial_name.trim() === "") {
      toast.error("El nombre comercial es obligatorio");
      return;
    }
    if (!formData.client_name || formData.client_name.trim() === "") {
      toast.error("El nombre del cliente es obligatorio");
      return;
    }

    try {
      setSubmitting(true);

      const payload: Record<string, unknown> = {
        ...formData,
        tons_agreed:
          formData.tons_agreed != null && formData.tons_agreed !== ("" as unknown)
            ? Number(formData.tons_agreed)
            : null,
        production_time_days:
          formData.production_time_days != null &&
          formData.production_time_days !== ("" as unknown)
            ? Number(formData.production_time_days)
            : null,
        days_difference:
          formData.days_difference != null && formData.days_difference !== ("" as unknown)
            ? Number(formData.days_difference)
            : null,
        tons_shipped:
          formData.tons_shipped != null && formData.tons_shipped !== ("" as unknown)
            ? Number(formData.tons_shipped)
            : null,
        tons_difference:
          formData.tons_difference != null && formData.tons_difference !== ("" as unknown)
            ? Number(formData.tons_difference)
            : null,
        pending_client_amount:
          formData.pending_client_amount != null &&
          formData.pending_client_amount !== ("" as unknown)
            ? Number(formData.pending_client_amount)
            : null,
      };

      // Convert empty date strings to null so Supabase doesn't reject them
      const DATE_FIELDS = [
        "contract_date", "advance_payment_date", "delivery_date_pcc",
        "exw_date", "etd", "eta_initial", "eta_final",
      ];
      for (const f of DATE_FIELDS) {
        if (payload[f] === "" || payload[f] === undefined) {
          payload[f] = null;
        }
      }

      if (editingContract?.id) {
        // Update
        const res = await fetch("/api/contracts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingContract.id, ...payload }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Error al actualizar el contrato");
        }
        const result = await res.json();
        toast.success("Contrato actualizado exitosamente");
        if (result.propagatedCount > 0) {
          toast.info(
            `ETA actualizada en ${result.propagatedCount} contrato${result.propagatedCount > 1 ? "s" : ""} con la misma motonave`
          );
        }
      } else {
        // Create
        const res = await fetch("/api/contracts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Error al crear el contrato");
        }
        toast.success("Contrato creado exitosamente");
      }

      fetchContracts();
      fetchSummaryCounts();
      if (!editingContract?.id) {
        setSheetOpen(false);
        setFormData(getEmptyContract());
      }
    } catch (error) {
      console.error("Error saving contract:", error);
      toast.error(
        editingContract ? "Error al actualizar el contrato" : "Error al crear el contrato"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // Annul Contract
  // =====================================================
  const handleAnnul = async () => {
    if (!contractToAnnul?.id) return;

    try {
      const res = await fetch("/api/contracts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: contractToAnnul.id, status: "ANULADO" }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al anular el contrato");
      }

      toast.success("Contrato anulado exitosamente");
      setAnnulDialogOpen(false);
      setContractToAnnul(null);
      fetchContracts();
      fetchSummaryCounts();
    } catch (error) {
      console.error("Error annulling contract:", error);
      toast.error("Error al anular el contrato");
    }
  };

  // =====================================================
  // Download Excel Report
  // =====================================================
  const [downloading, setDownloading] = useState(false);

  const handleDownloadExcel = async () => {
    try {
      setDownloading(true);
      toast.info("Generando reporte Excel...");

      // Fetch ALL contracts (no pagination limit) with same filters
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (filterCommercial.length) params.set("commercial_name", filterCommercial.join(","));
      if (filterClient.length) params.set("client_name", filterClient.join(","));
      if (filterIncoterm.length) params.set("incoterm", filterIncoterm.join(","));
      if (filterVessel.length) params.set("vessel_name", filterVessel.join(","));
      if (filterPort.length) params.set("arrival_port", filterPort.join(","));
      if (filterBlReleased.length) params.set("bl_released", filterBlReleased.join(","));
      if (filterProductType.length) {
        const defined = filterProductType.filter((v) => v !== "SIN_DEFINIR");
        const hasUndefined = filterProductType.includes("SIN_DEFINIR");
        if (defined.length) params.set("product_type", defined.join(","));
        if (hasUndefined) params.set("product_type_undefined", "true");
      }
      if (filterEtaFinal.length) params.set("eta_final", filterEtaFinal.join(","));
      const xlStatuses = [...filterStatus];
      if (filterBalancePaid.length) {
        params.set("balance_paid", filterBalancePaid.join(","));
        if (filterBalancePaid.includes("PENDIENTE") && xlStatuses.length === 0) {
          xlStatuses.push("EN PRODUCCIÓN", "EN TRÁNSITO");
        }
      }
      if (xlStatuses.length) params.set("status", xlStatuses.join(","));
      if (filterDateFrom) params.set("date_from", filterDateFrom);
      if (filterDateTo) params.set("date_to", filterDateTo);
      params.set("sort_field", sortField);
      params.set("sort_direction", sortDirection);
      params.set("page", "1");
      params.set("pageSize", "5000");

      const res = await fetch(`/api/contracts?${params.toString()}`);
      if (!res.ok) throw new Error("Error al obtener los contratos");
      const { data: allContracts } = await res.json();

      const exportData: Contract[] = allContracts || [];

      const excelMod = await import("exceljs");
      const ExcelJS = excelMod.default || excelMod;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "IBC Steel Group - IBC Core";
      workbook.created = new Date();

      const ws = workbook.addWorksheet("Contratos", {
        properties: { defaultColWidth: 16 },
        views: [{ state: "frozen", ySplit: 3 }],
      });

      // ── Brand Palette ──
      const NAVY = "1E3A5F";
      const NAVY_MID = "2A4D7A";
      const ACCENT = "0B5394";
      const ACCENT_GOLD = "C9A227";
      const GOLD_LIGHT = "F5E6B8";
      const WARM_BG = "FAF9F7";
      const ZEBRA_BG = "F5F3EF";
      const WHITE = "FFFFFF";
      const BORDER = "E8E6E1";
      const INK = "18191D";
      const INK_SOFT = "3D4049";
      const INK_MUTED = "6B7080";
      const INK_LIGHT = "9CA3B4";
      const FONT = "Aptos";

      // Status colors
      const statusStyles: Record<string, { bg: string; text: string }> = {
        "ENTREGADO AL CLIENTE": { bg: "ECFDF3", text: "0D9F6E" },
        "EN TRÁNSITO":         { bg: "E8F0FE", text: "0B5394" },
        "EN PRODUCCIÓN":       { bg: "FFF8EB", text: "DC8B0B" },
        "ANULADO":             { bg: "FFF1F2", text: "E63946" },
        "PENDIENTE ANTICIPO":  { bg: "F1F5F9", text: "64748B" },
      };

      // Balance paid colors
      const balanceStyles: Record<string, { bg: string; text: string }> = {
        "PENDIENTE": { bg: "FFF8EB", text: "DC8B0B" },
        "OK":        { bg: "ECFDF3", text: "0D9F6E" },
      };

      // Parse date string to Date object for Excel
      const toDate = (d: string | null | undefined): Date | string => {
        if (!d) return "";
        try {
          const iso = d.split("T")[0];
          const [y, m, day] = iso.split("-").map(Number);
          if (y && m && day) return new Date(y, m - 1, day);
          return "";
        } catch { return ""; }
      };

      // Column config (20 columns)
      ws.columns = [
        { key: "contract_date", width: 14 },
        { key: "china_contract", width: 22 },
        { key: "client_contract", width: 20 },
        { key: "commercial_name", width: 20 },
        { key: "client_name", width: 26 },
        { key: "country", width: 14 },
        { key: "detail", width: 36 },
        { key: "tons_agreed", width: 16 },
        { key: "tons_shipped", width: 16 },
        { key: "incoterm", width: 12 },
        { key: "exw_date", width: 14 },
        { key: "status", width: 24 },
        { key: "eta_final", width: 14 },
        { key: "vessel_name", width: 20 },
        { key: "bl_number", width: 19 },
        { key: "arrival_port", width: 17 },
        { key: "advance_paid", width: 14 },
        { key: "balance_paid", width: 14 },
        { key: "pending_client_amount", width: 20 },
        { key: "notes", width: 32 },
      ];

      const totalCols = ws.columns.length;
      const now = new Date();
      const dateStr = now.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });

      // Compute totals for header and footer
      const totalTonsAgreed = exportData.reduce((s: number, c: Contract) => s + (c.tons_agreed ?? 0), 0);
      const totalTonsShipped = exportData.reduce((s: number, c: Contract) => s + (c.tons_shipped ?? 0), 0);
      const totalPendingAmount = exportData.reduce((s: number, c: Contract) => s + (c.pending_client_amount ?? 0), 0);

      // ══════════════════════════════════════════════════════
      // ROW 1: Unified header — company + report info
      // ══════════════════════════════════════════════════════
      const filterDesc: string[] = [];
      if (filterCommercial.length) filterDesc.push(`Comercial: ${filterCommercial.join(", ")}`);
      if (filterClient.length) filterDesc.push(`Cliente: ${filterClient.join(", ")}`);
      if (filterStatus.length) filterDesc.push(`Estado: ${filterStatus.join(", ")}`);
      if (filterIncoterm.length) filterDesc.push(`Incoterm: ${filterIncoterm.join(", ")}`);
      if (filterProductType.length) filterDesc.push(`Tipo: ${filterProductType.join(", ")}`);
      if (filterVessel.length) filterDesc.push(`Motonave: ${filterVessel.join(", ")}`);
      if (filterPort.length) filterDesc.push(`Puerto: ${filterPort.join(", ")}`);
      if (filterBlReleased.length) filterDesc.push(`BL: ${filterBlReleased.join(", ")}`);
      if (filterBalancePaid.length) filterDesc.push(`Saldo: ${filterBalancePaid.join(", ")}`);
      if (filterEtaFinal.length) filterDesc.push(`ETA Final: ${filterEtaFinal.length} fechas`);
      if (filterDateFrom || filterDateTo) filterDesc.push(`Fecha: ${filterDateFrom || "..."} a ${filterDateTo || "..."}`);
      if (debouncedSearch) filterDesc.push(`Búsqueda: "${debouncedSearch}"`);

      const r1 = ws.addRow([""]);
      ws.mergeCells(1, 1, 1, totalCols);
      const c1 = ws.getCell("A1");
      c1.value = { richText: [
        { text: "IBC", font: { name: FONT, size: 16, bold: true, color: { argb: WHITE } } },
        { text: "  STEEL GROUP", font: { name: FONT, size: 12, color: { argb: WHITE } } },
        { text: `          REPORTE DE CONTRATOS`, font: { name: FONT, size: 10, bold: true, color: { argb: WHITE } } },
        { text: `     ${dateStr}  ·  ${exportData.length} registros`, font: { name: FONT, size: 9, color: { argb: "D0DCE8" } } },
        ...(filterDesc.length > 0 ? [{ text: `     ${filterDesc.join(" · ")}`, font: { name: FONT, size: 8, italic: true, color: { argb: "A8BED4" } } }] : []),
      ] };
      c1.alignment = { horizontal: "left", vertical: "middle", indent: 2 };
      c1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      r1.height = 40;
      for (let col = 1; col <= totalCols; col++) {
        const cell = r1.getCell(col);
        if (col > 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        cell.border = { bottom: { style: "medium" as const, color: { argb: WHITE } } };
      }

      // ══════════════════════════════════════════════════════
      // ROW 2: Spacer
      // ══════════════════════════════════════════════════════
      const r2 = ws.addRow([""]);
      ws.mergeCells(2, 1, 2, totalCols);
      r2.height = 5;
      for (let col = 1; col <= totalCols; col++) {
        r2.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
      }

      // ══════════════════════════════════════════════════════
      // ROW 3: Column Headers — elegant two-tone
      // ══════════════════════════════════════════════════════
      const colHeaders = [
        "FECHA", "CONTRATO CHINA", "CONTRATO CLIENTE", "COMERCIAL", "CLIENTE",
        "PAÍS", "DETALLE DE PRODUCTO", "TONS ACORDADAS", "TONS EMBARCADAS", "INCOTERM",
        "FECHA EXW", "ESTADO", "ETA FINAL", "MOTONAVE", "NÚMERO BL", "PUERTO LLEGADA",
        "ANTICIPO", "SALDO", "VALOR PDTE. (USD)", "NOTAS",
      ];
      const headerDataRow = ws.addRow(colHeaders);
      headerDataRow.height = 32;
      headerDataRow.eachCell((cell, colNumber) => {
        cell.font = { name: FONT, size: 9, bold: true, color: { argb: WHITE } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        cell.border = {
          bottom: { style: "thin" as const, color: { argb: WHITE } },
          left: { style: "thin" as const, color: { argb: "2D5A8A" } },
          right: { style: "thin" as const, color: { argb: "2D5A8A" } },
          top: { style: "thin" as const, color: { argb: "2D5A8A" } },
        };
        // First and last column get solid navy outer border
        if (colNumber === 1) cell.border = { ...cell.border, left: { style: "medium" as const, color: { argb: NAVY } } };
        if (colNumber === totalCols) cell.border = { ...cell.border, right: { style: "medium" as const, color: { argb: NAVY } } };
      });

      // ══════════════════════════════════════════════════════
      // DATA ROWS — refined design with subtle grouping
      // ══════════════════════════════════════════════════════
      const STRIPE_A = WHITE;
      const STRIPE_B = "F8F7F5";

      exportData.forEach((c: Contract, idx: number) => {
        const row = ws.addRow([
          toDate(c.contract_date),       // col 1 - Date object
          c.china_contract || "",
          c.client_contract || "",
          c.commercial_name || "",
          c.client_name || "",
          c.country || "",
          c.detail || "",
          c.tons_agreed ?? "",           // col 8 - number
          c.tons_shipped ?? "",          // col 9 - number
          c.incoterm || "",
          toDate(c.exw_date),            // col 11 - Date object
          c.status || "",
          toDate(c.eta_final),           // col 13 - Date object
          c.vessel_name || "",
          c.bl_number || "",
          c.arrival_port || "",
          c.advance_paid || "",
          c.balance_paid || "",
          c.pending_client_amount ?? "", // col 19 - number (USD)
          c.notes || "",
        ]);

        const isEven = idx % 2 === 0;
        const rowBg = isEven ? STRIPE_A : STRIPE_B;

        row.eachCell((cell, colNumber) => {
          cell.font = { name: FONT, size: 9.5, color: { argb: INK_SOFT } };
          cell.alignment = { vertical: "middle", wrapText: colNumber === 7 || colNumber === 20 };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
          cell.border = {
            bottom: { style: "thin" as const, color: { argb: "EDECEA" } },
            left: { style: "hair" as const, color: { argb: "E8E6E1" } },
            right: { style: "hair" as const, color: { argb: "E8E6E1" } },
          };
          // Solid left/right outer borders
          if (colNumber === 1) cell.border = { ...cell.border, left: { style: "thin" as const, color: { argb: "D4D2CD" } } };
          if (colNumber === totalCols) cell.border = { ...cell.border, right: { style: "thin" as const, color: { argb: "D4D2CD" } } };

          // ── Date columns: format as date ──
          if ([1, 11, 13].includes(colNumber) && cell.value instanceof Date) {
            cell.numFmt = "DD/MM/YYYY";
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.font = { name: FONT, size: 9.5, color: { argb: INK_SOFT } };
          } else if ([1, 11, 13].includes(colNumber)) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }

          // ── Status column (col 12) — colored text, no background ──
          if (colNumber === 12 && c.status) {
            const st = statusStyles[c.status] || { bg: "F1F5F9", text: "64748B" };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: st.bg } };
            cell.font = { name: FONT, size: 8.5, bold: true, color: { argb: st.text } };
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }

          // ── Balance paid column (col 18) ──
          if (colNumber === 18 && c.balance_paid) {
            const bs = balanceStyles[c.balance_paid] || null;
            if (bs) {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bs.bg } };
              cell.font = { name: FONT, size: 8.5, bold: true, color: { argb: bs.text } };
              cell.alignment = { horizontal: "center", vertical: "middle" };
            }
          }

          // ── USD currency column (col 19) ──
          if (colNumber === 19) {
            if (typeof cell.value === "number") {
              cell.numFmt = '[$$-409]#,##0.00';
              cell.alignment = { horizontal: "right", vertical: "middle" };
              if (cell.value > 0) {
                cell.font = { name: FONT, size: 9.5, bold: true, color: { argb: "B45309" } };
              }
            } else {
              cell.alignment = { horizontal: "right", vertical: "middle" };
            }
          }

          // ── Tons columns (col 8, 9) ──
          if ((colNumber === 8 || colNumber === 9) && typeof cell.value === "number") {
            cell.numFmt = "#,##0.00";
            cell.alignment = { horizontal: "right", vertical: "middle" };
            cell.font = { name: FONT, size: 9.5, color: { argb: INK } };
          }

          // ── Center columns: País=6, Incoterm=10, Anticipo=17 ──
          if ([6, 10, 17].includes(colNumber)) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }

          // ── Contract numbers — navy bold ──
          if ((colNumber === 2 || colNumber === 3) && cell.value) {
            cell.font = { name: FONT, size: 9.5, bold: true, color: { argb: NAVY } };
          }

          // ── Client name (col 5) — slightly bolder ──
          if (colNumber === 5 && cell.value) {
            cell.font = { name: FONT, size: 9.5, bold: false, color: { argb: INK } };
          }

          // ── Commercial name (col 4) ──
          if (colNumber === 4 && cell.value) {
            cell.font = { name: FONT, size: 9.5, bold: true, color: { argb: INK } };
          }
        });

        row.height = 26;
      });

      // ══════════════════════════════════════════════════════
      // TOTALS ROW — elegant dark band with gold accent
      // ══════════════════════════════════════════════════════
      const totalsRow = ws.addRow([]);
      for (let col = 1; col <= totalCols; col++) {
        const cell = totalsRow.getCell(col);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        cell.font = { name: FONT, size: 10, bold: true, color: { argb: WHITE } };
        cell.border = {
          top: { style: "medium" as const, color: { argb: WHITE } },
          bottom: { style: "medium" as const, color: { argb: NAVY } },
        };
      }
      totalsRow.getCell(7).value = "TOTALES";
      totalsRow.getCell(7).alignment = { horizontal: "right", vertical: "middle" };
      totalsRow.getCell(7).font = { name: FONT, size: 10, bold: true, color: { argb: WHITE } };
      totalsRow.getCell(8).value = totalTonsAgreed;
      totalsRow.getCell(8).numFmt = "#,##0.00";
      totalsRow.getCell(8).alignment = { horizontal: "right", vertical: "middle" };
      totalsRow.getCell(9).value = totalTonsShipped;
      totalsRow.getCell(9).numFmt = "#,##0.00";
      totalsRow.getCell(9).alignment = { horizontal: "right", vertical: "middle" };
      totalsRow.getCell(19).value = totalPendingAmount;
      totalsRow.getCell(19).numFmt = '[$$-409]#,##0.00';
      totalsRow.getCell(19).alignment = { horizontal: "right", vertical: "middle" };
      totalsRow.height = 28;

      // ══════════════════════════════════════════════════════
      // FOOTER — two-row: spacer + branded footer
      // ══════════════════════════════════════════════════════
      const emptyRow = ws.addRow([""]);
      emptyRow.height = 4;
      for (let col = 1; col <= totalCols; col++) {
        emptyRow.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
      }

      const footerRowIdx = ws.rowCount + 1;
      const footerRow = ws.addRow([""]);
      ws.mergeCells(footerRowIdx, 1, footerRowIdx, totalCols);
      const footerCell = ws.getCell(`A${footerRowIdx}`);
      footerCell.value = { richText: [
        { text: "IBC Core", font: { name: FONT, size: 8.5, bold: true, color: { argb: NAVY } } },
        { text: `  ·  Generado: ${now.toLocaleString("es-CO")}  ·  © ${now.getFullYear()} IBC STEEL GROUP`, font: { name: FONT, size: 8, italic: true, color: { argb: INK_LIGHT } } },
      ] };
      footerCell.alignment = { horizontal: "center", vertical: "middle" };
      footerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WARM_BG } };
      footerCell.border = { top: { style: "thin" as const, color: { argb: BORDER } } };
      footerRow.height = 24;

      // ── Auto-filter on header row (row 3) ──
      ws.autoFilter = {
        from: { row: 3, column: 1 },
        to: { row: 3, column: totalCols },
      };

      // ── Print setup ──
      ws.pageSetup = {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9,
      };

      // Generate & download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Contratos_IBC_${now.toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Reporte Excel descargado exitosamente");
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.error("Error al generar el reporte Excel");
    } finally {
      setDownloading(false);
    }
  };

  // =====================================================
  // Truncate helper
  // =====================================================
  const truncate = (text: string | null | undefined, maxLen: number) => {
    if (!text) return "—";
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + "\u2026";
  };

  // =====================================================
  // Render
  // =====================================================
  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 12.5, color: "#9CA3B4" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 4, color: "#0B5394", fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          Inicio
        </Link>
        <span style={{ color: "#C5CAD5" }}>/</span>
        <span style={{ fontWeight: 600, color: "#6B7080" }}>Contratos</span>
      </div>

      {/* Page Header */}
      <div style={{
        position: "relative", overflow: "hidden", borderRadius: 14,
        background: "linear-gradient(135deg, #1E3A5F 0%, #2a4d7a 50%, #3B82F6 100%)",
        padding: "14px 24px", marginBottom: 16,
        boxShadow: "0 4px 24px rgba(30,58,95,0.18)",
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
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <FileText className="h-[18px] w-[18px] text-white" />
            </div>
            <div>
              <h1 style={{
                fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                fontSize: 18, fontWeight: 800, color: "#fff",
                letterSpacing: "-0.02em", lineHeight: 1.2,
              }}>Contratos</h1>
              <p style={{ fontSize: 12, color: "rgba(191,219,254,0.7)", fontWeight: 500, margin: 0 }}>
                Gestión y seguimiento de contratos y órdenes de compra
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleDownloadExcel}
              disabled={downloading}
              style={{
                padding: "7px 14px", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)",
                color: "#fff", fontWeight: 600, fontSize: 12,
                cursor: "pointer", fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                display: "flex", alignItems: "center", gap: 5,
                transition: "all 0.2s ease",
                opacity: downloading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Descargar Excel
            </button>
            <button
              onClick={handleNewContract}
              style={{
                padding: "7px 16px", borderRadius: 8, border: "none",
                background: "#fff", color: "#1E3A5F", fontWeight: 700, fontSize: 12,
                cursor: "pointer", fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                display: "flex", alignItems: "center", gap: 5,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)"; }}
            >
              <Plus className="h-4 w-4" />
              Nuevo Contrato
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        {loading && contracts.length === 0 ? (
          <>
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
          </>
        ) : (
          <>
            {[
              { label: "Pdte. Anticipo", value: summaryCounts.pendienteAnticipo, color: "#64748B", bg: "#F1F5F9", icon: Clock, statusKey: "PENDIENTE ANTICIPO" },
              { label: "En Producción", value: summaryCounts.enProduccion, color: "#D97706", bg: "#FFF8EB", icon: Package, statusKey: "EN PRODUCCIÓN" },
              { label: "En Tránsito", value: summaryCounts.enTransito, color: "#0B5394", bg: "#E8F0FE", icon: Ship, statusKey: "EN TRÁNSITO" },
              { label: "Entregados", value: summaryCounts.entregados, color: "#0D9F6E", bg: "#ECFDF3", icon: CheckCircle2, statusKey: "ENTREGADO AL CLIENTE" },
              { label: "Saldos Pdte.", value: summaryCounts.saldosPendientes, color: "#E63946", bg: "#FFF1F2", icon: DollarSign, statusKey: "SALDOS_PENDIENTES" },
            ].map((kpi) => {
              const isActive = kpi.statusKey === "SALDOS_PENDIENTES"
                ? filterBalancePaid.includes("PENDIENTE") && filterStatus.length === 0
                : filterStatus.length === 1 && filterStatus[0] === kpi.statusKey && filterBalancePaid.length === 0;
              return (
                <div
                  key={kpi.label}
                  onClick={() => {
                    if (kpi.statusKey === "SALDOS_PENDIENTES") {
                      if (isActive) {
                        setFilterBalancePaid([]);
                      } else {
                        setFilterBalancePaid(["PENDIENTE"]);
                        setFilterStatus([]);
                      }
                    } else {
                      if (isActive) {
                        setFilterStatus([]);
                      } else {
                        setFilterStatus([kpi.statusKey]);
                        setFilterBalancePaid([]);
                      }
                    }
                  }}
                  className="group cursor-pointer select-none transition-all duration-300"
                  style={{
                    position: "relative", overflow: "hidden",
                    borderRadius: 14, padding: "12px 14px",
                    background: "#FFFFFF",
                    border: isActive ? `2px solid ${kpi.color}40` : "1px solid #F0EDE8",
                    boxShadow: isActive
                      ? `0 4px 16px ${kpi.color}18, 0 1px 3px rgba(26,29,35,0.04)`
                      : "0 1px 2px rgba(26,29,35,0.03), 0 2px 8px rgba(26,29,35,0.04)",
                    transform: isActive ? "translateY(-2px)" : "translateY(0)",
                  }}
                >
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: isActive ? 3 : 2.5,
                    background: `linear-gradient(90deg, ${kpi.color}, ${kpi.color}66, transparent)`,
                  }} />
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex items-center justify-center flex-shrink-0"
                      style={{ width: 32, height: 32, borderRadius: 9, background: kpi.bg, color: kpi.color }}
                    >
                      <kpi.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p style={{ fontSize: 9.5, fontWeight: 700, color: "#9CA3B4", letterSpacing: "0.05em", textTransform: "uppercase", lineHeight: 1.2, marginBottom: 2 }}>{kpi.label}</p>
                      <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, color: "#18191D" }}>
                        {formatNumber(kpi.value)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2.5 items-center p-3" style={{ borderRadius: 14, background: "#FFFFFF", border: "1px solid #F0EDE8", boxShadow: "0 1px 2px rgba(26,29,35,0.03), 0 2px 8px rgba(26,29,35,0.04)" }}>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar comercial, cliente, contrato, detalle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-10 text-sm rounded-xl border-slate-200 bg-white/80 focus:bg-white transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Popover */}
        <Popover onOpenChange={(open) => { if (!open) { setActiveFilterPanel(null); setFilterPanelSearch(""); } }}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-10 gap-1.5 text-sm rounded-xl border-slate-200 hover:border-[#1E3A5F]/30 hover:bg-blue-50/50 transition-all duration-200">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {popoverFilterCount > 0 && (
                <Badge className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px] bg-gradient-to-r from-[#1E3A5F] to-blue-600 text-white border-0 shadow-sm">
                  {popoverFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[440px] max-h-[70vh] p-0 overflow-hidden rounded-2xl border-slate-200/80 shadow-xl shadow-slate-900/10 flex flex-col" align="start" sideOffset={8}>
            {activeFilterPanel === null ? (
              <div className="flex flex-col overflow-hidden flex-1">
                {/* Main view: category grid */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1E3A5F] to-blue-600 shadow-sm">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-white" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">Filtros</h4>
                    {popoverFilterCount > 0 && (
                      <Badge className="h-5 min-w-[20px] px-1.5 text-[10px] bg-gradient-to-r from-[#1E3A5F] to-blue-600 text-white border-0">
                        {popoverFilterCount}
                      </Badge>
                    )}
                  </div>
                  {popoverFilterCount > 0 && (
                    <button
                      onClick={() => {
                        clearFilters();
                      }}
                      className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors"
                    >
                      Limpiar todo
                    </button>
                  )}
                </div>
                <div className="p-2 overflow-y-auto flex-1">
                  {[
                    { key: "commercial", label: "Comercial", selected: filterCommercial, icon: User },
                    { key: "client", label: "Cliente", selected: filterClient, icon: Building2 },
                    { key: "status", label: "Estado", selected: filterStatus, icon: ClipboardCheck },
                    { key: "incoterm", label: "Incoterm", selected: filterIncoterm, icon: Scale },
                    { key: "product_type", label: "Tipo Producto", selected: filterProductType, icon: Package },
                    { key: "balance_paid", label: "Saldos Pendientes", selected: filterBalancePaid, icon: DollarSign },
                    { key: "eta_final", label: "ETA Final", selected: filterEtaFinal, icon: CalendarIcon },
                    { key: "vessel", label: "Motonave", selected: filterVessel, icon: Ship },
                    { key: "port", label: "Puerto de Llegada", selected: filterPort, icon: MapPin },
                    { key: "bl_released", label: "BL Liberado", selected: filterBlReleased, icon: FileCheck },
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => {
                        setActiveFilterPanel(cat.key);
                        setFilterPanelSearch("");
                      }}
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
              </div>
            ) : activeFilterPanel === "eta_final" ? (
              <div className="flex flex-col overflow-hidden flex-1">
                {/* ETA Final tree panel */}
                {(() => {
                  const MONTH_LABELS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
                  // Build tree: year -> month -> dates
                  const dates = filterOptions.eta_final_dates || [];
                  const tree: Record<string, Record<string, string[]>> = {};
                  for (const d of dates) {
                    const [y, m] = d.split("-");
                    if (!y || !m) continue;
                    if (!tree[y]) tree[y] = {};
                    const monthKey = `${y}-${m}`;
                    if (!tree[y][monthKey]) tree[y][monthKey] = [];
                    tree[y][monthKey].push(d);
                  }
                  const years = Object.keys(tree).sort((a, b) => b.localeCompare(a));

                  const toggleExpand = (key: string) => {
                    setEtaTreeExpanded((prev) => {
                      const next = new Set(prev);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    });
                  };

                  // Check helpers
                  const allDatesForYear = (y: string) => Object.values(tree[y]).flat();
                  const allDatesForMonth = (monthKey: string) => {
                    const [y] = monthKey.split("-");
                    return tree[y]?.[monthKey] || [];
                  };
                  const isAllSelected = (arr: string[]) => arr.length > 0 && arr.every((d) => filterEtaFinal.includes(d));
                  const isSomeSelected = (arr: string[]) => arr.some((d) => filterEtaFinal.includes(d));

                  const toggleDates = (datesToToggle: string[]) => {
                    if (isAllSelected(datesToToggle)) {
                      setFilterEtaFinal((prev) => prev.filter((d) => !datesToToggle.includes(d)));
                    } else {
                      setFilterEtaFinal((prev) => [...new Set([...prev, ...datesToToggle])]);
                    }
                  };

                  return (
                    <>
                      <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-white">
                        <button
                          onClick={() => { setActiveFilterPanel(null); setFilterPanelSearch(""); }}
                          className="p-1 rounded-lg hover:bg-slate-200/70 transition-colors"
                        >
                          <ChevronLeft className="h-4 w-4 text-slate-500" />
                        </button>
                        <CalendarIcon className="h-4 w-4 text-[#1E3A5F]" />
                        <h4 className="text-sm font-bold text-slate-800 flex-1">ETA Final</h4>
                        {filterEtaFinal.length > 0 && (
                          <button
                            onClick={() => { setFilterEtaFinal([]); setEtaTreeExpanded(new Set()); }}
                            className="text-[11px] text-red-500 hover:text-red-700 font-semibold transition-colors"
                          >
                            Limpiar
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-slate-50/50">
                        <button
                          onClick={() => setFilterEtaFinal([...dates])}
                          className="text-[11px] text-[#1E3A5F] hover:underline font-medium"
                        >
                          Seleccionar todo
                        </button>
                        <span className="text-[11px] text-slate-400">
                          {filterEtaFinal.length} de {dates.length}
                        </span>
                      </div>

                      <div className="overflow-y-auto flex-1">
                        <div className="p-1.5">
                          {years.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4">Sin fechas</p>
                          ) : (
                            years.map((year) => {
                              const yearDates = allDatesForYear(year);
                              const yearChecked = isAllSelected(yearDates);
                              const yearIndeterminate = !yearChecked && isSomeSelected(yearDates);
                              const yearExpanded = etaTreeExpanded.has(year);
                              const months = Object.keys(tree[year]).sort();

                              return (
                                <div key={year}>
                                  {/* Year row */}
                                  <div className="flex items-center gap-1 px-1 py-1 rounded hover:bg-slate-50">
                                    <button onClick={() => toggleExpand(year)} className="p-0.5">
                                      {yearExpanded ? (
                                        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                                      ) : (
                                        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                      )}
                                    </button>
                                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                                      <Checkbox
                                        checked={yearChecked}
                                        data-indeterminate={yearIndeterminate || undefined}
                                        className={cn("h-4 w-4", yearIndeterminate && "opacity-60")}
                                        onCheckedChange={() => toggleDates(yearDates)}
                                      />
                                      <span className="text-sm font-semibold text-slate-800">{year}</span>
                                    </label>
                                  </div>

                                  {/* Month rows */}
                                  {yearExpanded && months.map((monthKey) => {
                                    const monthNum = parseInt(monthKey.split("-")[1], 10);
                                    const monthLabel = MONTH_LABELS[monthNum - 1] || monthKey;
                                    const monthDates = allDatesForMonth(monthKey);
                                    const monthChecked = isAllSelected(monthDates);
                                    const monthIndeterminate = !monthChecked && isSomeSelected(monthDates);
                                    const monthExpanded = etaTreeExpanded.has(monthKey);

                                    return (
                                      <div key={monthKey}>
                                        <div className="flex items-center gap-1 pl-6 pr-1 py-1 rounded hover:bg-slate-50">
                                          <button onClick={() => toggleExpand(monthKey)} className="p-0.5">
                                            {monthExpanded ? (
                                              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                                            ) : (
                                              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                            )}
                                          </button>
                                          <label className="flex items-center gap-2 cursor-pointer flex-1">
                                            <Checkbox
                                              checked={monthChecked}
                                              data-indeterminate={monthIndeterminate || undefined}
                                              className={cn("h-4 w-4", monthIndeterminate && "opacity-60")}
                                              onCheckedChange={() => toggleDates(monthDates)}
                                            />
                                            <span className="text-sm text-slate-700">{monthLabel}</span>
                                          </label>
                                        </div>

                                        {/* Day rows */}
                                        {monthExpanded && monthDates.sort().map((date) => {
                                          const day = parseInt(date.split("-")[2], 10);
                                          return (
                                            <label
                                              key={date}
                                              className="flex items-center gap-2.5 pl-14 pr-2 py-1 rounded hover:bg-slate-50 cursor-pointer"
                                            >
                                              <Checkbox
                                                checked={filterEtaFinal.includes(date)}
                                                onCheckedChange={() => toggleFilterValue(filterEtaFinal, setFilterEtaFinal, date)}
                                                className="h-4 w-4"
                                              />
                                              <span className="text-sm text-slate-600">{day}</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="flex flex-col overflow-hidden flex-1">
                {/* Drill-down view: search + checkboxes for selected category */}
                {(() => {
                  const panelConfig: Record<string, {
                    label: string;
                    options: { value: string; label: string }[];
                    selected: string[];
                    setter: (v: string[]) => void;
                  }> = {
                    commercial: {
                      label: "Comercial",
                      options: filterOptions.commercial_names.map((n) => ({ value: n, label: n })),
                      selected: filterCommercial,
                      setter: setFilterCommercial,
                    },
                    client: {
                      label: "Cliente",
                      options: filterOptions.client_names.map((n) => ({ value: n, label: n })),
                      selected: filterClient,
                      setter: setFilterClient,
                    },
                    status: {
                      label: "Estado",
                      options: ALL_STATUSES.map((s) => ({ value: s, label: CONTRACT_STATUS_LABELS[s] || s })),
                      selected: filterStatus,
                      setter: setFilterStatus,
                    },
                    incoterm: {
                      label: "Incoterm",
                      options: filterOptions.incoterms.map((i) => ({ value: i, label: i })),
                      selected: filterIncoterm,
                      setter: setFilterIncoterm,
                    },
                    product_type: {
                      label: "Tipo Producto",
                      options: [
                        ...PRODUCT_TYPES.map((pt) => ({ value: pt.value, label: pt.label })),
                        { value: "SIN_DEFINIR", label: "Sin Definir" },
                      ],
                      selected: filterProductType,
                      setter: setFilterProductType,
                    },
                    balance_paid: {
                      label: "Saldos Pendientes",
                      options: [
                        { value: "PENDIENTE", label: "Pendiente" },
                        { value: "OK", label: "Pagado (OK)" },
                      ],
                      selected: filterBalancePaid,
                      setter: setFilterBalancePaid,
                    },
                    vessel: {
                      label: "Motonave",
                      options: filterOptions.vessel_names.map((n) => ({ value: n, label: n })),
                      selected: filterVessel,
                      setter: setFilterVessel,
                    },
                    port: {
                      label: "Puerto de Llegada",
                      options: filterOptions.arrival_ports.map((p) => ({ value: p, label: p })),
                      selected: filterPort,
                      setter: setFilterPort,
                    },
                    bl_released: {
                      label: "BL Liberado",
                      options: [
                        { value: "OK", label: "S\u00ed (OK)" },
                        { value: "PENDIENTE", label: "No (Pendiente)" },
                      ],
                      selected: filterBlReleased,
                      setter: setFilterBlReleased,
                    },
                  };

                  const config = panelConfig[activeFilterPanel];
                  if (!config) return null;

                  const searchLower = filterPanelSearch.toLowerCase();
                  const filteredOptions = config.options.filter((opt) =>
                    opt.label.toLowerCase().includes(searchLower)
                  );

                  return (
                    <>
                      {/* Panel header with back button */}
                      <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-white">
                        <button
                          onClick={() => {
                            setActiveFilterPanel(null);
                            setFilterPanelSearch("");
                          }}
                          className="p-1 rounded-lg hover:bg-slate-200/70 transition-colors"
                        >
                          <ChevronLeft className="h-4 w-4 text-slate-500" />
                        </button>
                        <h4 className="text-sm font-bold text-slate-800 flex-1">{config.label}</h4>
                        {config.selected.length > 0 && (
                          <button
                            onClick={() => config.setter([])}
                            className="text-[11px] text-red-500 hover:text-red-700 font-semibold transition-colors"
                          >
                            Limpiar
                          </button>
                        )}
                      </div>

                      {/* Search input (only for categories with 5+ options) */}
                      {config.options.length >= 5 && (
                        <div className="px-3 py-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                              placeholder="Buscar..."
                              value={filterPanelSearch}
                              onChange={(e) => setFilterPanelSearch(e.target.value)}
                              className="h-8 pl-8 text-xs"
                            />
                          </div>
                        </div>
                      )}

                      {/* Select all / deselect all */}
                      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-slate-50/50">
                        <button
                          onClick={() => config.setter(filteredOptions.map((o) => o.value))}
                          className="text-[11px] text-[#1E3A5F] hover:underline font-medium"
                        >
                          Seleccionar todo
                        </button>
                        <span className="text-[11px] text-slate-400">
                          {config.selected.length} de {config.options.length}
                        </span>
                      </div>

                      {/* Checkbox list */}
                      <div className="overflow-y-auto flex-1">
                        <div className="p-1.5">
                          {filteredOptions.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4">Sin resultados</p>
                          ) : (
                            filteredOptions.map((opt) => (
                              <label
                                key={opt.value}
                                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded hover:bg-slate-50 cursor-pointer transition-colors"
                              >
                                <Checkbox
                                  checked={config.selected.includes(opt.value)}
                                  onCheckedChange={() =>
                                    toggleFilterValue(config.selected, config.setter, opt.value)
                                  }
                                  className="h-4 w-4"
                                />
                                <span className="text-sm text-slate-700 truncate">{opt.label}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Date range filter */}
        <div className="flex items-center gap-1.5 ml-auto">
          <CalendarIcon className="h-4 w-4 text-slate-400 shrink-0" />
          <Input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="w-[140px] h-10 text-sm rounded-xl border-slate-200"
            placeholder="Desde"
            title="Fecha desde"
          />
          <span className="text-slate-300 text-xs font-medium">–</span>
          <Input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="w-[140px] h-10 text-sm rounded-xl border-slate-200"
            placeholder="Hasta"
            title="Fecha hasta"
          />
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-red-400 hover:text-red-600 hover:bg-red-50 h-10 rounded-xl transition-colors"
          >
            <X className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Data Table */}
      <div className="overflow-hidden" style={{ background: "#FFFFFF", borderRadius: 14, border: "1px solid #F0EDE8", boxShadow: "0 1px 2px rgba(26,29,35,0.03), 0 2px 8px rgba(26,29,35,0.04)" }}>
        {loading ? (
          <div className="p-4">
            <TableSkeleton />
          </div>
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 mb-5 shadow-inner">
              <FileText className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-lg font-semibold text-slate-600">No se encontraron contratos</p>
            <p className="text-sm mt-1.5 text-slate-400">
              {hasActiveFilters
                ? "Intenta ajustar los filtros de búsqueda"
                : "Crea tu primer contrato para comenzar"}
            </p>
            {!hasActiveFilters && (
              <Button onClick={handleNewContract} className="mt-4 rounded-xl bg-gradient-to-r from-[#1E3A5F] to-blue-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg transition-all">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Contrato
              </Button>
            )}
          </div>
        ) : (
          <>
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="border-b" style={{ background: "#FAF9F7", borderColor: "#E8E6E1" }}>
                  {/* Fecha */}
                  <TableHead className={cn("px-2 py-2", isSaldosView ? "w-[7%]" : "w-[8%]")}>
                    <SortableHeader
                      label="Fecha"
                      field="contract_date"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  {/* Comercial */}
                  <TableHead className={cn("px-2 py-2", isSaldosView ? "w-[9%]" : "w-[10%]")}>
                    <SortableHeader
                      label="Comercial"
                      field="commercial_name"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  {/* Cliente */}
                  <TableHead className={cn("px-2 py-2", isSaldosView ? "w-[10%]" : "w-[12%]")}>
                    <SortableHeader
                      label="Cliente"
                      field="client_name"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  {/* Cto. Cliente */}
                  <TableHead className={cn("px-2 py-2", isSaldosView ? "w-[9%]" : "w-[10%]")}>
                    <SortableHeader
                      label="Cto. Cliente"
                      field="client_contract"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  {/* Cto. China */}
                  <TableHead className={cn("px-2 py-2", isSaldosView ? "w-[10%]" : "w-[12%]")}>
                    <SortableHeader
                      label="Cto. China"
                      field="china_contract"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  {/* Detalle */}
                  <TableHead className={cn("px-2 py-2", isSaldosView ? "w-[13%]" : "w-[16%]")}>
                    <SortableHeader
                      label="Detalle"
                      field="detail"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  {/* Tons */}
                  <TableHead className={cn("px-2 py-2 text-right", isSaldosView ? "w-[5%]" : "w-[6%]")}>
                    <SortableHeader
                      label="Tons"
                      field="tons_agreed"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      className="justify-end"
                    />
                  </TableHead>
                  {/* Incoterm */}
                  <TableHead className={cn("px-2 py-2", isSaldosView ? "w-[5%]" : "w-[6%]")}>
                    <SortableHeader
                      label="Incoterm"
                      field="incoterm"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  {/* Estado */}
                  <TableHead className={cn("px-2 py-2", isSaldosView ? "w-[9%]" : "w-[10%]")}>
                    <SortableHeader
                      label="Estado"
                      field="status"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  {/* ETA Final */}
                  <TableHead className={cn("px-2 py-2", isSaldosView ? "w-[6%]" : "w-[7%]")}>
                    <SortableHeader
                      label="ETA Final"
                      field="eta_final"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  {/* Saldo Pendiente – only when filtering by Saldos Pendientes */}
                  {isSaldosView && (
                    <TableHead className="w-[8%] px-2 py-2 text-right">
                      <SortableHeader
                        label="Saldo"
                        field="pending_client_amount"
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        className="justify-end"
                      />
                    </TableHead>
                  )}
                  {/* Actions */}
                  <TableHead className={cn("px-1 py-2", isSaldosView ? "w-[3%]" : "w-[3%]")} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract, idx) => (
                  <TableRow
                    key={contract.id}
                    className="cursor-pointer transition-all duration-150 group/row"
                    style={{
                      background: idx % 2 === 1 ? "#FAF9F7" : "#FFFFFF",
                      borderBottom: "1px solid #F0EDE8",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F3EF"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 1 ? "#FAF9F7" : "#FFFFFF"; }}
                    onClick={() => handleViewContract(contract)}
                  >
                    {/* Fecha */}
                    <TableCell className="px-2 py-2.5 text-[11px] text-slate-500 whitespace-nowrap tabular-nums">
                      {formatDate(contract.contract_date)}
                    </TableCell>
                    {/* Comercial */}
                    <TableCell className="px-2 py-2.5 text-xs text-slate-600 truncate font-medium">
                      {contract.commercial_name || "—"}
                    </TableCell>
                    {/* Cliente */}
                    <TableCell className="px-2 py-2.5 text-xs text-slate-600 truncate">
                      {contract.client_name || "—"}
                    </TableCell>
                    {/* Cto. Cliente */}
                    <TableCell className="px-2 py-2.5 text-xs font-bold text-[#1E3A5F] truncate tabular-nums group-hover/row:text-blue-700">
                      {contract.client_contract || "N/A"}
                    </TableCell>
                    {/* Cto. China */}
                    <TableCell className="px-2 py-2.5 text-xs font-bold text-[#1E3A5F] truncate group-hover/row:text-blue-700">
                      {contract.china_contract || "—"}
                    </TableCell>
                    {/* Detalle */}
                    <TableCell className="px-2 py-2.5 text-xs text-slate-500 truncate">
                      <span title={contract.detail || ""}>
                        {truncate(contract.detail, 25)}
                      </span>
                    </TableCell>
                    {/* Tons */}
                    <TableCell className="px-2 py-2.5 text-xs text-right text-slate-600 tabular-nums font-medium">
                      {formatNumber(contract.tons_agreed)}
                    </TableCell>
                    {/* Incoterm */}
                    <TableCell className="px-2 py-2.5">
                      {contract.incoterm ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100/80 text-[10px] font-semibold text-slate-600">
                          {contract.incoterm}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    {/* Estado */}
                    <TableCell className="px-2 py-2.5">
                      <StatusBadge status={contract.status} />
                    </TableCell>
                    {/* ETA Final */}
                    <TableCell className="px-2 py-2.5 text-[11px] text-slate-500 whitespace-nowrap tabular-nums">
                      {formatDate(contract.eta_final)}
                    </TableCell>
                    {/* Saldo Pendiente – only when filtering by Saldos Pendientes */}
                    {isSaldosView && (
                      <TableCell className="px-2 py-2.5 text-right">
                        {contract.pending_client_amount != null && contract.pending_client_amount > 0 ? (
                          <span className="text-xs font-semibold text-rose-600 tabular-nums">
                            {formatCurrency(contract.pending_client_amount)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </TableCell>
                    )}
                    {/* Actions */}
                    <TableCell className="px-1 py-2.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 opacity-0 group-hover/row:opacity-100 transition-opacity rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl shadow-lg">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewContract(contract);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditContract(contract);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateContract(contract);
                            }}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          {contract.status !== "ANULADO" && (
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setContractToAnnul(contract);
                                setAnnulDialogOpen(true);
                              }}
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Anular
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 gap-3" style={{ borderTop: "1px solid #E8E6E1", background: "#FAF9F7" }}>
              <div className="flex items-center gap-4">
                <p className="text-sm text-slate-500">
                  Mostrando <span className="font-semibold text-slate-700">{rangeStart}–{rangeEnd}</span> de <span className="font-semibold text-slate-700">{totalCount}</span>
                </p>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => setPageSize(Number(val))}
                >
                  <SelectTrigger className="w-[100px] h-8 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / pág</SelectItem>
                    <SelectItem value="20">20 / pág</SelectItem>
                    <SelectItem value="50">50 / pág</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="rounded-lg h-8 text-xs"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      if (totalPages <= 5) return true;
                      if (page === 1 || page === totalPages) return true;
                      if (Math.abs(page - currentPage) <= 1) return true;
                      return false;
                    })
                    .map((page, idx, arr) => (
                      <span key={page} className="flex items-center">
                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                          <span className="px-1 text-slate-300">{"\u2026"}</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "h-8 w-8 p-0 rounded-lg text-xs font-semibold transition-all",
                            currentPage === page
                              ? "bg-[#0B5394] hover:bg-[#083D6E] text-white shadow-md shadow-[#0B5394]/25"
                              : "hover:bg-[#FAF9F7] hover:border-[#E8E6E1]"
                          )}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      </span>
                    ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="rounded-lg h-8 text-xs"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* =====================================================
          Contract Detail / Edit / Create Sheet
          ===================================================== */}
      {/* Contract Modal (glassmorphism) */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setSheetOpen(false)}
          />
          {/* Modal Card */}
          <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border border-white/30 bg-white/85 backdrop-blur-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] animate-in fade-in zoom-in-95 duration-300">
            {/* Gradient accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-gradient-to-r from-[#1E3A5F] via-blue-500 to-cyan-400" />

            {/* Header */}
            <div className="relative px-7 pt-6 pb-4">
              {/* Close button */}
              <button
                onClick={() => setSheetOpen(false)}
                className="absolute top-4 right-4 rounded-full p-2 bg-slate-100/80 hover:bg-red-50 hover:text-red-500 text-slate-400 transition-all duration-200 hover:scale-110 hover:rotate-90"
              >
                <X className="h-4 w-4" />
              </button>

              {viewMode && editingContract ? (
                <div className="flex items-start gap-4">
                  {/* Contract icon */}
                  <div className="flex-shrink-0 h-12 w-12 rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                        {formData.china_contract || formData.client_contract || "Sin número"}
                      </h2>
                      <StatusBadge status={formData.status as ContractStatus} />
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-sm text-slate-500">
                      <User className="h-3.5 w-3.5" />
                      <span>{formData.commercial_name || "—"}</span>
                      <span className="text-slate-300">|</span>
                      <Building2 className="h-3.5 w-3.5" />
                      <span>{formData.client_name || "—"}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 pr-8">
                  <div className={cn(
                    "flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center shadow-md",
                    editingContract
                      ? "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/20"
                      : "bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/20"
                  )}>
                    {editingContract ? <Pencil className="h-5 w-5 text-white" /> : <Plus className="h-5 w-5 text-white" />}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      {editingContract ? "Editar Contrato" : "Nuevo Contrato"}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {editingContract
                        ? `Modificando ${formData.china_contract || formData.client_contract || "contrato"}`
                        : "Completa los datos para registrar un nuevo contrato"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Divider with glow */}
            <div className="mx-7 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            <div className="flex-1 overflow-y-auto">
            <div className="px-7 pb-6">
              <Tabs defaultValue="general" className="mt-5">
                <TabsList className="w-full grid grid-cols-4 mb-5 h-11 bg-slate-100/80 rounded-xl p-1 gap-1">
                  <TabsTrigger value="general" className="text-xs gap-1.5 rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-[#1E3A5F] transition-all duration-200">
                    <FileText className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">General</span>
                  </TabsTrigger>
                  <TabsTrigger value="dates" className="text-xs gap-1.5 rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-[#1E3A5F] transition-all duration-200">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Fechas</span>
                  </TabsTrigger>
                  <TabsTrigger value="shipping" className="text-xs gap-1.5 rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-[#1E3A5F] transition-all duration-200">
                    <Ship className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Embarque</span>
                  </TabsTrigger>
                  <TabsTrigger value="docs" className="text-xs gap-1.5 rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-[#1E3A5F] transition-all duration-200">
                    <CreditCard className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Docs/Pagos</span>
                  </TabsTrigger>
                </TabsList>

                {/* ---- Tab: General ---- */}
                <TabsContent value="general" className="space-y-5">
                  {viewMode ? (
                    <div className="space-y-5">
                      {/* Section: Personas */}
                      <div className="rounded-2xl border border-slate-100/80 bg-gradient-to-br from-white/60 to-slate-50/40 p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Personas</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <ReadOnlyField label="Comercial" value={formData.commercial_name} icon={User} accent="blue" />
                          <ReadOnlyField label="Cliente" value={formData.client_name} icon={Building2} accent="blue" />
                        </div>
                      </div>

                      {/* Section: Contratos */}
                      <div className="rounded-2xl border border-slate-100/80 bg-gradient-to-br from-white/60 to-slate-50/40 p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-violet-500 to-violet-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Contratos</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="relative group/copy">
                            <ReadOnlyField label="Contrato Cliente" value={formData.client_contract} icon={Hash} accent="violet" />
                            {formData.client_contract && (
                              <button
                                onClick={() => { navigator.clipboard.writeText(formData.client_contract || ""); toast.success("Contrato cliente copiado"); }}
                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/80 border border-slate-200 shadow-sm opacity-0 group-hover/copy:opacity-100 transition-opacity hover:bg-violet-50 hover:border-violet-200"
                                title="Copiar"
                              >
                                <Copy className="w-3 h-3 text-violet-500" />
                              </button>
                            )}
                          </div>
                          <div className="relative group/copy">
                            <ReadOnlyField label="Contrato China" value={formData.china_contract} icon={Hash} accent="violet" />
                            {formData.china_contract && (
                              <button
                                onClick={() => { navigator.clipboard.writeText(formData.china_contract || ""); toast.success("Contrato China copiado"); }}
                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/80 border border-slate-200 shadow-sm opacity-0 group-hover/copy:opacity-100 transition-opacity hover:bg-violet-50 hover:border-violet-200"
                                title="Copiar"
                              >
                                <Copy className="w-3 h-3 text-violet-500" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <ReadOnlyField label="Fecha Contrato" value={formatDate(formData.contract_date)} icon={CalendarIcon} accent="violet" />
                          <ReadOnlyField label="Mes Emisión" value={formData.issue_month} icon={CalendarIcon} accent="violet" />
                        </div>
                      </div>

                      {/* Section: Producto */}
                      <div className="rounded-2xl border border-slate-100/80 bg-gradient-to-br from-white/60 to-slate-50/40 p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Producto y Logística</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <ReadOnlyField label="País" value={formData.country} icon={Globe} accent="emerald" />
                          <ReadOnlyField label="Incoterm" value={formData.incoterm} icon={Scale} accent="emerald" />
                        </div>
                        <ReadOnlyField label="Detalle" value={formData.detail} icon={Info} accent="emerald" />
                        <div className="grid grid-cols-2 gap-3">
                          <ReadOnlyField label="Tipo Producto" value={formData.product_type} icon={Package} accent="emerald" />
                          <ReadOnlyField label="Tons Acordadas" value={formatNumber(formData.tons_agreed)} icon={Weight} accent="emerald" />
                        </div>
                      </div>

                      {/* Section: Pagos y Estado */}
                      <div className="rounded-2xl border border-slate-100/80 bg-gradient-to-br from-white/60 to-slate-50/40 p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-amber-500 to-amber-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Pagos y Estado</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <ReadOnlyField label="Anticipo Pagado" value={formData.advance_paid} icon={CreditCard} accent="amber" />
                          <ReadOnlyField label="Saldo Pagado" value={formData.balance_paid} icon={DollarSign} accent="amber" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="group relative rounded-xl px-3.5 py-2.5 bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-200/40 transition-all duration-200 hover:shadow-sm hover:scale-[1.01]">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <ClipboardCheck className="h-3 w-3 text-amber-500/70" />
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Estado</p>
                            </div>
                            <StatusBadge status={formData.status as ContractStatus} />
                          </div>
                          <ReadOnlyField label="Notas" value={formData.notes} icon={StickyNote} accent="amber" />
                        </div>
                      </div>

                      {/* Metadata */}
                      {editingContract && (
                        <div className="rounded-2xl bg-gradient-to-r from-slate-50/80 to-slate-100/50 border border-slate-100/60 p-4">
                          <div className="flex items-center gap-4 text-xs text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3" />
                              <span>Creado: <span className="text-slate-600 font-medium">{formatDate(editingContract.created_at)}</span></span>
                            </div>
                            <div className="h-3 w-px bg-slate-200" />
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3" />
                              <span>Actualizado: <span className="text-slate-600 font-medium">{formatDate(editingContract.updated_at)}</span></span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>
                            Comercial <span className="text-red-500">*</span>
                          </Label>
                          <Popover onOpenChange={(open) => { if (open) { setCommercialSearch(""); setCommercialAdding(false); setCommercialEditing(null); } }}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-9 text-sm">
                                {formData.commercial_name || <span className="text-muted-foreground">Seleccionar comercial</span>}
                                <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[320px] p-0" align="start">
                              <div className="flex flex-col">
                                <div className="p-2 border-b border-slate-100">
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <Input
                                      placeholder="Buscar comercial..."
                                      value={commercialSearch}
                                      onChange={(e) => setCommercialSearch(e.target.value)}
                                      className="pl-8 h-8 text-sm"
                                      autoFocus
                                    />
                                  </div>
                                </div>
                                <div className="max-h-[220px] overflow-y-auto p-1">
                                  {COMMERCIAL_NAMES.filter((c) => c.toLowerCase().includes(commercialSearch.toLowerCase())).length === 0 && (
                                    <div className="px-3 py-4 text-center text-xs text-slate-400">No se encontraron comerciales</div>
                                  )}
                                  {COMMERCIAL_NAMES.filter((c) => c.toLowerCase().includes(commercialSearch.toLowerCase())).map((name) => {
                                    const isEditing = commercialEditing?.old === name;
                                    return (
                                      <div key={name} className={cn(
                                        "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors group/item",
                                        formData.commercial_name === name ? "bg-[#1E3A5F]/10" : "hover:bg-slate-50"
                                      )}>
                                        {isEditing ? (
                                          <div className="flex items-center gap-1.5 flex-1">
                                            <Input
                                              value={commercialEditing.newName}
                                              onChange={(e) => setCommercialEditing({ ...commercialEditing, newName: e.target.value })}
                                              onKeyDown={async (e) => {
                                                if (e.key === "Enter" && commercialEditing.newName.trim()) {
                                                  const newN = commercialEditing.newName.trim();
                                                  renameCommercial(commercialEditing.old, newN);
                                                  if (formData.commercial_name === commercialEditing.old) {
                                                    updateFormField("commercial_name", newN);
                                                  }
                                                  setCommercialEditing(null);
                                                  // Bulk rename in Supabase
                                                  try {
                                                    const res = await fetch("/api/contracts", {
                                                      method: "PUT",
                                                      headers: { "Content-Type": "application/json" },
                                                      body: JSON.stringify({ action: "rename_commercial", oldName: commercialEditing.old, newName: newN }),
                                                    });
                                                    if (res.ok) {
                                                      const r = await res.json();
                                                      if (r.updated > 0) {
                                                        toast.info(`Comercial renombrado en ${r.updated} contrato${r.updated > 1 ? "s" : ""}`);
                                                        fetchContracts();
                                                      }
                                                    }
                                                  } catch { /* ignore */ }
                                                }
                                                if (e.key === "Escape") setCommercialEditing(null);
                                              }}
                                              className="h-7 text-xs flex-1"
                                              autoFocus
                                            />
                                            <button
                                              onClick={async () => {
                                                if (commercialEditing.newName.trim()) {
                                                  const newN = commercialEditing.newName.trim();
                                                  renameCommercial(commercialEditing.old, newN);
                                                  if (formData.commercial_name === commercialEditing.old) {
                                                    updateFormField("commercial_name", newN);
                                                  }
                                                  setCommercialEditing(null);
                                                  try {
                                                    const res = await fetch("/api/contracts", {
                                                      method: "PUT",
                                                      headers: { "Content-Type": "application/json" },
                                                      body: JSON.stringify({ action: "rename_commercial", oldName: commercialEditing.old, newName: newN }),
                                                    });
                                                    if (res.ok) {
                                                      const r = await res.json();
                                                      if (r.updated > 0) {
                                                        toast.info(`Comercial renombrado en ${r.updated} contrato${r.updated > 1 ? "s" : ""}`);
                                                        fetchContracts();
                                                      }
                                                    }
                                                  } catch { /* ignore */ }
                                                }
                                              }}
                                              className="p-1 rounded-md hover:bg-emerald-50 text-emerald-500"
                                            >
                                              <CheckCircle2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => setCommercialEditing(null)} className="p-1 rounded-md hover:bg-slate-200 text-slate-400">
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        ) : (
                                          <>
                                            <button
                                              onClick={() => { updateFormField("commercial_name", name); setCommercialSearch(""); }}
                                              className="flex items-center gap-2 flex-1 text-left"
                                            >
                                              <User className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                              <span className={cn("text-sm", formData.commercial_name === name ? "font-medium text-[#1E3A5F]" : "text-slate-700")}>
                                                {name}
                                              </span>
                                              {formData.commercial_name === name && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-[#1E3A5F]" />}
                                            </button>
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                              <button onClick={() => setCommercialEditing({ old: name, newName: name })} className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600">
                                                <Pencil className="w-3 h-3" />
                                              </button>
                                              <button onClick={() => deleteCommercial(name)} className="p-1 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500">
                                                <X className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="border-t border-slate-100 p-2">
                                  {!commercialAdding ? (
                                    <button
                                      onClick={() => setCommercialAdding(true)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      Agregar nuevo comercial
                                    </button>
                                  ) : (
                                    <div className="flex gap-1.5">
                                      <Input
                                        placeholder="Nombre del comercial"
                                        value={commercialSearch}
                                        onChange={(e) => setCommercialSearch(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" && commercialSearch.trim()) {
                                            addCommercial(commercialSearch.trim());
                                            updateFormField("commercial_name", commercialSearch.trim());
                                            setCommercialSearch("");
                                            setCommercialAdding(false);
                                          }
                                        }}
                                        className="h-8 text-xs flex-1"
                                        autoFocus
                                      />
                                      <Button
                                        size="sm"
                                        className="h-8 text-xs bg-[#1E3A5F] hover:bg-[#2A4D7A]"
                                        onClick={() => {
                                          if (commercialSearch.trim()) {
                                            addCommercial(commercialSearch.trim());
                                            updateFormField("commercial_name", commercialSearch.trim());
                                            setCommercialSearch("");
                                            setCommercialAdding(false);
                                          }
                                        }}
                                      >
                                        <Plus className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  )}
                                  <p className="text-[9px] text-slate-400 text-center mt-1.5">Los cambios se reflejan en todos los módulos</p>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-1.5">
                          <Label>
                            Cliente <span className="text-red-500">*</span>
                          </Label>
                          <Popover onOpenChange={(open) => { if (open) { setClientSearch(""); setClientAdding(false); } }}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-9 text-sm">
                                {formData.client_name || <span className="text-muted-foreground">Buscar cliente...</span>}
                                <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[320px] p-0" align="start">
                              <div className="flex flex-col">
                                <div className="p-2 border-b border-slate-100">
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <Input
                                      placeholder="Buscar cliente..."
                                      value={clientSearch}
                                      onChange={(e) => setClientSearch(e.target.value)}
                                      className="pl-8 h-8 text-sm"
                                      autoFocus
                                    />
                                  </div>
                                </div>
                                <div className="max-h-[200px] overflow-y-auto p-1">
                                  {allClients.filter((c) => c.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && !clientAdding && (
                                    <div className="px-3 py-4 text-center text-xs text-slate-400">No se encontraron clientes</div>
                                  )}
                                  {allClients.filter((c) => c.toLowerCase().includes(clientSearch.toLowerCase())).map((c) => (
                                    <button
                                      key={c}
                                      onClick={() => { updateFormField("client_name", c); setClientSearch(""); }}
                                      className={cn(
                                        "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2",
                                        formData.client_name === c ? "bg-[#1E3A5F]/10 text-[#1E3A5F] font-medium" : "hover:bg-slate-50 text-slate-700"
                                      )}
                                    >
                                      <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                      {c}
                                      {formData.client_name === c && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-[#1E3A5F]" />}
                                    </button>
                                  ))}
                                </div>
                                <div className="border-t border-slate-100 p-2">
                                  {!clientAdding ? (
                                    <button
                                      onClick={() => setClientAdding(true)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      Agregar nuevo cliente
                                    </button>
                                  ) : (
                                    <div className="flex gap-1.5">
                                      <Input
                                        placeholder="Nombre del nuevo cliente"
                                        value={clientSearch}
                                        onChange={(e) => setClientSearch(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" && clientSearch.trim()) {
                                            addCustomClient(clientSearch);
                                            updateFormField("client_name", clientSearch.trim().toUpperCase());
                                            setClientSearch("");
                                            setClientAdding(false);
                                          }
                                        }}
                                        className="h-8 text-xs flex-1"
                                        autoFocus
                                      />
                                      <Button
                                        size="sm"
                                        className="h-8 text-xs bg-[#1E3A5F] hover:bg-[#2A4D7A]"
                                        onClick={() => {
                                          if (clientSearch.trim()) {
                                            addCustomClient(clientSearch);
                                            updateFormField("client_name", clientSearch.trim().toUpperCase());
                                            setClientSearch("");
                                            setClientAdding(false);
                                          }
                                        }}
                                      >
                                        <Plus className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>Contrato Cliente</Label>
                          <Input
                            placeholder="Número contrato cliente"
                            value={formData.client_contract || ""}
                            onChange={(e) =>
                              updateFormField("client_contract", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Contrato China</Label>
                          <Input
                            placeholder="Número contrato China"
                            value={formData.china_contract || ""}
                            onChange={(e) =>
                              updateFormField("china_contract", e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>Fecha Contrato</Label>
                          <Input
                            type="date"
                            value={formData.contract_date || ""}
                            onChange={(e) =>
                              updateFormField("contract_date", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Mes Emisión</Label>
                          <Input
                            placeholder="Ej: Enero 2025"
                            value={formData.issue_month || ""}
                            onChange={(e) =>
                              updateFormField("issue_month", e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>País</Label>
                          <Select
                            value={formData.country || ""}
                            onValueChange={(val) => updateFormField("country", val)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleccionar país" />
                            </SelectTrigger>
                            <SelectContent>
                              {COUNTRIES.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {COUNTRY_FLAGS[c.toUpperCase()] || ""} {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Incoterm</Label>
                          <Popover onOpenChange={(open) => { if (open) { setIncotermSearch(""); setIncotermAdding(false); } }}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-9 text-sm">
                                {formData.incoterm || <span className="text-muted-foreground">Seleccionar incoterm</span>}
                                <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[240px] p-0" align="start">
                              <div className="flex flex-col">
                                <div className="p-2 border-b border-slate-100">
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <Input
                                      placeholder="Buscar incoterm..."
                                      value={incotermSearch}
                                      onChange={(e) => setIncotermSearch(e.target.value)}
                                      className="pl-8 h-8 text-sm"
                                      autoFocus
                                    />
                                  </div>
                                </div>
                                <div className="max-h-[200px] overflow-y-auto p-1">
                                  {allIncoterms.filter((i) => i.toLowerCase().includes(incotermSearch.toLowerCase())).map((inc) => (
                                    <button
                                      key={inc}
                                      onClick={() => { updateFormField("incoterm", inc); setIncotermSearch(""); }}
                                      className={cn(
                                        "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2",
                                        formData.incoterm === inc ? "bg-[#1E3A5F]/10 text-[#1E3A5F] font-medium" : "hover:bg-slate-50 text-slate-700"
                                      )}
                                    >
                                      {inc}
                                      {formData.incoterm === inc && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-[#1E3A5F]" />}
                                    </button>
                                  ))}
                                </div>
                                <div className="border-t border-slate-100 p-2">
                                  {!incotermAdding ? (
                                    <button
                                      onClick={() => setIncotermAdding(true)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      Agregar nuevo incoterm
                                    </button>
                                  ) : (
                                    <div className="flex gap-1.5">
                                      <Input
                                        placeholder="Nuevo incoterm"
                                        value={incotermSearch}
                                        onChange={(e) => setIncotermSearch(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" && incotermSearch.trim()) {
                                            addCustomIncoterm(incotermSearch);
                                            updateFormField("incoterm", incotermSearch.trim().toUpperCase());
                                            setIncotermSearch("");
                                            setIncotermAdding(false);
                                          }
                                        }}
                                        className="h-8 text-xs flex-1"
                                        autoFocus
                                      />
                                      <Button
                                        size="sm"
                                        className="h-8 text-xs bg-[#1E3A5F] hover:bg-[#2A4D7A]"
                                        onClick={() => {
                                          if (incotermSearch.trim()) {
                                            addCustomIncoterm(incotermSearch);
                                            updateFormField("incoterm", incotermSearch.trim().toUpperCase());
                                            setIncotermSearch("");
                                            setIncotermAdding(false);
                                          }
                                        }}
                                      >
                                        <Plus className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Detalle</Label>
                        <Textarea
                          placeholder="Descripción del contrato"
                          rows={3}
                          value={formData.detail || ""}
                          onChange={(e) => updateFormField("detail", e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>Tipo Producto</Label>
                          <Select
                            value={formData.product_type || ""}
                            onValueChange={(val) =>
                              updateFormField("product_type", val)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleccionar tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              {PRODUCT_TYPES.map((pt) => (
                                <SelectItem key={pt.value} value={pt.value}>
                                  {pt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Tons Acordadas</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0"
                            value={formData.tons_agreed ?? ""}
                            onChange={(e) =>
                              updateFormField(
                                "tons_agreed",
                                e.target.value === "" ? null : Number(e.target.value)
                              )
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>Anticipo Pagado <span className="text-[10px] text-blue-500">(auto)</span></Label>
                          <Input
                            placeholder="Ej: SI, NO"
                            value={formData.advance_paid || ""}
                            onChange={(e) => updateFormField("advance_paid", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Saldo Pagado <span className="text-[10px] text-blue-500">(auto)</span></Label>
                          <Input
                            placeholder="Ej: OK, PENDIENTE"
                            value={formData.balance_paid || ""}
                            onChange={(e) =>
                              updateFormField("balance_paid", e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Estado</Label>
                        <Select
                          value={formData.status || ""}
                          onValueChange={(val) => updateFormField("status", val)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar estado" />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {CONTRACT_STATUS_LABELS[s] || s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Notas</Label>
                        <Textarea
                          placeholder="Observaciones o notas internas"
                          rows={3}
                          value={formData.notes || ""}
                          onChange={(e) => updateFormField("notes", e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* ---- Tab: Fechas y Tiempos ---- */}
                <TabsContent value="dates" className="space-y-5">
                  {viewMode ? (
                    <div className="space-y-5">
                      {/* Section: Producción */}
                      <div className="rounded-2xl border border-slate-100/80 bg-gradient-to-br from-white/60 to-slate-50/40 p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-amber-500 to-amber-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Producción</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <ReadOnlyField label="Tiempo Producción (días)" value={formData.production_time_days} icon={Clock} accent="amber" />
                          <ReadOnlyField label="Fecha Pago Anticipo" value={formatDate(formData.advance_payment_date)} icon={CreditCard} accent="amber" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <ReadOnlyField label="Fecha Entrega PCC" value={formatDate(formData.delivery_date_pcc)} icon={CalendarIcon} accent="amber" />
                          <ReadOnlyField label="Fecha EXW" value={formatDate(formData.exw_date)} icon={CalendarIcon} accent="amber" />
                        </div>
                        <ReadOnlyField label="Cumplimiento EXW" value={formData.exw_compliance} icon={CheckCircle2} accent="amber" />
                      </div>

                      {/* Section: Tránsito */}
                      <div className="rounded-2xl border border-slate-100/80 bg-gradient-to-br from-white/60 to-slate-50/40 p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Tránsito y Llegada</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <ReadOnlyField label="ETD" value={formatDate(formData.etd)} icon={Ship} accent="blue" />
                          <ReadOnlyField label="ETA Inicial" value={formatDate(formData.eta_initial)} icon={CalendarIcon} accent="blue" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <ReadOnlyField label="ETA Final" value={formatDate(formData.eta_final)} icon={CalendarIcon} accent="blue" />
                          <ReadOnlyField label="Diferencia Días" value={formData.days_difference} icon={Clock} accent="blue" />
                        </div>
                      </div>

                      {/* Section: Entrega */}
                      <div className="rounded-2xl border border-slate-100/80 bg-gradient-to-br from-white/60 to-slate-50/40 p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Entrega</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <ReadOnlyField label="Mes Entrega" value={formData.delivery_month} icon={CalendarIcon} accent="emerald" />
                          <ReadOnlyField label="Año Entrega" value={formData.delivery_year} icon={CalendarIcon} accent="emerald" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>Tiempo Producción (días)</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={formData.production_time_days ?? ""}
                            onChange={(e) =>
                              updateFormField(
                                "production_time_days",
                                e.target.value === "" ? null : Number(e.target.value)
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Fecha Pago Anticipo</Label>
                          <Input
                            type="date"
                            value={formData.advance_payment_date || ""}
                            onChange={(e) =>
                              updateFormField("advance_payment_date", e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>Fecha Entrega PCC <span className="text-[10px] text-blue-500">(auto)</span></Label>
                          <Input
                            type="date"
                            value={formData.delivery_date_pcc || ""}
                            onChange={(e) => updateFormField("delivery_date_pcc", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Fecha EXW <span className="text-[10px] text-blue-500">(auto)</span></Label>
                          <Input
                            type="date"
                            value={formData.exw_date || ""}
                            onChange={(e) => updateFormField("exw_date", e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Cumplimiento EXW <span className="text-[10px] text-blue-500">(auto)</span></Label>
                        <Input
                          placeholder="Ej: CUMPLE, NO CUMPLE"
                          value={formData.exw_compliance || ""}
                          onChange={(e) => updateFormField("exw_compliance", e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>ETD</Label>
                          <Input
                            type="date"
                            value={formData.etd || ""}
                            onChange={(e) => updateFormField("etd", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>ETA Inicial</Label>
                          <Input
                            type="date"
                            value={formData.eta_initial || ""}
                            onChange={(e) =>
                              updateFormField("eta_initial", e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>ETA Final</Label>
                          <Input
                            type="date"
                            value={formData.eta_final || ""}
                            onChange={(e) =>
                              updateFormField("eta_final", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Diferencia Días</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={formData.days_difference ?? ""}
                            onChange={(e) =>
                              updateFormField(
                                "days_difference",
                                e.target.value === "" ? null : Number(e.target.value)
                              )
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>Mes Entrega <span className="text-[10px] text-blue-500">(auto)</span></Label>
                          <Input
                            placeholder="Ej: Enero"
                            value={formData.delivery_month || ""}
                            onChange={(e) => updateFormField("delivery_month", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Año Entrega <span className="text-[10px] text-blue-500">(auto)</span></Label>
                          <Input
                            placeholder="Ej: 2026"
                            value={formData.delivery_year || ""}
                            onChange={(e) => updateFormField("delivery_year", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* ---- Tab: Embarque ---- */}
                <TabsContent value="shipping" className="space-y-5">
                  {viewMode ? (
                    <div className="space-y-5">
                      {/* Section: Navío */}
                      <div className="rounded-2xl border border-slate-100/80 bg-gradient-to-br from-white/60 to-slate-50/40 p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Navío y Ruta</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <ReadOnlyField label="Motonave" value={formData.vessel_name} icon={Ship} accent="blue" />
                          <ReadOnlyField label="Naviera" value={formData.shipping_company} icon={Anchor} accent="blue" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <ReadOnlyField label="Número BL" value={formData.bl_number} icon={FileText} accent="blue" />
                          <ReadOnlyField label="Puerto Llegada" value={formData.arrival_port} icon={MapPin} accent="blue" />
                        </div>
                        <ReadOnlyField label="Tipo Embarque" value={formData.shipment_type} icon={Truck} accent="blue" />
                      </div>

                      {/* Section: Tonelaje */}
                      <div className="rounded-2xl border border-slate-100/80 bg-gradient-to-br from-white/60 to-slate-50/40 p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-violet-500 to-violet-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Tonelaje</h4>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <ReadOnlyField label="Tons Embarcadas" value={formatNumber(formData.tons_shipped)} icon={Weight} accent="violet" />
                          <ReadOnlyField label="Diferencia Tons" value={formatNumber(formData.tons_difference)} icon={Scale} accent="violet" />
                          <ReadOnlyField label="Cumplimiento Tons" value={formData.tons_compliance} icon={CheckCircle2} accent="violet" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>Motonave</Label>
                          <Input
                            placeholder="Nombre de la motonave"
                            value={formData.vessel_name || ""}
                            onChange={(e) =>
                              updateFormField("vessel_name", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Naviera</Label>
                          <Input
                            placeholder="Compañía naviera"
                            value={formData.shipping_company || ""}
                            onChange={(e) =>
                              updateFormField("shipping_company", e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>Número BL</Label>
                          <Input
                            placeholder="Número de Bill of Lading"
                            value={formData.bl_number || ""}
                            onChange={(e) =>
                              updateFormField("bl_number", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Puerto Llegada</Label>
                          <Input
                            placeholder="Ej: Buenaventura"
                            value={formData.arrival_port || ""}
                            onChange={(e) =>
                              updateFormField("arrival_port", e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Tipo Embarque</Label>
                        <Input
                          placeholder="Ej: FCL, LCL, Granel"
                          value={formData.shipment_type || ""}
                          onChange={(e) =>
                            updateFormField("shipment_type", e.target.value)
                          }
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label>Tons Embarcadas</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0"
                            value={formData.tons_shipped ?? ""}
                            onChange={(e) =>
                              updateFormField(
                                "tons_shipped",
                                e.target.value === "" ? null : Number(e.target.value)
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Diferencia <span className="text-[10px] text-blue-500">(auto)</span></Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0"
                            value={formData.tons_difference ?? ""}
                            onChange={(e) =>
                              updateFormField(
                                "tons_difference",
                                e.target.value === "" ? null : Number(e.target.value)
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Cumplimiento <span className="text-[10px] text-blue-500">(auto)</span></Label>
                          <Input
                            placeholder="Ej: CUMPLE"
                            value={formData.tons_compliance || ""}
                            onChange={(e) => updateFormField("tons_compliance", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* ---- Tab: Documentos y Pagos ---- */}
                <TabsContent value="docs" className="space-y-5">
                  {viewMode ? (
                    <div className="space-y-5">
                      {/* Section: Documentos */}
                      <div className="rounded-2xl border border-slate-100/80 bg-gradient-to-br from-white/60 to-slate-50/40 p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Documentos</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <ReadOnlyField label="BL Liberado" value={formData.bl_released} icon={FileCheck} accent="emerald" />
                          <div className="group relative rounded-xl px-3.5 py-2.5 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border border-emerald-100/50">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <FileText className="h-3 w-3 text-emerald-500/70" />
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Documentos Enviados</p>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {formData.documents_sent ? formData.documents_sent.split(", ").map((doc) => (
                                <span key={doc} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700">
                                  {doc}
                                </span>
                              )) : <span className="text-sm text-slate-400">—</span>}
                            </div>
                          </div>
                        </div>
                        <div className="group relative rounded-xl px-3.5 py-2.5 bg-gradient-to-br from-amber-500/5 to-amber-500/10 border border-amber-100/50">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Clock className="h-3 w-3 text-amber-500/70" />
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Documentos Pendientes</p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {formData.documents_pending && formData.documents_pending !== "Todos enviados"
                              ? formData.documents_pending.split(", ").map((doc) => (
                                  <span key={doc} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
                                    {doc}
                                  </span>
                                ))
                              : formData.documents_pending === "Todos enviados"
                                ? <span className="text-sm font-medium text-emerald-600">Todos enviados</span>
                                : <span className="text-sm text-slate-400">—</span>}
                          </div>
                        </div>
                        <ReadOnlyField label="Docs Físicos Enviados" value={formData.physical_docs_sent} icon={Truck} accent="emerald" />
                      </div>

                      {/* Section: Pagos */}
                      <div className="rounded-2xl border border-slate-100/80 bg-gradient-to-br from-white/60 to-slate-50/40 p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-rose-500 to-rose-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Pagos</h4>
                        </div>
                        <ReadOnlyField
                          label="Monto Pendiente Cliente"
                          value={
                            formData.pending_client_amount != null
                              ? formatCurrency(formData.pending_client_amount)
                              : "—"
                          }
                          icon={DollarSign}
                          accent="rose"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>BL Liberado</Label>
                          <Select value={formData.bl_released || ""} onValueChange={(v) => updateFormField("bl_released", v || null)}>
                            <SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="OK">OK</SelectItem>
                              <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Documentos Enviados</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-between font-normal h-auto min-h-[36px] text-sm text-left py-2">
                                <span className="truncate">
                                  {formData.documents_sent
                                    ? `${formData.documents_sent.split(", ").length} documentos`
                                    : <span className="text-muted-foreground">Seleccionar documentos</span>}
                                </span>
                                <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start">
                              <div className="p-3 space-y-1 max-h-[300px] overflow-y-auto">
                                {ALL_DOCUMENTS.map((doc) => {
                                  const sentList = formData.documents_sent ? formData.documents_sent.split(", ").filter(Boolean) : [];
                                  const isChecked = sentList.includes(doc.key);
                                  const productType = (formData.product_type as string) || "";
                                  const incoterm = (formData.incoterm as string) || "";
                                  const isApplicable =
                                    (doc.conditional === null) ||
                                    (doc.conditional === "MP" && productType.toUpperCase().includes("MP")) ||
                                    (doc.conditional === "CIF" && incoterm.toUpperCase().includes("CIF"));

                                  if (!isApplicable) return null;

                                  return (
                                    <label
                                      key={doc.key}
                                      className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                                        isChecked ? "bg-emerald-50" : "hover:bg-slate-50"
                                      )}
                                    >
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={(checked) => {
                                          let updated: string[];
                                          if (checked) {
                                            updated = [...sentList, doc.key];
                                          } else {
                                            updated = sentList.filter((s) => s !== doc.key);
                                          }
                                          updateFormField("documents_sent", updated.length > 0 ? updated.join(", ") : "");
                                        }}
                                        className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                      />
                                      <div className="flex-1">
                                        <span className={cn("text-sm", isChecked ? "font-medium text-emerald-700" : "text-slate-700")}>
                                          {doc.label}
                                        </span>
                                        {doc.conditional && (
                                          <span className="ml-1.5 text-[10px] text-slate-400">
                                            (solo {doc.conditional})
                                          </span>
                                        )}
                                      </div>
                                      {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                    </label>
                                  );
                                })}
                              </div>
                              <div className="border-t border-slate-100 px-3 py-2 flex items-center justify-between">
                                <span className="text-[10px] text-slate-400">
                                  {formData.documents_sent ? formData.documents_sent.split(", ").length : 0} de {ALL_DOCUMENTS.filter((d) => {
                                    if (d.conditional === "MP" && !(formData.product_type || "").toString().toUpperCase().includes("MP")) return false;
                                    if (d.conditional === "CIF" && !(formData.incoterm || "").toString().toUpperCase().includes("CIF")) return false;
                                    return true;
                                  }).length} enviados
                                </span>
                                <button
                                  onClick={() => {
                                    const applicable = ALL_DOCUMENTS.filter((d) => {
                                      if (d.conditional === "MP" && !(formData.product_type || "").toString().toUpperCase().includes("MP")) return false;
                                      if (d.conditional === "CIF" && !(formData.incoterm || "").toString().toUpperCase().includes("CIF")) return false;
                                      return true;
                                    });
                                    updateFormField("documents_sent", applicable.map((d) => d.key).join(", "));
                                  }}
                                  className="text-[10px] font-medium text-blue-600 hover:text-blue-700"
                                >
                                  Marcar todos
                                </button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Documentos Pendientes <span className="text-[10px] text-slate-400 font-normal">(auto)</span></Label>
                        <div className="min-h-[36px] px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/80 text-sm text-slate-600">
                          {formData.documents_pending
                            ? formData.documents_pending === "Todos enviados"
                              ? <span className="text-emerald-600 font-medium">Todos los documentos enviados</span>
                              : formData.documents_pending.split(", ").map((doc) => (
                                  <span key={doc} className="inline-flex items-center gap-1 mr-2 mb-1 px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-200">
                                    <Clock className="w-2.5 h-2.5" />
                                    {doc}
                                  </span>
                                ))
                            : <span className="text-slate-400">Sin información de documentos enviados</span>}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Docs Físicos Enviados</Label>
                        <Select value={formData.physical_docs_sent || ""} onValueChange={(v) => updateFormField("physical_docs_sent", v || null)}>
                          <SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OK">OK</SelectItem>
                            <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Monto Pendiente Cliente (USD)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.pending_client_amount ?? ""}
                          onChange={(e) =>
                            updateFormField(
                              "pending_client_amount",
                              e.target.value === "" ? null : Number(e.target.value)
                            )
                          }
                        />
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
            </div>

            {/* Modal Footer */}
            <div className="mx-7 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            {!viewMode && (
              <div className="flex items-center justify-end gap-3 px-7 py-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSheetOpen(false)}
                  disabled={submitting}
                  className="rounded-xl border-slate-200 hover:bg-slate-50 hover:border-slate-300 px-5 transition-all duration-200"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="rounded-xl bg-gradient-to-r from-[#1E3A5F] to-blue-600 hover:from-[#162d4a] hover:to-blue-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 px-6 transition-all duration-200 hover:scale-[1.02]"
                  disabled={submitting}
                  onClick={handleSubmit}
                >
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingContract ? "Guardar Cambios" : "Crear Contrato"}
                </Button>
              </div>
            )}

            {viewMode && (
              <div className="flex items-center justify-between px-7 py-5">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 px-5 transition-all duration-200"
                  onClick={() => {
                    const clientContract = editingContract?.client_contract || "";
                    if (clientContract) {
                      navigator.clipboard.writeText(clientContract);
                      toast.success(`Contrato "${clientContract}" copiado al portapapeles`, { duration: 3000 });
                    }
                    window.open("https://www.dropbox.com/home/IBC%20Team%20Folder/IBC%20SAC", "_blank");
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver Documentos en Dropbox
                </Button>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSheetOpen(false)}
                    className="rounded-xl border-slate-200 hover:bg-slate-50 hover:border-slate-300 px-5 transition-all duration-200"
                  >
                    Cerrar
                  </Button>
                  <Button
                    type="button"
                    className="rounded-xl bg-gradient-to-r from-[#1E3A5F] to-blue-600 hover:from-[#162d4a] hover:to-blue-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 px-6 transition-all duration-200 hover:scale-[1.02]"
                    onClick={() => setViewMode(false)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          Annul Confirmation Dialog
          ===================================================== */}
      <AlertDialog open={annulDialogOpen} onOpenChange={setAnnulDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anular Contrato</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas anular el contrato{" "}
              <span className="font-semibold text-slate-900">
                {contractToAnnul?.china_contract ||
                  contractToAnnul?.client_contract ||
                  ""}
              </span>
              ? Esta acción cambiará el estado del contrato a &quot;Anulado&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleAnnul}
            >
              Anular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
