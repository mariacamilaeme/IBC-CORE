// Reglas compartidas para agrupar contratos por comercial en los reportes.

/** Clientes que, además de su comercial asignado, también deben salir en el reporte de otro comercial. */
export const EXTRA_COMMERCIALS_BY_CLIENT: { clientMatch: RegExp; commercial: string }[] = [
  { clientMatch: /TUBOLAMINAS/, commercial: "CAROLINA AVENDAÑO" },
];

export const normalizeText = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();

/** Comerciales en cuyo reporte debe aparecer un contrato (el asignado + los extra por cliente). */
export function commercialsFor(c: { commercial_name?: string | null; client_name?: string | null }): string[] {
  const own = (c.commercial_name || "Sin comercial").trim();
  const out = [own];
  const client = normalizeText(c.client_name || "");
  for (const extra of EXTRA_COMMERCIALS_BY_CLIENT) {
    if (extra.clientMatch.test(client) && normalizeText(own) !== normalizeText(extra.commercial)) {
      out.push(extra.commercial);
    }
  }
  return out;
}
