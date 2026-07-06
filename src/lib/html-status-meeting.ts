// ===========================================================================
// IBC CORE — Reporte de reunión "Status de Producción · Resumen ejecutivo"
// Genera un HTML autocontenido (estilo ibc-premium-design: blanco + azul,
// Space Grotesk / Manrope / JetBrains Mono) a partir de los contratos
// EN PRODUCCIÓN y EN TRÁNSITO. Pensado para leerse en una reunión.
// ===========================================================================

import type { Contract } from "@/types";

// ── Etapas operativas ──────────────────────────────────────────────────────
type Stage = "produccion" | "nominado" | "transito" | "equipos";

const STAGE_META: Record<Stage, { num: string; title: string; hint: string }> = {
  produccion: { num: "01", title: "En producción", hint: "sin motonave nominada" },
  nominado: { num: "02", title: "Con nominación · por zarpar", hint: "motonave asignada, esperando zarpe" },
  transito: { num: "03", title: "En tránsito", hint: "zarpados · documentos de origen en gestión" },
  equipos: { num: "04", title: "Equipos & proyectos", hint: "maquinaria en fabricación" },
};

function isEquipment(c: Contract): boolean {
  const pt = (c.product_type || "").toUpperCase();
  if (pt.includes("MAQ")) return true;
  if ((c.china_contract || "").toUpperCase().startsWith("PT-")) return true;
  return /machine|equipo|roll ?form|montacarga|shutter|deck|trefil/i.test(c.detail || "");
}

function stageOf(c: Contract): Stage {
  if (isEquipment(c)) return "equipos";
  if (c.status === "EN TRÁNSITO") return "transito";
  if (c.vessel_name && c.vessel_name.trim() !== "") return "nominado";
  return "produccion";
}

// ── Formateo ───────────────────────────────────────────────────────────────
const MONTHS_ES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

function fmtShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.split("T")[0] + "T00:00:00");
  if (isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]}`;
}

function fmtMT(n: number): string {
  return n.toLocaleString("es-CO", { maximumFractionDigits: 0 });
}

function esc(s: string | null | undefined): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Puertos ────────────────────────────────────────────────────────────────
function portAbbrev(port: string | null | undefined): { code: string; name: string } {
  const p = (port || "").trim().toUpperCase();
  if (!p) return { code: "—", name: "Sin puerto" };
  if (p.includes("BUENAVENTURA")) return { code: "BV", name: "Buenaventura" };
  if (p.includes("BARRANQUILLA")) return { code: "BQ", name: "Barranquilla" };
  if (p.includes("CARTAGENA")) return { code: "CTG", name: "Cartagena" };
  if (p.includes("CABELLO")) return { code: "P. CABELLO", name: "Puerto Cabello" };
  if (p.includes("SANTA MARTA")) return { code: "SM", name: "Santa Marta" };
  return { code: p.slice(0, 10), name: port || "" };
}

// ── Materiales (clasificación por palabra clave del detalle) ──────────────
function materialBucket(detail: string | null | undefined): string {
  const d = (detail || "").toLowerCase();
  if (/tuber|tubo|pipe/.test(d)) return "Tubería";
  if (/teja/.test(d)) return "Teja & cubiertas";
  if (/bobina|coil|l[aá]mina|sheet|ppg|galvaniz|prepint/.test(d)) return "Bobina & lámina";
  if (/alambr|wire rod/.test(d)) return "Alambrón";
  if (/barra|bar\b|deformed|round/.test(d)) return "Barras";
  if (/angle|perfil|channel|beam|viga|[aá]ngulo/.test(d)) return "Perfiles & ángulos";
  return "Otros";
}

// ── Alertas automáticas ────────────────────────────────────────────────────
interface Alert { title: string; body: string }

function buildAlerts(contracts: Contract[], today: Date): Alert[] {
  const alerts: Alert[] = [];
  const daysFrom = (iso: string | null | undefined) => {
    if (!iso) return null;
    const d = new Date(iso.split("T")[0] + "T00:00:00");
    if (isNaN(d.getTime())) return null;
    return Math.floor((today.getTime() - d.getTime()) / 86400000);
  };

  // 1. Motonaves nominadas con ETD vencido → confirmar zarpe
  const etdOverdue = contracts.filter(
    (c) => stageOf(c) === "nominado" && c.etd && (daysFrom(c.etd) ?? 0) > 0
  );
  const byVessel = new Map<string, Contract[]>();
  for (const c of etdOverdue) {
    const v = (c.vessel_name || "").trim().toUpperCase();
    if (!byVessel.has(v)) byVessel.set(v, []);
    byVessel.get(v)!.push(c);
  }
  for (const [vessel, group] of byVessel) {
    const mt = group.reduce((s, c) => s + (c.tons_agreed ?? 0), 0);
    const clients = [...new Set(group.map((c) => c.client_name))].join(", ");
    const days = Math.max(...group.map((c) => daysFrom(c.etd) ?? 0));
    alerts.push({
      title: `Confirmar zarpe de ${esc(vessel)}`,
      body: `Su ETD venció hace ${days} día${days !== 1 ? "s" : ""}: confirmar si zarpó con ${group.length} pedido${group.length !== 1 ? "s" : ""} (${esc(clients)} · ${fmtMT(mt)} MT).`,
    });
  }

  // 2. En tránsito con documentos pendientes
  const docsPending = contracts.filter(
    (c) => stageOf(c) === "transito" && (!c.documents_sent || (c.documents_pending && c.documents_pending !== "Todos enviados"))
  );
  if (docsPending.length > 0) {
    const vessels = [...new Set(docsPending.map((c) => (c.vessel_name || "").trim()).filter(Boolean))].join(", ");
    alerts.push({
      title: "Documentos de los zarpados",
      body: `${docsPending.length} pedido${docsPending.length !== 1 ? "s" : ""} en tránsito (${esc(vessels)}) con set documental pendiente de recibir desde origen para adaptar y entregar al cliente.`,
    });
  }

  // 3. En tránsito con ETA vencida → confirmar llegada
  const etaOverdue = contracts.filter(
    (c) => stageOf(c) === "transito" && c.eta_final && (daysFrom(c.eta_final) ?? 0) > 0
  );
  for (const c of etaOverdue.slice(0, 3)) {
    const days = daysFrom(c.eta_final) ?? 0;
    alerts.push({
      title: `Confirmar llegada de ${esc((c.vessel_name || "motonave").toUpperCase())}`,
      body: `${esc(c.client_name)} · ${esc(c.client_contract || c.china_contract || "")}: la ETA venció hace ${days} día${days !== 1 ? "s" : ""}. Verificar arribo a ${esc(portAbbrev(c.arrival_port).name)} y actualizar estado.`,
    });
  }

  // 4. Producción con EXW vencido y sin motonave → gestionar nominación
  const exwOverdue = contracts.filter(
    (c) => stageOf(c) === "produccion" && c.exw_date && (daysFrom(c.exw_date) ?? 0) > 0
  );
  if (exwOverdue.length > 0) {
    const mt = exwOverdue.reduce((s, c) => s + (c.tons_agreed ?? 0), 0);
    const clients = [...new Set(exwOverdue.map((c) => c.client_name))].slice(0, 4).join(", ");
    alerts.push({
      title: "Nominación pendiente con producción lista",
      body: `${exwOverdue.length} pedido${exwOverdue.length !== 1 ? "s" : ""} con fecha EXW cumplida y sin motonave asignada (${esc(clients)}${exwOverdue.length > 4 ? "…" : ""} · ${fmtMT(mt)} MT). Gestionar nominación para no perder ventana.`,
    });
  }

  return alerts;
}

// ── Fecha clave por fila según etapa ───────────────────────────────────────
function keyDate(c: Contract, stage: Stage): { label: string; value: string } {
  if (stage === "transito") return { label: "ETA", value: fmtShortDate(c.eta_final) };
  if (stage === "nominado") return { label: "ETD", value: fmtShortDate(c.etd) };
  if (stage === "equipos") return { label: "EXW", value: fmtShortDate(c.exw_date) };
  return { label: "EXW", value: fmtShortDate(c.exw_date) };
}

// ===========================================================================
// Generador principal
// ===========================================================================
export function generateStatusMeetingHTML(contracts: Contract[]): string {
  const today = new Date();
  const dateLong = today.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  const dateShort = `${today.getDate()} ${MONTHS_ES[today.getMonth()]} ${today.getFullYear()}`;

  // Filtrar anulados/entregados por si llegan
  const active = contracts.filter((c) => c.status === "EN PRODUCCIÓN" || c.status === "EN TRÁNSITO");

  const groups: Record<Stage, Contract[]> = { produccion: [], nominado: [], transito: [], equipos: [] };
  for (const c of active) groups[stageOf(c)].push(c);

  // Ordenar cada grupo: por fecha clave asc, luego cliente
  const sortKey = (c: Contract, st: Stage) =>
    (st === "transito" ? c.eta_final : st === "nominado" ? c.etd : c.exw_date) || "9999";
  (Object.keys(groups) as Stage[]).forEach((st) => {
    groups[st].sort((a, b) => sortKey(a, st).localeCompare(sortKey(b, st)) || (a.client_name || "").localeCompare(b.client_name || ""));
  });

  const mtOf = (list: Contract[]) => list.reduce((s, c) => s + (c.tons_agreed ?? 0), 0);
  const totalPedidos = active.length;
  const mtPlan = mtOf(groups.produccion) + mtOf(groups.nominado);
  const vesselsTransito = [...new Set(groups.transito.map((c) => (c.vessel_name || "").trim()).filter(Boolean))];

  // Tonelaje por puerto (producción + nominado = plan por zarpar)
  const planContracts = [...groups.produccion, ...groups.nominado];
  const portMap = new Map<string, { name: string; mt: number; count: number }>();
  for (const c of planContracts) {
    const { code, name } = portAbbrev(c.arrival_port);
    if (!portMap.has(code)) portMap.set(code, { name, mt: 0, count: 0 });
    const e = portMap.get(code)!;
    e.mt += c.tons_agreed ?? 0;
    e.count += 1;
  }
  const ports = [...portMap.entries()].sort((a, b) => b[1].mt - a[1].mt);

  // Tonelaje por material (todo lo activo con tons)
  const matMap = new Map<string, number>();
  for (const c of active) {
    if (!c.tons_agreed) continue;
    const bucket = materialBucket(c.detail);
    matMap.set(bucket, (matMap.get(bucket) ?? 0) + c.tons_agreed);
  }
  const materials = [...matMap.entries()].sort((a, b) => b[1] - a[1]);
  const maxMat = materials.length ? materials[0][1] : 1;

  const alerts = buildAlerts(active, today);

  // ── Documentos: chip enviados / pendientes (solo tiene sentido zarpado) ──
  const docsChip = (c: Contract): string => {
    const pending = (c.documents_pending || "").trim();
    const sent = (c.documents_sent || "").trim();
    if (pending && pending.toUpperCase() !== "TODOS ENVIADOS") {
      return `<div class="docs pend" title="Pendientes: ${esc(pending)}">DOCS PDTE · ${esc(pending.length > 26 ? pending.slice(0, 26) + "…" : pending)}</div>`;
    }
    if (sent) {
      return `<div class="docs ok" title="Enviados: ${esc(sent)}">DOCS ENVIADOS</div>`;
    }
    return `<div class="docs pend">DOCS SIN RECIBIR</div>`;
  };

  const docsSentCount = groups.transito.filter((c) => {
    const pending = (c.documents_pending || "").trim();
    return (c.documents_sent || "").trim() && (!pending || pending.toUpperCase() === "TODOS ENVIADOS");
  }).length;

  // ── Pagos: señales cruzadas del módulo de contratos ──
  const isPaid = (v: string | null | undefined) => {
    const s = (v || "").trim().toUpperCase();
    return s === "SI" || s === "OK" || s === "PAGADO";
  };

  const payChips = (c: Contract, stage: Stage): string => {
    const chips: string[] = [];
    // Anticipo pendiente frena producción/zarpe
    if ((c.advance_paid || "").trim() && !isPaid(c.advance_paid) && (stage === "produccion" || stage === "nominado" || stage === "equipos")) {
      chips.push(`<div class="docs pend" title="Anticipo: ${esc(c.advance_paid)}">ANTICIPO PDTE</div>`);
    }
    // Saldo pendiente en tránsito: cobrar antes de liberar BL
    if ((c.balance_paid || "").trim() && !isPaid(c.balance_paid) && stage === "transito") {
      chips.push(`<div class="docs pend" title="Saldo: ${esc(c.balance_paid)}">SALDO PDTE</div>`);
    }
    return chips.join(" ");
  };

  // ── Filas del detalle ────────────────────────────────────────────────────
  const renderRow = (c: Contract, stage: Stage) => {
    const { code } = portAbbrev(c.arrival_port);
    const kd = keyDate(c, stage);
    const mn = stage === "produccion"
      ? "Por nominar"
      : (c.vessel_name || "—").toUpperCase();
    const noteChip = (c.notes || "").trim()
      ? `<div class="docs note" title="${esc(c.notes)}">NOTA · ${esc((c.notes || "").trim().slice(0, 34))}${(c.notes || "").trim().length > 34 ? "…" : ""}</div>`
      : "";
    return `
      <div class="row">
        <div class="cell client">
          <div class="nm">${esc(c.client_name)}</div>
          <div class="refs">${esc(c.client_contract || "—")}${c.china_contract ? ` · <span>${esc(c.china_contract)}</span>` : ""}</div>
          ${noteChip}
        </div>
        <div class="cell mat">${esc(c.detail || "—")}</div>
        <div class="cell mt">${c.tons_agreed ? fmtMT(c.tons_agreed) + " <small>MT</small>" : "—"}</div>
        <div class="cell pod">${esc(code)}</div>
        <div class="cell mn ${stage === "produccion" ? "pending" : ""}">${esc(mn)}${stage === "transito" ? docsChip(c) : ""} ${payChips(c, stage)}</div>
        <div class="cell f"><span class="k">${kd.label}</span> ${kd.value}</div>
      </div>`;
  };

  const renderGroup = (stage: Stage) => {
    const list = groups[stage];
    if (list.length === 0) return "";
    const meta = STAGE_META[stage];
    const mt = mtOf(list);
    const sub = stage === "transito"
      ? `${list.length} pedido${list.length !== 1 ? "s" : ""} · ${vesselsTransito.length} motonave${vesselsTransito.length !== 1 ? "s" : ""}${mt ? ` · ${fmtMT(mt)} MT` : ""} · docs: ${docsSentCount} enviados / ${list.length - docsSentCount} pendientes`
      : `${list.length} pedido${list.length !== 1 ? "s" : ""}${mt ? ` · ${fmtMT(mt)} MT` : ""}`;
    return `
    <div class="group" data-stage="${stage}">
      <div class="group-head">
        <span class="gnum">${meta.num}</span>
        <div>
          <div class="gtitle">${meta.title}</div>
          <div class="gsub">${sub} · ${meta.hint}</div>
        </div>
      </div>
      <div class="thead">
        <span>Cliente / Contratos</span><span>Material</span><span>MT</span><span>Puerto</span><span>Motonave</span><span>Fecha</span>
      </div>
      ${list.map((c) => renderRow(c, stage)).join("")}
    </div>`;
  };

  const stagesWithData = (Object.keys(groups) as Stage[]).filter((s) => groups[s].length > 0);

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>IBC · Status de Producción · Resumen · ${dateShort}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{
  --ink:#061B2E; --ink-2:#0A2A47; --blue:#0B5394; --blue-2:#1F6FB8; --blue-3:#3A8DD7;
  --blue-tint:#E8F1FB; --blue-paper:#F4F8FC; --cyan:#00B8E0;
  --line:#D7E2EE; --line-2:#EAF0F7; --bg:#F7FAFD;
  --shadow-1:0 1px 0 rgba(11,83,148,.05),0 1px 2px rgba(11,83,148,.06);
  --shadow-2:0 14px 32px -16px rgba(11,83,148,.22),0 6px 14px -8px rgba(11,83,148,.10);
  --display:'Space Grotesk',system-ui,sans-serif;
  --sans:'Manrope',system-ui,sans-serif;
  --mono:'JetBrains Mono',ui-monospace,monospace;
  --ease:cubic-bezier(.22,.61,.36,1);
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--bg);color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased}
body{font-size:15px;line-height:1.55;letter-spacing:-0.005em}
::selection{background:var(--blue);color:#fff}
.wrap{max-width:1180px;margin:0 auto;padding:0 28px}

/* topbar */
.topbar{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;
  padding:13px 28px;background:rgba(255,255,255,.82);backdrop-filter:blur(14px);border-bottom:1px solid var(--line-2)}
.brand{display:flex;align-items:center;gap:11px}
.brand .mark{width:28px;height:28px;border-radius:6px;background:var(--blue);display:grid;place-items:center;color:#fff;font-family:var(--mono);font-size:12px;font-weight:700}
.brand .nm{font-size:12.5px;letter-spacing:.16em;color:var(--ink-2);font-weight:700}
.brand .nm b{color:var(--blue)}
.topbar .meta{font-family:var(--mono);font-size:10.5px;color:#6a7d92;letter-spacing:.08em;display:flex;align-items:center;gap:10px}
.topbar .meta .dot{width:6px;height:6px;border-radius:99px;background:var(--cyan)}

/* hero */
.hero{background:#fff;border-bottom:1px solid var(--line);padding:44px 0 36px}
.eyebrow{display:inline-flex;align-items:center;gap:10px;font-family:var(--mono);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--blue);font-weight:600}
.eyebrow .bar{width:30px;height:1px;background:var(--blue)}
h1{font-family:var(--display);font-weight:600;font-size:clamp(34px,4.6vw,54px);line-height:1.02;letter-spacing:-0.025em;margin-top:12px}
h1 em{color:var(--blue);font-style:normal}
.lead{margin-top:12px;max-width:640px;color:#3b526b;font-size:15.5px}
.lead b{color:var(--ink-2)}

.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:28px}
.kpi{background:var(--blue-paper);border:1px solid var(--line);border-radius:14px;padding:16px 18px}
.kpi .k{font-family:var(--mono);font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:#6a7d92;font-weight:600}
.kpi .v{font-family:var(--display);font-size:34px;font-weight:600;color:var(--blue);line-height:1;margin-top:8px}
.kpi .s{font-size:11.5px;color:#52687f;margin-top:6px;line-height:1.4}
.ticker{margin-top:18px;padding:10px 16px;border:1px solid var(--line);border-radius:10px;background:#fff;
  font-family:var(--mono);font-size:11px;letter-spacing:.06em;color:var(--ink-2);display:flex;gap:18px;flex-wrap:wrap}
.ticker b{color:var(--blue)}

/* section */
section{padding:36px 0 8px}
.sec-head{display:flex;align-items:baseline;gap:14px;margin-bottom:18px}
.sec-head h2{font-family:var(--display);font-weight:600;font-size:24px;letter-spacing:-0.02em}
.sec-head .hint{font-size:12.5px;color:#6a7d92}

/* panorama */
.pan{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.panel{background:#fff;border:1px solid var(--line);border-radius:16px;padding:22px 24px;box-shadow:var(--shadow-1)}
.panel h3{font-family:var(--mono);font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--blue);font-weight:600;margin-bottom:14px}
.port{display:flex;justify-content:space-between;align-items:baseline;padding:10px 0;border-top:1px dashed var(--line)}
.port:first-of-type{border-top:none}
.port .cd{font-family:var(--mono);font-weight:700;color:var(--blue);font-size:13px}
.port .nm{font-size:13px;color:#3d556d;margin-left:8px}
.port .mt{font-family:var(--mono);font-weight:700;font-size:14px}
.port .ct{font-size:11px;color:#6a7d92;margin-left:8px}
.mat{padding:7px 0}
.mat .top{display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px}
.mat .top b{font-family:var(--mono);font-weight:700}
.mat .bar{height:7px;border-radius:99px;background:var(--line-2);overflow:hidden}
.mat .bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--blue),var(--cyan))}

/* tabs */
.tabs{display:flex;gap:6px;margin:8px 0 18px;flex-wrap:wrap}
.tab{padding:8px 15px;border-radius:99px;border:1px solid var(--line);background:#fff;
  font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:600;color:#6a7d92;cursor:pointer;transition:.2s var(--ease)}
.tab.active,.tab:hover{background:var(--blue);color:#fff;border-color:var(--blue)}

/* groups */
.group{background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden;box-shadow:var(--shadow-1);margin-bottom:18px}
.group-head{display:flex;align-items:center;gap:16px;padding:18px 24px;border-bottom:1px solid var(--line);background:var(--blue-paper)}
.gnum{font-family:var(--display);font-size:30px;color:var(--blue-3);font-weight:600;opacity:.55}
.gtitle{font-family:var(--display);font-size:19px;font-weight:600;letter-spacing:-0.015em}
.gsub{font-size:12px;color:#6a7d92;margin-top:2px}
.thead,.row{display:grid;grid-template-columns:1.5fr 1.7fr .55fr .6fr 1fr .7fr;gap:14px;align-items:center;padding:10px 24px}
.thead{padding-top:12px;padding-bottom:8px;font-family:var(--mono);font-size:8.5px;letter-spacing:.18em;text-transform:uppercase;color:#8fa2b5;font-weight:600;border-bottom:1px solid var(--line-2)}
.row{border-top:1px solid var(--line-2);font-size:13px}
.row:hover{background:var(--blue-paper)}
.row .nm{font-weight:700;color:var(--ink)}
.row .refs{font-family:var(--mono);font-size:10.5px;color:var(--blue);margin-top:2px}
.row .refs span{color:#8fa2b5}
.row .mat{color:#3d556d;font-size:12.5px;line-height:1.4}
.row .mt{font-family:var(--mono);font-weight:700;text-align:right}
.row .mt small{color:#8fa2b5;font-weight:500}
.row .pod{font-family:var(--mono);font-weight:600;color:var(--blue);font-size:12px}
.row .mn{font-size:12px;font-weight:600;color:var(--ink-2)}
.row .mn.pending{color:#8fa2b5;font-style:italic;font-weight:500}
.docs{display:inline-block;margin-top:4px;font-family:var(--mono);font-size:8.5px;letter-spacing:.08em;font-weight:700;
  padding:2px 7px;border-radius:5px;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.docs.ok{background:var(--blue-tint);color:var(--blue)}
.docs.pend{border:1px dashed var(--blue-3);color:var(--ink-2);background:#fff}
.docs.note{background:var(--blue-paper);color:#52687f;border:1px solid var(--line);font-weight:600;max-width:260px}
.row .f{font-family:var(--mono);font-size:11.5px;font-weight:700;text-align:right;white-space:nowrap}
.row .f .k{font-size:8.5px;color:#8fa2b5;letter-spacing:.1em;margin-right:4px}

/* alertas */
.alerts{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:24px}
.alert{background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px 22px;display:flex;gap:16px}
.alert .n{width:34px;height:34px;border-radius:9px;background:var(--blue);color:#fff;display:grid;place-items:center;
  font-family:var(--mono);font-size:12px;font-weight:700;flex-shrink:0}
.alert b{display:block;font-size:14.5px;color:var(--ink);margin-bottom:5px;font-weight:700}
.alert p{font-size:13px;color:#3d556d;line-height:1.55}
.alert p code{font-family:var(--mono);font-size:11.5px;color:var(--blue);background:var(--blue-tint);padding:1px 5px;border-radius:4px}

/* footer */
footer{margin-top:44px;padding:28px;border-top:1px solid var(--line);background:#fff}
footer .wrap{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
footer .big{font-family:var(--display);font-size:24px;color:var(--blue);font-weight:600;letter-spacing:-0.02em}
footer .meta{font-family:var(--mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#6a7d92;text-align:right;line-height:1.9}
footer .meta b{color:var(--blue)}

@media (max-width:900px){
  .kpis{grid-template-columns:repeat(2,1fr)}
  .pan{grid-template-columns:1fr}
  .alerts{grid-template-columns:1fr}
  .thead{display:none}
  .row{grid-template-columns:1fr 1fr;gap:8px}
}
@media print{
  .topbar{position:static}
  .tabs{display:none}
  .group{break-inside:avoid}
}
</style>
</head>
<body>

<div class="topbar">
  <div class="brand">
    <div class="mark">IBC</div>
    <div class="nm"><b>IBC</b> STEEL GROUP</div>
  </div>
  <div class="meta"><span class="dot"></span> STATUS PRODUCCIÓN · ${dateShort}</div>
</div>

<!-- HERO -->
<div class="hero">
  <div class="wrap">
    <div class="eyebrow"><span class="bar"></span>Status Production · Resumen ejecutivo</div>
    <h1>Status de <em>producción</em>.</h1>
    <p class="lead">Corte al <b>${dateLong}</b>. Clasificado por etapa operativa:
      <b>en producción</b>, <b>con nominación · por zarpar</b> y <b>en tránsito</b>.</p>

    <div class="kpis">
      <div class="kpi">
        <div class="k">En producción</div>
        <div class="v">${groups.produccion.length}</div>
        <div class="s">${fmtMT(mtOf(groups.produccion))} MT sin nominar${groups.equipos.length ? ` · + ${groups.equipos.length} equipo${groups.equipos.length !== 1 ? "s" : ""}` : ""}</div>
      </div>
      <div class="kpi">
        <div class="k">Nominado · por zarpar</div>
        <div class="v">${groups.nominado.length}</div>
        <div class="s">${fmtMT(mtOf(groups.nominado))} MT con motonave asignada</div>
      </div>
      <div class="kpi">
        <div class="k">En tránsito</div>
        <div class="v">${groups.transito.length}</div>
        <div class="s">${vesselsTransito.length} motonave${vesselsTransito.length !== 1 ? "s" : ""} navegando</div>
      </div>
      <div class="kpi">
        <div class="k">Plan por zarpar</div>
        <div class="v">${fmtMT(mtPlan)}</div>
        <div class="s">${ports.map(([code, e]) => `${code} ${fmtMT(e.mt)}`).join(" · ") || "MT"}</div>
      </div>
    </div>

    ${alerts.length > 0 ? `<div class="ticker">${alerts.slice(0, 3).map((a) => `<span><b>▲</b> ${a.title.toUpperCase()}</span>`).join("")}</div>` : ""}
  </div>
</div>

<!-- PANORAMA -->
<section>
  <div class="wrap">
    <div class="sec-head"><h2>Panorama del corte</h2><span class="hint">${totalPedidos} pedidos activos</span></div>
    <div class="pan">
      <div class="panel">
        <h3>Tonelaje por puerto — plan por zarpar</h3>
        ${ports.length === 0 ? `<p style="color:#6a7d92;font-size:13px">Sin plan pendiente.</p>` : ports.map(([code, e]) => `
        <div class="port">
          <div><span class="cd">${code}</span><span class="nm">${esc(e.name)}</span></div>
          <div><span class="mt">${fmtMT(e.mt)} MT</span><span class="ct">${e.count} embarque${e.count !== 1 ? "s" : ""}</span></div>
        </div>`).join("")}
      </div>
      <div class="panel">
        <h3>Tonelaje por material — qué viaja, y cuánto</h3>
        ${materials.map(([name, mt]) => `
        <div class="mat">
          <div class="top"><span>${esc(name)}</span><b>${fmtMT(mt)} MT</b></div>
          <div class="bar"><i style="width:${Math.max(4, Math.round((mt / maxMat) * 100))}%"></i></div>
        </div>`).join("")}
      </div>
    </div>
  </div>
</section>

<!-- DETALLE -->
<section>
  <div class="wrap">
    <div class="sec-head"><h2>Detalle por etapa</h2><span class="hint">${totalPedidos} pedidos · ${fmtMT(mtOf(active))} MT</span></div>
    <div class="tabs">
      <button class="tab active" data-f="all">Todos</button>
      ${stagesWithData.map((s) => `<button class="tab" data-f="${s}">${STAGE_META[s].title}</button>`).join("")}
    </div>
    ${(Object.keys(groups) as Stage[]).map(renderGroup).join("")}
  </div>
</section>

<!-- ALERTAS -->
${alerts.length > 0 ? `
<section>
  <div class="wrap">
    <div class="sec-head"><h2>Para gestionar esta semana</h2><span class="hint">${alerts.length} punto${alerts.length !== 1 ? "s" : ""} de acción</span></div>
    <div class="alerts">
      ${alerts.map((a, i) => `
      <div class="alert">
        <div class="n">${String(i + 1).padStart(2, "0")}</div>
        <div><b>${a.title}</b><p>${a.body}</p></div>
      </div>`).join("")}
    </div>
  </div>
</section>` : ""}

<footer>
  <div class="wrap">
    <div class="big">Status de Producción</div>
    <div class="meta">
      Generado desde <b>IBC CORE</b> · ${dateLong}<br>
      BV = Buenaventura · BQ = Barranquilla · CTG = Cartagena · MT = toneladas métricas
    </div>
  </div>
</footer>

<script>
  // Tabs: filtrar grupos por etapa
  document.querySelectorAll('.tab').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('.tab').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      var f = btn.getAttribute('data-f');
      document.querySelectorAll('.group').forEach(function(g){
        g.style.display = (f === 'all' || g.getAttribute('data-stage') === f) ? '' : 'none';
      });
    });
  });
</script>
</body>
</html>`;
}
