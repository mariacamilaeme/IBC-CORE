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
  Package,
  ArrowRight,
  Zap,
  X,
  Files,
  ShieldCheck,
  Timer,
  Printer,
} from "lucide-react";
import { T } from "@/lib/design-tokens";

// ─── TYPES ───────────────────────────────────────────────────
interface HeaderData {
  messrs: string;
  messrsAddress: string;
  transportDetails: string;
  no: string;
  portOfLoading: string;
  date: string;
  portOfDischarging: string;
  shippingMarks: string;
  vesselName: string;
  blNo: string;
  descriptionOfGoods: string;
}

interface SummaryItem {
  item: number;
  size: string;
  bundles: number;
  pieces: number;
  grossWeight: number;
  netWeight: number;
}

interface DetailItem {
  size: string;
  pcsPerBundle: number;
  bundles: number;
  totalPcs: number;
  weightPerBundle: number;
  totalWeight: number;
}

interface ParsedData {
  header: HeaderData;
  summaryItems: SummaryItem[];
  detailItems: DetailItem[];
  hasRealDetails: boolean;
  plasticWeight: string;
  totalBundles: number;
  totalGrossWeight: number;
  totalNetWeight: number;
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

// ─── EXCEL PARSING LOGIC (multi-format) ─────────────────────
function parseOriginExcel(data: unknown[][]): ParsedData {
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

  // ── Find key rows dynamically ──
  let messrsRow = -1, transportRow = -1, headerTableRow = -1, descGoodsRow = -1;
  for (let r = 0; r < Math.min(20, data.length); r++) {
    const c0 = getCell(r, 0).toLowerCase();
    if (c0.startsWith("messrs")) messrsRow = r;
    if (c0.startsWith("transport detail")) transportRow = r;
    if (c0.startsWith("description of goods")) descGoodsRow = r;
  }

  // Find the data table header row (contains SIZE or ITEM as first meaningful header)
  for (let r = Math.max(0, transportRow); r < Math.min(25, data.length); r++) {
    const row = data[r];
    if (!row) continue;
    const joined = (row as unknown[]).map(v => String(v ?? "").trim().toUpperCase()).join("|");
    if (joined.includes("ITEM") && (joined.includes("SIZE") || joined.includes("BUNDLES") || joined.includes("COILS"))) {
      headerTableRow = r;
      break;
    }
    if (joined.includes("STEEL GRADE") && joined.includes("SIZE")) {
      headerTableRow = r;
      break;
    }
    if (joined.includes("CONTAINER") && joined.includes("DESCRIPTION")) {
      headerTableRow = r;
      break;
    }
  }

  // ── Parse header fields dynamically ──
  const findFieldValue = (label: string): string => {
    const labelLower = label.toLowerCase().replace(/[:.]/g, "");
    for (let r = 0; r < Math.min(20, data.length); r++) {
      const row = data[r];
      if (!row) continue;
      for (let c = 0; c < Math.min(10, (row as unknown[]).length); c++) {
        const cellVal = getCell(r, c).toLowerCase().replace(/[:.]/g, "");
        if (cellVal.includes(labelLower) || cellVal.startsWith(labelLower)) {
          // value is in next non-empty cell on same row, or col c+1
          for (let nc = c + 1; nc < Math.min(10, (row as unknown[]).length); nc++) {
            const v = getCell(r, nc);
            if (v) return v;
          }
        }
      }
    }
    return "";
  };

  const header: HeaderData = {
    messrs: messrsRow >= 0 ? getCell(messrsRow, 1) : "",
    messrsAddress: messrsRow >= 0 ? getCell(messrsRow + 1, 1) : "",
    transportDetails: "",
    no: findFieldValue("NO"),
    portOfLoading: findFieldValue("Port of Loading"),
    date: findFieldValue("DATE"),
    portOfDischarging: findFieldValue("Port of Discharging"),
    shippingMarks: findFieldValue("Shipping Marks"),
    vesselName: findFieldValue("Vessel"),
    blNo: findFieldValue("BL NO") || findFieldValue("BL No"),
    descriptionOfGoods: descGoodsRow >= 0 ? getCell(descGoodsRow, 1) : "",
  };

  // ── Detect format type from table header ──
  const hdrRow = data[headerTableRow] as unknown[] | undefined;
  const hdrCells = hdrRow ? hdrRow.map(v => String(v ?? "").trim().toUpperCase()) : [];
  const hdrJoined = hdrCells.join("|");

  // Column indices for weight/bundle/size vary by format. Detect them:
  const findCol = (keywords: string[], excludeKeywords?: string[]): number => {
    for (const kw of keywords) {
      const kwNorm = kw.replace(/\s+/g, "").toUpperCase();
      for (let i = 0; i < hdrCells.length; i++) {
        const cellNorm = hdrCells[i].replace(/\s+/g, "");
        if (!cellNorm.includes(kwNorm)) continue;
        // Check exclusions — skip cells that also contain an excluded keyword
        if (excludeKeywords?.some(ex => cellNorm.includes(ex.replace(/\s+/g, "").toUpperCase()))) continue;
        return i;
      }
    }
    return -1;
  };

  const summaryItems: SummaryItem[] = [];
  const detailItems: DetailItem[] = [];
  let hasRealDetails = false;

  const isFormatSteelGrade = hdrJoined.includes("STEEL GRADE");
  const isFormatCoils = hdrJoined.includes("COILS");
  const isFormatContainer = hdrJoined.includes("CONTAINER");
  const isFormatCombinedBdl = hdrJoined.includes("PCS/BDL") || hdrJoined.includes("PCS/BUNDLE");
  // Format A: classic with separate DETAILS section (ITEM|SIZE|BUNDLES||G.W|N.W)

  if (isFormatContainer) {
    // ── Format E: Equipment/Forklift (CONTAINER|Description|QTY|Weight|Measurement) ──
    const colQty = findCol(["QTY"]);
    const colWt = findCol(["WEIGHT"]);
    const dataStart = headerTableRow + 1;
    for (let r = dataStart; r < data.length; r++) {
      const c0 = getCell(r, 0);
      const c1 = getCell(r, 1);
      if (c1.toUpperCase() === "TOTAL" || c0.toUpperCase() === "TOTAL") break;
      if (c0.toUpperCase() === "NOTE:") break;
      const desc = c1 || c0;
      if (!desc) continue;
      const qty = colQty >= 0 ? getNum(r, colQty) : 1;
      const wt = colWt >= 0 ? getNum(r, colWt) : 0;
      const wtMT = wt > 1000 ? wt / 1000 : wt; // convert KGS to MT if needed
      summaryItems.push({ item: summaryItems.length + 1, size: desc, bundles: qty, pieces: qty, grossWeight: wtMT, netWeight: wtMT });
      detailItems.push({ size: desc, pcsPerBundle: 1, bundles: qty, totalPcs: qty, weightPerBundle: wtMT, totalWeight: wtMT });
    }
  } else if (isFormatSteelGrade) {
    // ── Format C: STEEL GRADE | PRODUCT GROUP | SIZE(MM) | PCS/BDL | BUNDLE | PIECES | G.W. | N.W. ──
    const colSize = findCol(["SIZE"]);
    const colPcsBdl = findCol(["PCS/BDL"]);
    const colBundle = findCol(["BUNDLE"], ["PCS/BDL", "PCS/BUNDLE", "WEIGHT/BDL", "WEIGHT/BUNDLE"]);
    const colPcs = findCol(["PIECES", "PCS"], ["PCS/BDL", "PCS/BUNDLE"]);
    const colGW = findCol(["G. W", "G.W", "GROSS"]);
    const colNW = findCol(["N.W", "N. W", "NET"]);
    const dataStart = headerTableRow + 1;
    let itemNum = 0;
    let lastSize = "";
    for (let r = dataStart; r < data.length; r++) {
      const c0 = getCell(r, 0).toUpperCase();
      if (c0 === "TOTAL" || c0 === "NOTE:") break;
      const size = colSize >= 0 ? getCell(r, colSize) : "";
      const bdl = colBundle >= 0 ? getNum(r, colBundle) : 0;
      const gw = colGW >= 0 ? getNum(r, colGW) : 0;
      const nw = colNW >= 0 ? getNum(r, colNW) : 0;
      const pcs = colPcs >= 0 ? getNum(r, colPcs) : 0;
      const pcsBdl = colPcsBdl >= 0 ? getNum(r, colPcsBdl) : 0;

      if (size) {
        // Main row with size — new item
        lastSize = size;
        itemNum++;
        summaryItems.push({ item: itemNum, size, bundles: bdl, pieces: pcs, grossWeight: gw, netWeight: nw });
        detailItems.push({ size, pcsPerBundle: pcsBdl, bundles: bdl, totalPcs: pcs, weightPerBundle: bdl > 0 ? gw / bdl : 0, totalWeight: gw });
      } else if (!size && (bdl > 0 || pcsBdl > 0)) {
        // Continuation row: add bundles but NOT pieces/weight to summary (original totals exclude continuation pieces/weight)
        const prev = summaryItems[summaryItems.length - 1];
        if (prev) {
          prev.bundles += bdl;
          // Only add GW/NW if the continuation row has explicit values
          if (gw > 0) prev.grossWeight += gw;
          if (nw > 0) prev.netWeight += nw;
          // Do NOT add calculated pieces — original PIECES column is blank for continuations
          // Detail entry for bundle expansion
          const parentDetail = detailItems[detailItems.length - 1];
          const wtPerBdl = gw > 0 ? gw / bdl : (parentDetail ? parentDetail.weightPerBundle : 0);
          detailItems.push({ size: lastSize, pcsPerBundle: pcsBdl, bundles: bdl, totalPcs: pcsBdl * bdl, weightPerBundle: wtPerBdl, totalWeight: gw > 0 ? gw : wtPerBdl * bdl });
        }
      }
      // Skip rows with no size, no bundles, no pcs data (empty rows)
    }
  } else if (isFormatCoils) {
    // ── Format D: Coils (ITEM|SIZE|COILS|N.W.|G.W.) with separate DETAILS ──
    const colSize = findCol(["SIZE"]);
    const colCoils = findCol(["COILS"]);
    const colNW = findCol(["N. W", "N.W"]);
    const colGW = findCol(["G. W", "G.W"]);
    const dataStart = headerTableRow + 1;
    for (let r = dataStart; r < data.length; r++) {
      const c0 = getCell(r, 0).toUpperCase();
      const c1 = getCell(r, 1).toUpperCase();
      if (c0 === "TOTAL" || c1 === "TOTAL" || c0 === "TOTAL ALL" || c0 === "NOTE:") break;
      if (c0.startsWith("DESCRIPTION OF GOODS")) {
        // update description of goods if multiple
        header.descriptionOfGoods = (header.descriptionOfGoods ? header.descriptionOfGoods + " / " : "") + getCell(r, 1);
        continue;
      }
      const itemNum = getNum(r, 0);
      if (itemNum > 0) {
        const size = colSize >= 0 ? getCell(r, colSize) : "";
        const coils = colCoils >= 0 ? getNum(r, colCoils) : 0;
        const nw = colNW >= 0 ? getNum(r, colNW) : 0;
        const gw = colGW >= 0 ? getNum(r, colGW) : 0;
        summaryItems.push({ item: itemNum, size, bundles: coils, pieces: coils, grossWeight: gw, netWeight: nw });
      }
    }
    // Parse details section for coils
    let detailStartRow = -1;
    for (let r = headerTableRow; r < data.length; r++) {
      const joined = (data[r] as unknown[] || []).map(v => String(v ?? "").toUpperCase().trim()).join("|");
      if (joined.includes("DETAILS") || joined.includes("COIL NO")) {
        // Find actual header row for details
        if (joined.includes("COIL NO")) { detailStartRow = r + 1; break; }
        detailStartRow = r + 1;
        // Next row might be the header
        const nextJoined = (data[r + 1] as unknown[] || []).map(v => String(v ?? "").toUpperCase().trim()).join("|");
        if (nextJoined.includes("COIL NO") || nextJoined.includes("SIZE")) { detailStartRow = r + 2; }
        break;
      }
    }
    if (detailStartRow > 0) {
      hasRealDetails = true;
      for (let r = detailStartRow; r < data.length; r++) {
        const c0 = getCell(r, 0).toUpperCase();
        if (c0 === "TOTAL ALL" || c0 === "TOTAL" || c0 === "NOTE:") break;
        if (c0 === "SUBTOTAL" || c0 === "") continue;
        const size = getCell(r, 0);
        const coilNo = getCell(r, 1);
        const coils = getNum(r, 2);
        const nw = getNum(r, 4);
        const gw = getNum(r, 5);
        if (size && coilNo) {
          detailItems.push({ size, pcsPerBundle: 1, bundles: coils, totalPcs: coils, weightPerBundle: nw, totalWeight: nw });
        }
      }
    }
  } else if (isFormatCombinedBdl && !hdrJoined.includes("DETAILS")) {
    // ── Format B: Combined table with PCS/BDL|BDL|PCS|WEIGHT/BDL|G.W.|N.W. ──
    const colSize = findCol(["SIZE"]);
    const colPcsBdl = findCol(["PCS/BDL", "PCS/BUNDLE"]);
    const colBdl = findCol(["BDL", "BUNDLE"], ["PCS/BDL", "PCS/BUNDLE", "WEIGHT/BDL", "WEIGHT/BUNDLE"]);
    const colPcs = findCol(["PCS"], ["PCS/BDL", "PCS/BUNDLE"]);
    const colWtBdl = findCol(["WEIGHT/BDL", "WEIGHT/BUNDLE"]);
    const colGW = findCol(["G. W", "G.W"]);
    const colNW = findCol(["N. W", "N.W"]);
    const dataStart = headerTableRow + 1;
    let itemNum = 0;
    let lastSize = "";
    let lastPcsBdl = 0;
    for (let r = dataStart; r < data.length; r++) {
      const c0 = getCell(r, 0).toUpperCase();
      if (c0 === "TOTAL" || c0 === "NOTE:") break;
      const itemVal = getNum(r, 0);
      const size = colSize >= 0 ? getCell(r, colSize) : "";
      const pcsBdl = colPcsBdl >= 0 ? getNum(r, colPcsBdl) : 0;
      const bdl = colBdl >= 0 ? getNum(r, colBdl) : 0;
      const pcs = colPcs >= 0 ? getNum(r, colPcs) : 0;
      const gw = colGW >= 0 ? getNum(r, colGW) : 0;
      const nw = colNW >= 0 ? getNum(r, colNW) : 0;
      const wtBdl = colWtBdl >= 0 ? getNum(r, colWtBdl) : 0;

      if (itemVal > 0 && size) {
        // Main item row
        itemNum = itemVal;
        lastSize = size;
        lastPcsBdl = pcsBdl;
        summaryItems.push({ item: itemNum, size, bundles: bdl, pieces: pcs, grossWeight: gw, netWeight: nw });
        detailItems.push({ size, pcsPerBundle: pcsBdl, bundles: bdl, totalPcs: pcs, weightPerBundle: wtBdl, totalWeight: gw });
      } else if (bdl > 0 && !size && pcsBdl > 0) {
        // Continuation row: add bundles only, NOT pieces/weight to summary (original totals exclude them)
        const prev = summaryItems[summaryItems.length - 1];
        if (prev) {
          prev.bundles += bdl;
          // Only add GW/NW if continuation has explicit values
          if (gw > 0) prev.grossWeight += gw;
          if (nw > 0) prev.netWeight += nw;
          // Do NOT add calculated pieces — original PCS column is blank for continuations
        }
        detailItems.push({ size: lastSize, pcsPerBundle: pcsBdl || lastPcsBdl, bundles: bdl, totalPcs: pcsBdl * bdl, weightPerBundle: wtBdl, totalWeight: wtBdl * bdl });
      }
    }
  } else {
    // ── Format A (original): ITEM|SIZE|BUNDLES||G.W|N.W with separate DETAILS section ──
    const colGWSummary = findCol(["G. W", "G.W"]);
    const colNWSummary = findCol(["N. W", "N.W"]);
    const gwCol = colGWSummary >= 0 ? colGWSummary : 4;
    const nwCol = colNWSummary >= 0 ? colNWSummary : 5;
    const dataStart = headerTableRow + 1;
    for (let r = dataStart; r < data.length; r++) {
      const firstCell = getCell(r, 0).toUpperCase();
      if (firstCell === "TOTAL") break;
      const itemNum = getNum(r, 0);
      if (itemNum > 0) {
        summaryItems.push({
          item: itemNum,
          size: getCell(r, 1),
          bundles: getNum(r, 2),
          pieces: 0,
          grossWeight: getNum(r, gwCol),
          netWeight: getNum(r, nwCol),
        });
      }
    }

    // Find DETAILS section
    let detailStartRow = -1;
    for (let r = 0; r < data.length; r++) {
      for (let c = 0; c < 6; c++) {
        const cell = getCell(r, c).toUpperCase();
        if (cell === "DETAILS" || cell === "DETAILS:") {
          detailStartRow = r;
          break;
        }
      }
      if (detailStartRow >= 0) break;
    }

    if (detailStartRow >= 0) {
      hasRealDetails = true;
      // Find detail header row (SIZE|PCS/BUNDLE|BUNDLES|TOTAL PCS|WEIGHT/BUNDLE|TOTAL WEIGHT)
      let dHeaderRow = detailStartRow + 1;
      for (let r = detailStartRow; r < Math.min(detailStartRow + 3, data.length); r++) {
        const joined = (data[r] as unknown[] || []).map(v => String(v ?? "").toUpperCase().trim()).join("|");
        if (joined.includes("SIZE") && (joined.includes("PCS") || joined.includes("BUNDLE"))) {
          dHeaderRow = r;
          break;
        }
      }
      const dDataStart = dHeaderRow + 1;
      for (let r = dDataStart; r < data.length; r++) {
        const firstCell = getCell(r, 0).toUpperCase();
        if (firstCell === "TOTAL" || firstCell === "NOTE:") break;
        const size = getCell(r, 0);
        if (size && size !== "NOTE:" && !size.startsWith("Plastic")) {
          detailItems.push({
            size,
            pcsPerBundle: getNum(r, 1),
            bundles: getNum(r, 2),
            totalPcs: getNum(r, 3),
            weightPerBundle: getNum(r, 4),
            totalWeight: getNum(r, 5),
          });
        }
      }
    }

    // Map pieces from details to summary
    const piecesMap = new Map<string, number>();
    detailItems.forEach(d => {
      const current = piecesMap.get(d.size) || 0;
      piecesMap.set(d.size, current + d.totalPcs);
    });
    summaryItems.forEach(item => {
      const ns = item.size.replace(/\s+/g, "").toUpperCase();
      for (const [detailSize, pieces] of piecesMap.entries()) {
        const nd = detailSize.replace(/\s+/g, "").toUpperCase();
        if (ns.includes(nd) || nd.includes(ns)) { item.pieces = pieces; break; }
      }
      if (item.pieces === 0 && detailItems.length > 0) {
        const match = detailItems.find(d => {
          const nd = d.size.replace(/\s+/g, "").toUpperCase();
          return ns.includes(nd) || nd.includes(ns);
        });
        if (match) item.pieces = match.totalPcs;
      }
    });
  }

  // ── Plastic weight ──
  let plasticWeight = "";
  for (let r = 0; r < data.length; r++) {
    const cell = getCell(r, 0);
    if (cell.includes("Plastic Packaging") || cell.includes("Plastic packaging")) {
      plasticWeight = cell;
      break;
    }
  }

  const totalBundles = summaryItems.reduce((sum, i) => sum + i.bundles, 0);
  const totalGrossWeight = summaryItems.reduce((sum, i) => sum + i.grossWeight, 0);
  const totalNetWeight = summaryItems.reduce((sum, i) => sum + i.netWeight, 0);

  return { header, summaryItems, detailItems, hasRealDetails, plasticWeight, totalBundles, totalGrossWeight, totalNetWeight };
}

// ─── BUNDLE NUMBER GENERATOR ─────────────────────────────────
function generateBundleNo(size: string, index: number): string {
  const cleaned = size
    .replace(/\s+/g, "")
    .replace(/MM$/i, "")
    .replace(/X/gi, "")
    .replace(/\./g, "");
  return `IBC${cleaned}W${index}`;
}

// ─── FETCH IMAGE AS BUFFER ───
async function fetchImageBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  return res.arrayBuffer();
}

// ─── EXCEL GENERATION (pixel-perfect replica of template) ──
async function generateExcel(parsed: ParsedData): Promise<Blob> {
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
  const ws = wb.addWorksheet("Hoja1", {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToWidth: 1, fitToHeight: 1 },
  });
  ws.pageSetup.margins = {
    left: 0.7086614173228347, right: 0.7086614173228347,
    top: 0.7480314960629921, bottom: 0.7480314960629921,
    header: 0.31496062992125984, footer: 0.31496062992125984,
  };
  // Gridlines OFF (clean white background like the reference)
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
  const fontMontBold10 = { bold: true, size: 10, name: "Montserrat" };
  const fontMontBold10Blk = { bold: true, size: 10, name: "Montserrat", color: { argb: "FF000000" } };
  const numFmt3 = "0.000_ ";
  const numFmtD = '0_);[Red](0)';
  const numFmtDTotal = '0.000_);[Red](0.000)';
  const center = { horizontal: "center" as const, vertical: "middle" as const };
  const left = { horizontal: "left" as const, vertical: "middle" as const };
  const dataBorder = { top: thinBorder, bottom: thinBorder };
  const whiteFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: WHITE } };
  const blueFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: BLUE } };
  const grayFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: GRAY } };
  const issuedFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: GRAY } };

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

  // ── ROWS 3-6: White left + Gray right, PACKING LIST title ──
  for (let r = 3; r <= 6; r++) {
    for (let c = 1; c <= 4; c++) sc(r, c, null, undefined, undefined, whiteFill);
    for (let c = 5; c <= 8; c++) sc(r, c, null, undefined, undefined, grayFill);
  }
  ws.getRow(4).height = 30.75;
  ws.mergeCells("F4:H5");
  sc(4, 6, "PACKING LIST", { bold: true, size: 20, name: "Montserrat" }, center, grayFill);
  // F6: Roboto 10, vertical center (template)
  sc(6, 6, null, { size: 10, name: "Roboto" }, { vertical: "middle" as const }, grayFill);

  // ── ROW 7: Blue left + "Issued by:" right ──
  ws.getRow(7).height = 20;
  for (let c = 1; c <= 4; c++) sc(7, c, null, undefined, undefined, blueFill);
  for (let c = 5; c <= 8; c++) sc(7, c, null, undefined, undefined, issuedFill);
  sc(7, 6, "Issued by:", { bold: true, size: 10, name: "Montserrat", color: { argb: "FF2D2D2D" } },
    { horizontal: "right" as const, vertical: "middle" as const, indent: 1 }, issuedFill);
  sc(7, 7, "IBC STEEL GROUP CORP", { bold: true, size: 10, name: "Montserrat", color: { argb: "FF2D2D2D" } },
    { horizontal: "left" as const, vertical: "middle" as const, indent: 1 }, issuedFill);

  // ── ROWS 8-12: Blue left (Messrs/NIT/Address) + Gray right (Issued by data) ──
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

  // Left side: Messrs, NIT, Address, Country
  sc(8, 2, "Messrs:", fontLabelWhite, undefined, blueFill);
  sc(8, 3, parsed.header.messrs || "", fontValueWhite, undefined, blueFill);
  sc(9, 2, "NIT:", { bold: true, size: 11, name: "Montserrat", color: { argb: WHITE } }, undefined, blueFill);
  sc(9, 3, "", fontValueWhite, undefined, blueFill);
  sc(10, 2, "Address:", fontLabelWhite, undefined, blueFill);
  sc(10, 3, parsed.header.messrsAddress || "", fontValueWhite, undefined, blueFill);
  sc(11, 2, "Country - City:", fontLabelWhite, undefined, blueFill);
  sc(11, 3, "", fontValueWhite, undefined, blueFill);

  // Right side: "Issued by" data — clean layout
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

  // G12-G18: Montserrat 10 Bold (template)
  sc(12, 7, null, fontMontBold10, undefined, whiteFill);
  for (const gr of [13, 15, 16, 17, 18]) {
    sc(gr, 7, null, fontMontBold10Blk, { horizontal: "left" as const, vertical: "middle" as const });
  }
  sc(14, 7, null, fontMontBold10);

  fillRow(13, whiteFill);

  for (let r = 14; r <= 20; r++) {
    ws.getRow(r).height = 18;
    fillRow(r, whiteFill);
  }

  sc(14, 2, "Transport Details:   ", fontLabel, undefined, whiteFill);
  sc(14, 5, "No:", fontLabelBig, undefined, whiteFill);
  sc(14, 6, parsed.header.no, fontValue, undefined, whiteFill);
  sc(15, 2, "Port of Loading:", fontLabel, undefined, whiteFill);
  sc(15, 3, parsed.header.portOfLoading, fontValue, undefined, whiteFill);
  sc(15, 5, "Date:", fontLabelBig, undefined, whiteFill);
  sc(15, 6, parsed.header.date, fontValue, undefined, whiteFill);
  sc(16, 2, "Port of Discharging:", fontLabel, undefined, whiteFill);
  sc(16, 3, parsed.header.portOfDischarging, fontValue, undefined, whiteFill);
  sc(16, 5, "Shipping Marks:", fontLabelBig, undefined, whiteFill);
  sc(16, 6, parsed.header.shippingMarks, fontValue, undefined, whiteFill);
  sc(17, 2, "Vessel Name:", fontLabel, undefined, whiteFill);
  sc(17, 3, parsed.header.vesselName, fontValue, undefined, whiteFill);
  sc(17, 5, "BL No:", fontLabelBig, undefined, whiteFill);
  sc(17, 6, parsed.header.blNo, fontValue, undefined, whiteFill);
  // D15-D17: Roboto 10 (template)
  sc(15, 4, null, fontValue); sc(16, 4, null, fontValue); sc(17, 4, null, fontValue);
  // C18, D18, E18, F18 specific fonts (template)
  sc(18, 3, null, fontMontBold10); sc(18, 4, null, fontValue);
  sc(18, 5, null, fontLabelBig); sc(18, 6, null, fontValue);
  // E19: Montserrat 11 Bold, center/center (template)
  sc(19, 5, null, fontLabelBig, center);

  // ── ROW 20: Product description line ──
  ws.getRow(20).height = 18;
  ws.mergeCells("C20:G20");
  sc(20, 3, parsed.header.descriptionOfGoods || "STRUCTURAL PIPE SQUARE & RECTANGULAR ASTM A500 GRADE C  LENGTH 6 METERS",
    { bold: true, size: 11, name: "Montserrat" }, center, whiteFill);

  // Row 21: spacer
  ws.getRow(21).height = 15.75;

  // ── ROW 22: Summary table headers ──
  ws.getRow(22).height = 31.5;
  ws.mergeCells("C22:D22");
  const summaryHdrs = [
    { c: 2, v: "ITEM" }, { c: 3, v: "SIZE (MM)" },
    { c: 5, v: "BUNDLES" }, { c: 6, v: "PIECES" },
    { c: 7, v: "G. W.\n(MT)" }, { c: 8, v: "N.W.\n(MT)" },
  ];
  summaryHdrs.forEach(h => sc(22, h.c, h.v, fontSection, center));
  // C22 thin border on top (template)
  ws.getCell(22, 3).border = { top: headerBorder };

  const firstSummaryRow = 23;
  parsed.summaryItems.forEach((item, i) => {
    const r = 23 + i;
    ws.getRow(r).height = 15.75;
    sc(r, 2, item.item, fontData, center, undefined, dataBorder);
    sc(r, 3, item.size, fontData, center, undefined, dataBorder);
    ws.mergeCells(r, 3, r, 4);
    sc(r, 5, item.bundles, fontData, center, undefined, dataBorder);
    sc(r, 6, item.pieces, fontData, center, undefined, dataBorder);
    sc(r, 7, item.grossWeight, fontData, center, undefined, dataBorder);
    sc(r, 8, item.netWeight, fontData, center, undefined, dataBorder);
  });

  // numFmt 0.000_ for summary G/H data rows
  parsed.summaryItems.forEach((_, i) => {
    const r = firstSummaryRow + i;
    ws.getCell(r, 7).numFmt = numFmt3;
    ws.getCell(r, 8).numFmt = numFmt3;
  });

  const sTotalRow = 23 + parsed.summaryItems.length;
  const lastSRow = sTotalRow - 1;
  ws.getRow(sTotalRow).height = 15.75;
  sc(sTotalRow, 2, "TOTAL", fontDataBold, center, undefined, dataBorder);
  sc(sTotalRow, 5, { formula: `SUM(E${firstSummaryRow}:E${lastSRow})` }, fontDataBold, center, undefined, dataBorder);
  sc(sTotalRow, 6, { formula: `SUM(F${firstSummaryRow}:F${lastSRow})` }, fontDataBold, center, undefined, dataBorder);
  sc(sTotalRow, 7, { formula: `SUM(G${firstSummaryRow}:G${lastSRow})` }, fontDataBold, center, undefined, dataBorder);
  sc(sTotalRow, 8, { formula: `SUM(H${firstSummaryRow}:H${lastSRow})` }, fontDataBold, center, undefined, dataBorder);
  ws.getCell(sTotalRow, 7).numFmt = numFmt3;
  ws.getCell(sTotalRow, 8).numFmt = numFmt3;

  let cr = sTotalRow + 1;

  // ── DETAILS section — only include if the source file had a real DETAILS section ──
  if (parsed.hasRealDetails && parsed.detailItems.length > 0) {
    interface ExpandedRow { size: string; bundle: number; pieces: number; bundleNo: string; gw: number; nw: number; }
    const expanded: ExpandedRow[] = [];
    parsed.detailItems.forEach(d => {
      const ns = d.size.replace(/\s*X\s*/gi, "X").replace(/\s+/g, "").toUpperCase();
      const sz = ns.endsWith("MM") ? ns : ns + "MM";
      for (let b = 1; b <= d.bundles; b++) {
        const cnt = expanded.filter(r => r.size === sz).length + 1;
        expanded.push({ size: sz, bundle: 1, pieces: d.pcsPerBundle, bundleNo: generateBundleNo(d.size, cnt), gw: d.weightPerBundle, nw: d.weightPerBundle });
      }
    });

    ws.getRow(cr).height = 15.75;
    cr++;
    const dLabelRow = cr;
    ws.getRow(dLabelRow).height = 15.75;
    const fontDetailsLabel = { bold: true, size: 11, name: "Arial" };
    for (const dc of [3, 4, 6, 7, 8]) sc(dLabelRow, dc, null, fontDetailsLabel, { horizontal: "left" as const }, whiteFill);
    sc(dLabelRow, 5, "DETAILS", fontDetailsLabel, { horizontal: "center" as const }, whiteFill);

    const dHdrRow = dLabelRow + 1;
    ws.getRow(dHdrRow).height = 30;
    [{ c: 2, v: "SIZE" }, { c: 4, v: "BUNDLE" }, { c: 5, v: "PIECES" }, { c: 6, v: "BUNDLE NO." }, { c: 7, v: "G. W.\n(MT)" }, { c: 8, v: "N. W.\n(MT)" }]
      .forEach(h => sc(dHdrRow, h.c, h.v, fontSection, center));
    ws.getCell(dHdrRow, 2).border = { top: headerBorder };
    ws.mergeCells(dHdrRow, 2, dHdrRow, 3);

    cr = dHdrRow + 1;
    const firstDetailRow = cr;
    expanded.forEach(row => {
      ws.getRow(cr).height = 15.75;
      sc(cr, 2, row.size, fontData, center, undefined, dataBorder);
      sc(cr, 4, row.bundle, fontData, center, undefined, dataBorder);
      ws.getCell(cr, 4).numFmt = numFmtD;
      sc(cr, 5, row.pieces, fontData, center, undefined, dataBorder);
      ws.getCell(cr, 5).numFmt = numFmtD;
      sc(cr, 6, row.bundleNo, fontData, center, undefined, dataBorder);
      sc(cr, 7, row.gw, fontData, center, undefined, dataBorder);
      ws.getCell(cr, 7).numFmt = numFmt3;
      sc(cr, 8, { formula: `G${cr}` }, fontData, center, undefined, dataBorder);
      ws.getCell(cr, 8).numFmt = numFmt3;
      ws.mergeCells(cr, 2, cr, 3);
      cr++;
    });

    const lastDetailRow = cr - 1;
    ws.getRow(cr).height = 15.75;
    sc(cr, 2, "TOTAL ", fontDataBold, { ...center, wrapText: true }, undefined, dataBorder);
    ws.mergeCells(cr, 2, cr, 3);
    sc(cr, 4, { formula: `SUM(D${firstDetailRow}:D${lastDetailRow})` }, fontDataBold, { ...center, wrapText: true }, undefined, dataBorder);
    ws.getCell(cr, 4).numFmt = numFmtDTotal;
    sc(cr, 5, { formula: `SUM(E${firstDetailRow}:E${lastDetailRow})` }, fontDataBold, { ...center, wrapText: true }, undefined, dataBorder);
    ws.getCell(cr, 5).numFmt = numFmtD;
    sc(cr, 7, { formula: `SUM(G${firstDetailRow}:G${lastDetailRow})` }, fontDataBold, { ...center, wrapText: true }, undefined, dataBorder);
    ws.getCell(cr, 7).numFmt = numFmtDTotal;
    sc(cr, 8, { formula: `SUM(H${firstDetailRow}:H${lastDetailRow})` }, fontDataBold, { ...center, wrapText: true }, undefined, dataBorder);
    ws.getCell(cr, 8).numFmt = numFmtDTotal;
    cr++;
  }

  cr++;
  sc(cr, 2, "NOTE:", { bold: true, size: 12, name: "Arial" }, { horizontal: "left" as const });
  cr++;
  sc(cr, 2, parsed.plasticWeight || "Plastic Packaging Weight Information: Total 0  kilograms", { bold: true, size: 11, name: "Arial" }, left);
  cr++;

  cr++;
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
    sc(cr, 4, null, { size: 11, name: "Roboto" });
    sc(cr, 5, null, { size: 11, name: "Roboto" });
    cr++;
  });

  cr++;
  const disclaimerRow = cr;
  ws.mergeCells(cr, 2, cr + 1, 7);
  sc(cr, 2, "IBC STEEL GROUP promotes responsible environmental management. The client agrees to handle and dispose of products, waste, and packaging in compliance with current environmental regulations, ensuring their reuse, recycling, or delivery to authorized facilities", { size: 10, name: "Roboto" }, { ...left, wrapText: true });
  cr += 2;

  // ── SIGNATURE SECTION ──
  // Signature area: merge E[cr]:H[cr+8] for the right-side images
  const sigStartRow = cr;
  ws.mergeCells(cr, 5, cr + 8, 8);

  // "Signature Stamp" label
  cr++;
  sc(cr, 2, "Signature Stamp", { bold: true, size: 11, name: "Montserrat" }, { horizontal: "left" as const });
  cr++;

  // Signature image (Imagen firma.png) placed below "Signature Stamp"
  const firmaRow = cr;
  cr += 5; // space for the signature image

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
  // Logo IBC (upper left)
  addImg(img0, { tl: { col: 2, row: 0 }, br: { col: 2.978, row: 7.154 } });
  // Vertical line separator
  addImg(img1, { tl: { col: 4, row: 3.042 }, br: { col: 4, row: 16.646 } });
  // Secondary logo
  addImg(img2, { tl: { col: 2, row: 1.36 }, br: { col: 3, row: 5.796 } });
  // QR code with www.ibcsteelgroup.com included
  addImg(imgQR, { tl: { col: 5.2, row: sigStartRow + 0.3 }, ext: { width: 170, height: 180 } });
  // ISO certification image (same height as QR, right next to it)
  addImg(imgISO, { tl: { col: 6.5, row: sigStartRow + 0.3 }, ext: { width: 256, height: 160 } });
  // Signature image (Imagen firma.png) — only signature
  addImg(imgFirma, { tl: { col: 1, row: firmaRow - 0.2 }, ext: { width: 420, height: 142 } });

  // Print area
  ws.pageSetup.printArea = `A1:H${cr + 2}`;

  // Default font Aptos Narrow 11 + numFmt 0.00 for all Col A cells
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
interface PLStats {
  totalProcessed: number;
  totalSuccess: number;
  totalTimeMs: number;
}

const STATS_KEY = "ibc_pl_stats";

function loadStats(): PLStats {
  if (typeof window === "undefined") return { totalProcessed: 0, totalSuccess: 0, totalTimeMs: 0 };
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { totalProcessed: 0, totalSuccess: 0, totalTimeMs: 0 };
}

function saveStats(s: PLStats) {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// ─── COMPONENT ───────────────────────────────────────────────
export default function PackingListConverterPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hoverZone, setHoverZone] = useState(false);
  const [progress, setProgress] = useState(0);

  const [stats, setStats] = useState<PLStats>({ totalProcessed: 0, totalSuccess: 0, totalTimeMs: 0 });
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

    // Simulate progress
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

      const parsed = parseOriginExcel(data);

      if (parsed.summaryItems.length === 0) {
        throw new Error("No se encontraron items en el archivo. Verifica que sea un Packing List de origen valido.");
      }

      clearInterval(iv);
      setProgress(100);
      setTimeout(() => {
        setParsedData(parsed);
        setStatus("parsed");
        toast.success(`Archivo procesado: ${parsed.summaryItems.length} items encontrados`);
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
      const blob = await generateExcel(parsedData);
      const elapsed = performance.now() - convStartRef.current;
      setConvertedBlob(blob);
      setStatus("done");
      // Record success stats
      setStats(prev => {
        const next = { totalProcessed: prev.totalProcessed + 1, totalSuccess: prev.totalSuccess + 1, totalTimeMs: prev.totalTimeMs + elapsed };
        saveStats(next);
        return next;
      });
      toast.success("Packing List convertido exitosamente");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al generar el archivo";
      setErrorMsg(msg);
      setStatus("error");
      // Record failure stats
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
      ? `PL_IBC_${file.name.replace(/\.(xlsx|xls)$/i, "")}_${new Date().toISOString().slice(0, 10)}.xlsx`
      : `PL_IBC_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Archivo descargado");
  }, [convertedBlob, file]);

  const handlePrintPDF = useCallback(() => {
    if (!parsedData) return;
    const p = parsedData;

    const f3 = (n: number) => n.toFixed(3);

    const sRows = p.summaryItems.map((it, i) =>
      `<tr><td class="dc${i % 2 ? ' z' : ''}">${it.item}</td><td class="dc${i % 2 ? ' z' : ''}" colspan="2">${it.size}</td><td class="dc${i % 2 ? ' z' : ''}">${it.bundles}</td><td class="dc${i % 2 ? ' z' : ''}">${it.pieces}</td><td class="dc n${i % 2 ? ' z' : ''}">${f3(it.grossWeight)}</td><td class="dc n${i % 2 ? ' z' : ''}">${f3(it.netWeight)}</td></tr>`
    ).join("");

    // Details section — only if source had real details
    let detailsHTML = "";
    if (p.hasRealDetails && p.detailItems.length > 0) {
      interface ExpandedPDF { size: string; bundle: number; pieces: number; bundleNo: string; gw: number; nw: number; }
      const expandedPDF: ExpandedPDF[] = [];
      p.detailItems.forEach(d => {
        const ns = d.size.replace(/\s*X\s*/gi, "X").replace(/\s+/g, "").toUpperCase();
        const sz = ns.endsWith("MM") ? ns : ns + "MM";
        for (let b = 1; b <= d.bundles; b++) {
          const cnt = expandedPDF.filter(r => r.size === sz).length + 1;
          expandedPDF.push({ size: sz, bundle: 1, pieces: d.pcsPerBundle, bundleNo: generateBundleNo(d.size, cnt), gw: d.weightPerBundle, nw: d.weightPerBundle });
        }
      });
      const dRows = expandedPDF.map((r, i) =>
        `<tr><td class="dc${i % 2 ? ' z' : ''}" colspan="2">${r.size}</td><td class="dc${i % 2 ? ' z' : ''}">${r.bundle}</td><td class="dc${i % 2 ? ' z' : ''}">${r.pieces}</td><td class="dc${i % 2 ? ' z' : ''}" style="font-size:9px;letter-spacing:.03em">${r.bundleNo}</td><td class="dc n${i % 2 ? ' z' : ''}">${f3(r.gw)}</td><td class="dc n${i % 2 ? ' z' : ''}">${f3(r.nw)}</td></tr>`
      ).join("");
      const tDB = expandedPDF.reduce((s, r) => s + r.bundle, 0);
      const tDP = expandedPDF.reduce((s, r) => s + r.pieces, 0);
      const tDG = expandedPDF.reduce((s, r) => s + r.gw, 0);
      const tDN = expandedPDF.reduce((s, r) => s + r.nw, 0);
      detailsHTML = `
<div style="text-align:center;padding:7px 0 4px 0">
  <span style="font-weight:800;font-size:9px;letter-spacing:.14em;color:#1E3A5F;text-transform:uppercase;border-bottom:2px solid #3b6ba5;padding-bottom:3px">Details</span>
</div>
<table style="margin:4px 0 10px 0;border:1px solid #e2e5eb;border-radius:5px;overflow:hidden">
  <tr>
    <td class="th" colspan="2" style="width:28%">SIZE</td>
    <td class="th" style="width:9%">BUNDLE</td>
    <td class="th" style="width:9%">PIECES</td>
    <td class="th" style="width:24%">BUNDLE NO.</td>
    <td class="th" style="width:15%">G.W. (MT)</td>
    <td class="th" style="width:15%">N.W. (MT)</td>
  </tr>
  ${dRows}
  <tr class="tr-total">
    <td class="dc" colspan="2" style="font-weight:800;font-size:8.5px;letter-spacing:.08em">TOTAL</td>
    <td class="dc">${f3(tDB)}</td>
    <td class="dc">${tDP}</td>
    <td class="dc"></td>
    <td class="dc n">${f3(tDG)}</td>
    <td class="dc n">${f3(tDN)}</td>
  </tr>
</table>`;
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Packing List — IBC Steel Group</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
@page{size:A4 portrait;margin:12mm 14mm 10mm 14mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',system-ui,-apple-system,sans-serif;font-size:10px;color:#111827;background:#fff;line-height:1.35;-webkit-font-smoothing:antialiased}
table{border-collapse:collapse;width:100%}

/* cells */
.dc{text-align:center;vertical-align:middle;padding:5.5px 5px;font-size:10px;font-weight:400;color:#1f2937;border-bottom:1px solid #f0f0f4}
.dc.n{font-variant-numeric:tabular-nums;letter-spacing:.01em;font-feature-settings:'tnum'}
.dc.z{background:#f8f9fb}

/* table headers */
.th{font-family:'Inter',sans-serif;font-weight:700;font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.95);background:linear-gradient(135deg,#1E3A5F 0%,#2a5082 100%);text-align:center;padding:9px 5px;vertical-align:middle}

/* total */
.tr-total .dc{font-weight:700;background:linear-gradient(135deg,#EEF2F8 0%,#E3EAF4 100%);border-top:2px solid #3b6ba5;border-bottom:2px solid #3b6ba5;color:#1E3A5F;font-size:10.5px}

/* labels */
.L{font-family:'Inter',sans-serif;font-weight:600;font-size:9px;color:#1E3A5F;letter-spacing:.02em}
.V{font-family:'Inter',sans-serif;font-weight:400;font-size:10px;color:#374151}

@media print{
  body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  .nb{page-break-inside:avoid}
}
</style></head><body>

<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
<!--  HEADER                                                  -->
<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
<table style="border-spacing:0">
  <tr>
    <td style="width:38%;vertical-align:middle;padding:6px 0">
      <img src="/pl-assets/template-image-2.png" style="height:48px" alt="IBC"/>
    </td>
    <td style="width:62%;vertical-align:middle">
      <table style="border-spacing:0">
        <tr>
          <td style="background:linear-gradient(135deg,#1E3A5F,#2a5082);color:#fff;text-align:center;padding:9px 16px;border-radius:6px">
            <div style="font-weight:600;font-size:8.5px;letter-spacing:.06em;line-height:1.7;opacity:.9">
              848 BRICKELL AVE STE 950 MIAMI, FL 33131<br/>
              <span style="opacity:.75">servicioalcliente@ibcsteelgroup.com &nbsp;·&nbsp; (786) 233 8521</span>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<div style="height:1px;background:linear-gradient(90deg,#1E3A5F,#3b6ba5,#1E3A5F);margin:2px 0 0 0"></div>

<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
<!--  PACKING LIST TITLE                                      -->
<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
<table style="margin:0">
  <tr>
    <td style="width:38%"></td>
    <td style="width:62%;text-align:center;padding:14px 0 12px 0">
      <div style="font-weight:900;font-size:22px;letter-spacing:.12em;color:#1E3A5F;text-transform:uppercase">Packing List</div>
      <div style="width:50px;height:3px;background:linear-gradient(90deg,#3b6ba5,#5D81AF);margin:6px auto 0 auto;border-radius:2px"></div>
    </td>
  </tr>
</table>

<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
<!--  CLIENT / ISSUED BY                                      -->
<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
<table style="border-radius:6px;overflow:hidden;margin-bottom:10px">
  <tr>
    <!-- Client -->
    <td style="width:42%;background:linear-gradient(145deg,#4a7db5,#5D81AF);color:#fff;vertical-align:top;padding:12px 16px">
      <div style="font-weight:300;font-size:7.5px;letter-spacing:.12em;text-transform:uppercase;opacity:.65;margin-bottom:6px">Ship To / Client</div>
      <table style="color:#fff;border-collapse:collapse;width:100%">
        <tr><td style="font-weight:600;font-size:8.5px;padding:3px 0;width:82px;vertical-align:top;opacity:.8">Messrs:</td><td style="font-size:10px;padding:3px 0;font-weight:500">${p.header.messrs}</td></tr>
        <tr><td style="font-weight:600;font-size:8.5px;padding:3px 0;opacity:.8">NIT:</td><td style="font-size:10px;padding:3px 0"></td></tr>
        <tr><td style="font-weight:600;font-size:8.5px;padding:3px 0;opacity:.8;vertical-align:top">Address:</td><td style="font-size:10px;padding:3px 0">${p.header.messrsAddress}</td></tr>
        <tr><td style="font-weight:600;font-size:8.5px;padding:3px 0;opacity:.8">Country - City:</td><td style="font-size:10px;padding:3px 0"></td></tr>
      </table>
    </td>
    <!-- Issued by -->
    <td style="width:58%;background:linear-gradient(145deg,#1E3A5F,#193351);color:#fff;vertical-align:top;padding:12px 16px">
      <div style="font-weight:300;font-size:7.5px;letter-spacing:.12em;text-transform:uppercase;opacity:.5;margin-bottom:4px">Issued By</div>
      <div style="font-weight:800;font-size:13px;letter-spacing:.03em;margin-bottom:8px">IBC STEEL GROUP CORP</div>
      <table style="color:#fff;border-collapse:collapse;width:100%">
        <tr><td style="font-weight:600;font-size:8px;padding:2px 0;width:52px;opacity:.6">Address:</td><td style="font-size:8.5px;padding:2px 0;opacity:.85">848 BRICKELL AVE STE 950 MIAMI, FL 33131</td></tr>
        <tr><td style="font-weight:600;font-size:8px;padding:2px 0;opacity:.6">Tel:</td><td style="font-size:8.5px;padding:2px 0;opacity:.85">(786) 233 8521</td></tr>
        <tr><td style="font-weight:600;font-size:8px;padding:2px 0;opacity:.6">EIN:</td><td style="font-size:8.5px;padding:2px 0;opacity:.85">35-2726376</td></tr>
      </table>
    </td>
  </tr>
</table>

<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
<!--  TRANSPORT DETAILS                                       -->
<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
<table style="margin:0 0 6px 0;border:1px solid #e9ebf0;border-radius:5px;overflow:hidden">
  <tr style="background:#f8f9fb">
    <td colspan="4" style="padding:6px 12px;font-weight:700;font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:#1E3A5F;border-bottom:1px solid #e9ebf0">
      <span style="display:inline-block;width:3px;height:10px;background:linear-gradient(180deg,#3b6ba5,#5D81AF);border-radius:2px;margin-right:6px;vertical-align:middle"></span>
      Shipping &amp; Transport Details
    </td>
  </tr>
  <tr>
    <td class="L" style="padding:5px 12px;width:15%;border-bottom:1px solid #f0f0f4">Transport Details:</td>
    <td class="V" style="padding:5px 8px;width:35%;border-bottom:1px solid #f0f0f4"></td>
    <td class="L" style="padding:5px 8px;width:12%;border-bottom:1px solid #f0f0f4">No:</td>
    <td class="V" style="padding:5px 8px;width:38%;border-bottom:1px solid #f0f0f4">${p.header.no}</td>
  </tr>
  <tr>
    <td class="L" style="padding:5px 12px;border-bottom:1px solid #f0f0f4">Port of Loading:</td>
    <td class="V" style="padding:5px 8px;border-bottom:1px solid #f0f0f4">${p.header.portOfLoading}</td>
    <td class="L" style="padding:5px 8px;border-bottom:1px solid #f0f0f4">Date:</td>
    <td class="V" style="padding:5px 8px;border-bottom:1px solid #f0f0f4">${p.header.date}</td>
  </tr>
  <tr>
    <td class="L" style="padding:5px 12px;border-bottom:1px solid #f0f0f4">Port of Discharging:</td>
    <td class="V" style="padding:5px 8px;border-bottom:1px solid #f0f0f4">${p.header.portOfDischarging}</td>
    <td class="L" style="padding:5px 8px;border-bottom:1px solid #f0f0f4">Shipping Marks:</td>
    <td class="V" style="padding:5px 8px;border-bottom:1px solid #f0f0f4">${p.header.shippingMarks}</td>
  </tr>
  <tr>
    <td class="L" style="padding:5px 12px">Vessel Name:</td>
    <td class="V" style="padding:5px 8px">${p.header.vesselName}</td>
    <td class="L" style="padding:5px 8px">BL No:</td>
    <td class="V" style="padding:5px 8px">${p.header.blNo}</td>
  </tr>
</table>

<!-- Description of Goods -->
<div style="text-align:center;font-weight:700;font-size:9.5px;padding:9px 20px;margin:6px 0 8px 0;background:linear-gradient(135deg,#EEF2F8,#E3EAF4);border-radius:5px;color:#1E3A5F;letter-spacing:.03em;border:1px solid #dce3ee">
  ${p.header.descriptionOfGoods || "STRUCTURAL PIPE SQUARE & RECTANGULAR ASTM A500 GRADE C  LENGTH 6 METERS"}
</div>

<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
<!--  SUMMARY TABLE                                           -->
<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
<table style="margin:0 0 10px 0;border:1px solid #e2e5eb;border-radius:5px;overflow:hidden" class="nb">
  <tr>
    <td class="th" style="width:7%">ITEM</td>
    <td class="th" colspan="2" style="width:30%">SIZE (MM)</td>
    <td class="th" style="width:13%">BUNDLES</td>
    <td class="th" style="width:13%">PIECES</td>
    <td class="th" style="width:18.5%">G.W. (MT)</td>
    <td class="th" style="width:18.5%">N.W. (MT)</td>
  </tr>
  ${sRows}
  <tr class="tr-total">
    <td class="dc" style="font-weight:800;font-size:8.5px;letter-spacing:.08em">TOTAL</td>
    <td class="dc" colspan="2"></td>
    <td class="dc">${p.totalBundles}</td>
    <td class="dc">${p.summaryItems.reduce((s, i) => s + i.pieces, 0)}</td>
    <td class="dc n">${f3(p.totalGrossWeight)}</td>
    <td class="dc n">${f3(p.totalNetWeight)}</td>
  </tr>
</table>

${detailsHTML}

<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
<!--  NOTE + PAYMENT  (side by side)                          -->
<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
<table style="margin:0 0 8px 0;border-spacing:8px 0">
  <tr>
    <!-- Note -->
    <td style="width:40%;vertical-align:top;padding:0">
      <div style="background:#FFFBF5;border:1px solid #F0DFC0;border-radius:5px;padding:10px 12px;height:100%">
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:5px">
          <span style="display:inline-block;width:3px;height:10px;background:#D4940A;border-radius:2px"></span>
          <span style="font-weight:700;font-size:8px;letter-spacing:.08em;color:#92600A;text-transform:uppercase">Note</span>
        </div>
        <p style="font-size:9.5px;color:#78590A;line-height:1.5">${p.plasticWeight || "Plastic Packaging Weight Information: Total 0 kilograms"}</p>
      </div>
    </td>
    <!-- Payment -->
    <td style="width:60%;vertical-align:top;padding:0">
      <div style="background:#f8f9fb;border:1px solid #e2e5eb;border-radius:5px;padding:10px 14px;height:100%">
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:7px">
          <span style="display:inline-block;width:3px;height:10px;background:linear-gradient(180deg,#1E3A5F,#3b6ba5);border-radius:2px"></span>
          <span style="font-weight:700;font-size:8px;letter-spacing:.08em;color:#1E3A5F;text-transform:uppercase">Payment Information</span>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <tr><td class="L" style="padding:2.5px 0;width:145px">BENEFICIARY NAME:</td><td class="V" style="padding:2.5px 0;font-weight:600">IBC STEEL GROUP CORP</td></tr>
          <tr><td class="L" style="padding:2.5px 0">BENEFICIARY BANK:</td><td class="V" style="padding:2.5px 0">CITIBANK</td></tr>
          <tr><td class="L" style="padding:2.5px 0">BENE ACCOUNT NO:</td><td class="V" style="padding:2.5px 0">3290415415</td></tr>
          <tr><td class="L" style="padding:2.5px 0">SWIFT CODE:</td><td class="V" style="padding:2.5px 0">CITIUS33</td></tr>
          <tr><td class="L" style="padding:2.5px 0">BANK ADDRESS:</td><td class="V" style="padding:2.5px 0">201 S BISCAYNE BLVD MIAMI, FL 33131</td></tr>
        </table>
      </div>
    </td>
  </tr>
</table>

<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
<!--  DISCLAIMER                                              -->
<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
<p style="font-size:7.5px;color:#9ca3af;margin:4px 0 8px 0;line-height:1.6;max-width:90%;font-style:italic">
  IBC STEEL GROUP promotes responsible environmental management. The client agrees to handle and dispose of products, waste, and packaging in compliance with current environmental regulations, ensuring their reuse, recycling, or delivery to authorized facilities.
</p>

<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
<!--  SIGNATURE / QR / ISO                                    -->
<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
<div style="height:1px;background:linear-gradient(90deg,transparent,#d1d5db,transparent);margin:0 0 8px 0"></div>
<table style="margin:0">
  <tr>
    <td style="width:38%;vertical-align:top;padding:0 8px 0 0">
      <div style="font-weight:700;font-size:7.5px;letter-spacing:.1em;text-transform:uppercase;color:#6b7280;margin-bottom:5px">Authorized Signature</div>
      <img src="/pl-assets/firma.png" style="height:68px;display:block" alt="Firma"/>
    </td>
    <td style="width:30%;text-align:center;vertical-align:middle;padding:0">
      <img src="/pl-assets/iso.png" style="height:72px" alt="ISO 9001 · IQNET"/>
    </td>
    <td style="width:32%;text-align:right;vertical-align:top;padding:0">
      <img src="/pl-assets/qr.png" style="height:92px" alt="QR"/>
    </td>
  </tr>
</table>

<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
<!--  FOOTER                                                  -->
<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
<div style="background:linear-gradient(135deg,#1E3A5F,#2a5082);color:#fff;text-align:center;font-size:8px;font-weight:600;padding:8px 14px;margin-top:8px;border-radius:5px;letter-spacing:.07em">
  Version: 01 &nbsp;&nbsp;·&nbsp;&nbsp; Codigo: F-GLS-05 &nbsp;&nbsp;·&nbsp;&nbsp; IBC STEEL GROUP CORP &nbsp;&nbsp;·&nbsp;&nbsp; www.ibcsteelgroup.com
</div>

</body></html>`;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Permite ventanas emergentes para imprimir");
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => { printWindow.print(); }, 400);
    };
  }, [parsedData]);

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
    { name: "Subir archivo", desc: "Cargar Packing List" },
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
          <span style={{ fontWeight: 600, color: T.inkMuted }}>Packing List</span>
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
                <Package className="h-[18px] w-[18px]" />
              </div>
              <div>
                <h1 style={{
                  fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                  fontSize: 18, fontWeight: 800, color: "#fff",
                  letterSpacing: "-0.02em", lineHeight: 1.2,
                }}>Packing List</h1>
                <p style={{ fontSize: 12, color: "rgba(191,219,254,0.7)", fontWeight: 500 }}>
                  Conversión automática al formato IBC Steel Group
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stepper ── */}
        <div className="mb-6" style={{ animation: mounted ? "fadeScale 0.7s cubic-bezier(0.22,1,0.36,1) 0.14s both" : "none" }}>
          <div className="glass-card rounded-2xl py-4 px-7 relative overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.02)" }}>
            {/* Track line */}
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
          {/* Accent line */}
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
                <p className="text-[12px] mt-0.5" style={{ color: C.textMuted }}>Sube tu packing list para iniciar la conversion al formato IBC</p>
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

                {/* Dashed border SVG */}
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
                  {/* Upload icon */}
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

                  {/* Meta pills */}
                  <div className="flex items-center gap-4 flex-wrap justify-center mt-1">
                    <div className="flex items-center gap-2 text-[12px] font-medium" style={{ color: C.textSec }}>
                      <FileSpreadsheet className="h-3.5 w-3.5" style={{ color: C.textMuted }} />
                      Excel (.xlsx, .xls)
                    </div>
                    <div className="w-px h-4" style={{ background: C.creamWarm }} />
                    <div className="flex items-center gap-2 text-[12px] font-medium" style={{ color: C.textSec }}>
                      <Package className="h-3.5 w-3.5" style={{ color: C.textMuted }} />
                      Hasta 50 MB
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
                    <p className="text-[12px] mt-0.5" style={{ color: C.textMuted }}>Analizando estructura y campos del Packing List</p>
                  </div>
                  <div className="text-[28px] font-extrabold" style={{ color: C.accent }}>{Math.round(progress)}<span className="text-[14px] font-medium" style={{ color: C.textMuted }}>%</span></div>
                </div>

                {/* Progress bar */}
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
              {/* Success banner */}
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

              {/* File row */}
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

              {/* Error */}
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
                <p className="text-[13px] font-semibold mt-2" style={{ color: "#b45309" }}>Generando archivo IBC...</p>
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
                className="btn-primary flex items-center justify-center gap-2 px-6 py-3.5 rounded-[14px] border-none text-white text-[14px] font-bold cursor-pointer"
                style={{
                  background: `linear-gradient(145deg, ${C.accent}, ${C.accentBright})`,
                  boxShadow: `0 6px 24px rgba(45,111,186,0.25), inset 0 1px 0 rgba(255,255,255,0.1)`,
                }}
                onClick={handlePrintPDF}
              >
                <Printer className="h-4 w-4" />
                Imprimir PDF
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
                  <Package className="h-[22px] w-[22px]" />
                </div>
                <div>
                  <h2 className="text-[17px] font-bold" style={{ color: C.text }}>Vista Previa</h2>
                  <p className="text-[12px] mt-0.5" style={{ color: C.textMuted }}>Datos extraidos del archivo de origen</p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-3 py-1.5 rounded-full" style={{ background: C.greenSoft, color: C.green }}>
                {parsedData.summaryItems.length} items
              </span>
            </div>

            <div className="px-6 pb-6">
              {/* Header info grid */}
              <div className="p-4 rounded-[14px] mb-4" style={{ background: C.creamSoft, border: `1px solid ${C.border}` }}>
                <div className="grid grid-cols-2 gap-2 text-[12.5px]">
                  {parsedData.header.messrs && (
                    <div><span style={{ color: C.textMuted }}>Cliente: </span><strong style={{ color: C.text }}>{parsedData.header.messrs}</strong></div>
                  )}
                  {parsedData.header.no && (
                    <div><span style={{ color: C.textMuted }}>No: </span><strong style={{ color: C.text }}>{parsedData.header.no}</strong></div>
                  )}
                  {parsedData.header.portOfLoading && (
                    <div><span style={{ color: C.textMuted }}>Puerto carga: </span><strong style={{ color: C.text }}>{parsedData.header.portOfLoading}</strong></div>
                  )}
                  {parsedData.header.date && (
                    <div><span style={{ color: C.textMuted }}>Fecha: </span><strong style={{ color: C.text }}>{parsedData.header.date}</strong></div>
                  )}
                  {parsedData.header.portOfDischarging && (
                    <div><span style={{ color: C.textMuted }}>Puerto destino: </span><strong style={{ color: C.text }}>{parsedData.header.portOfDischarging}</strong></div>
                  )}
                  {parsedData.header.vesselName && (
                    <div><span style={{ color: C.textMuted }}>Buque: </span><strong style={{ color: C.text }}>{parsedData.header.vesselName}</strong></div>
                  )}
                  {parsedData.header.blNo && (
                    <div><span style={{ color: C.textMuted }}>BL No: </span><strong style={{ color: C.text }}>{parsedData.header.blNo}</strong></div>
                  )}
                </div>
              </div>

              {/* Summary table */}
              <div className="max-h-[340px] overflow-auto rounded-[14px]" style={{ border: `1px solid ${C.border}` }}>
                <Table>
                  <TableHeader>
                    <TableRow style={{ background: C.creamSoft }}>
                      <TableHead className="text-[11px] font-semibold" style={{ color: C.accent }}>Item</TableHead>
                      <TableHead className="text-[11px] font-semibold" style={{ color: C.accent }}>Size (MM)</TableHead>
                      <TableHead className="text-[11px] font-semibold text-center" style={{ color: C.accent }}>Bundles</TableHead>
                      <TableHead className="text-[11px] font-semibold text-center" style={{ color: C.accent }}>G.W. (MT)</TableHead>
                      <TableHead className="text-[11px] font-semibold text-center" style={{ color: C.accent }}>N.W. (MT)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.summaryItems.map((item) => (
                      <TableRow key={item.item}>
                        <TableCell className="text-[12px] font-medium">{item.item}</TableCell>
                        <TableCell className="text-[12px]">{item.size}</TableCell>
                        <TableCell className="text-[12px] text-center">{item.bundles}</TableCell>
                        <TableCell className="text-[12px] text-center">{item.grossWeight}</TableCell>
                        <TableCell className="text-[12px] text-center">{item.netWeight}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow style={{ background: C.creamSoft }}>
                      <TableCell colSpan={2} className="text-[12px] font-bold" style={{ color: C.text }}>TOTAL</TableCell>
                      <TableCell className="text-[12px] font-bold text-center">{parsedData.totalBundles}</TableCell>
                      <TableCell className="text-[12px] font-bold text-center">{parsedData.totalGrossWeight.toFixed(3)}</TableCell>
                      <TableCell className="text-[12px] font-bold text-center">{parsedData.totalNetWeight.toFixed(3)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Detail summary — only show if source had real details */}
              {parsedData.hasRealDetails && parsedData.detailItems.length > 0 && (
                <div className="mt-3 px-4 py-3 rounded-[14px] text-[12px] font-medium" style={{ background: C.accentGlow, color: C.accent, border: `1px solid rgba(45,111,186,0.08)` }}>
                  Detalle: {parsedData.detailItems.length} tamanos encontrados — se generaran {parsedData.detailItems.reduce((sum, d) => sum + d.bundles, 0)} filas de bundles individuales
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Stats Row ── */}
        <div className="flex gap-3.5 mt-6 flex-wrap" style={{ animation: mounted ? "fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.3s both" : "none" }}>
          {[
            { icon: <Files className="h-[18px] w-[18px]" style={{ color: C.accent }} />, val: Math.round(filesProcessed), unit: "", label: "Archivos procesados", color: C.accent },
            { icon: <ShieldCheck className="h-[18px] w-[18px]" style={{ color: C.green }} />, val: stats.totalProcessed > 0 ? successRate.toFixed(1) : "—", unit: stats.totalProcessed > 0 ? "%" : "", label: "Tasa de exito", color: C.green },
            { icon: <Timer className="h-[18px] w-[18px]" style={{ color: C.gold }} />, val: stats.totalSuccess > 0 ? avgTime.toFixed(1) : "—", unit: stats.totalSuccess > 0 ? "s" : "", label: "Tiempo promedio", color: C.gold },
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
