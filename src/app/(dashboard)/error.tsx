"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "50vh",
        gap: 16,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "#FEE2E2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
        }}
      >
        !
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1E3A5F" }}>
        Algo sali&oacute; mal
      </h2>
      <p style={{ fontSize: 14, color: "#64748B", maxWidth: 400, textAlign: "center" }}>
        Ocurri&oacute; un error inesperado. Por favor intente de nuevo.
      </p>
      <button
        onClick={reset}
        style={{
          padding: "10px 24px",
          background: "#1E3A5F",
          color: "white",
          border: "none",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Reintentar
      </button>
    </div>
  );
}
