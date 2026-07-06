"use client";

import Link from "next/link";
import { useState } from "react";
import { Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function ImportStatusFab() {
  const { profile } = useAuth();
  const [hover, setHover] = useState(false);

  // Solo admin / directora pueden importar
  if (!profile || !["admin", "directora"].includes(profile.role)) return null;

  return (
    <Link
      href="/settings/import-status"
      title="Actualizar STATUS desde Excel"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        gap: hover ? 10 : 0,
        padding: hover ? "12px 18px 12px 14px" : "14px",
        borderRadius: 999,
        background: "linear-gradient(135deg, #083D6E, #0B5394)",
        color: "white",
        boxShadow: "0 8px 24px rgba(11,83,148,0.35), 0 2px 8px rgba(11,83,148,0.20)",
        textDecoration: "none",
        fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "0.01em",
        cursor: "pointer",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: hover ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      <Upload className="w-4 h-4" style={{ flexShrink: 0 }} />
      <span style={{
        overflow: "hidden",
        maxWidth: hover ? 200 : 0,
        whiteSpace: "nowrap",
        transition: "max-width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        Actualizar STATUS
      </span>
    </Link>
  );
}
