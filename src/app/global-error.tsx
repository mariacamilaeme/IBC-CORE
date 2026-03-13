"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            gap: 16,
            fontFamily: "system-ui, sans-serif",
            background: "#F5F3EF",
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 600, color: "#1E3A5F" }}>
            Error inesperado
          </h2>
          <p style={{ fontSize: 14, color: "#64748B" }}>
            La aplicaci&oacute;n encontr&oacute; un problema. Por favor recargue la p&aacute;gina.
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
      </body>
    </html>
  );
}
