"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Receipt,
  ArrowRight,
  Zap,
  X,
  Files,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { T } from "@/lib/design-tokens";

// ─── TYPES ───────────────────────────────────────────────────
interface InvoiceHeaderData {
  invoiceNo: string;
  date: string;
  buyer: string;
  buyerAddress: string;
  consignee: string;
  consigneeAddress: string;
  portOfLoading: string;
  portOfDischarge: string;
  vesselName: string;
  blNo: string;
  paymentTerms: string;
  currency: string;
}

interface InvoiceLineItem {
  item: number;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
}

interface ParsedInvoiceData {
  header: InvoiceHeaderData;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  totalAmount: number;
}

type Status = "idle" | "uploading" | "parsing" | "parsed" | "converting" | "done" | "error";

// ─── COLORS ──────────────────────────────────────────────────
const C = {
  navy: "#0a2540",
  navy70: "#1a3a5c",
  accent: "#2d6fba",
  accentBright: "#3d8fe0",
  accentSoft: "rgba(45,111,186,0.12)",
  accentGlow: "rgba(45,111,186,0.06)",
  cream: "#f6f1e9",
  creamSoft: "#faf7f1",
  creamWarm: "#f0e8da",
  gold: "#c8a24e",
  goldSoft: "rgba(200,162,78,0.15)",
  text: "#0a2540",
  textSec: "#4a5d72",
  textMuted: "#8a97a8",
  green: "#10b981",
  greenSoft: "rgba(16,185,129,0.1)",
  red: "#ef4444",
  border: "rgba(10,37,64,0.06)",
  borderSolid: "#e8e2d8",
  glass: "rgba(255,255,255,0.72)",
  glassBorder: "rgba(255,255,255,0.45)",
};

// ─── EXCEL PARSING LOGIC ─────────────────────────────────────
function parseOriginInvoice(data: unknown[][]): ParsedInvoiceData {
  const getCell = (row: number, col: number): string => {
    if (!data[row]) return "";
    const val = data[row][col];
    if (val === null || val === undefined) return "";
    return String(val).trim();
  };

  const getNum = (row: number, col: number): number => {
    const val = data[row]?.[col];
    if (typeof val === "number") return val;
    const parsed = parseFloat(String(val));
    return isNaN(parsed) ? 0 : parsed;
  };

  // Generic header extraction — search for common invoice keywords
  const header: InvoiceHeaderData = {
    invoiceNo: "",
    date: "",
    buyer: "",
    buyerAddress: "",
    consignee: "",
    consigneeAddress: "",
    portOfLoading: "",
    portOfDischarge: "",
    vesselName: "",
    blNo: "",
    paymentTerms: "",
    currency: "USD",
  };

  // Scan for header fields
  for (let r = 0; r < Math.min(data.length, 30); r++) {
    for (let c = 0; c < (data[r]?.length || 0); c++) {
      const cell = getCell(r, c).toUpperCase();
      if (cell.includes("INVOICE") && cell.includes("NO")) {
        header.invoiceNo = getCell(r, c + 1) || getCell(r + 1, c) || getCell(r, c + 2);
      }
      if (cell === "DATE:" || cell === "DATE") {
        header.date = getCell(r, c + 1) || getCell(r + 1, c);
      }
      if (cell.includes("BUYER") || cell.includes("MESSRS")) {
        header.buyer = getCell(r, c + 1) || getCell(r + 1, c);
      }
      if (cell.includes("CONSIGNEE")) {
        header.consignee = getCell(r, c + 1) || getCell(r + 1, c);
      }
      if (cell.includes("PORT OF LOADING") || cell.includes("PORT OF SHIPMENT")) {
        header.portOfLoading = getCell(r, c + 1) || getCell(r + 1, c);
      }
      if (cell.includes("PORT OF DIS") || cell.includes("DESTINATION")) {
        header.portOfDischarge = getCell(r, c + 1) || getCell(r + 1, c);
      }
      if (cell.includes("VESSEL")) {
        header.vesselName = getCell(r, c + 1) || getCell(r + 1, c);
      }
      if (cell.includes("B/L") || cell === "BL NO" || cell === "BL NO:") {
        header.blNo = getCell(r, c + 1) || getCell(r + 1, c);
      }
      if (cell.includes("PAYMENT") && cell.includes("TERM")) {
        header.paymentTerms = getCell(r, c + 1) || getCell(r + 1, c);
      }
    }
  }

  // Find line items — look for a header row with DESCRIPTION/QTY/PRICE/AMOUNT
  const lineItems: InvoiceLineItem[] = [];
  let dataStartRow = -1;
  let descCol = -1, qtyCol = -1, priceCol = -1, amountCol = -1;

  for (let r = 0; r < data.length; r++) {
    if (!data[r]) continue;
    for (let c = 0; c < data[r].length; c++) {
      const cell = getCell(r, c).toUpperCase();
      if (cell.includes("DESCRIPTION") || cell.includes("GOODS") || cell.includes("COMMODITY")) {
        descCol = c;
        dataStartRow = r + 1;
        // Find other columns in the same row
        for (let cc = 0; cc < data[r].length; cc++) {
          const hdr = getCell(r, cc).toUpperCase();
          if (hdr.includes("QTY") || hdr.includes("QUANTITY") || hdr.includes("Q'TY")) qtyCol = cc;
          if (hdr.includes("UNIT PRICE") || hdr.includes("PRICE")) priceCol = cc;
          if (hdr.includes("AMOUNT") || hdr.includes("TOTAL")) amountCol = cc;
        }
        break;
      }
    }
    if (dataStartRow > 0) break;
  }

  if (dataStartRow > 0) {
    let itemCounter = 1;
    for (let r = dataStartRow; r < data.length; r++) {
      const firstCell = getCell(r, 0).toUpperCase();
      if (firstCell === "TOTAL" || firstCell.includes("TOTAL")) break;

      const desc = descCol >= 0 ? getCell(r, descCol) : "";
      const qty = qtyCol >= 0 ? getNum(r, qtyCol) : 0;
      const price = priceCol >= 0 ? getNum(r, priceCol) : 0;
      const amount = amountCol >= 0 ? getNum(r, amountCol) : qty * price;

      if (desc && (qty > 0 || amount > 0)) {
        lineItems.push({
          item: itemCounter++,
          description: desc,
          quantity: qty,
          unit: "MT",
          unitPrice: price,
          amount: amount || qty * price,
        });
      }
    }
  }

  const subtotal = lineItems.reduce((sum, i) => sum + i.amount, 0);
  const totalAmount = subtotal;

  return { header, lineItems, subtotal, totalAmount };
}

// ─── FETCH IMAGE AS BUFFER ───
async function fetchImageBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  return res.arrayBuffer();
}

// ─── EXCEL GENERATION (placeholder — will be customized with user's format) ──
async function generateInvoiceExcel(parsed: ParsedInvoiceData): Promise<Blob> {
  const ExcelJSModule = await import("exceljs");
  const ExcelJS = ExcelJSModule.default || ExcelJSModule;

  const [img0, img1, img2, imgQR, imgISO, imgFirma] = await Promise.all([
    fetchImageBuffer("/pl-assets/template-image-0.png"),
    fetchImageBuffer("/pl-assets/template-image-1.png"),
    fetchImageBuffer("/pl-assets/template-image-2.png"),
    fetchImageBuffer("/pl-assets/qr.png"),
    fetchImageBuffer("/pl-assets/iso.png"),
    fetchImageBuffer("/pl-assets/firma.png"),
  ]);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Invoice", {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToWidth: 1, fitToHeight: 1 },
  });
  ws.pageSetup.margins = {
    left: 0.7086614173228347, right: 0.7086614173228347,
    top: 0.7480314960629921, bottom: 0.7480314960629921,
    header: 0.31496062992125984, footer: 0.31496062992125984,
  };
  ws.views = [{ showGridLines: false }];

  const BLUE = "FF5D81AF";
  const WHITE = "FFFFFFFF";
  const GRAY = "FFF2F2F2";
  const thinBorder = { style: "thin" as const, color: { argb: "FFBFBFBF" } };
  const headerBorder = { style: "thin" as const, color: { argb: "FFD9D9D9" } };
  const fontLabel = { bold: true, size: 10, name: "Montserrat" };
  const fontLabelBig = { bold: true, size: 11, name: "Montserrat" };
  const fontLabelWhite = { bold: true, size: 11, name: "Montserrat", color: { argb: WHITE } };
  const fontValue = { size: 10, name: "Roboto" };
  const fontValueWhite = { size: 10, name: "Roboto", color: { argb: WHITE } };
  const fontData = { size: 11, name: "Roboto" };
  const fontDataBold = { bold: true, size: 11, name: "Roboto" };
  const fontSection = { bold: true, size: 11, name: "Montserrat", color: { argb: BLUE } };
  const fontDefault = { size: 11, name: "Aptos Narrow" };
  const center = { horizontal: "center" as const, vertical: "middle" as const };
  const left = { horizontal: "left" as const, vertical: "middle" as const };
  const right = { horizontal: "right" as const, vertical: "middle" as const };
  const dataBorder = { top: thinBorder, bottom: thinBorder };
  const whiteFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: WHITE } };
  const blueFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: BLUE } };
  const grayFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: GRAY } };
  const issuedFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: GRAY } };
  const numFmt2 = "#,##0.00";

  ws.getColumn(1).width = 6.5703125;
  ws.getColumn(2).width = 26.7109375;
  ws.getColumn(3).width = 29.7109375;
  ws.getColumn(4).width = 24.85546875;
  ws.getColumn(5).width = 18.7109375;
  ws.getColumn(6).width = 23.5703125;
  ws.getColumn(7).width = 23.5703125;
  ws.getColumn(8).width = 22;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sc = (row: number, col: number, value: any, font?: any, alignment?: any, fill?: any, border?: any) => {
    const cell = ws.getCell(row, col);
    if (value !== undefined) cell.value = value;
    if (font) cell.font = font;
    if (alignment) cell.alignment = alignment;
    if (fill) cell.fill = fill;
    if (border) cell.border = border;
  };

  const fillRow = (row: number, fill: object, cols = 8) => {
    for (let c = 1; c <= cols; c++) sc(row, c, null, undefined, undefined, fill);
  };

  // ── ROWS 1-2: White left + Blue contact bar right ──
  for (let r = 1; r <= 2; r++) {
    for (let c = 1; c <= 4; c++) sc(r, c, null, undefined, undefined, whiteFill);
    for (let c = 5; c <= 8; c++) sc(r, c, null, undefined, undefined, blueFill);
  }
  ws.mergeCells("E1:H2");
  sc(1, 5, "848 BRICKELL AVE STE 950 MIAMI, FL 33131- email: servicioalcliente@ibcsteelgroup.com",
    { size: 11, name: "Aptos Narrow", color: { argb: WHITE } }, center, blueFill);

  // ── ROWS 3-6: White left + Gray right, COMMERCIAL INVOICE title ──
  for (let r = 3; r <= 6; r++) {
    for (let c = 1; c <= 4; c++) sc(r, c, null, undefined, undefined, whiteFill);
    for (let c = 5; c <= 8; c++) sc(r, c, null, undefined, undefined, grayFill);
  }
  ws.getRow(4).height = 30.75;
  ws.mergeCells("F4:H5");
  sc(4, 6, "COMMERCIAL INVOICE", { bold: true, size: 20, name: "Montserrat" }, center, grayFill);
  sc(6, 6, null, { size: 10, name: "Roboto" }, { vertical: "middle" as const }, grayFill);

  // ── ROW 7: Blue left + "Issued by:" right ──
  ws.getRow(7).height = 20;
  for (let c = 1; c <= 4; c++) sc(7, c, null, undefined, undefined, blueFill);
  for (let c = 5; c <= 8; c++) sc(7, c, null, undefined, undefined, issuedFill);
  sc(7, 6, "Issued by:", { bold: true, size: 10, name: "Montserrat", color: { argb: "FF2D2D2D" } },
    { horizontal: "right" as const, vertical: "middle" as const, indent: 1 }, issuedFill);
  sc(7, 7, "IBC STEEL GROUP CORP", { bold: true, size: 10, name: "Montserrat", color: { argb: "FF2D2D2D" } },
    { horizontal: "left" as const, vertical: "middle" as const, indent: 1 }, issuedFill);

  // ── ROWS 8-12: Blue left + Gray right ──
  ws.getRow(8).height = 16;
  ws.getRow(9).height = 16;
  ws.getRow(10).height = 16;
  ws.getRow(11).height = 18;
  ws.getRow(12).height = 15.75;

  for (let r = 8; r <= 12; r++) {
    for (let c = 1; c <= 4; c++) sc(r, c, null, undefined, undefined, blueFill);
  }
  for (let r = 8; r <= 10; r++) {
    for (let c = 5; c <= 8; c++) sc(r, c, null, undefined, undefined, issuedFill);
  }
  for (let r = 11; r <= 12; r++) {
    for (let c = 5; c <= 8; c++) sc(r, c, null, undefined, undefined, whiteFill);
  }

  // Left side: Buyer info
  sc(8, 2, "Buyer:", fontLabelWhite, undefined, blueFill);
  sc(8, 3, parsed.header.buyer || "", fontValueWhite, undefined, blueFill);
  sc(9, 2, "Consignee:", { bold: true, size: 11, name: "Montserrat", color: { argb: WHITE } }, undefined, blueFill);
  sc(9, 3, parsed.header.consignee || "", fontValueWhite, undefined, blueFill);
  sc(10, 2, "Address:", fontLabelWhite, undefined, blueFill);
  sc(10, 3, parsed.header.buyerAddress || "", fontValueWhite, undefined, blueFill);
  sc(11, 2, "Country - City:", fontLabelWhite, undefined, blueFill);
  sc(11, 3, "", fontValueWhite, undefined, blueFill);

  // Right side: "Issued by" data
  const fontIssuedLabel = { bold: true, size: 9, name: "Montserrat", color: { argb: "FF4A4A4A" } };
  const fontIssuedVal = { size: 9, name: "Roboto", color: { argb: "FF2D2D2D" } };
  const issuedLabelAlign = { horizontal: "right" as const, vertical: "middle" as const, indent: 1 };
  const issuedValAlign = { horizontal: "left" as const, vertical: "middle" as const, indent: 1 };
  sc(8, 6, "Address:", fontIssuedLabel, issuedLabelAlign, issuedFill);
  sc(8, 7, "848 BRICKELL AVE STE 950 MIAMI, FL 33131", fontIssuedVal, issuedValAlign, issuedFill);
  sc(9, 6, "Tel:", fontIssuedLabel, issuedLabelAlign, issuedFill);
  sc(9, 7, "(786) 233 8521", fontIssuedVal, issuedValAlign, issuedFill);
  sc(10, 6, "EIN:", fontIssuedLabel, issuedLabelAlign, issuedFill);
  sc(10, 7, "35-2726376", fontIssuedVal, issuedValAlign, issuedFill);

  fillRow(13, whiteFill);

  for (let r = 14; r <= 20; r++) {
    ws.getRow(r).height = 18;
    fillRow(r, whiteFill);
  }

  // Transport/invoice details
  sc(14, 2, "Invoice No:", fontLabel, undefined, whiteFill);
  sc(14, 3, parsed.header.invoiceNo, fontValue, undefined, whiteFill);
  sc(14, 5, "Date:", fontLabelBig, undefined, whiteFill);
  sc(14, 6, parsed.header.date, fontValue, undefined, whiteFill);
  sc(15, 2, "Port of Loading:", fontLabel, undefined, whiteFill);
  sc(15, 3, parsed.header.portOfLoading, fontValue, undefined, whiteFill);
  sc(15, 5, "Payment Terms:", fontLabelBig, undefined, whiteFill);
  sc(15, 6, parsed.header.paymentTerms, fontValue, undefined, whiteFill);
  sc(16, 2, "Port of Discharge:", fontLabel, undefined, whiteFill);
  sc(16, 3, parsed.header.portOfDischarge, fontValue, undefined, whiteFill);
  sc(16, 5, "Currency:", fontLabelBig, undefined, whiteFill);
  sc(16, 6, parsed.header.currency || "USD", fontValue, undefined, whiteFill);
  sc(17, 2, "Vessel Name:", fontLabel, undefined, whiteFill);
  sc(17, 3, parsed.header.vesselName, fontValue, undefined, whiteFill);
  sc(17, 5, "BL No:", fontLabelBig, undefined, whiteFill);
  sc(17, 6, parsed.header.blNo, fontValue, undefined, whiteFill);

  // ── ROW 21: Line items table headers ──
  ws.getRow(21).height = 15.75;
  ws.getRow(22).height = 31.5;
  ws.mergeCells("C22:D22");
  const invoiceHdrs = [
    { c: 2, v: "ITEM" }, { c: 3, v: "DESCRIPTION" },
    { c: 5, v: "QTY" }, { c: 6, v: "UNIT PRICE\n(USD)" },
    { c: 7, v: "AMOUNT\n(USD)" },
  ];
  invoiceHdrs.forEach(h => sc(22, h.c, h.v, fontSection, center));
  ws.getCell(22, 3).border = { top: headerBorder };

  const firstDataRow = 23;
  parsed.lineItems.forEach((item, i) => {
    const r = 23 + i;
    ws.getRow(r).height = 15.75;
    sc(r, 2, item.item, fontData, center, undefined, dataBorder);
    sc(r, 3, item.description, fontData, { ...left, wrapText: true }, undefined, dataBorder);
    ws.mergeCells(r, 3, r, 4);
    sc(r, 5, item.quantity, fontData, center, undefined, dataBorder);
    ws.getCell(r, 5).numFmt = numFmt2;
    sc(r, 6, item.unitPrice, fontData, center, undefined, dataBorder);
    ws.getCell(r, 6).numFmt = numFmt2;
    sc(r, 7, item.amount, fontData, center, undefined, dataBorder);
    ws.getCell(r, 7).numFmt = numFmt2;
  });

  // Total row
  const totalRow = 23 + parsed.lineItems.length;
  const lastDataRow = totalRow - 1;
  ws.getRow(totalRow).height = 15.75;
  sc(totalRow, 2, "TOTAL", fontDataBold, center, undefined, dataBorder);
  sc(totalRow, 5, { formula: `SUM(E${firstDataRow}:E${lastDataRow})` }, fontDataBold, center, undefined, dataBorder);
  ws.getCell(totalRow, 5).numFmt = numFmt2;
  sc(totalRow, 7, { formula: `SUM(G${firstDataRow}:G${lastDataRow})` }, fontDataBold, center, undefined, dataBorder);
  ws.getCell(totalRow, 7).numFmt = numFmt2;

  let cr = totalRow + 2;

  // Payment Information
  ws.mergeCells(cr, 2, cr, 3);
  sc(cr, 2, "Payment Information:", { bold: true, size: 11, name: "Montserrat" }, { horizontal: "left" as const });
  cr += 2;

  const payData: [string, string | number][] = [
    ["BENEFICIARY NAME:", "IBC STEEL GROUP CORP"],
    ["BENEFICIARY BANK:", "CITIBANK"],
    ["BENE ACCOUNT NO:", 3290415415],
    ["SWIFT CODE:", "CITIUS33"],
    ["BANK ADDRESS:", "201 S BISCAYNE BL VD MIAMI, FL 33131"],
  ];
  payData.forEach(([label, value]) => {
    sc(cr, 2, label, fontLabel);
    sc(cr, 3, value, { size: 11, name: "Aptos Narrow" });
    cr++;
  });

  cr++;
  const disclaimerRow = cr;
  ws.mergeCells(cr, 2, cr + 1, 7);
  sc(cr, 2, "IBC STEEL GROUP promotes responsible environmental management. The client agrees to handle and dispose of products, waste, and packaging in compliance with current environmental regulations, ensuring their reuse, recycling, or delivery to authorized facilities", { size: 10, name: "Roboto" }, { ...left, wrapText: true });
  cr += 2;

  // ── SIGNATURE SECTION ──
  const sigStartRow = cr;
  ws.mergeCells(cr, 5, cr + 8, 8);

  cr++;
  sc(cr, 2, "Signature Stamp", { bold: true, size: 11, name: "Montserrat" }, { horizontal: "left" as const });
  cr++;

  const firmaRow = cr;
  cr += 5;
  cr += 3;

  // ── VERSION/CODE FOOTER BAR ──
  const footerBlue = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF0D71B9" } };
  ws.mergeCells(cr, 2, cr, 3);
  sc(cr, 2, "Version: 01      Codigo: F-GLS-05",
    { bold: true, size: 12, name: "Aptos Narrow", color: { argb: WHITE } }, center, footerBlue);
  for (let c = 4; c <= 8; c++) sc(cr, c, null, undefined, undefined, footerBlue);
  cr++;

  // ── IMAGES ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addImg = (buf: ArrayBuffer, pos: any) => {
    const id = wb.addImage({ buffer: buf, extension: "png" });
    ws.addImage(id, pos);
  };
  addImg(img0, { tl: { col: 2, row: 0 }, br: { col: 2.978, row: 7.154 } });
  addImg(img1, { tl: { col: 4, row: 3.042 }, br: { col: 4, row: 16.646 } });
  addImg(img2, { tl: { col: 2, row: 1.36 }, br: { col: 3, row: 5.796 } });
  addImg(imgQR, { tl: { col: 5.2, row: sigStartRow + 0.3 }, ext: { width: 170, height: 180 } });
  addImg(imgISO, { tl: { col: 6.5, row: sigStartRow + 0.3 }, ext: { width: 256, height: 160 } });
  addImg(imgFirma, { tl: { col: 1, row: firmaRow - 0.2 }, ext: { width: 420, height: 142 } });

  ws.pageSetup.printArea = `A1:H${cr + 2}`;

  for (let r = 1; r <= cr + 6; r++) {
    const cellA = ws.getCell(r, 1);
    if (!cellA.font || !cellA.font.name) cellA.font = fontDefault;
    cellA.numFmt = "0.00";
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

// ─── ANIMATED COUNTER HOOK ───────────────────────────────────
function useAnimatedCounter(target: number, duration = 1200, active = true) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased * 10) / 10);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, active, duration]);
  return val;
}

// ─── STATS PERSISTENCE ───────────────────────────────────────
interface InvStats {
  totalProcessed: number;
  totalSuccess: number;
  totalTimeMs: number;
}

const STATS_KEY = "ibc_inv_stats";

function loadStats(): InvStats {
  if (typeof window === "undefined") return { totalProcessed: 0, totalSuccess: 0, totalTimeMs: 0 };
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { totalProcessed: 0, totalSuccess: 0, totalTimeMs: 0 };
}

function saveStats(s: InvStats) {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// ─── COMPONENT ───────────────────────────────────────────────
export default function InvoiceConverterPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedInvoiceData | null>(null);
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hoverZone, setHoverZone] = useState(false);
  const [progress, setProgress] = useState(0);

  const [stats, setStats] = useState<InvStats>({ totalProcessed: 0, totalSuccess: 0, totalTimeMs: 0 });
  const convStartRef = useRef<number>(0);

  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);
  useEffect(() => { setStats(loadStats()); }, []);

  const realFiles = stats.totalProcessed;
  const realSuccessRate = stats.totalProcessed > 0 ? (stats.totalSuccess / stats.totalProcessed) * 100 : 0;
  const realAvgTime = stats.totalSuccess > 0 ? (stats.totalTimeMs / stats.totalSuccess) / 1000 : 0;

  const filesProcessed = useAnimatedCounter(realFiles, 1800, mounted);
  const successRate = useAnimatedCounter(realSuccessRate, 2000, mounted);
  const avgTime = useAnimatedCounter(realAvgTime, 1600, mounted);

  const currentStep = status === "idle" || status === "uploading" || status === "parsing" ? 0
    : status === "parsed" ? 1
    : 2;

  const handleFile = useCallback(async (f: File) => {
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      toast.error("Formato no valido. Solo se aceptan archivos .xlsx o .xls");
      return;
    }

    setFile(f);
    setStatus("parsing");
    setErrorMsg("");
    setParsedData(null);
    setConvertedBlob(null);
    setProgress(0);

    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 15 + 5;
      if (p >= 95) { p = 95; clearInterval(iv); }
      setProgress(Math.min(p, 95));
    }, 80);

    try {
      const XLSX = await import("xlsx");
      const buffer = await f.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const wsName = wb.SheetNames[0];
      const ws = wb.Sheets[wsName];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];

      const parsed = parseOriginInvoice(data);

      if (parsed.lineItems.length === 0) {
        throw new Error("No se encontraron items en el archivo. Verifica que sea una factura de origen valida.");
      }

      clearInterval(iv);
      setProgress(100);
      setTimeout(() => {
        setParsedData(parsed);
        setStatus("parsed");
        toast.success(`Archivo procesado: ${parsed.lineItems.length} items encontrados`);
      }, 400);
    } catch (err) {
      clearInterval(iv);
      const msg = err instanceof Error ? err.message : "Error al leer el archivo";
      setErrorMsg(msg);
      setStatus("error");
      toast.error(msg);
    }
  }, []);

  const handleConvert = useCallback(async () => {
    if (!parsedData) return;
    setStatus("converting");
    convStartRef.current = performance.now();
    try {
      const blob = await generateInvoiceExcel(parsedData);
      const elapsed = performance.now() - convStartRef.current;
      setConvertedBlob(blob);
      setStatus("done");
      setStats(prev => {
        const next = { totalProcessed: prev.totalProcessed + 1, totalSuccess: prev.totalSuccess + 1, totalTimeMs: prev.totalTimeMs + elapsed };
        saveStats(next);
        return next;
      });
      toast.success("Factura convertida exitosamente");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al generar el archivo";
      setErrorMsg(msg);
      setStatus("error");
      setStats(prev => {
        const next = { ...prev, totalProcessed: prev.totalProcessed + 1 };
        saveStats(next);
        return next;
      });
      toast.error(msg);
    }
  }, [parsedData]);

  const handleDownload = useCallback(() => {
    if (!convertedBlob) return;
    const url = URL.createObjectURL(convertedBlob);
    const link = document.createElement("a");
    link.href = url;
    const fileName = file?.name
      ? `INV_IBC_${file.name.replace(/\.(xlsx|xls)$/i, "")}_${new Date().toISOString().slice(0, 10)}.xlsx`
      : `INV_IBC_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Archivo descargado");
  }, [convertedBlob, file]);

  const handleReset = useCallback(() => {
    setFile(null);
    setParsedData(null);
    setConvertedBlob(null);
    setStatus("idle");
    setErrorMsg("");
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);
  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFile(e.target.files[0]);
  }, [handleFile]);

  const fmtSize = (b: number) => b < 1048576 ? (b / 1024).toFixed(0) + " KB" : (b / 1048576).toFixed(1) + " MB";

  const steps = [
    { name: "Subir archivo", desc: "Cargar Factura" },
    { name: "Verificar datos", desc: "Mapeo & validacion" },
    { name: "Descargar", desc: "Formato IBC listo" },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif", width: "100%", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeScale { from { opacity: 0; transform: scale(0.96) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes shimmer { 0% { background-position: -300% 0; } 100% { background-position: 300% 0; } }
        @keyframes glowPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(45,111,186,0); } 50% { box-shadow: 0 0 0 10px rgba(45,111,186,0.07); } }
        @keyframes rippleOut { 0% { transform: scale(0.5); opacity: 0.4; } 100% { transform: scale(3); opacity: 0; } }
        @keyframes breathe { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.05); } }
        @keyframes iconBob { 0%, 100% { transform: translateY(0) rotate(0deg); } 25% { transform: translateY(-3px) rotate(1deg); } 75% { transform: translateY(2px) rotate(-1deg); } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes checkPop { 0% { transform: scale(0); } 60% { transform: scale(1.2); } 100% { transform: scale(1); } }
        @keyframes borderRotate { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -30; } }
        @keyframes progressShimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
        .glass-card { background: ${C.glass}; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid ${C.glassBorder}; }
        .zone-hover { transition: all 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
        .zone-hover:hover { transform: translateY(-3px); box-shadow: 0 20px 60px rgba(10,37,64,0.07), 0 0 0 1px rgba(45,111,186,0.1); }
        .btn-primary { transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1); position: relative; overflow: hidden; }
        .btn-primary:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 12px 36px rgba(10,37,64,0.25); }
        .btn-primary:active { transform: translateY(0) scale(0.99); }
        .stat-card { transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
        .stat-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(10,37,64,0.06); }
        .chip-tag { transition: all 0.25s ease; }
        .chip-tag:hover { background: ${C.accent}; color: white; transform: translateY(-1px) scale(1.05); box-shadow: 0 4px 12px rgba(45,111,186,0.25); }
        .file-row { transition: all 0.3s ease; }
        .file-row:hover { transform: translateX(4px); }
        .remove-btn { transition: all 0.25s ease; }
        .remove-btn:hover { background: rgba(239,68,68,0.08); color: ${C.red}; transform: rotate(90deg); }
      `}</style>

      <div className="relative z-10 px-6 py-5" style={{ width: "100%" }}>

        {/* ── Breadcrumb ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 12.5, color: T.inkLight }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 4, color: T.accent, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M2.5 6l5-4 5 4v6.5a1 1 0 01-1 1h-8a1 1 0 01-1-1V6z" stroke="currentColor" strokeWidth="1.3"/><path d="M5.5 13.5v-5h4v5" stroke="currentColor" strokeWidth="1.3"/></svg>
            {" "}Inicio
          </Link>
          <span style={{ color: T.inkGhost }}>/</span>
          <span style={{ fontWeight: 600, color: T.inkMuted }}>Facturacion</span>
        </div>

        {/* ── Header Banner ── */}
        <div style={{
          position: "relative", overflow: "hidden", borderRadius: 14,
          background: "linear-gradient(135deg, #1E3A5F 0%, #2a4d7a 50%, #3B82F6 100%)",
          padding: "14px 24px", marginBottom: 16,
          boxShadow: "0 4px 24px rgba(30,58,95,0.18)",
        }}>
          <div style={{
            position: "absolute", inset: 0, opacity: 0.07,
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }} />
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)",
                display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
              }}>
                <Receipt className="h-[18px] w-[18px]" />
              </div>
              <div>
                <h1 style={{
                  fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                  fontSize: 18, fontWeight: 800, color: "#fff",
                  letterSpacing: "-0.02em", lineHeight: 1.2,
                }}>Facturacion</h1>
                <p style={{ fontSize: 12, color: "rgba(191,219,254,0.7)", fontWeight: 500 }}>
                  Conversion automatica de facturas al formato IBC Steel Group
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stepper ── */}
        <div className="mb-6" style={{ animation: mounted ? "fadeScale 0.7s cubic-bezier(0.22,1,0.36,1) 0.14s both" : "none" }}>
          <div className="glass-card rounded-2xl py-4 px-7 relative overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.02)" }}>
            <div className="absolute left-7 right-7 top-1/2 h-0.5 -translate-y-1/2 rounded-full" style={{ background: C.creamWarm }}>
              <div className="h-full rounded-full transition-all duration-700" style={{
                width: `${currentStep * 50}%`,
                background: `linear-gradient(90deg, ${C.accent}, ${C.accentBright})`,
                boxShadow: `0 0 8px ${C.accentSoft}`,
                transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)",
              }} />
            </div>

            <div className="relative z-10 flex justify-between">
              {steps.map((s, i) => {
                const active = i === currentStep;
                const done = i < currentStep;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className="w-[38px] h-[38px] rounded-full flex items-center justify-center relative transition-all duration-500"
                      style={{
                        background: done
                          ? `linear-gradient(145deg, ${C.green}, #22d693)`
                          : active
                            ? `linear-gradient(145deg, ${C.accent}, ${C.accentBright})`
                            : "white",
                        border: done || active ? "2px solid transparent" : `2px solid ${C.creamWarm}`,
                        boxShadow: done
                          ? `0 4px 12px rgba(16,185,129,0.25)`
                          : active
                            ? `0 4px 18px rgba(45,111,186,0.3)`
                            : "0 2px 8px rgba(0,0,0,0.04)",
                        animation: active ? "glowPulse 2.5s ease-in-out infinite" : "none",
                      }}
                    >
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      ) : (
                        <span className="text-[13px] font-bold" style={{ color: active ? "white" : C.textMuted }}>{i + 1}</span>
                      )}
                      {active && (
                        <div className="absolute -inset-1 rounded-full border-2 opacity-30 animate-ping" style={{ borderColor: C.accent }} />
                      )}
                    </div>
                    <div className="text-left">
                      <span className="block text-[13px] leading-snug transition-all duration-300" style={{ color: active ? C.text : done ? C.accent : C.textMuted, fontWeight: active ? 700 : 500 }}>
                        {s.name}
                      </span>
                      <span className="block text-[11px] mt-0.5" style={{ color: C.textMuted }}>{s.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Main Card ── */}
        <div
          className="glass-card rounded-[22px] overflow-hidden relative"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02), 0 12px 48px rgba(10,37,64,0.04)", animation: mounted ? "fadeScale 0.7s cubic-bezier(0.22,1,0.36,1) 0.2s both" : "none" }}
        >
          <div className="h-[3px]" style={{
            background: `linear-gradient(90deg, ${C.accent}, ${C.accentBright}, ${C.gold}, ${C.accentBright}, ${C.accent})`,
            backgroundSize: "200% 100%",
            animation: "shimmer 6s linear infinite",
          }} />

          {/* Card Header */}
          <div className="flex justify-between items-center p-6 flex-wrap gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-[42px] h-[42px] rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${C.accentGlow}, ${C.accentSoft})`, color: C.accent, border: `1px solid rgba(45,111,186,0.08)` }}>
                <FileSpreadsheet className="h-[22px] w-[22px]" />
              </div>
              <div>
                <h2 className="text-[17px] font-bold" style={{ color: C.text }}>Archivo de Origen</h2>
                <p className="text-[12px] mt-0.5" style={{ color: C.textMuted }}>Sube tu factura para iniciar la conversion al formato IBC</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <span className="chip-tag cursor-default text-[11px] font-bold px-3 py-1.5 rounded-lg" style={{ color: C.accent, background: C.accentGlow, letterSpacing: "0.04em", border: `1px solid rgba(45,111,186,0.06)` }}>.xlsx</span>
              <span className="chip-tag cursor-default text-[11px] font-bold px-3 py-1.5 rounded-lg" style={{ color: C.accent, background: C.accentGlow, letterSpacing: "0.04em", border: `1px solid rgba(45,111,186,0.06)` }}>.xls</span>
            </div>
          </div>

          <div className="px-7"><div className="h-px" style={{ background: `linear-gradient(90deg, transparent 0%, ${C.borderSolid} 20%, ${C.borderSolid} 80%, transparent 100%)` }} /></div>

          {/* ── Upload Zone ── */}
          {!file && !status.startsWith("pars") && status !== "error" && (
            <div className="p-7">
              <div
                ref={dropZoneRef}
                className="zone-hover relative rounded-[20px] flex items-center justify-center overflow-hidden cursor-pointer"
                style={{ padding: "54px 28px", minHeight: 300 }}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                onMouseEnter={() => setHoverZone(true)}
                onMouseLeave={() => { setHoverZone(false); setIsDragging(false); }}
              >
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={onFileChange} className="hidden" />

                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <rect x="1.5" y="1.5" width="99%" height="99%" rx="18" ry="18"
                    fill="none"
                    stroke={isDragging ? C.accent : hoverZone ? C.borderSolid : C.creamWarm}
                    strokeWidth={isDragging ? "2" : "1.5"}
                    strokeDasharray={isDragging ? "6 4" : "10 8"}
                    style={{ animation: isDragging ? "borderRotate 1.2s linear infinite" : "none", transition: "stroke 0.4s" }}
                  />
                </svg>

                <div className="relative z-10 flex flex-col items-center gap-6">
                  <div className="relative w-[100px] h-[100px] flex items-center justify-center" style={{
                    animation: isDragging ? "float 2s ease-in-out infinite" : hoverZone ? "iconBob 3s ease-in-out infinite" : "none",
                    transform: isDragging ? "scale(1.12)" : "scale(1)",
                    transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1)",
                  }}>
                    <div className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, ${C.accentSoft}, transparent 70%)`, animation: "breathe 3s ease-in-out infinite" }} />
                    <div className="absolute -inset-3 rounded-full" style={{ background: `radial-gradient(circle, ${C.accentGlow}, transparent 70%)`, animation: "breathe 4s ease-in-out 1s infinite" }} />
                    <Upload className="h-11 w-11 relative z-10" style={{ color: C.accent }} />
                  </div>

                  <div className="text-center">
                    <p className="text-[20px] font-bold tracking-tight" style={{ color: C.text }}>
                      {isDragging ? "Suelta aqui tu archivo" : "Arrastra tu archivo aqui"}
                    </p>
                    <p className="text-[14px] mt-1.5" style={{ color: C.textMuted }}>
                      o <span className="font-semibold underline underline-offset-2" style={{ color: C.accent }}>haz clic para explorar</span> en tu equipo
                    </p>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap justify-center mt-1">
                    <div className="flex items-center gap-2 text-[12px] font-medium" style={{ color: C.textSec }}>
                      <FileSpreadsheet className="h-3.5 w-3.5" style={{ color: C.textMuted }} />
                      Excel (.xlsx, .xls)
                    </div>
                    <div className="w-px h-4" style={{ background: C.creamWarm }} />
                    <div className="flex items-center gap-2 text-[12px] font-medium" style={{ color: C.textSec }}>
                      <Receipt className="h-3.5 w-3.5" style={{ color: C.textMuted }} />
                      Facturas comerciales
                    </div>
                    <div className="w-px h-4" style={{ background: C.creamWarm }} />
                    <div className="flex items-center gap-2 text-[12px] font-medium" style={{ color: C.textSec }}>
                      <Zap className="h-3.5 w-3.5" style={{ color: C.gold }} />
                      Procesamiento instantaneo
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Parsing State ── */}
          {status === "parsing" && (
            <div className="p-7" style={{ animation: "fadeScale 0.4s cubic-bezier(0.22,1,0.36,1)" }}>
              <div className="p-6 rounded-2xl" style={{ background: `linear-gradient(135deg, ${C.creamSoft}, white)`, border: `1px solid ${C.border}` }}>
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center relative" style={{ background: "white", border: `1px solid ${C.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                    <FileSpreadsheet className="h-6 w-6" style={{ color: C.accent }} />
                    <div className="absolute -inset-0.5 rounded-[18px] border-2 border-transparent" style={{ borderTopColor: C.accent, animation: "spin 1s linear infinite" }}>
                      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-[15px] font-bold" style={{ color: C.text }}>Procesando archivo...</p>
                    <p className="text-[12px] mt-0.5" style={{ color: C.textMuted }}>Analizando estructura y campos de la factura</p>
                  </div>
                  <div className="text-[28px] font-extrabold" style={{ color: C.accent }}>{Math.round(progress)}<span className="text-[14px] font-medium" style={{ color: C.textMuted }}>%</span></div>
                </div>

                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.creamWarm }}>
                  <div className="h-full rounded-full relative overflow-hidden transition-all duration-150" style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${C.accent}, ${C.accentBright})`,
                    boxShadow: `0 0 12px ${C.accentSoft}`,
                  }}>
                    <div className="absolute inset-0" style={{
                      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
                      backgroundSize: "300% 100%",
                      animation: "shimmer 1.8s ease-in-out infinite",
                    }} />
                  </div>
                </div>

                <div className="flex gap-5 mt-4">
                  {["Leyendo datos", "Mapeando campos", "Validando formato"].map((t, i) => {
                    const thresh = [0, 35, 70];
                    const active = progress >= thresh[i];
                    return (
                      <div key={i} className="flex items-center gap-1.5 text-[12px] font-medium transition-opacity duration-500" style={{ color: C.textSec, opacity: active ? 1 : 0.35 }}>
                        <div className="w-[7px] h-[7px] rounded-full transition-colors duration-400" style={{ background: active ? C.green : C.creamWarm }} />
                        {t}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Parsed / File Loaded State ── */}
          {file && status !== "parsing" && status !== "idle" && (
            <div className="p-7" style={{ animation: "fadeScale 0.5s cubic-bezier(0.22,1,0.36,1)" }}>
              {(status === "parsed" || status === "done") && (
                <div className="flex items-center gap-3.5 p-4 rounded-[14px] mb-4" style={{ background: `linear-gradient(135deg, ${C.greenSoft}, rgba(16,185,129,0.04))`, border: `1px solid rgba(16,185,129,0.15)` }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: C.green, boxShadow: `0 4px 12px rgba(16,185,129,0.3)` }}>
                    <CheckCircle2 className="h-[18px] w-[18px] text-white" style={{ animation: "checkPop 0.5s cubic-bezier(0.22,1,0.36,1)" }} />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold" style={{ color: "#065f46" }}>Archivo cargado exitosamente</p>
                    <p className="text-[12px] mt-0.5" style={{ color: "#047857" }}>Listo para verificacion y conversion al formato IBC</p>
                  </div>
                </div>
              )}

              <div className="file-row flex items-center gap-4 p-5 rounded-2xl" style={{ background: `linear-gradient(135deg, ${C.creamSoft}, white)`, border: `1px solid ${C.border}` }}>
                <div className="w-[50px] h-[50px] rounded-[14px] flex items-center justify-center" style={{ background: "white", border: `1px solid ${C.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                  <FileSpreadsheet className="h-6 w-6" style={{ color: C.accent }} />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-bold" style={{ color: C.text }}>{file.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[12px] font-medium" style={{ color: C.textMuted }}>{fmtSize(file.size)}</span>
                    <span className="w-[3px] h-[3px] rounded-full" style={{ background: C.creamWarm }} />
                    <span className="text-[12px]" style={{ color: C.textMuted }}>Microsoft Excel</span>
                    <span className="w-[3px] h-[3px] rounded-full" style={{ background: C.creamWarm }} />
                    <span className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: C.green }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.green, boxShadow: `0 0 6px ${C.green}` }} />
                      Verificado
                    </span>
                  </div>
                </div>
                <button className="remove-btn w-[34px] h-[34px] rounded-xl border-none bg-transparent cursor-pointer flex items-center justify-center flex-shrink-0" style={{ color: C.textMuted }} onClick={handleReset}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {status === "error" && (
                <div className="mt-4 p-4 rounded-xl flex items-start gap-2.5" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: C.red }} />
                  <p className="text-[12.5px]" style={{ color: C.red }}>{errorMsg}</p>
                </div>
              )}
            </div>
          )}

          {/* ── CTA Footer ── */}
          {file && status === "parsed" && !convertedBlob && (
            <div className="flex justify-between items-center px-7 pb-6 gap-4 flex-wrap" style={{ animation: "fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.15s both" }}>
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Zap className="h-4 w-4" style={{ color: C.gold }} />
                <span className="text-[13px]" style={{ color: C.textMuted }}>El mapeo automatico convertira los campos al estandar IBC Steel Group</span>
              </div>
              <button
                className="btn-primary flex items-center gap-2 px-8 py-3.5 rounded-[14px] border-none text-white text-[14px] font-bold cursor-pointer whitespace-nowrap"
                style={{
                  background: `linear-gradient(145deg, ${C.navy}, ${C.navy70})`,
                  boxShadow: `0 6px 24px rgba(10,37,64,0.2), inset 0 1px 0 rgba(255,255,255,0.06)`,
                  letterSpacing: "0.01em",
                }}
                onClick={handleConvert}
              >
                Verificar datos
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ── Converting State ── */}
          {status === "converting" && (
            <div className="px-7 pb-6 text-center" style={{ animation: "fadeUp 0.4s ease" }}>
              <div className="p-4 rounded-xl" style={{ background: "rgba(220,139,11,0.06)", border: "1px solid rgba(220,139,11,0.15)" }}>
                <Loader2 className="h-5 w-5 mx-auto animate-spin" style={{ color: C.gold }} />
                <p className="text-[13px] font-semibold mt-2" style={{ color: "#b45309" }}>Generando factura IBC...</p>
              </div>
            </div>
          )}

          {/* ── Done State ── */}
          {status === "done" && convertedBlob && (
            <div className="flex gap-3 px-7 pb-6" style={{ animation: "fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both" }}>
              <button
                className="btn-primary flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[14px] border-none text-white text-[14px] font-bold cursor-pointer"
                style={{
                  background: `linear-gradient(145deg, ${C.green}, #22d693)`,
                  boxShadow: `0 6px 24px rgba(16,185,129,0.25), inset 0 1px 0 rgba(255,255,255,0.1)`,
                }}
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
                Descargar Excel IBC
              </button>
              <button
                className="px-6 py-3.5 rounded-[14px] text-[14px] font-semibold cursor-pointer transition-all hover:bg-[#f0e8da]"
                style={{ border: `1px solid ${C.borderSolid}`, background: "white", color: C.textSec }}
                onClick={handleReset}
              >
                Nuevo
              </button>
            </div>
          )}
        </div>

        {/* ── Preview Card ── */}
        {parsedData && (
          <div
            className="glass-card rounded-[22px] overflow-hidden mt-6"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02), 0 12px 48px rgba(10,37,64,0.04)", animation: "fadeScale 0.6s cubic-bezier(0.22,1,0.36,1) 0.25s both" }}
          >
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-3">
                <div className="w-[42px] h-[42px] rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${C.accentGlow}, ${C.accentSoft})`, color: C.accent, border: `1px solid rgba(45,111,186,0.08)` }}>
                  <Receipt className="h-[22px] w-[22px]" />
                </div>
                <div>
                  <h2 className="text-[17px] font-bold" style={{ color: C.text }}>Vista Previa</h2>
                  <p className="text-[12px] mt-0.5" style={{ color: C.textMuted }}>Datos extraidos de la factura de origen</p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-3 py-1.5 rounded-full" style={{ background: C.greenSoft, color: C.green }}>
                {parsedData.lineItems.length} items
              </span>
            </div>

            <div className="px-6 pb-6">
              {/* Header info grid */}
              <div className="p-4 rounded-[14px] mb-4" style={{ background: C.creamSoft, border: `1px solid ${C.border}` }}>
                <div className="grid grid-cols-2 gap-2 text-[12.5px]">
                  {parsedData.header.buyer && (
                    <div><span style={{ color: C.textMuted }}>Comprador: </span><strong style={{ color: C.text }}>{parsedData.header.buyer}</strong></div>
                  )}
                  {parsedData.header.invoiceNo && (
                    <div><span style={{ color: C.textMuted }}>Factura No: </span><strong style={{ color: C.text }}>{parsedData.header.invoiceNo}</strong></div>
                  )}
                  {parsedData.header.portOfLoading && (
                    <div><span style={{ color: C.textMuted }}>Puerto carga: </span><strong style={{ color: C.text }}>{parsedData.header.portOfLoading}</strong></div>
                  )}
                  {parsedData.header.date && (
                    <div><span style={{ color: C.textMuted }}>Fecha: </span><strong style={{ color: C.text }}>{parsedData.header.date}</strong></div>
                  )}
                  {parsedData.header.portOfDischarge && (
                    <div><span style={{ color: C.textMuted }}>Puerto destino: </span><strong style={{ color: C.text }}>{parsedData.header.portOfDischarge}</strong></div>
                  )}
                  {parsedData.header.vesselName && (
                    <div><span style={{ color: C.textMuted }}>Buque: </span><strong style={{ color: C.text }}>{parsedData.header.vesselName}</strong></div>
                  )}
                  {parsedData.header.blNo && (
                    <div><span style={{ color: C.textMuted }}>BL No: </span><strong style={{ color: C.text }}>{parsedData.header.blNo}</strong></div>
                  )}
                  {parsedData.header.paymentTerms && (
                    <div><span style={{ color: C.textMuted }}>Terminos: </span><strong style={{ color: C.text }}>{parsedData.header.paymentTerms}</strong></div>
                  )}
                </div>
              </div>

              {/* Line items table */}
              <div className="max-h-[340px] overflow-auto rounded-[14px]" style={{ border: `1px solid ${C.border}` }}>
                <Table>
                  <TableHeader>
                    <TableRow style={{ background: C.creamSoft }}>
                      <TableHead className="text-[11px] font-semibold" style={{ color: C.accent }}>Item</TableHead>
                      <TableHead className="text-[11px] font-semibold" style={{ color: C.accent }}>Descripcion</TableHead>
                      <TableHead className="text-[11px] font-semibold text-center" style={{ color: C.accent }}>Cantidad</TableHead>
                      <TableHead className="text-[11px] font-semibold text-center" style={{ color: C.accent }}>Precio Unit.</TableHead>
                      <TableHead className="text-[11px] font-semibold text-center" style={{ color: C.accent }}>Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.lineItems.map((item) => (
                      <TableRow key={item.item}>
                        <TableCell className="text-[12px] font-medium">{item.item}</TableCell>
                        <TableCell className="text-[12px]">{item.description}</TableCell>
                        <TableCell className="text-[12px] text-center">{item.quantity.toFixed(2)}</TableCell>
                        <TableCell className="text-[12px] text-center">${item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-[12px] text-center">${item.amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow style={{ background: C.creamSoft }}>
                      <TableCell colSpan={4} className="text-[12px] font-bold text-right" style={{ color: C.text }}>TOTAL</TableCell>
                      <TableCell className="text-[12px] font-bold text-center">${parsedData.totalAmount.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Summary */}
              <div className="mt-3 px-4 py-3 rounded-[14px] text-[12px] font-medium" style={{ background: C.accentGlow, color: C.accent, border: `1px solid rgba(45,111,186,0.08)` }}>
                {parsedData.lineItems.length} lineas de factura — Total: ${parsedData.totalAmount.toFixed(2)} {parsedData.header.currency || "USD"}
              </div>
            </div>
          </div>
        )}

        {/* ── Stats Row ── */}
        <div className="flex gap-3.5 mt-6 flex-wrap" style={{ animation: mounted ? "fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.3s both" : "none" }}>
          {[
            { icon: <Files className="h-[18px] w-[18px]" style={{ color: C.accent }} />, val: Math.round(filesProcessed), unit: "", label: "Facturas procesadas", color: C.accent },
            { icon: <ShieldCheck className="h-[18px] w-[18px]" style={{ color: C.green }} />, val: stats.totalProcessed > 0 ? successRate.toFixed(1) : "\u2014", unit: stats.totalProcessed > 0 ? "%" : "", label: "Tasa de exito", color: C.green },
            { icon: <Timer className="h-[18px] w-[18px]" style={{ color: C.gold }} />, val: stats.totalSuccess > 0 ? avgTime.toFixed(1) : "\u2014", unit: stats.totalSuccess > 0 ? "s" : "", label: "Tiempo promedio", color: C.gold },
          ].map((s, i) => (
            <div key={i} className="stat-card glass-card flex-1 min-w-[160px] flex items-center gap-3.5 px-5 py-4 rounded-2xl" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
              <div className="w-[42px] h-[42px] rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${C.creamSoft}, ${C.cream})`, border: `1px solid ${C.border}` }}>
                {s.icon}
              </div>
              <div>
                <div className="text-[22px] font-extrabold leading-tight" style={{ color: C.text }}>
                  {s.val}<span className="text-[13px] font-medium" style={{ color: C.textMuted }}>{s.unit}</span>
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: C.textMuted, letterSpacing: "0.01em" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center gap-4 mt-8 justify-center" style={{ animation: mounted ? "fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.4s both" : "none" }}>
          <div className="flex-1 h-px max-w-[120px]" style={{ background: `linear-gradient(90deg, transparent, ${C.creamWarm}, transparent)` }} />
          <span className="text-[10px] font-semibold tracking-[0.15em] text-center" style={{ color: C.textMuted }}>
            IBC STEEL GROUP — SISTEMA DE CONVERSION DOCUMENTAL
          </span>
          <div className="flex-1 h-px max-w-[120px]" style={{ background: `linear-gradient(90deg, transparent, ${C.creamWarm}, transparent)` }} />
        </div>
      </div>
    </div>
  );
}
