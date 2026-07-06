/**
 * IBC Core — Cartera PDF (dashboard-style, high impact)
 * Portada con donut, KPIs y antigüedad + tabla de operaciones agrupada.
 */

type RGB = [number, number, number];

export interface CarteraPDFItem {
  contract: string; material: string; saldo: string; eta: string; deadline: string;
  estado: string; estadoColor: RGB; overdue: boolean;
}
export interface CarteraPDFGroup { client: string; total: string; items: CarteraPDFItem[]; }
export interface CarteraPDFOptions {
  clientName: string | null;
  generatedDate: string;
  totalText: string;
  ops: number; clientes: number;
  montoAtrasado: number; opsAtrasadas: number; atrasadoText: string;
  montoPorVencer: number; opsPorVencer: number; porVencerText: string;
  montoSinFecha: number;
  pctAtrasado: number;
  aging: { label: string; amount: number; amountText: string; color: RGB }[];
  groups: CarteraPDFGroup[];
  filename: string;
}

const C = {
  navyDeep: [8, 53, 92] as RGB,
  navy: [11, 83, 148] as RGB,
  gold: [200, 165, 50] as RGB,
  white: [255, 255, 255] as RGB,
  ink: [24, 32, 43] as RGB,
  inkSoft: [61, 71, 87] as RGB,
  inkLight: [140, 150, 170] as RGB,
  line: [228, 224, 216] as RGB,
  paper: [251, 250, 247] as RGB,
  red: [225, 29, 72] as RGB,
  redTint: [253, 235, 238] as RGB,
  green: [22, 163, 74] as RGB,
  greenTint: [231, 247, 236] as RGB,
  amber: [180, 83, 9] as RGB,
  grey: [186, 196, 210] as RGB,
};

async function fetchLogo(): Promise<string | null> {
  try {
    const res = await fetch("/logo-ibc.png");
    const buf = await res.arrayBuffer();
    const bin = new Uint8Array(buf).reduce((a, b) => a + String.fromCharCode(b), "");
    return "data:image/png;base64," + btoa(bin);
  } catch { return null; }
}

export async function generateCarteraPDF(opts: CarteraPDFOptions): Promise<void> {
  const jsPDFMod = await import("jspdf");
  const jsPDF = jsPDFMod.default || jsPDFMod.jsPDF;
  const atMod = await import("jspdf-autotable");
  const autoTable = atMod.default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const logo = await fetchLogo();

  const setF = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const setT = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);

  const HH = 20;  // header band height
  const FH = 13;  // footer band height

  const drawHeader = (pg: number, tp: number) => {
    setF(C.navyDeep); doc.rect(0, 0, pw, HH, "F");
    setF(C.gold); doc.rect(0, HH - 0.7, pw, 0.7, "F");
    if (logo) { try { doc.addImage(logo, "PNG", 10, 4.5, 30, 11); } catch { /* ignore */ } }
    doc.setDrawColor(C.gold[0], C.gold[1], C.gold[2]); doc.setLineWidth(0.3); doc.line(44, 4.5, 44, HH - 4.5);
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); setT(C.white);
    doc.text("REPORTE DE CARTERA", 49, 9.5);
    if (opts.clientName) { doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); setT(C.gold); doc.text(opts.clientName, 49, 15.5); }
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); setT([170, 190, 220]);
    doc.text(opts.generatedDate, pw - 10, 8, { align: "right" });
    doc.text(`Pág. ${pg} / ${tp}`, pw - 10, 13, { align: "right" });
    doc.text("USD", pw - 10, 18, { align: "right" });
  };

  const drawFooter = () => {
    const fy = ph - FH;
    setF(C.navyDeep); doc.rect(0, fy, pw, FH, "F");
    setF(C.gold); doc.rect(0, fy, pw, 0.4, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); setT(C.gold);
    doc.text("IBC STEEL GROUP S.A.S.", 10, fy + 6);
    doc.setFont("helvetica", "normal"); doc.setFontSize(6); setT([150, 165, 195]);
    doc.text("Documento interno de control de cartera  ·  Confidencial", pw / 2, fy + 6, { align: "center" });
    doc.text("www.ibcsteelgroup.com", pw - 10, fy + 6, { align: "right" });
  };

  // Donut segment as filled annulus polygon
  const donutSeg = (cx: number, cy: number, ro: number, ri: number, a0: number, a1: number, rgb: RGB) => {
    const steps = Math.max(2, Math.ceil((a1 - a0) / (Math.PI / 36)));
    const pts: [number, number][] = [];
    for (let i = 0; i <= steps; i++) { const a = a0 + (a1 - a0) * (i / steps); pts.push([cx + ro * Math.cos(a), cy + ro * Math.sin(a)]); }
    for (let i = steps; i >= 0; i--) { const a = a0 + (a1 - a0) * (i / steps); pts.push([cx + ri * Math.cos(a), cy + ri * Math.sin(a)]); }
    const rel: [number, number][] = [];
    for (let i = 1; i < pts.length; i++) rel.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
    setF(rgb);
    doc.lines(rel, pts[0][0], pts[0][1], [1, 1], "F", true);
  };

  // ─── PAGE 1 DASHBOARD ───────────────────────────────────────
  // Big total
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); setT(C.inkLight);
  doc.text("CARTERA TOTAL POR COBRAR", 12, 30);
  doc.setFont("helvetica", "bold"); doc.setFontSize(30); setT(C.navy);
  doc.text(opts.totalText, 12, 42);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); setT(C.inkLight);
  doc.text(`${opts.ops} operaciones${opts.clientName ? "" : `  ·  ${opts.clientes} clientes`}`, 12, 48);

  // KPI chips
  const chip = (x: number, y: number, w: number, h: number, bg: RGB, label: string, value: string, valueColor: RGB, dot: RGB) => {
    setF(bg); doc.roundedRect(x, y, w, h, 2, 2, "F");
    setF(dot); doc.circle(x + 5, y + 6, 1.4, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); setT(C.inkLight); doc.text(label, x + 9, y + 7);
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); setT(valueColor); doc.text(value, x + 9, y + 14.5);
  };
  chip(12, 54, 58, 19, C.redTint, "ATRASADO", `${opts.atrasadoText}`, C.red, C.red);
  chip(74, 54, 58, 19, C.greenTint, "POR VENCER", `${opts.porVencerText}`, C.green, C.green);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); setT(C.inkLight);
  doc.text(`${opts.opsAtrasadas} ops`, 12 + 58 - 4, 72, { align: "right" });
  doc.text(`${opts.opsPorVencer} ops`, 74 + 58 - 4, 72, { align: "right" });

  // Donut (right)
  const cx = 168, cy = 48, ro = 24, ri = 14;
  const dseg = [
    { v: opts.montoAtrasado, c: C.red }, { v: opts.montoPorVencer, c: C.green }, { v: opts.montoSinFecha, c: C.grey },
  ].filter((s) => s.v > 0);
  const dtot = dseg.reduce((s, x) => s + x.v, 0) || 1;
  if (dseg.length === 0) { setF(C.line); doc.circle(cx, cy, ro, "F"); setF(C.white); doc.circle(cx, cy, ri, "F"); }
  let ang = -Math.PI / 2;
  for (const s of dseg) { const a1 = ang + (s.v / dtot) * Math.PI * 2; donutSeg(cx, cy, ro, ri, ang, a1, s.c); ang = a1; }
  doc.setFont("helvetica", "bold"); doc.setFontSize(20); setT(C.navy); doc.text(`${opts.pctAtrasado}%`, cx, cy + 1, { align: "center" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(6); setT(C.inkLight); doc.text("ATRASADO", cx, cy + 6, { align: "center" });

  // Aging bars
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); setT(C.inkLight);
  doc.text("ANTIGÜEDAD DE CARTERA", 12, 86);
  const agingActive = opts.aging.filter((a) => a.amount > 0);
  const maxA = Math.max(1, ...agingActive.map((a) => a.amount));
  let ay = 91;
  const bx = 54, bw = 118;
  for (const a of agingActive) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); setT(C.inkSoft); doc.text(a.label, 12, ay + 2.9);
    setF(C.line); doc.roundedRect(bx, ay, bw, 3.6, 1, 1, "F");
    const w = Math.max(1.6, (a.amount / maxA) * bw);
    setF(a.color); doc.roundedRect(bx, ay, w, 3.6, 1, 1, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); setT(C.ink); doc.text(a.amountText, pw - 12, ay + 3, { align: "right" });
    ay += 8.5;
  }

  // Section label + table
  const tableStartY = ay + 6;
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); setT(C.inkLight);
  doc.text("DETALLE DE OPERACIONES", 12, tableStartY);

  // Build body
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any[] = [];
  for (const g of opts.groups) {
    if (!opts.clientName) {
      body.push([
        { content: g.client, colSpan: 4, styles: { fillColor: [242, 245, 249], textColor: C.navy, fontStyle: "bold", halign: "left" } },
        { content: g.total, colSpan: 2, styles: { fillColor: [242, 245, 249], textColor: C.navy, fontStyle: "bold", halign: "right" } },
      ]);
    }
    for (const it of g.items) {
      body.push([
        it.contract,
        it.material,
        it.saldo,
        it.eta,
        { content: it.deadline, styles: it.overdue ? { textColor: C.red, fontStyle: "bold" } : {} },
        { content: it.estado, styles: { textColor: it.estadoColor, fontStyle: "bold" } },
      ]);
    }
  }
  body.push([
    { content: "TOTAL CARTERA", colSpan: 2, styles: { fillColor: C.navyDeep, textColor: C.white, fontStyle: "bold", halign: "left" } },
    { content: opts.totalText, styles: { fillColor: C.navyDeep, textColor: C.white, fontStyle: "bold", halign: "right" } },
    { content: "", styles: { fillColor: C.navyDeep } },
    { content: "", styles: { fillColor: C.navyDeep } },
    { content: "", styles: { fillColor: C.navyDeep } },
  ]);

  autoTable(doc, {
    head: [["CONTRATO", "MATERIAL", "SALDO (USD)", "ETA", "DEADLINE", "ESTADO"]],
    body,
    startY: tableStartY + 3,
    margin: { top: HH + 4, left: 10, right: 10, bottom: FH + 3 },
    theme: "plain",
    showHead: "everyPage",
    styles: { font: "helvetica", fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 2.5, right: 2.5 }, textColor: C.inkSoft, lineColor: C.line, lineWidth: 0.08, overflow: "linebreak", valign: "middle" },
    headStyles: { fillColor: C.navy, textColor: C.white, fontSize: 8, fontStyle: "bold", halign: "center", cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 }, lineWidth: 0 },
    alternateRowStyles: { fillColor: [251, 250, 247] },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: "bold", textColor: C.navy },
      1: { cellWidth: 68 },
      2: { cellWidth: 28, halign: "right", fontStyle: "bold", textColor: C.amber },
      3: { cellWidth: 20, halign: "center" },
      4: { cellWidth: 22, halign: "center" },
      5: { cellWidth: 22, halign: "center" },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didDrawPage: (data: any) => {
      drawHeader(data.pageNumber, doc.getNumberOfPages());
      drawFooter();
    },
  });

  // Redraw header/footer with correct total page count
  const tp = doc.getNumberOfPages();
  for (let i = 1; i <= tp; i++) { doc.setPage(i); drawHeader(i, tp); drawFooter(); }

  doc.save(`${opts.filename}.pdf`);
}
