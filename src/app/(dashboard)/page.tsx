"use client";

import { useEffect, useState, useCallback, useRef, useMemo, memo } from "react";
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";
import {
  AreaChart, Area, XAxis, Tooltip as ReTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { toast } from "sonner";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

// ─── DESIGN TOKENS ───────────────────────────────────────────
const T = {
  bg: "#F5F3EF",
  surface: "#FFFFFF",
  surfaceHover: "#FCFBF9",
  surfaceAlt: "#FAF9F7",
  ink: "#18191D",
  inkSoft: "#3D4049",
  inkMuted: "#6B7080",
  inkLight: "#9CA3B4",
  inkGhost: "#C5CAD5",
  accent: "#0B5394",
  accentLight: "#E8F0FE",
  accentDark: "#083D6E",
  accentVivid: "#1A6FD1",
  success: "#0D9F6E",
  successSoft: "#D1FAE5",
  successBg: "#ECFDF3",
  warning: "#DC8B0B",
  warningBg: "#FFF8EB",
  warningSoft: "#FEF3C7",
  danger: "#E63946",
  dangerBg: "#FFF1F2",
  dangerSoft: "#FECDD3",
  blue: "#3B82F6",
  blueBg: "#EFF6FF",
  violet: "#7C5CFC",
  violetBg: "#F3F0FF",
  teal: "#0EA5A5",
  tealBg: "#EDFCFC",
  orange: "#F97316",
  orangeBg: "#FFF7ED",
  border: "#E8E6E1",
  borderLight: "#F0EDE8",
  borderFocus: "#0B539444",
  shadow: "0 1px 2px rgba(26,29,35,0.03), 0 2px 8px rgba(26,29,35,0.04)",
  shadowMd: "0 2px 4px rgba(26,29,35,0.04), 0 8px 20px rgba(26,29,35,0.05)",
  shadowLg: "0 4px 8px rgba(26,29,35,0.04), 0 16px 40px rgba(26,29,35,0.07)",
  radius: "18px",
  radiusMd: "14px",
  radiusSm: "10px",
  radiusXs: "6px",
};

// ─── SVG ICONS ───────────────────────────────────────────────
const I = {
  contracts: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>,
  factory: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M2 20h20"/><path d="M5 20V8l5 4V8l5 4V4h3a2 2 0 0 1 2 2v14"/></svg>,
  ship: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.5 0 2.5 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.4 11.4 0 0 0 21 14l-9-4-9 4c0 2.1.56 4.15 1.62 6"/><path d="M12 10V2l-3 3"/></svg>,
  clock: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  check: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  dollar: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  alert: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  zap: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  calendar: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  chevR: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>,
  weight: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="5" r="3"/><path d="M6.5 8a2 2 0 0 0-1.9 1.4L2 18h20l-2.6-8.6A2 2 0 0 0 17.5 8Z"/></svg>,
};

// ─── TYPES ───────────────────────────────────────────────────
interface MetricsData {
  kpis: {
    contracts_activos: number;
    en_produccion: number;
    en_transito: number;
    pendiente_anticipo: number;
    entregados: number;
    anulados: number;
    total_tons_agreed: number;
    total_tons_shipped: number;
    total_china_value: number;
    total_customer_value: number;
    approved_invoices: number;
    pending_invoices: number;
  };
  commercial_ranking: {
    name: string;
    total: number;
    en_produccion: number;
    en_transito: number;
    pendiente: number;
    entregados: number;
    tons_agreed: number;
    tons_shipped: number;
  }[];
  upcoming_etas: {
    id: string;
    client_name: string;
    client_contract: string | null;
    commercial_name: string;
    vessel_name: string | null;
    eta_final: string | null;
    bl_number: string | null;
    country: string | null;
    status: string;
  }[];
  pending_china_invoices: {
    id: string;
    invoice_date: string | null;
    customer_name: string | null;
    customer_contract: string | null;
    china_invoice_number: string | null;
    china_invoice_value: number | null;
    customer_invoice_value: number | null;
    approved: boolean;
  }[];
  pending_reminders: {
    id: string;
    title: string;
    description: string | null;
    type: string | null;
    priority: string;
    due_date: string;
    is_completed: boolean;
    related_entity_type: string | null;
  }[];
  recent_activity: {
    id: string;
    user_name: string | null;
    action: string;
    table_name: string;
    created_at: string;
  }[];
  filters: { role: string };
}

// ─── ANIMATED NUMBER ─────────────────────────────────────────
function AnimNum({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(0);

  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    if (diff === 0) return;
    const duration = 800;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(step);
      else ref.current = value;
    };
    requestAnimationFrame(step);
  }, [value]);

  return <>{prefix}{display.toLocaleString("es-CO")}{suffix}</>;
}

// ─── SPARKLINE ───────────────────────────────────────────────
function Spark({ color, data }: { color: string; data: number[] }) {
  const chartData = data.map((v, i) => ({ v, i }));
  return (
    <div style={{ width: 80, height: 32 }}>
      <ResponsiveContainer>
        <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.8} fill={`url(#sg-${color.replace("#", "")})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── CIRCULAR PROGRESS ───────────────────────────────────────
function CircularProgress({ pct, size = 72, stroke = 5, color = T.accent }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 100) / 100);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.borderLight} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease" }} />
    </svg>
  );
}

// ─── CARD WRAPPER ────────────────────────────────────────────
function Card({ children, delay = 0, style = {} }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: T.surface,
      borderRadius: T.radius,
      border: `1px solid ${T.border}`,
      boxShadow: T.shadow,
      animation: `dashFadeUp 0.45s ease ${delay}ms both`,
      transition: "box-shadow 0.2s ease, transform 0.2s ease",
      ...style,
    }}
    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = T.shadowMd; e.currentTarget.style.transform = "translateY(-2px)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = T.shadow; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {children}
    </div>
  );
}

// ─── PRIORITY TAG ────────────────────────────────────────────
function PriorityTag({ level }: { level: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    urgente: { bg: T.dangerSoft, color: T.danger, label: "Urgente" },
    alta: { bg: T.warningSoft, color: T.warning, label: "Alta" },
    media: { bg: T.blueBg, color: T.blue, label: "Media" },
    baja: { bg: T.borderLight, color: T.inkMuted, label: "Baja" },
  };
  const c = cfg[level] || cfg.baja;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

// ─── AGING BADGE ─────────────────────────────────────────────
function AgingBadge({ days }: { days: number }) {
  const color = days > 30 ? T.danger : days > 15 ? T.warning : T.inkMuted;
  const bg = days > 30 ? T.dangerBg : days > 15 ? T.warningBg : T.borderLight;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: bg, color, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}>
      {days}d
    </span>
  );
}

// ─── ACTION / TABLE LABELS ───────────────────────────────────
const ACTION_LABELS: Record<string, string> = {
  create: "creó",
  update: "actualizó",
  delete: "eliminó",
  status_change: "cambió estado de",
};
const TABLE_LABELS: Record<string, string> = {
  contracts: "contrato",
  contract_invoices: "factura china",
  quotations: "cotización",
  invoices: "factura",
  shipments: "embarque",
  clients: "cliente",
  reminders: "recordatorio",
  vessels: "motonave",
  packing_lists: "packing list",
};

const COUNTRY_FLAGS: Record<string, string> = {
  COLOMBIA: "\u{1F1E8}\u{1F1F4}",
  VENEZUELA: "\u{1F1FB}\u{1F1EA}",
  BOLIVIA: "\u{1F1E7}\u{1F1F4}",
  ECUADOR: "\u{1F1EA}\u{1F1E8}",
  PERU: "\u{1F1F5}\u{1F1EA}",
  "PERÚ": "\u{1F1F5}\u{1F1EA}",
};

// ─── SPARKLINE DATA GENERATORS ───────────────────────────────
function generateSparkData(value: number, count = 8): number[] {
  const base = Math.max(value * 0.6, 1);
  return Array.from({ length: count }, (_, i) => Math.round(base + (value - base) * (i / (count - 1)) + (Math.random() - 0.3) * base * 0.3));
}

// ─── METRICS CACHE ──────────────────────────────────────────
// In-memory cache to prevent re-fetching on navigation back to dashboard
let metricsCache: { data: MetricsData; timestamp: number } | null = null;
const CACHE_TTL = 30_000; // 30 seconds

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function DashboardPage() {
  const { profile, loading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState<MetricsData | null>(() => {
    // Initialize from cache if fresh enough
    if (metricsCache && Date.now() - metricsCache.timestamp < CACHE_TTL) {
      return metricsCache.data;
    }
    return null;
  });
  const [loading, setLoading] = useState(() => !metricsCache || Date.now() - metricsCache.timestamp >= CACHE_TTL);

  const fetchMetrics = useCallback(async () => {
    try {
      // If cache is fresh, skip fetch
      if (metricsCache && Date.now() - metricsCache.timestamp < CACHE_TTL) {
        setMetrics(metricsCache.data);
        setLoading(false);
        return;
      }
      setLoading(true);
      const res = await fetch("/api/metrics");
      if (!res.ok) throw new Error("Error al obtener métricas");
      const data: MetricsData = await res.json();
      metricsCache = { data, timestamp: Date.now() };
      setMetrics(data);
    } catch {
      toast.error("Error al cargar las métricas del dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) fetchMetrics();
  }, [authLoading, fetchMetrics]);

  // Memoize expensive computations
  const computedData = useMemo(() => {
    if (!metrics) return null;
    const { kpis } = metrics;

    const stateData = [
      { name: "En Producción", value: kpis.en_produccion, color: "#F59E0B" },
      { name: "En Tránsito", value: kpis.en_transito, color: T.blue },
      { name: "Pdte. Anticipo", value: kpis.pendiente_anticipo, color: "#94A3B8" },
      { name: "Entregados", value: kpis.entregados, color: T.success },
      { name: "Anulados", value: kpis.anulados, color: T.danger },
    ].filter((d) => d.value > 0);

    const stateTotal = stateData.reduce((s, d) => s + d.value, 0);
    const execPct = kpis.total_tons_agreed > 0 ? Math.round((kpis.total_tons_shipped / kpis.total_tons_agreed) * 100) : 0;
    const totalClientPending = metrics.pending_china_invoices.reduce((s, inv) => s + (inv.customer_invoice_value ?? 0), 0);
    const maxCommercialTotal = metrics.commercial_ranking.length > 0
      ? Math.max(...metrics.commercial_ranking.map((cr) => cr.total))
      : 0;

    const kpiCards = [
      { label: "Contratos Activos", value: kpis.contracts_activos, icon: I.contracts, color: T.accent, bg: T.accentLight, spark: generateSparkData(kpis.contracts_activos) },
      { label: "En Producción", value: kpis.en_produccion, icon: I.factory, color: "#F59E0B", bg: "#FFF8EB", spark: generateSparkData(kpis.en_produccion) },
      { label: "En Tránsito", value: kpis.en_transito, icon: I.ship, color: T.blue, bg: T.blueBg, spark: generateSparkData(kpis.en_transito) },
      { label: "Pdte. Anticipo", value: kpis.pendiente_anticipo, icon: I.clock, color: T.inkMuted, bg: T.borderLight, spark: generateSparkData(kpis.pendiente_anticipo) },
      { label: "Entregados", value: kpis.entregados, icon: I.check, color: T.success, bg: T.successBg, spark: generateSparkData(kpis.entregados) },
    ];

    return { stateData, stateTotal, execPct, totalClientPending, maxCommercialTotal, kpiCards, kpis };
  }, [metrics]);

  if (authLoading || loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 12 }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${T.borderLight}`, borderTopColor: T.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: 13, color: T.inkLight, fontWeight: 500 }}>Cargando dashboard...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!metrics || !computedData) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <span style={{ color: T.inkMuted }}>No se pudieron cargar los datos.</span>
      </div>
    );
  }

  const { stateData, stateTotal, execPct, totalClientPending, kpiCards, kpis } = computedData;
  const greeting = getGreeting();
  const firstName = profile?.full_name?.split(" ")[0] ?? "Usuario";

  // Commercial colors
  const commColors = [T.accent, T.teal, T.violet, T.orange, T.blue, T.success, T.warning, T.danger];

  return (
    <div style={{ fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif" }}>
      {/* ── HEADER ── */}
      <div style={{ marginBottom: 18, animation: "dashFadeUp 0.4s ease both" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: T.ink, letterSpacing: "-0.03em", lineHeight: 1.2 }}>
              {greeting}, <span style={{ color: T.accent }}>{firstName}</span>
            </h1>
            <p style={{ fontSize: 13, color: T.inkMuted, marginTop: 4, fontWeight: 500 }}>
              {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
        </div>
      </div>

      {/* ── KPI ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 16 }}>
        {kpiCards.map((kpi, i) => (
          <Card key={kpi.label} delay={100 + i * 60} style={{ padding: "20px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: kpi.bg, display: "flex", alignItems: "center", justifyContent: "center",
                color: kpi.color,
              }}>{kpi.icon}</div>
              <Spark color={kpi.color} data={kpi.spark} />
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, color: T.ink }}>
              <AnimNum value={kpi.value} />
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: T.inkMuted, marginTop: 5, letterSpacing: "0.01em" }}>
              {kpi.label}
            </div>
          </Card>
        ))}
      </div>

      {/* ── ROW 2: Tonnage + Execution + Command Center ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr", gap: 14, marginBottom: 16 }}>

        {/* Tonnage Card */}
        <Card delay={400} style={{ padding: "22px 24px" }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em", marginBottom: 18 }}>Tonelaje</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.inkMuted }}>Acordadas</span>
                <span style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", letterSpacing: "-0.02em" }}>
                  <AnimNum value={Math.round(kpis.total_tons_agreed)} />
                  <span style={{ fontSize: 11, color: T.inkLight, marginLeft: 3 }}>t</span>
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: T.borderLight, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${T.accent}, ${T.accentVivid})`, width: "100%", animation: "dashProgressFill 1s ease 500ms both" }} />
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.inkMuted }}>Embarcadas</span>
                <span style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", letterSpacing: "-0.02em" }}>
                  <AnimNum value={Math.round(kpis.total_tons_shipped)} />
                  <span style={{ fontSize: 11, color: T.inkLight, marginLeft: 3 }}>t</span>
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: T.borderLight, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${T.teal}, #34D399)`, width: `${execPct}%`, animation: "dashProgressFill 1s ease 600ms both" }} />
              </div>
            </div>
          </div>
        </Card>

        {/* Financial Summary */}
        <Card delay={450} style={{ padding: "22px 24px" }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em", marginBottom: 18 }}>Resumen Financiero</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Customer value */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.inkMuted }}>Facturación Cliente</span>
              <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", letterSpacing: "-0.02em", color: T.success }}>
                $<AnimNum value={Math.round(kpis.total_customer_value)} />
              </span>
            </div>
            {/* China cost */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.inkMuted }}>Costo China</span>
              <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", letterSpacing: "-0.02em", color: T.ink }}>
                $<AnimNum value={Math.round(kpis.total_china_value)} />
              </span>
            </div>
            {/* Margin */}
            <div style={{ borderTop: `1px solid ${T.borderLight}`, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.ink }}>Margen Bruto</span>
              <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", letterSpacing: "-0.02em", color: (kpis.total_customer_value - kpis.total_china_value) >= 0 ? T.success : T.danger }}>
                $<AnimNum value={Math.round(kpis.total_customer_value - kpis.total_china_value)} />
              </span>
            </div>
            {/* Invoices summary */}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <div style={{ flex: 1, padding: "8px 10px", borderRadius: T.radiusSm, background: T.successBg, textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.success, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}>
                  <AnimNum value={kpis.approved_invoices} />
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: T.success, marginTop: 2 }}>Aprobadas</div>
              </div>
              <div style={{ flex: 1, padding: "8px 10px", borderRadius: T.radiusSm, background: T.dangerBg, textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.danger, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}>
                  <AnimNum value={kpis.pending_invoices} />
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: T.danger, marginTop: 2 }}>Pendientes</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Command Center - Tasks */}
        <Card delay={500} style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" }}>Centro de Mando</h3>
              {metrics.pending_reminders.length > 0 && (
                <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 800, background: T.dangerBg, color: T.danger }}>
                  {metrics.pending_reminders.length}
                </span>
              )}
            </div>
            <Link href="/calendar" style={{ fontSize: 12, color: T.accent, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
              Ver todo {I.chevR}
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 210, overflowY: "auto" }}>
            {metrics.pending_reminders.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "30px 0", color: T.inkLight }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: T.successBg, display: "flex", alignItems: "center", justifyContent: "center", color: T.success, marginBottom: 8 }}>{I.check}</div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Sin tareas pendientes</span>
              </div>
            ) : (
              metrics.pending_reminders.slice(0, 6).map((task, i) => {
                const dueInfo = getDueDateInfo(task.due_date);
                return (
                  <div key={task.id} className="dash-hover-glow" style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 8px",
                    borderRadius: T.radiusSm, cursor: "pointer",
                    borderBottom: i < Math.min(metrics.pending_reminders.length, 6) - 1 ? `1px solid ${T.borderLight}` : "none",
                    animation: `dashSlideRight 0.3s ease ${600 + i * 50}ms both`,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {task.title}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                        <PriorityTag level={task.priority} />
                        {task.related_entity_type && (
                          <span style={{ fontSize: 10, color: T.inkLight, fontWeight: 500 }}>{task.related_entity_type}</span>
                        )}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 11, fontWeight: 600, color: dueInfo.urgent ? T.danger : T.inkMuted,
                      fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", whiteSpace: "nowrap",
                    }}>{dueInfo.label}</div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* ── ROW 3: State Distribution + Próximos Arribos ── */}
      <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 14, marginBottom: 16 }}>

        {/* State Distribution */}
        <Card delay={600} style={{ padding: "22px 24px" }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em", marginBottom: 20 }}>Distribución por Estado</h3>
          {stateData.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 180, color: T.inkLight, fontSize: 13 }}>Sin datos</div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                <div style={{ position: "relative", width: 180, height: 180 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={stateData} dataKey="value" cx="50%" cy="50%" innerRadius={58} outerRadius={82} paddingAngle={3} strokeWidth={0}>
                        {stateData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em" }}>{stateTotal}</div>
                    <div style={{ fontSize: 10, color: T.inkMuted, fontWeight: 600, marginTop: 2 }}>TOTAL</div>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {stateData.map((s, i) => {
                  const pct = ((s.value / stateTotal) * 100).toFixed(1);
                  return (
                    <div key={i} style={{ animation: `dashSlideRight 0.3s ease ${700 + i * 60}ms both` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 3, background: s.color, display: "inline-block" }} />
                          <span style={{ fontSize: 12.5, fontWeight: 500, color: T.inkSoft }}>{s.name}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}>{s.value}</span>
                          <span style={{ fontSize: 11, color: T.inkLight, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", minWidth: 38, textAlign: "right" }}>{pct}%</span>
                        </div>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: T.borderLight, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 2, background: s.color, width: `${pct}%`, animation: `dashProgressFill 1s ease ${800 + i * 80}ms both` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        {/* Próximos Arribos */}
        <Card delay={700} style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" }}>Próximos Arribos</h3>
              {metrics.upcoming_etas.length > 0 && (
                <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 800, background: T.accentLight, color: T.accent }}>
                  {metrics.upcoming_etas.length}
                </span>
              )}
            </div>
            <Link href="/shipments?filter=en_transito" style={{ fontSize: 12, color: T.accent, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
              Ver todos {I.chevR}
            </Link>
          </div>
          {metrics.upcoming_etas.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", color: T.inkLight }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: T.blueBg, display: "flex", alignItems: "center", justifyContent: "center", color: T.blue, marginBottom: 8 }}>{I.ship}</div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Sin embarques pendientes</span>
            </div>
          ) : (
            <div style={{ maxHeight: 340, overflowY: "auto" }}>
              {metrics.upcoming_etas.map((arr, i) => {
                const flag = arr.country ? (COUNTRY_FLAGS[arr.country] || "") : "";
                return (
                  <div key={arr.id} className="dash-hover-glow" style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "14px 8px", borderRadius: T.radiusSm, margin: "0 -8px",
                    borderBottom: i < metrics.upcoming_etas.length - 1 ? `1px solid ${T.borderLight}` : "none",
                    animation: `dashSlideRight 0.3s ease ${800 + i * 60}ms both`, cursor: "pointer",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 12,
                        background: T.blueBg, border: `1px solid ${T.blue}20`,
                        display: "flex", alignItems: "center", justifyContent: "center", color: T.blue,
                      }}>{I.ship}</div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 800 }}>{arr.client_name}</span>
                          {flag && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: T.borderLight, color: T.inkMuted }}>{flag}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: T.inkLight }}>
                          <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontWeight: 500 }}>{arr.client_contract || "N/A"}</span>
                          <span style={{ margin: "0 6px", color: T.border }}>·</span>
                          {arr.vessel_name || "Sin motonave"}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}>
                        {arr.eta_final ? format(new Date(arr.eta_final), "dd MMM yyyy", { locale: es }) : "—"}
                      </div>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "2px 9px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                        color: T.teal, background: T.tealBg,
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.teal, display: "inline-block", animation: "dashDotPulse 2s ease infinite" }} />
                        En tránsito
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ── ROW 4: Facturas Pendientes + Contratos por Comercial ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 14, marginBottom: 16 }}>

        {/* Facturas Pendientes */}
        <Card delay={900} style={{ padding: "18px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" }}>Facturas Pendientes</h3>
            <Link href="/invoices?tab=china&status=pending" style={{ fontSize: 12, color: T.accent, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
              Ver todas {I.chevR}
            </Link>
          </div>

          {metrics.pending_china_invoices.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "30px 0", color: T.inkLight }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: T.successBg, display: "flex", alignItems: "center", justifyContent: "center", color: T.success, marginBottom: 8 }}>{I.check}</div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Todas las facturas aprobadas</span>
            </div>
          ) : (
            <>
              {/* Summary banner */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 14px", borderRadius: T.radiusSm, marginBottom: 10, marginTop: 6,
                background: `linear-gradient(135deg, ${T.dangerBg}, ${T.warningBg})`,
                border: `1px solid ${T.danger}15`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: T.danger }}>{I.alert}</span>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{metrics.pending_china_invoices.length} pendientes</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", letterSpacing: "-0.02em" }}>
                  US$ {totalClientPending.toLocaleString("es-CO", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Header row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.7fr", padding: "0 0 6px", borderBottom: `1px solid ${T.border}` }}>
                {["Contrato Cliente", "Cliente", "Valor Cliente"].map(h => (
                  <span key={h} style={{ fontSize: 9, fontWeight: 700, color: T.inkLight, letterSpacing: "0.06em", textTransform: "uppercase", textAlign: h === "Valor Cliente" ? "right" : "left" }}>{h}</span>
                ))}
              </div>

              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                {metrics.pending_china_invoices.map((inv, i) => (
                  <div key={inv.id} className="dash-hover-glow" style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr 0.7fr",
                    alignItems: "center", padding: "7px 0",
                    borderBottom: i < metrics.pending_china_invoices.length - 1 ? `1px solid ${T.borderLight}` : "none",
                    animation: `dashSlideRight 0.3s ease ${1000 + i * 40}ms both`, cursor: "pointer",
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}>
                        {inv.customer_contract || inv.china_invoice_number || "—"}
                      </div>
                      <div style={{ fontSize: 9, color: T.inkLight, marginTop: 1 }}>
                        {inv.invoice_date ? format(new Date(inv.invoice_date), "dd MMM yyyy", { locale: es }) : "—"}
                      </div>
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: T.inkSoft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.customer_name || "—"}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 800, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", textAlign: "right" }}>
                      ${(inv.customer_invoice_value ?? 0).toLocaleString("es-CO", { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Contratos por Comercial */}
        {metrics.filters.role !== "comercial" && (
          <Card delay={1000} style={{ padding: "22px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" }}>Contratos por Comercial</h3>
              <Link href="/contracts" style={{ fontSize: 12, color: T.accent, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
                Detalle {I.chevR}
              </Link>
            </div>
            {metrics.commercial_ranking.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 150, color: T.inkLight, fontSize: 13 }}>Sin datos</div>
            ) : (
              <div style={{ maxHeight: 340, overflowY: "auto" }}>
                {metrics.commercial_ranking.map((c, i) => {
                  const color = commColors[i % commColors.length];
                  const initials = c.name.split(" ").map((w) => w[0]).join("").slice(0, 2);
                  const pct = computedData.maxCommercialTotal > 0 ? Math.round((c.total / computedData.maxCommercialTotal) * 100) : 0;
                  return (
                    <div key={i} className="dash-hover-glow" style={{
                      display: "grid", gridTemplateColumns: "1.5fr 0.4fr 0.6fr 0.9fr 1fr",
                      alignItems: "center", padding: "12px 8px", borderRadius: T.radiusSm,
                      borderBottom: i < metrics.commercial_ranking.length - 1 ? `1px solid ${T.borderLight}` : "none",
                      animation: `dashSlideRight 0.3s ease ${1100 + i * 60}ms both`, cursor: "pointer",
                      margin: "0 -8px",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 9,
                          background: color + "12", color: color,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 800, letterSpacing: "-0.02em",
                        }}>{initials}</div>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</span>
                      </div>
                      <span style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", textAlign: "center" }}>{c.total}</span>
                      <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: T.blueBg, color: T.blue }}>{c.en_produccion}</span>
                        <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: T.tealBg, color: T.teal }}>{c.en_transito}</span>
                      </div>
                      <span style={{ fontSize: 12, color: T.inkMuted, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontWeight: 500, textAlign: "right" }}>
                        {c.tons_agreed.toLocaleString("es-CO", { maximumFractionDigits: 0 })} t
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ flex: 1, height: 5, borderRadius: 3, background: T.borderLight, overflow: "hidden" }}>
                          <div style={{
                            height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${color}, ${color}aa)`,
                            width: `${pct}%`, animation: `dashProgressFill 1s ease ${1200 + i * 80}ms both`,
                          }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, minWidth: 32, textAlign: "right", fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}>{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* ── ROW 5: Quick Access + Activity ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* Quick Access */}
        <Card delay={1200} style={{ padding: "22px 24px" }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em", marginBottom: 14 }}>Acceso Rápido</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "Facturas", icon: I.dollar, color: T.accent, bg: T.accentLight, href: "/invoices" },
              { label: "Embarques", icon: I.ship, color: T.teal, bg: T.tealBg, href: "/shipments" },
              { label: "Reportes", icon: I.zap, color: T.violet, bg: T.violetBg, href: "/reports" },
              { label: "Calendario", icon: I.calendar, color: T.warning, bg: T.warningBg, href: "/calendar" },
            ].map((a, i) => (
              <Link key={i} href={a.href} style={{ textDecoration: "none" }}>
                <button className="dash-hover-glow" style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", width: "100%",
                  borderRadius: T.radiusSm, border: `1px solid ${T.borderLight}`,
                  background: T.surface, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12.5, fontWeight: 700, color: T.ink, textAlign: "left",
                  transition: "all 0.15s ease",
                }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: a.bg, display: "flex", alignItems: "center", justifyContent: "center", color: a.color, flexShrink: 0 }}>{a.icon}</div>
                  {a.label}
                </button>
              </Link>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card delay={1300} style={{ padding: "22px 24px", display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em", marginBottom: 14 }}>Actividad Reciente</h3>
          {metrics.recent_activity.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, color: T.inkLight, padding: "30px 0" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Sin actividad reciente</span>
            </div>
          ) : (
            <div style={{ flex: 1 }}>
              {metrics.recent_activity.map((act, i) => {
                const colors = [T.accent, T.teal, T.violet, T.orange, T.blue, T.success];
                const dotColor = colors[i % colors.length];
                return (
                  <div key={act.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 0",
                    borderBottom: i < metrics.recent_activity.length - 1 ? `1px solid ${T.borderLight}` : "none",
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 12, color: T.inkMuted, lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 700, color: T.ink }}>{act.user_name ?? "Sistema"}</span>{" "}
                      {ACTION_LABELS[act.action] ?? act.action}{" "}
                      <span style={{ color: T.accent, fontWeight: 600 }}>{TABLE_LABELS[act.table_name] ?? act.table_name}</span>
                    </div>
                    <span style={{ fontSize: 10, color: T.inkLight, whiteSpace: "nowrap", fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}>
                      {formatDistanceToNow(new Date(act.created_at), { locale: es, addSuffix: true })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        marginTop: 36, paddingTop: 20, borderTop: `1px solid ${T.borderLight}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 11, color: T.inkLight, fontWeight: 500 }}>Powered by IBC STEEL GROUP · © {new Date().getFullYear()}</div>
          <div style={{ fontSize: 12, color: T.accent, fontWeight: 700, letterSpacing: "0.01em" }}>Developed by Maria Camila Mesa</div>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {[
            { label: "Contratos", href: "/contracts" },
            { label: "Reportes", href: "/reports" },
            { label: "Cotizaciones", href: "/quotations" },
          ].map(l => (
            <Link key={l.label} href={l.href} style={{ fontSize: 11, color: T.inkMuted, fontWeight: 600, textDecoration: "none", transition: "color 0.15s" }}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

function getDueDateInfo(dateStr: string): { label: string; urgent: boolean } {
  const date = new Date(dateStr);
  if (isPast(date) && !isToday(date)) return { label: "Vencido", urgent: true };
  if (isToday(date)) return { label: "Hoy", urgent: true };
  if (isTomorrow(date)) return { label: "Mañana", urgent: false };
  return { label: formatDistanceToNow(date, { locale: es, addSuffix: true }), urgent: false };
}
