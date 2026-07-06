"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { format, formatDistanceToNow, isPast, isToday, isTomorrow, differenceInCalendarDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ROLE_LABELS } from "@/lib/utils";

import { T } from "@/lib/design-tokens";

const BEACON = "#00B8E0";
const BEACON_INK = "#0089A8";
const DISPLAY_FONT = "var(--font-space-grotesk), 'Space Grotesk', sans-serif";
const MONO_FONT = "var(--font-jetbrains-mono), 'JetBrains Mono', monospace";

// ─── SVG ICONS ───────────────────────────────────────────────
const I = {
  contracts: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>,
  ship: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.5 0 2.5 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.4 11.4 0 0 0 21 14l-9-4-9 4c0 2.1.56 4.15 1.62 6"/><path d="M12 10V2l-3 3"/></svg>,
  check: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  dollar: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  alert: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  zap: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  calendar: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  chevR: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>,
  chevDown: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>,
  checkSm: <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
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
    let rafId: number;
    const duration = 800;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(current);
      if (progress < 1) rafId = requestAnimationFrame(step);
      else ref.current = value;
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value]);

  return <>{prefix}{display.toLocaleString("es-CO")}{suffix}</>;
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
      border: `1px solid ${T.borderLight}`,
      boxShadow: T.shadow,
      animation: `dashFadeUp 0.45s ease ${delay}ms both`,
      transition: "box-shadow 0.25s ease, transform 0.25s ease",
      ...style,
    }}
    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = T.shadowMd; e.currentTarget.style.transform = "translateY(-2px)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = T.shadow; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {children}
    </div>
  );
}

// ─── SECTION TITLE ───────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.015em", fontFamily: DISPLAY_FONT, color: T.ink }}>
      {children}
    </h3>
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

// ─── METRICS CACHE ──────────────────────────────────────────
let metricsCache: { data: MetricsData; timestamp: number } | null = null;
const CACHE_TTL = 30_000; // 30 seconds

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function DashboardPage() {
  const { profile, loading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState<MetricsData | null>(() => {
    if (metricsCache && Date.now() - metricsCache.timestamp < CACHE_TTL) {
      return metricsCache.data;
    }
    return null;
  });
  const [loading, setLoading] = useState(() => !metricsCache || Date.now() - metricsCache.timestamp >= CACHE_TTL);
  const [selectedYears, setSelectedYears] = useState<string[]>([String(new Date().getFullYear())]);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  const fetchMetrics = useCallback(async (yearParam?: string) => {
    try {
      const y = yearParam ?? (selectedYears.length === 1 ? selectedYears[0] : "all");
      if (metricsCache && Date.now() - metricsCache.timestamp < CACHE_TTL && yearParam === undefined) {
        setMetrics(metricsCache.data);
        setLoading(false);
        return;
      }
      setLoading(true);
      const res = await fetch(`/api/metrics?year=${y}`);
      if (!res.ok) throw new Error("Error al obtener métricas");
      const data: MetricsData = await res.json();
      metricsCache = { data, timestamp: Date.now() };
      setMetrics(data);
    } catch {
      toast.error("Error al cargar las métricas del dashboard");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYears]);

  useEffect(() => {
    if (!authLoading) fetchMetrics();
  }, [authLoading, fetchMetrics]);

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
      metricsCache = null;
      const apiYear = next.length === 1 ? next[0] : "all";
      fetchMetrics(apiYear);
      return next;
    });
  };

  const yearLabel = selectedYears.length === 0 ? "Todos" : [...selectedYears].sort().join(", ");

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

    // Colores calibrados para el hero navy
    const kpiCards = [
      { label: "Contratos Activos", value: kpis.contracts_activos, color: BEACON },
      { label: "En Producción", value: kpis.en_produccion, color: "#FFB547" },
      { label: "En Tránsito", value: kpis.en_transito, color: "#6BC1FF" },
      { label: "Pdte. Anticipo", value: kpis.pendiente_anticipo, color: "#9FB4C8" },
      { label: "Entregados", value: kpis.entregados, color: "#4ADE80" },
    ];

    return { stateData, stateTotal, execPct, totalClientPending, kpiCards, kpis };
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
  const userRole = profile?.role || "comercial";
  const userInitials = profile?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  return (
    <div style={{ fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif" }}>

      {/* ═══════════ HERO — PUENTE DE MANDO (compacto) ═══════════ */}
      <div style={{
        position: "relative", overflow: "hidden",
        borderRadius: 20, marginBottom: 16,
        boxShadow: "0 24px 60px -18px rgba(4,15,27,0.45), 0 8px 24px -12px rgba(4,15,27,0.3)",
        animation: "dashFadeUp 0.5s ease both",
      }}>
        {/* Foto del puerto — apenas una insinuación, desaturada */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "url(/login-port.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center 42%",
          filter: "saturate(0.55)",
        }} />
        {/* Duotono navy cerrado: la foto solo asoma arriba a la derecha */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(97deg, #050F1B 0%, rgba(5,18,32,0.985) 40%, rgba(6,27,46,0.95) 68%, rgba(6,27,46,0.86) 100%)",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, transparent 0%, rgba(5,15,27,0.45) 55%, rgba(5,15,27,0.75) 100%)",
        }} />
        {/* Línea beacon */}
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: 2,
          background: `linear-gradient(90deg, ${BEACON} 0%, rgba(0,184,224,0.25) 40%, transparent 75%)`,
        }} />

        <div style={{ position: "relative", padding: "16px 26px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            {/* Saludo */}
            <div>
              <h1 style={{
                fontSize: 22, fontWeight: 600, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.15,
                fontFamily: DISPLAY_FONT,
              }}>
                {greeting}, <span style={{ color: "#9CC6E8" }}>{firstName}</span>
              </h1>
              <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", marginTop: 3, fontWeight: 500 }}>
                {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
              </p>
            </div>

            {/* Controles: año + campana + usuario, sobre chip claro */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)",
              padding: "5px 12px", borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.5)",
              boxShadow: "0 8px 24px -8px rgba(4,15,27,0.4)",
            }}>
              <div ref={yearDropdownRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
                  style={{
                    padding: "6px 12px", borderRadius: 10, border: `1px solid ${T.border}`,
                    background: T.surface, color: T.ink, fontSize: 13, fontWeight: 600,
                    cursor: "pointer", outline: "none", display: "flex", alignItems: "center", gap: 6,
                    minWidth: 80,
                  }}
                >
                  {yearLabel}
                  <span style={{ opacity: 0.7 }}>{I.chevDown}</span>
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
                              {isChecked && <span style={{ color: "#fff" }}>{I.checkSm}</span>}
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
              <div style={{ width: 1, height: 26, background: T.border, opacity: 0.6 }} />
              <NotificationBell />
              <div style={{ width: 1, height: 26, background: T.border, opacity: 0.6 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar className="h-9 w-9 ring-2 ring-blue-100/80 shadow-sm">
                  {profile?.avatar_url && (
                    <AvatarImage src={profile.avatar_url} alt={profile.full_name} className="object-cover" />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-[#0B5394] to-[#00B8E0] text-white text-xs font-bold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: T.ink, lineHeight: 1.3 }}>{profile?.full_name || "Usuario"}</p>
                  <p style={{ fontSize: 11, fontWeight: 500, color: T.inkLight }}>{ROLE_LABELS[userRole] || userRole}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs dentro del hero */}
        <div style={{
          position: "relative", display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
          marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.10)",
        }}>
          {kpiCards.map((kpi, i) => (
            <div
              key={kpi.label}
              style={{
                padding: "12px 22px 14px",
                borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.10)" : "none",
                animation: `dashFadeUp 0.4s ease ${200 + i * 70}ms both`,
                display: "flex", alignItems: "center", gap: 12,
              }}
            >
              <div style={{
                fontSize: 25, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1, color: "#fff",
                fontFamily: DISPLAY_FONT, flexShrink: 0,
              }}>
                <AnimNum value={kpi.value} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                <span style={{ width: 5, height: 5, borderRadius: 99, background: kpi.color, boxShadow: `0 0 8px ${kpi.color}66`, flexShrink: 0 }} />
                <span style={{
                  fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.60)",
                  textTransform: "uppercase", letterSpacing: "0.12em", whiteSpace: "nowrap",
                  overflow: "hidden", textOverflow: "ellipsis",
                  fontFamily: MONO_FONT,
                }}>{kpi.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════ TABLERO DE ARRIBOS ═══════════ */}
      <div style={{
        position: "relative", overflow: "hidden",
        borderRadius: T.radius, marginBottom: 16,
        background: T.surface,
        border: `1px solid ${T.borderLight}`,
        boxShadow: T.shadow,
        animation: "dashFadeUp 0.5s ease 250ms both",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "15px 26px", borderBottom: `1px solid ${T.borderLight}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: T.accent }}>{I.ship}</span>
            <span style={{
              fontSize: 12, fontWeight: 600, color: T.ink, textTransform: "uppercase",
              letterSpacing: "0.2em", fontFamily: MONO_FONT,
            }}>
              Tablero de arribos
            </span>
            {metrics.upcoming_etas.length > 0 && (
              <span style={{
                padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: T.beaconBg, color: BEACON_INK, fontFamily: MONO_FONT,
              }}>
                {metrics.upcoming_etas.length}
              </span>
            )}
          </div>
          <Link href="/shipments?filter=en_transito" style={{
            fontSize: 12, color: T.accent, fontWeight: 600, textDecoration: "none",
            display: "flex", alignItems: "center", gap: 3,
          }}>
            Ver embarques {I.chevR}
          </Link>
        </div>

        {metrics.upcoming_etas.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "42px 0", color: T.inkLight }}>
            <span style={{ marginBottom: 8 }}>{I.ship}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Sin embarques en tránsito</span>
          </div>
        ) : (
          <>
            <div style={{
              display: "grid", gridTemplateColumns: "1.3fr 1.5fr 1.1fr 0.6fr 0.9fr 0.7fr",
              padding: "10px 26px 8px", gap: 12, background: T.surfaceAlt,
            }}>
              {["Motonave", "Cliente", "Contrato", "País", "ETA", "Días"].map((h, idx) => (
                <span key={h} style={{
                  fontSize: 9, fontWeight: 600, color: T.inkLight,
                  textTransform: "uppercase", letterSpacing: "0.18em", fontFamily: MONO_FONT,
                  textAlign: idx >= 4 ? "right" : "left",
                }}>{h}</span>
              ))}
            </div>

            <div style={{ maxHeight: 320, overflowY: "auto", paddingBottom: 8 }}>
              {metrics.upcoming_etas.map((arr, i) => {
                const flag = arr.country ? (COUNTRY_FLAGS[arr.country.toUpperCase()] || "") : "";
                const days = arr.eta_final ? differenceInCalendarDays(parseISO(arr.eta_final.split("T")[0]), new Date()) : null;
                const daysColor = days === null ? T.inkLight : days < 0 ? T.danger : days <= 3 ? T.warning : BEACON_INK;
                const daysBg = days === null ? "transparent" : days < 0 ? T.dangerBg : days <= 3 ? T.warningBg : T.beaconBg;
                const daysLabel = days === null ? "—" : days < 0 ? `${Math.abs(days)}d atraso` : days === 0 ? "HOY" : `${days}d`;
                return (
                  <div key={arr.id} style={{
                    display: "grid", gridTemplateColumns: "1.3fr 1.5fr 1.1fr 0.6fr 0.9fr 0.7fr",
                    alignItems: "center", gap: 12,
                    padding: "12px 26px",
                    borderTop: `1px solid ${T.borderLight}`,
                    animation: `dashSlideRight 0.3s ease ${350 + i * 50}ms both`,
                    transition: "background 0.15s ease",
                    cursor: "default",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(11,83,148,0.03)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{
                      fontSize: 13.5, fontWeight: 600, color: T.accent, fontFamily: DISPLAY_FONT,
                      letterSpacing: "0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {(arr.vessel_name || "Sin motonave").toUpperCase()}
                    </span>
                    <span style={{ fontSize: 12.5, color: T.inkSoft, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {arr.client_name}
                    </span>
                    <span style={{ fontSize: 12, color: T.inkMuted, fontFamily: MONO_FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {arr.client_contract || "—"}
                    </span>
                    <span style={{ fontSize: 15 }}>{flag}</span>
                    <span style={{ fontSize: 12.5, color: T.ink, fontFamily: MONO_FONT, fontWeight: 700, textAlign: "right" }}>
                      {arr.eta_final ? format(new Date(arr.eta_final), "dd MMM", { locale: es }).toUpperCase() : "—"}
                    </span>
                    <span style={{ textAlign: "right" }}>
                      <span style={{
                        display: "inline-block",
                        fontSize: 10.5, fontWeight: 700, fontFamily: MONO_FONT,
                        color: daysColor, background: daysBg,
                        padding: "2px 8px", borderRadius: 6,
                      }}>
                        {daysLabel}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ═══════════ ROW: Carga + Financiero + Centro de Mando ═══════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1.3fr", gap: 14, marginBottom: 16 }}>

        {/* Carga & Estados */}
        <Card delay={400} style={{ padding: "22px 24px" }}>
          <SectionTitle>Carga & Estados</SectionTitle>
          <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 18 }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <CircularProgress pct={execPct} size={96} stroke={7} color={BEACON} />
              <div style={{ position: "absolute", textAlign: "center" }}>
                <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1, fontFamily: DISPLAY_FONT }}>{execPct}%</div>
                <div style={{ fontSize: 9, color: T.inkMuted, fontWeight: 600, marginTop: 2 }}>Embarcado</div>
              </div>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: T.inkLight, textTransform: "uppercase", letterSpacing: "0.08em" }}>Acordadas</span>
                <span style={{ fontSize: 18, fontWeight: 700, fontFamily: MONO_FONT, letterSpacing: "-0.02em", color: T.accent }}>
                  <AnimNum value={Math.round(kpis.total_tons_agreed)} /> t
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: `1px solid ${T.borderLight}`, paddingTop: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: T.inkLight, textTransform: "uppercase", letterSpacing: "0.08em" }}>Embarcadas</span>
                <span style={{ fontSize: 18, fontWeight: 700, fontFamily: MONO_FONT, letterSpacing: "-0.02em", color: BEACON_INK }}>
                  <AnimNum value={Math.round(kpis.total_tons_shipped)} /> t
                </span>
              </div>
            </div>
          </div>

          {/* Barra de distribución tipo estiba */}
          {stateData.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", gap: 2 }}>
                {stateData.map((s, i) => (
                  <div key={i} style={{
                    width: `${(s.value / stateTotal) * 100}%`,
                    background: s.color, minWidth: 8,
                    animation: `dashFadeUp 0.5s ease ${500 + i * 80}ms both`,
                  }} />
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 12 }}>
                {stateData.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 3, background: s.color, display: "inline-block" }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: T.inkMuted }}>{s.name}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: T.ink, fontFamily: MONO_FONT }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Resumen Financiero */}
        <Card delay={450} style={{ padding: "22px 24px" }}>
          <SectionTitle>Resumen Financiero</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.inkMuted }}>Facturación Cliente</span>
              <span style={{ fontSize: 15, fontWeight: 800, fontFamily: MONO_FONT, letterSpacing: "-0.02em", color: T.success }}>
                USD <AnimNum value={Math.round(kpis.total_customer_value)} />
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.inkMuted }}>Costo China</span>
              <span style={{ fontSize: 15, fontWeight: 800, fontFamily: MONO_FONT, letterSpacing: "-0.02em", color: T.ink }}>
                USD <AnimNum value={Math.round(kpis.total_china_value)} />
              </span>
            </div>
            <div style={{ borderTop: `1px solid ${T.borderLight}`, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.ink }}>Margen Bruto</span>
              <span style={{ fontSize: 15, fontWeight: 800, fontFamily: MONO_FONT, letterSpacing: "-0.02em", color: (kpis.total_customer_value - kpis.total_china_value) >= 0 ? T.success : T.danger }}>
                USD <AnimNum value={Math.round(kpis.total_customer_value - kpis.total_china_value)} />
              </span>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: T.radiusSm, background: T.successBg + "80" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.success, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: T.success, fontFamily: MONO_FONT, lineHeight: 1 }}>
                    <AnimNum value={kpis.approved_invoices} />
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: T.success, marginTop: 2, opacity: 0.8 }}>Aprobadas</div>
                </div>
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: T.radiusSm, background: T.dangerBg + "80" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.danger, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: T.danger, fontFamily: MONO_FONT, lineHeight: 1 }}>
                    <AnimNum value={kpis.pending_invoices} />
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: T.danger, marginTop: 2, opacity: 0.8 }}>Pendientes</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Centro de Mando */}
        <Card delay={500} style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <SectionTitle>Centro de Mando</SectionTitle>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 230, overflowY: "auto" }}>
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
                      fontFamily: MONO_FONT, whiteSpace: "nowrap",
                    }}>{dueInfo.label}</div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* ═══════════ ROW: Facturas Pendientes + Contratos por Comercial ═══════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 14, marginBottom: 16 }}>

        {/* Facturas Pendientes */}
        <Card delay={900} style={{ padding: "18px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <SectionTitle>Facturas Pendientes</SectionTitle>
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
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 14px", borderRadius: T.radiusSm, marginBottom: 10, marginTop: 6,
                background: T.dangerBg + "70",
                border: `1px solid ${T.danger}20`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: T.danger }}>{I.alert}</span>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{metrics.pending_china_invoices.length} pendientes</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, fontFamily: MONO_FONT, letterSpacing: "-0.02em" }}>
                  USD {totalClientPending.toLocaleString("es-CO", { minimumFractionDigits: 2 })}
                </span>
              </div>

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
                      <div style={{ fontSize: 12, fontWeight: 700, fontFamily: MONO_FONT }}>
                        {inv.customer_contract || inv.china_invoice_number || "—"}
                      </div>
                      <div style={{ fontSize: 9, color: T.inkLight, marginTop: 1 }}>
                        {inv.invoice_date ? format(new Date(inv.invoice_date), "dd MMM yyyy", { locale: es }) : "—"}
                      </div>
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: T.inkSoft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.customer_name || "—"}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 800, fontFamily: MONO_FONT, textAlign: "right" }}>
                      USD {(inv.customer_invoice_value ?? 0).toLocaleString("es-CO", { minimumFractionDigits: 2 })}
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
              <SectionTitle>Contratos por Comercial</SectionTitle>
              <Link href="/contracts" style={{ fontSize: 12, color: T.accent, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
                Detalle {I.chevR}
              </Link>
            </div>
            {metrics.commercial_ranking.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 150, color: T.inkLight, fontSize: 13 }}>Sin datos</div>
            ) : (
              <div style={{ maxHeight: 340, overflowY: "auto" }}>
                {metrics.commercial_ranking.map((c, i) => {
                  const initials = c.name.split(" ").map((w) => w[0]).join("").slice(0, 2);
                  const maxTotal = Math.max(...metrics.commercial_ranking.map((r) => r.total), 1);
                  return (
                    <div key={i} className="dash-hover-glow" style={{
                      display: "flex", alignItems: "center", gap: 14, padding: "12px 10px", borderRadius: T.radiusSm,
                      borderBottom: i < metrics.commercial_ranking.length - 1 ? `1px solid ${T.borderLight}` : "none",
                      animation: `dashSlideRight 0.3s ease ${1100 + i * 60}ms both`, cursor: "pointer",
                      margin: "0 -10px",
                    }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: T.accentLight, color: T.accent,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 800, letterSpacing: "-0.02em", flexShrink: 0,
                        fontFamily: DISPLAY_FONT,
                      }}>{initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{c.name}</span>
                          <span style={{ fontSize: 19, fontWeight: 600, fontFamily: DISPLAY_FONT, color: T.accent }}>{c.total}</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: T.borderLight, overflow: "hidden", marginBottom: 7 }}>
                          <div style={{
                            height: "100%", width: `${(c.total / maxTotal) * 100}%`,
                            background: `linear-gradient(90deg, ${T.accent}, ${BEACON})`,
                            borderRadius: 3,
                            animation: "dashProgressFill 0.9s ease both",
                          }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 10.5, color: T.inkMuted, fontWeight: 600 }}>{c.en_produccion} producción</span>
                          <span style={{ color: T.inkGhost }}>·</span>
                          <span style={{ fontSize: 10.5, color: T.inkMuted, fontWeight: 600 }}>{c.en_transito} tránsito</span>
                          <span style={{ color: T.inkGhost }}>·</span>
                          <span style={{ fontSize: 10.5, color: T.inkMuted, fontWeight: 600 }}>{c.entregados} entregados</span>
                          <span style={{ marginLeft: "auto", fontSize: 11, color: T.inkMuted, fontFamily: MONO_FONT, fontWeight: 500 }}>
                            {c.tons_agreed.toLocaleString("es-CO", { maximumFractionDigits: 0 })} t
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* ═══════════ ROW: Acceso Rápido + Actividad ═══════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        <Card delay={1200} style={{ padding: "22px 24px" }}>
          <SectionTitle>Acceso Rápido</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
            {[
              { label: "Facturas", icon: I.dollar, href: "/invoices" },
              { label: "Embarques", icon: I.ship, href: "/shipments" },
              { label: "Reportes", icon: I.zap, href: "/reports" },
              { label: "Calendario", icon: I.calendar, href: "/calendar" },
            ].map((a, i) => (
              <Link key={i} href={a.href} style={{ textDecoration: "none" }}>
                <button className="dash-hover-glow" style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", width: "100%",
                  borderRadius: T.radiusSm, border: `1px solid ${T.borderLight}`,
                  background: T.surface, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12.5, fontWeight: 700, color: T.ink, textAlign: "left",
                  transition: "all 0.15s ease",
                }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: T.accentLight, display: "flex", alignItems: "center", justifyContent: "center", color: T.accent, flexShrink: 0 }}>{a.icon}</div>
                  {a.label}
                </button>
              </Link>
            ))}
          </div>
        </Card>

        <Card delay={1300} style={{ padding: "22px 24px", display: "flex", flexDirection: "column" }}>
          <SectionTitle>Actividad Reciente</SectionTitle>
          {metrics.recent_activity.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, color: T.inkLight, padding: "30px 0" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Sin actividad reciente</span>
            </div>
          ) : (
            <div style={{ flex: 1, marginTop: 10 }}>
              {metrics.recent_activity.map((act, i) => (
                <div key={act.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 0",
                  borderBottom: i < metrics.recent_activity.length - 1 ? `1px solid ${T.borderLight}` : "none",
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 12, color: T.inkMuted, lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 700, color: T.ink }}>{act.user_name ?? "Sistema"}</span>{" "}
                    {ACTION_LABELS[act.action] ?? act.action}{" "}
                    <span style={{ color: T.accent, fontWeight: 600 }}>{TABLE_LABELS[act.table_name] ?? act.table_name}</span>
                  </div>
                  <span style={{ fontSize: 10, color: T.inkLight, whiteSpace: "nowrap", fontFamily: MONO_FONT }}>
                    {formatDistanceToNow(new Date(act.created_at), { locale: es, addSuffix: true })}
                  </span>
                </div>
              ))}
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
