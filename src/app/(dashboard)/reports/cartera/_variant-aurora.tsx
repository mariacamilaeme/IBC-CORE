"use client";

import { useState, useMemo } from "react";
import { Loader2, Wallet, ChevronDown } from "lucide-react";
import {
  type CarteraData, type Group, type EstadoCartera,
  ESTADO_META, fmtMoney, fmtMoneyShort, fmtNum, fmtDate, deadlineISO, isoFromDate, DEADLINE_DAYS, EstadoBadge,
} from "./_core";
import { T } from "@/lib/design-tokens";

const AG2 = { porVencer: "#16A34A", d0_30: "#CA8A04", d31_60: "#F97316", d60: "#DC2626", sinFecha: "#C0C7D0" };

// High-impact donut: gradients, rounded segment caps, gap, glow
function ImpactDonut({ atrasado, porVencer, sinFecha, size = 178 }: { atrasado: number; porVencer: number; sinFecha: number; size?: number }) {
  const total = atrasado + porVencer + sinFecha || 1;
  const stroke = 15;
  const r = (size - stroke) / 2 - 7;
  const cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
  const pct = Math.round((atrasado / total) * 100);
  const segs = [{ v: atrasado, id: "cgA" }, { v: porVencer, id: "cgP" }, { v: sinFecha, id: "cgS" }].filter((s) => s.v > 0);
  const gap = segs.length > 1 ? 20 : 0;
  let acc = 0;
  return (
    <svg width={size} height={size} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id="cgA" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FF9A9A" /><stop offset="100%" stopColor="#E11D48" /></linearGradient>
        <linearGradient id="cgP" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#7DEAB0" /><stop offset="100%" stopColor="#16A34A" /></linearGradient>
        <linearGradient id="cgS" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="rgba(255,255,255,0.55)" /><stop offset="100%" stopColor="rgba(255,255,255,0.3)" /></linearGradient>
        <filter id="cdGlow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#03101F" floodOpacity="0.5" /></filter>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={stroke} />
      <g transform={`rotate(-90 ${cx} ${cy})`} filter="url(#cdGlow)">
        {segs.map((s) => {
          const len = (s.v / total) * circ;
          const dash = Math.max(len - gap, 1.5);
          const el = <circle key={s.id} cx={cx} cy={cy} r={r} fill="none" stroke={`url(#${s.id})`} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-acc} style={{ transition: "stroke-dasharray 0.7s cubic-bezier(0.4,0,0.2,1), stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1)" }} />;
          acc += len;
          return el;
        })}
      </g>
      <text x={cx} y={cy - 3} textAnchor="middle" style={{ fontSize: 40, fontWeight: 800, fill: "#fff", fontFamily: "var(--font-jetbrains-mono), monospace", letterSpacing: "-0.04em" }}>{pct}%</text>
      <text x={cx} y={cy + 18} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: "rgba(255,255,255,0.6)", letterSpacing: "0.2em" }}>ATRASADO</text>
    </svg>
  );
}

function ClientCard({ g, delay }: { g: Group; delay: number }) {
  const [open, setOpen] = useState(false);
  const counts = useMemo(() => {
    const a = { ATRASADO: 0, A_TIEMPO: 0, ADELANTADO: 0, SIN_FECHA: 0 } as Record<EstadoCartera, number>;
    const m = { ATRASADO: 0, A_TIEMPO: 0, ADELANTADO: 0, SIN_FECHA: 0 } as Record<EstadoCartera, number>;
    for (const r of g.items) { a[r.estado]++; m[r.estado] += r.c.pending_client_amount ?? 0; }
    return { a, m };
  }, [g.items]);
  const segs = ([
    { k: "ATRASADO", v: counts.m.ATRASADO }, { k: "A_TIEMPO", v: counts.m.A_TIEMPO },
    { k: "ADELANTADO", v: counts.m.ADELANTADO }, { k: "SIN_FECHA", v: counts.m.SIN_FECHA },
  ] as { k: EstadoCartera; v: number }[]).filter((s) => s.v > 0);
  const overdue = counts.m.ATRASADO > 0;

  return (
    <div style={{
      borderRadius: 14, background: T.surface, border: `1px solid ${T.borderLight}`,
      boxShadow: T.shadow, overflow: "hidden", animation: `caFadeUp 0.45s cubic-bezier(0.4,0,0.2,1) ${delay}ms both`,
      borderLeft: overdue ? `3px solid ${T.danger}` : `1px solid ${T.borderLight}`,
    }}>
      {/* Summary header (always visible) */}
      <div onClick={() => setOpen((v) => !v)} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.client}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: T.inkLight, fontWeight: 500 }}>{g.items.length} op{g.items.length !== 1 ? "s" : ""}</span>
            {overdue ? (
              <span style={{ fontSize: 11, fontWeight: 700, color: T.danger }}>{counts.a.ATRASADO} atrasada{counts.a.ATRASADO !== 1 ? "s" : ""} · {fmtMoneyShort(counts.m.ATRASADO)}</span>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 600, color: T.success }}>Al día</span>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: overdue ? T.danger : T.ink, letterSpacing: "-0.03em", fontFamily: "var(--font-jetbrains-mono), monospace", lineHeight: 1 }}>{fmtMoney(g.total)}</div>
        </div>
        <ChevronDown className="w-4 h-4" style={{ color: T.inkLight, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </div>

      {/* Thin composition line (subtle, only meaningful color shows) */}
      <div style={{ display: "flex", gap: 2, height: 4, background: T.surfaceAlt }}>
        {segs.map((s) => <div key={s.k} title={`${ESTADO_META[s.k].label}: ${fmtMoney(s.v)}`} style={{ flex: s.v, background: ESTADO_META[s.k].color, opacity: s.k === "ATRASADO" ? 1 : 0.45 }} />)}
      </div>

      {/* Detail (collapsed by default) */}
      {open && (
        <div style={{ background: T.surfaceAlt }}>
          {g.items.map((r, i) => (
            <div key={r.c.id || i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", borderTop: `1px solid ${T.borderLight}` }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: T.accent, fontFamily: "var(--font-jetbrains-mono), monospace", whiteSpace: "nowrap" }}>{r.c.client_contract || "—"}</span>
                  <EstadoBadge estado={r.estado} days={r.days} small />
                </div>
                <div title={r.c.detail || ""} style={{ fontSize: 11, color: T.inkLight, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.c.detail || "—"}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: T.inkSoft, fontFamily: "var(--font-jetbrains-mono), monospace", lineHeight: 1.1 }}>{fmtNum(r.c.pending_client_amount)}</div>
                <div style={{ fontSize: 10, color: T.inkLight, marginTop: 2, fontFamily: "var(--font-jetbrains-mono), monospace" }}>ETA {fmtDate(r.c.eta_final)} · venc {fmtDate(deadlineISO(r.c.eta_final))}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function VariantAurora({ d }: { d: CarteraData }) {
  const { kpis, aging, groups, loading, today } = d;
  const agingSegs = [
    { key: "pv", label: "Por vencer", color: AG2.porVencer, ...aging.porVencer },
    { key: "a", label: "0–30 d", color: AG2.d0_30, ...aging.d0_30 },
    { key: "b", label: "31–60 d", color: AG2.d31_60, ...aging.d31_60 },
    { key: "c", label: "+60 d", color: AG2.d60, ...aging.d60 },
    { key: "s", label: "Sin fecha", color: AG2.sinFecha, ...aging.sinFecha },
  ].filter((s) => s.amt > 0);

  const overdueClients = groups.filter((g) => g.atrasado > 0).length;

  return (
    <div style={{ fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif" }}>
      <style>{`@keyframes caFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } } @keyframes caFadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>

      {/* ===== HERO (the single focal point) ===== */}
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 18, background: T.gradientPrimary, boxShadow: T.shadowLg, marginBottom: 16, animation: "caFadeIn 0.4s ease both" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(620px 240px at 88% -30%, rgba(255,255,255,0.16), transparent 62%), radial-gradient(520px 260px at 6% 130%, rgba(0,184,224,0.20), transparent 60%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: "linear-gradient(90deg, #00B8E0 0%, rgba(0,184,224,0.25) 40%, transparent 75%)" }} />
        <div style={{ position: "absolute", top: -80, right: -40, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(14,165,165,0.22), transparent 70%)" }} />
        <div style={{ position: "relative", padding: "26px 30px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 28, flexWrap: "wrap" }}>
          <div style={{ minWidth: 260 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(255,255,255,0.13)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Wallet className="w-4 h-4" /></div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.62)", letterSpacing: "0.16em", textTransform: "uppercase" }}>Cartera total por cobrar · USD</span>
            </div>
            <div style={{ fontSize: 48, fontWeight: 800, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1, fontFamily: "var(--font-jetbrains-mono), monospace" }}>{loading ? "—" : fmtMoney(kpis.total)}</div>
            <div style={{ fontSize: 12.5, color: "rgba(191,219,254,0.8)", fontWeight: 500, marginTop: 12 }}>
              {kpis.ops} operaciones · {kpis.clientes} clientes{overdueClients > 0 ? ` · ${overdueClients} con saldo atrasado` : ""}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 11, background: "rgba(239,68,68,0.16)" }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: "#FCA5A5" }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.72)", fontWeight: 600 }}>Atrasado</span>
                <span style={{ fontSize: 14, color: "#fff", fontWeight: 800, fontFamily: "var(--font-jetbrains-mono), monospace" }}>{fmtMoneyShort(kpis.montoAtrasado)}</span>
                <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>{kpis.atrasadas} ops</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 11, background: "rgba(255,255,255,0.08)" }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: "#86EFAC" }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.72)", fontWeight: 600 }}>Por vencer</span>
                <span style={{ fontSize: 14, color: "#fff", fontWeight: 800, fontFamily: "var(--font-jetbrains-mono), monospace" }}>{fmtMoneyShort(kpis.montoPorVencer)}</span>
                <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>{kpis.aTiempo + kpis.adelantadas} ops</span>
              </div>
            </div>
          </div>
          <ImpactDonut atrasado={kpis.montoAtrasado} porVencer={kpis.montoPorVencer} sinFecha={kpis.montoSinFecha} />
        </div>
      </div>

      {/* ===== AGING (simple) ===== */}
      {!loading && kpis.ops > 0 && (
        <div style={{ borderRadius: 14, background: T.surface, border: `1px solid ${T.borderLight}`, boxShadow: T.shadow, padding: "16px 18px", marginBottom: 18, animation: "caFadeUp 0.5s ease 60ms both" }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: T.ink, marginBottom: 13 }}>Antigüedad de cartera</div>
          <div style={{ display: "flex", gap: 3, height: 16, borderRadius: 8, overflow: "hidden", background: T.surfaceAlt, marginBottom: 14 }}>
            {agingSegs.map((s) => <div key={s.key} title={`${s.label}: ${fmtMoney(s.amt)}`} style={{ flex: s.amt, background: s.color }} />)}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 28px" }}>
            {agingSegs.map((s) => (
              <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
                <span style={{ fontSize: 12, color: T.inkMuted, fontWeight: 500 }}>{s.label}</span>
                <span style={{ fontSize: 13.5, color: T.ink, fontWeight: 800, fontFamily: "var(--font-jetbrains-mono), monospace" }}>{fmtMoneyShort(s.amt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== CLIENTS (collapsed cards) ===== */}
      {!loading && groups.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: T.ink }}>Detalle por cliente</span>
          <span style={{ fontSize: 11, color: T.inkLight }}>{groups.length} cliente{groups.length !== 1 ? "s" : ""} · clic para ver operaciones</span>
        </div>
      )}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0" }}><Loader2 className="w-6 h-6 animate-spin" style={{ color: T.accent }} /></div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center" style={{ padding: "60px 0", color: T.inkLight }}><Wallet className="w-10 h-10 mb-3" /><p style={{ fontSize: 13, fontWeight: 500 }}>Sin operaciones con saldo pendiente</p></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, alignItems: "start" }}>
          {groups.map((g, i) => <ClientCard key={g.client} g={g} delay={80 + i * 35} />)}
        </div>
      )}

      <p style={{ fontSize: 11, color: T.inkLight, textAlign: "center", marginTop: 18 }}>Deadline = ETA − {DEADLINE_DAYS} días · Generado {fmtDate(isoFromDate(today))} · IBC Steel Group</p>
    </div>
  );
}
