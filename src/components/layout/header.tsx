"use client";

import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { NotificationBell } from "@/components/layout/notification-bell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS } from "@/lib/utils";
import Link from "next/link";

const breadcrumbMap: Record<string, string> = {
  "/": "Dashboard",
  "/clients": "Clientes",
  "/quotations": "Cotizaciones",
  "/invoices": "Facturas",
  "/packing-lists": "Packing Lists",
  "/shipments": "Embarques",
  "/contracts": "Contratos",
  "/calendar": "Calendario",
  "/settings": "Configuración",
};

export function Header() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  const currentPage = breadcrumbMap[pathname] || "Inicio";
  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-sm">
        <Link href="/" className="text-slate-400 hover:text-[#1E3A5F] transition-colors font-medium">
          Inicio
        </Link>
        {pathname !== "/" && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            <span className="text-slate-800 font-semibold">{currentPage}</span>
          </>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <NotificationBell />

        {/* Divider */}
        <div className="h-8 w-px bg-slate-200/60" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100/80 transition-all duration-200">
              <Avatar className="h-8 w-8 ring-2 ring-slate-100">
                {profile?.avatar_url && (
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name} className="object-cover" />
                )}
                <AvatarFallback className="bg-gradient-to-br from-[#1E3A5F] to-blue-600 text-white text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-slate-700">{profile?.full_name || "Usuario"}</p>
                <p className="text-[11px] text-slate-400 font-medium">{ROLE_LABELS[profile?.role || "comercial"]}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-slate-200/80">
            <DropdownMenuItem asChild>
              <Link href="/settings">Mi perfil</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-red-600">
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
