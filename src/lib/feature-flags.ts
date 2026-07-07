// ─── Módulos ocultos temporalmente ──────────────────────────────
// Se ocultan de la navegación SIN borrar código, rutas ni datos.
// Para reactivar un módulo, elimina su nombre del listado y guarda.
// Ocultos desde jul 2026 a pedido de la analista de logística.

export const HIDDEN_MODULES = new Set<string>([
  "payments",   // Módulo de Pagos
  "quotations", // Módulo de Cotizaciones
]);

// Reportes ocultos del hub /reports y de su barra de pestañas
export const HIDDEN_REPORTS = new Set<string>([
  "payments",   // Reporte de Pagos
]);
