"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { WelcomeAnimation } from "@/components/layout/welcome-animation";
import { SidebarProvider, useSidebarState } from "@/hooks/useSidebar";
import { useAuth } from "@/hooks/useAuth";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebarState();
  const pathname = usePathname();
  const isDashboard = pathname === "/";

  return (
    <div className="flex min-h-screen" style={{ background: "#F5F3EF" }}>
      <Sidebar />
      <div
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: collapsed ? 72 : 260 }}
      >
        {isDashboard && <Header />}
        <main className="px-6 py-4">
          {children}
        </main>
      </div>
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
