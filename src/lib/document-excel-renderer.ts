// =====================================================
// Document Excel Renderer — ExcelJS
// Generates formatted Excel from a DocumentTemplate
// Follows the exact visual identity of IBC Steel Group
// =====================================================

import { IBC_COMPANY, IBC_BANK, DOCUMENT_DISCLAIMER, FOOTER_CODE, DOCUMENT_TYPES } from "./document-constants";
import type { DocumentTemplate } from "./document-template";

async function fetchImageBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  return res.arrayBuffer();
}

export async function renderDocumentExcel(template: DocumentTemplate): Promise<Blob> {
  const ExcelJSModule = await import("exceljs");
  const ExcelJS = ExcelJSModule.default || ExcelJSModule;

  // Fetch all images in parallel
  const [img0, img1, img2, imgQR, imgISO, imgFirma] = await Promise.all([
    fetchImageBuffer("/pl-assets/template-image-0.png"),
    fetchImageBuffer("/pl-assets/template-image-1.png"),
    fetchImageBuffer("/pl-assets/template-image-2.png"),
    fetchImageBuffer("/pl-assets/qr.png"),
    fetchImageBuffer("/pl-assets/iso.png"),
    fetchImageBuffer("/pl-assets/firma.png"),
  ]);

  const docTypeConfig = DOCUMENT_TYPES[template.type];
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(template.documentNumber || "Document", {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToWidth: 1, fitToHeight: 1 },
  });
  ws.pageSetup.margins = {
    left: 0.7086614173228347, right: 0.7086614173228347,
    top: 0.7480314960629921, bottom: 0.7480314960629921,
    header: 0.31496062992125984, footer: 0.31496062992125984,
  };
  ws.views = [{ showGridLines: false }];

  // ── Constants ──
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
  const dataBorder = { top: thinBorder, bottom: thinBorder };
  const whiteFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: WHITE } };
  const blueFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: BLUE } };
  const grayFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: GRAY } };
  const issuedFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: GRAY } };
  const numFmtQty = "#,##0.000";    // QTY: 3 decimals
  const numFmtPrice = "#,##0";       // UNIT PRICE: no decimals
  const numFmtAmount = "#,##0.00";   // TOTAL AMOUNT: 2 decimals
  const numFmt2 = "#,##0.00";        // default fallback

  // Column widths (exact match to ARCHIVO FINAL)
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

  // ══════════════════════════════════════════════════════
  // ZONA 1: ENCABEZADO (Filas 1-20)
  // ══════════════════════════════════════════════════════

  // ── ROWS 1-2: White left + Blue contact bar right ──
  for (let r = 1; r <= 2; r++) {
    for (let c = 1; c <= 4; c++) sc(r, c, null, undefined, undefined, whiteFill);
    for (let c = 5; c <= 8; c++) sc(r, c, null, undefined, undefined, blueFill);
  }
  ws.mergeCells("E1:H2");
  sc(1, 5, `${IBC_COMPANY.address} - email: ${IBC_COMPANY.email}`,
    { size: 11, name: "Aptos Narrow", color: { argb: WHITE } }, center, blueFill);

  // ── ROWS 3-6: White left + Gray right, Document title ──
  for (let r = 3; r <= 6; r++) {
    for (let c = 1; c <= 4; c++) sc(r, c, null, undefined, undefined, whiteFill);
    for (let c = 5; c <= 8; c++) sc(r, c, null, undefined, undefined, grayFill);
  }
  ws.getRow(4).height = 30.75;
  ws.mergeCells("F4:H5");
  sc(4, 6, docTypeConfig.title, { bold: true, size: 20, name: "Montserrat" }, center, grayFill);
  sc(6, 6, null, { size: 10, name: "Roboto" }, { vertical: "middle" as const }, grayFill);

  // ── ROW 7: Blue left + "Issued by:" right ──
  ws.getRow(7).height = 20;
  for (let c = 1; c <= 4; c++) sc(7, c, null, undefined, undefined, blueFill);
  for (let c = 5; c <= 8; c++) sc(7, c, null, undefined, undefined, issuedFill);
  sc(7, 6, "Issued by:", { bold: true, size: 10, name: "Montserrat", color: { argb: "FF2D2D2D" } },
    { horizontal: "right" as const, vertical: "middle" as const, indent: 1 }, issuedFill);
  sc(7, 7, template.company.name, { bold: true, size: 10, name: "Montserrat", color: { argb: "FF2D2D2D" } },
    { horizontal: "left" as const, vertical: "middle" as const, indent: 1 }, issuedFill);

  // ── ROWS 8-12: Blue left (client) + Gray right (IBC) ──
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

  // Left side: Client info (4 fields)
  sc(8, 2, "Messrs:", fontLabelWhite, undefined, blueFill);
  sc(8, 3, template.client.messrs, fontValueWhite, undefined, blueFill);
  sc(9, 2, "NIT:", fontLabelWhite, undefined, blueFill);
  sc(9, 3, template.client.nit, fontValueWhite, undefined, blueFill);
  sc(10, 2, "Address:", fontLabelWhite, undefined, blueFill);
  sc(10, 3, template.client.address, fontValueWhite, undefined, blueFill);
  sc(11, 2, "Country - City:", fontLabelWhite, undefined, blueFill);
  sc(11, 3, template.client.countryCity, fontValueWhite, undefined, blueFill);

  // Right side: IBC company data
  const fontIssuedLabel = { bold: true, size: 9, name: "Montserrat", color: { argb: "FF4A4A4A" } };
  const fontIssuedVal = { size: 9, name: "Roboto", color: { argb: "FF2D2D2D" } };
  const issuedLabelAlign = { horizontal: "right" as const, vertical: "middle" as const, indent: 1 };
  const issuedValAlign = { horizontal: "left" as const, vertical: "middle" as const, indent: 1 };
  sc(8, 6, "Address:", fontIssuedLabel, issuedLabelAlign, issuedFill);
  sc(8, 7, template.company.address, fontIssuedVal, issuedValAlign, issuedFill);
  sc(9, 6, "Tel:", fontIssuedLabel, issuedLabelAlign, issuedFill);
  sc(9, 7, template.company.tel, fontIssuedVal, issuedValAlign, issuedFill);
  sc(10, 6, "EIN:", fontIssuedLabel, issuedLabelAlign, issuedFill);
  sc(10, 7, template.company.ein, fontIssuedVal, issuedValAlign, issuedFill);

  // ── ROW 13: spacer ──
  fillRow(13, whiteFill);

  // ── ROWS 14-20: Transport/document details ──
  for (let r = 14; r <= 20; r++) {
    ws.getRow(r).height = 18;
    fillRow(r, whiteFill);
  }

  // Transport Details — exact layout matching source format
  sc(14, 2, "Transport Details:", fontLabel, undefined, whiteFill);
  sc(14, 5, "No:", fontLabelBig, undefined, whiteFill);
  sc(14, 6, template.documentNumber, fontValue, undefined, whiteFill);
  sc(15, 2, "Port of Loading:", fontLabel, undefined, whiteFill);
  sc(15, 3, template.metadata.portOfLoading || "", fontValue, undefined, whiteFill);
  sc(15, 5, "Date:", fontLabelBig, undefined, whiteFill);
  sc(15, 6, template.documentDate, fontValue, undefined, whiteFill);
  sc(16, 2, "Port of Discharging:", fontLabel, undefined, whiteFill);
  sc(16, 3, template.metadata.portOfDischarge || "", fontValue, undefined, whiteFill);
  sc(16, 5, "Shipping Marks:", fontLabelBig, undefined, whiteFill);
  sc(16, 6, "N/M", fontValue, undefined, whiteFill);
  sc(17, 2, "Vessel Name:", fontLabel, undefined, whiteFill);
  sc(17, 3, template.metadata.vesselName || "", fontValue, undefined, whiteFill);
  sc(17, 5, "BL No:", fontLabelBig, undefined, whiteFill);
  sc(17, 6, template.metadata.blNo || "", fontValue, undefined, whiteFill);
  sc(18, 5, "Place of Invoice Issue:", fontLabelBig, undefined, whiteFill);
  sc(18, 6, "MIAMI, FL", fontValue, undefined, whiteFill);

  // Description of goods (if provided)
  if (template.metadata.descriptionOfGoods) {
    ws.mergeCells("C20:G20");
    sc(20, 3, template.metadata.descriptionOfGoods, fontData, center);
  }

  // ══════════════════════════════════════════════════════
  // ZONA 2: TABLA DE DATOS (fidelidad 1:1 del Excel fuente)
  // ══════════════════════════════════════════════════════

  const TABLE_START_ROW = 22;
  ws.getRow(21).height = 15.75;
  ws.getRow(22).height = 31.5;

  const headers = template.dataTable.headers.filter(h => h !== "");
  const numCols = headers.length;

  // Determine column mapping: we use columns B through B+numCols
  // If we have <=6 columns, merge C:D for the second column (description/size pattern)
  const useColumnMerge = numCols <= 6;

  // Data table headers
  headers.forEach((header, i) => {
    const colIdx = i + 2; // Start at column B (2)
    sc(TABLE_START_ROW, colIdx, header, fontSection, center);
    if (i === 0) {
      ws.getCell(TABLE_START_ROW, colIdx).border = { top: headerBorder };
    }
  });

  // If merging C:D for the second column header
  if (useColumnMerge && numCols >= 2) {
    ws.mergeCells(TABLE_START_ROW, 3, TABLE_START_ROW, 4);
  }

  // Data rows with Excel formulas
  const firstDataRow = TABLE_START_ROW + 1;

  // Detect column indices for formulas
  let qtyColIdx = -1, priceColIdx = -1, amountColIdx = -1;
  headers.forEach((h, i) => {
    const u = h.toUpperCase();
    if ((u.includes("QTY") || u.includes("QUANTITY")) && !u.includes("PRICE") && !u.includes("AMOUNT")) {
      qtyColIdx = i;
    } else if (u.includes("TOTAL") && u.includes("AMOUNT")) {
      amountColIdx = i;
    } else if (
      u.includes("UNIT PRICE") ||
      (u.includes("PRICE") && u.includes("USD")) ||
      (u.includes("USD") && u.includes("MT")) ||
      (u.includes("PRICE") && !u.includes("TOTAL"))
    ) {
      priceColIdx = i;
    } else if (u.includes("AMOUNT") && !u.includes("TOTAL")) {
      amountColIdx = i;
    }
  });
  // Fallback: if price not found but we have qty and amount, price is the column between them
  if (priceColIdx === -1 && qtyColIdx >= 0 && amountColIdx >= 0 && amountColIdx - qtyColIdx === 2) {
    priceColIdx = qtyColIdx + 1;
  }

  // Identify special row types
  const rowTypes: string[] = [];
  const itemRowIndices: number[] = [];
  template.dataTable.rows.forEach((row, idx) => {
    const txt = row.map(c => String(c || "").toUpperCase()).join(" ");
    if (txt.includes("BALANCE")) rowTypes.push("balance");
    else if (txt.includes("DEPOSIT")) rowTypes.push("deposit");
    else if (txt.includes("FOB")) rowTypes.push("fob");
    else if (txt.includes("INSURANCE")) rowTypes.push("insurance");
    else if (txt.includes("OCEAN FREIGHT") || (txt.includes("FREIGHT") && !txt.includes("FOB"))) rowTypes.push("freight");
    else if (txt.includes("TOTAL") && (txt.includes("CIF") || txt.includes("SUBTOTAL"))) rowTypes.push("totalcif");
    else { rowTypes.push("item"); itemRowIndices.push(idx); }
  });

  // Column letters (offset by 2 since data starts at col B)
  const colLetter = (i: number) => String.fromCharCode(64 + i + 2);
  // Get the right number format for a column
  const fmtForCol = (colIdx: number) => {
    if (colIdx === qtyColIdx) return numFmtQty;
    if (colIdx === priceColIdx) return numFmtPrice;
    if (colIdx === amountColIdx) return numFmtAmount;
    return numFmt2;
  };
  const qtyLetter = qtyColIdx >= 0 ? colLetter(qtyColIdx) : "";
  const priceLetter = priceColIdx >= 0 ? colLetter(priceColIdx) : "";
  const amountLetter = amountColIdx >= 0 ? colLetter(amountColIdx) : "";

  // Track Excel row numbers for special rows
  let totalCifExcelRow = -1, freightExcelRow = -1, insuranceExcelRow = -1;
  let fobExcelRow = -1, depositExcelRow = -1, balanceExcelRow = -1;

  template.dataTable.rows.forEach((row, rowIdx) => {
    const r = firstDataRow + rowIdx;
    ws.getRow(r).height = 15.75;
    const rType = rowTypes[rowIdx];

    if (rType === "totalcif") totalCifExcelRow = r;
    else if (rType === "freight") freightExcelRow = r;
    else if (rType === "insurance") insuranceExcelRow = r;
    else if (rType === "fob") fobExcelRow = r;
    else if (rType === "deposit") depositExcelRow = r;
    else if (rType === "balance") balanceExcelRow = r;

    // Determine if this is a labeled row (label goes in col B, skip text cols in forEach)
    const isLabeledRow = rType !== "item";

    row.forEach((cellValue, colIdx) => {
      if (colIdx >= numCols) return;
      const c = colIdx + 2;
      const isAmountCol = colIdx === amountColIdx;
      const isPriceCol = colIdx === priceColIdx;
      const isQtyCol = colIdx === qtyColIdx;
      const useFont = (rType === "totalcif" || rType === "balance") ? fontDataBold : fontData;

      // For labeled rows: skip text columns (label written after), but add borders to all
      if (isLabeledRow && !isAmountCol && !isPriceCol && !isQtyCol) {
        // Still add borders to empty cells so lines are visible
        ws.getCell(r, c).border = dataBorder;
        return;
      }

      // Insert FORMULAS for calculated cells
      if (isAmountCol && rType === "item" && priceColIdx >= 0 && qtyColIdx >= 0) {
        // TOTAL AMOUNT = QTY * UNIT PRICE
        sc(r, c, { formula: `${qtyLetter}${r}*${priceLetter}${r}` }, useFont,
          { horizontal: "right" as const, vertical: "middle" as const }, undefined, dataBorder);
        ws.getCell(r, c).numFmt = fmtForCol(colIdx);
      } else if (isAmountCol && rType === "totalcif") {
        // TOTAL CIF = SUM of item amounts
        const itemRefs = itemRowIndices.map(i => `${amountLetter}${firstDataRow + i}`).join(",");
        sc(r, c, { formula: `SUM(${itemRefs})` }, useFont,
          { horizontal: "right" as const, vertical: "middle" as const }, undefined, dataBorder);
        ws.getCell(r, c).numFmt = fmtForCol(colIdx);
      } else if (isAmountCol && rType === "freight" && priceColIdx >= 0 && qtyColIdx >= 0) {
        // FREIGHT = QTY * PRICE (if both exist)
        const qtyVal = Number(row[qtyColIdx]) || 0;
        const priceVal = Number(row[priceColIdx]) || 0;
        if (qtyVal > 0 && priceVal > 0) {
          sc(r, c, { formula: `${qtyLetter}${r}*${priceLetter}${r}` }, useFont,
            { horizontal: "right" as const, vertical: "middle" as const }, undefined, dataBorder);
        } else {
          sc(r, c, cellValue ?? "", useFont, { horizontal: "right" as const, vertical: "middle" as const }, undefined, dataBorder);
        }
        ws.getCell(r, c).numFmt = fmtForCol(colIdx);
      } else if (isAmountCol && rType === "fob" && totalCifExcelRow > 0) {
        // FOB = TOTAL CIF - FREIGHT - INSURANCE
        let formula = `${amountLetter}${totalCifExcelRow}`;
        if (freightExcelRow > 0) formula += `-${amountLetter}${freightExcelRow}`;
        if (insuranceExcelRow > 0) formula += `-${amountLetter}${insuranceExcelRow}`;
        sc(r, c, { formula }, useFont,
          { horizontal: "right" as const, vertical: "middle" as const }, undefined, dataBorder);
        ws.getCell(r, c).numFmt = fmtForCol(colIdx);
      } else if (isAmountCol && rType === "balance" && totalCifExcelRow > 0) {
        // BALANCE = TOTAL CIF - DEPOSIT
        let formula = `${amountLetter}${totalCifExcelRow}`;
        if (depositExcelRow > 0) formula += `-${amountLetter}${depositExcelRow}`;
        sc(r, c, { formula }, useFont,
          { horizontal: "right" as const, vertical: "middle" as const }, undefined, dataBorder);
        ws.getCell(r, c).numFmt = fmtForCol(colIdx);
      } else if (isQtyCol && rType === "totalcif") {
        // Sum QTY for total row
        const itemRefs = itemRowIndices.map(i => `${qtyLetter}${firstDataRow + i}`).join(",");
        sc(r, c, { formula: `SUM(${itemRefs})` }, useFont, center, undefined, dataBorder);
        ws.getCell(r, c).numFmt = fmtForCol(colIdx);
      } else {
        // Regular cell — keep value as-is
        const val = cellValue;
        if (val != null && val !== "" && typeof val === "number") {
          sc(r, c, val, useFont, { horizontal: "right" as const, vertical: "middle" as const }, undefined, dataBorder);
          if (isPriceCol || isAmountCol || isQtyCol) ws.getCell(r, c).numFmt = fmtForCol(colIdx);
        } else {
          sc(r, c, val ?? "", useFont, center, undefined, dataBorder);
        }
      }
    });

    if (useColumnMerge && numCols >= 2) {
      ws.mergeCells(r, 3, r, 4);
    }

    // Write labels for labeled rows in column B, bold + wrap text
    if (isLabeledRow) {
      const labelMap: Record<string, string> = {
        freight: "OCEAN FREIGHT", insurance: "INSURANCE",
        fob: "", deposit: "DEPOSIT", balance: "BALANCE",
        totalcif: "",
      };
      let label = labelMap[rType] || "";
      if (!label) {
        for (const cell of row) {
          if (cell != null && typeof cell === "string" && cell.trim().length > 0) {
            label = cell.trim(); break;
          }
        }
      }
      sc(r, 2, label, fontDataBold,
        { horizontal: "center" as const, vertical: "middle" as const, wrapText: true },
        undefined, dataBorder);
    }
  });

  const totalRow = firstDataRow + template.dataTable.rows.length;
  const lastDataRow = totalRow - 1;

  // ══════════════════════════════════════════════════════
  // ZONA 3: PIE DE DOCUMENTO (fijo para todos)
  // ══════════════════════════════════════════════════════

  let cr = totalRow + 2;

  // Payment Information
  ws.mergeCells(cr, 2, cr, 3);
  sc(cr, 2, "Payment Information:", { bold: true, size: 11, name: "Montserrat" }, { horizontal: "left" as const });
  cr += 2;

  const payData: [string, string | number][] = [
    ["BENEFICIARY NAME:", IBC_BANK.beneficiaryName],
    ["BENEFICIARY BANK:", IBC_BANK.beneficiaryBank],
    ["BENE ACCOUNT NO:", Number(IBC_BANK.accountNo) || IBC_BANK.accountNo],
    ["SWIFT CODE:", IBC_BANK.swiftCode],
    ["BANK ADDRESS:", IBC_BANK.bankAddress],
    ["ABA:", IBC_BANK.aba],
  ];
  payData.forEach(([label, value]) => {
    sc(cr, 2, label, fontLabel);
    sc(cr, 3, value, { size: 11, name: "Aptos Narrow" });
    cr++;
  });

  cr++;

  // Disclaimer
  ws.mergeCells(cr, 2, cr + 1, 7);
  sc(cr, 2, DOCUMENT_DISCLAIMER,
    { size: 10, name: "Roboto" }, { ...left, wrapText: true });
  cr += 2;

  // Signature section
  const sigStartRow = cr;
  ws.mergeCells(cr, 5, cr + 8, 8);

  cr++;
  sc(cr, 2, "Signature Stamp", { bold: true, size: 11, name: "Montserrat" }, { horizontal: "left" as const });
  cr++;
  const firmaRow = cr;
  cr += 5;
  cr += 3;
  cr += 2; // 2 blank rows of spacing before footer bar

  // Version/Code footer bar — 2 rows merged for thicker bar
  const footerBlue = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF0D71B9" } };
  ws.mergeCells(cr, 2, cr + 1, 3);
  sc(cr, 2, FOOTER_CODE,
    { bold: true, size: 12, name: "Aptos Narrow", color: { argb: WHITE } },
    { horizontal: "center" as const, vertical: "middle" as const }, footerBlue);
  for (let c = 4; c <= 8; c++) {
    sc(cr, c, null, undefined, undefined, footerBlue);
    sc(cr + 1, c, null, undefined, undefined, footerBlue);
  }
  cr += 2;

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
  addImg(imgISO, { tl: { col: 6.2, row: sigStartRow + 0.5 }, ext: { width: 160, height: 150 } });
  addImg(imgFirma, { tl: { col: 1, row: firmaRow - 0.2 }, ext: { width: 420, height: 142 } });

  // Print area
  ws.pageSetup.printArea = `A1:H${cr + 2}`;

  // Default font for column A
  for (let r = 1; r <= cr + 6; r++) {
    const cellA = ws.getCell(r, 1);
    if (!cellA.font || !cellA.font.name) cellA.font = fontDefault;
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
