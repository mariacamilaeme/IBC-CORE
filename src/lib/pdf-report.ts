/**
 * IBC Core — Fortune 100 Premium PDF Report Generator (2026 Edition)
 *
 * Ultra-premium PDF reports with sophisticated typography, geometric
 * accents, executive-grade layout, and refined data presentation.
 * Designed to match the visual standards of Fortune 100 annual reports.
 *
 * Uses jsPDF + jspdf-autotable.
 */

// ─── Types ─────────────────────────────────────────────

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
}

// ─── Brand Palette (2026 Refined) ───────────────────────

const DEEP_NAVY    = [15, 30, 55]   as const;  // #0F1E37
const NAVY         = [30, 58, 95]   as const;  // #1E3A5F
const NAVY_MID     = [38, 70, 112]  as const;  // #264670
const SLATE_BLUE   = [55, 95, 145]  as const;  // #375F91
const ICE_BLUE     = [220, 235, 250] as const; // #DCEBFA
const WHITE        = [255, 255, 255] as const;
const OFF_WHITE    = [252, 251, 249] as const; // #FCFBF9
const WARM_GRAY    = [245, 243, 240] as const; // #F5F3F0
const BORDER_LIGHT = [228, 225, 220] as const; // #E4E1DC
const TEXT_PRIMARY = [20, 25, 35]    as const;  // #141923
const TEXT_BODY    = [45, 50, 62]    as const;  // #2D323E
const TEXT_MUTED   = [120, 125, 138] as const;  // #787D8A
const TEXT_SUBTLE  = [160, 164, 175] as const;  // #A0A4AF
const ACCENT_GOLD  = [195, 160, 45]  as const;  // #C3A02D
const ACCENT_TEAL  = [0, 168, 150]   as const;  // #00A896
const ROW_STRIPE   = [248, 247, 244] as const; // #F8F7F4
const DIVIDER      = [215, 212, 207] as const; // #D7D4CF

// ─── Logo helper ────────────────────────────────────────

async function fetchLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch("/logo-ibc.png");
    const buf = await res.arrayBuffer();
    const binary = new Uint8Array(buf).reduce(
      (acc, byte) => acc + String.fromCharCode(byte),
      ""
    );
    return "data:image/png;base64," + btoa(binary);
  } catch {
    return null;
  }
}

// ─── Main Generator ─────────────────────────────────────

export async function generatePDFReport(opts: PDFReportOptions): Promise<void> {
  const {
    title,
    subtitle,
    filename,
    columns,
    data,
    orientation = "landscape",
    recordLabel = "registros",
  } = opts;

  const jsPDFModule = await import("jspdf");
  const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = autoTableModule.default || autoTableModule.default;

  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const M = 12; // margin

  const logoBase64 = await fetchLogoBase64();
  const now = new Date();
  const dateStr = now.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // ════════════════════════════════════════════════════════
  //  EXECUTIVE HEADER — Multi-layer premium design
  // ════════════════════════════════════════════════════════

  const HEADER_H = 28;

  const drawHeader = (pageDoc: typeof doc) => {
    const contentW = pw - M * 2;

    // ── Layer 1: Deep navy background with rounded corners ──
    pageDoc.setFillColor(...DEEP_NAVY);
    pageDoc.roundedRect(M, M, contentW, HEADER_H, 2.5, 2.5, "F");

    // ── Layer 2: Subtle gradient overlay (navy → slightly lighter) ──
    pageDoc.setFillColor(25, 48, 82);
    pageDoc.roundedRect(M + contentW * 0.4, M, contentW * 0.6, HEADER_H, 0, 2.5, "F");
    // Blend transition
    pageDoc.setFillColor(20, 38, 68);
    pageDoc.rect(M + contentW * 0.38, M, contentW * 0.08, HEADER_H, "F");

    // ── Layer 3: Gold accent strip at top ──
    pageDoc.setFillColor(...ACCENT_GOLD);
    pageDoc.roundedRect(M, M, contentW, 1.2, 2.5, 0, "F");
    // Cover bottom rounding of the gold strip
    pageDoc.setFillColor(...DEEP_NAVY);
    pageDoc.rect(M, M + 0.8, contentW, 0.6, "F");
    pageDoc.setFillColor(...ACCENT_GOLD);
    pageDoc.rect(M, M, contentW, 0.8, "F");

    // ── Logo ──
    if (logoBase64) {
      try {
        // Logo container with subtle glass effect
        pageDoc.setFillColor(255, 255, 255);
        pageDoc.setGState(new (jsPDF as any).GState({ opacity: 0.08 }));
        pageDoc.roundedRect(M + 5, M + 5, 34, 16, 2, 2, "F");
        pageDoc.setGState(new (jsPDF as any).GState({ opacity: 1 }));
        pageDoc.addImage(logoBase64, "PNG", M + 8, M + 6.5, 28, 13);
      } catch {
        // Glass effect might not be supported — try without
        try {
          pageDoc.addImage(logoBase64, "PNG", M + 8, M + 6.5, 28, 13);
        } catch {
          // skip logo entirely
        }
      }
    }

    // ── Vertical separator line ──
    pageDoc.setDrawColor(255, 255, 255);
    pageDoc.setLineWidth(0.15);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try { pageDoc.setGState(new (jsPDF as any).GState({ opacity: 0.2 })); } catch {}
    pageDoc.line(M + 44, M + 5, M + 44, M + HEADER_H - 5);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try { pageDoc.setGState(new (jsPDF as any).GState({ opacity: 1 })); } catch {}

    // ── Title (larger, tracked) ──
    pageDoc.setFont("helvetica", "bold");
    pageDoc.setFontSize(15);
    pageDoc.setTextColor(...WHITE);
    pageDoc.text(title, M + 50, M + 11);

    // ── Subtitle / metadata line ──
    pageDoc.setFont("helvetica", "normal");
    pageDoc.setFontSize(7.5);
    pageDoc.setTextColor(180, 195, 215);
    const metaLine = subtitle
      ? `${subtitle}  ·  ${dateStr}  ·  ${data.length.toLocaleString("es-CO")} ${recordLabel}`
      : `${dateStr}  ·  ${data.length.toLocaleString("es-CO")} ${recordLabel}`;
    pageDoc.text(metaLine, M + 50, M + 17);

    // ── Right side: IBC CORE badge ──
    // Badge container
    pageDoc.setFillColor(255, 255, 255);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try { pageDoc.setGState(new (jsPDF as any).GState({ opacity: 0.1 })); } catch {}
    pageDoc.roundedRect(pw - M - 36, M + 5.5, 30, 9, 1.5, 1.5, "F");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try { pageDoc.setGState(new (jsPDF as any).GState({ opacity: 1 })); } catch {}

    pageDoc.setFont("helvetica", "bold");
    pageDoc.setFontSize(6.5);
    pageDoc.setTextColor(200, 215, 232);
    pageDoc.text("IBC CORE", pw - M - 21, M + 11.2, { align: "center" });

    // ── Timestamp on right ──
    pageDoc.setFont("helvetica", "normal");
    pageDoc.setFontSize(6);
    pageDoc.setTextColor(140, 160, 185);
    pageDoc.text(`${timeStr}`, pw - M - 21, M + 20, { align: "center" });

    // ── Bottom accent: thin teal line ──
    pageDoc.setDrawColor(...ACCENT_TEAL);
    pageDoc.setLineWidth(0.6);
    pageDoc.line(M, M + HEADER_H + 0.5, M + 40, M + HEADER_H + 0.5);
    // Fade to gold
    pageDoc.setDrawColor(...ACCENT_GOLD);
    pageDoc.setLineWidth(0.3);
    pageDoc.line(M + 40, M + HEADER_H + 0.5, M + 70, M + HEADER_H + 0.5);
    // Rest: subtle border
    pageDoc.setDrawColor(...BORDER_LIGHT);
    pageDoc.setLineWidth(0.15);
    pageDoc.line(M + 70, M + HEADER_H + 0.5, pw - M, M + HEADER_H + 0.5);
  };

  // ════════════════════════════════════════════════════════
  //  EXECUTIVE FOOTER — Refined dual-band
  // ════════════════════════════════════════════════════════

  const drawFooter = (pageDoc: typeof doc, pageNum: number, totalPages: number) => {
    const fY = ph - 12;

    // ── Upper thin rule ──
    pageDoc.setDrawColor(...DIVIDER);
    pageDoc.setLineWidth(0.15);
    pageDoc.line(M, fY, pw - M, fY);

    // ── Footer background ──
    pageDoc.setFillColor(...OFF_WHITE);
    pageDoc.rect(M, fY + 0.2, pw - M * 2, 10, "F");

    // ── Left: Company branding ──
    pageDoc.setFont("helvetica", "bold");
    pageDoc.setFontSize(7);
    pageDoc.setTextColor(...NAVY);
    pageDoc.text("IBC STEEL GROUP", M + 3, fY + 4.5);

    // Vertical mini separator
    pageDoc.setDrawColor(...BORDER_LIGHT);
    pageDoc.setLineWidth(0.15);
    pageDoc.line(M + 37, fY + 1.5, M + 37, fY + 6.5);

    pageDoc.setFont("helvetica", "normal");
    pageDoc.setFontSize(6);
    pageDoc.setTextColor(...TEXT_SUBTLE);
    pageDoc.text("IBC Core Platform", M + 40, fY + 4.5);

    // ── Center: generation info ──
    pageDoc.setFont("helvetica", "italic");
    pageDoc.setFontSize(5.5);
    pageDoc.setTextColor(...TEXT_SUBTLE);
    const genText = `Generado: ${now.toLocaleDateString("es-CO")} ${timeStr}  ·  Documento confidencial  ·  © ${now.getFullYear()} IBC Steel Group S.A.S.`;
    pageDoc.text(genText, pw / 2, fY + 8.5, { align: "center" });

    // ── Right: Page indicator ──
    // Page number circle
    pageDoc.setFillColor(...NAVY);
    pageDoc.circle(pw - M - 8, fY + 4, 3.5, "F");
    pageDoc.setFont("helvetica", "bold");
    pageDoc.setFontSize(7);
    pageDoc.setTextColor(...WHITE);
    pageDoc.text(`${pageNum}`, pw - M - 8, fY + 5.2, { align: "center" });

    pageDoc.setFont("helvetica", "normal");
    pageDoc.setFontSize(5.5);
    pageDoc.setTextColor(...TEXT_MUTED);
    pageDoc.text(`de ${totalPages}`, pw - M - 2.5, fY + 5.2, { align: "left" });
  };

  // ════════════════════════════════════════════════════════
  //  TABLE CONFIGURATION — Premium data grid
  // ════════════════════════════════════════════════════════

  const tableColumns = columns.map((col) => ({
    header: col.header,
    dataKey: col.dataKey,
  }));

  const usableWidth = pw - M * 2;
  const totalWeight = columns.reduce((sum, c) => sum + (c.width || 1), 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columnStyles: Record<string, any> = {};
  columns.forEach((col) => {
    const w = ((col.width || 1) / totalWeight) * usableWidth;
    columnStyles[col.dataKey] = {
      cellWidth: w,
      halign: col.halign || "left",
      ...(col.bold ? { fontStyle: "bold" as const } : {}),
      ...(col.color ? { textColor: hexToRgb(col.color) } : {}),
    };
  });

  const startY = M + HEADER_H + 3;

  autoTable(doc, {
    columns: tableColumns,
    body: data,
    startY,
    margin: { top: startY, left: M, right: M, bottom: 16 },
    theme: "plain",
    showHead: "everyPage",

    // ── Body cell styles ──
    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2.8, right: 2.8 },
      textColor: TEXT_BODY as unknown as [number, number, number],
      lineColor: BORDER_LIGHT as unknown as [number, number, number],
      lineWidth: 0.1,
      overflow: "linebreak",
      minCellHeight: 7.5,
    },

    // ── Header row: refined dark band ──
    headStyles: {
      fillColor: NAVY as unknown as [number, number, number],
      textColor: WHITE as unknown as [number, number, number],
      fontSize: 6.5,
      fontStyle: "bold",
      halign: "center",
      cellPadding: { top: 3.2, bottom: 3.2, left: 2.5, right: 2.5 },
      minCellHeight: 10,
      lineColor: NAVY_MID as unknown as [number, number, number],
      lineWidth: 0.3,
    },

    // ── Alternating row: warm stripe ──
    alternateRowStyles: {
      fillColor: ROW_STRIPE as unknown as [number, number, number],
    },

    columnStyles,

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didDrawPage: (hookData: any) => {
      drawHeader(hookData.doc);
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didDrawCell: (hookData: any) => {
      // Draw subtle left accent on first column body cells
      if (hookData.section === "body" && hookData.column.index === 0) {
        const cellDoc = hookData.doc;
        cellDoc.setFillColor(...ACCENT_TEAL);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        try { cellDoc.setGState(new (jsPDF as any).GState({ opacity: 0.3 })); } catch {}
        cellDoc.rect(hookData.cell.x, hookData.cell.y, 0.4, hookData.cell.height, "F");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        try { cellDoc.setGState(new (jsPDF as any).GState({ opacity: 1 })); } catch {}
      }

      // Draw bottom border on header cells (gold accent on first 3 cols)
      if (hookData.section === "head") {
        const cellDoc = hookData.doc;
        const cellX = hookData.cell.x;
        const cellY = hookData.cell.y + hookData.cell.height;
        const cellW = hookData.cell.width;

        if (hookData.column.index < 3) {
          cellDoc.setDrawColor(...ACCENT_GOLD);
          cellDoc.setLineWidth(0.5);
        } else {
          cellDoc.setDrawColor(...SLATE_BLUE);
          cellDoc.setLineWidth(0.3);
        }
        cellDoc.line(cellX, cellY, cellX + cellW, cellY);
      }
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didParseCell: (hookData: any) => {
      if (hookData.section === "body") {
        const col = columns.find((c) => c.dataKey === hookData.column.dataKey);
        if (col?.bold) {
          hookData.cell.styles.fontStyle = "bold";
        }
        if (col?.color) {
          hookData.cell.styles.textColor = hexToRgb(col.color);
        }
      }

      // Style header text: uppercase tracking
      if (hookData.section === "head") {
        hookData.cell.styles.fontSize = 6.2;
      }
    },
  });

  // ════════════════════════════════════════════════════════
  //  POST-TABLE: Summary bar + Footer on all pages
  // ════════════════════════════════════════════════════════

  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // ── Decorative corner marks on each page ──
    doc.setDrawColor(...BORDER_LIGHT);
    doc.setLineWidth(0.2);
    // Top-left corner
    doc.line(M - 2, M + 3, M - 2, M - 2);
    doc.line(M - 2, M - 2, M + 3, M - 2);
    // Top-right corner
    doc.line(pw - M + 2, M + 3, pw - M + 2, M - 2);
    doc.line(pw - M + 2, M - 2, pw - M - 3, M - 2);
    // Bottom-left corner
    doc.line(M - 2, ph - M - 3, M - 2, ph - M + 2);
    doc.line(M - 2, ph - M + 2, M + 3, ph - M + 2);
    // Bottom-right corner
    doc.line(pw - M + 2, ph - M - 3, pw - M + 2, ph - M + 2);
    doc.line(pw - M + 2, ph - M + 2, pw - M - 3, ph - M + 2);

    drawFooter(doc, i, totalPages);
  }

  // ════════════════════════════════════════════════════════
  //  SAVE
  // ════════════════════════════════════════════════════════

  doc.save(`${filename}_${now.toISOString().slice(0, 10)}.pdf`);
}

// ─── Hex to RGB helper ──────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}
