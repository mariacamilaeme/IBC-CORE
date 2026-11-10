import type { Contract } from "@/types";
import { commercialsFor } from "@/lib/commercial-assign";
import { paymentDueDate, isBLCredit, pendingTermsLabel } from "@/lib/payment-terms";

// El cliente debe pagar el saldo X días antes del ETA (misma regla del reporte de Cartera).
export const DEADLINE_DAYS = 15;

export type EstadoPago = "ATRASADO" | "ADELANTADO" | "CREDITO_BL" | "SIN_ETA";

export const ESTADO_LABEL: Record<EstadoPago, string> = {
  ATRASADO: "Atrasado",
  ADELANTADO: "Adelantado",
  CREDITO_BL: "Crédito · falta fecha BL",
  SIN_ETA: "Pendiente confirmar llegada motonave",
};

export type TransitRow = {
  c: Contract;
  amount: number | null;
  eta: string | null;
  mvDeadline: string | null;   // deadline motonave = ETA − DEADLINE_DAYS
  deadline: string | null;     // vencimiento del pago: fecha JPB o, si no hay, deadline motonave
  special: boolean;            // el vencimiento viene de la anotación JPB
  pendingLabel: string | null; // "60 días BL · falta fecha BL"
  terms: string | null;        // texto original JPB
  daysLate: number | null; // fecha de corte − vencimiento (positivo = atrasado)
  estado: EstadoPago;
};

export type AdvanceRow = { c: Contract; daysElapsed: number | null };

export type CommercialPagos = {
  name: string;
  transit: TransitRow[];
  advances: AdvanceRow[];
  total: number;
  atrasado: number;
  adelantado: number;
  sinEta: number;
  credito: number; // crédito BL aún sin fecha de vencimiento
  sinValor: number; // contratos con saldo pendiente pero sin valor cargado
};

// ---------------------------------------------------------------------------
// Fechas (UTC-safe, ISO yyyy-mm-dd)
// ---------------------------------------------------------------------------

export const onlyDate = (d: string) => d.split("T")[0];
export const parseUTC = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const [y, m, d] = onlyDate(iso).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
};
export const isoFromDate = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
export const todayISO = () => {
  const n = new Date();
  return isoFromDate(new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())));
};
const diffDays = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 86400000);

export const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  const p = onlyDate(d).split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
};
export const fmtMoney = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtMoneyShort = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return "$" + (n / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 }) + "M";
  if (Math.abs(n) >= 1_000) return "$" + (n / 1_000).toLocaleString("en-US", { maximumFractionDigits: 0 }) + "K";
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
};

// ---------------------------------------------------------------------------
// Reglas de negocio
// ---------------------------------------------------------------------------

const up = (s: string | null | undefined) => (s || "").trim().toUpperCase();

/** Pedido en tránsito con saldo del cliente pendiente o abonado. */
export const isTransitPending = (c: Contract) =>
  c.status === "EN TRÁNSITO" &&
  ((c.pending_client_amount ?? 0) > 0 || ["PENDIENTE", "ABONO"].includes(up(c.balance_paid)));

/** Contrato vivo cuyo anticipo del cliente aún no se ha recibido. */
export const isAdvancePending = (c: Contract) =>
  c.status !== "ANULADO" &&
  c.status !== "ENTREGADO AL CLIENTE" &&
  (c.status === "PENDIENTE ANTICIPO" || ["NO", "PENDIENTE"].includes(up(c.advance_paid)));

export function buildTransitRow(c: Contract, corte: Date): TransitRow {
  const eta = c.eta_final || c.eta_initial || null;
  const etaD = parseUTC(eta);
  let mvDeadline: string | null = null;
  if (etaD) {
    const dl = new Date(etaD.getTime());
    dl.setUTCDate(dl.getUTCDate() - DEADLINE_DAYS);
    mvDeadline = isoFromDate(dl);
  }
  const terms = c.payment_terms?.trim() || null;
  const due = paymentDueDate(terms, eta);
  const pendingCredit = !due && isBLCredit(terms);
  const deadline = due ?? (pendingCredit ? null : mvDeadline);
  const base = {
    c, amount: c.pending_client_amount, eta: eta ? onlyDate(eta) : null, mvDeadline, deadline,
    special: !!due, pendingLabel: pendingCredit ? pendingTermsLabel(terms) : null, terms,
  };
  if (!deadline) return { ...base, daysLate: null, estado: pendingCredit ? "CREDITO_BL" : "SIN_ETA" };
  const daysLate = diffDays(corte, parseUTC(deadline)!);
  return { ...base, daysLate, estado: daysLate > 0 ? "ATRASADO" : "ADELANTADO" };
}

export function groupByCommercial(contracts: Contract[], corteISO: string): CommercialPagos[] {
  const corte = parseUTC(corteISO) ?? parseUTC(todayISO())!;
  const map = new Map<string, CommercialPagos>();
  const get = (name: string) => {
    if (!map.has(name)) map.set(name, { name, transit: [], advances: [], total: 0, atrasado: 0, adelantado: 0, sinEta: 0, credito: 0, sinValor: 0 });
    return map.get(name)!;
  };

  for (const c of contracts) {
    if (c.is_active === false) continue;
    const transit = isTransitPending(c);
    const advance = !transit && isAdvancePending(c);
    if (!transit && !advance) continue;
    for (const name of commercialsFor(c)) {
      const g = get(name);
      if (transit) {
        const r = buildTransitRow(c, corte);
        g.transit.push(r);
        const a = r.amount ?? 0;
        if (r.amount == null || r.amount <= 0) g.sinValor += 1;
        g.total += a;
        if (r.estado === "ATRASADO") g.atrasado += a;
        else if (r.estado === "ADELANTADO") g.adelantado += a;
        else if (r.estado === "CREDITO_BL") g.credito += a;
        else g.sinEta += a;
      } else {
        const d = parseUTC(c.contract_date);
        g.advances.push({ c, daysElapsed: d ? diffDays(corte, d) : null });
      }
    }
  }

  const order: Record<EstadoPago, number> = { ATRASADO: 0, ADELANTADO: 1, CREDITO_BL: 2, SIN_ETA: 3 };
  for (const g of map.values()) {
    g.transit.sort((a, b) => order[a.estado] - order[b.estado] || (b.daysLate ?? -1e9) - (a.daysLate ?? -1e9) || (b.amount ?? 0) - (a.amount ?? 0));
    g.advances.sort((a, b) => (b.daysElapsed ?? -1) - (a.daysElapsed ?? -1));
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}
