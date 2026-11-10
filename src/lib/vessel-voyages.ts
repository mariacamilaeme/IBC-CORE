// ── Viajes por motonave ─────────────────────────────────────────────────────
// Una misma motonave puede volver en un viaje posterior: mismo nombre pero
// ETAs muy separadas. Si la brecha entre ETAs consecutivas supera el umbral,
// se trata como un viaje distinto y se etiqueta "NOMBRE · VIAJE 2", etc.
// Usado por el módulo de embarques y el reporte de cartera.

import type { Contract } from "@/types";

export const VOYAGE_GAP_DAYS = 45;

const onlyDate = (d: string) => d.split("T")[0];
const parseUTC = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const [y, m, d] = onlyDate(iso).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
};

// Mapa contractId → etiqueta de motonave con viaje ("BEAUTY PEPPA · VIAJE 2").
// Si la motonave solo tiene un viaje, la etiqueta es el nombre a secas.
// Contratos sin ETA quedan con el nombre a secas.
export function buildVesselLabels(contracts: Contract[]): Map<string, string> {
  const byVessel = new Map<string, Contract[]>();
  for (const c of contracts) {
    const name = (c.vessel_name || "").trim().toUpperCase().replace(/\s+/g, " ");
    if (!name || !c.id) continue;
    if (!byVessel.has(name)) byVessel.set(name, []);
    byVessel.get(name)!.push(c);
  }
  const labels = new Map<string, string>();
  for (const [name, list] of byVessel) {
    const dated = list
      .filter((c) => parseUTC(c.eta_final))
      .sort((a, b) => onlyDate(a.eta_final!).localeCompare(onlyDate(b.eta_final!)));
    const undated = list.filter((c) => !parseUTC(c.eta_final));
    const clusters: Contract[][] = [];
    for (const c of dated) {
      const last = clusters[clusters.length - 1];
      if (last) {
        const prev = parseUTC(last[last.length - 1].eta_final)!;
        const gap = (parseUTC(c.eta_final)!.getTime() - prev.getTime()) / 86400000;
        if (gap <= VOYAGE_GAP_DAYS) { last.push(c); continue; }
      }
      clusters.push([c]);
    }
    const multi = clusters.length > 1;
    clusters.forEach((cl, i) => cl.forEach((c) => labels.set(c.id!, multi ? `${name} · VIAJE ${i + 1}` : name)));
    undated.forEach((c) => labels.set(c.id!, name));
  }
  return labels;
}
