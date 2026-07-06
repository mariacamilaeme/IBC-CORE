"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Plus,
  Search,
  Ship,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  MapPin,
  Clock,
  FileText,
  AlertTriangle,
  Anchor,
  X,
  DollarSign,
  CheckCircle2,
  XCircle,
  Package,
  Weight,
  Globe,
  SlidersHorizontal,
  Building2,
  ClipboardCheck,
  ChevronDown,
  Pencil,
  Check,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { cn, formatDate, formatCurrency, formatNumber, SHIPMENT_STATUS_LABELS, CONTRACT_STATUS_COLORS, CONTRACT_STATUS_LABELS } from "@/lib/utils";
import type {
  Shipment,
  ShipmentStatus,
  ShipmentWithRelations,
  Vessel,
  Client,
  Profile,
  StatusHistoryEntry,
  ShipmentDocument,
  ShipmentIncident,
  Contract,
} from "@/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";

// ─── DESIGN TOKENS ───────────────────────────────────────────
import { T } from "@/lib/design-tokens";
import { getDirectContainerTrackingUrl, getDirectVesselTrackingUrl } from "@/lib/shipping-tracking";

// ─── SVG ICONS ───────────────────────────────────────────────
const I = {
  ship: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M12 1v4"/></svg>,
  home: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>,
  plus: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M12 5v14"/></svg>,
  refresh: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>,
};

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
      boxShadow: T.shadow, animation: `sFadeUp 0.55s cubic-bezier(0.4,0,0.2,1) ${delay}ms both`,
      overflow: "hidden", cursor: onClick ? "pointer" : "default",
      transition: hover ? "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" : undefined,
      ...style,
    }}
    onMouseEnter={hover ? (e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = T.shadowLg; } : undefined}
    onMouseLeave={hover ? (e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = T.shadow; } : undefined}
    >{children}</div>
  );
}

// ─── ANIMATED NUMBER (currency) ──────────────────────────────
function AnimCurrency({ value }: { value: number }) {
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
      const current = start + diff * eased;
      setDisplay(current);
      if (progress < 1) rafId = requestAnimationFrame(step);
      else animRef.current = value;
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value]);
  return <>USD {display.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>;
}

// =====================================================
// Constants
// =====================================================

const STATUSES: ShipmentStatus[] = [
  "reservado",
  "en_puerto_origen",
  "en_transito",
  "en_puerto_destino",
  "en_aduana",
  "nacionalizado",
  "entregado",
  "con_novedad",
];

const STATUS_COLORS: Record<ShipmentStatus, string> = {
  reservado: "bg-slate-100 text-slate-700 border-slate-200",
  en_puerto_origen: "bg-blue-100 text-blue-700 border-blue-200",
  en_transito: "bg-cyan-100 text-cyan-700 border-cyan-200",
  en_puerto_destino: "bg-purple-100 text-purple-700 border-purple-200",
  en_aduana: "bg-amber-100 text-amber-700 border-amber-200",
  nacionalizado: "bg-green-100 text-green-700 border-green-200",
  entregado: "bg-emerald-100 text-emerald-700 border-emerald-200",
  con_novedad: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_DOT_COLORS: Record<ShipmentStatus, string> = {
  reservado: "bg-slate-500",
  en_puerto_origen: "bg-blue-500",
  en_transito: "bg-cyan-500",
  en_puerto_destino: "bg-purple-500",
  en_aduana: "bg-amber-500",
  nacionalizado: "bg-green-500",
  entregado: "bg-emerald-500",
  con_novedad: "bg-red-500",
};

const INCOTERMS = ["EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"];
const CURRENCIES = ["USD", "COP", "EUR", "CNY"];
const CONTAINER_TYPES = ["20' Standard", "40' Standard", "40' High Cube", "20' Refrigerado", "40' Refrigerado", "Open Top", "Flat Rack"];

// =====================================================
// Contratos por Motonave - Constants
// =====================================================

const COUNTRY_FLAGS: Record<string, string> = {
  COLOMBIA: "\u{1F1E8}\u{1F1F4}",
  VENEZUELA: "\u{1F1FB}\u{1F1EA}",
  BOLIVIA: "\u{1F1E7}\u{1F1F4}",
  ECUADOR: "\u{1F1EA}\u{1F1E8}",
  PERU: "\u{1F1F5}\u{1F1EA}",
  "PERÚ": "\u{1F1F5}\u{1F1EA}",
};

const CONTRACT_STATUS_DOT_COLORS: Record<string, string> = {
  "ENTREGADO AL CLIENTE": "bg-emerald-500",
  "EN TRÁNSITO": "bg-blue-500",
  "EN PRODUCCIÓN": "bg-amber-500",
  "ANULADO": "bg-red-500",
  "PENDIENTE ANTICIPO": "bg-slate-400",
};

type VesselFilterType = "all" | "en_transito" | "pendiente_embarque" | "saldo_pendiente" | "bl_pendientes" | "por_actualizar";

// Ventana de "llegada inminente": si la ETA cae dentro de estos días,
// conviene verificar el tracking para confirmar la llegada.
const ETA_SOON_DAYS = 3;

// Señal derivada de las propias fechas del contrato — se limpia sola cuando
// la usuaria corrige la fecha en su Excel y lo importa.
type VesselUpdateSignal = { reason: string; severity: "danger" | "warning" } | null;

// =====================================================
// Zod Schema
// =====================================================

const shipmentFormSchema = z.object({
  client_id: z.string().min(1, "El cliente es obligatorio"),
  commercial_id: z.string().min(1, "El comercial es obligatorio"),
  vessel_id: z.string().min(1, "La motonave es obligatoria"),
  invoice_id: z.string().optional().nullable(),
  port_of_loading: z.string().min(1, "El puerto de carga es obligatorio"),
  port_of_discharge: z.string().min(1, "El puerto de descarga es obligatorio"),
  port_of_final_destination: z.string().optional().nullable(),
  incoterm: z.string().optional().nullable(),
  etd: z.string().min(1, "La fecha ETD es obligatoria"),
  atd: z.string().optional().nullable(),
  eta: z.string().min(1, "La fecha ETA es obligatoria"),
  ata: z.string().optional().nullable(),
  eta_final_destination: z.string().optional().nullable(),
  customs_clearance_date: z.string().optional().nullable(),
  delivery_date: z.string().optional().nullable(),
  container_type: z.string().optional().nullable(),
  container_quantity: z.coerce.number().optional().nullable(),
  container_numbers_text: z.string().optional().nullable(),
  seal_numbers_text: z.string().optional().nullable(),
  bl_number: z.string().optional().nullable(),
  booking_number: z.string().optional().nullable(),
  cargo_description: z.string().optional().nullable(),
  cargo_weight_tons: z.coerce.number().optional().nullable(),
  cargo_volume_m3: z.coerce.number().optional().nullable(),
  freight_cost: z.coerce.number().optional().nullable(),
  freight_currency: z.string().optional().nullable(),
  insurance_cost: z.coerce.number().optional().nullable(),
  tracking_url: z.string().optional().nullable(),
  current_location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type ShipmentFormValues = z.infer<typeof shipmentFormSchema>;

// =====================================================
// Floating Contract Window — panel flotante y arrastrable
// para consultar contratos sin salir de la pantalla.
// =====================================================

function FRow({ label, value, strong, color }: { label: string; value: React.ReactNode; strong?: boolean; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, lineHeight: 1.45 }}>
      <span style={{ color: T.inkLight, flexShrink: 0 }}>{label}</span>
      <span style={{ color: color || (strong ? T.ink : T.inkSoft), fontWeight: strong ? 700 : 500, textAlign: "right", wordBreak: "break-word" }}>
        {value || "—"}
      </span>
    </div>
  );
}

function ContractSplitPanel({ contract: c, onClose }: { contract: Contract; onClose: () => void }) {
  const fmtD = (d: string | null | undefined) => (d ? formatDate(d) : "—");

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: T.inkLight, borderBottom: `1px solid ${T.borderLight}`, paddingBottom: 4 }}>{title}</p>
      {children}
    </div>
  );

  return (
    <div style={{
      position: "relative", height: "100%", minWidth: 0,
      display: "flex", flexDirection: "column", borderRadius: 22,
      border: `1px solid ${T.borderLight}`, background: "rgba(255,255,255,0.96)",
      backdropFilter: "blur(24px)", boxShadow: "0 32px 64px -12px rgba(11,83,148,0.18)",
      overflow: "hidden", animation: "sFadeUp 0.3s ease both",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 20px", background: T.gradientPrimary, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <FileText style={{ width: 16, height: 16, color: "rgba(255,255,255,0.85)", flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", fontFamily: "var(--font-jetbrains-mono), monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {c.client_contract || c.china_contract || "Contrato"}
            </div>
            <div style={{ fontSize: 11.5, color: "rgba(207,224,240,0.9)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {c.client_name || "—"}
              {c.country && COUNTRY_FLAGS[c.country.toUpperCase()] && <span style={{ marginLeft: 6 }}>{COUNTRY_FLAGS[c.country.toUpperCase()]}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-semibold gap-1.5 rounded-lg px-2.5 py-1 shrink-0 bg-white/90",
              CONTRACT_STATUS_COLORS[c.status || ""] || "bg-gray-100 text-gray-800 border-gray-200"
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full inline-block", CONTRACT_STATUS_DOT_COLORS[c.status || ""] || "bg-slate-400")} />
            {CONTRACT_STATUS_LABELS[c.status || ""] || c.status || "—"}
          </Badge>
          <button
            onClick={onClose}
            title="Cerrar panel de contrato"
            style={{
              width: 28, height: 28, borderRadius: 8, border: "none",
              background: "rgba(255,255,255,0.16)", color: "#fff", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

      {/* Contenido — grid adaptable con información completa */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "18px 22px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "18px 28px" }}>
          <Section title="General">
            <FRow label="Contrato Cliente" value={c.client_contract} strong />
            <FRow label="Contrato China" value={c.china_contract} />
            <FRow label="Comercial" value={c.commercial_name} />
            <FRow label="País" value={c.country} />
            <FRow label="Incoterm" value={c.incoterm} />
            <FRow label="Producto" value={c.detail} />
            <FRow label="Tipo" value={c.product_type} />
            <FRow label="Mes emisión" value={c.issue_month} />
          </Section>

          <Section title="Toneladas">
            <FRow label="Tons acordadas" value={c.tons_agreed != null ? `${formatNumber(c.tons_agreed)} t` : "—"} />
            <FRow label="MT Shipped" value={c.tons_shipped != null ? `${formatNumber(c.tons_shipped)} t` : "—"} />
            <FRow label="Diferencia" value={c.tons_difference != null ? `${formatNumber(c.tons_difference)} t` : "—"} color={(c.tons_difference ?? 0) < 0 ? T.danger : undefined} />
            <FRow label="Cumplimiento" value={c.tons_compliance} />
          </Section>

          <Section title="Fechas">
            <FRow label="Contrato" value={fmtD(c.contract_date)} />
            <FRow label="Pago anticipo" value={fmtD(c.advance_payment_date)} />
            <FRow label="Entrega PCC" value={fmtD(c.delivery_date_pcc)} />
            <FRow label="EXW" value={fmtD(c.exw_date)} />
            <FRow label="ETD" value={fmtD(c.etd)} />
            <FRow label="ETA Inicial" value={fmtD(c.eta_initial)} />
            <FRow label="ETA Final" value={fmtD(c.eta_final)} strong />
            <FRow label="Dif. días" value={c.days_difference != null ? `${c.days_difference}` : "—"} color={(c.days_difference ?? 0) > 0 ? T.danger : undefined} />
            <FRow label="T. producción" value={c.production_time_days != null ? `${c.production_time_days} días` : "—"} />
            <FRow label="Cumplim. EXW" value={c.exw_compliance} />
          </Section>

          <Section title="Embarque">
            <FRow label="Motonave" value={c.vessel_name} strong />
            <FRow label="Naviera" value={c.shipping_company} />
            <FRow label="N° BL" value={c.bl_number} />
            <FRow label="Puerto arribo" value={c.arrival_port} />
            <FRow label="Tipo embarque" value={c.shipment_type} />
            <FRow
              label="Liberación BL"
              value={c.bl_released === "SI" ? "Liberado" : "Pendiente"}
              color={c.bl_released === "SI" ? T.success : T.danger}
              strong
            />
          </Section>

          <Section title="Pagos">
            <FRow label="Pago anticipo" value={c.advance_paid} />
            <FRow label="Pago saldo" value={c.balance_paid} color={c.balance_paid === "PENDIENTE" ? T.warning : undefined} />
            <FRow
              label="Valor pendiente"
              value={(c.pending_client_amount ?? 0) > 0 ? formatCurrency(c.pending_client_amount!) : "Pagado"}
              color={(c.pending_client_amount ?? 0) > 0 ? T.danger : T.success}
              strong
            />
          </Section>

          <Section title="Documentos">
            <FRow label="Enviados" value={c.documents_sent} />
            <FRow label="Pendientes" value={c.documents_pending} color={c.documents_pending ? T.danger : undefined} />
            <FRow label="Físicos" value={c.physical_docs_sent} />
          </Section>
        </div>

        {/* Notas — ancho completo */}
        {c.notes && (
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: T.inkLight, borderBottom: `1px solid ${T.borderLight}`, paddingBottom: 4 }}>Observaciones</p>
            <p style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{c.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// Main Page Component
// =====================================================

export default function ShipmentsPage() {
  const { user, profile } = useAuth();
  const supabase = createClient();
  const searchParams = useSearchParams();

  // Data states
  const [shipments, setShipments] = useState<ShipmentWithRelations[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [commercials, setCommercials] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterVessel, setFilterVessel] = useState<string>("all");

  // UI states
  const [formOpen, setFormOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState<ShipmentWithRelations | null>(null);
  const [detailShipment, setDetailShipment] = useState<ShipmentWithRelations | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [statusChangeShipment, setStatusChangeShipment] = useState<ShipmentWithRelations | null>(null);
  const [statusChangeOpen, setStatusChangeOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [statusChangeNotes, setStatusChangeNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // New vessel inline creation
  const [newVesselDialogOpen, setNewVesselDialogOpen] = useState(false);
  const [newVesselName, setNewVesselName] = useState("");
  const [newVesselShippingLine, setNewVesselShippingLine] = useState("");
  const [creatingVessel, setCreatingVessel] = useState(false);

  // Year filter
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  // Vessel detail dialog state
  const [vesselDetailOpen, setVesselDetailOpen] = useState(false);
  const [vesselDetailData, setVesselDetailData] = useState<{ name: string; contracts: Contract[] } | null>(null);

  // Contracts by vessel
  const [vesselContracts, setVesselContracts] = useState<Contract[]>([]);
  const [vesselContractsLoading, setVesselContractsLoading] = useState(false);
  const [vesselFilter, setVesselFilter] = useState<VesselFilterType>(() => {
    const f = searchParams.get("filter");
    if (f === "en_transito" || f === "pendiente_embarque" || f === "saldo_pendiente" || f === "bl_pendientes") return f;
    return "all";
  });

  // Vessel tab filter states
  const [vfClient, setVfClient] = useState<string[]>([]);
  const [vfStatus, setVfStatus] = useState<string[]>([]);
  const [vfVessel, setVfVessel] = useState<string[]>([]);
  const [vfPort, setVfPort] = useState<string[]>([]);
  const [vfSaldo, setVfSaldo] = useState<string[]>([]);
  const [vfBlReleased, setVfBlReleased] = useState<string[]>([]);
  const [vfEta, setVfEta] = useState<string[]>([]);
  const [vfActivePanel, setVfActivePanel] = useState<string | null>(null);
  const [vfPanelSearch, setVfPanelSearch] = useState("");
  const [vfEtaExpanded, setVfEtaExpanded] = useState<Set<string>>(new Set());
  const [vesselSearch, setVesselSearch] = useState("");

  // Inline ETD/ETA quick-edit state
  const [editingDateContractId, setEditingDateContractId] = useState<string | null>(null);
  const [editingDateField, setEditingDateField] = useState<"etd" | "eta_final" | null>(null);
  const [editingDateValue, setEditingDateValue] = useState("");
  const [savingDate, setSavingDate] = useState(false);

  // Vessel-level date editing state
  const [vesselDateEditing, setVesselDateEditing] = useState(false);
  const [vesselDateEtd, setVesselDateEtd] = useState("");
  const [vesselDateEtaInitial, setVesselDateEtaInitial] = useState("");
  const [vesselDateEtaFinal, setVesselDateEtaFinal] = useState("");
  const [vesselDateStatus, setVesselDateStatus] = useState("");
  const [vesselDateSaving, setVesselDateSaving] = useState(false);

  // =====================================================
  // Data Fetching
  // =====================================================

  const fetchShipments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (filterStatus && filterStatus !== "all") params.set("status", filterStatus);
      if (filterVessel && filterVessel !== "all") params.set("vessel_id", filterVessel);

      const res = await fetch(`/api/shipments?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Error al cargar embarques");
        return;
      }

      setShipments(json.data || []);
    } catch {
      toast.error("Error de conexión al cargar embarques");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterStatus, filterVessel]);

  const fetchVessels = useCallback(async () => {
    try {
      const res = await fetch("/api/vessels");
      const json = await res.json();
      if (res.ok) setVessels(json.data || []);
    } catch (err) {
      console.error("Error fetching vessels", err);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients");
      const json = await res.json();
      if (res.ok) setClients(json.data || []);
    } catch (err) {
      console.error("Error fetching clients", err);
    }
  }, []);

  const fetchCommercials = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_active", true)
        .in("role", ["comercial", "admin", "directora"])
        .order("full_name");
      if (data) setCommercials(data);
    } catch (err) {
      console.error("Error fetching commercials", err);
    }
  }, [supabase]);

  useEffect(() => {
    fetchShipments();
    fetchVessels();
    fetchClients();
    fetchCommercials();
  }, [fetchShipments, fetchVessels, fetchClients, fetchCommercials]);

  // Auto-generate shipping alerts on mount
  useEffect(() => {
    fetch("/api/shipping-alerts").catch(() => {});
  }, []);

  // =====================================================
  // Contracts by Vessel
  // =====================================================

  const fetchVesselContracts = useCallback(async () => {
    try {
      setVesselContractsLoading(true);
      const params = new URLSearchParams({ pageSize: "500" });
      if (selectedYears.length === 1) {
        params.set("date_from", `${selectedYears[0]}-01-01`);
        params.set("date_to", `${selectedYears[0]}-12-31`);
      } else if (selectedYears.length > 1) {
        const sorted = [...selectedYears].sort();
        params.set("date_from", `${sorted[0]}-01-01`);
        params.set("date_to", `${sorted[sorted.length - 1]}-12-31`);
      }
      const res = await fetch(`/api/contracts?${params.toString()}`);
      const json = await res.json();
      if (res.ok) {
        // Only keep contracts that have a vessel_name and are not ANULADO
        const filtered = (json.data || []).filter(
          (c: Contract) => c.vessel_name && c.vessel_name.trim() !== "" && c.status !== "ANULADO"
        );
        setVesselContracts(filtered);
      }
    } catch (err) {
      console.error("Error fetching contracts for vessel grouping", err);
    } finally {
      setVesselContractsLoading(false);
    }
  }, [selectedYears]);

  useEffect(() => {
    fetchVesselContracts();
  }, [fetchVesselContracts]);

  // ── Split view: motonave a la izquierda + contrato a la derecha ──
  // splitRatio = % del ancho que ocupa el panel de la motonave (25–75).
  const [splitContract, setSplitContract] = useState<Contract | null>(null);
  const [splitRatio, setSplitRatio] = useState(50);
  const splitRowRef = useRef<HTMLDivElement>(null);
  const splitDragging = useRef(false);

  // Al cerrar el detalle de motonave, cerrar también el contrato acoplado
  useEffect(() => {
    if (!vesselDetailOpen) setSplitContract(null);
  }, [vesselDetailOpen]);


  // Close year dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target as Node)) {
        setYearDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleYear = (year: string) => {
    setSelectedYears((prev) => {
      let next: string[];
      if (year === "all") {
        next = [];
      } else if (prev.includes(year)) {
        next = prev.filter((y) => y !== year);
      } else {
        next = [...prev, year];
      }
      setVesselContractsLoading(true);
      return next;
    });
  };

  const yearLabel = selectedYears.length === 0 ? "Todos" : [...selectedYears].sort().join(", ");

  const contractsByVessel = useMemo(() => {
    const groups: Record<string, Contract[]> = {};
    vesselContracts.forEach((c) => {
      const vessel = c.vessel_name?.trim().toUpperCase() || "SIN MOTONAVE";
      if (!groups[vessel]) groups[vessel] = [];
      groups[vessel].push(c);
    });
    // Sort by vessel name
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [vesselContracts]);

  // Vessel tab: filter options derived from loaded data
  const vfOptions = useMemo(() => {
    const unique = (arr: (string | null | undefined)[]) =>
      [...new Set(arr.filter((v): v is string => !!v && v.trim() !== ""))].sort();
    return {
      client_names: unique(vesselContracts.map((c) => c.client_name)),
      vessel_names: unique(vesselContracts.map((c) => c.vessel_name?.trim().toUpperCase())),
      arrival_ports: unique(vesselContracts.map((c) => c.arrival_port)),
      eta_dates: unique(vesselContracts.map((c) => c.eta_final)),
    };
  }, [vesselContracts]);

  const vesselKpis = useMemo(() => {
    const vesselEnTransito = new Set(
      vesselContracts
        .filter((c) => c.status === "EN TRÁNSITO")
        .map((c) => c.vessel_name?.trim().toUpperCase())
        .filter(Boolean)
    );
    const vesselPendienteEmbarque = new Set(
      vesselContracts
        .filter((c) => c.status === "EN PRODUCCIÓN" || c.status === "PENDIENTE ANTICIPO")
        .map((c) => c.vessel_name?.trim().toUpperCase())
        .filter(Boolean)
    );
    const toneladasEnTransito = vesselContracts
      .filter((c) => c.status === "EN TRÁNSITO")
      .reduce((sum, c) => sum + (c.tons_shipped ?? c.tons_agreed ?? 0), 0);
    const saldoPendiente = vesselContracts.reduce(
      (sum, c) => sum + (c.pending_client_amount ?? 0), 0
    );
    const blPendientes = vesselContracts.filter(
      (c) => c.bl_released !== "SI" && c.status !== "ENTREGADO AL CLIENTE"
    ).length;
    const contratosSaldoPendiente = vesselContracts.filter(
      (c) => (c.pending_client_amount ?? 0) > 0
    ).length;
    // Motonaves EN TRÁNSITO sin actualización reciente
    const groupsForStale: Record<string, Contract[]> = {};
    vesselContracts.forEach((c) => {
      const vessel = c.vessel_name?.trim().toUpperCase() || "SIN MOTONAVE";
      if (!groupsForStale[vessel]) groupsForStale[vessel] = [];
      groupsForStale[vessel].push(c);
    });
    const porActualizar = Object.values(groupsForStale).filter((group) => getVesselUpdateSignal(group) !== null).length;
    return {
      blPendientes,
      enTransito: vesselEnTransito.size,
      pendienteEmbarque: vesselPendienteEmbarque.size,
      toneladasEnTransito,
      saldoPendiente,
      contratosSaldoPendiente,
      porActualizar,
    };
  }, [vesselContracts]);

  // Apply KPI filter + popover filters + search
  const filteredContractsByVessel = useMemo(() => {
    // First filter individual contracts
    let filtered = vesselContracts;

    // Text search
    if (vesselSearch.trim()) {
      const q = vesselSearch.trim().toLowerCase();
      filtered = filtered.filter((c) =>
        (c.vessel_name ?? "").toLowerCase().includes(q) ||
        (c.client_name ?? "").toLowerCase().includes(q) ||
        (c.client_contract ?? "").toLowerCase().includes(q) ||
        (c.china_contract ?? "").toLowerCase().includes(q) ||
        (c.bl_number ?? "").toLowerCase().includes(q) ||
        (c.commercial_name ?? "").toLowerCase().includes(q) ||
        (c.arrival_port ?? "").toLowerCase().includes(q) ||
        (c.shipping_company ?? "").toLowerCase().includes(q)
      );
    }

    if (vfClient.length) filtered = filtered.filter((c) => vfClient.includes(c.client_name));
    if (vfStatus.length) filtered = filtered.filter((c) => vfStatus.includes(c.status || ""));
    if (vfVessel.length) filtered = filtered.filter((c) => vfVessel.includes(c.vessel_name?.trim().toUpperCase() || ""));
    if (vfPort.length) filtered = filtered.filter((c) => vfPort.includes(c.arrival_port || ""));
    if (vfEta.length) filtered = filtered.filter((c) => vfEta.includes(c.eta_final || ""));
    if (vfSaldo.length) {
      filtered = filtered.filter((c) => {
        const hasPending = (c.pending_client_amount ?? 0) > 0;
        if (vfSaldo.includes("PENDIENTE") && hasPending) return true;
        if (vfSaldo.includes("PAGADO") && !hasPending) return true;
        return false;
      });
    }
    if (vfBlReleased.length) {
      filtered = filtered.filter((c) => {
        if (vfBlReleased.includes("SI") && c.bl_released === "SI") return true;
        if (vfBlReleased.includes("NO") && c.bl_released !== "SI") return true;
        return false;
      });
    }

    // Group filtered contracts by vessel
    const groups: Record<string, Contract[]> = {};
    filtered.forEach((c) => {
      const vessel = c.vessel_name?.trim().toUpperCase() || "SIN MOTONAVE";
      if (!groups[vessel]) groups[vessel] = [];
      groups[vessel].push(c);
    });
    const statusPriority: Record<string, number> = {
      "EN TRÁNSITO": 0,
      "EN PRODUCCIÓN": 1,
      "PENDIENTE ANTICIPO": 2,
      "ENTREGADO AL CLIENTE": 3,
    };
    let result = Object.entries(groups).sort(([, contractsA], [, contractsB]) => {
      const statusA = getVesselPrimaryStatus(contractsA);
      const statusB = getVesselPrimaryStatus(contractsB);
      const priorityA = statusPriority[statusA] ?? 9;
      const priorityB = statusPriority[statusB] ?? 9;
      if (priorityA !== priorityB) return priorityA - priorityB;
      const etaA = getEarliestEta(contractsA);
      const etaB = getEarliestEta(contractsB);
      if (!etaA && !etaB) return 0;
      if (!etaA) return 1;
      if (!etaB) return -1;
      return etaA.localeCompare(etaB);
    });

    // Apply KPI filter on vessel level
    if (vesselFilter !== "all") {
      result = result.filter(([, contracts]) => {
        switch (vesselFilter) {
          case "en_transito":
            return contracts.some((c) => c.status === "EN TRÁNSITO");
          case "pendiente_embarque":
            return contracts.some(
              (c) => c.status === "EN PRODUCCIÓN" || c.status === "PENDIENTE ANTICIPO"
            );
          case "saldo_pendiente":
            return contracts.some((c) => (c.pending_client_amount ?? 0) > 0);
          case "bl_pendientes":
            return contracts.some((c) => c.bl_released !== "SI" && c.status !== "ENTREGADO AL CLIENTE");
          case "por_actualizar":
            return getVesselUpdateSignal(contracts) !== null;
          default:
            return true;
        }
      });
    }
    return result;
  }, [vesselContracts, vesselFilter, vesselSearch, vfClient, vfStatus, vfVessel, vfPort, vfEta, vfSaldo, vfBlReleased]);

  // =====================================================
  // Form
  // =====================================================

  const form = useForm<ShipmentFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(shipmentFormSchema) as any,
    defaultValues: {
      client_id: "",
      commercial_id: "",
      vessel_id: "",
      invoice_id: "",
      port_of_loading: "",
      port_of_discharge: "",
      port_of_final_destination: "",
      incoterm: "",
      etd: "",
      atd: "",
      eta: "",
      ata: "",
      eta_final_destination: "",
      customs_clearance_date: "",
      delivery_date: "",
      container_type: "",
      container_quantity: null,
      container_numbers_text: "",
      seal_numbers_text: "",
      bl_number: "",
      booking_number: "",
      cargo_description: "",
      cargo_weight_tons: null,
      cargo_volume_m3: null,
      freight_cost: null,
      freight_currency: "USD",
      insurance_cost: null,
      tracking_url: "",
      current_location: "",
      notes: "",
    },
  });

  const openCreateForm = () => {
    setEditingShipment(null);
    form.reset({
      client_id: "",
      commercial_id: profile?.role === "comercial" ? user?.id || "" : "",
      vessel_id: "",
      invoice_id: "",
      port_of_loading: "",
      port_of_discharge: "",
      port_of_final_destination: "",
      incoterm: "",
      etd: "",
      atd: "",
      eta: "",
      ata: "",
      eta_final_destination: "",
      customs_clearance_date: "",
      delivery_date: "",
      container_type: "",
      container_quantity: null,
      container_numbers_text: "",
      seal_numbers_text: "",
      bl_number: "",
      booking_number: "",
      cargo_description: "",
      cargo_weight_tons: null,
      cargo_volume_m3: null,
      freight_cost: null,
      freight_currency: "USD",
      insurance_cost: null,
      tracking_url: "",
      current_location: "",
      notes: "",
    });
    setFormOpen(true);
  };

  const openEditForm = (shipment: ShipmentWithRelations) => {
    setEditingShipment(shipment);
    form.reset({
      client_id: shipment.client_id,
      commercial_id: shipment.commercial_id,
      vessel_id: shipment.vessel_id,
      invoice_id: shipment.invoice_id || "",
      port_of_loading: shipment.port_of_loading,
      port_of_discharge: shipment.port_of_discharge,
      port_of_final_destination: shipment.port_of_final_destination || "",
      incoterm: shipment.incoterm || "",
      etd: shipment.etd ? shipment.etd.split("T")[0] : "",
      atd: shipment.atd ? shipment.atd.split("T")[0] : "",
      eta: shipment.eta ? shipment.eta.split("T")[0] : "",
      ata: shipment.ata ? shipment.ata.split("T")[0] : "",
      eta_final_destination: shipment.eta_final_destination ? shipment.eta_final_destination.split("T")[0] : "",
      customs_clearance_date: shipment.customs_clearance_date ? shipment.customs_clearance_date.split("T")[0] : "",
      delivery_date: shipment.delivery_date ? shipment.delivery_date.split("T")[0] : "",
      container_type: shipment.container_type || "",
      container_quantity: shipment.container_quantity,
      container_numbers_text: shipment.container_numbers?.join(", ") || "",
      seal_numbers_text: shipment.seal_numbers?.join(", ") || "",
      bl_number: shipment.bl_number || "",
      booking_number: shipment.booking_number || "",
      cargo_description: shipment.cargo_description || "",
      cargo_weight_tons: shipment.cargo_weight_tons,
      cargo_volume_m3: shipment.cargo_volume_m3,
      freight_cost: shipment.freight_cost,
      freight_currency: shipment.freight_currency || "USD",
      insurance_cost: shipment.insurance_cost,
      tracking_url: shipment.tracking_url || "",
      current_location: shipment.current_location || "",
      notes: shipment.notes || "",
    });
    setFormOpen(true);
  };

  const onSubmit = async (values: ShipmentFormValues) => {
    setSubmitting(true);
    try {
      // Convert textarea comma-separated values to arrays
      const containerNumbers = values.container_numbers_text
        ? values.container_numbers_text.split(",").map((s) => s.trim()).filter(Boolean)
        : null;
      const sealNumbers = values.seal_numbers_text
        ? values.seal_numbers_text.split(",").map((s) => s.trim()).filter(Boolean)
        : null;

      const payload = {
        ...values,
        container_numbers: containerNumbers,
        seal_numbers: sealNumbers,
        // Remove the text fields from payload
        container_numbers_text: undefined,
        seal_numbers_text: undefined,
        // Ensure empty strings become null
        invoice_id: values.invoice_id || null,
        port_of_final_destination: values.port_of_final_destination || null,
        incoterm: values.incoterm || null,
        atd: values.atd || null,
        ata: values.ata || null,
        eta_final_destination: values.eta_final_destination || null,
        customs_clearance_date: values.customs_clearance_date || null,
        delivery_date: values.delivery_date || null,
        container_type: values.container_type || null,
        bl_number: values.bl_number || null,
        booking_number: values.booking_number || null,
        cargo_description: values.cargo_description || null,
        freight_currency: values.freight_currency || null,
        tracking_url: values.tracking_url || null,
        current_location: values.current_location || null,
        notes: values.notes || null,
      };

      if (editingShipment) {
        // PATCH
        const res = await fetch("/api/shipments", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingShipment.id, ...payload }),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error || "Error al actualizar el embarque");
          return;
        }
        toast.success("Embarque actualizado correctamente");
      } else {
        // POST
        const res = await fetch("/api/shipments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error || "Error al crear el embarque");
          return;
        }
        toast.success("Embarque creado correctamente");
      }

      fetchShipments();
      if (!editingShipment) {
        setFormOpen(false);
        form.reset();
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // Status Change
  // =====================================================

  const openStatusChange = (shipment: ShipmentWithRelations) => {
    setStatusChangeShipment(shipment);
    setNewStatus(shipment.status || "reservado");
    setStatusChangeNotes("");
    setStatusChangeOpen(true);
  };

  const handleStatusChange = async () => {
    if (!statusChangeShipment || !newStatus) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/shipments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: statusChangeShipment.id,
          status: newStatus,
          status_change_notes: statusChangeNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Error al cambiar el estado");
        return;
      }
      toast.success(`Estado cambiado a "${SHIPMENT_STATUS_LABELS[newStatus] || newStatus}"`);
      setStatusChangeOpen(false);
      fetchShipments();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  };

  // Quick status change for Kanban
  const handleKanbanStatusChange = async (shipment: ShipmentWithRelations, targetStatus: ShipmentStatus) => {
    try {
      const res = await fetch("/api/shipments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: shipment.id,
          status: targetStatus,
          status_change_notes: `Movido desde kanban`,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Error al cambiar el estado");
        return;
      }
      toast.success(`Estado cambiado a "${SHIPMENT_STATUS_LABELS[targetStatus]}"`);
      fetchShipments();
    } catch {
      toast.error("Error de conexión");
    }
  };

  // =====================================================
  // New Vessel Dialog
  // =====================================================

  const handleCreateVessel = async () => {
    if (!newVesselName.trim()) {
      toast.error("El nombre de la motonave es obligatorio");
      return;
    }
    setCreatingVessel(true);
    try {
      const res = await fetch("/api/vessels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vessel_name: newVesselName.trim(),
          shipping_line: newVesselShippingLine.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Error al crear la motonave");
        return;
      }
      toast.success("Motonave creada correctamente");
      setNewVesselDialogOpen(false);
      setNewVesselName("");
      setNewVesselShippingLine("");
      await fetchVessels();
      // Auto-select the new vessel in the form
      form.setValue("vessel_id", json.data.id);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setCreatingVessel(false);
    }
  };

  // =====================================================
  // Detail Dialog
  // =====================================================

  const openDetail = (shipment: ShipmentWithRelations) => {
    setDetailShipment(shipment);
    setDetailOpen(true);
  };

  // =====================================================
  // Vessel Detail Dialog
  // =====================================================
  const openVesselDetail = (vesselName: string, contracts: Contract[]) => {
    setVesselDetailData({ name: vesselName, contracts });
    setVesselDetailOpen(true);
  };

  // =====================================================
  // Inline ETD/ETA Quick Edit
  // =====================================================

  const startDateEdit = (contractId: string, field: "etd" | "eta_final", currentValue: string | null) => {
    setEditingDateContractId(contractId);
    setEditingDateField(field);
    setEditingDateValue(currentValue || "");
  };

  const cancelDateEdit = () => {
    setEditingDateContractId(null);
    setEditingDateField(null);
    setEditingDateValue("");
  };

  const saveDateEdit = async () => {
    if (!editingDateContractId || !editingDateField) return;
    setSavingDate(true);
    try {
      const payload: Record<string, unknown> = {
        id: editingDateContractId,
      };
      if (editingDateField === "etd") {
        payload.etd = editingDateValue || null;
      } else {
        payload.eta_final = editingDateValue || null;
      }

      const res = await fetch("/api/contracts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Error al actualizar fecha");
        return;
      }
      toast.success(`${editingDateField === "etd" ? "ETD" : "ETA"} actualizada`);
      cancelDateEdit();
      fetchVesselContracts();
    } catch {
      toast.error("Error de conexion");
    } finally {
      setSavingDate(false);
    }
  };

  // ── Vessel-level date editing ──────────────────────────
  const startVesselDateEdit = (contracts: Contract[]) => {
    // Pre-fill from the first contract that has dates
    const ref = contracts.find((c) => c.etd || c.eta_initial || c.eta_final) || contracts[0];
    setVesselDateEtd(ref?.etd || "");
    setVesselDateEtaInitial(ref?.eta_initial || "");
    setVesselDateEtaFinal(ref?.eta_final || "");
    // Pre-fill status from most common status
    const statusRef = contracts.find((c) => c.status) || contracts[0];
    setVesselDateStatus(statusRef?.status || "");
    setVesselDateEditing(true);
  };

  const cancelVesselDateEdit = () => {
    setVesselDateEditing(false);
    setVesselDateEtd("");
    setVesselDateEtaInitial("");
    setVesselDateEtaFinal("");
    setVesselDateStatus("");
  };

  const saveVesselDates = async (vesselName: string) => {
    setVesselDateSaving(true);
    try {
      const payload: Record<string, unknown> = { vessel_name: vesselName };
      payload.etd = vesselDateEtd || null;
      payload.eta_initial = vesselDateEtaInitial || null;
      payload.eta_final = vesselDateEtaFinal || null;
      if (vesselDateStatus) {
        payload.status = vesselDateStatus;
      }

      const res = await fetch("/api/contracts/vessel-dates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Error al actualizar");
        return;
      }
      toast.success(`${json.updatedCount} contrato${json.updatedCount !== 1 ? "s" : ""} actualizado${json.updatedCount !== 1 ? "s" : ""}`);
      cancelVesselDateEdit();

      // Update dialog data immediately so user sees changes without closing
      if (vesselDetailData && vesselDetailData.name === vesselName) {
        const updatedContracts = vesselDetailData.contracts.map((c) => ({
          ...c,
          etd: vesselDateEtd || null,
          eta_initial: vesselDateEtaInitial || null,
          eta_final: vesselDateEtaFinal || null,
          ...(vesselDateStatus ? { status: vesselDateStatus as Contract["status"] } : {}),
        }));
        setVesselDetailData({ name: vesselName, contracts: updatedContracts });
      }

      // Also refresh the background data
      fetchVesselContracts();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setVesselDateSaving(false);
    }
  };

  // Vessel Tab Helpers
  // =====================================================

  function getVesselPrimaryStatus(contracts: Contract[]): string {
    const priority = ["EN TRÁNSITO", "EN PRODUCCIÓN", "PENDIENTE ANTICIPO", "ENTREGADO AL CLIENTE"];
    for (const status of priority) {
      if (contracts.some((c) => c.status === status)) return status;
    }
    return contracts[0]?.status || "PENDIENTE ANTICIPO";
  }

  function getEarliestEta(contracts: Contract[]): string | null {
    const etas = contracts
      .map((c) => c.eta_final)
      .filter((d): d is string => !!d)
      .sort();
    return etas[0] || null;
  }

  // Señal "por actualizar" derivada de las fechas de los contratos.
  // Prioridad: ETA vencida > ETD vencido > fechas incompletas > llegada inminente.
  function getVesselUpdateSignal(contracts: Contract[]): VesselUpdateSignal {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntil = (iso: string) => {
      const d = new Date(iso.split("T")[0] + "T00:00:00");
      if (isNaN(d.getTime())) return null;
      return Math.floor((d.getTime() - today.getTime()) / 86400000);
    };

    const transit = contracts.filter((c) => c.status === "EN TRÁNSITO");
    const production = contracts.filter((c) => c.status === "EN PRODUCCIÓN");

    // 1. ETA vencida y sigue EN TRÁNSITO → ¿ya llegó? actualizar fecha o status
    let etaOverdue: number | null = null;
    for (const c of transit) {
      if (!c.eta_final) continue;
      const d = daysUntil(c.eta_final);
      if (d !== null && d < 0) etaOverdue = Math.max(etaOverdue ?? 0, -d);
    }
    if (etaOverdue !== null) {
      return { reason: `ETA venció hace ${etaOverdue}d — ¿llegó?`, severity: "danger" };
    }

    // 2. ETD vencido y sigue EN PRODUCCIÓN → ¿ya zarpó? actualizar status
    let etdOverdue: number | null = null;
    for (const c of production) {
      if (!c.etd) continue;
      const d = daysUntil(c.etd);
      if (d !== null && d < 0) etdOverdue = Math.max(etdOverdue ?? 0, -d);
    }
    if (etdOverdue !== null) {
      return { reason: `ETD venció hace ${etdOverdue}d — ¿zarpó?`, severity: "danger" };
    }

    // 3. Fechas incompletas
    if (transit.some((c) => !c.eta_final)) {
      return { reason: "En tránsito sin ETA", severity: "warning" };
    }
    if (production.some((c) => !c.etd)) {
      return { reason: "Motonave asignada sin ETD", severity: "warning" };
    }

    // 4. Llegada inminente → confirmar en el tracking
    let soonest: number | null = null;
    for (const c of transit) {
      if (!c.eta_final) continue;
      const d = daysUntil(c.eta_final);
      if (d !== null && d >= 0 && d <= ETA_SOON_DAYS) soonest = Math.min(soonest ?? d, d);
    }
    if (soonest !== null) {
      return { reason: soonest === 0 ? "Llega hoy — confirmar" : `Llega en ${soonest}d — confirmar`, severity: "warning" };
    }

    return null;
  }

  // =====================================================
  // Vessel Filter Helpers
  // =====================================================

  const vfToggle = (current: string[], setter: (v: string[]) => void, value: string) => {
    if (current.includes(value)) setter(current.filter((v) => v !== value));
    else setter([...current, value]);
  };

  const vfDisplayText = (selected: string[], placeholder = "Todos") => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) return selected[0];
    return `${selected.length} seleccionados`;
  };

  const vfFilterCount = [vfClient, vfStatus, vfVessel, vfPort, vfSaldo, vfBlReleased, vfEta].filter((a) => a.length > 0).length;

  const clearVesselFilters = () => {
    setVfClient([]); setVfStatus([]); setVfVessel([]); setVfPort([]);
    setVfSaldo([]); setVfBlReleased([]); setVfEta([]); setVfEtaExpanded(new Set());
    setVfActivePanel(null); setVfPanelSearch("");
  };

  // =====================================================
  // Helpers
  // =====================================================

  const getStatusBadge = (status: ShipmentStatus | null | undefined) => {
    const s = status || "reservado";
    return (
      <Badge variant="outline" className={cn("text-xs font-medium border", STATUS_COLORS[s as ShipmentStatus] || STATUS_COLORS.reservado)}>
        {SHIPMENT_STATUS_LABELS[s] || s}
      </Badge>
    );
  };

  // =====================================================
  // Date Picker Helper Component
  // =====================================================

  const DatePickerField = ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (val: string) => void;
    placeholder: string;
  }) => {
    const [open, setOpen] = useState(false);
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-9",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(new Date(value + "T12:00:00"), "dd/MM/yyyy", { locale: es }) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value ? new Date(value + "T12:00:00") : undefined}
            onSelect={(date) => {
              if (date) {
                const iso = format(date, "yyyy-MM-dd");
                onChange(iso);
              } else {
                onChange("");
              }
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    );
  };

  // =====================================================
  // Render
  // =====================================================

  return (
    <div style={{
      background: T.glassBg, backdropFilter: T.glassBlur,
      border: `1px solid ${T.glassBorder}`, borderRadius: T.radius,
      boxShadow: T.shadowGlass, padding: "24px 28px",
    }}>
    <div style={{ minHeight: "100vh", fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif", color: T.ink, fontSize: 14 }}>
      <style>{`
        @keyframes sFadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sSlideRight { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes sProgressFill { from { width: 0%; } }
        @keyframes sDotPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
      `}</style>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, animation: "sFadeIn 0.3s ease both", fontSize: 12.5, color: T.inkLight }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 4, color: T.accent, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>{I.home} Inicio</Link>
        <span style={{ color: T.inkGhost }}>/</span>
        <span style={{ fontWeight: 600, color: T.inkMuted }}>Embarques</span>
      </div>

      {/* Header Banner */}
      <div style={{
        position: "relative", overflow: "visible", borderRadius: 14,
        background: T.gradientPrimary,
        padding: "14px 24px", marginBottom: 16,
        boxShadow: T.shadowMd,
        animation: "sFadeIn 0.4s ease both",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(620px 240px at 88% -30%, rgba(255,255,255,0.16), transparent 62%), radial-gradient(520px 260px at 6% 130%, rgba(0,184,224,0.20), transparent 60%)",
        }} />
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: 2,
          background: "linear-gradient(90deg, #00B8E0 0%, rgba(0,184,224,0.25) 40%, transparent 75%)",
        }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
            }}>{I.ship}</div>
            <div>
              <h1 style={{
                fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                fontSize: 22, fontWeight: 700, color: "#fff",
                letterSpacing: "-0.3px", lineHeight: 1.2,
              }}>Seguimiento de Embarques</h1>
              <p style={{ fontSize: 13, color: T.inkMuted, fontWeight: 500, opacity: 0.85 }}>
                Contratos agrupados por motonave — seguimiento logístico y de cobros
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div ref={yearDropdownRef} style={{ position: "relative" }}>
              <button
                onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
                style={{
                  padding: "6px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.25)",
                  background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)",
                  color: "#fff", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", outline: "none", display: "flex", alignItems: "center", gap: 6,
                  minWidth: 80,
                }}
              >
                {yearLabel}
                <ChevronDown size={14} style={{ opacity: 0.7 }} />
              </button>
              {yearDropdownOpen && typeof document !== "undefined" && createPortal(
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 99998 }} onMouseDown={() => setYearDropdownOpen(false)} />
                  <div onMouseDown={(e) => e.stopPropagation()} style={{
                    position: "fixed",
                    top: (yearDropdownRef.current?.getBoundingClientRect().bottom ?? 0) + 4,
                    left: (yearDropdownRef.current?.getBoundingClientRect().left ?? 0),
                    zIndex: 99999,
                    background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`,
                    boxShadow: "0 12px 40px rgba(0,0,0,0.18)", padding: 4, minWidth: 140,
                  }}>
                    {[
                      { value: "all", label: "Todos" },
                      { value: "2026", label: "2026" },
                      { value: "2025", label: "2025" },
                      { value: "2024", label: "2024" },
                    ].map((opt) => {
                      const isAll = opt.value === "all";
                      const isChecked = isAll ? selectedYears.length === 0 : selectedYears.includes(opt.value);
                      return (
                        <div
                          key={opt.value}
                          onClick={(e) => { e.stopPropagation(); toggleYear(opt.value); }}
                          style={{
                            display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
                            borderRadius: 6, cursor: "pointer",
                            background: isChecked ? T.accentLight : "transparent",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => { if (!isChecked) e.currentTarget.style.background = T.surfaceHover; }}
                          onMouseLeave={(e) => { if (!isChecked) e.currentTarget.style.background = "transparent"; }}
                        >
                          <div style={{
                            width: 16, height: 16, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
                            background: isChecked ? T.accent : T.surface,
                            border: `1.5px solid ${isChecked ? T.accent : T.border}`,
                          }}>
                            {isChecked && <Check size={12} style={{ color: "#fff" }} />}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: isChecked ? 600 : 400, color: isChecked ? T.accent : T.ink }}>{opt.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </>,
                document.body
              )}
            </div>
            <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.2)" }} />
            <button
              onClick={fetchVesselContracts}
              style={{
                padding: "7px 14px", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)",
                color: "#fff", fontWeight: 600, fontSize: 12,
                cursor: "pointer", fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                display: "flex", alignItems: "center", gap: 5,
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
            >{I.refresh} Actualizar</button>
          </div>
        </div>
      </div>

      {/* ===== VESSEL CONTENT ===== */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {vesselContractsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ borderRadius: T.radius, border: `1px solid ${T.borderLight}`, background: T.surface, padding: "10px 14px", animation: `sFadeUp 0.5s ease ${i * 80}ms both` }}>
                    <div style={{ height: 10, width: 70, background: T.borderLight, borderRadius: 4, marginBottom: 8 }} />
                    <div style={{ height: 22, width: 40, background: T.borderLight, borderRadius: 4 }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ borderRadius: T.radius, border: `1px solid ${T.borderLight}`, background: T.surface, padding: "13px 14px", animation: `sFadeUp 0.5s ease ${300 + i * 60}ms both` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: T.borderLight }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 12, width: 110, background: T.borderLight, borderRadius: 4, marginBottom: 5 }} />
                        <div style={{ height: 9, width: 70, background: T.border, borderRadius: 4 }} />
                      </div>
                    </div>
                    <div style={{ height: 22, width: 90, background: T.surfaceAlt, borderRadius: 8, marginBottom: 10 }} />
                    <div style={{ height: 30, background: T.surfaceAlt, borderRadius: 8 }} />
                  </div>
                ))}
              </div>
            </div>
          ) : contractsByVessel.length === 0 ? (
            <PCard style={{ padding: "64px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <Ship className="h-12 w-12" style={{ color: T.inkGhost, marginBottom: 12 }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: T.inkMuted }}>No hay contratos con motonave asignada</p>
              <p style={{ fontSize: 12.5, color: T.inkLight, marginTop: 4 }}>Los contratos aparecerán aquí cuando tengan una motonave asignada</p>
            </PCard>
          ) : (
            <>
              {/* ===== KPI Summary Cards ===== */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
                {([
                  { label: "Por Actualizar", value: vesselKpis.porActualizar, filterKey: "por_actualizar" as VesselFilterType, color: T.orange, bg: T.orangeBg, icon: RefreshCw, subtitle: "fechas vencidas o por confirmar" },
                  { label: "BL Pendientes", value: vesselKpis.blPendientes, filterKey: "bl_pendientes" as VesselFilterType, color: T.accent, bg: T.accentLight, icon: ClipboardCheck },
                  { label: "En Tránsito", value: vesselKpis.enTransito, filterKey: "en_transito" as VesselFilterType, color: T.teal, bg: T.tealBg, icon: Globe },
                  { label: "Pdte. Embarque", value: vesselKpis.pendienteEmbarque, filterKey: "pendiente_embarque" as VesselFilterType, color: T.warning, bg: T.warningBg, icon: Package },
                  { label: "Tons. Tránsito", value: vesselKpis.toneladasEnTransito, filterKey: "all" as VesselFilterType, color: T.violet, bg: T.violetBg, icon: Weight, isTonnage: true },
                  { label: "Saldo Pendiente", value: vesselKpis.saldoPendiente, filterKey: "saldo_pendiente" as VesselFilterType, color: T.danger, bg: T.dangerBg, icon: DollarSign, isCurrency: true, subtitle: `${vesselKpis.contratosSaldoPendiente} contrato${vesselKpis.contratosSaldoPendiente !== 1 ? "s" : ""}` },
                ] as const).map((kpi, idx) => {
                  const isActive = vesselFilter === kpi.filterKey && kpi.filterKey !== "all";
                  const isAllActive = vesselFilter === "all" && kpi.filterKey === "all";
                  const active = isActive || isAllActive;
                  return (
                    <PCard
                      key={kpi.label}
                      delay={idx * 60}
                      hover
                      onClick={() => {
                        if (kpi.filterKey === "all") setVesselFilter("all");
                        else setVesselFilter(vesselFilter === kpi.filterKey ? "all" : kpi.filterKey);
                      }}
                      style={{
                        padding: "10px 14px",
                        userSelect: "none",
                        borderColor: active ? kpi.color + "40" : T.borderLight,
                        boxShadow: active ? `0 4px 16px ${kpi.color}15` : T.shadow,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: kpi.bg, display: "flex", alignItems: "center", justifyContent: "center", color: kpi.color }}>
                          <kpi.icon style={{ width: 14, height: 14 }} />
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 700, color: T.inkLight, letterSpacing: "0.06em", textTransform: "uppercase" as const, lineHeight: 1.3, textAlign: "right" as const }}>{kpi.label}</span>
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 2, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", color: kpi.color }}>
                        {"isCurrency" in kpi && kpi.isCurrency
                          ? <AnimCurrency value={kpi.value} />
                          : "isTonnage" in kpi && kpi.isTonnage
                          ? <><AnimNum value={kpi.value} suffix=" t" /></>
                          : <AnimNum value={kpi.value} />}
                      </div>
                      {"subtitle" in kpi && kpi.subtitle && (
                        <div style={{ fontSize: 10, color: T.inkLight, fontWeight: 500 }}>{kpi.subtitle}</div>
                      )}
                    </PCard>
                  );
                })}
              </div>

              {/* ===== Search + Filter Bar ===== */}
              <PCard delay={350} style={{ padding: "10px 16px", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                {/* Search */}
                <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 320 }}>
                  <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: T.inkLight }} />
                  <input
                    type="text"
                    value={vesselSearch}
                    onChange={(e) => setVesselSearch(e.target.value)}
                    placeholder="Buscar motonave, cliente, contrato, BL..."
                    style={{
                      width: "100%", height: 36, paddingLeft: 34, paddingRight: 28, fontSize: 12.5,
                      borderRadius: T.radiusSm, border: `1px solid ${T.border}`, background: T.surface,
                      outline: "none", fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                      color: T.ink, transition: "all 0.2s ease",
                    }}
                  />
                  {vesselSearch && (
                    <button onClick={() => setVesselSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", padding: 2, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", color: T.inkLight }}>
                      <X style={{ width: 14, height: 14 }} />
                    </button>
                  )}
                </div>

                <Popover onOpenChange={(open) => { if (!open) { setVfActivePanel(null); setVfPanelSearch(""); } }}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 gap-1.5 text-sm rounded-xl border-slate-200 hover:border-[#1E3A5F]/30 hover:bg-blue-50/50 transition-all duration-200">
                      <SlidersHorizontal className="h-4 w-4" />
                      Filtros
                      {vfFilterCount > 0 && (
                        <Badge className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px] bg-gradient-to-r from-[#1E3A5F] to-blue-600 text-white border-0 shadow-sm">
                          {vfFilterCount}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[420px] max-h-[70vh] p-0 overflow-hidden rounded-2xl border-slate-200/80 shadow-xl shadow-slate-900/10 flex flex-col" align="start" sideOffset={8}>
                    {vfActivePanel === null ? (
                      <div className="flex flex-col overflow-hidden flex-1">
                        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-white">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1E3A5F] to-blue-600 shadow-sm">
                              <SlidersHorizontal className="h-3.5 w-3.5 text-white" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-800">Filtros</h4>
                            {vfFilterCount > 0 && (
                              <Badge className="h-5 min-w-[20px] px-1.5 text-[10px] bg-gradient-to-r from-[#1E3A5F] to-blue-600 text-white border-0">{vfFilterCount}</Badge>
                            )}
                          </div>
                          {vfFilterCount > 0 && (
                            <button onClick={clearVesselFilters} className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors">Limpiar todo</button>
                          )}
                        </div>
                        <div className="p-2 overflow-y-auto flex-1">
                          {([
                            { key: "client", label: "Cliente", selected: vfClient, icon: Building2 },
                            { key: "eta", label: "ETA Final", selected: vfEta, icon: CalendarIcon },
                            { key: "vessel", label: "Motonave", selected: vfVessel, icon: Ship },
                            { key: "status", label: "Estado", selected: vfStatus, icon: ClipboardCheck },
                            { key: "saldo", label: "Saldo Pendiente", selected: vfSaldo, icon: DollarSign },
                            { key: "bl", label: "BL Liberado", selected: vfBlReleased, icon: Anchor },
                            { key: "port", label: "Puerto de Arribo", selected: vfPort, icon: MapPin },
                          ] as const).map((cat) => (
                            <button
                              key={cat.key}
                              onClick={() => { setVfActivePanel(cat.key); setVfPanelSearch(""); }}
                              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-slate-50/50 transition-all duration-150 text-left group"
                            >
                              <div className="flex items-center gap-2.5">
                                <cat.icon className="h-4 w-4 text-slate-400 group-hover:text-[#1E3A5F] transition-colors" />
                                <span className="text-sm text-slate-700 group-hover:text-slate-900 font-medium">{cat.label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {cat.selected.length > 0 && (
                                  <Badge className="h-5 min-w-[20px] px-1.5 text-[10px] bg-gradient-to-r from-[#1E3A5F] to-blue-600 text-white border-0 shadow-sm">{cat.selected.length}</Badge>
                                )}
                                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : vfActivePanel === "eta" ? (
                      /* ETA hierarchical year→month→day panel */
                      <div className="flex flex-col overflow-hidden flex-1">
                        {(() => {
                          const MONTH_LABELS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
                          const dates = vfOptions.eta_dates || [];
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
                            setVfEtaExpanded((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
                          };
                          const allForYear = (y: string) => Object.values(tree[y]).flat();
                          const allForMonth = (mk: string) => { const [y] = mk.split("-"); return tree[y]?.[mk] || []; };
                          const allSel = (arr: string[]) => arr.length > 0 && arr.every((d) => vfEta.includes(d));
                          const someSel = (arr: string[]) => arr.some((d) => vfEta.includes(d));
                          const toggleDates = (ds: string[]) => {
                            if (allSel(ds)) setVfEta((p) => p.filter((d) => !ds.includes(d)));
                            else setVfEta((p) => [...new Set([...p, ...ds])]);
                          };
                          return (
                            <>
                              <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-white">
                                <button onClick={() => { setVfActivePanel(null); setVfPanelSearch(""); }} className="p-1 rounded-lg hover:bg-slate-200/70 transition-colors"><ChevronLeft className="h-4 w-4 text-slate-500" /></button>
                                <CalendarIcon className="h-4 w-4 text-[#1E3A5F]" />
                                <h4 className="text-sm font-bold text-slate-800 flex-1">ETA Final</h4>
                                {vfEta.length > 0 && <button onClick={() => { setVfEta([]); setVfEtaExpanded(new Set()); }} className="text-[11px] text-red-500 hover:text-red-700 font-semibold transition-colors">Limpiar</button>}
                              </div>
                              <div className="flex items-center justify-between px-3 py-1.5 border-b bg-slate-50/50">
                                <button onClick={() => setVfEta([...dates])} className="text-[11px] text-[#1E3A5F] hover:underline font-medium">Seleccionar todo</button>
                                <span className="text-[11px] text-slate-400">{vfEta.length} de {dates.length}</span>
                              </div>
                              <div className="overflow-y-auto flex-1">
                                <div className="p-1.5">
                                  {years.length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center py-4">Sin fechas</p>
                                  ) : years.map((year) => {
                                    const yearDates = allForYear(year);
                                    const yChecked = allSel(yearDates);
                                    const yIndet = !yChecked && someSel(yearDates);
                                    const yExp = vfEtaExpanded.has(year);
                                    const months = Object.keys(tree[year]).sort();
                                    return (
                                      <div key={year}>
                                        <div className="flex items-center gap-1 px-1 py-1 rounded hover:bg-slate-50">
                                          <button onClick={() => toggleExpand(year)} className="p-0.5">
                                            {yExp ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                                          </button>
                                          <label className="flex items-center gap-2 cursor-pointer flex-1">
                                            <Checkbox checked={yChecked} data-indeterminate={yIndet || undefined} className={cn("h-4 w-4", yIndet && "opacity-60")} onCheckedChange={() => toggleDates(yearDates)} />
                                            <span className="text-sm font-semibold text-slate-800">{year}</span>
                                          </label>
                                        </div>
                                        {yExp && months.map((mk) => {
                                          const mNum = parseInt(mk.split("-")[1], 10);
                                          const mLabel = MONTH_LABELS[mNum - 1] || mk;
                                          const mDates = allForMonth(mk);
                                          const mChecked = allSel(mDates);
                                          const mIndet = !mChecked && someSel(mDates);
                                          const mExp = vfEtaExpanded.has(mk);
                                          return (
                                            <div key={mk}>
                                              <div className="flex items-center gap-1 pl-6 pr-1 py-1 rounded hover:bg-slate-50">
                                                <button onClick={() => toggleExpand(mk)} className="p-0.5">
                                                  {mExp ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                                                </button>
                                                <label className="flex items-center gap-2 cursor-pointer flex-1">
                                                  <Checkbox checked={mChecked} data-indeterminate={mIndet || undefined} className={cn("h-4 w-4", mIndet && "opacity-60")} onCheckedChange={() => toggleDates(mDates)} />
                                                  <span className="text-sm text-slate-700">{mLabel}</span>
                                                </label>
                                              </div>
                                              {mExp && mDates.sort().map((date) => {
                                                const day = parseInt(date.split("-")[2], 10);
                                                return (
                                                  <label key={date} className="flex items-center gap-2.5 pl-14 pr-2 py-1 rounded hover:bg-slate-50 cursor-pointer">
                                                    <Checkbox checked={vfEta.includes(date)} onCheckedChange={() => vfToggle(vfEta, setVfEta, date)} className="h-4 w-4" />
                                                    <span className="text-sm text-slate-600">{day}</span>
                                                  </label>
                                                );
                                              })}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      /* Standard drill-down panel with search + checkboxes */
                      <div className="flex flex-col overflow-hidden flex-1">
                        {(() => {
                          const ALL_CONTRACT_STATUSES = ["EN TRÁNSITO", "EN PRODUCCIÓN", "PENDIENTE ANTICIPO", "ENTREGADO AL CLIENTE"];
                          const panelConfig: Record<string, { label: string; options: { value: string; label: string }[]; selected: string[]; setter: (v: string[]) => void }> = {
                            client: { label: "Cliente", options: vfOptions.client_names.map((n) => ({ value: n, label: n })), selected: vfClient, setter: setVfClient },
                            status: { label: "Estado", options: ALL_CONTRACT_STATUSES.map((s) => ({ value: s, label: CONTRACT_STATUS_LABELS[s] || s })), selected: vfStatus, setter: setVfStatus },
                            vessel: { label: "Motonave", options: vfOptions.vessel_names.map((n) => ({ value: n, label: n })), selected: vfVessel, setter: setVfVessel },
                            port: { label: "Puerto de Arribo", options: vfOptions.arrival_ports.map((p) => ({ value: p, label: p })), selected: vfPort, setter: setVfPort },
                            saldo: { label: "Saldo Pendiente", options: [{ value: "PENDIENTE", label: "Pendiente" }, { value: "PAGADO", label: "Pagado" }], selected: vfSaldo, setter: setVfSaldo },
                            bl: { label: "BL Liberado", options: [{ value: "SI", label: "Sí (Liberado)" }, { value: "NO", label: "No (Pendiente)" }], selected: vfBlReleased, setter: setVfBlReleased },
                          };
                          const config = panelConfig[vfActivePanel || ""];
                          if (!config) return null;
                          const searchLower = vfPanelSearch.toLowerCase();
                          const filteredOpts = config.options.filter((o) => o.label.toLowerCase().includes(searchLower));
                          return (
                            <>
                              <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-white">
                                <button onClick={() => { setVfActivePanel(null); setVfPanelSearch(""); }} className="p-1 rounded-lg hover:bg-slate-200/70 transition-colors"><ChevronLeft className="h-4 w-4 text-slate-500" /></button>
                                <h4 className="text-sm font-bold text-slate-800 flex-1">{config.label}</h4>
                                {config.selected.length > 0 && <button onClick={() => config.setter([])} className="text-[11px] text-red-500 hover:text-red-700 font-semibold transition-colors">Limpiar</button>}
                              </div>
                              {config.options.length >= 5 && (
                                <div className="px-3 py-2 border-b">
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <Input placeholder="Buscar..." value={vfPanelSearch} onChange={(e) => setVfPanelSearch(e.target.value)} className="h-8 pl-8 text-xs" />
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center justify-between px-3 py-1.5 border-b bg-slate-50/50">
                                <button onClick={() => config.setter(filteredOpts.map((o) => o.value))} className="text-[11px] text-[#1E3A5F] hover:underline font-medium">Seleccionar todo</button>
                                <span className="text-[11px] text-slate-400">{config.selected.length} de {config.options.length}</span>
                              </div>
                              <div className="overflow-y-auto flex-1">
                                <div className="p-1.5">
                                  {filteredOpts.length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center py-4">Sin resultados</p>
                                  ) : filteredOpts.map((opt) => (
                                    <label key={opt.value} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded hover:bg-slate-50 cursor-pointer transition-colors">
                                      <Checkbox checked={config.selected.includes(opt.value)} onCheckedChange={() => vfToggle(config.selected, config.setter, opt.value)} className="h-4 w-4" />
                                      <span className="text-sm text-slate-700 truncate">{opt.label}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </PopoverContent>
                </Popover>

                {vfFilterCount > 0 && (
                  <button
                    onClick={clearVesselFilters}
                    style={{
                      display: "flex", alignItems: "center", gap: 4, padding: "6px 12px",
                      borderRadius: 8, border: "none", background: T.dangerBg,
                      color: T.danger, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <X style={{ width: 14, height: 14 }} />
                    Limpiar
                  </button>
                )}
              </PCard>

              {/* ===== Toolbar ===== */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", animation: "sFadeIn 0.4s ease 400ms both" }}>
                <p style={{ fontSize: 13, color: T.inkMuted }}>
                  <span style={{ fontWeight: 700, color: T.ink, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}>
                    {filteredContractsByVessel.length}
                  </span>
                  {" "}motonave{filteredContractsByVessel.length !== 1 ? "s" : ""}
                  {vesselFilter !== "all" && (
                    <span style={{ fontSize: 12, marginLeft: 8 }}>
                      (filtrado)
                      <button onClick={() => setVesselFilter("all")} style={{ marginLeft: 6, color: T.accent, fontWeight: 600, border: "none", background: "none", cursor: "pointer", textDecoration: "underline", fontSize: 12 }}>
                        Ver todas
                      </button>
                    </span>
                  )}
                </p>
              </div>

              {/* ===== Vessel Cards Grid (compact) ===== */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {filteredContractsByVessel.map(([vesselName, contracts], vIdx) => {
                  const primaryStatus = getVesselPrimaryStatus(contracts);
                  const earliestEta = getEarliestEta(contracts);
                  const shippingCompany = contracts.find((c) => c.shipping_company)?.shipping_company;
                  const totalTons = contracts.reduce((s, c) => s + (c.tons_shipped ?? c.tons_agreed ?? 0), 0);
                  const totalPending = contracts.reduce((s, c) => s + (c.pending_client_amount ?? 0), 0);
                  return (
                    <PCard
                      key={vesselName}
                      delay={450 + vIdx * 60}
                      hover
                      onClick={() => openVesselDetail(vesselName, contracts)}
                      style={{ position: "relative", overflow: "hidden" }}
                    >
                      {/* Compact Vessel Body */}
                      <div style={{ padding: "13px 14px 12px" }}>
                        {/* Header: vessel name + tracking */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                              background: T.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center",
                              color: T.inkLight,
                            }}>
                              <Ship style={{ width: 16, height: 16 }} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <h3 style={{ fontSize: 13, fontWeight: 800, color: T.ink, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2 }}>
                                {vesselName}
                              </h3>
                              {shippingCompany && (
                                <p style={{ fontSize: 10, color: T.inkLight, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{shippingCompany}</p>
                              )}
                            </div>
                          </div>
                          {/* Tracking button (compact, icon-only) */}
                          {(() => {
                            const sampleContract = contracts.find((c) => c.shipping_company || c.bl_number || c.vessel_name);
                            if (!sampleContract) return null;
                            const directUrl = getDirectContainerTrackingUrl({
                              shipping_company: sampleContract.shipping_company,
                              bl_number: sampleContract.bl_number,
                              shipment_type: sampleContract.shipment_type,
                            });
                            const vesselUrl = directUrl ? null : getDirectVesselTrackingUrl(sampleContract.vessel_name ?? vesselName);
                            const url = directUrl || vesselUrl;
                            if (!url) return null;
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const textToCopy = directUrl ? (sampleContract.bl_number ?? "") : (sampleContract.vessel_name ?? vesselName);
                                  if (textToCopy) {
                                    navigator.clipboard.writeText(textToCopy).then(() => {
                                      toast.success(directUrl ? `BL copiado: ${textToCopy}` : `Motonave copiada: ${textToCopy}`);
                                    });
                                  }
                                  window.open(url, "_blank", "noopener,noreferrer");
                                }}
                                title="Rastrear embarque"
                                style={{
                                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                  color: T.inkLight, background: T.surfaceAlt, padding: "6px", borderRadius: 8,
                                  border: `1px solid ${T.borderLight}`, cursor: "pointer", transition: "all 0.2s ease",
                                }}
                              >
                                <Globe style={{ width: 14, height: 14 }} />
                              </button>
                            );
                          })()}
                        </div>

                        {/* Status badge + freshness */}
                        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-semibold gap-1.5 rounded-lg px-2.5 py-1",
                              CONTRACT_STATUS_COLORS[primaryStatus] || "bg-gray-100 text-gray-800 border-gray-200"
                            )}
                          >
                            <span className={cn("h-1.5 w-1.5 rounded-full inline-block", CONTRACT_STATUS_DOT_COLORS[primaryStatus] || "bg-slate-400")} />
                            {CONTRACT_STATUS_LABELS[primaryStatus] || primaryStatus}
                          </Badge>
                          {(() => {
                            const signal = getVesselUpdateSignal(contracts);
                            if (!signal) return null;
                            const color = signal.severity === "danger" ? T.danger : T.orange;
                            return (
                              <span
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: 5,
                                  padding: "2.5px 8px", borderRadius: 8,
                                  background: color + "14", color,
                                  fontSize: 10, fontWeight: 700, whiteSpace: "nowrap",
                                  border: `1px solid ${color}30`,
                                }}
                                title="Detectado a partir de las fechas del contrato — actualiza tu Excel y vuelve a importar para limpiar la alerta"
                              >
                                <RefreshCw style={{ width: 10, height: 10 }} />
                                {signal.reason}
                              </span>
                            );
                          })()}
                        </div>

                        {/* ETA compact line (key info) */}
                        {earliestEta && primaryStatus !== "ENTREGADO AL CLIENTE" ? (() => {
                          const daysLeft = differenceInCalendarDays(parseISO(earliestEta), new Date());
                          const isOverdue = daysLeft < 0;
                          const isImminent = daysLeft >= 0 && daysLeft <= 3;
                          // Color reservado solo para alertas (atrasada / inminente); el resto neutro
                          const alert = isOverdue ? T.danger : isImminent ? T.warning : null;
                          const daysLabel = isOverdue
                            ? `${Math.abs(daysLeft)}d retraso`
                            : daysLeft === 0 ? "Hoy"
                            : daysLeft === 1 ? "Mañana"
                            : `${daysLeft} días`;
                          return (
                            <div style={{
                              marginTop: 10, padding: "7px 10px", borderRadius: T.radiusSm,
                              background: T.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
                            }}>
                              <span style={{ display: "flex", alignItems: "center", gap: 6, color: T.inkSoft, fontWeight: 700, fontSize: 12.5, fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                                <Anchor style={{ width: 13, height: 13, color: T.inkLight }} />
                                {formatDate(earliestEta)}
                              </span>
                              <span style={{ fontSize: 10.5, fontWeight: 700, color: alert ?? T.inkLight, padding: "2px 8px", borderRadius: 20, background: alert ? `${alert}1A` : "transparent" }}>
                                {daysLabel}
                              </span>
                            </div>
                          );
                        })() : (
                          <div style={{ marginTop: 10, padding: "7px 10px", borderRadius: T.radiusSm, background: T.surfaceAlt, display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: T.inkLight, fontWeight: 600 }}>
                            <Anchor style={{ width: 13, height: 13 }} />
                            {primaryStatus === "ENTREGADO AL CLIENTE" ? "Entregado al cliente" : "Sin ETA"}
                          </div>
                        )}

                        {/* Footer: contracts·tons + saldo pendiente (key info) */}
                        <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: T.inkMuted }}>
                            <FileText style={{ width: 12, height: 12, color: T.inkLight }} />
                            <span style={{ fontWeight: 700, color: T.ink, fontFamily: "var(--font-jetbrains-mono), monospace" }}>{contracts.length}</span>
                            <span style={{ color: T.inkGhost }}>·</span>
                            <span style={{ fontWeight: 700, color: T.ink, fontFamily: "var(--font-jetbrains-mono), monospace" }}>{formatNumber(totalTons)}</span> t
                          </span>
                          {totalPending > 0 ? (
                            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 800, color: T.danger, fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                              <span style={{ width: 6, height: 6, borderRadius: 99, background: T.danger, display: "inline-block" }} />
                              {formatCurrency(totalPending)}
                            </span>
                          ) : (
                            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600, color: T.inkLight }}>
                              <CheckCircle2 style={{ width: 13, height: 13 }} />
                              Pagado
                            </span>
                          )}
                        </div>
                      </div>
                    </PCard>
                  );
                })}
              </div>

              {/* Empty filter state */}
              {filteredContractsByVessel.length === 0 && vesselFilter !== "all" && (
                <PCard style={{ padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <Ship style={{ width: 32, height: 32, color: T.inkGhost, marginBottom: 8 }} />
                  <p style={{ fontSize: 13, color: T.inkMuted }}>No hay motonaves para el filtro seleccionado</p>
                  <button onClick={() => setVesselFilter("all")} style={{ marginTop: 8, fontSize: 13, color: T.accent, fontWeight: 600, border: "none", background: "none", cursor: "pointer", textDecoration: "underline" }}>
                    Ver todas las motonaves
                  </button>
                </PCard>
              )}
            </>
          )}
      </div>

      {/* =========== DETAIL DIALOG =========== */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-[#1E3A5F]">
              <Ship className="h-5 w-5" />
              Detalle del Embarque {detailShipment?.shipment_number}
            </DialogTitle>
          </DialogHeader>
          {detailShipment && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6 pb-4">
                {/* Status Badge */}
                <div className="flex items-center gap-3">
                  {getStatusBadge(detailShipment.status)}
                  <span className="text-sm text-muted-foreground">
                    Creado el {formatDate(detailShipment.created_at)}
                  </span>
                </div>

                {/* Info General */}
                <div>
                  <h3 className="text-sm font-semibold text-[#1E3A5F] mb-3">Informacion General</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Cliente:</span>{" "}
                      <span className="font-medium">{(detailShipment as ShipmentWithRelations).client?.company_name || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Comercial:</span>{" "}
                      <span className="font-medium">{(detailShipment as ShipmentWithRelations).commercial?.full_name || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Motonave:</span>{" "}
                      <span className="font-medium">{(detailShipment as ShipmentWithRelations).vessel?.vessel_name || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Naviera:</span>{" "}
                      <span className="font-medium">{(detailShipment as ShipmentWithRelations).vessel?.shipping_line || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">BL:</span>{" "}
                      <span className="font-medium">{detailShipment.bl_number || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Booking:</span>{" "}
                      <span className="font-medium">{detailShipment.booking_number || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Incoterm:</span>{" "}
                      <span className="font-medium">{detailShipment.incoterm || "—"}</span>
                    </div>
                    {detailShipment.tracking_url && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Tracking:</span>{" "}
                        <a href={detailShipment.tracking_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                          {detailShipment.tracking_url}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Route & Dates */}
                <div>
                  <h3 className="text-sm font-semibold text-[#1E3A5F] mb-3">Ruta y Fechas</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Puerto Carga:</span>{" "}
                      <span className="font-medium">{detailShipment.port_of_loading}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Puerto Descarga:</span>{" "}
                      <span className="font-medium">{detailShipment.port_of_discharge}</span>
                    </div>
                    {detailShipment.port_of_final_destination && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Destino Final:</span>{" "}
                        <span className="font-medium">{detailShipment.port_of_final_destination}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">ETD:</span>{" "}
                      <span className="font-medium">{formatDate(detailShipment.etd)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ATD:</span>{" "}
                      <span className="font-medium">{formatDate(detailShipment.atd)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ETA:</span>{" "}
                      <span className="font-medium">{formatDate(detailShipment.eta)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ATA:</span>{" "}
                      <span className="font-medium">{formatDate(detailShipment.ata)}</span>
                    </div>
                    {detailShipment.customs_clearance_date && (
                      <div>
                        <span className="text-muted-foreground">Nacionalizacion:</span>{" "}
                        <span className="font-medium">{formatDate(detailShipment.customs_clearance_date)}</span>
                      </div>
                    )}
                    {detailShipment.delivery_date && (
                      <div>
                        <span className="text-muted-foreground">Entrega:</span>{" "}
                        <span className="font-medium">{formatDate(detailShipment.delivery_date)}</span>
                      </div>
                    )}
                    {detailShipment.current_location && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Ubicacion Actual:</span>{" "}
                        <span className="font-medium">{detailShipment.current_location}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Containers */}
                <div>
                  <h3 className="text-sm font-semibold text-[#1E3A5F] mb-3">Contenedores y Carga</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Tipo:</span>{" "}
                      <span className="font-medium">{detailShipment.container_type || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cantidad:</span>{" "}
                      <span className="font-medium">{detailShipment.container_quantity ?? "—"}</span>
                    </div>
                    {detailShipment.container_numbers && detailShipment.container_numbers.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Contenedores:</span>{" "}
                        <span className="font-medium font-mono text-xs">{detailShipment.container_numbers.join(", ")}</span>
                      </div>
                    )}
                    {detailShipment.seal_numbers && detailShipment.seal_numbers.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Sellos:</span>{" "}
                        <span className="font-medium font-mono text-xs">{detailShipment.seal_numbers.join(", ")}</span>
                      </div>
                    )}
                    {detailShipment.cargo_description && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Descripcion:</span>{" "}
                        <span className="font-medium">{detailShipment.cargo_description}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Peso (Ton):</span>{" "}
                      <span className="font-medium">{detailShipment.cargo_weight_tons ?? "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Volumen (m3):</span>{" "}
                      <span className="font-medium">{detailShipment.cargo_volume_m3 ?? "—"}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Documents */}
                {detailShipment.documents && detailShipment.documents.length > 0 && (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Documentos
                      </h3>
                      <div className="space-y-2">
                        {detailShipment.documents.map((doc: ShipmentDocument, i: number) => (
                          <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 rounded text-sm">
                            <div>
                              <span className="font-medium">{doc.name}</span>
                              <span className="text-muted-foreground ml-2">({doc.type})</span>
                            </div>
                            {doc.url && (
                              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs underline">
                                Ver
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Incidents */}
                {detailShipment.incidents && detailShipment.incidents.length > 0 && (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Novedades
                      </h3>
                      <div className="space-y-2">
                        {detailShipment.incidents.map((inc: ShipmentIncident, i: number) => (
                          <div key={i} className="py-2 px-3 bg-amber-50 border border-amber-100 rounded text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{formatDate(inc.date)}</span>
                              <span className="text-xs text-muted-foreground">Por: {inc.reported_by}</span>
                            </div>
                            <p className="text-muted-foreground">{inc.description}</p>
                            {inc.resolution && (
                              <p className="text-green-700 text-xs mt-1">Resolucion: {inc.resolution}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Notes */}
                {detailShipment.notes && (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold text-[#1E3A5F] mb-2">Notas</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{detailShipment.notes}</p>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Status Timeline */}
                <div>
                  <h3 className="text-sm font-semibold text-[#1E3A5F] mb-4">Historial de Estados</h3>
                  {detailShipment.status_history && detailShipment.status_history.length > 0 ? (
                    <div className="relative pl-6">
                      {/* Vertical line */}
                      <div className="absolute left-[9px] top-2 bottom-2 w-px bg-slate-200" />
                      <div className="space-y-4">
                        {[...detailShipment.status_history].reverse().map((entry: StatusHistoryEntry, i: number) => (
                          <div key={i} className="relative flex gap-3">
                            {/* Dot */}
                            <div
                              className={cn(
                                "absolute -left-6 top-1.5 h-[14px] w-[14px] rounded-full border-2 border-white shadow-sm",
                                STATUS_DOT_COLORS[entry.status as ShipmentStatus] || "bg-slate-400"
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs",
                                    STATUS_COLORS[entry.status as ShipmentStatus] || STATUS_COLORS.reservado
                                  )}
                                >
                                  {SHIPMENT_STATUS_LABELS[entry.status] || entry.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {entry.date
                                    ? format(new Date(entry.date), "dd/MM/yyyy HH:mm", { locale: es })
                                    : "—"}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Por: {entry.user_name || "Sistema"}
                                {entry.notes ? ` — ${entry.notes}` : ""}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin historial de estados</p>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* =========== STATUS CHANGE DIALOG =========== */}
      <Dialog open={statusChangeOpen} onOpenChange={setStatusChangeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1E3A5F]">Cambiar Estado</DialogTitle>
          </DialogHeader>
          {statusChangeShipment && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Embarque: <span className="font-medium text-foreground">{statusChangeShipment.shipment_number}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Estado actual: {getStatusBadge(statusChangeShipment.status)}
              </div>
              <div className="space-y-2">
                <Label>Nuevo estado</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {SHIPMENT_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={statusChangeNotes}
                  onChange={(e) => setStatusChangeNotes(e.target.value)}
                  placeholder="Razon del cambio de estado..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStatusChangeOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleStatusChange}
                  disabled={submitting || newStatus === statusChangeShipment.status}
                  className="bg-[#1E3A5F] hover:bg-[#152d4a]"
                >
                  {submitting ? "Guardando..." : "Cambiar Estado"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* =========== CREATE / EDIT SHEET =========== */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle className="text-[#1E3A5F]">
              {editingShipment ? "Editar Embarque" : "Nuevo Embarque"}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 px-6 py-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-6">
                {/* SECTION: Info General */}
                <div>
                  <h3 className="text-sm font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2">
                    <Ship className="h-4 w-4" />
                    Informacion General
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Client */}
                    <FormField
                      control={form.control}
                      name="client_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cliente *</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar cliente" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clients.map((c) => (
                                <SelectItem key={c.id} value={c.id!}>
                                  {c.company_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Commercial */}
                    <FormField
                      control={form.control}
                      name="commercial_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Comercial *</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
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

                    {/* Vessel */}
                    <FormField
                      control={form.control}
                      name="vessel_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Motonave *</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(val) => {
                              if (val === "__new__") {
                                setNewVesselDialogOpen(true);
                              } else {
                                field.onChange(val);
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar motonave" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {vessels.map((v) => (
                                <SelectItem key={v.id} value={v.id!}>
                                  {v.vessel_name}
                                  {v.shipping_line ? ` (${v.shipping_line})` : ""}
                                </SelectItem>
                              ))}
                              <SelectItem value="__new__">
                                <span className="flex items-center gap-1.5 text-[#1E3A5F]">
                                  <Plus className="h-3.5 w-3.5" />
                                  Agregar motonave
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Invoice (optional) */}
                    <FormField
                      control={form.control}
                      name="invoice_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Factura (opcional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              placeholder="ID de factura"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* SECTION: Ruta */}
                <div>
                  <h3 className="text-sm font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Ruta
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="port_of_loading"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Puerto de Carga *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ej: Shanghai, China" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="port_of_discharge"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Puerto de Descarga *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ej: Buenaventura, Colombia" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="port_of_final_destination"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Destino Final</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="Destino final (opcional)" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="incoterm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Incoterm</FormLabel>
                          <Select value={field.value || ""} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
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
                  </div>
                </div>

                <Separator />

                {/* SECTION: Fechas */}
                <div>
                  <h3 className="text-sm font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Fechas
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="etd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ETD (Salida Estimada) *</FormLabel>
                          <FormControl>
                            <DatePickerField
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Seleccionar ETD"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="atd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ATD (Salida Real)</FormLabel>
                          <FormControl>
                            <DatePickerField
                              value={field.value || ""}
                              onChange={field.onChange}
                              placeholder="Seleccionar ATD"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="eta"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ETA (Llegada Estimada) *</FormLabel>
                          <FormControl>
                            <DatePickerField
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Seleccionar ETA"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ata"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ATA (Llegada Real)</FormLabel>
                          <FormControl>
                            <DatePickerField
                              value={field.value || ""}
                              onChange={field.onChange}
                              placeholder="Seleccionar ATA"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="eta_final_destination"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ETA Destino Final</FormLabel>
                          <FormControl>
                            <DatePickerField
                              value={field.value || ""}
                              onChange={field.onChange}
                              placeholder="Seleccionar fecha"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customs_clearance_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nacionalizacion</FormLabel>
                          <FormControl>
                            <DatePickerField
                              value={field.value || ""}
                              onChange={field.onChange}
                              placeholder="Seleccionar fecha"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="delivery_date"
                      render={({ field }) => (
                        <FormItem className="col-span-2 sm:col-span-1">
                          <FormLabel>Fecha de Entrega</FormLabel>
                          <FormControl>
                            <DatePickerField
                              value={field.value || ""}
                              onChange={field.onChange}
                              placeholder="Seleccionar fecha"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* SECTION: Contenedores */}
                <div>
                  <h3 className="text-sm font-semibold text-[#1E3A5F] mb-3">Contenedores</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="container_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Contenedor</FormLabel>
                          <Select value={field.value || ""} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CONTAINER_TYPES.map((ct) => (
                                <SelectItem key={ct} value={ct}>
                                  {ct}
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
                      name="container_quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cantidad</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                              placeholder="0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="container_numbers_text"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Numeros de Contenedor</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value || ""}
                              placeholder="MSKU1234567, TCLU7654321 (separados por coma)"
                              rows={2}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="seal_numbers_text"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Numeros de Sello</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value || ""}
                              placeholder="Sellos separados por coma"
                              rows={2}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* SECTION: Carga */}
                <div>
                  <h3 className="text-sm font-semibold text-[#1E3A5F] mb-3">Carga</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bl_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Numero BL</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="Bill of Lading" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="booking_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Numero Booking</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="Booking Number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cargo_description"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Descripcion de Carga</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value || ""}
                              placeholder="Descripcion de la mercancia..."
                              rows={2}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cargo_weight_tons"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Peso (Toneladas)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                              placeholder="0.00"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cargo_volume_m3"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Volumen (m3)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                              placeholder="0.00"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* SECTION: Costos */}
                <div>
                  <h3 className="text-sm font-semibold text-[#1E3A5F] mb-3">Costos</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="freight_cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Flete</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                              placeholder="0.00"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="freight_currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Moneda</FormLabel>
                          <Select value={field.value || "USD"} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CURRENCIES.map((cur) => (
                                <SelectItem key={cur} value={cur}>
                                  {cur}
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
                      name="insurance_cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Seguro</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                              placeholder="0.00"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* SECTION: Tracking */}
                <div>
                  <h3 className="text-sm font-semibold text-[#1E3A5F] mb-3">Tracking</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="tracking_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL de Tracking</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="https://..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="current_location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ubicacion Actual</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="Ubicacion actual del embarque" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* SECTION: Notas */}
                <div>
                  <h3 className="text-sm font-semibold text-[#1E3A5F] mb-3">Notas</h3>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value || ""}
                            placeholder="Notas adicionales sobre el embarque..."
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-[#1E3A5F] hover:bg-[#152d4a]"
                    style={{ background: T.gradientPrimary, border: "none", boxShadow: T.shadowMd }}
                  >
                    {submitting
                      ? "Guardando..."
                      : editingShipment
                      ? "Actualizar Embarque"
                      : "Crear Embarque"}
                  </Button>
                </div>
              </form>
            </Form>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* =========== NEW VESSEL DIALOG =========== */}
      <Dialog open={newVesselDialogOpen} onOpenChange={setNewVesselDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1E3A5F]">Agregar Motonave</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de la Motonave *</Label>
              <Input
                value={newVesselName}
                onChange={(e) => setNewVesselName(e.target.value)}
                placeholder="Ej: MSC Gulsun"
              />
            </div>
            <div className="space-y-2">
              <Label>Naviera (opcional)</Label>
              <Input
                value={newVesselShippingLine}
                onChange={(e) => setNewVesselShippingLine(e.target.value)}
                placeholder="Ej: MSC, Maersk, Evergreen"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewVesselDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateVessel}
                disabled={creatingVessel || !newVesselName.trim()}
                className="bg-[#1E3A5F] hover:bg-[#152d4a]"
                style={{ background: T.gradientPrimary, border: "none", boxShadow: T.shadowMd }}
              >
                {creatingVessel ? "Creando..." : "Crear Motonave"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========== VESSEL DETAIL DIALOG (Glassmorphism) =========== */}
      {vesselDetailOpen && vesselDetailData && (() => {
        const vd = vesselDetailData;
        const vdContracts = vd.contracts;
        const vdPrimaryStatus = getVesselPrimaryStatus(vdContracts);
        const vdEta = getEarliestEta(vdContracts);
        const vdShippingCo = vdContracts.find((c) => c.shipping_company)?.shipping_company;
        const vdTotalTons = vdContracts.reduce((s, c) => s + (c.tons_shipped ?? c.tons_agreed ?? 0), 0);
        const vdTotalPending = vdContracts.reduce((s, c) => s + (c.pending_client_amount ?? 0), 0);
        const vdBlLiberated = vdContracts.filter((c) => c.bl_released === "SI").length;
        const vdStatusColor = vdPrimaryStatus === "EN TRÁNSITO" ? T.blue
          : vdPrimaryStatus === "EN PRODUCCIÓN" ? T.warning
          : vdPrimaryStatus === "ENTREGADO AL CLIENTE" ? T.success
          : T.inkLight;

        return createPortal(
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            {/* Overlay */}
            <div
              style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(12px)", transition: "opacity 0.3s" }}
              onClick={() => setVesselDetailOpen(false)}
            />

            {/* Row: motonave + (divisor + contrato) en split view */}
            <div
              ref={splitRowRef}
              style={{
                position: "relative", width: "100%",
                maxWidth: splitContract ? "none" : 1080,
                height: splitContract ? "90vh" : undefined,
                display: "flex", alignItems: "stretch", justifyContent: "center",
              }}
            >

            {/* Card motonave */}
            <div style={{
              position: "relative",
              width: splitContract ? `${splitRatio}%` : "100%",
              minWidth: 0, maxHeight: "90vh",
              display: "flex", flexDirection: "column", borderRadius: 22,
              border: `1px solid ${T.borderLight}`, background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(24px)", boxShadow: "0 32px 64px -12px rgba(11,83,148,0.18)",
              animation: "sFadeUp 0.35s ease both", overflow: "hidden",
            }}>
              {/* Accent bar */}
              <div style={{ height: 3, background: vdStatusColor }} />

              {/* Header */}
              <div style={{ padding: "20px 28px 16px", borderBottom: `1px solid ${T.borderLight}`, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                      background: T.accentLight, display: "flex", alignItems: "center", justifyContent: "center",
                      color: T.accent,
                    }}>
                      <Ship style={{ width: 22, height: 22 }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h2 style={{ fontSize: 18, fontWeight: 800, color: T.accent, letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vd.name}</h2>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                        {vdShippingCo && (
                          <span style={{ fontSize: 12, color: T.inkLight }}>{vdShippingCo}</span>
                        )}
                        {vdEta && vdPrimaryStatus !== "ENTREGADO AL CLIENTE" && (() => {
                          const vdDaysLeft = differenceInCalendarDays(parseISO(vdEta), new Date());
                          const vdIsOverdue = vdDaysLeft < 0;
                          const vdIsImminent = vdDaysLeft >= 0 && vdDaysLeft <= 3;
                          const vdDaysLabel = vdIsOverdue
                            ? `${Math.abs(vdDaysLeft)}d retraso`
                            : vdDaysLeft === 0 ? "Hoy" : vdDaysLeft === 1 ? "Mañana" : `${vdDaysLeft}d`;
                          return (
                            <span style={{
                              fontSize: 11, fontWeight: 700,
                              color: vdIsOverdue ? T.danger : vdIsImminent ? T.warning : T.blue,
                              background: vdIsOverdue ? T.dangerBg : vdIsImminent ? T.warningBg : T.blueBg,
                              padding: "3px 10px", borderRadius: 6,
                              display: "flex", alignItems: "center", gap: 5,
                            }}>
                              <Anchor style={{ width: 13, height: 13 }} />
                              ETA {formatDate(vdEta)}
                              <span style={{ opacity: 0.7, fontSize: 10 }}>({vdDaysLabel})</span>
                            </span>
                          );
                        })()}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-semibold gap-1.5 rounded-lg px-2.5 py-1",
                            CONTRACT_STATUS_COLORS[vdPrimaryStatus] || "bg-gray-100 text-gray-800 border-gray-200"
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full inline-block", CONTRACT_STATUS_DOT_COLORS[vdPrimaryStatus] || "bg-slate-400")} />
                          {CONTRACT_STATUS_LABELS[vdPrimaryStatus] || vdPrimaryStatus}
                        </Badge>
                        {/* Tracking links in detail dialog */}
                        {(() => {
                          const refContract = vdContracts.find((cc) => cc.shipping_company || cc.bl_number || cc.vessel_name);
                          if (!refContract) return null;

                          // Container line → direct redirect to carrier tracking page
                          const directUrl = getDirectContainerTrackingUrl({
                            shipping_company: refContract.shipping_company,
                            bl_number: refContract.bl_number,
                            shipment_type: refContract.shipment_type,
                          });

                          if (directUrl) {
                            return (
                              <button
                                onClick={() => {
                                  const blText = refContract.bl_number ?? "";
                                  if (blText) {
                                    navigator.clipboard.writeText(blText).then(() => {
                                      toast.success(`BL copiado: ${blText}`);
                                    });
                                  }
                                  window.open(directUrl, "_blank", "noopener,noreferrer");
                                }}
                                style={{
                                  display: "flex", alignItems: "center", gap: 4,
                                  fontSize: 10, fontWeight: 600, color: T.teal,
                                  background: T.tealBg, padding: "3px 10px", borderRadius: 6,
                                  border: "none", cursor: "pointer",
                                }}
                              >
                                <Globe style={{ width: 12, height: 12 }} />
                                Tracking
                              </button>
                            );
                          }

                          // Motonave habitual → direct redirect to MarineTraffic
                          const vesselUrl = getDirectVesselTrackingUrl(refContract.vessel_name ?? vd.name);
                          if (!vesselUrl) return null;
                          return (
                            <button
                              onClick={() => {
                                const textToCopy = refContract.vessel_name ?? vd.name;
                                if (textToCopy) {
                                  navigator.clipboard.writeText(textToCopy).then(() => {
                                    toast.success(`Motonave copiada: ${textToCopy}`);
                                  });
                                }
                                window.open(vesselUrl, "_blank", "noopener,noreferrer");
                              }}
                              style={{
                                display: "flex", alignItems: "center", gap: 4,
                                fontSize: 10, fontWeight: 600, color: T.teal,
                                background: T.tealBg, padding: "3px 10px", borderRadius: 6,
                                border: "none", cursor: "pointer",
                              }}
                            >
                              <Globe style={{ width: 12, height: 12 }} />
                              Tracking
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setVesselDetailOpen(false)}
                    style={{
                      width: 32, height: 32, borderRadius: 10, border: "none",
                      background: T.surfaceAlt, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: T.inkLight, transition: "all 0.2s ease", flexShrink: 0,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = T.dangerBg; e.currentTarget.style.color = T.danger; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = T.surfaceAlt; e.currentTarget.style.color = T.inkLight; }}
                  >
                    <X style={{ width: 16, height: 16 }} />
                  </button>
                </div>

                {/* KPI summary row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 16 }}>
                  {[
                    { label: "Contratos", value: String(vdContracts.length), color: T.accent, bg: T.accentLight },
                    { label: "Toneladas", value: `${formatNumber(vdTotalTons)} t`, color: T.violet, bg: T.violetBg },
                    { label: "Saldo Pendiente", value: formatCurrency(vdTotalPending), color: vdTotalPending > 0 ? T.danger : T.success, bg: vdTotalPending > 0 ? T.dangerBg : T.successBg },
                    { label: "BL Liberados", value: `${vdBlLiberated}/${vdContracts.length}`, color: T.success, bg: T.successBg },
                  ].map((k) => (
                    <div key={k.label} style={{ borderRadius: T.radiusSm, border: `1px solid ${T.borderLight}`, background: k.bg, padding: "8px 12px" }}>
                      <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: T.inkLight, marginBottom: 2 }}>{k.label}</p>
                      <p style={{ fontSize: 18, fontWeight: 800, color: k.color, fontFamily: "var(--font-jetbrains-mono), monospace", letterSpacing: "-0.02em" }}>{k.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Vessel-level date editor ─────────────────────── */}
              <div style={{ padding: "0 28px", flexShrink: 0 }}>
                {!vesselDateEditing ? (
                  <button
                    onClick={() => startVesselDateEdit(vdContracts)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, width: "100%",
                      padding: "10px 14px", marginTop: 12, borderRadius: T.radiusSm,
                      border: `1px dashed ${T.borderLight}`, background: "transparent",
                      cursor: "pointer", transition: "all 0.2s ease",
                      fontSize: 12, fontWeight: 600, color: T.accent,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = T.accentLight; e.currentTarget.style.borderColor = T.accent; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = T.borderLight; }}
                  >
                    <Pencil style={{ width: 14, height: 14 }} />
                    Actualizar embarque ({vdContracts.length} contrato{vdContracts.length !== 1 ? "s" : ""})
                  </button>
                ) : (
                  <div style={{
                    marginTop: 12, padding: "14px 16px", borderRadius: T.radiusSm,
                    border: `1px solid ${T.accent}`, background: T.accentLight,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Actualizar embarque — {vd.name}
                      </p>
                      <span style={{ fontSize: 10, color: T.inkMuted, fontWeight: 500 }}>
                        Se aplicará a {vdContracts.length} contrato{vdContracts.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 600, color: T.inkMuted, display: "block", marginBottom: 4 }}>ETD</label>
                        <input
                          type="date"
                          value={vesselDateEtd}
                          onChange={(e) => setVesselDateEtd(e.target.value)}
                          style={{
                            width: "100%", padding: "6px 8px", fontSize: 12, borderRadius: 6,
                            border: `1px solid ${T.borderLight}`, background: "white",
                            color: T.ink, outline: "none",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 600, color: T.inkMuted, display: "block", marginBottom: 4 }}>ETA Inicial</label>
                        <input
                          type="date"
                          value={vesselDateEtaInitial}
                          onChange={(e) => setVesselDateEtaInitial(e.target.value)}
                          style={{
                            width: "100%", padding: "6px 8px", fontSize: 12, borderRadius: 6,
                            border: `1px solid ${T.borderLight}`, background: "white",
                            color: T.ink, outline: "none",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 600, color: T.inkMuted, display: "block", marginBottom: 4 }}>ETA Final</label>
                        <input
                          type="date"
                          value={vesselDateEtaFinal}
                          onChange={(e) => setVesselDateEtaFinal(e.target.value)}
                          style={{
                            width: "100%", padding: "6px 8px", fontSize: 12, borderRadius: 6,
                            border: `1px solid ${T.borderLight}`, background: "white",
                            color: T.ink, outline: "none",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 600, color: T.inkMuted, display: "block", marginBottom: 4 }}>Estado</label>
                        <select
                          value={vesselDateStatus}
                          onChange={(e) => setVesselDateStatus(e.target.value)}
                          style={{
                            width: "100%", padding: "6px 8px", fontSize: 12, borderRadius: 6,
                            border: `1px solid ${T.borderLight}`, background: "white",
                            color: T.ink, outline: "none", cursor: "pointer",
                          }}
                        >
                          <option value="">— Sin cambiar —</option>
                          <option value="EN PRODUCCIÓN">En Producción</option>
                          <option value="EN TRÁNSITO">En Tránsito</option>
                          <option value="ENTREGADO AL CLIENTE">Entregado al Cliente</option>
                          <option value="PENDIENTE ANTICIPO">Pendiente Anticipo</option>
                          <option value="ANULADO">Anulado</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
                      <button
                        onClick={cancelVesselDateEdit}
                        disabled={vesselDateSaving}
                        style={{
                          padding: "5px 14px", fontSize: 11, fontWeight: 600, borderRadius: 6,
                          border: `1px solid ${T.borderLight}`, background: "white",
                          color: T.inkMuted, cursor: "pointer",
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => saveVesselDates(vd.name)}
                        disabled={vesselDateSaving}
                        style={{
                          padding: "5px 14px", fontSize: 11, fontWeight: 600, borderRadius: 6,
                          border: "none", background: T.accent, color: "white",
                          cursor: vesselDateSaving ? "wait" : "pointer",
                          display: "flex", alignItems: "center", gap: 4,
                          opacity: vesselDateSaving ? 0.7 : 1,
                        }}
                      >
                        <CheckCircle2 style={{ width: 12, height: 12 }} />
                        {vesselDateSaving ? "Guardando..." : "Guardar cambios"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Contracts scrollable area */}
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                <div style={{ padding: "16px 28px", display: "flex", flexDirection: "column", gap: 12 }}>
                  {vdContracts.map((c) => (
                    <div key={c.id} style={{ borderRadius: T.radiusMd, border: `1px solid ${T.borderLight}`, background: T.surfaceAlt, overflow: "hidden", transition: "background 0.2s ease" }}>
                      {/* Contract header */}
                      <div style={{ padding: "12px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flexWrap: "wrap" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSplitContract(c);
                            }}
                            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 800, color: T.accent, fontFamily: "var(--font-jetbrains-mono), monospace", background: "none", border: "none", padding: 0, cursor: "pointer", transition: "opacity 0.15s" }}
                            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.7"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                            title="Ver contrato al lado (panel dividido)"
                          >
                            {c.client_contract || "S/C"}
                            <ExternalLink style={{ width: 11, height: 11, flexShrink: 0 }} />
                          </button>
                          {c.china_contract && (
                            <>
                              <span style={{ color: T.inkGhost }}>|</span>
                              <span style={{ fontSize: 12, color: T.inkMuted, fontWeight: 500 }}>{c.china_contract}</span>
                            </>
                          )}
                          <span style={{ color: T.inkGhost }}>—</span>
                          <span style={{ fontSize: 12, color: T.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.client_name}</span>
                          {c.country && COUNTRY_FLAGS[c.country.toUpperCase()] && (
                            <span style={{ fontSize: 13 }}>{COUNTRY_FLAGS[c.country.toUpperCase()]}</span>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-semibold gap-1.5 rounded-lg px-2.5 py-1 shrink-0",
                            CONTRACT_STATUS_COLORS[c.status || ""] || "bg-gray-100 text-gray-800 border-gray-200"
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full inline-block", CONTRACT_STATUS_DOT_COLORS[c.status || ""] || "bg-gray-400")} />
                          {CONTRACT_STATUS_LABELS[c.status || ""] || c.status || "—"}
                        </Badge>
                      </div>

                      {/* Contract details grid — auto-fit para que las columnas
                          se apilen en vez de desbordarse cuando el panel es angosto */}
                      <div style={{ padding: "4px 16px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "14px 24px" }}>
                        {/* Col 1: General */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                          <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: T.inkLight, borderBottom: `1px solid ${T.borderLight}`, paddingBottom: 4 }}>General</p>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Comercial</span>
                              <span className="font-medium text-slate-700 text-right break-words min-w-0">{c.commercial_name || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Incoterm</span>
                              <span className="font-medium text-slate-700">{c.incoterm || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Producto</span>
                              <span className="font-medium text-slate-700 text-right max-w-[60%] truncate" title={c.detail || ""}>{c.detail || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Tipo Embarque</span>
                              <span className="font-medium text-slate-700">{c.shipment_type || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Puerto Arribo</span>
                              <span className="font-medium text-slate-700 text-right break-words min-w-0">{c.arrival_port || "—"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Col 2: Tons & Dates */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                          <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: T.inkLight, borderBottom: `1px solid ${T.borderLight}`, paddingBottom: 4 }}>Toneladas & Fechas</p>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Tons. Acordadas</span>
                              <span className="font-medium text-slate-700 tabular-nums">{formatNumber(c.tons_agreed ?? 0)} t</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Tons. Embarcadas</span>
                              <span className="font-medium text-slate-700 tabular-nums">{formatNumber(c.tons_shipped ?? 0)} t</span>
                            </div>
                            {c.tons_difference != null && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Diferencia</span>
                                <span className={cn("font-medium tabular-nums", (c.tons_difference ?? 0) < 0 ? "text-rose-600" : "text-emerald-600")}>{formatNumber(c.tons_difference)} t</span>
                              </div>
                            )}
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">ETD</span>
                              {editingDateContractId === c.id && editingDateField === "etd" ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <input
                                    type="date"
                                    value={editingDateValue}
                                    onChange={(e) => setEditingDateValue(e.target.value)}
                                    style={{
                                      fontSize: 11, padding: "2px 6px", borderRadius: T.radiusXs,
                                      border: `1px solid ${T.accent}`, outline: "none",
                                      fontFamily: "var(--font-jetbrains-mono), monospace",
                                      width: 120,
                                    }}
                                    autoFocus
                                  />
                                  <button
                                    onClick={saveDateEdit}
                                    disabled={savingDate}
                                    style={{ color: T.success, border: "none", background: "none", cursor: "pointer", padding: 2, display: "flex" }}
                                  >
                                    <CheckCircle2 style={{ width: 14, height: 14 }} />
                                  </button>
                                  <button
                                    onClick={cancelDateEdit}
                                    style={{ color: T.danger, border: "none", background: "none", cursor: "pointer", padding: 2, display: "flex" }}
                                  >
                                    <X style={{ width: 14, height: 14 }} />
                                  </button>
                                </div>
                              ) : (
                                <span
                                  className="font-medium text-slate-700 group/etd"
                                  style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
                                  onClick={() => startDateEdit(c.id!, "etd", c.etd)}
                                >
                                  {c.etd ? formatDate(c.etd) : "\u2014"}
                                  <Pencil style={{ width: 10, height: 10, color: T.inkGhost, opacity: 0.5 }} />
                                </span>
                              )}
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">ETA Inicial</span>
                              <span className="font-medium text-slate-700">{c.eta_initial ? formatDate(c.eta_initial) : "\u2014"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">ETA Final</span>
                              {editingDateContractId === c.id && editingDateField === "eta_final" ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <input
                                    type="date"
                                    value={editingDateValue}
                                    onChange={(e) => setEditingDateValue(e.target.value)}
                                    style={{
                                      fontSize: 11, padding: "2px 6px", borderRadius: T.radiusXs,
                                      border: `1px solid ${T.accent}`, outline: "none",
                                      fontFamily: "var(--font-jetbrains-mono), monospace",
                                      width: 120,
                                    }}
                                    autoFocus
                                  />
                                  <button
                                    onClick={saveDateEdit}
                                    disabled={savingDate}
                                    style={{ color: T.success, border: "none", background: "none", cursor: "pointer", padding: 2, display: "flex" }}
                                  >
                                    <CheckCircle2 style={{ width: 14, height: 14 }} />
                                  </button>
                                  <button
                                    onClick={cancelDateEdit}
                                    style={{ color: T.danger, border: "none", background: "none", cursor: "pointer", padding: 2, display: "flex" }}
                                  >
                                    <X style={{ width: 14, height: 14 }} />
                                  </button>
                                </div>
                              ) : (
                                <span
                                  className="font-bold text-[#1E3A5F]"
                                  style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
                                  onClick={() => startDateEdit(c.id!, "eta_final", c.eta_final)}
                                >
                                  {c.eta_final ? formatDate(c.eta_final) : "\u2014"}
                                  <Pencil style={{ width: 10, height: 10, color: T.inkGhost, opacity: 0.5 }} />
                                </span>
                              )}
                            </div>
                            {c.days_difference != null && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Dif. Días</span>
                                <span className={cn("font-medium tabular-nums", (c.days_difference ?? 0) > 0 ? "text-rose-600" : "text-emerald-600")}>{c.days_difference} días</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Col 3: Payments & Docs */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                          <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: T.inkLight, borderBottom: `1px solid ${T.borderLight}`, paddingBottom: 4 }}>Pagos & Documentos</p>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">Anticipo</span>
                              {c.advance_paid === "SI" ? (
                                <span className="flex items-center gap-1 text-emerald-600 font-medium"><CheckCircle2 className="h-3 w-3" />Pagado</span>
                              ) : (
                                <span className="flex items-center gap-1 text-amber-600 font-medium"><Clock className="h-3 w-3" />Pendiente</span>
                              )}
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">Saldo</span>
                              {c.balance_paid === "SI" ? (
                                <span className="flex items-center gap-1 text-emerald-600 font-medium"><CheckCircle2 className="h-3 w-3" />Pagado</span>
                              ) : (
                                <span className="flex items-center gap-1 text-amber-600 font-medium"><Clock className="h-3 w-3" />Pendiente</span>
                              )}
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">Monto Pendiente</span>
                              <span className={cn("font-bold tabular-nums", (c.pending_client_amount ?? 0) > 0 ? "text-rose-600" : "text-emerald-600")}>
                                {formatCurrency(c.pending_client_amount ?? 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">BL Liberado</span>
                              {c.bl_released === "SI" ? (
                                <span className="flex items-center gap-1 text-emerald-600 font-medium"><CheckCircle2 className="h-3 w-3" />Liberado</span>
                              ) : (
                                <span className="flex items-center gap-1 text-red-500 font-medium"><XCircle className="h-3 w-3" />Pendiente</span>
                              )}
                            </div>
                            {c.bl_number && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">N° BL</span>
                                <span className="font-medium text-slate-700">{c.bl_number}</span>
                              </div>
                            )}
                            <div className="flex justify-between gap-3">
                              <span className="text-slate-400 shrink-0">Docs. Enviados</span>
                              <span className="font-medium text-slate-700 text-right break-words min-w-0">{c.documents_sent || "—"}</span>
                            </div>
                            <div className="flex justify-between gap-3">
                              <span className="text-slate-400 shrink-0">Docs. Pendientes</span>
                              <span className="font-medium text-slate-700 text-right break-words min-w-0">{c.documents_pending || "—"}</span>
                            </div>
                            <div className="flex justify-between gap-3">
                              <span className="text-slate-400 shrink-0">Docs. Físicos</span>
                              <span className="font-medium text-slate-700 text-right break-words min-w-0">{c.physical_docs_sent || "—"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Divisor arrastrable + panel de contrato (split view) */}
            {splitContract && (
              <>
                <div
                  onPointerDown={(e) => {
                    splitDragging.current = true;
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    if (!splitDragging.current || !splitRowRef.current) return;
                    const rect = splitRowRef.current.getBoundingClientRect();
                    const pct = ((e.clientX - rect.left) / rect.width) * 100;
                    setSplitRatio(Math.min(75, Math.max(25, pct)));
                  }}
                  onPointerUp={(e) => {
                    splitDragging.current = false;
                    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                  }}
                  title="Arrastra para ajustar el tamaño de los paneles"
                  style={{
                    width: 16, flexShrink: 0, cursor: "col-resize",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    touchAction: "none", position: "relative", zIndex: 2,
                  }}
                >
                  <div style={{
                    width: 5, height: 64, borderRadius: 99,
                    background: "rgba(255,255,255,0.85)",
                    boxShadow: "0 1px 6px rgba(11,83,148,0.35)",
                  }} />
                </div>
                <div style={{ flex: 1, minWidth: 0, height: "100%" }}>
                  <ContractSplitPanel contract={splitContract} onClose={() => setSplitContract(null)} />
                </div>
              </>
            )}

            </div>
          </div>,
          document.body
        );
      })()}

    </div>
    </div>
  );
}
