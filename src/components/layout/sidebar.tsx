"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useSidebarState } from "@/hooks/useSidebar";
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
  ChevronLeft,
  ChevronRight,
  Package,
  ClipboardList,
  BarChart3,
  Calendar,
  CreditCard,
  BookOpen,
} from "lucide-react";

import type { ModuleName } from "@/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  module?: ModuleName;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, module: "dashboard" },
  { label: "Contratos", href: "/contracts", icon: ClipboardList, module: "contracts" },
  { label: "Clientes", href: "/clients", icon: Users, module: "clients" },
  { label: "Cotizaciones", href: "/quotations", icon: FileText, module: "quotations" },
  { label: "Facturas", href: "/invoices", icon: Receipt, module: "invoices" },
  { label: "Packing List", href: "/packing-list-converter", icon: Package, module: "packing_list_converter" },
  { label: "Embarques", href: "/shipments", icon: Ship, module: "shipments" },
  { label: "Pagos", href: "/payments", icon: CreditCard, module: "payments" },
  { label: "Reportes", href: "/reports", icon: BarChart3, module: "reports" },
  { label: "Wiki", href: "/wiki", icon: BookOpen, module: "wiki" },
  { label: "Calendario", href: "/calendar", icon: Calendar, module: "calendar" },
  { label: "Configuración", href: "/settings", icon: Settings, module: "settings" },
];

export function Sidebar() {
  const { collapsed, toggle } = useSidebarState();
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const { canViewModule, loading: permLoading } = usePermissions();

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

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen flex flex-col sidebar-transition",
        "bg-gradient-to-b from-[#1a3a6b] via-[#1e3050] to-[#162240] text-white",
        "shadow-[4px_0_30px_-2px_rgba(10,20,45,0.45)]",
        "border-r border-white/[0.06]",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PHBhdGggZD0iTTM2IDE4YzMuMzE0IDAgNi0yLjY4NiA2LTZzLTIuNjg2LTYtNi02LTYgMi42ODYtNiA2IDIuNjg2IDYgNiA2ek0xOCAzNmMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNi02IDIuNjg2LTYgNiAyLjY4NiA2IDYgNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50 pointer-events-none" />

      {/* Logo */}
      <div className={cn(
        "relative flex items-center justify-center px-4 py-5 min-h-[80px]",
        collapsed ? "px-3" : "px-5"
      )}>
        <div className={cn(
          "relative flex-shrink-0 transition-all duration-300",
          collapsed ? "w-11 h-11" : "w-[180px] h-[52px]"
        )}>
          <Image
            src="/logo-ibc.png"
            alt="IBC Steel Group"
            fill
            className="object-contain brightness-0 invert drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
            priority
          />
        </div>
      </div>

      {/* Gradient divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-blue-300/20 to-transparent" />

      {/* Navigation */}
      <nav className="relative flex-1 py-4 px-2.5 space-y-1 overflow-y-auto sidebar-scroll">
        {filteredNav.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          const linkContent = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                active
                  ? "bg-white/[0.14] text-white shadow-lg shadow-blue-950/30 backdrop-blur-sm ring-1 ring-white/[0.12]"
                  : "text-white/80 hover:bg-white/[0.08] hover:text-white",
                collapsed && "justify-center px-2"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={cn(
                "flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-200 flex-shrink-0",
                active
                  ? "bg-blue-400/20 shadow-sm shadow-blue-500/10"
                  : "bg-transparent group-hover:bg-white/5"
              )}>
                <Icon className={cn("h-[18px] w-[18px]", active ? "text-blue-300" : "text-blue-300/50")} />
              </div>
              {!collapsed && <span className="animate-slide-in-left">{item.label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium rounded-lg shadow-lg">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return linkContent;
        })}
      </nav>

      {/* Collapse button */}
      <div className="relative px-2.5 py-2">
        <button
          onClick={toggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm text-blue-300/40 hover:bg-white/[0.08] hover:text-blue-100 transition-all duration-200"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span>Colapsar</span>}
        </button>
      </div>

      {/* Gradient divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-blue-300/20 to-transparent" />

      {/* User profile */}
      <div className={cn(
        "relative p-3 flex items-center gap-3",
        collapsed && "justify-center p-2"
      )}>
        <Avatar className="h-9 w-9 ring-2 ring-blue-400/30 flex-shrink-0 shadow-md shadow-blue-950/20">
          {profile?.avatar_url && (
            <AvatarImage src={profile.avatar_url} alt={profile.full_name} className="object-cover" />
          )}
          <AvatarFallback className="bg-gradient-to-br from-blue-400/40 to-blue-600/40 text-white text-xs font-bold backdrop-blur-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{profile?.full_name || "Usuario"}</p>
            <p className="text-[11px] text-blue-300/50 truncate font-medium">{ROLE_LABELS[userRole] || userRole}</p>
          </div>
        )}
        {!collapsed && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={signOut}
                className="p-1.5 rounded-lg text-blue-300/40 hover:bg-red-500/20 hover:text-red-300 transition-all duration-200"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="rounded-lg">Cerrar sesión</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Developer credit */}
      <div className={cn(
        "relative px-3 pb-4 text-center",
        collapsed && "px-1 pb-3"
      )}>
        {!collapsed ? (
          <div className="credit-card mx-1 px-4 py-3 rounded-xl border border-white/8 bg-white/5 backdrop-blur-sm">
            <p className="text-[10px] text-blue-200/30 uppercase tracking-[0.2em] mb-1 font-semibold">
              Desarrollado por
            </p>
            <p
              className="credit-name text-[13px] font-bold text-white/90 tracking-wide"
              style={{
                WebkitTextStroke: "0.3px rgba(147, 197, 253, 0.3)",
              }}
            >
              Maria Camila Mesa
            </p>
          </div>
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="credit-card mx-auto w-9 h-9 rounded-lg border border-white/8 bg-white/5 flex items-center justify-center cursor-default">
                <p className="credit-name text-[10px] font-bold text-white/80">MCM</p>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="rounded-lg">Desarrollado por: Maria Camila Mesa</TooltipContent>
          </Tooltip>
        )}
      </div>
    </aside>
  );
}
