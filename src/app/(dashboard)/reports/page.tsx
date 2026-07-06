"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { T } from "@/lib/design-tokens";

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
  docTracking: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/></svg>,
  clients: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  cartera: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-3a2 2 0 0 1 0-4h4"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>,
  briefcase: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  upload: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
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
        background: T.glassBg,
        backdropFilter: T.glassBlur,
        border: `1px solid ${T.glassBorder}`,
        boxShadow: T.shadowGlass,
        cursor: "pointer",
        overflow: "hidden",
        animation: `rFadeUp 0.45s cubic-bezier(0.4,0,0.2,1) ${delay}ms both`,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accentColor + "30";
        e.currentTarget.style.boxShadow = `0 6px 24px ${accentColor}12, 0 2px 8px rgba(11,83,148,0.04)`;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = T.glassBorder;
        e.currentTarget.style.boxShadow = T.shadowGlass;
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
  const [clientsCount, setClientsCount] = useState(0);
  const [paymentsCount, setPaymentsCount] = useState(0);
  const [invoicesCount, setInvoicesCount] = useState(0);
  const [quotationsCount, setQuotationsCount] = useState(0);
  const [docTrackingCount, setDocTrackingCount] = useState(0);
  const [carteraTotal, setCarteraTotal] = useState(0);
  const [commercialsCount, setCommercialsCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [prodRes, contRes, payRes, invRes, docTrackRes, filtersRes] = await Promise.all([
          fetch("/api/contracts?status=EN PRODUCCIÓN&pageSize=1"),
          fetch("/api/contracts?pageSize=1"),
          fetch("/api/payments?pageSize=1"),
          fetch("/api/invoices?pageSize=1"),
          fetch("/api/contracts?status=EN TRÁNSITO,EN PRODUCCIÓN&pageSize=5000"),
          fetch("/api/contracts/filters"),
        ]);
        if (prodRes.ok) { const j = await prodRes.json(); setProductionCount(j.count || 0); }
        if (contRes.ok) { const j = await contRes.json(); setContractsCount(j.count || 0); }
        if (filtersRes.ok) {
          const j = await filtersRes.json();
          setClientsCount((j.client_names || []).length);
          setCommercialsCount((j.commercial_names || []).length);
        }
        if (payRes.ok) { const j = await payRes.json(); setPaymentsCount(j.count || 0); }
        if (invRes.ok) { const j = await invRes.json(); setInvoicesCount(j.count || 0); }
        // Doc tracking: EN TRÁNSITO/PRODUCCIÓN con documentos pendientes,
        // o con motonave asignada y aún sin enviar documentos.
        if (docTrackRes.ok) {
          const all = (await docTrackRes.json()).data || [];
          const hasPending = (v: string | null | undefined) => !!v && v.trim() !== "" && v !== "Todos enviados";
          const count = all.filter((c: { status?: string | null; documents_sent?: string | null; documents_pending?: string | null; vessel_name?: string | null }) => {
            const isTransit = c.status === "EN TRÁNSITO";
            const isProduction = c.status === "EN PRODUCCIÓN";
            if (!isTransit && !isProduction) return false;
            const hasPendingDocs = hasPending(c.documents_pending);
            const hasSentDocs = !!c.documents_sent && c.documents_sent.trim() !== "";
            const hasVesselNoDocs = !!c.vessel_name && c.vessel_name.trim() !== "" && !hasSentDocs;
            if (isTransit) return hasPendingDocs || hasVesselNoDocs;
            return hasPendingDocs && hasSentDocs;
          }).length;
          setDocTrackingCount(count);
          // Cartera = saldo pendiente por cobrar en tránsito
          const cartera = all
            .filter((c: { status?: string | null; pending_client_amount?: number | null }) => c.status === "EN TRÁNSITO" && (c.pending_client_amount ?? 0) > 0)
            .reduce((s: number, c: { pending_client_amount?: number | null }) => s + (c.pending_client_amount ?? 0), 0);
          setCarteraTotal(cartera);
        }
      } catch (err) {
        console.error("Error fetching report counts:", err);
      }
      // Quotations come from localStorage / static data, so just set a placeholder
      try {
        const stored = localStorage.getItem("ibc-quotations-custom");
        const base = 171; // approximate base data count
        const custom = stored ? JSON.parse(stored).length : 0;
        setQuotationsCount(base + custom);
      } catch (err) { console.error("Error reading quotation counts:", err); }
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
        background: T.gradientPrimary,
        padding: "14px 24px", marginBottom: 16,
        boxShadow: T.shadowGlass,
        animation: "rFadeIn 0.4s ease both",
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
            }}>{I.chart}</div>
            <div>
              <h1 style={{
                fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                fontSize: 22, fontWeight: 700, color: "#fff",
                letterSpacing: "-0.3px", lineHeight: 1.2,
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
          href="/reports/clients"
          icon={I.clients}
          accentColor={T.teal}
          title="Clientes"
          desc="Contratos agrupados por cliente con filtros, seleccion de campos y exportacion"
          tags={[
            { icon: I.table, label: "Datos en vivo" },
            { icon: I.form, label: "Filtros" },
            { icon: I.download, label: "Excel / PDF" },
          ]}
          stat={String(clientsCount)}
          statLabel="clientes"
        />
        <ModuleCard
          delay={550}
          href="/reports/status-commercial"
          icon={I.briefcase}
          accentColor={T.violet}
          title="Status por Comercial"
          desc="Descarga individual por comercial con producción, embarques, documentos y saldos"
          tags={[
            { icon: I.table, label: "Por comercial" },
            { icon: I.download, label: "Excel" },
          ]}
          stat={String(commercialsCount)}
          statLabel="comerciales"
        />
        <ModuleCard
          delay={575}
          href="/reports/cartera"
          icon={I.cartera}
          accentColor={T.warning}
          title="Cartera"
          desc="Cuentas por cobrar: saldos pendientes, deadline de pago y estado (atrasado/al día)"
          tags={[
            { icon: I.table, label: "Datos en vivo" },
            { icon: I.form, label: "Filtros" },
            { icon: I.download, label: "Excel / PDF" },
          ]}
          stat={carteraTotal >= 1_000_000 ? `$${(carteraTotal / 1_000_000).toFixed(2)}M` : carteraTotal >= 1_000 ? `$${(carteraTotal / 1_000).toFixed(0)}K` : `$${carteraTotal.toFixed(0)}`}
          statLabel="por cobrar"
        />
        <ModuleCard
          delay={650}
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
          delay={700}
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
          delay={800}
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
        <ModuleCard
          delay={900}
          href="/reports/document-tracking"
          icon={I.docTracking}
          accentColor={T.teal}
          title="Documentos"
          desc="Seguimiento de documentos enviados y pendientes por embarque"
          tags={[
            { icon: I.table, label: "Datos en vivo" },
            { icon: I.download, label: "Excel" },
          ]}
          stat={String(docTrackingCount)}
          statLabel="embarques"
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
