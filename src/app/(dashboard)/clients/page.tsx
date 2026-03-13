"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { addLogoToWorkbook, addLogoToHeader } from "@/lib/excel-logo";
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
  ChevronLeft,
  ChevronRight,
  Loader2,
  Building2,
  User,
  MapPin,
  Briefcase,
  CreditCard,
  Download,
  SlidersHorizontal,
  X,
  Globe,
  Factory,
  Tag,
  Phone,
  Mail,
  Hash,
  FileText,
  StickyNote,
  CheckCircle2,
  DollarSign,
  Trash2,
  Send,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import {
  cn,
  CLIENT_TYPE_LABELS,
  formatDate,
  formatNumber,
} from "@/lib/utils";
import type { Client, ClientType, Profile, AdditionalContact, ShippingAddress } from "@/types";

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
import Link from "next/link";

// ─── DESIGN TOKENS ───────────────────────────────────────────
import { T } from "@/lib/design-tokens";

// ─── SVG ICONS ───────────────────────────────────────────────
const I = {
  building: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>,
  user: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  users: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  mail: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
  phone: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  globe: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>,
  chevR: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>,
  plus: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M12 5v14"/></svg>,
  search: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  download: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
  filter: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  home: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>,
  sparkle: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z"/></svg>,
  eye: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>,
  edit: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>,
  ban: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>,
  dots: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>,
};

// ─── RING CHART ──────────────────────────────────────────────
function Ring({ value, max, size = 48, sw = 4, color, bg }: { value: number; max: number; size?: number; sw?: number; color: string; bg?: string }) {
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

// ─── ANIMATED NUMBER ─────────────────────────────────────────
function AnimNum({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const animRef = useRef(0);

  useEffect(() => {
    const start = animRef.current;
    const diff = value - start;
    if (diff === 0) return;
    let rafId: number;
    const duration = 1200;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(start + diff * eased);
      setDisplay(current);
      if (progress < 1) rafId = requestAnimationFrame(step);
      else animRef.current = value;
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value]);

  return <>{prefix}{display.toLocaleString("es-CO")}{suffix}</>;
}

// ─── PREMIUM CARD ────────────────────────────────────────────
function PCard({ children, style = {}, delay = 0, hover = false, onClick }: { children: React.ReactNode; style?: React.CSSProperties; delay?: number; hover?: boolean; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{
      background: T.surface, borderRadius: T.radius, border: `1px solid ${T.borderLight}`,
      boxShadow: T.shadow, animation: `cFadeUp 0.55s cubic-bezier(0.4,0,0.2,1) ${delay}ms both`,
      overflow: "hidden", cursor: onClick ? "pointer" : "default",
      transition: hover ? "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" : undefined,
      ...style,
    }}
    onMouseEnter={hover ? (e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = T.shadowLg; } : undefined}
    onMouseLeave={hover ? (e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = T.shadow; } : undefined}
    >{children}</div>
  );
}

// =====================================================
// Constants
// =====================================================

const COUNTRY_FLAGS: Record<string, string> = {
  Colombia: "\u{1F1E8}\u{1F1F4}",
  COLOMBIA: "\u{1F1E8}\u{1F1F4}",
  Venezuela: "\u{1F1FB}\u{1F1EA}",
  VENEZUELA: "\u{1F1FB}\u{1F1EA}",
  Bolivia: "\u{1F1E7}\u{1F1F4}",
  BOLIVIA: "\u{1F1E7}\u{1F1F4}",
  Ecuador: "\u{1F1EA}\u{1F1E8}",
  ECUADOR: "\u{1F1EA}\u{1F1E8}",
  Perú: "\u{1F1F5}\u{1F1EA}",
  PERÚ: "\u{1F1F5}\u{1F1EA}",
  Peru: "\u{1F1F5}\u{1F1EA}",
  PERU: "\u{1F1F5}\u{1F1EA}",
  Brasil: "\u{1F1E7}\u{1F1F7}",
  BRASIL: "\u{1F1E7}\u{1F1F7}",
  Brazil: "\u{1F1E7}\u{1F1F7}",
  México: "\u{1F1F2}\u{1F1FD}",
  MÉXICO: "\u{1F1F2}\u{1F1FD}",
  Chile: "\u{1F1E8}\u{1F1F1}",
  CHILE: "\u{1F1E8}\u{1F1F1}",
  Argentina: "\u{1F1E6}\u{1F1F7}",
  ARGENTINA: "\u{1F1E6}\u{1F1F7}",
};

type SortField =
  | "company_name"
  | "contact_name"
  | "email"
  | "phone"
  | "country"
  | "client_type"
  | "industry_sector"
  | "created_at";

type SortDirection = "asc" | "desc";

// =====================================================
// Extended client type with joined commercial profile
// =====================================================
interface ClientWithCommercial extends Client {
  assigned_commercial?: Pick<Profile, "id" | "full_name" | "email"> | null;
}

// =====================================================
// Client Type Badge (premium)
// =====================================================
const CLIENT_TYPE_COLORS: Record<ClientType, { dot: string; bg: string; text: string; border: string }> = {
  nacional: { dot: "bg-blue-500 shadow-blue-500/50", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  internacional: { dot: "bg-emerald-500 shadow-emerald-500/50", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  distribuidor: { dot: "bg-violet-500 shadow-violet-500/50", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  usuario_final: { dot: "bg-slate-400 shadow-slate-400/50", bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
};

function ClientTypeBadge({ type }: { type: ClientType | null | undefined }) {
  if (!type) return <span className="text-slate-400 text-[11px]">--</span>;
  const colors = CLIENT_TYPE_COLORS[type] || CLIENT_TYPE_COLORS.usuario_final;
  const label = CLIENT_TYPE_LABELS[type] || type;
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-semibold text-[10px] leading-tight px-2.5 py-1 whitespace-nowrap gap-1.5 rounded-lg",
        colors.bg, colors.text, colors.border
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shadow-sm inline-block", colors.dot)} />
      {label}
    </Badge>
  );
}

// =====================================================
// Card View Helpers
// =====================================================

const AVATAR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-orange-500",
  "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-rose-500",
  "bg-cyan-500", "bg-amber-500",
];

function getInitials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getClientCompletion(client: Client) {
  const fields = [
    client.company_name,
    client.contact_name,
    client.email,
    client.phone || client.mobile,
    client.country,
    client.client_type,
    client.address,
    client.city,
    client.industry_sector,
  ];
  const filled = fields.filter((f) => f && String(f).trim() !== "").length;
  return Math.round((filled / fields.length) * 100);
}

function getProgressColor(pct: number) {
  if (pct <= 25) return "bg-red-400";
  if (pct <= 50) return "bg-orange-400";
  if (pct <= 75) return "bg-blue-500";
  return "bg-emerald-500";
}

function getProgressTextColor(pct: number) {
  if (pct <= 25) return "text-red-500";
  if (pct <= 50) return "text-orange-500";
  if (pct <= 75) return "text-blue-600";
  return "text-emerald-600";
}

// =====================================================
// Loading Skeleton
// =====================================================
function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-100/80 bg-white/80 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-slate-200 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="space-y-2.5 pt-1">
            <div className="h-3 w-2/3 bg-slate-100 rounded animate-pulse" />
            <div className="h-3 w-3/4 bg-slate-100 rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="pt-1">
            <div className="h-1.5 w-full bg-slate-100 rounded-full animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

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
  className: extraClass,
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
        extraClass
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
// Read-Only Field Display (for view mode)
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
export default function ClientsPage() {
  const { user, profile: authProfile } = useAuth();

  // Data state
  const [clients, setClients] = useState<ClientWithCommercial[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commercials, setCommercials] = useState<Pick<Profile, "id" | "full_name">[]>([]);

  // Filter state (arrays for multi-select)
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterClientType, setFilterClientType] = useState<string[]>([]);
  const [filterCountry, setFilterCountry] = useState<string[]>([]);
  const [filterCommercial, setFilterCommercial] = useState<string[]>([]);
  const [filterSector, setFilterSector] = useState<string[]>([]);

  // Filter drill-down state
  const [activeFilterPanel, setActiveFilterPanel] = useState<string | null>(null);
  const [filterPanelSearch, setFilterPanelSearch] = useState("");

  // Dynamic filter options from API
  const [filterOptions, setFilterOptions] = useState<{
    client_types: string[];
    countries: string[];
    commercials: { id: string; full_name: string }[];
    industry_sectors: string[];
  }>({
    client_types: [],
    countries: [],
    commercials: [],
    industry_sectors: [],
  });

  // Sort state
  const [sortField, setSortField] = useState<SortField>("company_name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWithCommercial | null>(null);
  const [viewMode, setViewMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Client>>({});

  // Deactivation dialog state
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [clientToDeactivate, setClientToDeactivate] = useState<ClientWithCommercial | null>(null);

  // Summary counts
  const [summaryCounts, setSummaryCounts] = useState({
    total: 0,
    nacionales: 0,
    internacionales: 0,
  });

  // Download state
  const [downloading, setDownloading] = useState(false);

  // Debounce ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // =====================================================
  // Debounce Search
  // =====================================================
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  // =====================================================
  // Fetch Filter Options (cascading)
  // =====================================================
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const params = new URLSearchParams();
        if (filterClientType.length && activeFilterPanel !== "client_type")
          params.set("client_type", filterClientType.join(","));
        if (filterCountry.length && activeFilterPanel !== "country")
          params.set("country", filterCountry.join(","));
        if (filterCommercial.length && activeFilterPanel !== "commercial")
          params.set("commercial_id", filterCommercial.join(","));
        if (filterSector.length && activeFilterPanel !== "sector")
          params.set("industry_sector", filterSector.join(","));

        const qs = params.toString();
        const res = await fetch(`/api/clients/filters${qs ? `?${qs}` : ""}`);
        if (res.ok) {
          const data = await res.json();
          setFilterOptions(data);
        }
      } catch (error) {
        console.error("Error loading filter options:", error);
      }
    };
    loadFilterOptions();
  }, [filterClientType, filterCountry, filterCommercial, filterSector, activeFilterPanel]);

  // =====================================================
  // Fetch Clients
  // =====================================================
  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (debouncedSearch) params.set("search", debouncedSearch);
      if (filterClientType.length) params.set("client_type", filterClientType.join(","));
      if (filterCountry.length) params.set("country", filterCountry.join(","));
      if (filterCommercial.length) params.set("commercial_id", filterCommercial.join(","));
      if (filterSector.length) params.set("industry_sector", filterSector.join(","));

      params.set("sort_field", sortField);
      params.set("sort_direction", sortDirection);
      params.set("page", String(currentPage));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/clients?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al cargar los clientes");
      }

      const { data, count } = await res.json();
      setClients(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Error al cargar los clientes");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterClientType, filterCountry, filterCommercial, filterSector, sortField, sortDirection, currentPage, pageSize]);

  // =====================================================
  // Fetch Summary Counts
  // =====================================================
  const fetchSummaryCounts = useCallback(async () => {
    try {
      const buildParams = (clientType?: string) => {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (filterCountry.length) params.set("country", filterCountry.join(","));
        if (filterCommercial.length) params.set("commercial_id", filterCommercial.join(","));
        if (filterSector.length) params.set("industry_sector", filterSector.join(","));
        if (clientType) params.set("client_type", clientType);
        else if (filterClientType.length) params.set("client_type", filterClientType.join(","));
        params.set("page", "1");
        params.set("pageSize", "1");
        return params.toString();
      };

      const [resTotal, resNac, resInt] = await Promise.all([
        fetch(`/api/clients?${buildParams()}`),
        fetch(`/api/clients?${buildParams("nacional")}`),
        fetch(`/api/clients?${buildParams("internacional")}`),
      ]);

      const totalData = resTotal.ok ? await resTotal.json() : { count: 0 };
      const nacData = resNac.ok ? await resNac.json() : { count: 0 };
      const intData = resInt.ok ? await resInt.json() : { count: 0 };

      setSummaryCounts({
        total: totalData.count || 0,
        nacionales: nacData.count || 0,
        internacionales: intData.count || 0,
      });
    } catch (error) {
      console.error("Error fetching summary counts:", error);
    }
  }, [debouncedSearch, filterClientType, filterCountry, filterCommercial, filterSector]);

  // =====================================================
  // Fetch Commercials (for form select)
  // =====================================================
  const fetchCommercials = useCallback(async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("is_active", true)
        .in("role", ["comercial", "admin", "directora"])
        .order("full_name");
      setCommercials(data || []);
    } catch (error) {
      console.error("Error fetching commercials:", error);
    }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);
  useEffect(() => { fetchSummaryCounts(); }, [fetchSummaryCounts]);
  useEffect(() => { fetchCommercials(); }, [fetchCommercials]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterClientType, filterCountry, filterCommercial, filterSector, sortField, sortDirection, pageSize]);

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
      setSortDirection(field === "created_at" ? "desc" : "asc");
    }
  };

  // =====================================================
  // Filter Helpers
  // =====================================================
  const popoverFilterCount = [
    filterClientType, filterCountry, filterCommercial, filterSector,
  ].filter((arr) => arr.length > 0).length;

  const hasActiveFilters = searchQuery !== "" || popoverFilterCount > 0;

  const clearFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setFilterClientType([]);
    setFilterCountry([]);
    setFilterCommercial([]);
    setFilterSector([]);
    setActiveFilterPanel(null);
    setFilterPanelSearch("");
  };

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

  // =====================================================
  // Empty Client Template
  // =====================================================
  function getEmptyClient(): Partial<Client> {
    return {
      company_name: "",
      trade_name: "",
      contact_name: "",
      contact_position: "",
      email: "",
      phone: "",
      mobile: "",
      address: "",
      city: "",
      state_province: "",
      country: "",
      postal_code: "",
      tax_id: "",
      tax_regime: "",
      assigned_commercial_id: "",
      client_type: null,
      industry_sector: "",
      payment_terms: "",
      credit_limit: null,
      preferred_currency: "",
      source: "",
      notes: "",
      tags: null,
      additional_contacts: [],
      shipping_addresses: [],
    };
  }

  // =====================================================
  // Form Helpers
  // =====================================================
  const updateFormField = (field: keyof Client, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Helpers for additional contacts array
  const addAdditionalContact = () => {
    const contacts = [...(formData.additional_contacts || [])];
    contacts.push({ name: "", position: "", email: "", phone: "" });
    updateFormField("additional_contacts", contacts);
  };

  const removeAdditionalContact = (index: number) => {
    const contacts = [...(formData.additional_contacts || [])];
    contacts.splice(index, 1);
    updateFormField("additional_contacts", contacts);
  };

  const updateAdditionalContact = (index: number, field: keyof AdditionalContact, value: string) => {
    const contacts = [...(formData.additional_contacts || [])];
    contacts[index] = { ...contacts[index], [field]: value };
    updateFormField("additional_contacts", contacts);
  };

  // Helper for document shipping address (stored as shipping_addresses[0])
  const getDocShippingAddress = (): ShippingAddress => {
    const addrs = formData.shipping_addresses;
    if (Array.isArray(addrs) && addrs.length > 0) return addrs[0];
    return { label: "Envío de Documentos", address: "", city: "", country: "", postal_code: "", notes: "" };
  };

  const updateDocShippingAddress = (field: keyof ShippingAddress, value: string) => {
    const current = getDocShippingAddress();
    const updated = { ...current, [field]: value, label: "Envío de Documentos" };
    updateFormField("shipping_addresses", [updated]);
  };

  // =====================================================
  // Open Modal for New Client
  // =====================================================
  const handleNewClient = () => {
    setEditingClient(null);
    setViewMode(false);
    setFormData(getEmptyClient());
    setModalOpen(true);
  };

  // =====================================================
  // Open Modal to View Client
  // =====================================================
  const handleViewClient = (client: ClientWithCommercial) => {
    setEditingClient(client);
    setViewMode(true);
    setFormData({ ...client });
    setModalOpen(true);
  };

  // =====================================================
  // Open Modal to Edit Client
  // =====================================================
  const handleEditClient = (client: ClientWithCommercial) => {
    setEditingClient(client);
    setViewMode(false);
    setFormData({ ...client });
    setModalOpen(true);
  };

  // =====================================================
  // Submit Handler (Create or Update)
  // =====================================================
  const handleSubmit = async () => {
    if (!formData.company_name || formData.company_name.trim() === "") {
      toast.error("El nombre de la empresa es obligatorio");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        ...formData,
        tags: Array.isArray(formData.tags)
          ? formData.tags
          : typeof formData.tags === "string" && formData.tags
            ? (formData.tags as string).split(",").map((t: string) => t.trim()).filter(Boolean)
            : null,
        credit_limit: formData.credit_limit != null && formData.credit_limit !== ("" as unknown)
          ? Number(formData.credit_limit) : null,
        assigned_commercial_id: formData.assigned_commercial_id || null,
        client_type: formData.client_type || null,
      };

      if (editingClient?.id) {
        const res = await fetch("/api/clients", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingClient.id, ...payload }),
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Error al actualizar el cliente");
        }
        toast.success("Cliente actualizado exitosamente");
      } else {
        const res = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Error al crear el cliente");
        }
        toast.success("Cliente creado exitosamente");
      }

      fetchClients();
      fetchSummaryCounts();
      if (!editingClient?.id) {
        setModalOpen(false);
        setFormData(getEmptyClient());
      }
    } catch (error) {
      console.error("Error saving client:", error);
      toast.error(
        editingClient ? "Error al actualizar el cliente" : "Error al crear el cliente"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // Deactivate (Soft Delete)
  // =====================================================
  const handleDeactivate = async () => {
    if (!clientToDeactivate?.id) return;

    try {
      const res = await fetch("/api/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: clientToDeactivate.id, is_active: false }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al desactivar el cliente");
      }
      toast.success("Cliente desactivado exitosamente");
      setDeactivateDialogOpen(false);
      setClientToDeactivate(null);
      fetchClients();
      fetchSummaryCounts();
    } catch (error) {
      console.error("Error deactivating client:", error);
      toast.error("Error al desactivar el cliente");
    }
  };

  // =====================================================
  // Download Excel Report
  // =====================================================
  const handleDownloadExcel = async () => {
    try {
      setDownloading(true);
      toast.info("Generando reporte Excel...");

      // Fetch ALL clients with same filters
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (filterClientType.length) params.set("client_type", filterClientType.join(","));
      if (filterCountry.length) params.set("country", filterCountry.join(","));
      if (filterCommercial.length) params.set("commercial_id", filterCommercial.join(","));
      if (filterSector.length) params.set("industry_sector", filterSector.join(","));
      params.set("sort_field", sortField);
      params.set("sort_direction", sortDirection);
      params.set("page", "1");
      params.set("pageSize", "5000");

      const res = await fetch(`/api/clients?${params.toString()}`);
      if (!res.ok) throw new Error("Error al obtener los clientes");
      const { data: allClients } = await res.json();

      const exportData: ClientWithCommercial[] = allClients || [];

      const excelMod = await import("exceljs");
      const ExcelJS = excelMod.default || excelMod;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "IBC Steel Group - IBC Core";
      workbook.created = new Date();

      const ws = workbook.addWorksheet("Clientes", {
        properties: { defaultColWidth: 16 },
        views: [{ state: "frozen", ySplit: 3 }],
      });

      // Brand Palette
      const NAVY = "1E3A5F";
      const NAVY_MID = "2A4D7A";
      const NAVY_LIGHT = "3B6998";
      const ACCENT_GOLD = "C9A227";
      const GOLD_LIGHT = "F5E6B8";
      const LIGHT_BG = "F7F9FC";
      const ZEBRA_BG = "EDF2F7";
      const WHITE = "FFFFFF";
      const BORDER_LIGHT = "D0D5DD";
      const TEXT_DARK = "1A202C";
      const TEXT_MUTED = "6B7280";
      const logoId = await addLogoToWorkbook(workbook);

      // Client type colors
      const typeStyles: Record<string, { bg: string; text: string }> = {
        nacional: { bg: "DBEAFE", text: "1E40AF" },
        internacional: { bg: "DCFCE7", text: "166534" },
        distribuidor: { bg: "EDE9FE", text: "6D28D9" },
        usuario_final: { bg: "E2E8F0", text: "475569" },
      };

      ws.columns = [
        { key: "company_name", width: 28 },
        { key: "trade_name", width: 20 },
        { key: "contact_name", width: 22 },
        { key: "contact_position", width: 18 },
        { key: "email", width: 28 },
        { key: "phone", width: 18 },
        { key: "mobile", width: 18 },
        { key: "country", width: 14 },
        { key: "city", width: 16 },
        { key: "client_type", width: 16 },
        { key: "industry_sector", width: 18 },
        { key: "commercial", width: 20 },
        { key: "tax_id", width: 18 },
        { key: "payment_terms", width: 16 },
        { key: "credit_limit", width: 16 },
        { key: "notes", width: 30 },
      ];

      const totalCols = ws.columns.length;

      const now = new Date();
      const dateStr = now.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });

      // Filter description
      const filterDesc: string[] = [];
      if (filterClientType.length) filterDesc.push(`Tipo: ${filterClientType.map((t) => CLIENT_TYPE_LABELS[t] || t).join(", ")}`);
      if (filterCountry.length) filterDesc.push(`País: ${filterCountry.join(", ")}`);
      if (filterCommercial.length) filterDesc.push(`Comercial: ${filterCommercial.length} seleccionados`);
      if (filterSector.length) filterDesc.push(`Sector: ${filterSector.join(", ")}`);
      if (debouncedSearch) filterDesc.push(`Búsqueda: "${debouncedSearch}"`);

      // ROW 1: Unified header
      const r1 = ws.addRow([""]);
      ws.mergeCells(1, 1, 1, totalCols);
      const c1 = ws.getCell("A1");
      c1.value = { richText: [
        { text: "                              ", font: { name: "Aptos", size: 16, color: { argb: NAVY } } },
        { text: "REPORTE DE CLIENTES", font: { name: "Aptos", size: 12, bold: true, color: { argb: WHITE } } },
        { text: `     ${dateStr}  ·  ${exportData.length} registros`, font: { name: "Aptos", size: 9, color: { argb: "D0DCE8" } } },
        ...(filterDesc.length > 0 ? [{ text: `     ${filterDesc.join(" · ")}`, font: { name: "Aptos", size: 8, italic: true, color: { argb: "A8BED4" } } }] : []),
      ] };
      c1.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
      c1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      r1.height = 52;
      for (let col = 1; col <= totalCols; col++) {
        const cell = r1.getCell(col);
        if (col > 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        cell.border = { bottom: { style: "medium" as const, color: { argb: "FFFFFF" } } };
      }
      addLogoToHeader(ws, logoId, totalCols);

      // ROW 2: Spacer
      const r2x = ws.addRow([""]);
      ws.mergeCells(2, 1, 2, totalCols);
      r2x.height = 5;
      for (let col = 1; col <= totalCols; col++) {
        r2x.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
      }

      // ROW 3: Column Headers
      const colHeaders = [
        "Empresa", "Nombre Comercial", "Contacto", "Cargo",
        "Email", "Teléfono", "Celular", "País", "Ciudad",
        "Tipo", "Sector Industrial", "Comercial Asignado",
        "NIT / ID Tributario", "Condiciones Pago", "Límite Crédito", "Notas",
      ];
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
          c.company_name || "",
          c.trade_name || "",
          c.contact_name || "",
          c.contact_position || "",
          c.email || "",
          c.phone || "",
          c.mobile || "",
          c.country || "",
          c.city || "",
          c.client_type ? (CLIENT_TYPE_LABELS[c.client_type] || c.client_type) : "",
          c.industry_sector || "",
          c.assigned_commercial?.full_name || "",
          c.tax_id || "",
          c.payment_terms || "",
          c.credit_limit ?? "",
          c.notes || "",
        ]);

        const isEven = idx % 2 === 0;
        const rowBg = isEven ? WHITE : "F8F7F5";

        row.eachCell((cell, colNumber) => {
          cell.font = { name: "Aptos", size: 9.5, color: { argb: TEXT_DARK } };
          cell.alignment = { vertical: "middle", wrapText: colNumber === 16 };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
          cell.border = {
            bottom: { style: "thin" as const, color: { argb: "EDECEA" } },
            left: { style: "hair" as const, color: { argb: "E8E6E1" } },
            right: { style: "hair" as const, color: { argb: "E8E6E1" } },
          };

          // Solid outer borders
          if (colNumber === 1) {
            cell.border = { ...cell.border, left: { style: "thin" as const, color: { argb: "D4D2CD" } } };
          }
          if (colNumber === totalCols) {
            cell.border = { ...cell.border, right: { style: "thin" as const, color: { argb: "D4D2CD" } } };
          }

          // Company name bold navy
          if (colNumber === 1 && cell.value) {
            cell.font = { name: "Aptos", size: 9.5, bold: true, color: { argb: NAVY } };
          }

          // Client type colored cell
          if (colNumber === 10 && c.client_type) {
            const st = typeStyles[c.client_type] || { bg: "E2E8F0", text: "475569" };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: st.bg } };
            cell.font = { name: "Aptos", size: 9, bold: true, color: { argb: st.text } };
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }

          // Credit limit
          if (colNumber === 15 && typeof cell.value === "number") {
            cell.numFmt = '"$"#,##0.00';
            cell.alignment = { horizontal: "right", vertical: "middle" };
          }

          // Center small columns
          if ([8, 9, 10].includes(colNumber)) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }
        });

        row.height = 26;
      });

      // TOTALS ROW
      const totalsRow = ws.addRow([]);
      for (let col = 1; col <= totalCols; col++) {
        const cell = totalsRow.getCell(col);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
        cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: NAVY } };
        cell.border = {
          top: { style: "medium" as const, color: { argb: "FFFFFF" } },
          bottom: { style: "medium" as const, color: { argb: NAVY } },
        };
      }
      totalsRow.getCell(1).value = `TOTALES`;
      totalsRow.getCell(1).font = { name: "Aptos", size: 10, bold: true, color: { argb: "FFFFFF" } };
      totalsRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
      totalsRow.height = 28;

      // FOOTER
      const emptyRow = ws.addRow([""]);
      emptyRow.height = 6;

      const footerRowIdx = ws.rowCount + 1;
      const footerRow = ws.addRow([""]);
      ws.mergeCells(footerRowIdx, 1, footerRowIdx, totalCols);
      const footerCell = ws.getCell(`A${footerRowIdx}`);
      footerCell.value = { richText: [
        { text: "IBC Core", font: { name: "Aptos", size: 8.5, bold: true, color: { argb: "1E3A5F" } } },
        { text: `  ·  Generado: ${now.toLocaleString("es-CO")}  ·  © ${now.getFullYear()} IBC STEEL GROUP`, font: { name: "Aptos", size: 8, italic: true, color: { argb: "9CA3B4" } } },
      ] };
      footerCell.alignment = { horizontal: "center", vertical: "middle" };
      footerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FAF9F7" } };
      footerCell.border = { top: { style: "thin" as const, color: { argb: "E8E6E1" } } };
      footerRow.height = 20;

      // Auto-filter on header row
      ws.autoFilter = {
        from: { row: 3, column: 1 },
        to: { row: 3, column: totalCols },
      };

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
      link.download = `Clientes_IBC_${now.toISOString().slice(0, 10)}.xlsx`;
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
  // Render
  // =====================================================
  return (
    <div style={{ fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif", width: "100%", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}>

      {/* Global keyframes */}
      <style>{`
        @keyframes cFadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cSlideRight { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes cProgressFill { from { width: 0%; } }
        @keyframes cDotPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
      `}</style>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, animation: "cFadeIn 0.3s ease both", fontSize: 12.5, color: T.inkLight }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 4, color: T.accent, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>{I.home} Inicio</Link>
        <span style={{ color: T.inkGhost }}>/</span>
        <span style={{ fontWeight: 600, color: T.inkMuted }}>Clientes</span>
      </div>

      {/* Header Banner */}
      <div style={{
        position: "relative", overflow: "hidden", borderRadius: 14,
        background: "linear-gradient(135deg, #1E3A5F 0%, #2a4d7a 50%, #3B82F6 100%)",
        padding: "14px 24px", marginBottom: 16,
        boxShadow: "0 4px 24px rgba(30,58,95,0.18)",
        animation: "cFadeIn 0.4s ease both",
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
            }}>{I.users}</div>
            <div>
              <h1 style={{
                fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                fontSize: 18, fontWeight: 800, color: "#fff",
                letterSpacing: "-0.02em", lineHeight: 1.2,
              }}>Clientes</h1>
              <p style={{ fontSize: 12, color: "rgba(191,219,254,0.7)", fontWeight: 500 }}>
                Seguimiento y administración de clientes comerciales
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
                cursor: downloading ? "wait" : "pointer", fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                display: "flex", alignItems: "center", gap: 5,
                opacity: downloading ? 0.6 : 1, transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
            >
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : I.download}
              Descargar Excel
            </button>
            <button
              onClick={handleNewClient}
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
            >{I.plus} Nuevo Cliente</button>
          </div>
        </div>
      </div>

      {/* KPI Cards (compact) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
        {(() => {
          const kpis = [
            { label: "Total Clientes", value: summaryCounts.total, icon: I.users, color: T.accent, bg: T.accentLight, typeKey: null as string | null, sub: "activos registrados" },
            { label: "Nacionales", value: summaryCounts.nacionales, icon: I.building, color: T.success, bg: T.successBg, typeKey: "nacional", sub: "mercado doméstico" },
            { label: "Internacionales", value: summaryCounts.internacionales, icon: I.globe, color: T.violet, bg: T.violetBg, typeKey: "internacional", sub: "mercado exterior" },
          ];
          return kpis.map((kpi, idx) => {
            const isActive = kpi.typeKey === null
              ? filterClientType.length === 0
              : filterClientType.length === 1 && filterClientType[0] === kpi.typeKey;
            return (
              <PCard
                key={kpi.label}
                delay={60 * idx}
                hover
                onClick={() => {
                  if (kpi.typeKey === null) setFilterClientType([]);
                  else if (isActive) setFilterClientType([]);
                  else setFilterClientType([kpi.typeKey]);
                }}
                style={{
                  padding: "10px 14px",
                  borderColor: isActive && kpi.typeKey !== null ? kpi.color + "40" : T.borderLight,
                  boxShadow: isActive && kpi.typeKey !== null ? `0 4px 16px ${kpi.color}15` : T.shadow,
                  userSelect: "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: kpi.bg, display: "flex", alignItems: "center", justifyContent: "center", color: kpi.color, transform: "scale(0.8)" }}>{kpi.icon}</div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: T.inkLight, letterSpacing: "0.06em", textTransform: "uppercase" as const, lineHeight: 1.3 }}>{kpi.label}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 2, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}>
                  {loading && clients.length === 0 ? "—" : <AnimNum value={kpi.value} />}
                </div>
                <div style={{ fontSize: 10, color: T.inkLight, fontWeight: 500 }}>{kpi.sub}</div>
              </PCard>
            );
          });
        })()}
      </div>

      {/* Filters */}
      <PCard delay={500} style={{ padding: "12px 18px", marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 320 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.inkLight }}>{I.search}</span>
          <Input
            placeholder="Buscar empresa, contacto, email, teléfono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 34, height: 38, fontSize: 13, borderRadius: 10, border: `1px solid ${T.border}`, background: T.surfaceAlt }}
          />
        </div>

        {/* Filter Popover */}
        <Popover onOpenChange={(open) => { if (!open) { setActiveFilterPanel(null); setFilterPanelSearch(""); } }}>
          <PopoverTrigger asChild>
            <button style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10,
              border: `1px solid ${popoverFilterCount > 0 ? T.accent + "30" : T.border}`,
              background: popoverFilterCount > 0 ? T.accentLight : T.surface,
              color: popoverFilterCount > 0 ? T.accent : T.inkSoft, fontSize: 12.5, fontWeight: 600,
              cursor: "pointer", fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
              transition: "all 0.2s ease",
            }}>
              {I.filter}
              Filtros
              {popoverFilterCount > 0 && (
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minWidth: 18, height: 18, borderRadius: 5, padding: "0 5px",
                  background: T.accent, color: "#fff", fontSize: 10, fontWeight: 800,
                }}>{popoverFilterCount}</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] max-h-[70vh] p-0 overflow-hidden rounded-2xl border-slate-200/80 shadow-xl shadow-slate-900/10 flex flex-col" align="start" sideOffset={8}>
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
                      onClick={() => clearFilters()}
                      className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors"
                    >
                      Limpiar todo
                    </button>
                  )}
                </div>
                <div className="p-2 overflow-y-auto flex-1">
                  {[
                    { key: "client_type", label: "Tipo de Cliente", selected: filterClientType, icon: Tag },
                    { key: "country", label: "País", selected: filterCountry, icon: Globe },
                    { key: "commercial", label: "Comercial Asignado", selected: filterCommercial, icon: User },
                    { key: "sector", label: "Sector Industrial", selected: filterSector, icon: Factory },
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
            ) : (
              <div className="flex flex-col overflow-hidden flex-1">
                {/* Drill-down view */}
                {(() => {
                  const panelConfig: Record<string, {
                    label: string;
                    options: { value: string; label: string }[];
                    selected: string[];
                    setter: (v: string[]) => void;
                  }> = {
                    client_type: {
                      label: "Tipo de Cliente",
                      options: [
                        { value: "nacional", label: "Nacional" },
                        { value: "internacional", label: "Internacional" },
                      ],
                      selected: filterClientType,
                      setter: setFilterClientType,
                    },
                    country: {
                      label: "País",
                      options: filterOptions.countries.map((c) => ({ value: c, label: c })),
                      selected: filterCountry,
                      setter: setFilterCountry,
                    },
                    commercial: {
                      label: "Comercial Asignado",
                      options: filterOptions.commercials.map((c) => ({ value: c.id, label: c.full_name })),
                      selected: filterCommercial,
                      setter: setFilterCommercial,
                    },
                    sector: {
                      label: "Sector Industrial",
                      options: filterOptions.industry_sectors.map((s) => ({ value: s, label: s })),
                      selected: filterSector,
                      setter: setFilterSector,
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
                      <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-white">
                        <button
                          onClick={() => { setActiveFilterPanel(null); setFilterPanelSearch(""); }}
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

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            style={{
              display: "flex", alignItems: "center", gap: 4, padding: "7px 12px", borderRadius: 10,
              border: "none", background: T.dangerBg, color: T.danger, fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
              marginLeft: "auto", transition: "all 0.2s ease",
            }}
          >
            <X className="h-3.5 w-3.5" />
            Limpiar
          </button>
        )}
      </PCard>

      {/* Client Cards */}
      <div>
        {loading ? (
          <CardGridSkeleton />
        ) : clients.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", animation: "cFadeUp 0.5s ease both" }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: T.surfaceAlt, border: `1px solid ${T.borderLight}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: T.inkGhost, marginBottom: 16,
            }}>{I.building}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.inkSoft, marginBottom: 4 }}>No se encontraron clientes</div>
            <div style={{ fontSize: 13, color: T.inkLight }}>
              {hasActiveFilters ? "Intenta ajustar los filtros de búsqueda" : "Crea tu primer cliente para comenzar"}
            </div>
            {!hasActiveFilters && (
              <button onClick={handleNewClient} style={{
                marginTop: 16, padding: "8px 18px", borderRadius: 10, border: "none",
                background: T.accent, color: "#fff", fontWeight: 700, fontSize: 13,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
              }}>{I.plus} Nuevo Cliente</button>
            )}
          </div>
        ) : (
          <>
            {/* Card Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {clients.map((client, idx) => {
                const completion = getClientCompletion(client);
                const initials = getInitials(client.company_name);
                const avatarColor = (() => {
                  let hash = 0;
                  for (let i = 0; i < client.company_name.length; i++) hash = client.company_name.charCodeAt(i) + ((hash << 5) - hash);
                  const colors = [T.accent, T.teal, T.violet, T.orange, T.blue, T.success, "#E84393", "#6C5CE7", "#00B894", "#FDCB6E"];
                  return colors[Math.abs(hash) % colors.length];
                })();
                const progressBarColor = completion <= 25 ? T.danger : completion <= 50 ? T.orange : completion <= 75 ? T.blue : T.success;
                const typeColor = client.client_type === "nacional" ? T.blue : client.client_type === "internacional" ? T.success : client.client_type === "distribuidor" ? T.violet : T.inkMuted;

                return (
                  <div
                    key={client.id}
                    onClick={() => handleViewClient(client)}
                    style={{
                      background: T.surface, borderRadius: T.radius,
                      border: `1px solid ${T.borderLight}`, boxShadow: T.shadow,
                      cursor: "pointer", overflow: "hidden", position: "relative",
                      animation: `cFadeUp 0.4s cubic-bezier(0.4,0,0.2,1) ${400 + idx * 40}ms both`,
                      transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 8px 32px ${avatarColor}12, 0 2px 8px rgba(26,29,35,0.04)`; e.currentTarget.style.borderColor = avatarColor + "30"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = T.shadow; e.currentTarget.style.borderColor = T.borderLight; }}
                  >
                    {/* Top accent line */}
                    <div style={{ height: 3, width: "100%", background: `linear-gradient(90deg, ${avatarColor}, ${avatarColor}88, transparent)`, opacity: 0.6, transition: "opacity 0.3s" }} />

                    {/* Card Header */}
                    <div style={{ padding: "18px 22px 14px", display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 13, flexShrink: 0,
                        background: avatarColor + "12", border: `1px solid ${avatarColor}20`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: avatarColor, fontSize: 14, fontWeight: 800,
                      }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>
                          {client.company_name}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, fontSize: 11, color: T.inkLight }}>
                          {client.country && (
                            <>
                              {COUNTRY_FLAGS[client.country] && <span>{COUNTRY_FLAGS[client.country]}</span>}
                              <span style={{ fontWeight: 500 }}>{client.country}</span>
                            </>
                          )}
                          {client.country && client.client_type && <span style={{ color: T.inkGhost }}>·</span>}
                          {client.client_type && (
                            <span style={{
                              padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                              background: typeColor + "12", color: typeColor,
                            }}>{CLIENT_TYPE_LABELS[client.client_type] || client.client_type}</span>
                          )}
                        </div>
                      </div>
                      {/* Actions menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: 28, height: 28, borderRadius: 8, border: "none",
                              background: "transparent", cursor: "pointer", color: T.inkLight,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all 0.15s ease", flexShrink: 0,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = T.surfaceAlt; e.currentTarget.style.color = T.inkSoft; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.inkLight; }}
                          >{I.dots}</button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl shadow-lg">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewClient(client); }}>
                            <Eye className="h-4 w-4 mr-2" /> Ver detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditClient(client); }}>
                            <Pencil className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={(e) => { e.stopPropagation(); setClientToDeactivate(client); setDeactivateDialogOpen(true); }}
                          >
                            <Ban className="h-4 w-4 mr-2" /> Desactivar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Contact Info */}
                    <div style={{ padding: "0 22px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: T.inkGhost, flexShrink: 0, width: 16, display: "flex", justifyContent: "center" }}>{I.user}</span>
                        <span style={{ fontSize: 12.5, color: client.contact_name ? T.inkSoft : T.inkGhost, fontWeight: client.contact_name ? 600 : 400, fontStyle: client.contact_name ? "normal" : "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {client.contact_name || "Sin contacto"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: T.inkGhost, flexShrink: 0, width: 16, display: "flex", justifyContent: "center" }}>{I.mail}</span>
                        <span style={{ fontSize: 12, color: client.email ? T.accent : T.inkGhost, fontWeight: 500, fontStyle: client.email ? "normal" : "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {client.email || "Sin email"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: T.inkGhost, flexShrink: 0, width: 16, display: "flex", justifyContent: "center" }}>{I.phone}</span>
                        <span style={{ fontSize: 12, color: (client.mobile || client.phone) ? T.inkSoft : T.inkGhost, fontWeight: 500, fontStyle: (client.mobile || client.phone) ? "normal" : "italic", fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                          {client.mobile || client.phone || "Sin teléfono"}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar + Sector */}
                    <div style={{ padding: "0 22px 18px", borderTop: `1px solid ${T.borderLight}`, paddingTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                        <div style={{ flex: 1, maxWidth: 120, height: 4, borderRadius: 3, background: T.borderLight, overflow: "hidden" }}>
                          <div style={{
                            height: "100%", borderRadius: 3, background: progressBarColor,
                            width: `${completion}%`, animation: `cProgressFill 0.8s ease ${500 + idx * 40}ms both`,
                          }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-jetbrains-mono), monospace", color: progressBarColor }}>
                          {completion}%
                        </span>
                      </div>
                      {client.industry_sector && (
                        <span style={{ fontSize: 10, color: T.inkLight, fontWeight: 500, marginLeft: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>
                          {client.industry_sector}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 4px", marginTop: 8, animation: "cFadeIn 0.4s ease 800ms both",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12.5, color: T.inkLight }}>
                  Mostrando <span style={{ fontWeight: 700, color: T.inkSoft, fontFamily: "var(--font-jetbrains-mono), monospace" }}>{rangeStart}–{rangeEnd}</span> de <span style={{ fontWeight: 700, color: T.inkSoft, fontFamily: "var(--font-jetbrains-mono), monospace" }}>{totalCount}</span>
                </span>
                <Select value={String(pageSize)} onValueChange={(val) => setPageSize(Number(val))}>
                  <SelectTrigger style={{ width: 90, height: 32, fontSize: 12, borderRadius: 8, border: `1px solid ${T.border}` }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / pág</SelectItem>
                    <SelectItem value="20">20 / pág</SelectItem>
                    <SelectItem value="50">50 / pág</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  style={{
                    display: "flex", alignItems: "center", gap: 4, padding: "6px 12px",
                    borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface,
                    fontSize: 12, fontWeight: 600, color: currentPage <= 1 ? T.inkGhost : T.inkSoft,
                    cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                    fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                  }}
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    if (totalPages <= 5) return true;
                    if (page === 1 || page === totalPages) return true;
                    if (Math.abs(page - currentPage) <= 1) return true;
                    return false;
                  })
                  .map((page, idx, arr) => (
                    <span key={page} style={{ display: "flex", alignItems: "center" }}>
                      {idx > 0 && arr[idx - 1] !== page - 1 && (
                        <span style={{ padding: "0 2px", color: T.inkGhost }}>{"\u2026"}</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        style={{
                          width: 32, height: 32, borderRadius: 8, border: "none",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 700, cursor: "pointer",
                          fontFamily: "var(--font-jetbrains-mono), monospace",
                          background: currentPage === page ? T.accent : "transparent",
                          color: currentPage === page ? "#fff" : T.inkMuted,
                          boxShadow: currentPage === page ? `0 2px 8px ${T.accent}30` : "none",
                          transition: "all 0.2s ease",
                        }}
                      >{page}</button>
                    </span>
                  ))}
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  style={{
                    display: "flex", alignItems: "center", gap: 4, padding: "6px 12px",
                    borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface,
                    fontSize: 12, fontWeight: 600, color: currentPage >= totalPages ? T.inkGhost : T.inkSoft,
                    cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                    fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                  }}
                >
                  Siguiente <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* =====================================================
          Client Modal (premium glassmorphism)
          ===================================================== */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          {/* Backdrop */}
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(12px)", transition: "opacity 0.3s" }}
            onClick={() => setModalOpen(false)}
          />
          {/* Modal Card */}
          <div style={{
            position: "relative", width: "100%", maxWidth: 720, maxHeight: "90vh",
            display: "flex", flexDirection: "column", borderRadius: 22,
            border: `1px solid ${T.borderLight}`, background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(24px)", boxShadow: "0 32px 64px -12px rgba(0,0,0,0.25)",
            animation: "cFadeUp 0.35s ease both", overflow: "hidden",
          }}>
            {/* Accent bar */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: T.accent }} />

            {/* Header */}
            <div style={{ position: "relative", padding: "22px 28px 16px" }}>
              {/* Close button */}
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  position: "absolute", top: 16, right: 16, width: 32, height: 32,
                  borderRadius: 10, border: "none", background: T.surfaceAlt,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  color: T.inkLight, transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = T.dangerBg; e.currentTarget.style.color = T.danger; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = T.surfaceAlt; e.currentTarget.style.color = T.inkLight; }}
              >
                <X className="h-4 w-4" />
              </button>

              {viewMode && editingClient ? (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                    background: T.accentLight,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Building2 className="h-5 w-5" style={{ color: T.accent }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 36 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <h2 style={{ fontFamily: "'Instrument Serif', 'Georgia', serif", fontSize: 22, fontWeight: 400, color: T.ink, letterSpacing: "-0.02em" }}>
                        {formData.company_name || "Sin nombre"}
                      </h2>
                      <ClientTypeBadge type={formData.client_type as ClientType} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, fontSize: 13, color: T.inkMuted }}>
                      {formData.contact_name && (
                        <>{I.user} <span>{formData.contact_name}</span> <span style={{ color: T.inkGhost }}>|</span></>
                      )}
                      {formData.country && (
                        <><span style={{ color: T.inkMuted }}>{I.globe}</span> <span>{COUNTRY_FLAGS[formData.country] || ""} {formData.country}</span></>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 12, paddingRight: 36 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: editingClient ? T.warningBg : T.successBg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {editingClient ? <Pencil className="h-5 w-5" style={{ color: T.warning }} /> : <Plus className="h-5 w-5" style={{ color: T.success }} />}
                  </div>
                  <div>
                    <h2 style={{ fontFamily: "'Instrument Serif', 'Georgia', serif", fontSize: 22, fontWeight: 400, color: T.ink, letterSpacing: "-0.02em" }}>
                      {editingClient ? "Editar Cliente" : "Nuevo Cliente"}
                    </h2>
                    <p style={{ fontSize: 12.5, color: T.inkMuted, marginTop: 1, fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif" }}>
                      {editingClient ? `Modificando ${formData.company_name || "cliente"}` : "Completa los datos para registrar un nuevo cliente"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ margin: "0 28px", height: 1, background: `linear-gradient(90deg, transparent, ${T.border}, transparent)` }} />

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-7 pb-6">
                <Tabs defaultValue="general" className="mt-5">
                  <TabsList className="w-full grid grid-cols-5 mb-5 h-11 bg-slate-100/80 rounded-xl p-1 gap-1">
                    <TabsTrigger value="general" className="text-xs gap-1.5 rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-[#1E3A5F] transition-all duration-200">
                      <Building2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">General</span>
                    </TabsTrigger>
                    <TabsTrigger value="contact" className="text-xs gap-1.5 rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-[#1E3A5F] transition-all duration-200">
                      <User className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Contacto</span>
                    </TabsTrigger>
                    <TabsTrigger value="address" className="text-xs gap-1.5 rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-[#1E3A5F] transition-all duration-200">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Dirección</span>
                    </TabsTrigger>
                    <TabsTrigger value="commercial" className="text-xs gap-1.5 rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-[#1E3A5F] transition-all duration-200">
                      <Briefcase className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Comercial</span>
                    </TabsTrigger>
                    <TabsTrigger value="financial" className="text-xs gap-1.5 rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-[#1E3A5F] transition-all duration-200">
                      <CreditCard className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Financiera</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* ---- Tab: General ---- */}
                  <TabsContent value="general" className="space-y-5">
                    {viewMode ? (
                      <div className="space-y-5">
                        <div className="rounded-2xl border border-slate-100/80 bg-gradient-to-br from-white/60 to-slate-50/40 p-4 space-y-3">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="h-6 w-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-600" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Empresa</h4>
                          </div>
                          <ReadOnlyField label="Nombre de la Empresa" value={formData.company_name} icon={Building2} accent="blue" />
                          <div className="grid grid-cols-2 gap-3">
                            <ReadOnlyField label="Tipo de Cliente" value={formData.client_type ? CLIENT_TYPE_LABELS[formData.client_type] || formData.client_type : null} icon={Tag} accent="violet" />
                            <ReadOnlyField label="Sector Industrial" value={formData.industry_sector} icon={Factory} accent="violet" />
                          </div>
                          <ReadOnlyField label="Fuente / Origen" value={formData.source} icon={Globe} accent="slate" />
                        </div>
                        {/* Notas */}
                        <div className="rounded-2xl border border-slate-100/80 bg-gradient-to-br from-white/60 to-slate-50/40 p-4 space-y-3">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="h-6 w-1 rounded-full bg-gradient-to-b from-amber-500 to-amber-600" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Notas</h4>
                          </div>
                          <ReadOnlyField label="Notas / Observaciones" value={formData.notes} icon={StickyNote} accent="amber" />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-600">Nombre de la Empresa <span className="text-red-500">*</span></Label>
                          <Input value={formData.company_name || ""} onChange={(e) => updateFormField("company_name", e.target.value)} placeholder="Ej: Acme Corp S.A.S." className="rounded-lg" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Tipo de Cliente</Label>
                            <Select value={formData.client_type || ""} onValueChange={(v) => updateFormField("client_type", v || null)}>
                              <SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="nacional">Nacional</SelectItem>
                                <SelectItem value="internacional">Internacional</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Sector Industrial</Label>
                            <Input value={formData.industry_sector || ""} onChange={(e) => updateFormField("industry_sector", e.target.value)} placeholder="Ej: Agroindustria" className="rounded-lg" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-600">Fuente / Origen</Label>
                          <Input value={formData.source || ""} onChange={(e) => updateFormField("source", e.target.value)} placeholder="Ej: Referido, Web, Feria" className="rounded-lg" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-600">Notas / Observaciones</Label>
                          <Textarea
                            value={formData.notes || ""}
                            onChange={(e) => updateFormField("notes", e.target.value)}
                            placeholder="Notas internas, observaciones del cliente..."
                            rows={3}
                            className="rounded-lg"
                          />
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* ---- Tab: Contacto ---- */}
                  <TabsContent value="contact" className="space-y-5">
                    {viewMode ? (
                      <div className="space-y-5">
                        {/* Contacto Principal */}
                        <div className="rounded-2xl border border-slate-100/80 bg-gradient-to-br from-white/60 to-slate-50/40 p-4 space-y-3">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="h-6 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-600" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Contacto Principal</h4>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <ReadOnlyField label="Nombre del Contacto" value={formData.contact_name} icon={User} accent="emerald" />
                            <ReadOnlyField label="Cargo" value={formData.contact_position} icon={Briefcase} accent="emerald" />
                          </div>
                          <ReadOnlyField label="Email" value={formData.email} icon={Mail} accent="blue" />
                          <div className="grid grid-cols-2 gap-3">
                            <ReadOnlyField label="Teléfono" value={formData.phone} icon={Phone} accent="slate" />
                            <ReadOnlyField label="Celular" value={formData.mobile} icon={Phone} accent="slate" />
                          </div>
                        </div>
                        {/* Contactos Adicionales (view) */}
                        {Array.isArray(formData.additional_contacts) && formData.additional_contacts.length > 0 && (
                          <div className="rounded-2xl border border-slate-100/80 bg-gradient-to-br from-white/60 to-slate-50/40 p-4 space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="h-6 w-1 rounded-full bg-gradient-to-b from-violet-500 to-violet-600" />
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Contactos Adicionales</h4>
                            </div>
                            {formData.additional_contacts.map((ac, idx) => (
                              <div key={idx} className="rounded-xl border border-slate-100 bg-white/50 p-3 space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contacto {idx + 1}</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <ReadOnlyField label="Nombre" value={ac.name} icon={User} accent="violet" />
                                  <ReadOnlyField label="Cargo" value={ac.position} icon={Briefcase} accent="violet" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <ReadOnlyField label="Email" value={ac.email} icon={Mail} accent="blue" />
                                  <ReadOnlyField label="Teléfono" value={ac.phone} icon={Phone} accent="slate" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Contacto Principal (edit) */}
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-5 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Contacto Principal</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Nombre del Contacto</Label>
                            <Input value={formData.contact_name || ""} onChange={(e) => updateFormField("contact_name", e.target.value)} placeholder="Nombre completo" className="rounded-lg" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Cargo</Label>
                            <Input value={formData.contact_position || ""} onChange={(e) => updateFormField("contact_position", e.target.value)} placeholder="Ej: Gerente de Compras" className="rounded-lg" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-600">Email</Label>
                          <Input type="email" value={formData.email || ""} onChange={(e) => updateFormField("email", e.target.value)} placeholder="correo@empresa.com" className="rounded-lg" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Teléfono</Label>
                            <Input value={formData.phone || ""} onChange={(e) => updateFormField("phone", e.target.value)} placeholder="+57 300 000 0000" className="rounded-lg" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Celular</Label>
                            <Input value={formData.mobile || ""} onChange={(e) => updateFormField("mobile", e.target.value)} placeholder="+57 310 000 0000" className="rounded-lg" />
                          </div>
                        </div>

                        {/* Contactos Adicionales (edit) */}
                        <div className="mt-5 pt-4 border-t border-slate-100">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="h-5 w-1 rounded-full bg-gradient-to-b from-violet-500 to-violet-600" />
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Contactos Adicionales</h4>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addAdditionalContact}
                              className="rounded-lg text-xs gap-1 h-7 px-2.5 border-violet-200 text-violet-700 hover:bg-violet-50"
                            >
                              <Plus className="h-3 w-3" />
                              Agregar
                            </Button>
                          </div>
                          {(formData.additional_contacts || []).map((ac, idx) => (
                            <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-3 mb-3 relative">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contacto {idx + 1}</p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAdditionalContact(idx)}
                                  className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-[11px] font-medium text-slate-500">Nombre</Label>
                                  <Input value={ac.name || ""} onChange={(e) => updateAdditionalContact(idx, "name", e.target.value)} placeholder="Nombre completo" className="rounded-lg h-8 text-sm" />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[11px] font-medium text-slate-500">Cargo</Label>
                                  <Input value={ac.position || ""} onChange={(e) => updateAdditionalContact(idx, "position", e.target.value)} placeholder="Cargo" className="rounded-lg h-8 text-sm" />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-[11px] font-medium text-slate-500">Email</Label>
                                  <Input type="email" value={ac.email || ""} onChange={(e) => updateAdditionalContact(idx, "email", e.target.value)} placeholder="correo@empresa.com" className="rounded-lg h-8 text-sm" />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[11px] font-medium text-slate-500">Teléfono</Label>
                                  <Input value={ac.phone || ""} onChange={(e) => updateAdditionalContact(idx, "phone", e.target.value)} placeholder="+57 300 000 0000" className="rounded-lg h-8 text-sm" />
                                </div>
                              </div>
                            </div>
                          ))}
                          {(!formData.additional_contacts || formData.additional_contacts.length === 0) && (
                            <p className="text-xs text-slate-400 text-center py-3">No hay contactos adicionales. Usa el botón &quot;Agregar&quot; para añadir uno.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* ---- Tab: Dirección ---- */}
                  <TabsContent value="address" className="space-y-5">
                    {viewMode ? (
                      <div className="space-y-5">
                        {/* Dirección de la Empresa */}
                        <div className="rounded-2xl border border-slate-100/80 bg-gradient-to-br from-white/60 to-slate-50/40 p-4 space-y-3">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="h-6 w-1 rounded-full bg-gradient-to-b from-amber-500 to-amber-600" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Dirección de la Empresa</h4>
                          </div>
                          <ReadOnlyField label="Dirección" value={formData.address} icon={MapPin} accent="amber" />
                          <div className="grid grid-cols-2 gap-3">
                            <ReadOnlyField label="Ciudad" value={formData.city} icon={MapPin} accent="amber" />
                            <ReadOnlyField label="Departamento / Provincia" value={formData.state_province} icon={MapPin} accent="amber" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <ReadOnlyField label="País" value={formData.country} icon={Globe} accent="blue" />
                            <ReadOnlyField label="Código Postal" value={formData.postal_code} icon={Hash} accent="slate" />
                          </div>
                        </div>
                        {/* Dirección de Envío de Documentos */}
                        <div className="rounded-2xl border border-slate-100/80 bg-gradient-to-br from-white/60 to-slate-50/40 p-4 space-y-3">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="h-6 w-1 rounded-full bg-gradient-to-b from-violet-500 to-violet-600" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Envío de Documentos Físicos</h4>
                          </div>
                          {(() => {
                            const docAddr = getDocShippingAddress();
                            return (
                              <>
                                <ReadOnlyField label="Dirección de Envío" value={docAddr.address} icon={Send} accent="violet" />
                                <div className="grid grid-cols-2 gap-3">
                                  <ReadOnlyField label="Ciudad" value={docAddr.city} icon={MapPin} accent="violet" />
                                  <ReadOnlyField label="País" value={docAddr.country} icon={Globe} accent="blue" />
                                </div>
                                <ReadOnlyField label="Código Postal" value={docAddr.postal_code} icon={Hash} accent="slate" />
                                <ReadOnlyField label="Notas de Envío" value={docAddr.notes} icon={StickyNote} accent="amber" />
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Dirección de la Empresa (edit) */}
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-5 w-1 rounded-full bg-gradient-to-b from-amber-500 to-amber-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Dirección de la Empresa</h4>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-600">Dirección</Label>
                          <Input value={formData.address || ""} onChange={(e) => updateFormField("address", e.target.value)} placeholder="Calle, carrera, número" className="rounded-lg" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Ciudad</Label>
                            <Input value={formData.city || ""} onChange={(e) => updateFormField("city", e.target.value)} placeholder="Ej: Bogotá" className="rounded-lg" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Departamento / Provincia</Label>
                            <Input value={formData.state_province || ""} onChange={(e) => updateFormField("state_province", e.target.value)} placeholder="Ej: Cundinamarca" className="rounded-lg" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">País</Label>
                            <Input value={formData.country || ""} onChange={(e) => updateFormField("country", e.target.value)} placeholder="Ej: Colombia" className="rounded-lg" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Código Postal</Label>
                            <Input value={formData.postal_code || ""} onChange={(e) => updateFormField("postal_code", e.target.value)} placeholder="Ej: 110111" className="rounded-lg" />
                          </div>
                        </div>

                        {/* Dirección de Envío de Documentos (edit) */}
                        <div className="mt-5 pt-4 border-t border-slate-100">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="h-5 w-1 rounded-full bg-gradient-to-b from-violet-500 to-violet-600" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Envío de Documentos Físicos</h4>
                          </div>
                          {(() => {
                            const docAddr = getDocShippingAddress();
                            return (
                              <>
                                <div className="space-y-1.5 mb-3">
                                  <Label className="text-xs font-semibold text-slate-600">Dirección de Envío</Label>
                                  <Input value={docAddr.address || ""} onChange={(e) => updateDocShippingAddress("address", e.target.value)} placeholder="Dirección para envío de documentos" className="rounded-lg" />
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-3">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-600">Ciudad</Label>
                                    <Input value={docAddr.city || ""} onChange={(e) => updateDocShippingAddress("city", e.target.value)} placeholder="Ej: Bogotá" className="rounded-lg" />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-600">País</Label>
                                    <Input value={docAddr.country || ""} onChange={(e) => updateDocShippingAddress("country", e.target.value)} placeholder="Ej: Colombia" className="rounded-lg" />
                                  </div>
                                </div>
                                <div className="space-y-1.5 mb-3">
                                  <Label className="text-xs font-semibold text-slate-600">Código Postal</Label>
                                  <Input value={docAddr.postal_code || ""} onChange={(e) => updateDocShippingAddress("postal_code", e.target.value)} placeholder="Ej: 110111" className="rounded-lg" />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-semibold text-slate-600">Notas de Envío</Label>
                                  <Textarea
                                    value={docAddr.notes || ""}
                                    onChange={(e) => updateDocShippingAddress("notes", e.target.value)}
                                    placeholder="Indicaciones especiales para el envío de documentos..."
                                    rows={2}
                                    className="rounded-lg"
                                  />
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* ---- Tab: Comercial ---- */}
                  <TabsContent value="commercial" className="space-y-5">
                    {viewMode ? (
                      <div className="space-y-5">
                        <div className="rounded-2xl border border-slate-100/80 bg-gradient-to-br from-white/60 to-slate-50/40 p-4 space-y-3">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="h-6 w-1 rounded-full bg-gradient-to-b from-violet-500 to-violet-600" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Información Comercial</h4>
                          </div>
                          <ReadOnlyField label="Comercial Asignado" value={editingClient?.assigned_commercial?.full_name} icon={User} accent="violet" />
                          <ReadOnlyField label="Celular" value={formData.mobile} icon={Phone} accent="emerald" />
                          <div className="grid grid-cols-2 gap-3">
                            <ReadOnlyField label="Creado" value={formatDate(editingClient?.created_at)} icon={FileText} accent="slate" />
                            <ReadOnlyField label="Actualizado" value={formatDate(editingClient?.updated_at)} icon={FileText} accent="slate" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-600">Comercial Asignado</Label>
                          <Select value={formData.assigned_commercial_id || ""} onValueChange={(v) => updateFormField("assigned_commercial_id", v || null)}>
                            <SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccionar comercial" /></SelectTrigger>
                            <SelectContent>
                              {commercials.map((c) => (
                                <SelectItem key={c.id} value={c.id!}>{c.full_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-600">Celular</Label>
                          <Input value={formData.mobile || ""} onChange={(e) => updateFormField("mobile", e.target.value)} placeholder="+57 310 000 0000" className="rounded-lg" />
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* ---- Tab: Financiera ---- */}
                  <TabsContent value="financial" className="space-y-5">
                    {viewMode ? (
                      <div className="space-y-5">
                        <div className="rounded-2xl border border-slate-100/80 bg-gradient-to-br from-white/60 to-slate-50/40 p-4 space-y-3">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="h-6 w-1 rounded-full bg-gradient-to-b from-rose-500 to-rose-600" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Información Financiera</h4>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <ReadOnlyField label="NIT / ID Tributario" value={formData.tax_id} icon={Hash} accent="rose" />
                            <ReadOnlyField label="Régimen Tributario" value={formData.tax_regime} icon={FileText} accent="rose" />
                          </div>
                          <ReadOnlyField label="Condiciones de Pago" value={formData.payment_terms} icon={CreditCard} accent="amber" />
                          <div className="grid grid-cols-2 gap-3">
                            <ReadOnlyField label="Límite de Crédito" value={formData.credit_limit != null ? `$${Number(formData.credit_limit).toLocaleString("es-CO", { minimumFractionDigits: 2 })}` : null} icon={DollarSign} accent="emerald" />
                            <ReadOnlyField label="Moneda Preferida" value={formData.preferred_currency} icon={DollarSign} accent="emerald" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">NIT / ID Tributario</Label>
                            <Input value={formData.tax_id || ""} onChange={(e) => updateFormField("tax_id", e.target.value)} placeholder="Ej: 900.123.456-7" className="rounded-lg" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Régimen Tributario</Label>
                            <Input value={formData.tax_regime || ""} onChange={(e) => updateFormField("tax_regime", e.target.value)} placeholder="Ej: Responsable de IVA" className="rounded-lg" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-600">Condiciones de Pago</Label>
                          <Input value={formData.payment_terms || ""} onChange={(e) => updateFormField("payment_terms", e.target.value)} placeholder="Ej: 30 días, Anticipado, etc." className="rounded-lg" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Límite de Crédito</Label>
                            <Input type="number" value={formData.credit_limit ?? ""} onChange={(e) => updateFormField("credit_limit", e.target.value ? Number(e.target.value) : null)} placeholder="0.00" className="rounded-lg" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Moneda Preferida</Label>
                            <Select value={formData.preferred_currency || ""} onValueChange={(v) => updateFormField("preferred_currency", v || null)}>
                              <SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccionar moneda" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USD">USD - Dólar</SelectItem>
                                <SelectItem value="COP">COP - Peso Colombiano</SelectItem>
                                <SelectItem value="EUR">EUR - Euro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {/* Footer */}
            <div style={{ margin: "0 28px", height: 1, background: `linear-gradient(90deg, transparent, ${T.border}, transparent)` }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, padding: "14px 28px" }}>
              {viewMode ? (
                <>
                  <button
                    onClick={() => setModalOpen(false)}
                    style={{
                      padding: "8px 18px", borderRadius: 10,
                      border: `1px solid ${T.border}`, background: T.surface,
                      color: T.inkSoft, fontSize: 13, fontWeight: 600, cursor: "pointer",
                      fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                    }}
                  >Cerrar</button>
                  <button
                    onClick={() => setViewMode(false)}
                    style={{
                      padding: "8px 18px", borderRadius: 10, border: "none",
                      background: T.accent, color: "#fff", fontSize: 13, fontWeight: 700,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                      fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                      boxShadow: `0 2px 8px ${T.accent}30`,
                    }}
                  >{I.edit} Editar</button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setModalOpen(false)}
                    disabled={submitting}
                    style={{
                      padding: "8px 18px", borderRadius: 10,
                      border: `1px solid ${T.border}`, background: T.surface,
                      color: T.inkSoft, fontSize: 13, fontWeight: 600, cursor: "pointer",
                      fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                      opacity: submitting ? 0.5 : 1,
                    }}
                  >Cancelar</button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{
                      padding: "8px 18px", borderRadius: 10, border: "none",
                      background: T.accent, color: "#fff", fontSize: 13, fontWeight: 700,
                      cursor: submitting ? "wait" : "pointer",
                      display: "flex", alignItems: "center", gap: 6,
                      fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                      boxShadow: `0 2px 8px ${T.accent}30`, opacity: submitting ? 0.7 : 1,
                    }}
                  >
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {editingClient ? "Guardar Cambios" : "Crear Cliente"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 36, paddingTop: 20, borderTop: `1px solid ${T.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 11, color: T.inkLight, fontWeight: 500 }}>Powered by IBC STEEL GROUP · © {new Date().getFullYear()}</div>
          <div style={{ fontSize: 12, color: T.accent, fontWeight: 700, letterSpacing: "0.01em" }}>Developed by Maria Camila Mesa</div>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {[
            { label: "Contratos", href: "/contracts" },
            { label: "Cotizaciones", href: "/quotations" },
            { label: "Dashboard", href: "/" },
          ].map(l => (
            <Link key={l.label} href={l.href} style={{ fontSize: 11, color: T.inkMuted, fontWeight: 600, textDecoration: "none", transition: "color 0.15s" }}>{l.label}</Link>
          ))}
        </div>
      </div>

      {/* =====================================================
          Deactivate Confirmation Dialog
          ===================================================== */}
      <AlertDialog
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
      >
        <AlertDialogContent style={{ borderRadius: 18, border: `1px solid ${T.borderLight}`, boxShadow: T.shadowLg }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontSize: 16, fontWeight: 800, color: T.ink }}>Desactivar Cliente</AlertDialogTitle>
            <AlertDialogDescription style={{ fontSize: 13, color: T.inkMuted }}>
              ¿Estás seguro de que deseas desactivar a{" "}
              <span style={{ fontWeight: 700, color: T.ink }}>
                {clientToDeactivate?.company_name}
              </span>
              ? El cliente no será eliminado, pero dejará de aparecer en las
              listas activas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 10 }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              style={{ borderRadius: 10, background: T.danger, color: "#fff" }}
              onClick={handleDeactivate}
            >
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
