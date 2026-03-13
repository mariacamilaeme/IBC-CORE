"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { useQuotationsData } from "@/hooks/useQuotationsData";
import { STATUS_CONFIG, getCountryFlag, fmtDate, avatarColor, initials } from "./constants";

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
  success: "#0D9F6E",
  successBg: "#ECFDF3",
  successSoft: "#D1FAE5",
  warning: "#DC8B0B",
  warningBg: "#FFF8EB",
  warningSoft: "#FEF3C7",
  danger: "#E63946",
  dangerBg: "#FFF1F2",
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
  shadow: "0 1px 2px rgba(26,29,35,0.03), 0 2px 8px rgba(26,29,35,0.04)",
  shadowMd: "0 2px 4px rgba(26,29,35,0.04), 0 8px 20px rgba(26,29,35,0.05)",
  shadowLg: "0 4px 8px rgba(26,29,35,0.04), 0 16px 40px rgba(26,29,35,0.07)",
  radius: "18px",
  radiusMd: "14px",
  radiusSm: "10px",
};

// ─── SVG ICONS ───────────────────────────────────────────────
const I = {
  file: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>,
  chart: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
  filePlus: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M9 15h6"/><path d="M12 18v-6"/></svg>,
  kanban: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect width="6" height="14" x="3" y="3" rx="1"/><rect width="6" height="8" x="9" y="3" rx="1"/><rect width="6" height="11" x="15" y="3" rx="1"/></svg>,
  table: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>,
  filter: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  kpi: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>,
  form: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>,
  sync: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>,
  history: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>,
  users: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  target: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  chevR: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>,
  arrowR: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>,
  sparkle: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z"/></svg>,
  plus: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M12 5v14"/></svg>,
  search: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  home: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>,
  trophy: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>,
  zap: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14Z"/></svg>,
  globe: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>,
  clock: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
};

// ─── RING CHART ──────────────────────────────────────────────
function Ring({ value, max, size = 48, sw = 4, color, bg }: { value: number; max: number; size?: number; sw?: number; color: string; bg?: string }) {
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bg || T.borderLight} strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={c} strokeDashoffset={c * (1 - value / max)}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)" }} />
    </svg>
  );
}

// ─── CARD ────────────────────────────────────────────────────
function Card({ children, style = {}, delay = 0, hover = false, onClick }: { children: React.ReactNode; style?: React.CSSProperties; delay?: number; hover?: boolean; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{
      background: T.surface, borderRadius: T.radius, border: `1px solid ${T.borderLight}`,
      boxShadow: T.shadow, animation: `qFadeUp 0.55s cubic-bezier(0.4,0,0.2,1) ${delay}ms both`,
      overflow: "hidden", cursor: onClick ? "pointer" : "default",
      transition: hover ? "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" : undefined,
      ...style,
    }}
    onMouseEnter={hover ? (e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = T.shadowLg; } : undefined}
    onMouseLeave={hover ? (e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = T.shadow; } : undefined}
    >{children}</div>
  );
}

// ─── STATUS CONFIG MAP ──────────────────────────────────────
const STATUS_MAP: Record<string, { color: string; bg: string; label: string }> = {
  "Aprobado": { color: T.success, bg: T.successBg, label: "Aprobado" },
  "Finalizado": { color: T.accent, bg: T.accentLight, label: "Finalizado" },
  "En negociación": { color: T.blue, bg: T.blueBg, label: "Negociación" },
  "Pendiente cotización": { color: T.orange, bg: T.orangeBg, label: "Pendiente" },
};

// ─── MODULE CARD (compact floating card) ─────────────────────
function ModuleCard({ title, desc, tags, stat, statLabel, icon, accentColor, delay, href }: {
  title: string; desc: string; tags: { icon: React.ReactNode; label: string }[];
  stat: string; statLabel: string; icon: React.ReactNode; accentColor: string; delay: number; href: string;
}) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(href)}
      style={{
        borderRadius: T.radiusMd,
        background: T.surface,
        border: `1px solid ${T.borderLight}`,
        boxShadow: T.shadow,
        cursor: "pointer",
        overflow: "hidden",
        animation: `qFadeUp 0.45s cubic-bezier(0.4,0,0.2,1) ${delay}ms both`,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accentColor + "30";
        e.currentTarget.style.boxShadow = `0 6px 24px ${accentColor}12, 0 2px 8px rgba(26,29,35,0.04)`;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = T.borderLight;
        e.currentTarget.style.boxShadow = T.shadow;
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Top accent line */}
      <div style={{
        height: 3, width: "100%",
        background: `linear-gradient(90deg, ${accentColor}, ${accentColor}66, transparent)`,
      }} />

      <div style={{ padding: "20px 22px 18px" }}>
        {/* Icon + Title row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11, flexShrink: 0,
            background: accentColor + "0C",
            border: `1px solid ${accentColor}15`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: accentColor,
          }}>{icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.ink, lineHeight: 1.2 }}>{title}</div>
            <div style={{ fontSize: 12.5, color: T.inkMuted, marginTop: 2, lineHeight: 1.3 }}>{desc}</div>
          </div>
        </div>

        {/* Tags row */}
        <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
          {tags.map((tag, j) => (
            <span key={j} style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 9px", borderRadius: 6,
              background: T.surfaceAlt,
              border: `1px solid ${T.borderLight}`,
              color: T.inkLight, fontSize: 11, fontWeight: 600,
            }}>
              <span style={{ color: accentColor, opacity: 0.5 }}>{tag.icon}</span>
              {tag.label}
            </span>
          ))}
        </div>

        {/* Stat + Arrow */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          paddingTop: 12, borderTop: `1px solid ${T.borderLight}`,
        }}>
          <div>
            <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", color: T.ink, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}>{stat}</span>
            <span style={{ fontSize: 12, color: T.inkLight, fontWeight: 500, marginLeft: 7 }}>{statLabel}</span>
          </div>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: accentColor + "0A",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: accentColor,
          }}>{I.chevR}</div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function QuotationsHubPage() {
  const router = useRouter();
  const { data, customQuotations } = useQuotationsData();

  // Compute all stats from real data
  const stats = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    const commercialMap: Record<string, { total: number; approved: number }> = {};
    const countryMap: Record<string, number> = {};

    data.forEach((d) => {
      // Status counts
      statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;

      // Commercial stats
      const comm = d.requestedBy || "Sin asignar";
      if (!commercialMap[comm]) commercialMap[comm] = { total: 0, approved: 0 };
      commercialMap[comm].total += 1;
      if (d.status === "Aprobado" || d.status === "Finalizado") commercialMap[comm].approved += 1;

      // Country stats
      const country = d.country || "Otros";
      countryMap[country] = (countryMap[country] || 0) + 1;
    });

    const approved = (statusCounts["Aprobado"] || 0) + (statusCounts["Finalizado"] || 0);
    const conversion = data.length > 0 ? ((approved / data.length) * 100) : 0;
    const uniqueCommercials = new Set(data.map((d) => d.requestedBy)).size;

    // Pipeline data
    const pipeline = [
      { label: "Pendiente", value: statusCounts["Pendiente cotización"] || 0, color: T.orange, bg: T.orangeBg },
      { label: "En negociación", value: statusCounts["En negociación"] || 0, color: T.blue, bg: T.blueBg },
      { label: "Aprobado", value: statusCounts["Aprobado"] || 0, color: T.success, bg: T.successBg },
      { label: "Finalizado", value: statusCounts["Finalizado"] || 0, color: T.accent, bg: T.accentLight },
    ];
    const pipelineTotal = pipeline.reduce((s, p) => s + p.value, 0);

    // Commercial ranking - top 5 by total
    const commercialRanking = Object.entries(commercialMap)
      .map(([name, d]) => ({
        name,
        total: d.total,
        approved: d.approved,
        rate: d.total > 0 ? Math.round((d.approved / d.total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Country distribution - top 5
    const countryRanking = Object.entries(countryMap)
      .map(([country, count]) => ({
        country,
        count,
        pct: data.length > 0 ? Math.round((count / data.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Recent quotations - last 5
    const recent = [...data]
      .filter((d) => d.requestDate)
      .sort((a, b) => (b.requestDate || "").localeCompare(a.requestDate || ""))
      .slice(0, 5);

    return {
      total: data.length,
      conversion,
      uniqueCommercials,
      pipeline,
      pipelineTotal,
      commercialRanking,
      countryRanking,
      recent,
      custom: customQuotations.length,
    };
  }, [data, customQuotations]);

  const commColors = [T.accent, T.teal, T.violet, T.blue, T.orange];

  return (
    <div style={{ fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif", width: "100%", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}>

      {/* Global keyframes */}
      <style>{`
        @keyframes qFadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes qFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes qSlideRight { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes qProgressFill { from { width: 0%; } }
        @keyframes qDotPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
      `}</style>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, animation: "qFadeIn 0.3s ease both", fontSize: 12.5, color: T.inkLight }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 4, color: T.accent, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>{I.home} Inicio</Link>
        <span style={{ color: T.inkGhost }}>/</span>
        <span style={{ fontWeight: 600, color: T.inkMuted }}>Cotizaciones</span>
      </div>

      {/* Header Banner */}
      <div style={{
        position: "relative", overflow: "hidden", borderRadius: 14,
        background: "linear-gradient(135deg, #1E3A5F 0%, #2a4d7a 50%, #3B82F6 100%)",
        padding: "14px 24px", marginBottom: 16,
        boxShadow: "0 4px 24px rgba(30,58,95,0.18)",
        animation: "qFadeIn 0.4s ease both",
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
            }}>{I.file}</div>
            <div>
              <h1 style={{
                fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                fontSize: 18, fontWeight: 800, color: "#fff",
                letterSpacing: "-0.02em", lineHeight: 1.2,
              }}>Cotizaciones</h1>
              <p style={{ fontSize: 12, color: "rgba(191,219,254,0.7)", fontWeight: 500 }}>
                Gestión del ciclo de vida de cotizaciones
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => router.push("/quotations/reports")}
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
            >{I.sparkle} AI Análisis</button>
            <button
              onClick={() => router.push("/quotations/create")}
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
            >{I.plus} Nueva Cotización</button>
          </div>
        </div>
      </div>

      {/* Module Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
        <ModuleCard
          delay={300}
          href="/quotations/tracking"
          icon={I.file}
          accentColor={T.accent}
          title="Trazabilidad Cotizaciones"
          desc="Gestiona cotizaciones por estado, comercial o línea de producto"
          tags={[
            { icon: I.table, label: "Tabla" },
            { icon: I.kanban, label: "Kanban" },
            { icon: I.filter, label: "Filtros" },
          ]}
          stat={String(stats.total)}
          statLabel="activas"
        />
        <ModuleCard
          delay={370}
          href="/quotations/reports"
          icon={I.chart}
          accentColor={T.violet}
          title="Reportes Gerenciales"
          desc="Métricas de gestión, desempeño comercial y tiempos de respuesta"
          tags={[
            { icon: I.kpi, label: "KPIs" },
            { icon: I.chart, label: "Charts" },
            { icon: I.globe, label: "Análisis" },
          ]}
          stat={`${stats.conversion.toFixed(1)}%`}
          statLabel="conversión"
        />
        <ModuleCard
          delay={440}
          href="/quotations/create"
          icon={I.filePlus}
          accentColor={T.success}
          title="Generar Cotización"
          desc="Crea cotizaciones que alimentan trazabilidad y reportes en tiempo real"
          tags={[
            { icon: I.form, label: "Formulario" },
            { icon: I.sync, label: "Sync" },
            { icon: I.history, label: "Historial" },
          ]}
          stat={String(stats.custom)}
          statLabel="creadas"
        />
      </div>

      {/* Pipeline Bar */}
      <Card delay={650} style={{ padding: "22px 28px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" }}>Resumen del Pipeline</h3>
          <Link href="/quotations/tracking" style={{ fontSize: 12, color: T.accent, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 3, textDecoration: "none" }}>Ver detalle {I.chevR}</Link>
        </div>
        <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", gap: 2, marginBottom: 18 }}>
          {stats.pipeline.map((p, i) => {
            const pct = stats.pipelineTotal > 0 ? (p.value / stats.pipelineTotal) * 100 : 0;
            return (
              <div key={i} style={{ flex: pct || 0.1, background: p.color, borderRadius: 5, animation: `qProgressFill 1s ease ${750 + i * 100}ms both` }} />
            );
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {stats.pipeline.map((p, i) => {
            const pct = stats.pipelineTotal > 0 ? ((p.value / stats.pipelineTotal) * 100).toFixed(1) : "0";
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, animation: `qFadeUp 0.4s ease ${850 + i * 60}ms both` }}>
                <div style={{ position: "relative" }}>
                  <Ring value={p.value} max={stats.pipelineTotal || 1} size={48} sw={4} color={p.color} bg={p.bg} />
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: 13, fontWeight: 800, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}>{p.value}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 1 }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: T.inkLight, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontWeight: 500 }}>{pct}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Country Distribution + Ranking */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Geographic Distribution */}
        <Card delay={950} style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" }}>Distribución Geográfica</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {stats.countryRanking.map((g, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, animation: `qSlideRight 0.3s ease ${1050 + i * 60}ms both` }}>
                <span style={{ fontSize: 15 }}>{getCountryFlag(g.country)}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.inkSoft, minWidth: 80 }}>{g.country}</span>
                <div style={{ flex: 1, height: 5, borderRadius: 3, background: T.borderLight, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: T.accent, width: `${g.pct}%`, opacity: 1 - i * 0.12, animation: `qProgressFill 0.8s ease ${1050 + i * 60}ms both` }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", color: T.inkMuted, minWidth: 24, textAlign: "right" }}>{g.count}</span>
                <span style={{ fontSize: 10, color: T.inkLight, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", minWidth: 28, textAlign: "right" }}>{g.pct}%</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Commercial Ranking */}
        <Card delay={1050} style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ color: T.warning }}>{I.trophy}</span>
            <h3 style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" }}>Ranking Comerciales</h3>
          </div>
          {stats.commercialRanking.map((c, i) => {
            const color = commColors[i % commColors.length];
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 8px", borderRadius: T.radiusSm, margin: "0 -8px",
                borderBottom: i < stats.commercialRanking.length - 1 ? `1px solid ${T.borderLight}` : "none",
                animation: `qSlideRight 0.3s ease ${1150 + i * 60}ms both`, cursor: "pointer",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = T.surfaceHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: 7,
                  background: i === 0 ? T.warningBg : i === 1 ? T.surfaceAlt : i === 2 ? T.orangeBg : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800, color: i === 0 ? T.warning : i === 1 ? T.inkMuted : i === 2 ? T.orange : T.inkLight,
                  fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                }}>{i + 1}</div>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: color + "12", color: color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800, flexShrink: 0,
                }}>{initials(c.name)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: T.inkLight }}>
                    <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontWeight: 500 }}>{c.total}</span> cotiz. · <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontWeight: 500 }}>{c.approved}</span> conv.
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", color: c.rate >= 80 ? T.success : c.rate >= 70 ? T.blue : T.inkSoft }}>{c.rate}%</div>
                  <div style={{ fontSize: 10, color: T.inkLight }}>conversión</div>
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Recent Quotes */}
      <Card delay={1250} style={{ padding: "22px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" }}>Cotizaciones Recientes</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/quotations/tracking" style={{ fontSize: 12, color: T.accent, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 3, padding: "6px 12px", textDecoration: "none" }}>Ver todas {I.chevR}</Link>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.5fr 0.8fr 0.8fr 0.5fr", padding: "0 0 10px", borderBottom: `1px solid ${T.border}`, gap: 8 }}>
          {["Referencia", "Cliente", "Materiales", "Fecha", "Estado", "Com."].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: T.inkLight, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
          ))}
        </div>
        {stats.recent.map((q, i) => {
          const st = STATUS_MAP[q.status] || { color: T.inkMuted, bg: T.borderLight, label: q.status };
          return (
            <div key={q.id || i} style={{
              display: "grid", gridTemplateColumns: "1.2fr 1fr 1.5fr 0.8fr 0.8fr 0.5fr",
              alignItems: "center", padding: "13px 0", gap: 8,
              borderBottom: i < stats.recent.length - 1 ? `1px solid ${T.borderLight}` : "none",
              animation: `qSlideRight 0.3s ease ${1350 + i * 50}ms both`, cursor: "pointer",
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = T.surfaceHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}>{q.id || "—"}</div>
                <div style={{ fontSize: 10, color: T.inkLight, marginTop: 1 }}>{q.category || "—"}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{q.customer}</span>
              <span style={{ fontSize: 12.5, color: T.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.materials}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: T.inkLight }}>
                {I.clock} {fmtDate(q.requestDate)}
              </div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 6, fontSize: 10.5, fontWeight: 700, color: st.color, background: st.bg, width: "fit-content" }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.color, ...(q.status === "Pendiente cotización" ? { animation: "qDotPulse 1.5s ease infinite" } : {}) }} />
                {st.label}
              </span>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: avatarColor(q.requestedBy) + "15",
                color: avatarColor(q.requestedBy),
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800,
              }}>{initials(q.requestedBy)}</div>
            </div>
          );
        })}
      </Card>

      {/* Footer */}
      <div style={{ marginTop: 36, paddingTop: 20, borderTop: `1px solid ${T.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 11, color: T.inkLight, fontWeight: 500 }}>Powered by IBC STEEL GROUP · © {new Date().getFullYear()}</div>
          <div style={{ fontSize: 12, color: T.accent, fontWeight: 700, letterSpacing: "0.01em" }}>Developed by Maria Camila Mesa</div>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {[
            { label: "Contratos", href: "/contracts" },
            { label: "Reportes", href: "/reports" },
            { label: "Dashboard", href: "/" },
          ].map(l => (
            <Link key={l.label} href={l.href} style={{ fontSize: 11, color: T.inkMuted, fontWeight: 600, textDecoration: "none", transition: "color 0.15s" }}>{l.label}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
