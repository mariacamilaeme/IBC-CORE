// Término / vencimiento de pago especial del contrato (columna JPB del Excel STATUS).
//
// Ejemplos reales en la columna:
//   "60 días BL"                        → crédito a 60 días de la fecha del BL, aún sin fecha
//   "60 días BL - 7 NOV"                → crédito 60 días BL, vence el 7 de noviembre
//   "Fecha de vencimiento 4 diciembre"  → vence el 4 de diciembre
//   (también puede venir una fecha de Excel o "07/11/2026")
//
// Sin anotación, el pago vence en el deadline de la motonave (ETA − N días).

const MONTHS: Record<string, number> = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7,
  ago: 8, aug: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12,
};

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const validDate = (y: number, m: number, d: number) => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

/** Limpia el valor crudo de la columna JPB. Descarta marcas sin significado ("OK", "N/A", "c"...). */
export function cleanPaymentTerms(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "number") {
    // Fecha escrita como fecha en Excel (serial)
    if (raw > 30000 && raw < 80000) {
      const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
      return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    }
    return null;
  }
  if (raw instanceof Date) return iso(raw.getUTCFullYear(), raw.getUTCMonth() + 1, raw.getUTCDate());
  if (typeof raw !== "string") return null;
  const s = raw.replace(/ /g, " ").replace(/\s+/g, " ").trim();
  if (!s) return null;
  // Solo nos interesa si habla de días, BL, vencimiento, crédito o trae una fecha.
  if (!/\d|d[ií]as|\bbl\b|venc|cr[eé]dit/i.test(s)) return null;
  return s;
}

/** ¿El término es a crédito contado desde el BL (p. ej. "60 días BL")? */
export const isBLCredit = (terms: string | null | undefined) => !!terms && /\bbl\b/i.test(terms) && /d[ií]as/i.test(terms);

/** Días de crédito indicados ("60 días BL" → 60). */
export const creditDays = (terms: string | null | undefined): number | null => {
  const m = terms?.match(/(\d{1,3})\s*d[ií]as/i);
  return m ? Number(m[1]) : null;
};

/**
 * Fecha de vencimiento de pago (ISO) anotada en el término, o null si no trae fecha.
 * Si la fecha no trae año se toma el más cercano a la fecha de referencia (ETA).
 */
export function paymentDueDate(terms: string | null | undefined, refISO?: string | null): string | null {
  if (!terms) return null;
  const s = terms.trim();

  // ISO directo (2026-11-07)
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m && validDate(+m[1], +m[2], +m[3])) return iso(+m[1], +m[2], +m[3]);

  // dd/mm/yyyy · dd-mm-yy · dd.mm.yyyy (sin confundir "60 días")
  m = s.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/);
  if (m) {
    const d = +m[1], mo = +m[2];
    const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : inferYear(mo, d, refISO);
    if (validDate(y, mo, d)) return iso(y, mo, d);
  }

  // "7 NOV", "4 diciembre", "7 de noviembre de 2026"
  // Se recorren todas las coincidencias: en "60 días BL - 7 NOV" la primera es "60 días".
  for (const mm of s.matchAll(/\b(\d{1,2})\s*(?:de\s+)?([a-záéíóú]{3,})\.?(?:\s*(?:de|del)?\s*(\d{4}))?/gi)) {
    const mo = MONTHS[mm[2].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").slice(0, 3)];
    if (!mo) continue;
    const d = +mm[1];
    const y = mm[3] ? +mm[3] : inferYear(mo, d, refISO);
    if (validDate(y, mo, d)) return iso(y, mo, d);
  }
  return null;
}

function inferYear(month: number, day: number, refISO?: string | null): number {
  const ref = refISO ? new Date(refISO.split("T")[0] + "T00:00:00Z") : new Date();
  const base = isNaN(ref.getTime()) ? new Date() : ref;
  const y = base.getUTCFullYear();
  // Año que deja la fecha más cerca de la referencia (un vencimiento suele caer cerca del ETA)
  let best = y, bestDiff = Infinity;
  for (const cand of [y - 1, y, y + 1]) {
    const diff = Math.abs(Date.UTC(cand, month - 1, day) - base.getTime());
    if (diff < bestDiff) { best = cand; bestDiff = diff; }
  }
  return best;
}

/** Texto corto para mostrar en reportes cuando aún no hay fecha (p. ej. "60 días BL · falta fecha BL"). */
export function pendingTermsLabel(terms: string | null | undefined): string | null {
  if (!terms) return null;
  if (isBLCredit(terms)) {
    const d = creditDays(terms);
    return `${d ?? ""} días BL · falta fecha BL`.trim();
  }
  return terms;
}
