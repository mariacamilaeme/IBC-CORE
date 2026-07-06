/**
 * IBC Core — Executive PDF Report Generator v3
 * Premium corporate reports for IBC Steel Group.
 */

export interface PDFColumn {
  header: string;
  dataKey: string;
  width?: number;
  halign?: "left" | "center" | "right";
  bold?: boolean;
  color?: string;
}

export interface PDFReportOptions {
  title: string;
  subtitle?: string;
  filename: string;
  columns: PDFColumn[];
  data: Record<string, string | number>[];
  orientation?: "portrait" | "landscape";
  recordLabel?: string;
  appendDate?: boolean;
}

// ─── Palette ────────────────────────────────────────────

const C = {
  navy:      [11, 83, 148],
  navyDark:  [8, 45, 90],
  navyDeep:  [6, 28, 58],
  steel:     [93, 129, 175],
  gold:      [200, 165, 50],
  goldDark:  [170, 135, 30],
  teal:      [14, 165, 165],
  white:     [255, 255, 255],
  offWhite:  [248, 249, 252],
  grayLight: [240, 242, 246],
  grayMid:   [200, 205, 215],
  textDark:  [25, 30, 40],
  textBody:  [55, 60, 72],
  textMuted: [130, 138, 155],
  stripe:    [245, 247, 252],
  border:    [218, 222, 230],
} as const;

async function fetchLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch("/logo-ibc.png");
    const buf = await res.arrayBuffer();
    const bin = new Uint8Array(buf).reduce((a, b) => a + String.fromCharCode(b), "");
    return "data:image/png;base64," + btoa(bin);
  } catch { return null; }
}

export async function generatePDFReport(opts: PDFReportOptions): Promise<void> {
  const { title, subtitle, filename, columns, data, orientation = "landscape", recordLabel = "registros", appendDate = true } = opts;

  const jsPDFMod = await import("jspdf");
  const jsPDF = jsPDFMod.default || jsPDFMod.jsPDF;
  const atMod = await import("jspdf-autotable");
  const autoTable = atMod.default;

  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const logo = await fetchLogoBase64();
  const now = new Date();
  const dateStr = now.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
  const numCols = columns.length;

  // Adaptive sizing — more aggressive for many columns
  const fs = numCols <= 4 ? 10 : numCols <= 6 ? 9 : numCols <= 8 ? 8 : numCols <= 10 ? 7.5 : numCols <= 12 ? 6.5 : numCols <= 15 ? 5.5 : 5;
  const hfs = numCols <= 6 ? 8 : numCols <= 10 ? 6.5 : numCols <= 15 ? 5.5 : 4.5;
  const pad = numCols <= 6 ? 3 : numCols <= 10 ? 2 : numCols <= 15 ? 1.4 : 1;

  // ════════════════════════════════════════════════════
  //  HEADER — 3-layer premium band
  // ════════════════════════════════════════════════════

  const HH = subtitle ? 34 : 30; // header height (taller when subtitle present)

  const drawHeader = (d: typeof doc, pg: number, tp: number) => {
    // Layer 1: Deep navy full bleed
    d.setFillColor(...C.navyDeep);
    d.rect(0, 0, pw, HH, "F");

    // Layer 2: Lighter navy right panel (60%)
    d.setFillColor(...C.navyDark);
    d.rect(pw * 0.35, 0, pw * 0.65, HH, "F");

    // Blend strip
    d.setFillColor(7, 36, 74);
    d.rect(pw * 0.33, 0, pw * 0.04, HH, "F");

    // Gold top line
    d.setFillColor(...C.gold);
    d.rect(0, 0, pw, 1.2, "F");

    // Gold bottom accent (partial)
    d.setFillColor(...C.gold);
    d.rect(0, HH - 0.8, pw * 0.12, 0.8, "F");
    d.setFillColor(...C.teal);
    d.rect(pw * 0.12, HH - 0.8, pw * 0.08, 0.8, "F");

    // Logo
    if (logo) {
      try {
        // White glow behind logo
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        try { d.setGState(new (jsPDF as any).GState({ opacity: 0.06 })); } catch {}
        d.setFillColor(255, 255, 255);
        d.roundedRect(10, 5, 40, 20, 3, 3, "F");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        try { d.setGState(new (jsPDF as any).GState({ opacity: 1 })); } catch {}
        d.addImage(logo, "PNG", 13, 6.5, 34, 16);
      } catch {}
    }

    // Vertical gold separator
    d.setDrawColor(...C.gold);
    d.setLineWidth(0.3);
    d.line(52, 5, 52, HH - 5);

    // Title
    d.setFont("helvetica", "bold");
    d.setFontSize(18);
    d.setTextColor(...C.white);
    d.text(title, 58, subtitle ? 11 : 14);

    // Subtitle (client name if filtered by one client)
    if (subtitle) {
      d.setFont("helvetica", "bold");
      d.setFontSize(10);
      d.setTextColor(...C.gold);
      d.text(subtitle, 58, 18);
    }

    // Meta line
    d.setFont("helvetica", "normal");
    d.setFontSize(8);
    d.setTextColor(170, 190, 220);
    d.text(`${dateStr}  ·  ${data.length.toLocaleString("es-CO")} ${recordLabel}`, 58, subtitle ? 24 : 21);

    // Right: branding block
    const rx = pw - 8;

    // IBC STEEL GROUP
    d.setFont("helvetica", "bold");
    d.setFontSize(8);
    d.setTextColor(...C.gold);
    d.text("IBC STEEL GROUP", rx, 10, { align: "right" });

    // Address
    d.setFont("helvetica", "normal");
    d.setFontSize(5.5);
    d.setTextColor(140, 165, 200);
    d.text("848 Brickell Ave Ste 950", rx, 15, { align: "right" });
    d.text("Miami, FL 33131", rx, 19, { align: "right" });

    // Page
    d.setFontSize(6);
    d.setTextColor(100, 125, 165);
    d.text(`${pg} / ${tp}`, rx, 25, { align: "right" });
  };

  // ════════════════════════════════════════════════════
  //  FOOTER — Refined bottom band
  // ════════════════════════════════════════════════════

  const FH = 10;

  const drawFooter = (d: typeof doc) => {
    const fy = ph - FH;

    // Navy background
    d.setFillColor(...C.navyDeep);
    d.rect(0, fy, pw, FH, "F");

    // Gold top accent
    d.setFillColor(...C.gold);
    d.rect(0, fy, pw, 0.4, "F");

    // Left
    d.setFont("helvetica", "bold");
    d.setFontSize(6);
    d.setTextColor(...C.gold);
    d.text("IBC STEEL GROUP CORP", 10, fy + 5.5);

    // Separator dot
    d.setFillColor(...C.gold);
    d.circle(55, fy + 4.5, 0.5, "F");

    // Center
    d.setFont("helvetica", "normal");
    d.setFontSize(5.5);
    d.setTextColor(140, 155, 180);
    d.text("Documento confidencial  ·  IBC Core Platform", pw / 2, fy + 5.5, { align: "center" });

    // Right
    d.setFont("helvetica", "normal");
    d.setFontSize(5.5);
    d.setTextColor(120, 140, 170);
    d.text("www.ibcsteelgroup.com", pw - 10, fy + 5.5, { align: "right" });
  };

  // ════════════════════════════════════════════════════
  //  TABLE
  // ════════════════════════════════════════════════════

  const tCols = columns.map(c => ({ header: c.header, dataKey: c.dataKey }));
  const sideM = numCols <= 10 ? 8 : 5; // tighter margins for many columns
  const uw = pw - sideM * 2;
  const tw = columns.reduce((s, c) => s + (c.width || 1), 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cStyles: Record<string, any> = {};
  // Only set fixed widths when <= 12 columns; otherwise let autotable auto-size
  const useFixedWidths = numCols <= 12;
  columns.forEach(col => {
    cStyles[col.dataKey] = {
      ...(useFixedWidths ? { cellWidth: ((col.width || 1) / tw) * uw } : {}),
      halign: "center",
      valign: "middle",
      ...(col.bold ? { fontStyle: "bold" as const } : {}),
      ...(col.color ? { textColor: hex2rgb(col.color) } : {}),
    };
  });

  const sy = HH + 3;

  autoTable(doc, {
    columns: tCols,
    body: data,
    startY: sy,
    margin: { top: sy, left: sideM, right: sideM, bottom: FH + 3 },
    theme: "plain",
    showHead: "everyPage",
    tableWidth: "auto",

    styles: {
      font: "helvetica",
      fontSize: fs,
      cellPadding: { top: pad, bottom: pad, left: pad + 0.3, right: pad + 0.3 },
      textColor: C.textBody as unknown as [number, number, number],
      lineColor: C.border as unknown as [number, number, number],
      lineWidth: 0.06,
      overflow: "linebreak",
      minCellHeight: 5,
    },

    headStyles: {
      fillColor: C.navy as unknown as [number, number, number],
      textColor: C.white as unknown as [number, number, number],
      fontSize: hfs,
      fontStyle: "bold",
      halign: "center",
      cellPadding: { top: pad + 0.8, bottom: pad + 0.8, left: pad, right: pad },
      minCellHeight: 7,
      lineColor: C.navyDark as unknown as [number, number, number],
      lineWidth: 0.15,
      overflow: "linebreak",
    },

    alternateRowStyles: {
      fillColor: C.stripe as unknown as [number, number, number],
    },

    columnStyles: cStyles,

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didDrawCell: (h: any) => {
      // Teal left accent on first body column
      if (h.section === "body" && h.column.index === 0) {
        h.doc.setFillColor(...C.teal);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        try { h.doc.setGState(new (jsPDF as any).GState({ opacity: 0.3 })); } catch {}
        h.doc.rect(h.cell.x, h.cell.y, 0.4, h.cell.height, "F");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        try { h.doc.setGState(new (jsPDF as any).GState({ opacity: 1 })); } catch {}
      }

      // Gold underline on header cells
      if (h.section === "head") {
        const bx = h.cell.x, by = h.cell.y + h.cell.height, bw = h.cell.width;
        h.doc.setDrawColor(...(h.column.index < 3 ? C.gold : C.steel));
        h.doc.setLineWidth(h.column.index < 3 ? 0.5 : 0.2);
        h.doc.line(bx, by, bx + bw, by);
      }
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didParseCell: (h: any) => {
      if (h.section === "body") {
        const col = columns.find(c => c.dataKey === h.column.dataKey);
        if (col?.bold) h.cell.styles.fontStyle = "bold";
        if (col?.color) h.cell.styles.textColor = hex2rgb(col.color);
      }
    },
  });

  // ════════════════════════════════════════════════════
  //  DRAW HEADER + FOOTER ON ALL PAGES
  // ════════════════════════════════════════════════════

  const tp = doc.getNumberOfPages();
  for (let i = 1; i <= tp; i++) {
    doc.setPage(i);
    drawHeader(doc, i, tp);
    drawFooter(doc);
  }

  doc.save(appendDate ? `${filename}_${now.toISOString().slice(0, 10)}.pdf` : `${filename}.pdf`);
}

function hex2rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}
