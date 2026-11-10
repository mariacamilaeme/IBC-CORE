"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Download, Loader2, RefreshCw, Search, X, FolderDown, Ship, Clock, CalendarDays } from "lucide-react";
import { T } from "@/lib/design-tokens";
import { Button } from "@/components/ui/button";
import type { Contract } from "@/types";
import {
  DEADLINE_DAYS, ESTADO_LABEL, groupByCommercial, todayISO, fmtDate, fmtMoney, fmtMoneyShort,
  type CommercialPagos, type EstadoPago,
} from "./_logic";
import { buildPagosExcelBlob, pagosFileName } from "./_excel";

const ESTADO_STYLE: Record<EstadoPago, { color: string; bg: string }> = {
  ATRASADO: { color: T.danger, bg: T.dangerBg },
  ADELANTADO: { color: T.success, bg: T.successBg },
  CREDITO_BL: { color: T.accent, bg: T.accentLight },
  SIN_ETA: { color: T.inkMuted, bg: T.surfaceAlt },
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

const th: React.CSSProperties = { textAlign: "left", fontSize: 10.5, fontWeight: 700, color: T.inkLight, textTransform: "uppercase", letterSpacing: 0.4, padding: "8px 10px", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" };
const td: React.CSSProperties = { fontSize: 12, color: T.ink, padding: "9px 10px", borderBottom: `1px solid ${T.borderLight}`, verticalAlign: "middle" };

export default function PagosComercialesPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [corte, setCorte] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const PAGE_SIZE = 200;
      const all: Contract[] = [];
      for (let page = 1; page <= 100; page++) {
        const params = new URLSearchParams({ pageSize: String(PAGE_SIZE), page: String(page), sort_field: "client_name", sort_direction: "asc" });
        const res = await fetch(`/api/contracts?${params.toString()}`);
        if (!res.ok) throw new Error("API error");
        const json = await res.json();
        const batch: Contract[] = json.data || [];
        all.push(...batch);
        if (batch.length < PAGE_SIZE || all.length >= (json.count ?? Infinity)) break;
      }
      setContracts(all);
    } catch {
      toast.error("Error al cargar contratos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const groups = useMemo(() => groupByCommercial(contracts, corte), [contracts, corte]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? groups.filter((g) => g.name.toLowerCase().includes(q) || g.transit.some((t) => t.c.client_name.toLowerCase().includes(q)) || g.advances.some((a) => a.c.client_name.toLowerCase().includes(q))) : groups;
  }, [groups, search]);

  const current: CommercialPagos | null = useMemo(() => {
    if (!visible.length) return null;
    return visible.find((g) => g.name === selected) ?? visible[0];
  }, [visible, selected]);

  const grand = useMemo(() => groups.reduce((s, g) => s + g.total, 0), [groups]);

  const downloadOne = async (g: CommercialPagos) => {
    setDownloading(g.name);
    try {
      downloadBlob(await buildPagosExcelBlob(g, corte), pagosFileName(g.name, corte));
      toast.success(`Reporte de pagos de ${g.name} descargado`);
    } catch (e) {
      console.error(e);
      toast.error(`Error generando el reporte de ${g.name}`);
    } finally {
      setDownloading(null);
    }
  };

  const downloadAll = async () => {
    setDownloading("__all__");
    try {
      for (const g of visible) {
        downloadBlob(await buildPagosExcelBlob(g, corte), pagosFileName(g.name, corte));
        await new Promise((r) => setTimeout(r, 350));
      }
      toast.success(`${visible.length} reportes descargados`);
    } catch (e) {
      console.error(e);
      toast.error("Error generando los reportes");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div style={{ background: T.glassBg, backdropFilter: T.glassBlur, border: "1px solid " + T.glassBorder, borderRadius: T.radius, boxShadow: T.shadowGlass, padding: "22px 26px" }}>
      {/* Encabezado */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: T.beacon, textTransform: "uppercase" }}>Reporte</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: "2px 0 4px", fontFamily: "'Space Grotesk', var(--font-space-grotesk), sans-serif" }}>Pagos × Comerciales</h1>
          <p style={{ fontSize: 12.5, color: T.inkMuted, margin: 0 }}>
            Saldos de pedidos en tránsito y anticipos pendientes, listos para enviar a cada comercial.
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10.5, color: T.inkLight, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>Cartera en tránsito · todos</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: T.accent, fontVariantNumeric: "tabular-nums" }}>{fmtMoney(grand)}</div>
        </div>
      </div>

      {/* Barra de herramientas */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: T.surface, border: `1px solid ${T.borderLight}`, minWidth: 220 }}>
          <Search className="w-3.5 h-3.5" style={{ color: T.inkLight, flexShrink: 0 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar comercial o cliente..."
            style={{ border: "none", background: "transparent", outline: "none", fontSize: 12, color: T.ink, width: "100%", fontFamily: "inherit" }} />
          {search && <X className="w-3.5 h-3.5 cursor-pointer" style={{ color: T.inkLight }} onClick={() => setSearch("")} />}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, background: T.surface, border: `1px solid ${T.borderLight}`, fontSize: 11.5, color: T.inkMuted, fontWeight: 600 }}>
          <CalendarDays className="w-3.5 h-3.5" style={{ color: T.inkLight }} /> Fecha de corte
          <input type="date" value={corte} onChange={(e) => e.target.value && setCorte(e.target.value)}
            style={{ border: "none", background: "transparent", outline: "none", fontSize: 12, color: T.ink, fontFamily: "inherit" }} />
        </label>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl border-slate-200" onClick={fetchData}><RefreshCw className="w-3.5 h-3.5" /> Actualizar</Button>
          <Button size="sm" className="h-9 gap-1.5 rounded-xl" onClick={downloadAll} disabled={!visible.length || downloading !== null}
            title="Descarga un Excel independiente por cada comercial de la vista"
            style={{ background: T.gradientAccent, border: "none", boxShadow: T.shadowMd, color: "white" }}>
            {downloading === "__all__" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderDown className="w-3.5 h-3.5" />} Excel × comercial ({visible.length})
          </Button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 60, color: T.inkMuted, fontSize: 13 }}>
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando contratos…
        </div>
      ) : !current ? (
        <div style={{ padding: 60, textAlign: "center", color: T.inkMuted, fontSize: 13 }}>No hay pagos pendientes para mostrar.</div>
      ) : (
        <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Lista de comerciales */}
          <div style={{ flex: "0 0 250px", display: "flex", flexDirection: "column", gap: 6, minWidth: 220 }}>
            {visible.map((g) => {
              const active = g.name === current.name;
              return (
                <button key={g.name} onClick={() => setSelected(g.name)}
                  style={{
                    textAlign: "left", padding: "11px 14px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
                    background: active ? T.accent : T.surface, border: `1px solid ${active ? T.accent : T.borderLight}`,
                    boxShadow: active ? T.shadowAccent : "none", transition: "all 0.15s ease",
                  }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: active ? "#fff" : T.ink }}>{g.name}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 3 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: active ? "#fff" : T.accent, fontVariantNumeric: "tabular-nums" }}>{fmtMoneyShort(g.total)}</span>
                    <span style={{ fontSize: 10.5, color: active ? "rgba(255,255,255,0.75)" : T.inkLight }}>
                      {g.transit.length} tránsito · {g.advances.length} anticipo{g.advances.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {g.atrasado > 0 && (
                    <div style={{ fontSize: 10.5, fontWeight: 700, marginTop: 3, color: active ? "#FFD3D3" : T.danger }}>Atrasado {fmtMoneyShort(g.atrasado)}</div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Detalle */}
          <div style={{ flex: "1 1 600px", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: T.ink, margin: 0 }}>{current.name}</h2>
              <Button size="sm" className="h-9 gap-1.5 rounded-xl" onClick={() => downloadOne(current)} disabled={downloading !== null}
                style={{ background: T.gradientPrimary, border: "none", boxShadow: T.shadowMd, color: "white" }}>
                {downloading === current.name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Descargar Excel
              </Button>
            </div>

            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Cartera en tránsito", value: fmtMoney(current.total), color: T.accent },
                { label: "Atrasado", value: fmtMoney(current.atrasado), color: current.atrasado > 0 ? T.danger : T.inkLight },
                { label: "Adelantado (no vencido)", value: fmtMoney(current.adelantado), color: T.success },
                ...(current.credito > 0 ? [{ label: "Crédito BL · falta fecha", value: fmtMoney(current.credito), color: T.accent }] : []),
                { label: "Pendiente llegada motonave", value: fmtMoney(current.sinEta), color: T.inkMuted },
                { label: "Anticipos pendientes", value: String(current.advances.length), color: current.advances.length ? T.warning : T.inkLight },
              ].map((k) => (
                <div key={k.label} style={{ background: T.surface, border: `1px solid ${T.borderLight}`, borderRadius: 12, padding: "11px 14px" }}>
                  <div style={{ fontSize: 10.5, color: T.inkLight, fontWeight: 600 }}>{k.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: k.color, marginTop: 3, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* Tránsito */}
            <SectionTitle icon={<Ship className="w-4 h-4" />} title="Cartera en tránsito" hint={`Deadline motonave = ETA − ${DEADLINE_DAYS} días · Venc. pago = término JPB o deadline motonave`} />
            <div style={{ overflowX: "auto", background: T.surface, border: `1px solid ${T.borderLight}`, borderRadius: 12, marginBottom: 22 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={th}>Cliente</th><th style={th}>Contrato</th><th style={th}>Motonave</th><th style={th}>ETA</th>
                  <th style={th}>Deadline MV</th><th style={th}>Venc. pago</th><th style={{ ...th, textAlign: "right" }}>Días atraso</th><th style={{ ...th, textAlign: "right" }}>Saldo USD</th><th style={th}>Estado</th>
                </tr></thead>
                <tbody>
                  {current.transit.length === 0 && (
                    <tr><td colSpan={9} style={{ ...td, color: T.inkLight, fontStyle: "italic", textAlign: "center", padding: 18 }}>Sin cartera en tránsito pendiente</td></tr>
                  )}
                  {current.transit.map((t) => {
                    const st = ESTADO_STYLE[t.estado];
                    return (
                      <tr key={t.c.id ?? t.c.china_contract}>
                        <td style={td}>
                          <div style={{ fontWeight: 700 }}>{t.c.client_name}</div>
                          <div style={{ fontSize: 10.5, color: T.inkLight, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.c.detail || ""}>{t.c.detail}</div>
                        </td>
                        <td style={td}>
                          <div style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 11 }}>{t.c.client_contract || "—"}</div>
                          <div style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 10.5, color: T.inkLight }}>{t.c.china_contract}</div>
                        </td>
                        <td style={td}>{t.c.vessel_name || "—"}</td>
                        <td style={td}>
                          {fmtDate(t.eta)}
                          {(() => {
                            if (!t.eta) return null;
                            const dEta = Math.round((new Date(t.eta + "T00:00:00Z").getTime() - new Date(corte + "T00:00:00Z").getTime()) / 86400000);
                            const released = /^(OK|SI|SÍ|LIBERADO)/i.test((t.c.bl_released || "").trim());
                            if (released || dEta < 0 || dEta > 20) return null;
                            return <div title="Próximo a arribar: notificar al cliente y solicitar la liberación oportuna" style={{ fontSize: 9.5, fontWeight: 700, color: T.beacon, marginTop: 2, whiteSpace: "nowrap" }}>{dEta === 0 ? "Arriba hoy" : `Arriba en ${dEta} d`}</div>;
                          })()}
                        </td>
                        <td style={td}>{fmtDate(t.mvDeadline)}</td>
                        <td style={td} title={t.terms ? `Término de pago (JPB): ${t.terms}` : "Sin término especial: vence en el deadline de la motonave"}>
                          <span style={{ fontWeight: t.special || t.pendingLabel ? 700 : 400, color: t.special || t.pendingLabel ? T.accent : T.ink, fontStyle: t.pendingLabel ? "italic" : "normal", whiteSpace: "nowrap" }}>
                            {t.deadline ? fmtDate(t.deadline) : (t.pendingLabel || "—")}
                          </span>
                          {t.special && t.terms && <div style={{ fontSize: 10, color: T.inkLight, marginTop: 1, whiteSpace: "nowrap" }}>{t.terms}</div>}
                        </td>
                        <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", color: st.color, fontWeight: 700 }}>{t.daysLate ?? "—"}</td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 700, color: T.accent, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                          {t.amount != null && t.amount > 0 ? fmtMoney(t.amount) : <span style={{ color: T.inkLight, fontWeight: 500 }}>Sin valor</span>}
                        </td>
                        <td style={td}>
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: st.color, background: st.bg, padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>
                            {t.estado === "SIN_ETA" ? "Pend. llegada MV" : t.estado === "CREDITO_BL" ? "Crédito BL" : ESTADO_LABEL[t.estado]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {current.transit.length > 0 && (
                  <tfoot><tr>
                    <td colSpan={7} style={{ ...td, fontWeight: 700, borderBottom: "none" }}>Total</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 800, color: T.accentDark, borderBottom: "none", whiteSpace: "nowrap" }}>{fmtMoney(current.total)}</td>
                    <td style={{ ...td, borderBottom: "none" }} />
                  </tr></tfoot>
                )}
              </table>
            </div>

            {/* Anticipos */}
            <SectionTitle icon={<Clock className="w-4 h-4" />} title="Anticipos pendientes" hint="Contratos vigentes sin anticipo recibido" />
            <div style={{ overflowX: "auto", background: T.surface, border: `1px solid ${T.borderLight}`, borderRadius: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={th}>Cliente</th><th style={th}>Contrato</th><th style={th}>Emisión</th>
                  <th style={{ ...th, textAlign: "right" }}>Días</th><th style={{ ...th, textAlign: "right" }}>Tons</th><th style={th}>Estado contrato</th>
                </tr></thead>
                <tbody>
                  {current.advances.length === 0 && (
                    <tr><td colSpan={6} style={{ ...td, color: T.inkLight, fontStyle: "italic", textAlign: "center", padding: 18 }}>Sin anticipos pendientes</td></tr>
                  )}
                  {current.advances.map((a) => (
                    <tr key={a.c.id ?? a.c.china_contract}>
                      <td style={td}>
                        <div style={{ fontWeight: 700 }}>{a.c.client_name}</div>
                        <div style={{ fontSize: 10.5, color: T.inkLight, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.c.detail || ""}>{a.c.detail}</div>
                      </td>
                      <td style={td}>
                        <div style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 11 }}>{a.c.client_contract || "—"}</div>
                        <div style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 10.5, color: T.inkLight }}>{a.c.china_contract}</div>
                      </td>
                      <td style={td}>{fmtDate(a.c.contract_date)}</td>
                      <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: (a.daysElapsed ?? 0) > 30 ? T.warning : T.ink }}>{a.daysElapsed ?? "—"}</td>
                      <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{a.c.tons_agreed?.toLocaleString("es-CO") ?? "—"}</td>
                      <td style={td}>{a.c.status || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {current.sinValor > 0 && (
              <p style={{ fontSize: 11, color: T.inkLight, marginTop: 12 }}>
                {current.sinValor} contrato{current.sinValor === 1 ? "" : "s"} en tránsito con saldo PENDIENTE pero sin valor cargado en el STATUS.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <span style={{ color: T.accent, display: "flex" }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{title}</span>
      <span style={{ fontSize: 11, color: T.inkLight }}>· {hint}</span>
    </div>
  );
}
