"use client";

import { usePathname, useRouter } from "next/navigation";

// ─── DESIGN TOKENS ───────────────────────────────────────────
const T = {
  bg: "#F5F3EF",
  surface: "#FFFFFF",
  surfaceAlt: "#FAF9F7",
  ink: "#18191D",
  inkMuted: "#6B7080",
  inkLight: "#9CA3B4",
  accent: "#0B5394",
  accentLight: "#E8F0FE",
  border: "#E8E6E1",
  borderLight: "#F0EDE8",
  shadow: "0 1px 2px rgba(26,29,35,0.03), 0 2px 8px rgba(26,29,35,0.04)",
  radiusSm: "10px",
};

// ─── ICONS ───────────────────────────────────────────────────
const TabIcons = {
  statusProduction: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>,
  contracts: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 15 2 2 4-4"/></svg>,
  payments: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg>,
  invoices: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M4 2v20l4-2 4 2 4-2 4 2V2l-4 2-4-2-4 2Z"/><path d="M16 8h-6"/><path d="M14 12H8"/></svg>,
  quotations: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>,
  back: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>,
};

const TABS = [
  { key: "status-production", label: "Status Production", href: "/reports/status-production", icon: TabIcons.statusProduction },
  { key: "contracts", label: "Contratos", href: "/reports/contracts", icon: TabIcons.contracts },
  { key: "payments", label: "Pagos", href: "/reports/payments", icon: TabIcons.payments },
  { key: "invoices", label: "Facturas", href: "/reports/invoices", icon: TabIcons.invoices },
  { key: "quotations", label: "Cotizaciones", href: "/reports/quotations", icon: TabIcons.quotations },
] as const;

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const isHubPage = pathname === "/reports";

  return (
    <div style={{ minHeight: "100vh", width: "100%", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}>
      <div style={{ width: "100%", padding: isHubPage ? "0" : "0 0 40px" }}>

        {/* Sub-module tabs — only show when inside a sub-route */}
        {!isHubPage && (
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            marginBottom: 20,
            animation: "rFadeIn 0.3s ease both",
          }}>
            {/* Back button */}
            <button
              onClick={() => router.push("/reports")}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: T.radiusSm,
                background: "transparent", border: `1px solid transparent`,
                color: T.inkMuted, fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = T.surface; e.currentTarget.style.borderColor = T.borderLight; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
            >
              {TabIcons.back}
              Módulos
            </button>

            {/* Tab bar */}
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              background: T.surface, borderRadius: 14,
              border: `1px solid ${T.borderLight}`,
              boxShadow: T.shadow,
              padding: 3, flex: 1,
            }}>
              {TABS.map((tab) => {
                const isActive = pathname.startsWith(tab.href);
                return (
                  <button
                    key={tab.key}
                    onClick={() => router.push(tab.href)}
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      padding: "9px 20px", borderRadius: T.radiusSm,
                      border: "none",
                      background: isActive ? T.accent : "transparent",
                      color: isActive ? "#fff" : T.inkMuted,
                      fontWeight: isActive ? 700 : 500,
                      fontSize: 12.5, cursor: "pointer",
                      fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                      transition: "all 0.2s ease",
                      boxShadow: isActive ? `0 2px 8px ${T.accent}30` : "none",
                    }}
                    onMouseEnter={!isActive ? (e) => { e.currentTarget.style.background = T.surfaceAlt; e.currentTarget.style.color = T.ink; } : undefined}
                    onMouseLeave={!isActive ? (e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.inkMuted; } : undefined}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Content */}
        {children}

        <style>{`
          @keyframes rFadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      </div>
    </div>
  );
}
