// =====================================================
// Document Template — Types & Data Detection
// =====================================================

import type { DocumentInfo } from "@/types";

export type DocumentType = "commercial-invoice" | "packing-list";

export interface DocumentClientData {
  messrs: string;
  nit: string;
  address: string;
  countryCity: string;
}

export interface DocumentCompanyData {
  name: string;
  address: string;
  tel: string;
  ein: string;
  email: string;
}

export interface DocumentMetadata {
  portOfLoading?: string;
  portOfDischarge?: string;
  vesselName?: string;
  blNo?: string;
  paymentTerms?: string;
  incoterm?: string;
  reference?: string;
  descriptionOfGoods?: string;
  documentNumber?: string;
  documentDate?: string;
  shippingMarks?: string;
}

export interface DocumentDataTable {
  headers: string[];
  rows: (string | number | null)[][];
}

export interface DocumentTemplate {
  type: DocumentType;
  documentNumber: string;
  documentDate: string;
  client: DocumentClientData;
  company: DocumentCompanyData;
  metadata: DocumentMetadata;
  dataTable: DocumentDataTable;
}

// Keywords that indicate a header row in an Excel data table
const HEADER_KEYWORDS = [
  "ITEM", "SIZE", "DESCRIPTION", "QTY", "QUANTITY", "COILS", "BUNDLES",
  "WEIGHT", "UNIT PRICE", "AMOUNT", "TOTAL", "G.W", "N.W", "PIECES",
  "PCS", "PRICE", "PRODUCT", "UNIT", "MEASUREMENT",
  "CONTAINER", "STEEL GRADE",
];

// Rows containing these keywords should be EXCLUDED from the data table
// (payment/bank info from source file is replaced by IBC's own info)
const PAYMENT_STOP_KEYWORDS = [
  "PAYMENT INFORMATION", "BENEFICIARY NAME", "BENEFICIARY BANK",
  "BENE ACCOUNT", "SWIFT CODE", "BANK ADDRESS", "SIGNATURE STAMP",
  "SIGNATURE", "STAMP",
];

/**
 * Extracts header/metadata info from the rows ABOVE the data table.
 * Scans for transport details, invoice number, dates, ports, vessel, BL.
 */
export function extractHeaderInfo(
  sheetData: (string | number | null)[][],
  headerRowIndex: number
): DocumentMetadata {
  const meta: DocumentMetadata = {};

  // Scan the rows before the data table for key-value pairs
  for (let r = 0; r < headerRowIndex; r++) {
    const row = sheetData[r];
    if (!row) continue;

    // Check each cell for known labels, then grab the adjacent cell value
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (cell == null) continue;
      const cellStr = String(cell).trim().toUpperCase();
      if (cellStr.length === 0) continue;

      const nextVal = (offset = 1) => {
        const v = row[c + offset];
        if (v == null) return "";
        // Handle Excel serial date numbers (e.g. 46109 = a date in 2026)
        if (typeof v === "number" && v > 40000 && v < 60000) {
          // Excel serial date → JS Date (Excel epoch is 1900-01-01, with the 1900 leap year bug)
          const excelEpoch = new Date(1899, 11, 30);
          const jsDate = new Date(excelEpoch.getTime() + v * 86400000);
          const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
          return `${months[jsDate.getMonth()]}.${String(jsDate.getDate()).padStart(2, "0")},${jsDate.getFullYear()}`;
        }
        return String(v).trim();
      };

      // Search for label patterns and extract the next cell as value
      if (cellStr.includes("INVOICE") && (cellStr.includes("NO") || cellStr.includes("N°"))) {
        meta.documentNumber = nextVal() || meta.documentNumber;
      } else if (cellStr === "NO." || cellStr === "NO.:" || cellStr === "NO:" || cellStr === "NO" || cellStr === "N°") {
        meta.documentNumber = nextVal() || meta.documentNumber;
      } else if (cellStr.includes("DATE") && !cellStr.includes("UPDATE")) {
        const val = nextVal();
        if (val) meta.documentDate = val;
      } else if (cellStr.includes("PORT OF LOADING") || cellStr.includes("PORT OF SHIPMENT")) {
        meta.portOfLoading = nextVal() || meta.portOfLoading;
      } else if (cellStr.includes("PORT OF DISCHARG") || cellStr.includes("PORT OF DESTINATION")) {
        meta.portOfDischarge = nextVal() || meta.portOfDischarge;
      } else if (cellStr.includes("VESSEL") || cellStr.includes("VOYAGE")) {
        meta.vesselName = nextVal() || meta.vesselName;
      } else if (cellStr.includes("BL") && (cellStr.includes("NO") || cellStr.includes("N°"))) {
        meta.blNo = nextVal() || meta.blNo;
      } else if (cellStr === "BL NO" || cellStr === "BL NO." || cellStr === "BL NO:" || cellStr === "B/L NO" || cellStr === "B/L NO.") {
        meta.blNo = nextVal() || meta.blNo;
      } else if (cellStr.includes("SHIPPING MARK")) {
        meta.shippingMarks = nextVal() || meta.shippingMarks;
      } else if (cellStr.includes("PAYMENT TERM") || cellStr.includes("TERMS OF PAYMENT")) {
        meta.paymentTerms = nextVal() || meta.paymentTerms;
      } else if (cellStr.includes("DESCRIPTION OF GOODS") || cellStr.includes("DESCRIPTION OF COMMODITY")) {
        meta.descriptionOfGoods = nextVal() || meta.descriptionOfGoods;
      } else if (cellStr.includes("INCOTERM")) {
        meta.reference = nextVal() || meta.reference;
      }

      // Also check if the cell itself contains "NO.:" pattern (label:value in same cell)
      // e.g. "NO.:  IS-2602164-020"
      if (cellStr.startsWith("NO.:") || cellStr.startsWith("NO:")) {
        const parts = String(cell).split(/[:]\s*/);
        if (parts.length > 1) meta.documentNumber = parts[1].trim() || meta.documentNumber;
      }
    }
  }

  return meta;
}

/**
 * Detects where the data table starts in a 2D array of Excel data.
 * Scans rows looking for a row where 3+ cells match header keywords.
 */
export function detectDataTable(
  sheetData: (string | number | null)[][]
): { headerRow: number; dataStartRow: number } {
  for (let i = 0; i < Math.min(sheetData.length, 30); i++) {
    const row = sheetData[i];
    if (!row) continue;

    let matches = 0;
    for (const cell of row) {
      if (cell == null) continue;
      const cellStr = String(cell).trim().toUpperCase();
      if (cellStr.length === 0) continue;

      for (const keyword of HEADER_KEYWORDS) {
        if (cellStr.includes(keyword)) {
          matches++;
          break;
        }
      }
    }

    if (matches >= 3) {
      return { headerRow: i, dataStartRow: i + 1 };
    }
  }

  // Fallback: first row with data in 3+ columns
  for (let i = 0; i < sheetData.length; i++) {
    const row = sheetData[i];
    if (!row) continue;
    const nonEmpty = row.filter((c) => c != null && String(c).trim() !== "").length;
    if (nonEmpty >= 3) {
      return { headerRow: i, dataStartRow: i + 1 };
    }
  }

  return { headerRow: 0, dataStartRow: 1 };
}

/**
 * Checks if a row contains payment/bank info keywords that should be excluded.
 */
function isPaymentRow(row: (string | number | null)[]): boolean {
  for (const cell of row) {
    if (cell == null) continue;
    const upper = String(cell).trim().toUpperCase();
    for (const keyword of PAYMENT_STOP_KEYWORDS) {
      if (upper.includes(keyword)) return true;
    }
  }
  return false;
}

/**
 * Extracts headers and data rows from a 2D sheet array.
 * All values are preserved exactly as-is from the source.
 * Payment/bank info rows are filtered out.
 */
export function extractDataTable(
  sheetData: (string | number | null)[][],
  headerRowIndex: number
): DocumentDataTable {
  const headerRow = sheetData[headerRowIndex] || [];
  const headers: string[] = [];
  let lastColIndex = 0;

  // Find all non-empty header columns
  for (let c = 0; c < headerRow.length; c++) {
    const val = headerRow[c];
    if (val != null && String(val).trim() !== "") {
      headers.push(String(val).trim());
      lastColIndex = c;
    } else {
      headers.push("");
    }
  }

  // Trim trailing empty headers
  while (headers.length > 0 && headers[headers.length - 1] === "") {
    headers.pop();
    lastColIndex--;
  }

  // Extract data rows (from headerRow+1 to end), excluding payment rows
  const rows: (string | number | null)[][] = [];
  for (let r = headerRowIndex + 1; r < sheetData.length; r++) {
    const row = sheetData[r];
    if (!row) continue;

    // Stop if we hit payment/bank info
    if (isPaymentRow(row)) break;

    // Skip completely empty rows
    const hasData = row.slice(0, lastColIndex + 1).some(
      (c) => c != null && String(c).trim() !== ""
    );
    if (!hasData) continue;

    // Take only the columns that match our headers
    const dataRow: (string | number | null)[] = [];
    for (let c = 0; c <= lastColIndex; c++) {
      dataRow.push(row[c] ?? null);
    }
    rows.push(dataRow);
  }

  return { headers, rows };
}

/**
 * Detects which columns likely contain monetary values (USD prices/amounts).
 * Returns indices of those columns.
 */
export function detectMoneyColumns(table: DocumentDataTable): number[] {
  const moneyKeywords = [
    "PRICE", "AMOUNT", "TOTAL", "VALUE", "COST", "USD",
  ];

  const indices: number[] = [];
  table.headers.forEach((header, idx) => {
    const upper = header.toUpperCase();
    for (const keyword of moneyKeywords) {
      if (upper.includes(keyword)) {
        indices.push(idx);
        break;
      }
    }
  });

  return indices;
}

/**
 * Detects column indices for QTY, UNIT PRICE, and TOTAL AMOUNT
 * so that live calculations can be performed.
 */
export function detectFormulaColumns(table: DocumentDataTable): {
  qtyCol: number | null;
  priceCol: number | null;
  amountCol: number | null;
} {
  let qtyCol: number | null = null;
  let priceCol: number | null = null;
  let amountCol: number | null = null;

  table.headers.forEach((header, idx) => {
    const upper = header.toUpperCase();
    if ((upper.includes("QTY") || upper.includes("QUANTITY")) && !upper.includes("PRICE") && !upper.includes("AMOUNT")) {
      qtyCol = idx;
    } else if (upper.includes("TOTAL") && upper.includes("AMOUNT")) {
      amountCol = idx;
    } else if (
      upper.includes("UNIT PRICE") ||
      (upper.includes("PRICE") && upper.includes("USD")) ||
      (upper.includes("USD") && upper.includes("MT")) ||
      (upper.includes("PRICE") && !upper.includes("TOTAL"))
    ) {
      priceCol = idx;
    } else if (upper.includes("AMOUNT") && !upper.includes("TOTAL")) {
      amountCol = idx;
    }
  });

  // Fallback: if price not found but we have qty and amount, price is between them
  if (priceCol === null && qtyCol !== null && amountCol !== null && amountCol - qtyCol === 2) {
    priceCol = qtyCol + 1;
  }

  return { qtyCol, priceCol, amountCol };
}

/**
 * Builds a DocumentClientData object from a client's document_info,
 * falling back to general client fields if document_info is empty.
 */
export function buildClientData(client: {
  company_name?: string;
  tax_id?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  document_info?: DocumentInfo | null;
}): DocumentClientData {
  const doc = client.document_info;

  return {
    messrs: doc?.messrs || client.company_name || "",
    nit: doc?.nit || client.tax_id || "",
    address: doc?.address || client.address || "",
    countryCity:
      doc?.country_city ||
      (client.country && client.city
        ? `${client.country} - ${client.city}`
        : client.country || client.city || ""),
  };
}
