"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  Ship,
  Settings,
  LogOut,
  Package,
  ClipboardList,
  BarChart3,
  Calendar,
  CreditCard,
  BookOpen,
} from "lucide-react";

import type { ModuleName } from "@/types";

// ── Paleta del casco (hull steel) ───────────────────────────
const BEACON = "#00B8E0";      // cian instrumental — único acento
const HULL_LINE = "rgba(148,196,235,0.10)";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  module?: ModuleName;
  group?: "main" | "tools" | "system";
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, module: "dashboard", group: "main" },
  { label: "Contratos", href: "/contracts", icon: ClipboardList, module: "contracts", group: "main" },
  { label: "Clientes", href: "/clients", icon: Users, module: "clients", group: "main" },
  { label: "Cotizaciones", href: "/quotations", icon: FileText, module: "quotations", group: "main" },
  { label: "Facturas", href: "/invoices", icon: Receipt, module: "invoices", group: "main" },
  { label: "Packing List", href: "/packing-list-converter", icon: Package, module: "packing_list_converter", group: "tools" },
  { label: "Embarques", href: "/shipments", icon: Ship, module: "shipments", group: "tools" },
  { label: "Pagos", href: "/payments", icon: CreditCard, module: "payments", group: "tools" },
  { label: "Reportes", href: "/reports", icon: BarChart3, module: "reports", group: "tools" },
  { label: "Wiki", href: "/wiki", icon: BookOpen, module: "wiki", group: "system" },
  { label: "Calendario", href: "/calendar", icon: Calendar, module: "calendar", group: "system" },
  { label: "Configuración", href: "/settings", icon: Settings, module: "settings", group: "system" },
];

const GROUP_LABELS: Record<string, string> = {
  main: "Operación",
  tools: "Logística",
  system: "Sistema",
};

export function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const { canViewModule } = usePermissions();

  const userRole = profile?.role || "comercial";
  const filteredNav = navItems.filter((item) => {
    if (!item.module) return true;
    return canViewModule(item.module);
  });

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  const mainItems = filteredNav.filter((i) => i.group === "main");
  const toolItems = filteredNav.filter((i) => i.group === "tools");
  const systemItems = filteredNav.filter((i) => i.group === "system");

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);

    return (
      <Tooltip key={item.href} delayDuration={0}>
        <TooltipTrigger asChild>
          <Link
            href={item.href}
            className={cn(
              "sb-item group relative flex items-center gap-2.5 rounded-lg text-[13px] transition-all duration-200",
              active
                ? "text-white font-semibold"
                : "text-white/45 font-medium hover:bg-white/[0.05] hover:text-white/85"
            )}
            style={active ? { background: "rgba(255,255,255,0.06)" } : undefined}
          >
            {/* Barra de rumbo activa — un solo acento cian */}
            {active && (
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] rounded-r-full"
                style={{
                  height: "58%",
                  background: BEACON,
                  boxShadow: `0 0 10px ${BEACON}66`,
                }}
              />
            )}
            <div className="sb-icon flex items-center justify-center rounded-md flex-shrink-0">
              <Icon
                className="sb-icon-svg transition-colors duration-200"
                strokeWidth={active ? 2 : 1.5}
                style={{ color: active ? BEACON : undefined }}
              />
            </div>
            <span className="sidebar-label truncate">{item.label}</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium rounded-lg shadow-lg sidebar-tooltip">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  };

  // Encabezado de grupo: línea + etiqueta mono (visible al expandir)
  const renderGroupHeader = (group: string) => (
    <div className="relative flex items-center gap-2 px-2 pt-3 pb-1 select-none">
      <span
        className="sidebar-label text-[8.5px] font-semibold uppercase"
        style={{
          fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
          letterSpacing: "0.22em",
          color: "rgba(148,196,235,0.40)",
        }}
      >
        {GROUP_LABELS[group]}
      </span>
      <div className="flex-1" style={{ height: 1, background: HULL_LINE }} />
    </div>
  );

  return (
    <aside
      className={cn(
        "sticky left-0 top-0 z-40 h-screen flex-shrink-0 flex flex-col sidebar-transition",
        "text-white"
      )}
      style={{
        background: "linear-gradient(180deg, #050F1B 0%, #081C30 55%, #061524 100%)",
        borderRight: `1px solid ${HULL_LINE}`,
        boxShadow: "6px 0 28px rgba(3,10,18,0.45)",
      }}
    >
      {/* ═══ Capa decorativa: acero pulido, sin patrones ═══ */}

      {/* Brillo diagonal — lámina de acero */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(115deg, transparent 0%, rgba(148,196,235,0.05) 32%, rgba(148,196,235,0.02) 46%, transparent 60%)",
        }}
      />

      {/* Resplandor de profundidad, arriba y abajo */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: "100%", height: "34%", top: 0,
          background: "radial-gradient(ellipse at 30% 10%, rgba(11,83,148,0.20) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: "100%", height: "30%", bottom: 0,
          background: "radial-gradient(ellipse at 60% 90%, rgba(0,184,224,0.08) 0%, transparent 70%)",
        }}
      />

      {/* Hairline cian en el borde derecho */}
      <div
        className="absolute right-0 top-0 bottom-0 w-px pointer-events-none"
        style={{
          background: `linear-gradient(180deg, transparent 0%, ${BEACON}33 30%, ${BEACON}18 60%, transparent 100%)`,
        }}
      />

      {/* ═══ Logo ═══ */}
      <div className="relative flex items-center justify-center sb-logo-area">
        <div className="relative flex-shrink-0 sidebar-logo">
          <Image
            src="/logo-ibc.png"
            alt="IBC Steel Group"
            fill
            className="object-contain brightness-0 invert drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
            priority
          />
        </div>
      </div>

      {/* Separador con etiqueta de sistema */}
      <div className="relative mx-3 flex items-center gap-2">
        <div className="flex-1" style={{ height: 1, background: `linear-gradient(90deg, ${HULL_LINE}, transparent)` }} />
      </div>

      {/* ═══ Navegación ═══ */}
      <nav className="relative flex-1 overflow-y-auto sidebar-scroll sb-nav">
        {renderGroupHeader("main")}
        <div className="sb-group">{mainItems.map(renderNavItem)}</div>

        {toolItems.length > 0 && (
          <>
            {renderGroupHeader("tools")}
            <div className="sb-group">{toolItems.map(renderNavItem)}</div>
          </>
        )}

        {systemItems.length > 0 && (
          <>
            {renderGroupHeader("system")}
            <div className="sb-group">{systemItems.map(renderNavItem)}</div>
          </>
        )}
      </nav>

      {/* ═══ Perfil de usuario ═══ */}
      <div className="relative sb-user" style={{ borderTop: `1px solid ${HULL_LINE}` }}>
        <div className="flex items-center gap-2.5">
          <Avatar className="sb-avatar flex-shrink-0" style={{ boxShadow: `0 0 0 1.5px rgba(0,184,224,0.25)` }}>
            {profile?.avatar_url && (
              <AvatarImage src={profile.avatar_url} alt={profile.full_name} className="object-cover" />
            )}
            <AvatarFallback
              className="text-white text-[10px] font-bold"
              style={{ background: "linear-gradient(135deg, rgba(11,83,148,0.55), rgba(0,184,224,0.35))" }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="sidebar-label flex-1 min-w-0 flex items-center gap-1.5">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate leading-tight">{profile?.full_name || "Usuario"}</p>
              <p
                className="text-[9px] truncate leading-tight uppercase"
                style={{
                  fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                  letterSpacing: "0.14em",
                  color: "rgba(148,196,235,0.45)",
                }}
              >
                {ROLE_LABELS[userRole] || userRole}
              </p>
            </div>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={signOut}
                  className="p-1 rounded-md text-white/25 hover:bg-red-500/15 hover:text-red-400 transition-all duration-200"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="rounded-lg">Cerrar sesión</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* ═══ Placa de acero: crédito + coordenadas ═══ */}
      <div className="relative text-center sb-credit">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <div
              className="mx-auto sb-credit-badge rounded-md flex items-center justify-center cursor-default sidebar-credit-collapsed"
              style={{
                border: `1px solid ${HULL_LINE}`,
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <p
                className="text-[9px] font-bold"
                style={{
                  fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                  color: BEACON,
                }}
              >
                MCM
              </p>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="rounded-lg sidebar-tooltip">Desarrollado por: Maria Camila Mesa</TooltipContent>
        </Tooltip>
        <div
          className="mx-1.5 px-3 py-2.5 rounded-lg sidebar-credit-expanded"
          style={{ border: `1px solid ${HULL_LINE}`, background: "rgba(255,255,255,0.025)" }}
        >
          <p
            style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", letterSpacing: "0.2em" }}
            className="text-[8.5px] text-white/25 uppercase mb-1 font-medium"
          >
            Desarrollado por
          </p>
          <p className="text-[12px] font-bold tracking-wide text-white/85">
            Maria Camila Mesa
          </p>
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <span
              style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", color: "rgba(148,196,235,0.40)" }}
              className="text-[8.5px] font-medium"
            >
              IBC CORE v1.0 · 4.71°N 74.07°W
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
