"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { WelcomeAnimation } from "@/components/layout/welcome-animation";
import { ImportStatusFab } from "@/components/layout/import-status-fab";
import { SidebarProvider } from "@/hooks/useSidebar";
import { useAuth } from "@/hooks/useAuth";

function DashboardContent({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen"
      style={{
        // Acero azul calmado con luces suaves — sin patrones
        background: [
          "radial-gradient(1100px 620px at 88% -12%, rgba(11,83,148,0.08), transparent 60%)",
          "radial-gradient(900px 520px at -8% 112%, rgba(0,184,224,0.06), transparent 60%)",
          "linear-gradient(160deg, #EAF2FA 0%, #F2F7FB 45%, #EDF4F9 75%, #E9F1F8 100%)",
        ].join(", "),
      }}
    >
      <Sidebar />
      <div
        className="flex-1 min-w-0"
      >
        <main className="px-6 py-4">
          {children}
        </main>
      </div>
      <ImportStatusFab />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    // Show welcome animation on first load or refresh
    const lastShown = sessionStorage.getItem("ibc-welcome-shown");
    if (!lastShown) {
      setShowWelcome(true);
      sessionStorage.setItem("ibc-welcome-shown", "true");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1E3A5F] border-t-transparent" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      {showWelcome && <WelcomeAnimation />}
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
