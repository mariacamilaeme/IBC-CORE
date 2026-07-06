/**
 * IBC Core — Cartera report (premium HTML → print to PDF)
 * Equilibrio: presencia de marca + color con criterio, sin saturar.
 * Header navy sobrio, KPI cards limpias, un donut contenido, antigüedad en barra fina,
 * tabla con pills suaves. El rojo se reserva para la señal de vencido.
 */

export type EstadoKey = "ATRASADO" | "A_TIEMPO" | "ADELANTADO" | "SIN_FECHA";

export interface CarteraHTMLItem {
  contract: string;
  material: string;
  saldo: number;
  eta: string;       // dd/mm/yyyy o "—"
  deadline: string;  // dd/mm/yyyy o "—"
  estadoLabel: string;
  estadoKey: EstadoKey;
  days: number | null;
  overdue: boolean;
}

export interface CarteraHTMLGroup {
  client: string;
  total: number;
  atrasado: number;
  items: CarteraHTMLItem[];
}

export interface CarteraHTMLOptions {
  clientName: string | null;
  generatedDate: string;
  generatedDateTime: string;
  total: number;
  ops: number;
  clientes: number;
  montoAtrasado: number;
  opsAtrasadas: number;
  montoPorVencer: number;
  opsPorVencer: number;
  montoSinFecha: number;
  opsSinFecha: number;
  pctAtrasado: number;
  aging: { key: string; label: string; amount: number; n: number; color: string }[];
  groups: CarteraHTMLGroup[];
  deadlineDays: number;
  filename: string;
}

async function fetchLogo(): Promise<string | null> {
  try {
    const res = await fetch("/logo-ibc.png");
    const buf = await res.arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return "data:image/png;base64," + btoa(bin);
  } catch {
    return null;
  }
}

// ── formatters ───────────────────────────────────────────────────────────────
const money = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ── donut chart (SVG string) ──────────────────────────────────────────────────
function donutSVG(segments: { value: number; color: string }[], centerBig: string, centerSub: string): string {
  const size = 150, stroke = 22;
  const r = (size - stroke) / 2, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  let acc = 0;
  const arcs = total > 0
    ? segments.filter((s) => s.value > 0).map((seg) => {
        const dash = (seg.value / total) * circ;
        const el = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${stroke}" stroke-dasharray="${dash.toFixed(2)} ${(circ - dash).toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}"/>`;
        acc += dash;
        return el;
      }).join("")
    : "";
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="donut">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#EEF2F7" stroke-width="${stroke}"/>
    <g transform="rotate(-90 ${cx} ${cy})">${arcs}</g>
    <text x="${cx}" y="${cy - 1}" text-anchor="middle" class="donut-big">${centerBig}</text>
    <text x="${cx}" y="${cy + 16}" text-anchor="middle" class="donut-sub">${centerSub}</text>
  </svg>`;
}

// ── full document ──────────────────────────────────────────────────────────────
function buildHTML(o: CarteraHTMLOptions, logo: string | null): string {
  // Donut contenido: atrasado (rojo) · por vencer (azul) · sin fecha (gris)
  const RED = "#C8324B", BLUE = "#2E72AD", GREY = "#B8C2CE";
  const donut = donutSVG(
    [{ value: o.montoAtrasado, color: RED }, { value: o.montoPorVencer, color: BLUE }, { value: o.montoSinFecha, color: GREY }],
    o.pctAtrasado + "%", "VENCIDO"
  );

  // Antigüedad: rampa sobria por severidad
  const agingRamp: Record<string, string> = {
    porVencer: "#9FC0DE", d0_30: "#C9B485", d31_60: "#CE8F73", d60: "#C8324B", sinFecha: "#CBD3DD",
  };
  const agColor = (key: string) => agingRamp[key] || "#CBD3DD";
  const agingActive = o.aging.filter((a) => a.amount > 0);
  const agingTotal = agingActive.reduce((s, a) => s + a.amount, 0) || 1;
  const agingBar = agingActive.length
    ? agingActive.map((a) => `<span style="width:${((a.amount / agingTotal) * 100).toFixed(2)}%;background:${agColor(a.key)}"></span>`).join("")
    : `<span style="width:100%;background:#EEF2F7"></span>`;
  const agingLegend = o.aging.map((a) => `<div class="ag-row">
      <span class="ag-dot" style="background:${agColor(a.key)}"></span>
      <span class="ag-label">${esc(a.label)}</span>
      <span class="ag-amt">${money(a.amount)}</span>
      <span class="ag-n">${a.n}</span>
    </div>`).join("");

  // Detalle agrupado
  const estadoClass: Record<EstadoKey, string> = {
    ATRASADO: "es-red", A_TIEMPO: "es-amber", ADELANTADO: "es-blue", SIN_FECHA: "es-grey",
  };
  const rows: string[] = [];
  for (const g of o.groups) {
    if (!o.clientName) {
      const pctAtr = g.total > 0 ? Math.round((g.atrasado / g.total) * 100) : 0;
      rows.push(`<tr class="grp"><td colspan="5">
        <span class="grp-name">${esc(g.client)}</span>${pctAtr > 0 ? `<span class="grp-risk">${pctAtr}% vencido</span>` : ""}
      </td><td class="num grp-total">${money(g.total)}</td></tr>`);
    }
    for (const it of g.items) {
      rows.push(`<tr>
        <td class="c-contract">${esc(it.contract)}</td>
        <td class="c-material">${esc(it.material)}</td>
        <td class="num c-saldo ${it.overdue ? "od" : ""}">${money(it.saldo)}</td>
        <td class="ctr c-date">${esc(it.eta)}</td>
        <td class="ctr c-date ${it.overdue ? "od" : ""}">${esc(it.deadline)}</td>
        <td class="ctr"><span class="pill ${estadoClass[it.estadoKey]}"><i></i>${esc(it.estadoLabel)}</span></td>
      </tr>`);
    }
  }
  rows.push(`<tr class="total-row">
    <td colspan="2">Cartera total por cobrar</td>
    <td class="num">${money(o.total)}</td>
    <td colspan="3"></td>
  </tr>`);

  const sub = o.clientName ? `${o.ops} operaciones` : `${o.ops} operaciones · ${o.clientes} clientes`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(o.filename)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root{
    --ink:#0A1F33; --ink-2:#1C3A56; --ink-soft:#52617A; --ink-light:#94A1B4;
    --blue:#0B5394; --navy:#0C2C4A;
    --line:#E6ECF3; --line-2:#F1F4F8; --paper:#fff; --bg:#FAFBFD;
    --red:#C8324B; --red-tint:#FCEEF1; --amber:#B07A1E; --cyan:#16B6DC;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-family:'Manrope',system-ui,sans-serif;color:var(--ink);background:var(--bg);
    font-feature-settings:"tnum";-webkit-font-smoothing:antialiased;line-height:1.5}
  .num,.mono{font-family:'JetBrains Mono',monospace;font-feature-settings:"tnum"}
  .sheet{max-width:200mm;margin:0 auto;background:#fff}

  /* Action bar (no imprime) */
  .actions{position:sticky;top:0;z-index:50;display:flex;align-items:center;gap:12px;justify-content:space-between;
    padding:11px 18px;background:rgba(250,251,253,.9);backdrop-filter:blur(10px);border-bottom:1px solid var(--line);
    max-width:200mm;margin:0 auto}
  .actions .hint{font-size:12px;color:var(--ink-light);font-weight:500}
  .actions .hint b{color:var(--ink-2)}
  .btn{font-family:'Manrope',sans-serif;font-size:12.5px;font-weight:600;border:1px solid var(--blue);border-radius:9px;
    padding:8px 16px;cursor:pointer;color:#fff;background:var(--blue);display:inline-flex;align-items:center;gap:7px}
  .btn.ghost{background:#fff;color:var(--ink-soft);border-color:var(--line)}

  .pad{padding:0 16mm}

  /* Header navy sobrio */
  .head{background:var(--navy);color:#fff;padding:18px 16mm 16px;position:relative}
  .head::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;
    background:linear-gradient(90deg,var(--blue),var(--cyan))}
  .head-row{display:flex;align-items:center;justify-content:space-between;gap:18px}
  .head-l{display:flex;align-items:center;gap:14px}
  .head-l img{height:26px;width:auto;filter:brightness(0) invert(1);opacity:.95}
  .head-rule{width:1px;height:30px;background:rgba(255,255,255,.28)}
  .head .eyebrow{font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:500;letter-spacing:.26em;
    text-transform:uppercase;color:rgba(255,255,255,.65)}
  .head .ttl{font-family:'Space Grotesk',sans-serif;font-size:18px;font-weight:500;letter-spacing:-.01em;margin-top:2px}
  .head .client{font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:500;color:#7FD0EC;margin-top:1px}
  .head-r{text-align:right;font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,.72);line-height:1.8}

  /* Total + KPIs */
  .top{display:flex;align-items:flex-end;justify-content:space-between;gap:22px;padding:20px 16mm 6px}
  .total .lbl{font-family:'JetBrains Mono',monospace;font-size:9.5px;font-weight:500;letter-spacing:.2em;
    text-transform:uppercase;color:var(--ink-light)}
  .total .fig{font-family:'Space Grotesk',sans-serif;font-size:46px;font-weight:600;letter-spacing:-.03em;color:var(--ink);line-height:1.02;margin-top:6px}
  .total .fig .cur{font-size:18px;font-weight:400;color:var(--ink-light);margin-left:9px;letter-spacing:0}
  .total .sub{font-size:12.5px;color:var(--ink-soft);margin-top:6px;font-weight:500}

  .kpis{display:flex;gap:11px}
  .kpi{background:#fff;border:1px solid var(--line);border-radius:13px;padding:12px 15px;min-width:118px;
    box-shadow:0 1px 2px rgba(11,83,148,.05),0 5px 14px rgba(11,83,148,.05)}
  .kpi .k{font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:500;letter-spacing:.12em;
    text-transform:uppercase;color:var(--ink-light)}
  .kpi .v{font-family:'Space Grotesk',sans-serif;font-size:21px;font-weight:600;letter-spacing:-.02em;color:var(--ink);margin-top:4px}
  .kpi.red .v{color:var(--red)}
  .kpi .d{font-size:10px;color:var(--ink-light);font-weight:500;margin-top:2px}

  /* Panel: donut + antigüedad */
  .panels{display:grid;grid-template-columns:.85fr 1.15fr;gap:14px;padding:16px 16mm 6px}
  .panel{background:#fff;border:1px solid var(--line);border-radius:15px;padding:16px 18px;
    box-shadow:0 1px 2px rgba(11,83,148,.04)}
  .panel .eyebrow{font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:500;letter-spacing:.16em;
    text-transform:uppercase;color:var(--ink-light);display:flex;align-items:center;gap:8px;margin-bottom:13px}
  .panel .eyebrow::before{content:"";width:13px;height:2px;border-radius:2px;background:var(--blue)}
  .donut-wrap{display:flex;align-items:center;gap:14px}
  .donut{flex-shrink:0}
  .donut-big{font-family:'Space Grotesk',sans-serif;font-size:30px;font-weight:600;fill:var(--ink);letter-spacing:-.02em}
  .donut-sub{font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:500;fill:var(--ink-light);letter-spacing:.12em}
  .dleg{display:flex;flex-direction:column;gap:8px;flex:1}
  .dl{display:flex;align-items:center;gap:8px}
  .dl-dot{width:9px;height:9px;border-radius:3px;flex-shrink:0}
  .dl-txt{display:flex;flex-direction:column;line-height:1.25}
  .dl-k{font-size:10.5px;font-weight:600;color:var(--ink-2)}
  .dl-v{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:500;color:var(--ink-light)}

  .aging-bar{display:flex;height:9px;border-radius:5px;overflow:hidden;background:var(--line-2);margin-bottom:14px}
  .aging-bar span{height:100%}
  .ag-list{display:flex;flex-direction:column;gap:1px}
  .ag-row{display:flex;align-items:center;gap:10px;padding:5px 0;border-bottom:1px solid var(--line-2)}
  .ag-row:last-child{border-bottom:none}
  .ag-dot{width:8px;height:8px;border-radius:2.5px;flex-shrink:0}
  .ag-label{font-size:11px;color:var(--ink-soft);font-weight:500;flex:1}
  .ag-amt{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;color:var(--ink)}
  .ag-n{font-family:'JetBrains Mono',monospace;font-size:9.5px;color:var(--ink-light);width:34px;text-align:right}

  /* Detalle */
  .detail{padding:16px 16mm 0}
  .detail .eyebrow{font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:500;letter-spacing:.16em;
    text-transform:uppercase;color:var(--ink-light);display:flex;align-items:center;gap:8px;margin-bottom:9px}
  .detail .eyebrow::before{content:"";width:13px;height:2px;border-radius:2px;background:var(--blue)}
  table{width:100%;border-collapse:collapse;font-size:10px}
  thead th{font-family:'JetBrains Mono',monospace;font-size:8.5px;font-weight:600;letter-spacing:.07em;
    text-transform:uppercase;color:var(--ink-light);padding:0 8px 7px;text-align:left;border-bottom:1.5px solid var(--ink-2)}
  thead th.num{text-align:right} thead th.ctr{text-align:center}
  tbody td{padding:7px 8px;border-bottom:1px solid var(--line-2);color:var(--ink-soft);vertical-align:middle}
  tbody tr:nth-child(even):not(.grp):not(.total-row) td{background:#FAFCFE}
  .num{text-align:right;font-family:'JetBrains Mono',monospace} .ctr{text-align:center}
  td.c-contract{font-weight:600;color:var(--blue);font-family:'JetBrains Mono',monospace;font-size:9.5px;white-space:nowrap}
  td.c-material{color:var(--ink-soft);font-weight:500}
  td.c-saldo{font-weight:700;color:var(--ink);font-size:10.5px}
  td.c-date{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--ink-soft)}
  td.od{color:var(--red)!important;font-weight:700}
  tr.grp td{padding:11px 8px 6px;border-bottom:1px solid var(--line)}
  .grp-name{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:11.5px;color:var(--ink)}
  .grp-risk{margin-left:9px;font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:500;
    color:var(--red);background:var(--red-tint);padding:1px 7px;border-radius:20px}
  .grp-total{font-weight:600;color:var(--ink-2);font-size:10.5px;padding-top:11px;padding-bottom:6px}
  tr.total-row td{padding:12px 8px;border-top:1.5px solid var(--ink-2);border-bottom:none;
    font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:12px;color:var(--ink)}
  tr.total-row td.num{font-family:'JetBrains Mono',monospace}

  .pill{display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:20px;font-size:8.5px;font-weight:600;white-space:nowrap}
  .pill i{width:5px;height:5px;border-radius:50%;display:inline-block}
  .pill.es-red{background:var(--red-tint);color:var(--red)} .pill.es-red i{background:var(--red)}
  .pill.es-amber{background:#FBF3E3;color:var(--amber)} .pill.es-amber i{background:var(--amber)}
  .pill.es-blue{background:#EAF2FA;color:var(--blue)} .pill.es-blue i{background:var(--blue)}
  .pill.es-grey{background:#F1F4F8;color:var(--ink-light)} .pill.es-grey i{background:var(--ink-light)}

  /* Footer */
  .foot{margin:16px 16mm 22mm;padding-top:9px;border-top:1px solid var(--line);
    display:flex;align-items:center;justify-content:space-between;font-size:9px;color:var(--ink-light)}
  .foot b{font-family:'Space Grotesk',sans-serif;color:var(--ink-2);font-weight:600}
  .foot .mono{font-family:'JetBrains Mono',monospace}

  /* Print */
  @page{size:A4 portrait;margin:11mm 0}
  @media print{
    body{background:#fff}
    .actions{display:none!important}
    .sheet{max-width:none;margin:0}
    .head,.top,.panels,.detail,.foot{padding-left:12mm;padding-right:12mm}
    .foot{margin-left:12mm;margin-right:12mm;margin-bottom:0}
    tr,.ag-row,.kpi,.panel{break-inside:avoid}
    thead{display:table-header-group}
    tr.grp{break-after:avoid}
  }
  @media screen{ .sheet{box-shadow:0 8px 40px rgba(11,83,148,.10);margin:14px auto} }
</style>
</head>
<body>
  <div class="actions">
    <span class="hint">Vista de impresión · usa <b>Imprimir → Guardar como PDF</b> (A4)</span>
    <div style="display:flex;gap:9px">
      <button class="btn ghost" onclick="window.close()">Cerrar</button>
      <button class="btn" onclick="window.print()">Guardar como PDF</button>
    </div>
  </div>

  <div class="sheet">
    <div class="head">
      <div class="head-row">
        <div class="head-l">
          ${logo ? `<img src="${logo}" alt="IBC"/>` : `<span style="font-family:'Space Grotesk';font-weight:600;font-size:16px">IBC STEEL GROUP</span>`}
          <span class="head-rule"></span>
          <div>
            <div class="eyebrow">Control de cartera</div>
            <div class="ttl">Reporte de Cartera</div>
            ${o.clientName ? `<div class="client">${esc(o.clientName)}</div>` : ""}
          </div>
        </div>
        <div class="head-r">${esc(o.generatedDate)}<br>USD · ${sub}</div>
      </div>
    </div>

    <div class="top">
      <div class="total">
        <div class="lbl">Cartera total por cobrar</div>
        <div class="fig">${money(o.total)}<span class="cur">USD</span></div>
        <div class="sub">${esc(sub)}</div>
      </div>
      <div class="kpis">
        <div class="kpi red">
          <div class="k">Atrasado</div>
          <div class="v">${money(o.montoAtrasado)}</div>
          <div class="d">${o.opsAtrasadas} ops · ${o.pctAtrasado}%</div>
        </div>
        <div class="kpi">
          <div class="k">Por vencer</div>
          <div class="v">${money(o.montoPorVencer)}</div>
          <div class="d">${o.opsPorVencer} ops</div>
        </div>
      </div>
    </div>

    <div class="panels">
      <div class="panel">
        <div class="eyebrow">Composición</div>
        <div class="donut-wrap">
          ${donut}
          <div class="dleg">
            <div class="dl"><span class="dl-dot" style="background:${RED}"></span><div class="dl-txt"><span class="dl-k">Vencido</span><span class="dl-v">${money(o.montoAtrasado)}</span></div></div>
            <div class="dl"><span class="dl-dot" style="background:${BLUE}"></span><div class="dl-txt"><span class="dl-k">Por vencer</span><span class="dl-v">${money(o.montoPorVencer)}</span></div></div>
            ${o.montoSinFecha > 0 ? `<div class="dl"><span class="dl-dot" style="background:${GREY}"></span><div class="dl-txt"><span class="dl-k">Sin fecha</span><span class="dl-v">${money(o.montoSinFecha)}</span></div></div>` : ""}
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="eyebrow">Antigüedad de cartera</div>
        <div class="aging-bar">${agingBar}</div>
        <div class="ag-list">${agingLegend}</div>
      </div>
    </div>

    <div class="detail">
      <div class="eyebrow">Detalle de operaciones</div>
      <table>
        <thead><tr>
          <th>Contrato</th><th>Material</th><th class="num">Saldo (USD)</th>
          <th class="ctr">ETA</th><th class="ctr">Deadline</th><th class="ctr">Estado</th>
        </tr></thead>
        <tbody>${rows.join("")}</tbody>
      </table>
    </div>

    <div class="foot">
      <span><b>IBC STEEL GROUP S.A.S.</b> · Documento interno · Confidencial</span>
      <span class="mono">Deadline = ETA − ${o.deadlineDays} días · ${esc(o.generatedDateTime)}</span>
    </div>
  </div>

  <script>
    (function(){
      function go(){ try{ window.focus(); window.print(); }catch(e){} }
      if (document.fonts && document.fonts.ready){
        document.fonts.ready.then(function(){ setTimeout(go, 350); });
      } else { window.addEventListener('load', function(){ setTimeout(go, 600); }); }
    })();
  </script>
</body>
</html>`;
}

export async function generateCarteraHTML(o: CarteraHTMLOptions): Promise<void> {
  const logo = await fetchLogo();
  const html = buildHTML(o, logo);
  const win = window.open("", "_blank");
  if (!win) {
    // Popup bloqueado → fallback a blob URL
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
