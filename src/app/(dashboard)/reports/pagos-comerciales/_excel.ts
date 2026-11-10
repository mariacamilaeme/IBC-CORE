import { addLogoToWorkbook, addLogoToHeader } from "@/lib/excel-logo";
import { DEADLINE_DAYS, ESTADO_LABEL, parseUTC, type CommercialPagos } from "./_logic";

type Worksheet = import("exceljs").Worksheet;
type Cell = import("exceljs").Cell;

// Paleta: editorial calmado, un azul, color solo como señal.
const NAVY = "0B5394", NAVY_DEEP = "08355C", WHITE = "FFFFFF", INK = "18202B", INK_SOFT = "3D4757",
  INK_LIGHT = "8B95A5", LINE = "E3E8EF", PAPER = "F7F9FC", BEACON = "00B8E0",
  RED = "C0392B", GREEN = "1E874B", GREY = "8B95A5", FONT = "Aptos";

const USD = '"$"#,##0.00';
const DATE = "dd/mm/yyyy";

const toExcelDate = (iso: string | null | undefined) => {
  const d = parseUTC(iso);
  return d ?? null;
};

const fill = (c: Cell, argb: string) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb } }; };

function heroBand(ws: Worksheet, logoId: number, totalCols: number, title: string, commercial: string, sub: string) {
  const r1 = ws.addRow([""]);
  r1.height = 58;
  ws.mergeCells(1, 1, 1, totalCols);
  ws.getCell("A1").value = { richText: [
    { text: "                                  ", font: { name: FONT, size: 18 } },
    { text: title, font: { name: FONT, size: 15, bold: true, color: { argb: WHITE } } },
    { text: `      ${commercial}`, font: { name: FONT, size: 15, bold: true, color: { argb: BEACON } } },
  ] };
  ws.getCell("A1").alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  for (let col = 1; col <= totalCols; col++) {
    const cell = r1.getCell(col);
    fill(cell, NAVY_DEEP);
    cell.border = { bottom: { style: "thick", color: { argb: BEACON } } };
  }
  addLogoToHeader(ws, logoId, totalCols);

  const r2 = ws.addRow([sub]);
  r2.height = 20;
  ws.mergeCells(2, 1, 2, totalCols);
  r2.getCell(1).font = { name: FONT, size: 9, italic: true, color: { argb: INK_LIGHT } };
  r2.getCell(1).alignment = { vertical: "middle", indent: 1 };
  ws.addRow([]);
}

function kpiRow(ws: Worksheet, label: string, value: unknown, opts: { color?: string; money?: boolean; big?: boolean; date?: boolean; indent?: boolean } = {}) {
  const r = ws.addRow([label, value]);
  r.height = opts.big ? 26 : 19;
  const a = r.getCell(1), b = r.getCell(2);
  a.font = { name: FONT, size: opts.big ? 11 : 10, bold: !!opts.big, color: { argb: opts.indent ? INK_SOFT : INK } };
  a.alignment = { vertical: "middle", indent: opts.indent ? 2 : 1 };
  b.font = { name: FONT, size: opts.big ? 14 : 10.5, bold: true, color: { argb: opts.color || NAVY } };
  b.alignment = { vertical: "middle", horizontal: "right" };
  if (opts.money) b.numFmt = USD;
  if (opts.date) b.numFmt = DATE;
  return r;
}

function headerRow(ws: Worksheet, headers: string[]) {
  const r = ws.addRow(headers);
  r.height = 30;
  r.eachCell((c) => {
    fill(c, NAVY);
    c.font = { name: FONT, size: 9.5, bold: true, color: { argb: WHITE } };
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    c.border = { bottom: { style: "thin", color: { argb: NAVY_DEEP } } };
  });
  return r.number;
}

function bodyCell(c: Cell, zebra: boolean) {
  c.font = { name: FONT, size: 10, color: { argb: INK } };
  c.alignment = { vertical: "middle", ...(c.alignment || {}) };
  c.border = { bottom: { style: "hair", color: { argb: LINE } } };
  if (zebra) fill(c, PAPER);
}

function notes(ws: Worksheet, totalCols: number, lines: string[]) {
  ws.addRow([]);
  const h = ws.addRow(["Notas"]);
  h.getCell(1).font = { name: FONT, size: 9.5, bold: true, color: { argb: INK_SOFT } };
  for (const l of lines) {
    const r = ws.addRow([`•  ${l}`]);
    ws.mergeCells(r.number, 1, r.number, totalCols);
    r.getCell(1).font = { name: FONT, size: 9, color: { argb: INK_LIGHT } };
    r.getCell(1).alignment = { indent: 1, wrapText: true, vertical: "top" };
    r.height = 16;
  }
}

export async function buildPagosExcelBlob(g: CommercialPagos, corteISO: string): Promise<Blob> {
  const excelMod = await import("exceljs");
  const ExcelJS = excelMod.default || excelMod;
  const wb = new ExcelJS.Workbook();
  wb.creator = "IBC Steel Group - IBC Core";
  wb.created = new Date();
  const logoId = await addLogoToWorkbook(wb);
  const corte = toExcelDate(corteISO);

  // =========================================================================
  // Hoja 1 — Cartera en tránsito
  // =========================================================================
  const ws = wb.addWorksheet("Tránsito", { views: [{ state: "frozen", ySplit: 10, showGridLines: false }] });
  const headers = ["Cliente", "Material", "Contrato China (SC)", "Contrato cliente (SC)", "Saldo pendiente cliente (USD)", "Pago saldo", "Motonave (MV)", "ETA", "Deadline motonave", "Fecha vencimiento pago", "Días de atraso", "Estado", "Tons embarcadas", "Término de pago (JPB)", "Comentarios"];
  ws.columns = [38, 40, 20, 20, 18, 13, 18, 13, 15, 18, 11, 24, 13, 24, 30].map((width) => ({ width }));
  const N = headers.length;

  heroBand(ws, logoId, N, "PAGOS · CARTERA EN TRÁNSITO", g.name,
    "Fuente: IBC Core · Pedidos EN TRÁNSITO con saldo del cliente PENDIENTE o ABONO · Valores en USD");

  const first = 11;
  const last = first + Math.max(g.transit.length, 1) - 1;
  const rng = (col: string) => `${col}${first}:${col}${last}`;

  kpiRow(ws, "Fecha de corte (editable)", corte, { date: true, color: INK });           // fila 4
  kpiRow(ws, "Total cartera en tránsito (USD)", { formula: `SUM(${rng("E")})`, result: g.total }, { money: true, big: true }); // 5
  kpiRow(ws, "Atrasado", { formula: `SUMIF(${rng("L")},"Atrasado",${rng("E")})`, result: g.atrasado }, { money: true, color: RED, indent: true }); // 6
  kpiRow(ws, "Adelantado (no vencido)", { formula: `SUMIF(${rng("L")},"Adelantado",${rng("E")})`, result: g.adelantado }, { money: true, color: GREEN, indent: true }); // 7
  kpiRow(ws, "Crédito días BL · falta fecha BL", { formula: `SUMIF(${rng("L")},"Crédito*",${rng("E")})`, result: g.credito }, { money: true, color: NAVY, indent: true }); // 8
  kpiRow(ws, "Pendiente confirmar llegada motonave", { formula: `SUMIF(${rng("L")},"Pendiente*",${rng("E")})`, result: g.sinEta }, { money: true, color: GREY, indent: true }); // 9
  headerRow(ws, headers); // 10

  if (g.transit.length === 0) {
    const r = ws.addRow(["Sin cartera en tránsito pendiente"]);
    ws.mergeCells(r.number, 1, r.number, N);
    r.getCell(1).font = { name: FONT, size: 10, italic: true, color: { argb: INK_LIGHT } };
    r.getCell(1).alignment = { indent: 1 };
  }

  g.transit.forEach((t, i) => {
    const rn = first + i;
    const c = t.c;
    const r = ws.addRow([
      c.client_name,
      c.detail?.replace(/\s+/g, " ").trim() || "",
      c.china_contract || "",
      c.client_contract || "",
      t.amount ?? null,
      c.balance_paid || "",
      c.vessel_name || "",
      toExcelDate(t.eta) ?? "Pendiente confirmar llegada motonave",
      t.eta ? { formula: `IF(ISNUMBER(H${rn}),H${rn}-${DEADLINE_DAYS},"")`, result: toExcelDate(t.mvDeadline) ?? undefined } : null,
      // Sin término especial el pago vence en el deadline de la motonave (fórmula); con JPB, la fecha anotada.
      t.special ? toExcelDate(t.deadline)
        : t.pendingLabel ? t.pendingLabel
        : t.eta ? { formula: `I${rn}`, result: toExcelDate(t.deadline) ?? undefined } : null,
      { formula: `IF(ISNUMBER(J${rn}),$B$4-J${rn},"")`, result: t.daysLate ?? undefined },
      { formula: `IF(ISNUMBER(J${rn}),IF($B$4-J${rn}>0,"Atrasado","Adelantado"),IF(J${rn}="","Pendiente confirmar llegada motonave","Crédito · falta fecha BL"))`,
        result: ESTADO_LABEL[t.estado] },
      c.tons_shipped ?? c.tons_agreed ?? null,
      t.terms || "",
      c.notes || "",
    ]);
    r.height = 20;
    r.eachCell({ includeEmpty: true }, (cell, col) => {
      bodyCell(cell, i % 2 === 1);
      if (col === 1) cell.font = { name: FONT, size: 10, bold: true, color: { argb: INK } };
      if (col === 5) { cell.numFmt = USD; cell.font = { name: FONT, size: 10, bold: true, color: { argb: NAVY } }; }
      if (col >= 8 && col <= 10) { cell.numFmt = DATE; cell.alignment = { vertical: "middle", horizontal: "center" }; }
      if (col === 10 && (t.special || t.pendingLabel)) cell.font = { name: FONT, size: 10, bold: true, italic: !!t.pendingLabel, color: { argb: NAVY } };
      if (col === 11 || col === 13) cell.alignment = { vertical: "middle", horizontal: "center" };
      if (col === 13) cell.numFmt = "#,##0.00";
      if (col === 14 && t.terms) cell.font = { name: FONT, size: 10, color: { argb: NAVY } };
      if (col === 2) cell.alignment = { vertical: "middle", wrapText: false };
    });
  });

  // Total
  const tr = ws.addRow(["TOTAL", "", "", "", { formula: `SUM(${rng("E")})`, result: g.total }]);
  tr.height = 24;
  for (let col = 1; col <= N; col++) {
    const cell = tr.getCell(col);
    cell.font = { name: FONT, size: 10.5, bold: true, color: { argb: NAVY_DEEP } };
    cell.border = { top: { style: "medium", color: { argb: NAVY } } };
    cell.alignment = { vertical: "middle", indent: col === 1 ? 1 : 0 };
  }
  tr.getCell(5).numFmt = USD;

  // Color del estado como señal
  if (g.transit.length) {
    ws.addConditionalFormatting({
      ref: `K${first}:L${last}`,
      rules: [
        { type: "expression", priority: 1, formulae: [`$L${first}="Atrasado"`], style: { font: { color: { argb: "FF" + RED }, bold: true } } },
        { type: "expression", priority: 2, formulae: [`$L${first}="Adelantado"`], style: { font: { color: { argb: "FF" + GREEN }, bold: true } } },
        { type: "expression", priority: 3, formulae: [`LEFT($L${first},9)="Pendiente"`], style: { font: { color: { argb: "FF" + GREY }, italic: true } } },
        { type: "expression", priority: 4, formulae: [`LEFT($L${first},7)="Crédito"`], style: { font: { color: { argb: "FF" + NAVY }, bold: true } } },
      ],
    });
  }

  notes(ws, N, [
    `Deadline motonave = ETA − ${DEADLINE_DAYS} días: sirve para avisar al cliente que el embarque viene arribando y solicitar la liberación a tiempo.`,
    "Fecha vencimiento pago = la fecha anotada en la columna JPB del STATUS (p. ej. 60 días BL - 7 NOV); si no hay término especial, es el mismo deadline motonave.",
    "Días de atraso = Fecha de corte − Fecha vencimiento pago: Atrasado si > 0; Adelantado si ≤ 0. Crédito BL sin fecha: escriba la fecha en la columna J y se recalcula.",
    "Cambie la fecha de corte (B4) y los días, estados y totales se recalculan solos.",
    "Pedidos sin ETA en IBC Core se muestran como \"Pendiente confirmar llegada motonave\" y no se cuentan como atrasados.",
    "Saldo pendiente = valor pendiente del cliente registrado en el STATUS. En pagos con ABONO verificar si corresponde al saldo restante.",
  ]);
  ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };

  // =========================================================================
  // Hoja 2 — Anticipos pendientes
  // =========================================================================
  const wa = wb.addWorksheet("Anticipos pendientes", { views: [{ state: "frozen", ySplit: 8, showGridLines: false }] });
  const hA = ["Cliente", "Material", "Contrato cliente (SC)", "Contrato China (SC)", "Fecha emisión", "Días transcurridos", "Tons acordadas", "Estado contrato", "Pago anticipo", "País", "Comentarios"];
  wa.columns = [38, 44, 20, 20, 14, 13, 13, 20, 13, 14, 30].map((width) => ({ width }));
  const NA = hA.length;
  heroBand(wa, logoId, NA, "PAGOS · ANTICIPOS PENDIENTES", g.name,
    "Fuente: IBC Core · Contratos vigentes cuyo anticipo del cliente no se ha recibido");

  const fA = 9;
  const lA = fA + Math.max(g.advances.length, 1) - 1;
  kpiRow(wa, "Fecha de corte", { formula: "'Tránsito'!B4", result: corte ?? undefined }, { date: true, color: INK }); // 4
  kpiRow(wa, "Contratos con anticipo pendiente", { formula: `COUNTA(C${fA}:C${lA})`, result: g.advances.length }, { big: true }); // 5
  const r6 = kpiRow(wa, "Toneladas acordadas", { formula: `SUM(G${fA}:G${lA})`, result: g.advances.reduce((s, a) => s + (a.c.tons_agreed ?? 0), 0) }, { indent: true }); // 6
  r6.getCell(2).numFmt = "#,##0.00";
  wa.addRow([]); // 7
  headerRow(wa, hA); // 8 — datos desde la fila 9

  if (g.advances.length === 0) {
    const r = wa.addRow(["Sin anticipos pendientes"]);
    wa.mergeCells(r.number, 1, r.number, NA);
    r.getCell(1).font = { name: FONT, size: 10, italic: true, color: { argb: INK_LIGHT } };
    r.getCell(1).alignment = { indent: 1 };
  }
  g.advances.forEach((a, i) => {
    const rn = fA + i;
    const c = a.c;
    const r = wa.addRow([
      c.client_name,
      c.detail?.replace(/\s+/g, " ").trim() || "",
      c.client_contract || "",
      c.china_contract || "",
      toExcelDate(c.contract_date),
      c.contract_date ? { formula: `IF(E${rn}="","",$B$4-E${rn})`, result: a.daysElapsed ?? undefined } : null,
      c.tons_agreed ?? null,
      c.status || "",
      c.advance_paid || "",
      c.country || "",
      c.notes || "",
    ]);
    r.height = 20;
    r.eachCell({ includeEmpty: true }, (cell, col) => {
      bodyCell(cell, i % 2 === 1);
      if (col === 1) cell.font = { name: FONT, size: 10, bold: true, color: { argb: INK } };
      if (col === 5) { cell.numFmt = DATE; cell.alignment = { vertical: "middle", horizontal: "center" }; }
      if (col === 6 || col === 7 || col === 9) cell.alignment = { vertical: "middle", horizontal: "center" };
      if (col === 7) cell.numFmt = "#,##0.00";
    });
  });
  notes(wa, NA, [
    "Incluye contratos en estado PENDIENTE ANTICIPO o con anticipo del cliente marcado NO / PENDIENTE (excluye anulados y entregados).",
    "Días transcurridos = Fecha de corte − Fecha de emisión del contrato.",
    "El valor del anticipo no está registrado en IBC Core; confirmar el monto con el contrato del cliente.",
  ]);
  wa.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export const pagosFileName = (commercial: string, corteISO: string) => {
  const safe = commercial.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_").trim().toUpperCase();
  return `Pagos_${safe}_${corteISO}.xlsx`;
};
