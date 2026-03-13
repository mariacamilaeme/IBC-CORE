"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  warning: "#DC8B0B",
  warningBg: "#FFF8EB",
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
  shadowLg: "0 4px 8px rgba(26,29,35,0.04), 0 16px 40px rgba(26,29,35,0.07)",
  radius: "18px",
  radiusMd: "14px",
  radiusSm: "10px",
};

// ─── SVG ICONS ───────────────────────────────────────────────
const I = {
  file: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>,
  chart: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
  factory: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/></svg>,
  table: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>,
  form: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>,
  download: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  chevR: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>,
  arrowR: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>,
  home: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>,
  contract: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 15 2 2 4-4"/></svg>,
  payment: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg>,
  invoice: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M4 2v20l4-2 4 2 4-2 4 2V2l-4 2-4-2-4 2Z"/><path d="M16 8h-6"/><path d="M14 12H8"/></svg>,
  quotation: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>,
};

// ─── MODULE CARD ─────────────────────────────────────────────
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
        animation: `rFadeUp 0.45s cubic-bezier(0.4,0,0.2,1) ${delay}ms both`,
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

export default function ReportsHubPage() {
  const router = useRouter();
  const [productionCount, setProductionCount] = useState(0);
  const [contractsCount, setContractsCount] = useState(0);
  const [paymentsCount, setPaymentsCount] = useState(0);
  const [invoicesCount, setInvoicesCount] = useState(0);
  const [quotationsCount, setQuotationsCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [prodRes, contRes, payRes, invRes] = await Promise.all([
          fetch("/api/contracts?status=EN PRODUCCIÓN&pageSize=1"),
          fetch("/api/contracts?pageSize=1"),
          fetch("/api/payments?pageSize=1"),
          fetch("/api/invoices?pageSize=1"),
        ]);
        if (prodRes.ok) { const j = await prodRes.json(); setProductionCount(j.count || 0); }
        if (contRes.ok) { const j = await contRes.json(); setContractsCount(j.count || 0); }
        if (payRes.ok) { const j = await payRes.json(); setPaymentsCount(j.count || 0); }
        if (invRes.ok) { const j = await invRes.json(); setInvoicesCount(j.count || 0); }
      } catch {
        // ignore
      }
      // Quotations come from localStorage / static data, so just set a placeholder
      try {
        const stored = localStorage.getItem("ibc-quotations-custom");
        const base = 171; // approximate base data count
        const custom = stored ? JSON.parse(stored).length : 0;
        setQuotationsCount(base + custom);
      } catch { /* ignore */ }
    };
    fetchCounts();
  }, []);

  return (
    <div style={{ fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif", width: "100%", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}>

      {/* Global keyframes */}
      <style>{`
        @keyframes rFadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes rFadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, animation: "rFadeIn 0.3s ease both", fontSize: 12.5, color: T.inkLight }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 4, color: T.accent, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>{I.home} Inicio</Link>
        <span style={{ color: T.inkGhost }}>/</span>
        <span style={{ fontWeight: 600, color: T.inkMuted }}>Reportes</span>
      </div>

      {/* Header Banner */}
      <div style={{
        position: "relative", overflow: "hidden", borderRadius: 14,
        background: "linear-gradient(135deg, #1E3A5F 0%, #2a4d7a 50%, #3B82F6 100%)",
        padding: "14px 24px", marginBottom: 16,
        boxShadow: "0 4px 24px rgba(30,58,95,0.18)",
        animation: "rFadeIn 0.4s ease both",
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
            }}>{I.chart}</div>
            <div>
              <h1 style={{
                fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                fontSize: 18, fontWeight: 800, color: "#fff",
                letterSpacing: "-0.02em", lineHeight: 1.2,
              }}>Reportes</h1>
              <p style={{ fontSize: 12, color: "rgba(191,219,254,0.7)", fontWeight: 500 }}>
                Reportes gerenciales y de producción
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Module Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
        <ModuleCard
          delay={300}
          href="/reports/status-production"
          icon={I.factory}
          accentColor={T.accent}
          title="Status Production"
          desc="Contratos en producción con datos de embarque, fechas estimadas y notas"
          tags={[
            { icon: I.table, label: "Datos en vivo" },
            { icon: I.form, label: "Edición inline" },
            { icon: I.download, label: "Excel" },
          ]}
          stat={String(productionCount)}
          statLabel="en producción"
        />
        <ModuleCard
          delay={400}
          href="/reports/contracts"
          icon={I.contract}
          accentColor={T.blue}
          title="Contratos"
          desc="Reporte completo de todos los contratos con estado, embarques y saldos"
          tags={[
            { icon: I.table, label: "Datos en vivo" },
            { icon: I.download, label: "Excel" },
          ]}
          stat={String(contractsCount)}
          statLabel="contratos"
        />
        <ModuleCard
          delay={500}
          href="/reports/payments"
          icon={I.payment}
          accentColor={T.success}
          title="Pagos"
          desc="Reporte de pagos, abonos, saldos pendientes e importaciones"
          tags={[
            { icon: I.table, label: "Datos en vivo" },
            { icon: I.download, label: "Excel" },
          ]}
          stat={String(paymentsCount)}
          statLabel="pagos"
        />
        <ModuleCard
          delay={600}
          href="/reports/invoices"
          icon={I.invoice}
          accentColor={T.violet}
          title="Facturas"
          desc="Facturas China y facturación comercial con estados de pago"
          tags={[
            { icon: I.table, label: "Datos en vivo" },
            { icon: I.download, label: "Excel" },
          ]}
          stat={String(invoicesCount)}
          statLabel="facturas"
        />
        <ModuleCard
          delay={700}
          href="/reports/quotations"
          icon={I.quotation}
          accentColor={T.orange}
          title="Cotizaciones"
          desc="Trazabilidad de cotizaciones con tiempos de respuesta y estado China"
          tags={[
            { icon: I.table, label: "Datos en vivo" },
            { icon: I.download, label: "Excel" },
          ]}
          stat={String(quotationsCount)}
          statLabel="cotizaciones"
        />
      </div>

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
    </div>
  );
}
