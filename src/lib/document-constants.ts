// =====================================================
// Document Constants — IBC Steel Group
// Company, bank, colors, fonts, asset paths
// =====================================================

export const IBC_COMPANY = {
  name: "IBC STEEL GROUP CORP",
  address: "848 BRICKELL AVE STE 950 MIAMI, FL 33131",
  tel: "(786) 233 8521",
  ein: "35-2726376",
  email: "servicioalcliente@ibcsteelgroup.com",
} as const;

export const IBC_BANK = {
  beneficiaryName: "IBC STEEL GROUP CORP",
  beneficiaryBank: "CITIBANK",
  accountNo: "3290415415",
  swiftCode: "CITIUS33",
  bankAddress: "201 S BISCAYNE BLVD MIAMI, FL 33131",
  aba: "266086554",
} as const;

export const DOCUMENT_DISCLAIMER =
  "IBC STEEL GROUP promotes responsible environmental management. The client agrees to handle and dispose of products, waste, and packaging in compliance with current environmental regulations, ensuring their reuse, recycling, or delivery to authorized facilities";

export const FOOTER_CODE = "Version: 01     Codigo: F-GLS-05";

// Excel cell colors (ARGB format for ExcelJS)
export const COLORS = {
  BLUE: "FF5D81AF",
  BLUE_HEX: "#5D81AF",
  DARK_BLUE: "FF0B5394",
  DARK_BLUE_HEX: "#0B5394",
  MID_BLUE: "FF1F4E78",
  MID_BLUE_HEX: "#1F4E78",
  LIGHT_BLUE: "FFD6E4F0",
  LIGHT_BLUE_HEX: "#D6E4F0",
  WHITE: "FFFFFFFF",
  WHITE_HEX: "#FFFFFF",
  GRAY: "FFF2F2F2",
  GRAY_HEX: "#F2F2F2",
  BORDER: "FFBFBFBF",
  BORDER_HEX: "#BFBFBF",
  TABLE_BORDER: "FFC5D3E0",
  TABLE_BORDER_HEX: "#C5D3E0",
  TEXT_DARK: "FF1A1A1A",
  TEXT_DARK_HEX: "#1A1A1A",
  ROW_ALT: "FFF0F4F8",
  ROW_ALT_HEX: "#F0F4F8",
} as const;

// Font definitions used across document templates
export const FONTS = {
  HEADER: { name: "Montserrat", size: 11, bold: true },
  LABEL: { name: "Montserrat", size: 10, bold: true },
  VALUE: { name: "Roboto", size: 10, bold: false },
  DATA: { name: "Calibri", size: 9, bold: false },
  DATA_HEADER: { name: "Calibri", size: 9, bold: true },
  TITLE: { name: "Montserrat", size: 20, bold: true },
  CONTACT: { name: "Aptos Narrow", size: 11, bold: false },
  SMALL: { name: "Calibri", size: 8, bold: false },
} as const;

// Asset paths (relative to /public/)
export const IMAGE_PATHS = {
  logo: "/pl-assets/template-image-0.png",
  separator: "/pl-assets/template-image-1.png",
  logoSecondary: "/pl-assets/template-image-2.png",
  qr: "/pl-assets/qr.png",
  iso: "/pl-assets/iso.png",
  firma: "/pl-assets/firma.png",
} as const;

// Document type labels
export const DOCUMENT_TYPES = {
  "commercial-invoice": {
    title: "COMMERCIAL INVOICE",
    titleEs: "FACTURA COMERCIAL",
    prefix: "IBC-FAC",
  },
  "packing-list": {
    title: "PACKING LIST",
    titleEs: "LISTA DE EMPAQUE",
    prefix: "IBC-PKG",
  },
} as const;

// Excel column widths (matching ARCHIVO FINAL format)
export const COLUMN_WIDTHS = {
  A: 6.57,
  B: 26.71,
  C: 29.71,
  D: 24.86,
  E: 18.71,
  F: 23.57,
  G: 23.57,
  H: 22,
} as const;

// Incoterm options
export const INCOTERMS = [
  "EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP",
] as const;
